// The phases of a spec: plan, implement, review. A phase starts and ends in the script, and nowhere else, so
// status.yaml is true: `spex start <phase> <dir>` runs the gate of the command and writes `state: started`;
// `spex end <phase> <dir>` runs the last check of the phase, writes `state: done`, and commits what the phase wrote
// on the branch of the spec. A phase that started and did not end runs again from its first box: the files of the
// first run are on disk, and each agent reads them.
//
// There is no approve command. `spex end plan` stamps the plan, and `spex start implement` lets it in only as it was
// stamped: typing implement is the approval. `spex stamp` stamps a plan the process itself changed.

import { join } from 'node:path';
import { planChanged, stampPlan } from '../approvals.js';
import { hasErrors, runCheck } from '../check.js';
import { CONFIG_PATH, loadConfig } from '../config.js';
import { closeCorrections, openCorrections, readCorrections, type Correction } from '../corrections.js';
import { commitPaths, dirty, git, isGitRepo, showAtRef } from '../git.js';
import { fileExists, openDocument, readText, saveDocument, writeText } from '../io.js';
import { commandFor, renderNext } from '../next.js';
import { SPEC_FILE, sectionBodies } from '../rules/spec.js';
import { loadFeature } from '../specs.js';
import { findSpec, isClosed, readState, specList, stateWord, writeState, type ListedSpec } from '../state.js';
import { isSession, needsFindings } from '../tests.js';
import type { Config, Feature, Finding, SpecState } from '../types.js';
import { readVerify, runCommands, verifyIsCurrent, startVerifyRun } from '../verify.js';
import { SETUP_RECORD as SETUP_RECORD_PATH } from '../worktree.js';
import { baseBranch, branchOf, catchUp, enterGate, inWorktree, mainRoot, pushFix, setupOnce, toplevel, unpushed, type SetupResult } from '../worktree.js';
import { yesLines, type CmdResult } from './lifecycle.js';
import { pendingRound } from '../review.js';
import { openedNote } from './new.js';

const refuse = (findings: Finding[], exit = 6, data: Record<string, unknown> = {}): CmdResult => ({ ok: false, findings, exit, text: '', data });
const err = (code: string, message: string, fix: string, path?: string): Finding => ({ severity: 'error', code, message, fix, ...(path ? { path } : {}) });

