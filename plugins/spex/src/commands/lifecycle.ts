// The gates inside implement, and the status of a task. Every status after `draft` is written by a program, never
// by a skill. A gate runs its check at the moment it decides; it never reads a file an agent could have written.
// The phases themselves (plan, implement, review) start and end in commands/phase.ts.

import { join } from 'node:path';
import { approvalFindings, setApproval, tasksApproval, tasksHash } from '../approvals.js';
import { runCheck } from '../check.js';
import { loadConfig } from '../config.js';
import { isGitRepo } from '../git.js';
import { fileExists, openDocument, readText, saveDocument, writeText } from '../io.js';
import { loadFeature, resolveFeatureDir } from '../specs.js';
import { claimsOf, isScript, needsFindings, testsOf } from '../tests.js';
import type { Feature, Finding, TestRecord } from '../types.js';
import { verifyTask } from '../verify.js';
import { featureRepos, recordStarts, repoFindings, taskRepos } from '../repos.js';
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
  if (!feature.requirements && !out.length) out.push({ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no requirements.yaml`, fix: `Run /spex:plan ${feature.dir}.` });
  return out;
}

/** The claims without a proof in tests.yaml: scenarios of live records, and tasks. */
export function planGaps(feature: Feature): { scenarios: string[]; tasks: string[] } {
  const covered = new Set((feature.tests?.tests ?? []).flatMap((t) => t.covers));
  const scenarios: string[] = [];
  for (const r of feature.requirements?.requirements ?? []) {
    if (r.status === 'retired') continue;
    for (const a of r.acceptance) if (!covered.has(r.id) && !covered.has(`${r.id}/${a.id}`)) scenarios.push(`${r.id}/${a.id}`);
  }
  const tasks = (feature.tasks?.tasks ?? []).filter((t) => ![...claimsOf(feature, t)].some((c) => covered.has(c))).map((t) => t.id);
  return { scenarios, tasks };
}

/** The reason file `spex block` wrote, or null when it is missing or does not parse. */
export function readBlock(root: string, feature: string, taskId: string): { reason: string; ask: string | null } | null {
  const path = join(root, '.spex', 'runs', feature, `block-${taskId}.json`);
  if (!fileExists(path)) return null;
  try {
    const doc = JSON.parse(readText(path)) as { reason?: string; ask?: string };
    return { reason: doc.reason ?? '', ask: doc.ask?.trim() || null };
  } catch {
    return null;
  }
}

/** The blocked tasks of a spec, each with its reason, and the yes or no question it waits on when it has one. */
export function blockedTasks(root: string, feature: Feature): { id: string; reason: string; ask: string | null }[] {
  const id = feature.requirements?.feature ?? feature.name;
  return (feature.tasks?.tasks ?? []).filter((t) => t.status === 'blocked').map((t) => ({ id: t.id, ...(readBlock(root, id, t.id) ?? { reason: '', ask: null }) }));
}

/** The lines a start and `spex status` print for a write with no undo: the question, and that only the word yes runs it. */
export function yesLines(root: string, feature: Feature): string[] {
  const asks = blockedTasks(root, feature).filter((b) => b.ask);
  if (!asks.length) return [];
  return [...asks.map((b) => `waits for your yes: ${b.id} · ${b.ask}`), 'a write with no undo runs only on the word yes: as the reply, or after the folder in the command'];
}

const tasksDone = (root: string, feature: Feature, findings: Finding[]): void => {
  for (const t of feature.tasks?.tasks ?? []) if (t.status !== 'done') findings.push({ severity: 'error', code: 'GATE-TASKS', message: `${t.id} is ${t.status}`, fix: t.status === 'blocked' ? blockedFix(root, feature.requirements?.feature ?? feature.name, feature.dir, t.id) : 'Develop it first.' });
};

export function gate(root: string, stage: string, dir: string, ids: string[]): CmdResult {
  const rel = resolveFeatureDir(root, dir);
  const check = runCheck(root, [rel]);
  const feature = check.features[0];
  const errors = check.findings.filter((f) => f.severity === 'error');
  const findings: Finding[] = [];
  const infos: Finding[] = [];
  const reqs = feature.requirements;
  const tasks = feature.tasks;
  const tests = feature.tests;
  const data: Record<string, unknown> = {};
  const needFiles = (what: string): CmdResult | null => (!reqs || !tasks || !tests ? refuse([{ severity: 'error', code: 'SPEC-MISSING', message: `${what} gate needs requirements.yaml, tasks.yaml and tests.yaml`, fix: `Run /spex:plan ${feature.dir}: it writes the records, the tasks and the test plan.` }]) : null);
  switch (stage) {
    case 'tests': {
      // Test-develop: the batch of script tests that have no file yet, for the test developers.
      if (errors.length) return refuse(errors);
      const missing = needFiles('tests');
      if (missing) return missing;
      let batch: TestRecord[];
      if (ids.length) {
        batch = [];
        for (const id of ids) {
          const t = tests!.tests.find((x) => x.id === id);
          if (!t) return refuse([{ severity: 'error', code: 'TEST-UNKNOWN', message: `${id} is not in ${feature.testsPath}`, fix: 'Run `spex show <dir> --tests` to see the batch.' }], 2);
          batch.push(t);
        }
      } else batch = pickTestBatch(root, check.config, feature).tests;
      for (const r of reqs!.requirements) if (r.status === 'draft' && batch.some((t) => t.covers.some((c) => c.startsWith(r.id)))) findings.push({ severity: 'error', code: 'GATE-APPROVED', message: `${r.id} is draft`, fix: `The records are approved when implement starts: \`spex start implement ${feature.dir}\`.` });
      findings.push(...approvalFindings(check.config, feature, 'tasks'), ...approvalFindings(check.config, feature, 'tests'));
      data.tests = batch.map((t) => t.id);
      break;
    }
    case 'develop': {
      const taskId = ids[0];
      if (!taskId) return refuse([{ severity: 'error', code: 'USAGE', message: 'gate develop needs a task id', fix: 'spex gate develop <dir> T01' }], 2);
      if (errors.length) return refuse(errors);
      const missing = needFiles('develop');
      if (missing) return missing;
      const t = tasks!.tasks.find((x) => x.id === taskId);
      if (!t) return refuse([{ severity: 'error', code: 'TASK-UNKNOWN', message: `${taskId} is not in ${feature.tasksPath}`, fix: `\`spex show ${feature.dir} --ready\` lists the tasks.` }], 2);
      if (t.status === 'done') findings.push({ severity: 'error', code: 'GATE-DONE', message: `${t.id} is already done`, fix: 'A done task stays done.' });
      const status = new Map(tasks!.tasks.map((x) => [x.id, x.status]));
      for (const d of t.depends_on ?? []) if (status.get(d) !== 'done') findings.push({ severity: 'error', code: 'GATE-DEPENDS', message: `${t.id} depends on ${d}, which is ${status.get(d) ?? 'missing'}`, fix: `Finish ${d} first.` });
      const own = testsOf(feature, t);
      if (!own.length) findings.push({ severity: 'error', code: 'GATE-COVERAGE', message: `${t.id} has no test in tests.yaml`, fix: 'The test analyst plans one (the part wrong.md of implement), then `spex stamp`.' });
      const cov = coverageFor(root, check.config, feature, own);
      for (const m of cov.missing) findings.push({ severity: 'error', code: 'GATE-COVERAGE', message: `${m.id}: no test named ${m.name} in its file`, fix: `A test developer writes it first: \`spex show ${feature.dir} --tests ${m.id}\`.` });
      // What a person approved must be what is on disk: tasks.yaml, and tests.yaml when configured.
      findings.push(...approvalFindings(check.config, feature, 'tasks'), ...approvalFindings(check.config, feature, 'tests'));
      for (const x of own.filter(isScript)) findings.push(...needsFindings(root, x.needs, x.id));
      const repos = taskRepos(check.config, t, own.map((x) => x.driver));
      findings.push(...repoFindings(root, check.config, repos));
      // Red first, checked now: the gate runs the task's file tests itself and they must fail.
      if (!findings.length) {
        if (!isGitRepo(root)) findings.push({ severity: 'error', code: 'GIT-REQUIRED', message: 'the red check needs a git repository', fix: 'Run inside the repository.' });
        else {
          const v = verifyTask(root, check.config, feature, t, 'fail');
          if (!v.ok) {
            const why = v.findings[0];
            findings.push({ severity: 'error', code: 'GATE-RED', message: why ? why.message : `the tests of ${t.id} did not fail as expected`, fix: why?.fix ?? 'A test that is green before the code exists proves nothing: a test developer rewrites it.' });
          } else infos.push(...v.findings);
          data.red = v.path ?? null;
        }
      }
      // The commit each other repo is at when its first task opens: the review diff of that repo starts there.
      if (!findings.length) recordStarts(root, check.config, reqs!.feature, repos);
      break;
    }
    case 'verify': {
      if (errors.length) return refuse(errors);
      const missing = needFiles('verify');
      if (missing) return missing;
      tasksDone(root, feature, findings);
      findings.push(...repoFindings(root, check.config, featureRepos(check.config, feature)));
      findings.push(...approvalFindings(check.config, feature, 'tests'));
      for (const x of tests!.tests) findings.push(...needsFindings(root, x.needs, x.id));
      data.sessions = tests!.tests.filter((x) => x.kind === 'session').map((x) => x.id);
      break;
    }
    default:
      return refuse([{ severity: 'error', code: 'USAGE', message: `unknown stage ${stage}`, fix: 'Stages: tests, develop, verify. They are the gates inside implement; a phase starts with `spex start <plan|implement|review> <dir>`.' }], 2);
  }
  if (findings.length) return { ...refuse(findings), data };
  let what = ids[0] ? ` ${ids[0]}` : '';
  if (stage === 'tests') what = (data.tests as string[]).length ? ` ${(data.tests as string[]).join(', ')}` : ' (nothing to write: every script test has its file)';
  if (stage === 'verify') what = ` (${(data.sessions as string[]).length} session(s) to perform)`;
  return { ok: true, findings: [...check.findings.filter((f) => f.severity === 'warning'), ...infos], exit: 0, text: `gate ${stage} open for ${feature.dir}${what}`, data };
}

