// One spec from a note to the base branch on the README example, and what happens inside implement and review:
// the gates (tests, develop, verify), red-first, done and its refusals, verify, sessions, block, paths, show,
// coverage, review accept. Plus new, report, init, update. The phases themselves are in phases.test.mjs, the close in
// close.test.mjs, and the commands around them in notes.test.mjs.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import { spawnSync } from 'node:child_process';
import { DIR, NAME, SPEX, codes, commitAll, configure, edit, gitIn, implementing, makeRepo, ok, planned, read, reviewing, spex, spexText, tempDir, worktreeOf } from './helpers.mjs';

const tasksOf = (root) => parse(read(root, `${DIR}/tasks.yaml`), { schema: 'core' });
const status = (root, id) => tasksOf(root).tasks.find((t) => t.id === id).status;
const reqStatus = (root, id) => parse(read(root, `${DIR}/requirements.yaml`), { schema: 'core' }).requirements.find((r) => r.id === id).status;
const finding = (r, code) => r.json.findings.find((f) => f.code === code);
const RULE = '─'.repeat(40);
/** A task with no record, proved by a shell test: `T03`, and `TS03` that covers it. */
const SHELL_TASK = '  - id: T03\n    title: "The fix file says fixed"\n    kind: setup\n    requirements: []\n    paths: [src/fix.txt]\n    context: [src/state.txt]\n    instructions: |\n      Write fixed in src/fix.txt.\n    done_when: TS03 passes.\n    status: todo\n';
const SHELL_TEST = '  - id: TS03\n    covers: [T03]\n    kind: script\n    driver: shell\n    steps:\n      - grep -q fixed src/fix.txt\n    expect:\n      - the exit code is 0\n';

test('the whole lifecycle on the README example: a note, plan, implement, review, the close, and the base branch', () => {
  const repo = makeRepo('csv-export');
  configure(repo, 'close: {cmd: local}');
  commitAll(repo, 'the close merges here');

  // a note: no phase has started, so no gate inside implement is open, and nothing is approved
  let r = spex(repo, 'gate', 'develop', DIR, 'T01');
  assert.equal(r.code, 6, r.stdout);
  assert.ok(finding(r, 'GATE-TASKS-STAMPED').message.endsWith('not stamped yet: plan has not ended'), r.stdout);
  assert.ok(finding(spex(repo, 'gate', 'tests', DIR, 'TS01'), 'GATE-APPROVED').fix.includes(`spex start implement ${DIR}`));
  assert.equal(spex(repo, 'status').json.next, `/spex:plan ${DIR}`);

  // plan: the worktree, then the stamp and the commit. Its end approves nothing.
  r = ok(repo, 'start', 'plan', DIR);
  const wt = r.json.worktree;
  assert.equal(wt, worktreeOf(repo));
  r = ok(repo, 'end', 'plan', DIR);
  assert.deepEqual([r.json.records, r.json.tasks, r.json.tests], [2, 2, 2]);
  assert.equal(reqStatus(wt, 'REQ-007-001'), 'draft');
  assert.equal(spex(repo, 'status').json.next, `/spex:implement ${DIR}`);

  // implement: typing it is the approval. The records flip, and the file keeps its comments and its layout.
  r = ok(repo, 'start', 'implement', DIR);
  assert.equal(r.json.approved, 2);
  assert.equal(reqStatus(wt, 'REQ-007-001'), 'approved');
  assert.ok(read(wt, `${DIR}/requirements.yaml`).includes('decision: csv-stringify 6.x, because'), 'layout kept');
  assert.ok(read(wt, `${DIR}/tests.yaml`).startsWith('# The proof plan of the README example'), 'the comments of the proof plan stay');

  // gate tests has nothing to write (every script has its file); gate develop T01 open: the gate runs the tests itself and they fail
  r = spex(repo, 'gate', 'tests', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.tests, []);
  r = spex(repo, 'gate', 'develop', DIR, 'T01');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(existsSync(join(wt, '.spex/evidence/007/T01.red.json')), 'the gate leaves a record, in the worktree of the spec');
  assert.ok(!existsSync(join(repo, '.spex/evidence')), 'the main folder has no work of an open spec');
  assert.deepEqual(codes(spex(repo, 'gate', 'develop', DIR, 'T02')), ['GATE-DEPENDS'], 'T02 waits for T01');

  // the briefs: the test analyst's plan view, the test developer's batch, the developer's task
  r = spex(repo, 'show', DIR, '--plan');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.text.includes('every scenario and every task has a test: nothing to plan'), r.json.text);
  assert.equal(r.json.next_id, 'TS03');
  r = spex(repo, 'show', DIR, '--tests', 'TS01');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.text.includes('REQ_007_001_AC_1_writes_open_tasks_as_csv') && r.json.text.includes('exists already in tests/acceptance/export.test.mjs'), r.json.text);
  assert.ok(r.json.text.includes('Never read src'));
  assert.ok(!r.json.text.includes('REQ_007_002'), 'only the named test');
  assert.ok(r.json.text.includes(`- spex run ${DIR} --test TS01 --expect fail`));
  r = spex(repo, 'show', DIR, '--tests');
  assert.equal(r.json.text, 'every script test has its file: nothing to write');
  r = spex(repo, 'show', DIR, 'T01');
  assert.equal(r.code, 0, r.stdout);
  for (const needle of ['## paths', 'src/cli/commands/export.ts', '## tests (the task', 'TS01  script · default · covers REQ-007-001/AC-1', '## requirements', 'REQ-007-001', '## boundaries', 'D1  Rows follow list order', 'M1  src/cli/commands/export.ts', '--test-name-pattern="REQ_007_001_AC_1_writes_open_tasks_as_csv"']) assert.ok(r.json.text.includes(needle), `show lacks ${needle}\n${r.json.text}`);
  assert.match(r.json.text, /TaskStore\.ts:40-90 \(\d+ KB\)/, 'context sizes are shown');
  assert.ok(!r.json.text.includes('REQ-007-002') && !r.json.text.includes('TS02'), 'show prints only the task\'s records and tests');
  r = spex(repo, 'show', DIR, 'REQ-007-002');
  assert.ok(r.json.text.includes('exit with code 3') && r.json.text.includes('proved by:') && r.json.text.includes('TS02'));
  r = spex(repo, 'show', DIR, '--decisions');
  assert.ok(r.json.text.includes('U1') && r.json.text.includes('D1'));

  // red-first by hand, the developer's own loop, and per test for the test developer
  r = spex(repo, 'run', DIR, 'T01', '--expect', 'fail');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.evidence.ok, true);
  assert.deepEqual(r.json.evidence.tests, ['TS01']);
  r = spex(repo, 'run', DIR, '--test', 'TS02', '--expect', 'fail');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(existsSync(join(wt, '.spex/evidence/007/TS02.red.json')));

  // done runs the checks itself: the tests still fail, so nothing flips, whatever the records say
  r = spex(repo, 'run', DIR, 'T01');
  assert.equal(r.code, 7);
  assert.ok(codes(r).includes('RUN-FAILED'));
  writeFileSync(join(wt, '.spex/evidence/007/T01.json'), JSON.stringify({ ok: true, tree: 'forged' }));
  r = spex(repo, 'done', DIR, 'T01');
  assert.equal(r.code, 7);
  assert.ok(codes(r).includes('DONE-FAILED'), codes(r).join(','));
  assert.equal(status(wt, 'T01'), 'todo');
  // code written in the main folder is not the code of the spec: the run reads the worktree
  writeFileSync(join(repo, 'src/state.txt'), 'implemented\n');
  assert.equal(spex(repo, 'done', DIR, 'T01').code, 7);
  gitIn(repo, ['checkout', '--', 'src/state.txt']);

  // "develop": the state file flips; done passes with no earlier run at all, called from the main folder or the worktree
  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n');
  r = spex(wt, 'done', DIR, 'T01');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(status(wt, 'T01'), 'done');
  assert.equal(status(repo, 'T01'), 'todo', 'the base branch has the plan as it was before the spec opened');

  // green before the feature exists is a bug in the test: the gate sees it, and so does run
  r = spex(repo, 'gate', 'develop', DIR, 'T02');
  assert.equal(r.code, 6);
  assert.ok(codes(r).includes('GATE-RED'), codes(r).join(','));
  r = spex(repo, 'run', DIR, 'T02', '--expect', 'fail');
  assert.equal(r.code, 7);
  assert.ok(codes(r).includes('RUN-GREEN'));
  assert.equal(spex(repo, 'done', DIR, 'T02').code, 0);
  assert.deepEqual(codes(spex(repo, 'gate', 'develop', DIR, 'T02')), ['GATE-DONE'], 'a done task stays done');

  // every task done: the whole spec is proved next, and the end of implement waits for it
  assert.deepEqual(codes(spex(repo, 'end', 'implement', DIR)), ['GATE-VERIFY']);
  r = spex(repo, 'gate', 'verify', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.sessions, []);
  r = spex(repo, 'verify', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.evidence.round, 1);
  assert.deepEqual(r.json.evidence.scripts.map((s) => [s.id, s.ok]), [['TS01', true], ['TS02', true]]);
  assert.ok(r.json.evidence.scripts[0].cmd.includes('REQ_007_001_AC_1_writes_open_tasks_as_csv|REQ_007_002_AC_1_refuses_overwrite'), 'one command per driver');
  assert.ok(existsSync(join(wt, '.spex/evidence/007/verify.json')) && existsSync(join(wt, '.spex/evidence/007/verify-1.json')));
  r = spex(repo, 'show', DIR, '--verify');
  assert.ok(r.json.text.includes('Every script passed') && r.json.text.includes('Next: /spex:review'), r.json.text);
  // run --all is the same run. On the same green tree it is the same round: nothing was fixed in between.
  assert.equal(spex(repo, 'run', DIR, '--all').json.evidence.round, 1);
  assert.ok(existsSync(join(wt, '.spex/evidence/007/verify-2.json')), 'each call keeps its own file');
  r = spex(repo, 'coverage', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.missing, 0);
  assert.equal(r.json.gaps, 0);

  r = ok(repo, 'end', 'implement', DIR);
  assert.equal(r.json.round, 1);
  assert.equal(spex(repo, 'status').json.next, `/spex:review ${DIR}`);

  // review: typing it approves what implement built. A round with no finding is clean, and the close goes on.
  ok(repo, 'start', 'review', DIR);
  r = spex(repo, 'show', DIR, '--review');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.round, 1);
  assert.ok(readFileSync(join(wt, r.json.diff), 'utf8').includes('+implemented'), 'the diff is the code of the branch against the base');
  writeFileSync(join(wt, r.json.findings_file), 'feature: "007"\nround: 1\nfindings: []\n');
  r = ok(repo, 'review', 'accept', DIR, 'ok', '--by', 'agent');
  assert.ok(r.json.text.endsWith(`nothing to fix: the close goes on with \`spex close ${DIR} sync\``), r.json.text);
  for (const step of ['sync', 'later', 'prove', 'built', 'merge']) ok(repo, 'close', DIR, step);
  assert.equal(reqStatus(wt, 'REQ-007-001'), 'built');
  r = ok(repo, 'close', DIR, 'finish');
  assert.ok(r.json.text.endsWith(`${RULE}\nNEXT   Nothing.\n       Every spec is closed and merged. A new idea starts with /spex:new, a bug in merged code with /spex:new-bug.\n${RULE}`), r.json.text);

  // the base branch has the spec: closed, its records built, its code, and no worktree is left
  assert.ok(!existsSync(wt));
  assert.equal(read(repo, `${DIR}/status.yaml`), 'command: review\nstate: done\n');
  assert.equal(reqStatus(repo, 'REQ-007-002'), 'built');
  assert.equal(status(repo, 'T02'), 'done');
  assert.equal(read(repo, 'src/state.txt'), 'implemented\n');
  assert.deepEqual(gitIn(repo, ['log', '--format=%s', `main^1..main`]).trim().split('\n'), [`Merge branch 'spex/${NAME}'`, `${NAME}: closed`, `${NAME}: review`, `${NAME}: implement`, `${NAME}: plan`]);
  assert.deepEqual(spex(repo, 'list').json.specs, [{ dir: DIR, number: 7, state: 'closed', worktree: false }]);
  assert.equal(spex(repo, 'check', DIR).code, 0);
  r = spex(repo, 'index', '--scope', 'export');
  assert.equal(r.json.records.length, 2);
});

