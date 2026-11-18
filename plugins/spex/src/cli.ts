// spex — the script behind the /spex:* skills. One bundled file, Node 20+, no install step.
// (The shebang comes from the esbuild banner in package.json.)
//
// Exit codes: 0 ok · 2 usage · 4 invalid spec · 5 coverage gap · 6 gate refused · 7 a run failed · 8 a worktree is not removed.
// Every command takes --json and then prints one document: {ok, command, findings, ...}.

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { exitCodeFor, runCheck } from './check.js';
import { close } from './commands/close.js';
import { comment, correction } from './commands/comment.js';
import { coverage } from './commands/coverage.js';
import { deleteSpecs } from './commands/delete.js';
import { init } from './commands/init.js';
import { block, done, gate, paths, unblock, type CmdResult } from './commands/lifecycle.js';
import { update } from './commands/update.js';
import { FORMAT } from './config.js';
import { liveIndex } from './commands/live.js';
import { cover, newFeature } from './commands/new.js';
import { newBug } from './commands/newbug.js';
import { outline } from './commands/outline.js';
import { end, stamp, start } from './commands/phase.js';
import { report } from './commands/report.js';
import { reviewAccept } from './commands/review.js';
import { roadmap } from './commands/roadmap.js';
import { run } from './commands/run.js';
import { showDecisions, showDesign, showInherited, showLessons, showPlan, showReady, showRecord, showReview, showSession, showTask, showTests, showVerify } from './commands/show.js';
import { commitNotes, list, status } from './commands/status.js';
import { session, verify } from './commands/verify.js';
import { FIELDS, type Field } from './corrections.js';
import { homeOf } from './state.js';
import type { Finding } from './types.js';

export const VERSION = '3.1.0';

const FIELD_FLAGS = FIELDS.map((f) => f.toLowerCase().replace(' ', '-'));
const VALUE_FLAGS = new Set(['number', 'base', 'expect', 'task', 'scope', 'words', 'text', 'message', 'title', 'done', 'root', 'status', 'summary', 'reason', 'ask', 'roadmap', 'step', 'depends-on', 'test', 'session', 'result', 'observed', 'by', ...FIELD_FLAGS]);
const LIST_FLAGS = new Set(['concern', 'question', 'file', 'pulled', 'source', 'artifact', 'add', 'close']);
/** List flags whose values are paths or ids, never prose: each takes every value up to the next flag. */
const MANY_FLAGS = new Set(['file', 'pulled', 'add', 'close']);
const BOOL_FLAGS = new Set(['json', 'force', 'branches', 'no-branches', 'all', 'tests', 'plan', 'verify', 'review', 'design', 'decisions', 'inherited', 'lessons', 'ready', 'help', 'version', 'coverage', 'init', 'closed', 'preview', 'approved']);

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
    else if (LIST_FLAGS.has(name)) {
      // `--add a b c` is three paths, as the help's `<path>…` says: a flag of paths or ids takes every value up to the next
      // flag. Dex 017: `spex paths … --add a b c` kept a, and b and c fell silently into the positionals.
      const values = inline !== undefined ? [inline] : [];
      if (inline === undefined && MANY_FLAGS.has(name)) while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) values.push(argv[++i]);
      else if (inline === undefined) values.push(argv[++i] ?? '');
      flags[name] = [...((flags[name] as string[]) ?? []), ...(values.length ? values : [''])];
    }
    else throw new Usage(`unknown flag --${name}`);
  }
  return { positional, flags };
}

class Usage extends Error {}

