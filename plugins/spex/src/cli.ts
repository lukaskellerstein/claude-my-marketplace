// spex — the script behind the /spex:* skills. One bundled file, Node 20+, no install step.
// (The shebang comes from the esbuild banner in package.json.)
//
// Exit codes: 0 ok · 2 usage · 4 invalid spec · 5 coverage gap · 6 gate refused · 7 verify failed.
// Every command takes --json and then prints one document: {ok, command, findings, ...}.

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { exitCodeFor, runCheck } from './check.js';
import { coverage } from './commands/coverage.js';
import { init } from './commands/init.js';
import { approve, archive, block, done, gate, next, type CmdResult } from './commands/lifecycle.js';
import { liveIndex } from './commands/live.js';
import { newFeature } from './commands/new.js';
import { report } from './commands/report.js';
import { run } from './commands/run.js';
import { showDecisions, showDesign, showRecord, showReview, showTask, showTests } from './commands/show.js';
import type { Finding } from './types.js';

const VALUE_FLAGS = new Set(['base', 'expect', 'task', 'scope', 'brief', 'root', 'status', 'summary', 'reason']);
const LIST_FLAGS = new Set(['concern', 'question', 'file', 'pulled']);
const BOOL_FLAGS = new Set(['json', 'force', 'branches', 'no-branches', 'all', 'tests', 'review', 'design', 'decisions', 'help', 'version']);

interface Args {
  positional: string[];
  flags: Record<string, string | boolean | string[]>;
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  const flags: Record<string, string | boolean | string[]> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    const name = eq >= 0 ? a.slice(2, eq) : a.slice(2);
    const inline = eq >= 0 ? a.slice(eq + 1) : undefined;
    if (BOOL_FLAGS.has(name)) flags[name] = inline === undefined ? true : inline !== 'false';
    else if (VALUE_FLAGS.has(name)) flags[name] = inline ?? argv[++i] ?? '';
    else if (LIST_FLAGS.has(name)) flags[name] = [...((flags[name] as string[]) ?? []), inline ?? argv[++i] ?? ''];
    else throw new Usage(`unknown flag --${name}`);
  }
  return { positional, flags };
}

class Usage extends Error {}

const HELP = `spex — spec-driven development in small, checkable files

  spex init [--force]                          write specs/spex.yaml from a scan of the repo
  spex new <slug> [--brief <file>]             create specs/<NNN>-<slug>/
  spex check [dir…] [--base <ref>] [--no-branches]
  spex approve <dir>                           draft → approved (gate 1)
  spex gate <plan|tests|implement|review> <dir> [task…]   tests: the batch; implement: one task (runs the red check)
  spex show <dir> <task>                       the input of one implement run
  spex show <dir> --tests [task…]              the input of one tests run: the named tasks, or the next batch
  spex show <dir> --review [--task T] [--base <ref>]
  spex show <dir> <REQ-id> | --design | --decisions
  spex next <dir>                              the next ready task
  spex run <dir> <task> [--expect fail]        run the verify commands, write the record (the agent's loop)
  spex run <dir> --all                         the whole feature's checks
  spex done <dir> <task>                       runs every verify command now; todo → done only if they pass
  spex block <dir> <task> --reason "…"
  spex coverage <dir>                          scenarios without a test
  spex index [--scope s] [--branches] [--all]  the live requirements
  spex archive <dir>                           approved → built after the merge (gate 2)
  spex report <dir> <stage> [task] --status s --summary "…" [--concern c]* [--question q]* [--file f]* [--pulled p]*

Every command takes --json. Exit codes: 0 ok · 2 usage · 4 invalid · 5 gap · 6 refused · 7 verify failed.`;

function findRoot(start: string): string {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, 'specs')) || existsSync(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}

function renderFindings(findings: Finding[]): string {
  return findings
    .map((f) => `[${f.severity}] ${f.code}${f.path ? `  ${f.path}` : ''}${f.id ? ` (${f.id})` : ''}: ${f.message}${f.fix ? `\n    → ${f.fix}` : ''}`)
    .join('\n');
}

function emit(command: string, result: CmdResult, json: boolean): never {
  if (json) {
    const { text, data, ...rest } = result;
    process.stdout.write(JSON.stringify({ command, ...rest, ...(data ?? {}), text }, null, 2) + '\n');
  } else {
    const parts = [result.text, renderFindings(result.findings)].filter(Boolean);
    process.stdout.write(parts.join('\n') + '\n');
  }
  process.exit(result.exit);
}

