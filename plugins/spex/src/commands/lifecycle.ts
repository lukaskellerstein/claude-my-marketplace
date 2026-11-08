// Status changes and gates. Every status after `draft` is written by a program, never by a skill.
// A gate runs its check at the moment it decides; it never reads a file an agent could have written.

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { isMap, isScalar, type Document } from 'yaml';
import { APPROVAL_STAGES, approvalFindings, reviewFixIds, tasksApproval, tasksHash, testsApproval, testsHash, type ApprovalStage } from '../approvals.js';
import { hasErrors, runCheck } from '../check.js';
import { loadConfig } from '../config.js';
import { currentBranch, isGitRepo } from '../git.js';
import { fileExists, openDocument, readText, saveDocument, writeText } from '../io.js';
import { nextPlanned, roadmapSteps } from '../roadmap.js';
import { pendingFindings } from '../review.js';
import { REQUIRED_SECTIONS, openQuestions, openSummary, sectionBodies, specDocPath, specMeta, specStatus, waitsFor, withSpecStatus } from '../rules/spec.js';
import { SPECS_DIR, featureDirs, loadFeature, resolveFeatureDir } from '../specs.js';
import { claimsOf, isScript, needsFindings, testsOf } from '../tests.js';
import type { Config, Feature, Finding, Task, TestRecord } from '../types.js';
import { runCommands, verifyIsCurrent, verifyTask } from '../verify.js';
import { featureRepos, readShipped, recordStarts, repoFindings, repoPath, repoRoot, taskRepos, writeShipped } from '../repos.js';
import { coverageFor, pickTestBatch } from './coverage.js';
import { openedStub } from './new.js';

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
  if (!feature.requirements && !out.length) out.push({ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no requirements.yaml`, fix: 'Run /spex:requirements.' });
  return out;
}

/**
 * `spex approve` on a folder that has only spec.md: the person said the idea is shaped. `status: shaping` becomes
 * `ready`; a document with no status line (a person's own) gets one. It refuses while a required section is empty,
 * and it refuses a planned stub: that one is shaped first. Open questions are allowed and go on to /spex:requirements.
 */
function approveSpec(root: string, feature: Feature, findings: Finding[]): CmdResult {
  const doc = specDocPath(root, feature)!;
  const text = readText(join(root, doc.path));
  const status = specStatus(text);
  const next = `Next: /spex:requirements ${feature.dir}`;
  if (status === 'ready') return { ok: true, findings: [], exit: 0, text: `${doc.path} is ready already. ${next}`, data: { spec: 'ready', changed: false } };
  if (status === 'planned') return refuse([{ severity: 'error', code: 'APPROVE-SPEC', message: `${doc.path} is a planned step: there is nothing to approve yet`, fix: `Run /spex:new ${feature.dir} when its dependencies are built; it shapes the stub and ends with this approval.` }]);
  const empty = findings.filter((f) => f.code === 'SPEC-SECTIONS');
  if (empty.length) return refuse([...empty, { severity: 'error', code: 'APPROVE-SPEC', message: `${doc.path} is not ready: a required section is empty`, fix: 'Fill Why, What, Not this and Success in /spex:new, then approve.' }]);
  writeText(join(root, doc.path), withSpecStatus(text, 'ready'));
  const open = openQuestions(sectionBodies(text));
  const carried = open.total ? ` (${openSummary(open)} open, carried into questions and unknowns)` : '';
  const how = status === 'shaping' ? 'ready' : 'had no status line; a person read it, so it is ready now';
  return { ok: true, findings: [], exit: 0, text: `${doc.path} ${how}${carried}. ${next}`, data: { spec: 'ready', changed: true, open } };
}

/** The approvals block sits right after `feature`, so a skill that appends at the end of the file never breaks the YAML. */
function setApproval(doc: Document, key: ApprovalStage, value: unknown): void {
  const root = doc.contents;
  if (isMap(root) && !root.has('approvals')) {
    const at = root.items.findIndex((p) => (isScalar(p.key) ? p.key.value : p.key) === 'feature') + 1;
    root.items.splice(at, 0, doc.createPair('approvals', {}));
  }
  doc.setIn(['approvals', key], doc.createNode(value));
}

/** Stamp tests.yaml as read. The records and the plan carry a person's eyes at the same gates, so this rides along. */
function stampTests(root: string, feature: Feature): string {
  if (!feature.tests) return '';
  const doc = openDocument(join(root, feature.testsPath));
  setApproval(doc, 'tests', testsHash(feature.tests, reviewFixIds(feature.tasks)));
  saveDocument(join(root, feature.testsPath), doc);
  return ` and ${feature.testsPath} (${feature.tests.tests.length} test(s)) approved as read`;
}

/**
 * `spex approve <dir> [tasks|tests]`: the one verb for every stage a person passes. Without a stage it takes
 * the first one that waits: the spec, then the draft records (gate 1), then tasks.yaml, then tests.yaml — the
 * last two only when .spex/config.yaml lists them in `approvals`. Gate 1 and the tasks approval stamp tests.yaml
 * too: the test analyst wrote it in the same phase, and the person reads both.
 */
export function approve(root: string, dir: string, stageArg?: string): CmdResult {
  const rel = resolveFeatureDir(root, dir);
  const check = runCheck(root, [rel]);
  if (hasErrors(check.findings)) return refuse(check.findings, 4);
  const feature = check.features[0];
  const config = check.config;
  const stage = stageArg as ApprovalStage | undefined;
  if (stage && !APPROVAL_STAGES.includes(stage)) return refuse([{ severity: 'error', code: 'USAGE', message: `unknown stage ${stage}`, fix: 'spex approve <dir> [tasks|tests]; without a stage it takes the first one that waits.' }], 2);
  if (stage && !config.approvals.includes(stage)) return refuse([{ severity: 'error', code: 'APPROVE-STAGE', message: `${stage} is not in approvals`, fix: 'Add it to approvals in .spex/config.yaml, or leave that stage to the script.' }], 2);
  if (!feature.requirements && specDocPath(root, feature)) return approveSpec(root, feature, check.findings);
  if (!feature.requirements) return refuse(need(feature), 4);
  const warnings = check.findings.filter((f) => f.severity === 'warning');
  const nextBlock = (): string => renderNext(whatNext(root, config, loadFeature(root, rel)));

  // gate 1: the draft records, and the proof plan the test analyst wrote for them
  if (!stage && feature.requirements.requirements.some((r) => r.status === 'draft')) {
    const open = check.findings.filter((f) => f.code === 'REQ-QUESTION-OPEN');
    if (open.length) return refuse([...open, { severity: 'error', code: 'APPROVE-QUESTION', message: `${open.length} question(s) still open`, fix: 'Run /spex:clarify, then approve.' }]);
    const doc = openDocument(join(root, feature.requirementsPath));
    let flipped = 0;
    feature.requirements.requirements.forEach((r, i) => {
      if (r.status === 'draft') {
        doc.setIn(['requirements', i, 'status'], 'approved');
        flipped++;
      }
    });
    saveDocument(join(root, feature.requirementsPath), doc);
    const tests = stampTests(root, feature);
    return { ok: true, findings: warnings, exit: 0, text: `${flipped} record(s) approved in ${feature.requirementsPath}${tests}${warnings.length ? ` (${warnings.length} warning(s) left)` : ''}\n${nextBlock()}`, data: { stage: 'requirements', approved: flipped, tests: feature.tests?.tests.length ?? 0 } };
  }
  if (feature.tasks && (!stage || stage === 'tasks') && config.approvals.includes('tasks')) {
    const state = tasksApproval(config, feature.tasks);
    if (!state.approved || stage === 'tasks') {
      const doc = openDocument(join(root, feature.tasksPath));
      setApproval(doc, 'tasks', tasksHash(feature.tasks));
      saveDocument(join(root, feature.tasksPath), doc);
      const tests = stampTests(root, feature);
      return { ok: true, findings: warnings, exit: 0, text: `${feature.tasksPath} approved as read: ${feature.tasks.tasks.length} task(s), ${(feature.tasks.design?.decisions ?? []).length} design decision(s)${tests}\n${nextBlock()}`, data: { stage: 'tasks', approved: feature.tasks.tasks.length, tests: feature.tests?.tests.length ?? 0 } };
    }
  }
  if (feature.tests && (!stage || stage === 'tests') && config.approvals.includes('tests')) {
    const state = testsApproval(config, feature.tests, reviewFixIds(feature.tasks));
    if (!state.approved || stage === 'tests') {
      stampTests(root, feature);
      return { ok: true, findings: warnings, exit: 0, text: `${feature.testsPath} approved as read: ${feature.tests.tests.length} test(s)\n${nextBlock()}`, data: { stage: 'tests', approved: feature.tests.tests.length } };
    }
  }
  return { ok: true, findings: warnings, exit: 0, text: `nothing waits for a person in ${feature.dir}\n${nextBlock()}`, data: { stage: null, approved: 0 } };
}

/** The todo tasks whose dependencies are all done, in plan order. */
function allReady(tasks: Task[]): Task[] {
  const status = new Map(tasks.map((t) => [t.id, t.status]));
  return tasks.filter((t) => t.status === 'todo' && (t.depends_on ?? []).every((d) => status.get(d) === 'done'));
}

/** Ready tasks grouped into waves: one wave per parallel_group (TASK-PARALLEL proves they write different files), one per task without a group. */
function waves(ready: Task[]): string[][] {
  const out: string[][] = [];
  const byGroup = new Map<string, string[]>();
  for (const t of ready) {
    const g = t.parallel_group ? byGroup.get(t.parallel_group) : undefined;
    if (g) g.push(t.id);
    else {
      const w = [t.id];
      if (t.parallel_group) byGroup.set(t.parallel_group, w);
      out.push(w);
    }
  }
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

export interface NextStep {
  stage: string;
  /** What to run next: a `/spex:*` skill, a `spex` command, or '' when nothing is next. */
  command: string;
  /** True when the next step reads everything from files, so the chat can be cleared first. */
  fresh: boolean;
  why: string;
  task: { id: string; title: string; kind: string; requirements: string[]; parallel_group: string | null } | null;
  ready: string[];
  waves: string[][];
  counts: { todo: number; done: number; blocked: number } | null;
  /** Blocked tasks that wait for a person's yes (`spex block --ask`): the question, and the command that is the yes. */
  asks: { task: string; ask: string; yes: string }[];
  /** Auto mode, from the config: with it on, no skill asks a person anything; the gates are the only reads. */
  auto: boolean;
}

const step = (stage: string, command: string, fresh: boolean, why: string, extra: Partial<NextStep> = {}): NextStep => ({ stage, command, fresh, why, task: null, ready: [], waves: [], counts: null, asks: [], auto: false, ...extra });

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

const clip = (text: string, max = 160): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function reportStatus(root: string, featureId: string, stage: string): string | null {
  const report = join(root, '.spex', 'runs', featureId, `${stage}.json`);
  if (!fileExists(report)) return null;
  try {
    return (JSON.parse(readText(report)) as { status?: string }).status ?? null;
  } catch {
    return null;
  }
}

/** What now, from the files alone: the stage the feature is in and the one command that moves it. The skills print it last; Dex can read the JSON. */
export function whatNext(root: string, config: Config, feature: Feature): NextStep {
  let s = decide(root, config, feature);
  // Every gate refuses on a check error, so the NEXT block must not name a skill whose gate will refuse:
  // the same command again would only print the same refusal.
  if (s.stage !== 'invalid') {
    const errors = runCheck(root, [feature.dir]).findings.filter((f) => f.severity === 'error');
    if (errors.length) {
      const byCode = new Map<string, number>();
      for (const e of errors) byCode.set(e.code, (byCode.get(e.code) ?? 0) + 1);
      const codes = [...byCode].map(([c, n]) => (n > 1 ? `${c} ×${n}` : c)).join(', ');
      s = step('invalid', `spex check ${feature.dir}`, false, `${errors.length} error(s) (${codes}) and every gate refuses until each is fixed by its fix text; ${s.command || s.stage} comes after`);
    }
  }
  s.auto = config.auto;
  return s;
}

/** The skills that ask the person questions, and so the only ones auto mode changes. */
const ASKING = ['/spex:new', '/spex:clarify', '/spex:requirements', '/spex:review'];

function decide(root: string, config: Config, feature: Feature): NextStep {
  const dir = feature.dir;
  if (feature.errors.length) return step('invalid', `spex check ${dir}`, false, 'fix every error by its fix text');
  const reqs = feature.requirements;
  const doc = specDocPath(root, feature);
  const meta = doc && !doc.missing ? specMeta(readText(join(root, doc.path))) : null;
  if (!reqs) {
    if (!doc) return step('empty', '/spex:new', true, `${dir} has no spec.md: shape the idea with /spex:new`);
    if (meta?.status === 'shaping') {
      // Shaped with nothing open (auto mode ends here): a person reads it, then approve sets ready.
      const sections = sectionBodies(readText(join(root, doc.path)));
      const filled = REQUIRED_SECTIONS.every((s) => (sections.get(s.toLowerCase()) ?? '').length > 0);
      if (filled && openQuestions(sections).total === 0) return step('approve-spec', `/spex:approve ${dir}`, true, `${doc.path} is shaped and nothing is open: a person reads it, then approve sets status: ready`);
      return step('shaping', `/spex:new ${dir}`, false, 'ok takes every pick · answer by number · done approves the spec and ends shaping');
    }
    if (meta?.status === 'planned') {
      const waits = waitsFor(root, meta);
      const where = meta.roadmap ? `planned step ${meta.step ?? '?'} of ${meta.roadmap}` : 'a planned step';
      if (waits.length) return step('planned', '', false, `${where}; waits for ${waits.map((w) => `${w.dir.split('/').pop()} (${w.state})`).join(', ')}`);
      return step('planned', `/spex:new ${dir}`, true, `${where}: its dependencies are built; it reads the stub, spex show --inherited and the questions routed into it`);
    }
    if (meta && meta.status === null) return step('approve-spec', `/spex:approve ${dir}`, true, `${doc.path} has no status line: a person reads it, then approve sets status: ready`);
    return step('spec-ready', `/spex:requirements ${dir}`, true, `it reads only ${doc.path}`);
  }
  // Questions and unknowns come before gate 1, so the person reads the records, the answers and the research in one digest.
  // /spex:requirements runs both steps itself at its end; these two commands are the way back in when one opens later.
  const open = (reqs.questions ?? []).filter((q) => !q.answer).length;
  if (open) return step('clarify', `/spex:clarify ${dir}`, true, `${open} question(s) open; it reads only requirements.yaml`);
  const unknowns = (reqs.unknowns ?? []).filter((u) => !u.decision).length;
  if (unknowns) return step('research', `/spex:research ${dir}`, true, `${unknowns} unknown(s) without a decision; it reads only requirements.yaml`);
  const gaps = planGaps(feature);
  // The proof plan for the records comes before gate 1: the person reads the claim and its proof together.
  if (gaps.scenarios.length && !reqs.requirements.every((r) => r.status === 'built' || r.status === 'retired')) return step('plan-tests', `/spex:requirements ${dir}`, true, `${gaps.scenarios.length} scenario(s) have no test in tests.yaml; it starts the test analyst`);
  if (reqs.requirements.some((r) => r.status === 'draft')) return step('approve-requirements', `/spex:approve ${dir}`, true, `gate 1: read ${feature.requirementsPath} and ${feature.testsPath}, then approve`);
  if (reqs.requirements.every((r) => r.status === 'built' || r.status === 'retired')) {
    if (!meta?.roadmap) return step('built', '', true, 'the feature is shipped; nothing is next');
    // A roadmap step: the next planned step whose dependencies are built, if there is one.
    const steps = roadmapSteps(root, meta.roadmap);
    const planned = steps.filter((s) => s.meta.status === 'planned');
    const here = `step ${meta.step ?? '?'} of ${meta.roadmap} is built`;
    const ready = nextPlanned(steps);
    if (ready) return step('built', `/spex:new ${ready.dir}`, true, `${here}; ${ready.dir} is the next planned step and its dependencies are built`);
    if (planned.length) return step('built', '', true, `${here}; ${planned[0].dir} waits for ${planned[0].waits.map((w) => w.dir.split('/').pop()).join(', ')}`);
    return step('built', '', true, `${here}; every step of ${meta.roadmap} is shaped or built (spex roadmap ${meta.roadmap})`);
  }
  const tasks = feature.tasks;
  if (!tasks) return step('tasks', `/spex:tasks ${dir}`, true, 'it reads requirements.yaml, tests.yaml and the code the records name');
  // A review round waits for the person's answer: nothing moves until they take the picks or change them.
  const pending = pendingFindings(root, reqs.feature);
  if (pending) {
    const n = pending.file.findings.length;
    return step('review-accept', `/spex:review ${dir} ok`, false, `${n} finding(s) of review round ${pending.round} wait for your answer (${pending.path}): ok takes every pick; or change one by number, as in ${pending.file.findings.length > 1 ? '2=defer 3=fix' : '1=defer'}`);
  }
  // Accepted review fixes go through one command: their tests, their code, verify. Nobody approves them twice.
  const fixes = new Set(tasks.tasks.filter((t) => t.review).map((t) => t.id));
  const fixing = tasks.tasks.some((t) => t.review && t.status !== 'done') || (fixes.size > 0 && reportStatus(root, reqs.feature, 'review') === 'concerns' && !verifyIsCurrent(root, config, feature));
  const viaFix = (stage: string, why: string, extra: Partial<NextStep> = {}): NextStep => step(stage, `/spex:fix ${dir}`, true, `review fixes: ${why}; it plans their tests, writes them red, builds and verifies`, extra);
  if (gaps.tasks.length) {
    if (gaps.tasks.every((id) => fixes.has(id))) return viaFix('plan-tests', `${gaps.tasks.join(', ')} have no test yet`);
    return step('plan-tests', `/spex:tasks ${dir}`, true, `${gaps.tasks.join(', ')} have no test in tests.yaml; it starts the test analyst`);
  }
  const ta = tasksApproval(config, tasks);
  if (ta.required && !ta.approved) return step('approve-tasks', `/spex:approve ${dir}`, true, `read ${feature.tasksPath} (approach, design, tasks) and ${feature.testsPath}, then approve`);
  const te = testsApproval(config, feature.tests, reviewFixIds(tasks));
  if (te.required && !te.approved) return step('approve-tests', `/spex:approve ${dir} tests`, true, `read ${feature.testsPath}: it changed since a person approved it`);
  const batch = pickTestBatch(root, config, feature);
  if (batch.tests.length) {
    if (fixing) return viaFix('tests', `${batch.tests.map((t) => t.id).join(', ')} are not written yet`);
    return step('tests', `/spex:tests ${dir}`, true, `${batch.tests.map((t) => t.id).join(', ')} are not written yet; it starts the test developers`);
  }
  const counts = { todo: 0, done: 0, blocked: 0 };
  for (const t of tasks.tasks) counts[t.status]++;
  const ready = allReady(tasks.tasks);
  if (ready.length) {
    const t = ready[0];
    if (fixing && ready.every((x) => fixes.has(x.id))) return viaFix('develop', `${ready.map((x) => x.id).join(', ')} ready`, { task: { id: t.id, title: t.title, kind: t.kind, requirements: t.requirements, parallel_group: t.parallel_group ?? null }, ready: ready.map((x) => x.id), waves: waves(ready), counts });
    return step('develop', `/spex:develop ${dir} ${t.id}`, true, `${ready.length} task(s) ready; each run reads only spex show`, {
      task: { id: t.id, title: t.title, kind: t.kind, requirements: t.requirements, parallel_group: t.parallel_group ?? null },
      ready: ready.map((x) => x.id),
      waves: waves(ready),
      counts,
    });
  }
  if (counts.todo || counts.blocked) {
    const blocked = tasks.tasks.filter((t) => t.status === 'blocked').map((t) => ({ id: t.id, note: readBlock(root, reqs.feature, t.id) }));
    if (!blocked.length) return step('blocked', '', false, 'every todo task waits on a task that is not done', { counts });
    // A task that waits for a yes has no cause to fix: the person answers, and the command is the answer.
    const asks = blocked.filter((b) => b.note?.ask).map((b) => ({ task: b.id, ask: b.note!.ask!, yes: `/spex:develop ${dir} ${b.id}` }));
    const fixes = blocked.filter((b) => !b.note?.ask);
    const why = fixes.length
      ? `${fixes.map((b) => `${b.id} blocked${b.note?.reason ? ` (${clip(b.note.reason)})` : ''}`).join('; ')}: fix the cause (.spex/runs/${reqs.feature}/block-<task>.json), then /spex:develop ${dir} <task> (it unblocks first), or split it in tasks.yaml`
      : `${asks.map((a) => a.task).join(', ')} wait${asks.length === 1 ? 's' : ''} for your yes`;
    return step('blocked', '', false, why, { counts, asks });
  }
  if (!verifyIsCurrent(root, config, feature)) {
    if (fixing) return viaFix('verify', 'every fix is built, the feature is not verified at this tree', { counts });
    return step('verify', `/spex:verify ${dir}`, true, 'every task is done; it runs every script, performs every session, and judges each failure', { counts });
  }
  if (reportStatus(root, reqs.feature, 'review') !== 'done') {
    if (fixes.size && reportStatus(root, reqs.feature, 'review') === 'concerns') return step('review', `/spex:review ${dir}`, true, 'the fixes are verified; it checks each accepted finding at its task\'s paths, and only a P1 is new', { counts });
    return step('review', `/spex:review ${dir}`, true, 'every test is green at this tree; it reads only the diff and the evidence', { counts });
  }
  return step('ship', `/spex:ship ${dir}`, true, 'review is clean: it merges the branch and closes the feature', { counts });
}

const RULE = '─'.repeat(40);

/** The NEXT block every skill prints last, so the person sees the one command that moves the feature, and if the chat can go. */
export function renderNext(s: NextStep, all = false): string {
  // A skill that needs nothing from this chat is listed after /clear, so the commands are run top to bottom as printed.
  // No command: `(wait)` when another step must finish first, `(a person)` when only a person can move it.
  // Shaping waits for the person's answer in the chat that asked; its command only resumes it from another chat.
  const shaping = s.stage === 'shaping';
  const fresh = !!s.command && s.command.startsWith('/') && s.fresh;
  const lines = [RULE, `NEXT   ${shaping ? 'your answer, in the shaping chat' : fresh ? '/clear' : s.command || (s.stage === 'planned' || s.stage === 'built' ? '(wait)' : '(a person)')}`];
  if (shaping) lines.push(`       ${s.why}`, `       No shaping chat open? ${s.command} resumes it.`);
  else if (fresh) lines.push(`       ${s.command}`, `       ${s.why}, nothing from this chat.`);
  else if (!s.command) {
    if (!s.asks.length || s.asks.length < s.counts!.blocked) lines.push(`       ${s.why}`);
    for (const a of s.asks) lines.push(`       ${a.task} waits for your yes: ${a.ask}`, `         yes → ${a.yes}   (typing it is the yes; it unblocks and runs ${a.task})`, `         no  → leave ${a.task} blocked, or change it in tasks.yaml and /spex:approve`);
  } else if (!s.fresh) lines.push(`       Stay in this chat: ${s.why}.`);
  else lines.push(`       ${s.why}.`);
  if (all && s.waves.length) lines.push(`       ready: ${s.waves.map((w) => (w.length > 1 ? `${w.join(' + ')} (in parallel)` : w[0])).join(' · ')}`);
  if (s.counts) lines.push(`       tasks: ${s.counts.done} done, ${s.counts.todo} todo, ${s.counts.blocked} blocked`);
  // auto changes only who answers a skill's questions: the line shows where the next skill asks some.
  if (ASKING.some((c) => s.command === c || s.command.startsWith(`${c} `))) lines.push(`       auto: ${s.auto ? 'on (nobody is asked; you read at the gates)' : 'off (set auto: true in .spex/config.yaml, or say "auto", and nobody is asked)'}`);
  lines.push(RULE);
  return lines.join('\n');
}

/** `spex next <dir> [--all]`: what now. With --all, every ready task by wave, for an orchestrator. */
export function next(root: string, dir: string, opts: { all?: boolean } = {}): CmdResult {
  const { config } = loadConfig(root);
  const feature = loadFeature(root, resolveFeatureDir(root, dir));
  const s = whatNext(root, config, feature);
  return { ok: s.stage !== 'invalid', findings: feature.errors, exit: s.stage === 'invalid' ? 4 : 0, text: renderNext(s, opts.all), data: { ...s } };
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
  const needFiles = (what: string): CmdResult | null => (!reqs || !tasks || !tests ? refuse([{ severity: 'error', code: 'SPEC-MISSING', message: `${what} gate needs requirements.yaml, tasks.yaml and tests.yaml`, fix: !reqs ? 'Run /spex:requirements first.' : !tasks ? 'Run /spex:tasks first.' : 'The test analyst writes tests.yaml: /spex:requirements and /spex:tasks start it.' }]) : null);
  switch (stage) {
    case 'new': {
      // Resume a shaping spec, or open a planned step: every folder it depends on must be built.
      const doc = specDocPath(root, feature);
      if (!doc || doc.missing) return refuse([...errors, { severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no spec.md`, fix: 'Run `spex new <slug> --shaping` first; /spex:new does.' }]);
      const text = readText(join(root, doc.path));
      const meta = specMeta(text);
      if (reqs) return refuse([{ severity: 'error', code: 'GATE-DONE', message: `${feature.dir} has its records already`, fix: 'A change to a spec with records goes through /spex:clarify.' }]);
      if (meta.status === 'ready') return refuse([{ severity: 'error', code: 'GATE-DONE', message: `${doc.path} is ready already`, fix: `Next: /spex:requirements ${feature.dir}. To shape it again, set status: shaping in its front matter by hand.` }]);
      if (meta.status === null) return refuse([{ severity: 'error', code: 'GATE-SPEC', message: `${doc.path} has no status line`, fix: `A person reads it, then runs \`/spex:approve ${feature.dir}\`, which sets status: ready.` }]);
      if (errors.length) return refuse(errors);
      for (const w of waitsFor(root, meta)) findings.push({ severity: 'error', code: 'GATE-BUILT', message: `${feature.dir} depends on ${w.dir}, which is ${w.state === 'missing' ? 'no folder under specs/' : `not built (${w.state})`}`, fix: w.state === 'missing' ? 'Fix depends_on in the front matter.' : `Finish ${w.dir} first: develop, verify, review, ship.` });
      if (findings.length) return { ...refuse(findings), data };
      // Opening a stub: the status flips, the planned note goes, and the sections a stub leaves out are added with their hints.
      const flipped = meta.status === 'planned';
      if (flipped) writeText(join(root, doc.path), openedStub(withSpecStatus(text, 'shaping')));
      const open = openQuestions(sectionBodies(text));
      const lines = [`gate new open for ${feature.dir}: ${doc.path} ${flipped ? 'planned → shaping; the missing sections are added, empty' : 'is shaping; resume'}`];
      // "step 2 of 29": the total is the count of folders that name the roadmap, so the banner never reads as 29 questions.
      const total = meta.roadmap ? roadmapSteps(root, meta.roadmap).length : 0;
      if (meta.roadmap) lines.push(`roadmap ${meta.roadmap}, step ${meta.step ?? '?'} of ${total}${meta.depends_on.length ? ` · after ${meta.depends_on.join(', ')} (built)` : ''}`);
      if (meta.source.length) lines.push(`source: ${meta.source.join(', ')}`);
      lines.push(`open questions: ${open.total ? openSummary(open) : 'none'}`);
      if (meta.depends_on.length) lines.push(`read next: spex show ${feature.dir} --inherited`);
      return { ok: true, findings: check.findings.filter((f) => f.severity === 'warning'), exit: 0, text: lines.join('\n'), data: { flipped, status: 'shaping', roadmap: meta.roadmap, step: meta.step, steps: meta.roadmap ? total : null, depends_on: meta.depends_on, source: meta.source, open } };
    }
    case 'requirements': {
      // The only way in: a folder under specs/ whose spec document a person approved (status: ready).
      if (!rel.startsWith(`${SPECS_DIR}/`)) return refuse([{ severity: 'error', code: 'GATE-SPEC', message: `${rel} is not a folder under ${SPECS_DIR}/`, fix: 'Run /spex:new: it shapes the idea into specs/NNN-slug/spec.md and approves it. /spex:requirements takes nothing else.' }]);
      const doc = specDocPath(root, feature);
      if (!doc) return refuse([...errors, { severity: 'error', code: 'GATE-SPEC', message: `${feature.dir} has no spec.md`, fix: `Run /spex:new: it shapes the idea into ${feature.dir}/spec.md and approves it.` }]);
      if (errors.length) return refuse(errors);
      const status = specStatus(readText(join(root, doc.path)));
      // Records that exist already were written from a spec a person accepted once; a document without a line stays valid for them.
      if (status !== 'ready' && !(status === null && reqs)) {
        const fix = status === 'planned' ? `Run /spex:new ${feature.dir} when its dependencies are built; it shapes the stub and approves it.` : status === 'shaping' ? `Finish /spex:new ${feature.dir}: say done, and it runs spex approve.` : `A person reads it, then runs \`/spex:approve ${feature.dir}\`: it checks Why, What, Not this and Success and sets status: ready.`;
        return refuse([{ severity: 'error', code: 'GATE-SPEC', message: `${doc.path} is ${status ?? 'without a status line'}, not ready`, fix }]);
      }
      const open = openQuestions(sectionBodies(readText(join(root, doc.path))));
      const gaps = planGaps(feature);
      data.incremental = !!reqs;
      data.untested = gaps.scenarios;
      return { ok: true, findings: check.findings.filter((f) => f.severity === 'warning'), exit: 0, text: `gate requirements open for ${feature.dir}: ${doc.path} is ready${open.total ? ` (${openSummary(open)} open: they become questions and unknowns)` : ''}${reqs ? `; records exist, so add to them${gaps.scenarios.length ? `; ${gaps.scenarios.length} scenario(s) have no test: the test analyst covers them` : ''}` : ''}`, data: { spec: doc.path, open, ...data } };
    }
    case 'tasks': {
      if (errors.length) return refuse(errors);
      if (!reqs) return refuse(need(feature));
      for (const q of reqs.questions ?? []) if (!q.answer) findings.push({ severity: 'error', code: 'GATE-QUESTION', message: `${q.id} is open: ${q.ask}`, fix: 'Run /spex:clarify.' });
      for (const u of reqs.unknowns ?? []) if (!u.decision) findings.push({ severity: 'error', code: 'GATE-UNKNOWN', message: `${u.id} has no decision: ${u.ask}`, fix: 'Run /spex:research.' });
      for (const r of reqs.requirements) if (r.status === 'draft') findings.push({ severity: 'error', code: 'GATE-APPROVED', message: `${r.id} is draft`, fix: 'A person runs `/spex:approve`.' });
      // A second run is incremental: the records no task covers are the whole job, and none means nothing to add.
      data.incremental = !!tasks;
      data.uncovered = tasks ? check.findings.filter((f) => f.code === 'TASK-COVERAGE').map((f) => f.id) : reqs.requirements.map((r) => r.id);
      data.untested = planGaps(feature).tasks;
      break;
    }
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
      for (const r of reqs!.requirements) if (r.status === 'draft' && batch.some((t) => t.covers.some((c) => c.startsWith(r.id)))) findings.push({ severity: 'error', code: 'GATE-APPROVED', message: `${r.id} is draft`, fix: 'A person runs `/spex:approve`.' });
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
      if (!t) return refuse([{ severity: 'error', code: 'TASK-UNKNOWN', message: `${taskId} is not in ${feature.tasksPath}`, fix: 'Run `spex next`.' }], 2);
      if (t.status === 'done') findings.push({ severity: 'error', code: 'GATE-DONE', message: `${t.id} is already done`, fix: 'Run `spex next` for the next task.' });
      const status = new Map(tasks!.tasks.map((x) => [x.id, x.status]));
      for (const d of t.depends_on ?? []) if (status.get(d) !== 'done') findings.push({ severity: 'error', code: 'GATE-DEPENDS', message: `${t.id} depends on ${d}, which is ${status.get(d) ?? 'missing'}`, fix: `Finish ${d} first.` });
      const own = testsOf(feature, t);
      if (!own.length) findings.push({ severity: 'error', code: 'GATE-COVERAGE', message: `${t.id} has no test in tests.yaml`, fix: `The test analyst adds one: /spex:tasks ${feature.dir}.` });
      const cov = coverageFor(root, check.config, feature, own);
      for (const m of cov.missing) findings.push({ severity: 'error', code: 'GATE-COVERAGE', message: `${m.id}: no test named ${m.name} in its file`, fix: `Run /spex:tests ${feature.dir} ${m.id} first.` });
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
            findings.push({ severity: 'error', code: 'GATE-RED', message: why ? why.message : `the tests of ${t.id} did not fail as expected`, fix: why?.fix ?? `Run /spex:tests ${feature.dir}.` });
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
    case 'review': {
      if (errors.length) return refuse(errors);
      if (!tasks) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: 'review gate needs tasks.yaml', fix: 'Run /spex:tasks first.' }]);
      tasksDone(root, feature, findings);
      findings.push(...repoFindings(root, check.config, featureRepos(check.config, feature)));
      if (!findings.length && !verifyIsCurrent(root, check.config, feature)) findings.push({ severity: 'error', code: 'GATE-VERIFY', message: 'the whole-feature run is missing, red, or from another tree', fix: `Run /spex:verify ${feature.dir}: every script green and every session passed at this tree, then review.` });
      break;
    }
    case 'ship': {
      if (errors.length) return refuse(errors);
      if (!reqs) return refuse(need(feature));
      tasksDone(root, feature, findings);
      for (const q of reqs.questions ?? []) if (!q.answer) findings.push({ severity: 'error', code: 'GATE-QUESTION', message: `${q.id} is open`, fix: 'Run /spex:clarify.' });
      if (!findings.length && !verifyIsCurrent(root, check.config, feature)) findings.push({ severity: 'error', code: 'GATE-VERIFY', message: 'the whole-feature run is missing, red, or from another tree', fix: `Run /spex:verify ${feature.dir} first.` });
      if (!findings.length && reportStatus(root, reqs.feature, 'review') !== 'done') findings.push({ severity: 'error', code: 'GATE-REVIEW', message: 'no clean review report for this feature', fix: `Run /spex:review ${feature.dir}; ship needs its report at status done.` });
      break;
    }
    default:
      return refuse([{ severity: 'error', code: 'USAGE', message: `unknown stage ${stage}`, fix: 'Stages: new, requirements, tasks, tests, develop, verify, review, ship.' }], 2);
  }
  if (findings.length) return { ...refuse(findings), data };
  let what = ids[0] ? ` ${ids[0]}` : '';
  if (stage === 'tests') what = (data.tests as string[]).length ? ` ${(data.tests as string[]).join(', ')}` : ' (nothing to write: every script test has its file)';
  if (stage === 'tasks' && data.incremental) {
    const uncovered = data.uncovered as string[];
    const untested = data.untested as string[];
    what = uncovered.length ? ` (tasks.yaml exists: add tasks for ${uncovered.join(', ')}, and leave every done task as it is)` : untested.length ? ` (tasks.yaml exists and every record has a task; ${untested.join(', ')} have no test: the test analyst covers them)` : ' (tasks.yaml exists and every record has a task: nothing to add)';
  }
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
  if (!feature.tasks || !feature.requirements) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no tasks.yaml`, fix: 'Run /spex:tasks.' }], 4);
  if (!feature.tests) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no tests.yaml: nothing proves the task`, fix: 'The test analyst writes it: /spex:tasks starts it.' }], 4);
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
  if (note?.ask) return `It waits for a person's yes: ${note.ask} Yes: /spex:develop ${dir} ${taskId} (it unblocks first). No: change it in tasks.yaml.`;
  return `Read .spex/runs/${featureId}/block-${taskId}.json, fix the cause, then /spex:develop ${dir} ${taskId} (it unblocks first); or split it.`;
}