/** The sections of spec.md that hold what the person gave, one bullet for each detail, each with a link back to the text. */
const GIVEN_SECTIONS = ['from your idea', 'from the design'];
const bullets = (body: string): string[] => body.split('\n').map((l) => l.match(/^\s*[-*+]\s+(.*)$/)?.[1]?.trim()).filter((x): x is string => !!x);
/** `← source.md#L3`, `← docs/design.md#3.4`: the link of a bullet back to the person's text. */
const linksOf = (line: string): string[] => [...line.matchAll(/←\s*([^\s,;()]+#[^\s,;()]+)/g)].map((m) => m[1]);

/**
 * "All linked?", the part that starts at the person's lines. Every detail the note took from the person's text is
 * still in the full spec, with its link, and names the record that makes it true, or says why none does:
 * `- separator: semicolon ← source.md#L5 (you) → REQ-007-002` or `… → no record: the page has it already`.
 * The text itself, source.md, is as it was on the base branch: nobody rewrites what the person said.
 */
export function lineFindings(home: string, feature: Feature, base: string | null): Finding[] {
  const out: Finding[] = [];
  const path = `${feature.dir}/${SPEC_FILE}`;
  if (!fileExists(join(home, path))) return out;
  const sections = sectionBodies(readText(join(home, path)));
  const ids = new Set((feature.requirements?.requirements ?? []).map((r) => r.id));
  const fix = 'End the line with `→ REQ-…` (the record that makes it true), or with `→ no record: <why>`.';
  const have = new Set<string>();
  for (const name of GIVEN_SECTIONS) {
    for (const b of bullets(sections.get(name) ?? '')) {
      for (const l of linksOf(b)) have.add(l);
      // What a closed spec built already needs no record here.
      if (/\[built[:\]]/.test(b)) continue;
      const arrow = b.split('→').slice(1).join('→').trim();
      const short = b.length > 90 ? `${b.slice(0, 89)}…` : b;
      if (!arrow) out.push({ ...err('PLAN-LINE', `${path}: this line of yours has no record and no reason: "${short}"`, fix, path) });
      else if (/^no record\b/i.test(arrow)) {
        if (!arrow.replace(/^no record:?/i, '').trim()) out.push(err('PLAN-LINE', `${path}: "${short}" says no record, and not why`, fix, path));
      } else {
        const named = arrow.match(/REQ-[A-Z0-9-]+/g) ?? [];
        if (!named.length) out.push(err('PLAN-LINE', `${path}: "${short}" names no record after the arrow`, fix, path));
        for (const id of named) if (!ids.has(id)) out.push(err('PLAN-LINE', `${path}: "${short}" names ${id}, which is not in requirements.yaml`, 'Name a record that exists, or write the record.', path));
      }
    }
  }
  if (base) {
    const note = showAtRef(home, base, path);
    if (note) {
      const was = sectionBodies(note);
      for (const name of GIVEN_SECTIONS) for (const b of bullets(was.get(name) ?? '')) for (const l of linksOf(b)) if (!have.has(l)) out.push(err('PLAN-LINE-LOST', `${path}: the note had a line for ${l}, and the full spec has none: "${b.length > 90 ? `${b.slice(0, 89)}…` : b}"`, 'Put the line back. A line of the person changes only with their answer, and it keeps its link.', path));
    }
    const source = `${feature.dir}/source.md`;
    const before = showAtRef(home, base, source);
    if (before !== null && fileExists(join(home, source)) && before !== readText(join(home, source))) out.push(err('PLAN-SOURCE', `${source} is not as the person gave it`, `Nobody rewrites the person's text: \`git checkout ${base} -- ${source}\`. A change of mind goes into spec.md, marked (you).`, source));
  }
  return out;
}

/** Everything that keeps a plan from being stamped: a broken file, a missing file, an open question, a claim with no task or no test, a line of the person with no record. */
function planFindings(home: string, dir: string, base: string | null): { findings: Finding[]; feature: Feature; config: Config; warnings: Finding[] } {
  const check = runCheck(home, [dir]);
  const feature = check.features[0];
  const findings: Finding[] = check.findings.filter((f) => f.severity === 'error' || f.severity === 'gap');
  const part = (file: string, by: string): Finding => err('PLAN-MISSING', `${feature.dir} has no ${file}`, `${by} writes it: the part ${file === 'requirements.yaml' ? 'records.md' : 'tasks.md'} of /spex:plan.`, feature.dir);
  if (!feature.errors.length) {
    if (!feature.requirements) findings.push(part('requirements.yaml', 'The analyst'));
    if (!feature.tasks) findings.push(part('tasks.yaml', 'The planner'));
    if (!feature.tests) findings.push(part('tests.yaml', 'The test analyst'));
  }
  for (const q of feature.requirements?.questions ?? []) if (!q.answer) findings.push(err('PLAN-QUESTION', `${q.id} is open: ${q.ask}`, 'The part clarify.md of /spex:plan: the person answers it, or the decider in auto mode.', feature.requirementsPath));
  for (const u of feature.requirements?.unknowns ?? []) if (!u.decision) findings.push(err('PLAN-UNKNOWN', `${u.id} has no decision: ${u.ask}`, 'The part research.md of /spex:plan: one researcher gets the fact.', feature.requirementsPath));
  findings.push(...lineFindings(home, feature, base));
  return { findings, feature, config: check.config, warnings: check.findings.filter((f) => f.severity === 'warning') };
}

/** draft → approved for every record: implement started, so the plan is approved. Returns how many it flipped. */
function approveRecords(home: string, feature: Feature): number {
  if (!feature.requirements) return 0;
  const doc = openDocument(join(home, feature.requirementsPath));
  let n = 0;
  feature.requirements.requirements.forEach((r, i) => {
    if (r.status !== 'draft') return;
    doc.setIn(['requirements', i, 'status'], 'approved');
    n++;
  });
  if (n) saveDocument(join(home, feature.requirementsPath), doc);
  return n;
}

const entryLine = (c: Correction): string => `${c.id} · ${c.title}${c.open ? ' (open)' : ''}`;

interface Located {
  main: string;
  spec: ListedSpec;
  list: ListedSpec[];
}

function locate(root: string, given: string): Located | CmdResult {
  const main = mainRoot(root);
  if (!isGitRepo(main)) return refuse([err('GIT-REQUIRED', 'a phase needs a git repository: the spec works on its own branch, in its own worktree', 'Run inside the repository.')], 2);
  const list = specList(root);
  const spec = findSpec(root, given);
  if (!spec) return refuse([err('SPEC-UNKNOWN', `${given} is no spec folder under specs/`, list.length ? `The list: ${list.map((s) => `${s.name} (${stateWord(s.state)})`).join(', ')}.` : 'An idea starts with /spex:new: it writes the notes.')], 2);
  return { main, spec, list };
}

const isResult = (x: Located | CmdResult): x is CmdResult => 'exit' in x;

/** The worktree lines every start prints: where the session works, and what the first start there did. */
function worktreeLines(home: string, spec: ListedSpec, entered: Entered): string[] {
  const lines = [`worktree: ${home} · branch ${branchOf(spec.name)}${entered.setup.first ? ' · the first start here' : ''}`];
  if (entered.moved.length) lines.push(`the base came in (fast-forward): ${entered.moved.join(', ')}`);
  const ran = entered.setup.ran;
  if (ran) lines.push(`setup: \`${ran.cmd}\` ${ran.ok ? 'ran' : `FAILED\n${ran.tail.slice(-800)}`}`);
  else if (!entered.setup.first) lines.push('setup: ran at the first start here');
  return lines;
}

const setupFinding = (e: Entered): Finding[] => (e.setup.ran && !e.setup.ran.ok ? [{ severity: 'warning', code: 'WORKTREE-SETUP', message: `worktree.setup failed in this worktree: ${e.setup.ran.cmd}`, fix: 'Fix the command in .spex/config.yaml and run it one time by hand in the worktree. The phase goes on.' }] : []);

interface Entered {
  home: string;
  setup: SetupResult;
  moved: string[];
}

/**
 * The session is in the worktree of the spec (GATE-ENTER passed). On the first start here, the gates of the base
 * branch run (GATE-COMMIT, GATE-PUSH), the base comes in when the branch has no work of its own, and worktree.setup
 * runs one time. A later start finds the record and skips all three.
 */
function enter(root: string, main: string, spec: ListedSpec, config: Config, base: string, phase: 'plan' | 'implement' | 'review'): Entered | CmdResult {
  const home = toplevel(root);
  const first = !fileExists(join(home, SETUP_RECORD_PATH));
  let moved: string[] = [];
  if (first) {
    const gate = commitGate(main, spec, base, phase);
    if (gate) return gate;
    moved = catchUp(home, base);
    if (!fileExists(join(home, spec.dir, SPEC_FILE))) return refuse([err('WORKTREE-BEHIND', `this worktree has no ${spec.dir}: it started from a commit before the note`, `Bring ${base} in: \`git merge ${base}\` in this worktree. Then type /spex:${phase} ${spec.dir} again.`, spec.dir)]);
  }
  const setup = setupOnce(home, config, (cwd, cmd) => {
    const out = runCommands(cwd, [cmd], config.limits.verify_minutes);
    return { ok: out.ok, tail: out.results[0]?.tail ?? '' };
  });
  return { home, setup, moved };
}

const isEntered = (x: Entered | CmdResult): x is Entered => 'setup' in x;

/** The one-spec-at-a-time gate of plan: every spec with a lower number is closed, and no other spec is open. */
function turnFindings(spec: ListedSpec, list: ListedSpec[]): Finding[] {
  const earlier = list.filter((s) => s.number < spec.number && !isClosed(s.state));
  if (earlier.length) {
    const first = earlier[0];
    const n = commandFor(first);
    return [err('GATE-TURN', `${spec.name} waits: ${first.name} comes first, and it is ${stateWord(first.state)}`, `One spec is open at a time, in the order of the numbers. Type: ${n.command}`, spec.dir)];
  }
  const other = list.find((s) => s.dir !== spec.dir && s.state && !isClosed(s.state));
  if (other) return [err('GATE-OPEN', `${other.name} is open (${stateWord(other.state)})`, `One spec is open at a time. Type: ${commandFor(other).command}`, spec.dir)];
  return [];
}

/**
 * A worktree gets only what is committed. Before a start makes one, the folder of the spec and the config are on the
 * base branch: a note that is not there would not be in the worktree, and a config that is not there would be read as
 * the defaults (no close.cmd, no drivers), with no word about it. After `spex update` the same holds for the
 * migrated files of a spec in flight.
 */
function commitGate(main: string, spec: ListedSpec, base: string, phase: 'plan' | 'implement' | 'review'): CmdResult | null {
  if (!isGitRepo(main)) return null;
  const loose = dirty(main, [spec.dir, CONFIG_PATH]);
  if (loose.length) return refuse([err('GATE-COMMIT', `${loose.length} file(s) the worktree needs are not committed on ${base}: ${loose.slice(0, 6).join(', ')}${loose.length > 6 ? ', …' : ''}`, `Commit them on ${base}, then type /spex:${phase} ${spec.dir} again.${phase === 'plan' ? ' With commit: true in .spex/config.yaml, /spex:new commits its notes itself.' : ''}`, spec.dir)], 6, { uncommitted: loose });
  if (!git(main, ['rev-parse', '--verify', '--quiet', 'HEAD'], { allowFail: true }).trim()) return refuse([err('GATE-COMMIT', 'the repository has no commit yet', 'Commit the notes first: a worktree starts from a commit.')]);
  // With a merge command and a remote: the branch of the spec starts from what the remote has, so its request holds
  // the work of the spec and nothing else.
  const u = unpushed(main, loadConfig(main).config);
  if (u?.count) return refuse([err('GATE-PUSH', `${u.base} has ${u.count} commit(s) that ${u.upstream} does not have`, `${pushFix(u)} Then type /spex:${phase} ${spec.dir} again.`, spec.dir)], 6, { unpushed: u.count });
  return null;
}

function startPlan(root: string, given: string): CmdResult {
  const at = locate(root, given);
  if (isResult(at)) return at;
  const { main, spec, list } = at;
  if (isClosed(spec.state)) return refuse([err('GATE-CLOSED', `${spec.name} is closed${spec.worktree || spec.branch ? ' on its branch' : ' and merged'}`, spec.worktree || spec.branch ? `Type /spex:review ${spec.dir}: it finishes the merge.` : 'A closed spec is never planned again. A new spec changes it: /spex:new, or /spex:new-bug for a bug.', spec.dir)]);
  const turn = turnFindings(spec, list);
  if (turn.length) return refuse(turn);
  const { config, findings: cf } = loadConfig(main);
  if (hasErrors(cf)) return refuse(cf, 4);
  const base = baseBranch(main, config);
  const gate = enterGate(root, spec.name, spec.dir, 'plan');
  if (gate) return refuse([gate], 6, { dir: spec.dir, branch: branchOf(spec.name) });
  const wt = enter(root, main, spec, config, base, 'plan');
  if (!isEntered(wt)) return wt;
  const home = wt.home;
  const was = readState(home, spec.dir);
  writeState(home, spec.dir, { command: 'plan', state: 'started' });
  // A note that opens: the note line goes, and the sections of the full spec it lacks are added, empty, with their hints.
  const specPath = join(home, spec.dir, SPEC_FILE);
  if (!was && fileExists(specPath)) writeText(specPath, openedNote(readText(specPath)));
  const feature = loadFeature(home, spec.dir);
  const open = openCorrections(home, spec.dir);
  const closed = list.filter((s) => isClosed(s.state)).map((s) => s.name);
  const lines = [`plan started for ${spec.dir} (it was ${stateWord(was)})`, ...worktreeLines(home, spec, wt)];
  lines.push(`on disk: spec.md${fileExists(join(home, spec.dir, 'source.md')) ? ', source.md' : ''}${feature.requirements ? ', requirements.yaml' : ''}${feature.tasks ? ', tasks.yaml' : ''}${feature.tests ? ', tests.yaml' : ''}`);
  lines.push(closed.length ? `closed before it: ${closed.join(', ')} (fit.md reads what they built: SPEX show ${spec.dir} --inherited)` : 'closed before it: none (the note is checked against the code alone)');
  if (open.length) lines.push(`open in corrections.md: ${open.map(entryLine).join('; ')}`);
  return { ok: true, findings: [...cf, ...setupFinding(wt)], exit: 0, text: lines.join('\n'), data: { phase: 'plan', dir: spec.dir, worktree: home, branch: branchOf(spec.name), base, first: wt.setup.first, setup: wt.setup.ran, was, state: { command: 'plan', state: 'started' }, again: !!feature.requirements, closed, corrections: open.map((c) => c.id) } };
}

function endPlan(root: string, given: string): CmdResult {
  const at = locate(root, given);
  if (isResult(at)) return at;
  const { main, spec } = at;
  const state = spec.state;
  if (!spec.worktree || !state || state.command !== 'plan') return refuse([err('PHASE-NOT-STARTED', `plan is not started for ${spec.name} (it is ${stateWord(state)})`, `Type /spex:plan ${spec.dir}.`, spec.dir)]);
  const home = spec.home;
  const base = baseBranch(main, loadConfig(home).config);
  const { findings, feature, warnings } = planFindings(home, spec.dir, base);
  if (findings.length) return refuse(findings, hasErrors(findings) ? 6 : 5, { tries: 'At most 3 tries of this check in one run: then the run stops and names the gap.' });
  stampPlan(home, loadFeature(home, spec.dir));
  const closed = closeCorrections(home, spec.dir, [], 'the script stamped the plan');
  writeState(home, spec.dir, { command: 'plan', state: 'done' });
  const c = commitPaths(home, `${spec.name}: plan`);
  if (!c.ok) return refuse([err('PHASE-COMMIT', `git commit failed on ${branchOf(spec.name)}`, `Fix git (an identity, a hook), then run \`spex end plan ${spec.dir}\` again. Tail: ${c.tail.trim().slice(-300)}`)], 7);
  const reqs = feature.requirements!;
  const tests = feature.tests!.tests;
  const q = reqs.questions ?? [];
  const needs = [...new Set(tests.flatMap((t) => t.needs ?? []))];
  const lines = [
    `plan done for ${spec.dir}: ${reqs.requirements.length} record(s) · ${feature.tasks!.tasks.length} task(s) · ${tests.length} test(s) (${tests.filter(isSession).length} in a real app)`,
    `answers: you ${q.filter((x) => x.by === 'human').length} · an agent ${q.filter((x) => x.by === 'agent').length} · the pick, nobody asked ${q.filter((x) => x.by === 'default').length}`,
    `the tests need: ${needs.length ? needs.join(', ') : 'nothing from you'}`,
    `stamped: spec.md, requirements.yaml, tasks.yaml, tests.yaml${closed.length ? ` · closed ${closed.join(', ')}` : ''}`,
    c.committed ? `committed on ${branchOf(spec.name)}: ${spec.name}: plan` : 'nothing new to commit',
    renderNext({ command: `/spex:implement ${spec.dir}`, why: ['Typing it approves the plan. To say no, type /spex:comment with your words first.'], spec: spec.dir }),
  ];
  return { ok: true, findings: warnings, exit: 0, text: lines.join('\n'), data: { phase: 'plan', dir: spec.dir, state: { command: 'plan', state: 'done' }, records: reqs.requirements.length, tasks: feature.tasks!.tasks.length, tests: tests.length, needs, committed: c.committed } };
}

/** The needs of every test, and the environment: what only the person can give is named before any code is written. */
function needFindings(home: string, config: Config, feature: Feature): Finding[] {
  const out: Finding[] = [];
  for (const t of feature.tests?.tests ?? []) out.push(...needsFindings(home, t.needs, t.id));
  const up = config.env?.up?.trim();
  if (up) {
    const res = runCommands(home, [up], config.limits.verify_minutes);
    if (!res.ok) out.push(err('ENV-UP', `the environment does not start: \`${up}\` exited ${res.results[0]?.exit}`, `Only you can give this: start it, or fix the script. Then type the command again. Tail: ${(res.results[0]?.tail ?? '').trim().slice(-400)}`));
  }
  return out;
}

function startImplement(root: string, given: string): CmdResult {
  const at = locate(root, given);
  if (isResult(at)) return at;
  const { main } = at;
  if (isClosed(at.spec.state)) return refuse([err('GATE-CLOSED', `${at.spec.name} is closed`, at.spec.worktree || at.spec.branch ? `Type /spex:review ${at.spec.dir}: it finishes the merge.` : 'A closed spec is never built again. A new spec changes it.', at.spec.dir)]);
  const config0 = loadConfig(main).config;
  const gate = enterGate(root, at.spec.name, at.spec.dir, 'implement');
  if (gate) return refuse([gate], 6, { dir: at.spec.dir, branch: branchOf(at.spec.name) });
  const wt = enter(root, main, at.spec, config0, baseBranch(main, config0), 'implement');
  if (!isEntered(wt)) return wt;
  // The first start may have brought the base in: the spec is read again, from this worktree.
  const spec = findSpec(root, given) ?? at.spec;
  const s = spec.state;
  if (!s || (s.command === 'plan' && s.state === 'started')) return refuse([err('GATE-PLAN', `${spec.name} has no finished plan (it is ${stateWord(s)})`, `Type /spex:plan ${spec.dir}.`, spec.dir)]);
  if (isClosed(s)) return refuse([err('GATE-CLOSED', `${spec.name} is closed`, `Type /spex:review ${spec.dir}: it finishes the merge.`, spec.dir)]);
  const home = wt.home;
  const check = runCheck(home, [spec.dir]);
  const feature = check.features[0];
  const config = check.config;
  const open = openCorrections(home, spec.dir);
  const lines: string[] = [];
  const data: Record<string, unknown> = { phase: 'implement', dir: spec.dir, worktree: home, branch: branchOf(spec.name), was: s };
  if (open.length) {
    // The process began a correction and the chat ended before the stamp: not a change by hand. The run finishes it.
    writeState(home, spec.dir, { command: 'implement', state: 'started' });
    if (feature.requirements) startVerifyRun(home, feature.requirements.feature);
    lines.push(`implement started for ${spec.dir} (it was ${stateWord(s)})`, ...worktreeLines(home, spec, wt), `a correction is not finished: ${open.map(entryLine).join('; ')}`, 'finish it first (the part wrong.md): the plan follows the spec, then `spex stamp` closes the entry', ...yesLines(home, feature));
    return { ok: true, findings: [...check.findings.filter((f) => f.severity !== 'info'), ...setupFinding(wt)], exit: 0, text: lines.join('\n'), data: { ...data, resume: open.map((c) => c.id), state: { command: 'implement', state: 'started' } } };
  }
  if (hasErrors(check.findings)) return refuse(check.findings.filter((f) => f.severity === 'error'), 4, data);
  if (!feature.requirements || !feature.tasks || !feature.tests) return refuse([err('GATE-PLAN', `${spec.dir} has no full plan on disk`, `Type /spex:plan ${spec.dir}.`, spec.dir)], 6, data);
  const changed = planChanged(home, feature);
  if (changed.length) return refuse([err('GATE-PLAN-CHANGED', `changed by hand since the plan was stamped: ${changed.join(', ')}`, `Type /spex:plan ${spec.dir}: it checks the files and stamps them again. To say in words what must change, type /spex:comment.`, spec.dir)], 6, { ...data, changed });
  const approved = approveRecords(home, feature);
  writeState(home, spec.dir, { command: 'implement', state: 'started' });
  startVerifyRun(home, feature.requirements.feature);
  const needs = needFindings(home, config, feature);
  const tasks = feature.tasks.tasks;
  lines.push(`implement started for ${spec.dir} (it was ${stateWord(s)})`, ...worktreeLines(home, spec, wt));
  lines.push(`the plan is as it was stamped${approved ? `: ${approved} record(s) approved` : ''}`);
  lines.push(`tasks: ${tasks.filter((t) => t.status === 'done').length} done, ${tasks.filter((t) => t.status === 'todo').length} todo, ${tasks.filter((t) => t.status === 'blocked').length} blocked · tests: ${feature.tests.tests.length} (${feature.tests.tests.filter(isSession).length} in a real app)`);
  if (needs.length) return { ok: false, findings: needs, exit: 6, text: [...lines, `${needs.length} need(s) not met: only you can give them, then type /spex:implement ${spec.dir} again`].join('\n'), data: { ...data, needs: needs.map((n) => n.message), state: { command: 'implement', state: 'started' } } };
  lines.push(`every need is met${config.env?.up ? ' and the environment is up' : ''}`, ...yesLines(home, feature));
  return { ok: true, findings: [...check.findings.filter((f) => f.severity === 'warning'), ...setupFinding(wt)], exit: 0, text: lines.join('\n'), data: { ...data, approved, state: { command: 'implement', state: 'started' } } };
}

function endImplement(root: string, given: string): CmdResult {
  const at = locate(root, given);
  if (isResult(at)) return at;
  const { spec } = at;
  const s = spec.state;
  if (!spec.worktree || !s || s.command !== 'implement') return refuse([err('PHASE-NOT-STARTED', `implement is not started for ${spec.name} (it is ${stateWord(s)})`, `Type /spex:implement ${spec.dir}.`, spec.dir)]);
  const home = spec.home;
  const check = runCheck(home, [spec.dir]);
  if (hasErrors(check.findings)) return refuse(check.findings.filter((f) => f.severity === 'error'), 4);
  const feature = check.features[0];
  const findings: Finding[] = [];
  for (const t of feature.tasks?.tasks ?? []) if (t.status !== 'done') findings.push(err('GATE-TASKS', `${t.id} is ${t.status}`, 'A task is done when the script sees its tests green: `spex done`. A task that stays red goes to the decider.', feature.tasksPath));
  const changed = planChanged(home, feature);
  if (changed.length) findings.push(err('GATE-PLAN-CHANGED', `not stamped: ${changed.join(', ')}`, `A change the process made is stamped with \`spex stamp ${spec.dir}\`.`, spec.dir));
  if (!findings.length && !verifyIsCurrent(home, check.config, feature)) findings.push(err('GATE-VERIFY', 'the proof of the whole spec is missing, red, or from another tree', `The part prove.md: \`spex verify ${spec.dir}\` green, and every session passed, on this tree.`, spec.dir));
  if (findings.length) return refuse(findings);
  const closed = closeCorrections(home, spec.dir, [], 'every test is green');
  writeState(home, spec.dir, { command: 'implement', state: 'done' });
  const c = commitPaths(home, `${spec.name}: implement`);
  if (!c.ok) return refuse([err('PHASE-COMMIT', `git commit failed on ${branchOf(spec.name)}`, `Fix git (an identity, a hook), then run \`spex end implement ${spec.dir}\` again. Tail: ${c.tail.trim().slice(-300)}`)], 7);
  const v = readVerify(home, feature.requirements?.feature ?? feature.name);
  const all = readCorrections(home, spec.dir);
  const tasks = feature.tasks?.tasks ?? [];
  const lines = [
    `implement done for ${spec.dir}: ${tasks.length} of ${tasks.length} task(s) · ${v ? `${v.scripts.length} script(s) green · ${v.sessions.length} session(s) passed · round ${v.round} of ${check.config.verify_rounds}` : 'proved'}`,
    all.length ? `fixed on the way (corrections.md):\n${all.map((x) => `  ${entryLine(x)}`).join('\n')}` : 'fixed on the way: nothing',
    c.committed ? `committed on ${branchOf(spec.name)}: ${spec.name}: implement${closed.length ? ` · closed ${closed.join(', ')}` : ''}` : 'nothing new to commit',
    renderNext({ command: `/spex:review ${spec.dir}`, why: ['Typing it approves what implement changed. To say no, type /spex:comment with your words first.'], spec: spec.dir }),
  ];
  return { ok: true, findings: check.findings.filter((f) => f.severity === 'warning'), exit: 0, text: lines.join('\n'), data: { phase: 'implement', dir: spec.dir, state: { command: 'implement', state: 'done' }, tasks: tasks.length, round: v?.round ?? null, corrections: all.map((x) => x.id), committed: c.committed } };
}

function startReview(root: string, given: string): CmdResult {
  const at = locate(root, given);
  if (isResult(at)) return at;
  const { main } = at;
  if (isClosed(at.spec.state) && !at.spec.worktree && !at.spec.branch) return refuse([err('GATE-CLOSED', `${at.spec.name} is closed and merged`, 'Nothing is left to do for it.', at.spec.dir)]);
  // The one start that belongs in the main folder: the spec is closed on its branch, and what is left of the close
  // (the pull, a local merge, the removal of the worktree and the branch) changes the main folder. It makes nothing.
  if (isClosed(at.spec.state) && !inWorktree(root)) {
    const spec = at.spec;
    const s = spec.state;
    return { ok: true, findings: [], exit: 0, text: [`${spec.dir} is closed on its branch; the close is not finished`, `main folder: ${main}`, `go on with the part close.md: \`spex close ${spec.dir} finish\``].join('\n'), data: { phase: 'review', dir: spec.dir, branch: branchOf(spec.name), was: s, closing: true, step: 'finish', state: s } };
  }
  const config0 = loadConfig(main).config;
  const gate = enterGate(root, at.spec.name, at.spec.dir, 'review');
  if (gate) return refuse([gate], 6, { dir: at.spec.dir, branch: branchOf(at.spec.name) });
  const wt = enter(root, main, at.spec, config0, baseBranch(main, config0), 'review');
  if (!isEntered(wt)) return wt;
  const spec = findSpec(root, given) ?? at.spec;
  const s = spec.state;
  const built = !!s && ((s.command === 'implement' && s.state === 'done') || s.command === 'review');
  if (!built) return refuse([err('GATE-BUILT', `${spec.name} is not built (it is ${stateWord(s)})`, `Implement it first. Type: ${commandFor(spec).command}`, spec.dir)]);
  const home = wt.home;
  const data: Record<string, unknown> = { phase: 'review', dir: spec.dir, worktree: home, branch: branchOf(spec.name), was: s };
  if (isClosed(s)) {
    // The close wrote `review, done` and the merge or the removal did not finish: each box finds its work done.
    return { ok: true, findings: [], exit: 0, text: [`${spec.dir} is closed on its branch; the close is not finished`, ...worktreeLines(home, spec, wt), `go on with the part close.md: \`spex close ${spec.dir} merge\``].join('\n'), data: { ...data, closing: true, step: 'merge', state: s } };
  }
  const check = runCheck(home, [spec.dir]);
  if (hasErrors(check.findings)) return refuse(check.findings.filter((f) => f.severity === 'error'), 4, data);
  const feature = check.features[0];
  const findings: Finding[] = [];
  for (const t of feature.tasks?.tasks ?? []) if (t.status !== 'done') findings.push(err('GATE-TASKS', `${t.id} is ${t.status}`, `Type /spex:implement ${spec.dir}.`, feature.tasksPath));
  if (!findings.length && !verifyIsCurrent(home, check.config, feature)) findings.push(err('GATE-VERIFY', 'the proof of the whole spec is missing, red, or from another tree', `Type /spex:implement ${spec.dir}: it proves the spec on this tree.`, spec.dir));
  if (findings.length) return refuse(findings, 6, data);
  writeState(home, spec.dir, { command: 'review', state: 'started' });
  const all = readCorrections(home, spec.dir);
  const lines = [`review started for ${spec.dir} (it was ${stateWord(s)})`, ...worktreeLines(home, spec, wt), `every task is done and every test is green on this tree`, all.length ? `corrections.md: ${all.map(entryLine).join('; ')}` : 'corrections.md: no entry'];
  // A round the reviewers wrote and nobody answered: it is shown again, never reviewed again.
  const waits = feature.requirements ? pendingRound(home, feature.requirements.feature) : null;
  if (waits) lines.push(`round ${waits.round} waits for its answer: ${waits.path}${waits.errors.length ? ' (the file does not pass its schema: repair it by the fix text of `spex review accept`)' : ''}`, 'print its list again, and stop: no reviewer runs');
  return { ok: true, findings: [...check.findings.filter((f) => f.severity === 'warning'), ...setupFinding(wt)], exit: 0, text: lines.join('\n'), data: { ...data, corrections: all.map((c) => c.id), waits: waits ? { round: waits.round, path: waits.path } : null, state: { command: 'review', state: 'started' } } };
}

export function start(root: string, phase: string, given: string): CmdResult {
  if (phase === 'plan') return startPlan(root, given);
  if (phase === 'implement') return startImplement(root, given);
  if (phase === 'review') return startReview(root, given);
  return refuse([err('USAGE', `unknown phase ${phase}`, 'spex start <plan|implement|review> <dir>')], 2);
}

export function end(root: string, phase: string, given: string): CmdResult {
  if (phase === 'plan') return endPlan(root, given);
  if (phase === 'implement') return endImplement(root, given);
  if (phase === 'review') return refuse([err('USAGE', 'review ends with the close', `\`spex close ${given} built\` writes review, done and commits; see the part close.md.`)], 2);
  return refuse([err('USAGE', `unknown phase ${phase}`, 'spex end <plan|implement> <dir>')], 2);
}

/**
 * `spex stamp <dir> [--close C3]`: the process changed the plan (a corrected spec, a new task, a comment), so the
 * script checks the links again, stamps the files, and closes the entry in corrections.md. No approval is lost, and
 * implement does not send the person back to plan. After implement started, a new record is approved by the stamp:
 * a small change needs no person, and a big one had the person's answer. A spec that was built goes back to
 * `implement, started`, because the code must follow.
 */
export function stamp(root: string, given: string, opts: { close?: string[]; changed?: string } = {}): CmdResult {
  const at = locate(root, given);
  if (isResult(at)) return at;
  const { main, spec } = at;
  const s = spec.state;
  if (!spec.worktree || !s) return refuse([err('PHASE-NOT-STARTED', `${spec.name} is ${stateWord(s)}: nothing to stamp`, `A note is planned first: /spex:plan ${spec.dir}.`, spec.dir)]);
  if (isClosed(s)) return refuse([err('GATE-CLOSED', `${spec.name} is closed`, 'A closed spec is never changed. A new spec changes it.', spec.dir)]);
  const home = spec.home;
  const before = loadFeature(home, spec.dir);
  const planned = !!before.tasks && !!before.tests;
  let next: SpecState = s;
  const lines: string[] = [];
  if (planned) {
    const base = baseBranch(main, loadConfig(home).config);
    const { findings } = planFindings(home, spec.dir, base);
    if (findings.length) return refuse(findings, hasErrors(findings) ? 6 : 5, { tries: 'At most 3 tries of this check in one run: then the run stops and names the gap.' });
    stampPlan(home, loadFeature(home, spec.dir));
    lines.push(`stamped: spec.md, requirements.yaml, tasks.yaml, tests.yaml of ${spec.dir}`);
    if (s.command !== 'plan') {
      const n = approveRecords(home, loadFeature(home, spec.dir));
      if (n) lines.push(`${n} new record(s) approved`);
      const todo = loadFeature(home, spec.dir).tasks!.tasks.some((t) => t.status !== 'done');
      if (todo && !(s.command === 'implement' && s.state === 'started')) {
        next = { command: 'implement', state: 'started' };
        writeState(home, spec.dir, next);
        lines.push(`state: implement, started (it was ${stateWord(s)}): the code must follow the plan`);
      }
    }
  } else {
    // No plan yet: there is nothing to stamp. The spec keeps the change, and plan writes the rest when it runs again.
    if (s.command === 'plan' && s.state === 'done') writeState(home, spec.dir, (next = { command: 'plan', state: 'started' }));
    lines.push(`no plan on disk yet for ${spec.dir}: nothing to stamp; plan writes the tasks and the tests when it runs again`);
  }
  // Only the entries that are named: an entry of another correction stays open until its own fix is done.
  const closed = !opts.close?.length ? [] : closeCorrections(home, spec.dir, opts.close, planned ? 'the script stamped the changed plan' : 'the spec has it; plan follows when it runs again', opts.changed ? { Changed: opts.changed } : {});
  if (closed.length) lines.push(`closed in corrections.md: ${closed.join(', ')}`);
  const title = readCorrections(home, spec.dir).find((c) => closed.includes(c.id))?.title ?? 'the plan follows a correction';
  const c = commitPaths(home, `${spec.name}: ${title}`, [spec.dir]);
  if (!c.ok) return refuse([err('PHASE-COMMIT', `git commit failed on ${branchOf(spec.name)}`, `Fix git, then run the command again. Tail: ${c.tail.trim().slice(-300)}`)], 7);
  lines.push(c.committed ? `committed on ${branchOf(spec.name)}: ${spec.name}: ${title}` : 'nothing new to commit');
  return { ok: true, findings: [], exit: 0, text: lines.join('\n'), data: { dir: spec.dir, stamped: planned, closed, state: next, committed: c.committed } };
}

