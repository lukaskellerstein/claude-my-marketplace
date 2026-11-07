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
import { approve, block, done, gate, next, ship, unblock, type CmdResult } from './commands/lifecycle.js';
import { update } from './commands/update.js';
import { FORMAT } from './config.js';
import { liveIndex } from './commands/live.js';
import { newFeature } from './commands/new.js';
import { report } from './commands/report.js';
import { roadmap } from './commands/roadmap.js';
import { run } from './commands/run.js';
import { showDecisions, showDesign, showInherited, showLessons, showPlan, showRecord, showReview, showSession, showTask, showTests, showVerify } from './commands/show.js';
import { session, verify } from './commands/verify.js';
import type { Finding } from './types.js';

export const VERSION = '2.0.0';

const VALUE_FLAGS = new Set(['base', 'expect', 'task', 'scope', 'from', 'root', 'status', 'summary', 'reason', 'ask', 'roadmap', 'step', 'depends-on', 'test', 'session', 'result', 'observed']);
const LIST_FLAGS = new Set(['concern', 'question', 'file', 'pulled', 'source', 'artifact']);
const BOOL_FLAGS = new Set(['json', 'force', 'branches', 'no-branches', 'all', 'tests', 'plan', 'verify', 'review', 'design', 'decisions', 'inherited', 'lessons', 'shaping', 'planned', 'merged', 'help', 'version']);

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

const HELP = `spex — spec-driven development in small, checkable files. The claim and its proof are never written by the same hand.

  spex init [--force]                          write .spex/config.yaml (and .spex/.gitignore) from a scan of the repo; --force is a new scan and loses hand edits
  spex update                                 after a plugin update: add the new keys with their defaults, run the format migrations (1 → 2 writes tests.yaml), set format; keep every value of yours
  spex new <slug> [--from <file>] [--shaping]  create specs/<NNN>-<slug>/spec.md: the skeleton (--shaping: status: shaping), or a copy of <file>
  spex new <slug> --planned --roadmap <name> --step <n> [--depends-on <dir,dir>] [--source <file#section>]…
                                               one stub of a roadmap (status: planned); the same roadmap flags also go with --shaping for the first step
  spex check [dir…] [--base <ref>] [--no-branches]
  spex approve <dir> [tasks|tests]             the first stage that waits for a person: spec.md shaping → ready · records draft → approved (gate 1, stamps tests.yaml too) · tasks.yaml (stamps tests.yaml too) · tests.yaml alone (as approvals in .spex/config.yaml says)
  spex gate <new|requirements|tasks|tests|develop|verify|review|ship> <dir> [id…]
                                               new: resume a shaping spec, or open a planned step once every depends_on is built · requirements: only a folder under specs/ whose spec.md is ready · tests: the batch of script tests without a file · develop: one task (its tests exist, its needs are met, the red check runs) · verify: every task done, every need met · review: every test green at this tree · ship: review clean
  spex show <dir> <task>                       the input of one develop run: the task, its tests, its records
  spex show <dir> --plan                       the input of the test analyst: every claim without a test, the interfaces, the rules of the plan
  spex show <dir> --tests [TS…]                the input of one test-develop run: the named tests, or the next batch of script tests without a file
  spex show <dir> --session <TS>               the brief of one tester: the session to perform, and how to record it
  spex show <dir> --verify                     after spex verify: each failure with its claim, its file and the task behind it, for the decider
  spex show <dir> --review [--task T] [--base <ref>]
  spex show <dir> <REQ-id> | --design | --decisions
  spex show <dir> --inherited                  what the steps in depends_on settled: goals, interfaces, decisions, entities, produced signatures
  spex show <dir> --lessons                    what a finished step recorded for the steps after it: concerns, questions, default answers, deferred, blocks, decisions, supersedes
  spex roadmap [name]                          the steps of one idea in order, with where each stands; without a name, every roadmap on disk
  spex next <dir> [--all]                      what now: the stage, the one command that moves it, and if the chat can be cleared first; --all lists every ready task by wave
  spex run <dir> <task> [--expect fail]        run the task's tests, write the record (the developer's loop)
  spex run <dir> --test <TS> [--expect fail]   run one script test (the test developer's red run)
  spex verify <dir>                            the whole feature now: fast_checks, every script, every session's evidence at this tree; round n of verify_rounds
  spex session <dir> <TS> --result pass|fail --observed "…" [--artifact <path>]…
                                               record what a tester observed in one session, at this tree
  spex done <dir> <task>                       runs the task's tests now; todo → done only if they pass
  spex block <dir> <task> --reason "…" [--ask "…"]
                                               → blocked, with the reason in .spex/runs/<feature>/block-<task>.json; --ask: the one yes/no question a person answers, and next prints it
  spex unblock <dir> <task>                    blocked → todo once the cause is fixed; the reason file stays for the lessons
  spex coverage <dir>                          which test proves each claim, and which script has no file yet
  spex index [--scope s] [--branches] [--all]  the live requirements
  spex ship <dir> [--merged]                   the end: approved → built, superseded → retired, then (ship.commit) a commit and (ship.cmd) the merge; --merged: a person merged already
  spex report <dir> <stage> [task] --status s --summary "…" [--concern c]* [--question q]* [--file f]* [--pulled p]*

Every command takes --json. Exit codes: 0 ok · 2 usage · 4 invalid · 5 gap · 6 refused · 7 verify failed.`;

