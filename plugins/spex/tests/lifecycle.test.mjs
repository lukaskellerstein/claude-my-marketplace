// The gates and status writes, end to end on the README example: approve (records and the proof plan), plan gate,
// red-first, develop gate, done (and its refusals), verify, review gate, ship. Plus show, coverage, new, report, init, update.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import { spawnSync } from 'node:child_process';
import { SPEX, codes, gitIn, makeRepo, spex, spexText } from './helpers.mjs';

const DIR = 'specs/007-csv-export';
const status = (repo, id) => parse(readFileSync(join(repo, DIR, 'tasks.yaml'), 'utf8'), { schema: 'core' }).tasks.find((t) => t.id === id).status;
const reqStatus = (repo, id) => parse(readFileSync(join(repo, DIR, 'requirements.yaml'), 'utf8'), { schema: 'core' }).requirements.find((r) => r.id === id).status;
const reviewDone = (repo) => {
  mkdirSync(join(repo, '.spex/runs/007'), { recursive: true });
  writeFileSync(join(repo, '.spex/runs/007/review.json'), JSON.stringify({ status: 'done', stage: 'review', task: null, concerns: [], questions: [] }));
};

test('the whole lifecycle on the README example', () => {
  const repo = makeRepo('csv-export');

  // gate tasks is closed while records are draft
  let r = spex(repo, 'gate', 'tasks', DIR);
  assert.equal(r.code, 6);
  assert.ok(codes(r).includes('GATE-APPROVED'));

  // approve flips every draft record, stamps the proof plan, and keeps the file's comments and layout
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.stage, 'approve-requirements');
  assert.ok(r.json.text.includes('read specs/007-csv-export/requirements.yaml and specs/007-csv-export/tests.yaml'), r.json.text);
  r = spex(repo, 'approve', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.approved, 2);
  assert.equal(r.json.tests, 2);
  assert.equal(reqStatus(repo, 'REQ-007-001'), 'approved');
  assert.ok(readFileSync(join(repo, DIR, 'requirements.yaml'), 'utf8').includes('decision: csv-stringify 6.x, because'), 'layout kept');
  assert.ok(readFileSync(join(repo, DIR, 'tests.yaml'), 'utf8').includes('approvals:\n  tests: '), 'the proof plan carries the hash');

  // approve refuses an open question
  const q = makeRepo('csv-export');
  writeFileSync(join(q, DIR, 'requirements.yaml'), readFileSync(join(q, DIR, 'requirements.yaml'), 'utf8').replace('    answer: A\n    by: human\n', ''));
  r = spex(q, 'approve', DIR);
  assert.equal(r.code, 6);
  assert.ok(codes(r).includes('APPROVE-QUESTION'));

  r = spex(repo, 'gate', 'tasks', DIR);
  assert.equal(r.code, 0, r.stdout);
  // the fixture has its tasks.yaml already, so this is a second run: the gate says there is nothing to add
  assert.ok(r.json.incremental && r.json.text.endsWith('(tasks.yaml exists and every record has a task: nothing to add)'), r.json.text);
  assert.deepEqual(r.json.uncovered, []);
  assert.deepEqual(r.json.untested, []);

  // tasks.yaml waits for a person (approvals: [tasks] by default): next says so, the tests and develop gates refuse
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.stage, 'approve-tasks');
  assert.ok(r.json.text.startsWith(`${'─'.repeat(40)}\nNEXT   /clear\n       /spex:approve specs/007-csv-export\n`), r.json.text);
  // approve asks no question, so auto changes nothing here and the block does not mention it
  assert.ok(!r.json.text.includes('auto:'), r.json.text);
  assert.ok(codes(spex(repo, 'gate', 'tests', DIR, 'TS01')).includes('GATE-TASKS-APPROVED'));
  assert.ok(codes(spex(repo, 'gate', 'develop', DIR, 'T01')).includes('GATE-TASKS-APPROVED'));
  r = spex(repo, 'approve', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.stage, 'tasks');
  assert.ok(readFileSync(join(repo, DIR, 'tasks.yaml'), 'utf8').includes('approvals:\n  tasks: '), 'the hash is in the file');

  // next names T01; T02 waits on it, and the NEXT block says the chat can go
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.stage, 'develop');
  assert.equal(r.json.task.id, 'T01');
  assert.deepEqual(r.json.waves, [['T01']]);
  assert.ok(r.json.text.includes(`NEXT   /clear\n       /spex:develop ${DIR} T01\n       1 task(s) ready`), r.json.text);

  // gate tests has nothing to write (every script has its file); gate develop T01 open: the gate runs the tests itself and they fail
  r = spex(repo, 'gate', 'tests', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.tests, []);
  r = spex(repo, 'gate', 'develop', DIR, 'T01');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(existsSync(join(repo, '.spex/evidence/007/T01.red.json')), 'the gate leaves a record');

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
  assert.ok(existsSync(join(repo, '.spex/evidence/007/TS02.red.json')));

  // done runs the checks itself: the tests still fail, so nothing flips, whatever the records say
  r = spex(repo, 'run', DIR, 'T01');
  assert.equal(r.code, 7);
  assert.ok(codes(r).includes('RUN-FAILED'));
  writeFileSync(join(repo, '.spex/evidence/007/T01.json'), JSON.stringify({ ok: true, tree: 'forged' }));
  r = spex(repo, 'done', DIR, 'T01');
  assert.equal(r.code, 7);
  assert.ok(codes(r).includes('DONE-FAILED'), codes(r).join(','));
  assert.equal(status(repo, 'T01'), 'todo');

  // "develop": the state file flips; done passes with no earlier run at all
  writeFileSync(join(repo, 'src/state.txt'), 'implemented\n');
  r = spex(repo, 'done', DIR, 'T01');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(status(repo, 'T01'), 'done');
  assert.equal(spex(repo, 'next', DIR).json.task.id, 'T02');

  // green before the feature exists is a bug in the test: the gate sees it, and so does run
  r = spex(repo, 'gate', 'develop', DIR, 'T02');
  assert.equal(r.code, 6);
  assert.ok(codes(r).includes('GATE-RED'), codes(r).join(','));
  r = spex(repo, 'run', DIR, 'T02', '--expect', 'fail');
  assert.equal(r.code, 7);
  assert.ok(codes(r).includes('RUN-GREEN'));

  assert.equal(spex(repo, 'done', DIR, 'T02').code, 0);

  // every task done: verify is next, and review waits for it
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.stage, 'verify', r.stdout);
  assert.equal(r.json.command, `/spex:verify ${DIR}`);
  r = spex(repo, 'gate', 'review', DIR);
  assert.equal(r.code, 6);
  assert.ok(codes(r).includes('GATE-VERIFY'), codes(r).join(','));
  assert.equal(spex(repo, 'gate', 'verify', DIR).code, 0);
  r = spex(repo, 'verify', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.evidence.round, 1);
  assert.deepEqual(r.json.evidence.scripts.map((s) => [s.id, s.ok]), [['TS01', true], ['TS02', true]]);
  assert.ok(r.json.evidence.scripts[0].cmd.includes('REQ_007_001_AC_1_writes_open_tasks_as_csv|REQ_007_002_AC_1_refuses_overwrite'), 'one command per driver');
  assert.ok(existsSync(join(repo, '.spex/evidence/007/verify.json')) && existsSync(join(repo, '.spex/evidence/007/verify-1.json')));
  r = spex(repo, 'show', DIR, '--verify');
  assert.ok(r.json.text.includes('Every script passed') && r.json.text.includes('Next: /spex:review'), r.json.text);
  // run --all is the same run, as round 2
  assert.equal(spex(repo, 'run', DIR, '--all').json.evidence.round, 2);

  // review gate, coverage, ship; next moves from verify to review to ship to built
  assert.equal(spex(repo, 'next', DIR).json.stage, 'review');
  assert.equal(spex(repo, 'gate', 'review', DIR).code, 0);
  r = spex(repo, 'coverage', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.missing, 0);
  assert.equal(r.json.gaps, 0);
  assert.ok(codes(spex(repo, 'gate', 'ship', DIR)).includes('GATE-REVIEW'));
  reviewDone(repo);
  assert.equal(spex(repo, 'gate', 'ship', DIR).code, 0);
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.stage, 'ship');
  assert.equal(r.json.command, `/spex:ship ${DIR}`);
  // on main, ship refuses to merge; with --merged (a person merged) it closes the feature
  r = spex(repo, 'ship', DIR);
  assert.equal(r.code, 6, r.stdout);
  assert.ok(codes(r).includes('SHIP-BRANCH'), codes(r).join(','));
  assert.equal(reqStatus(repo, 'REQ-007-001'), 'built', 'the close happened before the refusal, so a rerun skips it');
  r = spex(repo, 'ship', DIR, '--merged');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.closed_before, true);
  assert.equal(spex(repo, 'next', DIR).json.stage, 'built');
  r = spex(repo, 'index', '--scope', 'export');
  assert.equal(r.json.records.length, 2);
});

