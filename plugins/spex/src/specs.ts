// Feature folders on disk, and the record index across folders and branches.

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { branchNames, isGitRepo, listAtRef, showAtRef } from './git.js';
import { YAML_OPTS, fileExists, isDir, loadYaml, toPosix } from './io.js';
import { validate } from './schema.js';
import type { Feature, Finding, Requirement, RequirementsFile, TasksFile, TestsFile } from './types.js';

export const SPECS_DIR = 'specs';

export function featureDirs(root: string): string[] {
  const specs = join(root, SPECS_DIR);
  if (!isDir(specs)) return [];
  return readdirSync(specs, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => `${SPECS_DIR}/${d.name}`)
    .filter((dir) => ['spec.md', 'requirements.yaml', 'tasks.yaml', 'tests.yaml'].some((f) => fileExists(join(root, dir, f))))
    .sort();
}

/** Resolve a user-given folder (absolute, repo-relative, or just the name) to repo-relative. */
export function resolveFeatureDir(root: string, given: string): string {
  const candidates = [given, `${SPECS_DIR}/${given}`];
  for (const c of candidates) {
    const rel = toPosix(c).replace(/\/+$/, '');
    if (isDir(join(root, rel))) return rel.startsWith(SPECS_DIR + '/') ? rel : rel;
  }
  // a bare feature id: 007 → specs/007-*
  for (const dir of featureDirs(root)) if (dir.split('/')[1].startsWith(given + '-')) return dir;
  return toPosix(given).replace(/\/+$/, '');
}

function loadFile<T>(root: string, feature: Feature, path: string, schema: 'requirements' | 'tasks' | 'tests', code: string, fix: string): T | undefined {
  const abs = join(root, path);
  if (!fileExists(abs)) return undefined;
  const { data, finding } = loadYaml(abs, `${code}-YAML`);
  if (finding) {
    feature.errors.push(finding);
    return undefined;
  }
  const errs = validate(schema, data);
  if (errs.length) {
    for (const e of errs) feature.errors.push({ severity: 'error', code: `${code}-SCHEMA`, message: e, path, fix });
    return undefined;
  }
  return data as T;
}

export function loadFeature(root: string, dir: string): Feature {
  const name = dir.split('/').pop() ?? dir;
  const feature: Feature = { dir, name, requirementsPath: `${dir}/requirements.yaml`, tasksPath: `${dir}/tasks.yaml`, testsPath: `${dir}/tests.yaml`, errors: [] };
  feature.requirements = loadFile<RequirementsFile>(root, feature, feature.requirementsPath, 'requirements', 'REQ', 'Match the record to the fields in the README table for requirements.yaml.');
  feature.tasks = loadFile<TasksFile>(root, feature, feature.tasksPath, 'tasks', 'TASK', 'Match the task to the fields in the README table for tasks.yaml.');
  // A setup task may name no record: its proof is its own test. The rules read `requirements` as a list either way.
  for (const t of feature.tasks?.tasks ?? []) t.requirements ??= [];
  feature.tests = loadFile<TestsFile>(root, feature, feature.testsPath, 'tests', 'TEST', 'Match the test to the fields in the README table for tests.yaml.');
  return feature;
}

export interface IndexedRecord {
  id: string;
  feature: string;
  dir: string;
  where: string; // 'disk' or 'branch:<name>'
  status: Requirement['status'];
  scope: string;
  text: string;
  type: Requirement['type'];
  priority: Requirement['priority'];
  supersedes: string[];
}

export interface RecordIndex {
  records: IndexedRecord[];
  has(id: string): boolean;
  /** Live truth: approved and built records on disk. */
  live(scope?: string): IndexedRecord[];
  /** Features (by feature id) that supersede a record, across disk and branches. */
  supersededBy(target: string): string[];
  findings: Finding[];
}

function recordsOf(file: RequirementsFile, dir: string, where: string): IndexedRecord[] {
  return (file.requirements ?? []).map((r) => ({
    id: r.id,
    feature: file.feature,
    dir,
    where,
    status: r.status,
    scope: r.scope,
    text: r.text,
    type: r.type,
    priority: r.priority,
    supersedes: (r.relationships ?? []).filter((x) => x.type === 'supersedes').map((x) => x.target),
  }));
}

/** Build the index. With `branches`, every branch's specs/ folder is read through git. */
export function buildIndex(root: string, opts: { branches: boolean }): RecordIndex {
  const records: IndexedRecord[] = [];
  const findings: Finding[] = [];
  for (const dir of featureDirs(root)) {
    const f = loadFeature(root, dir);
    if (f.requirements) records.push(...recordsOf(f.requirements, dir, 'disk'));
  }
  if (opts.branches && isGitRepo(root)) {
    for (const branch of branchNames(root)) {
      for (const path of listAtRef(root, branch, SPECS_DIR)) {
        if (!path.endsWith('/requirements.yaml')) continue;
        const text = showAtRef(root, branch, path);
        if (!text) continue;
        try {
          const data = parse(text, YAML_OPTS) as RequirementsFile;
          if (data && Array.isArray(data.requirements)) records.push(...recordsOf(data, path.replace(/\/requirements\.yaml$/, ''), `branch:${branch}`));
        } catch {
          findings.push({ severity: 'info', code: 'INDEX-BRANCH', message: `${branch}:${path} does not parse; skipped` });
        }
      }
    }
  }
  const byId = new Map<string, IndexedRecord[]>();
  for (const r of records) byId.set(r.id, [...(byId.get(r.id) ?? []), r]);
  return {
    records,
    findings,
    has: (id) => byId.has(id),
    live: (scope) => {
      const seen = new Set<string>();
      return records.filter((r) => r.where === 'disk' && (r.status === 'approved' || r.status === 'built') && (!scope || r.scope === scope) && !seen.has(r.id) && seen.add(r.id));
    },
    supersededBy: (target) => [...new Set(records.filter((r) => r.supersedes.includes(target)).map((r) => r.feature))],
  };
}

export function scenarioIds(r: Requirement): string[] {
  return r.acceptance.map((a) => a.id);
}
