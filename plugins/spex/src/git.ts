// Git helpers. Every command tolerates a repo with no commits yet; only `run` and `done` need git
// at all, because the tree id is what ties evidence to code.

import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, rmSync, statSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { STATE_FILES, WORK_DIRS } from './config.js';

export function git(root: string, args: string[], opts: { allowFail?: boolean; maxBuffer?: number } = {}): string {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: opts.maxBuffer ?? 64 * 1024 * 1024 });
  } catch (e) {
    if (opts.allowFail) return '';
    throw new Error(`git ${args.join(' ')} failed: ${(e as Error).message}`);
  }
}

export function isGitRepo(root: string): boolean {
  return git(root, ['rev-parse', '--is-inside-work-tree'], { allowFail: true }).trim() === 'true';
}

export function head(root: string): string {
  const h = git(root, ['rev-parse', 'HEAD'], { allowFail: true }).trim();
  return h || 'empty';
}

/**
 * The tree id: git's own hash of every file as it is on disk now, tracked or new. It is the same before and after
 * a commit, so the commit that ends a phase never makes a proof stale. `.spex/`'s work folders are left out, and so
 * are status.yaml and corrections.md of every spec: the script writes them, and they are no part of what is proved.
 * `exclude` leaves out more (`specs`, for the id of the code alone).
 */
export function treeId(root: string, exclude: string[] = []): string {
  const dir = git(root, ['rev-parse', '--absolute-git-dir'], { allowFail: true }).trim();
  if (!dir) return 'no-git';
  const index = join(dir, 'index');
  const tmp = join(dir, `spex-index-${process.pid}-${Date.now()}`);
  const env = { ...process.env, GIT_INDEX_FILE: tmp };
  const run = (args: string[]): string => {
    const res = spawnSync('git', args, { cwd: root, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
    return res.status === 0 ? (res.stdout ?? '') : '';
  };
  try {
    // Start from the real index, so git reads only the files that changed since. The copy keeps the time of the
    // real index: git trusts the size and the time of a file only when the index is newer than the file, and a copy
    // made now would look newer than a file that was written in the same second.
    if (existsSync(index)) {
      const st = statSync(index);
      copyFileSync(index, tmp);
      utimesSync(tmp, st.atime, st.mtime);
    }
    run(['add', '-A', '--', '.']);
    const out = [...WORK_DIRS, ...STATE_FILES.map((f) => `:(glob)specs/*/${f}`), ...exclude];
    run(['rm', '-r', '-q', '--cached', '--ignore-unmatch', '--', ...out]);
    const tree = run(['write-tree']).trim();
    return tree ? tree.slice(0, 24) : `${head(root).slice(0, 12)}+unreadable`;
  } finally {
    rmSync(tmp, { force: true });
    rmSync(`${tmp}.lock`, { force: true });
  }
}

/** The tree id of the code alone: specs/ left out. When only notes changed since a proof, the proof still holds. */
export function codeId(root: string): string {
  return treeId(root, ['specs']);
}

/** Run git and return its exit code with its output: for a merge, a commit, a worktree, where a failure is an answer. */
export function gitTry(root: string, args: string[], env?: NodeJS.ProcessEnv): { ok: boolean; code: number | null; out: string } {
  const res = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...(env ? { env: { ...process.env, ...env } } : {}) });
  return { ok: res.status === 0, code: res.status, out: `${res.stdout ?? ''}${res.stderr ?? ''}`.trim() };
}

/** `git status --porcelain` for some paths: the files that are changed or new, repo-relative. */
export function dirty(root: string, paths: string[] = []): string[] {
  const out = git(root, ['status', '--porcelain', '--untracked-files=all', '--', ...(paths.length ? paths : ['.'])], { allowFail: true });
  return out.split('\n').filter((l) => l.trim()).map((l) => l.slice(3).replace(/^.* -> /, '').replace(/^"|"$/g, ''));
}

/**
 * Commit some paths (all of the tree when none is named). The script's work folders never go in. Returns committed:
 * false when nothing changed. The commit is made with the identity of the repo: with none set, git refuses, and the
 * finding of the caller shows its words.
 */
export function commitPaths(root: string, message: string, paths: string[] = []): { ok: boolean; committed: boolean; tail: string } {
  const add = gitTry(root, ['add', '-A', '--', ...(paths.length ? paths : ['.'])]);
  if (!add.ok) return { ok: false, committed: false, tail: add.out.slice(-1000) };
  gitTry(root, ['reset', '-q', '--', ...WORK_DIRS]);
  const staged = git(root, ['diff', '--cached', '--name-only', '--', ...(paths.length ? paths : ['.'])], { allowFail: true }).trim();
  if (!staged) return { ok: true, committed: false, tail: '' };
  const commit = gitTry(root, ['commit', '-q', '-m', message, ...(paths.length ? ['--', ...paths] : [])]);
  return { ok: commit.ok, committed: commit.ok, tail: commit.out.slice(-1000) };
}

/** The content of a repo-relative file at a ref, or null when it does not exist there. */
export function showAtRef(root: string, ref: string, path: string): string | null {
  const out = git(root, ['show', `${ref}:${path}`], { allowFail: true });
  return out === '' ? null : out;
}

export function refExists(root: string, ref: string): boolean {
  return git(root, ['rev-parse', '--verify', '--quiet', ref], { allowFail: true }).trim() !== '';
}

/** Local and remote branch names, short form, without the remote prefix duplicates. */
export function branchNames(root: string): string[] {
  const out = git(root, ['for-each-ref', '--format=%(refname:short)', 'refs/heads', 'refs/remotes'], { allowFail: true });
  const names = new Set<string>();
  for (const line of out.split('\n')) {
    const n = line.trim();
    if (!n || n.endsWith('/HEAD')) continue;
    names.add(n);
  }
  return [...names];
}

/** Files under a folder at a ref. */
export function listAtRef(root: string, ref: string, folder: string): string[] {
  const out = git(root, ['ls-tree', '-r', '--name-only', ref, '--', folder], { allowFail: true });
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

export function mergeBase(root: string, a: string, b: string): string | null {
  const out = git(root, ['merge-base', a, b], { allowFail: true }).trim();
  return out || null;
}

export function currentBranch(root: string): string {
  return git(root, ['rev-parse', '--abbrev-ref', 'HEAD'], { allowFail: true }).trim();
}

/** Like git(), but returns stdout whatever the exit code: `git diff --no-index` exits 1 on a difference. */
function gitOut(root: string, args: string[]): string {
  const res = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return res.stdout ?? '';
}

/**
 * `git diff <base> -- paths`, working tree included, plus every untracked file as an added file. `prefix` puts
 * another repo's path in front of every file name (`a/../forks/ui/src/x.ts`), so the diff reads from the home root.
 */
export function diffAgainst(root: string, base: string, paths: string[] = [], prefix = ''): string {
  const scope = paths.length ? paths : ['.', ':(exclude).spex'];
  const names = prefix ? [`--src-prefix=a/${prefix}/`, `--dst-prefix=b/${prefix}/`] : [];
  let out = git(root, ['diff', ...names, base, '--', ...scope], { allowFail: true, maxBuffer: 256 * 1024 * 1024 });
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '--', ...scope], { allowFail: true })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const file of untracked) out += gitOut(root, ['diff', ...names, '--no-index', '--', '/dev/null', file]);
  return out;
}
