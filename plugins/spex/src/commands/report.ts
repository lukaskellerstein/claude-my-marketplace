// `spex report`: the run's status file. Dex reads this, not the prose.

import { join } from 'node:path';
import { isGitRepo } from '../git.js';
import { writeText } from '../io.js';
import { loadFeature, resolveFeatureDir } from '../specs.js';
import { currentTree } from '../verify.js';
import type { CmdResult } from './lifecycle.js';

export const STATUSES = ['done', 'concerns', 'blocked', 'needs-context', 'too-big'] as const;

export interface ReportInput {
  stage: string;
  task?: string;
  status: string;
  summary: string;
  concerns: string[];
  questions: string[];
  files: string[];
  pulled: string[];
}

export function report(root: string, dir: string, input: ReportInput): CmdResult {
  if (!(STATUSES as readonly string[]).includes(input.status)) return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: `status must be one of ${STATUSES.join(', ')}`, fix: '--status done' }], exit: 2, text: '' };
  if (!input.summary.trim()) return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: 'summary is empty', fix: '--summary "one or two sentences"' }], exit: 2, text: '' };
  const feature = loadFeature(root, resolveFeatureDir(root, dir));
  const id = feature.requirements?.feature ?? feature.name.split('-')[0];
  const path = `.spex/runs/${id}/${input.stage}${input.task ? `-${input.task}` : ''}.json`;
  const doc = {
    status: input.status,
    stage: input.stage,
    task: input.task ?? null,
    summary: input.summary,
    concerns: input.concerns,
    questions: input.questions,
    files_changed: input.files,
    pulled: input.pulled,
    tree: isGitRepo(root) ? currentTree(root) : null,
    at: new Date().toISOString(),
  };
  writeText(join(root, path), JSON.stringify(doc, null, 2) + '\n');
  return { ok: true, findings: [], exit: 0, text: `STATUS: ${input.status}\n${input.summary}\n(${path})`, data: { path, ...doc } };
}
