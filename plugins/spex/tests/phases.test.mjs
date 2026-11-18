// The phases of a spec: plan, implement, review. Each starts and ends in the script, which writes status.yaml, makes
// the branch and the worktree, stamps the plan, and commits on the branch of the spec. There is no approve: the next
// command is the approval, so a plan changed by hand is found when implement starts.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import { DIR, NAME, SPEX, builtSpec, codes, commitAll, configure, edit, enter, gitIn, implementing, makeRepo, ok, planned, read, spex, tempDir, worktreeOf } from './helpers.mjs';

const yaml = (root, file) => parse(read(root, `${DIR}/${file}`), { schema: 'core' });
const taskStatus = (root, id) => yaml(root, 'tasks.yaml').tasks.find((t) => t.id === id).status;
const recordStatus = (root) => yaml(root, 'requirements.yaml').requirements.map((r) => r.status);
const lastCommit = (root) => gitIn(root, ['log', '-1', '--format=%s']).trim();
const committedFiles = (root) => gitIn(root, ['show', '--name-only', '--format=', 'HEAD']).trim().split('\n').sort();
const finding = (r, code) => r.json.findings.find((f) => f.code === code);

/** What the person typed, and the note /spex:new made of it: one line for each detail, with its link. */
const WORDS = 'I want my open tasks as CSV.\nNever overwrite a file of mine.\nUse a semicolon.\n';
const IDEA = '## From your idea\n- open tasks as CSV ← source.md#L1\n- never overwrite a file ← source.md#L2\n- separator: semicolon ← source.md#L3\n';
const withWords = (repo) => {
  writeFileSync(join(repo, DIR, 'source.md'), WORDS);
  edit(repo, `${DIR}/spec.md`, (s) => `---\nsource: ["source.md"]\n---\n${s}\n${IDEA}`);
};
/** The lines as plan leaves them: each names its record, or says why none does. */
const LINKED = '- open tasks as CSV ← source.md#L1 (you) → REQ-007-001\n- never overwrite a file ← source.md#L2 → REQ-007-002\n- separator: semicolon ← source.md#L3 → no record: csv-stringify has the option, and D1 keeps the comma\n';

test('start plan: the turn of the spec, a session in its worktree, a note that is committed, then status.yaml', () => {
  const repo = makeRepo('csv-export');
  writeFileSync(join(repo, 'idea.txt'), 'I want a restore command.\n');
  ok(repo, 'new', 'restore', '--words', 'idea.txt');
  assert.equal(spex(repo, 'start', 'plan', 'specs/099-nowhere').code, 2, 'no such spec');
  assert.equal(spex(repo, 'start', 'ship', DIR).code, 2, 'no such phase');
  assert.equal(spex(repo, 'start', 'plan').code, 2, 'the folder is needed');

  // one spec at a time, in the order of the numbers: 008 waits for 007
  let r = spex(repo, 'start', 'plan', 'specs/008-restore');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['GATE-TURN']);
  assert.ok(finding(r, 'GATE-TURN').message.includes('007-csv-export comes first, and it is a note') && finding(r, 'GATE-TURN').fix.endsWith(`Type: /spex:plan ${DIR}`), r.stdout);
  commitAll(repo, 'the notes');

  // a start on main: GATE-ENTER, with the command that opens the right session. The script makes nothing: no
  // worktree, no branch, no state, no commit.
  const head = gitIn(repo, ['rev-parse', 'HEAD']);
  for (const phase of ['plan', 'implement', 'review']) {
    r = spex(repo, 'start', phase, DIR);
    assert.equal(r.code, 6, r.stdout);
    assert.deepEqual(codes(r), ['GATE-ENTER'], phase);
    assert.equal(finding(r, 'GATE-ENTER').fix, `Start a session in the spec's worktree: claude -w spex/${NAME}, then type /spex:${phase} ${DIR} there.`);
    assert.ok(finding(r, 'GATE-ENTER').message.includes('this session is on main'), r.stdout);
  }
  assert.deepEqual(codes(spex(repo, 'comment', '--text', 'x')), ['COMMENT-NO-SPEC'], 'no spec is open yet');
  assert.ok(!existsSync(join(repo, '.worktrees')) && !existsSync(join(repo, '.claude/worktrees')), 'no worktree');
  assert.equal(gitIn(repo, ['branch', '--list', 'spex/*']).trim(), '', 'no branch');
  assert.equal(gitIn(repo, ['worktree', 'list']).trim().split('\n').length, 1);
  assert.ok(!existsSync(join(repo, DIR, 'status.yaml')) && !existsSync(join(repo, '.git/info/exclude')) || !read(repo, '.git/info/exclude').includes('worktrees'), 'no state, no ignore line');
  assert.equal(gitIn(repo, ['rev-parse', 'HEAD']), head, 'no commit');
  assert.equal(gitIn(repo, ['status', '--porcelain']).trim(), '', 'nothing new in the main folder');
  // a session in another spec's worktree is the wrong session too
  r = spex(enter(repo, 'specs/008-restore'), 'start', 'plan', DIR);
  assert.deepEqual(codes(r), ['GATE-ENTER']);
  assert.ok(finding(r, 'GATE-ENTER').message.includes('on spex/008-restore'), r.stdout);

  // a worktree gets only what is committed: a note changed after its commit is refused, by name
  const wt = enter(repo);
  edit(repo, `${DIR}/spec.md`, (s) => `${s}\n## Who\nMe.\n`);
  r = spex(wt, 'start', 'plan', DIR);
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['GATE-COMMIT']);
  assert.deepEqual(r.json.uncommitted, [`${DIR}/spec.md`]);
  assert.ok(finding(r, 'GATE-COMMIT').fix.startsWith('Commit them on main'), r.stdout);
  assert.ok(!existsSync(join(wt, DIR, 'status.yaml')) && !existsSync(join(wt, '.spex/runs/worktree-setup.json')), 'nothing made');
  commitAll(repo, 'the note');
  // the same for the config: in the worktree, one that is not committed would be read as the defaults, with no word about it
  configure(repo, 'close: {cmd: local}');
  r = spex(wt, 'start', 'plan', DIR);
  assert.deepEqual([r.code, codes(r), r.json.uncommitted], [6, ['GATE-COMMIT'], ['.spex/config.yaml']]);
  assert.ok(finding(r, 'GATE-COMMIT').message.startsWith('1 file(s) the worktree needs are not committed on main: .spex/config.yaml'), r.stdout);
  commitAll(repo, 'the config');

  // the session is in the worktree, on spex/<spec>: the start goes on. The worktree was made before the two commits,
  // and its branch has no work of its own, so the first start brings the base in
  r = spex(wt, 'start', 'plan', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.phase, r.json.dir, r.json.worktree, r.json.branch, r.json.base, r.json.first, r.json.was], ['plan', DIR, wt, `spex/${NAME}`, 'main', true, null]);
  assert.deepEqual(r.json.state, { command: 'plan', state: 'started' });
  assert.ok(r.json.text.includes(`worktree: ${wt} · branch spex/${NAME} · the first start here\n`) && r.json.text.includes('the base came in (fast-forward): main (2 commit(s))'), r.json.text);
  assert.ok(!r.json.text.includes('enter:'), 'the session is there already: nothing to enter');
  assert.equal(gitIn(wt, ['rev-parse', 'HEAD']), gitIn(repo, ['rev-parse', 'main']), 'the branch is at the base');
  assert.equal(gitIn(repo, ['rev-parse', '--abbrev-ref', 'HEAD']).trim(), 'main');
  assert.equal(gitIn(repo, ['status', '--porcelain']).trim(), '', 'the repo ignores .worktrees/: the main folder shows nothing new');
  // the state is in the worktree, and only there
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: plan\nstate: started\n');
  assert.ok(!existsSync(join(repo, DIR, 'status.yaml')), 'the base branch has no state of an open spec');
  // the note opened: the sections of the full spec it lacks are there now, each with its hint
  assert.deepEqual([...read(wt, `${DIR}/spec.md`).matchAll(/^## (.+)$/gm)].map((m) => m[1]), ['Why', 'What', 'Not this', 'Success', 'Who', 'Constraints', 'Alternatives', 'Open questions', 'Decisions']);

  // typed again: a second run. Nothing is set up twice, the spec keeps what the first run wrote
  edit(wt, `${DIR}/spec.md`, (s) => s.replace('## Constraints\n', '## Constraints\nNode 20.\n'));
  const before = read(wt, `${DIR}/spec.md`);
  r = spex(wt, 'start', 'plan', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.first, r.json.was, r.json.again], [false, { command: 'plan', state: 'started' }, true]);
  assert.equal(read(wt, `${DIR}/spec.md`), before);
  // from a folder under the worktree the same command finds the same spec
  assert.equal(spex(join(wt, 'specs'), 'start', 'plan', DIR).json.worktree, wt);
  // the list reads the open spec in its worktree, found by its branch
  assert.deepEqual(spex(repo, 'list').json.specs[0], { dir: DIR, number: 7, state: 'plan, started', worktree: true });
  // and the next spec still waits, now for an open one
  r = spex(repo, 'start', 'plan', 'specs/008-restore');
  assert.ok(finding(r, 'GATE-TURN').message.includes('it is plan, started'), r.stdout);
});