test('ship on a branch: the close, the commit and ship.cmd; a failed merge is safe to rerun', () => {
  const repo = makeRepo('csv-export');
  gitIn(repo, ['checkout', '-qb', '007-csv-export']);
  spex(repo, 'approve', DIR);
  spex(repo, 'approve', DIR);
  writeFileSync(join(repo, 'src/state.txt'), 'implemented\n');
  // the tests are green already: close the tasks the short way, then verify and review
  const tasksPath = join(repo, DIR, 'tasks.yaml');
  writeFileSync(tasksPath, readFileSync(tasksPath, 'utf8').replace(/status: todo/g, 'status: done'));
  assert.equal(spex(repo, 'verify', DIR).code, 0);
  reviewDone(repo);
  let r = spex(repo, 'ship', DIR);
  assert.equal(r.code, 6, r.stdout);
  assert.ok(codes(r).includes('SHIP-CMD'), 'no ship.cmd: a person merges');
  assert.equal(r.json.built, 2);
  const cfg = join(repo, '.spex/config.yaml');
  writeFileSync(cfg, readFileSync(cfg, 'utf8') + 'ship: {commit: true, cmd: "test -f merged.flag"}\n');
  r = spex(repo, 'ship', DIR);
  assert.equal(r.code, 7, r.stdout);
  assert.ok(codes(r).includes('SHIP-FAILED'));
  assert.equal(r.json.closed_before, true);
  assert.equal(r.json.committed, true, 'the commit holds the close');
  assert.ok(gitIn(repo, ['log', '--oneline', '-1']).includes('007: Export open tasks as CSV'));
  assert.equal(gitIn(repo, ['status', '--porcelain']).trim(), '', 'nothing left uncommitted');
  writeFileSync(join(repo, 'merged.flag'), '');
  r = spex(repo, 'ship', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.merged_by, 'ship.cmd');
});

test('ship refuses with a task left; a session test is pending until a tester records it at this tree', () => {
  const repo = makeRepo('csv-export');
  spex(repo, 'approve', DIR);
  let r = spex(repo, 'ship', DIR, '--merged');
  assert.equal(r.code, 6);
  assert.ok(codes(r).includes('SHIP-TASKS'));
  // a session in the plan: verify counts it as pending, the brief shows the steps, session records it, stale after a change
  const testsPath = join(repo, DIR, 'tests.yaml');
  writeFileSync(testsPath, readFileSync(testsPath, 'utf8') + '  - id: TS03\n    covers: [REQ-007-001]\n    kind: session\n    driver: cli\n    why: the spreadsheet import is a visual check nobody can script here\n    steps: [run the export, open the file in a spreadsheet]\n    expect: [two rows under the header, the second quoted]\n');
  spex(repo, 'approve', DIR);
  writeFileSync(join(repo, 'src/state.txt'), 'implemented\n');
  const tasksPath = join(repo, DIR, 'tasks.yaml');
  writeFileSync(tasksPath, readFileSync(tasksPath, 'utf8').replace(/status: todo/g, 'status: done'));
  r = spex(repo, 'verify', DIR);
  assert.equal(r.code, 7, r.stdout);
  assert.deepEqual(r.json.evidence.sessions, [{ id: 'TS03', status: 'pending', tree: null, observed: null }]);
  assert.ok(r.json.text.includes('sessions to perform: TS03 (pending)'), r.json.text);
  assert.equal(spex(repo, 'next', DIR).json.stage, 'verify');
  r = spex(repo, 'show', DIR, '--session', 'TS03');
  assert.equal(r.code, 0, r.stdout);
  for (const needle of ['# session TS03', '1. run the export', 'why a session: the spreadsheet', `spex session ${DIR} TS03 --result pass|fail`]) assert.ok(r.json.text.includes(needle), `brief lacks ${needle}\n${r.json.text}`);
  assert.equal(spex(repo, 'run', DIR, '--test', 'TS03').code, 2, 'a session is not run by the script');
  assert.equal(spex(repo, 'session', DIR, 'TS03', '--result', 'pass').code, 2, 'an observation is required');
  assert.equal(spex(repo, 'session', DIR, 'TS01', '--result', 'pass', '--observed', 'x').code, 2, 'a script is not a session');
  r = spex(repo, 'session', DIR, 'TS03', '--result', 'pass', '--observed', 'two rows, the second quoted: "fix tap, kitchen",home');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(existsSync(join(repo, '.spex/evidence/007/TS03.session.json')));
  r = spex(repo, 'verify', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.evidence.sessions[0].status, 'pass');
  assert.equal(spex(repo, 'next', DIR).json.stage, 'review');
  // the code changes: the session is stale, the verify run is not current any more
  writeFileSync(join(repo, 'src/state.txt'), 'implemented again\n');
  assert.equal(spex(repo, 'next', DIR).json.stage, 'verify');
  r = spex(repo, 'verify', DIR);
  assert.equal(r.code, 7);
  assert.equal(r.json.evidence.sessions[0].status, 'stale');
});

test('block writes the status and a reason file; next hands the feature to a person; unblock takes the task back to todo and keeps the reason', () => {
  const repo = makeRepo('csv-export');
  spex(repo, 'approve', DIR); // the records
  spex(repo, 'approve', DIR); // tasks.yaml
  let r = spex(repo, 'block', DIR, 'T01', '--reason', 'the TaskStore API has no openTasks()');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(status(repo, 'T01'), 'blocked');
  assert.ok(existsSync(join(repo, '.spex/runs/007/block-T01.json')));
  // T02 waits on T01, so nothing is ready: no command can move the feature, only a person can
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.stage, 'blocked');
  assert.equal(r.json.task, null);
  assert.ok(r.json.text.includes('NEXT   (a person)') && r.json.text.includes(`T01 blocked (the TaskStore API has no openTasks()): fix the cause (.spex/runs/007/block-<task>.json), then /spex:develop ${DIR} <task> (it unblocks first)`), r.json.text);
  assert.deepEqual(r.json.asks, []);
  assert.ok(r.json.text.includes('tasks: 0 done, 1 todo, 1 blocked'), r.json.text);
  assert.ok(spex(repo, 'gate', 'review', DIR).json.findings.find((f) => f.code === 'GATE-TASKS' && f.message === 'T01 is blocked').fix.includes(`/spex:develop ${DIR} T01`));
  // unblock: the status goes back, the reason stays as a lesson, and next names the task again
  r = spex(repo, 'unblock', DIR, 'T01');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(status(repo, 'T01'), 'todo');
  assert.equal(r.json.reason, '.spex/runs/007/block-T01.json');
  assert.ok(existsSync(join(repo, '.spex/runs/007/block-T01.json')), 'the reason file stays');
  assert.equal(spex(repo, 'next', DIR).json.task.id, 'T01');
  assert.ok(spex(repo, 'show', DIR, '--lessons').json.blocked.some((b) => b.task === 'T01'), 'the lessons still list it');
  // only a blocked task can be unblocked
  r = spex(repo, 'unblock', DIR, 'T01');
  assert.equal(r.code, 6);
  assert.ok(codes(r).includes('UNBLOCK-STATUS'));
  assert.equal(spex(repo, 'unblock', DIR, 'T09').code, 2);
});

test('block --ask: next prints the yes/no question and the command that is the yes; the review gate names it too', () => {
  const repo = makeRepo('csv-export');
  spex(repo, 'approve', DIR); // the records
  spex(repo, 'approve', DIR); // tasks.yaml
  const ask = 'Can I run the live export against the shared bucket? It writes one file there.';
  let r = spex(repo, 'block', DIR, 'T01', '--reason', 'needs a go-ahead for the live run', '--ask', ask);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(JSON.parse(readFileSync(join(repo, '.spex/runs/007/block-T01.json'), 'utf8')).ask, ask);
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.stage, 'blocked');
  assert.deepEqual(r.json.asks, [{ task: 'T01', ask, yes: `/spex:develop ${DIR} T01` }]);
  for (const needle of ['NEXT   (a person)', `T01 waits for your yes: ${ask}`, `yes → /spex:develop ${DIR} T01`, 'no  → leave T01 blocked']) assert.ok(r.json.text.includes(needle), `next lacks ${needle}\n${r.json.text}`);
  assert.ok(!r.json.text.includes('fix the cause'), 'a yes has no cause to fix');
  assert.ok(spex(repo, 'gate', 'review', DIR).json.findings.find((f) => f.code === 'GATE-TASKS' && f.message === 'T01 is blocked').fix.includes(`waits for a person's yes: ${ask}`));
});

test('a skipped test is neither red nor green: the red run, the develop gate, done and verify all refuse it', () => {
  const repo = makeRepo('csv-export');
  spex(repo, 'approve', DIR); // the records
  spex(repo, 'approve', DIR); // tasks.yaml
  // REQ-007-001's test needs a live record and skips without it, the way an env-gated test does
  const file = join(repo, 'tests/acceptance/export.test.mjs');
  writeFileSync(file, readFileSync(file, 'utf8').replace("test('REQ_007_001_AC_1_writes_open_tasks_as_csv', () => {", "test('REQ_007_001_AC_1_writes_open_tasks_as_csv', { skip: !process.env.LIVE_RECORD && 'no live record' }, () => {"));
  gitIn(repo, ['commit', '-qam', 'skip without a live record']);
  let r = spex(repo, 'run', DIR, 'T01', '--expect', 'fail');
  assert.equal(r.code, 7, r.stdout);
  assert.ok(codes(r).includes('RUN-SKIPPED') && !codes(r).includes('RUN-GREEN'), codes(r).join(','));
  r = spex(repo, 'gate', 'develop', DIR, 'T01');
  assert.equal(r.code, 6);
  assert.ok(r.json.findings.some((f) => f.code === 'GATE-RED' && /skip/.test(f.message) && /fail when it is missing/.test(f.fix) && /needs\[\]/.test(f.fix)), JSON.stringify(r.json.findings));
  // the code exists now, and the skip still keeps the task open
  writeFileSync(join(repo, 'src/state.txt'), 'implemented\n');
  r = spex(repo, 'done', DIR, 'T01');
  assert.equal(r.code, 7, r.stdout);
  assert.ok(codes(r).includes('DONE-FAILED') && codes(r).includes('RUN-SKIPPED'), codes(r).join(','));
  assert.equal(status(repo, 'T01'), 'todo');
  // verify names the one test that skipped
  r = spex(repo, 'verify', DIR);
  assert.equal(r.code, 7, r.stdout);
  assert.ok(r.json.evidence.scripts.find((s) => s.id === 'TS01').tail.includes('skipped') && r.json.evidence.scripts.find((s) => s.id === 'TS02').ok, JSON.stringify(r.json.evidence.scripts));
  // with the record there, the test runs, and done passes
  const env = { ...process.env, LIVE_RECORD: '1' };
  assert.equal(spawnSync('node', [SPEX, 'done', DIR, 'T01', '--json'], { cwd: repo, encoding: 'utf8', env }).status, 0);
  assert.equal(status(repo, 'T01'), 'done');
});