function findRoot(start: string): string {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, '.spex')) || existsSync(join(dir, 'specs')) || existsSync(join(dir, '.git'))) return dir;
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
    process.stdout.write(`spex ${VERSION} (format ${FORMAT})\n`);
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
    case 'update':
      return emit(command, update(root), json);
    case 'new': {
      if (!rest[0]) throw new Usage('new needs a slug, e.g. csv-export');
      const step = flags.step === undefined ? undefined : Number(flags.step);
      if (step !== undefined && !Number.isInteger(step)) throw new Usage(`--step takes a whole number, not ${flags.step}`);
      const dependsOn = flags['depends-on'] === undefined ? undefined : String(flags['depends-on']).split(',').map((s) => s.trim()).filter(Boolean);
      return emit(command, newFeature(root, rest[0], { from: flags.from as string | undefined, shaping: flags.shaping === true, planned: flags.planned === true, roadmap: flags.roadmap as string | undefined, step, depends_on: dependsOn, source: flags.source as string[] | undefined }), json);
    }
    case 'roadmap':
      return emit(command, roadmap(root, rest[0]), json);
    case 'check': {
      const r = runCheck(root, rest, { base: flags.base as string | undefined, branches: flags['no-branches'] !== true });
      const exit = exitCodeFor(r.findings);
      const counts = { error: 0, warning: 0, info: 0, gap: 0 };
      for (const f of r.findings) counts[f.severity]++;
      const summary = `${r.features.map((f) => f.dir).join(', ') || '(no spec folders)'}: ${counts.error} error(s), ${counts.gap} gap(s), ${counts.warning} warning(s), ${counts.info} info`;
      return emit(command, { ok: exit === 0, findings: r.findings, exit, text: summary, data: { features: r.features.map((f) => f.dir), counts, format: { repo: r.config.format, script: FORMAT } } }, json);
    }
    case 'approve':
      return emit(command, approve(root, needDir(), rest[1]), json);
    case 'gate': {
      const [stage, dir, ...ids] = rest;
      if (!stage || !dir) throw new Usage('gate needs a stage and a spec folder');
      return emit(command, gate(root, stage, dir, ids), json);
    }
    case 'show': {
      const dir = needDir();
      if (flags.plan) return emit(command, showPlan(root, dir), json);
      if (flags.tests) return emit(command, showTests(root, dir, rest.slice(1)), json);
      if (flags.session !== undefined) return emit(command, showSession(root, dir, String(flags.session)), json);
      if (flags.verify) return emit(command, showVerify(root, dir), json);
      if (flags.review) return emit(command, showReview(root, dir, { task: flags.task as string | undefined, base: flags.base as string | undefined }), json);
      if (flags.design) return emit(command, showDesign(root, dir), json);
      if (flags.decisions) return emit(command, showDecisions(root, dir), json);
      if (flags.inherited) return emit(command, showInherited(root, dir), json);
      if (flags.lessons) return emit(command, showLessons(root, dir), json);
      const what = needTask();
      if (what.startsWith('REQ-')) return emit(command, showRecord(root, dir, what), json);
      return emit(command, showTask(root, dir, what), json);
    }
    case 'next':
      return emit(command, next(root, needDir(), { all: flags.all === true }), json);
    case 'run': {
      const expect = (flags.expect as string | undefined) ?? 'pass';
      if (expect !== 'pass' && expect !== 'fail') throw new Usage('--expect takes pass or fail');
      return emit(command, run(root, needDir(), rest[1], { expect, all: flags.all === true, test: flags.test as string | undefined }), json);
    }
    case 'verify':
      return emit(command, verify(root, needDir()), json);
    case 'session': {
      const dir = needDir();
      const id = rest[1];
      if (!id) throw new Usage('session needs a test id, e.g. TS07');
      return emit(command, session(root, dir, id, { result: (flags.result as string) ?? '', observed: (flags.observed as string) ?? '', artifacts: (flags.artifact as string[]) ?? [] }), json);
    }
    case 'done':
      return emit(command, done(root, needDir(), needTask()), json);
    case 'block':
      return emit(command, block(root, needDir(), needTask(), (flags.reason as string) ?? 'no reason given', (flags.ask as string | undefined) || undefined), json);
    case 'unblock':
      return emit(command, unblock(root, needDir(), needTask()), json);
    case 'coverage':
      return emit(command, coverage(root, needDir()), json);
    case 'index':
      return emit(command, liveIndex(root, { scope: flags.scope as string | undefined, branches: flags.branches === true, all: flags.all === true }), json);
    case 'ship':
      return emit(command, ship(root, needDir(), { merged: flags.merged === true }), json);
    case 'archive':
      throw new Usage('archive is `spex ship <dir> --merged` since 2.0: the close after a merge a person made');
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
