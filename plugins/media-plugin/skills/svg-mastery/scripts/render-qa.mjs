#!/usr/bin/env node
/**
 * render-qa.mjs — the svg-mastery render-and-inspect harness.
 *
 *   node render-qa.mjs <file.svg> [options]
 *
 * Steps (the loop's mechanical half):
 *   1. xmllint --noout    — well-formedness (hard fail on malformed XML).
 *   2. rasterize to PNG@2× — @resvg/resvg-js by default; auto-switches to
 *      headless Chrome (Playwright) when the SVG needs CSS/fonts/animation.
 *   3. (--svgo) optimize   — fixed SVGO config, writes <file>.min.svg.
 *
 * It does NOT judge the picture. After it prints the PNG path(s), YOU must
 * Read them and score against references/validation-and-qa.md, then iterate.
 *
 * Options:
 *   --out <path>          PNG output path (default: <file>.png, or .dark.png/.white.png for --bg both)
 *   --bg <dark|white|both>  background to render on (default: both — catches invisible fills on either).
 *   --width <px>          raster width before 2× (default: 1600 → renders at 3200px)
 *   --renderer <auto|resvg|chrome>   force a renderer (default: auto)
 *   --svgo                run SVGO and write <file>.min.svg
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename, extname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BG = { dark: '#0e1116', white: '#ffffff' };

// ---- arg parsing ------------------------------------------------------------
const argv = process.argv.slice(2);
if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 24).join('\n').replace(/^ \* ?/gm, ''));
  process.exit(argv.length === 0 ? 1 : 0);
}
const VALUE_FLAGS = ['--out', '--bg', '--width', '--renderer'];
function opt(name, def) {
  const i = argv.indexOf(name);
  return i === -1 ? def : argv[i + 1];
}
// positional file = first token that isn't a flag and isn't a flag's value
const positional = argv.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(argv[i - 1]));
const file = resolve(positional[0]);
const bg = opt('--bg', 'both');
const width = parseInt(opt('--width', '1600'), 10);
let renderer = opt('--renderer', 'auto');
const runSvgo = argv.includes('--svgo');
const outArg = opt('--out', null);

if (!existsSync(file)) {
  console.error(`✗ file not found: ${file}`);
  process.exit(1);
}
const svg = readFileSync(file, 'utf8');

// ---- step 1: well-formedness ------------------------------------------------
try {
  execFileSync('xmllint', ['--noout', file], { stdio: 'pipe' });
  console.log('✓ xmllint: well-formed');
} catch (e) {
  console.error('✗ xmllint: malformed XML — fix before rendering:');
  console.error((e.stderr || e.stdout || e.message).toString().trim());
  process.exit(1);
}

// ---- choose renderer --------------------------------------------------------
// Browser-only features: <style>, web fonts, CSS animation, blend modes, foreignObject.
const needsBrowser = /<style[\s>]|@font-face|fonts\.(googleapis|gstatic)|@keyframes|animation\s*:|mix-blend-mode|<foreignObject/i.test(svg);
if (renderer === 'auto') renderer = needsBrowser ? 'chrome' : 'resvg';
if (renderer === 'resvg' && needsBrowser) {
  console.warn('⚠ SVG uses <style>/web-fonts/animation/blend-modes — resvg may render it WRONG. Prefer --renderer chrome.');
}

const backgrounds = bg === 'both' ? ['dark', 'white'] : [bg];
const base = join(dirname(file), basename(file, extname(file)));
const outPaths = [];

// ---- step 2: rasterize ------------------------------------------------------
async function renderResvg(bgName, outPath) {
  let Resvg;
  try {
    ({ Resvg } = await import('@resvg/resvg-js'));
  } catch {
    console.error(`✗ @resvg/resvg-js not installed. Run:  (cd "${HERE}" && npm install)`);
    process.exit(2);
  }
  const r = new Resvg(svg, {
    background: BG[bgName] || '#ffffff',
    fitTo: { mode: 'width', value: width * 2 },
    font: { loadSystemFonts: true },
  });
  writeFileSync(outPath, r.render().asPng());
}

async function renderChrome(bgName, outPath) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error('✗ Playwright not available — needed for SVGs with CSS/web-fonts/animation. Run:');
    console.error('    npm i -D playwright && npx playwright install chromium');
    console.error('  (or re-run with --renderer resvg to accept system-font fallback)');
    process.exit(2);
  }
  const b = await chromium.launch();
  try {
    const page = await b.newPage({ deviceScaleFactor: 2, viewport: { width, height: width } });
    await page.setContent(
      `<!doctype html><meta charset="utf-8"><body style="margin:0;background:${BG[bgName]}">${svg}</body>`,
      { waitUntil: 'networkidle' }, // let Google Fonts load
    );
    await page.locator('svg').first().screenshot({ path: outPath });
  } finally {
    await b.close();
  }
}

for (const bgName of backgrounds) {
  const suffix = backgrounds.length > 1 ? `.${bgName}` : '';
  const outPath = outArg && backgrounds.length === 1 ? resolve(outArg) : `${base}${suffix}.png`;
  if (renderer === 'chrome') await renderChrome(bgName, outPath);
  else await renderResvg(bgName, outPath);
  outPaths.push(outPath);
  console.log(`✓ rendered (${renderer}, bg=${bgName}) → ${outPath}`);
}

// ---- step 3: optional SVGO --------------------------------------------------
if (runSvgo) {
  let optimize;
  try {
    ({ optimize } = await import('svgo'));
  } catch {
    console.error(`✗ svgo not installed. Run:  (cd "${HERE}" && npm install)`);
    process.exit(2);
  }
  const { data } = optimize(svg, {
    path: file,
    multipass: true,
    plugins: [
      { name: 'preset-default', params: { overrides: { removeViewBox: false } } },
      { name: 'cleanupNumericValues', params: { floatPrecision: 2 } },
      'sortAttrs',
    ],
  });
  const minPath = `${base}.min.svg`;
  writeFileSync(minPath, data);
  const pct = (100 * (1 - data.length / svg.length)).toFixed(0);
  console.log(`✓ svgo → ${minPath}  (${svg.length}→${data.length} bytes, −${pct}%)`);
}

// ---- the human half ---------------------------------------------------------
console.log('\n→ NOW: Read the PNG(s) and score against validation-and-qa.md.');
console.log('  Any failing rubric line ⇒ fix and re-run (max 5 passes, accept only strict improvements).');
console.log('  PNG: ' + outPaths.join('  '));