test('a need the environment lacks stops the develop gate with the one thing a person gives; a shell test needs no red run', () => {
  const repo = makeRepo('csv-export');
  const testsPath = join(repo, DIR, 'tests.yaml');
  writeFileSync(testsPath, readFileSync(testsPath, 'utf8').replace('    name: REQ_007_001_AC_1_writes_open_tasks_as_csv\n', '    name: REQ_007_001_AC_1_writes_open_tasks_as_csv\n    needs: [SPEX_TEST_TOKEN, "test -f src/state.txt"]\n') + '  - id: TS03\n    covers: [T02]\n    kind: script\n    driver: shell\n    steps: ["test -f src/state.txt"]\n    expect: [exit 0]\n');
  spex(repo, 'approve', DIR);
  spex(repo, 'approve', DIR);
  let r = spex(repo, 'gate', 'develop', DIR, 'T01');
  assert.equal(r.code, 6, r.stdout);
  const needs = r.json.findings.filter((f) => f.code === 'GATE-NEEDS');
  assert.equal(needs.length, 1, 'the env var; the command passes because the fixture has the file');
  assert.ok(needs[0].message.includes('SPEX_TEST_TOKEN, which is not set') && needs[0].fix.startsWith('A person sets'), JSON.stringify(needs));
  const env = { ...process.env, SPEX_TEST_TOKEN: 'x' };
  assert.equal(spawnSync('node', [SPEX, 'gate', 'develop', DIR, 'T01', '--json'], { cwd: repo, encoding: 'utf8', env }).status, 0);
  // T02 has a file test and a shell test: the red run is on the file test; a task with only a shell test has nothing to be red
  writeFileSync(testsPath, readFileSync(testsPath, 'utf8').replace('    covers: [REQ-007-002/AC-1]\n', '    covers: [REQ-007-001/AC-1]\n').replace('    name: REQ_007_002_AC_1_refuses_overwrite', '    name: REQ_007_001_AC_1_refuses_overwrite'));
  writeFileSync(join(repo, 'tests/acceptance/export.test.mjs'), readFileSync(join(repo, 'tests/acceptance/export.test.mjs'), 'utf8').replace('REQ_007_002_AC_1_refuses_overwrite', 'REQ_007_001_AC_1_refuses_overwrite'));
  spex(repo, 'approve', DIR, 'tasks');
  const tasksPath = join(repo, DIR, 'tasks.yaml');
  writeFileSync(tasksPath, readFileSync(tasksPath, 'utf8').replace('    requirements: [REQ-007-002]\n    depends_on: [T01]', '    depends_on: [T01]').replace(/(id: T01[\s\S]*?status: )todo/, '$1done'));
  spex(repo, 'approve', DIR);
  r = spex(repo, 'check', DIR);
  assert.ok(codes(r).includes('TASK-COVERAGE'), `a record without a task is a gap: ${codes(r).join(',')}`);
  const cover = r.json.findings.filter((f) => f.code === 'TEST-COVER');
  assert.ok(cover.length === 1 && cover[0].message.includes('REQ-007-002/AC-1'), `the scenario lost its test, but T02 is covered by its shell test: ${JSON.stringify(cover)}`);
  r = spex(repo, 'run', DIR, 'T02', '--expect', 'fail');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(codes(r).includes('RUN-NO-RED') && r.json.text.includes('T02 has nothing to be red'), r.stdout);
  r = spex(repo, 'gate', 'develop', DIR, 'T02');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(codes(r).includes('RUN-NO-RED'), 'the gate opens and says why');
  writeFileSync(join(repo, 'src/state.txt'), 'implemented\n');
  r = spex(repo, 'done', DIR, 'T02');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.evidence.commands.some((c) => c.cmd === 'test -f src/state.txt'), 'the shell steps ran at done');
});

test('show --tests picks a batch of script tests without a file, capped by limits.tests_scenarios; show --plan lists the claims without a test', () => {
  const repo = makeRepo('csv-export');
  rmSync(join(repo, 'tests/acceptance/export.test.mjs'));
  spex(repo, 'approve', DIR); // the records
  spex(repo, 'approve', DIR); // tasks.yaml
  let r = spex(repo, 'show', DIR, '--tests');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.tests, ['TS01', 'TS02']);
  assert.ok(r.json.text.startsWith('# tests to write: TS01, TS02 (batch of 2'));
  assert.ok(r.json.text.includes('names and values from the plan:') && r.json.text.includes('T02 `-o` refuses to overwrite'), r.json.text);
  assert.ok(r.json.text.includes(`- spex run ${DIR} --test TS02 --expect fail`));
  r = spex(repo, 'gate', 'tests', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.tests, ['TS01', 'TS02']);
  assert.equal(spex(repo, 'next', DIR).json.stage, 'tests');
  // a cap of one makes a batch of one
  writeFileSync(join(repo, '.spex/config.yaml'), readFileSync(join(repo, '.spex/config.yaml'), 'utf8').replace('verify_minutes: 2', 'tests_scenarios: 1, verify_minutes: 2'));
  r = spex(repo, 'show', DIR, '--tests');
  assert.deepEqual(r.json.tests, ['TS01']);
  r = spex(repo, 'show', DIR, '--tests', 'TS02', 'TS01');
  assert.deepEqual(r.json.tests, ['TS02', 'TS01']);
  assert.equal(spex(repo, 'show', DIR, '--tests', 'TS09').code, 2);
  // the plan view: a scenario and a task without a test, and the rules
  const testsPath = join(repo, DIR, 'tests.yaml');
  writeFileSync(testsPath, readFileSync(testsPath, 'utf8').replace(/  - id: TS02[\s\S]*$/, ''));
  r = spex(repo, 'show', DIR, '--plan');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.gaps, { scenarios: ['REQ-007-002/AC-1'], tasks: ['T02'] });
  for (const needle of ['## scenarios without a test', 'REQ-007-002  unwanted-behavior', 'then: the exit code is 3', '## tasks without a test', 'T02  story — `-o` refuses to overwrite', 'done_when: The REQ-007-002 acceptance test passes.', 'REQ_007_001_AC_1, TASK_007_09', '## rules of the plan']) assert.ok(r.json.text.includes(needle), `plan lacks ${needle}\n${r.json.text}`);
  assert.equal(r.json.next_id, 'TS02');
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.stage, 'plan-tests');
  assert.equal(r.json.command, `/spex:requirements ${DIR}`, 'a scenario without a test goes back to the analyze phase, whatever the records\' status');
  // only a task is uncovered: the plan phase covers it
  writeFileSync(testsPath, readFileSync(testsPath, 'utf8') + '  - id: TS02\n    covers: [REQ-007-002/AC-1]\n    kind: script\n    name: REQ_007_002_AC_1_refuses_overwrite\n    steps: [run it]\n    expect: [exit 3]\n');
  writeFileSync(join(repo, DIR, 'tasks.yaml'), readFileSync(join(repo, DIR, 'tasks.yaml'), 'utf8').replace('    requirements: [REQ-007-002]\n    depends_on: [T01]', '    depends_on: [T01]'));
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.stage, 'plan-tests');
  assert.equal(r.json.command, `/spex:tasks ${DIR}`, r.json.text);
  assert.deepEqual(spex(repo, 'show', DIR, '--plan').json.gaps, { scenarios: [], tasks: ['T02'] });
});

test('coverage names the script with no file, and the claim with no test', () => {
  const repo = makeRepo('csv-export');
  spex(repo, 'approve', DIR); // the records
  spex(repo, 'approve', DIR); // tasks.yaml
  writeFileSync(join(repo, 'tests/acceptance/export.test.mjs'), "import test from 'node:test'; test('REQ_007_001_AC_1_writes_open_tasks_as_csv', () => {});\n");
  let r = spex(repo, 'coverage', DIR);
  assert.equal(r.code, 5);
  assert.equal(r.json.missing, 1);
  assert.ok(r.json.findings[0].message.includes('REQ_007_002_AC_1_refuses_overwrite'));
  assert.ok(r.json.text.includes('ok  REQ-007-001/AC-1  TS01 script') && r.json.text.includes('MISSING TS02'), r.json.text);
  // the file the plan names exists without the test, and TS02 never ran: a later batch writes it there.
  // agent-flywheel-os 001: batch 2 pointed at the files batch 1 made, the gate refused it as broken records,
  // and NEXT named /spex:tests again, which printed the same refusal.
  let g = spex(repo, 'gate', 'develop', DIR, 'T02');
  assert.ok(codes(g).includes('GATE-COVERAGE') && !g.json.findings.some((f) => f.code === 'TEST-FILE' && f.severity === 'error'), codes(g).join(','));
  g = spex(repo, 'gate', 'tests', DIR);
  assert.equal(g.code, 0, g.stdout);
  assert.deepEqual(g.json.tests, ['TS02']);
  let n = spex(repo, 'next', DIR);
  assert.equal(n.json.command, `/spex:tests ${DIR}`, n.json.text);
  // once TS02 ran, a name gone from its file is a broken record: the gate refuses, and NEXT says spex check, not the skill again
  mkdirSync(join(repo, '.spex/evidence/007'), { recursive: true });
  writeFileSync(join(repo, '.spex/evidence/007/TS02.red.json'), '{}');
  g = spex(repo, 'gate', 'tests', DIR);
  assert.equal(g.code, 6, g.stdout);
  assert.ok(codes(g).includes('TEST-FILE'), codes(g).join(','));
  n = spex(repo, 'next', DIR);
  assert.equal(n.code, 4, n.stdout);
  assert.equal(n.json.stage, 'invalid');
  assert.equal(n.json.command, `spex check ${DIR}`);
  assert.ok(n.json.text.includes('(TEST-FILE)') && !n.json.text.includes('/clear') && !n.json.text.includes('auto:'), n.json.text);
  rmSync(join(repo, '.spex/evidence/007/TS02.red.json'));
  const testsPath = join(repo, DIR, 'tests.yaml');
  writeFileSync(testsPath, readFileSync(testsPath, 'utf8').replace('    name: REQ_007_002_AC_1_refuses_overwrite\n    file: tests/acceptance/export.test.mjs\n', '    name: REQ_007_002_AC_1_refuses_overwrite\n'));
  g = spex(repo, 'gate', 'develop', DIR, 'T02');
  assert.ok(codes(g).includes('GATE-COVERAGE'), codes(g).join(','));
  writeFileSync(testsPath, readFileSync(testsPath, 'utf8').replace(/  - id: TS02[\s\S]*$/, ''));
  r = spex(repo, 'coverage', DIR);
  assert.equal(r.code, 5);
  assert.equal(r.json.gaps, 2, 'the scenario and the task');
  assert.ok(r.json.text.includes('GAP REQ-007-002/AC-1') && r.json.text.includes('GAP T02'), r.json.text);
});

