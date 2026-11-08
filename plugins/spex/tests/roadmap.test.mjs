// A roadmap as a whole: the design's outline, the roadmap file and its coverage table, the names each step uses
// and brings, and the drop of a step a re-cut removes. Each test is one real failure seen in a roadmap round.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { codes, makeRepo, spex } from './helpers.mjs';

const DESIGN_MD = `# Spec 03: what is left

## 0. Read this first

Context only.

## 1. Where we stand

## 2. The features

### 2.1 The record

### 2.2 Stop

\`\`\`yaml
# not a heading: inside a fence
\`\`\`

### 2.3 Brains

## Phase 6: the proof

## 3. Sources
`;

const DESIGN_HTML = `<h1>NEX</h1>
<h2>Overview</h2>
<h3 id="labels">1.4 Labels &amp; commands</h3>
<h2>Cycle 3</h2>
<h3 id="c3-deploy">5.2 Deploy</h3>
<h4 id="envs">5.2.1 Declared once</h4>
<h4 id="red-deploy">5.2.4 When the deploy is red</h4>
<h3 id="c3-promote">5.5 Promote &#x2192; main&#8230;</h3>
`;

/** A repo with the design files and a three-step roadmap `r`: 008 shaping, 009 and 010 planned. */
function roadmapRepo() {
  const repo = makeRepo('csv-export');
  mkdirSync(join(repo, 'docs'));
  writeFileSync(join(repo, 'docs/design.md'), DESIGN_MD);
  writeFileSync(join(repo, 'docs/design.html'), DESIGN_HTML);
  assert.equal(spex(repo, 'new', 'record', '--shaping', '--roadmap', 'r', '--step', '1', '--source', 'docs/design.md#2.1').code, 0);
  assert.equal(spex(repo, 'new', 'stop', '--planned', '--roadmap', 'r', '--step', '2', '--depends-on', '008', '--source', 'docs/design.md#2.2').code, 0);
  assert.equal(spex(repo, 'new', 'brains', '--planned', '--roadmap', 'r', '--step', '3', '--depends-on', '008', '--source', 'docs/design.md#2.3').code, 0);
  return repo;
}

const specPath = (repo, dir) => join(repo, 'specs', dir, 'spec.md');
const setSection = (repo, dir, title, body) => {
  const path = specPath(repo, dir);
  const text = readFileSync(path, 'utf8');
  const re = new RegExp(`## ${title}\\n[\\s\\S]*?(?=\\n## |$)`);
  writeFileSync(path, re.test(text) ? text.replace(re, `## ${title}\n\n${body}\n`) : `${text}\n## ${title}\n\n${body}\n`);
};

test('outline: the sections of a Markdown and an HTML design, with the anchors a source names', () => {
  const repo = roadmapRepo();
  const r = spex(repo, 'outline', 'docs/design.md', 'docs/design.html');
  assert.equal(r.code, 0, r.stdout);
  const [md, html] = r.json.files;
  // a heading inside a code fence is no section; a number is an alias; the title is the parent of all
  assert.deepEqual(md.sections.map((s) => [s.anchor, s.aliases, s.parent]), [
    ['spec-03-what-is-left', [], null],
    ['0-read-this-first', ['0'], 'spec-03-what-is-left'],
    ['1-where-we-stand', ['1'], 'spec-03-what-is-left'],
    ['2-the-features', ['2'], 'spec-03-what-is-left'],
    ['21-the-record', ['2.1'], '2-the-features'],
    ['22-stop', ['2.2'], '2-the-features'],
    ['23-brains', ['2.3'], '2-the-features'],
    ['phase-6-the-proof', [], 'spec-03-what-is-left'],
    ['3-sources', ['3'], 'spec-03-what-is-left'],
  ]);
  // HTML: only headings with an id; one without an id still closes the sections above it
  assert.deepEqual(html.sections.map((s) => [s.anchor, s.parent, s.title]), [
    ['labels', null, '1.4 Labels & commands'],
    ['c3-deploy', null, '5.2 Deploy'],
    ['envs', 'c3-deploy', '5.2.1 Declared once'],
    ['red-deploy', 'c3-deploy', '5.2.4 When the deploy is red'],
    ['c3-promote', null, '5.5 Promote → main…'],
  ]);
  assert.ok(r.json.text.includes('  #2.1  2.1 The record'), r.json.text);
  assert.equal(spex(repo, 'outline', 'docs/none.md').code, 2);
});

