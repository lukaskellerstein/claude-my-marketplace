// The stamp of a plan. There is no approve command: the next command a person types is the approval. So the script
// keeps a hash of the plan as it was when plan ended: spec.md, the records, tasks.yaml and tests.yaml. When
// implement starts, it computes them again. A file changed by hand since then sends the person to plan. A change the
// process made (a corrected spec, a fix task, a comment) is stamped again by `spex stamp`, so no approval is lost.
//
// The hashes are in the files an agent rewrites: `approvals` in tasks.yaml holds the three of the claim (spec,
// requirements, tasks), `approvals` in tests.yaml holds the one of the proof plan.

import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { isMap, isScalar, type Document } from 'yaml';
import { fileExists, openDocument, readText, saveDocument } from './io.js';
import { SPEC_FILE } from './rules/spec.js';
import type { Config, Feature, Finding, RequirementsFile, TasksFile, TestsFile } from './types.js';

export const APPROVAL_STAGES = ['tasks', 'tests'] as const;
export type ApprovalStage = (typeof APPROVAL_STAGES)[number];

const sha = (s: string): string => createHash('sha256').update(s).digest('hex').slice(0, 16);

/**
 * The fix tasks a person accepted at a review (`spex review accept`, the `review` field). The pick was the ok,
 * so they and the tests that prove them stay out of the hashes: a review fix never asks twice.
 */
export function reviewFixIds(file: TasksFile | undefined): Set<string> {
  return new Set((file?.tasks ?? []).filter((t) => t.review).map((t) => t.id));
}

/** What is stamped of tasks.yaml: everything but the statuses the script flips, the deferred list a person already said yes to, the accepted review fixes, and the approvals block itself. */
export function tasksHash(file: TasksFile): string {
  const { approvals: _approvals, deferred: _deferred, tasks, ...rest } = file;
  return sha(JSON.stringify({ ...rest, tasks: tasks.filter((t) => !t.review).map(({ status: _status, ...t }) => t) }));
}

/** What is stamped of tests.yaml: the whole plan but the approvals block, and minus the claims of accepted review fixes. */
export function testsHash(file: TestsFile, exempt: Set<string> = new Set()): string {
  const { approvals: _approvals, tests, ...rest } = file;
  const kept = !exempt.size
    ? tests
    : tests.flatMap((t) => {
        const covers = t.covers.filter((c) => !exempt.has(c));
        return covers.length ? [covers.length === t.covers.length ? t : { ...t, covers }] : [];
      });
  return sha(JSON.stringify({ ...rest, tests: kept }));
}

/** What is stamped of requirements.yaml: everything but the status of a record, which the script flips. */
export function requirementsHash(file: RequirementsFile): string {
  return sha(JSON.stringify({ ...file, requirements: file.requirements.map(({ status: _status, ...r }) => r) }));
}

/** The four hashes of the plan as it is on disk now. A missing file has an empty hash. */
export function planHashes(root: string, feature: Feature): { spec: string; requirements: string; tasks: string; tests: string } {
  const spec = join(root, feature.dir, SPEC_FILE);
  return {
    spec: fileExists(spec) ? sha(readText(spec)) : '',
    requirements: feature.requirements ? requirementsHash(feature.requirements) : '',
    tasks: feature.tasks ? tasksHash(feature.tasks) : '',
    tests: feature.tests ? testsHash(feature.tests, reviewFixIds(feature.tasks)) : '',
  };
}

/** The approvals block sits right after `feature`, so an agent that appends at the end of the file never breaks the YAML. */
export function setApproval(doc: Document, key: string, value: unknown): void {
  const root = doc.contents;
  if (isMap(root) && !root.has('approvals')) {
    const at = root.items.findIndex((p) => (isScalar(p.key) ? p.key.value : p.key) === 'feature') + 1;
    root.items.splice(at, 0, doc.createPair('approvals', {}));
  }
  doc.setIn(['approvals', key], doc.createNode(value));
}

/** Stamp the plan as it is on disk now. Only the script calls this: at the end of plan, and after a change the process made. */
export function stampPlan(root: string, feature: Feature): void {
  const h = planHashes(root, feature);
  if (feature.tasks) {
    const doc = openDocument(join(root, feature.tasksPath));
    setApproval(doc, 'tasks', h.tasks);
    setApproval(doc, 'spec', h.spec);
    setApproval(doc, 'requirements', h.requirements);
    saveDocument(join(root, feature.tasksPath), doc);
  }
  if (feature.tests) {
    const doc = openDocument(join(root, feature.testsPath));
    setApproval(doc, 'tests', h.tests);
    saveDocument(join(root, feature.testsPath), doc);
  }
}

/** The files of the plan that differ from the stamp, by name. A plan with no stamp names every file it has. */
export function planChanged(root: string, feature: Feature): string[] {
  const h = planHashes(root, feature);
  const a = feature.tasks?.approvals ?? {};
  const out: string[] = [];
  if (h.spec && a.spec !== h.spec) out.push(`${feature.dir}/${SPEC_FILE}`);
  if (h.requirements && a.requirements !== h.requirements) out.push(feature.requirementsPath);
  if (h.tasks && a.tasks !== h.tasks) out.push(feature.tasksPath);
  if (h.tests && feature.tests?.approvals?.tests !== h.tests) out.push(feature.testsPath);
  return out;
}

export const isStamped = (feature: Feature): boolean => !!feature.tasks?.approvals?.tasks;

export interface ApprovalState {
  stage: ApprovalStage;
  /** The stored hash matches what is on disk now. */
  approved: boolean;
}

export function tasksApproval(_config: Config, file: TasksFile): ApprovalState {
  return { stage: 'tasks', approved: file.approvals?.tasks === tasksHash(file) };
}

export function testsApproval(_config: Config, file: TestsFile | undefined, exempt: Set<string> = new Set()): ApprovalState {
  return { stage: 'tests', approved: !file || file.approvals?.tests === testsHash(file, exempt) };
}

/** The gate findings for one file of the plan: none when it is as the script stamped it. */
export function approvalFindings(config: Config, feature: Feature, stage: ApprovalStage): Finding[] {
  const fix = `A change the process made: \`spex stamp ${feature.dir}\` checks the links and stamps it. A change by hand: /spex:plan ${feature.dir} checks it and stamps it again.`;
  if (stage === 'tasks') {
    if (!feature.tasks || tasksApproval(config, feature.tasks).approved) return [];
    const was = feature.tasks.approvals?.tasks ? 'changed since the script stamped it' : 'not stamped yet: plan has not ended';
    return [{ severity: 'error', code: 'GATE-TASKS-STAMPED', message: `${feature.tasksPath} is ${was}`, path: feature.tasksPath, fix }];
  }
  if (!feature.tests || testsApproval(config, feature.tests, reviewFixIds(feature.tasks)).approved) return [];
  const was = feature.tests.approvals?.tests ? 'changed since the script stamped it' : 'not stamped yet: plan has not ended';
  return [{ severity: 'error', code: 'GATE-TESTS-STAMPED', message: `${feature.testsPath} is ${was}`, path: feature.testsPath, fix }];
}