test('show --review writes the diff and slices it per task', () => {
  const repo = makeRepo('csv-export');
  gitIn(repo, ['checkout', '-qb', '007-csv-export']);
  mkdirSync(join(repo, 'src/cli/commands'), { recursive: true });
  writeFileSync(join(repo, 'src/cli/commands/export.ts'), 'export const exportCsv = () => 0;\n');
  writeFileSync(join(repo, 'src/cli/exit.ts'), 'export enum ExitCode { Ok = 0, OutputExists = 3 }\n');
  let r = spex(repo, 'show', DIR, '--review');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.round, 1);
  assert.ok(r.json.text.includes('evidence: (no verify run yet)'), r.json.text);
  const diff = readFileSync(join(repo, r.json.diff), 'utf8');
  assert.ok(diff.includes('OutputExists') && diff.includes('exportCsv'));
  r = spex(repo, 'show', DIR, '--review', '--task', 'T01');
  const sliced = readFileSync(join(repo, r.json.diff), 'utf8');
  assert.ok(sliced.includes('exportCsv') && !sliced.includes('OutputExists'), 'the task slice has only its paths');
  // a branch named 007-… means the next feature is 008
  r = spex(repo, 'new', 'import-csv');
  assert.equal(r.json.dir, 'specs/008-import-csv');
  assert.ok(existsSync(join(repo, 'specs/008-import-csv/spec.md')));
  // the diff cap sends the reviewer to per-task slices
  writeFileSync(join(repo, '.spex/config.yaml'), readFileSync(join(repo, '.spex/config.yaml'), 'utf8').replace('diff_kb: 120', 'diff_kb: 1'));
  writeFileSync(join(repo, 'src/cli/index.ts'), '// ' + 'x'.repeat(2000) + '\n');
  r = spex(repo, 'show', DIR, '--review');
  assert.equal(r.code, 6);
  assert.ok(codes(r).includes('REVIEW-DIFF-BIG'));
});

test('new writes spec.md from the template, and check reads its sections', () => {
  const repo = makeRepo('csv-export');
  let r = spex(repo, 'new', 'bulk-delete');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.spec, 'specs/008-bulk-delete/spec.md');
  const skeleton = readFileSync(join(repo, r.json.spec), 'utf8');
  assert.ok(skeleton.startsWith('# Bulk Delete\n'));
  for (const s of ['Why', 'What', 'Not this', 'Who', 'Constraints', 'Success', 'Alternatives', 'Open questions', 'Decisions']) assert.ok(skeleton.includes(`## ${s}\n`), s);
  // a folder with only the skeleton is a feature being shaped: no error, but the required sections are empty
  r = spex(repo, 'check', 'specs/008-bulk-delete');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(codes(r).sort(), ['REQ-MISSING', 'SPEC-SECTIONS']);
  assert.ok(r.json.findings.find((f) => f.code === 'SPEC-SECTIONS').message.endsWith('Why, What, Not this, Success'));
  // filled in, the warning goes; a hint alone does not count as words
  writeFileSync(join(repo, 'specs/008-bulk-delete/spec.md'), '# Bulk delete\n\n## Why\nwords\n\n## What\n- words\n\n## Not this\n- words\n\n## Success\n- words\n\n## Decisions\n<!-- hint only -->\n');
  r = spex(repo, 'check', 'specs/008-bulk-delete');
  assert.deepEqual(codes(r), ['REQ-MISSING']);
  // --from copies a document in as spec.md
  writeFileSync(join(repo, 'notes.md'), '# Notes\n\n## Why\nbecause\n');
  r = spex(repo, 'new', 'from-notes', '--from', 'notes.md');
  assert.equal(r.json.dir, 'specs/009-from-notes');
  assert.equal(readFileSync(join(repo, 'specs/009-from-notes/spec.md'), 'utf8'), '# Notes\n\n## Why\nbecause\n');
  assert.equal(spex(repo, 'new', 'x', '--from', 'missing.md').code, 2);
  // the whole-repo check sees the shaped folders too, and an empty folder is still an error
  mkdirSync(join(repo, 'specs/010-empty'));
  r = spex(repo, 'check');
  assert.ok(r.json.features.includes('specs/009-from-notes') && !r.json.features.includes('specs/010-empty'), r.json.features.join(','));
  assert.ok(codes(spex(repo, 'check', 'specs/010-empty')).includes('SPEC-MISSING'));
});

test('new --shaping writes the status line, check counts the sized holes, approve flips it to ready', () => {
  const repo = makeRepo('csv-export');
  let r = spex(repo, 'new', 'bulk-delete', '--shaping');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.status, 'shaping');
  const path = join(repo, r.json.spec);
  assert.ok(readFileSync(path, 'utf8').startsWith('---\nstatus: shaping\n---\n# Bulk Delete\n'));
  // still shaping and nothing filled: the check says so, and approve refuses
  r = spex(repo, 'check', 'specs/008-bulk-delete');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(codes(r).sort(), ['REQ-MISSING', 'SPEC-SECTIONS', 'SPEC-SHAPING']);
  assert.ok(r.json.findings.find((f) => f.code === 'SPEC-SHAPING').message.endsWith('no open question'));
  assert.ok(r.json.findings.find((f) => f.code === 'REQ-MISSING').fix.startsWith('Still shaping'));
  r = spex(repo, 'approve', 'specs/008-bulk-delete');
  assert.equal(r.code, 6, r.stdout);
  assert.ok(codes(r).includes('APPROVE-SPEC'));
  // filled, with sized holes: the check counts them, approve flips the status and carries them over.
  // The squares are the marks now; the dots of v2.0 still count, so a spec shaped then reads the same.
  writeFileSync(path, '---\nstatus: shaping\n---\n# Bulk delete\n\n## Why\nwords\n\n## What\n- words\n\n## Not this\n- words\n\n## Success\n- words\n\n## Open questions\n\n- 🟥 Which login provider? Proposed: GitHub only.\n- 🟧 Soft delete or hard delete?\n- ●●○ Audit log?\n- an unsized one\n');
  r = spex(repo, 'check', 'specs/008-bulk-delete');
  assert.ok(r.json.findings.find((f) => f.code === 'SPEC-SHAPING').message.endsWith('🟥 1 big · 🟧 2 medium · 🟨 0 small · 1 unsized open'), r.stdout);
  r = spex(repo, 'approve', 'specs/008-bulk-delete');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.open, { big: 1, medium: 2, small: 0, unsized: 1, total: 4 });
  assert.ok(readFileSync(path, 'utf8').startsWith('---\nstatus: ready\n---\n# Bulk delete\n'));
  assert.deepEqual(codes(spex(repo, 'check', 'specs/008-bulk-delete')), ['REQ-MISSING']);
  // a second approve changes nothing
  r = spex(repo, 'approve', 'specs/008-bulk-delete');
  assert.equal(r.code, 0);
  assert.equal(r.json.changed, false);
  // a document brought in by hand has no status line: next asks a person to read it, approve then writes status: ready
  writeFileSync(join(repo, 'notes.md'), '# Notes\n\n## Why\nwords\n\n## What\nwords\n\n## Not this\nwords\n\n## Success\nwords\n');
  r = spex(repo, 'new', 'from-notes', '--from', 'notes.md');
  assert.equal(r.json.status, null, 'without --shaping, --from adds no status line');
  assert.ok(codes(spex(repo, 'gate', 'requirements', 'specs/009-from-notes')).includes('GATE-SPEC'), 'not ready until a person approved it');
  r = spex(repo, 'next', 'specs/009-from-notes');
  assert.equal(r.json.stage, 'approve-spec');
  r = spex(repo, 'approve', 'specs/009-from-notes');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.changed, true);
  assert.ok(readFileSync(join(repo, 'specs/009-from-notes/spec.md'), 'utf8').startsWith('---\nstatus: ready\n---\n# Notes\n'));
  assert.deepEqual(codes(spex(repo, 'check', 'specs/009-from-notes')), ['REQ-MISSING']);
  assert.equal(spex(repo, 'gate', 'requirements', 'specs/009-from-notes').code, 0);
  // --from with --shaping: the copied document is shaped in rounds like any idea
  r = spex(repo, 'new', 'from-notes-shaped', '--from', 'notes.md', '--shaping');
  assert.equal(r.json.status, 'shaping');
  assert.ok(readFileSync(join(repo, r.json.spec), 'utf8').startsWith('---\nstatus: shaping\n---\n# Notes\n'));
  // next knows both: a shaping spec stays in the chat, a ready one can clear it
  r = spex(repo, 'new', 'still-shaping', '--shaping');
  r = spex(repo, 'next', 'specs/011-still-shaping');
  assert.equal(r.json.stage, 'shaping');
  // the answer is the next step, not the skill the chat is already in: the command only resumes from another chat
  assert.ok(r.json.text.includes('NEXT   your answer, in the shaping chat'), r.json.text);
  assert.ok(r.json.text.includes('ok takes every pick · answer by number · done approves the spec and ends shaping'), r.json.text);
  assert.ok(r.json.text.includes('No shaping chat open? /spex:new specs/011-still-shaping resumes it.'), r.json.text);
  assert.ok(!r.json.text.includes('NEXT   /spex:new'), r.json.text);
  r = spex(repo, 'next', 'specs/009-from-notes');
  assert.equal(r.json.stage, 'spec-ready');
  assert.equal(r.json.command, '/spex:requirements specs/009-from-notes');
});

