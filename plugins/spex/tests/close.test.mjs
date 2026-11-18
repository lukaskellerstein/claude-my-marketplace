// The close: the second half of review. Six steps in one order, each a call of `spex close <dir> <step>`, because an
// agent works between some of them: sync (the base branch in), later (the notes that wait), prove (still green?),
// built (records → built, review done, one commit), merge (close.cmd), finish (in the main folder: pull, env.down,
// remove the worktree and the branch). A spec is closed when the commit of `built` is on the base branch.
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import { enter, DIR, NAME, builtSpec, codes, commitAll, configure, edit, gitIn, ok, read, reviewing, spex, tempDir } from './helpers.mjs';

const BRANCH = `spex/${NAME}`;
const RULE = '─'.repeat(40);
const finding = (r, code) => r.json.findings.find((f) => f.code === code);
const close = (cwd, step) => spex(cwd, 'close', DIR, step);
const lastCommit = (root) => gitIn(root, ['log', '-1', '--format=%s']).trim();
const recordStatus = (root) => parse(read(root, `${DIR}/requirements.yaml`), { schema: 'core' }).requirements.map((r) => r.status);
const branches = (root) => gitIn(root, ['branch', '--format=%(refname:short)']).trim().split('\n');
/** A note that waits behind 007, written and committed on the base branch, as /spex:new leaves one with commit: true. */
const laterNote = (main) => {
  mkdirSync(join(main, 'specs/008-restore'));
  writeFileSync(join(main, 'specs/008-restore/spec.md'), '# 008 Restore\n\n> A note: /spex:plan writes the full spec when the turn of this spec comes.\n\n## Why\nA backup is of no use without a restore.\n\n## What\n- `todo restore` reads a CSV export.\n\n## Not this\n- No merge of two files.\n');
};
/** The steps before the merge, for a review that found nothing. */
const closeOnBranch = (repo) => {
  for (const step of ['sync', 'later', 'prove', 'built']) ok(repo, 'close', DIR, step);
};

test('the close is the second half of review: a step needs review started, and its name', () => {
  const { repo, wt } = builtSpec();
  let r = close(repo, 'sync');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['CLOSE-ORDER']);
  assert.ok(finding(r, 'CLOSE-ORDER').message.startsWith(`${NAME} is built`) && finding(r, 'CLOSE-ORDER').fix === `Type /spex:review ${DIR}.`, r.stdout);
  for (const step of ['later', 'prove', 'built', 'merge']) assert.deepEqual(codes(close(repo, step)), ['CLOSE-ORDER'], step);
  // finish is the one step of the main folder, and it merges only a spec that is closed on its branch
  r = close(repo, 'finish');
  assert.equal(r.code, 6, r.stdout);
  assert.ok(finding(r, 'CLOSE-ORDER').message.endsWith('it is not closed on its branch yet'), r.stdout);
  assert.ok(existsSync(wt) && branches(repo).includes(BRANCH), 'nothing is removed');
  assert.equal(close(repo, 'ship').code, 2, 'ship is no step');
  assert.equal(spex(repo, 'close', DIR).code, 2, 'a step is needed');
  assert.equal(spex(repo, 'close', 'specs/099-nowhere', 'sync').code, 2);
});

