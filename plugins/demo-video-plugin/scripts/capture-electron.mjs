#!/usr/bin/env node
// LAUNCH capture for Electron. Playwright MCP cannot drive Electron, so electron-surface
// sections are captured by this script instead — driven by exactly the same `actions`
// array from storyboard.json that the web operator uses, so the surfaces stay consistent.
//
// One Electron launch per section, because Playwright's recordVideo is a launch-time option
// and we want one clip per section. Relaunching also gives each section clean state.
//
// Two recorders (meta.capture.recorder, or --recorder):
//   playwright (default) — recordVideo. VP8 at 25 fps: fine for large UI, soft for text.
//     Electron recordVideo is known to produce zero-length WebM on some Playwright/Electron
//     combinations, so every take is size-checked.
//   obs — OBS records the real window (meta.capture.obs.window) at native pixels. The
//     window id changes with every launch, so the capture input is re-pointed each take.
//
// If the app's launch must stay the app's own (an isolated database, a wrapper script),
// start it yourself and use capture-attached.mjs instead.
//
// usage:
//   node capture-electron.mjs [--project DIR] [--section 07-native ...] [--recorder obs] [--dry]

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installOverlay, runAction, sleep } from './lib/actions.mjs';
import { loadPlaywright } from './lib/playwright.mjs';
import { createRecorder, saveClip } from './lib/recorders.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const projectDir = resolve(argOf('--project', process.cwd()));
const dryRun = args.includes('--dry');
const onlySections = args.reduce((acc, a, i) => (a === '--section' && args[i + 1] ? [...acc, args[i + 1]] : acc), []);

const demoDir = join(projectDir, 'demo');
const captureDir = join(demoDir, 'capture');
const overlayPath = join(here, '..', 'assets', 'cursor-overlay.js');

// ── Storyboard ─────────────────────────────────────────────────────────────────
const storyboardPath = join(demoDir, 'storyboard.json');
if (!existsSync(storyboardPath)) {
  console.error(`demo-video: no storyboard at ${storyboardPath}.`);
  process.exit(1);
}
const sb = JSON.parse(readFileSync(storyboardPath, 'utf8'));
const meta = sb.meta ?? {};
const cap = meta.capture ?? {};
const recorderKind = argOf('--recorder', cap.recorder ?? 'playwright');
const [vw, vh] = String(meta.captureSize || '1600x900').split('x').map(Number);
const electronCfg = meta.electron ?? {};
const fps = meta.fps || 30;

const sections = (sb.sections ?? [])
  .filter((s) => s.surface === 'electron')
  .filter((s) => !onlySections.length || onlySections.includes(s.id));

if (!sections.length) {
  console.log('demo-video: no electron-surface sections to capture.');
  process.exit(0);
}
if (!['playwright', 'obs'].includes(recorderKind)) {
  console.error(`demo-video: capture-electron records with "playwright" or "obs", not "${recorderKind}".`);
  process.exit(1);
}

mkdirSync(captureDir, { recursive: true });

const { _electron } = await loadPlaywright(projectDir);
const overlay = readFileSync(overlayPath, 'utf8');
const results = [];

