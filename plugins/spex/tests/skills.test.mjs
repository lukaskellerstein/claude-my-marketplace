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

test('the plugin lists fourteen skills, each named for what it leaves behind, and bundles a browser for the tester', () => {
  const manifest = JSON.parse(readFileSync(join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8'));
  assert.deepEqual([...manifest.skills].sort(), skills.map((s) => `./skills/${s}`).sort());
  assert.deepEqual(skills.sort(), ['approve', 'clarify', 'develop', 'fix', 'init', 'new', 'requirements', 'research', 'review', 'run-tests', 'ship', 'tasks', 'update', 'develop-tests'].sort());
  assert.equal(manifest.version, JSON.parse(readFileSync(join(PLUGIN, 'package.json'), 'utf8')).version, 'one version');
  const pw = manifest.mcpServers?.playwright;
  assert.ok(pw && pw.command === 'npx' && pw.args.includes('@playwright/mcp@latest') && pw.args.includes('--headless'), 'the Playwright MCP is bundled, headless');
  assert.ok(pw.args.includes('.spex/artifacts'), 'its screenshots land under .spex/, which the work gitignore covers');
});

// The eight subagents: each is small (its brief is sent once per dispatch), inherits the session's tools (LSP, MCP
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
  developer: { denied: 'Agent', model: 'inherit', color: 'green', script: true, returns: [/^STATUS: done \| test-bug \| blocked \| too-big \| paths$/m, /^files:/m, /^needs:/m, /Do not run `spex done`/, /never a test of\s+the plan/, /`LSP`/, /SPEX gate develop/] },
  tester: { denied: 'Edit, Write, NotebookEdit, Agent', model: 'inherit', color: 'blue', script: true, returns: [/^STATUS: pass \| fail$/m, /^observed:/m, /^artifacts:/m, /browser_snapshot/, /SPEX session <dir> <TS> --result pass\|fail --observed/, /never fix anything/] },
  reviewer: { denied: 'Edit, Write, NotebookEdit, Agent', model: 'inherit', color: 'orange', script: true, returns: [/^verdict:/m, /^blocking:$/m, /You read; you change nothing/, /`LSP`/, /do not run the tests/] },
  // round 0 of a roadmap: the agent that wrote the stubs was their only reader, and nex's stubs left out 222 names
  'roadmap-reviewer': { denied: 'Edit, Write, NotebookEdit, Agent', model: 'inherit', color: 'red', script: true, returns: [/^roadmap: <name>/m, /^  missing: #<anchor>/m, /^  tag: /m, /You read; you change nothing/, /never a verdict/, /Never judge the order, the cut or the size/, /^row: <file#anchor>/m, /every row that names no step/] },
};
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']; // the ones Claude Code shows
const AGENT_CAP = 3300; // the test analyst and the decider carry the rules of the plan; the rest stay under 3000

test('the plugin ships eight subagents in agents/, each inheriting the session tools minus a denylist, with a color, a model and a fixed return shape', () => {
  // The manifest names no `agents`: Claude Code then scans agents/ itself. With the array form, `claude plugin details`
  // reported `Agents (0)` (measured on 2.1.319), so the folder scan is the one that is known to load them.
  const manifest = JSON.parse(readFileSync(join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8'));
  assert.equal(manifest.agents, undefined, 'no agents field: the default agents/ scan loads them');
  assert.deepEqual(readdirSync(join(PLUGIN, 'agents')).sort(), Object.keys(AGENTS).map((a) => `${a}.md`).sort());
  assert.equal(new Set(Object.values(AGENTS).map((a) => a.color)).size, 8, 'eight different colors');
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
  // A lab run read "needs method: measure [changes: spec 01, which asks for a measure on a scenario]" as "the design
  // contradicts itself", asked the person, and offered an option that retired the record. The line was a decision.
  assert.ok(/Decisions, Alternatives and `\[changes: …\]` lines stay decided/.test(requirements) && /two rules in two places are no conflict/.test(requirements) && /The work a decision brings \(a\s+schema value, a fixture\) is a line under `I do this unless you say no`/.test(requirements), 'a decided change is never a question');
  const tasks = read('tasks');
  assert.ok(/No person is an actor\. Not "ask Lukas", not "a go-ahead", not "by hand"/.test(tasks), 'tasks bans the person step by example');
  assert.ok(/`spex:test-analyst` with `<dir>\. Plan a test for every task spex show --plan lists\.`/.test(tasks), 'tasks dispatches the test analyst for the tasks');
  assert.ok(/a setup task may have none/.test(tasks), 'requirements are optional on a setup task');
  const tests = read('develop-tests');
  assert.ok(/start one\s+`spex:test-developer` per group, all in one message/.test(tests), 'tests dispatches test developers');
  assert.ok(/You never write or edit a test yourself, and\s+never `tests\.yaml`/.test(tests), 'the orchestrator writes nothing');
  assert.ok(/`spex:test-analyst` with `<dir> <TS>: <why>`/.test(tests), 'a blocked developer sends the record back to the analyst');
  for (const s of ['develop-tests', 'develop', 'run-tests', 'fix', 'review', 'ship', 'tasks', 'requirements']) assert.ok(/Never ask the user|never ask the user/i.test(read(s)) || /ask nothing/i.test(read(s)) || s === 'tasks' || s === 'requirements', `${s} never asks`);
});

test('a failing test is the process\'s to fix: develop and verify route it through the decider to the agent that owns it, never to the person', () => {
  // nex 028, T05: the implementer found an assertion that could never pass, stopped, and the feature waited for a person
  // to run /spex:tests --fix by hand (the skill was named tests then). Now the decider judges test, code or spec, and the owner of that part rewrites it.
  const develop = readFileSync(join(skillsDir, 'develop', 'SKILL.md'), 'utf8');
  assert.ok(/^## A wrong test$/m.test(develop), 'develop has the shared section');
  assert.ok(/`spex:decider`, one question: `Q1 — TSnn: is the test, the code or the spec wrong\?/.test(develop), 'the decider judges first, three ways');
  assert.ok(/start one `spex:test-developer` with\s+`<dir> TSnn: <the claim>`/.test(develop), 'the test developer rewrites it');
  assert.ok(/one `spex:test-analyst` with `<dir> TSnn: <why>`/.test(develop), 'a wrong plan record goes to the test analyst');
  assert.ok(/For `test-bug`, do \*\*A wrong test\*\*/.test(develop), 'the orchestrator routes the status');
  assert.ok(/One round per task/.test(develop) && /runs\s+`\/spex:develop <dir> <task>`, which unblocks first/.test(develop), 'a loop guard, and the way back');
  assert.ok(/A `blocked` task: a person read its reason and named it, so `SPEX unblock <dir> <task>`/.test(develop), 'the skill unblocks; nobody types a script path');
  assert.ok(/SPEX done <dir> <task>`\. It runs the task's tests and `fast_checks` itself/.test(develop), 'done is the script\'s verdict');
  const verify = readFileSync(join(skillsDir, 'run-tests', 'SKILL.md'), 'utf8');
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

test('every reply is in one frame: reply.md holds it, and every skill reads it and keeps only its own content', () => {
  // agent-flywheel-os 001 and nex 029: a develop run said `STATUS: blocked` with the question in the middle of a
  // paragraph, and a shaping round said `step 2 of 29` with dot sizes and no line between questions. The person read
  // neither. One file now gives every skill the same banner, question block and order; each skill names its verdict.
  const reply = readFileSync(join(PLUGIN, 'reply.md'), 'utf8');
  assert.ok(Buffer.byteLength(reply, 'utf8') <= 4500, 'reply.md is small: every skill reads it once per run');
  // Round 0 in agent-flywheel-os picked "restore the folders you deleted" because a rule said HEAD wins, and nex
  // picked a hand-made folder because spex could not set a number. The person answers ok nearly every time, so a
  // pick is the best result for their goal, never a rule alone or a work-around, and what they did is an answer.
  // A lab run then picked "not planned" for a decision the person wrote in their design: that is an answer too.
  assert.ok(/best result for their goal/.test(reply) && /never a work-around for a missing spex feature/.test(reply) && /a decision in\s+their design\) is their answer: a pick never drops it/.test(reply), 'a pick is the best result, never a rule alone or a work-around');
  // One lab run put ❓ QUESTIONS on line 1 of a sizing reply: the verdict list must give way to the skill's own line 1.
  assert.ok(/names its own\s+line 1 for this/.test(reply), 'a skill that names its own line 1 uses it');
  assert.ok(/the\s+replies left when the skill knows them \(`reply 1 of 2`\)/.test(reply), 'the banner says how many replies are left'); 
  assert.ok(reply.includes('━'.repeat(40)) && reply.includes('─'.repeat(40)), 'a heavy rule around the banner, a light one around each question');
  for (const needle of ['👉 **Pick:', '🟥 BIG', '🟧 MEDIUM', '🟨 SMALL', '⏸ WAITING FOR YOU', '⛔ NOT STARTED', 'I do this unless you say no', 'No `STATUS:` code']) assert.ok(reply.includes(needle), `reply.md has ${needle}`);
  const words = { approve: 'APPROVED', clarify: 'CLARIFIED', develop: 'IMPLEMENTED', fix: 'FIXED', init: 'SET UP', new: 'SHAPED', requirements: 'RECORDS WRITTEN', research: 'DECIDED', review: 'REVIEWED', ship: 'SHIPPED', tasks: 'PLANNED', 'develop-tests': 'TESTS WRITTEN', update: 'UPDATED', 'run-tests': 'VERIFIED' };
  assert.deepEqual(Object.keys(words).sort(), [...skills].sort(), 'a verdict word for every skill');
  for (const s of skills) {
    const text = readFileSync(join(skillsDir, s, 'SKILL.md'), 'utf8');
    assert.ok(/^allowed-tools: .*Read\(\$\{CLAUDE_PLUGIN_ROOT\}\/reply\.md\)/m.test(text), `${s} may read reply.md without a prompt`);
    assert.ok(text.includes('In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first)'), `${s} replies in the frame`);
    assert.ok(reply.includes(`${s} ${words[s]}`) && text.includes(`✅ ${words[s]}`), `${s}: its verdict ✅ ${words[s]} is in reply.md and in the skill`);
    assert.ok(!/`STATUS:[^`]*` first|First line `STATUS:|^STATUS: done \|/m.test(text), `${s} prints no STATUS: code to the person`);
  }
  const shaping = readFileSync(join(skillsDir, 'new', 'SKILL.md'), 'utf8');
  assert.ok(/\*\*💎 SHAPING · 012 Bulk Delete\*\*/.test(shaping) && /spec 2 of 9 in roadmap reports ·\s+question round 1/.test(shaping), 'the shaping banner names the roadmap, so 9 never reads as 9 questions');
  assert.ok(/Round 1 drafts first: fill every section/.test(shaping) && /one Mermaid diagram/.test(shaping), 'the person reads a whole draft, with a picture, before the questions');
  // Round 0 of a roadmap lives in a reference file the skill reads only then: the skill stays under its cap.
  assert.ok(shaping.includes('`${CLAUDE_PLUGIN_ROOT}/skills/new/roadmap.md`') && /Read\(\$\{CLAUDE_PLUGIN_ROOT\}\/skills\/new\/roadmap\.md\)/.test(shaping), 'new reads the roadmap round, without a prompt');
  assert.ok(/first line\s+names the phase instead of `❓ QUESTIONS`/.test(shaping) && /round 0 · reply 1 of 2 · 31 steps in the draft/.test(shaping), 'one banner for sizing in every session, with the replies left');
  const round0 = readFileSync(join(skillsDir, 'new', 'roadmap.md'), 'utf8');
  assert.ok(/It is in the first reply, drafted with every pick taken/.test(round0) && /Round 0 is these two replies/.test(round0) && /`B drops 012–015`/.test(round0), 'the person sees the whole step list before any answer, and what each other option changes in it');
  // Both reply 2s of round 0 ended with "ok takes every pick" and no question open: the person did not know what to type.
  assert.ok(/`✅ ROADMAP WRITTEN`/.test(round0) && /is `SPEX next <first step's folder> --asked 0`: the command of its round 1/.test(round0) && reply.includes('new SHAPED (ROADMAP WRITTEN after round 0)'), 'the end of round 0 says what ok does next');
  // A sizing reply ended with a prose "**NEXT:**" line and the words buried in it: round 0 had no folder for spex next.
  // The script prints the block for round 0 too, in the same frame, one row per word.
  assert.ok(/A question still open: say what "done" does, ask once, with no question block: NEXT\s+is `SPEX next <dir> --ending`/.test(shaping), '"done" with questions open asks in the NEXT block, not in its own answer line');
  assert.ok(/No answer line: NEXT is it\. Reply 1 prints `SPEX next --sizing roadmap\|step --asked\s+<n>`, a round `SPEX next <dir> --asked <n>`: n question blocks/.test(shaping), 'round 0 ends with the same NEXT block as every other reply');
  assert.ok(/one `spex:roadmap-reviewer` per 10 stubs, in one message/.test(round0) && /Then step 3 again/.test(round0), 'a second reader checks the stubs against the design before reply 2');
  assert.ok(/convert it as the error says, and cite the copy/.test(round0), 'a design in another format is converted first');
  // nex, second cut: the backlog row said built, and ADR-027's status line says "not built: the groom agent". No check read
  // a row that names no step, so the work fell out silently. A built row names its builder; the reviewer reads those rows.
  assert.ok(/A `built` row names what built it/.test(round0) && /What the design lists to build is in scope unless the design\s+or the person drops it: a pick keeps it/.test(round0) && /one only the person settles is a question\s+of reply 2/.test(round0), 'a row that drops work is checked or asked');
  // A lab run on a folder of three designs read only the newest, and its picks left out what waited for a board or a PR:
  // 15 steps where the run before cut 29 from the same input. A folder is every file in it, and a wait is an Outside line.
  assert.ok(/a folder is every file in it/.test(round0) && /a wait \(a board, a review, a PR\) is an Outside line/.test(round0), 'the same input gives the same scope');
  // It also asked "is the cluster date still 2026-11-12?" with two options that planned the same 15 steps, and picked a guess.
  assert.ok(/options that give the same list are no question/.test(round0) && /A fact only the\s+person knows \(a date, an account\) is a `You:` line, never a pick/.test(round0), 'a question changes the list, and a pick is never a guess at a fact');
  assert.ok(!/\bnex\b|nex-target|k3s|GHCR|promote\.py|docs\/my-specs/i.test(round0 + shaping + reply), 'the examples a skill reads come from no one project');
  assert.ok(/`ROADMAP-NAMES` lists/.test(round0) && /under Names\s+left out in the roadmap file with why/.test(round0), 'a name the design fixes goes into a stub, or the file says why not');
  assert.ok(/the person deleted: that is\s+their answer\. Cut fresh, never offer to restore them/.test(round0), 'folders the person deleted stay deleted');
  assert.ok(/`--number <n>` when the repo\s+numbers its specs elsewhere too/.test(round0), 'a number the repo uses elsewhere is a flag, not a hand-made folder');
  assert.ok(Buffer.byteLength(round0, 'utf8') <= 6500, 'the roadmap round is small too: it is read once per round 0');
  assert.ok(/`SPEX outline <file>`/.test(round0) && /design's own list of work comes first/.test(round0), 'the steps start from the design\'s own units and order, so a second session cuts the same list');
  assert.ok(/A re-cut starts from what exists/.test(round0) && /`SPEX drop <dir> --reason/.test(round0) && /Never delete a folder by hand/.test(round0), 'a re-cut is keep, change, add, drop; a dropped step keeps its work');
  assert.ok(/`SPEX roadmap <name> --init --source/.test(round0) && /`SPEX roadmap <name> --coverage`/.test(round0), 'every design section gets a row: a step or a reason');
  assert.ok(/\*\*Outside\*\*/.test(round0) && /code in a repo not in `repos`/.test(round0) && /Code in a repo of `repos` is a step/.test(round0), 'what no step builds has an owner; a listed repo is steps');
  assert.ok(/\*\*The design's open items\*\*/.test(round0) && /Never a fact/.test(round0), 'a proposal in the design is an open question, not a fact');
  assert.ok(/\*\*From the design\*\*: all its sections say/.test(round0) && /`\[new\]`, `\[built: spec 24\]` or `\[changes: spec 21\]`/.test(round0), 'a stub holds all its design says, each bullet tagged');
  assert.ok(/\*\*Uses\*\*/.test(round0) && /\*\*Introduces\*\*/.test(round0) && /missing `depends_on`/.test(round0), 'a stub says what it takes and gives, so a program finds a missing dependency');
  assert.ok(/as a Decision in both steps/.test(round0) && /never "step 014"/.test(round0), 'a move of design scope is a decision; a step is named by its folder');
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

test('a file outside a task\'s paths is the process\'s to settle, and ok never waits on a skill only a person can start', () => {
  // dex 017: T07 and T32 each had to write a file outside their paths. The develop reply asked the person, then said
  // "on ok, I run /spex:clarify". Every spex skill is user-only, so the call was refused and the person had to type it;
  // and clarify writes requirements.yaml, not tasks.yaml, so no skill could have done it. Now the developer returns
  // `STATUS: paths`, a decider judges, `spex paths` widens the task under the check rules, and no reply promises a skill.
  const develop = readFileSync(join(skillsDir, 'develop', 'SKILL.md'), 'utf8');
  const route = readFileSync(join(skillsDir, 'develop', 'paths.md'), 'utf8');
  assert.ok(/for `paths`, `paths\.md`/.test(develop) && develop.includes('`${CLAUDE_PLUGIN_ROOT}/skills/develop/paths.md`'), 'develop routes the status to its side file');
  assert.ok(/^allowed-tools: .*Read\(\$\{CLAUDE_PLUGIN_ROOT\}\/skills\/\*\/\*\.md\)/m.test(develop), 'develop reads the side file without a prompt');
  assert.ok(/One `spex:decider`, one question: `Q1 — <task> must write <files>/.test(route), 'a decider judges first');
  assert.ok(/`SPEX paths <dir> <task> --add <file>… --reason/.test(route) && /One round per task/.test(route), 'the script widens the task, once');
  assert.ok(/Stage `approve-tasks`: no develop gate opens until a person reads the\s+change/.test(route), 'a required approval is a reading, not a repair');
  assert.ok(/Nobody asks a person/.test(route) && !/--ask/.test(route), 'no person is asked to fix the plan');
  // dex 017 again: spex paths dropped two of three files, and the reply asked the person to add them to tasks.yaml by
  // hand; T07 and T32 waited on a yes typed per task, for a question about files and a test that no person owns.
  assert.ok(/Never\s+hand the person an edit of `tasks\.yaml` or of a test: a refusal is a block/.test(route), 'a refused or partial widening is a block, never a hand edit');
  assert.ok(/A `tasks\.yaml` a person approved stays approved: `\/spex:review`\s+shows the change/.test(route), 'one approval per plan, the change read at review');
  assert.ok(/^## A block that asks for a file or a test$/m.test(route) && /No person answers it\. `SPEX unblock <dir> <task>`/.test(route), 'an old block about a file or a test goes back to the process');
  assert.ok(/A blocked task that asks\s+for a file or a test: `paths\.md`, its last part/.test(develop) && /its `ask:` as `--ask` \(no-undo only\)/.test(develop), 'the orchestrator routes those blocks, and asks only for a no-undo write');
  const reply = readFileSync(join(PLUGIN, 'reply.md'), 'utf8');
  assert.ok(/no skill starts another/.test(reply) && /read its `SKILL\.md`, do it here/.test(reply), 'reply.md: what ok takes happens in this chat');
  const texts = [reply, ...skills.flatMap((s) => readdirSync(join(skillsDir, s)).filter((f) => f.endsWith('.md')).map((f) => readFileSync(join(skillsDir, s, f), 'utf8')))];
  for (const t of texts) assert.ok(!/\bI (run|start|call) `?\/spex:/i.test(t.replace('on ok I run `/spex:<x>`', '')), 'no skill promises to start another');
});

test('a broken file is fixed through a skill: NEXT never names the bare CLI, and fix keeps the wall', () => {
  // A session on a spec with check errors got `NEXT   spex check <dir>`: the person has no spex CLI, only the skills.
  const fix = readFileSync(join(skillsDir, 'fix', 'SKILL.md'), 'utf8');
  assert.ok(/^0\. `invalid`: the files break a rule, and every gate refuses/m.test(fix), 'fix has the invalid stage');
  assert.ok(/an error in\s+`tests\.yaml` goes to one `spex:test-analyst`, one in a test file to one\s+`spex:test-developer`/.test(fix) && /you write neither/.test(fix), 'the wall holds');
  assert.ok(/At most three rounds of\s+`SPEX check`/.test(fix), 'a loop guard');
  const src = readFileSync(join(PLUGIN, 'src', 'commands', 'lifecycle.ts'), 'utf8');
  for (const m of src.matchAll(/step\('[a-z-]+', `([^`]*)`/g)) assert.ok(m[1].startsWith('/spex:'), `a NEXT command is a skill: ${m[1]}`);
  for (const m of src.matchAll(/step\('[a-z-]+', '([^']*)'/g)) assert.ok(m[1] === '' || m[1].startsWith('/spex:'), `a NEXT command is a skill: ${m[1]}`);
});

test('a second run of a skill is a message, not a change: each incremental skill says when there is nothing to do', () => {
  // The README table "Running a skill again" promises these lines; the script side (gate tasks, ship) is in lifecycle.test.mjs.
  const read = (s) => readFileSync(join(skillsDir, s, 'SKILL.md'), 'utf8');
  assert.ok(/"records exist": a rerun\. Add only what the spec has and the records lack; nothing\s+missing: change nothing, say so/.test(read('requirements')), 'requirements');
  assert.ok(/Nothing open and no gap you can name: change nothing, say so/.test(read('clarify')), 'clarify');
  // A requirements run asked one question mid-run and ended "Answer: A, B, or ok.", with "reply 1 of 1", no NEXT,
  // and no word for "let the agent answer". The mid-run question has one answer line, and auto is one of its words.
  assert.ok(/never says `reply 1 of\s+1`/.test(read('clarify')) && /no NEXT block: the answer is the next step/.test(read('clarify')), 'a mid-run question says the run goes on');
  assert.ok(/`ok takes every pick · or answer by number · auto: an agent answers this and the\s+rest`/.test(read('clarify')) && /On `auto`, every open question takes the auto branch/.test(read('clarify')), 'auto is an answer too');
  assert.ok(/If there are none, say so and stop\./.test(read('research')), 'research');
  assert.ok(/Open with `nothing to add`: every\s+record has a task; say so/.test(read('tasks')), 'tasks');
  assert.ok(/an empty one means\s+every script has its file: go to step 6/.test(read('develop-tests')), 'tests');
  assert.ok(/If the stage is not `develop`, print the block and stop\./.test(read('develop')), 'develop');
  assert.ok(/`ok` and no session pending: step 6/.test(read('run-tests')), 'verify');
  assert.ok(/It is safe to rerun: a close that happened is skipped/.test(read('ship')), 'ship');
});
