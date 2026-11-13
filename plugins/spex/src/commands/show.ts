// `spex show`: the compiled input of one run. Text for the agent, JSON for Dex.

import { findingsPath } from '../review.js';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { SHELL, driverOf, loadConfig, testDirs } from '../config.js';
import { currentBranch, diffAgainst, isGitRepo, mergeBase, refExists } from '../git.js';
import { bytes, fileExists, isDir, readText, writeText } from '../io.js';
import { isBuilt, resolveDependency, specMetaOf } from '../rules/spec.js';
import { featureRepos, fromRoot, inRepo, repoDiffBase, repoFindings, repoPath, repoRoot } from '../repos.js';
import { parseContextEntry, resolveSpecPath } from '../rules/tasks.js';
import { loadFeature, resolveFeatureDir } from '../specs.js';
import { claimsOf, isFileTest, isSession, locateTest, nameToken, splitCover, testFiles, testsOf } from '../tests.js';
import type { Config, Feature, Finding, Requirement, Task, TasksFile, TestRecord } from '../types.js';
import { composeVerify, readVerify } from '../verify.js';
import { pickTestBatch } from './coverage.js';
import { blockedTasks, planGaps } from './lifecycle.js';

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
  const lines = [`${r.id}  ${r.type} · ${r.priority} · ${r.status} · scope ${r.scope} · applies_to ${r.applies_to.join(', ')}`, `  ${r.text}`];
  if (opts.scenarios) {
    for (const a of r.acceptance) {
      lines.push(`  ${a.id}  given: ${a.given}`, `        when: ${a.when}`, `        then: ${a.then}`);
      if (a.measure) lines.push(`        measure: ${a.measure.metric} ${a.measure.operator} ${a.measure.value} ${a.measure.unit}${a.measure.percentile ? ` p${a.measure.percentile}` : ''}`);
    }
  }
  if (r.rationale) lines.push(`  rationale: ${r.rationale}`);
  for (const rel of r.relationships ?? []) lines.push(`  ${rel.type} ${rel.target}`);
  return lines.join('\n');
}

export function renderTest(t: TestRecord, config?: Config): string {
  const driver = t.kind === 'session' ? (t.driver ?? 'browser') : t.driver === SHELL ? 'shell' : (t.driver ?? 'default');
  const head = [`${t.id}  ${t.kind} · ${driver} · covers ${t.covers.join(', ')}`];
  if (t.name) head.push(`name ${t.name}`);
  if (t.file) head.push(`file ${t.file}`);
  const lines = [head.join(' · ')];
  if (config && t.kind === 'script' && t.driver !== SHELL) {
    const d = driverOf(config, t.driver);
    lines.push(`  runs with: ${d?.cmd.trim() ? d.cmd : '(no command: set acceptance_cmd or drivers in .spex/config.yaml)'}${d?.repo ? ` · in repo ${d.repo} (${repoPath(config, d.repo)})` : ''}${d?.dir ? ` · files under ${inRepo(config, d.repo, d.dir)}` : ''}`);
  }
  if (t.why) lines.push(`  why a session: ${t.why}`);
  lines.push('  steps:', ...t.steps.map((s, i) => `  ${i + 1}. ${s}`), '  expect:', ...t.expect.map((e) => `  - ${e}`));
  if (t.needs?.length) lines.push(`  needs: ${t.needs.join(', ')}`);
  if (t.touches?.length) lines.push(`  touches: ${t.touches.join(', ')}`);
  return lines.join('\n');
}

function findTask(tasks: TasksFile, id: string): Task | undefined {
  return tasks.tasks.find((t) => t.id === id);
}

/** The claim a `covers` id names, in words: the record and its scenario, or the task and its done_when. */
function claimLines(feature: Feature, id: string): string[] {
  const s = splitCover(id);
  if (s.task) {
    const t = feature.tasks ? findTask(feature.tasks, s.task) : undefined;
    if (!t) return [`${id}  (no such task)`];
    return [`${t.id}  ${t.kind} — ${t.title}`, `  done_when: ${t.done_when}`, `  paths: ${t.paths.join(', ')}`];
  }
  const r = feature.requirements?.requirements.find((x) => x.id === s.req);
  if (!r) return [`${id}  (no such record)`];
  if (!s.ac) return [renderRecord(r)];
  const a = r.acceptance.find((x) => x.id === s.ac);
  const lines = [`${r.id}  ${r.type} · ${r.status}`, `  ${r.text}`];
  if (a) {
    lines.push(`  ${a.id}  given: ${a.given}`, `        when: ${a.when}`, `        then: ${a.then}`);
    if (a.measure) lines.push(`        measure: ${a.measure.metric} ${a.measure.operator} ${a.measure.value} ${a.measure.unit}${a.measure.percentile ? ` p${a.measure.percentile}` : ''}`);
  }
  return lines;
}

