// The findings of a review round wait in .spex/review/<feature>-<round>.findings.yaml until a person answers.
// The reviewer writes the file (the claim and the fix plan); `spex review accept` reads it and is the only writer of
// its `accepted` block, of the fix tasks it turns into, and of their `review` field.

import { join } from 'node:path';
import { fileExists, isDir, loadYaml } from './io.js';
import { validate } from './schema.js';
import type { Feature, FindingsFile, Finding } from './types.js';
import { readdirSync } from 'node:fs';

export const REVIEW_DIR = '.spex/review';

export const findingsPath = (featureId: string, round: number): string => `${REVIEW_DIR}/${featureId}-${round}.findings.yaml`;

/** The rounds that have a findings file, in order. */
export function findingsRounds(root: string, featureId: string): number[] {
  const dir = join(root, REVIEW_DIR);
  if (!isDir(dir)) return [];
  const re = new RegExp(`^${featureId.replace(/[^A-Za-z0-9_-]/g, '')}-(\\d+)\\.findings\\.yaml$`);
  return readdirSync(dir)
    .map((f) => re.exec(f))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}

export function loadFindings(root: string, featureId: string, round: number): { file?: FindingsFile; findings: Finding[]; path: string } {
  const path = findingsPath(featureId, round);
  if (!fileExists(join(root, path))) return { findings: [], path };
  const { data, finding } = loadYaml(join(root, path), 'REVIEW-YAML');
  if (finding) return { findings: [finding], path };
  const errors = validate('findings', data).map((e): Finding => ({ severity: 'error', code: 'REVIEW-SCHEMA', message: e, path, fix: 'The reviewer repairs the findings file to schemas/findings.schema.json: every finding has id, severity, title, file and pick; a P1, P2 or P3 has when and effect; a fix pick has fix, done_when and paths.' }));
  return { file: errors.length ? undefined : (data as FindingsFile), findings: errors, path };
}

/** The newest findings file of the feature, when no person has answered it yet. */
export function pendingFindings(root: string, featureId: string): { round: number; path: string; file: FindingsFile } | null {
  const p = pendingRound(root, featureId);
  return p && p.file ? { round: p.round, path: p.path, file: p.file } : null;
}

/**
 * The newest round when it waits for an answer, or is broken. A findings file that fails its schema is a round the
 * reviewer wrote and must repair: read as "no round", it sent the person back to a fresh review of every task.
 */
export function pendingRound(root: string, featureId: string): { round: number; path: string; file?: FindingsFile; errors: Finding[] } | null {
  const rounds = findingsRounds(root, featureId);
  if (!rounds.length) return null;
  const round = rounds[rounds.length - 1];
  const { file, findings, path } = loadFindings(root, featureId, round);
  if (!file) return findings.length ? { round, path, errors: findings } : null;
  if (file.accepted) return null;
  return { round, path, file, errors: [] };
}

/**
 * TASK-REVIEW: a task with a `review` field skips the second approval, so the field must point at a finding a
 * person accepted as `fix`. The findings file is the script's work and is not committed: on a fresh clone it is
 * missing, and the rule can only warn.
 */
export function checkReviewRefs(root: string, feature: Feature): Finding[] {
  const out: Finding[] = [];
  const featureId = feature.requirements?.feature ?? feature.tasks?.feature;
  if (!featureId) return out;
  for (const t of feature.tasks?.tasks ?? []) {
    if (!t.review) continue;
    const m = /^(.+)-(\d+)\/(F\d+)$/.exec(t.review);
    const fix = `Only \`spex review accept\` writes the review field. Remove it: a task with no review field is a task of the plan, and \`spex stamp ${feature.dir}\` stamps it.`;
    if (!m || m[1] !== featureId) {
      out.push({ severity: 'error', code: 'TASK-REVIEW', message: `${t.id}: review ${t.review} is not a finding of feature ${featureId}`, path: feature.tasksPath, id: t.id, fix });
      continue;
    }
    const { file } = loadFindings(root, featureId, Number(m[2]));
    if (!file) {
      if (!fileExists(join(root, findingsPath(featureId, Number(m[2])))) && t.status !== 'done') out.push({ severity: 'warning', code: 'TASK-REVIEW', message: `${t.id}: ${findingsPath(featureId, Number(m[2]))} is missing, so its accept cannot be checked`, path: feature.tasksPath, id: t.id, fix });
      continue;
    }
    if (!file.accepted?.tasks.includes(t.id) || file.findings.find((f) => f.id === m[3])?.pick !== 'fix') out.push({ severity: 'error', code: 'TASK-REVIEW', message: `${t.id}: ${t.review} was not accepted as a fix`, path: feature.tasksPath, id: t.id, fix });
  }
  return out;
}
