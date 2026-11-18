// The close: the second half of review. A clean review closes the spec with no extra word. The steps run in this
// order, each one a call of `spex close <dir> <step>`, because an agent works between some of them:
//
//   sync    the base branch moved (a teammate merged, or new, new-bug or delete wrote notes): merge it into the
//           branch of the spec. A conflict is a cause for a developer to fix, not a question for the person.
//   later   the notes with a higher number: what an agent reads to correct them from what this spec learned.
//   prove   the code changed since the proof of implement? Then the proof runs again. Only notes changed: it holds.
//   built   the records → built, `review, done` in status.yaml, one commit on the branch of the spec.
//   merge   close.cmd pushes, opens the request and merges it. No command, or the forge wants a person: the run waits.
//   finish  in a session on the main folder, after the session in the worktree ended: pull the base branch, the
//           merge of close.cmd local, stop the environment, remove the worktree and the branch.
//
// From inside the worktree no step may write the main folder: Claude Code, the sandbox and the guard hook refuse it.
// git that only moves refs of the shared .git (a fetch, a commit on the branch of the spec, a push) works there, so
// sync to merge run in the worktree, and close.cmd merges through the forge. finish is the one step that changes the
// main folder, so it runs in a session there: /spex:review typed on the main folder goes straight to it.
//
// A spec is closed when the commit of `built` is on the base branch. So review typed again after a merge by a person
// finds every step done, and `finish` sees in git that the branch is merged.

import { join } from 'node:path';
import { hasErrors, runCheck } from '../check.js';
import { loadConfig } from '../config.js';
import { closeCorrections, readCorrections } from '../corrections.js';
import { codeId, commitPaths, currentBranch, git, gitTry, refExists, showAtRef } from '../git.js';
import { fileExists, openDocument, saveDocument, writeText } from '../io.js';
import { nextFor, renderNext } from '../next.js';
import { featureRepos, readShipped, repoFindings, repoPath, repoRoot, writeShipped } from '../repos.js';
import { pendingRound } from '../review.js';
import { featureDirs, loadFeature } from '../specs.js';
import { STATUS_FILE, findSpec, isClosed, readState, specList, stateWord, writeState, type ListedSpec } from '../state.js';
import type { Config, Feature, Finding } from '../types.js';
import { currentTree, readVerify, runCommands, verifyEvidencePath, verifyIsCurrent } from '../verify.js';
import { planChanged } from '../approvals.js';
import { baseBranch, branchOf, inWorktree, mainRoot, pushFix, removeWorktree, unpushed } from '../worktree.js';
import type { CmdResult } from './lifecycle.js';
import { parse } from 'yaml';

export const CLOSE_STEPS = ['sync', 'later', 'prove', 'built', 'merge', 'finish'] as const;
export type CloseStep = (typeof CLOSE_STEPS)[number];

const refuse = (findings: Finding[], exit = 6, text = '', data: Record<string, unknown> = {}): CmdResult => ({ ok: false, findings, exit, text, data });
const err = (code: string, message: string, fix: string, path?: string): Finding => ({ severity: 'error', code, message, fix, ...(path ? { path } : {}) });

/** `local` as close.cmd: no forge. The script merges the branch into the base branch itself, in the main folder, at `finish`: the one step that runs in a session there. */
export const LOCAL_MERGE = 'local';

/** approved → built, and the records this spec supersedes → retired, in their own files. The answers no person gave are listed. */
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

/** The refs the base branch has: the local one, and the one of the remote when there is one. A fetch that fails (no network) is no error. */
function baseRefs(home: string, base: string): string[] {
  const remote = git(home, ['remote'], { allowFail: true }).split('\n').map((s) => s.trim()).filter(Boolean)[0];
  if (remote) gitTry(home, ['fetch', '--quiet', remote, base]);
  return [base, ...(remote && refExists(home, `refs/remotes/${remote}/${base}`) ? [`${remote}/${base}`] : [])].filter((r) => refExists(home, r));
}

