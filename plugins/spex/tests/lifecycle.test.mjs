// The gates and status writes, end to end on the README example: approve, plan gate, red-first,
// implement gate, done (and its refusals), review gate, archive. Plus show, coverage, new, report, init.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import { codes, gitIn, makeRepo, spex, spexText } from './helpers.mjs';

const DIR = 'specs/007-csv-export';
const status = (repo, id) => parse(readFileSync(join(repo, DIR, 'tasks.yaml'), 'utf8'), { schema: 'core' }).tasks.find((t) => t.id === id).status;
const reqStatus = (repo, id) => parse(readFileSync(join(repo, DIR, 'requirements.yaml'), 'utf8'), { schema: 'core' }).requirements.find((r) => r.id === id).status;

test('the whole lifecycle on the README example', () => {
  const repo = makeRepo('csv-export');

  // gate plan is closed while records are draft
  let r = spex(repo, 'gate', 'plan', DIR);
  assert.equal(r.code, 6);
  assert.ok(codes(r).includes('GATE-APPROVED'));

  // approve flips every draft record and keeps the file's comments and layout
  r = spex(repo, 'approve', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.approved, 2);
  assert.equal(reqStatus(repo, 'REQ-007-001'), 'approved');
  assert.ok(readFileSync(join(repo, DIR, 'requirements.yaml'), 'utf8').includes('decision: csv-stringify 6.x, because'), 'layout kept');

  // approve refuses an open question
  const q = makeRepo('csv-export');
  writeFileSync(join(q, DIR, 'requirements.yaml'), readFileSync(join(q, DIR, 'requirements.yaml'), 'utf8').replace('    answer: A\n    by: human\n', ''));
  r = spex(q, 'approve', DIR);
  assert.equal(r.code, 6);
  assert.ok(codes(r).includes('APPROVE-QUESTION'));

  r = spex(repo, 'gate', 'plan', DIR);
  assert.equal(r.code, 0, r.stdout);

  // next names T01; T02 waits on it
  r = spex(repo, 'next', DIR);
  assert.equal(r.json.task.id, 'T01');

  // gate tests T01 open; gate implement T01 open too: the gate runs the tests itself and they fail
  assert.equal(spex(repo, 'gate', 'tests', DIR, 'T01').code, 0);
  r = spex(repo, 'gate', 'implement', DIR, 'T01');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(existsSync(join(repo, '.spex/evidence/007/T01.red.json')), 'the gate leaves a record');

  // show --tests and show task carry the slices
  r = spex(repo, 'show', DIR, '--tests', 'T01');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.text.includes('REQ_007_001_AC_1'));
  assert.ok(r.json.text.includes('Never read src'));
  assert.ok(!r.json.text.includes('REQ_007_002'), 'only the named task');
  r = spex(repo, 'show', DIR, '--tests');
  assert.equal(r.json.text, 'every task has its tests: nothing to write');
  r = spex(repo, 'show', DIR, 'T01');
  assert.equal(r.code, 0, r.stdout);
  for (const needle of ['## paths', 'src/cli/commands/export.ts', '## requirements', 'REQ-007-001', '## boundaries', 'D1  Rows follow list order', 'M1  src/cli/commands/export.ts', '--test-name-pattern="REQ_007_001"']) assert.ok(r.json.text.includes(needle), `show lacks ${needle}\n${r.json.text}`);
  assert.match(r.json.text, /TaskStore\.ts:40-90 \(\d+ KB\)/, 'context sizes are shown');
  assert.ok(!r.json.text.includes('REQ-007-002'), 'show prints only the task\'s records');
  r = spex(repo, 'show', DIR, 'REQ-007-002');
  assert.ok(r.json.text.includes('exit with code 3'));
  r = spex(repo, 'show', DIR, '--decisions');
  assert.ok(r.json.text.includes('U1') && r.json.text.includes('D1'));

  // red-first by hand, the agent's own loop: the tests fail on an assertion and mention their ids
  r = spex(repo, 'run', DIR, 'T01', '--expect', 'fail');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.evidence.ok, true);

  // done runs the checks itself: the tests still fail, so nothing flips, whatever the records say
  r = spex(repo, 'run', DIR, 'T01');
  assert.equal(r.code, 7);
  assert.ok(codes(r).includes('RUN-FAILED'));
  writeFileSync(join(repo, '.spex/evidence/007/T01.json'), JSON.stringify({ ok: true, tree: 'forged' }));
  r = spex(repo, 'done', DIR, 'T01');
  assert.equal(r.code, 7);
  assert.ok(codes(r).includes('DONE-FAILED'), codes(r).join(','));
  assert.equal(status(repo, 'T01'), 'todo');

  // "implement": the state file flips; done passes with no earlier run at all
  writeFileSync(join(repo, 'src/state.txt'), 'implemented\n');
  r = spex(repo, 'done', DIR, 'T01');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(status(repo, 'T01'), 'done');
  assert.equal(spex(repo, 'next', DIR).json.task.id, 'T02');

  // green before the feature exists is a bug in the test: the gate sees it, and so does run
  r = spex(repo, 'gate', 'implement', DIR, 'T02');
  assert.equal(r.code, 6);
  assert.ok(codes(r).includes('GATE-RED'), codes(r).join(','));
  r = spex(repo, 'run', DIR, 'T02', '--expect', 'fail');
  assert.equal(r.code, 7);
  assert.ok(codes(r).includes('RUN-GREEN'));

  // the whole-feature run for the verify stage
  r = spex(repo, 'run', DIR, '--all');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(existsSync(join(repo, '.spex/evidence/007/all.json')));
  assert.ok(r.json.evidence.commands[0].cmd.includes('REQ_007_001|REQ_007_002'));

  assert.equal(spex(repo, 'done', DIR, 'T02').code, 0);

  // review gate, coverage, archive
  assert.equal(spex(repo, 'gate', 'review', DIR).code, 0);
  r = spex(repo, 'coverage', DIR);
  assert.equal(r.code, 0);
  assert.equal(r.json.missing, 0);
  r = spex(repo, 'archive', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.built, 2);
  assert.equal(reqStatus(repo, 'REQ-007-001'), 'built');
  r = spex(repo, 'index', '--scope', 'export');
  assert.equal(r.json.records.length, 2);
});

