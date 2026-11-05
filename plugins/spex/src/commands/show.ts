// `spex show`: the compiled input of one run. Text for the agent, JSON for Dex.

import { join } from 'node:path';
import { loadConfig } from '../config.js';
import { testId } from '../ears.js';
import { currentBranch, diffAgainst, isGitRepo, mergeBase, refExists } from '../git.js';
import { bytes, fileExists, readText, writeText } from '../io.js';
import { acceptanceFiles, parseContextEntry, resolveSpecPath } from '../rules/tasks.js';
import { loadFeature, resolveFeatureDir } from '../specs.js';
import type { Config, Feature, Finding, Requirement, Task, TasksFile } from '../types.js';
import { composeVerify } from '../verify.js';
import { pickTestBatch } from './coverage.js';

export interface ShowResult {
  ok: boolean;
  text: string;
  findings: Finding[];
  data?: Record<string, unknown>;
  exit: number;
}

function load(root: string, dir: string): { feature: Feature; config: Config; findings: Finding[] } {
  const { config, findings } = loadConfig(root);
  const feature = loadFeature(root, resolveFeatureDir(root, dir));
  findings.push(...feature.errors);
  return { feature, config, findings };
}

function fail(findings: Finding[], exit = 4): ShowResult {
  return { ok: false, text: '', findings, exit };
}

export function renderRecord(r: Requirement, opts: { scenarios?: boolean } = { scenarios: true }): string {
  const lines = [`${r.id}  ${r.type} · ${r.priority} · ${r.status} · scope ${r.scope} · applies_to ${r.applies_to.join(', ')} · verify ${r.verification.mode}/${r.verification.method}`, `  ${r.text}`];
  if (opts.scenarios) {
    for (const a of r.acceptance) {
      lines.push(`  ${a.id}  given: ${a.given}`, `        when: ${a.when}`, `        then: ${a.then}`);
      if (a.measure) lines.push(`        measure: ${a.measure.metric} ${a.measure.operator} ${a.measure.value} ${a.measure.unit}${a.measure.percentile ? ` p${a.measure.percentile}` : ''}`);
    }
  }
  if (r.rationale) lines.push(`  rationale: ${r.rationale}`);
  if (r.verification.rationale) lines.push(`  verification rationale: ${r.verification.rationale}`);
  for (const rel of r.relationships ?? []) lines.push(`  ${rel.type} ${rel.target}`);
  return lines.join('\n');
}

function findTask(tasks: TasksFile, id: string): Task | undefined {
  return tasks.tasks.find((t) => t.id === id);
}

function designSlice(tasks: TasksFile, task: Task): string[] {
  const out: string[] = [];
  const d = tasks.design;
  if (!d) return out;
  const wanted = new Set(task.design ?? []);
  const files = [...task.paths, ...(task.context ?? []).map((c) => parseContextEntry(c).path)];
  for (const m of d.modules ?? []) if (wanted.has(m.id) || files.includes(m.path)) out.push(`${m.id}  ${m.path} — ${m.role}`);
  for (const e of d.entities ?? []) if (wanted.has(e.id)) out.push(`${e.id}  ${e.name}${e.fields ? `: ${e.fields.join(', ')}` : ''}${e.schema ? ` (schema ${e.schema})` : ''}`);
  return out;
}

function decisionLines(feature: Feature): string[] {
  const out: string[] = [];
  for (const u of feature.requirements?.unknowns ?? []) if (u.decision) out.push(`${u.id}  ${u.ask} → ${u.decision}${u.ref ? ` (${u.ref})` : ''}`);
  for (const d of feature.tasks?.design?.decisions ?? []) out.push(`${d.id}  ${d.text}${d.why ? ` — because ${d.why}` : ''}`);
  return out;
}

