// Another git repo: a task with `repo:` writes there, a driver with `repo:` runs its tests there, the evidence's
// tree covers both repos, the review diff has a part for each, and the close step merge commits and merges each,
// this repo last. The spec itself works in its worktree of this repo (the home repo); the other repo has no worktree.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import test from 'node:test';
import { DIR, NAME, codes, commitAll, configure, edit, gitIn, makeRepo, ok, read, spex, tempDir, worktreeOf } from './helpers.mjs';

const finding = (r, code) => r.json.findings.find((f) => f.code === code);

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

/**
 * The csv-export fixture, and a ui repo next to it on its own branch, with T03 and TS03 in it. The path of the ui repo
 * is absolute: the spec works in its worktree, and a path like ../ui from that folder points at nothing.
 */
function setup({ uiClose = '', homeClose = '', task = T03(), path } = {}) {
  const home = makeRepo('csv-export');
  const ui = tempDir('spex-ui-');
  mkdirSync(join(ui, 'src'));
  mkdirSync(join(ui, 'tests'));
  writeFileSync(join(ui, 'src/page.txt'), 'old\n');
  writeFileSync(join(ui, 'tests/page.test.mjs'), UI_TEST);
  gitIn(ui, ['init', '-q', '-b', 'main']);
  gitIn(ui, ['config', 'user.name', 'spex-test']);
  gitIn(ui, ['config', 'user.email', 'spex@test']);
  gitIn(ui, ['config', 'commit.gpgsign', 'false']);
  gitIn(ui, ['add', '-A']);
  gitIn(ui, ['commit', '-q', '-m', 'ui']);
  gitIn(ui, ['checkout', '-qb', 'feat']);
  configure(home, [
    `repos: {ui: {path: ${path ? path(ui, home) : ui}, fast_checks: ['test -f src/page.txt']${uiClose ? `, close: ${uiClose}` : ''}}}`,
    `drivers: {ui-node: {repo: ui, cmd: 'node --test --test-name-pattern="{ids}" "tests/**/*.test.mjs"', dir: tests}}`,
    ...(homeClose ? [`close: ${homeClose}`] : []),
  ].join('\n'));
  edit(home, `${DIR}/tasks.yaml`, (s) => s + task);
  edit(home, `${DIR}/tests.yaml`, (s) => s + TS03);
  commitAll(home, 'the ui task');
  return { home, ui, wt: worktreeOf(home) };
}

/** plan ended and implement started: the three tasks are approved, and the spec is in its worktree. */
const implement = (home) => {
  for (const args of [['start', 'plan'], ['end', 'plan'], ['start', 'implement']]) ok(home, ...args, DIR);
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
  edit(home, `${DIR}/tasks.yaml`, (s) => s.replace('    paths: [src/cli/commands/export.ts, src/cli/index.ts, tests/unit/export.test.ts]', '    parallel_group: g\n    paths: [src/cli/commands/export.ts, src/cli/index.ts, tests/unit/export.test.ts]'));
  r = spex(home, 'check', DIR);
  assert.ok(!codes(r).includes('TASK-PARALLEL'), r.stdout);

  // a clone that is not there is a warning here; a driver with an unknown repo is a config error
  const s = setup();
  rmSync(s.ui, { recursive: true, force: true });
  r = spex(s.home, 'check', DIR);
  assert.ok(r.json.findings.some((f) => f.code === 'REPO-MISSING' && f.severity === 'warning' && f.message.startsWith('T03: repo ui:')), r.stdout);
  edit(s.home, '.spex/config.yaml', (c) => c.replace('ui-node: {repo: ui,', 'ui-node: {repo: web,'));
  r = spex(s.home, 'check', DIR);
  assert.ok(codes(r).includes('CONFIG-REPO'), r.stdout);
  // the config of spex 2 gave each repo a ship: it is close now, and the old key is refused by name
  edit(s.home, '.spex/config.yaml', (c) => c.replace('ui-node: {repo: web,', 'ui-node: {repo: ui,').replace("fast_checks: ['test -f src/page.txt']", "fast_checks: ['test -f src/page.txt'], ship: {cmd: \"true\"}"));
  r = spex(s.home, 'check', DIR);
  assert.ok(r.json.findings.some((f) => f.code === 'CONFIG-SCHEMA' && f.message === 'repos.ui: unknown field "ship"'), r.stdout);
});

