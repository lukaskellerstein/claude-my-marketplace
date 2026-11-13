// `spex new`: the next spec folder, with its note. /spex:new only splits an idea into specs and writes one note for
// each: a note holds every detail the person gave for that spec, one line each, with a link back to their text. It
// adds nothing and drops nothing. /spex:plan writes the full spec when the turn of the spec comes, from the real
// code, because the specs before it change the code.
//
// An idea given as text is kept word for word in source.md, in the folder of the spec (`--words <file>`): the note
// links each line to it (`← source.md#L3`). A design that is a file stays where it is, and the note names its
// sections (`--source docs/design.md#3.4`). The number also counts branch names, so two branches do not both
// become 008. A big design becomes a roadmap: `roadmap`, `step` and `depends_on` in the front matter of each note,
// and one file, specs/<name>.roadmap.md, for the whole.
//
// A note has no status.yaml: no phase has started. That missing file is what makes it a note.

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { branchNames, isGitRepo } from '../git.js';
import { ensureDir, fileExists, isDir, readText, writeText } from '../io.js';
import { ALL_SECTIONS, DESIGN_SECTION, IDEA_SECTION, LINK_SECTIONS, SIZE_MARKS, SPEC_FILE, STUB_SECTIONS, resolveDependency, sectionBodies, withFrontMatter } from '../rules/spec.js';
import { SPECS_DIR } from '../specs.js';
import type { Finding } from '../types.js';
import type { CmdResult } from './lifecycle.js';

export const SOURCE_FILE = 'source.md';

/** One line under each heading. The writer replaces it; spex check treats a section with only the hint as empty. */
const HINTS: Record<string, string> = {
  Why: 'The problem, who has it, and what happens if nothing changes.',
  What: 'The outcome, in bullets a user can see. Not how.',
  'Not this': 'The boundaries: what this does not do, on purpose.',
  Who: 'The users, and the surfaces they touch (CLI, UI, API, job).',
  Constraints: 'What the code gives: the facts of this repo that the spec must fit. Tech, time, cost, compatibility.',
  Success: 'How we know it worked, with a number where one exists.',
  Alternatives: 'Two or three other ways to get the same outcome, with sources, and why not.',
  'Open questions': `One per line, each with its size first: ${SIZE_MARKS.big} big (the idea does not work without the answer) · ${SIZE_MARKS.medium} medium (changes scope, cost or a decision) · ${SIZE_MARKS.small} small (wording, nice-to-have). End each with "Pick: …" or "Settles: …". plan settles them.`,
  Decisions: 'Each decision with who made it and why: D1 … (you, question 1) · (by agent, high|medium|low). A line marked (you) is fixed for every agent.',
  [IDEA_SECTION]: 'Every detail of the text for this spec, one bullet each, in the words of the text, each with its link: `- separator: semicolon ← source.md#L5`. Adds nothing, drops nothing.',
  [DESIGN_SECTION]: 'Everything the source sections say for this spec: every name, key, value, file, command, label, check, signal and record path, a bullet each, with its #section and a tag at the end: [new], [built: spec 24] or [changes: spec 21].',
  Uses: 'Each name this spec needs from another, one per line: `name` ← the spec folder that introduces it, ← built (where), or ← outside (who). None. when there is none.',
  Introduces: 'Each name this spec brings that a later spec may use, one per line: `name`: what it is.',
};

/** A note from the person's text: the boundary, their details, and what is open. */
const NOTE_TEMPLATE = [...STUB_SECTIONS, IDEA_SECTION, 'Open questions'];

/** A note of a roadmap, from a design file: the boundary, the design, the links, and the open items the design leaves to a person. */
const ROADMAP_TEMPLATE = [...STUB_SECTIONS, DESIGN_SECTION, ...LINK_SECTIONS, 'Open questions'];

/** The line a person reads first in a note: what the file is, and when it grows. `spex start plan` removes it. */
function noteLine(fields: RoadmapFields): string {
  const of = fields.roadmap ? `step ${fields.step ?? '?'} of the roadmap ${fields.roadmap}. ` : '';
  return `> A note: ${of}/spex:plan writes the full spec when the turn of this spec comes. Until then it holds the boundary and what you gave, nothing more.`;
}
const NOTE_LINE = /^> (?:A note|Planned): .*\n\n?/m;

