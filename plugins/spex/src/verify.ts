// Verify commands and evidence. The script composes the commands from .spex/config.yaml and tests.yaml and
// runs them. A gate or `done` runs the check itself at the moment it decides; the evidence file is the
// record of that run, never the proof. Nothing an agent can write is trusted: a session's evidence is an
// agent's claim with artifacts, and it says so.

import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { SHELL, driverOf } from './config.js';
import { treeId } from './git.js';
import { fileExists, isDir, readText, writeText } from './io.js';
import { isFileTest, isScript, isSession, isShellTest, readSession, testsOf } from './tests.js';
import type { Config, Evidence, Feature, Finding, SessionStatus, Task, TestRecord, VerifyEvidence } from './types.js';

/** A driver's command for these test names: {ids} is a regex of the names, {ids_k} the `A or B` form (pytest -k). */
export function driverCommand(template: string, names: string[]): string {
  return template.replace('{ids}', names.join('|')).replace('{ids_k}', names.join(' or '));
}

export interface DriverGroup {
  driver: string;
  /** The command template, or null when the config has none for this driver. */
  template: string | null;
  tests: TestRecord[];
  names: string[];
}

/** The file tests grouped by driver, in order of first appearance. */
export function driverGroups(config: Config, tests: TestRecord[]): DriverGroup[] {
  const out: DriverGroup[] = [];
  for (const t of tests.filter(isFileTest)) {
    const key = t.driver ?? '';
    let g = out.find((x) => x.driver === key);
    if (!g) {
      const d = driverOf(config, t.driver);
      g = { driver: key, template: d?.cmd.trim() ? d.cmd : null, tests: [], names: [] };
      out.push(g);
    }
    g.tests.push(t);
    if (t.name) g.names.push(t.name);
  }
  return out;
}

export interface Composed {
  cmds: string[];
  /** The names of the file tests: the red check looks for them in the output. */
  names: string[];
  fileTests: TestRecord[];
  shellTests: TestRecord[];
  groups: DriverGroup[];
  findings: Finding[];
}

/** fast_checks, then one command per driver for the file tests, then every shell test's steps. `fail` runs only the drivers. */
export function compose(config: Config, tests: TestRecord[], expect: 'pass' | 'fail' = 'pass'): Composed {
  const scripts = tests.filter(isScript);
  const groups = driverGroups(config, scripts);
  const findings: Finding[] = [];
  const cmds: string[] = [];
  for (const g of groups) {
    if (g.template) continue;
    findings.push(
      g.driver === ''
        ? { severity: 'error', code: 'CONFIG-ACCEPTANCE', message: `no command runs ${g.tests.map((t) => t.id).join(', ')}: acceptance_cmd is not set in .spex/config.yaml`, fix: 'Set acceptance_cmd (use {ids} for the test-name filter), or run `spex init`.' }
        : { severity: 'error', code: 'TEST-DRIVER', message: `no command runs ${g.tests.map((t) => t.id).join(', ')}: driver "${g.driver}" is not in .spex/config.yaml drivers`, fix: `Add drivers.${g.driver}: {cmd: "… {ids} …", dir: …}.` },
    );
  }
  const driverCmds = groups.filter((g) => g.template).map((g) => driverCommand(g.template!, g.names));
  if (expect === 'fail') cmds.push(...driverCmds);
  else cmds.push(...config.fast_checks, ...driverCmds, ...scripts.filter(isShellTest).flatMap((t) => t.steps));
  return { cmds, names: groups.flatMap((g) => g.names), fileTests: scripts.filter(isFileTest), shellTests: scripts.filter(isShellTest), groups, findings };
}

/** The commands of one task: its tests from tests.yaml. */
export function composeVerify(config: Config, feature: Feature, task: Task, expect: 'pass' | 'fail' = 'pass'): Composed {
  return compose(config, testsOf(feature, task), expect);
}

export function evidencePath(root: string, feature: string, name: string, expect: 'pass' | 'fail'): string {
  return join(root, '.spex', 'evidence', feature, expect === 'fail' ? `${name}.red.json` : `${name}.json`);
}