test('archive refuses with a task left, and reports default answers', () => {
  const repo = makeRepo('csv-export');
  spex(repo, 'approve', DIR);
  let r = spex(repo, 'archive', DIR);
  assert.equal(r.code, 6);
  assert.ok(codes(r).includes('ARCHIVE-TASKS'));
});

test('block writes the status and a reason file', () => {
  const repo = makeRepo('csv-export');
  const r = spex(repo, 'block', DIR, 'T01', '--reason', 'the TaskStore API has no openTasks()');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(status(repo, 'T01'), 'blocked');
  assert.ok(existsSync(join(repo, '.spex/runs/007/block-T01.json')));
  assert.equal(spex(repo, 'next', DIR).json.task, null);
});

test('show --tests picks a batch of tasks without tests, capped by scenarios', () => {
  const repo = makeRepo('csv-export');
  rmSync(join(repo, 'tests/acceptance/export.test.mjs'));
  spex(repo, 'approve', DIR);
  let r = spex(repo, 'show', DIR, '--tests');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.tasks, ['T01', 'T02']);
  assert.ok(r.json.text.startsWith('# tests for T01, T02 (batch of 2, 2 scenarios'));
  assert.ok(r.json.text.includes('names and values from the plan — T02'));
  assert.ok(r.json.text.includes('- spex run specs/007-csv-export T02 --expect fail'));
  r = spex(repo, 'gate', 'tests', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.tasks, ['T01', 'T02']);
  // a cap of one scenario makes a batch of one task
  writeFileSync(join(repo, 'specs/spex.yaml'), readFileSync(join(repo, 'specs/spex.yaml'), 'utf8').replace('verify_minutes: 2', 'tests_scenarios: 1, verify_minutes: 2'));
  r = spex(repo, 'show', DIR, '--tests');
  assert.deepEqual(r.json.tasks, ['T01']);
  r = spex(repo, 'show', DIR, '--tests', 'T02', 'T01');
  assert.deepEqual(r.json.tasks, ['T02', 'T01']);
  assert.equal(spex(repo, 'show', DIR, '--tests', 'T09').code, 2);
});

