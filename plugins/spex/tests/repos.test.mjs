// Another git repo: a task with `repo:` writes there, a driver with `repo:` runs its tests there, the evidence's
// tree covers both repos, the review diff has a part for each, and ship commits and merges each, this repo last.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';
import test from 'node:test';
import { codes, gitIn, makeRepo, spex } from './helpers.mjs';

const DIR = 'specs/007-csv-export';

const UI_TEST = `import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('TASK_007_03_page_says_new', () => {
  assert.equal(readFileSync(new URL('../src/page.txt', import.meta.url), 'utf8'), 'new\\n');
});
`;

const T03 = (extra = '') => `  - id: T03
    title: "The ui page says new"
    kind: setup
    requirements: []
    repo: ui
    paths: [src/page.txt]
    context: [src/page.txt]
${extra}    instructions: |
      Write new in src/page.txt.
    done_when: TS03 passes.
    status: todo
`;

const TS03 = `  - id: TS03
    covers: [T03]
    kind: script
    driver: ui-node
    name: TASK_007_03_page_says_new
    file: tests/page.test.mjs
    steps:
      - read src/page.txt
    expect:
      - it holds "new"
`;

/** The csv-export fixture on a branch, and a ui repo next to it on its own branch, with T03 and TS03 in it. */
function setup({ uiShip = '', homeShip = '', task = T03(), path } = {}) {
  const home = makeRepo('csv-export');
  gitIn(home, ['checkout', '-qb', 'feat']);
  const ui = mkdtempSync(join(tmpdir(), 'spex-ui-'));
  mkdirSync(join(ui, 'src'));
  mkdirSync(join(ui, 'tests'));
  writeFileSync(join(ui, 'src/page.txt'), 'old\n');
  writeFileSync(join(ui, 'tests/page.test.mjs'), UI_TEST);
  gitIn(ui, ['init', '-q', '-b', 'main']);
  gitIn(ui, ['add', '-A']);
  gitIn(ui, ['commit', '-q', '-m', 'ui']);
  gitIn(ui, ['checkout', '-qb', 'feat']);
  const rel = relative(home, ui);
  const cfg = join(home, '.spex/config.yaml');
  writeFileSync(cfg, readFileSync(cfg, 'utf8') + [
    `repos: {ui: {path: ${path ? path(ui) : rel}, fast_checks: ['test -f src/page.txt']${uiShip ? `, ship: ${uiShip}` : ''}}}`,
    `drivers: {ui-node: {repo: ui, cmd: 'node --test --test-name-pattern="{ids}" "tests/**/*.test.mjs"', dir: tests}}`,
    ...(homeShip ? [`ship: ${homeShip}`] : []),
    '',
  ].join('\n'));
  const tasks = join(home, DIR, 'tasks.yaml');
  writeFileSync(tasks, readFileSync(tasks, 'utf8') + task);
  const tests = join(home, DIR, 'tests.yaml');
  writeFileSync(tests, readFileSync(tests, 'utf8') + TS03);
  gitIn(home, ['add', '-A']);
  gitIn(home, ['commit', '-q', '-m', 'the ui task']);
  return { home, ui, rel };
}

const approveAll = (home) => {
  for (let i = 0; i < 2; i++) {
    const r = spex(home, 'approve', DIR);
    assert.equal(r.code, 0, r.stdout);
  }
};

test('check: a task names a repo of the config; its protected folders, context and parallel files are its own', () => {
  let { home } = setup();
  let r = spex(home, 'check', DIR);
  assert.ok(!codes(r).some((c) => /REPO|TASK-CONTEXT|TASK-PROTECTED/.test(c)), r.stdout);

  ({ home } = setup({ task: T03().replace('repo: ui', 'repo: uix') }));
  r = spex(home, 'check', DIR);
  assert.ok(codes(r).includes('TASK-REPO'), r.stdout);

  // the ui driver's folder is protected in the ui repo, and only there
  ({ home } = setup({ task: T03().replace('paths: [src/page.txt]', 'paths: [src/page.txt, tests/page.test.mjs]') }));
  r = spex(home, 'check', DIR);
  assert.ok(r.json.findings.some((f) => f.code === 'TASK-PROTECTED' && f.message.includes('tests/page.test.mjs')), r.stdout);

  // the same path in two repos is two files: no TASK-PARALLEL
  ({ home } = setup({ task: T03('    parallel_group: g\n').replace('paths: [src/page.txt]', 'paths: [src/cli/index.ts]').replace('context: [src/page.txt]', 'context: []') }));
  const tasks = join(home, DIR, 'tasks.yaml');
  writeFileSync(tasks, readFileSync(tasks, 'utf8').replace('    paths: [src/cli/commands/export.ts, src/cli/index.ts, tests/unit/export.test.ts]', '    parallel_group: g\n    paths: [src/cli/commands/export.ts, src/cli/index.ts, tests/unit/export.test.ts]'));
  r = spex(home, 'check', DIR);
  assert.ok(!codes(r).includes('TASK-PARALLEL'), r.stdout);

  // a clone that is not there is a warning here; a driver with an unknown repo is a config error
  const s = setup();
  rmSync(s.ui, { recursive: true, force: true });
  r = spex(s.home, 'check', DIR);
  assert.ok(r.json.findings.some((f) => f.code === 'REPO-MISSING' && f.severity === 'warning' && f.message.startsWith('T03: repo ui:')), r.stdout);
  const cfg = join(s.home, '.spex/config.yaml');
  writeFileSync(cfg, readFileSync(cfg, 'utf8').replace('ui-node: {repo: ui,', 'ui-node: {repo: web,'));
  r = spex(s.home, 'check', DIR);
  assert.ok(codes(r).includes('CONFIG-REPO'), r.stdout);
});