export interface RoadmapFields {
  roadmap?: string;
  step?: number;
  depends_on?: string[];
  source?: string[];
}

/** The skeleton of a note: its sections with their hints, and the front matter. */
export function specTemplate(title: string, fields: RoadmapFields = {}): string {
  const lines = [`# ${title}`, '', noteLine(fields), ''];
  for (const s of fields.roadmap ? ROADMAP_TEMPLATE : NOTE_TEMPLATE) lines.push(`## ${s}`, '', `<!-- ${HINTS[s]} -->`, '');
  return withFields(lines.join('\n'), fields);
}

/** A note opened by plan: the note line goes, and every section of the full spec it lacks is added at the end, with its hint. */
export function openedNote(text: string): string {
  const have = sectionBodies(text);
  const missing = ALL_SECTIONS.filter((s) => !have.has(s.toLowerCase()));
  const body = text.replace(NOTE_LINE, '').replace(/\s*$/, '\n');
  return missing.length ? `${body}\n${missing.map((s) => `## ${s}\n\n<!-- ${HINTS[s]} -->\n`).join('\n')}` : body;
}

/** The front matter lines, in a fixed order, on top of any text. Sources are quoted: a `#` inside a flow list is safe, but a reader need not know that. */
export function withFields(text: string, fields: RoadmapFields): string {
  let out = text;
  const set = (key: string, value: string | undefined): void => {
    if (value !== undefined) out = withFrontMatter(out, key, value);
  };
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
  /** A file with the person's text: copied word for word to source.md in the new folder. */
  words?: string;
  /** The folder's number, when the repo numbers its specs elsewhere too (docs/my-specs/28 → 029). Never below the next one. */
  number?: number;
  /** For new-bug: the number is given by the turn, and may be below the next free one. */
  exact?: boolean;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const usage = (message: string, fix: string): CmdResult => ({ ok: false, findings: [{ severity: 'error', code: 'USAGE', message, fix }], exit: 2, text: '' });

export function newFeature(root: string, slug: string, opts: NewOptions): CmdResult {
  if (!SLUG.test(slug)) return usage(`slug "${slug}" must be lower-case words joined by dashes`, 'Example: csv-export');
  if (opts.roadmap !== undefined && !SLUG.test(opts.roadmap)) return usage(`roadmap "${opts.roadmap}" must be lower-case words joined by dashes`, 'Example: --roadmap reports');
  if (opts.step !== undefined && (!Number.isInteger(opts.step) || opts.step < 1)) return usage(`step must be a whole number from 1, not ${opts.step}`, 'Example: --step 3');
  const next = nextNumber(root);
  if (opts.number !== undefined && (!Number.isInteger(opts.number) || opts.number < 1 || opts.number > 999)) return usage(`--number must be a whole number from 1 to 999, not ${opts.number}`, 'Example: --number 29');
  if (opts.number !== undefined && opts.number < next && !opts.exact) return usage(`--number ${opts.number} is below ${next}: a folder or a branch has ${String(next - 1).padStart(3, '0')} already`, `Use --number ${next} or more, or leave it out.`);
  const depends_on: string[] = [];
  for (const given of opts.depends_on ?? []) {
    const dir = resolveDependency(root, given);
    if (!dir) return usage(`--depends-on ${given}: no such folder under ${SPECS_DIR}/`, 'A spec depends only on specs that exist already. Create the notes in order.');
    depends_on.push(dir.split('/').pop()!);
  }
  let words: string | null = null;
  if (opts.words) {
    const src = fileExists(opts.words) ? opts.words : join(root, opts.words);
    if (!fileExists(src)) return usage(`${opts.words} does not exist`, 'Pass the path of a file that holds the text of the person, word for word.');
    words = readText(src);
  }
  const n = String(opts.number ?? next).padStart(3, '0');
  const dir = `${SPECS_DIR}/${n}-${slug}`;
  const spec = `${dir}/${SPEC_FILE}`;
  if (isDir(join(root, dir))) return usage(`${dir} exists already`, 'Pick another name.');
  const title = `${n} ${slug.split('-').map((w, i) => (i ? w : w[0].toUpperCase() + w.slice(1))).join(' ')}`;
  // The text of the person is the first source of a note that has one.
  const source = [...(words !== null ? [SOURCE_FILE] : []), ...(opts.source ?? [])];
  const fields: RoadmapFields = { roadmap: opts.roadmap, step: opts.step, depends_on, source };
  ensureDir(join(root, dir));
  if (words !== null) writeText(join(root, dir, SOURCE_FILE), words);
  writeText(join(root, spec), specTemplate(title, fields));
  const lines = words === null ? 0 : words.split('\n').filter(hasWords).length;
  const how = `a note, written from the template${opts.roadmap ? `; step ${opts.step ?? '?'} of ${opts.roadmap}` : ''}${words !== null ? `; ${dir}/${SOURCE_FILE} holds the text word for word (${lines} line(s) with words)` : ''}`;
  const findings: Finding[] = [];
  if (opts.roadmap && opts.step === undefined) findings.push({ severity: 'warning', code: 'USAGE', message: 'a roadmap step without --step sorts last', fix: 'Pass --step <n> so spex roadmap lists the steps in order.' });
  return { ok: true, findings, exit: 0, text: `${dir}\n${spec}: ${how}`, data: { dir, feature: n, slug, spec, words: words !== null ? `${dir}/${SOURCE_FILE}` : null, lines, roadmap: opts.roadmap ?? null, step: opts.step ?? null, depends_on, source } };
}

/** A line with no letter or digit (a rule, a blank line, a fence) holds no detail. `new` and `cover` count the same lines. */
const hasWords = (line: string): boolean => /[\p{L}\p{N}]/u.test(line);

/** `← source.md#L3`, `#L3-L5`: the line numbers of the person's text a bullet links to. */
function linkedLines(text: string, file: string): Set<number> {
  const out = new Set<number>();
  const name = file.split('/').pop()!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const m of text.matchAll(new RegExp(`${name}#L(\\d+)(?:-L?(\\d+))?`, 'g'))) for (let i = Number(m[1]); i <= Number(m[2] ?? m[1]); i++) out.add(i);
  return out;
}

