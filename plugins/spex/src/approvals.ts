// A person's approvals past gate 1. Spec and records carry a status a program flips. tasks.yaml and
// tests.yaml are files an agent writes and rewrites, so their approval is a hash of what the person read:
// the gate recomputes it, and a changed file sends the stage back to a person. Which of the two stages
// need a person is `approvals:` in .spex/config.yaml; the records (gate 1) always do, and that approval
// stamps tests.yaml too, because the test analyst wrote it in the same phase.

import { createHash } from 'node:crypto';
import type { Config, Feature, Finding, TasksFile, TestsFile } from './types.js';

export const APPROVAL_STAGES = ['tasks', 'tests'] as const;
export type ApprovalStage = (typeof APPROVAL_STAGES)[number];

const sha = (s: string): string => createHash('sha256').update(s).digest('hex').slice(0, 16);

/**
 * The fix tasks a person accepted at a review (`spex review accept`, the `review` field). Typing the accept was the
 * approval, so they and the tests that prove them stay out of the hashes: a review fix never asks twice.
 */
export function reviewFixIds(file: TasksFile | undefined): Set<string> {
  return new Set((file?.tasks ?? []).filter((t) => t.review).map((t) => t.id));
}

/** What a person approves in tasks.yaml: everything but the statuses the script flips, the deferred list a person already said yes to, the accepted review fixes, and the approvals block itself. */
export function tasksHash(file: TasksFile): string {
  const { approvals: _approvals, deferred: _deferred, tasks, ...rest } = file;
  return sha(JSON.stringify({ ...rest, tasks: tasks.filter((t) => !t.review).map(({ status: _status, ...t }) => t) }));
}

/** What a person approves in tests.yaml: the whole plan but the approvals block, and minus the claims of accepted review fixes. */
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

export interface ApprovalState {
  stage: ApprovalStage;
  /** The config lists the stage. */
  required: boolean;
  /** The stored hash matches what is on disk now. */
  approved: boolean;
}

export function tasksApproval(config: Config, file: TasksFile): ApprovalState {
  const required = config.approvals.includes('tasks');
  return { stage: 'tasks', required, approved: file.approvals?.tasks === tasksHash(file) };
}

export function testsApproval(config: Config, file: TestsFile | undefined, exempt: Set<string> = new Set()): ApprovalState {
  const required = config.approvals.includes('tests');
  return { stage: 'tests', required, approved: !file || file.approvals?.tests === testsHash(file, exempt) };
}

/** The gate findings for one stage: none when the config does not list it, or a person approved what is on disk. */
export function approvalFindings(config: Config, feature: Feature, stage: ApprovalStage): Finding[] {
  if (stage === 'tasks') {
    if (!feature.tasks) return [];
    const state = tasksApproval(config, feature.tasks);
    if (!state.required || state.approved) return [];
    const was = feature.tasks.approvals?.tasks ? 'changed since a person approved it' : 'not approved by a person yet';
    return [{ severity: 'error', code: 'GATE-TASKS-APPROVED', message: `${feature.tasksPath} is ${was}`, path: feature.tasksPath, fix: `A person reads the approach, the design, the tasks and their tests, then runs \`/spex:approve ${feature.dir}\`. Remove tasks from approvals in .spex/config.yaml to skip this.` }];
  }
  if (!feature.tests) return [];
  const state = testsApproval(config, feature.tests, reviewFixIds(feature.tasks));
  if (!state.required || state.approved) return [];
  const was = feature.tests.approvals?.tests ? 'changed since a person approved it' : 'not approved by a person yet';
  return [{ severity: 'error', code: 'GATE-TESTS-APPROVED', message: `${feature.testsPath} is ${was}`, path: feature.testsPath, fix: `A person reads the proof plan, then runs \`/spex:approve ${feature.dir} tests\`. Remove tests from approvals in .spex/config.yaml to skip this.` }];
}