test('develop: the red run, done and the slice work in the ui repo; the start commit is recorded once', () => {
  const { home, ui, rel } = setup();
  approveAll(home);
  // a commit in the ui repo before its first task: not part of this feature
  writeFileSync(join(ui, 'before.txt'), 'older work\n');
  gitIn(ui, ['add', '-A']);
  gitIn(ui, ['commit', '-q', '-m', 'older work']);
  const start = gitIn(ui, ['rev-parse', 'HEAD']).trim();

  let r = spex(home, 'gate', 'develop', DIR, 'T03');
  assert.equal(r.code, 0, r.stdout);
  const red = JSON.parse(readFileSync(join(home, r.json.red), 'utf8'));
  assert.ok(red.commands[0].cmd.startsWith(`cd '${rel}' && node --test`), red.commands[0].cmd);
  assert.deepEqual(JSON.parse(readFileSync(join(home, '.spex/runs/007/start.json'), 'utf8')), { ui: start });

  r = spex(home, 'show', DIR, 'T03');
  assert.ok(r.json.text.includes(`repo: ui — another git repo at ${rel}`), r.json.text);
  assert.ok(r.json.text.includes(`- ${rel}/src/page.txt`), r.json.text);
  assert.ok(r.json.text.includes(`files under ${rel}/tests`), r.json.text);

  writeFileSync(join(ui, 'src/page.txt'), 'new\n');
  r = spex(home, 'done', DIR, 'T03');
  assert.equal(r.code, 0, r.stdout);
  assert.match(r.json.tree, / ui:[0-9a-f]{12}\+[0-9a-f]{12}$/);
  assert.ok(r.json.evidence.commands.some((c) => c.cmd === `cd '${rel}' && test -f src/page.txt`), 'the ui repo fast check ran there');

  // a second gate does not move the start
  gitIn(ui, ['add', '-A']);
  gitIn(ui, ['commit', '-q', '-m', 'page']);
  spex(home, 'gate', 'develop', DIR, 'T03');
  assert.equal(JSON.parse(readFileSync(join(home, '.spex/runs/007/start.json'), 'utf8')).ui, start);

  // the review diff: this repo's part, then the ui part from the start commit, its paths from the home root
  r = spex(home, 'show', DIR, '--review');
  assert.equal(r.code, 0, r.stdout);
  const diff = readFileSync(join(home, r.json.diff), 'utf8');
  assert.ok(diff.includes(`+++ b/${rel}/src/page.txt`), diff);
  assert.ok(!diff.includes('before.txt'), 'work before the first task is not in the diff');
  assert.equal(r.json.repos[0].base, start);
  r = spex(home, 'show', DIR, '--review', '--task', 'T03');
  const part = readFileSync(join(home, r.json.diff), 'utf8');
  assert.ok(part.includes(`b/${rel}/src/page.txt`) && !part.includes('src/state.txt'), part);
});

test('a repo path may be absolute or start with ~/: from a git worktree, ../ points at another folder', () => {
  for (const form of ['absolute', 'home']) {
    const { home, ui } = setup({ path: (abs) => (form === 'absolute' ? abs : `~/${basename(abs)}`) });
    const HOME = process.env.HOME;
    if (form === 'home') process.env.HOME = dirname(ui);
    try {
      approveAll(home);
      let r = spex(home, 'gate', 'develop', DIR, 'T03');
      assert.equal(r.code, 0, r.stdout);
      const red = JSON.parse(readFileSync(join(home, r.json.red), 'utf8'));
      assert.ok(red.commands[0].cmd.startsWith(`cd '${ui}' && node --test`), `${form}: ${red.commands[0].cmd}`);
      r = spex(home, 'show', DIR, 'T03');
      assert.ok(r.json.text.includes(`- ${ui}/src/page.txt`) && r.json.text.includes(`files under ${ui}/tests`), r.json.text);
      writeFileSync(join(ui, 'src/page.txt'), 'new\n');
      r = spex(home, 'done', DIR, 'T03');
      assert.equal(r.code, 0, `${form}: ${r.stdout}`);
      r = spex(home, 'show', DIR, '--review');
      assert.ok(readFileSync(join(home, r.json.diff), 'utf8').includes(`+++ b/${ui}/src/page.txt`), form);
    } finally {
      process.env.HOME = HOME;
    }
  }
});