test('a session test is pending until a tester records it at this tree; the end of implement waits for it', () => {
  const { repo, wt } = implementing((main) => edit(main, `${DIR}/tests.yaml`, (s) => `${s}  - id: TS03\n    covers: [REQ-007-001]\n    kind: session\n    driver: cli\n    why: the spreadsheet import is a visual check nobody can script here\n    steps: [run the export, open the file in a spreadsheet]\n    expect: [two rows under the header, the second quoted]\n`));
  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n');
  for (const t of ['T01', 'T02']) ok(repo, 'done', DIR, t);
  // a session in the plan: verify counts it as pending, the brief shows the steps, session records it, stale after a change
  let r = spex(repo, 'gate', 'verify', DIR);
  assert.deepEqual(r.json.sessions, ['TS03']);
  r = spex(repo, 'verify', DIR);
  assert.equal(r.code, 7, r.stdout);
  assert.deepEqual(r.json.evidence.sessions, [{ id: 'TS03', status: 'pending', tree: null, observed: null }]);
  assert.ok(r.json.text.includes('sessions to perform: TS03 (pending)'), r.json.text);
  assert.deepEqual(codes(spex(repo, 'end', 'implement', DIR)), ['GATE-VERIFY']);
  r = spex(repo, 'show', DIR, '--session', 'TS03');
  assert.equal(r.code, 0, r.stdout);
  for (const needle of ['# session TS03', '1. run the export', 'why a session: the spreadsheet', `spex session ${DIR} TS03 --result pass|fail`]) assert.ok(r.json.text.includes(needle), `brief lacks ${needle}\n${r.json.text}`);
  assert.equal(spex(repo, 'run', DIR, '--test', 'TS03').code, 2, 'a session is not run by the script');
  assert.equal(spex(repo, 'session', DIR, 'TS03', '--result', 'pass').code, 2, 'an observation is required');
  assert.equal(spex(repo, 'session', DIR, 'TS01', '--result', 'pass', '--observed', 'x').code, 2, 'a script is not a session');
  r = spex(repo, 'session', DIR, 'TS03', '--result', 'pass', '--observed', 'two rows, the second quoted: "fix tap, kitchen",home');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(existsSync(join(wt, '.spex/evidence/007/TS03.session.json')));
  r = spex(repo, 'verify', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.evidence.sessions[0].status, 'pass');
  // the code changes: the session is stale, the verify run is not current any more
  writeFileSync(join(wt, 'src/state.txt'), 'implemented again\n');
  assert.deepEqual(codes(spex(repo, 'end', 'implement', DIR)), ['GATE-VERIFY']);
  r = spex(repo, 'verify', DIR);
  assert.equal(r.code, 7);
  assert.equal(r.json.evidence.sessions[0].status, 'stale');
  // back on the tree the tester saw, the record counts again, and the phase ends
  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n');
  assert.equal(spex(repo, 'verify', DIR).code, 0);
  r = ok(repo, 'end', 'implement', DIR);
  assert.ok(r.json.text.includes('2 script(s) green · 1 session(s) passed'), r.json.text);
});

test('block writes the status and a reason file; the phase cannot end with it; unblock takes the task back to todo and keeps the reason', () => {
  const { repo, wt } = implementing();
  let r = spex(repo, 'block', DIR, 'T01', '--reason', 'the TaskStore API has no openTasks()');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(status(wt, 'T01'), 'blocked');
  assert.ok(existsSync(join(wt, '.spex/runs/007/block-T01.json')));
  // T02 waits on T01, so nothing is ready: the gates say what holds it, and the phase is the same command again
  assert.deepEqual(codes(spex(repo, 'gate', 'develop', DIR, 'T02')), ['GATE-DEPENDS']);
  r = spex(repo, 'gate', 'verify', DIR);
  assert.equal(r.code, 6, r.stdout);
  assert.equal(finding(r, 'GATE-TASKS').message, 'T01 is blocked');
  assert.equal(finding(r, 'GATE-TASKS').fix, `Read .spex/runs/007/block-T01.json. /spex:implement ${DIR} sends it to the decider, which names the cause.`);
  r = spex(repo, 'end', 'implement', DIR);
  assert.deepEqual(r.json.findings.map((f) => f.message), ['T01 is blocked', 'T02 is todo']);
  assert.equal(spex(repo, 'status').json.next, `/spex:implement ${DIR}`);
  // unblock: the status goes back, the reason stays as a lesson
  r = spex(repo, 'unblock', DIR, 'T01');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(status(wt, 'T01'), 'todo');
  assert.equal(r.json.reason, '.spex/runs/007/block-T01.json');
  assert.ok(existsSync(join(wt, '.spex/runs/007/block-T01.json')), 'the reason file stays');
  assert.equal(spex(repo, 'gate', 'develop', DIR, 'T01').code, 0, 'the block and the unblock left the stamp of the plan alone');
  assert.ok(spex(repo, 'show', DIR, '--lessons').json.blocked.some((b) => b.task === 'T01'), 'the lessons still list it');
  // only a blocked task can be unblocked
  r = spex(repo, 'unblock', DIR, 'T01');
  assert.equal(r.code, 6);
  assert.ok(codes(r).includes('UNBLOCK-STATUS'));
  assert.equal(spex(repo, 'unblock', DIR, 'T09').code, 2);
});

test('block --ask: the gate names the yes/no question, and the command that is the yes', () => {
  const { repo, wt } = implementing();
  const ask = 'Can I run the live export against the shared bucket? It writes one file there.';
  const r = spex(repo, 'block', DIR, 'T01', '--reason', 'needs a go-ahead for the live run', '--ask', ask);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(JSON.parse(read(wt, '.spex/runs/007/block-T01.json')).ask, ask);
  assert.ok(r.json.text.endsWith(`waits for a person's yes: ${ask}`), r.json.text);
  const fix = finding(spex(repo, 'gate', 'verify', DIR), 'GATE-TASKS').fix;
  assert.equal(fix, `It waits for a person's yes: ${ask} Yes: /spex:implement ${DIR} (the run unblocks it). No: say what you want with /spex:comment.`);
  assert.ok(!fix.includes('decider'), 'a yes has no cause to name');
});

test('paths widens a task under the check rules; a plan changed before it still needs the stamp', () => {
  const { repo, wt } = implementing();
  // an edit by hand, and then a widening: the edit does not ride through. The record says the stamp is due.
  edit(wt, `${DIR}/tasks.yaml`, (s) => s.replace('title: ', 'title: Hand-edited '));
  const r = spex(repo, 'paths', DIR, 'T01', '--add', 'src/store/format.ts', '--reason', 'decider: list.ts formats through format.ts');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.stamp_due, true);
  assert.equal(r.json.stamp_kept, false);
  assert.ok(r.json.text.includes(`\`spex stamp ${DIR}\``), r.json.text);
  assert.deepEqual(codes(spex(repo, 'gate', 'develop', DIR, 'T01')), ['GATE-TASKS-STAMPED']);
  assert.equal(JSON.parse(read(wt, '.spex/runs/007/paths-T01.json')).changes[0].stamp, 'due');
  // before the end of plan there is no stamp to keep, and none is due
  const early = makeRepo('csv-export');
  ok(early, 'start', 'plan', DIR);
  const e = spex(early, 'paths', DIR, 'T01', '--add', 'src/store/format.ts', '--reason', 'the planner: format.ts holds the header');
  assert.deepEqual([e.json.stamp_due, e.json.stamp_kept], [false, false]);
  assert.equal(JSON.parse(read(worktreeOf(early), '.spex/runs/007/paths-T01.json')).changes[0].stamp, 'none');
  assert.equal(spex(early, 'end', 'plan', DIR).code, 0, 'the end of plan stamps the widened plan');
});

test('paths: a stamped plan stays stamped, the record says why, and review shows it; a protected path is undone', () => {
  const { repo, wt } = implementing();
  const pathsOf = (id) => tasksOf(wt).tasks.find((t) => t.id === id).paths;
  const before = read(wt, `${DIR}/tasks.yaml`);
  // a protected path: refused, and the file is as it was
  let r = spex(repo, 'paths', DIR, 'T01', '--add', 'src/cli/flags.ts', 'tests/acceptance/export.test.ts', '--reason', 'the test is wrong');
  assert.equal(r.code, 6, r.stdout);
  assert.ok(codes(r).includes('TASK-PROTECTED'), r.stdout);
  assert.equal(read(wt, `${DIR}/tasks.yaml`), before, 'a refused change is undone');
  // no reason, or nothing new: refused
  assert.ok(codes(spex(repo, 'paths', DIR, 'T01', '--add', 'src/store/format.ts')).includes('PATHS-REASON'));
  assert.ok(codes(spex(repo, 'paths', DIR, 'T01', '--add', 'src/cli/index.ts', '--reason', 'x')).includes('PATHS-NONE'));
  assert.equal(spex(repo, 'paths', DIR, 'T09', '--add', 'a.ts', '--reason', 'x').code, 2);
  // dex 017: a path after the task id is refused, never dropped
  r = spex(repo, 'paths', DIR, 'T01', 'src/store/format.ts', '--add', 'src/cli/help.ts', '--reason', 'x');
  assert.equal(r.code, 2, r.stdout);
  assert.equal(read(wt, `${DIR}/tasks.yaml`), before, 'nothing joined');
  // a yes from the decider: every path after one --add joins, the record says why, and the stamp of the plan stays
  assert.equal(spex(repo, 'gate', 'develop', DIR, 'T01').code, 0);
  r = spex(repo, 'paths', DIR, 'T01', '--add', 'src/store/format.ts', 'src/cli/help.ts', '--reason', 'decider: list.ts formats through format.ts, so the CSV header lives there');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.added, ['src/store/format.ts', 'src/cli/help.ts']);
  assert.equal(r.json.stamp_due, false);
  assert.equal(r.json.stamp_kept, true);
  assert.ok(r.json.text.includes('/spex:review shows the change'), r.json.text);
  assert.deepEqual(pathsOf('T01').slice(-2), ['src/store/format.ts', 'src/cli/help.ts']);
  const record = JSON.parse(read(wt, '.spex/runs/007/paths-T01.json'));
  assert.deepEqual(record.changes[0].added, ['src/store/format.ts', 'src/cli/help.ts']);
  assert.ok(record.changes[0].reason.startsWith('decider:'));
  assert.equal(record.changes[0].stamp, 'kept');
  assert.equal(spex(repo, 'gate', 'develop', DIR, 'T01').code, 0, 'the widened plan needs no person');
  assert.deepEqual(codes(spex(repo, 'start', 'implement', DIR)), [], 'and implement, typed again, takes it as stamped');
  // a second change adds to the record, it does not replace it; the repeated flag works too
  spex(repo, 'paths', DIR, 'T01', '--add', 'src/cli/usage.ts', '--add', 'src/cli/flags.ts', '--reason', 'decider: the usage text names the flag');
  assert.deepEqual(JSON.parse(read(wt, '.spex/runs/007/paths-T01.json')).changes.map((c) => c.added.length), [2, 2]);
  // review shows every widening, with the decider's why
  r = spex(repo, 'show', DIR, '--review');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.text.includes('## paths widened in develop') && r.json.text.includes('- T01 + src/store/format.ts, src/cli/help.ts — decider: list.ts formats'), r.json.text);
  // a done task stays done: new work is a new task
  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n');
  ok(repo, 'done', DIR, 'T01');
  assert.deepEqual(codes(spex(repo, 'paths', DIR, 'T01', '--add', 'src/cli/more.ts', '--reason', 'decider: x')), ['PATHS-DONE']);
});

