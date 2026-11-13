// The spec in words (spec.md). Markdown is for people, so the rule reads only its shape: the sections
// the next step needs are there and have words in them, the front matter a spec of a roadmap carries
// (`roadmap`, `step`, `depends_on`, `source`), and the sized open questions. Everything else about the
// text is the person's business, a Mermaid diagram included.
//
// spec.md has no line for the state of the spec. status.yaml in the same folder holds it: a folder with
// no status.yaml is a note, written by /spex:new; /spex:plan turns it into the full spec.

import { join } from 'node:path';
import { parse } from 'yaml';
import { YAML_OPTS, fileExists, readText } from '../io.js';
import { featureDirs, loadFeature, resolveFeatureDir } from '../specs.js';
import { liveState, readState, stateWord } from '../state.js';
import type { Feature, Finding } from '../types.js';

export const SPEC_FILE = 'spec.md';

/** The nine sections of a full spec, in order. Each feeds a field of the records that /spex:plan writes. */
export const ALL_SECTIONS = ['Why', 'What', 'Not this', 'Who', 'Constraints', 'Success', 'Alternatives', 'Open questions', 'Decisions'];

/** The four without which requirements.yaml cannot be written: goal, records, out_of_scope, measure. */
export const REQUIRED_SECTIONS = ['Why', 'What', 'Not this', 'Success'];

/** What a note must say before its turn comes: the goal and the boundary to the other specs. */
export const STUB_SECTIONS = ['Why', 'What', 'Not this'];

/** What a step of a roadmap takes from the others and gives them: names, each with where it comes from. A stub must say both ("None." is an answer). */
export const LINK_SECTIONS = ['Uses', 'Introduces'];

/** A note's fourth section, for a design that is a file: what its `source` sections say, so a person need not open the design to read the spec. */
export const DESIGN_SECTION = 'From the design';

/** A note's fourth section, for an idea given as text: every detail of the person's text, one line each, with a link back to it. */
export const IDEA_SECTION = 'From your idea';

/** How big a hole is: a colored square, which a person finds in a scan. Big, medium, small read red, orange, yellow. */
export const SIZE_MARKS = { big: '🟥', medium: '🟧', small: '🟨' } as const;
export type Size = keyof typeof SIZE_MARKS;

/** The marks of v2.0 and before, a signal meter in dots. Specs written then still count. */
const OLD_SIZE_MARKS: Record<Size, string> = { big: '●●●', medium: '●●○', small: '●○○' };

/** The front matter of spec.md, written once by `spex new`. No program flips a line of it. */
export interface SpecMeta {
  /** The idea this step belongs to, a slug. Null for a spec that stands alone. */
  roadmap: string | null;
  step: number | null;
  /** Folder names under specs/ (`014-ticket-model`) this step builds on. */
  depends_on: string[];
  /** The design sections this step covers: `docs/nex-design.md#3.4`. */
  source: string[];
}

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n?/;

/** Where the spec document is: `spec:` in requirements.yaml, else spec.md in the folder. Null when there is none. */
export function specDocPath(root: string, feature: Feature): { path: string; missing: boolean } | null {
  const pointer = feature.requirements?.spec;
  if (pointer) {
    for (const p of [pointer, `${feature.dir}/${pointer}`]) if (fileExists(join(root, p))) return { path: p, missing: false };
    return { path: pointer, missing: true };
  }
  const local = `${feature.dir}/${SPEC_FILE}`;
  return fileExists(join(root, local)) ? { path: local, missing: false } : null;
}

/** `## Title` → the words under it, with the template's `<!-- hints -->` removed. Titles are lower-cased. */
export function sectionBodies(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of text.split(/^## +/m).slice(1)) {
    const nl = part.indexOf('\n');
    const title = (nl < 0 ? part : part.slice(0, nl)).trim().toLowerCase();
    const body = (nl < 0 ? '' : part.slice(nl + 1)).replace(/<!--[\s\S]*?-->/g, '').trim();
    out.set(title, body);
  }
  return out;
}

const EMPTY_META: SpecMeta = { roadmap: null, step: null, depends_on: [], source: [] };

/** A folder name a person may have typed as a number: `14` → `014`. */
const asName = (v: unknown): string | null => (typeof v === 'string' ? v : typeof v === 'number' ? String(v).padStart(3, '0') : null);

/** The front matter, read with the YAML parser. A document without one, or with one that does not parse, is a plain document. */
export function specMeta(text: string): SpecMeta {
  const fm = text.match(FRONT_MATTER);
  if (!fm) return { ...EMPTY_META };
  let data: unknown;
  try {
    data = parse(fm[1], YAML_OPTS);
  } catch {
    return { ...EMPTY_META };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ...EMPTY_META };
  const d = data as Record<string, unknown>;
  const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(asName).filter((x): x is string => !!x) : asName(v) ? [asName(v)!] : []);
  return {
    roadmap: typeof d.roadmap === 'string' ? d.roadmap : null,
    step: typeof d.step === 'number' && Number.isInteger(d.step) ? d.step : null,
    depends_on: list(d.depends_on),
    source: list(d.source),
  };
}