const behind = (home: string, ref: string): number => Number(git(home, ['rev-list', '--count', `HEAD..${ref}`], { allowFail: true }).trim() || 0);
const unmerged = (home: string): string[] => git(home, ['diff', '--name-only', '--diff-filter=U'], { allowFail: true }).split('\n').map((s) => s.trim()).filter(Boolean);
const merging = (home: string): boolean => !!git(home, ['rev-parse', '--verify', '--quiet', 'MERGE_HEAD'], { allowFail: true }).trim();

/** The spec is on the base branch as closed: the commit of `built` got there, by a merge of any kind (also a squash). */
function mergedOn(home: string, ref: string, dir: string): boolean {
  const text = showAtRef(home, ref, `${dir}/${STATUS_FILE}`);
  if (!text) return false;
  try {
    const d = parse(text) as { command?: string; state?: string } | null;
    return d?.command === 'review' && d?.state === 'done';
  } catch {
    return false;
  }
}

/** With a merge command and a remote, the base branch here has nothing the remote lacks: else the request of the spec carries it. */
function pushGate(home: string, config: Config, spec: ListedSpec, step: string): CmdResult | null {
  const u = unpushed(mainRoot(home), config);
  return u?.count ? refuse([err('GATE-PUSH', `${u.base} has ${u.count} commit(s) that ${u.upstream} does not have`, `${pushFix(u)} Then run \`spex close ${spec.dir} ${step}\` again.`)]) : null;
}

function sync(home: string, config: Config, spec: ListedSpec, base: string): CmdResult {
  const lines: string[] = [];
  const gate = pushGate(home, config, spec, 'sync');
  if (gate) return gate;
  if (merging(home)) {
    const left = unmerged(home);
    if (left.length) return refuse([err('CLOSE-CONFLICT', `the merge of the base branch has ${left.length} file(s) in conflict: ${left.join(', ')}`, 'A developer reads both changes and joins them: both stay. Then `git add` each file, and run this step again: git knows a file is joined only when it is added.')], 7, '', { conflict: left });
    const c = gitTry(home, ['commit', '-q', '--no-edit', '-a']);
    if (!c.ok) return refuse([err('CLOSE-CONFLICT', 'the merge is resolved, and git could not commit it', `Fix git, then run this step again. Output: ${c.out.slice(-300)}`)], 7);
    lines.push('the conflict is resolved: the merge is committed');
  }
  // The work of the spec is committed first, so git can merge.
  const own = commitPaths(home, `${spec.name}: review`);
  if (!own.ok) return refuse([err('PHASE-COMMIT', `git commit failed on ${branchOf(spec.name)}`, `Fix git, then run this step again. Tail: ${own.tail.trim().slice(-300)}`)], 7);
  let moved = 0;
  for (const ref of baseRefs(home, base)) {
    const n = behind(home, ref);
    if (!n) continue;
    moved += n;
    const m = gitTry(home, ['merge', '--no-edit', ref]);
    if (!m.ok) {
      const left = unmerged(home);
      if (left.length) return refuse([err('CLOSE-CONFLICT', `${ref} moved by ${n} commit(s), and ${left.length} file(s) are in conflict: ${left.join(', ')}`, 'A developer reads both changes and joins them: both stay. Then `git add` each file, and run this step again: git knows a file is joined only when it is added.')], 7, lines.join('\n'), { moved, conflict: left });
      return refuse([err('CLOSE-SYNC', `git could not merge ${ref} into ${branchOf(spec.name)}`, `Read the output and fix the cause. Output: ${m.out.slice(-400)}`)], 7);
    }
    lines.push(`${ref} moved by ${n} commit(s): merged into ${branchOf(spec.name)}`);
  }
  if (!moved && !lines.length) lines.push(`the base branch ${base} did not move`);
  return { ok: true, findings: [], exit: 0, text: lines.join('\n'), data: { step: 'sync', moved, conflict: [] } };
}

