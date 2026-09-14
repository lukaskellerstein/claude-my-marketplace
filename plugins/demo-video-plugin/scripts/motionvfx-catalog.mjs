#!/usr/bin/env node
// The MotionVFX catalog as MotionVFX publishes it — all of it, not only what this Mac has
// downloaded. mExtension shows 10,000+ elements in Final Cut Pro, but an element that was never
// downloaded has no thumbnail on disk, so it can only be picked by its name. This reads the
// public DesignStudio catalog instead: the real preview still, the real preview movie, the real
// length, styles and tags. Look first, download second.
//
// It is the only part of the plugin that uses the network. Everything in fcp-templates.mjs stays
// offline. No login, no key, and nothing is sent about this machine.
//
// usage:
//   motionvfx-catalog.mjs --preview CODE[,CODE…] --out DIR [--stills] [--sheet OUT.png]
//   motionvfx-catalog.mjs --search "lower third" [--kind titles] [--limit 24]
//                         [--out DIR [--sheet OUT.png]]
//   motionvfx-catalog.mjs --collections [--limit N]     what the downloaded elements belong to
//   add --json to any of them
//
// Codes are the 4 characters at the end of every MotionVFX name ("Keynote Lower3rd FB5S" -> FB5S).

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { listTemplates } from './lib/fcp.mjs';
import { catalogCollections, catalogElements, catalogSearch, code4, get } from './lib/motionvfx.mjs';
import { cellsOf, contactSheet, MAX_CELLS } from './lib/sheet.mjs';

const MAX_MOVIES = 12;

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const argOf = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : undefined;
};
const json = has('--json');
const emit = (data, text) => process.stdout.write(`${json ? JSON.stringify(data, null, 2) : text}\n`);
const fail = (message) => {
  console.error(`demo-video: ${message}`);
  process.exit(1);
};

/** What this Mac has for a code: downloaded, listed but not downloaded, or not listed at all. */
function localStatus() {
  const byCode = new Map();
  for (const t of listTemplates()) {
    if (!t.code) continue;
    const seen = byCode.get(t.code);
    if (!seen || (seen.status !== 'ready' && t.status === 'ready')) byCode.set(t.code, t);
  }
  return (code) => {
    const t = byCode.get(code);
    // The element endpoint does not say which FCP folder an element installs into; the copy on
    // this Mac does. Search results carry it themselves.
    return { local: t ? t.status : 'not-listed', installedAs: t?.name ?? null, localKind: t?.kind ?? null, role: t?.role ?? null };
  };
}

const download = async (url, to) => {
  await get(url, { toFile: to, timeoutMs: 60000 });
  return to;
};

function movieSeconds(file) {
  try {
    return Number(
      execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {
        encoding: 'utf8',
      }).trim()
    );
  } catch {
    return null;
  }
}

/** Fetch the preview media for a set of catalog elements into `dir`. */
async function materialize(elements, dir, { stillsOnly }) {
  mkdirSync(dir, { recursive: true });
  let movies = 0;
  for (const e of elements) {
    if (e.error) continue;
    e.files = {};
    try {
      if (e.image?.url) {
        const ext = e.image.format === 'jpeg' ? 'jpg' : e.image.format;
        e.files.image = await download(e.image.url, join(dir, `${e.code}-still.${ext}`));
      }
      if (!stillsOnly && e.video?.url && movies < MAX_MOVIES) {
        movies += 1;
        const ext = new URL(e.video.url).pathname.split('.').pop() || 'mp4';
        e.files.video = await download(e.video.url, join(dir, `${e.code}-preview.${ext}`));
        e.previewSeconds = movieSeconds(e.files.video);
      }
    } catch (error) {
      e.downloadError = error.message;
    }
  }
  return elements;
}

