// Test helpers: a throwaway git repo from a fixture, a way to call the bundled script, and the short ways into a
// phase. A spec that is open lives in its worktree: a test writes its files there (`wt`), and calls the script from
// anywhere in the repo, as a chat does.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PLUGIN = dirname(dirname(fileURLToPath(import.meta.url)));
export const SPEX = join(PLUGIN, 'scripts', 'spex.mjs');
export const FIXTURES = join(PLUGIN, 'tests', 'fixtures');

/** The spec of the csv-export fixture, and where its worktree is. */
export const DIR = 'specs/007-csv-export';
export const NAME = '007-csv-export';
export const worktreeOf = (repo, name = NAME) => join(repo, '.claude/worktrees', name);

export function gitIn(cwd, args) {
  return execFileSync('git', ['-c', 'user.name=spex-test', '-c', 'user.email=spex@test', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** A fresh temp folder, as git names it (macOS reaches its temp folder through a link). */
export const tempDir = (prefix) => realpathSync(mkdtempSync(join(tmpdir(), prefix)));

/**
 * Copy a fixture into a fresh git repo on branch main with one commit. The fixture carries .spex/.gitignore, as spex
 * init writes it. The script commits by itself (the end of a phase), so the repo has its own identity and signs nothing.
 */
export function makeRepo(fixture) {
  const dir = tempDir(`spex-${fixture}-`);
  cpSync(join(FIXTURES, fixture), dir, { recursive: true });
  gitIn(dir, ['init', '-q', '-b', 'main']);
  gitIn(dir, ['config', 'user.name', 'spex-test']);
  gitIn(dir, ['config', 'user.email', 'spex@test']);
  gitIn(dir, ['config', 'commit.gpgsign', 'false']);
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

/** A call that must work: the document, or the assert names the command and what it printed. */
export function ok(cwd, ...args) {
  const r = spex(cwd, ...args);
  assert.equal(r.code, 0, `spex ${args.join(' ')}\n${r.stdout}${r.stderr}`);
  return r;
}

export const read = (root, rel) => readFileSync(join(root, rel), 'utf8');
/** Rewrite a file through a function of its text. */
export const edit = (root, rel, fn) => writeFileSync(join(root, rel), fn(read(root, rel)));
/** Add lines to .spex/config.yaml. */
export const configure = (root, text) => edit(root, '.spex/config.yaml', (s) => `${s}${text}\n`);
export const commitAll = (root, message) => {
  gitIn(root, ['add', '-A']);
  gitIn(root, ['commit', '-q', '-m', message]);
};

/**
 * The fixture with its plan stamped: `plan, done`. `before(repo)` changes the main folder first (the config, the
 * plan files), and what it changed is committed, because a worktree gets only what is committed.
 */
export function planned(before, fixture = 'csv-export') {
  const repo = makeRepo(fixture);
  if (before) {
    before(repo);
    if (gitIn(repo, ['status', '--porcelain']).trim()) commitAll(repo, 'before the plan');
  }
  ok(repo, 'start', 'plan', DIR);
  ok(repo, 'end', 'plan', DIR);
  return { repo, wt: worktreeOf(repo) };
}

/** The fixture in `implement, started`: the plan is approved, and the gates inside implement are open. */
export function implementing(before, fixture = 'csv-export') {
  const s = planned(before, fixture);
  ok(s.repo, 'start', 'implement', DIR);
  return s;
}

/** The fixture built: every task done by the script, the proof green on this tree, `implement, done`. */
export function builtSpec(before, fixture = 'csv-export') {
  const s = implementing(before, fixture);
  writeFileSync(join(s.wt, 'src/state.txt'), 'implemented\n');
  ok(s.repo, 'done', DIR, 'T01');
  ok(s.repo, 'done', DIR, 'T02');
  ok(s.repo, 'verify', DIR);
  ok(s.repo, 'end', 'implement', DIR);
  return s;
}

/** The fixture in `review, started`, with no finding to answer. */
export function reviewing(before, fixture = 'csv-export') {
  const s = builtSpec(before, fixture);
  ok(s.repo, 'start', 'review', DIR);
  return s;
}