test('a skipped test is neither red nor green: the red run, the develop gate, done and verify all refuse it', () => {
  // REQ-007-001's test needs a live record and skips without it, the way an env-gated test does
  const { repo, wt } = implementing((main) => edit(main, 'tests/acceptance/export.test.mjs', (s) => s.replace("test('REQ_007_001_AC_1_writes_open_tasks_as_csv', () => {", "test('REQ_007_001_AC_1_writes_open_tasks_as_csv', { skip: !process.env.LIVE_RECORD && 'no live record' }, () => {")));
  let r = spex(repo, 'run', DIR, 'T01', '--expect', 'fail');
  assert.equal(r.code, 7, r.stdout);
  assert.ok(codes(r).includes('RUN-SKIPPED') && !codes(r).includes('RUN-GREEN'), codes(r).join(','));
  r = spex(repo, 'gate', 'develop', DIR, 'T01');
  assert.equal(r.code, 6);
  assert.ok(r.json.findings.some((f) => f.code === 'GATE-RED' && /skip/.test(f.message) && /fail when it is missing/.test(f.fix) && /needs\[\]/.test(f.fix)), JSON.stringify(r.json.findings));
  // the code exists now, and the skip still keeps the task open
  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n');
  r = spex(repo, 'done', DIR, 'T01');
  assert.equal(r.code, 7, r.stdout);
  assert.ok(codes(r).includes('DONE-FAILED') && codes(r).includes('RUN-SKIPPED'), codes(r).join(','));
  assert.equal(status(wt, 'T01'), 'todo');
  // verify names the one test that skipped
  r = spex(repo, 'verify', DIR);
  assert.equal(r.code, 7, r.stdout);
  assert.ok(r.json.evidence.scripts.find((s) => s.id === 'TS01').tail.includes('skipped') && r.json.evidence.scripts.find((s) => s.id === 'TS02').ok, JSON.stringify(r.json.evidence.scripts));
  // with the record there, the test runs, and done passes
  const env = { ...process.env, LIVE_RECORD: '1' };
  assert.equal(spawnSync('node', [SPEX, 'done', DIR, 'T01', '--json'], { cwd: repo, encoding: 'utf8', env }).status, 0);
  assert.equal(status(wt, 'T01'), 'done');
});

test('a need the environment lacks stops the develop gate with the one thing a person gives; a shell test needs no red run', () => {
  const { repo, wt } = planned((main) => {
    edit(main, `${DIR}/tests.yaml`, (s) => `${s.replace('    name: REQ_007_001_AC_1_writes_open_tasks_as_csv\n', '    name: REQ_007_001_AC_1_writes_open_tasks_as_csv\n    needs: [SPEX_TEST_TOKEN, "test -f src/state.txt"]\n')}${SHELL_TEST.replace('grep -q fixed src/fix.txt', 'test -f src/fix.txt')}`);
    edit(main, `${DIR}/tasks.yaml`, (s) => s + SHELL_TASK);
  });
  const env = { ...process.env, SPEX_TEST_TOKEN: 'x' };
  assert.equal(spawnSync('node', [SPEX, 'start', 'implement', DIR, '--json'], { cwd: repo, encoding: 'utf8', env }).status, 0);
  let r = spex(repo, 'gate', 'develop', DIR, 'T01');
  assert.equal(r.code, 6, r.stdout);
  const needs = r.json.findings.filter((f) => f.code === 'GATE-NEEDS');
  assert.equal(needs.length, 1, 'the env var; the command passes because the fixture has the file');
  assert.ok(needs[0].message.includes('SPEX_TEST_TOKEN, which is not set') && needs[0].fix.startsWith('A person sets'), JSON.stringify(needs));
  assert.deepEqual(codes(spex(repo, 'gate', 'verify', DIR)).filter((c) => c === 'GATE-NEEDS'), ['GATE-NEEDS'], 'the verify gate reads every need too');
  assert.equal(spawnSync('node', [SPEX, 'gate', 'develop', DIR, 'T01', '--json'], { cwd: repo, encoding: 'utf8', env }).status, 0);
  // T03 has only a shell test: nothing can be red, the gate opens and says why, and done runs the steps
  r = spex(repo, 'run', DIR, 'T03', '--expect', 'fail');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(codes(r).includes('RUN-NO-RED') && r.json.text.includes('T03 has nothing to be red'), r.stdout);
  r = spex(repo, 'gate', 'develop', DIR, 'T03');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(codes(r).includes('RUN-NO-RED'), 'the gate opens and says why');
  r = spex(repo, 'done', DIR, 'T03');
  assert.equal(r.code, 7, r.stdout);
  assert.ok(finding(r, 'DONE-FAILED').message.includes('test -f src/fix.txt exited 1'), r.stdout);
  writeFileSync(join(wt, 'src/fix.txt'), 'fixed\n');
  r = spex(repo, 'done', DIR, 'T03');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.evidence.commands.some((c) => c.cmd === 'test -f src/fix.txt'), 'the shell steps ran at done');
  // a record that lost its task, and a scenario that lost its test, are gaps: the check names both, and nothing stamps them
  edit(wt, `${DIR}/tasks.yaml`, (s) => s.replace('    requirements: [REQ-007-002]\n    depends_on: [T01]', '    depends_on: [T01]'));
  edit(wt, `${DIR}/tests.yaml`, (s) => s.replace('    covers: [REQ-007-002/AC-1]\n', '    covers: [T02]\n').replace('    name: REQ_007_002_AC_1_refuses_overwrite', '    name: TASK_007_02_refuses_overwrite'));
  r = spex(repo, 'check', DIR);
  assert.equal(r.code, 5, r.stdout);
  assert.ok(codes(r).includes('TASK-COVERAGE'), `a record without a task is a gap: ${codes(r).join(',')}`);
  const cover = r.json.findings.filter((f) => f.code === 'TEST-COVER');
  assert.ok(cover.length === 1 && cover[0].message.includes('REQ-007-002/AC-1'), `the scenario lost its test, and T02 is covered: ${JSON.stringify(cover)}`);
  r = spex(repo, 'stamp', DIR);
  assert.equal(r.code, 5, r.stdout);
  assert.deepEqual(codes(r).sort(), ['TASK-COVERAGE', 'TEST-COVER']);
});

test('show --tests picks a batch of script tests without a file, capped by limits.tests_scenarios; show --plan lists the claims without a test', () => {
  const { repo, wt } = implementing((main) => rmSync(join(main, 'tests/acceptance/export.test.mjs')));
  let r = spex(repo, 'show', DIR, '--tests');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.tests, ['TS01', 'TS02']);
  assert.ok(r.json.text.startsWith('# tests to write: TS01, TS02 (batch of 2'));
  assert.ok(r.json.text.includes('names and values from the plan:') && r.json.text.includes('T02 `-o` refuses to overwrite'), r.json.text);
  assert.ok(r.json.text.includes(`- spex run ${DIR} --test TS02 --expect fail`));
  r = spex(repo, 'gate', 'tests', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.tests, ['TS01', 'TS02']);
  assert.ok(r.json.text.endsWith('TS01, TS02'), r.json.text);
  // a cap of one makes a batch of one
  edit(wt, '.spex/config.yaml', (s) => s.replace('verify_minutes: 2', 'tests_scenarios: 1, verify_minutes: 2'));
  r = spex(repo, 'show', DIR, '--tests');
  assert.deepEqual(r.json.tests, ['TS01']);
  r = spex(repo, 'show', DIR, '--tests', 'TS02', 'TS01');
  assert.deepEqual(r.json.tests, ['TS02', 'TS01']);
  assert.equal(spex(repo, 'show', DIR, '--tests', 'TS09').code, 2);
  // the plan view: a scenario and a task without a test, and the rules
  edit(wt, `${DIR}/tests.yaml`, (s) => s.replace(/  - id: TS02[\s\S]*$/, ''));
  r = spex(repo, 'show', DIR, '--plan');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.gaps, { scenarios: ['REQ-007-002/AC-1'], tasks: ['T02'] });
  for (const needle of ['## scenarios without a test', 'REQ-007-002  unwanted-behavior', 'then: the exit code is 3', '## tasks without a test', 'T02  story — `-o` refuses to overwrite', 'done_when: The REQ-007-002 acceptance test passes.', 'REQ_007_001_AC_1, TASK_007_09', '## rules of the plan']) assert.ok(r.json.text.includes(needle), `plan lacks ${needle}\n${r.json.text}`);
  assert.equal(r.json.next_id, 'TS02');
  // only a task is uncovered: the view names it alone
  edit(wt, `${DIR}/tests.yaml`, (s) => `${s}  - id: TS02\n    covers: [REQ-007-002/AC-1]\n    kind: script\n    name: REQ_007_002_AC_1_refuses_overwrite\n    steps: [run it]\n    expect: [exit 3]\n`);
  edit(wt, `${DIR}/tasks.yaml`, (s) => s.replace('    requirements: [REQ-007-002]\n    depends_on: [T01]', '    depends_on: [T01]'));
  assert.deepEqual(spex(repo, 'show', DIR, '--plan').json.gaps, { scenarios: [], tasks: ['T02'] });
});

