// `spex check`: the valid fixtures pass, and one broken copy per rule fails with its own code.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { parse, stringify } from 'yaml';
import { codes, gitIn, makeRepo, spex } from './helpers.mjs';

const REQ = 'specs/007-csv-export/requirements.yaml';
const TASKS = 'specs/007-csv-export/tasks.yaml';
const TESTS = 'specs/007-csv-export/tests.yaml';

const load = (dir, rel) => parse(readFileSync(join(dir, rel), 'utf8'), { schema: 'core' });
const save = (dir, rel, data) => {
  mkdirSync(join(dir, rel, '..'), { recursive: true });
  writeFileSync(join(dir, rel), stringify(data, { lineWidth: 0 }));
};

test('the README example is a clean spec', () => {
  const dir = makeRepo('csv-export');
  const r = spex(dir, 'check');
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(codes(r).filter((c) => !['REQ-QUESTION-OPEN'].includes(c)), []);
});

test('nex FEAT-142 converted is clean apart from one-duty warnings', () => {
  const dir = makeRepo('guest-checkout');
  const r = spex(dir, 'check');
  assert.equal(r.code, 0, r.stdout);
  const errors = r.json.findings.filter((f) => f.severity === 'error' || f.severity === 'gap');
  assert.deepEqual(errors, []);
  assert.ok(codes(r).every((c) => ['REQ-ONE-DUTY', 'REQ-ONE-SHALL', 'TASK-POINTER'].includes(c)), codes(r).join(','));
  // the migrated plan: one script per scenario, one shell test per task that had verify commands
  const tests = parse(readFileSync(join(dir, 'specs/FEAT-142-guest-checkout/tests.yaml'), 'utf8'), { schema: 'core' }).tests;
  assert.equal(tests.filter((t) => t.driver === 'shell').length, 4);
  assert.ok(tests.every((t) => t.kind === 'script'));
});

test('the cross-feature depends-on target is found on disk', () => {
  const dir = makeRepo('guest-checkout');
  const r = spex(dir, 'index');
  assert.ok(r.json.records.some((x) => x.id === 'REQ-CHECKOUT-004' && x.status === 'built'));
});