test('close sync: the work of review is committed, a base branch that moved is merged in, a conflict waits for a developer', () => {
  const { repo, wt } = reviewing();
  let r = close(repo, 'sync');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.step, r.json.moved, r.json.conflict], ['sync', 0, []]);
  assert.equal(r.json.text, 'the base branch main did not move');
  assert.equal(lastCommit(wt), `${NAME}: review`, 'what review wrote is committed first, so git can merge');
  assert.equal(gitIn(wt, ['status', '--porcelain']).trim(), '');

  // a teammate merged a change, and /spex:new wrote a note: both are on the base branch now
  writeFileSync(join(repo, 'README.md'), '# todo\n');
  laterNote(repo);
  commitAll(repo, 'a teammate, and a note');
  r = close(repo, 'sync');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.moved, 1);
  assert.equal(r.json.text, `main moved by 1 commit(s): merged into ${BRANCH}`);
  assert.ok(existsSync(join(wt, 'README.md')) && existsSync(join(wt, 'specs/008-restore/spec.md')), 'the worktree has both');
  assert.equal(gitIn(wt, ['rev-list', '--count', 'HEAD..main']).trim(), '0');
  assert.equal(close(repo, 'sync').json.moved, 0, 'a second run finds nothing to merge');

  // the base changed the file this spec changed: a conflict is a cause for a developer, not a question for the person
  writeFileSync(join(repo, 'src/state.txt'), 'changed on main\n');
  commitAll(repo, 'the same file');
  r = close(repo, 'sync');
  assert.equal(r.code, 7, r.stdout);
  assert.deepEqual(codes(r), ['CLOSE-CONFLICT']);
  assert.deepEqual([r.json.moved, r.json.conflict], [1, ['src/state.txt']]);
  assert.ok(finding(r, 'CLOSE-CONFLICT').fix.includes('both stay') && finding(r, 'CLOSE-CONFLICT').fix.includes('git add'), r.stdout);
  // the step, run again before the files are joined, names them again and merges nothing twice
  r = close(repo, 'sync');
  assert.equal(r.code, 7, r.stdout);
  assert.equal(finding(r, 'CLOSE-CONFLICT').message, 'the merge of the base branch has 1 file(s) in conflict: src/state.txt');
  assert.deepEqual(codes(close(repo, 'built')), ['CLOSE-PROOF'], 'a spec in the middle of a merge is not closed');
  // a developer joined both changes: the second run commits the merge
  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n');
  gitIn(wt, ['add', 'src/state.txt']);
  r = close(repo, 'sync');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.text, 'the conflict is resolved: the merge is committed');
  assert.equal(gitIn(wt, ['rev-list', '--count', '--merges', 'main..HEAD']).trim(), '2', 'two merges of the base');
  assert.equal(gitIn(wt, ['status', '--porcelain']).trim(), '');
  assert.equal(gitIn(wt, ['rev-list', '--count', 'HEAD..main']).trim(), '0');
  assert.equal(lastCommit(repo), 'the same file', 'the base branch got nothing from the sync');
});

test('close later and prove: the notes that wait are read in the worktree; only notes changed keeps the proof, changed code runs it again', () => {
  const { repo, wt } = reviewing();
  ok(repo, 'close', DIR, 'sync');
  let r = close(repo, 'later');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.step, r.json.notes, r.json.deferred], ['later', [], []]);
  assert.equal(r.json.text, 'no later spec waits: no agent runs here');
  r = close(repo, 'prove');
  assert.deepEqual([r.json.step, r.json.ran, r.json.why], ['prove', false, 'same tree']);

  // a note on the base branch that the sync did not bring yet is not read: the agent corrects what the worktree has
  laterNote(repo);
  commitAll(repo, 'a note');
  assert.deepEqual(close(repo, 'later').json.notes, []);
  ok(repo, 'close', DIR, 'sync');
  ok(repo, 'correction', DIR, '--title', 'review · passed to a later spec', '--found', 'the export has no header for an empty list', '--reaches', '008-restore: the restore must take a file with no header', '--closed');
  r = close(repo, 'later');
  assert.deepEqual([r.json.notes, r.json.passed], [['specs/008-restore'], ['C1']]);
  assert.ok(r.json.text.startsWith('1 later note(s) wait: specs/008-restore\n') && r.json.text.includes(`read: SPEX show ${DIR} --lessons · ${DIR}/corrections.md (1 entry)`), r.json.text);
  assert.ok(r.json.text.includes('passed on already, not again: C1 → 008-restore: the restore must take a file with no header'), r.json.text);

  // the base brought a note, and the agent corrected it: the code is as it was proved, so no test runs
  edit(wt, 'specs/008-restore/spec.md', (s) => `${s}\n## Constraints\n- 007 writes no header for an empty list.\n`);
  const evidence = () => JSON.parse(read(wt, '.spex/evidence/007/verify.json'));
  const proved = evidence();
  r = close(repo, 'prove');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.ran, r.json.why], [false, 'only notes changed']);
  assert.equal(r.json.text, 'still green: only notes changed since the proof, and no test runs');
  assert.notEqual(evidence().tree, proved.tree, 'the proof is keyed by the tree it holds for now');
  assert.deepEqual([evidence().code, evidence().round, evidence().ok], [proved.code, proved.round, true], 'the same run, of the same code');
  assert.equal(close(repo, 'prove').json.why, 'same tree');

  // the code changed (the base came in, a conflict, a fix): the proof runs again on this tree
  writeFileSync(join(wt, 'src/cli/exit.ts'), `${read(wt, 'src/cli/exit.ts')}// joined with main\n`);
  r = close(repo, 'prove');
  assert.equal(r.code, 7, r.stdout);
  assert.deepEqual(codes(r), ['CLOSE-PROOF']);
  assert.equal(r.json.ran, true);
  assert.ok(finding(r, 'CLOSE-PROOF').fix.includes(`spex verify ${DIR}`) && finding(r, 'CLOSE-PROOF').fix.includes('No task is built again'), r.stdout);
  r = close(repo, 'built');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['CLOSE-PROOF']);
  assert.deepEqual(recordStatus(wt), ['approved', 'approved'], 'nothing is built on a proof of another tree');
  assert.equal(ok(repo, 'verify', DIR).json.evidence.round, 2);
  assert.equal(close(repo, 'prove').json.why, 'same tree');
  assert.equal(close(repo, 'built').code, 0);
});

