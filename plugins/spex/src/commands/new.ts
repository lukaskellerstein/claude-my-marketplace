// `spex new`: the next feature folder, with its spec.md. The number also counts branch names, so two
// branches do not both become 008. One folder holds everything about one feature: spec.md (the spec
// in words), requirements.yaml (the records), tasks.yaml (the plan), contracts/.
//
// A big idea becomes a roadmap: one folder per step, each a stub with `status: planned` and the roadmap
// fields in its front matter. The detail of a step is written when its turn comes, never up front.

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { branchNames, isGitRepo } from '../git.js';
import { ensureDir, fileExists, isDir, readText, writeText } from '../io.js';
import { ALL_SECTIONS, SIZE_MARKS, SPEC_FILE, resolveDependency, withFrontMatter, type SpecStatus } from '../rules/spec.js';
import { SPECS_DIR } from '../specs.js';
import type { Finding } from '../types.js';
import type { CmdResult } from './lifecycle.js';

/** One line under each heading. /spex:new replaces it; spex check treats a section with only the hint as empty. */
const HINTS: Record<string, string> = {
  Why: 'The problem, who has it, and what happens if nothing changes.',
  What: 'The outcome, in bullets a user can see. Not how.',
  'Not this': 'The boundaries: what this does not do, on purpose.',
  Who: 'The users, and the surfaces they touch (CLI, UI, API, job).',
  Constraints: 'Tech, time, cost, compatibility.',
  Success: 'How we know it worked, with a number where one exists.',
  Alternatives: 'Two or three other ways to get the same outcome, with sources, and why not.',
  'Open questions': `One per line, each with its size first: ${SIZE_MARKS.big} big (the idea does not work without the answer) · ${SIZE_MARKS.medium} medium (changes scope, cost or a decision) · ${SIZE_MARKS.small} small (wording, nice-to-have).`,
  Decisions: 'What was decided while shaping this, with the reason and the source. Grows over time.',
};

export interface RoadmapFields {
  roadmap?: string;
  step?: number;
  depends_on?: string[];
  source?: string[];
}

/** The skeleton: nine sections with their hints, and the front matter when a status or roadmap fields are given. */
export function specTemplate(title: string, status: SpecStatus | null = null, fields: RoadmapFields = {}): string {
  const lines = [`# ${title}`, '', '<!-- The spec in words, shaped with /spex:new. The records in requirements.yaml are what the gates read. -->', ''];
  for (const s of ALL_SECTIONS) lines.push(`## ${s}`, '', `<!-- ${HINTS[s]} -->`, '');
  return withFields(lines.join('\n'), status, fields);
}

/** The front matter lines, in a fixed order, on top of any text. Sources are quoted: a `#` inside a flow list is safe, but a reader need not know that. */
export function withFields(text: string, status: SpecStatus | null, fields: RoadmapFields): string {
  let out = text;
  const set = (key: string, value: string | undefined): void => {
    if (value !== undefined) out = withFrontMatter(out, key, value);
  };
  set('status', status ?? undefined);
  set('roadmap', fields.roadmap);
  set('step', fields.step === undefined ? undefined : String(fields.step));
  set('depends_on', fields.depends_on?.length ? `[${fields.depends_on.join(', ')}]` : undefined);
  set('source', fields.source?.length ? `[${fields.source.map((s) => JSON.stringify(s)).join(', ')}]` : undefined);
  return out;
}

export function nextNumber(root: string): number {
  let max = 0;
  const take = (name: string): void => {
    const m = name.match(/(?:^|\/)(\d{3})-/);
    if (m) max = Math.max(max, Number(m[1]));
  };
  const specs = join(root, SPECS_DIR);
  if (isDir(specs)) for (const d of readdirSync(specs)) take(d);
  if (isGitRepo(root)) for (const b of branchNames(root)) take(b);
  return max + 1;
}

export interface NewOptions extends RoadmapFields {
  from?: string;
  shaping?: boolean;
  planned?: boolean;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const usage = (message: string, fix: string): CmdResult => ({ ok: false, findings: [{ severity: 'error', code: 'USAGE', message, fix }], exit: 2, text: '' });

export function newFeature(root: string, slug: string, opts: NewOptions): CmdResult {
  if (!SLUG.test(slug)) return usage(`slug "${slug}" must be lower-case words joined by dashes`, 'Example: csv-export');
  if (opts.planned && opts.shaping) return usage('--planned and --shaping exclude each other', 'A stub of a roadmap is --planned; the step being shaped now is --shaping.');
  if (opts.roadmap !== undefined && !SLUG.test(opts.roadmap)) return usage(`roadmap "${opts.roadmap}" must be lower-case words joined by dashes`, 'Example: --roadmap nex-platform');
  if (opts.step !== undefined && (!Number.isInteger(opts.step) || opts.step < 1)) return usage(`step must be a whole number from 1, not ${opts.step}`, 'Example: --step 3');
  if (opts.planned && !opts.roadmap) return usage('--planned needs --roadmap <name>', 'A planned step belongs to a roadmap: spex new <slug> --planned --roadmap <name> --step <n>.');
  const depends_on: string[] = [];
  for (const given of opts.depends_on ?? []) {
    const dir = resolveDependency(root, given);
    if (!dir) return usage(`--depends-on ${given}: no such folder under ${SPECS_DIR}/`, 'A step depends only on steps that exist already. Create the steps in order.');
    depends_on.push(dir.split('/').pop()!);
  }
  let text: string | null = null;
  if (opts.from) {
    const src = fileExists(opts.from) ? opts.from : join(root, opts.from);
    if (!fileExists(src)) return usage(`${opts.from} does not exist`, 'Pass the path of the document to copy in as spec.md.');
    text = readText(src);
  }
  const n = String(nextNumber(root)).padStart(3, '0');
  const dir = `${SPECS_DIR}/${n}-${slug}`;
  const spec = `${dir}/${SPEC_FILE}`;
  const title = slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  const status: SpecStatus | null = opts.planned ? 'planned' : opts.shaping ? 'shaping' : null;
  const fields: RoadmapFields = { roadmap: opts.roadmap, step: opts.step, depends_on, source: opts.source };
  ensureDir(join(root, dir));
  writeText(join(root, spec), text ? withFields(text, status, fields) : specTemplate(title, status, fields));
  const how = text ? `copied from ${opts.from}${status ? ` with status: ${status}` : ''}` : status === 'planned' ? `written from the template with status: planned; a stub of ${opts.roadmap}, step ${opts.step ?? '?'}` : status === 'shaping' ? 'written from the template with status: shaping; fill it round by round' : 'written from the template; fill its sections';
  const findings: Finding[] = [];
  if (opts.roadmap && opts.step === undefined) findings.push({ severity: 'warning', code: 'USAGE', message: 'a roadmap step without --step sorts last', fix: 'Pass --step <n> so spex roadmap lists the steps in order.' });
  return { ok: true, findings, exit: 0, text: `${dir}\n${spec} ${how}`, data: { dir, feature: n, slug, spec, from: opts.from ?? null, status, roadmap: opts.roadmap ?? null, step: opts.step ?? null, depends_on, source: opts.source ?? [] } };
}
