// `spex run`: the agent's loop. Compose the verify commands, run them, write the record.
// `--expect fail` is the red-first check; `--test TS01` runs one test record; `--all` is the whole-feature run.

import { loadConfig } from '../config.js';
import { isGitRepo } from '../git.js';
import { loadFeature, resolveFeatureDir } from '../specs.js';
import { verifyOne, verifyTask, type VerifyResult } from '../verify.js';
import type { CmdResult } from './lifecycle.js';
import { verify } from './verify.js';

export function run(root: string, dir: string, taskId: string | undefined, opts: { expect: 'pass' | 'fail'; all: boolean; test?: string }): CmdResult {
  if (opts.all) return verify(root, dir);
  const { config, findings } = loadConfig(root);
  const feature = loadFeature(root, resolveFeatureDir(root, dir));
  findings.push(...feature.errors);
  if (findings.some((f) => f.severity === 'error')) return { ok: false, findings, exit: 4, text: '' };
  if (!feature.tasks || !feature.requirements || !feature.tests) return { ok: false, findings: [{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} needs requirements.yaml, tasks.yaml and tests.yaml`, fix: 'Run /spex:tasks first; the test analyst writes tests.yaml.' }], exit: 4, text: '' };
  if (!isGitRepo(root)) return { ok: false, findings: [{ severity: 'error', code: 'GIT-REQUIRED', message: 'run needs a git repository to identify the tree', fix: 'Run inside the repository.' }], exit: 2, text: '' };
  let v: VerifyResult;
  let label: string;
  if (opts.test) {
    const t = feature.tests.tests.find((x) => x.id === opts.test);
    if (!t) return { ok: false, findings: [{ severity: 'error', code: 'TEST-UNKNOWN', message: `${opts.test} is not in ${feature.testsPath}`, fix: 'Check the id.' }], exit: 2, text: '' };
    if (t.kind !== 'script') return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: `${t.id} is a session: a tester performs it and records it with spex session`, fix: `spex show ${feature.dir} --session ${t.id}` }], exit: 2, text: '' };
    v = verifyOne(root, config, feature, t, opts.expect);
    label = t.id;
  } else {
    if (!taskId) return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: 'run needs a task id, --test <id>, or --all', fix: 'spex run <dir> T01 | spex run <dir> --test TS01 | spex run <dir> --all' }], exit: 2, text: '' };
    const task = feature.tasks.tasks.find((t) => t.id === taskId);
    if (!task) return { ok: false, findings: [{ severity: 'error', code: 'TASK-UNKNOWN', message: `${taskId} is not in ${feature.tasksPath}`, fix: 'Run `spex next`.' }], exit: 2, text: '' };
    v = verifyTask(root, config, feature, task, opts.expect);
    label = taskId;
  }
  if (!v.evidence) return { ok: false, findings: v.findings, exit: 2, text: '' };
  const lines = [`${v.ok ? 'ok' : 'FAILED'}: ${opts.expect === 'fail' ? (v.commands.length ? `${label} red as expected` : `${label} has nothing to be red`) : `all verify commands passed for ${label}`} (tree ${v.evidence.tree})`, ...v.evidence.commands.map((c) => `- exit ${c.exit} in ${c.ms} ms: ${c.cmd}`), `record: ${v.path}`];
  if (!v.ok) lines.push('', v.tail.slice(-2500));
  return { ok: v.ok, findings: v.findings, exit: v.ok ? 0 : 7, text: lines.join('\n'), data: { evidence: v.evidence } };
}
