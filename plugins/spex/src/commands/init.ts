// `spex init`: specs/spex.yaml from what the repo already has. It never asks what a scan can answer.

import { join } from 'node:path';
import { CONFIG_PATH } from '../config.js';
import { ensureDir, fileExists, isDir, readText, writeText } from '../io.js';
import type { CmdResult } from './lifecycle.js';

interface Scan {
  runner: string;
  acceptance_dir: string;
  acceptance_cmd: string;
  fast_checks: string[];
  source_dirs: string[];
  notes: string[];
}

function scan(root: string): Scan {
  const notes: string[] = [];
  const has = (p: string): boolean => fileExists(join(root, p));
  const dirs = ['tests/acceptance', 'test/acceptance', 'tests/e2e', 'test/e2e', 'e2e', 'tests/integration'];
  const acceptance_dir = dirs.find((d) => isDir(join(root, d))) ?? 'tests/acceptance';
  const source_dirs = ['src', 'lib', 'app', 'cmd', 'pkg', 'internal', 'web'].filter((d) => isDir(join(root, d)));
  let runner = 'unknown';
  let acceptance_cmd = '';
  const fast_checks: string[] = [];

  if (has('package.json')) {
    const pkg = JSON.parse(readText(join(root, 'package.json'))) as { scripts?: Record<string, string>; devDependencies?: Record<string, string>; dependencies?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    const testScript = scripts.test ?? '';
    const pm = has('pnpm-lock.yaml') ? 'pnpm' : has('yarn.lock') ? 'yarn' : has('bun.lockb') || has('bun.lock') ? 'bun' : 'npm';
    const run = (name: string): string => (pm === 'npm' ? `npm run ${name} --` : `${pm} run ${name}`);
    if (scripts['test:acceptance']) {
      runner = 'script test:acceptance';
      acceptance_cmd = `${run('test:acceptance')} -t "{ids}"`;
      notes.push('acceptance_cmd uses the test:acceptance script with -t; vitest and jest take a regex there. Adjust for another runner.');
    } else if ('vitest' in deps || /vitest/.test(testScript)) {
      runner = 'vitest';
      acceptance_cmd = `npx vitest run ${acceptance_dir} -t "{ids}"`;
    } else if ('jest' in deps || /jest/.test(testScript)) {
      runner = 'jest';
      acceptance_cmd = `npx jest ${acceptance_dir} -t "{ids}"`;
    } else if ('mocha' in deps || /mocha/.test(testScript)) {
      runner = 'mocha';
      acceptance_cmd = `npx mocha "${acceptance_dir}/**/*.test.*" -g "{ids}"`;
    } else if (/node --test/.test(testScript)) {
      runner = 'node --test';
      acceptance_cmd = `node --test --test-name-pattern="{ids}" "${acceptance_dir}/**/*.test.*"`;
    }
    if (scripts.typecheck) fast_checks.push(run('typecheck').replace(/ --$/, ''));
    else if ('typescript' in deps && has('tsconfig.json')) fast_checks.push('npx tsc --noEmit');
    if (scripts.lint) fast_checks.push(run('lint').replace(/ --$/, ''));
    if (scripts.test) fast_checks.push(pm === 'npm' ? 'npm test' : `${pm} test`);
    if (scripts.test && acceptance_cmd && !scripts['test:acceptance']) notes.push('`npm test` may also run the acceptance tests; exclude the acceptance folder there, or the fast checks fail while a task is red.');
  } else if (has('pyproject.toml') || has('pytest.ini') || has('setup.cfg') || has('conftest.py')) {
    runner = 'pytest';
    acceptance_cmd = `python -m pytest ${acceptance_dir} -q -k "{ids_k}"`;
    if (has('ruff.toml') || (has('pyproject.toml') && /\[tool\.ruff\]/.test(readText(join(root, 'pyproject.toml'))))) fast_checks.push('ruff check .');
    fast_checks.push(`python -m pytest -q --ignore=${acceptance_dir}`);
  } else if (has('go.mod')) {
    runner = 'go test';
    acceptance_cmd = `go test ./${acceptance_dir}/... -run "{ids}"`;
    fast_checks.push('go vet ./...', 'go build ./...');
  } else if (has('Cargo.toml')) {
    runner = 'cargo test';
    acceptance_cmd = `cargo test --test '*' -- {ids_k}`;
    fast_checks.push('cargo check');
    notes.push('cargo filters by one substring; {ids_k} may need a hand edit.');
  }
  if (!acceptance_cmd) notes.push('No test runner found. Set acceptance_cmd by hand: the command that runs the acceptance tests whose names match {ids}.');
  if (!isDir(join(root, acceptance_dir))) notes.push(`${acceptance_dir} does not exist yet; /spex:tests creates it.`);
  return { runner, acceptance_dir, acceptance_cmd, fast_checks, source_dirs: source_dirs.length ? source_dirs : ['src'], notes };
}

function render(s: Scan): string {
  const q = (v: string): string => JSON.stringify(v);
  return [
    `# specs/spex.yaml — written by spex init (runner: ${s.runner}). Edit what the scan got wrong.`,
    `acceptance_dir: ${s.acceptance_dir}`,
    `# {ids} becomes REQ_007_001|REQ_007_002 (a regex); {ids_k} becomes "REQ_007_001 or REQ_007_002" (pytest -k)`,
    `acceptance_cmd: ${q(s.acceptance_cmd)}`,
    `fast_checks: [${s.fast_checks.map(q).join(', ')}]`,
    `source_dirs: [${s.source_dirs.join(', ')}]              # /spex:tests never reads these`,
    `protected: [specs/, ${s.acceptance_dir}/, .github/]`,
    `scopes: []                          # known capabilities; a record with a new scope gets a warning`,
    `banned_words: []                    # added to the built-in list`,
    `limits: {task_files: 12, instructions_bytes: 1500, approach_bytes: 1200, context_kb: 24, diff_kb: 120, file_kb: 40, tests_scenarios: 12, verify_minutes: 20}`,
    `review_rounds: 3`,
    '',
  ].join('\n');
}

export function init(root: string, opts: { force?: boolean }): CmdResult {
  const path = join(root, CONFIG_PATH);
  if (fileExists(path) && !opts.force) return { ok: false, findings: [{ severity: 'error', code: 'INIT-EXISTS', message: `${CONFIG_PATH} already exists`, fix: 'Edit it by hand, or pass --force to rewrite it from a new scan.' }], exit: 6, text: '' };
  const s = scan(root);
  ensureDir(join(root, 'specs'));
  writeText(path, render(s));
  const gi = join(root, '.gitignore');
  const current = fileExists(gi) ? readText(gi) : '';
  if (!/^\.spex\/?$/m.test(current)) writeText(gi, current + (current.endsWith('\n') || current === '' ? '' : '\n') + '.spex/\n');
  const lines = [`wrote ${CONFIG_PATH} (runner: ${s.runner})`, `acceptance_dir: ${s.acceptance_dir}`, `acceptance_cmd: ${s.acceptance_cmd || '(not found)'}`, `fast_checks: ${s.fast_checks.join(' ; ') || '(none)'}`, `source_dirs: ${s.source_dirs.join(', ')}`, '.spex/ added to .gitignore', ...s.notes.map((n) => `note: ${n}`)];
  return { ok: true, findings: [], exit: 0, text: lines.join('\n'), data: { ...s } };
}