test('gate requirements takes only a folder under specs/ whose spec.md a person approved, and names the scenarios without a test', () => {
  const repo = makeRepo('csv-export');
  // a document anywhere else is refused, whatever it says
  mkdirSync(join(repo, 'docs/idea'), { recursive: true });
  writeFileSync(join(repo, 'docs/idea/spec.md'), '---\nstatus: ready\n---\n# Idea\n\n## Why\nwords\n\n## What\nwords\n\n## Not this\nwords\n\n## Success\nwords\n');
  let r = spex(repo, 'gate', 'requirements', 'docs/idea');
  assert.equal(r.code, 6, r.stdout);
  assert.ok(r.json.findings.find((f) => f.code === 'GATE-SPEC').message.includes('not a folder under specs/'));
  // shaping: not until the person says done
  r = spex(repo, 'new', 'bulk-delete', '--shaping');
  r = spex(repo, 'gate', 'requirements', 'specs/008-bulk-delete');
  assert.equal(r.code, 6);
  assert.ok(r.json.findings.find((f) => f.code === 'GATE-SPEC').message.endsWith('is shaping, not ready'));
  // the fixture's own folder: records exist already and spec.md has no status line, which is fine for an incremental run
  r = spex(repo, 'gate', 'requirements', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.incremental, true);
  assert.deepEqual(r.json.untested, []);
  // without a proof plan, the records are not ready for gate 1: next sends the skill back for the test analyst
  rmSync(join(repo, DIR, 'tests.yaml'));
  r = spex(repo, 'gate', 'requirements', DIR);
  assert.deepEqual(r.json.untested, ['REQ-007-001/AC-1', 'REQ-007-002/AC-1']);
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.stage, 'plan-tests');
  assert.equal(r.json.command, `/spex:requirements ${DIR}`);
  assert.ok(codes(spex(repo, 'check', DIR)).includes('TEST-MISSING'));
});