test('start in the worktree: worktree.setup runs at the first start there and never again; the hook does not run it', () => {
  const repo = makeRepo('csv-export');
  configure(repo, 'worktree: {setup: "echo ran >> setup.log"}');
  commitAll(repo, 'setup');
  const wt = enter(repo);
  assert.ok(!existsSync(join(wt, 'setup.log')), 'the worktree is made, and nothing ran in it');
  let r = ok(wt, 'start', 'plan', DIR);
  assert.deepEqual([r.json.first, r.json.setup], [true, { cmd: 'echo ran >> setup.log', ok: true, tail: r.json.setup.tail }]);
  assert.ok(r.json.text.includes('setup: `echo ran >> setup.log` ran'), r.json.text);
  const record = JSON.parse(read(wt, '.spex/runs/worktree-setup.json'));
  assert.deepEqual([record.setup, record.ok], ['echo ran >> setup.log', true]);
  // the second start finds the record and skips it; so do the starts of the next phases
  r = ok(wt, 'start', 'plan', DIR);
  assert.deepEqual([r.json.first, r.json.setup], [false, null]);
  assert.ok(r.json.text.includes('setup: ran at the first start here'), r.json.text);
  ok(repo, 'end', 'plan', DIR);
  ok(wt, 'start', 'implement', DIR);
  assert.equal(read(wt, 'setup.log'), 'ran\n', 'one run, in the worktree');
  assert.ok(!existsSync(join(repo, 'setup.log')));
  assert.equal(gitIn(wt, ['status', '--porcelain', '--', '.spex']).trim(), '', 'git does not see the record');
  assert.ok(!gitIn(wt, ['log', '--name-only', '--format=']).includes('worktree-setup.json'), 'the record is never committed');
});

test('the spec in flight before 3.1: a worktree moved to .worktrees/spex/<spec> by hand, with a state that is not committed, goes on as a second run', () => {
  const repo = makeRepo('csv-export');
  configure(repo, 'worktree: {setup: "echo ran >> setup.log"}');
  commitAll(repo, 'setup');
  // as the dex spec is: the branch spex/<spec> at the base, in .worktrees/spex/<spec>, and the run of plan in its files only
  const wt = enter(repo);
  writeFileSync(join(wt, DIR, 'status.yaml'), 'command: plan\nstate: started\n');
  edit(wt, `${DIR}/spec.md`, (s) => `${s}\n## Who\nThe person who exports.\n`);
  const r = ok(wt, 'start', 'plan', DIR);
  assert.deepEqual([r.json.was, r.json.first], [{ command: 'plan', state: 'started' }, true]);
  assert.ok(r.json.text.startsWith(`plan started for ${DIR} (it was plan, started)\n`), r.json.text);
  assert.ok(read(wt, `${DIR}/spec.md`).includes('The person who exports.'), 'the work of the first run stays');
  assert.equal(read(wt, 'setup.log'), 'ran\n', 'setup ran: the record of the first start was not there');
  assert.equal(spex(repo, 'status').json.next, `/spex:plan ${DIR}`);
});