export interface RunOutcome {
  results: Evidence['commands'];
  ok: boolean;
  /** The log: each command echoed, then its stdout and stderr. */
  output: string;
  /** Only what the commands printed. The red check searches this, never the echoed command line. */
  raw: string;
  /** What each command that ran printed, in order. */
  printed: string[];
}

/**
 * A skipped, ignored or pending test in the runner's own words: pytest and jest (`1 skipped`), vitest, node:test
 * (`skipped 1`), go (`--- SKIP:`), cargo (`1 ignored`), mocha and rspec (`1 pending`). Zero counts do not match.
 */
export const SKIP_PATTERN = /\b[1-9]\d* (?:skipped|ignored|pending)\b|\bskip(?:ped)? [1-9]|--- SKIP:|\bSKIPPED\b/;

export function runCommands(root: string, cmds: string[], timeoutMinutes: number, stopOnFail = true): RunOutcome {
  const results: Evidence['commands'] = [];
  let output = '';
  let raw = '';
  const printedAll: string[] = [];
  let ok = true;
  // Verify commands are top-level processes: a test runner that started spex must not turn them
  // into its own children (node's runner does that through NODE_TEST_CONTEXT and changes their output).
  const env: NodeJS.ProcessEnv = { ...process.env, CI: process.env.CI ?? '1', FORCE_COLOR: '0' };
  delete env.NODE_TEST_CONTEXT;
  for (const cmd of cmds) {
    const started = Date.now();
    const res = spawnSync('sh', ['-c', cmd], { cwd: root, encoding: 'utf8', timeout: timeoutMinutes * 60_000, maxBuffer: 64 * 1024 * 1024, env });
    const printed = `${res.stdout ?? ''}${res.stderr ?? ''}`;
    const text = `$ ${cmd}\n${printed}`;
    output += text + '\n';
    raw += printed + '\n';
    printedAll.push(printed);
    const exit = res.status;
    results.push({ cmd, exit, ms: Date.now() - started, tail: text.slice(-4000) });
    if (exit !== 0) {
      ok = false;
      if (stopOnFail) break; // the first failure is the one to read; the rest would only add noise
    }
  }
  return { results, ok, output, raw, printed: printedAll };
}

export function currentTree(root: string): string {
  return treeId(root);
}

export interface VerifyResult {
  ok: boolean;
  findings: Finding[];
  evidence?: Evidence;
  /** Repo-relative path of the record. */
  path?: string;
  commands: string[];
  tail: string;
}

/** Run one task's checks now. `pass`: everything must exit 0. `fail`: its file tests must run and fail. */
export function verifyTask(root: string, config: Config, feature: Feature, task: Task, expect: 'pass' | 'fail'): VerifyResult {
  const tests = testsOf(feature, task);
  return judge(root, config, feature.requirements?.feature ?? feature.name, task.id, compose(config, tests, expect), tests, expect);
}

/** Run one test record now, by id. */
export function verifyOne(root: string, config: Config, feature: Feature, test: TestRecord, expect: 'pass' | 'fail'): VerifyResult {
  return judge(root, config, feature.requirements?.feature ?? feature.name, test.id, compose(config, [test], expect), [test], expect);
}