function main(argv: string[]): void {
  const { positional, flags } = parseArgs(argv);
  const json = flags.json === true;
  const [command, ...rest] = positional;
  const root = findRoot((flags.root as string) ?? process.cwd());
  if (flags.version || command === 'version') {
    process.stdout.write('spex 1.1.0\n');
    process.exit(0);
  }
  if (!command || flags.help || command === 'help') {
    process.stdout.write(HELP + '\n');
    process.exit(command ? 0 : 2);
  }
  const needDir = (): string => {
    if (!rest[0]) throw new Usage(`${command} needs a spec folder, e.g. specs/007-csv-export`);
    return rest[0];
  };
  const needTask = (i = 1): string => {
    if (!rest[i]) throw new Usage(`${command} needs a task id, e.g. T01`);
    return rest[i];
  };
  switch (command) {
    case 'init':
      return emit(command, init(root, { force: flags.force === true }), json);
    case 'new':
      if (!rest[0]) throw new Usage('new needs a slug, e.g. csv-export');
      return emit(command, newFeature(root, rest[0], { brief: flags.brief as string | undefined }), json);
    case 'check': {
      const r = runCheck(root, rest, { base: flags.base as string | undefined, branches: flags['no-branches'] !== true });
      const exit = exitCodeFor(r.findings);
      const counts = { error: 0, warning: 0, info: 0, gap: 0 };
      for (const f of r.findings) counts[f.severity]++;
      const summary = `${r.features.map((f) => f.dir).join(', ') || '(no spec folders)'}: ${counts.error} error(s), ${counts.gap} gap(s), ${counts.warning} warning(s), ${counts.info} info`;
      return emit(command, { ok: exit === 0, findings: r.findings, exit, text: summary, data: { features: r.features.map((f) => f.dir), counts } }, json);
    }
    case 'approve':
      return emit(command, approve(root, needDir()), json);
    case 'gate': {
      const [stage, dir, ...tasks] = rest;
      if (!stage || !dir) throw new Usage('gate needs a stage and a spec folder');
      return emit(command, gate(root, stage, dir, tasks), json);
    }
    case 'show': {
      const dir = needDir();
      if (flags.tests) return emit(command, showTests(root, dir, rest.slice(1)), json);
      if (flags.review) return emit(command, showReview(root, dir, { task: flags.task as string | undefined, base: flags.base as string | undefined }), json);
      if (flags.design) return emit(command, showDesign(root, dir), json);
      if (flags.decisions) return emit(command, showDecisions(root, dir), json);
      const what = needTask();
      if (what.startsWith('REQ-')) return emit(command, showRecord(root, dir, what), json);
      return emit(command, showTask(root, dir, what), json);
    }
    case 'next':
      return emit(command, next(root, needDir()), json);
    case 'run': {
      const expect = (flags.expect as string | undefined) ?? 'pass';
      if (expect !== 'pass' && expect !== 'fail') throw new Usage('--expect takes pass or fail');
      return emit(command, run(root, needDir(), rest[1], { expect, all: flags.all === true }), json);
    }
    case 'done':
      return emit(command, done(root, needDir(), needTask()), json);
    case 'block':
      return emit(command, block(root, needDir(), needTask(), (flags.reason as string) ?? 'no reason given'), json);
    case 'coverage':
      return emit(command, coverage(root, needDir()), json);
    case 'index':
      return emit(command, liveIndex(root, { scope: flags.scope as string | undefined, branches: flags.branches === true, all: flags.all === true }), json);
    case 'archive':
      return emit(command, archive(root, needDir()), json);
    case 'report': {
      const dir = needDir();
      const stage = rest[1];
      if (!stage) throw new Usage('report needs a stage name');
      const task = rest[2];
      return emit(
        command,
        report(root, dir, {
          stage,
          task,
          status: (flags.status as string) ?? '',
          summary: (flags.summary as string) ?? '',
          concerns: (flags.concern as string[]) ?? [],
          questions: (flags.question as string[]) ?? [],
          files: (flags.file as string[]) ?? [],
          pulled: (flags.pulled as string[]) ?? [],
        }),
        json,
      );
    }
    default:
      throw new Usage(`unknown command ${command}`);
  }
}

try {
  main(process.argv.slice(2));
} catch (e) {
  const usage = e instanceof Usage;
  const message = (e as Error).message;
  if (process.argv.includes('--json')) process.stdout.write(JSON.stringify({ ok: false, command: process.argv[2] ?? null, findings: [{ severity: 'error', code: usage ? 'USAGE' : 'INTERNAL', message }], exit: usage ? 2 : 1 }) + '\n');
  else process.stderr.write(`${usage ? 'usage' : 'error'}: ${message}\n${usage ? '\n' + HELP + '\n' : ''}`);
  process.exit(usage ? 2 : 1);
}
