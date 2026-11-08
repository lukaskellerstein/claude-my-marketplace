// `spex init`: .spex/config.yaml from what the repo already has. It never asks what a scan can answer.

import { join } from 'node:path';
import { CONFIG_PATH, FORMAT } from '../config.js';

/** .spex/.gitignore: the folder is committed, but only the config is; the work folders never are. */
const WORK_GITIGNORE = ["# written by spex init. .spex/ is spex's folder: config.yaml is committed, the rest is the script's work.", '*', '!.gitignore', '!config.yaml', ''].join('\n');
import { ensureDir, fileExists, isDir, readText, writeText } from '../io.js';
import type { CmdResult } from './lifecycle.js';

interface Scan {
  runner: string;
  acceptance_dir: string;
  acceptance_cmd: string;
  /** A playwright driver when the repo has @playwright/test: the browser tests of the proof plan run with it. */
  playwright: { cmd: string; dir: string } | null;
  fast_checks: string[];
  source_dirs: string[];
  notes: string[];
}

/** The `include` list of the vitest (or vite) config, as written, or null when there is none. */
function vitestInclude(root: string): { file: string; include: string } | null {
  const names = ['vitest.config.ts', 'vitest.config.mts', 'vitest.config.js', 'vitest.config.mjs', 'vite.config.ts', 'vite.config.mts', 'vite.config.js', 'vite.config.mjs'];
  const file = names.find((n) => fileExists(join(root, n)));
  if (!file) return null;
  const m = /\binclude\s*:\s*\[([^\]]*)\]/.exec(readText(join(root, file)));
  return m ? { file, include: m[1].replace(/\s+/g, ' ').trim() } : null;
}