test('implement: the red run, done and the slice work in the ui repo, from the worktree of the spec; the start commit is recorded once', () => {
  const { home, ui, wt } = setup();
  implement(home);
  // a commit in the ui repo before its first task: not part of this spec
  writeFileSync(join(ui, 'before.txt'), 'older work\n');
  gitIn(ui, ['add', '-A']);
  gitIn(ui, ['commit', '-q', '-m', 'older work']);
  const start = gitIn(ui, ['rev-parse', 'HEAD']).trim();

  let r = spex(home, 'gate', 'develop', DIR, 'T03');
  assert.equal(r.code, 0, r.stdout);
  const red = JSON.parse(read(wt, r.json.red));
  assert.ok(red.commands[0].cmd.startsWith(`cd '${ui}' && node --test`), red.commands[0].cmd);
  assert.deepEqual(JSON.parse(read(wt, '.spex/runs/007/start.json')), { ui: start });
  assert.ok(!existsSync(join(home, '.spex/runs')), 'the records of the run are in the worktree of the spec');

  r = spex(home, 'show', DIR, 'T03');
  assert.ok(r.json.text.includes(`repo: ui — another git repo at ${ui}`), r.json.text);
  assert.ok(r.json.text.includes(`- ${ui}/src/page.txt`), r.json.text);
  assert.ok(r.json.text.includes(`files under ${ui}/tests`), r.json.text);

  writeFileSync(join(ui, 'src/page.txt'), 'new\n');
  r = spex(home, 'done', DIR, 'T03');
  assert.equal(r.code, 0, r.stdout);
  assert.match(r.json.tree, /^[0-9a-f]{24} ui:[0-9a-f]{24}$/);
  assert.ok(r.json.evidence.commands.some((c) => c.cmd === `cd '${ui}' && test -f src/page.txt`), 'the ui repo fast check ran there');
  // the ui repo has no worktree: the task wrote the branch that repo is on
  assert.equal(gitIn(ui, ['branch', '--show-current']).trim(), 'feat');
  assert.ok(!existsSync(join(ui, '.claude/worktrees')));

  // a second gate does not move the start
  gitIn(ui, ['add', '-A']);
  gitIn(ui, ['commit', '-q', '-m', 'page']);
  spex(home, 'gate', 'develop', DIR, 'T03');
  assert.equal(JSON.parse(read(wt, '.spex/runs/007/start.json')).ui, start);

  // the review diff: this repo's part (the branch of the spec against the base), then the ui part from the start commit
  r = spex(home, 'show', DIR, '--review');
  assert.equal(r.code, 0, r.stdout);
  const diff = read(wt, r.json.diff);
  assert.ok(diff.includes(`+++ b/${ui}/src/page.txt`) && diff.includes(`+++ b/${DIR}/status.yaml`), diff);
  assert.ok(!diff.includes('before.txt'), 'work before the first task is not in the diff');
  assert.deepEqual(r.json.repos, [{ repo: 'ui', path: ui, base: start, why: 'the commit at its first task' }]);
  r = spex(home, 'show', DIR, '--review', '--task', 'T03');
  const part = read(wt, r.json.diff);
  assert.ok(part.includes(`b/${ui}/src/page.txt`) && !part.includes('src/state.txt'), part);
});

test('a repo path is absolute or starts with ~/: the spec works in its worktree, and ../ from there is another folder', () => {
  for (const form of ['absolute', 'home']) {
    const { home, ui, wt } = setup({ path: (abs) => (form === 'absolute' ? abs : `~/${basename(abs)}`) });
    const HOME = process.env.HOME;
    if (form === 'home') process.env.HOME = dirname(ui);
    try {
      implement(home);
      let r = spex(home, 'gate', 'develop', DIR, 'T03');
      assert.equal(r.code, 0, r.stdout);
      const red = JSON.parse(read(wt, r.json.red));
      assert.ok(red.commands[0].cmd.startsWith(`cd '${ui}' && node --test`), `${form}: ${red.commands[0].cmd}`);
      r = spex(home, 'show', DIR, 'T03');
      assert.ok(r.json.text.includes(`- ${ui}/src/page.txt`) && r.json.text.includes(`files under ${ui}/tests`), r.json.text);
      writeFileSync(join(ui, 'src/page.txt'), 'new\n');
      r = spex(home, 'done', DIR, 'T03');
      assert.equal(r.code, 0, `${form}: ${r.stdout}`);
      r = spex(home, 'show', DIR, '--review');
      assert.ok(read(wt, r.json.diff).includes(`+++ b/${ui}/src/page.txt`), form);
    } finally {
      process.env.HOME = HOME;
    }
  }
  // a path from the main folder is right there, and wrong in the worktree. The check says so in the main folder,
  // with the cause, before a worktree exists.
  const { home } = setup({ path: (abs, from) => relative(from, abs) });
  const r = spex(home, 'check', DIR);
  assert.equal(r.code, 4, r.stdout);
  assert.ok(finding(r, 'REPO-PATH').message.endsWith('is relative') && finding(r, 'REPO-PATH').fix.includes('absolute, or with ~/'), r.stdout);
});

