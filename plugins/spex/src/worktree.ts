// The branch and the worktree of a spec. The script never makes a worktree: the person starts a session in it,
// `claude -w spex/<spec>`, and the WorktreeCreate hook of the machine makes it (<repo>/.worktrees/spex/<spec>, on the
// branch spex/<spec>, from origin/<base> after a fetch; a folder that is there is adopted). A start of a phase only
// checks that the session is there (GATE-ENTER). The script finds a worktree by its branch, wherever it is.
//
// From inside a worktree a session cannot write the main folder: Claude Code, the sandbox and the guard hook refuse
// it. So what changes the main folder (the pull after the merge, a local merge, the removal of the worktree and the
// branch) runs later, in a session on the main folder: `spex close <dir> finish`.

import { rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { currentBranch, git, gitTry, refExists } from './git.js';
import { fileExists, isDir, writeText } from './io.js';
import type { Config, Finding } from './types.js';

export const branchOf = (name: string): string => `spex/${name}`;

/** The main folder of the repo, from any folder of it or of one of its worktrees. Not a git repo: the folder itself. */
export function mainRoot(root: string): string {
  const common = git(root, ['rev-parse', '--path-format=absolute', '--git-common-dir'], { allowFail: true }).trim();
  return common ? dirname(common) : resolve(root);
}

/** Every worktree of the repo that is on a branch: branch name → folder. One git call for the whole list. */
export function worktreesByBranch(main: string): Map<string, string> {
  const out = new Map<string, string>();
  let path = '';
  for (const line of git(main, ['worktree', 'list', '--porcelain'], { allowFail: true }).split('\n')) {
    if (line.startsWith('worktree ')) path = line.slice('worktree '.length).trim();
    else if (line.startsWith('branch refs/heads/') && path) out.set(line.slice('branch refs/heads/'.length).trim(), path);
  }
  return out;
}

/** The folder of the worktree on the branch of a spec, or null: no session made one, or it was removed. */
export const worktreeOf = (main: string, name: string): string | null => worktreesByBranch(main).get(branchOf(name)) ?? null;

/** The folder git works in at `root`: the worktree, or the main folder. */
export const toplevel = (root: string): string => git(root, ['rev-parse', '--show-toplevel'], { allowFail: true }).trim() || resolve(root);

/**
 * GATE-ENTER: a phase works only in a session that started in the worktree of its spec, on the branch spex/<spec>.
 * The guard of the machine denies every edit into a worktree from a session that started elsewhere, so a start
 * anywhere else makes nothing and names the command that opens the right session.
 */
export function enterGate(root: string, name: string, dir: string, skill: string): Finding | null {
  const on = currentBranch(root);
  if (on === branchOf(name)) return null;
  return {
    severity: 'error',
    code: 'GATE-ENTER',
    message: `this session is on ${on || 'no branch'}, and ${name} works on ${branchOf(name)}`,
    fix: `Start a session in the spec's worktree: claude -w ${branchOf(name)}, then type /spex:${skill} ${dir} there.`,
    path: dir,
  };
}

/** True when `root` is a worktree of the repo, not its main folder. */
export const inWorktree = (root: string): boolean => resolve(mainRoot(root)) !== resolve(toplevel(root));

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
  return aheadOf(main, baseBranch(main, config));
}

/** The commits of a branch that the branch it tracks lacks, by the refs on disk. Null: it tracks nothing. */
export function aheadOf(main: string, base: string): Unpushed | null {
  const upstream = upstreamOf(main, base);
  if (!upstream) return null;
  const r = gitTry(main, ['rev-list', '--count', `${upstream}..${base}`]);
  return { base, upstream, count: r.ok ? Number(r.out.trim()) || 0 : 0 };
}

/**
 * Push the base branch to the branch it tracks: the notes the script committed, so the remote has them before a spec
 * starts. `always`: in every repo with an upstream, not only one that merges with a command. The person said yes to
 * the push (/spex:new), and the worktree of a spec starts from the remote.
 */