export function block(root: string, dir: string, taskId: string, reason: string, ask?: string): CmdResult {
  const feature = loadFeature(root, resolveFeatureDir(root, dir));
  const errs = need(feature);
  if (errs.length) return refuse(errs, 4);
  if (!feature.tasks || !feature.requirements) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no tasks.yaml`, fix: 'Run /spex:tasks.' }], 4);
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
  if (!feature.tasks || !feature.requirements) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no tasks.yaml`, fix: 'Run /spex:tasks.' }], 4);
  const i = feature.tasks.tasks.findIndex((t) => t.id === taskId);
  if (i < 0) return refuse([{ severity: 'error', code: 'TASK-UNKNOWN', message: `${taskId} is not in ${feature.tasksPath}`, fix: 'Check the id.' }], 2);
  const task = feature.tasks.tasks[i];
  if (task.status !== 'blocked') return refuse([{ severity: 'error', code: 'UNBLOCK-STATUS', message: `${taskId} is ${task.status}, not blocked`, fix: task.status === 'done' ? 'A done task stays done.' : 'Nothing to undo: run `spex next`.' }]);
  const doc = openDocument(join(root, feature.tasksPath));
  doc.setIn(['tasks', i, 'status'], 'todo');
  saveDocument(join(root, feature.tasksPath), doc);
  const reason = `.spex/runs/${feature.requirements.feature}/block-${taskId}.json`;
  return { ok: true, findings: [], exit: 0, text: `${taskId} todo again; the reason stays in ${reason} for the lessons`, data: { task: taskId, reason } };
}

