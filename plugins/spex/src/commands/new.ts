// `spex new`: the next feature folder, with its spec.md. The number also counts branch names, so two
// branches do not both become 008. One folder holds everything about one feature: spec.md (the spec
// in words), requirements.yaml (the records), tasks.yaml (the plan), contracts/.
//
// A big idea becomes a roadmap: one folder per step, each a stub with `status: planned` and the roadmap
// fields in its front matter, and one file, specs/<name>.roadmap.md, for the whole. A stub holds all the
// design says for its step, now: Why, What, Not this, every name and value of its source sections, the
// names it uses and brings, and the design's open items. What the code says is written when its turn
// comes, because the steps before it change the code. `spex gate new` adds the other sections then.

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { branchNames, isGitRepo } from '../git.js';
import { ensureDir, fileExists, isDir, readText, writeText } from '../io.js';
import { ALL_SECTIONS, DESIGN_SECTION, LINK_SECTIONS, SIZE_MARKS, SPEC_FILE, STUB_SECTIONS, resolveDependency, sectionBodies, withFrontMatter, type SpecStatus } from '../rules/spec.js';
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
  [DESIGN_SECTION]: 'Everything the source sections say for this step: every name, key, value, file, command, label, check, signal and record path, a bullet each, with its #section and a tag at the end: [new], [built: spec 24] or [changes: spec 21].',
  Uses: 'Each name this step needs from another, one per line: `name` ← the step folder that introduces it, ← built (where), or ← outside (who). None. when there is none.',
  Introduces: 'Each name this step brings that a later step may use, one per line: `name`: what it is.',
};

/** A stub's sections: the boundary, the design, the links, and the open items the design leaves to a person. */
const STUB_TEMPLATE = [...STUB_SECTIONS, DESIGN_SECTION, ...LINK_SECTIONS, 'Open questions'];

/** A step of a roadmap that is shaped now: the nine sections, with the links after the boundary. */
const ROADMAP_TEMPLATE = [...ALL_SECTIONS.slice(0, 3), ...LINK_SECTIONS, ...ALL_SECTIONS.slice(3)];

const INTRO = '<!-- The spec in words, shaped with /spex:new. The records in requirements.yaml are what the gates read. -->';

/** The line a person reads first in a stub: what the file is, and when it grows. `spex gate new` removes it. */
function plannedNote(fields: RoadmapFields): string {
  const after = fields.depends_on?.length ? ` once ${fields.depends_on.join(', ')} ${fields.depends_on.length > 1 ? 'are' : 'is'} built` : ' when its turn comes; it depends on no other step';
  return `> Planned: step ${fields.step ?? '?'} of the roadmap ${fields.roadmap ?? '?'}. /spex:new shapes it${after}. Until then it holds the boundary and what the design says, nothing more.`;
}
const PLANNED_NOTE = /^> Planned: .*\n\n?/m;

export interface RoadmapFields {
  roadmap?: string;
  step?: number;
  depends_on?: string[];
  source?: string[];
}

/** The skeleton: nine sections with their hints, and the front matter when a status or roadmap fields are given. A step of a roadmap also has Uses and Introduces; a stub has seven. */
export function specTemplate(title: string, status: SpecStatus | null = null, fields: RoadmapFields = {}): string {
  const planned = status === 'planned';
  const lines = [`# ${title}`, '', planned ? plannedNote(fields) : INTRO, ''];
  for (const s of planned ? STUB_TEMPLATE : fields.roadmap ? ROADMAP_TEMPLATE : ALL_SECTIONS) lines.push(`## ${s}`, '', `<!-- ${HINTS[s]} -->`, '');
  return withFields(lines.join('\n'), status, fields);
}

/** A stub opened for shaping: the planned note goes, and every section it lacks is added at the end, with its hint. */
export function openedStub(text: string): string {
  const have = sectionBodies(text);
  const missing = ALL_SECTIONS.filter((s) => !have.has(s.toLowerCase()));
  const body = text.replace(PLANNED_NOTE, '').replace(/\s*$/, '\n');
  return missing.length ? `${body}\n${missing.map((s) => `## ${s}\n\n<!-- ${HINTS[s]} -->\n`).join('\n')}` : body;
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
