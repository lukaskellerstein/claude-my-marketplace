// The task rules: order, allowlists, context, limits, pointers, and coverage.

import { join } from 'node:path';
import { testId } from '../ears.js';
import { patternsOverlap, pathMatches, underAny } from '../glob.js';
import { bytes, fileExists, lineCount, readText, walk } from '../io.js';
import type { Config, Feature, Finding, Task, TasksFile } from '../types.js';
import type { RuleContext } from './requirements.js';

export function checkTasks(ctx: RuleContext): Finding[] {
  const { feature, config } = ctx;
  const out: Finding[] = [];
  const file = feature.tasks;
  if (!file) return out;
  const path = feature.tasksPath;
  const f = (severity: Finding['severity'], code: string, message: string, fix: string, id?: string): void => {
    out.push({ severity, code, message, fix, path, id });
  };
  const reqs = feature.requirements;
  if (!reqs) {
    f('error', 'TASK-REQ', `${path} has no requirements.yaml next to it`, 'Every plan answers a spec. Run /spex:specify or /spex:quick first.');
    return out;
  }
  if (file.feature !== reqs.feature) f('error', 'TASK-REQ', `tasks.yaml feature "${file.feature}" differs from requirements.yaml feature "${reqs.feature}"`, 'Use the same feature id in both files.');

  const byId = new Map<string, Task>();
  for (const t of file.tasks) {
    if (byId.has(t.id)) f('error', 'TASK-SCHEMA', `${t.id} appears twice`, 'Task ids are unique. Give the second task the next free number.', t.id);
    byId.set(t.id, t);
  }
  const reqIds = new Set(reqs.requirements.map((r) => r.id));
  const liveReqs = reqs.requirements.filter((r) => r.status !== 'retired');
  const designIds = new Set([...(file.design?.modules ?? []), ...(file.design?.entities ?? []), ...(file.design?.decisions ?? [])].map((d) => d.id));
  const knownIds = new Set([...reqIds, ...designIds, ...(reqs.unknowns ?? []).map((u) => u.id), ...(reqs.questions ?? []).map((q) => q.id)]);

  // TASK-DEP: targets exist, no cycle
  for (const t of file.tasks) {
    for (const d of t.depends_on ?? []) {
      if (!byId.has(d)) f('error', 'TASK-DEP', `${t.id} depends on ${d}, which does not exist`, 'Fix the id or add the task.', t.id);
      if (d === t.id) f('error', 'TASK-DEP', `${t.id} depends on itself`, 'Remove the self-dependency.', t.id);
    }
  }
  const cycle = findCycle(file.tasks);
  if (cycle) f('error', 'TASK-DEP', `dependency cycle: ${cycle.join(' → ')}`, 'Break the cycle: one of these tasks must come first.');

  // TASK-LIMITS: approach
  if (bytes(file.approach) > config.limits.approach_bytes) f('error', 'TASK-LIMITS', `approach is ${bytes(file.approach)} bytes, above limits.approach_bytes ${config.limits.approach_bytes}`, 'The approach is the shape of the solution, not the design. Move detail into design.modules, design.entities and design.decisions.');

  const covered = new Map<string, string[]>();
  for (const t of file.tasks) {
    // TASK-REQ
    for (const r of t.requirements) {
      if (!reqIds.has(r)) f('error', 'TASK-REQ', `${t.id} names requirement ${r}, which is not in requirements.yaml`, 'Fix the id, or add the record.', t.id);
      else covered.set(r, [...(covered.get(r) ?? []), t.id]);
    }
    // TASK-DONE-WHEN
    if (!t.done_when.trim()) f('error', 'TASK-DONE-WHEN', `${t.id}: done_when is empty`, 'One observable sentence: which test passes, which command prints what.', t.id);
    // TASK-PROTECTED
    for (const p of t.paths) {
      const hit = underAny(p, config.protected);
      if (hit) f('error', 'TASK-PROTECTED', `${t.id}: path ${p} is under protected ${hit}`, 'A task never writes specs, acceptance tests or CI. Remove the path. Acceptance tests are written by /spex:tests.', t.id);
    }
    // TASK-LIMITS
    if (t.paths.length > config.limits.task_files) f('error', 'TASK-LIMITS', `${t.id}: ${t.paths.length} paths, above limits.task_files ${config.limits.task_files}`, 'Split the task. Never shrink scope: two tasks, each inside the limit.', t.id);
    if (bytes(t.instructions) > config.limits.instructions_bytes) f('error', 'TASK-LIMITS', `${t.id}: instructions are ${bytes(t.instructions)} bytes, above limits.instructions_bytes ${config.limits.instructions_bytes}`, 'Instructions carry decisions, quoted constraints and names, not function bodies. Move shared decisions to design.decisions.', t.id);
    // TASK-DESIGN
    for (const d of t.design ?? []) if (!designIds.has(d)) f('error', 'TASK-DESIGN', `${t.id}: design id ${d} is not in the design block`, 'Add the entry to design.modules, design.entities or design.decisions, or fix the id.', t.id);
    // TASK-CONTEXT
    out.push(...contextCheck(ctx, file, t));
    // TASK-POINTER
    out.push(...pointerCheck(t, knownIds, path));
    // TASK-CONSUMES
    const upstream = transitiveDeps(file.tasks, t);
    const produced = new Set(upstream.flatMap((u) => (u.interfaces?.produces ?? []).map(norm)));
    for (const c of t.interfaces?.consumes ?? []) {
      if (!produced.has(norm(c))) f('warning', 'TASK-CONSUMES', `${t.id} consumes "${c}" but no task it depends on produces it`, 'Add the exact signature to `interfaces.produces` of the task that writes it, and list that task in depends_on.', t.id);
    }
  }

  // TASK-PARALLEL
  const groups = new Map<string, Task[]>();
  for (const t of file.tasks) if (t.parallel_group) groups.set(t.parallel_group, [...(groups.get(t.parallel_group) ?? []), t]);
  for (const [g, members] of groups) {
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const a = members[i];
        const b = members[j];
        for (const pa of a.paths) for (const pb of b.paths) if (patternsOverlap(pa, pb)) f('error', 'TASK-PARALLEL', `${a.id} and ${b.id} in parallel_group ${g} both write ${pa === pb ? pa : `${pa} / ${pb}`}`, 'Tasks in one group run at the same time. Give the shared file to one task and make the other depend on it.', a.id);
        for (const c of a.context ?? []) for (const pb of b.paths) if (pathMatches(pb, c.split(':')[0])) f('error', 'TASK-PARALLEL', `${a.id} reads ${c} while ${b.id} writes it in the same parallel_group`, 'A sibling may change the file mid-run. Make the reader depend on the writer.', a.id);
        for (const c of b.context ?? []) for (const pa of a.paths) if (pathMatches(pa, c.split(':')[0])) f('error', 'TASK-PARALLEL', `${b.id} reads ${c} while ${a.id} writes it in the same parallel_group`, 'A sibling may change the file mid-run. Make the reader depend on the writer.', b.id);
      }
    }
  }

  // TASK-QUICK
  if (file.quick) {
    const distinct = new Set(file.tasks.flatMap((t) => t.paths));
    if (file.tasks.length > 2) f('error', 'TASK-QUICK', `quick path with ${file.tasks.length} tasks`, 'The quick path is one or two tasks. A bigger change goes through /spex:specify.');
    if (distinct.size > 3) f('error', 'TASK-QUICK', `quick path writes ${distinct.size} paths`, 'The quick path fits in three files. A bigger change goes through /spex:specify.');
    if ((reqs.questions ?? []).some((q) => !q.answer)) f('error', 'TASK-QUICK', 'quick path with an open question', 'The quick path has no open questions. Answer it, or go through /spex:specify.');
    if ((reqs.unknowns ?? []).length) f('error', 'TASK-QUICK', 'quick path with unknowns', 'The quick path needs no research. Decide, or go through /spex:specify.');
  }

  // TASK-COVERAGE (gap)
  for (const r of liveReqs) {
    if (!covered.has(r.id)) out.push({ severity: 'gap', code: 'TASK-COVERAGE', message: `${r.id} is covered by no task`, fix: 'Add a task whose `requirements` names it, or retire the record.', path, id: r.id });
  }

  // TEST-STALE
  const supersedes = reqs.requirements.flatMap((r) => (r.relationships ?? []).filter((x) => x.type === 'supersedes').map((x) => x.target));
  if (supersedes.length) {
    const files = acceptanceFiles(ctx.root, config);
    for (const old of supersedes) {
      const needle = testId(old);
      const hits = files.filter((p) => readText(join(ctx.root, p)).includes(needle));
      if (hits.length) f('warning', 'TEST-STALE', `${old} is superseded by this feature but ${hits.join(', ')} still tests it`, 'When /spex:tests writes the superseding test, it retires the old one.', old);
    }
  }

  // FILE-SIZE
  const size = bytes(readText(join(ctx.root, path)));
  if (size > config.limits.file_kb * 1024) f('warning', 'FILE-SIZE', `${path} is ${Math.round(size / 1024)} KB, above limits.file_kb ${config.limits.file_kb}`, 'A plan that big is two features. Split it.');

  return out;
}

