// `spex update`: bring .spex/config.yaml and the spec folders to this script's format after a plugin update. It
// keeps every value and comment a person wrote, adds the keys a newer plugin introduced with their defaults and
// comments, runs the format migrations in order, and sets `format`. `init --force` is a new scan and loses hand
// edits; this never does.

import { join } from 'node:path';
import { isMap, isScalar, isSeq, stringify, type Document, type Pair } from 'yaml';
import { stampPlan, tasksHash } from '../approvals.js';
import { CONFIG_PATH, DEFAULT_CONFIG, DEFAULT_LIMITS, FORMAT } from '../config.js';
import { testId } from '../ears.js';
import { fileExists, loadYaml, openDocument, readText, saveDocument, walk, writeText } from '../io.js';
import { isBuilt } from '../rules/spec.js';
import { featureDirs, loadFeature } from '../specs.js';
import { readState, writeState } from '../state.js';
import type { TasksFile } from '../types.js';
import type { CmdResult } from './lifecycle.js';

/** One entry per format step: MIGRATIONS[n] takes a repo from format n to n + 1. */
const MIGRATIONS: Record<number, (root: string, doc: Document, changes: string[]) => void> = {
  1: migrateToFormat2,
  2: migrateToFormat3,
};

/** The top-level keys in file order, each with the default and the comment `init` writes, for the ones a person's file lacks. */
const KEYS: { key: string; value: unknown; comment?: string; flow?: boolean }[] = [
  { key: 'format', value: FORMAT, comment: 'the shape of specs/ and .spex/; spex update changes it, nothing else does' },
  { key: 'acceptance_dir', value: DEFAULT_CONFIG.acceptance_dir },
  { key: 'acceptance_cmd', value: '', comment: 'the default driver. {ids} becomes the test names joined by | (a regex); {ids_k} the "A or B" form (pytest -k)' },
  { key: 'drivers', value: {}, flow: true, comment: 'more ways to run script tests: playwright: {cmd: \'npx playwright test --grep "{ids}"\', dir: tests/e2e}' },
  { key: 'repos', value: {}, flow: true, comment: 'other git repos a task may write (repo: in the task): web: {path: ../web-ui}' },
  { key: 'fast_checks', value: [], flow: true },
  { key: 'source_dirs', value: DEFAULT_CONFIG.source_dirs, flow: true, comment: 'the test developer and the tester never read these' },
  { key: 'protected', value: DEFAULT_CONFIG.protected, flow: true, comment: 'no task may write these; every test folder is protected too' },
  { key: 'scopes', value: [], flow: true, comment: 'known capabilities; a record with a new scope gets a warning' },
  { key: 'banned_words', value: [], flow: true, comment: 'added to the built-in list' },
  { key: 'live', value: [], flow: true, comment: 'real systems a test may write (github:org/repo, gitlab:group/project, cluster:laptop): the one-time yes' },
  { key: 'people', value: [], flow: true, comment: 'names that never appear as an actor in a task or a test step' },
  { key: 'limits', value: { ...DEFAULT_LIMITS }, flow: true },
  { key: 'review_rounds', value: DEFAULT_CONFIG.review_rounds },
  { key: 'verify_rounds', value: DEFAULT_CONFIG.verify_rounds, comment: 'whole-feature verify rounds before a person reads it' },
  { key: 'auto', value: DEFAULT_CONFIG.auto, comment: 'true: nobody is asked; the decider agent answers every question with evidence, and each digest lists its answers' },
  { key: 'commit', value: DEFAULT_CONFIG.commit, comment: 'true: the script commits the notes of new, new-bug and delete on the base branch, and with a merge command and a remote it pushes them. On the branch of a spec it always commits' },
  { key: 'base', value: DEFAULT_CONFIG.base, comment: 'the branch a spec starts from and merges into. Empty: the branch the main folder is on' },
  { key: 'close', value: { ...DEFAULT_CONFIG.close }, flow: true, comment: 'cmd: push, open the request, merge it. `local`: the script merges in the main folder. Empty: you merge, then type /spex:review again' },
  { key: 'worktree', value: { ...DEFAULT_CONFIG.worktree }, flow: true, comment: 'setup: runs one time in a new worktree (install the packages, copy .env)' },
];

