// What a run needs from the script between its agents, and the flow through a remote. A repo that merges with a
// command (a pull request, a squash) needs the notes on the remote before a spec starts: else the request carries
// them, and after a squash the base branch here and on the remote hold the same change in two commits. So with
// commit: true the script pushes the notes, and a start and the close refuse a base branch that is ahead.
import assert from 'node:assert/strict';
import { chmodSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { DIR, NAME, codes, commitAll, configure, edit, gitIn, implementing, makeRepo, ok, read, reviewing, spex, tempDir, worktreeOf } from './helpers.mjs';

const RULE = '─'.repeat(40);
const finding = (r, code) => r.json.findings.find((f) => f.code === code);
const lastCommit = (root, ref = 'HEAD') => gitIn(root, ['log', '-1', '--format=%s', ref]).trim();
const rev = (root, ref) => gitIn(root, ['rev-parse', ref]).trim();

/** A stand-in for `gh pr create --fill && gh pr merge --squash --delete-branch`: push the branch, squash it into the base on the remote. */
function forge() {
  const path = join(tempDir('spex-forge-'), 'forge.sh');
  writeFileSync(
    path,
    [
      '#!/bin/sh',
      'set -e',
      'git push -q origin "$SPEX_BRANCH"',
      'tmp=$(mktemp -d "${TMPDIR:-/tmp}/spex-forge-clone-XXXXXX")',
      'git clone -q "$(git remote get-url origin)" "$tmp/c"',
      'cd "$tmp/c"',
      'git config user.name forge; git config user.email forge@test; git config commit.gpgsign false',
      'git checkout -q "$SPEX_BASE"',
      'git merge --squash "origin/$SPEX_BRANCH" >/dev/null',
      'git commit -q -m "squash: $SPEX_BRANCH"',
      'git push -q origin "$SPEX_BASE"',
      'git push -q origin --delete "$SPEX_BRANCH"',
      '',
    ].join('\n'),
  );
  chmodSync(path, 0o755);
  return path;
}

test('a remote and a squash merge: commit pushes the notes, a base branch that is ahead refuses a start and the close, and finish pulls clean', () => {
  const remote = tempDir('spex-remote-');
  gitIn(remote, ['init', '-q', '--bare', '-b', 'main']);
  const repo = makeRepo('csv-export');
  const wt = worktreeOf(repo);
  configure(repo, `commit: true\nclose: {cmd: "${forge()}"}`);
  commitAll(repo, 'the config');
  gitIn(repo, ['remote', 'add', 'origin', remote]);
  gitIn(repo, ['push', '-q', '-u', 'origin', 'main']);
  const words = join(tempDir('spex-words-'), 'words.md');
  writeFileSync(words, 'A restore command.\nIt reads a backup file.\n');

  // new writes a note; commit puts it on the base branch and on the remote, and ends with the NEXT block of the reply
  ok(repo, 'new', 'restore', '--words', words);
  let r = ok(repo, 'commit', '--message', 'spex: notes for a restore');
  assert.deepEqual([r.json.committed, r.json.pushed, codes(r)], [true, true, []]);
  assert.equal(r.json.text, `committed on main: spex: notes for a restore (2 file(s))\npushed main to origin/main\n${RULE}\nNEXT   /clear\n       /spex:plan ${DIR}\n       It is the turn of this spec.\n${RULE}`);
  assert.equal(lastCommit(remote, 'main'), 'spex: notes for a restore');

  // one spec, start to end, through the request
  ok(repo, 'start', 'plan', DIR);
  ok(repo, 'end', 'plan', DIR);
  ok(repo, 'start', 'implement', DIR);
  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n');
  for (const t of ['T01', 'T02']) ok(repo, 'done', DIR, t);
  ok(repo, 'verify', DIR);
  ok(repo, 'end', 'implement', DIR);
  ok(repo, 'start', 'review', DIR);
  // a commit on the base branch that the remote does not have: the request would carry it, so the close waits
  edit(repo, 'specs/008-restore/spec.md', (s) => `${s}\nOne more line, committed by hand.\n`);
  commitAll(repo, 'a note, by hand');
  r = spex(repo, 'close', DIR, 'sync');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['GATE-PUSH']);
  assert.equal(finding(r, 'GATE-PUSH').message, 'main has 1 commit(s) that origin/main does not have');
  assert.ok(finding(r, 'GATE-PUSH').fix.startsWith('Push main (`git push`). On a protected branch: send these commits as a small pull request') && finding(r, 'GATE-PUSH').fix.endsWith(`Then run \`spex close ${DIR} sync\` again.`), r.stdout);
  gitIn(repo, ['push', '-q', 'origin', 'main']);
  for (const step of ['sync', 'later', 'prove', 'built']) ok(repo, 'close', DIR, step);
  r = ok(repo, 'close', DIR, 'merge');
  assert.equal(lastCommit(remote, 'main'), `squash: spex/${NAME}`);
  r = spex(repo, 'close', DIR, 'finish');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(codes(r), [], 'the pull is a fast-forward: the remote had every commit of the base branch');
  assert.ok(r.json.text.startsWith('pulled main\n') && r.json.text.includes(`NEXT   /clear\n       /spex:plan specs/008-restore`), r.json.text);
  assert.equal(rev(repo, 'main'), rev(repo, 'origin/main'));
  assert.ok(!existsSync(wt) && read(repo, `${DIR}/status.yaml`) === 'command: review\nstate: done\n');

  // a push that fails is a warning with the way out, and the next spec does not start until the remote has the notes
  gitIn(repo, ['remote', 'set-url', 'origin', join(remote, 'gone')]);
  ok(repo, 'new', 'undo', '--words', words);
  r = spex(repo, 'commit', '--message', 'spex: notes for an undo');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.committed, r.json.pushed, codes(r)], [true, false, ['COMMIT-PUSH']]);
  assert.ok(finding(r, 'COMMIT-PUSH').message.startsWith('git push of main failed: '), r.stdout);
  r = spex(repo, 'start', 'plan', 'specs/008-restore');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['GATE-PUSH']);
  assert.ok(finding(r, 'GATE-PUSH').fix.endsWith('Then type /spex:plan specs/008-restore again.'), r.stdout);
  assert.ok(!existsSync(worktreeOf(repo, '008-restore')), 'a refused start makes no worktree');
  gitIn(repo, ['remote', 'set-url', 'origin', remote]);
  gitIn(repo, ['push', '-q', 'origin', 'main']);
  ok(repo, 'start', 'plan', 'specs/008-restore');
});