const HELP = `spex — spec-driven development in small, checkable files. The claim and its proof are never written by the same hand.

A spec is a folder under specs/. Its state is in one file, status.yaml: no file is a note; plan, implement and review each start and end in this script.

  setup
  spex init [--force]                          write .spex/config.yaml (and .spex/.gitignore) from a scan of the repo; --force is a new scan and loses hand edits
  spex update                                  after a plugin update: add the new keys, run the format migrations (2 → 3: status.yaml, close:, commit:), keep every value of yours

  new, new-bug, delete, status (in the main folder, on the base branch)
  spex list                                    every spec by its number, with its state; the next number at the end
  spex new <slug> [--words <file>] [--number <n>] [--roadmap <name> --step <n>] [--depends-on <dir,dir>] [--source <file#section>]…
                                               one note: specs/<NNN>-<slug>/spec.md, and source.md with the text of <file>, word for word
  spex cover <text file> <dir>…                every line of the person's text is linked from a note (← source.md#L3), or has its reason there
  spex new-bug <slug> --words <file>           one note for a bug in merged code, with the next turn; each note that waits moves one number up
  spex delete <dir>… --reason "…"              take a spec off the list: a spec with a worktree is saved to .spex/archive/ (the folder, code.patch) first; then the worktree, the branch, the note; the later notes move down
  spex commit --preview                        change nothing: name the files, and the question for the person (commit and push to origin/main?)
  spex commit --approved --message "…"         the person said yes: commit specs/ on the base branch and push it to the branch it tracks
  spex commit --message "…"                    commit specs/ on the base branch, only with commit: true (and push it when close.cmd merges through a remote); without it, name the files
                                               both take .spex/config.yaml and .spex/.gitignore along with the notes when they are new or changed, and no other file
  spex status                                  where the work stopped: the open spec, its phase, the one command to go on
  spex roadmap [name] | <name> --init --source <file>… | <name> --coverage
  spex outline <file>…                         a design's sections, with the anchor a source or a coverage row names

  the phases of a spec
  the phases run in a session started in the worktree of the spec: claude -w spex/<spec>. A start anywhere else is GATE-ENTER, and makes nothing
  spex start plan <dir>                        the gate (its turn, this session on spex/<spec>, the note committed), worktree.setup at the first start here, status.yaml: plan, started
  spex end plan <dir>                          "All linked?" (your line → record → task → test), the stamp, status.yaml: plan, done, one commit on the branch of the spec
  spex start implement <dir>                   the plan is as stamped (typing implement approves it), draft → approved, the needs and env.up, status.yaml: implement, started
  spex end implement <dir>                     every task done, the proof green on this tree; status.yaml: implement, done, one commit
  spex start review <dir>                      built and green, status.yaml: review, started
  spex close <dir> <sync|later|prove|built|merge|finish>
                                               the close, in this order: the base branch in · the later notes · still green? · records → built, review, done, commit · close.cmd · (a session on the main folder) pull, the local merge, env.down, remove the worktree and the branch
  spex comment [--words <file> | --text "…"]   keep the person's words in corrections.md of the open spec, as an open entry; no words: go on with one that is not finished
  spex stamp <dir> [--close <C-id>…] [--changed "…"]
                                               the process changed the plan: check the links, stamp it, close the entry, commit; a built spec goes back to implement, started
  spex correction <dir> --title "…" [--found …] [--was …] [--changed …] [--pick …] [--why …] [--reaches …] [--you-said …] [--closed]
  spex correction <dir> --close <C-id>… [--done "what closed it"]
                                               one entry of corrections.md: a verdict, an answer, a pick, a line passed to a later spec

  inside a phase
  spex check [dir…] [--base <ref>] [--no-branches]
  spex show <dir> <task>                       the input of one developer: the task, its tests, its records
  spex show <dir> --ready                      the tasks that can start now, as waves (T03 + T04 run together), and each task that waits
  spex show <dir> --plan                       the input of the test analyst: every claim without a test, the interfaces, the rules of the plan
  spex show <dir> --tests [TS…]                the input of one test developer: the named tests, or the next batch of script tests without a file
  spex show <dir> --session <TS>               the brief of one tester: the session to perform, and how to record it
  spex show <dir> --verify                     after spex verify: each failure with its claim, its file and the task behind it, for the decider
  spex show <dir> --review [--task T] [--base <ref>]
  spex show <dir> <REQ-id> | --design | --decisions
  spex show <dir> --inherited                  what the specs in depends_on settled: goals, interfaces, decisions, entities, produced signatures
  spex show <dir> --lessons                    what a finished spec recorded for the specs after it
  spex gate <tests|develop|verify> <dir> [id…] tests: the batch of script tests without a file · develop: one task (its tests exist, its needs are met, the red check runs) · verify: every task done, every need met
  spex run <dir> <task> [--expect fail]        run the task's tests, write the record (the developer's loop)
  spex run <dir> --test <TS> [--expect fail]   run one script test (the test developer's red run)
  spex done <dir> <task>                       runs the task's tests now; todo → done only if they pass
  spex block <dir> <task> --reason "…" [--ask "…"] | spex unblock <dir> <task>
  spex paths <dir> <task> --add <path>… --reason "…"
                                               a decider said the task must write a file outside its paths: add it, under the check rules
  spex verify <dir>                            the whole spec now: env.deploy and env.check, fast_checks, every script, every session's evidence at this tree; round n of verify_rounds
  spex session <dir> <TS> --result pass|fail --observed "…" [--artifact <path>]…
  spex coverage <dir>                          which test proves each claim, and which script has no file yet
  spex index [--scope s] [--branches] [--all]  the live requirements
  spex review accept <dir> [ok | F2=defer | 3=fix | all=skip]… [--by agent]
                                               the answer to the newest review round: a fix pick → a fix task and implement, started · defer → deferred[] · skip → noted; each pick is an entry in corrections.md
  spex report <dir> <stage> [task] --status s --summary "…" [--concern c]* [--question q]* [--file f]* [--pulled p]*

A command that names a spec works in the worktree of that spec when it has one, from any folder of the repo. The script never makes a worktree.
Every command takes --json. Exit codes: 0 ok · 2 usage · 4 invalid · 5 gap · 6 refused · 7 failed · 8 a worktree is not removed (run the printed command outside the sandbox).`;

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

