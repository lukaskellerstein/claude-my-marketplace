// The commands around the phases: new and cover (the notes of an idea), new-bug (a note with the next turn), delete
// (a spec off the list, saved first), status, list and commit (where the work stopped, and the notes on the base
// branch), comment and correction (the person's words and what changed, kept in corrections.md).
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { DIR, NAME, builtSpec, codes, commitAll, configure, edit, gitIn, implementing, makeRepo, ok, planned, read, spex, tempDir, worktreeOf } from './helpers.mjs';

const RULE = '─'.repeat(40);
const finding = (r, code) => r.json.findings.find((f) => f.code === code);
const lastCommit = (root) => gitIn(root, ['log', '-1', '--format=%s']).trim();
const branches = (root) => gitIn(root, ['branch', '--format=%(refname:short)']).trim().split('\n');
const today = new Date().toISOString().slice(0, 10);
const fill = (root, dir, extra = '') => edit(root, `${dir}/spec.md`, (s) => s.replace(/## Why\n\n<!--.*?-->/s, '## Why\nwords').replace(/## What\n\n<!--.*?-->/s, '## What\n- words').replace(/## Not this\n\n<!--.*?-->/s, `## Not this\n- words${extra}`));
/** Two notes behind the fixture's 007: 008-restore, and 009-undo, which depends on it and names it in its text. */
const twoNotes = (repo) => {
  writeFileSync(join(repo, 'idea.txt'), 'I want a restore command.\nAnd an undo for it.\n');
  ok(repo, 'new', 'restore', '--words', 'idea.txt');
  ok(repo, 'new', 'undo', '--words', 'idea.txt', '--depends-on', '008');
  fill(repo, 'specs/008-restore');
  fill(repo, 'specs/009-undo', '\n- No restore: 008-restore does that.');
  rmSync(join(repo, 'idea.txt'));
};

test('new writes one note from the template, with the person\'s text word for word in source.md', () => {
  const repo = makeRepo('csv-export');
  const words = 'Hello,\n\nI want a restore command.\n  It must ask before it overwrites.  \n---\nThanks — Lukáš\n';
  writeFileSync(join(repo, 'idea.txt'), words);
  let r = spex(repo, 'new', 'restore', '--words', 'idea.txt');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.dir, r.json.feature, r.json.spec, r.json.words, r.json.lines, r.json.source], ['specs/008-restore', '008', 'specs/008-restore/spec.md', 'specs/008-restore/source.md', 4, ['source.md']]);
  assert.equal(read(repo, 'specs/008-restore/source.md'), words, 'every byte of the text, also the blank lines and the spaces');
  const note = read(repo, 'specs/008-restore/spec.md');
  assert.ok(note.startsWith('---\nsource: ["source.md"]\n---\n# 008 Restore\n\n> A note: /spex:plan writes the full spec when the turn of this spec comes.'), note.slice(0, 200));
  assert.deepEqual([...note.matchAll(/^## (.+)$/gm)].map((m) => m[1]), ['Why', 'What', 'Not this', 'From your idea', 'Open questions']);
  assert.ok(!existsSync(join(repo, 'specs/008-restore/status.yaml')), 'no status.yaml: that is what makes it a note');
  // the check reads it as a note: the boundary is empty, and nothing is an error
  r = spex(repo, 'check', 'specs/008-restore');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(codes(r).sort(), ['REQ-MISSING', 'SPEC-NOTE', 'SPEC-SECTIONS']);
  assert.ok(finding(r, 'SPEC-SECTIONS').message.endsWith('Why, What, Not this'), r.stdout);
  assert.ok(finding(r, 'SPEC-NOTE').message.includes('is a note: nothing it depends on is open'), r.stdout);

  // a design that is a file stays where it is: the note names its sections, and the text of the person comes first
  r = spex(repo, 'new', 'undo', '--words', 'idea.txt', '--source', 'docs/design.md#3.4', '--depends-on', '008');
  assert.deepEqual([r.json.dir, r.json.source, r.json.depends_on], ['specs/009-undo', ['source.md', 'docs/design.md#3.4'], ['008-restore']]);
  assert.ok(read(repo, 'specs/009-undo/spec.md').startsWith('---\ndepends_on: [008-restore]\nsource: ["source.md", "docs/design.md#3.4"]\n---\n# 009 Undo\n'));
  // no text: a note with no source.md
  r = spex(repo, 'new', 'bulk-delete');
  assert.deepEqual([r.json.dir, r.json.words, r.json.lines], ['specs/010-bulk-delete', null, 0]);
  assert.ok(!existsSync(join(repo, 'specs/010-bulk-delete/source.md')) && read(repo, 'specs/010-bulk-delete/spec.md').startsWith('# 010 Bulk delete\n'));
  // usage
  assert.equal(spex(repo, 'new', 'x', '--words', 'missing.txt').code, 2);
  assert.equal(spex(repo, 'new', 'Bad_Slug').code, 2);
  assert.equal(spex(repo, 'new', 'x', '--depends-on', '099-nowhere').code, 2);
  assert.equal(spex(repo, 'new').code, 2);
  for (const gone of ['--shaping', '--planned', '--from']) assert.equal(spex(repo, 'new', 'x', gone).code, 2, `${gone} is gone: a note is the one thing new writes`);
  assert.ok(!existsSync(join(repo, 'specs/011-x')), 'a refused new writes nothing');
});

test('cover: every line of the person\'s text is linked from a note, or has its reason there', () => {
  const repo = makeRepo('csv-export');
  writeFileSync(join(repo, 'idea.txt'), 'Hello,\n\nI want a restore command.\nIt must ask before it overwrites.\nAnd an undo for it.\n---\nThanks\n');
  ok(repo, 'new', 'restore', '--words', 'idea.txt');
  ok(repo, 'new', 'undo', '--words', 'idea.txt');
  const source = 'specs/008-restore/source.md';
  let r = spex(repo, 'cover', source, 'specs/008-restore', 'specs/009-undo');
  assert.equal(r.code, 5, r.stdout);
  assert.deepEqual([r.json.lines, r.json.kept], [5, 0], 'a blank line and a rule hold no detail');
  assert.deepEqual(r.json.findings.map((f) => [f.severity, f.code, f.message.split(' of ')[0]]), [1, 3, 4, 5, 7].map((n) => ['gap', 'COVER-LINE', `line ${n}`]));
  assert.ok(r.json.findings[1].message.endsWith('is in no note: "I want a restore command."') && r.json.findings[1].fix.includes('← source.md#L3'), r.stdout);
  // each detail is in the note it belongs to; a range links more than one line; what belongs in no spec says why
  edit(repo, 'specs/008-restore/spec.md', (s) => s.replace(/## From your idea\n\n<!--.*?-->/s, '## From your idea\n- a restore command, which asks before it overwrites ← source.md#L3-L4\n- (left out: a greeting) ← source.md#L1'));
  edit(repo, 'specs/009-undo/spec.md', (s) => s.replace(/## From your idea\n\n<!--.*?-->/s, '## From your idea\n- an undo for the restore ← source.md#L5'));
  r = spex(repo, 'cover', source, 'specs/008-restore', 'specs/009-undo');
  assert.equal(r.code, 5, r.stdout);
  assert.deepEqual(r.json.findings.map((f) => f.message), [`line 7 of ${source} is in no note: "Thanks"`]);
  edit(repo, 'specs/009-undo/spec.md', (s) => s.replace('← source.md#L5', '← source.md#L5\n- (left out: the closing word) ← source.md#L7'));
  r = spex(repo, 'cover', source, 'specs/008-restore', 'specs/009-undo');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.lines, r.json.kept, r.json.notes], [5, 5, ['specs/008-restore', 'specs/009-undo']]);
  assert.equal(r.json.text, `5 of 5 line(s) of ${source} kept in 2 note(s)`);
  // one note alone does not hold the whole text
  assert.equal(spex(repo, 'cover', source, 'specs/008-restore').json.kept, 3);
  assert.equal(spex(repo, 'cover', source).code, 2);
  assert.equal(spex(repo, 'cover', 'missing.md', 'specs/008-restore').code, 2);
  assert.equal(spex(repo, 'cover', source, 'specs/099-nowhere').code, 2);
});

test('status, list and commit: where the work stopped, the one command to go on, and the notes on the base branch', () => {
  // a repo with no spec
  const empty = tempDir('spex-empty-');
  gitIn(empty, ['init', '-q', '-b', 'main']);
  let r = spex(empty, 'status');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.open, r.json.next, r.json.closed, r.json.waiting], [null, null, 0, 0]);
  assert.equal(r.json.text, `📍 no spec yet\n${RULE}\nNEXT   Nothing.\n       No spec yet. An idea starts with /spex:new.\n${RULE}`);
  assert.equal(spex(empty, 'list').json.text, '(no spec folder under specs/)\n0 not closed · the next number at the end is 001');

  // notes wait: the first one of the list has the turn
  const repo = makeRepo('csv-export');
  twoNotes(repo);
  r = spex(repo, 'status');
  assert.deepEqual([r.json.open, r.json.next, r.json.closed, r.json.waiting], [null, `/spex:plan ${DIR}`, 0, 3]);
  assert.equal(r.json.text, `📍 no spec is open · 0 closed · 3 note(s) wait\n${RULE}\nNEXT   /spex:plan ${DIR}\n       It is the turn of this spec.\n${RULE}`);
  r = spex(repo, 'list');
  assert.deepEqual(r.json.specs, [7, 8, 9].map((n, i) => ({ dir: ['specs/007-csv-export', 'specs/008-restore', 'specs/009-undo'][i], number: n, state: 'a note', worktree: false })));
  assert.deepEqual([r.json.open, r.json.next], [3, 10]);
  assert.equal(r.json.text, '007-csv-export  a note\n008-restore  a note\n009-undo  a note\n3 not closed · the next number at the end is 010');

  // commit: without commit: true the script names the files, and the person commits them
  r = spex(repo, 'commit', '--message', 'two notes');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(codes(r), ['COMMIT-YOURS']);
  assert.deepEqual([r.json.committed, r.json.files.sort()], [false, ['specs/008-restore/source.md', 'specs/008-restore/spec.md', 'specs/009-undo/source.md', 'specs/009-undo/spec.md']]);
  assert.equal(lastCommit(repo), 'fixture');
  // with it, one commit of specs/ on the base branch, and nothing else of the main folder
  configure(repo, 'commit: true');
  writeFileSync(join(repo, 'scratch.txt'), 'mine\n');
  r = spex(repo, 'commit', '--message', 'two notes');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.committed, r.json.files.length, codes(r)], [true, 4, []]);
  assert.equal(lastCommit(repo), 'two notes');
  assert.deepEqual(gitIn(repo, ['status', '--porcelain']).split('\n').filter(Boolean).map((l) => l.slice(3)).sort(), ['.spex/config.yaml', 'scratch.txt']);
  r = spex(repo, 'commit');
  // the reply of new ends with this block: the spec whose turn it is, in a fresh context
  assert.deepEqual([r.json.committed, r.json.text], [false, `nothing to commit under specs/ on main\n${RULE}\nNEXT   /clear\n       /spex:plan ${DIR}\n       It is the turn of this spec.\n${RULE}`]);
  gitIn(repo, ['commit', '-qam', 'the config']);

  // an open spec: the phase, the worktree, and the command of the phase; the same from inside the worktree
  ok(repo, 'start', 'plan', DIR);
  const wt = worktreeOf(repo);
  for (const cwd of [repo, wt]) {
    r = spex(cwd, 'status');
    assert.deepEqual(r.json.open, { dir: DIR, state: { command: 'plan', state: 'started' }, worktree: wt, corrections: [] });
    assert.equal(r.json.text, `📍 007 csv-export · plan, started · worktree ${NAME} · today\n   worktree: ${wt}\n${RULE}\nNEXT   /spex:plan ${DIR}\n       The phase runs again from its first box. The files of the first run stay, and each agent reads them.\n${RULE}`);
  }
  assert.deepEqual(codes(spex(wt, 'commit')), ['COMMIT-LEAVE'], 'the notes are in the main folder');
  assert.equal(spex(repo, 'list').json.text.split('\n')[0], '007-csv-export  plan, started  (worktree)');
  // each state has its one command
  ok(repo, 'end', 'plan', DIR);
  r = spex(repo, 'status');
  assert.ok(r.json.text.startsWith('📍 007 csv-export · planned · worktree'), r.json.text);
  assert.ok(r.json.text.includes(`NEXT   /spex:implement ${DIR}\n       Typing it approves the plan.`), r.json.text);
  ok(repo, 'start', 'implement', DIR);
  assert.equal(spex(repo, 'status').json.next, `/spex:implement ${DIR}`);
  // a comment that is not finished comes first, whatever the phase
  ok(repo, 'comment', '--text', 'Why a comma?');
  r = spex(repo, 'status');
  assert.deepEqual([r.json.next, r.json.open.corrections], ['/spex:comment', ['C1']]);
  assert.ok(r.json.text.includes('\n   not finished: C1 · comment · your words\n') && r.json.text.includes('NEXT   /spex:comment\n       C1 is a comment that is not finished'), r.json.text);
  ok(repo, 'correction', DIR, '--close', 'C1', '--done', 'answered from D1');
  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n');
  for (const t of ['T01', 'T02']) ok(repo, 'done', DIR, t);
  ok(repo, 'verify', DIR);
  ok(repo, 'end', 'implement', DIR);
  r = spex(repo, 'status');
  assert.ok(r.json.text.startsWith('📍 007 csv-export · built · worktree') && r.json.next === `/spex:review ${DIR}`, r.json.text);
  assert.deepEqual(spex(repo, 'list').json.specs.map((s) => s.state), ['built', 'a note', 'a note']);
  ok(repo, 'start', 'review', DIR);
  r = spex(repo, 'status');
  assert.ok(r.json.text.includes('· review, started ·') && r.json.text.includes('the findings that wait for your answer are shown again'), r.json.text);
  for (const gone of ['next', 'approve', 'ship', 'drop']) assert.equal(spex(repo, gone, DIR).code, 2, `${gone} is gone`);
});

test('new-bug: the bug gets the turn after the open spec, the notes that wait move one number up, and every place that names them follows', () => {
  const { repo, wt } = planned((main) => twoNotes(main));
  const report = 'The export cuts a name after 40 characters.\nSeen with "Quarterly planning for the kitchen rebuild, phase two".\n';
  writeFileSync(join(repo, 'bug.txt'), report);
  // the notes are on the base branch, so the command runs in the main folder
  let r = spex(wt, 'new-bug', 'export-cuts-long-names', '--words', join(repo, 'bug.txt'));
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['NEWBUG-LEAVE']);
  assert.equal(r.json.main, repo);
  assert.equal(spex(repo, 'new-bug', 'export-cuts-long-names').code, 2, 'the report is needed');
  assert.equal(spex(repo, 'new-bug').code, 2);
  // a refused command changes nothing: the numbers are as they were
  assert.equal(spex(repo, 'new-bug', 'Bad_Slug', '--words', 'bug.txt').code, 2);
  assert.equal(spex(repo, 'new-bug', 'x', '--words', 'missing.txt').code, 2);
  assert.deepEqual(readdirSync(join(repo, 'specs')).sort(), ['007-csv-export', '008-restore', '009-undo']);

  r = spex(repo, 'new-bug', 'export-cuts-long-names', '--words', 'bug.txt');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.dir, r.json.number, r.json.after, r.json.words], ['specs/008-export-cuts-long-names', 8, DIR, 'specs/008-export-cuts-long-names/source.md']);
  assert.deepEqual(r.json.moves, [{ from: '008-restore', to: '009-restore' }, { from: '009-undo', to: '010-undo' }]);
  assert.ok(r.json.text.includes('moved up: 008 → 009 · 009 → 010') && r.json.text.endsWith(`${NAME} is open and keeps its number: the fix is next after it`), r.json.text);
  assert.deepEqual(readdirSync(join(repo, 'specs')).sort(), ['007-csv-export', '008-export-cuts-long-names', '009-restore', '010-undo']);
  // the bug is one note, with the report word for word
  assert.equal(read(repo, 'specs/008-export-cuts-long-names/source.md'), report);
  assert.ok(read(repo, 'specs/008-export-cuts-long-names/spec.md').startsWith('---\nsource: ["source.md"]\n---\n# 008 Export cuts long names\n\n> A note:'));
  // each place that names a moved note has its new name: the title, depends_on, a line of text
  const undo = read(repo, 'specs/010-undo/spec.md');
  assert.ok(undo.startsWith('---\ndepends_on: [009-restore]\nsource: ["source.md"]\n---\n# 010 Undo\n'), undo.slice(0, 120));
  assert.ok(undo.includes('- No restore: 009-restore does that.') && !undo.includes('008-restore'), undo);
  assert.ok(read(repo, 'specs/009-restore/spec.md').includes('\n# 009 Restore\n'));
  assert.equal(read(repo, 'specs/009-restore/source.md'), 'I want a restore command.\nAnd an undo for it.\n', 'the text of the person is never rewritten');
  assert.equal(spex(repo, 'check', 'specs/010-undo').code, 0, 'the links hold');
  // the list: the open spec kept its number, the fix is next, and the turn of each note is one later
  assert.deepEqual(spex(repo, 'list').json.specs.map((s) => [s.dir, s.state]), [[DIR, 'planned'], ['specs/008-export-cuts-long-names', 'a note'], ['specs/009-restore', 'a note'], ['specs/010-undo', 'a note']]);
  assert.equal(read(wt, `${DIR}/status.yaml`), 'command: plan\nstate: done\n', 'the open spec is not touched');
  assert.deepEqual(codes(spex(repo, 'start', 'plan', 'specs/008-export-cuts-long-names')), ['GATE-TURN']);

  // a second bug gets the same turn, in front of the first: both wait for the one open spec
  r = ok(repo, 'new-bug', 'export-drops-last-row', '--words', 'bug.txt');
  assert.deepEqual([r.json.dir, r.json.moves.length], ['specs/008-export-drops-last-row', 3]);
  assert.deepEqual(readdirSync(join(repo, 'specs')).sort(), ['007-csv-export', '008-export-drops-last-row', '009-export-cuts-long-names', '010-restore', '011-undo']);
  assert.ok(read(repo, 'specs/011-undo/spec.md').startsWith('---\ndepends_on: [010-restore]\n'));

  // with no note that waits, nothing moves
  const alone = planned().repo;
  writeFileSync(join(alone, 'bug.txt'), report);
  r = ok(alone, 'new-bug', 'export-cuts-long-names', '--words', 'bug.txt');
  assert.deepEqual([r.json.dir, r.json.moves], ['specs/008-export-cuts-long-names', []]);
  assert.ok(r.json.text.includes('no note waits: nothing moves'), r.json.text);
});