test('the evidence covers both trees: a change in the ui repo makes the green run stale', () => {
  const { home, ui, wt } = setup();
  implement(home);
  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n');
  writeFileSync(join(ui, 'src/page.txt'), 'new\n');
  for (const t of ['T01', 'T02', 'T03']) ok(home, 'done', DIR, t);
  let r = spex(home, 'verify', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.evidence.scripts.some((s) => s.id === 'TS03' && s.ok), r.stdout);
  assert.match(r.json.evidence.tree, /^[0-9a-f]{24} ui:[0-9a-f]{24}$/);
  assert.equal(spex(home, 'gate', 'verify', DIR).code, 0);
  // a file in the ui repo after the proof: implement cannot end, and review cannot start
  writeFileSync(join(ui, 'src/extra.txt'), 'later\n');
  assert.deepEqual(codes(spex(home, 'end', 'implement', DIR)), ['GATE-VERIFY']);
  rmSync(join(ui, 'src/extra.txt'));
  ok(home, 'end', 'implement', DIR);
  writeFileSync(join(ui, 'src/extra.txt'), 'later\n');
  r = spex(home, 'start', 'review', DIR);
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['GATE-VERIFY']);
  rmSync(join(ui, 'src/extra.txt'));
  assert.equal(spex(home, 'start', 'review', DIR).code, 0);
});

/** Every task done, the proof green, review started and its round clean, and the close up to `built`. */
function readyToMerge(s, { note = false } = {}) {
  implement(s.home);
  writeFileSync(join(s.wt, 'src/state.txt'), 'implemented\n');
  writeFileSync(join(s.ui, 'src/page.txt'), 'new\n');
  for (const t of ['T01', 'T02', 'T03']) ok(s.home, 'done', DIR, t);
  ok(s.home, 'verify', DIR);
  ok(s.home, 'end', 'implement', DIR);
  ok(s.home, 'start', 'review', DIR);
  ok(s.home, 'show', DIR, '--review');
  writeFileSync(join(s.wt, '.spex/review/007-1.findings.yaml'), 'feature: "007"\nround: 1\nfindings: []\n');
  ok(s.home, 'review', 'accept', DIR, 'ok', '--by', 'agent');
  if (note) {
    // a note that came to the base branch while the spec was open
    mkdirSync(join(s.home, 'specs/008-restore'));
    writeFileSync(join(s.home, 'specs/008-restore/spec.md'), '# 008 Restore\n\n> A note: /spex:plan writes the full spec when the turn of this spec comes.\n\n## Why\nw\n\n## What\n- w\n\n## Not this\n- w\n');
    commitAll(s.home, 'a note');
  }
  ok(s.home, 'close', DIR, 'sync');
  ok(s.home, 'close', DIR, 'later');
  if (note) {
    // the tree id covers the ui repo too, so "only notes changed" is not taken on trust: the proof runs again
    const r = spex(s.home, 'close', DIR, 'prove');
    assert.equal(r.code, 7, r.stdout);
    assert.deepEqual([codes(r), r.json.ran], [['CLOSE-PROOF'], true]);
    assert.equal(ok(s.home, 'verify', DIR).json.evidence.round, 2);
  }
  assert.equal(ok(s.home, 'close', DIR, 'prove').json.why, 'same tree');
  ok(s.home, 'close', DIR, 'built');
}

