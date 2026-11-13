// `spex coverage`: which test proves each claim, and where each script's file is. The map is tests.yaml;
// the file is found by the test's name, so a test that moved is still found.

import { loadConfig } from '../config.js';
import { readText } from '../io.js';
import { fromRoot } from '../repos.js';
import { claimsOf, isFileTest, isSession, isShellTest, locateTest, testFiles } from '../tests.js';
import { loadFeature, resolveFeatureDir } from '../specs.js';
import type { Config, Feature, Finding, TestRecord } from '../types.js';
import type { CmdResult } from './lifecycle.js';

export interface CoverageRow {
  id: string;
  name: string;
  driver: string;
  file: string | null;
  covers: string[];
}

/** Every file test with the file that holds it, or null. `only` narrows it to some tests. */
export function coverageFor(root: string, config: Config, feature: Feature, only?: TestRecord[]): { rows: CoverageRow[]; missing: CoverageRow[] } {
  const contents = new Map(testFiles(root, config).map((p) => [p, readText(fromRoot(root, p))]));
  const rows: CoverageRow[] = [];
  for (const t of only ?? feature.tests?.tests ?? []) {
    if (!isFileTest(t)) continue;
    rows.push({ id: t.id, name: t.name ?? '', driver: t.driver ?? 'default', file: locateTest(root, config, t, contents), covers: t.covers });
  }
  return { rows, missing: rows.filter((x) => !x.file) };
}

/**
 * The next batch for one /spex:develop-tests run: file tests without a file yet, in tests.yaml order, up to
 * limits.tests_scenarios. One batch is one fresh test developer.
 */
export function pickTestBatch(root: string, config: Config, feature: Feature): { tests: TestRecord[] } {
  const { missing } = coverageFor(root, config, feature);
  const ids = new Set(missing.map((m) => m.id));
  const tests = (feature.tests?.tests ?? []).filter((t) => ids.has(t.id)).slice(0, config.limits.tests_scenarios);
  return { tests };
}

export function coverage(root: string, dir: string): CmdResult {
  const { config } = loadConfig(root);
  const feature = loadFeature(root, resolveFeatureDir(root, dir));
  if (feature.errors.length) return { ok: false, findings: feature.errors, exit: 4, text: '' };
  if (!feature.requirements) return { ok: false, findings: [{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no requirements.yaml`, fix: 'Run /spex:requirements.' }], exit: 4, text: '' };
  if (!feature.tests) return { ok: false, findings: [{ severity: 'gap', code: 'COVERAGE', message: `${feature.dir} has no tests.yaml`, fix: 'The test analyst writes it: /spex:requirements starts it.' }], exit: 5, text: '' };
  const tests = feature.tests.tests;
  const findings: Finding[] = [];
  const lines: string[] = [];
  const proves = (ids: Set<string>): TestRecord[] => tests.filter((t) => t.covers.some((c) => ids.has(c)));
  const label = (t: TestRecord): string => `${t.id} ${t.kind}${isShellTest(t) ? '/shell' : t.driver ? `/${t.driver}` : ''}`;
  lines.push('## claims');
  let gaps = 0;
  for (const r of feature.requirements.requirements) {
    if (r.status === 'retired') continue;
    for (const a of r.acceptance) {
      const by = proves(new Set([r.id, `${r.id}/${a.id}`]));
      if (!by.length) gaps++;
      lines.push(`${by.length ? 'ok ' : 'GAP'} ${r.id}/${a.id}  ${by.map(label).join(', ') || '(no test)'}`);
    }
  }
  for (const t of feature.tasks?.tasks ?? []) {
    const by = proves(claimsOf(feature, t));
    if (!by.length) gaps++;
    lines.push(`${by.length ? 'ok ' : 'GAP'} ${t.id}  ${by.map(label).join(', ') || '(no test)'}`);
  }
  if (gaps) findings.push({ severity: 'gap', code: 'COVERAGE', message: `${gaps} claim(s) have no test in tests.yaml`, fix: 'The test analyst adds them: /spex:requirements for scenarios, /spex:tasks for tasks.' });
  const { rows, missing } = coverageFor(root, config, feature);
  lines.push('', '## files');
  for (const x of rows) lines.push(`${x.file ? 'ok ' : 'MISSING'} ${x.id} ${x.name}${x.file ? `  ${x.file}` : ''}`);
  for (const m of missing) findings.push({ severity: 'gap', code: 'COVERAGE', message: `${m.id}: no test named ${m.name} under ${m.driver === 'default' ? config.acceptance_dir : `drivers.${m.driver}.dir`}`, fix: 'The test developer writes it: /spex:develop-tests.', id: m.id });
  const sessions = tests.filter(isSession);
  if (sessions.length) lines.push('', '## sessions (performed at verify, evidence in .spex/evidence/)', ...sessions.map((t) => `- ${t.id} ${t.driver ?? ''} covers ${t.covers.join(', ')}`));
  lines.push('', `${rows.length - missing.length}/${rows.length} script tests have a file · ${gaps} claim(s) without a test`);
  return { ok: !missing.length && !gaps, findings, exit: missing.length || gaps ? 5 : 0, text: lines.join('\n'), data: { rows, missing: missing.length, gaps, total: rows.length } };
}