export function pushBase(main: string, config: Config, always = false): { tried: boolean; ok: boolean; base: string; upstream: string; tail: string } {
  const u = always ? aheadOf(main, baseBranch(main, config)) : unpushed(main, config);
  if (!u || !u.count) return { tried: false, ok: true, base: u?.base ?? '', upstream: u?.upstream ?? '', tail: '' };
  const remote = gitTry(main, ['config', '--get', `branch.${u.base}.remote`]).out.trim();
  const merge = gitTry(main, ['config', '--get', `branch.${u.base}.merge`]).out.trim();
  const r = gitTry(main, ['push', '--quiet', remote, `${u.base}:${merge}`]);
  return { tried: true, ok: r.ok, base: u.base, upstream: u.upstream, tail: r.out.slice(-300) };
}

/** What the person does when the base branch is ahead of its remote. */
export const pushFix = (u: { base: string; upstream: string }): string =>
  `Push ${u.base} (\`git push\`). On a protected branch: send these commits as a small pull request, merge it, and make ${u.base} equal to ${u.upstream} again. The request of a spec must not carry the notes.`;

/** The record of the first start in a worktree: worktree.setup ran (or there was none). Under .spex/runs/, which git ignores. */
export const SETUP_RECORD = '.spex/runs/worktree-setup.json';

export interface SetupResult {
  /** True on the first start in this worktree: the record was not there. */
  first: boolean;
  /** The command and its result, when it ran now. */
  ran: { cmd: string; ok: boolean; tail: string } | null;
}

/**
 * worktree.setup (npm ci, a copy of .env) runs on the first start in a worktree, and the record says it ran, so a
 * second start skips it. The hook that made the worktree does not run it. A failed setup is recorded too: the person
 * fixes it by hand, as the warning says, and the phase goes on.
 */
export function setupOnce(home: string, config: Config, run: (cwd: string, cmd: string) => { ok: boolean; tail: string }): SetupResult {
  const path = join(home, SETUP_RECORD);
  if (fileExists(path)) return { first: false, ran: null };
  const cmd = config.worktree.setup.trim();
  const ran = cmd ? { cmd, ...run(home, cmd) } : null;
  writeText(path, JSON.stringify({ setup: cmd, ok: ran ? ran.ok : true, at: new Date().toISOString() }, null, 2) + '\n');
  return { first: true, ran };
}

/**
 * The first start in a worktree that has no commit of its own: the base branch comes in, fast-forward only. A folder
 * the hook adopted can be older than the notes (a session that started before the push, a start that was refused).
 * A branch with work of its own is never moved: the close brings the base in.
 */
export function catchUp(home: string, base: string): string[] {
  const moved: string[] = [];
  for (const ref of [base, upstreamOf(home, base)].filter((r): r is string => !!r && refExists(home, r))) {
    const own = Number(git(home, ['rev-list', '--count', `${ref}..HEAD`], { allowFail: true }).trim() || 0);
    const behind = Number(git(home, ['rev-list', '--count', `HEAD..${ref}`], { allowFail: true }).trim() || 0);
    if (own || !behind) continue;
    if (gitTry(home, ['merge', '--ff-only', '--quiet', ref]).ok) moved.push(`${ref} (${behind} commit(s))`);
  }
  return moved;
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
  // git's record names the folder. A removal that stopped half way drops the record and leaves files: then the folder
  // is where the WorktreeCreate hook puts it, <repo>/.worktrees/<branch>.
  const left = join(main, '.worktrees', branchOf(name));
  const path = worktreeOf(main, name) ?? (isDir(left) ? left : null);
  const branch = branchOf(name);
  let tail = '';
  if (path && isDir(path)) {
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
  const folder = !path || !isDir(path);
  let gone = !refExists(main, `refs/heads/${branch}`);
  if (folder && !gone) {
    const del = gitTry(main, ['branch', '-D', branch]);
    gone = del.ok;
    if (!del.ok) tail = `${tail}\n${del.out}`.trim();
  }
  const cmd = [...(path ? [`git -C "${main}" worktree remove --force "${path}"`, `rm -rf "${path}"`] : []), `git -C "${main}" worktree prune`, `git -C "${main}" branch -D ${branch}`].join('; ');
  return { ok: folder && gone, folder, branch: gone, cmd, tail: tail.slice(-600) };
}
