// `spex drop <dir> --reason "…"`: a step a re-cut of its roadmap removes. The folder and its work under .spex/
// (runs, evidence, review) move to .spex/archive/<folder>-<time>/, with the reason, so a half-built step's
// state is kept and nothing of it is mistaken for the new cut. A step with approved or built records is
// refused: those records are the live contract, and a new spec retires them.

import { readdirSync, renameSync } from 'node:fs';
import { basename, join } from 'node:path';
import { WORK_DIRS } from '../config.js';
import { ensureDir, isDir, writeText } from '../io.js';
import { readRoadmapFile } from '../roadmapfile.js';
import { resolveDependency, specMetaOf } from '../rules/spec.js';
import { featureDirs, loadFeature } from '../specs.js';
import type { Finding } from '../types.js';
import type { CmdResult } from './lifecycle.js';

export const ARCHIVE_DIR = '.spex/archive';

export function drop(root: string, given: string, reason: string): CmdResult {
  const dir = resolveDependency(root, given);
  if (!dir) return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: `${given}: no such folder under specs/`, fix: 'spex roadmap <name> lists the steps.' }], exit: 2, text: '' };
  if (!reason.trim()) return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: 'drop needs --reason "…"', fix: 'Say why the step goes: the re-cut that removed it, and where its scope went.' }], exit: 2, text: '' };
  const name = dir.split('/').pop()!;
  const live = (loadFeature(root, dir).requirements?.requirements ?? []).filter((r) => r.status === 'approved' || r.status === 'built');
  if (live.length) return { ok: false, findings: [{ severity: 'error', code: 'DROP-LIVE', message: `${name} has ${live.length} approved or built record(s): ${live.slice(0, 5).map((r) => r.id).join(', ')}`, path: dir, fix: 'Those records are the live contract. Retire them with a new spec that supersedes them; drop is for a step nobody approved yet.' }], exit: 6, text: '' };
  const meta = specMetaOf(root, dir);
  const number = name.slice(0, 3);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const dest = `${ARCHIVE_DIR}/${name}-${stamp}`;
  ensureDir(join(root, dest));
  const moved: string[] = [];
  renameSync(join(root, dir), join(root, dest, 'spec'));
  moved.push(`${dir} → ${dest}/spec`);
  for (const w of WORK_DIRS) {
    const src = join(root, w, number);
    if (isDir(src)) {
      renameSync(src, join(root, dest, basename(w)));
      moved.push(`${w}/${number} → ${dest}/${basename(w)}`);
    } else if (isDir(join(root, w))) {
      // .spex/review keeps files named <feature>-<round>…, not a folder per feature
      for (const f of readdirSync(join(root, w)).filter((x) => x.startsWith(`${number}-`))) {
        ensureDir(join(root, dest, basename(w)));
        renameSync(join(root, w, f), join(root, dest, basename(w), f));
        moved.push(`${w}/${f} → ${dest}/${basename(w)}/${f}`);
      }
    }
  }
  const when = new Date().toISOString();
  writeText(join(root, dest, 'DROPPED.md'), [`# Dropped ${name}`, '', `- when: ${when}`, `- roadmap: ${meta?.roadmap ?? '(none)'}, step ${meta?.step ?? '?'}`, `- reason: ${reason.trim()}`, '', 'The folder is under spec/, its work under runs/, evidence/ and review/, as they were.', ''].join('\n'));
  const findings: Finding[] = [];
  const dependents = featureDirs(root).filter((d) => (specMetaOf(root, d)?.depends_on ?? []).some((x) => x === name || x === number));
  if (dependents.length) findings.push({ severity: 'warning', code: 'DROP-DEPENDED', message: `${dependents.map((d) => d.split('/').pop()).join(', ')} still name ${name} in depends_on`, fix: 'Point them at the step that now holds that scope, or remove the entry.' });
  if (meta?.roadmap) {
    const file = readRoadmapFile(root, meta.roadmap);
    const rows = file?.rows.filter((r) => r.steps.includes(name)) ?? [];
    if (file && rows.length) findings.push({ severity: 'warning', code: 'DROP-ROWS', message: `${file.path} still gives ${name} ${rows.length} coverage row(s), at line(s) ${rows.map((r) => r.line).join(', ')}`, path: file.path, fix: 'Give those sections to the step that holds them now, or mark them not planned with the reason.' });
  }
  const text = [`dropped ${name}: ${reason.trim()}`, ...moved.map((m) => `  moved ${m}`), `  ${dest}/DROPPED.md says why`].join('\n');
  return { ok: true, findings, exit: 0, text, data: { dir, archive: dest, moved, reason: reason.trim() } };
}
