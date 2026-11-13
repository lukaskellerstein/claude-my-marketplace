// `spex delete <dir>… --reason "…"`: take a spec off the list. It works for a note, a planned spec and a started
// spec: all work of an open spec is on its own branch, and the base branch has nothing of it. A spec that is merged is
// refused: only a new spec changes it. No agent runs here. The order is the person's:
//
//   1. a spec with a worktree: copy its folder out of the worktree to .spex/archive/ in the main folder, with the
//      reason and the code of the branch as one patch file. What is only in a worktree is lost when the branch goes.
//   2. remove the worktree and the branch.
//   3. on the base branch: take the note off, and move each later note one number down.
//   4. commit, with commit: true in the config.

import { cpSync, renameSync, rmSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { WORK_DIRS, loadConfig } from '../config.js';
import { commitPaths, diffAgainst, dirty, isGitRepo, mergeBase } from '../git.js';
import { ensureDir, fileExists, isDir, writeText } from '../io.js';
import { nextFor, renderNext } from '../next.js';
import { renamed, renumber, type Move } from '../renumber.js';
import { readRoadmapFile } from '../roadmapfile.js';
import { specMetaOf } from '../rules/spec.js';
import { findSpec, isClosed, specList, stateWord, type ListedSpec } from '../state.js';
import type { Finding } from '../types.js';
import { baseBranch, branchOf, inWorktree, mainRoot, pushBase, pushFix, removeWorktree } from '../worktree.js';
import type { CmdResult } from './lifecycle.js';

export const ARCHIVE_DIR = '.spex/archive';

const refuse = (findings: Finding[], exit = 6, text = '', data: Record<string, unknown> = {}): CmdResult => ({ ok: false, findings, exit, text, data });
const err = (code: string, message: string, fix: string, path?: string): Finding => ({ severity: 'error', code, message, fix, ...(path ? { path } : {}) });

/** The archive folder of one spec: its name and the day. A folder of the same day that has no DROPPED.md yet is the one a first try began. */
function archiveFor(main: string, name: string): string {
  const day = new Date().toISOString().slice(0, 10);
  const first = `${ARCHIVE_DIR}/${name}-${day}`;
  if (!isDir(join(main, first)) || !fileExists(join(main, first, 'DROPPED.md'))) return first;
  for (let i = 2; ; i++) if (!isDir(join(main, `${first}-${i}`))) return `${first}-${i}`;
}

export function deleteSpecs(root: string, given: string[], reason: string): CmdResult {
  const main = mainRoot(root);
  if (!isGitRepo(main)) return refuse([err('GIT-REQUIRED', 'delete needs a git repository', 'Run inside the repository.')], 2);
  if (!given.length) return refuse([err('USAGE', 'delete needs a spec folder', 'spex delete specs/005-restore --reason "…"')], 2);
  if (!reason.trim()) return refuse([err('USAGE', 'delete needs --reason "…"', 'Say why the spec goes. The reason is kept in the archive.')], 2);
  if (inWorktree(root)) return refuse([err('DELETE-LEAVE', 'delete changes the main folder, and the chat is in a worktree', `Leave the worktree first (ExitWorktree, action keep), then run it again in ${main}.`)], 6, '', { main });
  const list = specList(main);
  const targets: ListedSpec[] = [];
  for (const g of given) {
    const s = findSpec(main, g);
    if (!s) return refuse([err('SPEC-UNKNOWN', `${g} is no spec folder under specs/`, `The list: ${list.map((x) => x.name).join(', ') || '(empty)'}.`)], 2);
    if (!targets.some((t) => t.dir === s.dir)) targets.push(s);
  }
  const findings: Finding[] = [];
  for (const s of targets) if (isClosed(s.state) && !s.worktree) findings.push(err('DELETE-MERGED', `${s.name} is closed and merged`, 'A merged spec stays. Only a new spec changes it: /spex:new, or /spex:new-bug for a bug.', s.dir));
  const gone = new Set(targets.map((t) => t.name));
  for (const s of targets) {
    const number = s.name.slice(0, 3);
    const needs = list.filter((o) => !gone.has(o.name) && !isClosed(o.state) && (specMetaOf(o.home, o.dir)?.depends_on ?? []).some((d) => d === s.name || d === number));
    if (needs.length) findings.push(err('DELETE-DEPENDED', `${needs.map((n) => n.name).join(', ')} depend${needs.length === 1 ? 's' : ''} on ${s.name}`, `Delete both in one command (spex delete ${s.dir} ${needs.map((n) => n.dir).join(' ')} --reason "…"), or correct depends_on in that note first.`, s.dir));
  }
  if (findings.length) return refuse(findings);
  const { config } = loadConfig(main);
  const base = baseBranch(main, config);
  const lines: string[] = [];
  const archives: string[] = [];
  const warnings: Finding[] = [];
  for (const s of targets) {
    const dest = archiveFor(main, s.name);
    const meta = specMetaOf(s.home, s.dir);
    ensureDir(join(main, dest));
    const hadWorktree = s.worktree || fileExists(join(main, dest, 'code.patch'));
    if (s.worktree) {
      // 1. Save what is only in the worktree: the folder of the spec, the work of the script, the code as one patch.
      cpSync(join(s.home, s.dir), join(main, dest, 'spec'), { recursive: true });
      for (const w of WORK_DIRS) if (w !== ARCHIVE_DIR && isDir(join(s.home, w))) cpSync(join(s.home, w), join(main, dest, basename(w)), { recursive: true });
      const from = mergeBase(s.home, 'HEAD', base) ?? base;
      writeText(join(main, dest, 'code.patch'), diffAgainst(s.home, from, ['.', ':(exclude).spex', `:(exclude)${s.dir}`]));
      lines.push(`${s.name}: its folder and its code are saved in ${dest}/ (spec/, code.patch)`);
      // 2. Now the worktree and the branch go.
      const rm = removeWorktree(main, s.name);
      if (!rm.ok) return refuse([{ severity: 'error', code: 'DELETE-WORKTREE', message: `the worktree of ${s.name} is not fully removed (folder: ${rm.folder ? 'gone' : 'still there'}, branch: ${rm.branch ? 'gone' : 'still there'})`, fix: `Nothing is lost: ${dest}/ has the folder and the code. A sandbox protects two paths of Claude Code in a worktree. Run this one time outside the sandbox, then run the delete again: ${rm.cmd}` }], 8, lines.join('\n'), { archive: dest, cmd: rm.cmd });
      lines.push(`${s.name}: removed the worktree and the branch ${branchOf(s.name)}`);
    }
    // 3. Off the base branch. The archive has the newer folder of a spec that had a worktree, so the old note is only removed.
    if (isDir(join(main, s.dir))) {
      if (hadWorktree) rmSync(join(main, s.dir), { recursive: true, force: true });
      else {
        try {
          renameSync(join(main, s.dir), join(main, dest, 'spec'));
        } catch {
          cpSync(join(main, s.dir), join(main, dest, 'spec'), { recursive: true });
          rmSync(join(main, s.dir), { recursive: true, force: true });
        }
        lines.push(`${s.name}: the note moved to ${dest}/spec`);
      }
    }
    writeText(join(main, dest, 'DROPPED.md'), [`# Deleted ${s.name}`, '', `- when: ${new Date().toISOString()}`, `- it was: ${stateWord(s.state)}`, `- roadmap: ${meta?.roadmap ?? '(none)'}, step ${meta?.step ?? '?'}`, `- reason: ${reason.trim()}`, '', hadWorktree ? 'spec/ is the folder as it was in the worktree. code.patch is the code of the branch: only `git apply code.patch` brings it back.' : 'spec/ is the note as it was on the base branch.', ''].join('\n'));
    archives.push(dest);
    if (meta?.roadmap) {
      const file = readRoadmapFile(main, meta.roadmap);
      const rows = file?.rows.filter((r) => r.steps.includes(s.name)) ?? [];
      if (file && rows.length) warnings.push({ severity: 'warning', code: 'DELETE-ROWS', message: `${file.path} still gives ${s.name} ${rows.length} coverage row(s), at line(s) ${rows.map((r) => r.line).join(', ')}`, path: file.path, fix: 'Give those sections to the spec that now holds that scope, or mark the rows `not planned` with the reason.' });
    }
  }
  // The later notes close up: the number is the order.
  const rest = specList(main).filter((s) => !gone.has(s.name));
  const moves: Move[] = [];
  const stuck = rest.filter((s) => s.state && !isClosed(s.state) && targets.some((t) => t.number < s.number));
  if (stuck.length) warnings.push({ severity: 'warning', code: 'DELETE-NUMBERS', message: `${stuck.map((s) => s.name).join(', ')} is open, so no number moves: an open spec keeps its number`, fix: 'The gap in the numbers stays. It does no harm: the order is still the order of the numbers.' });
  else {
    let shift = 0;
    const cut = [...targets].sort((a, b) => a.number - b.number);
    for (const s of rest) {
      shift = cut.filter((t) => t.number < s.number).length;
      if (shift && !isClosed(s.state)) moves.push({ from: s.name, to: renamed(s.name, s.number - shift) });
    }
  }
  const touched = renumber(main, moves);
  if (moves.length) lines.push(`moved: ${moves.map((m) => `${m.from.slice(0, 3)} → ${m.to.slice(0, 3)}`).join(' · ')}${touched.length ? ` (${touched.length} file(s) name the new numbers)` : ''}`);
  // 4. One commit on the base branch, or the files for the person to commit.
  const loose = dirty(main, ['specs']);
  let committed = false;
  if (loose.length && config.commit) {
    const c = commitPaths(main, `spex: delete ${targets.map((t) => t.name).join(', ')}`, ['specs']);
    if (!c.ok) return refuse([err('PHASE-COMMIT', `git commit failed on ${base}`, `Fix git, then commit specs/ yourself. Tail: ${c.tail.trim().slice(-300)}`)], 7, lines.join('\n'));
    committed = c.committed;
    lines.push(`committed on ${base}: spex: delete ${targets.map((t) => t.name).join(', ')}`);
    const p = pushBase(main, config);
    if (p.tried && p.ok) lines.push(`pushed ${p.base} to ${p.upstream}`);
    else if (p.tried) warnings.push({ severity: 'warning', code: 'COMMIT-PUSH', message: `git push of ${p.base} failed: ${p.tail.trim()}`, fix: pushFix(p) });
  } else if (loose.length) lines.push(`not committed (commit: true is not set): commit specs/ on ${base} yourself, ${loose.length} file(s)`);
  const n = nextFor(main);
  lines.push(renderNext(n));
  return { ok: true, findings: warnings, exit: 0, text: lines.join('\n'), data: { deleted: targets.map((t) => t.dir), archives, moves, committed, uncommitted: committed ? [] : loose, reason: reason.trim(), next: n.command || null } };
}

/** The archive folders on disk, newest name last: for a reply that names where a deleted spec went. */
export function archives(main: string): string[] {
  const dir = join(main, ARCHIVE_DIR);
  return isDir(dir) ? readdirSync(dir).sort() : [];
}
