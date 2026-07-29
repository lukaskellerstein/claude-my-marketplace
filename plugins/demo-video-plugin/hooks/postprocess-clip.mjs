#!/usr/bin/env node
// PostToolUse: mcp__demo-playwright__browser_stop_video
//
// Playwright records VP8 WebM at a fixed 25fps. Two problems for editing:
//   1. Remotion seeks VP8 WebM slowly and sometimes inaccurately.
//   2. The container's reported duration is unreliable, and 25fps does not match the
//      composition fps (default 30).
//
// So the moment a recording stops, transcode to constant-frame-rate H.264 MP4 at the
// composition fps and write a measured sidecar (both done by scripts/transcode-clip.sh —
// the single implementation of the clip contract). Everything downstream reads the
// sidecar, never a guess.

import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readHookInput, demoDir, emitContext, silent, which, run, probe, newestFile,
} from './lib/hookio.mjs';

const TARGET_FPS = Number(process.env.DEMO_FPS || 30);
const CRF = Number(process.env.DEMO_CLIP_CRF || 18);
const here = dirname(fileURLToPath(import.meta.url));

const input = await readHookInput();
const captureDir = join(demoDir(input), 'capture');

if (!existsSync(captureDir)) silent();
if (!which('ffmpeg') || !which('ffprobe')) {
  emitContext(
    'PostToolUse',
    'demo-video: ffmpeg/ffprobe not found, so the recorded clip was NOT transcoded or measured. ' +
      'Install ffmpeg (brew install ffmpeg) and re-capture this section — ' +
      'the raw WebM is not safe to feed to Remotion.'
  );
}

// browser_stop_video does not reliably report the path, so take the newest webm.
const clip = newestFile(captureDir, ['.webm']);
if (!clip) {
  emitContext(
    'PostToolUse',
    `demo-video: browser_stop_video ran but no fresh .webm was found under ${captureDir}. ` +
      "The server's --output-dir resolves relative to its working directory — check where the " +
      'recording actually landed, move it to demo/capture/<id>.webm, and run scripts/transcode-clip.sh on it.'
  );
}

if (clip.size < 4096) {
  emitContext(
    'PostToolUse',
    `demo-video: the recording at ${basename(clip.path)} is ${clip.size} bytes — effectively empty. ` +
      'The take did not capture. Check that the demo-playwright server has --caps=devtools, ' +
      'then re-record this section. Do NOT continue to voiceover or render with this clip.'
  );
}

const mp4 = clip.path.replace(/\.webm$/i, '.mp4');

try {
  run('bash', [
    join(here, '..', 'scripts', 'transcode-clip.sh'),
    clip.path,
    mp4,
    '--fps', String(TARGET_FPS),
    '--crf', String(CRF),
  ]);
} catch (err) {
  emitContext(
    'PostToolUse',
    `demo-video: transcode of ${basename(clip.path)} failed: ${String(err.stderr || err.stdout || err.message).slice(0, 500)}`
  );
}

const info = probe(mp4);
const sidecar = mp4.replace(/\.mp4$/i, '.json');

const warnings = [];
if (info.durationSeconds < 1.2) {
  warnings.push(
    `only ${info.durationSeconds}s long — almost certainly a failed take, re-record it`
  );
}
if (info.fps && Math.abs(info.fps - TARGET_FPS) > 1) {
  warnings.push(`frame rate came out at ${info.fps} instead of ${TARGET_FPS}`);
}

emitContext(
  'PostToolUse',
  `demo-video: clip ready — capture/${basename(mp4)} measured ${info.durationSeconds}s ` +
    `at ${info.width}x${info.height}@${info.fps}fps (sidecar: ${basename(sidecar)}).` +
    (warnings.length ? ` WARNING: ${warnings.join('; ')}.` : '') +
    ' Use this measured duration when writing narration or reconciling — never the planned value.'
);