test('close built, merge and finish with close.cmd local: the script merges in the main folder, removes the worktree, and names the next spec', () => {
  const { repo, wt } = reviewing((main) => {
    configure(main, 'close: {cmd: local}\nenv: {down: "echo stopped > env-down.flag"}');
    laterNote(main);
  });
  assert.deepEqual(codes(close(repo, 'merge')), ['CLOSE-ORDER'], 'merge comes after built');

  // a round of findings that waits for the person keeps the spec open
  mkdirSync(join(wt, '.spex/review'), { recursive: true });
  writeFileSync(join(wt, '.spex/review/007-1.findings.yaml'), 'feature: "007"\nround: 1\nfindings:\n  - id: F1\n    severity: P3\n    title: A title with a newline splits the row\n    file: src/cli/commands/export.ts\n    line: 12\n    pick: defer\n    when: a task title holds a newline\n    effect: the row splits in two\n    why: no user has a newline in a title\n');
  let r = close(repo, 'built');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['CLOSE-REVIEW']);
  r = ok(repo, 'review', 'accept', DIR, 'ok');
  assert.ok(r.json.text.endsWith(`nothing to fix: the close goes on with \`spex close ${DIR} sync\``), r.json.text);
  // a task that is not done keeps it open too
  ok(repo, 'block', DIR, 'T02', '--reason', 'a reviewer doubts it');
  assert.deepEqual(codes(close(repo, 'built')), ['CLOSE-TASKS']);
  ok(repo, 'unblock', DIR, 'T02');
  ok(repo, 'done', DIR, 'T02');
  ok(repo, 'close', DIR, 'sync');
  r = ok(repo, 'close', DIR, 'later');
  assert.deepEqual(r.json.notes, ['specs/008-restore']);
  ok(repo, 'close', DIR, 'prove');

  r = close(repo, 'built');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.step, r.json.committed], ['built', true]);
  assert.ok(r.json.text.startsWith(`2 record(s) built in ${DIR}/requirements.yaml\n`) && r.json.text.endsWith(`committed on ${BRANCH}: ${NAME}: closed (state: review, done)`), r.json.text);
  assert.deepEqual(recordStatus(wt), ['built', 'built']);
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: review\nstate: done\n');
  assert.equal(lastCommit(wt), `${NAME}: closed`);
  assert.equal(gitIn(wt, ['status', '--porcelain']).trim(), '');
  r = close(repo, 'built');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.committed, r.json.text], [false, `${DIR} is closed already on its branch\nnothing new to commit`]);
  // closed on its branch and not merged: review, typed again in the worktree, goes on with the close at merge; typed in
  // the main folder, it goes straight to finish, the one step that changes the main folder. No other phase opens it
  r = ok(wt, 'start', 'review', DIR);
  assert.deepEqual([r.json.closing, r.json.step, r.json.state], [true, 'merge', { command: 'review', state: 'done' }]);
  assert.ok(r.json.text.includes(`spex close ${DIR} merge`), r.json.text);
  r = ok(repo, 'start', 'review', DIR);
  assert.deepEqual([r.json.closing, r.json.step], [true, 'finish']);
  assert.ok(r.json.text.includes(`spex close ${DIR} finish`) && !r.json.text.includes('worktree:'), r.json.text);
  for (const cwd of [repo, wt]) for (const args of [['start', 'plan', DIR], ['start', 'implement', DIR], ['stamp', DIR]]) assert.deepEqual(codes(spex(cwd, ...args)), ['GATE-CLOSED'], args.join(' '));
  assert.equal(spex(repo, 'status').json.next, `/spex:review ${DIR}`);
  assert.ok(spex(repo, 'status').json.text.includes(`NEXT   /spex:review ${DIR}\n`), 'the end of the close is typed in the main folder: no claude -w');

  r = close(repo, 'merge');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.step, r.json.waits, r.json.branch, r.json.base], ['merge', false, BRANCH, 'main']);
  assert.ok(r.json.text.includes(`close.cmd is local: the script merges ${BRANCH} into main in the main folder, in the step finish`), r.json.text);
  assert.ok(r.json.text.endsWith(`next: the person ends this session (the worktree may go: pick remove), then types /spex:review ${DIR} in a session on the main folder (${repo}): it runs \`spex close ${DIR} finish\` there`), r.json.text);
  assert.ok(!existsSync(join(repo, DIR, 'status.yaml')), 'the base branch has nothing yet');

  // finish changes the main folder, so it runs in a session there, never in the worktree
  r = close(wt, 'finish');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['CLOSE-LEAVE']);
  assert.equal(r.json.main, repo);
  assert.equal(finding(r, 'CLOSE-LEAVE').fix, `End this session (the worktree may go: pick remove). Then type /spex:review ${DIR} in a session on the main folder (${repo}): it runs this step there.`);
  assert.ok(!finding(r, 'CLOSE-LEAVE').fix.includes('ExitWorktree'));

  r = close(repo, 'finish');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.step, r.json.next], ['finish', '/spex:plan specs/008-restore']);
  for (const line of [`merged ${BRANCH} into main (close.cmd: local)`, 'environment stopped: echo stopped > env-down.flag', `removed the worktree and the branch ${BRANCH}`, `${NAME} is closed and merged`]) assert.ok(r.json.text.includes(`${line}\n`), `${line}\n${r.json.text}`);
  assert.ok(r.json.text.endsWith(`${RULE}\nNEXT   claude -w spex/008-restore\n       then, in that session: /spex:plan specs/008-restore\n       It is the turn of this spec.\n${RULE}`), r.json.text);
  assert.ok(!existsSync(wt), 'the worktree is gone');
  assert.deepEqual(branches(repo), ['main']);
  assert.equal(gitIn(repo, ['worktree', 'list']).trim().split('\n').length, 1);
  // the base branch has the spec as closed, with its code and what changed in it
  assert.equal(read(repo, `${DIR}/status.yaml`), 'command: review\nstate: done\n');
  assert.deepEqual(recordStatus(repo), ['built', 'built']);
  assert.equal(read(repo, 'src/state.txt'), 'implemented\n');
  assert.ok(read(repo, `${DIR}/corrections.md`).includes('Pick: defer (you)'));
  assert.equal(read(repo, 'env-down.flag'), 'stopped\n', 'env.down ran in the main folder');
  assert.deepEqual(gitIn(repo, ['log', '--format=%s', '--first-parent', '-2']).trim().split('\n'), [`Merge branch '${BRANCH}'`, 'before the plan']);

  // typed again, every step finds its work done
  r = close(repo, 'finish');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.text.startsWith(`${NAME} is closed and merged, and its worktree is gone\n`), r.json.text);
  r = spex(repo, 'status');
  assert.ok(r.json.text.startsWith('📍 no spec is open · 1 closed · 1 note(s) wait\n'), r.json.text);
  // a merged spec is never opened again: only a new spec changes it
  for (const args of [['start', 'plan', DIR], ['start', 'implement', DIR], ['start', 'review', DIR]]) assert.deepEqual(codes(spex(repo, ...args)), ['GATE-CLOSED'], args.join(' '));
  assert.deepEqual(codes(spex(repo, 'delete', DIR, '--reason', 'no')), ['DELETE-MERGED']);
  assert.deepEqual(codes(spex(repo, 'comment', '--text', 'one more thing')), ['COMMENT-NO-SPEC']);
  // and the turn of the next spec has come: its plan reads what the closed one built
  r = ok(enter(repo, 'specs/008-restore'), 'start', 'plan', 'specs/008-restore');
  assert.deepEqual(r.json.closed, [NAME]);
  assert.ok(r.json.text.includes(`closed before it: ${NAME} `), r.json.text);
});

