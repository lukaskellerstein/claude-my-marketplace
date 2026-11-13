// The skills, their parts, the agents and the reply frame of spex 3.0. A command is one skill. A part is one more
// file of that skill, read only when the run gets there. Every SKILL.md and every part is at most 6,000 bytes, every
// skill is user-invoked only and listed in the plugin manifest, no skill tells the agent to read the README, and
// every script call a skill, a part or an agent names exists in the script.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { PLUGIN, SPEX } from './helpers.mjs';

const CAP = 6000;
const skillsDir = join(PLUGIN, 'skills');
const skills = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory()).sort();
const read = (...p) => readFileSync(join(PLUGIN, ...p), 'utf8');
const skill = (s) => read('skills', s, 'SKILL.md');
const part = (s, f) => read('skills', s, `${f}.md`);
const size = (text) => Buffer.byteLength(text, 'utf8');

/** The eight commands of the design, and the two that set a repo up once. */
const COMMANDS = ['new', 'plan', 'implement', 'review', 'comment', 'new-bug', 'delete', 'status'];
const SETUP = ['init', 'update'];
/** A part is one more file of its skill: the table "The eight skills and their parts" of README.html. */
const PARTS = { new: ['notes'], plan: ['fit', 'shape', 'clarify', 'research', 'records', 'tasks'], implement: ['tests', 'develop', 'prove', 'wrong'], review: ['close'] };
/** The commands and names of spex 2.2 that are gone. No skill, part or agent may name one. */
const GONE = /\/spex:(approve|requirements|clarify|research|tasks|develop-tests|develop|run-tests|fix|ship|archive|quick|sync)\b|\b(SPEX|spex) (next|approve|ship|drop)\b|status: (planned|shaping|ready)\b|spex:implementer|`verification`/;

const HELP = spawnSync('node', [SPEX, '--help'], { encoding: 'utf8' }).stdout;
const SCRIPT_COMMANDS = new Set([...HELP.matchAll(/(?:^ {2}|\| )spex ([a-z][a-z-]*)/gm)].map((m) => m[1])); // `spex block … | spex unblock …` is one line
/** Every `SPEX <command>` a text names. */
const calls = (text) => [...text.matchAll(/\bSPEX ([a-z][a-z-]*)/g)].map((m) => m[1]);

test('the plugin lists ten skills, the eight commands and two for setup, and bundles a browser for the tester', () => {
  const manifest = JSON.parse(read('.claude-plugin', 'plugin.json'));
  assert.deepEqual([...manifest.skills].sort(), skills.map((s) => `./skills/${s}`).sort());
  assert.deepEqual(skills, [...COMMANDS, ...SETUP].sort());
  assert.equal(manifest.version, JSON.parse(read('package.json')).version, 'one version');
  assert.ok(HELP.length > 1000 && spawnSync('node', [SPEX, '--version'], { encoding: 'utf8' }).stdout.startsWith(`spex ${manifest.version} `), 'the script has the same version');
  const pw = manifest.mcpServers?.playwright;
  assert.ok(pw && pw.command === 'npx' && pw.args.includes('@playwright/mcp@latest') && pw.args.includes('--headless'), 'the Playwright MCP is bundled, headless');
  assert.ok(pw.args.includes('.spex/artifacts'), 'its screenshots land under .spex/, which the work gitignore covers');
});

