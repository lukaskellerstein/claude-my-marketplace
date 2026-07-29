#!/usr/bin/env node
// TIER 2 Electron capture. Playwright MCP cannot drive Electron, so electron-surface
// sections are captured by this script instead — driven by exactly the same `actions`
// array from storyboard.json that the web operator uses, so the two surfaces stay
// consistent.
//
// One Electron launch per section, because recordVideo is a launch-time option and we
// want one clip per section. Relaunching also gives each section clean state.
//
// After each take the output is size-checked: Electron recordVideo is known to produce
// zero-length WebM on some Playwright/Electron combinations, and a silently empty clip
// that reaches the render is much worse than a loud failure here.
//
// usage:
//   node capture-electron.mjs [--project DIR] [--section 07-native ...] [--dry]
//   node capture-electron.mjs --dry        # rehearse: no recording, reports what breaks

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// ── Resolve Playwright from the project, or from the plugin's own cache ─────────
async function loadElectron() {
  const candidates = [
    join(projectDir, 'node_modules', 'playwright'),
    join(projectDir, 'node_modules', '@playwright', 'test'),
    join(process.env.HOME || '', '.cache', 'demo-video-plugin', 'node_modules', 'playwright'),
  ];
  for (const dir of candidates) {
    if (!existsSync(dir)) continue;
    try {
      const require = createRequire(join(dir, 'package.json'));
      const pkgMain = require.resolve('.');
      const mod = await import(`file://${pkgMain}`);
      const electron = mod._electron ?? mod.default?._electron;
      if (electron) return electron;
    } catch {
      /* try the next candidate */
    }
  }
  console.error(
    'demo-video: Playwright is not importable. Install it once for the plugin:\n' +
      '  npm install --prefix "$HOME/.cache/demo-video-plugin" playwright\n' +
      'or add it to the project: npm install -D playwright'
  );
  process.exit(1);
}

// ── Storyboard ─────────────────────────────────────────────────────────────────
const storyboardPath = join(demoDir, 'storyboard.json');
if (!existsSync(storyboardPath)) {
  console.error(`demo-video: no storyboard at ${storyboardPath}.`);
  process.exit(1);
}
const sb = JSON.parse(readFileSync(storyboardPath, 'utf8'));
const meta = sb.meta ?? {};
const [vw, vh] = String(meta.captureSize || '1600x900').split('x').map(Number);
const electronCfg = meta.electron ?? {};

const sections = (sb.sections ?? [])
  .filter((s) => s.surface === 'electron')
  .filter((s) => !onlySections.length || onlySections.includes(s.id));

if (!sections.length) {
  console.log('demo-video: no electron-surface sections to capture.');
  process.exit(0);
}

mkdirSync(captureDir, { recursive: true });

// ── Human-feeling interaction primitives ───────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ease the pointer to a point over several steps so the cursor overlay animates. */
async function glideTo(page, x, y, steps = 12) {
  await page.mouse.move(x, y, { steps });
}

async function centerOf(page, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no bounding box (hidden or detached)');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Resolve a human description ("Search box", "Save button") to a locator, trying the
 * accessible strategies a person would reach for, most semantic first.
 */
function locatorsFor(page, target) {
  const t = target.replace(/\s+(button|box|field|input|link|menu|tab)$/i, '').trim();
  return {
    candidates: [
      page.getByRole('button', { name: t, exact: false }),
      page.getByRole('link', { name: t, exact: false }),
      page.getByRole('textbox', { name: t, exact: false }),
      page.getByLabel(t, { exact: false }),
      page.getByPlaceholder(t, { exact: false }),
      page.getByTestId(t),
      page.getByText(t, { exact: false }).first(),
      page.locator(target).first(),
    ],
  };
}

async function firstVisible(page, target, timeout = 6000) {
  const { candidates } = locatorsFor(page, target);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const c of candidates) {
      try {
        if (await c.isVisible({ timeout: 250 })) return c;
      } catch {
        /* next candidate */
      }
    }
    await sleep(150);
  }
  throw new Error(`could not find "${target}" on screen`);
}