/** Done runs every verify command now. Only a pass at this moment flips the status. */
export function done(root: string, dir: string, taskId: string): CmdResult {
  const rel = resolveFeatureDir(root, dir);
  const check = runCheck(root, [rel]);
  const feature = check.features[0];
  const errs = need(feature);
  if (errs.length) return refuse(errs, 4);
  if (!feature.tasks || !feature.requirements) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no tasks.yaml`, fix: `Run /spex:plan ${feature.dir}.` }], 4);
  if (!feature.tests) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no tests.yaml: nothing proves the task`, fix: `Run /spex:plan ${feature.dir}: the test analyst writes it.` }], 4);
  const i = feature.tasks.tasks.findIndex((t) => t.id === taskId);
  if (i < 0) return refuse([{ severity: 'error', code: 'TASK-UNKNOWN', message: `${taskId} is not in ${feature.tasksPath}`, fix: 'Check the id.' }], 2);
  if (!isGitRepo(root)) return refuse([{ severity: 'error', code: 'GIT-REQUIRED', message: 'done needs a git repository to identify the tree', fix: 'Run inside the repository.' }], 2);
  const task = feature.tasks.tasks[i];
  const lost = repoFindings(root, check.config, taskRepos(check.config, task, testsOf(feature, task).map((x) => x.driver)));
  if (lost.length) return refuse(lost, 2);
  const v = verifyTask(root, check.config, feature, task, 'pass');
  if (!v.evidence) return refuse(v.findings, 2);
  if (!v.ok) {
    const failed = v.evidence.commands.find((c) => c.exit !== 0);
    const why = failed ? `${failed.cmd} exited ${failed.exit}` : (v.findings[0]?.message ?? 'a verify command did not pass');
    return { ok: false, findings: [{ severity: 'error', code: 'DONE-FAILED', message: `${taskId} is not done: ${why}`, fix: 'Fix the code, then run `spex done` again. It runs the checks itself; no earlier run counts.' }, ...v.findings.filter((f) => f.code === 'RUN-SKIPPED')], exit: 7, text: v.tail.slice(-2500), data: { evidence: v.evidence } };
  }
  const doc = openDocument(join(root, feature.tasksPath));
  doc.setIn(['tasks', i, 'status'], 'done');
  saveDocument(join(root, feature.tasksPath), doc);
  return { ok: true, findings: [], exit: 0, text: `${taskId} done: ${v.commands.length} command(s) passed now (tree ${v.evidence.tree}, record ${v.path})`, data: { task: taskId, tree: v.evidence.tree, evidence: v.evidence } };
}