/**
 * `spex cover <text file> <dir>…`: every line of the person's text is in a note. Each line with words must be linked
 * from a bullet of one of the notes (`← source.md#L3`); a line that belongs in no spec is linked too, with its reason
 * (`- (left out: a greeting) ← source.md#L1`). It costs no tokens, and it is the check of new and of new-bug.
 */
export function cover(root: string, file: string, dirs: string[]): CmdResult {
  const path = fileExists(file) ? file : join(root, file);
  if (!fileExists(path)) return usage(`${file} does not exist`, 'Name the file that holds the text: specs/007-csv-export/source.md.');
  if (!dirs.length) return usage('cover needs the notes to read', 'spex cover <text file> <dir>…');
  const lines = readText(path).split('\n');
  const linked = new Set<number>();
  for (const d of dirs) {
    const spec = join(root, d.replace(/\/+$/, ''), SPEC_FILE);
    if (!fileExists(spec)) return usage(`${d} has no ${SPEC_FILE}`, 'Name the folders of the notes.');
    // The hint of the template shows a link as an example: a comment is no bullet.
    for (const n of linkedLines(readText(spec).replace(/<!--[\s\S]*?-->/g, ''), file)) linked.add(n);
  }
  const findings: Finding[] = [];
  let withWords = 0;
  lines.forEach((l, i) => {
    if (!hasWords(l)) return;
    withWords++;
    if (!linked.has(i + 1)) findings.push({ severity: 'gap', code: 'COVER-LINE', message: `line ${i + 1} of ${file} is in no note: "${l.trim().slice(0, 100)}"`, path: file, fix: `Add its detail to the note it belongs to, with \`← ${file.split('/').pop()}#L${i + 1}\`. A line that belongs in no spec gets a bullet with its reason and the same link.` });
  });
  const ok = !findings.length;
  return { ok, findings, exit: ok ? 0 : 5, text: `${withWords - findings.length} of ${withWords} line(s) of ${file} kept in ${dirs.length} note(s)`, data: { file, lines: withWords, kept: withWords - findings.length, notes: dirs } };
}