test('delete a note: it goes to .spex/archive with the reason, the later notes close up, and commit: true commits', () => {
  const repo = makeRepo('csv-export');
  twoNotes(repo);
  ok(repo, 'new', 'bulk-delete');
  commitAll(repo, 'three notes');
  assert.equal(spex(repo, 'delete', 'specs/008-restore').code, 2, 'a reason is needed');
  assert.equal(spex(repo, 'delete', '--reason', 'x').code, 2, 'a spec is needed');
  assert.equal(spex(repo, 'delete', 'specs/099-nowhere', '--reason', 'x').code, 2);
  // a note that another one depends on is refused, by name; the command that takes both is in the fix
  let r = spex(repo, 'delete', 'specs/008-restore', '--reason', 'no restore after all');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['DELETE-DEPENDED']);
  assert.ok(finding(r, 'DELETE-DEPENDED').message === '009-undo depends on 008-restore' && finding(r, 'DELETE-DEPENDED').fix.includes('spex delete specs/008-restore specs/009-undo --reason'), r.stdout);
  assert.ok(existsSync(join(repo, 'specs/008-restore')) && !existsSync(join(repo, '.spex/archive')), 'a refused delete changes nothing');

  // both in one command: each has its archive folder, and the note behind them takes the first free number
  r = spex(repo, 'delete', 'specs/008-restore', 'specs/009-undo', '--reason', 'no restore after all');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.deleted, r.json.archives, r.json.reason], [['specs/008-restore', 'specs/009-undo'], [`.spex/archive/008-restore-${today}`, `.spex/archive/009-undo-${today}`], 'no restore after all']);
  assert.deepEqual(r.json.moves, [{ from: '010-bulk-delete', to: '008-bulk-delete' }]);
  assert.deepEqual(readdirSync(join(repo, 'specs')).sort(), ['007-csv-export', '008-bulk-delete']);
  assert.ok(read(repo, 'specs/008-bulk-delete/spec.md').startsWith('# 008 Bulk delete\n'), 'the title follows the number');
  const dropped = read(repo, `.spex/archive/008-restore-${today}/DROPPED.md`);
  assert.ok(dropped.startsWith('# Deleted 008-restore\n') && dropped.includes('\n- it was: a note\n') && dropped.includes('\n- reason: no restore after all\n'), dropped);
  assert.equal(read(repo, `.spex/archive/008-restore-${today}/spec/source.md`), 'I want a restore command.\nAnd an undo for it.\n');
  assert.ok(existsSync(join(repo, `.spex/archive/009-undo-${today}/spec/spec.md`)) && !existsSync(join(repo, `.spex/archive/008-restore-${today}/code.patch`)), 'a note has no code');
  // without commit: true the files are named, and the person commits them
  assert.equal(r.json.committed, false);
  assert.deepEqual(r.json.uncommitted.sort(), ['specs/008-bulk-delete/spec.md', 'specs/008-restore/source.md', 'specs/008-restore/spec.md', 'specs/009-undo/source.md', 'specs/009-undo/spec.md', 'specs/010-bulk-delete/spec.md']);
  assert.ok(r.json.text.includes('moved: 010 → 008') && r.json.text.includes('not committed (commit: true is not set): commit specs/ on main yourself, 6 file(s)'), r.json.text);
  assert.ok(r.json.text.endsWith(`${RULE}\nNEXT   /clear\n       /spex:plan ${DIR}\n       It is the turn of this spec.\n${RULE}`), r.json.text);
  assert.equal(gitIn(repo, ['status', '--porcelain', '--', '.spex']).trim(), '', 'the archive is the work of the script: git does not see it');
  commitAll(repo, 'two notes less');

  // with commit: true the script makes the one commit on the base branch
  configure(repo, 'commit: true');
  gitIn(repo, ['commit', '-qam', 'commit: true']);
  ok(repo, 'new', 'archive-old-lists');
  ok(repo, 'commit', '--message', 'a note');
  r = spex(repo, 'delete', '008', '--reason', 'out of scope this year');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.deleted, r.json.committed, r.json.uncommitted, r.json.moves], [['specs/008-bulk-delete'], true, [], [{ from: '009-archive-old-lists', to: '008-archive-old-lists' }]]);
  assert.equal(lastCommit(repo), 'spex: delete 008-bulk-delete');
  assert.equal(gitIn(repo, ['status', '--porcelain']).trim(), '');
  assert.deepEqual(gitIn(repo, ['show', '--name-status', '--format=', 'HEAD']).trim().split('\n').map((l) => l.split('\t')[0][0]).sort(), ['D', 'R'], 'one note off, one moved');
  // a second delete of the same name on the same day keeps the first archive
  ok(repo, 'new', 'bulk-delete');
  ok(repo, 'commit', '--message', 'again');
  r = ok(repo, 'delete', 'specs/009-bulk-delete', '--reason', 'again no');
  assert.deepEqual(r.json.archives, [`.spex/archive/009-bulk-delete-${today}`]);
  assert.ok(existsSync(join(repo, `.spex/archive/008-bulk-delete-${today}/DROPPED.md`)));
});

