// The branch and the worktree of a spec. The script makes both when plan starts and removes both at the close.
// A worktree is a second folder of the same repo, on the branch of the spec: .claude/worktrees/<spec>, where Claude
// Code keeps its own worktrees too. The chat moves into it; the main folder stays on the base branch.
//
// From inside a worktree a chat cannot write the main folder (the worktree test of 2026-11-13). So what changes the
// main folder (the pull after the merge, the removal of the worktree) runs after the chat left the worktree. And in a
// sandbox two paths of Claude Code inside a worktree are write-protected, so a removal can stop half way: the script
// checks that the folder is gone, and names the command when it is not.

import { rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { currentBranch, git, gitTry, refExists } from './git.js';
import { fileExists, isDir, readText, writeText } from './io.js';
import type { Config } from './types.js';

export const WORKTREES = '.claude/worktrees';
export const branchOf = (name: string): string => `spex/${name}`;

/** The main folder of the repo, from any folder of it or of one of its worktrees. Not a git repo: the folder itself. */
export function mainRoot(root: string): string {
  const common = git(root, ['rev-parse', '--path-format=absolute', '--git-common-dir'], { allowFail: true }).trim();
  return common ? dirname(common) : resolve(root);
}

export const worktreePath = (main: string, name: string): string => join(main, WORKTREES, name);

/** True when `root` is a worktree of the repo, not its main folder. */
export const inWorktree = (root: string): boolean => resolve(mainRoot(root)) !== resolve(git(root, ['rev-parse', '--show-toplevel'], { allowFail: true }).trim() || root);

/** The branch a spec starts from and merges into: `base` in the config, else the branch the main folder is on. */
export function baseBranch(main: string, config: Config): string {
  return config.base.trim() || currentBranch(main) || 'main';
}

/** The branch on the remote that a branch tracks (`origin/main`), or null: no remote, or it tracks nothing. */
export function upstreamOf(main: string, branch: string): string | null {
  const r = gitTry(main, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', `${branch}@{upstream}`]);
  const name = r.ok ? r.out.trim() : '';
  return name && !name.includes('@{') ? name : null;
}

export interface Unpushed {
  base: string;
  upstream: string;
  /** The commits of the base branch that the remote does not have, by the refs on disk. No network. */
  count: number;
}

/**
 * The commits of the base branch that its remote does not have. Only a repo that merges with a command through a
 * remote is checked (close.cmd is set, and is not `local`). There the request of a spec must not carry the notes:
 * with a squash merge it would, and after it the base branch here and on the remote hold the same change in two
 * commits, so the pull at the close fails. Null: this repo has no such flow, and nothing is checked.
 */
export function unpushed(main: string, config: Config): Unpushed | null {
  const cmd = config.close.cmd.trim();
  if (!cmd || cmd === 'local') return null;
  const base = baseBranch(main, config);
  const upstream = upstreamOf(main, base);
  if (!upstream) return null;
  const r = gitTry(main, ['rev-list', '--count', `${upstream}..${base}`]);
  return { base, upstream, count: r.ok ? Number(r.out.trim()) || 0 : 0 };
}

/** Push the base branch to the branch it tracks: the notes the script committed, so the remote has them before a spec starts. */
export function pushBase(main: string, config: Config): { tried: boolean; ok: boolean; base: string; upstream: string; tail: string } {
  const u = unpushed(main, config);
  if (!u || !u.count) return { tried: false, ok: true, base: u?.base ?? '', upstream: u?.upstream ?? '', tail: '' };
  const remote = gitTry(main, ['config', '--get', `branch.${u.base}.remote`]).out.trim();
  const merge = gitTry(main, ['config', '--get', `branch.${u.base}.merge`]).out.trim();
  const r = gitTry(main, ['push', '--quiet', remote, `${u.base}:${merge}`]);
  return { tried: true, ok: r.ok, base: u.base, upstream: u.upstream, tail: r.out.slice(-300) };
}

/** What the person does when the base branch is ahead of its remote. */
export const pushFix = (u: { base: string; upstream: string }): string =>
  `Push ${u.base} (\`git push\`). On a protected branch: send these commits as a small pull request, merge it, and make ${u.base} equal to ${u.upstream} again. The request of a spec must not carry the notes.`;

export const hasWorktree = (main: string, name: string): boolean => isDir(worktreePath(main, name)) && fileExists(join(worktreePath(main, name), '.git'));

/** Git must not show the worktrees as new files of the main folder: one line in .git/info/exclude, the repo's own ignore file. */
function ignoreWorktrees(main: string): void {
  const path = join(main, '.git', 'info', 'exclude');
  const text = fileExists(path) ? readText(path) : '';
  if (text.split('\n').some((l) => l.trim() === `${WORKTREES}/`)) return;
  writeText(path, `${text}${text && !text.endsWith('\n') ? '\n' : ''}${WORKTREES}/\n`);
}

export interface WorktreeResult {
  ok: boolean;
  path: string;
  branch: string;
  base: string;
  /** False when it was there already: a second run finds it. */
  made: boolean;
  /** The output of worktree.setup, when it ran. */
  setup: { cmd: string; ok: boolean; tail: string } | null;
  error?: string;
}

/** Find the worktree of a spec, or make it from the base branch, with its branch. worktree.setup runs one time, after it is made. */
export function addWorktree(main: string, config: Config, name: string, runSetup: (cwd: string, cmd: string) => { ok: boolean; tail: string }): WorktreeResult {
  const path = worktreePath(main, name);
  const branch = branchOf(name);
  const base = baseBranch(main, config);
  if (hasWorktree(main, name)) return { ok: true, path, branch, base, made: false, setup: null };
  ignoreWorktrees(main);
  gitTry(main, ['worktree', 'prune']);
  const add = refExists(main, `refs/heads/${branch}`) ? gitTry(main, ['worktree', 'add', path, branch]) : gitTry(main, ['worktree', 'add', '-b', branch, path, base]);
  if (!add.ok) return { ok: false, path, branch, base, made: false, setup: null, error: add.out.slice(-600) };
  const cmd = config.worktree.setup.trim();
  const setup = cmd ? { cmd, ...runSetup(path, cmd) } : null;
  return { ok: true, path, branch, base, made: true, setup };
}

export interface RemoveResult {
  /** The folder and the branch are gone. */
  ok: boolean;
  folder: boolean;
  branch: boolean;
  /** What to run when the folder is still there: the same removal, outside a sandbox. */
  cmd: string;
  tail: string;
}

/**
 * Remove the worktree and the branch of a spec. `force` drops what is not committed there (delete saved it first; the
 * close merged it). The removal can stop half way in a sandbox, so the result says what is really gone.
 */
export function removeWorktree(main: string, name: string): RemoveResult {
  const path = worktreePath(main, name);
  const branch = branchOf(name);
  let tail = '';
  if (isDir(path)) {
    const rm = gitTry(main, ['worktree', 'remove', '--force', path]);
    tail = rm.out;
    // Git removed its record and left files it could not delete: try the folder once more, then say what is left.
    if (isDir(path)) {
      try {
        rmSync(path, { recursive: true, force: true });
      } catch (e) {
        tail = `${tail}\n${(e as Error).message}`.trim();
      }
    }
  }
  gitTry(main, ['worktree', 'prune']);
  const folder = !isDir(path);
  let gone = !refExists(main, `refs/heads/${branch}`);
  if (folder && !gone) {
    const del = gitTry(main, ['branch', '-D', branch]);
    gone = del.ok;
    if (!del.ok) tail = `${tail}\n${del.out}`.trim();
  }
  const cmd = `git -C "${main}" worktree remove --force "${path}"; rm -rf "${path}"; git -C "${main}" worktree prune; git -C "${main}" branch -D ${branch}`;
  return { ok: folder && gone, folder, branch: gone, cmd, tail: tail.slice(-600) };
}
