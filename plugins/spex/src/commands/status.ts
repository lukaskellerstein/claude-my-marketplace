// `spex status`: where did the work stop? It reads status.yaml of the one spec that is open, in its worktree, and
// prints the phase, if it is started or done, and the one command to go on. No agent runs. It names no step inside a
// phase: the file does not keep one. `spex list` prints the whole list, and `spex commit` commits the notes that
// new, new-bug and delete wrote on the base branch, only with commit: true in the config.

import { statSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG_PATH, loadConfig } from '../config.js';
import { openCorrections } from '../corrections.js';
import { commitPaths, currentBranch, dirty, isGitRepo } from '../git.js';
import { fileExists } from '../io.js';
import { commandFor, nextFor, placeLine, renderNext } from '../next.js';
import { STATUS_FILE, isClosed, specList, stateWord } from '../state.js';
import type { Finding } from '../types.js';
import { aheadOf, baseBranch, inWorktree, mainRoot, pushBase, pushFix, unpushed, upstreamOf } from '../worktree.js';
import { yesLines, type CmdResult } from './lifecycle.js';
import { loadFeature } from '../specs.js';

function ago(path: string): string {
  try {
    const days = Math.floor((Date.now() - statSync(path).mtimeMs) / 86_400_000);
    return days <= 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`;
  } catch {
    return '';
  }
}

export function status(root: string): CmdResult {
  const list = specList(root);
  const open = list.find((s) => (s.state && !isClosed(s.state)) || (isClosed(s.state) && (s.worktree || s.branch)));
  const waiting = list.filter((s) => !s.state).length;
  const closed = list.filter((s) => isClosed(s.state) && !s.worktree && !s.branch).length;
  const lines: string[] = [];
  if (open) {
    const when = ago(join(open.home, open.dir, STATUS_FILE));
    lines.push(`${placeLine(open)}${when ? ` · ${when}` : ''}`);
    for (const c of openCorrections(open.home, open.dir)) lines.push(`   not finished: ${c.id} · ${c.title}`);
    try {
      for (const l of yesLines(open.home, loadFeature(open.home, open.dir))) lines.push(`   ${l}`);
    } catch {
      // a spec whose files do not load still has a place and a next command
    }
    if (open.worktree) lines.push(`   worktree: ${open.home}`);
  } else lines.push(list.length ? `📍 no spec is open · ${closed} closed · ${waiting} note(s) wait` : '📍 no spec yet');
  const n = open ? commandFor(open) : nextFor(root);
  lines.push(renderNext(n, { clear: false, root }));
  return { ok: true, findings: [], exit: 0, text: lines.join('\n'), data: { open: open ? { dir: open.dir, state: open.state, worktree: open.worktree ? open.home : null, corrections: openCorrections(open.home, open.dir).map((c) => c.id) } : null, next: n.command || null, closed, waiting } };
}

/** `spex list`: every spec by its number, with its state. "The list" of a reply is the rows that are not closed. */
export function list(root: string): CmdResult {
  const all = specList(root);
  const rows = all.map((s) => ({ dir: s.dir, number: s.number, state: stateWord(s.state), worktree: s.worktree }));
  const open = all.filter((s) => !isClosed(s.state) || s.worktree || s.branch);
  const text = all.length ? all.map((s) => `${s.name}  ${stateWord(s.state)}${s.worktree ? '  (worktree)' : ''}`).join('\n') : '(no spec folder under specs/)';
  const next = all.reduce((m, s) => Math.max(m, s.number), 0) + 1;
  return { ok: true, findings: [], exit: 0, text: `${text}\n${open.length} not closed · the next number at the end is ${String(next).padStart(3, '0')}`, data: { specs: rows, open: open.length, next } };
}

/** spex's own files in .spex/: `spex init` writes them, and the gate of plan wants the config on the base branch. */
const SPEX_FILES = [CONFIG_PATH, '.spex/.gitignore'];

/**
 * `spex commit --message "…"`: the notes on the base branch. A worktree gets only what is committed and pushed (the
 * hook makes it from the remote), so plan refuses a note that is not. Three ways:
 *
 * - `--preview`: changes nothing. It names the files and the question the person answers: commit and push to origin/main?
 * - `--approved`: the person said yes to that question. It commits specs/ and pushes the base branch to the branch it
 *   tracks, whatever `commit:` says. /spex:new runs it only after the yes.
 * - neither: as before. It commits only with commit: true (new-bug, delete, the close), and names the files without.
 *
 * The commit of the notes takes `.spex/config.yaml` and `.spex/.gitignore` along when they are new or changed: in a
 * new project `spex init` leaves both uncommitted, and the first start of plan would stop at GATE-COMMIT. They never
 * go in alone, and no other file goes in.
 */
export function commitNotes(root: string, message: string, opts: { preview?: boolean; approved?: boolean } = {}): CmdResult {
  const main = mainRoot(root);
  if (!isGitRepo(main)) return { ok: false, findings: [{ severity: 'error', code: 'GIT-REQUIRED', message: 'commit needs a git repository', fix: 'Run inside the repository.' }], exit: 2, text: '' };
  if (inWorktree(root)) return { ok: false, findings: [{ severity: 'error', code: 'COMMIT-LEAVE', message: 'the notes are on the base branch, in the main folder, and this session is in a worktree', fix: `Run it in a session on the main folder (${main}).` }], exit: 6, text: '' };
  const { config } = loadConfig(main);
  const base = baseBranch(main, config);
  const on = currentBranch(main);
  if (on && on !== base) return { ok: false, findings: [{ severity: 'error', code: 'COMMIT-BASE', message: `the main folder is on ${on}, and the notes belong on ${base}`, fix: `\`git checkout ${base}\` in ${main}, then run it again. Or set base: in .spex/config.yaml to the branch the specs start from.` }], exit: 6, text: '' };
  // The reply of new and new-bug ends with this block: the command for the spec whose turn it is, in a fresh context.
  const next = (): string => renderNext(nextFor(main), { clear: true, root: main });
  const notes = dirty(main, ['specs']);
  // spex's own files go along with the notes, never alone, and only when they are there: new or changed, not deleted.
  const own = notes.length ? dirty(main, SPEX_FILES).filter((f) => fileExists(join(main, f))) : [];
  const loose = [...notes, ...own];
  const paths = notes.length ? ['specs', ...own] : [];
  const findings: Finding[] = [];
  const lines: string[] = [];
  const upstream = upstreamOf(main, base);
  const target = upstream ?? base;
  const question = upstream ? `Commit and push to ${upstream}?` : `Commit on ${base}? (it tracks no remote branch: nothing is pushed)`;
  if (opts.preview) {
    const ahead = aheadOf(main, base)?.count ?? 0;
    lines.push(loose.length ? `to commit on ${base} (${loose.length} file(s)):\n${loose.map((f) => `  ${f}`).join('\n')}` : `nothing to commit under specs/ on ${base}`);
    if (upstream) lines.push(`to push: ${base} → ${upstream}${ahead ? ` (${ahead} commit(s) ahead already)` : ''}`);
    lines.push(`ask: ${question}`, 'nothing is committed or pushed until the person says yes: then `spex commit --approved --message "…"`');
    return { ok: true, findings: [], exit: 0, text: lines.join('\n'), data: { asked: true, question, files: loose, base, upstream: target, committed: false, pushed: false } };
  }
  const commitOn = opts.approved || config.commit;
  let committed = false;
  if (!loose.length) lines.push(`nothing to commit under specs/ on ${base}`);
  else if (!commitOn) {
    findings.push({ severity: 'warning', code: 'COMMIT-YOURS', message: `${loose.length} file(s) under specs/ or .spex/ are not committed on ${base}`, fix: 'Commit them yourself, or set commit: true in .spex/config.yaml. /spex:plan refuses a note or a config that is not committed: a worktree gets only what is committed.' });
    lines.push(`not committed (commit: true is not set). The files:\n${loose.map((f) => `  ${f}`).join('\n')}`);
  } else {
    const c = commitPaths(main, message.trim() || 'spex: notes', paths);
    if (!c.ok) return { ok: false, findings: [{ severity: 'error', code: 'PHASE-COMMIT', message: `git commit failed on ${base}`, fix: `Fix git (an identity, a hook, a protected branch), or commit the files yourself. Tail: ${c.tail.trim().slice(-300)}` }], exit: 7, text: '', data: { committed: false, files: loose } };
    committed = c.committed;
    lines.push(`committed on ${base}: ${message.trim() || 'spex: notes'} (${loose.length} file(s))`);
  }
  // With a merge command and a remote, the notes go to the remote now: the request of a spec must not carry them.
  // After the person's yes, in every repo with a remote: the worktree of the spec starts from the remote.
  let pushed = false;
  if (commitOn) {
    const p = pushBase(main, config, !!opts.approved);
    pushed = p.tried && p.ok;
    if (pushed) lines.push(`pushed ${p.base} to ${p.upstream}`);
    else if (opts.approved && !upstream) lines.push(`${base} tracks no remote branch: nothing to push`);
    else if (p.tried) findings.push({ severity: 'warning', code: 'COMMIT-PUSH', message: `git push of ${p.base} failed: ${p.tail.trim()}`, fix: pushFix(p) });
  } else {
    const u = unpushed(main, config);
    if (u?.count) findings.push({ severity: 'warning', code: 'COMMIT-PUSH', message: `${u.base} has ${u.count} commit(s) that ${u.upstream} does not have`, fix: pushFix(u) });
  }
  lines.push(next());
  return { ok: true, findings, exit: 0, text: lines.join('\n'), data: { committed, pushed, files: loose, base, upstream: target } };
}