/** approved → built, and the records this feature supersedes → retired, in their own files. The answers no person gave are listed. */
function closeFeature(root: string, feature: Feature): { built: number; retired: string[]; defaults: string[] } {
  const reqs = feature.requirements!;
  const defaults = (reqs.questions ?? []).filter((q) => q.by === 'default' || q.by === 'agent').map((q) => `${q.id} ${q.ask} → ${q.answer} ${q.by === 'agent' ? `(decider agent, ${q.confidence ?? 'confidence not given'}: ${q.evidence ?? 'no evidence'})` : '(nobody was asked)'}`);
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
  return { built, retired, defaults };
}

function gitCommit(root: string, message: string, home = true): { ok: boolean; committed: boolean; tail: string } {
  const add = spawnSync('git', ['add', '-A', '--', '.'], { cwd: root, encoding: 'utf8' });
  if (add.status !== 0) return { ok: false, committed: false, tail: `${add.stdout}${add.stderr}`.slice(-1000) };
  // The work dirs never ship, whatever .spex/.gitignore says: take them back out of the index.
  if (home) spawnSync('git', ['reset', '-q', '--', '.spex/evidence', '.spex/runs', '.spex/review'], { cwd: root, encoding: 'utf8' });
  const dirty = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).stdout.trim();
  if (!dirty) return { ok: true, committed: false, tail: '' };
  const commit = spawnSync('git', ['commit', '-q', '-m', message], { cwd: root, encoding: 'utf8' });
  return { ok: commit.status === 0, committed: commit.status === 0, tail: `${commit.stdout}${commit.stderr}`.slice(-1000) };
}