test('the evidence covers both trees: a change in the ui repo makes the green run stale', () => {
  const { home, ui } = setup();
  approveAll(home);
  writeFileSync(join(home, 'src/state.txt'), 'implemented\n');
  writeFileSync(join(ui, 'src/page.txt'), 'new\n');
  const tasks = join(home, DIR, 'tasks.yaml');
  writeFileSync(tasks, readFileSync(tasks, 'utf8').replace(/status: todo/g, 'status: done'));
  let r = spex(home, 'verify', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.evidence.scripts.some((s) => s.id === 'TS03' && s.ok), r.stdout);
  assert.equal(spex(home, 'gate', 'review', DIR).code, 0);
  writeFileSync(join(ui, 'src/extra.txt'), 'later\n');
  r = spex(home, 'gate', 'review', DIR);
  assert.ok(codes(r).includes('GATE-VERIFY'), r.stdout);
  rmSync(join(ui, 'src/extra.txt'));
  assert.equal(spex(home, 'gate', 'review', DIR).code, 0);
});

/** Every task done, verify green, a clean review: ready to ship. */
function readyToShip(s) {
  approveAll(s.home);
  writeFileSync(join(s.home, 'src/state.txt'), 'implemented\n');
  writeFileSync(join(s.ui, 'src/page.txt'), 'new\n');
  const tasks = join(s.home, DIR, 'tasks.yaml');
  writeFileSync(tasks, readFileSync(tasks, 'utf8').replace(/status: todo/g, 'status: done'));
  assert.equal(spex(s.home, 'verify', DIR).code, 0);
  mkdirSync(join(s.home, '.spex/runs/007'), { recursive: true });
  writeFileSync(join(s.home, '.spex/runs/007/review.json'), JSON.stringify({ status: 'done', stage: 'review', task: null, concerns: [], questions: [] }));
}

test('ship: the ui repo first, then this one; a failed merge there stops before this repo and a rerun skips what merged', () => {
  const s = setup({ uiShip: '{commit: true, cmd: "test -f merged.flag"}', homeShip: '{commit: true, cmd: "true"}' });
  readyToShip(s);
  let r = spex(s.home, 'ship', DIR);
  assert.equal(r.code, 7, r.stdout);
  assert.ok(r.json.findings.some((f) => f.code === 'SHIP-FAILED' && f.message.includes('repo ui')), r.stdout);
  assert.ok(gitIn(s.ui, ['log', '--oneline', '-1']).includes('007: Export open tasks as CSV'), 'the ui repo has its commit');
  assert.ok(!gitIn(s.home, ['log', '--oneline', '-1']).includes('007: Export'), 'this repo waits');
  writeFileSync(join(s.ui, 'merged.flag'), '');
  r = spex(s.home, 'ship', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.repos, { ui: 'ship.cmd' });
  assert.ok(gitIn(s.home, ['log', '--oneline', '-1']).includes('007: Export open tasks as CSV'));
  rmSync(join(s.ui, 'merged.flag'));
  r = spex(s.home, 'ship', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.text.includes('merged already'), r.json.text);
});

test('ship: a repo with no ship.cmd waits for a person after this repo merges; --merged records it', () => {
  const s = setup({ homeShip: '{commit: true, cmd: "true"}' });
  readyToShip(s);
  // the ui repo on main is on the branch ship merges into: ship refuses to merge it
  gitIn(s.ui, ['checkout', '-q', 'main']);
  let r = spex(s.home, 'ship', DIR);
  assert.ok(codes(r).includes('SHIP-BRANCH') && r.json.findings[0].message.includes('repo ui'), r.stdout);
  gitIn(s.ui, ['checkout', '-q', 'feat']);
  r = spex(s.home, 'ship', DIR);
  assert.equal(r.code, 6, r.stdout);
  assert.ok(r.json.findings.some((f) => f.code === 'SHIP-CMD' && f.message.includes('ui (')), r.stdout);
  assert.equal(r.json.merged_by, 'ship.cmd');
  r = spex(s.home, 'ship', DIR, '--merged');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.repos, { ui: 'a person' });
  assert.ok(existsSync(join(s.home, '.spex/runs/007/ship.json')));
});
