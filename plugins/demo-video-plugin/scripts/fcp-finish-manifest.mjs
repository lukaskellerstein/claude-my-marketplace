#!/usr/bin/env node
// What the Final Cut Pro finish is made of, and what it still needs by hand.
//
// The FCPXML export is not the finish. It carries the cut, the text, the timing and the
// positions; it cannot carry a media well's content, a changed colour, a generator's text, or
// anything a person tunes in the inspector. When the user later asks "what is in this video",
// or re-opens it in six months, this file answers — with hashes, so a changed input is visible.
//
// usage:
//   fcp-finish-manifest.mjs [--project DIR] [--out FILE] [--json]
//
// It reads; it changes nothing but its own output file.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { inspectTemplate, resolveTemplate, storyboardTemplateRefs } from './lib/fcp.mjs';

const args = process.argv.slice(2);
const argOf = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : undefined;
};
const json = args.includes('--json');
const project = resolve(argOf('--project') ?? process.cwd());
const demo = join(project, 'demo');
const out = resolve(argOf('--out') ?? join(demo, 'out', 'fcp-finish-manifest.json'));
const fail = (message) => {
  console.error(`demo-video: ${message}`);
  process.exit(1);
};

const hash = (file) => {
  try {
    return statSync(file).isFile() ? createHash('sha256').update(readFileSync(file)).digest('hex') : null;
  } catch {
    return null;
  }
};
const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};
const file = (path) => {
  const sha256 = hash(path);
  return sha256 ? { path, bytes: statSync(path).size, sha256 } : null;
};
const listing = (dir, match) => {
  try {
    return readdirSync(dir).filter(match).sort().map((name) => file(join(dir, name))).filter(Boolean);
  } catch {
    return [];
  }
};

const storyboardPath = join(demo, 'storyboard.json');
const timelinePath = join(demo, 'timeline.json');
const storyboard = readJson(storyboardPath) ?? fail(`no storyboard at ${storyboardPath}`);
const timeline = readJson(timelinePath);

// Every template the storyboard names, as this Mac sees it today. A placeholder here means the
// export will refuse; a missing one means the export falls back or skips it.
const templates = storyboardTemplateRefs(storyboard).map((ref) => {
  const { template, status } = resolveTemplate(ref.name, { kind: ref.kind });
  const row = { where: ref.where, named: ref.name, status, name: template?.name ?? null, code: template?.code ?? null, uid: template?.uid ?? null };
  if (template?.status === 'ready') {
    const info = inspectTemplate(template.path);
    Object.assign(row, {
      seconds: info.seconds,
      textLayers: info.texts.map((t) => t.layer),
      dropZones: info.dropZones,
      placement: info.placement,
    });
  }
  return row;
});

// What FCPXML cannot carry. Anything here is a hand edit that a re-export will lose, so it has
// to be written down rather than remembered.
const byHand = [
  ...(templates.some((t) => t.dropZones?.length)
    ? [`Fill the drop zones in FCP: ${templates.filter((t) => t.dropZones?.length).map((t) => `${t.name} (${t.dropZones.join(', ')})`).join('; ')}. An empty one shows grey "DROP ZONE" art.`]
    : []),
  ...(templates.some((t) => t.placement === 'fixed')
    ? [`These templates draw the footage under them and have no position control, so they stay where their designer put them: ${templates.filter((t) => t.placement === 'fixed').map((t) => t.name).join(', ')}.`]
    : []),
  'Check every text layer against the longest final copy, over real footage — vendor defaults are often near-black or white and can vanish on a light or dark page.',
  'A generator takes no text through FCPXML. Any generator in this list still shows its sample text until someone edits it in FCP.',
  'Published parameters (colours, fonts, scale, masks) keep the template design. Change them in the inspector, then write the value here.',
  'Export from Final Cut Pro and judge the decoded pixels. A file that validates against the DTD can still import with warnings or render wrong.',
];

const manifest = {
  generatedAt: new Date().toISOString(),
  project,
  videoId: storyboard.meta?.videoId ?? null,
  title: storyboard.meta?.title ?? null,
  // A Remotion draft cannot approve this finish; say which film is the deliverable.
  authoritativeRenderer: storyboard.meta?.authoritativeRenderer ?? (storyboard.meta?.fcp ? 'final-cut-pro' : 'remotion'),
  voice: storyboard.meta?.voice ?? null,
  inputs: {
    storyboard: file(storyboardPath),
    timeline: file(timelinePath),
    fcpxml: file(join(demo, 'out', 'demo.fcpxml')),
    clips: listing(join(demo, 'capture'), (n) => n.endsWith('.mp4')),
    narration: listing(join(demo, 'audio'), (n) => n.endsWith('.mp3')),
    music: listing(join(demo, 'audio', 'music'), (n) => /\.(mp3|wav|aif|aiff|m4a)$/.test(n)),
  },
  outputs: ['demo-fcp.mov', 'demo-fcp.mp4', 'demo.mp4', 'demo-draft.mp4']
    .map((name) => file(join(demo, 'out', name)))
    .filter(Boolean),
  cut: timeline
    ? {
        fps: timeline.fps ?? null,
        frames: timeline.durationInFrames ?? null,
        seconds: timeline.fps && timeline.durationInFrames ? Number((timeline.durationInFrames / timeline.fps).toFixed(3)) : null,
        sections: (timeline.sections ?? []).length,
        warnings: timeline.report?.warnings ?? [],
      }
    : null,
  templates,
  byHand,
  // Frames and levels are evidence; taste, pacing, pronunciation and mix are not. A person
  // has to watch and listen before this says anything else.
  review: { status: 'pending-human-watch-listen', approvedMovie: null, nativeLibrary: null, approvedAt: null },
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);

const counts = (status) => manifest.templates.filter((t) => t.status === status).length;
process.stdout.write(
  `${
    json
      ? JSON.stringify(manifest, null, 2)
      : [
          `${out}`,
          `  renderer   ${manifest.authoritativeRenderer}${manifest.videoId ? `  (${manifest.videoId})` : ''}`,
          `  cut        ${manifest.cut ? `${manifest.cut.seconds}s, ${manifest.cut.frames} frames, ${manifest.cut.sections} sections` : 'no timeline yet'}`,
          `  inputs     ${manifest.inputs.clips.length} clips, ${manifest.inputs.narration.length} narration files, hashed`,
          `  templates  ${counts('ready')} ready, ${counts('placeholder')} not downloaded, ${counts('missing')} missing`,
          `  by hand    ${manifest.byHand.length} things FCPXML cannot do for you`,
          `  review     ${manifest.review.status}`,
        ].join('\n')
  }\n`
);
if (counts('placeholder') || counts('missing')) process.exitCode = 1;