test('start plan: a spec with a higher number that is open, a folder that is no git repo, a failing worktree.setup', () => {
  // an in-flight spec, as spex update leaves one: 008 has a state, and 007 is still a note
  let repo = makeRepo('csv-export');
  mkdirSync(join(repo, 'specs/008-restore'));
  writeFileSync(join(repo, 'specs/008-restore/spec.md'), '# 008 Restore\n\n## Why\nw\n\n## What\nw\n\n## Not this\nw\n\n## Success\nw\n');
  writeFileSync(join(repo, 'specs/008-restore/status.yaml'), 'command: plan\nstate: started\n');
  commitAll(repo, 'in flight');
  let r = spex(enter(repo), 'start', 'plan', DIR);
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['GATE-OPEN']);
  assert.ok(finding(r, 'GATE-OPEN').message === '008-restore is open (plan, started)' && finding(r, 'GATE-OPEN').fix.endsWith('Type: /spex:plan specs/008-restore'), r.stdout);

  // no git: a spec gets a branch and a worktree, so a phase needs a repository
  const plain = tempDir('spex-plain-');
  mkdirSync(join(plain, 'specs/001-x'), { recursive: true });
  writeFileSync(join(plain, 'specs/001-x/spec.md'), '# 001 X\n');
  r = spex(plain, 'start', 'plan', 'specs/001-x');
  assert.equal(r.code, 2, r.stdout);
  assert.deepEqual(codes(r), ['GIT-REQUIRED']);

  // worktree.setup runs one time in the new worktree; when it fails, the phase goes on and says so
  repo = makeRepo('csv-export');
  configure(repo, 'worktree: {setup: "echo ready > setup.flag && exit 3"}');
  commitAll(repo, 'setup');
  r = spex(enter(repo), 'start', 'plan', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(codes(r), ['WORKTREE-SETUP']);
  assert.equal(finding(r, 'WORKTREE-SETUP').severity, 'warning');
  assert.equal(read(worktreeOf(repo), 'setup.flag'), 'ready\n', 'it ran in the worktree');
  assert.ok(!existsSync(join(repo, 'setup.flag')));
  rmSync(join(worktreeOf(repo), 'setup.flag'));
  r = spex(enter(repo), 'start', 'plan', DIR);
  assert.deepEqual(codes(r), [], 'a worktree that is found is not set up again');
  assert.ok(!existsSync(join(worktreeOf(repo), 'setup.flag')));
});