test('roadmap --init writes one empty row per section; --coverage names every gap nobody chose', () => {
  const repo = roadmapRepo();
  // without the file, the roadmap list says so
  assert.ok(codes(spex(repo, 'roadmap', 'r')).includes('ROADMAP-FILE'));
  let r = spex(repo, 'roadmap', 'r', '--init', '--source', 'docs/design.md');
  assert.equal(r.code, 0, r.stdout);
  const file = join(repo, 'specs/r.roadmap.md');
  const skeleton = readFileSync(file, 'utf8');
  assert.ok(skeleton.startsWith('---\nroadmap: r\ndesign: ["docs/design.md"]\n---\n# Roadmap r\n'), skeleton);
  for (const h of ['## Idea', '## Order', '## Coverage', '## Outside', '## Decisions']) assert.ok(skeleton.includes(h), h);
  // the title is no row; the top two levels are, numbered as a source names them
  assert.ok(skeleton.includes('| docs/design.md#0 0. Read this first | | |') && skeleton.includes('| docs/design.md#2.1 ↳ 2.1 The record | | |') && skeleton.includes('| docs/design.md#phase-6-the-proof Phase 6: the proof | | |'), skeleton);
  assert.equal(spex(repo, 'roadmap', 'r', '--init', '--source', 'docs/design.md').code, 6, 'a second --init refuses');
  // an empty Where is an error on every row
  r = spex(repo, 'roadmap', 'r', '--coverage');
  assert.equal(r.code, 4);
  assert.ok(r.json.findings.filter((f) => f.code === 'ROADMAP-ROW').length >= 8, r.stdout);

  // a table with each kind of mistake
  const table = (rows) => writeFileSync(file, readFileSync(file, 'utf8').replace(/\| Section \| Where \| Why \|\n\|:--\|:--\|:--\|\n[\s\S]*?\n\n## Outside/, `| Section | Where | Why |\n|:--|:--|:--|\n${rows.join('\n')}\n\n## Outside`));
  table([
    '| docs/design.md#0 | context | how to read the rest |',
    '| docs/design.md#2.1 The record | 008-record | |',
    '| docs/design.md#2.2 | not planned | |', // no reason
    '| docs/design.md#phase-6 | 008-record | |', // a slug prefix names the section; 008 does not cite it
    '| docs/design.md#9.9 | built | spec 1 |', // no such section
    '| docs/design.md#1 | 042-nowhere | |', // no such step
  ]);
  r = spex(repo, 'roadmap', 'r', '--coverage');
  assert.equal(r.code, 4, r.stdout);
  assert.ok(r.json.findings.some((f) => f.code === 'ROADMAP-WHY' && f.message.includes('#2.2')), r.stdout);
  assert.ok(r.json.findings.some((f) => f.code === 'ROADMAP-ROW' && f.message.includes('#9.9 is no section')), r.stdout);
  assert.ok(r.json.findings.some((f) => f.code === 'ROADMAP-STEP' && f.message.includes('042-nowhere')), r.stdout);
  // the gaps: 2.3 and section 3 have no row; 2.2 has one (not planned), so it is no gap, only a missing reason
  assert.deepEqual(r.json.uncovered.map((u) => u.anchor).sort(), ['2.3', '3']);
  // 009 and 010 cover nothing; 008 covers phase 6 without citing it
  assert.deepEqual(r.json.findings.filter((f) => f.code === 'ROADMAP-IDLE').map((f) => f.path).sort(), ['specs/009-stop', 'specs/010-brains']);
  assert.ok(r.json.findings.some((f) => f.code === 'ROADMAP-SOURCE' && f.message.includes('008-record covers docs/design.md#phase-6-the-proof')), r.stdout);
  // HTML cites the id, so the link works; the section number still resolves
  assert.ok(spex(repo, 'outline', 'docs/design.html').json.text.includes('  #envs  5.2.1 Declared once'));

  // fixed: a parent row covers its children, a whole-file row covers a file, every step covers what it cites
  writeFileSync(join(repo, 'docs/old.md'), '# Spec 01\n\n## Phase 1\n\n## Phase 2\n');
  writeFileSync(file, readFileSync(file, 'utf8').replace('design: ["docs/design.md"]', 'design: ["docs/design.md", "docs/old.md"]'));
  table([
    '| docs/design.md#0 | context | how to read the rest |',
    '| docs/design.md#1 | built | spec 02, phases 1 to 3 |',
    '| docs/design.md#2.1 | 008-record | |',
    '| docs/design.md#2.2 | 009-stop | |',
    '| docs/design.md#2.3 | 010-brains | |',
    '| docs/design.md#phase-6 | not planned | waits for a second use case (Lukas, 8 Nov) |',
    '| docs/design.md#3 | context | the sources |',
    '| docs/old.md | built | every phase is done |',
  ]);
  r = spex(repo, 'roadmap', 'r', '--coverage');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.uncovered, []);
  assert.equal(r.json.sections, 12);
  assert.deepEqual(codes(r), []);
  assert.deepEqual(codes(spex(repo, 'roadmap', 'r')), [], 'the file exists now');
});

test('Uses and Introduces: a name comes from a step it depends on, which lists it; one name, one step', () => {
  const repo = roadmapRepo();
  setSection(repo, '008-record', 'Introduces', '- `brain_hash`: the hash of a brain\n- `recipe`: the hash of what decides a score');
  setSection(repo, '008-record', 'Uses', 'None.');
  setSection(repo, '009-stop', 'Introduces', '- `stopped`: the state of a stopped run');
  setSection(repo, '009-stop', 'Uses', '- `brain_hash` ← 008-record');
  // 010 uses a name from 009, which it does not depend on; one 009 never lists; one with no source
  setSection(repo, '010-brains', 'Introduces', '- `catalog`: every brain\n- `stopped`: again');
  setSection(repo, '010-brains', 'Uses', '- `stopped` ← 009-stop\n- `best_brain` ← 009-stop\n- `recipe`\n- `AutoMerge` ← built (spec 23)\n- `brain_hash` ← 008-record');
  let r = spex(repo, 'check', 'specs/010-brains');
  assert.equal(r.code, 4, r.stdout);
  const msg = (code) => r.json.findings.filter((f) => f.code === code).map((f) => f.message).join(' | ');
  assert.ok(msg('USES-DEPENDS').includes('`stopped` from 009-stop, which 010-brains does not depend on'), r.stdout);
  assert.ok(msg('USES-INTRODUCES').includes('`best_brain` from 009-stop, which does not list it'), r.stdout);
  assert.ok(msg('USES-FROM').includes('`recipe` says no source'), r.stdout);
  assert.ok(msg('INTRODUCES-TWICE').includes('009-stop introduces `stopped` too'), r.stdout);
  assert.ok(!msg('USES-DEPENDS').includes('brain_hash') && !msg('USES-INTRODUCES').includes('AutoMerge'), 'a built name and a name from a dependency pass');
  // fixed: 010 depends on 009 (and through it on 008), uses only what 009 lists, brings only its own name
  writeFileSync(specPath(repo, '010-brains'), readFileSync(specPath(repo, '010-brains'), 'utf8').replace('depends_on: [008-record]', 'depends_on: [009-stop]'));
  setSection(repo, '010-brains', 'Introduces', '- `catalog`: every brain');
  setSection(repo, '010-brains', 'Uses', '- `stopped` ← 009-stop\n- `recipe` ← 008-record\n- `AutoMerge` ← built (spec 23)\n- `Brains page` ← outside (forks/odh-dashboard, after its board)');
  r = spex(repo, 'check', 'specs/010-brains');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(codes(r).filter((c) => /^(USES|INTRODUCES)/.test(c)), []);
  // a step that brings too much warns, at the limit the config sets
  writeFileSync(join(repo, '.spex/config.yaml'), readFileSync(join(repo, '.spex/config.yaml'), 'utf8').replace('verify_minutes: 2}', 'verify_minutes: 2, step_introduces: 1}'));
  assert.ok(codes(spex(repo, 'check', 'specs/008-record')).includes('SPEC-SIZE'));
  assert.ok(!codes(spex(repo, 'check', 'specs/010-brains')).includes('SPEC-SIZE'));
});

test('a stub tags each design bullet and names steps by folder, never by a number a re-cut gives away', () => {
  const repo = roadmapRepo();
  setSection(repo, '010-brains', 'From the design', '- one catalog of brains (#2.3) [new]\n- `runs:/<run>/brain` on an evaluation (#2.3) [built: spec 02]\n- the Brains page (#2.3)');
  let r = spex(repo, 'check', 'specs/010-brains');
  assert.ok(r.json.findings.find((f) => f.code === 'SPEC-TAG')?.message.includes('1 bullet(s)'), r.stdout);
  setSection(repo, '010-brains', 'From the design', '- one catalog of brains (#2.3) [new]\n- the Brains page (#2.3) [changes: spec 02, the placeholder]');
  assert.ok(!codes(spex(repo, 'check', 'specs/010-brains')).includes('SPEC-TAG'));
  // a bare number, a folder that does not exist, and history said as history
  setSection(repo, '010-brains', 'Not this', '- no Stop: step 041.\n- no pages: 099-pages does that.\n- carried from the deleted 098-old-brains.\n- uses 009-stop, and ADR-043-a-release-belongs is a file name.');
  r = spex(repo, 'check', 'specs/010-brains');
  const refs = r.json.findings.filter((f) => f.code === 'SPEC-STEPREF').map((f) => f.message);
  assert.equal(refs.length, 2, refs.join('\n'));
  assert.ok(refs[0].endsWith('by number only: 041'), refs[0]);
  assert.ok(refs[1].endsWith('do not exist: 099-pages'), refs[1]);
});

test('drop: a step a re-cut removes goes to .spex/archive with its work and the reason; a live contract is refused', () => {
  const repo = roadmapRepo();
  mkdirSync(join(repo, '.spex/runs/010'), { recursive: true });
  writeFileSync(join(repo, '.spex/runs/010/block-T01.json'), '{"task":"T01"}');
  mkdirSync(join(repo, '.spex/review'), { recursive: true });
  writeFileSync(join(repo, '.spex/review/010-1.findings.yaml'), 'findings: []\n');
  writeFileSync(join(repo, '.spex/review/007-1.findings.yaml'), 'findings: []\n');
  assert.equal(spex(repo, 'new', 'pages', '--planned', '--roadmap', 'r', '--step', '4', '--depends-on', '010').code, 0);
  assert.equal(spex(repo, 'roadmap', 'r', '--init', '--source', 'docs/design.md').code, 0);
  const file = join(repo, 'specs/r.roadmap.md');
  writeFileSync(file, readFileSync(file, 'utf8').replace('| docs/design.md#2.3 ↳ 2.3 Brains | | |', '| docs/design.md#2.3 ↳ 2.3 Brains | 010-brains | |'));
  assert.equal(spex(repo, 'drop', 'specs/010-brains').code, 2, 'a reason is needed');
  const r = spex(repo, 'drop', 'specs/010-brains', '--reason', 'the re-cut of 8 Nov folds Brains into 009-stop');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(!existsSync(join(repo, 'specs/010-brains')));
  const dest = join(repo, r.json.archive);
  assert.ok(r.json.archive.startsWith('.spex/archive/010-brains-'), r.json.archive);
  assert.ok(existsSync(join(dest, 'spec/spec.md')) && existsSync(join(dest, 'runs/block-T01.json')) && existsSync(join(dest, 'review/010-1.findings.yaml')));
  assert.ok(existsSync(join(repo, '.spex/review/007-1.findings.yaml')), "another step's review stays");
  assert.ok(readFileSync(join(dest, 'DROPPED.md'), 'utf8').includes('- reason: the re-cut of 8 Nov folds Brains into 009-stop'));
  assert.ok(r.json.findings.some((f) => f.code === 'DROP-DEPENDED' && f.message.startsWith('011-pages')), r.stdout);
  assert.ok(r.json.findings.some((f) => f.code === 'DROP-ROWS'), r.stdout);
  // the fixture's 007 has records; approved, they are the live contract
  const req = join(repo, 'specs/007-csv-export/requirements.yaml');
  writeFileSync(req, readFileSync(req, 'utf8').replace(/status: draft/g, 'status: approved'));
  const live = spex(repo, 'drop', 'specs/007-csv-export', '--reason', 'no');
  assert.equal(live.code, 6);
  assert.ok(codes(live).includes('DROP-LIVE'));
  assert.ok(existsSync(join(repo, 'specs/007-csv-export')));
});
