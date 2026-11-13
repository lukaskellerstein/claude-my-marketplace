// corrections.md: what changed in a spec after its plan, and why. One file for each spec, in its folder, in git, so
// it stays when the close removes the worktree. spec.md says what is true now; this file says how the spec got there.
// The script writes each entry from what a command gives it, never an agent by hand. An entry is open until its work
// is done: the fix is built, or the script stamped the changed plan. A chat that ends before that leaves it open, and
// the same command, typed again, finishes it.

import { join } from 'node:path';
import { fileExists, readText, writeText } from './io.js';

export const CORRECTIONS_FILE = 'corrections.md';

/** The lines an entry can hold, in the order they are written. */
export const FIELDS = ['You said', 'Found', 'Was', 'Changed', 'Pick', 'Why', 'Reaches'] as const;
export type Field = (typeof FIELDS)[number];

export interface Correction {
  /** C1, C2 … in the order they were written. */
  id: string;
  /** `implement, round 1 · the spec was wrong (small)` */
  title: string;
  fields: Partial<Record<Field, string>>;
  open: boolean;
  /** What closed it: `the script stamped the changed plan`. */
  closedBy: string;
}

const HEAD = /^## (C\d+) · (.*)$/;

export function readCorrections(root: string, dir: string): Correction[] {
  const path = join(root, dir, CORRECTIONS_FILE);
  if (!fileExists(path)) return [];
  const out: Correction[] = [];
  let cur: Correction | null = null;
  let last: Field | null = null;
  for (const line of readText(path).split('\n')) {
    const h = line.match(HEAD);
    if (h) {
      cur = { id: h[1], title: h[2].trim(), fields: {}, open: false, closedBy: '' };
      out.push(cur);
      last = null;
      continue;
    }
    if (!cur) continue;
    const st = line.match(/^State: (open|closed)(?:: (.*))?$/);
    if (st) {
      cur.open = st[1] === 'open';
      cur.closedBy = st[2]?.trim() ?? '';
      last = null;
      continue;
    }
    const f = line.match(/^([A-Z][a-z]+(?: [a-z]+)?): (.*)$/);
    if (f && (FIELDS as readonly string[]).includes(f[1])) {
      last = f[1] as Field;
      cur.fields[last] = f[2];
    } else if (last && line.startsWith('  ')) cur.fields[last] = `${cur.fields[last]}\n${line.slice(2)}`;
  }
  return out;
}

export const openCorrections = (root: string, dir: string): Correction[] => readCorrections(root, dir).filter((c) => c.open);

const INTRO = (name: string): string =>
  `# What changed in ${name}, and why\n\nspec.md says what is true now. This file says how the spec got there. The script writes each entry.\nAn entry is open until its work is done.\n`;

/** A value on one line, its further lines indented by two spaces, so the file stays a list of `Key: value` lines. */
const value = (v: string): string => v.trim().split('\n').join('\n  ');

function render(c: Correction): string {
  const lines = [`## ${c.id} · ${c.title}`];
  for (const k of FIELDS) if (c.fields[k]?.trim()) lines.push(`${k}: ${value(c.fields[k]!)}`);
  lines.push(`State: ${c.open ? 'open' : `closed${c.closedBy ? `: ${c.closedBy}` : ''}`}`);
  return lines.join('\n');
}

function save(root: string, dir: string, all: Correction[]): void {
  const name = dir.split('/').pop() ?? dir;
  writeText(join(root, dir, CORRECTIONS_FILE), `${INTRO(name)}\n${all.map(render).join('\n\n')}\n`);
}

/** Write one entry and return it. `open: false` writes it closed, for a verdict that needs no more work (a question, a defer). */
export function addCorrection(root: string, dir: string, entry: { title: string; fields: Partial<Record<Field, string>>; open: boolean; closedBy?: string }): Correction {
  const all = readCorrections(root, dir);
  const n = all.reduce((m, c) => Math.max(m, Number(c.id.slice(1))), 0) + 1;
  const c: Correction = { id: `C${n}`, title: entry.title.trim(), fields: entry.fields, open: entry.open, closedBy: entry.closedBy ?? '' };
  save(root, dir, [...all, c]);
  return c;
}

/** Close entries by id (all the open ones when none is named), and add what the work changed. Returns the ids it closed. */
export function closeCorrections(root: string, dir: string, ids: string[], closedBy: string, add: Partial<Record<Field, string>> = {}): string[] {
  const all = readCorrections(root, dir);
  const closed: string[] = [];
  for (const c of all) {
    if (!c.open || (ids.length && !ids.includes(c.id))) continue;
    c.open = false;
    c.closedBy = closedBy;
    for (const k of FIELDS) if (add[k]?.trim()) c.fields[k] = add[k];
    closed.push(c.id);
  }
  if (closed.length) save(root, dir, all);
  return closed;
}