test('a note of the person\'s words opens at plan: the note line goes, the sections come, and a plan with no records is not done', () => {
  const repo = makeRepo('csv-export');
  rmSync(join(repo, DIR), { recursive: true });
  writeFileSync(join(repo, 'idea.txt'), 'I want a restore command.\nIt must ask before it overwrites.\n');
  ok(repo, 'new', 'restore', '--words', 'idea.txt');
  const dir = 'specs/001-restore';
  assert.ok(read(repo, `${dir}/spec.md`).includes('\n> A note: /spex:plan writes the full spec'));
  edit(repo, `${dir}/spec.md`, (s) => s.replace(/## From your idea\n\n<!--.*?-->/s, '## From your idea\n- a restore command ← source.md#L1\n- it asks before it overwrites ← source.md#L2'));
  commitAll(repo, 'one note');
  // a note has no phase to end, and nothing to stamp
  let r = spex(repo, 'end', 'plan', dir);
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['PHASE-NOT-STARTED']);
  assert.deepEqual(codes(spex(repo, 'stamp', dir)), ['PHASE-NOT-STARTED']);
  assert.deepEqual(codes(spex(enter(repo, dir), 'start', 'implement', dir)), ['GATE-PLAN']);
  assert.deepEqual(codes(spex(enter(repo, dir), 'start', 'review', dir)), ['GATE-BUILT']);

  r = ok(enter(repo, dir), 'start', 'plan', dir);
  assert.equal(r.json.again, false, 'no records yet: a first run');
  const wt = worktreeOf(repo, '001-restore');
  const opened = read(wt, `${dir}/spec.md`);
  assert.ok(!opened.includes('> A note:'), opened);
  assert.ok(opened.startsWith('---\nsource: ["source.md"]\n---\n# 001 Restore\n\n## Why\n'), opened.slice(0, 80));
  assert.deepEqual([...opened.matchAll(/^## (.+)$/gm)].map((m) => m[1]), ['Why', 'What', 'Not this', 'From your idea', 'Open questions', 'Who', 'Constraints', 'Success', 'Alternatives', 'Decisions']);
  assert.ok(opened.includes('- it asks before it overwrites ← source.md#L2') && opened.includes('<!-- How we know it worked, with a number where one exists. -->'), 'its words stay, and each new section has its hint');
  assert.equal(read(wt, `${dir}/source.md`), 'I want a restore command.\nIt must ask before it overwrites.\n');

  // the end of plan names each file that is missing, and each line of the person that has no record yet
  r = spex(repo, 'end', 'plan', dir);
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r).sort(), ['PLAN-LINE', 'PLAN-LINE', 'PLAN-MISSING', 'PLAN-MISSING', 'PLAN-MISSING']);
  assert.deepEqual(r.json.findings.filter((f) => f.code === 'PLAN-MISSING').map((f) => f.message), ['requirements.yaml', 'tasks.yaml', 'tests.yaml'].map((f) => `${dir} has no ${f}`));
  assert.equal(read(wt, `${dir}/status.yaml`), 'command: plan\nstate: started\n', 'a refused end leaves the phase started');
  assert.equal(gitIn(wt, ['log', '--oneline']).trim().split('\n').length, 2, 'and commits nothing');
});

test('end plan: "All linked?" from the person\'s line to a record, then the stamp, the state and one commit on the branch', () => {
  const repo = makeRepo('csv-export');
  withWords(repo);
  commitAll(repo, 'the note with its words');
  ok(enter(repo), 'start', 'plan', DIR);
  const wt = worktreeOf(repo);
  const spec = `${DIR}/spec.md`;
  const end = () => spex(repo, 'end', 'plan', DIR);

  // each line of the person names the record that makes it true, or says why none does
  let r = end();
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['PLAN-LINE', 'PLAN-LINE', 'PLAN-LINE']);
  assert.ok(r.json.findings[2].message.includes('this line of yours has no record and no reason: "separator: semicolon ← source.md#L3"') && r.json.findings[2].fix.includes('→ no record: <why>'), r.stdout);
  // a record that does not exist, a reason that is empty, a link with no record id
  edit(wt, spec, (s) => s.replace('← source.md#L1', '← source.md#L1 → REQ-007-009').replace('← source.md#L2', '← source.md#L2 → no record:').replace('← source.md#L3', '← source.md#L3 → the planner knows'));
  r = end();
  assert.deepEqual(codes(r), ['PLAN-LINE', 'PLAN-LINE', 'PLAN-LINE']);
  assert.ok(r.json.findings[0].message.endsWith('names REQ-007-009, which is not in requirements.yaml'), r.stdout);
  assert.ok(r.json.findings[1].message.endsWith('says no record, and not why'), r.stdout);
  assert.ok(r.json.findings[2].message.endsWith('names no record after the arrow'), r.stdout);
  // a line of the note that is gone from the full spec, and a text of the person that somebody rewrote
  edit(wt, spec, (s) => s.replace(/## From your idea\n[\s\S]*?(?=\n## )/, `## From your idea\n${LINKED.split('\n').slice(0, 2).join('\n')}\n`));
  edit(wt, `${DIR}/source.md`, (s) => s.replace('semicolon', 'comma'));
  r = end();
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['PLAN-LINE-LOST', 'PLAN-SOURCE']);
  assert.ok(finding(r, 'PLAN-LINE-LOST').message.includes('the note had a line for source.md#L3'), r.stdout);
  assert.ok(finding(r, 'PLAN-SOURCE').fix.includes(`git checkout main -- ${DIR}/source.md`), r.stdout);
  writeFileSync(join(wt, DIR, 'source.md'), WORDS);
  // every line is linked now; a line for what a closed spec built already needs no record
  edit(wt, spec, (s) => s.replace(/## From your idea\n[\s\S]*?(?=\n## )/, `## From your idea\n${LINKED}- export of finished tasks ← source.md#L1 [built: spec 3]\n`));

  // an open question, an unknown with no decision, and a file of the plan that is missing: each is named
  const reqs = read(wt, `${DIR}/requirements.yaml`);
  edit(wt, `${DIR}/requirements.yaml`, (s) => s.replace('    answer: A\n    by: human\n', '').replace('    decision: csv-stringify 6.x, because the repo already depends on it.\n', ''));
  const tests = read(wt, `${DIR}/tests.yaml`);
  rmSync(join(wt, DIR, 'tests.yaml'));
  r = end();
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r).filter((c) => c.startsWith('PLAN-')), ['PLAN-MISSING', 'PLAN-QUESTION', 'PLAN-UNKNOWN']);
  assert.equal(finding(r, 'PLAN-MISSING').message, `${DIR} has no tests.yaml`);
  assert.ok(finding(r, 'PLAN-QUESTION').message.startsWith('Q1 is open: Does the export include tasks from archived lists?'), r.stdout);
  assert.ok(finding(r, 'PLAN-UNKNOWN').message.startsWith('U1 has no decision'), r.stdout);
  writeFileSync(join(wt, DIR, 'requirements.yaml'), reqs);
  // a claim with no test is a gap, not an error: exit 5, and still no stamp
  writeFileSync(join(wt, DIR, 'tests.yaml'), tests.replace(/  - id: TS02[\s\S]*$/, ''));
  r = end();
  assert.equal(r.code, 5, r.stdout);
  assert.deepEqual(codes(r), ['TEST-COVER', 'TEST-COVER']);
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: plan\nstate: started\n');
  writeFileSync(join(wt, DIR, 'tests.yaml'), tests);

  r = end();
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.records, r.json.tasks, r.json.tests, r.json.needs, r.json.committed], [2, 2, 2, [], true]);
  assert.deepEqual(r.json.state, { command: 'plan', state: 'done' });
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: plan\nstate: done\n');
  // the stamp: three hashes of the claim in tasks.yaml, one of the proof plan in tests.yaml, right after `feature`
  assert.match(read(wt, `${DIR}/tasks.yaml`), /^feature: "007"\napprovals:\n {2}tasks: [0-9a-f]{16}\n {2}spec: [0-9a-f]{16}\n {2}requirements: [0-9a-f]{16}\napproach: \|/);
  assert.match(read(wt, `${DIR}/tests.yaml`), /\nfeature: "007"\napprovals:\n {2}tests: [0-9a-f]{16}\ntests:\n/);
  assert.deepEqual(recordStatus(wt), ['draft', 'draft'], 'the end of plan approves nothing: typing implement does');
  // one commit on the branch of the spec, with the whole folder; the base branch has nothing of it
  assert.equal(lastCommit(wt), `${NAME}: plan`);
  assert.deepEqual(committedFiles(wt), ['spec.md', 'status.yaml', 'tasks.yaml', 'tests.yaml'].map((f) => `${DIR}/${f}`));
  assert.equal(gitIn(wt, ['status', '--porcelain']).trim(), '');
  assert.equal(lastCommit(repo), 'the note with its words');
  // the last lines name the one command, and say what typing it means
  assert.ok(r.json.text.endsWith(`${'─'.repeat(40)}\nNEXT   /clear\n       /spex:implement ${DIR}\n       Typing it approves the plan. To say no, type /spex:comment with your words first.\n${'─'.repeat(40)}`), r.json.text);
  assert.ok(r.json.text.includes('answers: you 1 · an agent 0 · the pick, nobody asked 0') && r.json.text.includes(`committed on spex/${NAME}: ${NAME}: plan`), r.json.text);
  // a second end changes nothing and commits nothing
  r = end();
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.committed, false);
  assert.equal(spex(repo, 'end', 'review', DIR).code, 2, 'review ends with the close');
  assert.equal(spex(repo, 'end', 'ship', DIR).code, 2);
});

