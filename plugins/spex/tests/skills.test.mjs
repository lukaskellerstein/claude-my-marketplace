// Design rule 5 and 6: every SKILL.md is at most 6,000 bytes, user-invoked only, and listed in the
// plugin manifest. Rule 10: no skill tells the agent to read the README.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { PLUGIN } from './helpers.mjs';

const CAP = 6000;
const skillsDir = join(PLUGIN, 'skills');
const skills = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory());

test('the plugin lists thirteen skills, each named for what it leaves behind, and bundles a browser for the tester', () => {
  const manifest = JSON.parse(readFileSync(join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8'));
  assert.deepEqual([...manifest.skills].sort(), skills.map((s) => `./skills/${s}`).sort());
  assert.deepEqual(skills.sort(), ['approve', 'clarify', 'develop', 'init', 'new', 'requirements', 'research', 'review', 'ship', 'tasks', 'tests', 'update', 'verify']);
  assert.equal(manifest.version, JSON.parse(readFileSync(join(PLUGIN, 'package.json'), 'utf8')).version, 'one version');
  const pw = manifest.mcpServers?.playwright;
  assert.ok(pw && pw.command === 'npx' && pw.args.includes('@playwright/mcp@latest') && pw.args.includes('--headless'), 'the Playwright MCP is bundled, headless');
  assert.ok(pw.args.includes('.spex/artifacts'), 'its screenshots land under .spex/, which the work gitignore covers');
});

// The seven subagents: each is small (its brief is sent once per dispatch), inherits the session's tools (LSP, MCP
// servers, other plugins) and names only what it must never do, has its own color and model, and returns a fixed shape.
// The researcher gathers facts on sonnet; the rest work from prose on the session's model. The wall: the test analyst
// plans the proof and never writes the claim or the code; the test developer writes test code and never reads the
// source; the developer builds and never edits a test; the tester performs sessions and changes nothing; the decider
// judges (test, code or spec) and fixes nothing; the reviewer reads the diff for what no test sees.
const AGENTS = {
  researcher: { denied: 'Edit, Write, NotebookEdit, Agent', model: 'sonnet', color: 'cyan', script: false, returns: [/^Sources:$/m, /^Confidence:/m, /^Not found:/m] },
  decider: { denied: 'Edit, Write, NotebookEdit, Agent', model: 'inherit', color: 'purple', script: true, returns: [/^  answer:/m, /^  evidence:/m, /^  confidence: high \| medium \| low/m, /^  needs:/m, /you change nothing/, /`LSP`/, /test, code or spec/] },
  'test-analyst': { denied: 'Agent', model: 'inherit', color: 'pink', script: true, returns: [/^STATUS: done \| blocked$/m, /^tests:/m, /^sessions:/m, /^needs:/m, /^touches:/m, /never read the source folders/, /edit\s+`tests\.yaml` and nothing else/, /SPEX show <dir> --plan/, /`TEST-PERSON`/] },
  'test-developer': { denied: 'Agent', model: 'inherit', color: 'yellow', script: true, returns: [/^STATUS: done \| blocked$/m, /^tests:/m, /^blocked:/m, /red \| mutation/, /never read the source\s+folders/, /never open `tests\.yaml`/, /Do not run `spex done`/, /--test <TS> --expect fail/] },
  developer: { denied: 'Agent', model: 'inherit', color: 'green', script: true, returns: [/^STATUS: done \| test-bug \| blocked \| too-big$/m, /^files:/m, /Do not run `spex done`/, /never a test of\s+the plan/, /`LSP`/, /SPEX gate develop/] },
  tester: { denied: 'Edit, Write, NotebookEdit, Agent', model: 'inherit', color: 'blue', script: true, returns: [/^STATUS: pass \| fail$/m, /^observed:/m, /^artifacts:/m, /browser_snapshot/, /SPEX session <dir> <TS> --result pass\|fail --observed/, /never fix anything/] },
  reviewer: { denied: 'Edit, Write, NotebookEdit, Agent', model: 'inherit', color: 'orange', script: true, returns: [/^verdict:/m, /^blocking:$/m, /You read; you change nothing/, /`LSP`/, /do not run the tests/] },
};
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']; // the ones Claude Code shows
const AGENT_CAP = 3300; // the test analyst and the decider carry the rules of the plan; the rest stay under 3000

test('the plugin ships seven subagents in agents/, each inheriting the session tools minus a denylist, with a color, a model and a fixed return shape', () => {
  // The manifest names no `agents`: Claude Code then scans agents/ itself. With the array form, `claude plugin details`
  // reported `Agents (0)` (measured on 2.1.319), so the folder scan is the one that is known to load them.
  const manifest = JSON.parse(readFileSync(join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8'));
  assert.equal(manifest.agents, undefined, 'no agents field: the default agents/ scan loads them');
  assert.deepEqual(readdirSync(join(PLUGIN, 'agents')).sort(), Object.keys(AGENTS).map((a) => `${a}.md`).sort());
  assert.equal(new Set(Object.values(AGENTS).map((a) => a.color)).size, 7, 'seven different colors');
  for (const [name, want] of Object.entries(AGENTS)) {
    const text = readFileSync(join(PLUGIN, 'agents', `${name}.md`), 'utf8');
    assert.ok(Buffer.byteLength(text, 'utf8') <= AGENT_CAP, `${name} is small`);
    const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(fm && new RegExp(`^name: ${name}$`, 'm').test(fm[1]), `${name}: name matches the file`);
    assert.ok(!/^tools:/m.test(fm[1]), `${name}: no allowlist, so LSP and MCP tools come through`);
    assert.ok(new RegExp(`^disallowedTools: ${want.denied}$`, 'm').test(fm[1]), `${name}: denylist`);
    assert.ok(new RegExp(`^model: ${want.model}$`, 'm').test(fm[1]), `${name}: model`);
    assert.ok(COLORS.includes(want.color) && new RegExp(`^color: ${want.color}$`, 'm').test(fm[1]), `${name}: a color Claude Code knows`);
    for (const re of want.returns) assert.ok(re.test(text), `${name}: ${re}`);
    assert.equal(/spex\.mjs/.test(text), want.script, `${name}: ${want.script ? 'calls' : 'never calls'} the script`);
    assert.ok(!/implementer|\/spex:implement|\/spex:archive|spex:tester`? (rewrites|with)/.test(text), `${name}: no 1.x names`);
  }
});

for (const skill of skills) {
  test(`skills/${skill}/SKILL.md is small, user-invoked only, and does not read the README`, () => {
    const file = join(skillsDir, skill, 'SKILL.md');
    const text = readFileSync(file, 'utf8');
    const size = Buffer.byteLength(text, 'utf8');
    assert.ok(size <= CAP, `${skill} is ${size} bytes, cap ${CAP}`);
    const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(fm, 'has frontmatter');
    assert.ok(new RegExp(`^name: ${skill}$`, 'm').test(fm[1]), 'name matches the folder');
    assert.ok(/^description: .{20,}/m.test(fm[1]), 'has a description');
    assert.ok(/^disable-model-invocation: true$/m.test(fm[1]), 'is user-invoked only');
    // A skill may name the project's own `README.md` as an input; it never points at "the README" of this plugin.
    assert.ok(!/README(?!\.md)/.test(text) && !/(spex|plugin|this|design) README/i.test(text), 'never points the agent at the plugin README');
    assert.ok(/spex\.mjs/.test(text), 'calls the script');
    assert.ok(!/\/spex:implement|\/spex:archive|\/spex:quick|\/spex:sync|spex:implementer|`verification`|verify commands of/.test(text), 'no 1.x command or field');
  });
}

test('the wall: the one who writes a claim never writes its proof, and no skill asks a person for a step', () => {
  const read = (s) => readFileSync(join(skillsDir, s, 'SKILL.md'), 'utf8');
  const requirements = read('requirements');
  assert.ok(/never its proof:\s+`tests\.yaml` is the test analyst's file, and you do not open it/.test(requirements), 'the analyst never opens tests.yaml');
  assert.ok(/start one `spex:test-analyst` with `<dir>\. Plan a test for every scenario spex show\s+--plan lists\.`/.test(requirements), 'requirements dispatches the test analyst for the scenarios');
  assert.ok(/no file, no tool, no person/.test(requirements), 'a scenario says what is observed, not how it is tested');
  const tasks = read('tasks');
  assert.ok(/No person is an actor\. Not "ask Lukas", not "a go-ahead", not "by hand"/.test(tasks), 'tasks bans the person step by example');
  assert.ok(/`spex:test-analyst` with `<dir>\. Plan a test for every task spex show --plan lists\.`/.test(tasks), 'tasks dispatches the test analyst for the tasks');
  assert.ok(/a setup task may have none/.test(tasks), 'requirements are optional on a setup task');
  const tests = read('tests');
  assert.ok(/start one\s+`spex:test-developer` per group, all in one message/.test(tests), 'tests dispatches test developers');
  assert.ok(/You never write or edit a test yourself, and\s+never `tests\.yaml`/.test(tests), 'the orchestrator writes nothing');
  assert.ok(/`spex:test-analyst` with `<dir> <TS>: <why>`/.test(tests), 'a blocked developer sends the record back to the analyst');
  for (const s of ['tests', 'develop', 'verify', 'review', 'ship', 'tasks', 'requirements']) assert.ok(/Never ask the user|never ask the user/i.test(read(s)) || /ask nothing/i.test(read(s)) || s === 'tasks' || s === 'requirements', `${s} never asks`);
});

test('a failing test is the process\'s to fix: develop and verify route it through the decider to the agent that owns it, never to the person', () => {
  // nex 028, T05: the implementer found an assertion that could never pass, stopped, and the feature waited for a person
  // to run /spex:tests --fix by hand. Now the decider judges test, code or spec, and the owner of that part rewrites it.
  const develop = readFileSync(join(skillsDir, 'develop', 'SKILL.md'), 'utf8');
  assert.ok(/^## A wrong test$/m.test(develop), 'develop has the shared section');
  assert.ok(/`spex:decider`, one question: `Q1 — TSnn: is the test, the code or the spec wrong\?/.test(develop), 'the decider judges first, three ways');
  assert.ok(/start one `spex:test-developer` with\s+`<dir> TSnn: <the claim>`/.test(develop), 'the test developer rewrites it');
  assert.ok(/one `spex:test-analyst` with `<dir> TSnn: <why>`/.test(develop), 'a wrong plan record goes to the test analyst');
  assert.ok(/For `test-bug`, do \*\*A wrong test\*\*/.test(develop), 'the orchestrator routes the status');
  assert.ok(/One round per task/.test(develop) && /runs\s+`\/spex:develop <dir> <task>`, which unblocks first/.test(develop), 'a loop guard, and the way back');
  assert.ok(/A `blocked` task: a person read its reason and named it, so `SPEX unblock <dir> <task>`/.test(develop), 'the skill unblocks; nobody types a script path');
  assert.ok(/SPEX done <dir> <task>`\. It runs the task's tests and `fast_checks` itself/.test(develop), 'done is the script\'s verdict');
  const verify = readFileSync(join(skillsDir, 'verify', 'SKILL.md'), 'utf8');
  assert.ok(/`SPEX verify <dir>`: round n of `verify_rounds`/.test(verify), 'verify runs the whole feature');
  assert.ok(/start one\s+`spex:tester` per session, all in one message/.test(verify), 'testers perform the sessions');
  assert.ok(/`SPEX show <dir> --verify` prints each with\s+its claim, its file, the task behind it and the tail/.test(verify), 'the decider gets the failure with its claim');
  assert.ok(/A, the test: .*`spex:test-developer`/s.test(verify) && /B, the code: append a task to `tasks\.yaml` with `kind: fix`/.test(verify) && /C, the spec: the claim is wrong/.test(verify), 'three routes');
  assert.ok(/append its id to that test's `covers` in `tests\.yaml`/.test(verify), 'a fix task is covered by the test that found it');
  assert.ok(/Past `verify_rounds`/.test(verify), 'a loop guard');
  const review = readFileSync(join(skillsDir, 'review', 'SKILL.md'), 'utf8');
  assert.ok(/`test-bug`: .*start one `spex:test-developer`/s.test(review) && /do not rerun the tests: the script proved them/.test(review), 'review routes a test-bug to the test developer and never reruns the tests');
  const ship = readFileSync(join(skillsDir, 'ship', 'SKILL.md'), 'utf8');
  assert.ok(/`SHIP-CMD` \(no `ship\.cmd`\): the close is done; a person merges/.test(ship) && /`SPEX ship <dir> --merged`/.test(ship), 'ship merges through ship.cmd or waits for a person\'s merge');
  assert.ok(/do \*\*The re-plan round\*\* below now, before the\s+commit/.test(ship), 'the lessons go into the commit that ships');
});

test('README.html, the one-picture guide, names every skill, the version, every stop and the film that moves through them', () => {
  // The page is the safety net a person opens when they lost the NEXT block, so it must not drift from the plugin.
  const html = readFileSync(join(PLUGIN, 'README.html'), 'utf8');
  const version = JSON.parse(readFileSync(join(PLUGIN, 'package.json'), 'utf8')).version;
  assert.ok(html.includes(`spex ${version}`), `the page names version ${version}`);
  for (const s of skills) assert.ok(html.includes(`/spex:${s}`), `the page names /spex:${s}`);
  for (const id of ['shape', 'approve-spec', 'analyze', 'gate1', 'plan', 'approve-tasks', 'tests', 'develop', 'verify', 'review', 'ship']) assert.ok(html.includes(`{ id: '${id}',`), `the track has the stop ${id}`);
  const steps = (html.match(/^\s+\{ ch: \d+,/gm) || []).length;
  assert.ok(steps >= 20, `the film has ${steps} steps`);
  for (const needle of ['test-bug', 'spex done', 'red first', 'stale', 'built', 'spex next', 'spex verify', 'spex session', 'tests.yaml', 'ship.cmd']) assert.ok(html.includes(needle), `the film shows ${needle}`);
  assert.ok(!/\/spex:implement|\/spex:archive|implementer/.test(html), 'no 1.x names');
  assert.ok(/<title>spex in one picture<\/title>/.test(html) && /prefers-color-scheme: light/.test(html) && /prefers-reduced-motion/.test(html), 'a title, both themes, reduced motion');
});

test('a second run of a skill is a message, not a change: each incremental skill says when there is nothing to do', () => {
  // The README table "Running a skill again" promises these lines; the script side (gate tasks, ship) is in lifecycle.test.mjs.
  const read = (s) => readFileSync(join(skillsDir, s, 'SKILL.md'), 'utf8');
  assert.ok(/"records exist": a rerun\. Add only what the spec has and the records lack; nothing\s+missing: change nothing, say so/.test(read('requirements')), 'requirements');
  assert.ok(/Nothing open and no gap you can name: change nothing, say so/.test(read('clarify')), 'clarify');
  assert.ok(/If there are none, say so and stop\./.test(read('research')), 'research');
  assert.ok(/Open with `nothing to add`: every\s+record has a task; say so/.test(read('tasks')), 'tasks');
  assert.ok(/an empty one means\s+every script has its file: go to step 6/.test(read('tests')), 'tests');
  assert.ok(/If the stage is not `develop`, print the block and stop\./.test(read('develop')), 'develop');
  assert.ok(/`ok` and no session pending: step 6/.test(read('verify')), 'verify');
  assert.ok(/It is safe to rerun: a close that happened is skipped/.test(read('ship')), 'ship');
});
