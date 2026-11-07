// tests.yaml, read: which tests prove a claim, which claims have none, where a script's file is, what a test
// needs before it can run, and the words that make a step a person's step. The rules and the commands share
// these so the two never disagree about what "covered" means.

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { SHELL, driverOf, testDirs } from './config.js';
import { coverToken } from './ears.js';
import { fileExists, readText, walk } from './io.js';
import type { Config, Feature, Finding, SessionEvidence, Task, TestRecord } from './types.js';

/** `REQ-007-001/AC-1` → the record id and the scenario id; a record or task id → no scenario. */
export function splitCover(id: string): { req: string | null; ac: string | null; task: string | null } {
  if (/^T[0-9]+$/.test(id)) return { req: null, ac: null, task: id };
  const [req, ac] = id.split('/');
  return { req, ac: ac ?? null, task: null };
}

/** Every id a task's proof may name: the task, its records, and their scenarios. */
export function claimsOf(feature: Feature, task: Task): Set<string> {
  const ids = new Set<string>([task.id]);
  for (const reqId of task.requirements) {
    ids.add(reqId);
    const r = feature.requirements?.requirements.find((x) => x.id === reqId);
    for (const a of r?.acceptance ?? []) ids.add(`${reqId}/${a.id}`);
  }
  return ids;
}

/** The tests that prove a task: by its id, by one of its records, or by one of their scenarios. */
export function testsOf(feature: Feature, task: Task): TestRecord[] {
  const ids = claimsOf(feature, task);
  return (feature.tests?.tests ?? []).filter((t) => t.covers.some((c) => ids.has(c)));
}

/** The tests that prove one scenario or one record (a whole-record test covers every scenario of it). */
export function testsFor(feature: Feature, reqId: string, acId?: string): TestRecord[] {
  return (feature.tests?.tests ?? []).filter((t) => t.covers.some((c) => c === reqId || (acId !== undefined && c === `${reqId}/${acId}`)));
}

export const isScript = (t: TestRecord): boolean => t.kind === 'script';
export const isSession = (t: TestRecord): boolean => t.kind === 'session';
/** A script with a file under a driver, as opposed to `shell` steps. The red check and the coverage search are about these. */
export const isFileTest = (t: TestRecord): boolean => t.kind === 'script' && t.driver !== SHELL;
export const isShellTest = (t: TestRecord): boolean => t.kind === 'script' && t.driver === SHELL;

/** The name token every file test of a test record starts with, from the first id it covers. */
export function nameToken(feature: Feature, t: TestRecord): string {
  const id = feature.requirements?.feature ?? feature.tests?.feature ?? feature.name.split('-')[0];
  return coverToken(id, t.covers[0]);
}

const TEST_FILE = /\.(ts|tsx|js|mjs|cjs|py|go|rs|java|kt|rb|php|feature|sh)$/;

/** Every test file under the test folders, repo-relative. */
export function testFiles(root: string, config: Config): string[] {
  return testDirs(config).flatMap((d) => walk(root, join(root, d))).filter((p) => TEST_FILE.test(p));
}

/** Where a file test lives: its `file` when that holds the name, else the first file under its driver's dir that does. */
export function locateTest(root: string, config: Config, t: TestRecord, files?: Map<string, string>): string | null {
  if (!t.name) return null;
  if (t.file && fileExists(join(root, t.file)) && readText(join(root, t.file)).includes(t.name)) return t.file;
  const dir = driverOf(config, t.driver)?.dir;
  const contents = files ?? new Map(testFiles(root, config).map((p) => [p, readText(join(root, p))]));
  for (const [p, text] of contents) {
    if (dir && !p.startsWith(dir.replace(/\/+$/, '') + '/')) continue;
    if (text.includes(t.name)) return p;
  }
  return null;
}

/**
 * Words that make a step a person's step. A scenario's "the user runs the export" is the system's user, which the
 * test plays; "ask Lukas", "by hand", "waits for a person's yes" is the person at the keyboard, and the process has
 * no such step. `people` from the config are the names.
 */
export function personActor(text: string, people: string[]): string | null {
  const patterns = [
    /\b(?:by hand|manually)\b/i,
    /\b(?:go-ahead|sign-off)\b/i,
    /\ba person'?s? (?:yes|ok|okay|approval|go)\b/i,
    /\bask(?:s|ed|ing)? (?:the |a |an )?(?:user|person|owner|operator|team|reviewer|human)\b/i,
    /\bwaits? for (?:a person|the user|someone|a human)\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[0];
  }
  for (const name of people) {
    const re = new RegExp(`(?<![\\w-])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:'s)?(?![\\w-])`);
    const m = text.match(re);
    if (m) return m[0];
  }
  return null;
}

/** An entry of `needs`: an env var (all caps, no spaces) must be set; anything else is a command that must exit 0. */
export function needsFindings(root: string, needs: string[] | undefined, where: string): Finding[] {
  const out: Finding[] = [];
  for (const need of needs ?? []) {
    if (/^[A-Z][A-Z0-9_]*$/.test(need)) {
      if (!(process.env[need] ?? '').trim()) out.push({ severity: 'error', code: 'GATE-NEEDS', message: `${where} needs ${need}, which is not set`, fix: `A person sets ${need} in the environment once (a token, a path). Nothing else is missing.` });
      continue;
    }
    const res = spawnSync('sh', ['-c', need], { cwd: root, encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] });
    if (res.status !== 0) out.push({ severity: 'error', code: 'GATE-NEEDS', message: `${where} needs \`${need}\`, which exited ${res.status ?? 'with a timeout'}`, fix: `A person makes it pass once (start the cluster, sign in). Tail: ${`${res.stdout ?? ''}${res.stderr ?? ''}`.trim().slice(-200)}` });
  }
  return out;
}

export function sessionEvidencePath(root: string, featureId: string, testId: string): string {
  return join(root, '.spex', 'evidence', featureId, `${testId}.session.json`);
}

/** What `spex session` recorded for a test, or null. */
export function readSession(root: string, featureId: string, testId: string): SessionEvidence | null {
  const path = sessionEvidencePath(root, featureId, testId);
  if (!fileExists(path)) return null;
  try {
    return JSON.parse(readText(path)) as SessionEvidence;
  } catch {
    return null;
  }
}