function judge(root: string, config: Config, featureId: string, name: string, c: Composed, tests: TestRecord[], expect: 'pass' | 'fail'): VerifyResult {
  if (c.findings.length) return { ok: false, findings: c.findings, commands: [], tail: '' };
  const tree = currentTree(root);
  const ids = tests.filter(isScript).map((t) => t.id);
  if (!c.cmds.length) {
    if (expect === 'fail' && !c.fileTests.length) {
      // Nothing can be red: the proof is shell steps, or a session performed at verify. The gate opens with this on record.
      const evidence: Evidence = { feature: featureId, task: name, tree, expect, ok: true, at: new Date().toISOString(), ids_seen: false, tests: ids, commands: [] };
      const abs = evidencePath(root, featureId, name, expect);
      writeText(abs, JSON.stringify(evidence, null, 2) + '\n');
      const what = c.shellTests.length ? `${c.shellTests.length} shell test(s) at done` : tests.some(isSession) ? 'a session at verify' : 'nothing in tests.yaml';
      return { ok: true, findings: [{ severity: 'info', code: 'RUN-NO-RED', message: `${name} has no test under a driver, so nothing can be red; its proof is ${what}`, fix: 'Fine for a setup task. A task that changes behavior gets a file test from the test analyst.' }], evidence, path: abs.slice(root.length + 1), commands: [], tail: '' };
    }
    return { ok: false, findings: [{ severity: 'error', code: 'RUN-NO-TESTS', message: `${name} has no test in tests.yaml`, fix: 'The test analyst adds one; /spex:tasks runs it for the tasks that lack a test.' }], commands: [], tail: '' };
  }
  const outcome = runCommands(root, c.cmds, config.limits.verify_minutes);
  const idsSeen = c.names.length ? c.names.some((n) => outcome.raw.includes(n)) : true;
  // A driver command is filtered to these names, so a skip in its output is a skip of this task's own tests:
  // neither red nor green. A test that needs a live system must fail without it, never skip.
  const driverCmds = new Set(c.groups.filter((g) => g.template).map((g) => driverCommand(g.template!, g.names)));
  const skipLine = c.cmds.map((cmd, i) => (driverCmds.has(cmd) ? (outcome.printed[i] ?? '').split('\n').find((l) => SKIP_PATTERN.test(l)) : undefined)).find((l) => l !== undefined);
  const findings: Finding[] = [];
  let ok: boolean;
  if (skipLine !== undefined) {
    ok = false;
    findings.push({ severity: 'error', code: 'RUN-SKIPPED', message: `the tests of ${name} skip (${skipLine.trim().slice(0, 120)}): a skip is neither red nor green`, fix: 'A test that needs a live system or a record must fail when it is missing, not skip. Declare what it needs in needs[] of its test record, or make it a session the tester performs at verify.' });
  } else if (expect === 'pass') {
    ok = outcome.ok;
    if (!ok) {
      const failed = outcome.results.find((x) => x.exit !== 0)!;
      findings.push({ severity: 'error', code: 'RUN-FAILED', message: `${failed.cmd} exited ${failed.exit}`, fix: 'Read the tail, fix the code, run again.' });
    }
  } else if (outcome.ok) {
    ok = false;
    findings.push({ severity: 'error', code: 'RUN-GREEN', message: `the tests of ${name} already pass before the feature exists`, fix: 'A test that passes before the code exists asserts nothing new. The test developer makes it assert the new behavior.' });
  } else if (!idsSeen) {
    ok = false;
    findings.push({ severity: 'error', code: 'RUN-NO-TESTS', message: `the run failed but never mentioned ${c.names.join(' or ')}`, fix: 'The tests crashed or were not collected. Fix the import or the file name so the runner lists them, then run again.' });
  } else ok = true;
  const evidence: Evidence = { feature: featureId, task: name, tree, expect, ok, at: new Date().toISOString(), ids_seen: idsSeen, tests: ids, commands: outcome.results };
  const abs = evidencePath(root, featureId, name, expect);
  writeText(abs, JSON.stringify(evidence, null, 2) + '\n');
  writeText(abs.replace(/\.json$/, '.log'), outcome.output);
  return { ok, findings, evidence, path: abs.slice(root.length + 1), commands: c.cmds, tail: outcome.results[outcome.results.length - 1]?.tail ?? '' };
}

export function verifyEvidencePath(root: string, featureId: string): string {
  return join(root, '.spex', 'evidence', featureId, 'verify.json');
}

/** The latest whole-feature run, or null. */
export function readVerify(root: string, featureId: string): VerifyEvidence | null {
  const path = verifyEvidencePath(root, featureId);
  if (!fileExists(path)) return null;
  try {
    return JSON.parse(readText(path)) as VerifyEvidence;
  } catch {
    return null;
  }
}

/** The whole-feature run is good for this tree: every script passed and every session was recorded as a pass at it. */
export function verifyIsCurrent(root: string, featureId: string): boolean {
  const v = readVerify(root, featureId);
  return !!v && v.ok && v.tree === currentTree(root);
}

export interface FeatureVerify {
  ok: boolean;
  findings: Finding[];
  evidence: VerifyEvidence;
  path: string;
  output: string;
}