test('coverage names the script with no file, and the claim with no test', () => {
  const { repo, wt } = implementing();
  writeFileSync(join(wt, 'tests/acceptance/export.test.mjs'), "import test from 'node:test'; test('REQ_007_001_AC_1_writes_open_tasks_as_csv', () => {});\n");
  let r = spex(repo, 'coverage', DIR);
  assert.equal(r.code, 5);
  assert.equal(r.json.missing, 1);
  assert.ok(r.json.findings[0].message.includes('REQ_007_002_AC_1_refuses_overwrite'));
  assert.ok(r.json.text.includes('ok  REQ-007-001/AC-1  TS01 script') && r.json.text.includes('MISSING TS02'), r.json.text);
  // the file the plan names exists without the test, and TS02 never ran: a later batch writes it there.
  // agent-flywheel-os 001: batch 2 pointed at the files batch 1 made, and the gate refused it as broken records.
  let g = spex(repo, 'gate', 'develop', DIR, 'T02');
  assert.ok(codes(g).includes('GATE-COVERAGE') && !g.json.findings.some((f) => f.code === 'TEST-FILE' && f.severity === 'error'), codes(g).join(','));
  assert.ok(finding(g, 'GATE-COVERAGE').fix.includes(`spex show ${DIR} --tests TS02`), g.stdout);
  g = spex(repo, 'gate', 'tests', DIR);
  assert.equal(g.code, 0, g.stdout);
  assert.deepEqual(g.json.tests, ['TS02']);
  // once TS02 ran, a name gone from its file is a broken record: the gate refuses it
  mkdirSync(join(wt, '.spex/evidence/007'), { recursive: true });
  writeFileSync(join(wt, '.spex/evidence/007/TS02.red.json'), '{}');
  g = spex(repo, 'gate', 'tests', DIR);
  assert.equal(g.code, 6, g.stdout);
  assert.ok(codes(g).includes('TEST-FILE'), codes(g).join(','));
  assert.equal(spex(repo, 'check', DIR).code, 4);
  rmSync(join(wt, '.spex/evidence/007/TS02.red.json'));
  edit(wt, `${DIR}/tests.yaml`, (s) => s.replace('    name: REQ_007_002_AC_1_refuses_overwrite\n    file: tests/acceptance/export.test.mjs\n', '    name: REQ_007_002_AC_1_refuses_overwrite\n'));
  g = spex(repo, 'gate', 'develop', DIR, 'T02');
  assert.ok(codes(g).includes('GATE-COVERAGE'), codes(g).join(','));
  edit(wt, `${DIR}/tests.yaml`, (s) => s.replace(/  - id: TS02[\s\S]*$/, ''));
  r = spex(repo, 'coverage', DIR);
  assert.equal(r.code, 5);
  assert.equal(r.json.gaps, 2, 'the scenario and the task');
  assert.ok(r.json.text.includes('GAP REQ-007-002/AC-1') && r.json.text.includes('GAP T02'), r.json.text);
});

test('show --review writes the diff of the branch against the base and slices it per task', () => {
  const { repo, wt } = implementing();
  mkdirSync(join(wt, 'src/cli/commands'), { recursive: true });
  writeFileSync(join(wt, 'src/cli/commands/export.ts'), 'export const exportCsv = () => 0;\n');
  writeFileSync(join(wt, 'src/cli/exit.ts'), 'export enum ExitCode { Ok = 0, OutputExists = 3 }\n');
  let r = spex(repo, 'show', DIR, '--review');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.round, 1);
  assert.equal(r.json.base, gitIn(repo, ['rev-parse', 'main']).trim(), 'the base is where the branch of the spec left main');
  assert.ok(r.json.text.includes('evidence: (no verify run yet)'), r.json.text);
  const diff = read(wt, r.json.diff);
  assert.ok(diff.includes('OutputExists') && diff.includes('exportCsv'));
  assert.ok(diff.includes(`+++ b/${DIR}/status.yaml`) && !diff.includes('.spex/'), 'the diff has what the branch changed in the spec too, and nothing of the work of the script');
  r = spex(repo, 'show', DIR, '--review', '--task', 'T01');
  const sliced = read(wt, r.json.diff);
  assert.ok(sliced.includes('exportCsv') && !sliced.includes('OutputExists'), 'the task slice has only its paths');
  // the diff cap sends the reviewer to per-task slices
  edit(wt, '.spex/config.yaml', (s) => s.replace('diff_kb: 120', 'diff_kb: 1'));
  writeFileSync(join(wt, 'src/cli/index.ts'), `// ${'x'.repeat(2000)}\n`);
  r = spex(repo, 'show', DIR, '--review');
  assert.equal(r.code, 6);
  assert.ok(codes(r).includes('REVIEW-DIFF-BIG'));
});

test('check reads a note by its sections, and the whole-repo check sees every folder', () => {
  const repo = makeRepo('csv-export');
  let r = spex(repo, 'new', 'bulk-delete');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.spec, 'specs/008-bulk-delete/spec.md');
  // a note with only the template: no error, and its boundary is empty
  r = spex(repo, 'check', 'specs/008-bulk-delete');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(codes(r).sort(), ['REQ-MISSING', 'SPEC-NOTE', 'SPEC-SECTIONS']);
  assert.ok(finding(r, 'SPEC-SECTIONS').message.endsWith('Why, What, Not this'));
  // filled in, the warning goes; a hint alone does not count as words
  writeFileSync(join(repo, 'specs/008-bulk-delete/spec.md'), '# 008 Bulk delete\n\n## Why\nwords\n\n## What\n- words\n\n## Not this\n- words\n\n## Open questions\n<!-- hint only -->\n');
  r = spex(repo, 'check', 'specs/008-bulk-delete');
  assert.deepEqual(codes(r).sort(), ['REQ-MISSING', 'SPEC-NOTE']);
  // the whole-repo check sees the notes too, and an empty folder is still an error
  mkdirSync(join(repo, 'specs/010-empty'));
  r = spex(repo, 'check');
  assert.ok(r.json.features.includes('specs/008-bulk-delete') && !r.json.features.includes('specs/010-empty'), r.json.features.join(','));
  assert.ok(codes(spex(repo, 'check', 'specs/010-empty')).includes('SPEC-MISSING'));
  // one named spec is checked where it lives: an open spec in its worktree, from any folder of the repo
  rmSync(join(repo, 'specs/010-empty'), { recursive: true });
  commitAll(repo, 'a note');
  ok(repo, 'start', 'plan', DIR);
  const wt = worktreeOf(repo);
  edit(wt, `${DIR}/tasks.yaml`, (s) => s.replace('kind: story', 'kind: saga'));
  assert.equal(spex(repo, 'check', DIR).code, 4, 'the worktree copy is the one that counts');
  assert.equal(spex(join(repo, 'src'), 'check', DIR).code, 4);
});