/** The same text with one front matter key set, in the front matter it has or a new one. The value is written as given. */
export function withFrontMatter(text: string, key: string, value: string): string {
  const fm = text.match(FRONT_MATTER);
  const line = `${key}: ${value}`;
  if (!fm) return `---\n${line}\n---\n${text}`;
  const re = new RegExp(`^${key}:.*$`, 'm');
  const body = re.test(fm[1]) ? fm[1].replace(re, line) : `${fm[1]}\n${line}`;
  return text.replace(FRONT_MATTER, `---\n${body}\n---\n`);
}

export interface OpenCounts {
  big: number;
  medium: number;
  small: number;
  unsized: number;
  total: number;
}

/** The list items under Open questions, counted by their size mark. An item without a mark is unsized. */
export function openQuestions(sections: Map<string, string>): OpenCounts {
  const counts: OpenCounts = { big: 0, medium: 0, small: 0, unsized: 0, total: 0 };
  for (const line of (sections.get('open questions') ?? '').split('\n')) {
    const m = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (!m) continue;
    const item = m[1].trim();
    const size = (Object.keys(SIZE_MARKS) as Size[]).find((s) => item.startsWith(SIZE_MARKS[s]) || item.startsWith(OLD_SIZE_MARKS[s]));
    counts[size ?? 'unsized']++;
    counts.total++;
  }
  return counts;
}

/** The Open questions with neither a pick nor what settles it: the person cannot answer them with "ok". */
export function openWithoutPick(sections: Map<string, string>): string[] {
  const out: string[] = [];
  for (const line of (sections.get('open questions') ?? '').split('\n')) {
    const m = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (m && !/\bpick\b|\bsettles:/i.test(m[1])) out.push(m[1].trim());
  }
  return out;
}

/** `🟥 1 big · 🟧 2 medium · 🟨 0 small`, plus the unsized ones when there are any. */
export function openSummary(c: OpenCounts): string {
  const parts = (Object.keys(SIZE_MARKS) as Size[]).map((s) => `${SIZE_MARKS[s]} ${c[s]} ${s}`);
  if (c.unsized) parts.push(`${c.unsized} unsized`);
  return parts.join(' · ');
}

/** A `depends_on` entry (a folder name, `specs/…`, or a bare `014`) → the folder under specs/, or null. */
export function resolveDependency(root: string, given: string): string | null {
  const rel = resolveFeatureDir(root, given);
  return featureDirs(root).includes(rel) ? rel : null;
}

/** Built: the close ran, so every record is `built` or `retired`. A folder with no records is not built. */
export function isBuilt(root: string, dir: string): boolean {
  const f = loadFeature(root, dir);
  const reqs = f.requirements?.requirements ?? [];
  return reqs.length > 0 && reqs.every((r) => r.status === 'built' || r.status === 'retired');
}

/** The front matter of a folder's spec document, or null when the folder has none. */
export function specMetaOf(root: string, dir: string): SpecMeta | null {
  const doc = specDocPath(root, loadFeature(root, dir));
  if (!doc || doc.missing) return null;
  return specMeta(readText(join(root, doc.path)));
}

/** The folders in `depends_on` that are not built yet, with what they are instead. */
export function waitsFor(root: string, meta: SpecMeta): { dir: string; state: string }[] {
  const out: { dir: string; state: string }[] = [];
  for (const dep of meta.depends_on) {
    const dir = resolveDependency(root, dep);
    if (!dir) {
      out.push({ dir: dep, state: 'missing' });
      continue;
    }
    if (isBuilt(root, dir)) continue;
    const f = loadFeature(root, dir);
    const state = f.tasks ? `${f.tasks.tasks.filter((t) => t.status === 'done').length}/${f.tasks.tasks.length} tasks done` : stateWord(liveState(root, dir));
    out.push({ dir, state });
  }
  return out;
}

/** A dependency cycle through `dir`, as the folder names on it, or null. */
function dependencyCycle(root: string, dir: string): string[] | null {
  const stack: string[] = [];
  const seen = new Set<string>();
  const visit = (d: string): string[] | null => {
    if (stack.includes(d)) return [...stack.slice(stack.indexOf(d)), d];
    if (seen.has(d)) return null;
    seen.add(d);
    stack.push(d);
    for (const dep of specMetaOf(root, d)?.depends_on ?? []) {
      const target = resolveDependency(root, dep);
      if (!target) continue;
      const c = visit(target);
      if (c) return c;
    }
    stack.pop();
    return null;
  };
  const c = visit(dir);
  return c && c[0] === dir ? c.map((d) => d.split('/').pop() ?? d) : null;
}

