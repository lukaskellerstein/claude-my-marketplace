// `spex check`: every rule, for one folder or all of them.

import { loadConfig } from './config.js';
import { checkRequirements } from './rules/requirements.js';
import { checkTasks } from './rules/tasks.js';
import { buildIndex, featureDirs, loadFeature, resolveFeatureDir, type RecordIndex } from './specs.js';
import type { Config, Feature, Finding } from './types.js';

export interface CheckResult {
  findings: Finding[];
  features: Feature[];
  config: Config;
  index: RecordIndex;
}

export function runCheck(root: string, dirs: string[], opts: { base?: string; branches?: boolean } = {}): CheckResult {
  const { config, findings } = loadConfig(root);
  const index = buildIndex(root, { branches: opts.branches ?? true });
  findings.push(...index.findings);
  const targets = dirs.length ? dirs.map((d) => resolveFeatureDir(root, d)) : featureDirs(root);
  const features: Feature[] = [];
  for (const dir of targets) {
    const feature = loadFeature(root, dir);
    features.push(feature);
    findings.push(...feature.errors);
    if (!feature.requirements && !feature.tasks && feature.errors.length === 0) {
      findings.push({ severity: 'error', code: 'SPEC-MISSING', message: `${dir} has no requirements.yaml or tasks.yaml`, path: dir, fix: 'Run /spex:specify to write requirements.yaml.' });
      continue;
    }
    const ctx = { root, config, feature, index, base: opts.base };
    findings.push(...checkRequirements(ctx));
    findings.push(...checkTasks(ctx));
  }
  return { findings, features, config, index };
}

export function exitCodeFor(findings: Finding[]): number {
  if (findings.some((f) => f.severity === 'error')) return 4;
  if (findings.some((f) => f.severity === 'gap')) return 5;
  return 0;
}

export const hasErrors = (findings: Finding[]): boolean => findings.some((f) => f.severity === 'error');
