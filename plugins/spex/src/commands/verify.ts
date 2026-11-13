// `spex verify`: the whole feature now, every script and every session's evidence, as round n of the loop.
// `spex session`: what a tester agent observed in one session, recorded with the tree it ran on.

import { join } from 'node:path';
import { loadConfig } from '../config.js';
import { isGitRepo } from '../git.js';
import { fileExists, writeText } from '../io.js';
import { loadFeature, resolveFeatureDir } from '../specs.js';
import { sessionEvidencePath } from '../tests.js';
import type { SessionEvidence } from '../types.js';
import { currentTree, verifyFeature } from '../verify.js';
import type { CmdResult } from './lifecycle.js';

export function verify(root: string, dir: string): CmdResult {
  const { config, findings } = loadConfig(root);
  const feature = loadFeature(root, resolveFeatureDir(root, dir));
  findings.push(...feature.errors);
  if (findings.some((f) => f.severity === 'error')) return { ok: false, findings, exit: 4, text: '' };
  if (!feature.tasks || !feature.requirements || !feature.tests) return { ok: false, findings: [{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} needs requirements.yaml, tasks.yaml and tests.yaml`, fix: 'Run /spex:plan first; the test analyst writes tests.yaml.' }], exit: 4, text: '' };
  if (!isGitRepo(root)) return { ok: false, findings: [{ severity: 'error', code: 'GIT-REQUIRED', message: 'verify needs a git repository to identify the tree', fix: 'Run inside the repository.' }], exit: 2, text: '' };
  const v = verifyFeature(root, config, feature);
  const e = v.evidence;
  const lines = [`${e.ok ? 'ok' : 'FAILED'}: verify round ${e.round} of ${config.verify_rounds} (tree ${e.tree})`];
  lines.push(`fast_checks: ${e.fast_checks.ok ? 'pass' : 'FAIL'}`);
  for (const s of e.scripts) lines.push(`${s.ok ? 'ok  ' : 'FAIL'} ${s.id}  ${s.cmd}`);
  for (const s of e.sessions) lines.push(`${s.status === 'pass' ? 'ok  ' : s.status === 'fail' ? 'FAIL' : s.status.toUpperCase().padEnd(4)} ${s.id}  session${s.observed ? ` — ${s.observed.slice(0, 100)}` : ''}`);
  const failed = e.scripts.filter((s) => !s.ok);
  if (!e.fast_checks.ok) lines.push('', '## fast_checks', e.fast_checks.tail);
  for (const s of failed) lines.push('', `## ${s.id}`, s.tail);
  const pending = e.sessions.filter((s) => s.status !== 'pass');
  if (pending.length) lines.push('', `sessions to perform: ${pending.map((s) => `${s.id} (${s.status})`).join(', ')} — spex show ${feature.dir} --session <id>, then spex session <dir> <id> --result …`);
  lines.push(`record: ${v.path}`);
  return { ok: e.ok, findings: v.findings, exit: e.ok ? 0 : 7, text: lines.join('\n'), data: { evidence: e, path: v.path } };
}

export function session(root: string, dir: string, testId: string, input: { result: string; observed: string; artifacts: string[] }): CmdResult {
  const feature = loadFeature(root, resolveFeatureDir(root, dir));
  const { config } = loadConfig(root);
  if (feature.errors.length) return { ok: false, findings: feature.errors, exit: 4, text: '' };
  if (!feature.tests || !feature.requirements) return { ok: false, findings: [{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} needs requirements.yaml and tests.yaml`, fix: 'Nothing to record without a plan.' }], exit: 4, text: '' };
  const t = feature.tests.tests.find((x) => x.id === testId);
  if (!t) return { ok: false, findings: [{ severity: 'error', code: 'TEST-UNKNOWN', message: `${testId} is not in ${feature.testsPath}`, fix: 'Check the id.' }], exit: 2, text: '' };
  if (t.kind !== 'session') return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: `${t.id} is a script: the spex script runs it (spex run --test ${t.id}); a session is what a tester performs`, fix: 'Record only sessions.' }], exit: 2, text: '' };
  if (input.result !== 'pass' && input.result !== 'fail') return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: '--result takes pass or fail', fix: 'spex session <dir> TS07 --result pass --observed "…"' }], exit: 2, text: '' };
  if (!input.observed.trim()) return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: '--observed is empty', fix: 'Say what was seen, with the values: "dev head on both playgrounds = 4f2a…; 87 s". A pass without an observation is a guess.' }], exit: 2, text: '' };
  if (!isGitRepo(root)) return { ok: false, findings: [{ severity: 'error', code: 'GIT-REQUIRED', message: 'session needs a git repository to identify the tree', fix: 'Run inside the repository.' }], exit: 2, text: '' };
  const missing = input.artifacts.filter((a) => !fileExists(join(root, a)));
  if (missing.length) return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: `artifact(s) not found: ${missing.join(', ')}`, fix: 'Pass repo-relative paths of files that exist (a screenshot, a log).' }], exit: 2, text: '' };
  const evidence: SessionEvidence = { feature: feature.requirements.feature, test: t.id, tree: currentTree(root, config, feature), result: input.result, observed: input.observed, artifacts: input.artifacts, at: new Date().toISOString() };
  const abs = sessionEvidencePath(root, feature.requirements.feature, t.id);
  writeText(abs, JSON.stringify(evidence, null, 2) + '\n');
  const path = abs.slice(root.length + 1);
  return { ok: true, findings: [], exit: 0, text: `${t.id} session recorded as ${input.result} at tree ${evidence.tree} (${path}); a tester's claim with ${input.artifacts.length} artifact(s), counted by spex verify at this tree`, data: { evidence, path } };
}