/** Click a native application menu item by label path, e.g. "File>New Window". */
async function clickNativeMenu(app, path) {
  const labels = path.split('>').map((s) => s.trim());
  const ok = await app.evaluate(async ({ Menu }, wanted) => {
    const menu = Menu.getApplicationMenu();
    if (!menu) return false;
    let items = menu.items;
    let item = null;
    for (const label of wanted) {
      item = items.find(
        (i) => (i.label || '').replace(/&/g, '').toLowerCase() === label.toLowerCase()
      );
      if (!item) return false;
      items = item.submenu ? item.submenu.items : [];
    }
    if (!item) return false;
    item.click();
    return true;
  }, labels);
  if (!ok) throw new Error(`native menu item "${path}" not found`);
}

async function runAction(ctx, action) {
  const { page, app } = ctx;
  const dwellBefore = action.dwellBefore ?? 0.5;
  if (dwellBefore) await sleep(dwellBefore * 1000);

  switch (action.kind) {
    case 'goto':
      await page.goto(action.path);
      break;

    case 'click':
    case 'dblclick': {
      const el = await firstVisible(page, action.target);
      const { x, y } = await centerOf(page, el);
      await glideTo(page, x, y);
      await sleep(280); // let the pointer settle before the click reads as intentional
      if (action.kind === 'dblclick') await page.mouse.dblclick(x, y);
      else await page.mouse.click(x, y);
      break;
    }

    case 'hover': {
      const el = await firstVisible(page, action.target);
      const { x, y } = await centerOf(page, el);
      await glideTo(page, x, y);
      break;
    }

    case 'type': {
      const el = await firstVisible(page, action.target);
      const { x, y } = await centerOf(page, el);
      await glideTo(page, x, y);
      await page.mouse.click(x, y);
      const cps = action.wps ?? 6; // characters per second — 6 reads as brisk but human
      await el.pressSequentially(action.text, { delay: 1000 / cps });
      break;
    }

    case 'press':
    case 'shortcut':
      await page.keyboard.press(action.key ?? action.to);
      break;

    case 'scroll': {
      // Several small wheel events, not one jump: the motion is the point.
      const total = action.by ?? 400;
      const steps = Math.max(4, Math.min(20, Math.round(Math.abs(total) / 60)));
      if (action.target) {
        const el = await firstVisible(page, action.target);
        const { x, y } = await centerOf(page, el);
        await glideTo(page, x, y);
      }
      for (let i = 0; i < steps; i++) {
        await page.mouse.wheel(0, total / steps);
        await sleep(1000 / 45);
      }
      break;
    }

    case 'waitFor': {
      const timeout = (action.idleUpTo ?? 5) * 1000;
      if (action.target) await firstVisible(page, action.target, timeout);
      else await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
      break;
    }

    case 'dwell':
      await sleep((action.seconds ?? 1) * 1000);
      break;

    case 'select': {
      const el = await firstVisible(page, action.target);
      await el.selectOption(action.to ?? action.text);
      break;
    }

    case 'upload': {
      const el = await firstVisible(page, action.target);
      await el.setInputFiles(join(projectDir, action.path ?? action.text));
      break;
    }

    case 'menu':
      await clickNativeMenu(app, action.to ?? action.target);
      break;

    case 'window': {
      const windows = app.windows();
      const idx = Number(action.to ?? 1);
      const target = windows[idx] ?? (await app.waitForEvent('window', { timeout: 5000 }));
      await target.bringToFront?.();
      ctx.page = target;
      break;
    }

    case 'eval':
      await page.evaluate(action.text);
      break;

    default:
      throw new Error(`unsupported action kind "${action.kind}"`);
  }

  if (action.dwellAfter) await sleep(action.dwellAfter * 1000);
  else await sleep(400); // let the UI settle so the next cut does not land mid-animation
}

// ── Capture one section ────────────────────────────────────────────────────────
const _electron = await loadElectron();
const results = [];