const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();

function findCycle(tasks: Task[]): string[] | null {
  const by = new Map(tasks.map((t) => [t.id, t]));
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    if (state.get(id) === 'done') return null;
    if (state.get(id) === 'visiting') return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 'visiting');
    stack.push(id);
    for (const d of by.get(id)?.depends_on ?? []) {
      if (!by.has(d)) continue;
      const c = visit(d);
      if (c) return c;
    }
    stack.pop();
    state.set(id, 'done');
    return null;
  };
  for (const t of tasks) {
    const c = visit(t.id);
    if (c) return c;
  }
  return null;
}

export function transitiveDeps(tasks: Task[], t: Task): Task[] {
  const by = new Map(tasks.map((x) => [x.id, x]));
  const seen = new Set<string>();
  const out: Task[] = [];
  const go = (id: string): void => {
    for (const d of by.get(id)?.depends_on ?? []) {
      if (seen.has(d) || !by.has(d)) continue;
      seen.add(d);
      out.push(by.get(d)!);
      go(d);
    }
  };
  go(t.id);
  return out;
}

export function parseContextEntry(entry: string): { path: string; from?: number; to?: number } {
  const m = entry.match(/^(.*?):(\d+)-(\d+)$/);
  if (!m) return { path: entry };
  return { path: m[1], from: Number(m[2]), to: Number(m[3]) };
}