test('start implement: the plan as it was stamped is approved; a file changed by hand since sends the person to plan', () => {
  const { repo, wt } = planned();
  const start = () => spex(enter(repo), 'start', 'implement', DIR);
  // each file of the plan is in the stamp: a hand edit of any of them is named
  const edits = [
    ['tasks.yaml', 'Rows follow list order', 'Rows follow the list order'],
    ['tests.yaml', 'the exit code is 3', 'the exit code is 4'],
    ['requirements.yaml', 'Import from CSV.', 'Import from a CSV file.'],
    ['spec.md', 'nothing more.', 'nothing more, ever.'],
  ];
  for (const [file, from, to] of edits) {
    const before = read(wt, `${DIR}/${file}`);
    edit(wt, `${DIR}/${file}`, (s) => s.replace(from, to));
    const r = start();
    assert.equal(r.code, 6, `${file}: ${r.stdout}`);
    assert.deepEqual(codes(r), ['GATE-PLAN-CHANGED'], file);
    assert.deepEqual(r.json.changed, [`${DIR}/${file}`]);
    assert.ok(finding(r, 'GATE-PLAN-CHANGED').fix.startsWith(`Type /spex:plan ${DIR}`) && finding(r, 'GATE-PLAN-CHANGED').fix.includes('/spex:comment'), r.stdout);
    writeFileSync(join(wt, DIR, file), before);
  }
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: plan\nstate: done\n', 'a refused start leaves the state');
  assert.deepEqual(recordStatus(wt), ['draft', 'draft']);

  // the way back in for a change by hand: plan, typed again, checks the files and stamps them again
  edit(wt, `${DIR}/tasks.yaml`, (s) => s.replace('Rows follow list order', 'Rows follow the list order'));
  ok(enter(repo), 'start', 'plan', DIR);
  ok(repo, 'end', 'plan', DIR);
  let r = start();
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.phase, r.json.approved, r.json.was, r.json.state], ['implement', 2, { command: 'plan', state: 'done' }, { command: 'implement', state: 'started' }]);
  assert.equal(r.json.worktree, wt);
  assert.deepEqual(recordStatus(wt), ['approved', 'approved'], 'typing implement approved the records');
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: implement\nstate: started\n');
  assert.ok(r.json.text.includes('the plan is as it was stamped: 2 record(s) approved') && r.json.text.includes('tasks: 0 done, 2 todo, 0 blocked') && r.json.text.includes('every need is met'), r.json.text);
  // the statuses the script flips are not part of the stamp: a second start is clean, and approves nothing twice
  r = start();
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.approved, 0);
  // the gates inside implement read the same stamp
  assert.equal(spex(repo, 'gate', 'develop', DIR, 'T01').code, 0);
  edit(wt, `${DIR}/tasks.yaml`, (s) => s.replace('Rows follow the list order', 'Rows follow no order'));
  r = spex(repo, 'gate', 'develop', DIR, 'T01');
  assert.equal(r.code, 6, r.stdout);
  assert.ok(finding(r, 'GATE-TASKS-STAMPED').message.endsWith('changed since the script stamped it') && finding(r, 'GATE-TASKS-STAMPED').fix.includes(`spex stamp ${DIR}`), r.stdout);
  assert.deepEqual(codes(spex(repo, 'gate', 'tests', DIR, 'TS01')), ['GATE-TASKS-STAMPED']);
  assert.deepEqual(codes(start()), ['GATE-PLAN-CHANGED'], 'also after implement started');
});

