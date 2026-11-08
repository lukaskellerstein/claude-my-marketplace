// `spex review accept <dir> [ok] [F2=defer]…`: a person's answer to one review round, as a command. Typing it is the
// answer, the way `spex approve` is the approval. Each `fix` pick becomes a fix task with the finder's text
// (finding → source, fix plan → instructions); each `defer` pick goes to deferred[]; each `skip` is only noted in the
// findings file. The tasks carry `review`, so they need no second approval. The review report it writes is the one
// ship reads: `done` when nothing is left to fix, so a person can always end the rounds by deferring.

import { join } from 'node:path';
import { runCheck } from '../check.js';
import { openDocument, saveDocument } from '../io.js';
import { pendingFindings } from '../review.js';
import { loadFeature, resolveFeatureDir } from '../specs.js';
import type { Finding, Pick, ReviewFinding, Task } from '../types.js';
import { renderNext, whatNext, type CmdResult } from './lifecycle.js';
import { report } from './report.js';

const PICKS: Pick[] = ['fix', 'defer', 'skip'];
const refuse = (findings: Finding[], exit = 6): CmdResult => ({ ok: false, findings, exit, text: '' });

/** `2=defer`, `F2=defer`, `all=fix`. `ok` (or nothing) takes every pick as the reviewer wrote it. */
function parsePicks(args: string[], findings: ReviewFinding[]): { picks: Map<string, Pick>; errors: Finding[] } {
  const picks = new Map(findings.map((f) => [f.id, f.pick]));
  const errors: Finding[] = [];
  for (const raw of args) {
    const a = raw.trim().toLowerCase();
    if (!a || a === 'ok' || a === 'yes') continue;
    const m = /^(f?\d+|all)\s*=\s*(fix|defer|skip)$/.exec(a);
    if (!m) {
      errors.push({ severity: 'error', code: 'USAGE', message: `cannot read "${raw}"`, fix: 'Write ok, or one change per finding: 2=defer, F3=fix, all=defer.' });
      continue;
    }
    const pick = m[2] as Pick;
    if (m[1] === 'all') {
      for (const f of findings) picks.set(f.id, pick);
      continue;
    }
    const id = `F${m[1].replace(/^f/, '')}`;
    if (!picks.has(id)) errors.push({ severity: 'error', code: 'REVIEW-UNKNOWN', message: `${id} is not a finding of this round`, fix: `The findings are ${findings.map((f) => f.id).join(', ')}.` });
    else picks.set(id, pick);
  }
  return { picks, errors };
}

const nextTaskId = (tasks: Task[]): string => {
  const n = Math.max(0, ...tasks.map((t) => Number(/^T(\d+)$/.exec(t.id)?.[1] ?? 0))) + 1;
  return `T${String(n).padStart(2, '0')}`;
};