/**
 * Format 2 → 3 (spex 3.0). The config: `ship.commit` becomes `commit`, `ship.cmd` becomes `close.cmd` (also in each
 * repo), and `approvals` goes: the next command is the approval. The specs: the `status:` line leaves spec.md, and
 * status.yaml says where each spec stands. A shipped spec is `review, done`. A spec with no records is a note, with
 * no file. A spec that is in the middle keeps its files: a full plan is stamped as `plan, done`, or as
 * `implement, started` when a task is done; less than a full plan is `plan, started`, and /spex:plan finishes it.
 */
function migrateToFormat3(root: string, doc: Document, changes: string[]): void {
  const map = doc.contents;
  if (isMap(map)) {
    const ship = map.get('ship');
    if (isMap(ship)) {
      if (!map.has('commit') && ship.has('commit')) map.set('commit', ship.get('commit'));
      if (!map.has('close')) {
        const close = doc.createNode({ cmd: String(ship.get('cmd') ?? '') });
        (close as { flow?: boolean }).flow = true;
        map.set('close', close);
      }
      changes.push('ship: → commit: and close: {cmd}');
    }
    if (map.has('ship')) map.delete('ship');
    if (map.has('approvals')) {
      map.delete('approvals');
      changes.push('approvals: removed (the next command is the approval)');
    }
    const repos = map.get('repos');
    if (isMap(repos)) {
      for (const item of repos.items) {
        if (!isMap(item.value) || !item.value.has('ship')) continue;
        item.value.set('close', item.value.get('ship'));
        item.value.delete('ship');
        changes.push(`repos.${keyOf(item)}.ship → close`);
      }
    }
  }
  for (const dir of featureDirs(root)) {
    const spec = join(root, dir, 'spec.md');
    if (fileExists(spec)) {
      const text = readText(spec);
      const fm = text.match(/^---\n([\s\S]*?)\n---\n?/);
      if (fm && /^status:.*$/m.test(fm[1])) {
        const body = fm[1].split('\n').filter((l) => !/^status:/.test(l)).join('\n');
        writeText(spec, body.trim() ? text.replace(fm[0], `---\n${body}\n---\n`) : text.replace(fm[0], ''));
        changes.push(`${dir}/spec.md: the status line is gone`);
      }
    }
    if (readState(root, dir)) continue;
    const feature = loadFeature(root, dir);
    if (!feature.requirements) continue; // a note: no status.yaml
    if (isBuilt(root, dir)) {
      writeState(root, dir, { command: 'review', state: 'done' });
      changes.push(`${dir}/status.yaml: review, done (it was shipped)`);
    } else if (feature.tasks && feature.tests) {
      const started = feature.tasks.tasks.some((t) => t.status === 'done');
      stampPlan(root, feature);
      writeState(root, dir, started ? { command: 'implement', state: 'started' } : { command: 'plan', state: 'done' });
      changes.push(`${dir}/status.yaml: ${started ? 'implement, started' : 'plan, done'}; the plan is stamped as it is`);
    } else {
      writeState(root, dir, { command: 'plan', state: 'started' });
      changes.push(`${dir}/status.yaml: plan, started (/spex:plan ${dir} finishes it)`);
    }
  }
}

const keyOf = (p: Pair<unknown, unknown>): string => (isScalar(p.key) ? String(p.key.value) : String(p.key));

const TEST_FILE = /\.(ts|tsx|js|mjs|cjs|py|go|rs|java|kt|rb|php|feature|sh)$/;

/**
 * Format 1 → 2: `verification` leaves every record, `verify` and `quick` leave every task, and each folder gets a
 * tests.yaml built from what is there: one script test per scenario (its file found by the test name when a test
 * exists already) and one shell test per task that had verify commands. The test analyst completes the rest.
 */