test('close merge with no close.cmd waits for the person; after their merge, review typed again finishes the close', () => {
  const { repo, wt } = reviewing();
  closeOnBranch(repo);
  let r = close(repo, 'merge');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['CLOSE-WAIT']);
  assert.deepEqual([r.json.step, r.json.waits, r.json.branch, r.json.base], ['merge', true, BRANCH, 'main']);
  assert.ok(finding(r, 'CLOSE-WAIT').message.startsWith('close.cmd is empty') && finding(r, 'CLOSE-WAIT').fix === `You merge ${BRANCH} into main, or give the forge what it wants. Then type /spex:review ${DIR} again: it finishes the close.`, r.stdout);
  // finish reads git, not a word: the base branch does not have the spec as closed, so nothing is removed
  r = close(repo, 'finish');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['CLOSE-WAIT']);
  assert.deepEqual([r.json.step, r.json.waits], ['finish', true]);
  assert.ok(existsSync(wt) && branches(repo).includes(BRANCH));
  assert.equal(spex(repo, 'status').json.next, `/spex:review ${DIR}`);

  // the person merges, as a squash: no commit of the branch is on main, and the spec is still found there as closed
  gitIn(repo, ['merge', '--squash', '-q', BRANCH]);
  gitIn(repo, ['commit', '-q', '-m', 'CSV export (#12)']);
  r = ok(repo, 'start', 'review', DIR);
  assert.equal(r.json.closing, true);
  r = close(repo, 'merge');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.waits, false);
  assert.ok(r.json.text.startsWith(`merged already: main has ${NAME} as closed\n`), r.json.text);
  r = close(repo, 'finish');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.next, null);
  assert.ok(r.json.text.endsWith(`${RULE}\nNEXT   Nothing.\n       Every spec is closed and merged. A new idea starts with /spex:new, a bug in merged code with /spex:new-bug.\n${RULE}`), r.json.text);
  assert.ok(!existsSync(wt));
  assert.deepEqual(branches(repo), ['main']);
  assert.equal(lastCommit(repo), 'CSV export (#12)', 'the script merged nothing itself');
});

