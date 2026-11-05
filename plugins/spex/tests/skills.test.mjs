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

test('the plugin lists eleven skills', () => {
  const manifest = JSON.parse(readFileSync(join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8'));
  assert.deepEqual([...manifest.skills].sort(), skills.map((s) => `./skills/${s}`).sort());
  assert.equal(skills.length, 11);
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
    assert.ok(!/README/.test(text), 'never points the agent at the README');
    assert.ok(/spex\.mjs/.test(text), 'calls the script');
  });
}
