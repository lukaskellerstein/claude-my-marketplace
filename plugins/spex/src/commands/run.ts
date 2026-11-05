// `spex run`: the agent's loop. Compose the verify commands, run them, write the record.
// `--expect fail` is the red-first check; `--all` is the whole-feature run for the verify stage.

import { loadConfig } from '../config.js';
import { isGitRepo } from '../git.js';
import { loadFeature, resolveFeatureDir } from '../specs.js';
import { verifyFeature, verifyTask, type VerifyResult } from '../verify.js';
import type { CmdResult } from './lifecycle.js';

export function run(root: string, dir: string, taskId: string | undefined, opts: { expect: 'pass' | 'fail'; all: boolean }): CmdResult {
  const { config, findings } = loadConfig(root);
  const feature = loadFeature(root, resolveFeatureDir(root, dir));
  findings.push(...feature.errors);
  if (findings.some((f) => f.severity === 'error')) return { ok: false, findings, exit: 4, text: '' };
  if (!feature.tasks || !feature.requirements) return { ok: false, findings: [{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} needs requirements.yaml and tasks.yaml`, fix: 'Run /spex:plan first.' }], exit: 4, text: '' };
  if (!isGitRepo(root)) return { ok: false, findings: [{ severity: 'error', code: 'GIT-REQUIRED', message: 'run needs a git repository to identify the tree', fix: 'Run inside the repository.' }], exit: 2, text: '' };
  let v: VerifyResult;
  let label: string;
  if (opts.all) {
    v = verifyFeature(root, config, feature.requirements.feature, feature.requirements.requirements);
    label = 'the whole feature';
  } else {
    if (!taskId) return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: 'run needs a task id, or --all', fix: 'spex run <dir> T01 | spex run <dir> --all' }], exit: 2, text: '' };
    const task = feature.tasks.tasks.find((t) => t.id === taskId);
    if (!task) return { ok: false, findings: [{ severity: 'error', code: 'TASK-UNKNOWN', message: `${taskId} is not in ${feature.tasksPath}`, fix: 'Run `spex next`.' }], exit: 2, text: '' };
    v = verifyTask(root, config, feature.requirements.feature, task, opts.expect);
    label = taskId;
  }
  if (!v.evidence) return { ok: false, findings: v.findings, exit: 2, text: '' };
  const lines = [`${v.ok ? 'ok' : 'FAILED'}: ${opts.expect === 'fail' ? `${label} red as expected` : `all verify commands passed for ${label}`} (tree ${v.evidence.tree})`, ...v.evidence.commands.map((c) => `- exit ${c.exit} in ${c.ms} ms: ${c.cmd}`), `record: ${v.path}`];
  if (!v.ok) lines.push('', v.tail.slice(-2500));
  return { ok: v.ok, findings: v.findings, exit: v.ok ? 0 : 7, text: lines.join('\n'), data: { evidence: v.evidence } };
}