test('close merge: the ui repo first, then this one; a failed merge there stops before this repo, and a second run skips what merged', () => {
  // the close.cmd of this repo merges the branch of the spec in the main folder, as a forge does on its side
  const mergeHere = 'git -C "$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")" merge -q --no-ff --no-edit "$SPEX_BRANCH"';
  const s = setup({ uiClose: '{commit: true, cmd: "test -f merged.flag"}', homeClose: `{cmd: '${mergeHere}'}` });
  readyToMerge(s, { note: true });
  let r = spex(s.home, 'close', DIR, 'merge');
  assert.equal(r.code, 7, r.stdout);
  assert.deepEqual(codes(r), ['CLOSE-MERGE-FAILED']);
  assert.equal(finding(r, 'CLOSE-MERGE-FAILED').message, `close.cmd of repo ui (${s.ui}) exited 1`);
  assert.ok(r.json.text.startsWith(`ui (${s.ui}): committed\n`), r.json.text);
  assert.equal(gitIn(s.ui, ['log', '-1', '--format=%s']).trim(), '007: Export open tasks as CSV', 'the ui repo has its commit');
  assert.equal(gitIn(s.home, ['log', '-1', '--format=%s']).trim(), 'a note', 'this repo waits');
  writeFileSync(join(s.ui, 'merged.flag'), '');
  r = spex(s.home, 'close', DIR, 'merge');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.text.includes(`ui (${s.ui}): merged: test -f merged.flag\nmerged: git -C`), r.json.text);
  assert.deepEqual(JSON.parse(read(s.wt, '.spex/runs/007/ship.json')), { merged: { ui: 'close.cmd' } });
  assert.equal(gitIn(s.home, ['log', '-1', '--format=%s']).trim(), `Merge branch 'spex/${NAME}'`);
  // a second run: the ui repo is skipped, and the base branch has the spec as closed
  rmSync(join(s.ui, 'merged.flag'));
  r = spex(s.home, 'close', DIR, 'merge');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.text.startsWith(`ui (${s.ui}): merged already, by close.cmd\nmerged already: main has ${NAME} as closed\n`), r.json.text);
  r = spex(s.home, 'close', DIR, 'finish');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(!existsSync(s.wt) && r.json.next === '/spex:plan specs/008-restore', r.json.text);
});

test('close merge: a repo on its own base is refused; with commit: false and no close.cmd the commit and the merge there are the person\'s, and the close waits', () => {
  const s = setup({ uiClose: '{commit: false, cmd: ""}', homeClose: '{cmd: local}' });
  readyToMerge(s);
  // the ui repo on main is on the branch its work merges into: the close refuses to go on
  gitIn(s.ui, ['checkout', '-q', 'main']);
  let r = spex(s.home, 'close', DIR, 'merge');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['CLOSE-BRANCH']);
  assert.equal(finding(r, 'CLOSE-BRANCH').message, `repo ui (${s.ui}) is on main: the close merges a branch, and this is the target`);
  gitIn(s.ui, ['checkout', '-q', 'feat']);
  r = spex(s.home, 'close', DIR, 'merge');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['CLOSE-WAIT']);
  assert.equal(finding(r, 'CLOSE-WAIT').message, `no close.cmd merges ui (${s.ui})`);
  assert.deepEqual([r.json.step, r.json.waits, r.json.branch, r.json.base], ['merge', true, `spex/${NAME}`, 'main']);
  // commit: false: the script left the work of the ui repo as it is
  assert.equal(gitIn(s.ui, ['log', '-1', '--format=%s']).trim(), 'ui');
  assert.equal(gitIn(s.ui, ['status', '--porcelain']).trim(), 'M src/page.txt');
  assert.deepEqual(JSON.parse(read(s.wt, '.spex/runs/007/ship.json')), { merged: {} });
  assert.equal(gitIn(s.home, ['log', '-1', '--format=%s']).trim(), 'the ui task', 'this repo is not merged while another repo waits');
  // the person commits and merges the ui repo; this repo has close.cmd local, so finish merges it and ends the close
  gitIn(s.ui, ['commit', '-qam', 'the page']);
  gitIn(s.ui, ['checkout', '-q', 'main']);
  gitIn(s.ui, ['merge', '-q', 'feat']);
  r = spex(s.home, 'close', DIR, 'finish');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.text.includes(`merged spex/${NAME} into main (close.cmd: local)`) && !existsSync(s.wt), r.json.text);
  assert.equal(read(s.home, `${DIR}/status.yaml`), 'command: review\nstate: done\n');
});