test('no remote, no merge command, or close.cmd local: nothing is pushed and nothing is asked', () => {
  // no remote at all
  const { repo } = implementing((main) => configure(main, 'commit: true\nclose: {cmd: "true"}'));
  assert.ok(repo);
  // a remote, and the person merges by hand (no close.cmd): the script does not know how, so it does not push
  const remote = tempDir('spex-remote-');
  gitIn(remote, ['init', '-q', '--bare', '-b', 'main']);
  for (const cmd of ['', 'local']) {
    const main = makeRepo('csv-export');
    configure(main, `commit: true\nclose: {cmd: "${cmd}"}`);
    commitAll(main, 'the config');
    gitIn(main, ['remote', 'add', 'origin', remote]);
    gitIn(main, ['push', '-q', '-f', '-u', 'origin', 'main']);
    const words = join(tempDir('spex-words-'), 'words.md');
    writeFileSync(words, 'A restore command.\n');
    ok(main, 'new', 'restore', '--words', words);
    const r = ok(main, 'commit', '--message', 'notes');
    assert.deepEqual([r.json.committed, r.json.pushed, codes(r)], [true, false, []], `close.cmd "${cmd}"`);
    assert.equal(lastCommit(remote, 'main'), 'the config');
    ok(main, 'start', 'plan', DIR);
  }
});

test('show --ready: the tasks that can start now, as waves, and each task that waits', () => {
  const { repo, wt } = implementing();
  let r = ok(repo, 'show', DIR, '--ready');
  assert.equal(r.json.text, 'ready: T01\ntasks: 0 done · 2 todo · 0 blocked · 2 in all\nnot ready yet: T02 (needs T01)');
  assert.deepEqual(r.json.waves, [['T01']]);
  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n');
  ok(repo, 'done', DIR, 'T01');
  r = ok(repo, 'show', DIR, '--ready');
  assert.equal(r.json.text, 'ready: T02\ntasks: 1 done · 1 todo · 0 blocked · 2 in all');
  ok(repo, 'done', DIR, 'T02');
  assert.equal(ok(repo, 'show', DIR, '--ready').json.text, 'ready: none\ntasks: 2 done · 0 todo · 0 blocked · 2 in all');
});

test('show --ready: tasks of one parallel group that are ready run together', () => {
  const { repo, wt } = implementing();
  // T02 no longer waits for T01, and both are in one group: they write different files, so they are one wave
  edit(wt, `${DIR}/tasks.yaml`, (s) =>
    s
      .replace('    depends_on: [T01]\n', '    parallel_group: export\n')
      .replace('    kind: story\n    requirements: [REQ-007-001]\n', '    kind: story\n    parallel_group: export\n    requirements: [REQ-007-001]\n')
      .replace('paths: [src/cli/commands/export.ts, src/cli/exit.ts, tests/unit/export.test.ts]', 'paths: [src/cli/exit.ts]'),
  );
  const r = ok(repo, 'show', DIR, '--ready');
  assert.deepEqual(r.json.waves, [['T01', 'T02']]);
  assert.equal(r.json.text, 'ready: T01 + T02\ntasks: 0 done · 2 todo · 0 blocked · 2 in all');
});

