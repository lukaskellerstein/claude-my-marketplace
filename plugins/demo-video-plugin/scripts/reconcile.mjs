#!/usr/bin/env node
// reconcile.mjs — storyboard (intent) + measured clips + measured narration -> timeline.json
//
// This is the edit decision list, and it is deterministic on purpose: the model decides
// what the demo says, this script decides where every frame goes. Nothing here guesses a
// duration; every number comes from a sidecar written by the capture/narration hooks, or
// from ffprobe.
//
// The core rule is AUDIO-LED: narration length defines the section, and the picture is
// fitted to it — the way a human editor cuts to a voice track. Fitting is bounded, and
// when a section cannot be fitted within bounds the script says so instead of quietly
// producing rubbery motion.
//
// usage: node reconcile.mjs [--project DIR] [--out PATH] [--json]

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, basename } from 'node:path';

// ── Tunables. These are editorial choices, documented in skills/demo-assembly. ──
const LEAD_IN = 0.25;        // silence before narration starts, so a cut never lands on a word
const TAIL = 0.6;            // beat of quiet after narration before the next section
const MIN_RATE = 0.85;       // slowest we will play a clip before switching to a held frame
const MAX_RATE = 1.15;       // fastest we will play a clip before switching to trimming
const WARP_LIMIT = 0.15;     // |1 - rate| ceiling, enforced by validate-timeline
const DEFAULT_TRANSITION = 0.4;

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const projectDir = argOf('--project', process.cwd());
const demoDir = join(projectDir, 'demo');
const outPath = argOf('--out', join(demoDir, 'timeline.json'));

const storyboardPath = join(demoDir, 'storyboard.json');
if (!existsSync(storyboardPath)) {
  console.error(`demo-video: no storyboard at ${storyboardPath}. Write it first (demo-scripting skill).`);
  process.exit(1);
}
const sb = JSON.parse(readFileSync(storyboardPath, 'utf8'));

const meta = sb.meta ?? {};
const fps = Number(meta.fps || 30);
const [width, height] = String(meta.outputSize || '1920x1080').split('x').map(Number);
const f = (seconds) => Math.max(0, Math.round(seconds * fps));

const warnings = [];
const errors = [];

// ── Measurement ────────────────────────────────────────────────────────────────
const probeDuration = (abs) => {
  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', abs],
      { encoding: 'utf8' }
    );
    const n = Number(out.trim());
    return Number.isFinite(n) && n > 0 ? Number(n.toFixed(3)) : null;
  } catch {
    return null;
  }
};

/** Prefer the sidecar written by the hooks; fall back to probing; null if absent. */
const measure = (relDir, id, exts) => {
  for (const ext of exts) {
    const rel = `${relDir}/${id}${ext}`;
    const abs = join(demoDir, rel);
    if (!existsSync(abs)) continue;
    const sidecar = abs.replace(/\.[a-z0-9]+$/i, '.json');
    if (existsSync(sidecar)) {
      try {
        const s = JSON.parse(readFileSync(sidecar, 'utf8'));
        if (s.durationSeconds > 0) return { rel, seconds: Number(s.durationSeconds) };
      } catch {
        /* fall through to probe */
      }
    }
    const probed = probeDuration(abs);
    if (probed) return { rel, seconds: probed };
  }
  return null;
};

/** Narration may be written as 03-search.mp3 or with an ElevenLabs-generated suffix. */
const findAudio = (id) => {
  const direct = measure('audio', id, ['.mp3', '.wav', '.m4a']);
  if (direct) return direct;
  const audioDir = join(demoDir, 'audio');
  if (!existsSync(audioDir)) return null;
  const match = readdirSync(audioDir)
    .filter((n) => n.startsWith(id) && /\.(mp3|wav|m4a)$/i.test(n))
    .sort();
  if (!match.length) return null;
  return measure('audio', basename(match[0]).replace(/\.[a-z0-9]+$/i, ''), ['.mp3', '.wav', '.m4a']);
};

// ── Captions ───────────────────────────────────────────────────────────────────
const captionsMode = meta.captions || 'section';