/** Each row: a rule code, the expected exit, and a mutation of the repo that must trigger it. */
const BROKEN = [
  ['REQ-YAML', 4, (d) => writeFileSync(join(d, REQ), 'feature: [\n')],
  ['REQ-SCHEMA', 4, (d) => mutReq(d, (f) => delete f.goal)],
  ['REQ-SCHEMA', 4, (d) => writeFileSync(join(d, REQ), readFileSync(join(d, REQ), 'utf8').replace('feature: "007"', 'feature: 007'))],
  ['REQ-ID', 4, (d) => mutReq(d, (f) => (f.requirements[1].id = 'REQ-007-001'))],
  ['REQ-ID', 4, (d) => mutReq(d, (f) => (f.requirements[1].id = 'REQ-008-002'))],
  ['REQ-EARS', 4, (d) => mutReq(d, (f) => (f.requirements[0].text = 'The CLI writes every open task to stdout as CSV when asked.'))],
  ['REQ-EARS', 4, (d) => mutReq(d, (f) => (f.requirements[0].text = 'The CLI shall write every open task to stdout as CSV.'))],
  ['REQ-UBIQ-COND', 4, (d) => mutReq(d, (f) => Object.assign(f.requirements[0], { type: 'ubiquitous', text: 'The CLI shall write every open task to stdout when the user asks for CSV.' }))],
  ['REQ-ONE-SHALL', 0, (d) => mutReq(d, (f) => (f.requirements[0].text = 'When a user runs the export, the CLI shall write CSV to stdout and the CLI shall exit with code 0.'))],
  ['REQ-ONE-DUTY', 0, (d) => mutReq(d, (f) => (f.requirements[0].text = 'When a user runs the export, the CLI shall write CSV to stdout and delete the temporary file.'))],
  ['REQ-BANNED', 4, (d) => mutReq(d, (f) => (f.requirements[0].text = 'When a user runs the export, the CLI shall write the CSV to stdout fast.'))],
  ['REQ-MEASURE', 4, (d) => mutReq(d, (f) => (f.requirements[0].text = 'When a user runs the export, the CLI shall write the CSV to stdout within 200 ms.'))],
  ['REQ-SCENARIO', 4, (d) => mutReq(d, (f) => (f.requirements[0].acceptance[0].then = 'ok'))],
  ['REQ-SCENARIO', 4, (d) => mutReq(d, (f) => (f.requirements[0].acceptance[0].given = '   '))],
  ['REQ-PLACEHOLDER', 4, (d) => mutReq(d, (f) => (f.requirements[0].text = 'When a user runs the export, the CLI shall write TBD to stdout.'))],
  ['REQ-PLACEHOLDER', 4, (d) => mutReq(d, (f) => (f.requirements[0].text = 'When a user runs the export, the CLI shall write <the rows> to stdout.'))],
  ['REQ-REL-TARGET', 4, (d) => mutReq(d, (f) => (f.requirements[0].relationships = [{ type: 'depends-on', target: 'REQ-999-001' }]))],
  ['REQ-SCHEMA', 4, (d) => mutReq(d, (f) => (f.requirements[0].verification = { mode: 'implementation-aware', method: 'test' }))], // format 1's field: the proof lives in tests.yaml now
  ['REQ-INTERFACE', 4, (d) => mutReq(d, (f) => (f.requirements[0].applies_to = ['nope']))],
  ['REQ-INTERFACE', 4, (d) => mutReq(d, (f) => (f.interfaces[0].contract = 'contracts/missing.md'))],
  ['REQ-SCOPE', 0, (d) => mutReq(d, (f) => (f.requirements[0].scope = 'exports'))],
  ['REQ-QUESTION-OPEN', 0, (d) => mutReq(d, (f) => delete f.questions[0].answer)],
  ['REQ-SUPERSEDE-DUP', 4, (d) => {
    for (const n of ['008', '009']) {
      const f = load(d, REQ);
      f.feature = n;
      f.slug = `again-${n}`;
      f.requirements = [{ ...f.requirements[0], id: `REQ-${n}-001`, relationships: [{ type: 'supersedes', target: 'REQ-007-001' }] }];
      save(d, `specs/${n}-again-${n}/requirements.yaml`, f);
    }
  }],
  ['TASK-SCHEMA', 4, (d) => mutTasks(d, (f) => delete f.tasks[0].title)],
  ['TASK-SCHEMA', 4, (d) => mutTasks(d, (f) => (f.tasks[0].verify = ['npm test']))], // format 1's field: a task's proof is a test in tests.yaml now
  ['TASK-PERSON', 4, (d) => mutTasks(d, (f) => (f.tasks[0].instructions += '\nAsk the user for the go-ahead before the live run.'))],
  ['TASK-PERSON', 4, (d) => {
    writeFileSync(join(d, '.spex/config.yaml'), `${readFileSync(join(d, '.spex/config.yaml'), 'utf8')}people: [Lukas]\n`);
    mutTasks(d, (f) => (f.tasks[0].done_when = 'The export runs and Lukas merges the request.'));
  }],
  ['TASK-DEP', 4, (d) => mutTasks(d, (f) => (f.tasks[1].depends_on = ['T99']))],
  ['TASK-DEP', 4, (d) => mutTasks(d, (f) => (f.tasks[0].depends_on = ['T02']))],
  ['TASK-REQ', 4, (d) => mutTasks(d, (f) => (f.tasks[0].requirements = ['REQ-007-999']))],
  ['TASK-COVERAGE', 5, (d) => mutTasks(d, (f) => f.tasks.splice(1, 1))],
  ['TASK-PROTECTED', 4, (d) => mutTasks(d, (f) => f.tasks[0].paths.push('specs/007-csv-export/tasks.yaml'))],
  ['TASK-PROTECTED', 4, (d) => mutTasks(d, (f) => f.tasks[0].paths.push('tests/acceptance/export.test.mjs'))],
  ['TASK-PROTECTED', 4, (d) => mutTasks(d, (f) => f.tasks[0].paths.push('.spex/config.yaml'))], // the checks a task is graded by
  ['TASK-PROTECTED', 4, (d) => {
    writeFileSync(join(d, '.spex/config.yaml'), `${readFileSync(join(d, '.spex/config.yaml'), 'utf8')}drivers: {playwright: {cmd: 'npx playwright test --grep "{ids}"', dir: tests/e2e}}\n`);
    mutTasks(d, (f) => f.tasks[0].paths.push('tests/e2e/export.spec.ts')); // a driver's folder is a test folder
  }],
  ['SPEC-POINTER', 4, (d) => { const f = load(d, REQ); f.spec = 'docs/nowhere.md'; save(d, REQ, f); }],
  ['SPEC-SECTIONS', 0, (d) => writeFileSync(join(d, 'specs/007-csv-export/spec.md'), '# CSV export\n\n## Why\nwords\n\n## What\n<!-- only the hint, which does not count -->\n')],
  ['CONFIG-FORMAT', 4, (d) => writeFileSync(join(d, '.spex/config.yaml'), readFileSync(join(d, '.spex/config.yaml'), 'utf8').replace('format: 2', 'format: 99'))], // a newer repo than this script
  ['SPEC-SHAPING', 0, (d) => writeFileSync(join(d, 'specs/007-csv-export/spec.md'), `---\nstatus: shaping\n---\n${readFileSync(join(d, 'specs/007-csv-export/spec.md'), 'utf8')}`)], // the person has not said done
  ['TASK-PARALLEL', 4, (d) => mutTasks(d, (f) => {
    delete f.tasks[1].depends_on;
    f.tasks[0].parallel_group = 'g';
    f.tasks[1].parallel_group = 'g';
  })],
  ['TASK-CONTEXT', 4, (d) => mutTasks(d, (f) => (f.tasks[0].context = ['src/nowhere.ts']))],
  ['TASK-CONTEXT', 4, (d) => mutTasks(d, (f) => (f.tasks[0].context = ['src/store/TaskStore.ts:90-140']))],
  ['TASK-CONTEXT', 4, (d) => {
    writeFileSync(join(d, 'src/big.ts'), 'x'.repeat(30 * 1024));
    mutTasks(d, (f) => (f.tasks[0].context = ['src/big.ts']));
  }],
  ['TASK-DONE-WHEN', 4, (d) => mutTasks(d, (f) => (f.tasks[0].done_when = ''))],
  ['TASK-LIMITS', 4, (d) => mutTasks(d, (f) => (f.tasks[0].paths = Array.from({ length: 13 }, (_, i) => `src/f${i}.ts`)))],
  ['TASK-LIMITS', 4, (d) => mutTasks(d, (f) => (f.tasks[0].instructions = 'x '.repeat(900)))],
  ['TASK-LIMITS', 4, (d) => mutTasks(d, (f) => (f.approach = 'y '.repeat(700)))],
  ['TASK-POINTER', 0, (d) => mutTasks(d, (f) => (f.tasks[0].instructions += '\nSee src/elsewhere/helper.ts for the shape.'))],
  ['TASK-POINTER', 0, (d) => mutTasks(d, (f) => (f.tasks[0].instructions += '\nFollow D7.'))],
  ['TASK-CONSUMES', 0, (d) => mutTasks(d, (f) => (f.tasks[1].interfaces.consumes = ['nothingProducesThis(): void']))],
  ['TASK-DESIGN', 4, (d) => mutTasks(d, (f) => (f.tasks[0].design = ['E9']))],
  ['TEST-SCHEMA', 4, (d) => mutTests(d, (f) => (f.tests[0].kind = 'manual'))],
  ['TEST-ID', 4, (d) => mutTests(d, (f) => (f.tests[1].id = 'TS01'))],
  ['TEST-FEATURE', 4, (d) => mutTests(d, (f) => (f.feature = '008'))],
  ['TEST-COVERS', 4, (d) => mutTests(d, (f) => (f.tests[0].covers = ['REQ-007-001/AC-9']))],
  ['TEST-COVERS', 4, (d) => mutTests(d, (f) => (f.tests[0].covers = ['T09']))],
  ['TEST-COVERS', 4, (d) => mutTests(d, (f) => (f.tests[0].covers = ['REQ-007-009']))],
  ['TEST-NAME', 4, (d) => mutTests(d, (f) => delete f.tests[0].name)],
  ['TEST-NAME', 4, (d) => mutTests(d, (f) => (f.tests[0].name = 'REQ_007_002_AC_1_wrong_prefix'))],
  ['TEST-NAME', 4, (d) => mutTests(d, (f) => (f.tests[1].name = f.tests[0].name))],
  ['TEST-FILE', 4, (d) => mutTests(d, (f) => (f.tests[0].name = 'REQ_007_001_AC_1_not_in_the_file'))],
  ['TEST-FILE', 0, (d) => mutTests(d, (f) => (f.tests[0].file = 'tests/acceptance/later.test.mjs'))], // not written yet: an info
  ['TEST-DRIVER', 4, (d) => mutTests(d, (f) => (f.tests[0].driver = 'playwright'))],
  ['TEST-SESSION-WHY', 4, (d) => mutTests(d, (f) => f.tests.push({ id: 'TS03', covers: ['REQ-007-001'], kind: 'session', driver: 'browser', steps: ['open the export'], expect: ['two rows'] }))],
  ['TEST-TOUCHES', 4, (d) => mutTests(d, (f) => (f.tests[0].touches = ['github:acme/playground']))],
  ['TEST-PERSON', 4, (d) => mutTests(d, (f) => (f.tests[0].steps = ['ask the user to merge the request by hand']))],
  ['TEST-PERSON', 4, (d) => mutTests(d, (f) => (f.tests[0].expect = ["the run waits for a person's yes"]))],
  ['TEST-COVER', 5, (d) => mutTests(d, (f) => f.tests.splice(1, 1))], // the scenario and T02 lose their proof
  ['TEST-COVER', 5, (d) => mutTasks(d, (f) => f.tasks.push({ id: 'T03', title: 'Wire the config map', kind: 'setup', paths: ['src/config.ts'], instructions: 'add the map', done_when: 'the map is read', status: 'todo' }))], // a setup task with no record and no test
  ['TEST-MISSING', 0, (d) => rmSync(join(d, TESTS))],
  ['TEST-RETIRED', 0, (d) => mutReq(d, (f) => (f.requirements[1].status = 'retired'))],
  ['TEST-STALE', 0, (d) => {
    const old = load(d, REQ);
    old.feature = '006';
    old.slug = 'old-export';
    old.requirements = [{ ...old.requirements[0], id: 'REQ-006-001', status: 'built' }];
    save(d, 'specs/006-old-export/requirements.yaml', old);
    writeFileSync(join(d, 'tests/acceptance/old.test.mjs'), "import test from 'node:test'; test('REQ_006_001_AC_1_old', () => {});\n");
    mutReq(d, (f) => (f.requirements[0].relationships = [{ type: 'supersedes', target: 'REQ-006-001' }]));
  }],
  ['REQ-DEP-SUPERSEDED', 0, (d) => {
    // 006 is built; 007 depends on it; 008 supersedes it: 007 builds on behavior that is being replaced
    const old = load(d, REQ);
    old.feature = '006';
    old.slug = 'old-export';
    old.requirements = [{ ...old.requirements[0], id: 'REQ-006-001', status: 'built' }];
    save(d, 'specs/006-old-export/requirements.yaml', old);
    mutReq(d, (f) => (f.requirements[0].relationships = [{ type: 'depends-on', target: 'REQ-006-001' }]));
    const next = load(d, REQ);
    next.feature = '008';
    next.slug = 'new-export';
    next.requirements = [{ ...next.requirements[0], id: 'REQ-008-001', relationships: [{ type: 'supersedes', target: 'REQ-006-001' }] }];
    save(d, 'specs/008-new-export/requirements.yaml', next);
  }],
  ['REQ-AGENT-EVIDENCE', 0, (d) => mutReq(d, (f) => (f.questions[0].by = 'agent'))], // an agent's answer without the evidence it rests on
  ['SPEC-DEPENDS', 4, (d) => writeFileSync(join(d, 'specs/007-csv-export/spec.md'), `---\nstatus: ready\ndepends_on: [099-nowhere]\n---\n${readFileSync(join(d, 'specs/007-csv-export/spec.md'), 'utf8')}`)],
  ['SPEC-CYCLE', 4, (d) => {
    writeFileSync(join(d, 'specs/007-csv-export/spec.md'), `---\nstatus: ready\ndepends_on: [008-again]\n---\n${readFileSync(join(d, 'specs/007-csv-export/spec.md'), 'utf8')}`);
    mkdirSync(join(d, 'specs/008-again'));
    writeFileSync(join(d, 'specs/008-again/spec.md'), '---\nstatus: planned\nroadmap: r\nstep: 2\ndepends_on: [007-csv-export]\n---\n# Again\n\n## Why\nw\n\n## What\nw\n\n## Not this\nw\n');
  }],
  ['SPEC-SOURCE', 0, (d) => writeFileSync(join(d, 'specs/007-csv-export/spec.md'), `---\nstatus: ready\nsource: ["docs/gone.md#1"]\n---\n${readFileSync(join(d, 'specs/007-csv-export/spec.md'), 'utf8')}`)],
  ['SPEC-PLANNED', 0, (d) => {
    mkdirSync(join(d, 'specs/008-step'));
    writeFileSync(join(d, 'specs/008-step/spec.md'), '---\nstatus: planned\nroadmap: r\nstep: 2\ndepends_on: [007-csv-export]\n---\n# Step\n\n## Why\nw\n\n## What\nw\n\n## Not this\nw\n');
  }],
  ['FILE-SIZE', 0, (d) => writeFileSync(join(d, '.spex/config.yaml'), readFileSync(join(d, '.spex/config.yaml'), 'utf8').replace('file_kb: 40', 'file_kb: 1'))],
  ['CONFIG-SCHEMA', 4, (d) => writeFileSync(join(d, '.spex/config.yaml'), 'acceptance_dir: tests/acceptance\nmystery: 1\n')],
];