/** The fix text for a blocked task: the yes when it waits for one, the cause to fix otherwise. */
function blockedFix(root: string, featureId: string, dir: string, taskId: string): string {
  const note = readBlock(root, featureId, taskId);
  if (note?.ask) return `It waits for a person's yes: ${note.ask} Yes: /spex:implement ${dir} (the run unblocks it). No: say what you want with /spex:comment.`;
  return `Read .spex/runs/${featureId}/block-${taskId}.json. /spex:implement ${dir} sends it to the decider, which names the cause.`;
}

export function block(root: string, dir: string, taskId: string, reason: string, ask?: string): CmdResult {
  const feature = loadFeature(root, resolveFeatureDir(root, dir));
  const errs = need(feature);
  if (errs.length) return refuse(errs, 4);
  if (!feature.tasks || !feature.requirements) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no tasks.yaml`, fix: `Run /spex:plan ${feature.dir}.` }], 4);
  const i = feature.tasks.tasks.findIndex((t) => t.id === taskId);
  if (i < 0) return refuse([{ severity: 'error', code: 'TASK-UNKNOWN', message: `${taskId} is not in ${feature.tasksPath}`, fix: 'Check the id.' }], 2);
  const doc = openDocument(join(root, feature.tasksPath));
  doc.setIn(['tasks', i, 'status'], 'blocked');
  saveDocument(join(root, feature.tasksPath), doc);
  writeText(join(root, '.spex', 'runs', feature.requirements.feature, `block-${taskId}.json`), JSON.stringify({ task: taskId, reason, ...(ask ? { ask } : {}), at: new Date().toISOString() }, null, 2) + '\n');
  return { ok: true, findings: [], exit: 0, text: `${taskId} blocked: ${reason}${ask ? `\nwaits for a person's yes: ${ask}` : ''}`, data: { task: taskId, reason, ask: ask ?? null } };
}

/**
 * `spex unblock <dir> <task>`: `blocked` → `todo`, once the cause is fixed (a split, a missing API, a wrong test
 * the process corrected). The reason file stays under .spex/runs/: a block is a lesson for the steps after this one.
 */
export function unblock(root: string, dir: string, taskId: string): CmdResult {
  const feature = loadFeature(root, resolveFeatureDir(root, dir));
  const errs = need(feature);
  if (errs.length) return refuse(errs, 4);
  if (!feature.tasks || !feature.requirements) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no tasks.yaml`, fix: `Run /spex:plan ${feature.dir}.` }], 4);
  const i = feature.tasks.tasks.findIndex((t) => t.id === taskId);
  if (i < 0) return refuse([{ severity: 'error', code: 'TASK-UNKNOWN', message: `${taskId} is not in ${feature.tasksPath}`, fix: 'Check the id.' }], 2);
  const task = feature.tasks.tasks[i];
  if (task.status !== 'blocked') return refuse([{ severity: 'error', code: 'UNBLOCK-STATUS', message: `${taskId} is ${task.status}, not blocked`, fix: task.status === 'done' ? 'A done task stays done.' : 'Nothing to undo.' }]);
  const doc = openDocument(join(root, feature.tasksPath));
  doc.setIn(['tasks', i, 'status'], 'todo');
  saveDocument(join(root, feature.tasksPath), doc);
  const reason = `.spex/runs/${feature.requirements.feature}/block-${taskId}.json`;
  return { ok: true, findings: [], exit: 0, text: `${taskId} todo again; the reason stays in ${reason} for the lessons`, data: { task: taskId, reason } };
}