test('start implement: a correction that is not finished lets the run in to finish it; a need or an environment that fails stops it', () => {
  // the process began a correction (the entry is open) and the chat ended before the stamp: not a change by hand
  let { repo, wt } = planned();
  edit(wt, `${DIR}/tasks.yaml`, (s) => s.replace('Rows follow list order', 'Rows follow the list order'));
  let r = ok(repo, 'correction', DIR, '--title', 'implement, round 1 · the spec was wrong (small)', '--found', 'D1 says list order, the page sorts by name', '--changed', 'D1');
  assert.deepEqual([r.json.entry, r.json.open], ['C1', true]);
  r = spex(enter(repo), 'start', 'implement', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.resume, ['C1']);
  assert.deepEqual(r.json.state, { command: 'implement', state: 'started' });
  assert.ok(r.json.text.includes('a correction is not finished: C1 · implement, round 1 · the spec was wrong (small) (open)'), r.json.text);
  assert.deepEqual(recordStatus(wt), ['draft', 'draft'], 'nothing is approved before the stamp');
  // the stamp finishes it: the links are checked, the files stamped, the records approved, the entry closed
  r = ok(repo, 'stamp', DIR, '--close', 'C1');
  assert.deepEqual([r.json.stamped, r.json.closed, r.json.state], [true, ['C1'], { command: 'implement', state: 'started' }]);
  assert.deepEqual(recordStatus(wt), ['approved', 'approved']);
  r = spex(enter(repo), 'start', 'implement', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.resume, undefined);

  // a need only the person can give: named before any code is written; the phase is started, so the same command goes on
  ({ repo, wt } = planned((main) => edit(main, `${DIR}/tests.yaml`, (s) => s.replace('    name: REQ_007_001_AC_1_writes_open_tasks_as_csv\n', '    name: REQ_007_001_AC_1_writes_open_tasks_as_csv\n    needs: [SPEX_TEST_TOKEN, "test -f src/state.txt"]\n'))));
  assert.deepEqual(spex(repo, 'end', 'plan', DIR).json.needs, ['SPEX_TEST_TOKEN', 'test -f src/state.txt']);
  r = spex(enter(repo), 'start', 'implement', DIR);
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['GATE-NEEDS']);
  assert.deepEqual(r.json.needs, ['TS01 needs SPEX_TEST_TOKEN, which is not set']);
  assert.ok(finding(r, 'GATE-NEEDS').fix.startsWith('A person sets SPEX_TEST_TOKEN'), r.stdout);
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: implement\nstate: started\n');
  const withToken = spawnSync('node', [SPEX, 'start', 'implement', DIR, '--json'], { cwd: enter(repo), encoding: 'utf8', env: { ...process.env, SPEX_TEST_TOKEN: 'x' } });
  assert.equal(withToken.status, 0, withToken.stdout);

  // env.up is the project's own script: when it fails, only the person can give the environment
  ({ repo, wt } = planned((main) => configure(main, 'env: {up: "echo no cluster >&2; exit 3"}')));
  r = spex(enter(repo), 'start', 'implement', DIR);
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['ENV-UP']);
  assert.ok(finding(r, 'ENV-UP').message.includes('exited 3') && finding(r, 'ENV-UP').fix.includes('no cluster'), r.stdout);
  edit(wt, '.spex/config.yaml', (s) => s.replace('echo no cluster >&2; exit 3', 'echo up > env.flag'));
  r = spex(enter(repo), 'start', 'implement', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.ok(r.json.text.includes('every need is met and the environment is up'), r.json.text);
  assert.equal(read(wt, 'env.flag'), 'up\n', 'env.up ran in the worktree');
});

test('end implement: every task done by the script, the plan as stamped, the proof green on this tree; then one commit', () => {
  const { repo, wt } = implementing();
  const end = () => spex(repo, 'end', 'implement', DIR);
  let r = end();
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['GATE-TASKS', 'GATE-TASKS']);
  assert.deepEqual(r.json.findings.map((f) => f.message), ['T01 is todo', 'T02 is todo']);
  assert.deepEqual(codes(spex(enter(repo), 'start', 'review', DIR)), ['GATE-BUILT'], 'review waits for the end of implement');

  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n');
  ok(repo, 'done', DIR, 'T01');
  ok(repo, 'done', DIR, 'T02');
  // every task is done, and nothing proved the whole spec yet
  r = end();
  assert.deepEqual(codes(r), ['GATE-VERIFY']);
  assert.ok(finding(r, 'GATE-VERIFY').fix.includes(`spex verify ${DIR}`), r.stdout);
  const proof = ok(repo, 'verify', DIR).json.evidence;
  // the proof is of one tree: a change of the code after it makes it stale
  writeFileSync(join(wt, 'src/cli/exit.ts'), `${read(wt, 'src/cli/exit.ts')}// later\n`);
  assert.deepEqual(codes(end()), ['GATE-VERIFY']);
  gitIn(wt, ['checkout', '--', 'src/cli/exit.ts']);
  // a file of the plan that changed with no stamp is named before the proof is read
  edit(wt, `${DIR}/tests.yaml`, (s) => s.replace('the exit code is 3', 'the exit code is 4'));
  r = end();
  assert.deepEqual(codes(r), ['GATE-PLAN-CHANGED']);
  assert.ok(finding(r, 'GATE-PLAN-CHANGED').message === `not stamped: ${DIR}/tests.yaml` && finding(r, 'GATE-PLAN-CHANGED').fix.includes(`spex stamp ${DIR}`), r.stdout);
  gitIn(wt, ['checkout', '--', `${DIR}/tests.yaml`]);
  // an entry that is open when every test is green is closed by the end of the phase
  ok(repo, 'correction', DIR, '--title', 'implement, round 1 · a test was wrong', '--found', 'TS02 read the wrong file', '--changed', 'tests/acceptance/export.test.mjs');
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: implement\nstate: started\n');

  r = end();
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.phase, r.json.state, r.json.tasks, r.json.round, r.json.corrections, r.json.committed], ['implement', { command: 'implement', state: 'done' }, 2, 1, ['C1'], true]);
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: implement\nstate: done\n');
  assert.ok(read(wt, `${DIR}/corrections.md`).includes('State: closed: every test is green'));
  assert.equal(lastCommit(wt), `${NAME}: implement`);
  assert.deepEqual(committedFiles(wt), [`${DIR}/corrections.md`, `${DIR}/requirements.yaml`, `${DIR}/status.yaml`, `${DIR}/tasks.yaml`, 'src/state.txt'], 'the code and the spec, never the work of the script under .spex/');
  assert.equal(gitIn(wt, ['status', '--porcelain']).trim(), '');
  assert.ok(existsSync(join(wt, '.spex/evidence/007/verify.json')), 'the evidence stays on disk, outside git');
  assert.ok(r.json.text.includes('implement done for specs/007-csv-export: 2 of 2 task(s) · 2 script(s) green · 0 session(s) passed · round 1 of 3') && r.json.text.includes('C1 · implement, round 1 · a test was wrong'), r.json.text);
  assert.ok(r.json.text.includes(`NEXT   /clear\n       /spex:review ${DIR}\n`), r.json.text);

  // the commit, and the entry the end closed, did not move the tree id: the proof of before still holds for review
  assert.equal(ok(repo, 'run', DIR, '--test', 'TS01').json.evidence.tree, proof.tree);
  r = spex(enter(repo), 'start', 'review', DIR);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.phase, r.json.was, r.json.state, r.json.corrections], ['review', { command: 'implement', state: 'done' }, { command: 'review', state: 'started' }, ['C1']]);
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: review\nstate: started\n');
  assert.equal(taskStatus(wt, 'T02'), 'done');
});

