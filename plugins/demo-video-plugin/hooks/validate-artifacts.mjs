#!/usr/bin/env node
// PostToolUse: Write|Edit — validates demo artifacts the moment they are written.
//
// Dispatches to the real validators only for demo/storyboard.json and demo/timeline.json;
// silent for every other file. Validation failures exit 2 so Claude is shown the errors
// and fixes them immediately, instead of discovering the timing is nonsense after
// spending money on narration and an hour on capture.

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { readHookInput, projectDir, fail, silent } from './lib/hookio.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const input = await readHookInput();
const filePath = input.tool_input?.file_path || input.tool_input?.path;
if (!filePath) silent();

const abs = resolve(filePath);
const validators = [
  { match: /demo[/\\]storyboard\.json$/, script: 'validate-storyboard.mjs' },
  { match: /demo[/\\]timeline\.json$/, script: 'validate-timeline.mjs' },
];

const hit = validators.find((v) => v.match.test(abs));
if (!hit) silent();
if (!existsSync(abs)) silent();

const script = join(here, '..', 'scripts', hit.script);
if (!existsSync(script)) silent();

try {
  const out = execFileSync('node', [script, abs, '--project', projectDir(input)], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (out.trim()) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: out.trim() },
      })
    );
  }
  process.exit(0);
} catch (err) {
  const message = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
  fail(
    message ||
      `demo-video: ${hit.script} failed on ${filePath} but produced no output. Inspect it manually.`
  );
}
