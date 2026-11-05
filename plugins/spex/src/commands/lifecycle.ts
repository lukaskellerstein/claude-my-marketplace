// Status changes and gates. Every status after `draft` is written by a program, never by a skill.
// A gate runs its check at the moment it decides; it never reads a file an agent could have written.

import { join } from 'node:path';
import { hasErrors, runCheck } from '../check.js';
import { isGitRepo } from '../git.js';
import { openDocument, saveDocument, writeText } from '../io.js';
import { featureDirs, loadFeature, resolveFeatureDir } from '../specs.js';
import type { Feature, Finding, Task } from '../types.js';
import { verifyTask } from '../verify.js';
import { coverageFor, pickTestBatch } from './coverage.js';

export interface CmdResult {
  ok: boolean;
  findings: Finding[];
  exit: number;
  text: string;
  data?: Record<string, unknown>;
}

const refuse = (findings: Finding[], exit = 6): CmdResult => ({ ok: false, findings, exit, text: '' });

function need(feature: Feature): Finding[] {
  const out: Finding[] = [...feature.errors];
  if (!feature.requirements && !out.length) out.push({ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no requirements.yaml`, fix: 'Run /spex:specify.' });
  return out;
}

export function approve(root: string, dir: string): CmdResult {
  const rel = resolveFeatureDir(root, dir);
  const check = runCheck(root, [rel]);
  if (hasErrors(check.findings)) return refuse(check.findings, 4);
  const open = check.findings.filter((f) => f.code === 'REQ-QUESTION-OPEN');
  if (open.length) return refuse([...open, { severity: 'error', code: 'APPROVE-QUESTION', message: `${open.length} question(s) still open`, fix: 'Run /spex:clarify, then approve.' }]);
  const feature = check.features[0];
  if (!feature.requirements) return refuse(need(feature), 4);
  const doc = openDocument(join(root, feature.requirementsPath));
  let flipped = 0;
  feature.requirements.requirements.forEach((r, i) => {
    if (r.status === 'draft') {
      doc.setIn(['requirements', i, 'status'], 'approved');
      flipped++;
    }
  });
  if (flipped) saveDocument(join(root, feature.requirementsPath), doc);
  const warnings = check.findings.filter((f) => f.severity === 'warning');
  return { ok: true, findings: warnings, exit: 0, text: `${flipped} record(s) approved in ${feature.requirementsPath}${warnings.length ? ` (${warnings.length} warning(s) left)` : ''}`, data: { approved: flipped } };
}

function ready(tasks: Task[]): Task | undefined {
  const status = new Map(tasks.map((t) => [t.id, t.status]));
  return tasks.find((t) => t.status === 'todo' && (t.depends_on ?? []).every((d) => status.get(d) === 'done'));
}

export function next(root: string, dir: string): CmdResult {
  const feature = loadFeature(root, resolveFeatureDir(root, dir));
  const errs = need(feature);
  if (errs.length) return refuse(errs, 4);
  if (!feature.tasks) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no tasks.yaml`, fix: 'Run /spex:plan.' }], 4);
  const t = ready(feature.tasks.tasks);
  const counts = { todo: 0, done: 0, blocked: 0 };
  for (const x of feature.tasks.tasks) counts[x.status]++;
  if (!t) {
    const why = counts.todo === 0 ? 'every task is done or blocked' : 'every todo task waits on a task that is not done';
    return { ok: true, findings: [], exit: 0, text: `no task ready: ${why} (${counts.done} done, ${counts.todo} todo, ${counts.blocked} blocked)`, data: { task: null, counts } };
  }
  return { ok: true, findings: [], exit: 0, text: `${t.id}  ${t.title}  [${t.requirements.join(', ')}]`, data: { task: { id: t.id, title: t.title, kind: t.kind, requirements: t.requirements, parallel_group: t.parallel_group ?? null }, counts } };
}