function scan(root: string): Scan {
  const notes: string[] = [];
  const has = (p: string): boolean => fileExists(join(root, p));
  const pkg = has('package.json') ? (JSON.parse(readText(join(root, 'package.json'))) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }) : null;
  const hasPlaywright = !!pkg && '@playwright/test' in { ...pkg.dependencies, ...pkg.devDependencies };
  const e2eDirs = ['tests/e2e', 'test/e2e', 'e2e'];
  // With playwright in the repo, the e2e folder is its driver's folder, not the acceptance folder.
  const dirs = ['tests/acceptance', 'test/acceptance', ...(hasPlaywright ? [] : e2eDirs), 'tests/integration'];
  const acceptance_dir = dirs.find((d) => isDir(join(root, d))) ?? 'tests/acceptance';
  const source_dirs = ['src', 'lib', 'app', 'cmd', 'pkg', 'internal', 'web'].filter((d) => isDir(join(root, d)));
  let runner = 'unknown';
  let acceptance_cmd = '';
  let playwright: Scan['playwright'] = null;
  const fast_checks: string[] = [];

  if (has('package.json')) {
    const pkg = JSON.parse(readText(join(root, 'package.json'))) as { scripts?: Record<string, string>; devDependencies?: Record<string, string>; dependencies?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    const allScripts = Object.values(scripts).join('\n');
    const pm = has('pnpm-lock.yaml') ? 'pnpm' : has('yarn.lock') ? 'yarn' : has('bun.lockb') || has('bun.lock') ? 'bun' : 'npm';
    const run = (name: string): string => (pm === 'npm' ? `npm run ${name} --` : `${pm} run ${name}`);
    // Every runner the repo uses, in the order the scan prefers them. The scripts count as much as the
    // dependencies: a repo can hold two (vitest for the UI, node --test for the core), and only the
    // one that collects acceptance_dir is any use here.
    const runners: string[] = [];
    if ('vitest' in deps || /\bvitest\b/.test(allScripts)) runners.push('vitest');
    if ('jest' in deps || /\bjest\b/.test(allScripts)) runners.push('jest');
    if ('mocha' in deps || /\bmocha\b/.test(allScripts)) runners.push('mocha');
    if (/\bnode\b[^\n&|;]*--test\b/.test(allScripts)) runners.push('node --test');
    const vitest = runners.includes('vitest') ? vitestInclude(root) : null;
    if (vitest && !vitest.include.includes(acceptance_dir.split('/')[0])) {
      notes.push(`${vitest.file} includes only ${vitest.include}, so vitest never collects ${acceptance_dir}. Add the folder there, or keep the runner the scan picked instead.`);
      runners.push(...runners.splice(runners.indexOf('vitest'), 1)); // vitest goes last
    }
    if (scripts['test:acceptance']) {
      runner = 'script test:acceptance';
      acceptance_cmd = `${run('test:acceptance')} -t "{ids}"`;
      notes.push('acceptance_cmd uses the test:acceptance script with -t; vitest and jest take a regex there. Adjust for another runner.');
    } else {
      runner = runners[0] ?? 'unknown';
      const byRunner: Record<string, string> = {
        vitest: `npx vitest run ${acceptance_dir} -t "{ids}"`,
        jest: `npx jest ${acceptance_dir} -t "{ids}"`,
        mocha: `npx mocha "${acceptance_dir}/**/*.test.*" -g "{ids}"`,
        'node --test': `node --test --test-name-pattern="{ids}" "${acceptance_dir}/**/*.test.*"`,
      };
      acceptance_cmd = byRunner[runner] ?? '';
      if (runner === 'node --test' && /--import|--loader|--experimental-strip-types/.test(allScripts)) notes.push('the node --test scripts pass extra flags (--import, --experimental-strip-types); copy them into acceptance_cmd.');
    }
    if (runners.length > 1) notes.push(`${runners.length} runners in package.json (${runners.join(', ')}); the scan picked ${runner}. Prove that it collects ${acceptance_dir} with a throwaway test.`);
    if (scripts.typecheck) fast_checks.push(run('typecheck').replace(/ --$/, ''));
    else if ('typescript' in deps && has('tsconfig.json')) fast_checks.push('npx tsc --noEmit');
    if (scripts.lint) fast_checks.push(run('lint').replace(/ --$/, ''));
    if (scripts.test) fast_checks.push(pm === 'npm' ? 'npm test' : `${pm} test`);
    if (scripts.test && acceptance_cmd && !scripts['test:acceptance']) notes.push('`npm test` may also run the acceptance tests; exclude the acceptance folder there, or the fast checks fail while a task is red.');
    if (hasPlaywright) {
      const e2e = e2eDirs.find((d) => isDir(join(root, d))) ?? 'tests/e2e';
      playwright = { cmd: `npx playwright test --grep "{ids}"`, dir: e2e };
      notes.push(`@playwright/test is a dependency: drivers.playwright runs the browser tests under ${e2e}; a test record names it with driver: playwright.`);
    }
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
  return { runner, acceptance_dir, acceptance_cmd, playwright, fast_checks, source_dirs: source_dirs.length ? source_dirs : ['src'], notes };
}

function render(s: Scan): string {
  const q = (v: string): string => JSON.stringify(v);
  return [
    `# .spex/config.yaml — written by spex init. Edit what the scan got wrong. Commit this file.`,
    `format: ${FORMAT}                           # the shape of specs/ and .spex/; spex update changes it, nothing else does`,
    `acceptance_dir: ${s.acceptance_dir}`,
    `# the default driver: {ids} becomes the test names joined by | (a regex); {ids_k} the "A or B" form (pytest -k)`,
    `acceptance_cmd: ${q(s.acceptance_cmd)}`,
    `# more ways to run script tests, by name; a test record picks one with driver:. shell is built in (the steps run as commands)`,
    s.playwright ? `drivers: {playwright: {cmd: ${q(s.playwright.cmd)}, dir: ${s.playwright.dir}}}` : `drivers: {}                         # playwright: {cmd: 'npx playwright test --grep "{ids}"', dir: tests/e2e}`,
    `repos: {}                           # other git repos a task may write (repo: in the task): dashboard: {path: ../forks/odh-dashboard}`,
    `fast_checks: [${s.fast_checks.map(q).join(', ')}]`,
    `source_dirs: [${s.source_dirs.join(', ')}]              # the test developer and the tester never read these`,
    `protected: [specs/, .spex/, ${s.acceptance_dir}/, .github/]   # no task may write these; every test folder is protected too`,
    `scopes: []                          # known capabilities; a record with a new scope gets a warning`,
    `banned_words: []                    # added to the built-in list`,
    `live: []                            # real systems a test may write (github:org/repo, gitlab:group/project, cluster:laptop): the one-time yes`,
    `people: []                          # names that never appear as an actor in a task or a test step`,
    `limits: {task_files: 12, instructions_bytes: 1500, approach_bytes: 1200, context_kb: 24, diff_kb: 120, file_kb: 40, tests_scenarios: 12, verify_minutes: 20, step_introduces: 10}`,
    `review_rounds: 3`,
    `verify_rounds: 3                    # whole-feature verify rounds before a person reads it`,
    `approvals: [tasks]                  # stages past gate 1 a person approves with /spex:approve: tasks, tests. The spec and the records always need one`,
    `auto: false                         # true: nobody is asked; the decider agent answers every question with evidence, and you read the answers at the gates`,
    `ship: {commit: false, cmd: ""}      # commit: commit the tree first; cmd: push, open the request, merge it (gh pr create --fill && gh pr merge --squash --delete-branch). Empty cmd: a person merges, then spex ship --merged`,
    '',
  ].join('\n');
}

export function init(root: string, opts: { force?: boolean }): CmdResult {
  const path = join(root, CONFIG_PATH);
  if (fileExists(path) && !opts.force) return { ok: false, findings: [{ severity: 'error', code: 'INIT-EXISTS', message: `${CONFIG_PATH} already exists`, fix: 'Edit it by hand, or pass --force to rewrite it from a new scan.' }], exit: 6, text: '' };
  const s = scan(root);
  ensureDir(join(root, '.spex'));
  writeText(path, render(s));
  const gi = join(root, '.spex', '.gitignore');
  const wroteIgnore = !fileExists(gi);
  if (wroteIgnore) writeText(gi, WORK_GITIGNORE);
  const rootIgnore = join(root, '.gitignore');
  if (fileExists(rootIgnore) && /^\/?\.spex\/?\s*$/m.test(readText(rootIgnore))) s.notes.push('.gitignore ignores .spex/, so .spex/config.yaml never reaches git. Remove that line: .spex/.gitignore ignores the work folders by itself.');
  const lines = [`wrote ${CONFIG_PATH} (runner: ${s.runner})`, `acceptance_dir: ${s.acceptance_dir}`, `acceptance_cmd: ${s.acceptance_cmd || '(not found)'}`, `drivers: ${s.playwright ? `playwright (${s.playwright.dir})` : '(none)'}`, `fast_checks: ${s.fast_checks.join(' ; ') || '(none)'}`, `source_dirs: ${s.source_dirs.join(', ')}`, wroteIgnore ? '.spex/.gitignore written: config.yaml is committed, the rest of .spex/ is ignored' : '.spex/.gitignore kept', ...s.notes.map((n) => `note: ${n}`)];
  return { ok: true, findings: [], exit: 0, text: lines.join('\n'), data: { ...s, gitignore: wroteIgnore ? 'written' : 'kept' } };
}