/** Split narration into short on-screen chunks, weighted by word count. */
const buildCaptions = (text, startFrame, durationFrames) => {
  const clean = String(text || '').trim();
  if (!clean) return [];
  const chunks = [];
  // Sentence first, then split anything still too long on commas / word count.
  for (const sentence of clean.split(/(?<=[.!?])\s+/)) {
    const words = sentence.split(/\s+/).filter(Boolean);
    if (words.length <= 9) {
      chunks.push(words.join(' '));
      continue;
    }
    for (let i = 0; i < words.length; i += 8) chunks.push(words.slice(i, i + 8).join(' '));
  }
  const totalWords = chunks.reduce((n, c) => n + c.split(/\s+/).length, 0) || 1;
  let cursor = startFrame;
  return chunks.map((c, i) => {
    const share = c.split(/\s+/).length / totalWords;
    const len = i === chunks.length - 1 ? startFrame + durationFrames - cursor : Math.round(durationFrames * share);
    const out = { text: c, startFrame: cursor, endFrame: cursor + Math.max(len, 6) };
    cursor = out.endFrame;
    return out;
  });
};

/** Word-level captions from an ElevenLabs forced-alignment JSON, if one was produced. */
const wordCaptions = (id, startFrame) => {
  const abs = join(demoDir, 'audio', `${id}.align.json`);
  if (!existsSync(abs)) return null;
  try {
    const data = JSON.parse(readFileSync(abs, 'utf8'));
    const words = data.words || data.characters || [];
    if (!words.length) return null;
    const groups = [];
    for (let i = 0; i < words.length; i += 4) groups.push(words.slice(i, i + 4));
    return groups.map((g) => ({
      text: g.map((w) => w.text ?? w.character ?? '').join(' ').replace(/\s+([,.!?])/g, '$1').trim(),
      startFrame: startFrame + f(Number(g[0].start ?? 0)),
      endFrame: startFrame + f(Number(g[g.length - 1].end ?? 0)),
    }));
  } catch {
    return null;
  }
};

// ── Fit one clip to the length the narration demands ───────────────────────────
function fitVideo(clipSeconds, neededSeconds, id) {
  const out = { playbackRate: 1, warpRatio: 1, holdLastFrameFrames: 0, trimBefore: 0, trimAfter: null };
  if (!clipSeconds || !neededSeconds) return out;

  const ratio = clipSeconds / neededSeconds;

  if (ratio > 1) {
    // Clip is longer than the narration needs.
    if (ratio <= MAX_RATE) {
      // Mild: play it slightly fast. Reads as brisk, not sped-up.
      out.playbackRate = Number(ratio.toFixed(4));
      out.warpRatio = out.playbackRate;
    } else {
      // Too long to hide in playback rate: run at the cap and trim the tail, which is
      // almost always dead time after the last action completed.
      out.playbackRate = MAX_RATE;
      const sourceSeconds = neededSeconds * MAX_RATE;
      out.trimAfter = f(sourceSeconds);
      out.warpRatio = MAX_RATE;
      const trimmed = clipSeconds - sourceSeconds;
      // Losing under a third of the clip is normal lead-out; losing more means the
      // capture and the narration disagree badly enough that a human must look.
      const level = trimmed > clipSeconds * 0.3 ? errors : warnings;
      level.push(
        `${id}: trimmed ${trimmed.toFixed(1)}s from the end of a ${clipSeconds.toFixed(1)}s clip to fit ` +
          `${neededSeconds.toFixed(1)}s of narration. Verify the final action is still on screen — if it is not, ` +
          'lengthen the narration or re-capture with less lead-out.'
      );
    }
  } else if (ratio < 1) {
    // Clip is shorter than the narration needs.
    if (ratio >= MIN_RATE) {
      out.playbackRate = Number(ratio.toFixed(4));
      out.warpRatio = out.playbackRate;
    } else {
      // Slowing further looks like lag. Play at the floor, then hold the final frame —
      // the camera move continues over the freeze so it reads as a deliberate beat.
      out.playbackRate = MIN_RATE;
      const effective = clipSeconds / MIN_RATE;
      out.holdLastFrameFrames = f(neededSeconds - effective);
      out.warpRatio = MIN_RATE;
      warnings.push(
        `${id}: clip is ${clipSeconds.toFixed(1)}s but narration needs ${neededSeconds.toFixed(1)}s, so ` +
          `${(neededSeconds - effective).toFixed(1)}s holds on the last frame. Prefer re-capturing with longer ` +
          'dwell times, or shortening the line.'
      );
    }
  }

  if (Math.abs(1 - out.warpRatio) > WARP_LIMIT + 1e-6) {
    errors.push(`${id}: computed time warp ${out.warpRatio} exceeds the ${WARP_LIMIT * 100}% limit.`);
  }
  return out;
}

