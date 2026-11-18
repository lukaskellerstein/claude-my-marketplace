// Other git repos a feature writes. The specs, the records and `.spex/` stay in this repo (the home repo); a task
// with `repo: <name>` writes inside config.repos[name].path, and a driver with `repo:` runs its tests there. Every
// path spex prints is from the home root (`../forks/odh-dashboard/src/x.ts`), so an agent that starts here can
// open it. The evidence's tree covers every repo the feature names, so a change in any of them makes it stale.

import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { SHELL } from './config.js';
import { currentBranch, head, isGitRepo, mergeBase, refExists } from './git.js';
import { fileExists, isDir, readText, writeText } from './io.js';
import type { Config, Feature, Finding, Task } from './types.js';

/**
 * The repo's path without a trailing slash: from the home root, or absolute when the config gives `/…` or `~/…`
 * (a git worktree of the home repo has another root, so `../forks/x` from it is another folder); '' for the home repo.
 */
export function repoPath(config: Config, name?: string): string {
  if (!name) return '';
  const p = (config.repos[name]?.path ?? name).replace(/\/+$/, '');
  return p === '~' || p.startsWith('~/') ? homedir() + p.slice(1) : p;
}

/** A path spex prints, as a file path: an absolute one stays, a relative one is from the home root. */
export function fromRoot(root: string, p: string): string {
  return isAbsolute(p) ? p : join(root, p);
}

/** The repo's absolute root. */
export function repoRoot(root: string, config: Config, name?: string): string {
  return name ? fromRoot(root, repoPath(config, name)) : root;
}

/** A path inside a repo, written from the home root: `../forks/odh-dashboard/src/x.ts`; unchanged for the home repo. */
export function inRepo(config: Config, name: string | undefined, p: string): string {
  const base = repoPath(config, name);
  return base ? `${base}/${p}` : p;
}

const quote = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;

/** The prefix that makes a command run in a repo: `cd '../forks/odh-dashboard' && `; '' for the home repo. */
export function cdPrefix(config: Config, name?: string): string {
  const base = repoPath(config, name);
  return base ? `cd ${quote(base)} && ` : '';
}

/** The other repos a feature writes or tests in: its tasks' `repo` and its tests' drivers' `repo`, in name order. */
export function featureRepos(config: Config, feature: Feature): string[] {
  const names = new Set<string>();
  for (const t of feature.tasks?.tasks ?? []) if (t.repo) names.add(t.repo);
  for (const t of feature.tests?.tests ?? []) {
    if (t.kind !== 'script' || !t.driver || t.driver === SHELL) continue;
    const r = config.drivers[t.driver]?.repo;
    if (r) names.add(r);
  }
  return [...names].sort();
}

/** The repos a task needs: the one it writes, and the ones its tests run in. */
export function taskRepos(config: Config, task: Task, driverNames: (string | undefined)[]): string[] {
  const names = new Set<string>();
  if (task.repo) names.add(task.repo);
  for (const d of driverNames) {
    const r = d && d !== SHELL ? config.drivers[d]?.repo : undefined;
    if (r) names.add(r);
  }
  return [...names].sort();
}

/** A repo that is not in config.repos, or whose path is no git repo. */
export function repoFindings(root: string, config: Config, names: string[], severity: Finding['severity'] = 'error'): Finding[] {
  const out: Finding[] = [];
  for (const name of names) {
    const r = config.repos[name];
    if (!r) {
      out.push({ severity: 'error', code: 'REPO-UNKNOWN', message: `repo ${name} is not in .spex/config.yaml repos`, fix: `Add repos.${name}: {path: ../<folder>} to .spex/config.yaml, or fix the name.` });
      continue;
    }
    // Each spec works in its own worktree, and a relative path names another folder from there.
    const given = (r.path ?? name).trim();
    if (!isAbsolute(given) && given !== '~' && !given.startsWith('~/')) {
      out.push({ severity: 'error', code: 'REPO-PATH', message: `repo ${name}: the path ${given} is relative`, fix: `Each spec works in its own worktree (.worktrees/spex/<spec>, made by claude -w spex/<spec>), and from there ${given} is another folder. Write repos.${name}.path absolute, or with ~/.` });
      continue;
    }
    const abs = repoRoot(root, config, name);
    if (!isDir(abs)) out.push({ severity, code: 'REPO-MISSING', message: `repo ${name}: ${r.path} does not exist`, fix: `Clone it at ${r.path} (from the home repo's root), or fix repos.${name}.path.` });
    else if (!isGitRepo(abs)) out.push({ severity, code: 'REPO-MISSING', message: `repo ${name}: ${r.path} is not a git repository`, fix: `Point repos.${name}.path at the clone's root.` });
  }
  return out;
}

function startPath(root: string, featureId: string): string {
  return join(root, '.spex', 'runs', featureId, 'start.json');
}

/** The commit each repo was at when the feature's first task in it opened. */
export function readStarts(root: string, featureId: string): Record<string, string> {
  const p = startPath(root, featureId);
  if (!fileExists(p)) return {};
  try {
    return JSON.parse(readText(p)) as Record<string, string>;
  } catch {
    return {};
  }
}

/** Record where each repo starts, once: the review diff of a repo with no `base` begins there. */
export function recordStarts(root: string, config: Config, featureId: string, names: string[]): void {
  const starts = readStarts(root, featureId);
  let changed = false;
  for (const name of names) {
    if (starts[name] || !config.repos[name]) continue;
    const abs = repoRoot(root, config, name);
    if (!isGitRepo(abs)) continue;
    const h = head(abs);
    if (h === 'empty') continue;
    starts[name] = h;
    changed = true;
  }
  if (changed) writeText(startPath(root, featureId), JSON.stringify(starts, null, 2) + '\n');
}

/** Where a repo's review diff starts: its `base` branch, the commit recorded at its first task, or main/master. */
export function repoDiffBase(root: string, config: Config, featureId: string, name: string): { from: string; why: string } | Finding {
  const abs = repoRoot(root, config, name);
  const r = config.repos[name];
  const fromBranch = (base: string): { from: string; why: string } => {
    const branch = currentBranch(abs);
    return { from: branch === base ? `${base}~1` : (mergeBase(abs, base, 'HEAD') ?? base), why: `branch ${base}` };
  };
  if (r?.base) {
    if (!refExists(abs, r.base)) return { severity: 'error', code: 'GIT-BASE', message: `repo ${name}: no branch ${r.base} to diff against`, fix: `Fix repos.${name}.base, or remove it to diff from the commit of the first task.` };
    return fromBranch(r.base);
  }
  const start = readStarts(root, featureId)[name];
  if (start) return { from: start, why: 'the commit at its first task' };
  for (const b of ['main', 'master']) if (refExists(abs, b)) return fromBranch(b);
  return { severity: 'error', code: 'GIT-BASE', message: `repo ${name}: no start commit recorded and no main or master branch`, fix: `Set repos.${name}.base to the branch its work started from.` };
}

function shipPath(root: string, featureId: string): string {
  return join(root, '.spex', 'runs', featureId, 'ship.json');
}

/** Which repos ship merged, and how: `ship.cmd` or `a person`. The home repo is `.`. */
export function readShipped(root: string, featureId: string): Record<string, string> {
  const p = shipPath(root, featureId);
  if (!fileExists(p)) return {};
  try {
    return (JSON.parse(readText(p)) as { merged?: Record<string, string> }).merged ?? {};
  } catch {
    return {};
  }
}

export function writeShipped(root: string, featureId: string, merged: Record<string, string>): void {
  writeText(shipPath(root, featureId), JSON.stringify({ merged }, null, 2) + '\n');
}