function describe(e) {
  if (e.error) return `  ${e.code}  ${e.error}`;
  const where = { ready: 'downloaded', placeholder: 'NOT downloaded', 'not-listed': 'not in mExtension here' }[e.local];
  return [
    `  ${e.code}  ${String(e.name ?? '').padEnd(34)} ${String(e.kind ?? e.localKind ?? '?').padEnd(12)} ${e.seconds ?? '?'}s  [${where}]`,
    e.styles?.length ? `        styles ${e.styles.join(', ')}` : null,
    e.files?.image ? `        still  ${e.files.image}` : null,
    e.files?.video ? `        movie  ${e.files.video}${e.previewSeconds ? ` (${e.previewSeconds.toFixed(2)}s)` : ''}` : null,
    e.downloadError ? `        download failed: ${e.downloadError}` : null,
    `        ${e.url}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Write the contact sheet, when one was asked for and there are stills to put on it. */
function sheetOf(elements, out) {
  const withStill = elements.filter((e) => e.files?.image).slice(0, MAX_CELLS);
  if (!withStill.length) fail('no preview stills were downloaded, so there is nothing to put on a sheet.');
  const { sheet, cols, rows } = contactSheet(out, withStill.map((e) => e.files.image));
  const legend = cellsOf(
    withStill.map((e) => ({ code: e.code, name: e.name, kind: e.kind, seconds: e.seconds, local: e.local })),
    cols
  );
  return {
    sheet,
    cols,
    rows,
    legend,
    text: [
      '',
      `${sheet}  (${cols}×${rows}, cells numbered left to right, top to bottom)`,
      ...legend.map(
        (l) => `  ${String(l.cell).padStart(2)}  ${l.code}  ${String(l.name).padEnd(34)} ${l.local === 'ready' ? '' : '(download first)'}`
      ),
    ].join('\n'),
  };
}

const status = localStatus();
const outDir = argOf('--out') ? resolve(argOf('--out')) : null;
const sheetOut = argOf('--sheet');

// ── --preview ───────────────────────────────────────────────────────────────────
if (has('--preview')) {
  const codes = String(argOf('--preview') ?? '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  if (!codes.length) fail('--preview needs one or more 4-character codes, e.g. --preview 6SMY,FB5S');
  let wanted;
  try {
    wanted = codes.map(code4);
  } catch (error) {
    fail(error.message);
  }
  if (wanted.length > MAX_CELLS) fail(`${wanted.length} codes is too many for one pass — shortlist ${MAX_CELLS} or fewer.`);

  const elements = (await catalogElements(wanted, { maxWidth: 960 })).map((e) => ({ ...e, ...status(e.code) }));
  if (outDir) await materialize(elements, outDir, { stillsOnly: has('--stills') });
  const sheet = sheetOut ? sheetOf(elements, sheetOut) : null;
  if (outDir) writeFileSync(join(outDir, 'catalog.json'), `${JSON.stringify(elements, null, 2)}\n`);
  emit({ elements, sheet }, [...elements.map(describe), sheet?.text ?? ''].filter(Boolean).join('\n'));
}

// ── --search ────────────────────────────────────────────────────────────────────
else if (has('--search')) {
  const text = argOf('--search');
  if (!text) fail('--search needs text, e.g. --search "lower third"');
  const limit = Number(argOf('--limit') ?? 24);
  const found = await catalogSearch({ text, kind: argOf('--kind') ?? null, limit, maxWidth: 960 });
  const elements = found.results.map((e) => ({ ...e, ...status(e.code) }));
  if (outDir) await materialize(elements, outDir, { stillsOnly: !has('--movies') });
  const sheet = sheetOut ? sheetOf(elements, sheetOut) : null;
  if (outDir) writeFileSync(join(outDir, 'catalog.json'), `${JSON.stringify(elements, null, 2)}\n`);
  emit(
    { query: text, total: found.total, elements, sheet },
    [
      `${found.total} elements match "${text}" in the MotionVFX catalog; showing ${elements.length}.`,
      ...elements.map(describe),
      sheet?.text ?? '',
    ]
      .filter(Boolean)
      .join('\n')
  );
}

// ── --collections ───────────────────────────────────────────────────────────────
else if (has('--collections')) {
  const codes = [...new Set(listTemplates().filter((t) => t.vendor === 'motionvfx' && t.status === 'ready' && t.code).map((t) => t.code))];
  if (!codes.length) fail('no downloaded MotionVFX elements on this Mac, so there is nothing to match against collections.');
  const rows = (await catalogCollections(codes)).slice(0, Number(argOf('--limit') ?? 0) || undefined);
  const matched = new Set(rows.flatMap((r) => r.codes)).size;
  emit(
    rows,
    [
      `${matched} of ${codes.length} downloaded MotionVFX elements are in ${rows.length} named collections:`,
      ...rows.map(
        (r) =>
          `  ${r.name.padEnd(28)} ${String(r.downloaded).padStart(4)}/${String(r.total).padEnd(5)} ` +
          `${Math.round((r.downloaded / r.total) * 100)}%`
      ),
      '',
      `The other ${codes.length - matched} are in no listed collection — theme packs and mCaptions are sold as products, not collections.`,
      'A collection that is almost complete is the cheapest place to find a matching element.',
    ].join('\n')
  );
}

// ── help ────────────────────────────────────────────────────────────────────────
else {
  emit(
    { usage: true },
    [
      'Look at MotionVFX elements before downloading them.',
      '',
      '  --preview CODE,CODE --out DIR [--sheet OUT.png] [--stills]   preview still + movie per code',
      '  --search "lower third" [--kind titles] [--limit 24]          search the whole catalog',
      '        add --out DIR [--sheet OUT.png] to see the results, --movies for preview movies',
      '  --collections                                                 what this Mac has, by collection',
      '',
      'Kinds: titles, generators, transitions, effects. Add --json to any command.',
    ].join('\n')
  );
}