for (const section of sections) {
  const tmpDir = join(captureDir, `.tmp-${section.id}`);
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  const usePlaywrightVideo = !dryRun && recorderKind === 'playwright';
  const launchOptions = {
    args: electronCfg.args ?? ['.'],
    cwd: electronCfg.cwd ? resolve(projectDir, electronCfg.cwd) : projectDir,
    env: { ...process.env, ...(electronCfg.env ?? {}), DEMO_CAPTURE: '1' },
    ...(electronCfg.executablePath ? { executablePath: electronCfg.executablePath } : {}),
    ...(usePlaywrightVideo ? { recordVideo: { dir: tmpDir, size: { width: vw, height: vh } } } : {}),
  };

  const started = Date.now();
  let app;
  let recorder = null;
  let error = null;
  let obsRaw = null;
  const warnings = [];
  const actionLog = [];

  try {
    app = await _electron.launch(launchOptions);
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.setViewportSize({ width: vw, height: vh }).catch(() => {});

    await installOverlay(page, overlay);
    if (electronCfg.freezeClock) {
      await page.evaluate((iso) => window.__demoFreezeClock?.(iso), electronCfg.freezeClock).catch(() => {});
    }

    recorder = await createRecorder(usePlaywrightVideo || dryRun ? 'none' : 'obs', {
      ...(cap.obs ?? {}),
      warn: (w) => warnings.push(w),
    });
    const ctx = {
      app,
      page,
      recorder,
      input: cap.input ?? 'cdp',
      log: actionLog,
      clock: () => Number(recorder.elapsed().toFixed(3)),
      resolvePath: (p) => join(projectDir, p),
    };

    for (const [i, action] of (section.setup ?? []).entries()) {
      await runAction({ ...ctx, log: [] }, action, i);
    }

    await sleep(700); // settle before the first action so the clip does not open mid-paint
    await recorder.prepare();
    await recorder.start();

    for (const [i, action] of (section.actions ?? []).entries()) {
      await runAction(ctx, action, i);
    }

    await sleep(600); // hold the final state so the editor has a clean frame to cut on
    obsRaw = await recorder.stop();
  } catch (err) {
    error = err.message;
    if (recorder?.kind === 'obs') obsRaw = await recorder.stop().catch(() => null);
  } finally {
    await recorder?.close();
    // Closing the app is what flushes a Playwright video file to disk.
    try {
      await app?.close();
    } catch {
      /* already gone */
    }
  }

  const elapsed = (Date.now() - started) / 1000;
  let clipPath = null;
  let clipSize = 0;

  if (usePlaywrightVideo) {
    const produced = existsSync(tmpDir) ? readdirSync(tmpDir).filter((n) => n.endsWith('.webm')) : [];
    if (produced.length) {
      const src = join(tmpDir, produced[0]);
      clipSize = statSync(src).size;
      clipPath = join(captureDir, `${section.id}.webm`);
      renameSync(src, clipPath);
    }
    if (clipPath && clipSize >= 4096 && !error) {
      try {
        execFileSync('bash', [join(here, 'transcode-clip.sh'), clipPath, '--fps', String(fps)], {
          stdio: ['ignore', process.stderr, process.stderr], // stdout carries the JSON report
        });
      } catch {
        error = 'transcode failed';
      }
    }
  } else if (!dryRun && obsRaw && !error) {
    try {
      const saved = saveClip({ rawPath: obsRaw, id: section.id, captureDir, fps });
      clipPath = join(demoDir, saved.clip);
      clipSize = saved.bytes;
    } catch (err) {
      error = err.message;
    }
  }
  rmSync(tmpDir, { recursive: true, force: true });

  // Only OBS gives a clock that matches the clip; recordVideo starts at launch.
  if (!dryRun && !error && recorderKind === 'obs') {
    writeFileSync(
      join(captureDir, `${section.id}.actions.json`),
      `${JSON.stringify({ id: section.id, clock: 'seconds on the recording, pauses removed', actions: actionLog }, null, 2)}\n`
    );
  }

  results.push({
    id: section.id,
    ok: !error && (dryRun || (clipPath && clipSize >= 4096)),
    dryRun,
    recorder: dryRun ? 'none' : recorderKind,
    elapsedSeconds: Number(elapsed.toFixed(2)),
    targetSeconds: section.targetSeconds,
    clip: clipPath ? `capture/${section.id}.mp4` : null,
    clipBytes: clipSize,
    error,
    warnings,
    actionLog,
  });
}

// ── Report ─────────────────────────────────────────────────────────────────────
console.log(JSON.stringify({ mode: dryRun ? 'dry-run' : 'record', results }, null, 2));

const empties = results.filter((r) => r.recorder === 'playwright' && r.clipBytes > 0 && r.clipBytes < 4096);
const failures = results.filter((r) => !r.ok);

if (empties.length) {
  console.error(
    `\ndemo-video: ${empties.length} Electron take(s) produced an empty WebM — the known ` +
      'Playwright/Electron recordVideo failure. Record those sections with OBS instead:\n' +
      empties.map((r) => `  node scripts/capture-electron.mjs --recorder obs --section ${r.id}`).join('\n')
  );
}
if (failures.length) {
  console.error(
    `\ndemo-video: ${failures.length}/${results.length} section(s) failed. ` +
      'Fix the actions (or the app state) and re-run with --dry until every section passes before recording.'
  );
  process.exit(1);
}