for (const section of sections) {
  const tmpDir = join(captureDir, `.tmp-${section.id}`);
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  const launchOptions = {
    args: electronCfg.args ?? ['.'],
    cwd: electronCfg.cwd ? resolve(projectDir, electronCfg.cwd) : projectDir,
    env: { ...process.env, ...(electronCfg.env ?? {}), DEMO_CAPTURE: '1' },
    ...(electronCfg.executablePath ? { executablePath: electronCfg.executablePath } : {}),
    ...(dryRun ? {} : { recordVideo: { dir: tmpDir, size: { width: vw, height: vh } } }),
  };

  const started = Date.now();
  let app;
  let error = null;
  const actionLog = [];

  try {
    app = await _electron.launch(launchOptions);
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.setViewportSize({ width: vw, height: vh }).catch(() => {});

    // The styled cursor: addInitScript covers later navigations, the direct evaluate
    // covers the window that is already open.
    const overlay = readFileSync(overlayPath, 'utf8');
    await page.addInitScript({ content: overlay }).catch(() => {});
    await page.evaluate(overlay).catch(() => {});
    if (electronCfg.freezeClock) {
      await page.evaluate((iso) => window.__demoFreezeClock?.(iso), electronCfg.freezeClock).catch(() => {});
    }

    const ctx = { app, page };
    await sleep(700); // settle before the first action so the clip does not open mid-paint

    for (const [i, action] of (section.actions ?? []).entries()) {
      const t0 = Date.now();
      try {
        await runAction(ctx, action);
        actionLog.push({ i, kind: action.kind, target: action.target, ms: Date.now() - t0, ok: true });
      } catch (err) {
        actionLog.push({ i, kind: action.kind, target: action.target, ms: Date.now() - t0, ok: false, error: err.message });
        throw new Error(`action ${i} (${action.kind}${action.target ? ` "${action.target}"` : ''}): ${err.message}`);
      }
    }

    await sleep(600); // hold the final state so the editor has a clean frame to cut on
  } catch (err) {
    error = err.message;
  } finally {
    // Closing the app is what flushes the video file to disk.
    try {
      await app?.close();
    } catch {
      /* already gone */
    }
  }

  const elapsed = (Date.now() - started) / 1000;
  let clipPath = null;
  let clipSize = 0;

  if (!dryRun) {
    const produced = existsSync(tmpDir) ? readdirSync(tmpDir).filter((n) => n.endsWith('.webm')) : [];
    if (produced.length) {
      const src = join(tmpDir, produced[0]);
      clipSize = statSync(src).size;
      clipPath = join(captureDir, `${section.id}.webm`);
      renameSync(src, clipPath);
    }
    rmSync(tmpDir, { recursive: true, force: true });

    if (clipPath && clipSize >= 4096) {
      try {
        execFileSync('bash', [join(here, 'transcode-clip.sh'), clipPath, '--fps', String(meta.fps || 30)], {
          stdio: 'inherit',
        });
      } catch {
        error = (error ? `${error}; ` : '') + 'transcode failed';
      }
    }
  }

  results.push({
    id: section.id,
    ok: !error && (dryRun || (clipPath && clipSize >= 4096)),
    dryRun,
    elapsedSeconds: Number(elapsed.toFixed(2)),
    targetSeconds: section.targetSeconds,
    clip: clipPath ? `capture/${section.id}.mp4` : null,
    clipBytes: clipSize,
    error,
    actionLog,
  });
}

// ── Report ─────────────────────────────────────────────────────────────────────
console.log(JSON.stringify({ mode: dryRun ? 'dry-run' : 'record', results }, null, 2));

const empties = results.filter((r) => !r.dryRun && r.clipBytes > 0 && r.clipBytes < 4096);
const failures = results.filter((r) => !r.ok);

if (empties.length) {
  console.error(
    `\ndemo-video: ${empties.length} Electron take(s) produced an empty WebM — this is the known ` +
      'Playwright/Electron recordVideo failure. Fall back to tier 3:\n' +
      empties
        .map(
          (r) =>
            `  bash scripts/capture-screen-macos.sh --app "<App Name>" --out demo/capture/${r.id}.webm --seconds ${r.targetSeconds ?? 20}`
        )
        .join('\n')
  );
}
if (failures.length) {
  console.error(
    `\ndemo-video: ${failures.length}/${results.length} section(s) failed. ` +
      'Fix the actions (or the app state) and re-run with --dry until every section passes before recording.'
  );
  process.exit(1);
}