function later(home: string, spec: ListedSpec, root: string): CmdResult {
  // The later notes are read where the spec is: after `sync` the worktree has them with their current numbers.
  const notes = specList(root).filter((s) => s.number > spec.number && !s.state).map((s) => s.dir).filter((d) => fileExists(join(home, d, 'spec.md')));
  const feature = loadFeature(home, spec.dir);
  const deferred = feature.tasks?.deferred ?? [];
  const entries = readCorrections(home, spec.dir);
  const passed = entries.filter((c) => c.fields.Reaches && !/^no other spec/i.test(c.fields.Reaches));
  const lines: string[] = [];
  if (!notes.length) {
    lines.push('no later spec waits: no agent runs here');
    if (deferred.length) lines.push('deferred, with no later spec to take it (the last reply lists it):', ...deferred.map((d) => `- ${d.severity ? `${d.severity} ` : ''}${d.finding} (${d.by}): ${d.why}`));
    return { ok: true, findings: [], exit: 0, text: lines.join('\n'), data: { step: 'later', notes: [], deferred: deferred.map((d) => d.finding) } };
  }
  lines.push(`${notes.length} later note(s) wait: ${notes.join(', ')}`);
  lines.push(`read: SPEX show ${spec.dir} --lessons · ${spec.dir}/corrections.md (${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}) · the Decisions of ${spec.dir}/spec.md`);
  if (deferred.length) lines.push('deferred findings (a later note that fits gets it, else the last reply lists it):', ...deferred.map((d) => `- ${d.severity ? `${d.severity} ` : ''}${d.finding} (${d.by}): ${d.why}`));
  if (passed.length) lines.push(`passed on already, not again: ${passed.map((c) => `${c.id} → ${c.fields.Reaches}`).join('; ')}`);
  return { ok: true, findings: [], exit: 0, text: lines.join('\n'), data: { step: 'later', notes, deferred: deferred.map((d) => d.finding), passed: passed.map((c) => c.id) } };
}

function prove(home: string, config: Config, feature: Feature): CmdResult {
  const id = feature.requirements?.feature ?? feature.name;
  // The proof is of the plan as it was stamped. A file of the plan that changed since then is no note: the code may
  // not follow it, and no test was planned for it.
  const changed = planChanged(home, feature);
  if (changed.length) return refuse([err('GATE-PLAN-CHANGED', `changed since the plan was stamped: ${changed.join(', ')}`, `A change the process made: \`spex stamp ${feature.dir}\` checks the links and stamps it, and the code follows in implement. A change by hand: /spex:plan ${feature.dir}.`)]);
  if (verifyIsCurrent(home, config, feature)) return { ok: true, findings: [], exit: 0, text: 'still green: the tree is as it was proved', data: { step: 'prove', ran: false, why: 'same tree' } };
  const v = readVerify(home, id);
  if (v?.ok && v.code && v.code === codeId(home) && !featureRepos(config, feature).length) {
    // Only notes changed since the proof (the base brought them, or the close corrected them): the code is as proved.
    writeText(verifyEvidencePath(home, id), JSON.stringify({ ...v, tree: currentTree(home, config, feature) }, null, 2) + '\n');
    return { ok: true, findings: [], exit: 0, text: 'still green: only notes changed since the proof, and no test runs', data: { step: 'prove', ran: false, why: 'only notes changed' } };
  }
  return refuse([err('CLOSE-PROOF', 'the code changed since the proof of implement (the base came in, a conflict, a fix)', `The proof runs again on this tree: the deploy, \`spex verify ${feature.dir}\`, each session. A red test goes to the decider, as in implement. No task is built again. Then run this step again.`)], 7, '', { step: 'prove', ran: true });
}

