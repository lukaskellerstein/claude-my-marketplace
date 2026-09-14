#!/usr/bin/env node
// ATTACHED capture: drive an app that is already running, over CDP, and record its window
// with OBS. Driven by the same storyboard `actions` as the other capture paths.
//
// Use it when the pipeline must not own the app's launch — an isolated database, a wrapper
// script, a packaged build, a window-placement rule — and whenever text must stay crisp:
// OBS records the real window at native pixels and 60 fps, where Playwright's recordVideo
// is VP8 at 25 fps.
//
// The app must expose a CDP endpoint (Electron: --remote-debugging-port=N; Chrome: the
// same flag). The script never launches, closes or restarts it; `resetBefore` runs
// demo/prep/reset.sh, which may, and the script reconnects afterwards.
//
// Configured from meta.capture in storyboard.json:
//   "capture": {
//     "driver": "attach", "recorder": "obs", "attach": "http://127.0.0.1:9444",
//     "page": "My App",              // optional: part of the page title or URL
//     "input": "cdp",                // or "dom" — see scripts/lib/actions.mjs
//     "windowSize": "1600x900",      // optional: size the page's viewport over CDP
//     "obs": { "input": "demo-window", "window": "My App", "scene": "demo-video" }
//   }
//
// usage:
//   node capture-attached.mjs [--project DIR] [--attach URL] [--section 03-ask ...] [--dry]

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installOverlay, runAction, sleep, viewportOf } from './lib/actions.mjs';
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
const storyboardPath = join(demoDir, 'storyboard.json');
if (!existsSync(storyboardPath)) {
  console.error(`demo-video: no storyboard at ${storyboardPath}.`);
  process.exit(1);
}
const sb = JSON.parse(readFileSync(storyboardPath, 'utf8'));
const meta = sb.meta ?? {};
const cap = meta.capture ?? {};
const endpoint = argOf('--attach', cap.attach);
if (!endpoint) {
  console.error('demo-video: no CDP endpoint — set meta.capture.attach or pass --attach http://127.0.0.1:9222');
  process.exit(1);
}
const fps = meta.fps || 30;

const sections = (sb.sections ?? [])
  .filter((s) => s.surface === 'web' || s.surface === 'electron')
  .filter((s) => !onlySections.length || onlySections.includes(s.id));
if (!sections.length) {
  console.log('demo-video: no captured sections to run.');
  process.exit(0);
}
mkdirSync(captureDir, { recursive: true });

const { chromium } = await loadPlaywright(projectDir);
const overlay = readFileSync(join(here, '..', 'assets', 'cursor-overlay.js'), 'utf8');

/** Attach, retrying — a reset script may have just restarted the app. */
async function attach(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      return await chromium.connectOverCDP(endpoint, { timeout: 5000 });
    } catch (err) {
      if (Date.now() > deadline) throw new Error(`cannot attach to ${endpoint}: ${err.message}`);
      await sleep(1000);
    }
  }
}

function pickPage(browser) {
  const pages = browser.contexts().flatMap((c) => c.pages());
  const wanted = cap.page?.toLowerCase();
  const usable = pages.filter((p) => !p.url().startsWith('devtools://'));
  if (!wanted) return usable[0];
  return usable.find((p) => p.url().toLowerCase().includes(wanted)) ?? null;
}

async function pageByTitle(browser) {
  const direct = pickPage(browser);
  if (direct || !cap.page) return direct;
  const wanted = cap.page.toLowerCase();
  for (const p of browser.contexts().flatMap((c) => c.pages())) {
    if ((await p.title()).toLowerCase().includes(wanted)) return p;
  }
  return null;
}

