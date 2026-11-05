// Git helpers. Every command tolerates a repo with no commits yet; only `run` and `done` need git
// at all, because the tree id is what ties evidence to code.

import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
 * The tree id: HEAD plus a hash of the working tree's changes. `.spex/` is left out even when it
 * is not ignored, so writing evidence never moves the id it is keyed by.
 */
export function treeId(root: string): string {
  const h = head(root);
  const hash = createHash('sha256');
  const diff = h === 'empty' ? '' : git(root, ['diff', 'HEAD', '--', '.', ':(exclude).spex'], { allowFail: true });
  hash.update(diff);
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '--', '.', ':(exclude).spex'], { allowFail: true })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .sort();
  for (const file of untracked) {
    hash.update('\0' + file + '\0');
    try {
      hash.update(readFileSync(join(root, file)));
    } catch {
      hash.update('unreadable');
    }
  }
  return `${h.slice(0, 12)}+${hash.digest('hex').slice(0, 12)}`;
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

/** `git diff <base> -- paths`, working tree included, plus every untracked file as an added file. */
export function diffAgainst(root: string, base: string, paths: string[] = []): string {
  const scope = paths.length ? paths : ['.', ':(exclude).spex'];
  let out = git(root, ['diff', base, '--', ...scope], { allowFail: true, maxBuffer: 256 * 1024 * 1024 });
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '--', ...scope], { allowFail: true })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const file of untracked) out += gitOut(root, ['diff', '--no-index', '--', '/dev/null', file]);
  return out;
}