test('coverage names the scenario with no test', () => {
  const repo = makeRepo('csv-export');
  writeFileSync(join(repo, 'tests/acceptance/export.test.mjs'), "import test from 'node:test'; test('REQ_007_001_AC_1_x', () => {});\n");
  const r = spex(repo, 'coverage', DIR);
  assert.equal(r.code, 5);
  assert.equal(r.json.missing, 1);
  assert.ok(r.json.findings[0].message.includes('REQ_007_002_AC_1'));
  const g = spex(repo, 'gate', 'implement', DIR, 'T02');
  assert.ok(codes(g).includes('GATE-COVERAGE'));
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
  const diff = readFileSync(join(repo, r.json.diff), 'utf8');
  assert.ok(diff.includes('OutputExists') && diff.includes('exportCsv'));
  r = spex(repo, 'show', DIR, '--review', '--task', 'T01');
  const sliced = readFileSync(join(repo, r.json.diff), 'utf8');
  assert.ok(sliced.includes('exportCsv') && !sliced.includes('OutputExists'), 'the task slice has only its paths');
  // a branch named 007-… means the next feature is 008
  r = spex(repo, 'new', 'import-csv');
  assert.equal(r.json.dir, 'specs/008-import-csv');
  assert.ok(existsSync(join(repo, 'specs/008-import-csv')));
  // the diff cap sends the reviewer to per-task slices
  writeFileSync(join(repo, 'specs/spex.yaml'), readFileSync(join(repo, 'specs/spex.yaml'), 'utf8').replace('diff_kb: 120', 'diff_kb: 1'));
  writeFileSync(join(repo, 'src/cli/index.ts'), '// ' + 'x'.repeat(2000) + '\n');
  r = spex(repo, 'show', DIR, '--review');
  assert.equal(r.code, 6);
  assert.ok(codes(r).includes('REVIEW-DIFF-BIG'));
});

test('report writes the run status file Dex reads', () => {
  const repo = makeRepo('csv-export');
  const r = spex(repo, 'report', DIR, 'implement', 'T01', '--status', 'concerns', '--summary', 'Done, but the test asserts the wrong header.', '--concern', 'REQ-007-001/AC-1 expects `title,list`; the contract says `list,title`', '--file', 'src/cli/commands/export.ts', '--pulled', 'REQ-007-002');
  assert.equal(r.code, 0, r.stdout);
  const doc = JSON.parse(readFileSync(join(repo, '.spex/runs/007/implement-T01.json'), 'utf8'));
  assert.equal(doc.status, 'concerns');
  assert.equal(doc.concerns.length, 1);
  assert.deepEqual(doc.pulled, ['REQ-007-002']);
  assert.equal(spex(repo, 'report', DIR, 'implement', 'T01', '--status', 'nope', '--summary', 'x').code, 2);
});

test('init writes spex.yaml from a package.json scan', () => {
  const dir = mkdtempSync(join(tmpdir(), 'spex-init-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', scripts: { test: 'vitest run', typecheck: 'tsc --noEmit', 'test:acceptance': 'vitest run tests/acceptance' }, devDependencies: { vitest: '^3' } }));
  mkdirSync(join(dir, 'src'));
  mkdirSync(join(dir, 'tests/acceptance'), { recursive: true });
  gitIn(dir, ['init', '-q', '-b', 'main']);
  let r = spex(dir, 'init');
  assert.equal(r.code, 0, r.stdout);
  const cfg = parse(readFileSync(join(dir, 'specs/spex.yaml'), 'utf8'), { schema: 'core' });
  assert.equal(cfg.acceptance_dir, 'tests/acceptance');
  assert.ok(cfg.acceptance_cmd.includes('test:acceptance') && cfg.acceptance_cmd.includes('{ids}'));
  assert.deepEqual(cfg.fast_checks, ['npm run typecheck', 'npm test']);
  assert.ok(readFileSync(join(dir, '.gitignore'), 'utf8').includes('.spex/'));
  assert.equal(spex(dir, 'init').code, 6, 'refuses to overwrite');
  assert.equal(spex(dir, 'check').code, 0, 'a repo with no specs is clean');
});

test('text mode prints findings with their fix, and usage errors exit 2', () => {
  const repo = makeRepo('csv-export');
  writeFileSync(join(repo, 'src/state.txt'), 'implemented\n'); // the tests are green too early
  const r = spexText(repo, 'gate', 'implement', DIR, 'T01');
  assert.equal(r.code, 6, r.stdout);
  assert.ok(r.stdout.includes('GATE-RED') && r.stdout.includes('→'));
  assert.equal(spexText(repo, 'frobnicate').code, 2);
  assert.equal(spexText(repo, 'show', DIR).code, 2);
  assert.equal(spexText(repo).code, 2);
});