export function gate(root: string, stage: string, dir: string, taskIds: string[]): CmdResult {
  const rel = resolveFeatureDir(root, dir);
  const check = runCheck(root, [rel]);
  const feature = check.features[0];
  const errors = check.findings.filter((f) => f.severity === 'error');
  const findings: Finding[] = [];
  const reqs = feature.requirements;
  const tasks = feature.tasks;
  const data: Record<string, unknown> = {};
  switch (stage) {
    case 'plan': {
      if (errors.length) return refuse(errors);
      if (!reqs) return refuse(need(feature));
      for (const q of reqs.questions ?? []) if (!q.answer) findings.push({ severity: 'error', code: 'GATE-QUESTION', message: `${q.id} is open: ${q.ask}`, fix: 'Run /spex:clarify.' });
      for (const u of reqs.unknowns ?? []) if (!u.decision) findings.push({ severity: 'error', code: 'GATE-UNKNOWN', message: `${u.id} has no decision: ${u.ask}`, fix: 'Run /spex:research.' });
      for (const r of reqs.requirements) if (r.status === 'draft') findings.push({ severity: 'error', code: 'GATE-APPROVED', message: `${r.id} is draft`, fix: 'A person runs `spex approve`.' });
      break;
    }
    case 'tests': {
      if (errors.length) return refuse(errors);
      if (!reqs || !tasks) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: 'tests gate needs requirements.yaml and tasks.yaml', fix: 'Run /spex:plan first.' }]);
      let batch: Task[];
      if (taskIds.length) {
        batch = [];
        for (const id of taskIds) {
          const t = tasks.tasks.find((x) => x.id === id);
          if (!t) return refuse([{ severity: 'error', code: 'TASK-UNKNOWN', message: `${id} is not in ${feature.tasksPath}`, fix: 'Run `spex show <dir> --tests` to see the batch.' }], 2);
          batch.push(t);
        }
      } else batch = pickTestBatch(root, check.config, feature).tasks;
      for (const t of batch) {
        for (const id of t.requirements) {
          const r = reqs.requirements.find((x) => x.id === id);
          if (r && r.status === 'draft') findings.push({ severity: 'error', code: 'GATE-APPROVED', message: `${id} (${t.id}) is draft`, fix: 'A person runs `spex approve`.' });
        }
      }
      data.tasks = batch.map((t) => t.id);
      break;
    }
    case 'implement': {
      const taskId = taskIds[0];
      if (!taskId) return refuse([{ severity: 'error', code: 'USAGE', message: 'gate implement needs a task id', fix: 'spex gate implement <dir> T01' }], 2);
      if (errors.length) return refuse(errors);
      if (!reqs || !tasks) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: 'implement gate needs requirements.yaml and tasks.yaml', fix: 'Run /spex:plan first.' }]);
      const t = tasks.tasks.find((x) => x.id === taskId);
      if (!t) return refuse([{ severity: 'error', code: 'TASK-UNKNOWN', message: `${taskId} is not in ${feature.tasksPath}`, fix: 'Run `spex next`.' }], 2);
      if (t.status === 'done') findings.push({ severity: 'error', code: 'GATE-DONE', message: `${t.id} is already done`, fix: 'Run `spex next` for the next task.' });
      const status = new Map(tasks.tasks.map((x) => [x.id, x.status]));
      for (const d of t.depends_on ?? []) if (status.get(d) !== 'done') findings.push({ severity: 'error', code: 'GATE-DEPENDS', message: `${t.id} depends on ${d}, which is ${status.get(d) ?? 'missing'}`, fix: `Finish ${d} first.` });
      const cov = coverageFor(root, check.config, feature, t.requirements);
      for (const m of cov.missing) findings.push({ severity: 'error', code: 'GATE-COVERAGE', message: `no acceptance test named ${m.name} (${m.req}/${m.ac})`, fix: `Run /spex:tests ${t.id} first.` });
      // Red first, checked now: the gate runs the task's acceptance tests itself and they must fail.
      if (!findings.length) {
        if (!isGitRepo(root)) findings.push({ severity: 'error', code: 'GIT-REQUIRED', message: 'the red check needs a git repository', fix: 'Run inside the repository.' });
        else {
          const v = verifyTask(root, check.config, reqs.feature, t, 'fail');
          if (!v.ok) {
            const why = v.findings[0];
            findings.push({ severity: 'error', code: 'GATE-RED', message: why ? why.message : `the acceptance tests of ${t.id} did not fail as expected`, fix: why?.fix ?? `Run /spex:tests ${t.id}.` });
          }
          data.red = v.path ?? null;
        }
      }
      break;
    }
    case 'review': {
      if (errors.length) return refuse(errors);
      if (!tasks) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: 'review gate needs tasks.yaml', fix: 'Run /spex:plan first.' }]);
      for (const t of tasks.tasks) if (t.status !== 'done') findings.push({ severity: 'error', code: 'GATE-TASKS', message: `${t.id} is ${t.status}`, fix: t.status === 'blocked' ? 'Unblock it or split it.' : 'Implement it first.' });
      break;
    }
    default:
      return refuse([{ severity: 'error', code: 'USAGE', message: `unknown stage ${stage}`, fix: 'Stages: plan, tests, implement, review.' }], 2);
  }
  if (findings.length) return { ...refuse(findings), data };
  const what = stage === 'tests' ? ((data.tasks as string[]).length ? ` ${(data.tasks as string[]).join(', ')}` : ' (nothing to test: every task has its tests)') : taskIds[0] ? ` ${taskIds[0]}` : '';
  return { ok: true, findings: check.findings.filter((f) => f.severity === 'warning'), exit: 0, text: `gate ${stage} open for ${feature.dir}${what}`, data };
}

