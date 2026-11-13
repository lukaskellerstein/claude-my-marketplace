// The number of a spec is its place in the order. So when a spec comes in before the notes that wait (new-bug) or
// goes out (delete), each later note moves one number: its folder, and each place that names it. Only notes move:
// one spec is open at a time, and an open spec keeps its number, because its branch and its worktree have that name.

import { readdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { isDir, readText, walk, writeText } from './io.js';
import { SPECS_DIR } from './specs.js';

export interface Move {
  /** 006-delete-old-backups */
  from: string;
  /** 007-delete-old-backups */
  to: string;
}

const pad = (n: number): string => String(n).padStart(3, '0');
export const renamed = (name: string, number: number): string => `${pad(number)}-${name.replace(/^\d{3}-/, '')}`;

/** Rename the folders and rewrite every place under specs/ that names one of them. Returns the files it changed. */
/** A bare number in the `depends_on` of a note (`[008]`) names a spec too: it moves with the folder. */
function moveBareDepends(text: string, numbers: Map<string, string>): string {
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return text;
  const head = fm[1].replace(/^depends_on:.*(?:\n[ \t]+.*)*/m, (block) => block.replace(/(?<![\w-])(\d+)(?![\w-])/g, (n) => numbers.get(n) ?? n));
  return head === fm[1] ? text : text.replace(fm[1], () => head);
}

export function renumber(main: string, moves: Move[]): string[] {
  if (!moves.length) return [];
  const specs = join(main, SPECS_DIR);
  // Through a name no spec has, so 006 → 007 never lands on the 007 that has not moved yet.
  for (const m of moves) renameSync(join(specs, m.from), join(specs, `.moving-${m.from}`));
  for (const m of moves) renameSync(join(specs, `.moving-${m.from}`), join(specs, m.to));
  const changed: string[] = [];
  const files = [...walk(main, specs), ...(isDir(specs) ? readdirSync(specs).filter((f) => f.endsWith('.md')).map((f) => `${SPECS_DIR}/${f}`) : [])];
  const marks = moves.map((m, i) => ({ ...m, mark: `\u0000spex-move-${i}\u0000` }));
  const numbers = new Map(moves.map((m) => [m.from.match(/^\d+/)?.[0] ?? '', m.to.match(/^\d+/)?.[0] ?? '']));
  for (const rel of new Set(files)) {
    if (!/\.(md|ya?ml)$/.test(rel)) continue;
    const before = readText(join(main, rel));
    let text = before;
    // The longest name first, and through a mark, so one name is never rewritten twice.
    for (const m of [...marks].sort((a, b) => b.from.length - a.from.length)) text = text.split(m.from).join(m.mark);
    for (const m of marks) text = text.split(m.mark).join(m.to);
    // The title of a note starts with its number (`# 006 Delete old backups`): it moves with the folder.
    const own = moves.find((m) => rel === `${SPECS_DIR}/${m.to}/spec.md`);
    if (own) text = text.replace(new RegExp(`^# ${own.from.slice(0, 3)} `, 'm'), `# ${own.to.slice(0, 3)} `);
    if (rel.endsWith('/spec.md')) text = moveBareDepends(text, numbers);
    if (text !== before) {
      writeText(join(main, rel), text);
      changed.push(rel);
    }
  }
  return changed;
}