function built(home: string, config: Config, spec: ListedSpec, feature: Feature): CmdResult {
  const reqs = feature.requirements;
  if (!reqs) return refuse([err('SPEC-MISSING', `${feature.dir} has no requirements.yaml`, `Type /spex:plan ${feature.dir}.`)], 4);
  const lines: string[] = [];
  const findings: Finding[] = [];
  if (isClosed(spec.state)) lines.push(`${spec.dir} is closed already on its branch`);
  else {
    for (const t of feature.tasks?.tasks ?? []) if (t.status !== 'done') findings.push(err('CLOSE-TASKS', `${t.id} is ${t.status}`, `A fix pick is built in implement: /spex:implement ${spec.dir}.`));
    const round = pendingRound(home, reqs.feature);
    if (round) findings.push(err('CLOSE-REVIEW', `review round ${round.round} waits for the person's answer (${round.path})`, 'Show the findings and take the answer: `spex review accept`.'));
    if (!findings.length && !verifyIsCurrent(home, config, feature)) findings.push(err('CLOSE-PROOF', 'the proof is missing, red, or from another tree', `Run \`spex close ${spec.dir} prove\` first.`));
    if (findings.length) return refuse(findings);
    const c = closeFeature(home, feature);
    lines.push(`${c.built} record(s) built in ${feature.requirementsPath}`);
    if (c.retired.length) lines.push(`retired: ${c.retired.join(', ')}`);
    if (c.defaults.length) lines.push('answered by an agent or by the pick, for the last reply:', ...c.defaults.map((d) => `- ${d}`));
    // Every task is done and every test is green, so each fix that was still open is finished.
    const closed = closeCorrections(home, spec.dir, [], 'the close: every task is done and every test is green');
    if (closed.length) lines.push(`closed in corrections.md: ${closed.join(', ')}`);
    writeState(home, spec.dir, { command: 'review', state: 'done' });
  }
  const commit = commitPaths(home, `${spec.name}: closed`);
  if (!commit.ok) return refuse([err('PHASE-COMMIT', `git commit failed on ${branchOf(spec.name)}`, `Fix git, then run this step again. Tail: ${commit.tail.trim().slice(-300)}`)], 7, lines.join('\n'));
  lines.push(commit.committed ? `committed on ${branchOf(spec.name)}: ${spec.name}: closed (state: review, done)` : 'nothing new to commit');
  return { ok: true, findings: [], exit: 0, text: lines.join('\n'), data: { step: 'built', committed: commit.committed } };
}

function merge(home: string, config: Config, spec: ListedSpec, feature: Feature, base: string): CmdResult {
  if (!isClosed(readState(home, spec.dir))) return refuse([err('CLOSE-ORDER', `${spec.name} is not closed on its branch yet`, `Run \`spex close ${spec.dir} built\` first.`)]);
  const gate = pushGate(home, config, spec, 'merge');
  if (gate) return gate;
  const id = feature.requirements?.feature ?? feature.name;
  const lines: string[] = [];
  const env = { SPEX_BRANCH: branchOf(spec.name), SPEX_BASE: base, SPEX_SPEC: spec.dir };
  const run = (cwd: string, cmd: string) => runCommands(cwd, [`SPEX_BRANCH='${env.SPEX_BRANCH}' SPEX_BASE='${env.SPEX_BASE}' SPEX_SPEC='${env.SPEX_SPEC}' ; export SPEX_BRANCH SPEX_BASE SPEX_SPEC ; ${cmd}`], config.limits.verify_minutes);
  // The other repos first, so a failed merge there stops before this repo merges. A second run skips the merged ones.
  const repos = featureRepos(config, feature);
  const lost = repoFindings(home, config, repos);
  if (lost.length) return refuse(lost);
  const shipped = readShipped(home, id);
  const waiting: string[] = [];
  for (const name of repos) {
    const where = `${name} (${repoPath(config, name)})`;
    if (shipped[name]) {
      lines.push(`${where}: merged already, by ${shipped[name]}`);
      continue;
    }
    const rc = config.repos[name];
    const abs = repoRoot(home, config, name);
    const b = currentBranch(abs);
    if (b === rc.base || (!rc.base && (b === 'main' || b === 'master'))) return refuse([err('CLOSE-BRANCH', `repo ${where} is on ${b}: the close merges a branch, and this is the target`, 'Move its work to a branch, then run this step again.')], 6, lines.join('\n'));
    if (rc.close?.commit ?? true) {
      const c = commitPaths(abs, `${id}: ${feature.requirements?.title ?? spec.name}`);
      if (!c.ok) return refuse([err('PHASE-COMMIT', `git commit failed in repo ${where}`, `Fix git there, then run this step again. Tail: ${c.tail.trim().slice(-200)}`)], 7, lines.join('\n'));
      lines.push(`${where}: ${c.committed ? 'committed' : 'nothing to commit'}`);
    }
    const cmd = rc.close?.cmd?.trim() ?? '';
    if (!cmd) {
      waiting.push(where);
      continue;
    }
    const out = run(abs, cmd);
    if (!out.ok) {
      writeShipped(home, id, shipped);
      return refuse([err('CLOSE-MERGE-FAILED', `close.cmd of repo ${where} exited ${out.results[0].exit}`, 'A failed merge is a cause to fix: a developer fixes it, the fix is tested, then this step runs again. At most 3 tries, then the run waits for the person.')], 7, [...lines, '', out.results[0].tail.slice(-2500)].join('\n'));
    }
    shipped[name] = 'close.cmd';
    lines.push(`${where}: merged: ${cmd}`);
  }
  if (repos.length) writeShipped(home, id, shipped);
  const refs = baseRefs(home, base);
  const done = refs.find((r) => mergedOn(home, r, spec.dir));
  const wait = (why: string): CmdResult =>
    refuse([{ severity: 'error', code: 'CLOSE-WAIT', message: why, fix: `You merge ${branchOf(spec.name)} into ${base}, or give the forge what it wants. Then type /spex:review ${spec.dir} again: it finishes the close.` }], 6, lines.join('\n'), { step: 'merge', waits: true, branch: branchOf(spec.name), base });
  if (waiting.length) return wait(`no close.cmd merges ${waiting.join(', ')}`);
  if (done) lines.push(`merged already: ${done} has ${spec.name} as closed`);
  else {
    const cmd = config.close.cmd.trim();
    if (!cmd) return wait(`close.cmd is empty in .spex/config.yaml: nothing merges ${branchOf(spec.name)}`);
    if (cmd === LOCAL_MERGE) lines.push(`close.cmd is local: the script merges ${branchOf(spec.name)} into ${base} in the main folder, in the step finish`);
    else {
      const out = run(home, cmd);
      if (!out.ok) return refuse([err('CLOSE-MERGE-FAILED', `close.cmd exited ${out.results[0].exit}`, 'A failed merge is a cause to fix (a red check in the forge, a conflict): a developer fixes it, the fix is tested, then this step runs again. At most 3 tries. When the forge wants a person (an approval), the run waits for them.')], 7, [...lines, '', out.results[0].tail.slice(-2500)].join('\n'), { step: 'merge' });
      lines.push(`merged: ${cmd}`);
    }
  }
  lines.push(`next: the person ends this session (the worktree may go: pick remove), then types /spex:review ${spec.dir} in a session on the main folder (${mainRoot(home)}): it runs \`spex close ${spec.dir} finish\` there`);
  return { ok: true, findings: [], exit: 0, text: lines.join('\n'), data: { step: 'merge', waits: false, branch: branchOf(spec.name), base } };
}

