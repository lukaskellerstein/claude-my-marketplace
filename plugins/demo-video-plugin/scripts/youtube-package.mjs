#!/usr/bin/env node
// The text that goes with the video, prepared next to the approved film.
//
// Chapters come from the measured timeline, never from the storyboard's planned seconds, so
// they match the film a viewer scrubs. Title and description are a first draft for a person to
// edit; a second run keeps those edits as long as the movie is the same file.
//
// It writes local files. It never uploads, publishes, schedules, commits or pushes.
//
// usage:
//   youtube-package.mjs [--project DIR] [--movie FILE] [--out DIR] [--json]

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// YouTube's own limits, as published by YouTube. Re-check them when you prepare a package:
// the package records the date they were last checked, and leaves it null until someone does.
const LIMITS = {
  titleChars: 100,
  descriptionChars: 5000,
  minChapters: 3,
  minChapterSeconds: 10,
  firstChapterAtZero: true,
  thumbnail: { width: 1280, height: 720, maxBytes: 2 * 1024 * 1024, formats: ['jpg', 'png', 'gif', 'webp'] },
};

const args = process.argv.slice(2);
const argOf = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : undefined;
};
const json = args.includes('--json');
const project = resolve(argOf('--project') ?? process.cwd());
const demo = join(project, 'demo');
const fail = (message) => {
  console.error(`demo-video: ${message}`);
  process.exit(1);
};
const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

const storyboard = readJson(join(demo, 'storyboard.json')) ?? fail(`no storyboard at ${join(demo, 'storyboard.json')}`);
const timeline = readJson(join(demo, 'timeline.json')) ?? fail('no demo/timeline.json — reconcile before preparing the package.');
const meta = storyboard.meta ?? {};

// One repository can hold several videos. A videoId keeps their packages apart; without one
// there is a single package, which is right for a repository with a single demo.
const videoId = meta.videoId ?? null;
const out = resolve(argOf('--out') ?? (videoId ? join(demo, videoId, 'youtube') : join(demo, 'youtube')));

const isFile = (path) => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};
// The approved film, never the draft: a draft has not been through review.
const movie = argOf('--movie')
  ? resolve(argOf('--movie'))
  : [videoId ? join(demo, videoId, 'final', 'demo-fcp.mp4') : null, join(demo, 'out', 'demo-fcp.mp4'), join(demo, 'out', 'demo.mp4')]
      .filter(Boolean)
      .find(isFile);
if (!movie || !isFile(movie)) {
  fail('no approved film found (looked for demo-fcp.mp4 and demo.mp4). Pass --movie with the file the user approved — not the draft.');
}
const sha256 = createHash('sha256').update(readFileSync(movie)).digest('hex');