/**
 * `spex paths <dir> <task> --add <path>… --reason "…"`: a developer found that the task must write a file outside its
 * `paths`, and a decider said yes. tasks.yaml is the process's own work, so the process widens it: no person types a fix.
 * The same rules as spex check hold (never a protected or test path); a change a rule refuses is undone. The record under
 * .spex/runs/ says why, and spex show --review prints it: a plan a person approved stays approved, re-stamped with the new
 * hash, and the person reads the change at review. A plan that was not approved before still waits for the person.
 */
export function paths(root: string, dir: string, taskId: string, add: string[], reason: string): CmdResult {
  const rel = resolveFeatureDir(root, dir);
  const feature = loadFeature(root, rel);
  const errs = need(feature);
  if (errs.length) return refuse(errs, 4);
  if (!feature.tasks || !feature.requirements) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no tasks.yaml`, fix: `Run /spex:plan ${feature.dir}.` }], 4);
  const i = feature.tasks.tasks.findIndex((t) => t.id === taskId);
  if (i < 0) return refuse([{ severity: 'error', code: 'TASK-UNKNOWN', message: `${taskId} is not in ${feature.tasksPath}`, fix: 'Check the id.' }], 2);
  const task = feature.tasks.tasks[i];
  if (task.status === 'done') return refuse([{ severity: 'error', code: 'PATHS-DONE', message: `${taskId} is done`, fix: 'A done task stays done. New work is a new task: the planner adds it.' }]);
  if (!reason.trim()) return refuse([{ severity: 'error', code: 'PATHS-REASON', message: 'paths needs --reason', fix: 'Give the decider\'s verdict: why the task must write the file.' }], 2);
  const fresh = [...new Set(add.map((p) => p.trim()).filter(Boolean))].filter((p) => !task.paths.includes(p));
  if (!fresh.length) return refuse([{ severity: 'error', code: 'PATHS-NONE', message: add.length ? `${taskId} has ${add.join(', ')} in its paths already` : 'paths needs --add <path>', fix: 'Name a path the task does not have yet.' }], 2);
  const file = join(root, feature.tasksPath);
  const before = readText(file);
  const config = loadConfig(root).config;
  const approvedBefore = tasksApproval(config, feature.tasks).approved;
  const planEnded = !!feature.tasks.approvals?.tasks;
  const errorsNow = (): Finding[] => runCheck(root, [rel]).findings.filter((f) => f.severity === 'error');
  const key = (f: Finding): string => `${f.code} ${f.message}`;
  const old = new Set(errorsNow().map(key));
  const doc = openDocument(file);
  for (const p of fresh) doc.addIn(['tasks', i, 'paths'], p);
  saveDocument(file, doc);
  // The rules of spex check, on the file as it is now: an error the change brings (a protected path, two parallel tasks on
  // one file, the file limit) means the path is not the task's to write, so the file goes back as it was.
  const added = errorsNow().filter((f) => !old.has(key(f)));
  if (added.length) {
    writeText(file, before);
    return refuse(added, 6);
  }
  // The stamp of the plan as it was stays: the only change since is this one, a decider's verdict under the check
  // rules, and review shows it. A plan that was changed before this still needs `spex stamp`, so no other edit rides
  // through here.
  if (approvedBefore) {
    const stamped = openDocument(file);
    setApproval(stamped, 'tasks', tasksHash(loadFeature(root, rel).tasks!));
    saveDocument(file, stamped);
  }
  const record = `.spex/runs/${feature.requirements.feature}/paths-${taskId}.json`;
  const prior = fileExists(join(root, record)) ? (JSON.parse(readText(join(root, record))) as { changes: unknown[] }).changes : [];
  const due = planEnded && !approvedBefore;
  writeText(join(root, record), JSON.stringify({ task: taskId, changes: [...prior, { added: fresh, reason, stamp: approvedBefore ? 'kept' : due ? 'due' : 'none', at: new Date().toISOString() }] }, null, 2) + '\n');
  return {
    ok: true,
    findings: [],
    exit: 0,
    text: `${taskId} paths + ${fresh.join(', ')}; why in ${record}${approvedBefore ? '\nthe stamp of the plan stays: /spex:review shows the change' : due ? `\ntasks.yaml was changed before this: \`spex stamp ${feature.dir}\` checks the links and stamps it` : ''}`,
    data: { task: taskId, added: fresh, record, stamp_due: due, stamp_kept: approvedBefore },
  };
}