test('a roadmap: planned stubs, gate new waits for built dependencies, inherited and lessons views, ship names the next step', () => {
  const repo = makeRepo('csv-export');
  // the first step is shaped now and names the roadmap; the stubs come after it, in order
  let r = spex(repo, 'new', 'ticket-model', '--shaping', '--roadmap', 'nex-platform', '--step', '1', '--source', 'docs/nex-design.md#3.1');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.dir, 'specs/008-ticket-model');
  const first = readFileSync(join(repo, r.json.spec), 'utf8');
  assert.ok(first.startsWith('---\nstatus: shaping\nroadmap: nex-platform\nstep: 1\nsource: ["docs/nex-design.md#3.1"]\n---\n# Ticket Model\n'), first.split('\n').slice(0, 7).join('\n'));
  r = spex(repo, 'new', 'runner', '--planned', '--roadmap', 'nex-platform', '--step', '2', '--depends-on', '008-ticket-model', '--source', 'docs/nex-design.md#3.2');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.status, 'planned');
  assert.deepEqual(r.json.depends_on, ['008-ticket-model']);
  r = spex(repo, 'new', 'runner-cli', '--planned', '--roadmap', 'nex-platform', '--step', '3', '--depends-on', '008,009', '--source', 'docs/nex-design.md#3.4', '--source', 'docs/nex-design.md#3.5');
  assert.equal(r.code, 0, r.stdout);
  const stub = readFileSync(join(repo, 'specs/010-runner-cli/spec.md'), 'utf8');
  assert.ok(stub.startsWith('---\nstatus: planned\nroadmap: nex-platform\nstep: 3\ndepends_on: [008-ticket-model, 009-runner]\nsource: ["docs/nex-design.md#3.4", "docs/nex-design.md#3.5"]\n---\n'), stub.split('\n').slice(0, 8).join('\n'));
  // a stub says what it is, and holds only what is known now: no empty heading reads as a failed run
  assert.ok(stub.includes('> Planned: step 3 of the roadmap nex-platform. /spex:new shapes it once 008-ticket-model, 009-runner are built.'), stub);
  assert.deepEqual([...stub.matchAll(/^## (.+)$/gm)].map((m) => m[1]), ['Why', 'What', 'Not this', 'From the design', 'Uses', 'Introduces', 'Open questions']);
  // usage: a stub needs its roadmap, depends only on folders that exist, and not on both flags at once
  assert.equal(spex(repo, 'new', 'x', '--planned').code, 2);
  assert.equal(spex(repo, 'new', 'x', '--planned', '--roadmap', 'nex-platform', '--depends-on', '099-nowhere').code, 2);
  assert.equal(spex(repo, 'new', 'x', '--planned', '--shaping', '--roadmap', 'nex-platform').code, 2);
  // check: a stub needs Why, What, Not this, Uses and Introduces; the design file is missing (a warning); SPEC-PLANNED says what it waits for
  r = spex(repo, 'check', 'specs/010-runner-cli');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(codes(r).sort(), ['REQ-MISSING', 'SPEC-PLANNED', 'SPEC-SECTIONS', 'SPEC-SOURCE', 'SPEC-SOURCE']);
  assert.ok(r.json.findings.find((f) => f.code === 'SPEC-SECTIONS').message.endsWith('Why, What, Not this, Uses, Introduces'));
  assert.ok(r.json.findings.find((f) => f.code === 'SPEC-PLANNED').message.includes('waits for 008-ticket-model (shaping), 009-runner (planned)'), r.stdout);
  mkdirSync(join(repo, 'docs'));
  writeFileSync(join(repo, 'docs/nex-design.md'), '# nex\n\n## 3.1\n\n## 3.2\n\n## 3.4\n\n## 3.5\n');
  const fill = (dir) => writeFileSync(join(repo, dir, 'spec.md'), readFileSync(join(repo, dir, 'spec.md'), 'utf8').replace(/## Why\n\n<!--.*?-->/s, '## Why\nwords').replace(/## What\n\n<!--.*?-->/s, '## What\nwords').replace(/## Not this\n\n<!--.*?-->/s, '## Not this\nwords').replace(/## Success\n\n<!--.*?-->/s, '## Success\nwords').replace(/## Uses\n\n<!--.*?-->/s, '## Uses\nNone.').replace(/## Introduces\n\n<!--.*?-->/s, '## Introduces\nNone.'));
  fill('specs/009-runner');
  fill('specs/010-runner-cli');
  assert.deepEqual(codes(spex(repo, 'check', 'specs/010-runner-cli')).sort(), ['REQ-MISSING', 'SPEC-PLANNED']);
  // a broken dependency and a cycle are errors
  writeFileSync(join(repo, 'specs/009-runner/spec.md'), readFileSync(join(repo, 'specs/009-runner/spec.md'), 'utf8').replace('depends_on: [008-ticket-model]', 'depends_on: [008-ticket-model, 010-runner-cli]'));
  r = spex(repo, 'check', 'specs/009-runner');
  assert.equal(r.code, 4);
  assert.ok(codes(r).includes('SPEC-CYCLE'), codes(r).join(','));
  writeFileSync(join(repo, 'specs/009-runner/spec.md'), readFileSync(join(repo, 'specs/009-runner/spec.md'), 'utf8').replace('depends_on: [008-ticket-model, 010-runner-cli]', 'depends_on: [008-ticket-model, 099-nowhere]'));
  assert.ok(codes(spex(repo, 'check', 'specs/009-runner')).includes('SPEC-DEPENDS'));
  writeFileSync(join(repo, 'specs/009-runner/spec.md'), readFileSync(join(repo, 'specs/009-runner/spec.md'), 'utf8').replace('depends_on: [008-ticket-model, 099-nowhere]', 'depends_on: [008-ticket-model]'));
  // the roadmap is computed from the folders; next on a stub says wait; approve and gate requirements refuse a stub
  r = spex(repo, 'roadmap');
  assert.deepEqual(r.json.roadmaps, [{ name: 'nex-platform', steps: 3, built: 0, planned: 2 }]);
  r = spex(repo, 'roadmap', 'nex-platform');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.steps.map((s) => [s.step, s.dir, s.stage, s.waits]), [[1, 'specs/008-ticket-model', 'shaping', []], [2, 'specs/009-runner', 'planned', ['specs/008-ticket-model']], [3, 'specs/010-runner-cli', 'planned', ['specs/008-ticket-model', 'specs/009-runner']]]);
  assert.equal(r.json.next, null);
  assert.equal(spex(repo, 'roadmap', 'nope').code, 2);
  r = spex(repo, 'next', 'specs/009-runner');
  assert.equal(r.json.stage, 'planned');
  assert.equal(r.json.command, '');
  assert.ok(r.json.text.includes('NEXT   (wait)') && r.json.text.includes('waits for 008-ticket-model (shaping)'), r.json.text);
  assert.ok(codes(spex(repo, 'approve', 'specs/009-runner')).includes('APPROVE-SPEC'));
  assert.ok(codes(spex(repo, 'gate', 'requirements', 'specs/009-runner')).includes('GATE-SPEC'));
  r = spex(repo, 'gate', 'new', 'specs/009-runner');
  assert.equal(r.code, 6);
  assert.ok(r.json.findings.find((f) => f.code === 'GATE-BUILT').message.includes('not built (shaping)'), r.stdout);
  // gate new on the shaping first step just resumes; on the fixture's finished folder it is done
  r = spex(repo, 'gate', 'new', 'specs/008-ticket-model');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.flipped, false);
  assert.ok(codes(spex(repo, 'gate', 'new', DIR)).includes('GATE-DONE'));
  // build step 1 the short way: records that are built already, as ship leaves them
  const built = readFileSync(join(repo, DIR, 'requirements.yaml'), 'utf8').replace('feature: "007"', 'feature: "008"').replace('slug: csv-export', 'slug: ticket-model').replace(/REQ-007-/g, 'REQ-008-').replace(/status: draft/g, 'status: built');
  writeFileSync(join(repo, 'specs/008-ticket-model/requirements.yaml'), built);
  writeFileSync(join(repo, 'specs/008-ticket-model/tasks.yaml'), readFileSync(join(repo, DIR, 'tasks.yaml'), 'utf8').replace('feature: "007"', 'feature: "008"').replace(/REQ-007-/g, 'REQ-008-').replace(/status: todo/g, 'status: done'));
  writeFileSync(join(repo, 'specs/008-ticket-model/tests.yaml'), readFileSync(join(repo, DIR, 'tests.yaml'), 'utf8').replace('feature: "007"', 'feature: "008"').replace(/REQ-007-/g, 'REQ-008-').replace(/REQ_007_/g, 'REQ_008_'));
  writeFileSync(join(repo, 'specs/008-ticket-model/spec.md', ), readFileSync(join(repo, 'specs/008-ticket-model/spec.md'), 'utf8').replace('status: shaping', 'status: ready'));
  mkdirSync(join(repo, '.spex/runs/008'), { recursive: true });
  writeFileSync(join(repo, '.spex/runs/008/review.json'), JSON.stringify({ status: 'concerns', stage: 'review', task: null, concerns: ['the runner keeps state in SQLite, not in memory'], questions: ['Q9: one database per run, or one for all?'] }));
  writeFileSync(join(repo, '.spex/runs/008/block-T02.json'), JSON.stringify({ task: 'T02', reason: 'openTasks() does not exist' }));
  // built: next names step 2, the roadmap agrees, and the stub can be opened: planned → shaping
  r = spex(repo, 'next', 'specs/008-ticket-model');
  assert.equal(r.json.stage, 'built');
  assert.equal(r.json.command, '/spex:new specs/009-runner');
  r = spex(repo, 'roadmap', 'nex-platform');
  assert.equal(r.json.next, 'specs/009-runner');
  assert.ok(r.json.text.includes(' 1. specs/008-ticket-model  built') && r.json.text.includes(' 3. specs/010-runner-cli  planned  waits: 009-runner'), r.json.text);
  assert.equal(spex(repo, 'next', 'specs/009-runner').json.command, '/spex:new specs/009-runner');
  // lessons of the built step, for the ship round; inherited by the next step, for its tasks
  r = spex(repo, 'show', 'specs/008-ticket-model', '--lessons');
  assert.equal(r.code, 0, r.stdout);
  for (const needle of ['## concerns', 'review: the runner keeps state in SQLite', '## questions raised', 'Q9', '## blocked', 'T02: openTasks()', '## decisions', 'D1  Rows follow list order', 'Route each item']) assert.ok(r.json.text.includes(needle), `lessons lack ${needle}\n${r.json.text}`);
  r = spex(repo, 'show', 'specs/009-runner', '--inherited');
  assert.equal(r.code, 0, r.stdout);
  for (const needle of ['from 008-ticket-model', '## 008-ticket-model — Export open tasks as CSV · built', 'goal:', 'interfaces: cli (cli, ', 'D1  Rows follow list order', 'produces:', 'exportCsv(store: TaskStore, out: Writable): Promise<number>  (T01)', 'exactly']) assert.ok(r.json.text.includes(needle), `inherited lacks ${needle}\n${r.json.text}`);
  assert.ok(spex(repo, 'show', 'specs/010-runner-cli', '--inherited').json.text.includes('(nothing settled yet)'), 'a planned dependency has nothing yet');
  r = spex(repo, 'gate', 'new', 'specs/009-runner');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.flipped, true);
  const opened = readFileSync(join(repo, 'specs/009-runner/spec.md'), 'utf8');
  assert.ok(opened.startsWith('---\nstatus: shaping\nroadmap: nex-platform\nstep: 2\n'));
  // opening the stub: the planned note goes, the sections it left out come back with their hints, its words stay
  assert.ok(!opened.includes('> Planned:'), opened);
  assert.deepEqual([...opened.matchAll(/^## (.+)$/gm)].map((m) => m[1]), ['Why', 'What', 'Not this', 'From the design', 'Uses', 'Introduces', 'Open questions', 'Who', 'Constraints', 'Success', 'Alternatives', 'Decisions']);
  assert.ok(opened.includes('## Why\nwords') && opened.includes('<!-- Tech, time, cost, compatibility. -->'), opened);
  // the banner's numbers: step 2 of the 3 folders that name the roadmap
  assert.equal(r.json.steps, 3);
  assert.ok(r.json.text.includes('roadmap nex-platform, step 2 of 3 · after 008-ticket-model (built)'), r.json.text);
  assert.ok(r.json.text.includes('read next: spex show specs/009-runner --inherited'), r.json.text);
  // a second gate on the opened step changes nothing
  assert.equal(spex(repo, 'gate', 'new', 'specs/009-runner').json.flipped, false);
  assert.equal(readFileSync(join(repo, 'specs/009-runner/spec.md'), 'utf8'), opened);
  // Success came back empty, so the step is still shaping; filled, it waits for a person
  assert.equal(spex(repo, 'next', 'specs/009-runner').json.stage, 'shaping');
  writeFileSync(join(repo, 'specs/009-runner/spec.md'), opened.replace(/## Success\n\n<!--.*?-->/s, '## Success\nwords'));
  assert.equal(spex(repo, 'next', 'specs/009-runner').json.stage, 'approve-spec');
  // step 3 still waits, now for step 2 only
  assert.deepEqual(spex(repo, 'roadmap', 'nex-platform').json.steps[2].waits, ['specs/009-runner']);
});

test('the format is one integer in the config: missing means 1, init writes 2, check and --version report it', () => {
  const repo = makeRepo('csv-export');
  let r = spex(repo, 'check', DIR);
  assert.deepEqual(r.json.format, { repo: 2, script: 2 });
  assert.match(spexText(repo, '--version').stdout, /^spex 2\.\d+\.\d+ \(format 2\)\n$/);
  r = spex(repo, 'init', '--force');
  assert.equal(r.code, 0, r.stdout);
  const config = readFileSync(join(repo, '.spex/config.yaml'), 'utf8');
  assert.ok(config.split('\n')[1].startsWith('format: 2 '), config.split('\n').slice(0, 2).join('\n'));
  for (const key of ['drivers:', 'live: []', 'people: []', 'verify_rounds: 3', 'ship: {commit: false, cmd: ""}']) assert.ok(config.includes(key), `init writes ${key}`);
  assert.deepEqual(spex(repo, 'check', DIR).json.format, { repo: 2, script: 2 });
  // a repo without the line is format 1, and nothing runs until spex update
  writeFileSync(join(repo, '.spex/config.yaml'), config.replace(/^format: 2 .*\n/m, ''));
  r = spex(repo, 'check', DIR);
  assert.equal(r.code, 4);
  assert.ok(codes(r).includes('CONFIG-FORMAT') && r.json.findings.find((f) => f.code === 'CONFIG-FORMAT').fix.includes('spex update'));
});

test('update keeps the config a person wrote and adds what a newer plugin needs; a newer repo is refused', () => {
  const repo = makeRepo('csv-export');
  const path = join(repo, '.spex/config.yaml');
  const before = readFileSync(path, 'utf8'); // a header comment, format 2, no drivers, no approvals, no tests_scenarios
  assert.ok(before.startsWith('# The example repo'));
  let r = spex(repo, 'update');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.changes, ['added drivers: {}', 'added repos: {}', 'added live: []', 'added people: []', 'added verify_rounds: 3', 'added approvals: ["tasks"]', 'added auto: false', 'added ship: {"commit":false,"cmd":""}', 'added limits.tests_scenarios: 12', 'added limits.step_introduces: 10']);
  const after = readFileSync(path, 'utf8');
  assert.ok(after.startsWith('# The example repo'), `the header comment stays first:\n${after}`);
  assert.ok(after.includes('acceptance_cmd: node --test --test-name-pattern="{ids}"'), 'values kept');
  assert.match(after, /^approvals: \[tasks\] # stages past gate 1/m);
  assert.match(after, /^drivers: \{\} # more ways to run script tests/m);
  assert.ok(after.includes('tests_scenarios: 12'));
  // a second run changes nothing, check is still clean, and a newer repo is refused
  r = spex(repo, 'update');
  assert.deepEqual(r.json.changes, []);
  assert.equal(spex(repo, 'check', DIR).code, 0, 'check after update');
  writeFileSync(path, after.replace('format: 2', 'format: 99'));
  r = spex(repo, 'update');
  assert.equal(r.code, 4);
  assert.ok(codes(r).includes('CONFIG-FORMAT'));
  assert.equal(spex(join(repo, 'src'), 'update').code, 4, 'the root is found from a subfolder, and the same refusal comes back');
});

test('update migrates a format 1 repo: verification leaves the records, verify leaves the tasks, tests.yaml is written from both', () => {
  const repo = makeRepo('csv-export');
  spex(repo, 'approve', DIR); // the records
  spex(repo, 'approve', DIR); // tasks.yaml: the person read the plan before the migration
  // make the fixture look like format 1: no format line, verification on every record, a verify command on T02, no tests.yaml
  const reqPath = join(repo, DIR, 'requirements.yaml');
  writeFileSync(reqPath, readFileSync(reqPath, 'utf8').replace(/    applies_to: \[cli\]\n/g, '    applies_to: [cli]\n    verification: {mode: isolated-interface, method: test}\n'));
  const tasksPath = join(repo, DIR, 'tasks.yaml');
  writeFileSync(tasksPath, readFileSync(tasksPath, 'utf8').replace('    done_when: The REQ-007-002 acceptance test passes.', '    verify: ["test -f src/cli/exit.ts"]\n    done_when: The REQ-007-002 acceptance test passes.'));
  rmSync(join(repo, DIR, 'tests.yaml'));
  // a format 2 repo with the old fields: the schema errors name the migration
  let r = spex(repo, 'check', DIR);
  assert.equal(r.code, 4);
  assert.ok(r.json.findings.some((f) => f.code === 'REQ-SCHEMA' && f.message.includes('verification') && f.message.includes('spex update')), `the schema error names the migration\n${r.stdout}`);
  assert.ok(r.json.findings.some((f) => f.code === 'TASK-SCHEMA' && f.message.includes('verify') && f.message.includes('spex update')), r.stdout);
  const cfg = join(repo, '.spex/config.yaml');
  writeFileSync(cfg, readFileSync(cfg, 'utf8').replace('format: 2\n', ''));
  r = spex(repo, 'check', DIR);
  assert.equal(r.code, 4);
  assert.ok(codes(r).includes('CONFIG-FORMAT'));
  r = spex(repo, 'update');
  assert.equal(r.code, 0, r.stdout);
  for (const needle of ['specs/007-csv-export/requirements.yaml: verification removed from 2 record(s)', 'specs/007-csv-export/tasks.yaml: verify moved to tests.yaml (1 task(s))', 'specs/007-csv-export/tests.yaml: written from 2 scenario(s) and 1 task(s) with verify commands', 'format 1 → 2', 'format: 2']) assert.ok(r.json.changes.some((c) => c.startsWith(needle)), `${needle}\n${r.json.changes.join('\n')}`);
  assert.ok(!readFileSync(reqPath, 'utf8').includes('verification'));
  assert.ok(!readFileSync(tasksPath, 'utf8').includes('verify:'));
  assert.ok(r.json.changes.some((c) => c.endsWith('the tasks approval restamped')), r.json.changes.join('\n'));
  assert.notEqual(spex(repo, 'next', DIR).json.stage, 'approve-tasks', 'the migration moved lines out; the person does not read the plan again for that');
  assert.ok(readFileSync(tasksPath, 'utf8').includes('decisions:\n    - id: D1'), 'layout kept');
  const tests = parse(readFileSync(join(repo, DIR, 'tests.yaml'), 'utf8'), { schema: 'core' });
  assert.deepEqual(tests.tests.map((t) => [t.id, t.covers, t.kind, t.driver ?? null, t.name ?? null, t.file ?? null]), [
    ['TS01', ['REQ-007-001/AC-1'], 'script', null, 'REQ_007_001_AC_1_writes_open_tasks_as_csv', 'tests/acceptance/export.test.mjs'],
    ['TS02', ['REQ-007-002/AC-1'], 'script', null, 'REQ_007_002_AC_1_refuses_overwrite', 'tests/acceptance/export.test.mjs'],
    ['TS03', ['T02'], 'script', 'shell', null, null],
  ]);
  assert.deepEqual(tests.tests[2].steps, ['test -f src/cli/exit.ts']);
  r = spex(repo, 'check', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(codes(r).filter((c) => c !== 'REQ-QUESTION-OPEN'), []);
});

test('approvals are a hash of what a person read: a changed tasks.yaml or tests.yaml sends the stage back; tests is a switch', () => {
  const repo = makeRepo('csv-export');
  assert.equal(spex(repo, 'approve', DIR).json.stage, 'requirements');
  assert.equal(spex(repo, 'approve', DIR).json.stage, 'tasks');
  assert.equal(spex(repo, 'approve', DIR).json.stage, null, 'nothing waits');
  // a fix task appended later makes the approval stale; the statuses the script flips are not part of the hash
  const tasksPath = join(repo, DIR, 'tasks.yaml');
  const before = readFileSync(tasksPath, 'utf8');
  writeFileSync(tasksPath, `${before}  - id: T03\n    title: Fix the exit code\n    kind: fix\n    requirements: [REQ-007-001]\n    paths: [src/x.ts]\n    instructions: fix it\n    done_when: it passes\n    status: todo\n`);
  let r = spex(repo, 'gate', 'tests', DIR, 'TS01');
  assert.equal(r.code, 6, r.stdout);
  assert.ok(r.json.findings.find((f) => f.code === 'GATE-TASKS-APPROVED').message.includes('changed since'));
  assert.equal(spex(repo, 'next', DIR).json.stage, 'approve-tasks');
  writeFileSync(tasksPath, before);
  assert.equal(spex(repo, 'gate', 'tests', DIR, 'TS01').code, 0);
  // tests as a switch: on, a tests.yaml that changed after gate 1 waits for a person again
  const cfg = join(repo, '.spex/config.yaml');
  writeFileSync(cfg, `${readFileSync(cfg, 'utf8')}approvals: [tasks, tests]\n`);
  assert.equal(spex(repo, 'gate', 'develop', DIR, 'T01').code, 0, 'gate 1 stamped the plan as it was');
  const testsPath = join(repo, DIR, 'tests.yaml');
  writeFileSync(testsPath, `${readFileSync(testsPath, 'utf8')}      - and the file is closed\n`);
  r = spex(repo, 'gate', 'develop', DIR, 'T01');
  assert.equal(r.code, 6, r.stdout);
  assert.ok(codes(r).includes('GATE-TESTS-APPROVED'));
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.stage, 'approve-tests');
  assert.equal(r.json.command, `/spex:approve ${DIR} tests`);
  r = spex(repo, 'approve', DIR);
  assert.equal(r.json.stage, 'tests');
  assert.equal(r.json.approved, 2);
  assert.equal(spex(repo, 'gate', 'develop', DIR, 'T01').code, 0);
  // a stage the config does not list is refused by name
  writeFileSync(cfg, readFileSync(cfg, 'utf8').replace('approvals: [tasks, tests]\n', 'approvals: []\n'));
  assert.equal(spex(repo, 'approve', DIR, 'tests').code, 2);
  assert.equal(spex(repo, 'gate', 'develop', DIR, 'T01').code, 0, 'no stage needs a person now');
});

test('report writes the run status file Dex reads', () => {
  const repo = makeRepo('csv-export');
  const r = spex(repo, 'report', DIR, 'develop', 'T01', '--status', 'concerns', '--summary', 'Done, but the test asserts the wrong header.', '--concern', 'REQ-007-001/AC-1 expects `title,list`; the contract says `list,title`', '--file', 'src/cli/commands/export.ts', '--pulled', 'REQ-007-002');
  assert.equal(r.code, 0, r.stdout);
  const doc = JSON.parse(readFileSync(join(repo, '.spex/runs/007/develop-T01.json'), 'utf8'));
  assert.equal(doc.status, 'concerns');
  assert.equal(doc.concerns.length, 1);
  assert.deepEqual(doc.pulled, ['REQ-007-002']);
  assert.equal(spex(repo, 'report', DIR, 'develop', 'T01', '--status', 'nope', '--summary', 'x').code, 2);
});

test('init prefers the runner that can see the acceptance folder, and names a playwright driver when the repo has it', () => {
  // Dex's shape: vitest for the renderer (an include list that stops at src/renderer), node --test for the core.
  const dir = mkdtempSync(join(tmpdir(), 'spex-init2-'));
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
  const config = readFileSync(join(dir, '.spex/config.yaml'), 'utf8');
  assert.ok(!config.includes('runner:'), 'the header does not name a runner that a hand edit makes stale');
  assert.ok(config.includes('drivers: {playwright: {cmd: "npx playwright test --grep \\"{ids}\\"", dir: tests/e2e}}'), config);
  assert.equal(spex(dir, 'check').code, 0, 'the config parses');
});

test('init writes .spex/config.yaml and .spex/.gitignore from a package.json scan', () => {
  const dir = mkdtempSync(join(tmpdir(), 'spex-init-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', scripts: { test: 'vitest run', typecheck: 'tsc --noEmit', 'test:acceptance': 'vitest run tests/acceptance' }, devDependencies: { vitest: '^3' } }));
  mkdirSync(join(dir, 'src'));
  mkdirSync(join(dir, 'tests/acceptance'), { recursive: true });
  gitIn(dir, ['init', '-q', '-b', 'main']);
  let r = spex(dir, 'init');
  assert.equal(r.code, 0, r.stdout);
  const cfg = parse(readFileSync(join(dir, '.spex/config.yaml'), 'utf8'), { schema: 'core' });
  assert.equal(cfg.acceptance_dir, 'tests/acceptance');
  assert.ok(cfg.acceptance_cmd.includes('test:acceptance') && cfg.acceptance_cmd.includes('{ids}'));
  assert.deepEqual(cfg.fast_checks, ['npm run typecheck', 'npm test']);
  assert.ok(cfg.protected.includes('.spex/'), 'no task may write the config');
  assert.deepEqual(cfg.drivers, {});
  assert.deepEqual(cfg.ship, { commit: false, cmd: '' });
  assert.ok(!existsSync(join(dir, '.gitignore')), 'the root .gitignore is not touched');
  // git sees the config and nothing else under .spex/
  mkdirSync(join(dir, '.spex/evidence'));
  writeFileSync(join(dir, '.spex/evidence/x.json'), '{}');
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

test('text mode prints findings with their fix, and usage errors exit 2', () => {
  const repo = makeRepo('csv-export');
  writeFileSync(join(repo, 'src/state.txt'), 'implemented\n'); // the tests are green too early
  spex(repo, 'approve', DIR); // the records
  spex(repo, 'approve', DIR); // tasks.yaml
  const r = spexText(repo, 'gate', 'develop', DIR, 'T01');
  assert.equal(r.code, 6, r.stdout);
  assert.ok(r.stdout.includes('GATE-RED') && r.stdout.includes('→'));
  assert.equal(spexText(repo, 'frobnicate').code, 2);
  assert.equal(spexText(repo, 'archive', DIR).code, 2, 'archive points at ship');
  assert.equal(spexText(repo, 'show', DIR).code, 2);
  assert.equal(spexText(repo).code, 2);
});

test('a shaping spec with every section filled and nothing open waits for a person: next says approve-spec', () => {
  // Auto mode ends here: the skill finishes the file, leaves status: shaping, and the person reads it at /spex:approve.
  const repo = makeRepo('csv-export');
  const r = spex(repo, 'new', 'auto-shaped', '--shaping');
  const path = join(repo, r.json.spec);
  const dir = r.json.spec.replace(/\/spec\.md$/, '');
  let n = spex(repo, 'next', dir);
  assert.equal(n.json.stage, 'shaping', 'the skeleton is empty: still shaping');
  writeFileSync(path, '---\nstatus: shaping\n---\n# Auto shaped\n\n## Why\nwords\n\n## What\n- words\n\n## Not this\n- words\n\n## Success\n- words\n\n## Decisions\n- GitHub only. ← design §2, by agent, high\n\n## Open questions\n');
  n = spex(repo, 'next', dir);
  assert.equal(n.json.stage, 'approve-spec', n.stdout);
  assert.equal(n.json.command, `/spex:approve ${dir}`);
  assert.match(n.stdout, /shaped and nothing is open/);
  writeFileSync(path, readFileSync(path, 'utf8') + '\n- ●●○ Soft delete or hard delete?\n');
  n = spex(repo, 'next', dir);
  assert.equal(n.json.stage, 'shaping', 'one open question: back to shaping');
  // the NEXT block says whether auto is on, from the config
  const cfg = join(repo, '.spex/config.yaml');
  writeFileSync(cfg, `${readFileSync(cfg, 'utf8')}auto: true\n`);
  n = spex(repo, 'next', dir);
  assert.equal(n.json.auto, true);
  assert.ok(n.json.text.includes('auto: on (nobody is asked'), n.json.text);
});

test('review accept: every finding at once, the person answers in one word, fix picks become tasks that need no second approval', () => {
  // nex 028: each review finding went through approve, tests, develop, verify and a fresh full review, and the
  // fourth round had no way to ship. Now the round waits for one answer, the fixes go through /spex:fix, and a
  // later round only checks them.
  const repo = makeRepo('csv-export');
  spex(repo, 'approve', DIR);
  spex(repo, 'approve', DIR);
  writeFileSync(join(repo, 'src/state.txt'), 'implemented\n');
  const tasksPath = join(repo, DIR, 'tasks.yaml');
  writeFileSync(tasksPath, readFileSync(tasksPath, 'utf8').replace(/status: todo/g, 'status: done'));
  assert.equal(spex(repo, 'verify', DIR).code, 0);
  let r = spex(repo, 'show', DIR, '--review');
  assert.equal(r.json.round, 1);
  assert.equal(r.json.findings_file, '.spex/review/007-1.findings.yaml');
  assert.ok(r.json.text.includes(`/spex:review ${DIR} ok`), r.json.text);
  const finding = (id, severity, pick, extra = '') => `  - id: ${id}\n    severity: ${severity}\n    title: Finding ${id} of the round\n    file: src/cli/commands/export.ts\n    line: 12\n    when: a list has a task whose title holds a newline\n    effect: the row splits in two\n    fix: quote a title that holds a newline, in export.ts\n    pick: ${pick}\n${extra}`;
  const fixPart = '    done_when: a title with a newline is one quoted CSV field\n    requirements: [REQ-007-001]\n    paths: [src/cli/commands/export.ts]\n    context: [src/state.txt]\n';
  writeFileSync(join(repo, '.spex/review/007-1.findings.yaml'), `feature: "007"\nround: 1\nfindings:\n${finding('F1', 'P1', 'fix', fixPart)}${finding('F2', 'P3', 'defer', '    why: no user has a newline in a title\n')}${finding('F3', 'nit', 'skip')}`);

  // the round waits for the answer: next names it, and nothing else moves
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.stage, 'review-accept', r.stdout);
  assert.equal(r.json.command, `/spex:review ${DIR} ok`);
  assert.ok(r.json.text.includes('Stay in this chat: 3 finding(s) of review round 1 wait for your answer'), r.json.text);

  // a fix pick needs the claim and the paths; a pick the round does not have is refused
  assert.ok(codes(spex(repo, 'review', 'accept', DIR, '2=fix')).includes('REVIEW-FIX'));
  assert.ok(codes(spex(repo, 'review', 'accept', DIR, '9=fix')).includes('REVIEW-UNKNOWN'));
  assert.equal(spex(repo, 'review', 'accept', DIR, 'maybe').code, 2);

  r = spex(repo, 'review', 'accept', DIR, 'ok');
  assert.equal(r.code, 0, r.stdout);
  const tasks = parse(readFileSync(tasksPath, 'utf8'), { schema: 'core' });
  const t03 = tasks.tasks.find((t) => t.id === 'T03');
  assert.deepEqual([t03.kind, t03.severity, t03.review, t03.status, t03.instructions], ['fix', 'P1', '007-1/F1', 'todo', 'quote a title that holds a newline, in export.ts']);
  assert.ok(t03.source.startsWith('review round 1 F1 (P1, src/cli/commands/export.ts:12)') && t03.source.includes('When a list has a task whose title holds a newline'), t03.source);
  assert.deepEqual(tasks.deferred.map((d) => [d.severity, d.by, d.why]), [['P3', 'person', 'no user has a newline in a title']]);
  assert.equal(tasks.tasks.length, 3, 'the skip pick made nothing');
  const accepted = parse(readFileSync(join(repo, '.spex/review/007-1.findings.yaml'), 'utf8')).accepted;
  assert.deepEqual([accepted.by, accepted.tasks, accepted.deferred, accepted.skipped], ['person', ['T03'], ['F2'], ['F3']]);
  assert.equal(JSON.parse(readFileSync(join(repo, '.spex/runs/007/review.json'), 'utf8')).status, 'concerns');
  assert.equal(spex(repo, 'review', 'accept', DIR).json.findings[0].code, 'REVIEW-NONE', 'an answered round is not answered twice');

  // the accept was the approval: next goes to /spex:fix, not to /spex:approve, also once a test covers T03
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.stage, 'plan-tests', r.stdout);
  assert.equal(r.json.command, `/spex:fix ${DIR}`);
  const testsPath = join(repo, DIR, 'tests.yaml');
  writeFileSync(testsPath, `${readFileSync(testsPath, 'utf8')}  - id: TS03\n    covers: [T03]\n    kind: script\n    driver: shell\n    steps:\n      - grep -q fixed src/fix.txt\n    expect:\n      - the exit code is 0\n`);
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.stage, 'develop', r.stdout);
  assert.equal(r.json.command, `/spex:fix ${DIR}`);
  assert.equal(spex(repo, 'check', DIR).code, 0);

  // only spex review accept writes the review field: a forged one is an error
  writeFileSync(tasksPath, readFileSync(tasksPath, 'utf8').replace('review: 007-1/F1', 'review: 007-1/F3'));
  assert.ok(codes(spex(repo, 'check', DIR)).includes('TASK-REVIEW'));
  writeFileSync(tasksPath, readFileSync(tasksPath, 'utf8').replace('review: 007-1/F3', 'review: 007-1/F1'));

  // the fix is built and verified: round 2 only checks it, and an empty round is clean, so ship opens
  writeFileSync(join(repo, 'src/fix.txt'), 'fixed\n');
  writeFileSync(tasksPath, readFileSync(tasksPath, 'utf8').replace(/status: todo/g, 'status: done'));
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.command, `/spex:fix ${DIR}`, 'verify is part of the fix run');
  assert.equal(spex(repo, 'verify', DIR).code, 0);
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.stage, 'review');
  assert.ok(r.json.why.includes('checks each accepted finding'), r.json.why);
  r = spex(repo, 'show', DIR, '--review');
  assert.equal(r.json.round, 2);
  assert.equal(r.json.check, true);
  assert.ok(r.json.text.includes('## check (round 2)') && r.json.text.includes('T03 done P1 007-1/F1'), r.json.text);
  writeFileSync(join(repo, '.spex/review/007-2.findings.yaml'), 'feature: "007"\nround: 2\nfindings: []\n');
  r = spex(repo, 'review', 'accept', DIR, 'ok', '--by', 'agent');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(JSON.parse(readFileSync(join(repo, '.spex/runs/007/review.json'), 'utf8')).status, 'done');
  assert.equal(spex(repo, 'next', DIR).json.stage, 'ship');
  r = spex(repo, 'ship', DIR, '--merged');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.text.includes('deferred, for a later step:\n- P3 Finding F2 of the round'), r.json.text);
});

test('new --number starts at a number the repo uses elsewhere too, and never goes below the next one', () => {
  // nex numbers its specs in docs/my-specs/ as well: after 28 there, the next folder is 029, not 001.
  const repo = makeRepo('csv-export');
  let r = spex(repo, 'new', 'deploy-one-push', '--shaping', '--number', '29');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.dir, 'specs/029-deploy-one-push');
  r = spex(repo, 'new', 'next-step');
  assert.equal(r.json.dir, 'specs/030-next-step', 'the rest count on');
  r = spex(repo, 'new', 'older', '--number', '12');
  assert.equal(r.code, 2, r.stdout);
  assert.ok(r.json.findings[0].message.includes('below 31'), r.stdout);
  assert.equal(spex(repo, 'new', 'x', '--number', 'abc').code, 2);
});