/** Print the result and set the exit code. No process.exit here: on a pipe it cuts off output past 64 KB. */
function emit(command: string, result: CmdResult, json: boolean): void {
  if (json) {
    const { text, data, ...rest } = result;
    process.stdout.write(JSON.stringify({ command, ...rest, ...(data ?? {}), text }, null, 2) + '\n');
  } else {
    const parts = [result.text, renderFindings(result.findings)].filter(Boolean);
    process.stdout.write(parts.join('\n') + '\n');
  }
  process.exitCode = result.exit;
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
  const needDir = (i = 0): string => {
    if (!rest[i]) throw new Usage(`${command} needs a spec folder, e.g. specs/007-csv-export`);
    return rest[i];
  };
  const needTask = (i = 1): string => {
    if (!rest[i]) throw new Usage(`${command} needs a task id, e.g. T01`);
    return rest[i];
  };
  // A spec that is open lives in its worktree. A command that names it works there, from any folder of the repo.
  const at = (dir: string): string => homeOf(root, dir);
  const str = (name: string): string | undefined => (typeof flags[name] === 'string' ? (flags[name] as string) : undefined);
  switch (command) {
    case 'init':
      return emit(command, init(root, { force: flags.force === true }), json);
    case 'update':
      return emit(command, update(root), json);
    case 'list':
      return emit(command, list(root), json);
    case 'status':
      return emit(command, status(root), json);
    case 'commit':
      return emit(command, commitNotes(root, str('message') ?? '', { preview: flags.preview === true, approved: flags.approved === true }), json);
    case 'new': {
      if (!rest[0]) throw new Usage('new needs a slug, e.g. csv-export');
      const step = flags.step === undefined ? undefined : Number(flags.step);
      if (step !== undefined && !Number.isInteger(step)) throw new Usage(`--step takes a whole number, not ${flags.step}`);
      const number = flags.number === undefined ? undefined : Number(flags.number);
      if (number !== undefined && !Number.isInteger(number)) throw new Usage(`--number takes a whole number, not ${flags.number}`);
      const dependsOn = flags['depends-on'] === undefined ? undefined : String(flags['depends-on']).split(',').map((s) => s.trim()).filter(Boolean);
      return emit(command, newFeature(root, rest[0], { words: str('words'), roadmap: str('roadmap'), step, depends_on: dependsOn, source: flags.source as string[] | undefined, number }), json);
    }
    case 'new-bug':
      if (!rest[0]) throw new Usage('new-bug needs a slug, e.g. export-cuts-long-names');
      return emit(command, newBug(root, rest[0], str('words')), json);
    case 'cover':
      if (!rest[0]) throw new Usage('cover needs the text file and the notes: spex cover specs/007-csv-export/source.md specs/007-csv-export');
      return emit(command, cover(root, rest[0], rest.slice(1)), json);
    case 'delete':
      return emit(command, deleteSpecs(root, rest, str('reason') ?? ''), json);
    case 'roadmap':
      return emit(command, roadmap(root, rest[0], { coverage: flags.coverage === true, init: flags.init === true, source: flags.source as string[] | undefined, force: flags.force === true }), json);
    case 'outline':
      return emit(command, outline(root, rest), json);
    case 'start':
    case 'end': {
      const [phase, dir] = rest;
      if (!phase || !dir) throw new Usage(`${command} needs a phase and a spec folder: spex ${command} plan specs/007-csv-export`);
      return emit(command, command === 'start' ? start(root, phase, dir) : end(root, phase, dir), json);
    }
    case 'close': {
      const [dir, step] = rest;
      if (!dir || !step) throw new Usage('close needs a spec folder and a step: spex close specs/007-csv-export sync');
      return emit(command, close(root, dir, step), json);
    }
    case 'comment':
      return emit(command, comment(root, { words: str('words'), text: str('text') ?? (rest.length ? rest.join(' ') : undefined) }), json);
    case 'stamp':
      return emit(command, stamp(root, needDir(), { close: flags.close as string[] | undefined, changed: str('changed') }), json);
    case 'correction': {
      const fields: Partial<Record<Field, string>> = {};
      FIELDS.forEach((f, i) => {
        const v = str(FIELD_FLAGS[i]);
        if (v !== undefined) fields[f] = v;
      });
      return emit(command, correction(root, needDir(), { title: str('title'), close: flags.close as string[] | undefined, done: str('done'), fields, closed: flags.closed === true }), json);
    }
    case 'check': {
      // One named spec: checked where it lives. No name, or many: the folder the command was called in.
      const where = rest.length === 1 ? at(rest[0]) : root;
      const r = runCheck(where, rest, { base: flags.base as string | undefined, branches: flags['no-branches'] !== true });
      const exit = exitCodeFor(r.findings);
      const counts = { error: 0, warning: 0, info: 0, gap: 0 };
      for (const f of r.findings) counts[f.severity]++;
      const summary = `${r.features.map((f) => f.dir).join(', ') || '(no spec folders)'}: ${counts.error} error(s), ${counts.gap} gap(s), ${counts.warning} warning(s), ${counts.info} info`;
      return emit(command, { ok: exit === 0, findings: r.findings, exit, text: summary, data: { features: r.features.map((f) => f.dir), counts, format: { repo: r.config.format, script: FORMAT } } }, json);
    }
    case 'gate': {
      const [stage, dir, ...ids] = rest;
      if (!stage || !dir) throw new Usage('gate needs a stage and a spec folder');
      return emit(command, gate(at(dir), stage, dir, ids), json);
    }
    case 'show': {
      const dir = needDir();
      const home = at(dir);
      if (flags.ready) return emit(command, showReady(home, dir), json);
      if (flags.plan) return emit(command, showPlan(home, dir), json);
      if (flags.tests) return emit(command, showTests(home, dir, rest.slice(1)), json);
      if (flags.session !== undefined) return emit(command, showSession(home, dir, String(flags.session)), json);
      if (flags.verify) return emit(command, showVerify(home, dir), json);
      if (flags.review) return emit(command, showReview(home, dir, { task: flags.task as string | undefined, base: flags.base as string | undefined }), json);
      if (flags.design) return emit(command, showDesign(home, dir), json);
      if (flags.decisions) return emit(command, showDecisions(home, dir), json);
      if (flags.inherited) return emit(command, showInherited(home, dir), json);
      if (flags.lessons) return emit(command, showLessons(home, dir), json);
      const what = needTask();
      if (what.startsWith('REQ-')) return emit(command, showRecord(home, dir, what), json);
      return emit(command, showTask(home, dir, what), json);
    }
    case 'run': {
      const expect = (flags.expect as string | undefined) ?? 'pass';
      if (expect !== 'pass' && expect !== 'fail') throw new Usage('--expect takes pass or fail');
      return emit(command, run(at(needDir()), needDir(), rest[1], { expect, all: flags.all === true, test: flags.test as string | undefined }), json);
    }
    case 'verify':
      return emit(command, verify(at(needDir()), needDir()), json);
    case 'session': {
      const dir = needDir();
      const id = rest[1];
      if (!id) throw new Usage('session needs a test id, e.g. TS07');
      return emit(command, session(at(dir), dir, id, { result: (flags.result as string) ?? '', observed: (flags.observed as string) ?? '', artifacts: (flags.artifact as string[]) ?? [] }), json);
    }
    case 'done':
      return emit(command, done(at(needDir()), needDir(), needTask()), json);
    case 'block':
      return emit(command, block(at(needDir()), needDir(), needTask(), (flags.reason as string) ?? 'no reason given', (flags.ask as string | undefined) || undefined), json);
    case 'unblock':
      return emit(command, unblock(at(needDir()), needDir(), needTask()), json);
    case 'paths':
      // A word after the task id is a path the caller meant to add: refuse it, never drop it.
      if (rest.length > 2) throw new Usage(`paths takes <dir> <task> and --add <path>…; ${rest.slice(2).join(', ')} is not under --add`);
      return emit(command, paths(at(needDir()), needDir(), needTask(), (flags.add as string[] | undefined) ?? [], (flags.reason as string | undefined) ?? ''), json);
    case 'coverage':
      return emit(command, coverage(at(needDir()), needDir()), json);
    case 'index':
      return emit(command, liveIndex(root, { scope: flags.scope as string | undefined, branches: flags.branches === true, all: flags.all === true }), json);
    case 'review': {
      const [sub, dir, ...picks] = rest;
      if (sub !== 'accept') throw new Usage('review takes one subcommand: spex review accept <dir> [ok | F2=defer]…');
      if (!dir) throw new Usage('review accept needs a spec folder');
      return emit(command, reviewAccept(at(dir), dir, picks, (flags.by as string | undefined) || 'person'), json);
    }
    case 'approve':
      throw new Usage('there is no approve since 3.0: the next command is the approval. `spex start implement <dir>` approves the plan.');
    case 'next':
      throw new Usage('next is `spex status` since 3.0: the open spec, its phase, and the one command to go on.');
    case 'ship':
      throw new Usage('ship is the close since 3.0, the second half of review: `spex close <dir> <sync|later|prove|built|merge|finish>`.');
    case 'drop':
      throw new Usage('drop is `spex delete <dir> --reason "…"` since 3.0: it also closes up the later numbers.');
    case 'report': {
      const dir = needDir();
      const stage = rest[1];
      if (!stage) throw new Usage('report needs a stage name');
      const task = rest[2];
      return emit(
        command,
        report(at(dir), dir, {
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
