// The spec in words (spec.md). Markdown is for people, so the rule reads only its shape: the sections
// the next step needs are there and have words in them, the front matter a program flips (`status`)
// and a roadmap step carries (`roadmap`, `step`, `depends_on`, `source`), and the sized open
// questions. Everything else about the text is the person's business.

import { join } from 'node:path';
import { parse } from 'yaml';
import { YAML_OPTS, fileExists, readText } from '../io.js';
import { featureDirs, loadFeature, resolveFeatureDir } from '../specs.js';
import type { Feature, Finding } from '../types.js';

export const SPEC_FILE = 'spec.md';

/** The nine sections, in order. Each feeds a field that /spex:requirements fills. */
export const ALL_SECTIONS = ['Why', 'What', 'Not this', 'Who', 'Constraints', 'Success', 'Alternatives', 'Open questions', 'Decisions'];

/** The four without which requirements.yaml cannot be written: goal, records, out_of_scope, measure. */
export const REQUIRED_SECTIONS = ['Why', 'What', 'Not this', 'Success'];

/** What a planned step must say before its turn comes: the goal and the boundary to its siblings. */
export const STUB_SECTIONS = ['Why', 'What', 'Not this'];

/** How big a hole is. The marks read like a signal meter and survive any terminal font. */
export const SIZE_MARKS = { big: '●●●', medium: '●●○', small: '●○○' } as const;
export type Size = keyof typeof SIZE_MARKS;

/**
 * `planned`: a stub of a roadmap, written by /spex:new when it sized a big idea; `spex gate new` flips it to
 * `shaping` when every folder in its `depends_on` is built. `shaping`: /spex:new runs; `spex approve` flips it
 * to `ready`. A document without a status line is a person's own: `spex approve` reads it and sets `ready`.
 */
export type SpecStatus = 'planned' | 'shaping' | 'ready';
const STATUSES: readonly string[] = ['planned', 'shaping', 'ready'];

/** The front matter of spec.md. Only `status` is flipped by a program; the rest is written once by `spex new`. */
export interface SpecMeta {
  status: SpecStatus | null;
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

const EMPTY_META: SpecMeta = { status: null, roadmap: null, step: null, depends_on: [], source: [] };

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
    status: typeof d.status === 'string' && STATUSES.includes(d.status) ? (d.status as SpecStatus) : null,
    roadmap: typeof d.roadmap === 'string' ? d.roadmap : null,
    step: typeof d.step === 'number' && Number.isInteger(d.step) ? d.step : null,
    depends_on: list(d.depends_on),
    source: list(d.source),
  };
}

/** The `status:` line of the front matter, or null when the document has none. */
export function specStatus(text: string): SpecStatus | null {
  return specMeta(text).status;
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

/** The same text with `status:` set. */
export function withSpecStatus(text: string, status: SpecStatus): string {
  return withFrontMatter(text, 'status', status);
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
    const size = (Object.keys(SIZE_MARKS) as Size[]).find((s) => item.startsWith(SIZE_MARKS[s]));
    counts[size ?? 'unsized']++;
    counts.total++;
  }
  return counts;
}

/** `1 ●●● · 2 ●●○ · 0 ●○○`, plus the unsized ones when there are any. */
export function openSummary(c: OpenCounts): string {
  const parts = (Object.keys(SIZE_MARKS) as Size[]).map((s) => `${c[s]} ${SIZE_MARKS[s]}`);
  if (c.unsized) parts.push(`${c.unsized} unsized`);
  return parts.join(' · ');
}

/** A `depends_on` entry (a folder name, `specs/…`, or a bare `014`) → the folder under specs/, or null. */
export function resolveDependency(root: string, given: string): string | null {
  const rel = resolveFeatureDir(root, given);
  return featureDirs(root).includes(rel) ? rel : null;
}

/** Built: archived after the merge, so every record is `built` or `retired`. A folder with no records is not built. */
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
    const m = specMetaOf(root, dir);
    const f = loadFeature(root, dir);
    const state = f.tasks ? `${f.tasks.tasks.filter((t) => t.status === 'done').length}/${f.tasks.tasks.length} tasks done` : f.requirements ? 'records written' : (m?.status ?? 'a document');
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
  const required = meta.status === 'planned' ? STUB_SECTIONS : REQUIRED_SECTIONS;
  const empty = required.filter((s) => !sections.get(s.toLowerCase()));
  if (empty.length) findings.push({ severity: 'warning', code: 'SPEC-SECTIONS', message: `${doc.path} has nothing under: ${empty.join(', ')}`, path: doc.path, fix: meta.status === 'planned' ? 'A planned step says Why, What and Not this in a few lines each, so the steps around it know its boundary.' : 'Run /spex:new to fill them, or write them by hand. "Not this" is the boundary; "Success" is what the acceptance tests will measure.' });
  if (meta.status === 'shaping') {
    const open = openQuestions(sections);
    findings.push({ severity: 'info', code: 'SPEC-SHAPING', message: `${doc.path} is still shaping: ${open.total ? `${openSummary(open)} open` : 'no open question'}`, path: doc.path, fix: `Continue with /spex:new ${ctx.feature.dir}. When the person says done, \`spex approve ${ctx.feature.dir}\` marks it ready.` });
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
  // SPEC-PLANNED (info): a stub, and what it waits for
  if (meta.status === 'planned') {
    const waits = waitsFor(ctx.root, meta);
    const where = meta.roadmap ? `step ${meta.step ?? '?'} of ${meta.roadmap}` : 'a planned step';
    findings.push({ severity: 'info', code: 'SPEC-PLANNED', message: `${doc.path} is ${where}: ${waits.length ? `waits for ${waits.map((w) => `${w.dir.split('/').pop()} (${w.state})`).join(', ')}` : 'its dependencies are built'}`, path: doc.path, fix: `When every folder in depends_on is built, /spex:new ${ctx.feature.dir} shapes it (spex gate new flips planned → shaping).` });
  }
  return findings;
}