/** Done runs every verify command now. Only a pass at this moment flips the status. */
export function done(root: string, dir: string, taskId: string): CmdResult {
  const rel = resolveFeatureDir(root, dir);
  const check = runCheck(root, [rel]);
  const feature = check.features[0];
  const errs = need(feature);
  if (errs.length) return refuse(errs, 4);
  if (!feature.tasks || !feature.requirements) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no tasks.yaml`, fix: 'Run /spex:plan.' }], 4);
  const i = feature.tasks.tasks.findIndex((t) => t.id === taskId);
  if (i < 0) return refuse([{ severity: 'error', code: 'TASK-UNKNOWN', message: `${taskId} is not in ${feature.tasksPath}`, fix: 'Check the id.' }], 2);
  if (!isGitRepo(root)) return refuse([{ severity: 'error', code: 'GIT-REQUIRED', message: 'done needs a git repository to identify the tree', fix: 'Run inside the repository.' }], 2);
  const task = feature.tasks.tasks[i];
  const v = verifyTask(root, check.config, feature.requirements.feature, task, 'pass');
  if (!v.evidence) return refuse(v.findings, 2);
  if (!v.ok) {
    const failed = v.evidence.commands.find((c) => c.exit !== 0);
    return { ok: false, findings: [{ severity: 'error', code: 'DONE-FAILED', message: `${taskId} is not done: ${failed?.cmd ?? 'a verify command'} exited ${failed?.exit ?? '?'}`, fix: 'Fix the code, then run `spex done` again. It runs the checks itself; no earlier run counts.' }], exit: 7, text: v.tail.slice(-2500), data: { evidence: v.evidence } };
  }
  const doc = openDocument(join(root, feature.tasksPath));
  doc.setIn(['tasks', i, 'status'], 'done');
  saveDocument(join(root, feature.tasksPath), doc);
  return { ok: true, findings: [], exit: 0, text: `${taskId} done: ${v.commands.length} command(s) passed now (tree ${v.evidence.tree}, record ${v.path})`, data: { task: taskId, tree: v.evidence.tree, evidence: v.evidence } };
}

export function block(root: string, dir: string, taskId: string, reason: string): CmdResult {
  const feature = loadFeature(root, resolveFeatureDir(root, dir));
  const errs = need(feature);
  if (errs.length) return refuse(errs, 4);
  if (!feature.tasks || !feature.requirements) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no tasks.yaml`, fix: 'Run /spex:plan.' }], 4);
  const i = feature.tasks.tasks.findIndex((t) => t.id === taskId);
  if (i < 0) return refuse([{ severity: 'error', code: 'TASK-UNKNOWN', message: `${taskId} is not in ${feature.tasksPath}`, fix: 'Check the id.' }], 2);
  const doc = openDocument(join(root, feature.tasksPath));
  doc.setIn(['tasks', i, 'status'], 'blocked');
  saveDocument(join(root, feature.tasksPath), doc);
  writeText(join(root, '.spex', 'runs', feature.requirements.feature, `block-${taskId}.json`), JSON.stringify({ task: taskId, reason, at: new Date().toISOString() }, null, 2) + '\n');
  return { ok: true, findings: [], exit: 0, text: `${taskId} blocked: ${reason}`, data: { task: taskId, reason } };
}