test('a write with no undo: the question of a blocked task is shown by status, by a start and by show --ready, and only the word yes runs it', () => {
  const { repo } = implementing();
  ok(repo, 'block', DIR, 'T01', '--reason', 'it deletes 214 files in the bucket backups-prod', '--ask', 'Delete 214 files of the old tool in the bucket backups-prod?');
  const ask = 'waits for your yes: T01 · Delete 214 files of the old tool in the bucket backups-prod?';
  let r = ok(repo, 'status');
  assert.ok(r.json.text.includes(`   ${ask}\n   a write with no undo runs only on the word yes: as the reply, or after the folder in the command\n`), r.json.text);
  r = ok(repo, 'start', 'implement', DIR);
  assert.ok(r.json.text.endsWith(`${ask}\na write with no undo runs only on the word yes: as the reply, or after the folder in the command`), r.json.text);
  r = ok(repo, 'show', DIR, '--ready');
  assert.ok(r.json.text.startsWith('ready: none\n') && r.json.text.endsWith(ask), r.json.text);
  // a block with no question is a reason, not a wait for the person
  ok(repo, 'unblock', DIR, 'T01');
  ok(repo, 'block', DIR, 'T01', '--reason', 'an older run wrote this');
  assert.ok(ok(repo, 'show', DIR, '--ready').json.text.endsWith('blocked: T01 · an older run wrote this'));
  assert.ok(!ok(repo, 'status').json.text.includes('waits for your yes'));
});

test('the rounds of a run: a call on the same green tree is the same round, a fix is the next one, and implement typed again starts at 1', () => {
  const { repo, wt } = implementing();
  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n');
  for (const t of ['T01', 'T02']) ok(repo, 'done', DIR, t);
  assert.equal(ok(repo, 'verify', DIR).json.evidence.round, 1);
  assert.equal(ok(repo, 'verify', DIR).json.evidence.round, 1, 'nothing was fixed in between');
  writeFileSync(join(wt, 'src/more.txt'), 'a fix\n');
  assert.equal(ok(repo, 'verify', DIR).json.evidence.round, 2);
  writeFileSync(join(wt, 'src/more.txt'), 'a second fix\n');
  assert.equal(ok(repo, 'verify', DIR).json.evidence.round, 3);
  // the person types implement again: the same number of rounds once more
  ok(repo, 'start', 'implement', DIR);
  writeFileSync(join(wt, 'src/more.txt'), 'a third fix\n');
  const r = ok(repo, 'verify', DIR);
  assert.equal(r.json.evidence.round, 1);
  assert.ok(!codes(r).includes('VERIFY-ROUNDS'));
  assert.ok(existsSync(join(wt, '.spex/evidence/007/verify-5.json')), 'the files keep their running number');
});

test('the close: built closes each entry that is still open, and prove refuses a plan that changed since its stamp', () => {
  const { repo, wt } = reviewing();
  ok(repo, 'correction', DIR, '--title', 'implement, round 1 · the code', '--found', 'TS02 was red', '--changed', 'T02 built again');
  ok(repo, 'close', DIR, 'sync');
  ok(repo, 'close', DIR, 'later');
  const before = read(wt, `${DIR}/tasks.yaml`);
  edit(wt, `${DIR}/tasks.yaml`, (s) => s.replace('The REQ-007-001 acceptance test passes.', 'The REQ-007-001 acceptance test passes, and one more thing.'));
  let r = spex(repo, 'close', DIR, 'prove');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['GATE-PLAN-CHANGED']);
  assert.equal(finding(r, 'GATE-PLAN-CHANGED').message, `changed since the plan was stamped: ${DIR}/tasks.yaml`);
  writeFileSync(join(wt, `${DIR}/tasks.yaml`), before);
  ok(repo, 'close', DIR, 'prove');
  r = ok(repo, 'close', DIR, 'built');
  assert.ok(r.json.text.includes('closed in corrections.md: C1'), r.json.text);
  assert.ok(read(wt, `${DIR}/corrections.md`).includes('State: closed: the close: every task is done and every test is green'));
});

test('new-bug with no spec started takes the number of the first note; a bare number in depends_on moves with its folder', () => {
  const repo = makeRepo('csv-export');
  const words = join(tempDir('spex-words-'), 'words.md');
  writeFileSync(words, 'The export cuts a long title.\n');
  ok(repo, 'new', 'restore', '--words', words);
  edit(repo, 'specs/008-restore/spec.md', (s) => s.replace(/^---\n/, '---\ndepends_on: [007]\n'));
  const r = ok(repo, 'new-bug', 'export-cuts-titles', '--words', words);
  assert.equal(r.json.dir, 'specs/007-export-cuts-titles');
  assert.ok(existsSync(join(repo, 'specs/008-csv-export')) && existsSync(join(repo, 'specs/009-restore')));
  assert.ok(read(repo, 'specs/009-restore/spec.md').includes('depends_on: [008]'), read(repo, 'specs/009-restore/spec.md').slice(0, 200));
});