/** A context or contract path is repo-relative, or relative to the feature folder (contracts/…). */
export function resolveSpecPath(root: string, featureDir: string, p: string): string | null {
  if (fileExists(join(root, p))) return join(root, p);
  if (fileExists(join(root, featureDir, p))) return join(root, featureDir, p);
  return null;
}

function contextCheck(ctx: RuleContext, file: TasksFile, t: Task): Finding[] {
  const out: Finding[] = [];
  const upstreamPaths = transitiveDeps(file.tasks, t).flatMap((u) => u.paths);
  let total = 0;
  for (const entry of t.context ?? []) {
    const { path: p, from, to } = parseContextEntry(entry);
    const abs = resolveSpecPath(ctx.root, ctx.feature.dir, p);
    if (abs) {
      const text = readText(abs);
      if (from !== undefined && to !== undefined) {
        const lines = lineCount(text);
        if (from < 1 || to < from || to > lines) out.push({ severity: 'error', code: 'TASK-CONTEXT', message: `${t.id}: ${entry} is outside the file (${lines} lines)`, fix: 'Fix the line range, or drop it to read the whole file.', path: ctx.feature.tasksPath, id: t.id });
        else total += bytes(text.split('\n').slice(from - 1, to).join('\n'));
      } else total += bytes(text);
    } else if (!upstreamPaths.some((up) => pathMatches(up, p))) {
      out.push({ severity: 'error', code: 'TASK-CONTEXT', message: `${t.id}: context ${p} does not exist and no task it depends on writes it`, fix: 'Fix the path, or add the task that creates it to depends_on.', path: ctx.feature.tasksPath, id: t.id });
    }
  }
  const cap = ctx.config.limits.context_kb * 1024;
  if (total > cap) out.push({ severity: 'error', code: 'TASK-CONTEXT', message: `${t.id}: context is ${Math.round(total / 1024)} KB, above limits.context_kb ${ctx.config.limits.context_kb}`, fix: 'Point at line ranges (path:from-to) instead of whole files, or split the task.', path: ctx.feature.tasksPath, id: t.id });
  return out;
}

const FILE_TOKEN = /(?:^|[\s(`'"])((?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]{1,6}|[\w-]+\.(?:ts|tsx|js|mjs|cjs|py|go|rs|java|kt|rb|php|md|yaml|yml|json|toml|sql|html|css|scss|sh))(?=[\s)`'",.:;]|$)/g;
const ID_TOKEN = /\b(REQ-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}|[MED]\d+|U\d+|Q\d+)\b/g;

function pointerCheck(t: Task, knownIds: Set<string>, path: string): Finding[] {
  const out: Finding[] = [];
  const text = t.instructions;
  const loadable = [...t.paths, ...(t.context ?? []).map((c) => parseContextEntry(c).path)];
  const fileOk = (name: string): boolean => loadable.some((p) => p === name || p.endsWith('/' + name) || pathMatches(p, name) || name.endsWith('/' + p));
  for (const m of text.matchAll(FILE_TOKEN)) {
    const name = m[1];
    if (/^\d+\.\d+$/.test(name)) continue; // a version number, not a file
    if (!fileOk(name)) out.push({ severity: 'warning', code: 'TASK-POINTER', message: `${t.id}: instructions name ${name}, which is not in paths or context`, fix: 'Add it to context (read) or paths (write), so the implementer can load it.', path, id: t.id });
  }
  const own = new Set([...t.requirements, ...(t.design ?? [])]);
  for (const m of text.matchAll(ID_TOKEN)) {
    const id = m[1];
    if (own.has(id) || knownIds.has(id)) continue;
    out.push({ severity: 'warning', code: 'TASK-POINTER', message: `${t.id}: instructions name ${id}, which exists nowhere in the spec`, fix: 'Fix the id, or add the record, design entry, unknown or question it points at.', path, id: t.id });
  }
  return out;
}

export function acceptanceFiles(root: string, config: Config): string[] {
  return walk(root, join(root, config.acceptance_dir)).filter((p) => /\.(ts|tsx|js|mjs|cjs|py|go|rs|java|kt|rb|php|feature|sh)$/.test(p));
}