export function archive(root: string, dir: string): CmdResult {
  const rel = resolveFeatureDir(root, dir);
  const check = runCheck(root, [rel]);
  if (hasErrors(check.findings)) return refuse(check.findings, 4);
  const feature = check.features[0];
  const reqs = feature.requirements;
  if (!reqs) return refuse(need(feature), 4);
  const findings: Finding[] = [];
  for (const q of reqs.questions ?? []) if (!q.answer) findings.push({ severity: 'error', code: 'ARCHIVE-QUESTION', message: `${q.id} is open`, fix: 'Run /spex:clarify.' });
  for (const t of feature.tasks?.tasks ?? []) if (t.status !== 'done') findings.push({ severity: 'error', code: 'ARCHIVE-TASKS', message: `${t.id} is ${t.status}`, fix: 'Every task must be done before archive.' });
  if (!feature.tasks && !reqs.requirements.every((r) => r.status === 'retired')) findings.push({ severity: 'error', code: 'ARCHIVE-TASKS', message: 'no tasks.yaml: nothing was built', fix: 'Run /spex:plan and build, or retire the records.' });
  if (findings.length) return refuse(findings);
  const defaults = (reqs.questions ?? []).filter((q) => q.by === 'default').map((q) => `${q.id} ${q.ask} → ${q.answer} (nobody was asked)`);
  const doc = openDocument(join(root, feature.requirementsPath));
  let built = 0;
  reqs.requirements.forEach((r, i) => {
    if (r.status === 'approved') {
      doc.setIn(['requirements', i, 'status'], 'built');
      built++;
    }
  });
  saveDocument(join(root, feature.requirementsPath), doc);
  const retired: string[] = [];
  const targets = reqs.requirements.flatMap((r) => (r.relationships ?? []).filter((x) => x.type === 'supersedes').map((x) => x.target));
  for (const other of featureDirs(root)) {
    if (other === feature.dir) continue;
    const f = loadFeature(root, other);
    if (!f.requirements) continue;
    const hits = f.requirements.requirements.map((r, i) => ({ r, i })).filter(({ r }) => targets.includes(r.id) && r.status !== 'retired');
    if (!hits.length) continue;
    const d = openDocument(join(root, f.requirementsPath));
    for (const { r, i } of hits) {
      d.setIn(['requirements', i, 'status'], 'retired');
      retired.push(`${r.id} (${other})`);
    }
    saveDocument(join(root, f.requirementsPath), d);
  }
  const lines = [`${built} record(s) built in ${feature.requirementsPath}`];
  if (retired.length) lines.push(`retired: ${retired.join(', ')}`);
  if (defaults.length) lines.push('answered by default, for a person to read:', ...defaults.map((d) => `- ${d}`));
  return { ok: true, findings: check.findings.filter((f) => f.severity === 'warning'), exit: 0, text: lines.join('\n'), data: { built, retired, defaults } };
}
