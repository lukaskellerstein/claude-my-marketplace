// `spex check`: every rule, for one folder or all of them.

import { loadConfig } from './config.js';
import { checkReviewRefs } from './review.js';
import { checkLinks } from './rules/links.js';
import { checkRequirements } from './rules/requirements.js';
import { checkSpec, specDocPath } from './rules/spec.js';
import { checkTasks } from './rules/tasks.js';
import { checkTests } from './rules/tests.js';
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
  // `spex check specs/` means every folder, as `spex check` does: specs/ itself is no feature.
  const named = dirs.filter((d) => !/^(\.\/)?specs\/*$/.test(d));
  const targets = named.length ? named.map((d) => resolveFeatureDir(root, d)) : featureDirs(root);
  const features: Feature[] = [];
  for (const dir of targets) {
    const feature = loadFeature(root, dir);
    features.push(feature);
    findings.push(...feature.errors);
    const ctx = { root, config, feature, index, base: opts.base };
    const spec = checkSpec(ctx);
    findings.push(...spec, ...checkLinks(ctx));
    if (!feature.requirements && !feature.tasks && !feature.tests && feature.errors.length === 0) {
      // A folder with only spec.md is a feature being shaped or waiting for its records, not an error.
      const shaping = spec.some((f) => f.code === 'SPEC-SHAPING');
      const planned = spec.some((f) => f.code === 'SPEC-PLANNED');
      findings.push(
        specDocPath(root, feature)
          ? { severity: 'info', code: 'REQ-MISSING', message: `${dir} has a spec.md and no requirements.yaml yet`, path: dir, fix: planned ? `A planned step: /spex:new ${dir} shapes it when its dependencies are built.` : shaping ? `Still shaping: finish in /spex:new ${dir} first.` : `Next: /spex:requirements ${dir}.` }
          : { severity: 'error', code: 'SPEC-MISSING', message: `${dir} has no spec.md, requirements.yaml, tasks.yaml or tests.yaml`, path: dir, fix: 'Run /spex:new to shape the idea, or /spex:requirements to write the records.' },
      );
      continue;
    }
    findings.push(...checkRequirements(ctx));
    findings.push(...checkTasks(ctx));
    findings.push(...checkReviewRefs(root, feature));
    findings.push(...checkTests(ctx));
  }
  return { findings, features, config, index };
}

export function exitCodeFor(findings: Finding[]): number {
  if (findings.some((f) => f.severity === 'error')) return 4;
  if (findings.some((f) => f.severity === 'gap')) return 5;
  return 0;
}

export const hasErrors = (findings: Finding[]): boolean => findings.some((f) => f.severity === 'error');