export function reviewAccept(root: string, dir: string, args: string[], by: string): CmdResult {
  const rel = resolveFeatureDir(root, dir);
  const feature = loadFeature(root, rel);
  if (feature.errors.length) return refuse(feature.errors, 4);
  const featureId = feature.requirements?.feature;
  if (!featureId || !feature.tasks) return refuse([{ severity: 'error', code: 'SPEC-MISSING', message: `${feature.dir} needs requirements.yaml and tasks.yaml`, fix: 'Run /spex:tasks first.' }], 4);
  const pending = pendingFindings(root, featureId);
  if (!pending) return refuse([{ severity: 'error', code: 'REVIEW-NONE', message: `no review findings wait for an answer in ${feature.dir}`, fix: `Run /spex:review ${feature.dir}: it writes the findings of the round, then you answer.` }]);
  const { file, round, path } = pending;
  const { picks, errors } = parsePicks(args, file.findings);
  if (errors.length) return refuse(errors, 2);
  for (const f of file.findings) {
    if (picks.get(f.id) !== 'fix') continue;
    const missing = [!f.done_when && 'done_when', !f.paths?.length && 'paths'].filter(Boolean);
    if (missing.length) errors.push({ severity: 'error', code: 'REVIEW-FIX', message: `${f.id} has no ${missing.join(' and ')}, so it cannot become a task`, path, id: f.id, fix: 'The reviewer completes the finding in the findings file, or you defer it: F1=defer.' });
  }
  if (errors.length) return refuse(errors);

  // Fix picks → tasks, defer picks → deferred[], in tasks.yaml. Append only: nothing that exists moves.
  const doc = openDocument(join(root, feature.tasksPath));
  const all = [...feature.tasks.tasks];
  const made: string[] = [];
  const deferred: string[] = [];
  const skipped: string[] = [];
  if (!doc.has('deferred') && file.findings.some((f) => picks.get(f.id) === 'defer')) doc.set('deferred', doc.createNode([]));
  for (const f of file.findings) {
    const pick = picks.get(f.id)!;
    const where = `${f.file}${f.line ? `:${f.line}` : ''}`;
    if (pick === 'fix') {
      const id = nextTaskId(all);
      const task: Task = {
        id,
        title: f.title,
        kind: 'fix',
        severity: f.severity === 'nit' ? 'P3' : f.severity,
        review: `${featureId}-${round}/${f.id}`,
        source: `review round ${round} ${f.id} (${f.severity}, ${where}): ${f.title}. When ${f.when}. Effect: ${f.effect}`,
        requirements: f.requirements ?? [],
        paths: f.paths!,
        context: f.context?.length ? f.context : [f.file],
        instructions: f.fix,
        done_when: f.done_when!,
        status: 'todo',
      };
      all.push(task);
      doc.addIn(['tasks'], doc.createNode(task));
      made.push(`${id} ← ${f.id} ${f.severity} ${f.title}`);
    } else if (pick === 'defer') {
      doc.addIn(['deferred'], doc.createNode({ finding: `${f.title} (${where}): ${f.effect}`, why: f.why?.trim() || `deferred at review round ${round}`, by, severity: f.severity }));
      deferred.push(`${f.id} ${f.severity} ${f.title}`);
    } else skipped.push(`${f.id} ${f.severity} ${f.title}`);
  }
  saveDocument(join(root, feature.tasksPath), doc);

  // The answer goes into the findings file, so the round shows what the person chose.
  const fdoc = openDocument(join(root, path));
  file.findings.forEach((f, i) => {
    if (picks.get(f.id) !== f.pick) fdoc.setIn(['findings', i, 'pick'], picks.get(f.id));
  });
  fdoc.set('accepted', fdoc.createNode({ at: new Date().toISOString(), by, tasks: made.map((m) => m.split(' ')[0]), deferred: deferred.map((d) => d.split(' ')[0]), skipped: skipped.map((s) => s.split(' ')[0]) }));
  saveDocument(join(root, path), fdoc);

  const summary = made.length ? `round ${round}: ${made.length} finding(s) to fix as ${made.map((m) => m.split(' ')[0]).join(', ')}; ${deferred.length} deferred, ${skipped.length} skipped` : `round ${round} accepted: nothing to fix; ${deferred.length} deferred, ${skipped.length} skipped`;
  report(root, rel, { stage: 'review', status: made.length ? 'concerns' : 'done', summary, concerns: [...made, ...deferred.map((d) => `deferred: ${d}`)], questions: [], files: [feature.tasksPath], pulled: [] });

  const check = runCheck(root, [rel]);
  const problems = check.findings.filter((f) => f.severity === 'error');
  const lines = [`${path} accepted by ${by}: ${summary}`];
  if (made.length) lines.push('fix:', ...made.map((m) => `- ${m}`));
  if (deferred.length) lines.push('deferred:', ...deferred.map((d) => `- ${d}`));
  if (skipped.length) lines.push('skipped:', ...skipped.map((s) => `- ${s}`));
  lines.push(renderNext(whatNext(root, check.config, loadFeature(root, rel))));
  return { ok: !problems.length, findings: problems, exit: problems.length ? 4 : 0, text: lines.join('\n'), data: { round, path, tasks: made, deferred, skipped } };
}
