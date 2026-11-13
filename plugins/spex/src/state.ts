// Where a spec stands. One small file in the folder of the spec holds it: status.yaml, with the phase and if the
// phase is done. The script writes it only where the script runs: at the start and at the end of a phase. A spec
// with no status.yaml is a note. `plan, done` is a planned spec, `implement, done` a built one, and `review, done`
// a closed one: the close writes it before the merge, so the base branch gets it.
//
// One spec is open at a time. While it is open, its folder is in its worktree, and that copy is the newer one.

import { join } from 'node:path';
import { parse } from 'yaml';
import { YAML_OPTS, fileExists, isDir, readText, writeText } from './io.js';
import { featureDirs, resolveFeatureDir } from './specs.js';
import type { Phase, SpecState } from './types.js';
import { mainRoot, worktreePath } from './worktree.js';

export const STATUS_FILE = 'status.yaml';
export const PHASES: readonly Phase[] = ['plan', 'implement', 'review'];

export function readState(root: string, dir: string): SpecState | null {
  const path = join(root, dir, STATUS_FILE);
  if (!fileExists(path)) return null;
  try {
    const d = parse(readText(path), YAML_OPTS) as { command?: unknown; state?: unknown } | null;
    if (!d || !PHASES.includes(d.command as Phase) || (d.state !== 'started' && d.state !== 'done')) return null;
    return { command: d.command as Phase, state: d.state };
  } catch {
    return null;
  }
}

/** Write the two lines. Returns false when the file says that already, so a second run changes nothing. */
export function writeState(root: string, dir: string, s: SpecState): boolean {
  const now = readState(root, dir);
  if (now && now.command === s.command && now.state === s.state) return false;
  writeText(join(root, dir, STATUS_FILE), `command: ${s.command}\nstate: ${s.state}\n`);
  return true;
}

/** The state of a spec where its newer copy is: in its worktree when it has one, else in `root`. */
export function liveState(root: string, dir: string, main: string = mainRoot(root)): SpecState | null {
  const wt = worktreePath(main, dir.split('/').pop() ?? dir);
  return readState(isDir(join(wt, dir)) ? wt : root, dir);
}

export const isClosed = (s: SpecState | null): boolean => !!s && s.command === 'review' && s.state === 'done';

/** The state in words a person reads: a note, planned, built, closed, or the phase that is started. */
export function stateWord(s: SpecState | null): string {
  if (!s) return 'a note';
  if (s.state === 'started') return `${s.command}, started`;
  return s.command === 'plan' ? 'planned' : s.command === 'implement' ? 'built' : 'closed';
}

export interface ListedSpec {
  /** specs/007-csv-export */
  dir: string;
  /** 007-csv-export */
  name: string;
  number: number;
  state: SpecState | null;
  /** The root that holds the newer copy of the folder: the worktree of the spec when it has one, else the main folder. */
  home: string;
  worktree: boolean;
}

export const numberOf = (name: string): number => Number((name.match(/^(\d{3})-/) ?? [])[1] ?? NaN);

/**
 * The list: every spec folder of the main folder, by its number, with its state. A spec that has a worktree is read
 * there. A repo has one list, and "the list" in a reply is the specs of it that are not closed.
 */
export function specList(root: string): ListedSpec[] {
  const main = mainRoot(root);
  const out: ListedSpec[] = [];
  for (const dir of featureDirs(main)) {
    const name = dir.split('/').pop()!;
    const number = numberOf(name);
    if (Number.isNaN(number)) continue;
    const wt = worktreePath(main, name);
    const worktree = isDir(join(wt, dir));
    const home = worktree ? wt : main;
    out.push({ dir, name, number, state: readState(home, dir), home, worktree });
  }
  return out.sort((a, b) => a.number - b.number || a.name.localeCompare(b.name));
}

/** The one spec that is open: a phase has started for it, and it is not closed. Null when none is. */
export function openSpec(root: string): ListedSpec | null {
  return specList(root).find((s) => s.state && !isClosed(s.state)) ?? null;
}

/** The spec whose turn it is: the first one of the list that is not closed. */
export function turnOf(root: string): ListedSpec | null {
  return specList(root).find((s) => !isClosed(s.state)) ?? null;
}

/** A spec a person named (a folder, a name, a bare number), found in the list. */
export function findSpec(root: string, given: string): ListedSpec | null {
  const main = mainRoot(root);
  const rel = resolveFeatureDir(main, given);
  return specList(root).find((s) => s.dir === rel) ?? null;
}

/** The root a command about this spec works in: its worktree when it has one, else the root it was called in. */
export function homeOf(root: string, given: string): string {
  return findSpec(root, given)?.home ?? root;
}