test('delete a spec with a worktree: its folder and its code are saved first, then the worktree, the branch and the note go', () => {
  const { repo, wt } = implementing((main) => twoNotes(main));
  // the work of the open spec: a task done, code that is not committed, a new file, an entry in corrections.md
  writeFileSync(join(wt, 'src/state.txt'), 'implemented\n');
  mkdirSync(join(wt, 'src/cli/commands'), { recursive: true });
  writeFileSync(join(wt, 'src/cli/commands/export.ts'), 'export const exportCsv = () => 0;\n');
  ok(repo, 'done', DIR, 'T01');
  ok(repo, 'comment', '--text', 'Stop: the export moves to the sync service.');

  let r = spex(wt, 'delete', DIR, '--reason', 'x');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['DELETE-LEAVE']);
  assert.equal(r.json.main, repo);
  assert.ok(existsSync(wt));

  r = spex(repo, 'delete', DIR, '--reason', 'the export moves to the sync service');
  assert.equal(r.code, 0, r.stdout);
  const dest = `.spex/archive/${NAME}-${today}`;
  assert.deepEqual([r.json.deleted, r.json.archives], [[DIR], [dest]]);
  // 1. saved: the folder as it was in the worktree, the work of the script, and the code of the branch as one patch
  assert.equal(read(repo, `${dest}/spec/status.yaml`), 'command: implement\nstate: started\n');
  assert.ok(read(repo, `${dest}/spec/corrections.md`).includes('You said: "Stop: the export moves to the sync service."'));
  assert.match(read(repo, `${dest}/spec/tasks.yaml`), /approvals:\n {2}tasks: [0-9a-f]{16}/);
  assert.ok(existsSync(join(repo, dest, 'evidence/007/T01.json')), 'the records of the runs');
  const patch = read(repo, `${dest}/code.patch`);
  assert.ok(patch.includes('+++ b/src/state.txt') && patch.includes('+implemented') && patch.includes('+++ b/src/cli/commands/export.ts') && patch.includes('+export const exportCsv'), patch);
  assert.ok(!patch.includes('specs/') && !patch.includes('.spex/'), 'the patch is the code alone: the folder of the spec is next to it');
  const dropped = read(repo, `${dest}/DROPPED.md`);
  assert.ok(dropped.includes('\n- it was: implement, started\n') && dropped.includes('\n- reason: the export moves to the sync service\n') && dropped.includes('git apply code.patch'), dropped);
  // 2. the worktree and the branch are gone, and the base branch never had the code
  assert.ok(!existsSync(wt));
  assert.deepEqual(branches(repo), ['main']);
  assert.equal(read(repo, 'src/state.txt'), 'todo\n');
  // the patch brings the code back
  gitIn(repo, ['apply', '--check', join(repo, dest, 'code.patch')]);
  // 3. the note is off the base branch, and the notes behind it close up
  assert.deepEqual(r.json.moves, [{ from: '008-restore', to: '007-restore' }, { from: '009-undo', to: '008-undo' }]);
  assert.deepEqual(readdirSync(join(repo, 'specs')).sort(), ['007-restore', '008-undo']);
  assert.ok(read(repo, 'specs/008-undo/spec.md').startsWith('---\ndepends_on: [007-restore]\n') && read(repo, 'specs/008-undo/spec.md').includes('- No restore: 007-restore does that.'));
  assert.equal(r.json.next, '/spex:plan specs/007-restore');
  for (const line of [`${NAME}: its folder and its code are saved in ${dest}/ (spec/, code.patch)`, `${NAME}: removed the worktree and the branch spex/${NAME}`, 'moved: 008 → 007 · 009 → 008']) assert.ok(r.json.text.includes(line), `${line}\n${r.json.text}`);
  r = spex(repo, 'status');
  assert.ok(r.json.text.startsWith('📍 no spec is open · 0 closed · 2 note(s) wait\n'), r.json.text);
  assert.deepEqual(codes(spex(repo, 'comment', '--text', 'x')), ['COMMENT-NO-SPEC']);
});