// The ten subagents: each is small (its brief is sent once per dispatch), inherits the session's tools (LSP, MCP
// servers, other plugins) and names only what it must never do, has a color and a model, and returns a fixed shape.
// The researcher gathers facts on sonnet; the rest decide or write, on the session's model. The wall: the analyst
// writes the claim and never its proof or the tasks; the planner writes the tasks and nothing else; the test analyst
// plans the proof and never reads the source; the test developer writes test code and never reads the source; the
// developer builds and never edits a test; the tester performs sessions and changes nothing; the decider names the
// cause (the test, the code, the tasks or the spec) and fixes nothing; the reviewer reads the diff.
const AGENTS = {
  analyst: { denied: 'Agent', model: 'inherit', color: 'red', script: true, returns: [/^STATUS: done \| blocked$/m, /^misfits:/m, /^assumed:/m, /^facts:/m, /^questions:/m, /`tests\.yaml` is the test\s+analyst's: do not open it/, /never `tasks\.yaml`, never code, never `source\.md`/, /A line marked `\(you\)` is fixed/, /`→ REQ-…` or\s+`→ no record: <why>`/, /at most 3, each closed,\s+with options and a pick/] },
  planner: { denied: 'Agent', model: 'inherit', color: 'orange', script: true, returns: [/^STATUS: done \| blocked$/m, /^tasks:/m, /^needs:/m, /`tasks\.yaml`, and nothing else/, /A done task is never rewritten/, /No person is an actor/, /`TASK-COVERAGE`/] },
  researcher: { denied: 'Edit, Write, NotebookEdit, Agent', model: 'sonnet', color: 'cyan', script: false, returns: [/^Sources:$/m, /^Confidence:/m, /^Not found:/m] },
  decider: { denied: 'Edit, Write, NotebookEdit, Agent', model: 'inherit', color: 'purple', script: true, returns: [/^  answer:/m, /^  size: small \| big/m, /^  evidence:/m, /^  confidence: high \| medium \| low/m, /^  needs:/m, /you change nothing/, /`LSP`/, /\(the test\)[\s\S]*\(the code\)[\s\S]*\(the tasks\)[\s\S]*\(the spec\)/, /a line marked `\(you\)`, the Success or Not this, or the list of specs/] },
  'test-analyst': { denied: 'Agent', model: 'inherit', color: 'pink', script: true, returns: [/^STATUS: done \| blocked$/m, /^tests:/m, /^sessions:/m, /^needs:/m, /^touches:/m, /never read the source folders/, /edit\s+`tests\.yaml` and nothing else/, /SPEX show <dir> --plan/, /`TEST-PERSON`/] },
  'test-developer': { denied: 'Agent', model: 'inherit', color: 'yellow', script: true, returns: [/^STATUS: done \| blocked$/m, /^tests:/m, /^blocked:/m, /red \| mutation/, /never read the source\s+folders/, /never open `tests\.yaml`/, /Do not run `spex done`/, /--test <TS> --expect fail/] },
  developer: { denied: 'Agent', model: 'inherit', color: 'green', script: true, returns: [/^STATUS: done \| test-bug \| blocked \| too-big \| paths$/m, /^files:/m, /^needs:/m, /Do not run `spex done`/, /never a test of\s+the plan/, /`LSP`/, /SPEX gate develop/, /^## At the close$/m, /Conflict: <files>/, /Merge failed: <tail>/] },
  tester: { denied: 'Edit, Write, NotebookEdit, Agent', model: 'inherit', color: 'blue', script: true, returns: [/^STATUS: pass \| fail$/m, /^observed:/m, /^artifacts:/m, /browser_snapshot/, /SPEX session <dir> <TS> --result pass\|fail --observed/, /never fix anything/] },
  reviewer: { denied: 'Edit, Write, NotebookEdit, Agent', model: 'inherit', color: 'cyan', script: true, returns: [/^verdict:/m, /^blocking:$/m, /You read; you change nothing/, /`LSP`/, /do not run the tests/] },
  // the second read of new: the agent that wrote the notes was their only reader
  'roadmap-reviewer': { denied: 'Edit, Write, NotebookEdit, Agent', model: 'inherit', color: 'red', script: true, returns: [/^roadmap: <name>/m, /^  missing: #<anchor>/m, /^  tag: /m, /You read; you change nothing/, /never a verdict/, /Never judge the order, the cut or the size/, /^row: <file#anchor>/m, /every row that names no step/, /A text \(`source\.md`\): read it line by line against the notes/] },
};
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']; // the ones Claude Code shows
const AGENT_CAP = 3600; // the developer carries its two jobs at the close; the rest stay under 3300

test('the plugin ships ten subagents in agents/, each inheriting the session tools minus a denylist, with a color, a model and a fixed return shape', () => {
  // The manifest names no `agents`: Claude Code then scans agents/ itself. With the array form, `claude plugin details`
  // reported `Agents (0)` (measured on 2.1.319), so the folder scan is the one that is known to load them.
  const manifest = JSON.parse(read('.claude-plugin', 'plugin.json'));
  assert.equal(manifest.agents, undefined, 'no agents field: the default agents/ scan loads them');
  assert.deepEqual(readdirSync(join(PLUGIN, 'agents')).sort(), Object.keys(AGENTS).map((a) => `${a}.md`).sort());
  // Ten agents and eight colors: two colors are used twice, each by a pair that never works in the same command.
  // The roadmap reviewer runs only in new, where the analyst never runs. The researcher runs only in plan, and the
  // reviewer only in review.
  const byColor = (c) => Object.keys(AGENTS).filter((a) => AGENTS[a].color === c).sort();
  assert.equal(new Set(Object.values(AGENTS).map((a) => a.color)).size, 8, 'every color Claude Code knows is used');
  assert.deepEqual(COLORS.map(byColor).filter((names) => names.length > 1), [['analyst', 'roadmap-reviewer'], ['researcher', 'reviewer']], 'only these two pairs share a color');
  for (const [name, want] of Object.entries(AGENTS)) {
    const text = read('agents', `${name}.md`);
    assert.ok(size(text) <= AGENT_CAP, `${name} is small: ${size(text)} bytes`);
    const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(fm && new RegExp(`^name: ${name}$`, 'm').test(fm[1]), `${name}: name matches the file`);
    assert.ok(!/^tools:/m.test(fm[1]), `${name}: no allowlist, so LSP and MCP tools come through`);
    assert.ok(new RegExp(`^disallowedTools: ${want.denied}$`, 'm').test(fm[1]), `${name}: denylist`);
    assert.ok(new RegExp(`^model: ${want.model}$`, 'm').test(fm[1]), `${name}: model`);
    assert.ok(COLORS.includes(want.color) && new RegExp(`^color: ${want.color}$`, 'm').test(fm[1]), `${name}: a color Claude Code knows`);
    for (const re of want.returns) assert.ok(re.test(text), `${name}: ${re}`);
    assert.equal(/spex\.mjs/.test(text), want.script, `${name}: ${want.script ? 'calls' : 'never calls'} the script`);
    assert.ok(!GONE.test(text), `${name}: names nothing of 2.2 that is gone (${text.match(GONE)?.[0]})`);
    for (const c of calls(text)) assert.ok(SCRIPT_COMMANDS.has(c), `${name}: the script has no command ${c}`);
  }
});

for (const s of skills) {
  test(`skills/${s}/SKILL.md is small, user-invoked only, calls only commands the script has, and does not read the README`, () => {
    const text = skill(s);
    assert.ok(size(text) <= CAP, `${s} is ${size(text)} bytes, cap ${CAP}`);
    const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(fm, 'has frontmatter');
    assert.ok(new RegExp(`^name: ${s}$`, 'm').test(fm[1]), 'name matches the folder');
    assert.ok(/^description: .{20,}/m.test(fm[1]), 'has a description');
    assert.ok(/^disable-model-invocation: true$/m.test(fm[1]), 'is user-invoked only');
    // A skill may name the project's own `README.md` as an input; it never points at "the README" of this plugin.
    assert.ok(!/README(?!\.md)/.test(text) && !/(spex|plugin|this|design) README/i.test(text), 'never points the agent at the plugin README');
    assert.ok(/spex\.mjs/.test(text), 'calls the script');
    assert.ok(!GONE.test(text), `names nothing of 2.2 that is gone (${text.match(GONE)?.[0]})`);
    for (const c of calls(text)) assert.ok(SCRIPT_COMMANDS.has(c), `the script has no command ${c}`);
    const parts = readdirSync(join(skillsDir, s)).filter((f) => f.endsWith('.md') && f !== 'SKILL.md').map((f) => f.slice(0, -3)).sort();
    assert.deepEqual(parts, [...(PARTS[s] ?? [])].sort(), `${s} has the parts the design names, and no other`);
    for (const p of parts) {
      const body = part(s, p);
      assert.ok(size(body) <= CAP, `${s}/${p}.md is ${size(body)} bytes, cap ${CAP}`);
      assert.ok(!body.startsWith('---'), `${s}/${p}.md is a part, not a skill: no frontmatter`);
      assert.ok(!GONE.test(body), `${s}/${p}.md names nothing of 2.2 that is gone (${body.match(GONE)?.[0]})`);
      for (const c of calls(body)) assert.ok(SCRIPT_COMMANDS.has(c), `${s}/${p}.md: the script has no command ${c}`);
      // The chat reads a part only when the run gets there, so its skill names the folder by its full path and the part by its file name.
      assert.ok(text.includes(`\${CLAUDE_PLUGIN_ROOT}/skills/${s}/`) && text.includes(`${p}.md`), `${s} names its part ${p}.md by path`);
    }
    if (parts.length) assert.ok(/^allowed-tools: .*Read\(\$\{CLAUDE_PLUGIN_ROOT\}\/skills\/\*\/\*\.md\)/m.test(text), `${s} reads its parts without a prompt`);
  });
}

test('every reply is in one frame: reply.md holds it, and every skill reads it and keeps only its own content', () => {
  const reply = read('reply.md');
  assert.ok(size(reply) <= 4500, 'reply.md is small: every skill reads it once per run');
  assert.ok(/best result for their goal/.test(reply) && /never a work-around for a missing spex feature/.test(reply) && /a\s+decision in their design\) is their answer: a pick never drops it/.test(reply), 'a pick is the best result, never a rule alone or a work-around');
  assert.ok(reply.includes('━'.repeat(40)) && reply.includes('─'.repeat(40)), 'a heavy rule around the banner, a light one around each question');
  for (const needle of ['👉 **Pick:', '🟥 BIG', '🟧 MEDIUM', '🟨 SMALL', '⏸ WAITING FOR YOU', '⛔ NOT STARTED', '💬 ANSWER', 'I do this unless you say no', 'No `STATUS:` code', 'There is no approve', 'typing it is the approval', 'Every question known by then is on one screen']) assert.ok(reply.includes(needle), `reply.md has ${needle}`);
  assert.ok(!GONE.test(reply), 'reply.md names nothing of 2.2 that is gone');
  const words = { new: 'SPECS WRITTEN', plan: 'PLANNED', implement: 'IMPLEMENTED', review: 'CLOSED', comment: 'COMMENT TAKEN', 'new-bug': 'BUG NOTED', delete: 'DELETED', init: 'SET UP', update: 'UPDATED' };
  assert.deepEqual([...Object.keys(words), 'status'].sort(), skills, 'a verdict word for every skill but status, which prints the place');
  for (const s of skills) {
    const text = skill(s);
    assert.ok(/^allowed-tools: .*Read\(\$\{CLAUDE_PLUGIN_ROOT\}\/reply\.md\)/m.test(text), `${s} may read reply.md without a prompt`);
    assert.ok(text.includes('In the frame of `${CLAUDE_PLUGIN_ROOT}/reply.md` (read it first)'), `${s} replies in the frame`);
    if (words[s]) assert.ok(reply.includes(`${s} ${words[s]}`) && text.includes(`✅ ${words[s]}`), `${s}: its verdict ✅ ${words[s]} is in reply.md and in the skill`);
    assert.ok(!/`STATUS:[^`]*` first|First line `STATUS:|^STATUS: done \|/m.test(text), `${s} prints no STATUS: code to the person`);
  }
  assert.ok(/no banner and no\s+verdict: line 1 is the `📍` line of the script/.test(skill('status')), 'status prints what the script printed, and nothing of its own');
  const texts = [reply, ...skills.flatMap((s) => readdirSync(join(skillsDir, s)).filter((f) => f.endsWith('.md')).map((f) => read('skills', s, f)))];
  for (const t of texts) assert.ok(!/\bI (run|start|call) `?\/spex:/i.test(t.replace('on ok I run `/spex:<x>`', '')), 'no skill promises to start another');
  assert.ok(!/\bnex\b|nex-target|k3s|GHCR|promote\.py|docs\/my-specs|\bdex\b/i.test(texts.join('\n')), 'the examples a skill reads come from no one project');
});

test('the four commands for any time: no agent in status, new-bug and delete; comment keeps the words first and writes no code', () => {
  for (const s of ['status', 'new-bug', 'delete']) assert.ok(!/^allowed-tools: .*\bAgent\b/m.test(skill(s)) && !/`spex:[a-z-]+`/.test(skill(s)), `${s} starts no agent`);
  const status = skill('status');
  assert.ok(/`SPEX status`\. Print what it printed, as it is/.test(status) && /do not run the command\s+that NEXT names: the person types it/.test(status), 'status runs the script and nothing else');
  assert.ok(/It keeps no step\s+inside a phase, so do not guess one/.test(status), 'status names the phase, never a step inside it');
  const bug = skill('new-bug');
  assert.ok(/`SPEX new-bug <slug> --words <that file>`/.test(bug) && /word for word, with\s+nothing added and nothing left out/.test(bug), 'the report is kept word for word');
  assert.ok(/`SPEX cover specs\/<NNN>-<slug>\/source\.md specs\/<NNN>-<slug>`/.test(bug) && /At most 3 tries/.test(bug), 'the script checks that every detail is in the note, three tries');
  assert.ok(/Add nothing: no cause, no fix, no guess/.test(bug) && /A bug found while its spec is open is not for this command/.test(bug), 'a bug note adds nothing, and a bug of an open spec goes to comment');
  assert.ok(/`SPEX commit --message/.test(bug) && /`COMMIT-YOURS`/.test(bug) && /`COMMIT-PUSH`/.test(bug) && /plan refuses until then/.test(bug), 'the note is committed and pushed, or the person is told to');
  assert.ok(/the NEXT block that `SPEX commit` printed/.test(bug), 'the reply ends with the block the script printed');
  const del = skill('delete');
  assert.ok(/`SPEX delete <dir>… --reason "<their words>"`/.test(del) && /Never invent one/.test(del), 'the reason is the person\'s');
  assert.ok(/`DELETE-LEAVE`[\s\S]*`ExitWorktree` with `action: keep`/.test(del) && /^allowed-tools: .*ExitWorktree/m.test(del), 'delete leaves the worktree first');
  assert.ok(/Exit 8, `DELETE-WORKTREE`[\s\S]*one time, outside the sandbox/.test(del), 'a worktree a sandbox keeps is removed with one prompt');
  assert.ok(/`DELETE-MERGED`/.test(del) && /`DELETE-DEPENDED`/.test(del) && /Never pick one for them/.test(del), 'a merged spec and a spec another one needs are refused');
  assert.ok(/never restore one from the\s+archive/.test(del), 'what the person deleted stays deleted');
  const comment = skill('comment');
  assert.ok(/Keep the words first, before any agent reads them/.test(comment) && /`SPEX comment --words <file>`/.test(comment), 'the script keeps the words before any agent reads them');
  assert.ok(/With no words: `SPEX comment`, which finds a\s+comment that is not finished/.test(comment), 'a comment that did not finish goes on');
  assert.ok(/When you\s+cannot tell, it is a change/.test(comment), 'a question or a change');
  assert.ok(/^## A question$/m.test(comment) && /never from memory/.test(comment) && /--done "a question: answered, nothing changed"/.test(comment), 'a question is answered from the files, and nothing changes');
  assert.ok(/`spex:analyst` with `<dir>\. Comment <C>\.`/.test(comment) && /`spex:planner` with `<dir>\. Add: comment <C>/.test(comment) && /`spex:test-analyst` with `<dir>\. Plan a test for every claim spex show --plan\s+lists\.`/.test(comment), 'a change goes through the analyst, the planner and the test analyst');
  assert.ok(/No plan exists \(step 2 said so\): skip to step 5/.test(comment), 'with no plan, only the spec changes');
  assert.ok(/`SPEX stamp <dir> --close <C> --changed/.test(comment) && /At most 3\s+tries/.test(comment), 'the script stamps the changed plan and closes the entry');
  assert.ok(/You write no code and no test file, and you\s+run no other command/.test(comment) && /`Typing it approves the change\.`/.test(comment), 'no code, and the next command is the ok');
  assert.ok(/^allowed-tools: .*EnterWorktree/m.test(comment) && /`EnterWorktree` with `path: <that path>`/.test(comment), 'comment works in the worktree of the open spec');
});

test('the parts of a run read what the script prints, and never guess it from a file', () => {
  const develop = part('implement', 'develop');
  assert.ok(/`SPEX show <dir> --ready` prints them: `ready: T03 \+ T04, T05`/.test(develop), 'the waves come from the script');
  // case C22: a chat can end before it shows the question, so typing the command again is no yes
  assert.ok(/Yes is the word `yes`: as the reply, or after the folder in the command/.test(develop) && /the person may not have seen\s+the question/.test(develop), 'a write with no undo runs only on the word yes');
  assert.ok(/No agent decides this, also not in auto mode/.test(develop), 'also in auto mode');
  const wrong = part('implement', 'wrong');
  assert.ok(/A the test, B the code, C the tasks,\s+D the spec, and for D a size: small or big/.test(wrong), 'four causes, and a size for the spec');
  assert.ok(/Name each entry this fix finishes: with no id it closes none/.test(wrong) && /Never write corrections\.md\s+by hand/.test(wrong), 'the script writes corrections.md, and the stamp closes by id');
  assert.ok(/Who found a problem never plans its proof/.test(wrong) && /A done task is never written again/.test(wrong), 'the wall holds in a fix');
  const prove = part('implement', 'prove');
  assert.ok(/`SPEX start implement` starts at 1\s+again/.test(prove) && /This is the same in auto mode: the limit is\s+the person's/.test(prove), 'the round limit is the person\'s');
  const review = skill('review');
  assert.ok(/`round <n> waits for its answer: <file>`/.test(review) && /Do not read\s+the diff and do not run the tests/.test(review), 'a round that waits is shown again, never reviewed again');
  const close = part('review', 'close');
  for (const step of ['sync', 'later', 'prove', 'built', 'merge', 'finish']) assert.ok(close.includes(`SPEX close <dir> ${step}`) || close.includes(`close <dir> ${step}`), `the close has the step ${step}`);
  assert.ok(/`ExitWorktree` with `action: keep`\. Then, in the main folder/.test(close) && /Exit 8, `CLOSE-WORKTREE`/.test(close) && /`GATE-PUSH`/.test(close), 'the chat leaves the worktree before finish');
  assert.ok(/Never merge, delete a branch or remove a worktree by hand/.test(close), 'each of those is a step of the script');
  const newSkill = skill('new');
  assert.ok(/NEXT: the block `SPEX commit` printed/.test(newSkill) && /`COMMIT-PUSH`/.test(newSkill) && /new only adds/.test(newSkill), 'new commits, and ends with the block of the script');
  const plan = skill('plan');
  assert.ok(/`SPEX start plan <dir>`/.test(plan) && /`SPEX end plan <dir>`/.test(plan) && /At most 3 tries of `SPEX end plan`/.test(plan) && /`GATE-PUSH`/.test(plan), 'plan starts and ends with the script');
  assert.ok(/Write `<dir>\/research\.md`, one section for each fact/.test(part('plan', 'research')), 'the research of a spec is a file for people');
});

test('setup: init and update name the 3.0 config keys', () => {
  const init = skill('init');
  assert.ok(/`close\.cmd`/.test(init) && /`local`, and the script merges in the main folder/.test(init) && /`worktree\.setup`/.test(init) && /`commit` stays `false`/.test(init), 'init explains close, commit and worktree');
  const update = skill('update');
  assert.ok(/Format 2 → 3 \(spex 3\.0\) moves the state of each spec out of `spec\.md` into\s+`status\.yaml`/.test(update) && /`approvals` goes: the next command\s+is the approval/.test(update), 'update explains the migration');
});

test('README.html is the design of 3.0: the eight commands, the map with its self-check, and every case', () => {
  const html = read('README.html');
  for (const c of COMMANDS) assert.ok(html.includes(`/spex:${c}`), `the page names /spex:${c}`);
  for (const id of ['new', 'plan', 'implement', 'review', 'comment', 'new-bug', 'delete', 'status']) assert.ok(html.includes(`{ id: '${id}', from:`), `the map has the band ${id}`);
  assert.ok(/window\.spexCheck/.test(html), 'the page checks its own map');
  const cases = (html.match(/^\s+\{ id: '[ABC]\d+',/gm) || []).length;
  assert.ok(cases >= 48, `the page has ${cases} cases`);
  for (const needle of ['status.yaml', 'corrections.md', 'source.md', 'spex/007-csv-export', '.claude/worktrees/', 'close.cmd', 'What the worktree test showed']) assert.ok(html.includes(needle), `the page shows ${needle}`);
  assert.ok(/prefers-color-scheme/.test(html) && /prefers-reduced-motion/.test(html), 'both themes, reduced motion');
});