export function showTask(root: string, dir: string, taskId: string): ShowResult {
  const { feature, config, findings } = load(root, dir);
  if (findings.some((f) => f.severity === 'error')) return fail(findings);
  if (!feature.tasks || !feature.requirements) return fail([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} needs requirements.yaml and tasks.yaml`, fix: 'Run /spex:plan first.' }]);
  const task = findTask(feature.tasks, taskId);
  if (!task) return fail([{ severity: 'error', code: 'TASK-UNKNOWN', message: `${taskId} is not in ${feature.tasksPath}`, fix: 'Run `spex next` to see the next task.' }], 2);
  const reqs = feature.requirements.requirements.filter((r) => task.requirements.includes(r.id));
  const verify = composeVerify(config, task);
  const lines: string[] = [];
  lines.push(`# ${task.id} — ${task.title}`, `feature ${feature.requirements.feature} (${feature.requirements.title}) · kind ${task.kind} · status ${task.status}`);
  if (task.depends_on?.length) lines.push(`depends_on: ${task.depends_on.join(', ')}`);
  if (task.parallel_group) lines.push(`parallel_group: ${task.parallel_group}`);
  lines.push('', '## paths (write allowlist — nothing outside these)', ...task.paths.map((p) => `- ${p}`));
  lines.push('', '## context (read these first)');
  for (const c of task.context ?? []) {
    const { path, from, to } = parseContextEntry(c);
    const abs = resolveSpecPath(root, feature.dir, path);
    let size = '';
    if (abs) {
      const text = readText(abs);
      const part = from !== undefined && to !== undefined ? text.split('\n').slice(from - 1, to).join('\n') : text;
      size = ` (${Math.max(1, Math.round(bytes(part) / 1024))} KB)`;
    }
    lines.push(`- ${abs && abs !== join(root, path) ? `${feature.dir}/${c}` : c}${abs ? size : ' (written by an earlier task)'}`);
  }
  if (!task.context?.length) lines.push('- (none)');
  if (task.interfaces?.consumes?.length) lines.push('', '## consumes (exact signatures from earlier tasks)', ...task.interfaces.consumes.map((s) => `- ${s}`));
  if (task.interfaces?.produces?.length) lines.push('', '## produces (later tasks rely on exactly these)', ...task.interfaces.produces.map((s) => `- ${s}`));
  lines.push('', '## instructions', task.instructions.trim(), '', `## done_when`, task.done_when);
  lines.push('', '## verify (spex run composes and runs these)', ...(verify.length ? verify.map((v) => `- ${v}`) : ['- (acceptance_cmd is not set in specs/spex.yaml)']));
  lines.push('', '## requirements', ...reqs.map((r) => renderRecord(r)));
  const b = feature.tasks.boundaries;
  if (b?.always?.length || b?.never?.length) {
    lines.push('', '## boundaries');
    for (const a of b.always ?? []) lines.push(`- always: ${a}`);
    for (const n of b.never ?? []) lines.push(`- never: ${n}`);
  }
  lines.push('', '## approach', feature.tasks.approach.trim());
  const decisions = decisionLines(feature);
  if (decisions.length) lines.push('', '## decisions', ...decisions);
  const design = designSlice(feature.tasks, task);
  if (design.length) lines.push('', '## design (the slice this task touches)', ...design);
  lines.push('', `More by id: spex show ${feature.dir} REQ-… | --design | --decisions. List every pull in your report.`);
  return { ok: true, text: lines.join('\n'), findings, exit: 0, data: { task, requirements: reqs, verify, boundaries: b ?? {}, decisions, design } };
}

/** The input of one tests run: the named tasks, or the batch the picker chooses (tasks without tests, up to limits.tests_scenarios). */
export function showTests(root: string, dir: string, taskIds: string[]): ShowResult {
  const { feature, config, findings } = load(root, dir);
  if (findings.some((f) => f.severity === 'error')) return fail(findings);
  if (!feature.tasks || !feature.requirements) return fail([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} needs requirements.yaml and tasks.yaml`, fix: 'Run /spex:plan first.' }]);
  let tasks: Task[];
  let batchNote = '';
  if (taskIds.length) {
    tasks = [];
    for (const id of taskIds) {
      const t = findTask(feature.tasks, id);
      if (!t) return fail([{ severity: 'error', code: 'TASK-UNKNOWN', message: `${id} is not in ${feature.tasksPath}`, fix: 'Run `spex show <dir> --tests` with no task to see the batch.' }], 2);
      tasks.push(t);
    }
  } else {
    const b = pickTestBatch(root, config, feature);
    tasks = b.tasks;
    if (!tasks.length) return { ok: true, text: 'every task has its tests: nothing to write', findings, exit: 0, data: { tasks: [], expected: [], retire: [] } };
    batchNote = ` (batch of ${tasks.length}, ${b.scenarios} scenarios, cap ${config.limits.tests_scenarios})`;
  }
  const reqIds = [...new Set(tasks.flatMap((t) => t.requirements))];
  const reqs = feature.requirements.requirements.filter((r) => reqIds.includes(r.id));
  const files = acceptanceFiles(root, config);
  const expected = reqs.flatMap((r) => r.acceptance.map((a) => ({ req: r.id, ac: a.id, name: testId(r.id, a.id), file: files.find((p) => readText(join(root, p)).includes(testId(r.id, a.id))) ?? null })));
  const supersedes = reqs.flatMap((r) => (r.relationships ?? []).filter((x) => x.type === 'supersedes').map((x) => x.target));
  const retire = supersedes.flatMap((old) => files.filter((p) => readText(join(root, p)).includes(testId(old))).map((p) => `${old} in ${p}`));
  const lines: string[] = [];
  lines.push(`# tests for ${tasks.map((t) => t.id).join(', ')}${batchNote}`, `goal: ${feature.requirements.goal}`, '', `acceptance_dir: ${config.acceptance_dir}`, `acceptance_cmd: ${config.acceptance_cmd || '(not set in specs/spex.yaml)'}`);
  lines.push('', '## test names (one test per scenario, the id in the name)', ...expected.map((e) => `- ${e.name}${e.file ? `  (exists: ${e.file})` : ''}`));
  lines.push('', '## requirements and scenarios', ...reqs.map((r) => renderRecord(r)));
  for (const t of tasks) lines.push('', `## names and values from the plan — ${t.id} ${t.title} [${t.requirements.join(', ')}]`, t.instructions.trim());
  const contracts = (feature.requirements.interfaces ?? []).filter((i) => i.contract && reqs.some((r) => r.applies_to.includes(i.id)));
  if (contracts.length) lines.push('', '## contracts', ...contracts.map((c) => `- ${c.id} (${c.kind}): ${c.contract}`));
  if (feature.requirements.glossary && Object.keys(feature.requirements.glossary).length) lines.push('', '## glossary', ...Object.entries(feature.requirements.glossary).map(([k, v]) => `- ${k}: ${v}`));
  const existing = files.slice(0, 20);
  lines.push('', '## existing acceptance tests (read one or two for the conventions)', ...(existing.length ? existing.map((p) => `- ${p}`) : ['- (none yet; create the folder and the first file)']));
  if (retire.length) lines.push('', '## tests to retire (this feature supersedes their record)', ...retire.map((r) => `- ${r}`));
  lines.push('', `Never read ${config.source_dirs.join(', ')}. End with one red run per task:`, ...tasks.map((t) => `- spex run ${feature.dir} ${t.id} --expect fail`));
  return { ok: true, text: lines.join('\n'), findings, exit: 0, data: { tasks: tasks.map((t) => t.id), requirements: reqs, expected, retire, contracts, acceptance_dir: config.acceptance_dir, acceptance_cmd: config.acceptance_cmd } };
}

export function showReview(root: string, dir: string, opts: { task?: string; base?: string }): ShowResult {
  const { feature, config, findings } = load(root, dir);
  if (findings.some((f) => f.severity === 'error')) return fail(findings);
  if (!feature.tasks || !feature.requirements) return fail([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} needs requirements.yaml and tasks.yaml`, fix: 'Run /spex:plan first.' }]);
  if (!isGitRepo(root)) return fail([{ severity: 'error', code: 'GIT-REQUIRED', message: 'review needs a git repository for the diff', fix: 'Run inside the repository.' }], 2);
  const task = opts.task ? findTask(feature.tasks, opts.task) : undefined;
  if (opts.task && !task) return fail([{ severity: 'error', code: 'TASK-UNKNOWN', message: `${opts.task} is not in ${feature.tasksPath}`, fix: 'Check the id.' }], 2);
  const base = opts.base ?? (refExists(root, 'main') ? 'main' : refExists(root, 'master') ? 'master' : null);
  if (!base) return fail([{ severity: 'error', code: 'GIT-BASE', message: 'no main or master branch to diff against', fix: 'Pass --base <ref>.' }], 2);
  const branch = currentBranch(root);
  const from = branch === base ? base + '~1' : (mergeBase(root, base, 'HEAD') ?? base);
  const diff = diffAgainst(root, from, task ? task.paths.filter((p) => !/[*?]/.test(p)) : []);
  const reviewDir = join(root, '.spex', 'review');
  let round = 1;
  while (fileExists(join(reviewDir, `${feature.requirements.feature}-${round}${task ? `-${task.id}` : ''}.diff`))) round++;
  const diffPath = `.spex/review/${feature.requirements.feature}-${round}${task ? `-${task.id}` : ''}.diff`;
  writeText(join(root, diffPath), diff);
  const size = bytes(diff);
  const over = size > config.limits.diff_kb * 1024;
  const lines: string[] = [];
  lines.push(`# review ${feature.requirements.feature} — ${feature.requirements.title}${task ? ` (task ${task.id})` : ''} · round ${round} of ${config.review_rounds}`, `goal: ${feature.requirements.goal}`, '', `diff: ${diffPath} (${Math.round(size / 1024)} KB, against ${from.slice(0, 12)})`);
  if (over && !task) lines.push(`The diff is above limits.diff_kb ${config.limits.diff_kb}. Review per task: spex show ${feature.dir} --review --task T01`);
  lines.push('', '## requirements (verdict each: met | partial | missing | contradicts | cannot-verify)');
  const reqs = task ? feature.requirements.requirements.filter((r) => task.requirements.includes(r.id)) : feature.requirements.requirements;
  lines.push(...reqs.map((r) => renderRecord(r)));
  lines.push('', '## tasks', ...feature.tasks.tasks.map((t) => `- ${t.id} ${t.status} ${t.kind} [${t.requirements.join(', ')}] ${t.title}`));
  const b = feature.tasks.boundaries;
  if (b?.always?.length || b?.never?.length) lines.push('', '## boundaries', ...(b.always ?? []).map((a) => `- always: ${a}`), ...(b.never ?? []).map((n) => `- never: ${n}`));
  if (feature.tasks.deferred?.length) lines.push('', '## deferred', ...feature.tasks.deferred.map((d) => `- ${d.finding} — ${d.why} (${d.by})`));
  if (round > config.review_rounds) findings.push({ severity: 'warning', code: 'REVIEW-ROUNDS', message: `round ${round} is past review_rounds ${config.review_rounds}`, fix: 'Stop and hand the feature to a person.' });
  const result: ShowResult = { ok: !over || !!task, text: lines.join('\n'), findings, exit: over && !task ? 6 : 0, data: { diff: diffPath, bytes: size, round, base: from, requirements: reqs, tasks: feature.tasks.tasks } };
  if (over && !task) result.findings.push({ severity: 'error', code: 'REVIEW-DIFF-BIG', message: `diff is ${Math.round(size / 1024)} KB, above limits.diff_kb ${config.limits.diff_kb}`, fix: `Review per task: spex show ${feature.dir} --review --task <id>.` });
  return result;
}

export function showRecord(root: string, dir: string, id: string): ShowResult {
  const { feature, findings } = load(root, dir);
  if (findings.some((f) => f.severity === 'error')) return fail(findings);
  const r = feature.requirements?.requirements.find((x) => x.id === id);
  if (!r) return fail([{ severity: 'error', code: 'REQ-UNKNOWN', message: `${id} is not in ${feature.requirementsPath}`, fix: 'Check the id with `spex index`.' }], 2);
  return { ok: true, text: renderRecord(r), findings, exit: 0, data: { requirement: r } };
}

export function showDesign(root: string, dir: string): ShowResult {
  const { feature, findings } = load(root, dir);
  if (findings.some((f) => f.severity === 'error')) return fail(findings);
  const d = feature.tasks?.design;
  const lines: string[] = ['## approach', (feature.tasks?.approach ?? '').trim()];
  if (d?.modules?.length) lines.push('', '## modules', ...d.modules.map((m) => `${m.id}  ${m.path} — ${m.role}`));
  if (d?.entities?.length) lines.push('', '## entities', ...d.entities.map((e) => `${e.id}  ${e.name}${e.fields ? `: ${e.fields.join(', ')}` : ''}${e.schema ? ` (schema ${e.schema})` : ''}`));
  if (d?.decisions?.length) lines.push('', '## decisions', ...d.decisions.map((x) => `${x.id}  ${x.text}${x.why ? ` — because ${x.why}` : ''}`));
  return { ok: true, text: lines.join('\n'), findings, exit: 0, data: { approach: feature.tasks?.approach, design: d ?? {} } };
}

export function showDecisions(root: string, dir: string): ShowResult {
  const { feature, findings } = load(root, dir);
  if (findings.some((f) => f.severity === 'error')) return fail(findings);
  const lines = decisionLines(feature);
  return { ok: true, text: lines.length ? lines.join('\n') : '(no decisions recorded)', findings, exit: 0, data: { decisions: lines } };
}