const fps = timeline.fps || 30;
const clock = (seconds) => {
  const whole = Math.floor(seconds);
  const mm = String(Math.floor(whole / 60)).padStart(2, '0');
  const ss = String(whole % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

// Chapters from the measured cut. Sections shorter than YouTube's minimum are folded into the
// one before them, because a chapter list YouTube rejects is worse than a shorter one.
const measured = (timeline.sections ?? []).map((s) => ({
  id: s.id,
  title: s.title,
  startSeconds: Number((s.startFrame / fps).toFixed(3)),
  seconds: Number((s.durationInFrames / fps).toFixed(3)),
}));
const chapters = [];
for (const section of measured) {
  const previous = chapters.at(-1);
  if (previous && section.startSeconds - previous.startSeconds < LIMITS.minChapterSeconds) continue;
  chapters.push({ startSeconds: section.startSeconds, title: section.title, id: section.id });
}
if (chapters.length && LIMITS.firstChapterAtZero) chapters[0].startSeconds = 0;

const draftTitle = String(meta.youtube?.title ?? meta.title ?? videoId ?? 'Demo');
const draftDescription =
  meta.youtube?.description ??
  [
    String(meta.summary ?? meta.title ?? '').trim(),
    '',
    `For ${meta.audience}.`,
    '',
    'Chapters:',
    ...chapters.map((c) => `${clock(c.startSeconds)} ${c.title}`),
    '',
    ...(meta.youtube?.links ?? []),
  ]
    .join('\n')
    .trim();

const existing = readJson(join(out, 'package.json'));
const keep = existing && existing.movie?.sha256 === sha256;

const pkg = keep
  ? { ...existing, chapters, regeneratedAt: new Date().toISOString() }
  : {
      generatedAt: new Date().toISOString(),
      videoId,
      movie: { path: movie, bytes: statSync(movie).size, sha256 },
      title: draftTitle,
      description: draftDescription,
      chapters,
      thumbnail: null,
      // Say where the narration and the music came from. A person decides what YouTube's
      // synthetic-media disclosure needs; this only records the facts.
      provenance: {
        narration: meta.voice ? { provider: meta.voice.provider ?? 'unknown', voiceId: meta.voice.voiceId ?? null, modelId: meta.voice.modelId ?? null } : null,
        music: meta.music ?? null,
        screenRecording: true,
      },
      checks: { youtubeRequirementsCheckedAt: null, linksCheckedAt: null, thumbnailCheckedAt: null },
      upload: { authorized: false, status: 'local-draft-only' },
    };

const problems = [
  pkg.title.length > LIMITS.titleChars ? `title is ${pkg.title.length} characters; YouTube allows ${LIMITS.titleChars}.` : null,
  pkg.description.length > LIMITS.descriptionChars
    ? `description is ${pkg.description.length} characters; YouTube allows ${LIMITS.descriptionChars}.`
    : null,
  chapters.length < LIMITS.minChapters
    ? `${chapters.length} chapters; YouTube shows them only from ${LIMITS.minChapters}. Leave them out of the description, or cut longer sections.`
    : null,
  !pkg.thumbnail ? 'no thumbnail yet — make one and record its path here.' : null,
  !pkg.checks.youtubeRequirementsCheckedAt ? "YouTube's current limits have not been re-checked for this package." : null,
].filter(Boolean);

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
// The README is the copy-ready half. Never overwrite a person's edit of it.
const readme = join(out, 'README.md');
if (!existsSync(readme)) {
  writeFileSync(
    readme,
    [
      `# YouTube — ${pkg.title}`,
      '',
      `Prepared from the approved film \`${movie}\`.`,
      'Edit this file freely; a later run keeps it. Nothing here is uploaded or published.',
      '',
      '## Title',
      '',
      pkg.title,
      '',
      '## Description',
      '',
      pkg.description,
      '',
      '## Chapters',
      '',
      ...chapters.map((c) => `${clock(c.startSeconds)} ${c.title}`),
      '',
      '## Before uploading',
      '',
      '- [ ] Re-check YouTube’s current title, description, chapter and thumbnail rules.',
      '- [ ] Add a 1280×720 thumbnail and check it is readable small.',
      '- [ ] Check every link.',
      '- [ ] Decide the synthetic-media disclosure from `package.json` → `provenance`.',
      '',
    ].join('\n')
  );
}

process.stdout.write(
  `${
    json
      ? JSON.stringify({ ...pkg, out, problems }, null, 2)
      : [
          `${out}`,
          `  movie      ${movie}`,
          `  title      ${pkg.title}`,
          `  chapters   ${chapters.length} from the measured cut${keep ? '' : ''}`,
          ...chapters.map((c) => `    ${clock(c.startSeconds)}  ${c.title}`),
          `  kept your edits: ${keep ? 'yes, the movie is unchanged' : 'no, this is a new draft'}`,
          ...(problems.length ? ['', 'Still open:', ...problems.map((p) => `  - ${p}`)] : []),
          '',
          'Nothing was uploaded. Upload, scheduling, commit and push each need their own go-ahead.',
        ].join('\n')
  }\n`
);