function finish(root: string, main: string, spec: ListedSpec): CmdResult {
  if (inWorktree(root)) return refuse([err('CLOSE-LEAVE', 'this step changes the main folder, and this session is in a worktree', `End this session (the worktree may go: pick remove). Then type /spex:review ${spec.dir} in a session on the main folder (${main}): it runs this step there.`)], 6, '', { main });
  const { config } = loadConfig(main);
  const base = baseBranch(main, config);
  const lines: string[] = [];
  const findings: Finding[] = [];
  const branch = branchOf(spec.name);
  // The branch is merged only as a closed spec: `built` wrote review, done and committed it there.
  if ((spec.worktree || spec.branch) && !isClosed(spec.state)) return refuse([err('CLOSE-ORDER', `${spec.name} is ${stateWord(spec.state)}: it is not closed on its branch yet`, `The steps before this one come first: \`spex close ${spec.dir} built\`, then merge.`)]);
  if (currentBranch(main) !== base) return refuse([err('CLOSE-BASE', `the main folder is on ${currentBranch(main)}, not on ${base}`, `Switch it to ${base}, then run this step again.`)]);
  // Pull, so the next worktree starts with the code of this spec. No upstream: nothing to pull.
  if (git(main, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], { allowFail: true }).trim()) {
    const pull = gitTry(main, ['pull', '--ff-only', '--quiet']);
    if (pull.ok) lines.push(`pulled ${base}`);
    else findings.push({ severity: 'warning', code: 'CLOSE-PULL', message: `git pull --ff-only failed in the main folder: ${pull.out.slice(-200)}`, fix: `Pull ${base} by hand, then run this step again. When ${base} here and on the remote both have commits the other lacks: the request carried commits that were only here. Look at \`git log @{upstream}..${base}\`; when the merged request holds them all, \`git reset --hard @{upstream}\` in the main folder ends it.` });
  }
  if (!isClosed(readState(main, spec.dir)) && config.close.cmd.trim() === LOCAL_MERGE && refExists(main, `refs/heads/${branch}`)) {
    const m = gitTry(main, ['merge', '--no-ff', '--no-edit', branch]);
    if (!m.ok) {
      gitTry(main, ['merge', '--abort']);
      return refuse([err('CLOSE-MERGE-FAILED', `git could not merge ${branch} into ${base} in the main folder`, `The main folder has changes that are in the way, or a conflict. Output: ${m.out.slice(-400)}`)], 7, lines.join('\n'));
    }
    lines.push(`merged ${branch} into ${base} (close.cmd: local)`);
  }
  if (!isClosed(readState(main, spec.dir))) return refuse([...findings, { severity: 'error', code: 'CLOSE-WAIT', message: `${base} does not have ${spec.name} as closed yet: the branch ${branch} is not merged`, fix: `You merge ${branch} into ${base} (or the forge finishes), then type /spex:review ${spec.dir} again.` }], 6, lines.join('\n'), { step: 'finish', waits: true });
  const down = config.env?.down?.trim();
  if (down) {
    const res = runCommands(main, [down], config.limits.verify_minutes);
    lines.push(res.ok ? `environment stopped: ${down}` : `env.down failed (${down}); the close goes on`);
  }
  const rm = removeWorktree(main, spec.name);
  if (!rm.ok) return refuse([...findings, { severity: 'error', code: 'CLOSE-WORKTREE', message: `the worktree of ${spec.name} is not fully removed (folder: ${rm.folder ? 'gone' : 'still there'}, branch: ${rm.branch ? 'gone' : 'still there'})`, fix: `A sandbox protects two paths of Claude Code in a worktree. Run this one time outside the sandbox: ${rm.cmd}` }], 8, lines.join('\n'), { step: 'finish', cmd: rm.cmd });
  lines.push(`removed the worktree and the branch ${branch}`);
  const n = nextFor(main);
  lines.push(`${spec.name} is closed and merged`, renderNext(n, { root: main }));
  return { ok: true, findings, exit: 0, text: lines.join('\n'), data: { step: 'finish', next: n.command || null } };
}