/**
 * The whole feature now: fast_checks, every script (grouped per driver, then one by one when a group fails, so
 * each test has its own verdict), every shell test, and the session evidence at this tree. Round n+1 of the loop.
 */
export function verifyFeature(root: string, config: Config, feature: Feature): FeatureVerify {
  const featureId = feature.requirements?.feature ?? feature.name;
  const tree = currentTree(root);
  const tests = feature.tests?.tests ?? [];
  const dir = join(root, '.spex', 'evidence', featureId);
  const round = (isDir(dir) ? readdirSync(dir).filter((n) => /^verify-\d+\.json$/.test(n)).length : 0) + 1;
  const findings: Finding[] = [];
  let output = '';
  const fast = runCommands(root, config.fast_checks, config.limits.verify_minutes);
  output += fast.output;
  const scripts: VerifyEvidence['scripts'] = [];
  const c = compose(config, tests, 'pass');
  findings.push(...c.findings);
  for (const g of c.groups) {
    if (!g.template) {
      for (const t of g.tests) scripts.push({ id: t.id, ok: false, cmd: '', exit: null, tail: `no command for driver "${g.driver || 'default'}"` });
      continue;
    }
    const all = runCommands(root, [driverCommand(g.template, g.names)], config.limits.verify_minutes);
    output += all.output;
    const skipped = SKIP_PATTERN.test(all.printed[0] ?? '');
    if (all.ok && !skipped) {
      for (const t of g.tests) scripts.push({ id: t.id, ok: true, cmd: all.results[0].cmd, exit: 0, tail: '' });
      continue;
    }
    // The group failed: one run per test tells which.
    for (const t of g.tests) {
      const one = runCommands(root, [driverCommand(g.template, [t.name!])], config.limits.verify_minutes);
      output += one.output;
      const r = one.results[0];
      const skip = (one.printed[0] ?? '').split('\n').find((l) => SKIP_PATTERN.test(l));
      const seen = one.raw.includes(t.name!);
      const ok = one.ok && !skip && seen;
      scripts.push({ id: t.id, ok, cmd: r.cmd, exit: r.exit, tail: ok ? '' : skip ? `skipped: ${skip.trim().slice(0, 120)} — a skip is neither red nor green` : !seen && !one.ok ? `the run failed but never mentioned ${t.name}\n${r.tail.slice(-1500)}` : r.tail.slice(-1500) });
    }
  }
  for (const t of c.shellTests) {
    const one = runCommands(root, t.steps, config.limits.verify_minutes);
    output += one.output;
    const failed = one.results.find((x) => x.exit !== 0);
    scripts.push({ id: t.id, ok: one.ok, cmd: t.steps.join(' && '), exit: failed?.exit ?? 0, tail: failed ? failed.tail.slice(-1500) : '' });
  }
  const sessions: VerifyEvidence['sessions'] = tests.filter(isSession).map((t) => {
    const s = readSession(root, featureId, t.id);
    const status: SessionStatus = !s ? 'pending' : s.tree !== tree ? 'stale' : s.result;
    return { id: t.id, status, tree: s?.tree ?? null, observed: s?.observed ?? null };
  });
  const ok = fast.ok && !findings.length && scripts.every((s) => s.ok) && sessions.every((s) => s.status === 'pass');
  const evidence: VerifyEvidence = { feature: featureId, tree, ok, round, at: new Date().toISOString(), fast_checks: { ok: fast.ok, tail: fast.ok ? '' : (fast.results.find((x) => x.exit !== 0)?.tail ?? '').slice(-1500) }, scripts, sessions };
  const abs = verifyEvidencePath(root, featureId);
  writeText(abs, JSON.stringify(evidence, null, 2) + '\n');
  writeText(join(dir, `verify-${round}.json`), JSON.stringify(evidence, null, 2) + '\n');
  writeText(join(dir, `verify-${round}.log`), output);
  if (round > config.verify_rounds) findings.push({ severity: 'warning', code: 'VERIFY-ROUNDS', message: `round ${round} is past verify_rounds ${config.verify_rounds}`, fix: 'Stop and hand the feature to a person: the loop did not converge.' });
  return { ok, findings, evidence, path: abs.slice(root.length + 1), output };
}

export { SHELL };