function mutReq(dir, fn) {
  const f = load(dir, REQ);
  fn(f);
  save(dir, REQ, f);
}
function mutTasks(dir, fn) {
  const f = load(dir, TASKS);
  fn(f);
  save(dir, TASKS, f);
}
function mutTests(dir, fn) {
  const f = load(dir, TESTS);
  fn(f);
  save(dir, TESTS, f);
}

for (const [code, exit, mutate] of BROKEN) {
  test(`broken copy → ${code}`, () => {
    const dir = makeRepo('csv-export');
    mutate(dir);
    const r = spex(dir, 'check');
    assert.ok(codes(r).includes(code), `expected ${code}, got ${codes(r).join(', ') || 'nothing'}\n${r.stdout}${r.stderr}`);
    assert.equal(r.code, exit, `exit for ${code}`);
  });
}

test('an agent answer with its evidence is clean, and archive and lessons show it next to the default answers', () => {
  const dir = makeRepo('csv-export');
  mutReq(dir, (f) => {
    f.questions[0].by = 'agent';
    f.questions[0].evidence = 'docs/design.md#4.2 "archived lists are read only"';
    f.questions[0].confidence = 'medium';
  });
  const r = spex(dir, 'check');
  assert.equal(r.code, 0, r.stdout);
  assert.ok(!codes(r).includes('REQ-AGENT-EVIDENCE'), codes(r).join(','));
  const lessons = spex(dir, 'show', 'specs/007-csv-export', '--lessons');
  assert.match(lessons.stdout, /answered by the decider agent \(from evidence\)/);
  assert.match(lessons.stdout, /Q1 .* → A \(medium: docs\/design\.md#4\.2/);
});

test('--base freezes approved records that exist at the ref', () => {
  const dir = makeRepo('csv-export');
  mutReq(dir, (f) => f.requirements.forEach((r) => (r.status = 'approved')));
  gitIn(dir, ['commit', '-qam', 'approved']);
  mutReq(dir, (f) => (f.requirements[0].text = 'When a user runs `todo export --csv`, the CLI shall write every open task of every list to stdout as RFC 4180 CSV.'));
  const r = spex(dir, 'check', '--base', 'HEAD');
  assert.ok(codes(r).includes('REQ-FROZEN'), codes(r).join(','));
  assert.equal(r.code, 4);
  const clean = spex(dir, 'check');
  assert.ok(!codes(clean).includes('REQ-FROZEN'), 'without --base nothing is frozen');
});