test('start review: a built spec whose proof is of this tree; a change after the proof sends it back to implement', () => {
  const { repo, wt } = builtSpec();
  writeFileSync(join(wt, 'src/state.txt'), 'implemented, and changed after the proof\n');
  let r = spex(enter(repo), 'start', 'review', DIR);
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['GATE-VERIFY']);
  assert.ok(finding(r, 'GATE-VERIFY').fix.startsWith(`Type /spex:implement ${DIR}`), r.stdout);
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: implement\nstate: done\n');
  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n');
  // a task the script did not close keeps review shut, whatever the file says about the proof
  edit(wt, `${DIR}/tasks.yaml`, (s) => s.replace(/(id: T02[\s\S]*?status: )done/, '$1blocked'));
  r = spex(enter(repo), 'start', 'review', DIR);
  assert.deepEqual(codes(r), ['GATE-TASKS']);
  assert.equal(r.json.findings[0].message, 'T02 is blocked');
  gitIn(wt, ['checkout', '--', `${DIR}/tasks.yaml`]);
  r = ok(enter(repo), 'start', 'review', DIR);
  assert.ok(r.json.text.includes('every task is done and every test is green on this tree') && r.json.text.includes('corrections.md: no entry'), r.json.text);
  // typed again while review is started: the same phase, from its first box
  r = ok(enter(repo), 'start', 'review', DIR);
  assert.deepEqual(r.json.was, { command: 'review', state: 'started' });
});

test('the tree id is the same before and after a commit, and a file rewritten with the same size in the same second is seen', () => {
  const repo = makeRepo('csv-export');
  // ctime is the one time a test cannot set: without it, git judges a file by its size and its mtime, as it does
  // for a file that is written twice within one second
  gitIn(repo, ['config', 'core.trustctime', 'false']);
  const file = join(repo, 'src/cli/exit.ts');
  const past = new Date(Date.now() - 60_000);
  utimesSync(file, past, past);
  writeFileSync(join(repo, 'src/extra.txt'), 'new\n');
  commitAll(repo, 'an older file');
  const treeOf = () => spex(repo, 'run', DIR, '--test', 'TS01', '--expect', 'fail').json.evidence.tree;
  const first = treeOf();
  assert.equal(first, gitIn(repo, ['rev-parse', 'HEAD^{tree}']).trim().slice(0, 24), 'git\'s own hash of the tree');

  // the same size, the same second: what start implement did to requirements.yaml right after the commit of plan
  const text = readFileSync(file, 'utf8');
  const other = text.replace('Ok = 0', 'Ok = 1');
  assert.ok(other !== text && other.length === text.length);
  writeFileSync(file, other);
  utimesSync(file, past, past);
  // the index is as old as the file, so git cannot trust the size and the time: it reads the file again
  const index = join(repo, '.git/index');
  utimesSync(index, past, past);
  assert.equal(statSync(index).mtimeMs, statSync(file).mtimeMs);
  const second = treeOf();
  assert.notEqual(second, first, 'the changed file is in the id');
  // the commit of the same files changes nothing in the id
  commitAll(repo, 'the change');
  assert.equal(treeOf(), second);
  assert.equal(second, gitIn(repo, ['rev-parse', 'HEAD^{tree}']).trim().slice(0, 24));

  // what the script writes about a spec is no part of what is proved: status.yaml and corrections.md leave the id alone
  writeFileSync(join(repo, DIR, 'status.yaml'), 'command: implement\nstate: started\n');
  writeFileSync(join(repo, DIR, 'corrections.md'), '# What changed\n');
  mkdirSync(join(repo, '.spex/runs/007'), { recursive: true });
  writeFileSync(join(repo, '.spex/runs/007/x.json'), '{}');
  assert.equal(treeOf(), second);
  commitAll(repo, 'the state');
  assert.equal(treeOf(), second);
  // any other file of the spec is part of it, tracked or new
  writeFileSync(join(repo, DIR, 'notes.md'), 'a new file\n');
  assert.notEqual(treeOf(), second);
});

