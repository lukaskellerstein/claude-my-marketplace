// `spex coverage`: every scenario has a test whose name carries its id. No mapping file to drift.

import { join } from 'node:path';
import { loadConfig } from '../config.js';
import { testId } from '../ears.js';
import { readText } from '../io.js';
import { acceptanceFiles } from '../rules/tasks.js';
import { loadFeature, resolveFeatureDir } from '../specs.js';
import type { Config, Feature, Finding, Task } from '../types.js';
import type { CmdResult } from './lifecycle.js';

/**
 * The next batch of tasks for one /spex:tests run: tasks in plan order that still lack a test,
 * until the scenario count reaches limits.tests_scenarios. One batch is one fresh agent.
 */
export function pickTestBatch(root: string, config: Config, feature: Feature): { tasks: Task[]; scenarios: number } {
  const cap = config.limits.tests_scenarios;
  const batch: Task[] = [];
  let scenarios = 0;
  for (const t of feature.tasks?.tasks ?? []) {
    if (t.status === 'done') continue;
    const cov = coverageFor(root, config, feature, t.requirements);
    if (!cov.missing.length) continue;
    if (batch.length && scenarios + cov.rows.length > cap) break;
    batch.push(t);
    scenarios += cov.rows.length;
  }
  return { tasks: batch, scenarios };
}

export interface CoverageRow {
  req: string;
  ac: string;
  name: string;
  file: string | null;
}

export function coverageFor(root: string, config: Config, feature: Feature, onlyReqs?: string[]): { rows: CoverageRow[]; missing: CoverageRow[] } {
  const files = acceptanceFiles(root, config);
  const contents = new Map(files.map((p) => [p, readText(join(root, p))]));
  const rows: CoverageRow[] = [];
  for (const r of feature.requirements?.requirements ?? []) {
    if (r.status === 'retired') continue;
    if (onlyReqs && !onlyReqs.includes(r.id)) continue;
    for (const a of r.acceptance) {
      const name = testId(r.id, a.id);
      const file = files.find((p) => contents.get(p)!.includes(name)) ?? null;
      rows.push({ req: r.id, ac: a.id, name, file });
    }
  }
  return { rows, missing: rows.filter((x) => !x.file) };
}

export function coverage(root: string, dir: string): CmdResult {
  const { config } = loadConfig(root);
  const feature = loadFeature(root, resolveFeatureDir(root, dir));
  if (feature.errors.length) return { ok: false, findings: feature.errors, exit: 4, text: '' };
  if (!feature.requirements) return { ok: false, findings: [{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no requirements.yaml`, fix: 'Run /spex:specify.' }], exit: 4, text: '' };
  const { rows, missing } = coverageFor(root, config, feature);
  const findings: Finding[] = missing.map((m) => ({ severity: 'gap', code: 'COVERAGE', message: `${m.req}/${m.ac}: no test named ${m.name} under ${config.acceptance_dir}`, fix: 'Run /spex:tests for the task that covers it.', id: m.req }));
  const text = rows.map((r) => `${r.file ? 'ok ' : 'MISSING'} ${r.name}${r.file ? `  ${r.file}` : ''}`).join('\n') + `\n${rows.length - missing.length}/${rows.length} scenarios have a test`;
  return { ok: missing.length === 0, findings, exit: missing.length ? 5 : 0, text, data: { rows, missing: missing.length, total: rows.length } };
}
