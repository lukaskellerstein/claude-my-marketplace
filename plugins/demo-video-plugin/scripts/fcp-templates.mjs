#!/usr/bin/env node
// The Motion templates Final Cut Pro can use on this Mac — titles, generators, transitions and
// effects, built in or installed (MotionVFX DesignStudio and other packs) — and the FCPXML
// versions it imports. Every name printed here is a name meta.fcp and sections[].fcp accept.
//
// usage:
//   fcp-templates.mjs                                   summary per kind, MotionVFX status
//   fcp-templates.mjs --list [--kind K] [--role R] [--pack P] [--vendor motionvfx]
//                     [--match TEXT] [--category C] [--placeholders | --all] [--limit N]
//   fcp-templates.mjs --roles                           downloaded templates per role
//   fcp-templates.mjs --packs                           MotionVFX theme packs and what each holds
//   fcp-templates.mjs --find NAME|CODE [--kind K]
//   fcp-templates.mjs --inspect NAME|CODE [--kind K]    length, text layers in export order,
//                                                       published parameters, drop zones, fonts
//   fcp-templates.mjs --sheet OUT.png NAME|CODE ...     contact sheet of thumbnails
//   fcp-templates.mjs --sheet OUT.png --role R [--pack P] [--kind K] [--limit 24] [--offset N]
//   fcp-templates.mjs --check [--project DIR]           every template the storyboard names:
//                                                       ready, placeholder (download it), missing
//   add --json to any of them
//
// Kinds: title, generator, transition, effect. Roles: lower-third, title, intro, module,
// background, callout, cursor, frame, infographic, ui, text, caption-style, transition, effect.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  fcpxmlVersions,
  findFcpApps,
  findTemplate,
  inspectTemplate,
  KINDS,
  listTemplates,
  resolveTemplate,
  storyboardTemplateRefs,
} from './lib/fcp.mjs';
import { DAILY_DOWNLOAD_LIMIT, mextension, packs } from './lib/motionvfx.mjs';

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(['--kind', '--role', '--pack', '--vendor', '--match', '--category', '--limit', '--offset', '--project', '--find', '--inspect', '--sheet']);
const has = (flag) => args.includes(flag);
const argOf = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : undefined;
};
/** Arguments that are neither a flag nor a flag's value. */
const positional = args.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.has(args[i - 1]));
const json = has('--json');
// Write and let the process end on its own: process.exit() right after a large write to a
// pipe cuts the output off at the pipe buffer.
const emit = (data, text) => process.stdout.write(`${json ? JSON.stringify(data, null, 2) : text}\n`);
const fail = (message) => {
  console.error(`demo-video: ${message}`);
  process.exit(1);
};

if (!findFcpApps().length) fail('no Final Cut Pro in /Applications.');

const kindArg = argOf('--kind');
if (kindArg && !KINDS[kindArg]) fail(`--kind must be one of ${Object.keys(KINDS).join(', ')}.`);
const brief = (t) => ({
  name: t.name,
  kind: t.kind,
  role: t.role,
  status: t.status,
  source: t.source,
  vendor: t.vendor,
  category: t.category,
  code: t.code,
  thumb: t.thumb ?? null,
});
const line = (t) =>
  `  ${t.name.padEnd(40)} ${t.kind.padEnd(10)} ${t.role.padEnd(13)} ${t.status === 'ready' ? '' : `${t.status} `}${t.category}`;

function filtered() {
  const pack = argOf('--pack');
  const packMembers = pack
    ? new Set((packs(listTemplates()).find((p) => p.pack.toLowerCase() === pack.toLowerCase())?.members ?? []).map((t) => t.uid))
    : null;
  const role = argOf('--role');
  const vendor = argOf('--vendor');
  const match = argOf('--match')?.toLowerCase();
  const category = argOf('--category');
  const status = has('--all') ? null : has('--placeholders') ? 'placeholder' : 'ready';
  return listTemplates({ kind: kindArg }).filter(
    (t) =>
      (!status || t.status === status) &&
      (!role || t.role === role) &&
      (!vendor || t.vendor === vendor) &&
      (!category || t.category === category) &&
      (!match || t.name.toLowerCase().includes(match)) &&
      (!packMembers || packMembers.has(t.uid))
  );
}

