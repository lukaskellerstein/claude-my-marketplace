// .spex/config.yaml with defaults. A missing file is not an error: the defaults make `check` work on
// any repo, and only `run` needs a real acceptance command.
//
// .spex/ is spex's one folder in a repo: config.yaml is a person's file and is committed; evidence/,
// runs/ and review/ are the script's work and .spex/.gitignore keeps them out of git. specs/ holds
// only what a person approves. Scripts and templates stay in the plugin, so there is one copy.

import { join } from 'node:path';
import { fileExists, loadYaml } from './io.js';
import { validate } from './schema.js';
import type { Config, Driver, Finding } from './types.js';

export const DEFAULT_LIMITS = {
  task_files: 12,
  instructions_bytes: 1500,
  approach_bytes: 1200,
  context_kb: 24,
  diff_kb: 120,
  file_kb: 40,
  tests_scenarios: 12,
  verify_minutes: 20,
  step_introduces: 10,
};

/**
 * The format of the files in specs/ and .spex/: spec.md, requirements.yaml, tasks.yaml, tests.yaml and config.yaml
 * are one contract, so one integer covers them. It goes up when a key changes meaning, moves or goes away — never
 * for a new optional key. A repo on a newer format than this script is refused; an older one is told to run spex
 * update. Format 2 (spex 2.0): `verification` left the record and `verify` left the task; both became tests.yaml.
 */
export const FORMAT = 2;

export const DEFAULT_CONFIG: Config = {
  format: FORMAT,
  acceptance_dir: 'tests/acceptance',
  acceptance_cmd: '',
  drivers: {},
  repos: {},
  fast_checks: [],
  source_dirs: ['src'],
  protected: ['specs/', '.spex/', 'tests/acceptance/', '.github/'],
  scopes: [],
  banned_words: [],
  live: [],
  people: [],
  limits: { ...DEFAULT_LIMITS },
  review_rounds: 3,
  verify_rounds: 3,
  approvals: ['tasks'],
  auto: false,
  ship: { commit: false, cmd: '' },
};

export const CONFIG_PATH = '.spex/config.yaml';
/** The script's work folders under .spex/: never committed, never part of the tree id. */
export const WORK_DIRS = ['.spex/evidence', '.spex/runs', '.spex/review'];

/** The built-in driver that runs a test's steps as shell commands: no file, no name. */
export const SHELL = 'shell';

/** The driver a script test runs under: the default (acceptance_cmd), a named one, or null for `shell`. */
export function driverOf(config: Config, name: string | undefined): Driver | null {
  if (name === SHELL) return null;
  if (!name) return { cmd: config.acceptance_cmd, dir: config.acceptance_dir };
  return config.drivers[name] ?? { cmd: '', dir: undefined };
}

/**
 * Every folder that holds test files in one repo: acceptance_dir and the drivers' dirs here, or the dirs of the
 * drivers that run in that repo. No task may write them.
 */
export function testDirs(config: Config, repo?: string): string[] {
  const own = Object.values(config.drivers).filter((d) => (d.repo ?? undefined) === repo);
  const dirs = [...(repo ? [] : [config.acceptance_dir]), ...own.map((d) => d.dir).filter((d): d is string => !!d)];
  return [...new Set(dirs.map((d) => d.replace(/\/+$/, '')))];
}

export function loadConfig(root: string): { config: Config; findings: Finding[] } {
  const path = join(root, CONFIG_PATH);
  const findings: Finding[] = [];
  if (!fileExists(path)) return { config: structuredClone(DEFAULT_CONFIG), findings };
  const { data, finding } = loadYaml(path, 'CONFIG-YAML');
  if (finding) return { config: structuredClone(DEFAULT_CONFIG), findings: [finding] };
  const schemaErrors = validate('config', data);
  for (const e of schemaErrors) findings.push({ severity: 'error', code: 'CONFIG-SCHEMA', message: e, path: CONFIG_PATH, fix: 'Match .spex/config.yaml to the fields the README lists.' });
  const raw = data as Partial<Config>;
  const config: Config = {
    ...structuredClone(DEFAULT_CONFIG),
    ...raw,
    format: raw.format ?? 1, // the only format without a line is 1
    limits: { ...DEFAULT_LIMITS, ...(raw.limits ?? {}) },
    drivers: raw.drivers ?? {},
    repos: raw.repos ?? {},
    ship: { ...DEFAULT_CONFIG.ship, ...(raw.ship ?? {}) },
  };
  for (const [name, d] of Object.entries(config.drivers)) if (d.repo && !config.repos[d.repo]) findings.push({ severity: 'error', code: 'CONFIG-REPO', message: `driver ${name} runs in repo ${d.repo}, which is not in repos`, path: CONFIG_PATH, fix: `Add repos.${d.repo}: {path: ../<folder>}, or fix the driver's repo.` });
  if (config.format > FORMAT) findings.push({ severity: 'error', code: 'CONFIG-FORMAT', message: `the specs are format ${config.format}; this spex reads format ${FORMAT}`, path: CONFIG_PATH, fix: 'Update the spex plugin. An older script would read changed keys wrong, so nothing runs until then.' });
  else if (config.format < FORMAT) findings.push({ severity: 'error', code: 'CONFIG-FORMAT', message: `the specs are format ${config.format}; this spex writes format ${FORMAT}`, path: CONFIG_PATH, fix: `Run \`spex update\`: it rewrites the files and sets format: ${FORMAT}.` });
  return { config, findings };
}