test('close merge runs close.cmd with the branch, the base and the spec; a failing command is a cause to fix', () => {
  const { repo, wt } = reviewing((main) => configure(main, `close: {cmd: 'test "$SPEX_BRANCH $SPEX_BASE $SPEX_SPEC" = "${BRANCH} main ${DIR}" && test -f .spex/runs/merged.flag'}`));
  closeOnBranch(repo);
  let r = close(repo, 'merge');
  assert.equal(r.code, 7, r.stdout);
  assert.deepEqual(codes(r), ['CLOSE-MERGE-FAILED']);
  assert.ok(finding(r, 'CLOSE-MERGE-FAILED').message === 'close.cmd exited 1' && finding(r, 'CLOSE-MERGE-FAILED').fix.includes('At most 3 tries'), r.stdout);
  assert.ok(r.json.text.includes('$ SPEX_BRANCH='), 'the output of the command is in the reply');
  // the cause is fixed: the command runs in the worktree and passes
  mkdirSync(join(wt, '.spex/runs'), { recursive: true });
  writeFileSync(join(wt, '.spex/runs/merged.flag'), '');
  r = close(repo, 'merge');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.waits, false);
  assert.ok(r.json.text.startsWith('merged: test "$SPEX_BRANCH'), r.json.text);
  // the command said yes and the base branch has nothing (a forge that waits for an approval): finish waits too
  r = close(repo, 'finish');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['CLOSE-WAIT']);
  assert.ok(finding(r, 'CLOSE-WAIT').message === `main does not have ${NAME} as closed yet: the branch ${BRANCH} is not merged`, r.stdout);
  assert.ok(existsSync(wt));
});