function migrateToFormat2(root: string, doc: Document, changes: string[]): void {
  const cfg = (doc.toJS() ?? {}) as { acceptance_dir?: string };
  const acceptanceDir = cfg.acceptance_dir ?? DEFAULT_CONFIG.acceptance_dir;
  const files = walk(root, join(root, acceptanceDir)).filter((p) => TEST_FILE.test(p));
  const contents = new Map(files.map((p) => [p, readText(join(root, p))]));
  for (const dir of featureDirs(root)) {
    const reqPath = join(root, dir, 'requirements.yaml');
    const tasksPath = join(root, dir, 'tasks.yaml');
    const testsPath = join(root, dir, 'tests.yaml');
    type ReqData = { feature?: string; requirements?: { id: string; status: string; acceptance: { id: string; given: string; when: string; then: string }[] }[] };
    let reqData: ReqData | null = null;
    if (fileExists(reqPath)) {
      const d = openDocument(reqPath);
      const reqs = d.get('requirements');
      let n = 0;
      if (isSeq(reqs)) for (const item of reqs.items) if (isMap(item) && item.has('verification')) {
        item.delete('verification');
        n++;
      }
      if (n) {
        saveDocument(reqPath, d);
        changes.push(`${dir}/requirements.yaml: verification removed from ${n} record(s)`);
      }
      reqData = d.toJS() as ReqData;
    }
    const verifyByTask = new Map<string, string[]>();
    if (fileExists(tasksPath)) {
      const d = openDocument(tasksPath);
      let changed = false;
      const tasks = d.get('tasks');
      if (isSeq(tasks)) for (const item of tasks.items) {
        if (!isMap(item)) continue;
        if (item.has('verify')) {
          const cmds = (item.get('verify') as { toJSON?: () => unknown })?.toJSON?.() ?? item.get('verify');
          if (Array.isArray(cmds)) verifyByTask.set(String(item.get('id')), cmds.map(String));
          item.delete('verify');
          changed = true;
        }
      }
      if (d.has('quick')) {
        d.delete('quick');
        changed = true;
      }
      if (d.hasIn(['approvals', 'tests'])) {
        d.deleteIn(['approvals', 'tests']);
        changed = true;
      }
      if (changed) {
        // The person approved the plan as it was; the migration only moved lines out, so the stamp follows the file.
        const stamped = d.hasIn(['approvals', 'tasks']);
        if (stamped) d.setIn(['approvals', 'tasks'], tasksHash(d.toJS() as TasksFile));
        saveDocument(tasksPath, d);
        changes.push(`${dir}/tasks.yaml: verify moved to tests.yaml${verifyByTask.size ? ` (${verifyByTask.size} task(s))` : ''}, quick and approvals.tests removed${stamped ? ', the tasks approval restamped' : ''}`);
      }
    }
    if (fileExists(testsPath) || !reqData?.requirements?.length) continue;
    let n = 1;
    const nextId = (): string => `TS${String(n++).padStart(2, '0')}`;
    const tests: Record<string, unknown>[] = [];
    let scenarios = 0;
    for (const r of reqData.requirements) {
      if (r.status === 'retired') continue;
      for (const a of r.acceptance ?? []) {
        const token = testId(r.id, a.id);
        let name = token;
        let file: string | undefined;
        for (const [p, text] of contents) {
          const m = text.match(new RegExp(`${token}[A-Za-z0-9_]*`));
          if (m) {
            name = m[0];
            file = p;
            break;
          }
        }
        tests.push({ id: nextId(), covers: [`${r.id}/${a.id}`], kind: 'script', name, ...(file ? { file } : {}), steps: [`given ${a.given}`, `when ${a.when}`], expect: [a.then] });
        scenarios++;
      }
    }
    for (const [taskId, cmds] of verifyByTask) tests.push({ id: nextId(), covers: [taskId], kind: 'script', driver: 'shell', steps: cmds, expect: ['every command exits 0'] });
    if (!tests.length) continue;
    const header = `# tests.yaml — the proof plan, written by spex update from the scenarios and the verify commands (format 1 → 2).\n# The test analyst completes it: a name per script, a file once written, sessions where a script cannot judge.\n`;
    writeText(testsPath, header + stringify({ feature: reqData.feature, tests }, { lineWidth: 0 }));
    changes.push(`${dir}/tests.yaml: written from ${scenarios} scenario(s) and ${verifyByTask.size} task(s) with verify commands; read it`);
  }
}