test('delete: an open spec keeps its number, so a note in front of it leaves a gap', () => {
  // as spex update leaves a repo with a spec in flight: 008 has a state, and 007 is still a note
  const repo = makeRepo('csv-export');
  mkdirSync(join(repo, 'specs/008-restore'));
  writeFileSync(join(repo, 'specs/008-restore/spec.md'), '# 008 Restore\n\n## Why\nw\n\n## What\nw\n\n## Not this\nw\n\n## Success\nw\n');
  writeFileSync(join(repo, 'specs/008-restore/status.yaml'), 'command: implement\nstate: started\n');
  ok(repo, 'new', 'undo');
  commitAll(repo, 'in flight');
  const r = spex(repo, 'delete', DIR, '--reason', 'done elsewhere');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(codes(r), ['DELETE-NUMBERS']);
  assert.equal(finding(r, 'DELETE-NUMBERS').severity, 'warning');
  assert.deepEqual(r.json.moves, []);
  assert.deepEqual(readdirSync(join(repo, 'specs')).sort(), ['008-restore', '009-undo']);
});

test('comment: the person\'s words are kept word for word in corrections.md of the open spec, before any agent reads them', () => {
  const repo = makeRepo('csv-export');
  // no open spec: a note that waits is changed with delete and new, merged code with new-bug
  let r = spex(repo, 'comment', '--text', 'Use a semicolon.');
  assert.equal(r.code, 6, r.stdout);
  assert.deepEqual(codes(r), ['COMMENT-NO-SPEC']);
  assert.equal(r.json.next, `/spex:plan ${DIR}`);
  assert.ok(finding(r, 'COMMENT-NO-SPEC').fix.includes('/spex:new-bug') && finding(r, 'COMMENT-NO-SPEC').fix.endsWith(`Next: /spex:plan ${DIR}`), r.stdout);

  ok(repo, 'start', 'plan', DIR);
  const wt = worktreeOf(repo);
  ok(repo, 'end', 'plan', DIR);
  assert.equal(spex(repo, 'comment').code, 2, 'no words, and no comment that waits');
  assert.equal(spex(repo, 'comment', '--words', 'missing.txt').code, 2);
  const words = 'Why is it a comma?\n\nMy sheet wants a semicolon: "a;b".\n  And no header, please.';
  writeFileSync(join(repo, 'words.txt'), `${words}\n`);
  r = spex(repo, 'comment', '--words', 'words.txt');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.dir, r.json.entry, r.json.words, r.json.worktree, r.json.state, r.json.planned, r.json.resumed, r.json.open], [DIR, 'C1', `"${words}"`, wt, { command: 'plan', state: 'done' }, true, false, []]);
  assert.ok(r.json.text.startsWith(`comment kept as C1 in ${DIR}/corrections.md, word for word\nspec: ${DIR} · planned\nenter: ${wt}\n`), r.json.text);
  assert.ok(r.json.text.endsWith('a plan exists: a change goes through the analyst, the planner and the test analyst, then `spex stamp`'), r.json.text);
  // the file: one entry, open, in the worktree of the spec; a line after the first is indented, so the file stays a list of `Key: value`
  const file = read(wt, `${DIR}/corrections.md`);
  assert.ok(file.startsWith(`# What changed in ${NAME}, and why\n`), file);
  assert.ok(file.endsWith('## C1 · comment · your words\nYou said: "Why is it a comma?\n  \n  My sheet wants a semicolon: "a;b".\n    And no header, please."\nState: open\n'), file);
  assert.ok(!existsSync(join(repo, DIR, 'corrections.md')), 'the base branch has nothing of an open spec');
  // read back, the words are as the person typed them
  assert.equal(spex(repo, 'comment').json.words, `"${words}"`);

  // the chat ended before the answer: the command with no words goes on with the entry that is open
  r = spex(repo, 'comment');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.entry, r.json.resumed, r.json.open], ['C1', true, ['C1']]);
  assert.ok(r.json.text.startsWith('comment kept as C1 in specs/007-csv-export/corrections.md (it was not finished; this run goes on from there)\n'), r.json.text);
  assert.equal(read(wt, `${DIR}/corrections.md`), file, 'nothing is written twice');
  // new words while one waits: a second entry, and the first is named
  r = spex(repo, 'comment', 'And', 'drop', 'the', 'header.');
  assert.deepEqual([r.json.entry, r.json.words, r.json.open], ['C2', '"And drop the header."', ['C1']]);
  assert.ok(r.json.text.endsWith('also not finished: C1'), r.json.text);

  // a question is answered from the files, and `spex correction --close` closes its entry; a change is closed by the stamp
  assert.deepEqual(codes(spex(repo, 'correction', DIR, '--close', 'C7')), ['CORRECTION-NONE']);
  r = ok(repo, 'correction', DIR, '--close', 'C1', '--done', 'a question: answered from D1 of tasks.yaml');
  assert.deepEqual(r.json.closed, ['C1']);
  assert.ok(read(wt, `${DIR}/corrections.md`).includes('And no header, please."\nState: closed: a question: answered from D1 of tasks.yaml\n'));
  r = spex(repo, 'comment');
  assert.deepEqual([r.json.entry, r.json.resumed], ['C2', true]);
  assert.deepEqual(ok(repo, 'stamp', DIR, '--close', 'C2').json.closed, ['C2']);
  assert.equal(spex(repo, 'comment').code, 2, 'nothing waits now');
  // the words and their entries are no part of the plan: implement takes the stamped plan
  assert.equal(spex(repo, 'start', 'implement', DIR).code, 0);
});