test('close with a remote: sync merges what a teammate pushed, close.cmd pushes, finish pulls the base branch', () => {
  const remote = tempDir('spex-remote-');
  gitIn(remote, ['init', '-q', '--bare', '-b', 'main']);
  const { repo, wt } = reviewing((main) => {
    configure(main, 'close: {cmd: "git push -q origin HEAD:main"}');
    commitAll(main, 'the close command');
    gitIn(main, ['remote', 'add', 'origin', remote]);
    gitIn(main, ['push', '-q', '-u', 'origin', 'main']);
  });
  // a teammate pushes to the base branch while this spec is open; the local main does not know it yet
  const mate = tempDir('spex-mate-');
  gitIn(mate, ['clone', '-q', remote, '.']);
  writeFileSync(join(mate, 'CHANGELOG.md'), '# changes\n');
  gitIn(mate, ['add', '-A']);
  gitIn(mate, ['commit', '-q', '-m', 'a teammate']);
  gitIn(mate, ['push', '-q', 'origin', 'main']);

  let r = close(repo, 'sync');
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.moved, 1);
  assert.equal(r.json.text, `origin/main moved by 1 commit(s): merged into ${BRANCH}`);
  assert.ok(existsSync(join(wt, 'CHANGELOG.md')));
  // a file of the code came in: the proof runs again before the spec is closed
  assert.deepEqual(codes(close(repo, 'prove')), ['CLOSE-PROOF']);
  ok(repo, 'verify', DIR);
  ok(repo, 'close', DIR, 'prove');
  ok(repo, 'close', DIR, 'built');
  r = close(repo, 'merge');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.text.startsWith('merged: git push -q origin HEAD:main\n'), r.json.text);
  assert.equal(gitIn(remote, ['log', '-1', '--format=%s', 'main']).trim(), `${NAME}: closed`);
  // the step, run again, sees the spec on the remote base branch and pushes nothing twice
  r = close(repo, 'merge');
  assert.ok(r.json.text.startsWith(`merged already: origin/main has ${NAME} as closed\n`), r.json.text);
  // the main folder is behind until finish pulls it
  assert.ok(!existsSync(join(repo, 'CHANGELOG.md')));
  r = close(repo, 'finish');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.text.startsWith('pulled main\n'), r.json.text);
  assert.deepEqual(codes(r), []);
  assert.equal(read(repo, `${DIR}/status.yaml`), 'command: review\nstate: done\n');
  assert.ok(existsSync(join(repo, 'CHANGELOG.md')) && !existsSync(wt));
  assert.deepEqual(branches(repo), ['main']);
});

test('close finish: the base branch is the one of the config; a merge that fails changes nothing; a worktree that cannot be removed is exit 8', () => {
  const { repo, wt } = reviewing((main) => configure(main, 'close: {cmd: local}\nbase: main'));
  closeOnBranch(repo);
  ok(repo, 'close', DIR, 'merge');

  // the main folder is on another branch: the script merges into the base branch only
  gitIn(repo, ['checkout', '-q', '-b', 'elsewhere']);
  let r = close(repo, 'finish');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['CLOSE-BASE']);
  assert.equal(finding(r, 'CLOSE-BASE').message, 'the main folder is on elsewhere, not on main');
  gitIn(repo, ['checkout', '-q', 'main']);

  // a file in the main folder is in the way of the merge: the merge is undone, and the worktree stays
  writeFileSync(join(repo, DIR, 'status.yaml'), 'mine\n');
  r = close(repo, 'finish');
  assert.equal(r.code, 7, r.stdout);
  assert.deepEqual(codes(r), ['CLOSE-MERGE-FAILED']);
  assert.ok(finding(r, 'CLOSE-MERGE-FAILED').message === `git could not merge ${BRANCH} into main in the main folder`, r.stdout);
  assert.equal(lastCommit(repo), 'before the plan', 'main is where it was');
  assert.ok(!existsSync(join(repo, '.git/MERGE_HEAD')), 'no merge is left half done');
  assert.ok(existsSync(wt) && branches(repo).includes(BRANCH));
  rmSync(join(repo, DIR, 'status.yaml'));

  // the removal stops half way, as in a sandbox that protects a path of the worktree: exit 8, and the command to run
  if (process.getuid?.() !== 0) {
    mkdirSync(join(wt, 'locked'));
    writeFileSync(join(wt, 'locked/file'), 'x');
    chmodSync(join(wt, 'locked'), 0o555);
    r = close(repo, 'finish');
    chmodSync(join(wt, 'locked'), 0o755);
    assert.equal(r.code, 8, r.stdout);
    assert.deepEqual(codes(r), ['CLOSE-WORKTREE']);
    assert.ok(finding(r, 'CLOSE-WORKTREE').message.includes('folder: still there') && finding(r, 'CLOSE-WORKTREE').fix.includes('outside the sandbox'), r.stdout);
    assert.ok(r.json.cmd.startsWith(`git -C "${repo}" worktree remove --force "${wt}"`) && r.json.cmd.endsWith(`branch -D ${BRANCH}`), r.json.cmd);
    assert.ok(r.json.text.includes(`merged ${BRANCH} into main (close.cmd: local)`), 'the merge is done: only the removal is left');
    assert.equal(read(repo, `${DIR}/status.yaml`), 'command: review\nstate: done\n');
    assert.ok(existsSync(wt) && branches(repo).includes(BRANCH), 'the branch stays until the folder is gone');
  }
  // the same step again finishes the removal, and merges nothing twice
  r = close(repo, 'finish');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(!existsSync(wt));
  assert.deepEqual(branches(repo).sort(), ['elsewhere', 'main']);
  assert.equal(gitIn(repo, ['rev-list', '--count', '--merges', 'main']).trim(), '1');
});