test('stamp: the process changed the plan, so the script checks the links, stamps, closes the entry and commits the folder of the spec', () => {
  const { repo, wt } = planned();
  const T03 = '  - id: T03\n    title: "The fix file says fixed"\n    kind: setup\n    requirements: []\n    paths: [src/fix.txt]\n    context: [src/state.txt]\n    instructions: |\n      Write fixed in src/fix.txt.\n    done_when: TS03 passes.\n    status: todo\n';
  const TS03 = '  - id: TS03\n    covers: [T03]\n    kind: script\n    driver: shell\n    steps:\n      - grep -q fixed src/fix.txt\n    expect:\n      - the exit code is 0\n';

  // in plan: a comment changed a task. The stamp keeps the state, closes the entry with what changed, and commits
  edit(wt, `${DIR}/tasks.yaml`, (s) => s.replace('Rows follow list order', 'Rows follow the list order'));
  ok(enter(repo), 'comment', '--text', 'Sort the rows as the page does.');
  let r = ok(repo, 'stamp', DIR, '--close', 'C1', '--changed', 'D1 of tasks.yaml');
  assert.deepEqual([r.json.dir, r.json.stamped, r.json.closed, r.json.state, r.json.committed], [DIR, true, ['C1'], { command: 'plan', state: 'done' }, true]);
  const entry = read(wt, `${DIR}/corrections.md`);
  assert.ok(entry.includes('## C1 · comment · your words\nYou said: "Sort the rows as the page does."\nChanged: D1 of tasks.yaml\nState: closed: the script stamped the changed plan\n'), entry);
  assert.equal(lastCommit(wt), `${NAME}: comment · your words`);
  assert.deepEqual(committedFiles(wt), [`${DIR}/corrections.md`, `${DIR}/tasks.yaml`]);
  assert.equal(spex(enter(repo), 'start', 'implement', DIR).code, 0, 'no approval is lost: implement takes the stamped plan');
  assert.equal(spex(repo, 'stamp', DIR, '--close', 'C9').json.closed.length, 0, 'an id that is not open closes nothing');

  // a change that breaks a link is not stamped: a task with no test is a gap, and the entry stays open
  edit(wt, `${DIR}/tasks.yaml`, (s) => s + T03);
  ok(repo, 'correction', DIR, '--title', 'implement, round 1 · a step was missing', '--found', 'nothing writes src/fix.txt', '--changed', 'T03 new');
  r = spex(repo, 'stamp', DIR, '--close', 'C2');
  assert.equal(r.code, 5, r.stdout);
  assert.deepEqual(codes(r), ['TEST-COVER']);
  assert.ok(read(wt, `${DIR}/corrections.md`).includes('State: open'), 'the entry is still open');
  assert.deepEqual(codes(spex(repo, 'gate', 'develop', DIR, 'T01')).filter((c) => c.endsWith('-STAMPED')), ['GATE-TASKS-STAMPED']);
  edit(wt, `${DIR}/tests.yaml`, (s) => s + TS03);
  r = ok(repo, 'stamp', DIR);
  assert.deepEqual([r.json.stamped, r.json.closed], [true, []], 'with no id, no entry is closed: the entry of another correction stays open until its own fix is done');
  assert.ok(read(wt, `${DIR}/corrections.md`).includes('State: open'), 'the entry is still open');
  r = ok(repo, 'stamp', DIR, '--close', 'C2');
  assert.deepEqual([r.json.stamped, r.json.closed, r.json.state], [true, ['C2'], { command: 'implement', state: 'started' }]);
  assert.equal(lastCommit(wt), `${NAME}: implement, round 1 · a step was missing`);

  // a built spec whose plan gets a new task goes back to implement, started: the code must follow
  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n');
  writeFileSync(join(wt, 'src/fix.txt'), 'fixed\n');
  for (const t of ['T01', 'T02', 'T03']) ok(repo, 'done', DIR, t);
  ok(repo, 'verify', DIR);
  ok(repo, 'end', 'implement', DIR);
  const T04 = T03.replace(/T03/g, 'T04').replace(/TS03/g, 'TS04').replace('src/fix.txt', 'src/fix2.txt');
  const record = '  - id: REQ-007-003\n    type: ubiquitous\n    text: The CLI shall print the count of the exported rows on stderr.\n    scope: export\n    applies_to: [cli]\n    acceptance:\n      - id: AC-1\n        given: two open tasks\n        when: the user runs `todo export --csv`\n        then: stderr is `2 rows`\n    priority: should\n    status: draft\n    source: comment C3\n';
  edit(wt, `${DIR}/requirements.yaml`, (s) => s + record);
  edit(wt, `${DIR}/tasks.yaml`, (s) => s + T04.replace('requirements: []', 'requirements: [REQ-007-003]').replace('kind: setup', 'kind: story'));
  edit(wt, `${DIR}/tests.yaml`, (s) => s + TS03.replace(/TS03/g, 'TS04').replace('[T03]', '[REQ-007-003/AC-1, T04]').replace('src/fix.txt', 'src/fix2.txt'));
  ok(enter(repo), 'comment', '--text', 'Print the count of the rows too.');
  r = ok(repo, 'stamp', DIR, '--close', 'C3');
  assert.deepEqual([r.json.stamped, r.json.closed, r.json.state], [true, ['C3'], { command: 'implement', state: 'started' }]);
  assert.ok(r.json.text.includes('1 new record(s) approved') && r.json.text.includes('state: implement, started (it was built): the code must follow the plan'), r.json.text);
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: implement\nstate: started\n');
  assert.deepEqual(recordStatus(wt), ['approved', 'approved', 'approved']);
  assert.deepEqual(codes(spex(enter(repo), 'start', 'review', DIR)), ['GATE-BUILT']);
  assert.equal(spex(repo, 'gate', 'develop', DIR, 'T04').code, 0, 'the new task is open for a developer, with no second approval');
});

test('stamp with no plan on disk stamps nothing: the spec keeps the change, and plan writes the rest when it runs again', () => {
  const repo = makeRepo('csv-export');
  for (const f of ['requirements.yaml', 'tasks.yaml', 'tests.yaml']) rmSync(join(repo, DIR, f));
  commitAll(repo, 'only a note');
  ok(enter(repo), 'start', 'plan', DIR);
  const wt = worktreeOf(repo);
  let r = ok(enter(repo), 'comment', '--text', 'Also export the finished tasks.');
  assert.equal(r.json.planned, false);
  edit(wt, `${DIR}/spec.md`, (s) => s.replace('## Not this\n', '## Not this\n- (you) finished tasks are in: see What.\n'));
  r = ok(repo, 'stamp', DIR, '--close', 'C1');
  assert.deepEqual([r.json.stamped, r.json.closed, r.json.state, r.json.committed], [false, ['C1'], { command: 'plan', state: 'started' }, true]);
  assert.ok(r.json.text.includes('nothing to stamp'), r.json.text);
  assert.ok(read(wt, `${DIR}/corrections.md`).includes('State: closed: the spec has it; plan follows when it runs again'));
  assert.ok(!existsSync(join(wt, DIR, 'tasks.yaml')));
  assert.equal(lastCommit(wt), `${NAME}: comment · your words`);
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: plan\nstate: started\n');
});