test('correction: one entry of corrections.md for a verdict, an answer or a pick; the proof of the spec does not depend on it', () => {
  const { repo, wt } = builtSpec();
  assert.equal(spex(repo, 'correction', DIR).code, 2, 'a title, or an id to close');
  assert.equal(spex(repo, 'correction', 'specs/099-nowhere', '--title', 'x').code, 2);
  let r = spex(repo, 'correction', DIR, '--title', 'implement, round 2 · the spec was wrong (big)', '--you-said', '"3 = B"', '--found', 'the page sorts by name, the spec said by date', '--was', 'REQ-007-001: rows by date', '--changed', 'REQ-007-001, T01, TS01', '--pick', 'B: by name', '--why', 'the page is what the user sees', '--reaches', 'no other spec');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual([r.json.entry, r.json.open, r.json.entries], ['C1', true, 1]);
  assert.ok(read(wt, `${DIR}/corrections.md`).endsWith('## C1 · implement, round 2 · the spec was wrong (big)\nYou said: "3 = B"\nFound: the page sorts by name, the spec said by date\nWas: REQ-007-001: rows by date\nChanged: REQ-007-001, T01, TS01\nPick: B: by name\nWhy: the page is what the user sees\nReaches: no other spec\nState: open\n'));
  // a verdict that needs no more work is written closed
  r = ok(repo, 'correction', DIR, '--title', 'implement, round 2 · a test was wrong', '--found', 'TS02 read out.csv before the run', '--closed', '--done', 'the test developer rewrote it');
  assert.deepEqual([r.json.entry, r.json.open, r.json.entries], ['C2', false, 2]);
  assert.ok(read(wt, `${DIR}/corrections.md`).endsWith('## C2 · implement, round 2 · a test was wrong\nFound: TS02 read out.csv before the run\nState: closed: the test developer rewrote it\n'));
  // `--close all` closes what is open, and adds what the work changed
  r = ok(repo, 'correction', DIR, '--close', 'all', '--changed', 'REQ-007-001, T01, TS01, and D1');
  assert.deepEqual(r.json.closed, ['C1']);
  assert.ok(read(wt, `${DIR}/corrections.md`).includes('Changed: REQ-007-001, T01, TS01, and D1\nPick: B: by name\nWhy: the page is what the user sees\nReaches: no other spec\nState: closed: done\n'));
  // the file says how the spec got here; it is no part of the plan, and no part of what was proved
  assert.equal(spex(repo, 'start', 'review', DIR).code, 0, 'the proof of implement still holds');
});
