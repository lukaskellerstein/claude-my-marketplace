// specs/spex.yaml with defaults. A missing file is not an error: the defaults make `check` work on
// any repo, and only `run` needs a real acceptance command.

import { join } from 'node:path';
import { fileExists, loadYaml } from './io.js';
import { validate } from './schema.js';
import type { Config, Finding } from './types.js';

export const DEFAULT_LIMITS = {
  task_files: 12,
  instructions_bytes: 1500,
  approach_bytes: 1200,
  context_kb: 24,
  diff_kb: 120,
  file_kb: 40,
  tests_scenarios: 12,
  verify_minutes: 20,
};

export const DEFAULT_CONFIG: Config = {
  acceptance_dir: 'tests/acceptance',
  acceptance_cmd: '',
  fast_checks: [],
  source_dirs: ['src'],
  protected: ['specs/', 'tests/acceptance/', '.github/'],
  scopes: [],
  banned_words: [],
  limits: { ...DEFAULT_LIMITS },
  review_rounds: 3,
};

export const CONFIG_PATH = 'specs/spex.yaml';

export function loadConfig(root: string): { config: Config; findings: Finding[] } {
  const path = join(root, CONFIG_PATH);
  const findings: Finding[] = [];
  if (!fileExists(path)) return { config: structuredClone(DEFAULT_CONFIG), findings };
  const { data, finding } = loadYaml(path, 'CONFIG-YAML');
  if (finding) return { config: structuredClone(DEFAULT_CONFIG), findings: [finding] };
  const schemaErrors = validate('config', data);
  for (const e of schemaErrors) findings.push({ severity: 'error', code: 'CONFIG-SCHEMA', message: e, path: CONFIG_PATH, fix: 'Match specs/spex.yaml to the fields the README lists.' });
  const raw = data as Partial<Config>;
  const config: Config = {
    ...structuredClone(DEFAULT_CONFIG),
    ...raw,
    limits: { ...DEFAULT_LIMITS, ...(raw.limits ?? {}) },
  };
  return { config, findings };
}