/** The tasks whose claims a test proves: their instructions carry the names and values the test uses. */
function tasksBehind(feature: Feature, t: TestRecord): Task[] {
  return (feature.tasks?.tasks ?? []).filter((task) => {
    const ids = claimsOf(feature, task);
    return t.covers.some((c) => ids.has(c));
  });
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

function contractLines(feature: Feature, reqs: Requirement[]): string[] {
  const contracts = (feature.requirements?.interfaces ?? []).filter((i) => i.contract && reqs.some((r) => r.applies_to.includes(i.id)));
  return contracts.map((c) => `- ${c.id} (${c.kind}): ${c.contract}`);
}

function glossaryLines(feature: Feature): string[] {
  const g = feature.requirements?.glossary;
  return g && Object.keys(g).length ? Object.entries(g).map(([k, v]) => `- ${k}: ${v}`) : [];
}

export function showTask(root: string, dir: string, taskId: string): ShowResult {
  const { feature, config, findings } = load(root, dir);
  if (findings.some((f) => f.severity === 'error')) return fail(findings);
  if (!feature.tasks || !feature.requirements) return fail([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} needs requirements.yaml and tasks.yaml`, fix: 'Run /spex:plan first.' }]);
  const task = findTask(feature.tasks, taskId);
  if (!task) return fail([{ severity: 'error', code: 'TASK-UNKNOWN', message: `${taskId} is not in ${feature.tasksPath}`, fix: '`spex status` names the command to go on.' }], 2);
  const reqs = feature.requirements.requirements.filter((r) => task.requirements.includes(r.id));
  const tests = testsOf(feature, task);
  const verify = composeVerify(config, feature, task);
  const lines: string[] = [];
  lines.push(`# ${task.id} — ${task.title}`, `feature ${feature.requirements.feature} (${feature.requirements.title}) · kind ${task.kind} · status ${task.status}`);
  if (task.depends_on?.length) lines.push(`depends_on: ${task.depends_on.join(', ')}`);
  if (task.parallel_group) lines.push(`parallel_group: ${task.parallel_group}`);
  const repoDir = repoPath(config, task.repo);
  if (task.repo) lines.push(`repo: ${task.repo} — another git repo at ${repoDir}; every path below is from this repo's root`);
  lines.push('', '## paths (write allowlist — nothing outside these)', ...task.paths.map((p) => `- ${inRepo(config, task.repo, p)}`));
  lines.push('', '## context (read these first)');
  for (const c of task.context ?? []) {
    const { path, from, to } = parseContextEntry(c);
    const abs = resolveSpecPath(root, feature.dir, path, repoDir);
    let size = '';
    if (abs) {
      const text = readText(abs);
      const part = from !== undefined && to !== undefined ? text.split('\n').slice(from - 1, to).join('\n') : text;
      size = ` (${Math.max(1, Math.round(bytes(part) / 1024))} KB)`;
    }
    const shown = abs && repoDir && abs === fromRoot(root, join(repoDir, path)) ? inRepo(config, task.repo, c) : abs && abs !== join(root, path) ? `${feature.dir}/${c}` : !abs && task.repo ? inRepo(config, task.repo, c) : c;
    lines.push(`- ${shown}${abs ? size : ' (written by an earlier task)'}`);
  }
  if (!task.context?.length) lines.push('- (none)');
  if (task.interfaces?.consumes?.length) lines.push('', '## consumes (exact signatures from earlier tasks)', ...task.interfaces.consumes.map((s) => `- ${s}`));
  if (task.interfaces?.produces?.length) lines.push('', '## produces (later tasks rely on exactly these)', ...task.interfaces.produces.map((s) => `- ${s}`));
  lines.push('', '## instructions', task.instructions.trim(), '', `## done_when`, task.done_when);
  lines.push('', '## tests (the task\'s proof, from tests.yaml — never edit them)', ...(tests.length ? tests.map((t) => renderTest(t, config)) : ['- (none: the test analyst adds one)']));
  lines.push('', '## verify (spex run composes and runs these)', ...(verify.cmds.length ? verify.cmds.map((v) => `- ${v}`) : ['- (nothing under a driver; fast_checks and shell steps run at done)']));
  lines.push('', '## requirements', ...(reqs.length ? reqs.map((r) => renderRecord(r)) : ['- (none: a setup task, proved by its own test)']));
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
  return { ok: true, text: lines.join('\n'), findings, exit: 0, data: { task, requirements: reqs, tests, verify: verify.cmds, boundaries: b ?? {}, decisions, design } };
}

/** The input of the test analyst: every claim without a proof, the interfaces, and the rules of the plan. */
/**
 * `spex show <dir> --ready`: the tasks that can start now, as waves. A task is ready when it is todo and every task in
 * its depends_on is done. Ready tasks of one parallel_group write different files, so they are one wave and run
 * together (joined with `+`). The others run one by one, in the order of the file: the most important record first.
 */
export function showReady(root: string, dir: string): ShowResult {
  const { feature, findings } = load(root, dir);
  if (findings.some((f) => f.severity === 'error')) return fail(findings);
  const tasks = feature.tasks?.tasks ?? [];
  if (!feature.tasks) return fail([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no tasks.yaml`, fix: `Type /spex:plan ${feature.dir}.` }]);
  const done = new Set(tasks.filter((t) => t.status === 'done').map((t) => t.id));
  const ready = tasks.filter((t) => t.status === 'todo' && (t.depends_on ?? []).every((d) => done.has(d)));
  const waves: string[][] = [];
  const groups = new Map<string, string[]>();
  for (const t of ready) {
    const g = t.parallel_group?.trim();
    const wave = g ? groups.get(g) : undefined;
    if (wave) wave.push(t.id);
    else {
      const w = [t.id];
      if (g) groups.set(g, w);
      waves.push(w);
    }
  }
  const waiting = tasks.filter((t) => t.status === 'todo' && !ready.includes(t)).map((t) => `${t.id} (needs ${(t.depends_on ?? []).filter((d) => !done.has(d)).join(', ')})`);
  const blocked = blockedTasks(root, feature);
  const count = (s: string): number => tasks.filter((t) => t.status === s).length;
  const lines = [
    `ready: ${waves.length ? waves.map((w) => w.join(' + ')).join(', ') : 'none'}`,
    `tasks: ${count('done')} done · ${count('todo')} todo · ${count('blocked')} blocked · ${tasks.length} in all`,
  ];
  if (waiting.length) lines.push(`not ready yet: ${waiting.join(', ')}`);
  for (const b of blocked) lines.push(b.ask ? `waits for your yes: ${b.id} · ${b.ask}` : `blocked: ${b.id} · ${b.reason || 'no reason given'}`);
  return { ok: true, text: lines.join('\n'), findings: findings.filter((f) => f.severity === 'warning'), exit: 0, data: { waves, waiting, blocked, done: count('done'), todo: count('todo') } };
}

export function showPlan(root: string, dir: string): ShowResult {
  const { feature, config, findings } = load(root, dir);
  if (findings.some((f) => f.severity === 'error')) return fail(findings);
  const r = feature.requirements;
  if (!r) return fail([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no requirements.yaml`, fix: 'Run /spex:plan first.' }]);
  const gaps = planGaps(feature);
  const existing = feature.tests?.tests ?? [];
  const nextId = `TS${String(existing.length + 1).padStart(2, '0')}`;
  const lines = [`# proof plan for ${feature.dir} — ${r.title}`, `goal: ${r.goal}`, `feature id: ${r.feature} · ${feature.testsPath} ${feature.tests ? `has ${existing.length} test(s); next id ${nextId}` : 'does not exist yet; start at TS01'}`];
  const drivers = Object.entries(config.drivers).map(([k, d]) => `${k} → ${d.cmd}${d.dir ? ` (files under ${d.dir})` : ''}`);
  lines.push('', '## how tests run here', `- default driver: ${config.acceptance_cmd || '(acceptance_cmd not set)'} · files under ${config.acceptance_dir}`, ...drivers.map((d) => `- driver ${d}`), '- driver shell: the steps run as commands, each must exit 0', `- live systems a test may write (touches): ${config.live.length ? config.live.join(', ') : '(none: a test that writes a real system needs one added to live[] in .spex/config.yaml, the one-time yes)'}`, `- never an actor: ${config.people.length ? config.people.join(', ') : '(people[] is empty)'}, "ask …", "by hand", "a person\'s yes"`);
  if (!gaps.scenarios.length && !gaps.tasks.length) lines.push('', 'every scenario and every task has a test: nothing to plan');
  if (gaps.scenarios.length) {
    lines.push('', '## scenarios without a test (one script each, at least)');
    for (const id of gaps.scenarios) lines.push(...claimLines(feature, id));
  }
  if (gaps.tasks.length) {
    lines.push('', '## tasks without a test (one each: the done_when made checkable)');
    for (const id of gaps.tasks) {
      const t = findTask(feature.tasks!, id)!;
      lines.push(`${t.id}  ${t.kind} — ${t.title}`, `  done_when: ${t.done_when}`, `  paths: ${t.paths.join(', ')}`, `  requirements: ${t.requirements.join(', ') || '(none)'}`, `  instructions: ${t.instructions.trim().replace(/\s+/g, ' ').slice(0, 600)}`);
    }
  }
  const interfaces = (r.interfaces ?? []).map((i) => `- ${i.id} (${i.kind})${i.contract ? `: ${i.contract}` : ''}`);
  if (interfaces.length) lines.push('', '## interfaces (a script test talks to these, never to internals)', ...interfaces);
  const glossary = glossaryLines(feature);
  if (glossary.length) lines.push('', '## glossary', ...glossary);
  if (existing.length) lines.push('', '## tests planned already', ...existing.map((t) => `- ${t.id} ${t.kind} covers ${t.covers.join(', ')}${t.name ? ` · ${t.name}` : ''}`));
  lines.push(
    '',
    '## rules of the plan',
    '- one test per claim at least; a script by default; a session only with a `why` a script cannot answer',
    `- a script under a driver has a name: <token>_<what_it_checks>, the token from the first id in covers (${r.requirements[0] ? nameToken(feature, { id: 'TS00', covers: [`${r.requirements[0].id}/${r.requirements[0].acceptance[0]?.id ?? 'AC-1'}`], kind: 'script', steps: [], expect: [] }) : 'REQ_007_001_AC_1'}, TASK_${r.feature.replace(/-/g, '_')}_09)`,
    '- steps say what runs with which values; expect says what is observed with its exact value',
    '- a real system the test writes → touches[], each in live[]; a token or a running system → needs[]',
    '- no step is a person\'s: a merge is an API call, a press is a browser step, a credential is a need',
    `- then \`spex check ${feature.dir}\` until it prints 0 error(s)`,
  );
  return { ok: true, text: lines.join('\n'), findings, exit: 0, data: { gaps, next_id: nextId, drivers: config.drivers, live: config.live, people: config.people, existing: existing.map((t) => t.id) } };
}

/** The input of one test-develop run: the named tests, or the batch the picker chooses (script tests without a file, up to limits.tests_scenarios). */
export function showTests(root: string, dir: string, ids: string[]): ShowResult {
  const { feature, config, findings } = load(root, dir);
  if (findings.some((f) => f.severity === 'error')) return fail(findings);
  if (!feature.tasks || !feature.requirements || !feature.tests) return fail([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} needs requirements.yaml, tasks.yaml and tests.yaml`, fix: 'Run /spex:plan first; the test analyst writes tests.yaml.' }]);
  let tests: TestRecord[];
  let batchNote = '';
  if (ids.length) {
    tests = [];
    for (const id of ids) {
      const t = feature.tests.tests.find((x) => x.id === id);
      if (!t) return fail([{ severity: 'error', code: 'TEST-UNKNOWN', message: `${id} is not in ${feature.testsPath}`, fix: 'Run `spex show <dir> --tests` with no id to see the batch.' }], 2);
      if (!isFileTest(t)) return fail([{ severity: 'error', code: 'USAGE', message: `${id} is ${t.kind === 'session' ? 'a session: nothing to write, a tester performs it' : 'a shell test: its steps are the test'}`, fix: 'Name a script test under a driver.' }], 2);
      tests.push(t);
    }
  } else {
    tests = pickTestBatch(root, config, feature).tests;
    if (!tests.length) return { ok: true, text: 'every script test has its file: nothing to write', findings, exit: 0, data: { tests: [], retire: [] } };
    batchNote = ` (batch of ${tests.length}, cap ${config.limits.tests_scenarios})`;
  }
  const files = testFiles(root, config);
  const lines: string[] = [];
  lines.push(`# tests to write: ${tests.map((t) => t.id).join(', ')}${batchNote}`, `goal: ${feature.requirements.goal}`);
  const covered: Requirement[] = [];
  for (const t of tests) {
    const d = driverOf(config, t.driver);
    lines.push('', `## ${t.id} — name ${t.name ?? '(none: give it one)'} · driver ${t.driver ?? 'default'}: ${d?.cmd.trim() || '(no command in .spex/config.yaml)'}${d?.repo ? ` · runs in repo ${d.repo}` : ''} · files under ${inRepo(config, d?.repo, d?.dir ?? config.acceptance_dir)}${t.file ? ` · intended file ${t.file}` : ''}`);
    const located = locateTest(root, config, t);
    if (located) lines.push(`exists already in ${located}: rewrite it there`);
    lines.push('steps:', ...t.steps.map((s, i) => `${i + 1}. ${s}`), 'expect:', ...t.expect.map((e) => `- ${e}`));
    if (t.needs?.length) lines.push(`needs: ${t.needs.join(', ')}`);
    if (t.touches?.length) lines.push(`touches: ${t.touches.join(', ')}`);
    lines.push('proves:');
    for (const c of t.covers) {
      lines.push(...claimLines(feature, c).map((l) => `  ${l}`));
      const s = splitCover(c);
      const r = feature.requirements.requirements.find((x) => x.id === s.req);
      if (r && !covered.includes(r)) covered.push(r);
    }
    const behind = tasksBehind(feature, t);
    if (behind.length) lines.push('names and values from the plan:', ...behind.map((task) => `  ${task.id} ${task.title}: ${task.instructions.trim().replace(/\s+/g, ' ')}${task.interfaces?.produces?.length ? ` · produces ${task.interfaces.produces.join('; ')}` : ''}`));
  }
  const contracts = contractLines(feature, covered);
  if (contracts.length) lines.push('', '## contracts', ...contracts);
  const glossary = glossaryLines(feature);
  if (glossary.length) lines.push('', '## glossary', ...glossary);
  const supersedes = feature.requirements.requirements.flatMap((r) => (r.relationships ?? []).filter((x) => x.type === 'supersedes').map((x) => x.target));
  const retire = supersedes.flatMap((old) => files.filter((p) => readText(join(root, p)).includes(old.replace(/-/g, '_'))).map((p) => `${old} in ${p}`));
  const existing = files.filter((p) => tests.some((t) => { const d = driverOf(config, t.driver); return p.startsWith(inRepo(config, d?.repo, (d?.dir ?? config.acceptance_dir).replace(/\/+$/, '')) + '/'); })).slice(0, 20);
  const dirsHere = [...new Set(tests.map((t) => driverOf(config, t.driver)).map((d) => inRepo(config, d?.repo, d?.dir ?? config.acceptance_dir)))];
  lines.push('', `## existing test files under ${dirsHere.join(', ')} (read one or two for the conventions)`, ...(existing.length ? existing.map((p) => `- ${p}`) : ['- (none yet; create the folder and the first file)']));
  if (retire.length) lines.push('', '## tests to retire (this feature supersedes their record)', ...retire.map((x) => `- ${x}`));
  lines.push('', `Never read ${config.source_dirs.join(', ')}. The name is the test's name in the file, exactly. End with one red run per test:`, ...tests.map((t) => `- spex run ${feature.dir} --test ${t.id} --expect fail`));
  return { ok: true, text: lines.join('\n'), findings, exit: 0, data: { tests: tests.map((t) => t.id), records: tests, retire, contracts, test_dirs: testDirs(config) } };
}

/** The brief of one tester: the session to perform, the claim it proves, and how to record it. */
export function showSession(root: string, dir: string, id: string): ShowResult {
  const { feature, config, findings } = load(root, dir);
  if (findings.some((f) => f.severity === 'error')) return fail(findings);
  if (!feature.requirements || !feature.tests) return fail([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} needs requirements.yaml and tests.yaml`, fix: 'Nothing to perform without a plan.' }]);
  const t = feature.tests.tests.find((x) => x.id === id);
  if (!t) return fail([{ severity: 'error', code: 'TEST-UNKNOWN', message: `${id} is not in ${feature.testsPath}`, fix: 'Check the id.' }], 2);
  if (!isSession(t)) return fail([{ severity: 'error', code: 'USAGE', message: `${id} is a script: spex run --test ${id} runs it`, fix: 'A session is what a tester performs.' }], 2);
  const lines = [`# session ${t.id} — ${feature.requirements.title}`, `driver: ${t.driver ?? 'browser'}`, `why a session: ${t.why ?? ''}`, '', '## proves'];
  for (const c of t.covers) lines.push(...claimLines(feature, c));
  lines.push('', '## steps (perform them exactly, in order)', ...t.steps.map((s, i) => `${i + 1}. ${s}`), '', '## expect (note each value you observe, next to what was expected)', ...t.expect.map((e) => `- ${e}`));
  if (t.needs?.length) lines.push('', `needs: ${t.needs.join(', ')}`);
  if (t.touches?.length) lines.push(`touches (real systems this writes; each has the one-time yes in live[]): ${t.touches.join(', ')}`);
  lines.push('', '## record it', `spex session ${feature.dir} ${t.id} --result pass|fail --observed "<every value you saw, with its step>" [--artifact <repo-relative screenshot or log>]…`, 'A step you cannot do, or a value that differs: --result fail, with the step and what you saw. Never change code, tests or records.');
  return { ok: true, text: lines.join('\n'), findings, exit: 0, data: { test: t, live: config.live } };
}

/** The verify skill's view after `spex verify`: each failure with its claim, its file and the task behind it, for the decider. */
export function showVerify(root: string, dir: string): ShowResult {
  const { feature, config, findings } = load(root, dir);
  if (findings.some((f) => f.severity === 'error')) return fail(findings);
  if (!feature.requirements || !feature.tests || !feature.tasks) return fail([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} needs requirements.yaml, tasks.yaml and tests.yaml`, fix: 'Run /spex:plan first.' }]);
  const v = readVerify(root, feature.requirements.feature);
  if (!v) return fail([{ severity: 'error', code: 'VERIFY-MISSING', message: `no whole-feature run recorded for ${feature.dir}`, fix: `Run spex verify ${feature.dir} first.` }], 6);
  const byId = new Map(feature.tests.tests.map((t) => [t.id, t]));
  const lines = [`# verify ${feature.dir} — round ${v.round} of ${config.verify_rounds} · tree ${v.tree} · ${v.ok ? 'ok' : 'FAILED'} · ${v.at}`];
  if (!v.fast_checks.ok) lines.push('', '## fast_checks failed', v.fast_checks.tail);
  const failed = v.scripts.filter((s) => !s.ok);
  if (failed.length) {
    lines.push('', '## failing scripts (one decider question each: the test, the code, the tasks or the spec?)');
    for (const s of failed) {
      const t = byId.get(s.id);
      lines.push('', `### ${s.id}`, s.cmd ? `command: ${s.cmd} (exit ${s.exit})` : 'no command');
      if (t) {
        lines.push(renderTest(t, config));
        const file = locateTest(root, config, t);
        if (file) lines.push(`file: ${file}`);
        lines.push('claim:');
        for (const c of t.covers) lines.push(...claimLines(feature, c).map((l) => `  ${l}`));
        const behind = tasksBehind(feature, t);
        if (behind.length) lines.push(`code under: ${[...new Set(behind.flatMap((task) => task.paths))].join(', ')} (${behind.map((task) => task.id).join(', ')})`);
      }
      lines.push('tail:', s.tail);
    }
  }
  const sessions = v.sessions;
  if (sessions.length) {
    lines.push('', '## sessions');
    for (const s of sessions) lines.push(`- ${s.id} ${s.status}${s.observed ? ` — ${s.observed.slice(0, 160)}` : ''}${s.status === 'stale' ? ' (recorded at another tree: perform it again)' : ''}`);
  }
  if (v.ok) lines.push('', 'Every script passed and every session is a pass at this tree. Next: /spex:review.');
  return { ok: true, text: lines.join('\n'), findings, exit: 0, data: { evidence: v, verify_rounds: config.verify_rounds } };
}

/** Every `spex paths` change of a feature, from .spex/runs/<feature>/paths-<task>.json, oldest first per task. */
function pathChanges(root: string, featureId: string): { task: string; added: string[]; reason: string }[] {
  const dir = join(root, '.spex', 'runs', featureId);
  if (!isDir(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^paths-.+\.json$/.test(f))
    .sort()
    .flatMap((f) => {
      const rec = JSON.parse(readText(join(dir, f))) as { task: string; changes?: { added: string[]; reason: string }[] };
      return (rec.changes ?? []).map((c) => ({ task: rec.task, added: c.added, reason: c.reason }));
    });
}

export function showReview(root: string, dir: string, opts: { task?: string; base?: string }): ShowResult {
  const { feature, config, findings } = load(root, dir);
  if (findings.some((f) => f.severity === 'error')) return fail(findings);
  if (!feature.tasks || !feature.requirements) return fail([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} needs requirements.yaml and tasks.yaml`, fix: 'Run /spex:plan first.' }]);
  if (!isGitRepo(root)) return fail([{ severity: 'error', code: 'GIT-REQUIRED', message: 'review needs a git repository for the diff', fix: 'Run inside the repository.' }], 2);
  const task = opts.task ? findTask(feature.tasks, opts.task) : undefined;
  if (opts.task && !task) return fail([{ severity: 'error', code: 'TASK-UNKNOWN', message: `${opts.task} is not in ${feature.tasksPath}`, fix: 'Check the id.' }], 2);
  const files = task ? task.paths.filter((p) => !/[*?]/.test(p)) : [];
  // The home repo's part, unless the task writes another repo; then one part per other repo, its paths from here.
  const repos = task ? (task.repo ? [task.repo] : []) : featureRepos(config, feature);
  const lost = repoFindings(root, config, repos);
  if (lost.length) return fail(lost, 2);
  let diff = '';
  let from = '';
  if (!task?.repo) {
    const base = opts.base ?? (refExists(root, 'main') ? 'main' : refExists(root, 'master') ? 'master' : null);
    if (!base) return fail([{ severity: 'error', code: 'GIT-BASE', message: 'no main or master branch to diff against', fix: 'Pass --base <ref>.' }], 2);
    const branch = currentBranch(root);
    from = branch === base ? base + '~1' : (mergeBase(root, base, 'HEAD') ?? base);
    diff = diffAgainst(root, from, files);
  }
  const parts: { repo: string; path: string; base: string; why: string }[] = [];
  for (const name of repos) {
    const b = repoDiffBase(root, config, feature.requirements.feature, name);
    if ('code' in b) return fail([b], 2);
    diff += diffAgainst(repoRoot(root, config, name), b.from, files, repoPath(config, name));
    parts.push({ repo: name, path: repoPath(config, name), base: b.from, why: b.why });
  }
  if (!from) from = parts[0]?.base ?? '';
  const reviewDir = join(root, '.spex', 'review');
  let round = 1;
  while (fileExists(join(reviewDir, `${feature.requirements.feature}-${round}${task ? `-${task.id}` : ''}.diff`))) round++;
  const diffPath = `.spex/review/${feature.requirements.feature}-${round}${task ? `-${task.id}` : ''}.diff`;
  writeText(join(root, diffPath), diff);
  const size = bytes(diff);
  const over = size > config.limits.diff_kb * 1024;
  const lines: string[] = [];
  lines.push(`# review ${feature.requirements.feature} — ${feature.requirements.title}${task ? ` (task ${task.id})` : ''} · round ${round} of ${config.review_rounds}`, `goal: ${feature.requirements.goal}`, '', `diff: ${diffPath} (${Math.round(size / 1024)} KB, against ${from.slice(0, 12)})`);
  if (parts.length) lines.push(`other repos in the diff, their paths from this root: ${parts.map((p) => `${p.repo} (${p.path}) against ${p.base.slice(0, 12)}, ${p.why}`).join('; ')}`);
  if (over && !task) lines.push(`The diff is above limits.diff_kb ${config.limits.diff_kb}. Review per task: spex show ${feature.dir} --review --task T01`);
  const v = readVerify(root, feature.requirements.feature);
  lines.push(`evidence: ${v ? `verify round ${v.round} at tree ${v.tree}, ${v.ok ? 'green' : 'RED'}: ${v.scripts.filter((s) => s.ok).length}/${v.scripts.length} scripts, ${v.sessions.filter((s) => s.status === 'pass').length}/${v.sessions.length} sessions` : '(no verify run yet)'} — the script proved it; do not rerun the tests`);
  lines.push('', '## requirements (verdict each: met | partial | missing | contradicts | cannot-verify)');
  const reqs = task ? feature.requirements.requirements.filter((r) => task.requirements.includes(r.id)) : feature.requirements.requirements;
  lines.push(...reqs.map((r) => renderRecord(r)));
  lines.push('', '## tasks', ...feature.tasks.tasks.map((t) => `- ${t.id} ${t.status} ${t.kind} [${t.requirements.join(', ') || 'setup'}] ${t.title}`));
  const b = feature.tasks.boundaries;
  if (b?.always?.length || b?.never?.length) lines.push('', '## boundaries', ...(b.always ?? []).map((a) => `- always: ${a}`), ...(b.never ?? []).map((n) => `- never: ${n}`));
  if (feature.tasks.deferred?.length) lines.push('', '## deferred', ...feature.tasks.deferred.map((d) => `- ${d.finding} — ${d.why} (${d.by})`));
  // spex paths keeps a person's approval of the plan, so the person reads each widening here, with the decider's why.
  const widened = pathChanges(root, feature.requirements.feature).filter((c) => !task || c.task === task.id);
  if (widened.length) lines.push('', '## paths widened in develop (a decider\'s verdict; name each in the reply)', ...widened.map((c) => `- ${c.task} + ${c.added.join(', ')} — ${c.reason}`));
  // Round 2 and later is a check, not a new review: is each accepted fix in? Only a P1 is a new finding.
  const fixTasks = feature.tasks.tasks.filter((t) => t.review);
  const check = !task && round > 1 && fixTasks.length > 0;
  if (check) {
    lines.push('', `## check (round ${round}): each accepted fix, at its task's paths — fixed | not-fixed; a new finding here must be P1`);
    lines.push(...fixTasks.map((t) => `- ${t.id} ${t.status} ${t.severity ?? ''} ${t.review}: ${t.title} — paths: ${t.paths.join(', ')} — slice: spex show ${feature.dir} --review --task ${t.id}`));
  }
  const last = round >= config.review_rounds;
  if (last && round <= config.review_rounds) lines.push('', `last round (${round} of ${config.review_rounds}): a P2 or P3 is picked defer; only a P1 is picked fix`);
  if (round > config.review_rounds) findings.push({ severity: 'warning', code: 'REVIEW-ROUNDS', message: `round ${round} is past review_rounds ${config.review_rounds}`, fix: 'Every finding is picked defer or skip, unless it is P1; the person answers, and spex review accept writes the clean report ship needs.' });
  lines.push('', `findings go to ${findingsPath(feature.requirements.feature, round)}; the person answers with /spex:review ${feature.dir} ok`);
  const result: ShowResult = { ok: !over || !!task, text: lines.join('\n'), findings, exit: over && !task ? 6 : 0, data: { diff: diffPath, bytes: size, round, check, last, findings_file: findingsPath(feature.requirements.feature, round), base: from, repos: parts, requirements: reqs, tasks: feature.tasks.tasks, verify: v } };
  if (over && !task) result.findings.push({ severity: 'error', code: 'REVIEW-DIFF-BIG', message: `diff is ${Math.round(size / 1024)} KB, above limits.diff_kb ${config.limits.diff_kb}`, fix: `Review per task: spex show ${feature.dir} --review --task <id>.` });
  return result;
}

export function showRecord(root: string, dir: string, id: string): ShowResult {
  const { feature, findings } = load(root, dir);
  if (findings.some((f) => f.severity === 'error')) return fail(findings);
  const r = feature.requirements?.requirements.find((x) => x.id === id);
  if (!r) return fail([{ severity: 'error', code: 'REQ-UNKNOWN', message: `${id} is not in ${feature.requirementsPath}`, fix: 'Check the id with `spex index`.' }], 2);
  const tests = (feature.tests?.tests ?? []).filter((t) => t.covers.some((c) => c === r.id || c.startsWith(`${r.id}/`)));
  const text = [renderRecord(r), ...(tests.length ? ['', 'proved by:', ...tests.map((t) => renderTest(t))] : [])].join('\n');
  return { ok: true, text, findings, exit: 0, data: { requirement: r, tests } };
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

/**
 * `spex show <dir> --inherited`: what the steps in `depends_on` (spec.md front matter) settled — their goal,
 * interfaces, decisions, entities and the signatures their tasks produce. The step that builds on them reads
 * this instead of their folders, so a name is never guessed from memory.
 */
export function showInherited(root: string, dir: string): ShowResult {
  const { feature, findings } = load(root, dir);
  if (findings.some((f) => f.severity === 'error')) return fail(findings);
  const deps = specMetaOf(root, feature.dir)?.depends_on ?? [];
  if (!deps.length) return { ok: true, text: `(${feature.dir} names no depends_on in its spec.md: nothing is inherited)`, findings, exit: 0, data: { depends_on: [], inherited: [] } };
  const lines = [`# inherited by ${feature.dir} — from ${deps.join(', ')}`];
  const inherited: Record<string, unknown>[] = [];
  for (const dep of deps) {
    const target = resolveDependency(root, dep);
    if (!target) {
      lines.push('', `## ${dep} — no such folder under specs/`);
      continue;
    }
    const f = loadFeature(root, target);
    const r = f.requirements;
    const built = isBuilt(root, target);
    const interfaces = (r?.interfaces ?? []).map((i) => `${i.id} (${i.kind}${i.contract ? `, ${i.contract}` : ''})`);
    const decisions = decisionLines(f);
    const produces = [...new Set((f.tasks?.tasks ?? []).flatMap((t) => (t.interfaces?.produces ?? []).map((p) => `${p}  (${t.id})`)))];
    const entities = (f.tasks?.design?.entities ?? []).map((e) => `${e.id}  ${e.name}${e.fields ? `: ${e.fields.join(', ')}` : ''}${e.schema ? ` (schema ${e.schema})` : ''}`);
    lines.push('', `## ${target.split('/').pop()} — ${r?.title ?? '(no records yet)'}${built ? ' · built' : ''}`);
    if (r) lines.push(`goal: ${r.goal}`);
    if (interfaces.length) lines.push(`interfaces: ${interfaces.join(', ')}`);
    if (decisions.length) lines.push('decisions:', ...decisions.map((d) => `  ${d}`));
    if (entities.length) lines.push('entities:', ...entities.map((e) => `  ${e}`));
    if (produces.length) lines.push('produces:', ...produces.map((p) => `  - ${p}`));
    if (!r && !decisions.length) lines.push('(nothing settled yet)');
    inherited.push({ dir: target, title: r?.title ?? null, goal: r?.goal ?? null, built, interfaces, decisions, entities, produces });
  }
  lines.push('', 'Use these names and signatures exactly. A different name breaks what is built.');
  return { ok: true, text: lines.join('\n'), findings, exit: 0, data: { depends_on: deps, inherited } };
}

interface RunReport {
  stage?: string;
  task?: string | null;
  status?: string;
  concerns?: string[];
  questions?: string[];
  reason?: string;
}

/**
 * `spex show <dir> --lessons`: everything a finished step recorded that an unbuilt step may need: the concerns
 * and questions of every run report, the answers given by default, the deferred findings, the decisions, the
 * blocked reasons and the records it supersedes. the close of /spex:review routes each item; the script only gathers.
 */
export function showLessons(root: string, dir: string): ShowResult {
  const { feature, findings } = load(root, dir);
  if (findings.some((f) => f.severity === 'error')) return fail(findings);
  const r = feature.requirements;
  if (!r) return fail([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} has no requirements.yaml`, fix: 'Nothing was built here, so there is nothing to hand over.' }]);
  const runsDir = join(root, '.spex', 'runs', r.feature);
  const reports: RunReport[] = [];
  const blocks: { task: string; reason: string }[] = [];
  if (isDir(runsDir)) {
    for (const name of readdirSync(runsDir).sort()) {
      if (!name.endsWith('.json')) continue;
      try {
        const doc = JSON.parse(readText(join(runsDir, name))) as RunReport & { task?: string };
        if (name.startsWith('block-')) blocks.push({ task: doc.task ?? name, reason: doc.reason ?? '' });
        else reports.push(doc);
      } catch {
        // a report that does not parse is not evidence of anything
      }
    }
  }
  const from = (d: RunReport): string => `${d.stage ?? 'run'}${d.task ? ` ${d.task}` : ''}`;
  const concerns = reports.flatMap((d) => (d.concerns ?? []).map((c) => ({ from: from(d), text: c })));
  const questions = reports.flatMap((d) => (d.questions ?? []).map((q) => ({ from: from(d), text: q })));
  const defaults = (r.questions ?? []).filter((q) => q.by === 'default').map((q) => `${q.id} ${q.ask} → ${q.answer}`);
  const byAgent = (r.questions ?? []).filter((q) => q.by === 'agent').map((q) => `${q.id} ${q.ask} → ${q.answer}${q.evidence ? ` (${q.confidence ?? 'confidence not given'}: ${q.evidence})` : ' (no evidence)'}`);
  const deferred = (feature.tasks?.deferred ?? []).map((d) => `${d.finding} — ${d.why} (${d.by})`);
  const decisions = decisionLines(feature);
  const supersedes = r.requirements.flatMap((x) => (x.relationships ?? []).filter((rel) => rel.type === 'supersedes').map((rel) => `${x.id} supersedes ${rel.target}`));
  const meta = specMetaOf(root, feature.dir);
  const lines = [`# lessons of ${feature.dir} — ${r.title}${meta?.roadmap ? ` · step ${meta.step ?? '?'} of ${meta.roadmap}` : ''}`];
  const section = (title: string, items: string[]): void => {
    if (items.length) lines.push('', `## ${title}`, ...items.map((i) => `- ${i}`));
  };
  section('concerns (from the run reports)', concerns.map((c) => `${c.from}: ${c.text}`));
  section('questions raised (from the run reports)', questions.map((q) => `${q.from}: ${q.text}`));
  section('answered by default (nobody was asked)', defaults);
  section('answered by the decider agent (from evidence)', byAgent);
  section('deferred', deferred);
  section('blocked', blocks.map((b) => `${b.task}: ${b.reason}`));
  section('decisions', decisions);
  section('supersedes', supersedes);
  if (lines.length === 1) lines.push('', '(nothing recorded: no concerns, questions, default or agent answers, deferred items, blocks or decisions)');
  lines.push('', 'Route each item: a step it changes → that step\'s Open questions, sized, with "← <feature> <stage>" at the end · live behavior it changes → a record with supersedes · how to work in this repo → the repo docs, not spex.');
  return { ok: true, text: lines.join('\n'), findings, exit: 0, data: { feature: r.feature, roadmap: meta?.roadmap ?? null, concerns, questions, defaults, by_agent: byAgent, deferred, blocked: blocks, decisions, supersedes } };
}