export function close(root: string, given: string, step: string): CmdResult {
  if (!(CLOSE_STEPS as readonly string[]).includes(step)) return refuse([err('USAGE', `close needs a step: ${CLOSE_STEPS.join(', ')}`, `spex close <dir> <step>, in this order: ${CLOSE_STEPS.join(' → ')}.`)], 2);
  const main = mainRoot(root);
  const spec = findSpec(root, given);
  if (!spec) return refuse([err('SPEC-UNKNOWN', `${given} is no spec folder under specs/`, 'Name the folder: specs/007-csv-export.')], 2);
  if (step === 'finish') {
    if (isClosed(readState(main, spec.dir)) && !spec.worktree && !spec.branch && !refExists(main, `refs/heads/${branchOf(spec.name)}`)) {
      const n = nextFor(main);
      return { ok: true, findings: [], exit: 0, text: [`${spec.name} is closed and merged, and its worktree is gone`, renderNext(n, { root: main })].join('\n'), data: { step, next: n.command || null } };
    }
    return finish(root, main, spec);
  }
  const s = spec.state;
  if (!spec.worktree || !s || s.command !== 'review') return refuse([err('CLOSE-ORDER', `${spec.name} is ${stateWord(s)}: the close is the second half of review`, `Type /spex:review ${spec.dir}.`)]);
  const home = spec.home;
  const check = runCheck(home, [spec.dir]);
  if (hasErrors(check.findings)) return refuse(check.findings.filter((f) => f.severity === 'error'), 4);
  const config = check.config;
  const feature = check.features[0];
  const base = baseBranch(main, config);
  if (step === 'sync') return sync(home, config, spec, base);
  if (step === 'later') return later(home, spec, root);
  if (step === 'prove') return prove(home, config, feature);
  if (step === 'built') return built(home, config, spec, feature);
  return merge(home, config, spec, feature, base);
}
