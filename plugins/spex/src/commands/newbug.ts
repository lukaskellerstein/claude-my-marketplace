// `spex new-bug <slug> --words <file>`: a person found a bug in code that is merged. The bug gets one note, and the
// next turn: the number after the last spec that is closed or open. Each note that waits moves one number up. A spec
// that is open keeps its number, because its branch and its worktree have that name, so the fix waits for one spec
// at most. A bug is always one spec: nothing is split, and there is no list to ok. No agent runs here.

import { isGitRepo } from '../git.js';
import { renamed, renumber, type Move } from '../renumber.js';
import { specList } from '../state.js';
import type { Finding } from '../types.js';
import { inWorktree, mainRoot } from '../worktree.js';
import type { CmdResult } from './lifecycle.js';
import { newFeature } from './new.js';

const refuse = (findings: Finding[], exit = 6, data: Record<string, unknown> = {}): CmdResult => ({ ok: false, findings, exit, text: '', data });

export function newBug(root: string, slug: string, words?: string): CmdResult {
  const main = mainRoot(root);
  if (!isGitRepo(main)) return refuse([{ severity: 'error', code: 'GIT-REQUIRED', message: 'new-bug needs a git repository', fix: 'Run inside the repository.' }], 2);
  if (inWorktree(root)) return refuse([{ severity: 'error', code: 'NEWBUG-LEAVE', message: 'new-bug writes notes on the base branch, in the main folder, and the chat is in a worktree', fix: `Leave the worktree first (ExitWorktree, action keep), then run it again in ${main}. A bug found while its spec is open is fixed in that spec: /spex:comment.` }], 6, { main });
  if (!words) return refuse([{ severity: 'error', code: 'USAGE', message: 'new-bug needs the bug report', fix: 'spex new-bug <slug> --words <file with the report, word for word>' }], 2);
  const list = specList(main);
  // The turn: after the last spec a phase has started for. With none, the bug is first: it takes the number of the
  // first note that waits. Notes move up only when the number is taken.
  const started = list.filter((s) => s.state);
  const notes = list.filter((s) => !s.state);
  const number = started.length ? Math.max(...started.map((s) => s.number)) + 1 : notes.length ? Math.min(...notes.map((s) => s.number)) : 1;
  const waiting = list.some((s) => s.number === number) ? notes.filter((s) => s.number >= number) : [];
  const moves: Move[] = waiting.map((s) => ({ from: s.name, to: renamed(s.name, s.number + 1) }));
  const touched = renumber(main, moves);
  const made = newFeature(main, slug, { words, number, exact: true });
  if (!made.ok) {
    // Put the numbers back: a refused command changes nothing.
    renumber(main, moves.map((m) => ({ from: m.to, to: m.from })));
    return made;
  }
  const dir = (made.data as { dir: string }).dir;
  const lines = [made.text];
  lines.push(moves.length ? `moved up: ${moves.map((m) => `${m.from.slice(0, 3)} → ${m.to.slice(0, 3)}`).join(' · ')}${touched.length ? ` (${touched.length} file(s) name the new numbers)` : ''}` : 'no note waits: nothing moves');
  const open = started.find((s) => s.state && !(s.state.command === 'review' && s.state.state === 'done'));
  lines.push(open ? `${open.name} is open and keeps its number: the fix is next after it` : 'the fix is the next spec in line');
  return { ok: true, findings: made.findings, exit: 0, text: lines.join('\n'), data: { ...(made.data ?? {}), dir, number, moves, after: open?.dir ?? null } };
}