// ── Build the timeline ─────────────────────────────────────────────────────────
const sections = [];
let cursor = 0;

(sb.sections ?? []).forEach((s, i) => {
  const captured = s.surface === 'web' || s.surface === 'electron';
  const clip = captured ? measure('capture', s.id, ['.mp4', '.webm']) : null;

  if (captured && !clip) {
    errors.push(`${s.id}: no clip found at demo/capture/${s.id}.mp4 — capture this section before rendering.`);
  }
  if (clip?.rel.endsWith('.webm')) {
    warnings.push(
      `${s.id}: only a raw .webm exists. Variable-frame-rate WebM seeks badly in Remotion; ` +
        'run scripts/transcode-clip.sh on it (the capture hook normally does this automatically).'
    );
  }

  const audio = String(s.voiceover ?? '').trim() ? findAudio(s.id) : null;
  if (String(s.voiceover ?? '').trim() && !audio) {
    errors.push(`${s.id}: narration text exists but no audio file — generate it (demo-voiceover skill).`);
  }

  const transition = {
    kind: s.transitionIn?.kind ?? (i === 0 ? 'cut' : 'crossfade'),
    seconds: s.transitionIn?.seconds ?? DEFAULT_TRANSITION,
  };
  // A surface change is a context change: cut hard so the viewer registers it.
  if (i > 0 && sb.sections[i - 1].surface !== s.surface && !s.transitionIn?.kind) {
    transition.kind = 'cut';
  }
  const overlapFrames = i === 0 || transition.kind === 'cut' ? 0 : f(transition.seconds);
  const startFrame = Math.max(0, cursor - overlapFrames);

  // How long does this section need to be? The crossfade overlap is part of the section
  // (startFrame moved back by overlapFrames), so it is added on top of lead-in +
  // narration + tail — otherwise a transition longer than TAIL eats into the narration
  // and the audio runs past the end of the section.
  const audioSeconds = audio?.seconds ?? 0;
  const leadInSeconds = LEAD_IN;
  const overlapSeconds = overlapFrames / fps;
  let neededSeconds;
  if (s.videoLed && clip) {
    neededSeconds = clip.seconds;
    if (audioSeconds && overlapSeconds + leadInSeconds + audioSeconds > neededSeconds) {
      neededSeconds = overlapSeconds + leadInSeconds + audioSeconds + TAIL;
      warnings.push(`${s.id}: marked videoLed but the narration is longer than the clip; extended to fit the voice.`);
    }
  } else if (audioSeconds) {
    neededSeconds = overlapSeconds + leadInSeconds + audioSeconds + TAIL;
  } else {
    neededSeconds = overlapSeconds + Number(s.targetSeconds || 4);
  }

  const fit = clip ? fitVideo(clip.seconds, neededSeconds, s.id) : null;
  const durationInFrames = Math.max(f(neededSeconds), 2);

  const audioDelayFrames = overlapFrames + f(leadInSeconds);
  let captions = [];
  if (captionsMode !== 'none' && audio) {
    captions =
      (captionsMode === 'word' ? wordCaptions(s.id, audioDelayFrames) : null) ??
      buildCaptions(s.voiceover, audioDelayFrames, f(audioSeconds));
    if (captionsMode === 'word' && !existsSync(join(demoDir, 'audio', `${s.id}.align.json`))) {
      warnings.push(
        `${s.id}: word-level captions requested but no ${s.id}.align.json exists; fell back to phrase captions. ` +
          'See skills/demo-voiceover/references/caption-alignment.md to produce alignment data.'
      );
    }
  }

  const section = {
    id: s.id,
    beat: s.beat,
    title: s.title,
    surface: s.surface,
    startFrame,
    durationInFrames,
    camera: {
      kind: s.camera?.kind ?? 'static',
      from: s.camera?.from ?? 1,
      to: s.camera?.to ?? (s.camera?.kind && s.camera.kind !== 'static' ? 1.06 : 1),
      focus: s.camera?.focus ?? 'center',
    },
    transitionIn: { ...transition, frames: overlapFrames },
  };

  if (clip && fit) {
    const videoFrames = durationInFrames - fit.holdLastFrameFrames;
    section.video = {
      src: clip.rel,
      measuredSeconds: clip.seconds,
      playbackRate: fit.playbackRate,
      warpRatio: Number(fit.warpRatio.toFixed(4)),
      holdLastFrameFrames: fit.holdLastFrameFrames,
      videoFrames: Math.max(videoFrames, 1),
      ...(fit.trimBefore ? { trimBefore: fit.trimBefore } : {}),
      ...(fit.trimAfter ? { trimAfter: fit.trimAfter } : {}),
    };
  }
  if (audio) {
    section.audio = {
      src: audio.rel,
      measuredSeconds: audio.seconds,
      delayFrames: audioDelayFrames,
      volume: 1,
    };
  }
  // Titlecards render onScreenText as their subtitle; a lower-third on top of that
  // would show the same string twice.
  if (s.onScreenText && s.surface !== 'titlecard') {
    section.lowerThird = {
      text: s.onScreenText,
      inFrame: audioDelayFrames,
      outFrame: Math.min(audioDelayFrames + f(3.2), durationInFrames),
    };
  }
  if (captions.length) section.captions = captions;
  if (s.surface === 'still') section.still = s.still;
  if (s.surface === 'code') section.code = s.code;
  if (s.surface === 'titlecard') section.titlecard = { title: s.title, subtitle: s.onScreenText };

  sections.push(section);
  cursor = startFrame + durationInFrames;
});