function sheet(out, templates) {
  const pics = templates.filter((t) => t.thumb);
  const skipped = templates.filter((t) => !t.thumb);
  if (!pics.length) fail('none of these templates has a thumbnail — placeholders have none until downloaded in mExtension.');
  const cols = Math.min(4, pics.length);
  const rows = Math.ceil(pics.length / cols);
  const inputs = pics.flatMap((t) => ['-i', t.thumb]);
  const pad = cols * rows - pics.length;
  for (let i = 0; i < pad; i++) inputs.push('-f', 'lavfi', '-i', 'color=c=0x303030:s=480x270:d=1');
  const cells = [...Array(cols * rows).keys()];
  const graph =
    cells.map((i) => `[${i}:v]scale=480:270:force_original_aspect_ratio=decrease,pad=480:270:(ow-iw)/2:(oh-ih)/2:color=0x303030,setsar=1[v${i}]`).join(';') +
    `;${cells.map((i) => `[v${i}]`).join('')}xstack=inputs=${cells.length}:layout=${cells
      .map((i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`)
      .join('|')}`;
  mkdirSync(dirname(resolve(out)), { recursive: true });
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', graph, '-frames:v', '1', resolve(out)], { stdio: 'pipe' });
  const legend = pics.map((t, i) => ({ cell: i + 1, row: Math.floor(i / cols) + 1, col: (i % cols) + 1, ...brief(t) }));
  emit(
    { sheet: resolve(out), cols, rows, legend, skipped: skipped.map(brief) },
    [
      `${resolve(out)}  (${cols}×${rows}, cells numbered left to right, top to bottom)`,
      ...legend.map((l) => `  ${String(l.cell).padStart(2)}  ${l.name.padEnd(40)} ${l.kind.padEnd(10)} ${l.role}`),
      ...(skipped.length ? [`  skipped, no thumbnail: ${skipped.map((t) => t.name).join(', ')}`] : []),
    ].join('\n')
  );
}

// ── --sheet ─────────────────────────────────────────────────────────────────────
const sheetOut = argOf('--sheet');
if (has('--sheet')) {
  if (!sheetOut) fail('--sheet needs an output path, e.g. demo/out/graphics/callouts.png');
  let templates;
  if (positional.length) {
    templates = positional.map((q) => findTemplate(q, { kind: kindArg }) ?? fail(`no template named "${q}"`));
  } else {
    const offset = Number(argOf('--offset') ?? 0);
    templates = filtered().slice(offset, offset + Number(argOf('--limit') ?? 24));
  }
  if (templates.length > 36) fail(`${templates.length} thumbnails is too many for one sheet — use --limit 24 and --offset.`);
  sheet(sheetOut, templates);
}

// ── --find / --inspect ─────────────────────────────────────────────────────────
else if (has('--find') || has('--inspect')) {
  const q = argOf('--find') ?? argOf('--inspect');
  const t = findTemplate(q, { kind: kindArg });
  if (!t) fail(`no template named "${q}". Try --list --match "${q}" --all.`);
  if (has('--find')) {
    emit(t, JSON.stringify(t, null, 2));
  } else {
    const info = inspectTemplate(t.path);
    const textNote =
      t.kind === 'title'
        ? 'text: fill with an array in this order'
        : 'text: FCPXML cannot set text on a generator — edit it in the FCP inspector';
    emit(
      { ...t, ...info },
      [
        `${t.name}  (${t.kind}, ${t.role}, ${t.status}${t.vendor ? `, ${t.vendor}` : ''})`,
        `  uid        ${t.uid}`,
        `  length     ${info.seconds}s (${info.durationFrames} frames @ ${info.frameRate}), ${info.width}×${info.height}`,
        `  ${textNote}`,
        ...info.texts.map((x, i) => {
          const shown = x.text.replace(/\s*\n\s*/g, ' ⏎ ');
          return `    [${i}] ${x.layer.padEnd(18)} "${shown.length > 60 ? `${shown.slice(0, 57)}…` : shown}"${x.font ? `  ${x.font}` : ''}`;
        }),
        `  position   ${
          {
            'content-position': 'yes — its MotionVFX Content Position control',
            fixed: 'no — it draws the footage under it and has no position control; it stays where its design puts it',
            transform: 'yes — moved as a whole',
          }[info.placement]
        }`,
        `  drop zones ${info.dropZones.length ? `${info.dropZones.join(', ')} — they show "DROP ZONE" art until media is dropped in, in FCP` : 'none'}`,
        `  published  ${info.params.join(', ') || 'none'}`,
        `  thumbnail  ${t.thumb ?? 'none'}`,
        ...(t.video ? [`  preview    ${t.video}`] : []),
      ].join('\n')
    );
  }
}

// ── --roles ─────────────────────────────────────────────────────────────────────
else if (has('--roles')) {
  const byRole = new Map();
  for (const t of filtered()) byRole.set(t.role, [...(byRole.get(t.role) ?? []), t]);
  const rows = [...byRole].sort((a, b) => b[1].length - a[1].length);
  emit(
    Object.fromEntries(rows.map(([r, ts]) => [r, ts.map(brief)])),
    rows
      .map(([r, ts]) => {
        const names = [...new Set(ts.map((t) => t.base))];
        return `  ${r.padEnd(14)} ${String(ts.length).padStart(4)}  ${names.slice(0, 8).join(', ')}${names.length > 8 ? ', …' : ''}`;
      })
      .join('\n')
  );
}

// ── --packs ─────────────────────────────────────────────────────────────────────
else if (has('--packs')) {
  const result = packs(listTemplates().filter((t) => has('--all') || t.status === 'ready'));
  emit(
    result.map((p) => ({ pack: p.pack, members: p.members.map(brief) })),
    result.length
      ? result.map((p) => `  ${p.pack.padEnd(20)} ${p.members.map((t) => `${t.name}${t.status === 'ready' ? '' : '*'}`).join(', ')}`).join('\n')
      : '  no MotionVFX theme packs downloaded'
  );
}

// ── --list ──────────────────────────────────────────────────────────────────────
else if (has('--list') || argOf('--category')) {
  const all = filtered();
  const limit = Number(argOf('--limit') ?? 0) || all.length;
  const shown = all.slice(0, limit);
  emit(shown.map(brief), [...shown.map(line), ...(all.length > shown.length ? [`  … ${all.length - shown.length} more`] : [])].join('\n'));
}

// ── --check ─────────────────────────────────────────────────────────────────────
else if (has('--check')) {
  const sbPath = join(resolve(argOf('--project') ?? process.cwd()), 'demo', 'storyboard.json');
  if (!existsSync(sbPath)) fail(`no storyboard at ${sbPath}`);
  const refs = storyboardTemplateRefs(JSON.parse(readFileSync(sbPath, 'utf8'))).map((r) => {
    const { template, status } = resolveTemplate(r.name, { kind: r.kind });
    return { ...r, status, template: template?.name ?? null, code: template?.code ?? null };
  });
  const download = refs.filter((r) => r.status === 'placeholder');
  const missing = refs.filter((r) => r.status === 'missing');
  emit(
    { refs, download, missing },
    [
      ...refs.map((r) => `  ${r.status.padEnd(12)} ${r.name.padEnd(40)} ${r.where}`),
      ...(download.length
        ? ['', `Download in mExtension first (search the code; ${download.length} of ${DAILY_DOWNLOAD_LIMIT} a day):`, ...[...new Set(download.map((r) => r.template))].map((n) => `  ${n}`)]
        : []),
      ...(missing.length ? ['', 'Not on this Mac — the export falls back or skips these, with a note.'] : []),
      ...(refs.length ? [] : ['  the storyboard names no templates']),
    ].join('\n')
  );
  if (download.length || missing.length) process.exitCode = 1;
}

// ── summary ─────────────────────────────────────────────────────────────────────
else {
  const all = listTemplates();
  const count = (pred) => all.filter(pred).length;
  const mx = mextension();
  const summary = {
    apps: findFcpApps(),
    fcpxml: fcpxmlVersions().map((v) => v.version),
    kinds: Object.fromEntries(
      Object.keys(KINDS).map((k) => [
        k,
        {
          builtIn: count((t) => t.kind === k && t.source === 'built-in'),
          installed: count((t) => t.kind === k && t.source === 'user' && t.status === 'ready'),
          placeholders: count((t) => t.kind === k && t.status === 'placeholder'),
        },
      ])
    ),
    motionvfx: {
      mextension: Boolean(mx.app || mx.data),
      downloaded: count((t) => t.vendor === 'motionvfx' && t.status === 'ready'),
      placeholders: count((t) => t.vendor === 'motionvfx' && t.status === 'placeholder'),
      packs: packs(all.filter((t) => t.status === 'ready')).map((p) => p.pack),
    },
  };
  emit(
    summary,
    [
      `Final Cut Pro: ${summary.apps.join(', ')}`,
      `FCPXML import versions: ${summary.fcpxml.join(', ')}`,
      '',
      '  kind        built-in  installed  placeholders',
      ...Object.entries(summary.kinds).map(
        ([k, c]) => `  ${k.padEnd(10)} ${String(c.builtIn).padStart(9)} ${String(c.installed).padStart(10)} ${String(c.placeholders).padStart(13)}`
      ),
      '',
      summary.motionvfx.mextension
        ? `MotionVFX: mExtension present, ${summary.motionvfx.downloaded} elements downloaded, ${summary.motionvfx.placeholders} not downloaded (placeholders)`
        : 'MotionVFX: mExtension not installed',
      ...(summary.motionvfx.packs.length ? [`  theme packs: ${summary.motionvfx.packs.join(', ')}`] : []),
      '',
      'Next: --roles, --packs, --list --role lower-third, --inspect NAME, --sheet OUT.png --role callout',
    ].join('\n')
  );
}
