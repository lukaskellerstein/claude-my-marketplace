// Test helpers: a throwaway git repo from a fixture, and a way to call the bundled script.
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PLUGIN = dirname(dirname(fileURLToPath(import.meta.url)));
export const SPEX = join(PLUGIN, 'scripts', 'spex.mjs');
export const FIXTURES = join(PLUGIN, 'tests', 'fixtures');

export function gitIn(cwd, args) {
  return execFileSync('git', ['-c', 'user.name=spex-test', '-c', 'user.email=spex@test', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Copy a fixture into a fresh git repo on branch main with one commit. */
export function makeRepo(fixture) {
  const dir = mkdtempSync(join(tmpdir(), `spex-${fixture}-`));
  cpSync(join(FIXTURES, fixture), dir, { recursive: true });
  writeFileSync(join(dir, '.gitignore'), '.spex/\n');
  gitIn(dir, ['init', '-q', '-b', 'main']);
  gitIn(dir, ['add', '-A']);
  gitIn(dir, ['commit', '-q', '-m', 'fixture']);
  return dir;
}

/** Run spex with --json and parse the document. */
export function spex(cwd, ...args) {
  const res = spawnSync('node', [SPEX, ...args, '--json'], { cwd, encoding: 'utf8' });
  let json = null;
  try {
    json = JSON.parse(res.stdout);
  } catch {
    // leave null; the caller sees stdout/stderr
  }
  return { code: res.status, stdout: res.stdout, stderr: res.stderr, json };
}

export function spexText(cwd, ...args) {
  const res = spawnSync('node', [SPEX, ...args], { cwd, encoding: 'utf8' });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
}

export const codes = (r) => (r.json?.findings ?? []).map((f) => f.code);