test('a roadmap: notes in the order of their steps, a broken link between them, and what a later step inherits from a closed one', () => {
  const repo = makeRepo('csv-export');
  rmSync(join(repo, DIR), { recursive: true });
  // the first step names the roadmap; the others come after it, in order
  let r = spex(repo, 'new', 'ticket-model', '--roadmap', 'nex-platform', '--step', '1', '--source', 'docs/nex-design.md#3.1');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.dir, 'specs/001-ticket-model');
  const first = read(repo, r.json.spec);
  assert.ok(first.startsWith('---\nroadmap: nex-platform\nstep: 1\nsource: ["docs/nex-design.md#3.1"]\n---\n# 001 Ticket model\n'), first.split('\n').slice(0, 7).join('\n'));
  r = spex(repo, 'new', 'runner', '--roadmap', 'nex-platform', '--step', '2', '--depends-on', '001-ticket-model', '--source', 'docs/nex-design.md#3.2');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.depends_on, ['001-ticket-model']);
  r = spex(repo, 'new', 'runner-cli', '--roadmap', 'nex-platform', '--step', '3', '--depends-on', '001,002', '--source', 'docs/nex-design.md#3.4', '--source', 'docs/nex-design.md#3.5');
  assert.equal(r.code, 0, r.stdout);
  const note = read(repo, 'specs/003-runner-cli/spec.md');
  assert.ok(note.startsWith('---\nroadmap: nex-platform\nstep: 3\ndepends_on: [001-ticket-model, 002-runner]\nsource: ["docs/nex-design.md#3.4", "docs/nex-design.md#3.5"]\n---\n'), note.split('\n').slice(0, 8).join('\n'));
  // a note says what it is, and holds only what is known now: no empty heading reads as a failed run
  assert.ok(note.includes('> A note: step 3 of the roadmap nex-platform. /spex:plan writes the full spec when the turn of this spec comes.'), note);
  assert.deepEqual([...note.matchAll(/^## (.+)$/gm)].map((m) => m[1]), ['Why', 'What', 'Not this', 'From the design', 'Uses', 'Introduces', 'Open questions']);
  // usage: a step depends only on folders that exist; a roadmap step with no --step sorts last, and says so
  assert.equal(spex(repo, 'new', 'x', '--roadmap', 'nex-platform', '--depends-on', '099-nowhere').code, 2);
  assert.equal(spex(repo, 'new', 'x', '--roadmap', 'Bad Name').code, 2);
  assert.equal(spex(repo, 'new', 'x', '--roadmap', 'nex-platform', '--step', '0').code, 2);
  // check: a note of a roadmap says Why, What, Not this, Uses and Introduces; the design file is missing (a warning); SPEC-NOTE says what it waits for
  r = spex(repo, 'check', 'specs/003-runner-cli');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(codes(r).sort(), ['REQ-MISSING', 'SPEC-NOTE', 'SPEC-SECTIONS', 'SPEC-SOURCE', 'SPEC-SOURCE']);
  assert.ok(finding(r, 'SPEC-SECTIONS').message.endsWith('Why, What, Not this, Uses, Introduces'));
  assert.ok(finding(r, 'SPEC-NOTE').message.includes('waits for 001-ticket-model (a note), 002-runner (a note)'), r.stdout);
  mkdirSync(join(repo, 'docs'));
  writeFileSync(join(repo, 'docs/nex-design.md'), '# nex\n\n## 3.1\n\n## 3.2\n\n## 3.4\n\n## 3.5\n');
  const fill = (dir) => edit(repo, `${dir}/spec.md`, (s) => s.replace(/## Why\n\n<!--.*?-->/s, '## Why\nwords').replace(/## What\n\n<!--.*?-->/s, '## What\nwords').replace(/## Not this\n\n<!--.*?-->/s, '## Not this\nwords').replace(/## Uses\n\n<!--.*?-->/s, '## Uses\nNone.').replace(/## Introduces\n\n<!--.*?-->/s, '## Introduces\nNone.'));
  for (const d of ['specs/001-ticket-model', 'specs/002-runner', 'specs/003-runner-cli']) fill(d);
  assert.deepEqual(codes(spex(repo, 'check', 'specs/003-runner-cli')).sort(), ['REQ-MISSING', 'SPEC-NOTE']);
  // a broken dependency and a cycle are errors
  edit(repo, 'specs/002-runner/spec.md', (s) => s.replace('depends_on: [001-ticket-model]', 'depends_on: [001-ticket-model, 003-runner-cli]'));
  r = spex(repo, 'check', 'specs/002-runner');
  assert.equal(r.code, 4);
  assert.ok(codes(r).includes('SPEC-CYCLE'), codes(r).join(','));
  edit(repo, 'specs/002-runner/spec.md', (s) => s.replace('depends_on: [001-ticket-model, 003-runner-cli]', 'depends_on: [001-ticket-model, 099-nowhere]'));
  assert.ok(codes(spex(repo, 'check', 'specs/002-runner')).includes('SPEC-DEPENDS'));
  edit(repo, 'specs/002-runner/spec.md', (s) => s.replace('depends_on: [001-ticket-model, 099-nowhere]', 'depends_on: [001-ticket-model]'));
  commitAll(repo, 'three notes');
  // the turn is the order of the numbers: step 2 waits for step 1
  assert.deepEqual(codes(spex(repo, 'start', 'plan', 'specs/002-runner')), ['GATE-TURN']);

  // step 1 closed the short way, as the close leaves a spec on the base branch: records built, review done
  const fixture = (file) => readFileSync(new URL(`./fixtures/csv-export/${DIR}/${file}`, import.meta.url), 'utf8').replace('feature: "007"', 'feature: "001"').replace(/REQ-007-/g, 'REQ-001-').replace(/REQ_007_/g, 'REQ_001_');
  writeFileSync(join(repo, 'specs/001-ticket-model/requirements.yaml'), fixture('requirements.yaml').replace('slug: csv-export', 'slug: ticket-model').replace(/status: draft/g, 'status: built').replace('specs/007-csv-export/contracts/cli.md', 'specs/001-ticket-model/contracts/cli.md'));
  writeFileSync(join(repo, 'specs/001-ticket-model/tasks.yaml'), fixture('tasks.yaml').replace(/status: todo/g, 'status: done'));
  writeFileSync(join(repo, 'specs/001-ticket-model/tests.yaml'), fixture('tests.yaml'));
  mkdirSync(join(repo, 'specs/001-ticket-model/contracts'));
  writeFileSync(join(repo, 'specs/001-ticket-model/contracts/cli.md'), '# cli\n');
  writeFileSync(join(repo, 'specs/001-ticket-model/status.yaml'), 'command: review\nstate: done\n');
  mkdirSync(join(repo, '.spex/runs/001'), { recursive: true });
  writeFileSync(join(repo, '.spex/runs/001/review.json'), JSON.stringify({ status: 'concerns', stage: 'review', task: null, concerns: ['the runner keeps state in SQLite, not in memory'], questions: ['Q9: one database per run, or one for all?'] }));
  writeFileSync(join(repo, '.spex/runs/001/block-T02.json'), JSON.stringify({ task: 'T02', reason: 'openTasks() does not exist' }));
  commitAll(repo, 'step 1 is closed');
  r = spex(repo, 'roadmap', 'nex-platform');
  assert.equal(r.json.next, 'specs/002-runner');
  assert.ok(r.json.text.includes(' 1. specs/001-ticket-model  closed') && r.json.text.includes(' 3. specs/003-runner-cli  a note  waits: 002-runner'), r.json.text);
  assert.equal(spex(repo, 'status').json.next, '/spex:plan specs/002-runner');
  // lessons of the closed step, for the close of it; inherited by the next step, for its plan
  r = spex(repo, 'show', 'specs/001-ticket-model', '--lessons');
  assert.equal(r.code, 0, r.stdout);
  for (const needle of ['## concerns', 'review: the runner keeps state in SQLite', '## questions raised', 'Q9', '## blocked', 'T02: openTasks()', '## decisions', 'D1  Rows follow list order']) assert.ok(r.json.text.includes(needle), `lessons lack ${needle}\n${r.json.text}`);
  r = spex(repo, 'show', 'specs/002-runner', '--inherited');
  assert.equal(r.code, 0, r.stdout);
  for (const needle of ['from 001-ticket-model', '## 001-ticket-model — Export open tasks as CSV · built', 'goal:', 'interfaces: cli (cli, ', 'D1  Rows follow list order', 'produces:', 'exportCsv(store: TaskStore, out: Writable): Promise<number>  (T01)', 'exactly']) assert.ok(r.json.text.includes(needle), `inherited lacks ${needle}\n${r.json.text}`);
  assert.ok(spex(repo, 'show', 'specs/003-runner-cli', '--inherited').json.text.includes('(nothing settled yet)'), 'a dependency that is a note has nothing yet');

  // the turn of step 2 has come: plan opens the note. The note line goes, the sections it left out come with their hints, its words stay
  r = ok(repo, 'start', 'plan', 'specs/002-runner');
  assert.deepEqual(r.json.closed, ['001-ticket-model']);
  assert.ok(r.json.text.includes('closed before it: 001-ticket-model (fit.md reads what they built: SPEX show specs/002-runner --inherited)'), r.json.text);
  const opened = read(worktreeOf(repo, '002-runner'), 'specs/002-runner/spec.md');
  assert.ok(opened.startsWith('---\nroadmap: nex-platform\nstep: 2\n') && !opened.includes('> A note:'), opened);
  assert.deepEqual([...opened.matchAll(/^## (.+)$/gm)].map((m) => m[1]), ['Why', 'What', 'Not this', 'From the design', 'Uses', 'Introduces', 'Open questions', 'Who', 'Constraints', 'Success', 'Alternatives', 'Decisions']);
  assert.ok(opened.includes('## Why\nwords') && opened.includes('Tech, time, cost, compatibility. -->'), opened);
  // a second start changes nothing in the file
  ok(repo, 'start', 'plan', 'specs/002-runner');
  assert.equal(read(worktreeOf(repo, '002-runner'), 'specs/002-runner/spec.md'), opened);
  // step 3 still waits, now for step 2 only
  assert.deepEqual(spex(repo, 'roadmap', 'nex-platform').json.steps[2].waits, ['specs/002-runner']);
  assert.deepEqual(spex(repo, 'roadmap', 'nex-platform').json.steps.map((s) => s.stage), ['closed', 'plan, started', 'a note']);
});

test('the format is one integer in the config: missing means 1, init writes 3, check and --version report it', () => {
  const repo = makeRepo('csv-export');
  let r = spex(repo, 'check', DIR);
  assert.deepEqual(r.json.format, { repo: 3, script: 3 });
  assert.match(spexText(repo, '--version').stdout, /^spex 3\.\d+\.\d+ \(format 3\)\n$/);
  r = spex(repo, 'init', '--force');
  assert.equal(r.code, 0, r.stdout);
  const config = read(repo, '.spex/config.yaml');
  assert.ok(config.split('\n')[1].startsWith('format: 3 '), config.split('\n').slice(0, 2).join('\n'));
  for (const key of ['drivers:', 'live: []', 'people: []', 'verify_rounds: 3', 'commit: false', 'base: ""', 'close: {cmd: ""}', 'worktree: {setup: ""}', '# env: {']) assert.ok(config.includes(key), `init writes ${key}`);
  assert.ok(!/^(ship|approvals):/m.test(config), 'the keys of format 2 are gone');
  assert.deepEqual(spex(repo, 'check', DIR).json.format, { repo: 3, script: 3 });
  // a repo without the line is format 1, and nothing runs until spex update
  writeFileSync(join(repo, '.spex/config.yaml'), config.replace(/^format: 3 .*\n/m, ''));
  r = spex(repo, 'check', DIR);
  assert.equal(r.code, 4);
  assert.ok(codes(r).includes('CONFIG-FORMAT') && finding(r, 'CONFIG-FORMAT').fix.includes('spex update'));
  r = spex(repo, 'start', 'plan', DIR);
  assert.equal(r.code, 4, r.stdout);
  assert.deepEqual(codes(r), ['CONFIG-FORMAT'], 'no phase starts on an older format');
});

test('update keeps the config a person wrote and adds what a newer plugin needs; a newer repo is refused', () => {
  const repo = makeRepo('csv-export');
  const path = join(repo, '.spex/config.yaml');
  const before = readFileSync(path, 'utf8'); // a header comment, format 3, no drivers, no close, no tests_scenarios
  assert.ok(before.startsWith('# The example repo'));
  let r = spex(repo, 'update');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.changes, ['added drivers: {}', 'added repos: {}', 'added live: []', 'added people: []', 'added verify_rounds: 3', 'added auto: false', 'added commit: false', 'added base: ""', 'added close: {"cmd":""}', 'added worktree: {"setup":""}', 'added limits.tests_scenarios: 12', 'added limits.step_introduces: 10']);
  const after = readFileSync(path, 'utf8');
  assert.ok(after.startsWith('# The example repo'), `the header comment stays first:\n${after}`);
  assert.ok(after.includes('acceptance_cmd: node --test --test-name-pattern="{ids}"'), 'values kept');
  assert.match(after, /^commit: false # true: the script commits the notes of new, new-bug and delete on the base branch/m);
  assert.match(after, /^close: \{ ?cmd: "" ?\} # cmd: push, open the request, merge it/m);
  assert.match(after, /^drivers: \{\} # more ways to run script tests/m);
  assert.ok(after.includes('tests_scenarios: 12'));
  assert.ok(!existsSync(join(repo, DIR, 'status.yaml')), 'a repo at this format gets no state written');
  // a second run changes nothing, check is still clean, and a newer repo is refused
  r = spex(repo, 'update');
  assert.deepEqual(r.json.changes, []);
  assert.equal(spex(repo, 'check', DIR).code, 0, 'check after update');
  writeFileSync(path, after.replace('format: 3', 'format: 99'));
  r = spex(repo, 'update');
  assert.equal(r.code, 4);
  assert.ok(codes(r).includes('CONFIG-FORMAT'));
  assert.equal(spex(join(repo, 'src'), 'update').code, 4, 'the root is found from a subfolder, and the same refusal comes back');
});

test('update migrates a format 1 repo through format 2 to 3: verification leaves the records, verify leaves the tasks, tests.yaml is written, and the plan is stamped', () => {
  const repo = makeRepo('csv-export');
  // make the fixture look like format 1: no format line, verification on every record, a verify command on T02, no tests.yaml
  edit(repo, `${DIR}/requirements.yaml`, (s) => s.replace(/    applies_to: \[cli\]\n/g, '    applies_to: [cli]\n    verification: {mode: isolated-interface, method: test}\n'));
  edit(repo, `${DIR}/tasks.yaml`, (s) => s.replace('feature: "007"\n', 'feature: "007"\napprovals:\n  tasks: 0123456789abcdef\n').replace('    done_when: The REQ-007-002 acceptance test passes.', '    verify: ["test -f src/cli/exit.ts"]\n    done_when: The REQ-007-002 acceptance test passes.'));
  rmSync(join(repo, DIR, 'tests.yaml'));
  // with the format line still there, the schema errors name the migration
  let r = spex(repo, 'check', DIR);
  assert.equal(r.code, 4);
  assert.ok(r.json.findings.some((f) => f.code === 'REQ-SCHEMA' && f.message.includes('verification') && f.message.includes('spex update')), `the schema error names the migration\n${r.stdout}`);
  assert.ok(r.json.findings.some((f) => f.code === 'TASK-SCHEMA' && f.message.includes('verify') && f.message.includes('spex update')), r.stdout);
  edit(repo, '.spex/config.yaml', (s) => s.replace('format: 3\n', ''));
  r = spex(repo, 'check', DIR);
  assert.equal(r.code, 4);
  assert.ok(codes(r).includes('CONFIG-FORMAT'));
  r = spex(repo, 'update');
  assert.equal(r.code, 0, r.stdout);
  for (const needle of ['specs/007-csv-export/requirements.yaml: verification removed from 2 record(s)', 'specs/007-csv-export/tasks.yaml: verify moved to tests.yaml (1 task(s))', 'specs/007-csv-export/tests.yaml: written from 2 scenario(s) and 1 task(s) with verify commands', 'format 1 → 2', 'specs/007-csv-export/status.yaml: plan, done; the plan is stamped as it is', 'format 2 → 3', 'format: 3']) assert.ok(r.json.changes.some((c) => c.startsWith(needle)), `${needle}\n${r.json.changes.join('\n')}`);
  assert.deepEqual(r.json.changes.filter((c) => c.startsWith('format')), ['format 1 → 2', 'format 2 → 3', 'format: 3'], 'the migrations run in order');
  assert.deepEqual([r.json.from, r.json.to], [1, 3]);
  assert.ok(!read(repo, `${DIR}/requirements.yaml`).includes('verification'));
  assert.ok(!read(repo, `${DIR}/tasks.yaml`).includes('verify:'));
  assert.ok(r.json.changes.some((c) => c.endsWith('the tasks approval restamped')), r.json.changes.join('\n'));
  assert.ok(read(repo, `${DIR}/tasks.yaml`).includes('decisions:\n    - id: D1'), 'layout kept');
  const tests = parse(read(repo, `${DIR}/tests.yaml`), { schema: 'core' });
  assert.deepEqual(tests.tests.map((t) => [t.id, t.covers, t.kind, t.driver ?? null, t.name ?? null, t.file ?? null]), [
    ['TS01', ['REQ-007-001/AC-1'], 'script', null, 'REQ_007_001_AC_1_writes_open_tasks_as_csv', 'tests/acceptance/export.test.mjs'],
    ['TS02', ['REQ-007-002/AC-1'], 'script', null, 'REQ_007_002_AC_1_refuses_overwrite', 'tests/acceptance/export.test.mjs'],
    ['TS03', ['T02'], 'script', 'shell', null, null],
  ]);
  assert.deepEqual(tests.tests[2].steps, ['test -f src/cli/exit.ts']);
  r = spex(repo, 'check', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(codes(r).filter((c) => c !== 'REQ-QUESTION-OPEN'), []);
  // the plan the person read before the migration is the stamped plan: once it is committed, implement takes it
  assert.equal(read(repo, `${DIR}/status.yaml`), 'command: plan\nstate: done\n');
  assert.deepEqual(spex(repo, 'list').json.specs.map((s) => s.state), ['planned']);
  commitAll(repo, 'spex 3');
  r = spex(repo, 'start', 'implement', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.approved, r.json.was], [2, { command: 'plan', state: 'done' }]);
});

test('update 2 → 3: ship becomes commit and close, approvals go, the status line leaves spec.md, and status.yaml says where each spec stands', () => {
  const repo = makeRepo('csv-export');
  // a spex 2 repo: the config of format 2, and five specs at five places of the old process
  edit(repo, '.spex/config.yaml', (s) => `${s.replace('format: 3', 'format: 2')}approvals: [tasks, tests]\nship: {commit: true, cmd: "gh pr create --fill && gh pr merge --squash"}\nrepos: {ui: {path: ../ui, ship: {commit: false, cmd: "make merge"}}}\n`);
  const plan = (n, slug, { records, tasks }) => {
    const dir = `specs/${n}-${slug}`;
    const from = (file) => read(repo, `${DIR}/${file}`).replace('feature: "007"', `feature: "${n}"`).replace(/REQ-007-/g, `REQ-${n}-`).replace(/REQ_007_/g, `REQ_${n}_`).replace('slug: csv-export', `slug: ${slug}`).replace('specs/007-csv-export/contracts', `${dir}/contracts`);
    mkdirSync(join(repo, dir, 'contracts'), { recursive: true });
    writeFileSync(join(repo, dir, 'contracts/cli.md'), '# cli\n');
    writeFileSync(join(repo, dir, 'requirements.yaml'), from('requirements.yaml').replace(/status: draft/g, `status: ${records}`));
    if (tasks) {
      writeFileSync(join(repo, dir, 'tasks.yaml'), from('tasks.yaml').replace(/(id: T01[\s\S]*?status: )todo/, `$1${tasks}`));
      writeFileSync(join(repo, dir, 'tests.yaml'), from('tests.yaml').replace(/tests\/acceptance\/export\.test\.mjs/g, `tests/acceptance/export-${n}.test.mjs`));
      writeFileSync(join(repo, `tests/acceptance/export-${n}.test.mjs`), read(repo, 'tests/acceptance/export.test.mjs').replace(/REQ_007_/g, `REQ_${n}_`));
    }
    return dir;
  };
  const body = read(repo, `${DIR}/spec.md`);
  // 008 is in develop: a full plan, approved, one task done; its spec.md has other front matter too
  const inFlight = plan('008', 'restore', { records: 'approved', tasks: 'done' });
  writeFileSync(join(repo, inFlight, 'spec.md'), `---\nstatus: ready\nroadmap: backups\nstep: 2\n---\n${body}`);
  // 009 has a full plan and no task done, and no front matter; 010 has only its records
  const planned9 = plan('009', 'undo', { records: 'draft', tasks: 'todo' });
  writeFileSync(join(repo, planned9, 'spec.md'), body);
  const part = plan('010', 'purge', { records: 'draft', tasks: null });
  writeFileSync(join(repo, part, 'spec.md'), `---\nstatus: ready\n---\n${body}`);
  // 007 was shipped: every record built, and spec.md says ready
  edit(repo, `${DIR}/requirements.yaml`, (s) => s.replace(/status: draft/g, 'status: built'));
  edit(repo, `${DIR}/tasks.yaml`, (s) => s.replace(/status: todo/g, 'status: done'));
  edit(repo, `${DIR}/spec.md`, (s) => `---\nstatus: ready\n---\n${s}`);
  // 011 is a planned stub of a roadmap; 012 is being shaped
  mkdirSync(join(repo, 'specs/011-archive'));
  writeFileSync(join(repo, 'specs/011-archive/spec.md'), '---\nstatus: planned\nroadmap: backups\nstep: 5\ndepends_on: [008-restore]\n---\n# Archive\n\n> Planned: step 5 of the roadmap backups. /spex:new shapes it once 008-restore is built.\n\n## Why\nw\n\n## What\nw\n\n## Not this\nw\n\n## Uses\nNone.\n\n## Introduces\nNone.\n');
  mkdirSync(join(repo, 'specs/012-labels'));
  writeFileSync(join(repo, 'specs/012-labels/spec.md'), '---\nstatus: shaping\n---\n# Labels\n\n## Why\nw\n\n## What\nw\n\n## Not this\nw\n');
  commitAll(repo, 'a spex 2 repo');

  // nothing runs on the old format, and each command says what to do
  let r = spex(repo, 'check');
  assert.equal(r.code, 4, r.stdout);
  assert.ok(finding(r, 'CONFIG-FORMAT').message === 'the specs are format 2; this spex writes format 3' && finding(r, 'CONFIG-FORMAT').fix.startsWith('Run `spex update`'), r.stdout);

  r = spex(repo, 'update');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.from, r.json.to], [2, 3]);
  const expected = [
    'ship: → commit: and close: {cmd}',
    'approvals: removed (the next command is the approval)',
    'repos.ui.ship → close',
    'specs/007-csv-export/spec.md: the status line is gone',
    'specs/007-csv-export/status.yaml: review, done (it was shipped)',
    'specs/008-restore/spec.md: the status line is gone',
    'specs/008-restore/status.yaml: implement, started; the plan is stamped as it is',
    'specs/009-undo/status.yaml: plan, done; the plan is stamped as it is',
    'specs/010-purge/spec.md: the status line is gone',
    'specs/010-purge/status.yaml: plan, started (/spex:plan specs/010-purge finishes it)',
    'specs/011-archive/spec.md: the status line is gone',
    'specs/012-labels/spec.md: the status line is gone',
    'format 2 → 3',
  ];
  assert.deepEqual(r.json.changes.slice(0, expected.length), expected);
  assert.equal(r.json.changes.at(-1), 'format: 3');
  // the config: every value of the person is kept under its new key
  const cfg = parse(read(repo, '.spex/config.yaml'));
  assert.deepEqual([cfg.format, cfg.commit, cfg.close, cfg.repos.ui, cfg.base, cfg.worktree], [3, true, { cmd: 'gh pr create --fill && gh pr merge --squash' }, { path: '../ui', close: { commit: false, cmd: 'make merge' } }, '', { setup: '' }]);
  assert.ok(!('ship' in cfg) && !('approvals' in cfg));
  assert.ok(read(repo, '.spex/config.yaml').startsWith('# The example repo'), 'the header comment stays first');
  // spec.md: only the status line goes. A front matter with nothing else goes with it.
  assert.ok(read(repo, `${DIR}/spec.md`).startsWith('# CSV export\n'));
  assert.ok(read(repo, `${inFlight}/spec.md`).startsWith('---\nroadmap: backups\nstep: 2\n---\n# CSV export\n'));
  assert.ok(read(repo, 'specs/011-archive/spec.md').startsWith('---\nroadmap: backups\nstep: 5\ndepends_on: [008-restore]\n---\n# Archive\n'));
  assert.ok(read(repo, 'specs/012-labels/spec.md').startsWith('# Labels\n'));
  // status.yaml: one for each spec a phase had started for, none for a note
  assert.equal(read(repo, `${DIR}/status.yaml`), 'command: review\nstate: done\n');
  assert.equal(read(repo, `${inFlight}/status.yaml`), 'command: implement\nstate: started\n');
  assert.equal(read(repo, `${planned9}/status.yaml`), 'command: plan\nstate: done\n');
  assert.equal(read(repo, `${part}/status.yaml`), 'command: plan\nstate: started\n');
  assert.ok(!existsSync(join(repo, 'specs/011-archive/status.yaml')) && !existsSync(join(repo, 'specs/012-labels/status.yaml')));
  assert.deepEqual(spex(repo, 'list').json.specs.map((s) => [s.dir.slice(6, 9), s.state]), [['007', 'closed'], ['008', 'implement, started'], ['009', 'planned'], ['010', 'plan, started'], ['011', 'a note'], ['012', 'a note']]);
  // the plans a person had approved are stamped as they are: the stamp is in the files
  assert.match(read(repo, `${inFlight}/tasks.yaml`), /approvals:\n {2}tasks: [0-9a-f]{16}\n {2}spec: [0-9a-f]{16}\n {2}requirements: [0-9a-f]{16}\n/);
  assert.match(read(repo, `${planned9}/tests.yaml`), /approvals:\n {2}tests: [0-9a-f]{16}\n/);
  assert.ok(!read(repo, `${DIR}/tasks.yaml`).includes('approvals:'), 'a shipped spec needs no stamp');
  // the repo is clean for this script now, and a second update changes nothing
  r = spex(repo, 'check');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(spex(repo, 'update').json.changes, []);
  assert.equal(spex(repo, 'status').json.next, `/spex:implement ${inFlight}`, 'the spec that was in flight is the open one');

  // a worktree gets only what is committed: the migration is committed first, then the spec in flight goes on where it was
  r = spex(repo, 'start', 'implement', inFlight);
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['GATE-COMMIT']);
  assert.ok(r.json.uncommitted.includes('.spex/config.yaml') && r.json.uncommitted.includes(`${inFlight}/status.yaml`), r.stdout);
  assert.ok(!existsSync(join(repo, '.claude/worktrees')), 'no worktree is made from a commit that lacks the migration');
  commitAll(repo, 'spex 3');
  r = spex(repo, 'start', 'implement', inFlight);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.was, r.json.approved, r.json.worktree], [{ command: 'implement', state: 'started' }, 0, worktreeOf(repo, '008-restore')]);
  assert.ok(r.json.text.includes('tasks: 1 done, 1 todo, 0 blocked'), r.json.text);
  assert.equal(spex(repo, 'gate', 'develop', inFlight, 'T02').code, 0, 'the next task opens with no second approval');
});

test('verify puts the code into the environment first: env.deploy and env.check run before the tests, a failed deploy is a red run, and the tests get SPEX_ENV_URL', () => {
  const { repo, wt } = implementing((main) => {
    configure(main, 'env: {deploy: "echo deployed >> env.log", check: "test -f healthy.flag", url: "http://todo.localhost:8080"}');
    // TS03 passes only when the test run has the address of the environment
    edit(main, `${DIR}/tests.yaml`, (s) => `${s}  - id: TS03\n    covers: [T02]\n    kind: script\n    driver: shell\n    steps:\n      - test "$SPEX_ENV_URL" = "http://todo.localhost:8080"\n    expect:\n      - the exit code is 0\n`);
  });
  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n');
  // the app does not answer: the run is red, also with every test green, and the finding names the command
  let r = spex(repo, 'verify', DIR);
  assert.equal(r.code, 7, r.stdout);
  assert.deepEqual(codes(r), ['ENV-DEPLOY']);
  assert.ok(finding(r, 'ENV-DEPLOY').message === 'the environment is not ready: `test -f healthy.flag` exited 1' && finding(r, 'ENV-DEPLOY').fix.startsWith('It counts as a red test'), r.stdout);
  assert.equal(r.json.evidence.ok, false);
  assert.deepEqual(r.json.evidence.scripts.map((s) => [s.id, s.ok]), [['TS01', true], ['TS02', true], ['TS03', true]], 'the tests ran, and each has its verdict');
  assert.equal(read(wt, 'env.log'), 'deployed\n', 'the deploy ran in the worktree of the spec');
  for (const t of ['T01', 'T02']) ok(repo, 'done', DIR, t);
  assert.deepEqual(codes(spex(repo, 'end', 'implement', DIR)), ['GATE-VERIFY'], 'a red deploy is no proof');
  // the app answers: deploy, then check, before every full run
  writeFileSync(join(wt, 'healthy.flag'), '');
  r = spex(repo, 'verify', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.evidence.round, 2);
  assert.equal(read(wt, 'env.log'), 'deployed\ndeployed\n');
  assert.ok(read(wt, '.spex/evidence/007/verify-2.log').startsWith('$ echo deployed >> env.log\n\n$ test -f healthy.flag\n'), 'the log starts with the environment');
});

test('report writes the run status file Dex reads', () => {
  const repo = makeRepo('csv-export');
  const r = spex(repo, 'report', DIR, 'develop', 'T01', '--status', 'concerns', '--summary', 'Done, but the test asserts the wrong header.', '--concern', 'REQ-007-001/AC-1 expects `title,list`; the contract says `list,title`', '--file', 'src/cli/commands/export.ts', '--pulled', 'REQ-007-002');
  assert.equal(r.code, 0, r.stdout);
  const doc = JSON.parse(read(repo, '.spex/runs/007/develop-T01.json'));
  assert.equal(doc.status, 'concerns');
  assert.equal(doc.concerns.length, 1);
  assert.deepEqual(doc.pulled, ['REQ-007-002']);
  assert.equal(spex(repo, 'report', DIR, 'develop', 'T01', '--status', 'nope', '--summary', 'x').code, 2);
  // for an open spec the file is with the rest of its work, in the worktree
  const { repo: open, wt } = implementing();
  assert.equal(spex(open, 'report', DIR, 'implement', 'T01', '--status', 'done', '--summary', 'T01 is in.').code, 0);
  assert.ok(existsSync(join(wt, '.spex/runs/007/implement-T01.json')) && !existsSync(join(open, '.spex/runs')));
});

test('init prefers the runner that can see the acceptance folder, and names a playwright driver when the repo has it', () => {
  // Dex's shape: vitest for the renderer (an include list that stops at src/renderer), node --test for the core.
  const dir = tempDir('spex-init2-');
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', scripts: { test: 'npm run test:core && npm run test:renderer', 'test:core': 'node --import ./scripts/hook.mjs --test --experimental-strip-types "src/core/**/*.test.ts"', 'test:renderer': 'vitest run', typecheck: 'tsc --noEmit' }, devDependencies: { vitest: '^3', typescript: '^5', '@playwright/test': '^1.50' } }));
  writeFileSync(join(dir, 'vitest.config.ts'), "export default { test: { include: ['src/renderer/**/*.test.{ts,tsx}'] } };\n");
  mkdirSync(join(dir, 'src'));
  mkdirSync(join(dir, 'tests/e2e'), { recursive: true });
  const r = spex(dir, 'init');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.runner, 'node --test');
  assert.ok(r.json.acceptance_cmd.startsWith('node --test --test-name-pattern="{ids}" "tests/acceptance/'), r.json.acceptance_cmd);
  assert.deepEqual(r.json.playwright, { cmd: 'npx playwright test --grep "{ids}"', dir: 'tests/e2e' });
  assert.equal(r.json.acceptance_dir, 'tests/acceptance', 'the e2e folder is the driver\'s, not the acceptance folder');
  assert.ok(r.json.notes.some((n) => n.startsWith('vitest.config.ts includes only')), r.stdout);
  assert.ok(r.json.notes.some((n) => n.includes('2 runners in package.json (node --test, vitest)')), r.stdout);
  assert.ok(r.json.notes.some((n) => n.includes('--experimental-strip-types')), r.stdout);
  const config = read(dir, '.spex/config.yaml');
  assert.ok(!config.includes('runner:'), 'the header does not name a runner that a hand edit makes stale');
  assert.ok(config.includes('drivers: {playwright: {cmd: "npx playwright test --grep \\"{ids}\\"", dir: tests/e2e}}'), config);
  assert.equal(spex(dir, 'check').code, 0, 'the config parses');
});

test('init writes .spex/config.yaml and .spex/.gitignore from a package.json scan', () => {
  const dir = tempDir('spex-init-');
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', scripts: { test: 'vitest run', typecheck: 'tsc --noEmit', 'test:acceptance': 'vitest run tests/acceptance' }, devDependencies: { vitest: '^3' } }));
  mkdirSync(join(dir, 'src'));
  mkdirSync(join(dir, 'tests/acceptance'), { recursive: true });
  gitIn(dir, ['init', '-q', '-b', 'main']);
  let r = spex(dir, 'init');
  assert.equal(r.code, 0, r.stdout);
  const cfg = parse(read(dir, '.spex/config.yaml'), { schema: 'core' });
  assert.equal(cfg.format, 3);
  assert.equal(cfg.acceptance_dir, 'tests/acceptance');
  assert.ok(cfg.acceptance_cmd.includes('test:acceptance') && cfg.acceptance_cmd.includes('{ids}'));
  assert.deepEqual(cfg.fast_checks, ['npm run typecheck', 'npm test']);
  assert.ok(cfg.protected.includes('.spex/'), 'no task may write the config');
  assert.deepEqual(cfg.drivers, {});
  // the script commits nothing on the base branch, and merges nothing, until the person says so
  assert.deepEqual([cfg.commit, cfg.base, cfg.close, cfg.worktree, cfg.env], [false, '', { cmd: '' }, { setup: '' }, undefined]);
  assert.ok(!('ship' in cfg) && !('approvals' in cfg));
  assert.ok(!existsSync(join(dir, '.gitignore')), 'the root .gitignore is not touched');
  // git sees the config and nothing else under .spex/: not the evidence, and not the archive of a deleted spec
  for (const work of ['evidence', 'archive/001-x-2026-01-01']) {
    mkdirSync(join(dir, '.spex', work), { recursive: true });
    writeFileSync(join(dir, '.spex', work, 'x.json'), '{}');
  }
  const seen = gitIn(dir, ['ls-files', '--others', '--exclude-standard']).split('\n').filter((p) => p.startsWith('.spex/'));
  assert.deepEqual(seen.sort(), ['.spex/.gitignore', '.spex/config.yaml']);
  assert.equal(spex(dir, 'init').code, 6, 'refuses to overwrite');
  assert.equal(spex(dir, 'check').code, 0, 'a repo with no specs is clean');
  // an old root .gitignore line that hides the config gets a note
  writeFileSync(join(dir, '.gitignore'), 'node_modules/\n.spex/\n');
  r = spex(dir, 'init', '--force');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.notes.some((n) => n.includes('.gitignore ignores .spex/')), r.stdout);
  assert.equal(r.json.gitignore, 'kept');
});

test('text mode prints findings with their fix; usage errors exit 2, and a command of spex 2 names the way of 3.0', () => {
  const { repo, wt } = implementing();
  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n'); // the tests are green too early
  let r = spexText(repo, 'gate', 'develop', DIR, 'T01');
  assert.equal(r.code, 6, r.stdout);
  assert.ok(r.stdout.includes('GATE-RED') && r.stdout.includes('→'));
  assert.equal(spexText(repo, 'frobnicate').code, 2);
  assert.equal(spexText(repo, 'archive', DIR).code, 2);
  assert.equal(spexText(repo, 'show', DIR).code, 2);
  assert.equal(spexText(repo).code, 2);
  assert.equal(spexText(repo, 'status', '--shaping').code, 2, 'an unknown flag is refused, never dropped');
  // the commands that are gone say what took their place
  for (const [gone, now] of [['approve', '`spex start implement <dir>` approves the plan'], ['next', 'next is `spex status` since 3.0'], ['ship', '`spex close <dir> <sync|later|prove|built|merge|finish>`'], ['drop', '`spex delete <dir> --reason "…"`']]) {
    r = spexText(repo, gone, DIR);
    assert.equal(r.code, 2, gone);
    assert.ok(r.stderr.startsWith('usage: ') && r.stderr.includes(now), `${gone}: ${r.stderr.slice(0, 200)}`);
    assert.equal(spex(repo, gone, DIR).json.findings[0].code, 'USAGE');
  }
  // the gates that were phases are gone too: a phase starts and ends with its own command
  for (const stage of ['new', 'requirements', 'tasks', 'review', 'ship']) {
    const g = spex(repo, 'gate', stage, DIR);
    assert.equal(g.code, 2, stage);
    assert.ok(g.json.findings[0].fix.startsWith('Stages: tests, develop, verify.') && g.json.findings[0].fix.includes('spex start <plan|implement|review> <dir>'), g.stdout);
  }
  // the help lists the eight commands of a person through their script calls, and no command of spex 2
  const help = spexText(repo, '--help').stdout;
  for (const line of ['spex start plan <dir>', 'spex end implement <dir>', 'spex close <dir> <sync|later|prove|built|merge|finish>', 'spex comment [', 'spex stamp <dir>', 'spex new-bug <slug> --words <file>', 'spex delete <dir>… --reason', 'spex status', 'Exit codes: 0 ok · 2 usage · 4 invalid · 5 gap · 6 refused · 7 failed · 8 a worktree is not removed']) assert.ok(help.includes(line), line);
  assert.ok(!/spex (approve|next|ship|drop)\b/.test(help), 'no command of spex 2 is in the help');
});

test('review accept: every finding at once, the person answers in one word; a fix pick is a task and implement again, and needs no second approval', () => {
  // nex 028: each review finding went through approve, tests, develop, verify and a fresh full review, and the
  // fourth round had no way to ship. Now the round waits for one answer, a fix pick sends the spec back to
  // implement, and a later round only checks the fixes.
  const { repo, wt } = reviewing();
  let r = spex(repo, 'show', DIR, '--review');
  assert.equal(r.json.round, 1);
  assert.equal(r.json.findings_file, '.spex/review/007-1.findings.yaml');
  const head = (id, severity, pick) => `  - id: ${id}\n    severity: ${severity}\n    title: Finding ${id} of the round\n    file: src/cli/commands/export.ts\n    line: 12\n    pick: ${pick}\n`;
  const scenario = '    when: a list has a task whose title holds a newline\n    effect: the row splits in two\n';
  const fixPart = '    fix: quote a title that holds a newline, in export.ts\n    done_when: a title with a newline is one quoted CSV field\n    requirements: [REQ-007-001]\n    paths: [src/cli/commands/export.ts]\n    context: [src/state.txt]\n';
  const findingsPath = join(wt, '.spex/review/007-1.findings.yaml');
  // the reviewer left out a part the schema needs: accept shows the schema error, not "no findings wait", and the close stays shut
  writeFileSync(findingsPath, `feature: "007"\nround: 1\nfindings:\n${head('F1', 'P1', 'fix')}${scenario}`);
  r = spex(repo, 'review', 'accept', DIR, 'ok');
  assert.equal(r.code, 4, r.stdout);
  assert.ok(codes(r).includes('REVIEW-SCHEMA'));
  assert.deepEqual(codes(spex(repo, 'close', DIR, 'built')), ['CLOSE-REVIEW']);
  // a defer needs only why, and a nit needs no scenario: both are a valid round
  writeFileSync(findingsPath, `feature: "007"\nround: 1\nfindings:\n${head('F1', 'P1', 'fix')}${scenario}${fixPart}${head('F2', 'P3', 'defer')}${scenario}    why: no user has a newline in a title\n${head('F3', 'nit', 'skip')}`);
  assert.equal(spex(repo, 'status').json.next, `/spex:review ${DIR}`, 'the round waits for the answer in the same phase');

  // a fix pick needs the fix, the claim and the paths; a pick the round does not have is refused
  r = spex(repo, 'review', 'accept', DIR, '2=fix');
  assert.ok(codes(r).includes('REVIEW-FIX'));
  assert.ok(r.json.findings[0].message.includes('F2 has no fix and done_when and paths'), r.stdout);
  assert.ok(codes(spex(repo, 'review', 'accept', DIR, '9=fix')).includes('REVIEW-UNKNOWN'));
  assert.equal(spex(repo, 'review', 'accept', DIR, 'maybe').code, 2);
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: review\nstate: started\n', 'a refused answer changes nothing');

  // a round that waits for its answer is named by the start: its list is shown again, and no reviewer runs
  r = ok(repo, 'start', 'review', DIR);
  assert.deepEqual(r.json.waits, { round: 1, path: '.spex/review/007-1.findings.yaml' });
  assert.ok(r.json.text.includes('round 1 waits for its answer: .spex/review/007-1.findings.yaml\nprint its list again, and stop: no reviewer runs'), r.json.text);

  r = spex(repo, 'review', 'accept', DIR, 'ok');
  assert.equal(r.code, 0, r.stdout);
  // the entry of each fix pick is named, so the stamp closes it by its id when the plan follows
  assert.deepEqual(r.json.entries, ['C1']);
  assert.ok(r.json.text.includes(`open in corrections.md: C1 (\`spex stamp ${DIR} --close C1\` closes them when the plan follows)`), r.json.text);
  const tasks = tasksOf(wt);
  const t03 = tasks.tasks.find((t) => t.id === 'T03');
  assert.deepEqual([t03.kind, t03.severity, t03.review, t03.status, t03.instructions], ['fix', 'P1', '007-1/F1', 'todo', 'quote a title that holds a newline, in export.ts']);
  assert.ok(t03.source.startsWith('review round 1 F1 (P1, src/cli/commands/export.ts:12)') && t03.source.includes('When a list has a task whose title holds a newline'), t03.source);
  assert.deepEqual(tasks.deferred.map((d) => [d.severity, d.by, d.why]), [['P3', 'person', 'no user has a newline in a title']]);
  assert.equal(tasks.tasks.length, 3, 'the skip pick made nothing');
  const accepted = parse(readFileSync(findingsPath, 'utf8')).accepted;
  assert.deepEqual([accepted.by, accepted.tasks, accepted.deferred, accepted.skipped], ['person', ['T03'], ['F2'], ['F3']]);
  assert.equal(JSON.parse(read(wt, '.spex/runs/007/review.json')).status, 'concerns');
  assert.equal(spex(repo, 'review', 'accept', DIR).json.findings[0].code, 'REVIEW-NONE', 'an answered round is not answered twice');
  // each pick is an entry in corrections.md: the fix is open until it is built, a defer and a skip are closed at once
  const entries = read(wt, `${DIR}/corrections.md`);
  assert.ok(entries.includes('## C1 · review, round 1 · finding F1, P1\nFound: src/cli/commands/export.ts:12: Finding F1 of the round\nChanged: T03 new\nPick: fix (you)\nState: open\n'), entries);
  assert.ok(entries.includes('## C2 · review, round 1 · finding F2, P3\nFound: src/cli/commands/export.ts:12: Finding F2 of the round\nPick: defer (you)\nWhy: no user has a newline in a title\nState: closed: the close reads it for the later specs\n'), entries);
  assert.ok(entries.endsWith('## C3 · review, round 1 · finding F3, nit\nFound: src/cli/commands/export.ts:12: Finding F3 of the round\nPick: skip (you)\nWhy: no reason given\nState: closed: skipped\n'), entries);
  // the pick was the ok: the spec is in implement again, with no command typed, and the close is shut
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: implement\nstate: started\n');
  assert.ok(r.json.text.includes('state: implement, started. No command is typed'), r.json.text);
  assert.deepEqual(codes(spex(repo, 'close', DIR, 'sync')), ['CLOSE-ORDER']);
  r = spex(repo, 'status');
  assert.equal(r.json.next, `/spex:implement ${DIR}`);
  assert.ok(r.json.text.includes('C1: a correction is not finished, and the run finishes it.'), r.json.text);

  // the accept was the approval: the fix task and its test are no part of the stamp, so no gate asks for one
  r = spex(repo, 'gate', 'develop', DIR, 'T03');
  assert.deepEqual(codes(r), ['GATE-COVERAGE'], 'only its test is missing');
  edit(wt, `${DIR}/tests.yaml`, (s) => `${s}  - id: TS03\n    covers: [T03]\n    kind: script\n    driver: shell\n    steps:\n      - grep -q fixed src/fix.txt\n    expect:\n      - the exit code is 0\n`);
  r = spex(repo, 'gate', 'develop', DIR, 'T03');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(spex(repo, 'check', DIR).code, 0);
  r = spex(repo, 'start', 'implement', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.resume, ['C1'], 'implement, typed by a person in a new chat, finishes the same fix');

  // only spex review accept writes the review field: a forged one is an error
  edit(wt, `${DIR}/tasks.yaml`, (s) => s.replace('review: 007-1/F1', 'review: 007-1/F3'));
  assert.ok(codes(spex(repo, 'check', DIR)).includes('TASK-REVIEW'));
  edit(wt, `${DIR}/tasks.yaml`, (s) => s.replace('review: 007-1/F3', 'review: 007-1/F1'));

  // the fix is built and proved: the end of implement closes its entry, and round 2 of review only checks it
  writeFileSync(join(wt, 'src/fix.txt'), 'fixed\n');
  ok(repo, 'done', DIR, 'T03');
  assert.deepEqual(codes(spex(repo, 'end', 'implement', DIR)), ['GATE-VERIFY'], 'the whole spec is proved again on the new tree');
  ok(repo, 'verify', DIR);
  r = ok(repo, 'end', 'implement', DIR);
  assert.deepEqual(r.json.corrections, ['C1', 'C2', 'C3']);
  assert.ok(read(wt, `${DIR}/corrections.md`).includes('Pick: fix (you)\nState: closed: every test is green\n'));
  ok(repo, 'start', 'review', DIR);
  r = spex(repo, 'show', DIR, '--review');
  assert.equal(r.json.round, 2);
  assert.equal(r.json.check, true);
  assert.ok(r.json.text.includes('## check (round 2)') && r.json.text.includes('T03 done P1 007-1/F1'), r.json.text);
  writeFileSync(join(wt, '.spex/review/007-2.findings.yaml'), 'feature: "007"\nround: 2\nfindings: []\n');
  r = spex(repo, 'review', 'accept', DIR, 'ok', '--by', 'agent');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(JSON.parse(read(wt, '.spex/runs/007/review.json')).status, 'done');
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: review\nstate: started\n', 'no fix pick: the spec stays in review, and the close goes on');
  // the close: the deferred finding has no later spec to take it, so the last reply lists it
  ok(repo, 'close', DIR, 'sync');
  r = ok(repo, 'close', DIR, 'later');
  assert.deepEqual(r.json.deferred, ['Finding F2 of the round (src/cli/commands/export.ts:12): the row splits in two']);
  assert.ok(r.json.text.includes('deferred, with no later spec to take it (the last reply lists it):\n- P3 Finding F2 of the round'), r.json.text);
  ok(repo, 'close', DIR, 'prove');
  assert.equal(spex(repo, 'close', DIR, 'built').code, 0);
});

test('new --number starts at a number the repo uses elsewhere too, and never goes below the next one; a branch name counts', () => {
  // nex numbers its specs in docs/my-specs/ as well: after 28 there, the next folder is 029, not 001.
  const repo = makeRepo('csv-export');
  let r = spex(repo, 'new', 'deploy-one-push', '--number', '29');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.dir, 'specs/029-deploy-one-push');
  assert.ok(read(repo, 'specs/029-deploy-one-push/spec.md').startsWith('# 029 Deploy one push\n'));
  r = spex(repo, 'new', 'next-step');
  assert.equal(r.json.dir, 'specs/030-next-step', 'the rest count on');
  r = spex(repo, 'new', 'older', '--number', '12');
  assert.equal(r.code, 2, r.stdout);
  assert.ok(r.json.findings[0].message.includes('below 31'), r.stdout);
  assert.equal(spex(repo, 'new', 'x', '--number', 'abc').code, 2);
  // a spec that lives only on a branch has its number too: two branches do not both become 031
  gitIn(repo, ['branch', 'spex/031-on-a-branch']);
  assert.equal(spex(repo, 'new', 'after-the-branch').json.dir, 'specs/032-after-the-branch');
});
