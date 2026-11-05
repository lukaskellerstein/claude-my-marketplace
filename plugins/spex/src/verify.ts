// Verify commands and evidence. The script composes the commands from spex.yaml and the task and
// runs them. A gate or `done` runs the check itself at the moment it decides; the evidence file is
// the record of that run, never the proof. Nothing an agent can write is trusted.

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { testId } from './ears.js';
import { treeId } from './git.js';
import { writeText } from './io.js';
import type { Config, Evidence, Finding, Requirement, Task } from './types.js';

export function reqTestIds(task: Task): string[] {
  return task.requirements.map((r) => testId(r));
}

export function acceptanceCommand(config: Config, ids: string[]): string | null {
  if (!config.acceptance_cmd.trim()) return null;
  return config.acceptance_cmd.replace('{ids}', ids.join('|')).replace('{ids_k}', ids.join(' or '));
}

/** fast_checks, then the acceptance tests of the task's requirements, then the task's extras. */
export function composeVerify(config: Config, task: Task, expect: 'pass' | 'fail' = 'pass'): string[] {
  const acceptance = acceptanceCommand(config, reqTestIds(task));
  if (expect === 'fail') return acceptance ? [acceptance] : [];
  const cmds = [...config.fast_checks];
  if (acceptance) cmds.push(acceptance);
  cmds.push(...(task.verify ?? []));
  return cmds;
}

/** fast_checks, then the acceptance tests of every live requirement: the whole-feature run. */
export function composeFeatureVerify(config: Config, reqs: Requirement[]): string[] {
  const ids = reqs.filter((r) => r.status !== 'retired').map((r) => testId(r.id));
  const acceptance = ids.length ? acceptanceCommand(config, ids) : null;
  const cmds = [...config.fast_checks];
  if (acceptance) cmds.push(acceptance);
  return cmds;
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
}

export function runCommands(root: string, cmds: string[], timeoutMinutes: number): RunOutcome {
  const results: Evidence['commands'] = [];
  let output = '';
  let raw = '';
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
    const exit = res.status;
    results.push({ cmd, exit, ms: Date.now() - started, tail: text.slice(-4000) });
    if (exit !== 0) {
      ok = false;
      break; // the first failure is the one to read; the rest would only add noise
    }
  }
  return { results, ok, output, raw };
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

/** Run one task's checks now. `pass`: everything must exit 0. `fail`: the tests must run and fail. */
export function verifyTask(root: string, config: Config, featureId: string, task: Task, expect: 'pass' | 'fail'): VerifyResult {
  const cmds = composeVerify(config, task, expect);
  if (!cmds.length) return noCommands();
  return judge(root, config, featureId, task.id, cmds, reqTestIds(task), expect);
}

/** Run the whole feature's checks now: fast_checks plus every live requirement's acceptance tests. */
export function verifyFeature(root: string, config: Config, featureId: string, reqs: Requirement[]): VerifyResult {
  const cmds = composeFeatureVerify(config, reqs);
  if (!cmds.length) return noCommands();
  return judge(root, config, featureId, 'all', cmds, reqs.map((r) => testId(r.id)), 'pass');
}

function noCommands(): VerifyResult {
  return { ok: false, findings: [{ severity: 'error', code: 'CONFIG-ACCEPTANCE', message: 'no commands to run: acceptance_cmd is not set in specs/spex.yaml', fix: 'Set acceptance_cmd (use {ids} for the test-name filter), or run `spex init`.' }], commands: [], tail: '' };
}

function judge(root: string, config: Config, featureId: string, name: string, cmds: string[], ids: string[], expect: 'pass' | 'fail'): VerifyResult {
  const tree = currentTree(root);
  const outcome = runCommands(root, cmds, config.limits.verify_minutes);
  const idsSeen = ids.some((id) => outcome.raw.includes(id));
  const findings: Finding[] = [];
  let ok: boolean;
  if (expect === 'pass') {
    ok = outcome.ok;
    if (!ok) {
      const failed = outcome.results.find((c) => c.exit !== 0)!;
      findings.push({ severity: 'error', code: 'RUN-FAILED', message: `${failed.cmd} exited ${failed.exit}`, fix: 'Read the tail, fix the code, run again.' });
    }
  } else if (outcome.ok) {
    ok = false;
    findings.push({ severity: 'error', code: 'RUN-GREEN', message: `the acceptance tests of ${name} already pass before the feature exists`, fix: 'A test that passes before the code exists asserts nothing new. Make it assert the new behavior (/spex:tests --fix).' });
  } else if (!idsSeen) {
    ok = false;
    findings.push({ severity: 'error', code: 'RUN-NO-TESTS', message: `the run failed but never mentioned ${ids.join(' or ')}`, fix: 'The tests crashed or were not collected. Fix the import or the file name so the runner lists them, then run again.' });
  } else ok = true;
  const evidence: Evidence = { feature: featureId, task: name, tree, expect, ok, at: new Date().toISOString(), ids_seen: idsSeen, commands: outcome.results };
  const abs = evidencePath(root, featureId, name, expect);
  writeText(abs, JSON.stringify(evidence, null, 2) + '\n');
  writeText(abs.replace(/\.json$/, '.log'), outcome.output);
  return { ok, findings, evidence, path: abs.slice(root.length + 1), commands: cmds, tail: outcome.results[outcome.results.length - 1]?.tail ?? '' };
}