export function update(root: string): CmdResult {
  const path = join(root, CONFIG_PATH);
  if (!fileExists(path)) return { ok: false, findings: [{ severity: 'error', code: 'CONFIG-MISSING', message: `${CONFIG_PATH} does not exist`, fix: 'Run spex init: update changes a config, it does not write the first one.' }], exit: 6, text: '' };
  const { data, finding } = loadYaml(path, 'CONFIG-YAML');
  if (finding) return { ok: false, findings: [finding], exit: 4, text: '' };
  const from = Number((data as { format?: unknown })?.format ?? 1);
  if (from > FORMAT) return { ok: false, findings: [{ severity: 'error', code: 'CONFIG-FORMAT', message: `the specs are format ${from}; this spex reads format ${FORMAT}`, path: CONFIG_PATH, fix: 'Update the spex plugin. A script cannot update to a format it does not know.' }], exit: 4, text: '' };
  const doc: Document = openDocument(path);
  const map = doc.contents;
  if (!isMap(map)) return { ok: false, findings: [{ severity: 'error', code: 'CONFIG-SCHEMA', message: `${CONFIG_PATH} is not a mapping`, path: CONFIG_PATH, fix: 'Start from `spex init` in an empty folder and copy your values over.' }], exit: 4, text: '' };
  const changes: string[] = [];

  for (let v = from; v < FORMAT; v++) {
    MIGRATIONS[v]?.(root, doc, changes);
    changes.push(`format ${v} → ${v + 1}`);
  }

  // Missing keys go where init would have put them: right after the nearest key above them that exists.
  let at = -1;
  for (const k of KEYS) {
    const idx = map.items.findIndex((p) => keyOf(p) === k.key);
    if (idx >= 0) {
      at = idx;
      continue;
    }
    const pair = doc.createPair(k.key, k.value);
    if (k.flow && (isSeq(pair.value) || isMap(pair.value))) pair.value.flow = true;
    if (k.comment && pair.value) pair.value.comment = ` ${k.comment}`;
    if (at < 0 && map.items.length) {
      // The file's header comment hangs on its first key; it stays first.
      const first = map.items[0];
      if (isScalar(first.key) && first.key.commentBefore) {
        pair.key.commentBefore = first.key.commentBefore;
        first.key.commentBefore = undefined;
      }
    }
    map.items.splice(at + 1, 0, pair);
    at += 1;
    changes.push(`added ${k.key}: ${JSON.stringify(k.value)}`);
  }
  const limits = map.get('limits');
  if (isMap(limits)) {
    for (const [name, value] of Object.entries(DEFAULT_LIMITS)) {
      if (limits.has(name)) continue;
      limits.items.push(doc.createPair(name, value));
      changes.push(`added limits.${name}: ${value}`);
    }
  }
  if (from < FORMAT) {
    map.set('format', FORMAT);
    changes.push(`format: ${FORMAT}`);
  }

  if (changes.length) saveDocument(path, doc);
  const text = changes.length ? [`${CONFIG_PATH}: ${changes.length} change(s), every value and comment of yours kept`, ...changes.map((c) => `- ${c}`)].join('\n') : `${CONFIG_PATH} is at format ${FORMAT} with every key: nothing to update`;
  return { ok: true, findings: [], exit: 0, text, data: { from, to: FORMAT, changes } };
}
