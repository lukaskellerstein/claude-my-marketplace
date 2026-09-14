#!/usr/bin/env node
// SessionStart: environment + progress preflight.
//
// Deliberately silent in every project that has no demo/ directory — this hook runs in
// every session and must not add noise. When a demo IS in progress it reports two things
// Claude would otherwise have to rediscover: which tools are missing, and which pipeline
// stage the artifacts are actually at.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readHookInput, projectDir, emitContext, silent, which } from './lib/hookio.mjs';

const input = await readHookInput();
const root = projectDir(input);
const dDir = join(root, 'demo');

if (!existsSync(dDir)) silent();

/** Entries in demo/<dir> (or an absolute dir) ending in `ext`, optionally starting with `prefix`. */
const count = (dir, ext, prefix = '') => {
  try {
    return readdirSync(dir.startsWith('/') ? dir : join(dDir, dir)).filter(
      (f) => f.toLowerCase().endsWith(ext) && f.startsWith(prefix)
    ).length;
  } catch {
    return 0;
  }
};
const has = (p) => existsSync(join(dDir, p));

// ── Tooling ────────────────────────────────────────────────────────────────────
const missing = [];
if (!which('ffmpeg') || !which('ffprobe')) missing.push('ffmpeg/ffprobe (brew install ffmpeg)');
if (!which('npx')) missing.push('node/npx');
if (!which('uvx')) missing.push('uvx — needed by the demo-elevenlabs MCP server (brew install uv)');
if (!process.env.ELEVENLABS_API_KEY) missing.push('ELEVENLABS_API_KEY in the environment');

const playwrightCache = [
  join(process.env.HOME || '', 'Library/Caches/ms-playwright'),
  join(process.env.HOME || '', '.cache/ms-playwright'),
].some(existsSync);
if (!playwrightCache) missing.push('Playwright browsers (npx playwright install chromium)');

// Remotion is installed as a separate marketplace plugin; detect it best-effort.
const remotionInstalled =
  existsSync(join(dDir, 'studio/node_modules/remotion')) ||
  [
    join(process.env.HOME || '', '.claude/plugins/marketplaces'),
    join(process.env.HOME || '', '.claude/plugins/repos'),
  ].some((p) => {
    try {
      return readdirSync(p).some((n) => n.toLowerCase().includes('remotion'));
    } catch {
      return false;
    }
  });

// ── Pipeline stage ─────────────────────────────────────────────────────────────
let stage = 'brief';
let detail = '';
let notDownloaded = [];
if (has('out/demo.mp4')) stage = 'done (final render exists)';
else if (has('out/demo-draft.mp4')) stage = 'draft rendered — awaiting review';
else if (has('timeline.json')) stage = 'reconciled — ready to render';
else if (count('audio', '.mp3') > 0 && count('capture', '.mp4') > 0) stage = 'captured + voiced — ready to reconcile';
else if (count('capture', '.mp4') > 0) stage = 'clips captured — voiceover next';
else if (has('storyboard.json')) stage = 'storyboard written — capture next';
else if (has('brief.md')) stage = 'brief written — storyboard next';

if (has('storyboard.json')) {
  try {
    const sb = JSON.parse(readFileSync(join(dDir, 'storyboard.json'), 'utf8'));
    const total = (sb.sections || []).length;
    const captured = count('capture', '.mp4');
    const voiced = count('audio', '.mp3');
    const capture = sb.meta?.capture ?? {};
    detail =
      ` "${sb.meta?.title ?? 'untitled'}" — ${total} sections, ` +
      `${captured} clip(s) captured, ${voiced} narration file(s), target ${sb.meta?.targetSeconds ?? '?'}s.` +
      (capture.driver || capture.recorder
        ? ` Capture: driver ${capture.driver ?? 'default'}, recorder ${capture.recorder ?? 'playwright'}.`
        : '') +
      (has('out/demo.fcpxml') ? ' A Final Cut Pro project is exported at demo/out/demo.fcpxml.' : '');

    // Optional tools, checked only when this demo declares them.
    if (capture.recorder === 'obs') {
      if (!existsSync('/Applications/OBS.app')) missing.push('OBS (meta.capture.recorder is "obs")');
      if (!process.env.OBS_WEBSOCKET_PASSWORD) {
        missing.push('OBS_WEBSOCKET_PASSWORD in the environment (OBS → Tools → WebSocket Server Settings)');
      }
      if (Number(process.versions.node.split('.')[0]) < 22) missing.push('Node 22+ for the OBS WebSocket client');
    }
    const usesFcp = sb.meta?.fcp || (sb.sections ?? []).some((s) => s.fcp);
    if (usesFcp && !count('/Applications', '.app', 'Final Cut Pro')) {
      missing.push('Final Cut Pro (meta.fcp is set)');
    } else if (usesFcp) {
      // A MotionVFX element named but never downloaded blocks the export; say so up front.
      const { resolveTemplate, storyboardTemplateRefs } = await import('../scripts/lib/fcp.mjs');
      const toDownload = [
        ...new Set(
          storyboardTemplateRefs(sb)
            .map((r) => resolveTemplate(r.name, { kind: r.kind }))
            .filter((r) => r.status === 'placeholder')
            .map((r) => r.template.name)
        ),
      ];
      if (toDownload.length) {
        notDownloaded = toDownload;
      }
    }
  } catch {
    detail = ' (storyboard.json is present but does not parse — fix it before continuing.)';
  }
}

const lines = [
  `demo-video: a demo is in progress at demo/ — stage: ${stage}.${detail}`,
  'Load the demo-video skill before touching any demo/ artifact; it owns the pipeline and the stage gates.',
];
if (!remotionInstalled) {
  lines.push(
    'Remotion does not look installed. Run /demo-setup before the assembly stage (it adds the remotion marketplace plugin and skills).'
  );
}
if (missing.length) {
  lines.push(`Missing prerequisites: ${missing.join('; ')}. Run /demo-setup to fix.`);
}
if (notDownloaded.length) {
  lines.push(
    `The storyboard names MotionVFX elements that are not downloaded, so the FCP export will refuse to run: ${notDownloaded.join(', ')}. ` +
      'The user downloads them in Final Cut Pro → mExtension (see the demo-graphics skill). ' +
      'To see what one looks like first: scripts/motionvfx-catalog.mjs --preview CODE --out DIR.'
  );
}

emitContext('SessionStart', lines.join('\n'));
