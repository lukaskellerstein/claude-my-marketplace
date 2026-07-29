#!/usr/bin/env node
// PostToolUse: mcp__demo-elevenlabs__text_to_speech
//
// ElevenLabs' MCP server exposes no timestamp or alignment tool, so the only way to
// know how long a narration line actually is, is to measure it. Every generated file
// gets a duration sidecar here, and the section length is derived from that.
//
// Also warns early when the spoken line came out far from its storyboard budget —
// catching it now costs one regeneration, catching it at render time costs a re-cut.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  readHookInput, demoDir, emitContext, silent, which, probe, newestFile,
} from './lib/hookio.mjs';

const input = await readHookInput();
const dDir = demoDir(input);
const audioDir = join(dDir, 'audio');

if (!existsSync(dDir)) silent();
if (!which('ffprobe')) {
  emitContext(
    'PostToolUse',
    'demo-video: ffprobe not found, so narration duration could not be measured. ' +
      'Install ffmpeg before reconciling the timeline.'
  );
}

// The MCP server may write to its own base path; search the demo audio dir first,
// then the wider demo dir, then the default ElevenLabs output location.
const searchRoots = [audioDir, dDir, join(process.env.HOME || '', 'Desktop')].filter(
  (p) => p && existsSync(p)
);

let audio = null;
for (const root of searchRoots) {
  audio = newestFile(root, ['.mp3', '.wav', '.m4a', '.ogg'], 5 * 60 * 1000);
  if (audio) break;
}
if (!audio) silent();

const info = probe(audio.path);
const sidecar = audio.path.replace(/\.(mp3|wav|m4a|ogg)$/i, '.json');
const id = basename(audio.path).replace(/\.(mp3|wav|m4a|ogg)$/i, '');

writeFileSync(
  sidecar,
  `${JSON.stringify(
    {
      id,
      file: `audio/${basename(audio.path)}`,
      durationSeconds: info.durationSeconds,
      codec: info.codec,
      generatedAt: new Date().toISOString(),
    },
    null,
    2
  )}\n`
);

// Compare against the storyboard budget for this section, if we can find one.
let budgetNote = '';
const storyboardPath = join(dDir, 'storyboard.json');
if (existsSync(storyboardPath)) {
  try {
    const sb = JSON.parse(readFileSync(storyboardPath, 'utf8'));
    const section = (sb.sections || []).find((s) => id.startsWith(s.id));
    if (section) {
      const words = String(section.voiceover || '').trim().split(/\s+/).filter(Boolean).length;
      const wps = info.durationSeconds > 0 ? words / info.durationSeconds : 0;
      const target = Number(section.targetSeconds || 0);
      const drift = target ? (info.durationSeconds - target) / target : 0;
      budgetNote =
        ` Section "${section.id}" planned ${target}s, narration measured ${info.durationSeconds}s ` +
        `(${words} words, ${wps.toFixed(2)} words/sec).`;
      if (Math.abs(drift) > 0.2) {
        budgetNote +=
          ` WARNING: ${(drift * 100).toFixed(0)}% off budget. Either rewrite the line to ~${Math.round(
            target * 2.3
          )} words, adjust meta.voice.speed, or raise targetSeconds in the storyboard — ` +
          'and give the capture operator the measured duration as its dwell budget.';
      }
    }
  } catch {
    /* storyboard mid-edit; skip the comparison */
  }
}

emitContext(
  'PostToolUse',
  `demo-video: narration measured ${info.durationSeconds}s -> ${basename(sidecar)}.${budgetNote}`
);