/**
 * `spex ship <dir> [--merged]`: the end of the feature, with no click. It closes the records (approved → built,
 * superseded → retired), commits when `ship.commit` says so, and runs `ship.cmd` (push, open the request, merge it).
 * With `--merged` a person merged already: only the close and the commit. A rerun after a failed merge skips the
 * close, so the command is safe to repeat.
 */
export function ship(root: string, dir: string, opts: { merged?: boolean } = {}): CmdResult {
  const rel = resolveFeatureDir(root, dir);
  const check = runCheck(root, [rel]);
  if (hasErrors(check.findings)) return refuse(check.findings, 4);
  const feature = check.features[0];
  const config = check.config;
  const reqs = feature.requirements;
  if (!reqs) return refuse(need(feature), 4);
  const findings: Finding[] = [];
  const closed = reqs.requirements.length > 0 && reqs.requirements.every((r) => r.status === 'built' || r.status === 'retired');
  for (const q of reqs.questions ?? []) if (!q.answer) findings.push({ severity: 'error', code: 'SHIP-QUESTION', message: `${q.id} is open`, fix: 'Run /spex:clarify.' });
  for (const t of feature.tasks?.tasks ?? []) if (t.status !== 'done') findings.push({ severity: 'error', code: 'SHIP-TASKS', message: `${t.id} is ${t.status}`, fix: 'Every task must be done before ship.' });
  if (!feature.tasks && !reqs.requirements.every((r) => r.status === 'retired')) findings.push({ severity: 'error', code: 'SHIP-TASKS', message: 'no tasks.yaml: nothing was built', fix: 'Run /spex:tasks and build, or retire the records.' });
  const repos = featureRepos(config, feature);
  findings.push(...repoFindings(root, config, repos));
  if (!closed && !findings.length) {
    if (!isGitRepo(root)) findings.push({ severity: 'error', code: 'GIT-REQUIRED', message: 'ship needs a git repository', fix: 'Run inside the repository.' });
    else if (!verifyIsCurrent(root, config, feature)) findings.push({ severity: 'error', code: 'SHIP-VERIFY', message: 'the whole-feature run is missing, red, or from another tree', fix: `Run /spex:verify ${feature.dir} first.` });
    else if (reportStatus(root, reqs.feature, 'review') !== 'done') findings.push({ severity: 'error', code: 'SHIP-REVIEW', message: 'no clean review report for this feature', fix: `Run /spex:review ${feature.dir} first.` });
  }
  if (findings.length) return refuse(findings);
  const lines: string[] = [];
  const data: Record<string, unknown> = { closed_before: closed, merged_by: opts.merged ? 'a person' : null };
  if (closed) lines.push(`${feature.dir} is closed already (every record built or retired)`);
  else {
    const c = closeFeature(root, feature);
    Object.assign(data, c);
    lines.push(`${c.built} record(s) built in ${feature.requirementsPath}`);
    if (c.retired.length) lines.push(`retired: ${c.retired.join(', ')}`);
    if (c.defaults.length) lines.push('answered by default, for a person to read:', ...c.defaults.map((d) => `- ${d}`));
    const later = feature.tasks?.deferred ?? [];
    if (later.length) lines.push('deferred, for a later step:', ...later.map((d) => `- ${d.severity ? `${d.severity} ` : ''}${d.finding} (${d.by})`));
  }
  const shipped = readShipped(root, reqs.feature);
  if (!opts.merged) {
    const branch = isGitRepo(root) ? currentBranch(root) : '';
    if (branch === 'main' || branch === 'master') return { ok: false, findings: [{ severity: 'error', code: 'SHIP-BRANCH', message: `on ${branch}: ship merges a feature branch, and this is the target`, fix: 'Work on a branch and run ship there. If the feature is on main already, run `spex ship <dir> --merged`.' }], exit: 6, text: lines.join('\n'), data };
    for (const name of repos.filter((r) => !shipped[r])) {
      const b = currentBranch(repoRoot(root, config, name));
      const base = config.repos[name].base;
      if (b === base || (!base && (b === 'main' || b === 'master'))) return { ok: false, findings: [{ severity: 'error', code: 'SHIP-BRANCH', message: `repo ${name} (${repoPath(config, name)}) is on ${b}: ship merges a feature branch, and this is the target`, fix: 'Move its work to a branch and run ship again. If it is merged already, run `spex ship <dir> --merged`.' }], exit: 6, text: lines.join('\n'), data };
    }
  }
  // The other repos first, so a failed merge there stops before this repo merges. A rerun skips the merged ones.
  const message = `${reqs.feature}: ${reqs.title}`;
  const waiting: string[] = [];
  for (const name of repos) {
    const where = `${name} (${repoPath(config, name)})`;
    if (shipped[name]) {
      lines.push(`${where}: merged already, by ${shipped[name]}`);
      continue;
    }
    const rc = config.repos[name];
    const abs = repoRoot(root, config, name);
    if (rc.ship?.commit ?? config.ship.commit) {
      const c = gitCommit(abs, message, false);
      if (!c.ok) return { ok: false, findings: [{ severity: 'error', code: 'SHIP-COMMIT', message: `git commit failed in repo ${where}`, fix: `Fix git there (an identity, a hook), then run ship again. Tail: ${c.tail.trim().slice(-200)}` }], exit: 7, text: lines.join('\n'), data };
      lines.push(`${where}: ${c.committed ? `committed: ${message}` : 'nothing to commit'}`);
    } else lines.push(`${where}: not committed (ship.commit is false)`);
    if (opts.merged) {
      shipped[name] = 'a person';
      continue;
    }
    const cmd = rc.ship?.cmd?.trim() ?? '';
    if (!cmd) {
      waiting.push(where);
      continue;
    }
    const out = runCommands(abs, [cmd], config.limits.verify_minutes);
    if (!out.ok) {
      writeShipped(root, reqs.feature, shipped);
      return { ok: false, findings: [{ severity: 'error', code: 'SHIP-FAILED', message: `ship.cmd of repo ${where} exited ${out.results[0].exit}`, fix: 'Read the tail, fix the cause (a failing check on the request, a conflict), and run ship again: the repos merged so far are skipped.' }], exit: 7, text: [...lines, '', out.results[0].tail.slice(-2500)].join('\n'), data };
    }
    shipped[name] = 'ship.cmd';
    lines.push(`${where}: merged: ${cmd}`);
  }
  if (repos.length) {
    writeShipped(root, reqs.feature, shipped);
    data.repos = Object.fromEntries(repos.map((n) => [n, shipped[n] ?? 'waiting for a person']));
  }
  if (config.ship.commit) {
    const c = gitCommit(root, `${reqs.feature}: ${reqs.title}`);
    if (!c.ok) return { ok: false, findings: [{ severity: 'error', code: 'SHIP-COMMIT', message: 'git commit failed', fix: `Fix git (an identity, a hook), then run ship again. Tail: ${c.tail.trim().slice(-200)}` }], exit: 7, text: lines.join('\n'), data };
    lines.push(c.committed ? `committed: ${reqs.feature}: ${reqs.title}` : 'nothing to commit');
    data.committed = c.committed;
  } else lines.push(`not committed (ship.commit is false): the changed files wait for a commit`);
  if (!opts.merged) {
    const others = waiting.length ? `; no ship.cmd merges ${waiting.join(', ')} either` : '';
    if (shipped['.']) lines.push(`merged already, by ${shipped['.']}`);
    else if (!config.ship.cmd.trim()) return { ok: false, findings: [{ severity: 'error', code: 'SHIP-CMD', message: `ship.cmd is empty: nothing merges the branch${others}`, fix: 'Set ship.cmd in .spex/config.yaml (`gh pr create --fill && gh pr merge --squash --delete-branch`, or the GitLab form), and repos.<name>.ship.cmd for another repo, or merge by hand and run `spex ship <dir> --merged`.' }], exit: 6, text: lines.join('\n'), data };
    else {
      const out = runCommands(root, [config.ship.cmd], config.limits.verify_minutes);
      if (!out.ok) return { ok: false, findings: [{ severity: 'error', code: 'SHIP-FAILED', message: `ship.cmd exited ${out.results[0].exit}`, fix: 'Read the tail, fix the cause (a failing check on the request, a conflict), and run ship again: the close is done, the commit is kept.' }], exit: 7, text: [...lines, '', out.results[0].tail.slice(-2500)].join('\n'), data };
      lines.push(`merged: ${config.ship.cmd}`);
      if (repos.length) writeShipped(root, reqs.feature, { ...shipped, '.': 'ship.cmd' });
    }
    data.merged_by = 'ship.cmd';
    if (waiting.length) return { ok: false, findings: [{ severity: 'error', code: 'SHIP-CMD', message: `this repo is merged; no ship.cmd merges ${waiting.join(', ')}`, fix: 'A person merges each of them, then runs `spex ship <dir> --merged`. Or set repos.<name>.ship.cmd and run ship again.' }], exit: 6, text: lines.join('\n'), data };
  }
  return { ok: true, findings: check.findings.filter((f) => f.severity === 'warning'), exit: 0, text: lines.join('\n'), data };
}