/** Size the viewport by resizing the window around it. Electron may refuse; then say so. */
async function sizeViewport(page) {
  if (!cap.windowSize) return null;
  const [w, h] = cap.windowSize.split('x').map(Number);
  try {
    const cdp = await page.context().newCDPSession(page);
    const { windowId } = await cdp.send('Browser.getWindowForTarget');
    const chrome = await page.evaluate(() => [window.outerWidth - window.innerWidth, window.outerHeight - window.innerHeight]);
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width: w + chrome[0], height: h + chrome[1] } });
    await sleep(300);
  } catch (err) {
    return `could not resize over CDP (${err.message}); size the window yourself`;
  }
  const [iw, ih] = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
  return iw === w && ih === h ? null : `viewport is ${iw}x${ih}, wanted ${w}x${h} (a tiling window manager may be resizing it)`;
}

const results = [];

for (const section of sections) {
  const started = Date.now();
  const log = [];
  const warnings = [];
  let recorder = null;
  let recording = false;
  let browser = null;
  let saved = null;
  let error = null;
  let viewport = null;

  try {
    if (section.resetBefore) {
      const reset = join(demoDir, 'prep', 'reset.sh');
      if (!existsSync(reset)) throw new Error('resetBefore is set but demo/prep/reset.sh does not exist');
      execFileSync('bash', [reset], { cwd: projectDir, stdio: 'inherit' });
    }

    browser = await attach();
    const page = await pageByTitle(browser);
    if (!page) throw new Error(`no page matches meta.capture.page "${cap.page}"`);
    await installOverlay(page, overlay);
    const sizeWarning = await sizeViewport(page);
    if (sizeWarning) warnings.push(sizeWarning);

    recorder = await createRecorder(dryRun ? 'none' : cap.recorder ?? 'obs', {
      ...(cap.obs ?? {}),
      warn: (w) => warnings.push(w),
    });
    const ctx = {
      page,
      recorder,
      input: cap.input ?? 'cdp',
      log,
      clock: () => Number(recorder.elapsed().toFixed(3)),
      resolvePath: (p) => resolve(projectDir, p),
    };

    // Setup runs off camera: the clip opens on the state the section is about.
    for (const [i, action] of (section.setup ?? []).entries()) {
      await runAction({ ...ctx, log: [] }, action, i);
    }

    viewport = await viewportOf(page);
    await recorder.prepare();
    await recorder.start();
    recording = true;
    await sleep(500);

    for (const [i, action] of (section.actions ?? []).entries()) {
      await runAction(ctx, action, i);
    }
    await sleep(600); // hold the final state so the editor has a clean frame to cut on

    const rawPath = await recorder.stop();
    recording = false;
    if (!dryRun) {
      saved = saveClip({ rawPath, id: section.id, captureDir, fps });
      writeFileSync(
        join(captureDir, `${section.id}.actions.json`),
        `${JSON.stringify({ id: section.id, clock: 'seconds on the recording, pauses removed', viewport, actions: log }, null, 2)}\n`
      );
    }
  } catch (err) {
    error = err.message;
    if (recording) {
      // Keep the failed take for inspection, never let it reach the timeline.
      try {
        const rawPath = await recorder.stop();
        if (rawPath && existsSync(rawPath)) {
          mkdirSync(join(captureDir, 'raw'), { recursive: true });
          renameSync(rawPath, join(captureDir, 'raw', `${section.id}.failed${rawPath.slice(rawPath.lastIndexOf('.'))}`));
        }
      } catch {
        /* the recorder is gone too */
      }
    }
  } finally {
    await recorder?.close();
    // Disconnects only: a browser reached with connectOverCDP keeps running.
    await browser?.close().catch(() => {});
  }

  results.push({
    id: section.id,
    ok: !error,
    dryRun,
    elapsedSeconds: Number(((Date.now() - started) / 1000).toFixed(2)),
    targetSeconds: section.targetSeconds,
    clip: saved?.clip ?? null,
    raw: saved?.raw ?? null,
    error,
    warnings,
    actionLog: log,
  });
}

console.log(JSON.stringify({ mode: dryRun ? 'dry-run' : 'record', endpoint, results }, null, 2));

const failures = results.filter((r) => !r.ok);
if (failures.length) {
  console.error(
    `\ndemo-video: ${failures.length}/${results.length} section(s) failed. ` +
      'Fix the actions or the app state, re-run with --dry until every section passes, then record.'
  );
  process.exit(1);
}