export function checkSpec(ctx: { root: string; feature: Feature }): Finding[] {
  const findings: Finding[] = [];
  const doc = specDocPath(ctx.root, ctx.feature);
  if (!doc) return findings;
  if (doc.missing) {
    findings.push({ severity: 'error', code: 'SPEC-POINTER', message: `spec: points to ${doc.path}, which does not exist`, path: ctx.feature.requirementsPath, fix: 'Point spec: at the document, or remove it and keep the spec in spec.md next to requirements.yaml.' });
    return findings;
  }
  const text = readText(join(ctx.root, doc.path));
  const sections = sectionBodies(text);
  const meta = specMeta(text);
  // A note: no phase has started. It holds the boundary and what the person gave; the full spec comes with plan.
  const note = readState(ctx.root, ctx.feature.dir) === null && !ctx.feature.requirements;
  const required = note ? [...STUB_SECTIONS, ...(meta.roadmap ? LINK_SECTIONS : [])] : REQUIRED_SECTIONS;
  const empty = required.filter((s) => !sections.get(s.toLowerCase()));
  if (empty.length) findings.push({ severity: 'warning', code: 'SPEC-SECTIONS', message: `${doc.path} has nothing under: ${empty.join(', ')}`, path: doc.path, fix: note ? 'A note says Why, What and Not this, so the specs around it know its boundary. A spec of a roadmap also says Uses and Introduces ("None." is an answer), so spex check can test its links.' : `The full spec needs Why, What, Not this and Success: the analyst writes them in /spex:plan ${ctx.feature.dir}.` });
  // SPEC-OPEN-PICK: an Open question of a note carries the best pick, or what settles it
  if (note) {
    const bare = openWithoutPick(sections);
    if (bare.length) findings.push({ severity: 'warning', code: 'SPEC-OPEN-PICK', message: `${doc.path}: ${bare.length} Open question(s) with no pick: ${bare.slice(0, 3).map((q) => `"${q.slice(0, 80)}"`).join(', ')}`, path: doc.path, fix: 'End each with "Pick: <the best option> (why)", the design\'s pick when it has one, or with "Settles: <what settles it>" (research, a later spec, a person outside). plan asks the person at most 3 of them.' });
  }

  // SPEC-DEPENDS: every dependency is a folder under specs/, not this one
  for (const dep of meta.depends_on) {
    const target = resolveDependency(ctx.root, dep);
    if (!target) findings.push({ severity: 'error', code: 'SPEC-DEPENDS', message: `${doc.path}: depends_on names ${dep}, which is no folder under specs/`, path: doc.path, fix: 'Name the folder (014-ticket-model) or its number. A step depends only on steps that exist already.' });
    else if (target === ctx.feature.dir) findings.push({ severity: 'error', code: 'SPEC-DEPENDS', message: `${doc.path}: depends_on names its own folder`, path: doc.path, fix: 'Remove it.' });
  }
  // SPEC-CYCLE
  if (meta.depends_on.length) {
    const cycle = dependencyCycle(ctx.root, ctx.feature.dir);
    if (cycle) findings.push({ severity: 'error', code: 'SPEC-CYCLE', message: `dependency cycle: ${cycle.join(' → ')}`, path: doc.path, fix: 'Break the cycle: one of these steps must come first.' });
  }
  // SPEC-SOURCE: the design file is still there (the `#section` part is for people)
  for (const src of meta.source) {
    const file = src.split('#')[0];
    if (file && !fileExists(join(ctx.root, file)) && !fileExists(join(ctx.root, ctx.feature.dir, file))) findings.push({ severity: 'warning', code: 'SPEC-SOURCE', message: `${doc.path}: source ${file} does not exist`, path: doc.path, fix: 'Point source at the design document as it is now, or remove the entry.' });
  }
  // SPEC-NOTE (info): a note, and what it waits for
  if (note) {
    const waits = waitsFor(ctx.root, meta);
    const where = meta.roadmap ? `step ${meta.step ?? '?'} of ${meta.roadmap}` : 'a note';
    findings.push({ severity: 'info', code: 'SPEC-NOTE', message: `${doc.path} is ${where}: ${waits.length ? `waits for ${waits.map((w) => `${w.dir.split('/').pop()} (${w.state})`).join(', ')}` : 'nothing it depends on is open'}`, path: doc.path, fix: `/spex:plan ${ctx.feature.dir} writes the full spec when every spec before it is closed.` });
  }
  return findings;
}