// ── Music bed + ducking ────────────────────────────────────────────────────────
let music;
if (meta.music?.src) {
  const abs = join(demoDir, meta.music.src);
  if (existsSync(abs)) {
    music = {
      src: meta.music.src,
      gainDb: meta.music.gainDb ?? -22,
      duckDb: meta.music.duckDb ?? -30,
      duckRanges: sections
        .filter((s) => s.audio)
        .map((s) => ({
          startFrame: s.startFrame + s.audio.delayFrames,
          endFrame: s.startFrame + s.audio.delayFrames + f(s.audio.measuredSeconds),
        })),
    };
  } else {
    warnings.push(`music: ${meta.music.src} not found; rendering without a bed.`);
  }
} else if (meta.music?.prompt) {
  warnings.push('music.prompt is set but no bed has been generated yet — use ElevenLabs compose_music, then re-reconcile.');
}

const targetSeconds = Number(meta.targetSeconds || 0);
const actualSeconds = Number((cursor / fps).toFixed(2));

const timeline = {
  generatedBy: 'demo-video-plugin/scripts/reconcile.mjs',
  title: meta.title,
  fps,
  width,
  height,
  durationInFrames: cursor,
  captionsMode,
  sections,
  ...(music ? { music } : {}),
  report: { targetSeconds, actualSeconds, warnings, errors },
};

if (args.includes('--json')) {
  process.stdout.write(`${JSON.stringify(timeline, null, 2)}\n`);
} else {
  writeFileSync(outPath, `${JSON.stringify(timeline, null, 2)}\n`);
}

const lines = [
  `demo-video: reconciled ${sections.length} sections -> ${actualSeconds}s (${cursor} frames @ ${fps}fps)` +
    (targetSeconds ? `, target ${targetSeconds}s` : '') +
    `${args.includes('--json') ? '' : ` -> ${outPath}`}`,
];
for (const w of warnings) lines.push(`  warn   ${w}`);
for (const e of errors) lines.push(`  ERROR  ${e}`);

if (errors.length) {
  console.error(lines.join('\n'));
  process.exit(1);
}
console.log(lines.join('\n'));
