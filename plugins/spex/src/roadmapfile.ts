// specs/<name>.roadmap.md: the one file a roadmap keeps beside its step folders. The folders say what each
// step is; this file says what the whole is: the idea, the order and why, what the roadmap needs from
// outside, the round-0 decisions, and the coverage table, where every section of the design has a row: the
// steps that build it, or built, not planned, outside or context, each with its reason. A design section with
// no row is a gap nobody chose, and `spex roadmap <name> --coverage` names it.

import { join } from 'node:path';
import { parse } from 'yaml';
import type { DesignSection } from './design.js';
import { YAML_OPTS, fileExists, readText } from './io.js';
import { sectionBodies } from './rules/spec.js';
import { SPECS_DIR } from './specs.js';
import type { Finding } from './types.js';

export const roadmapFilePath = (name: string): string => `${SPECS_DIR}/${name}.roadmap.md`;

/** What a row's Where may say besides step folders. */
export const ROW_KINDS = ['built', 'not planned', 'outside', 'context'] as const;
export type RowKind = (typeof ROW_KINDS)[number];

export interface CoverageRow {
  line: number;
  ref: string;
  where: string;
  why: string;
  /** Step folder names in Where: `029-deploy-one-push`. */
  steps: string[];
  kinds: RowKind[];
}

export interface RoadmapFile {
  path: string;
  /** The design files, from the front matter `design:`. */
  design: string[];
  rows: CoverageRow[];
  sections: Map<string, string>;
  findings: Finding[];
}

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n?/;
/** A step folder's name in prose: three digits, a dash, a slug. Not inside another name (ADR-043-a-release…). */
export const STEP_NAME = /(?<![\w-])\d{3}-[a-z][a-z0-9]*(?:-[a-z0-9]+)*/g;

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

export function readRoadmapFile(root: string, name: string): RoadmapFile | null {
  const path = roadmapFilePath(name);
  if (!fileExists(join(root, path))) return null;
  const text = readText(join(root, path));
  const findings: Finding[] = [];
  let design: string[] = [];
  const fm = text.match(FRONT_MATTER);
  if (fm) {
    try {
      const d = parse(fm[1], YAML_OPTS) as Record<string, unknown> | null;
      if (d && Array.isArray(d.design)) design = d.design.filter((x): x is string => typeof x === 'string');
      else if (d && typeof d.design === 'string') design = [d.design];
    } catch {
      findings.push({ severity: 'error', code: 'ROADMAP-FILE', message: `${path}: the front matter does not parse`, path, fix: 'Write it as YAML: roadmap: <name> and design: ["<file>"].' });
    }
  }
  const rows: CoverageRow[] = [];
  const lines = text.split('\n');
  let inCoverage = false;
  let header = false;
  lines.forEach((line, i) => {
    if (/^## /.test(line)) {
      inCoverage = /^## +coverage\s*$/i.test(line);
      header = false;
      return;
    }
    if (!inCoverage || !line.trim().startsWith('|')) return;
    const c = cells(line);
    if (c.every((x) => /^:?-+:?$/.test(x))) return; // the separator
    if (!header) {
      header = true; // the first table line is the header
      return;
    }
    const [ref = '', where = '', why = ''] = c;
    if (!ref) return;
    const steps = [...where.matchAll(STEP_NAME)].map((m) => m[0]);
    const lower = where.toLowerCase();
    const kinds = ROW_KINDS.filter((k) => new RegExp(`\\b${k}\\b`).test(lower));
    // The Section cell is `file#anchor`, then any words a person adds (the section's title).
    rows.push({ line: i + 1, ref: ref.replace(/`/g, '').split(/\s+/)[0], where, why, steps, kinds });
  });
  return { path, design, rows, sections: sectionBodies(text), findings };
}

/** The skeleton `spex roadmap <name> --init` writes: one empty coverage row per section of the top two levels. */
export function roadmapTemplate(name: string, design: string[], outlines: Map<string, DesignSection[]>): string {
  const rows: string[] = [];
  for (const file of design) {
    const sections = outlines.get(file) ?? [];
    // A Markdown file's one level-1 heading is its title, not a section to place.
    const ones = sections.filter((s) => s.level === 1);
    const body = ones.length === 1 ? sections.filter((s) => s !== ones[0]) : sections;
    const top = Math.min(...body.map((s) => s.level));
    for (const s of body.filter((x) => x.level <= top + 1)) rows.push(`| ${file}#${s.cite} ${s.level > top ? '↳ ' : ''}${s.title.replace(/\|/g, '/').slice(0, 60)} | | |`);
  }
  return [
    '---',
    `roadmap: ${name}`,
    `design: [${design.map((d) => JSON.stringify(d)).join(', ')}]`,
    '---',
    `# Roadmap ${name}`,
    '',
    '## Idea',
    '',
    '<!-- What, for whom, why now: three sentences. -->',
    '',
    '## Order',
    '',
    "<!-- The design's own order of work, and every change to it with its reason. -->",
    '',
    '## Coverage',
    '',
    '<!-- Every design section: the step folders that build it, or built, not planned, outside or context, with the reason. A row covers the sections under it; split it when they differ. -->',
    '',
    '| Section | Where | Why |',
    '|:--|:--|:--|',
    ...rows,
    '',
    '## Outside',
    '',
    '<!-- What the roadmap needs that no step builds: a service, a suite, an account, an environment, work in another repository. Who does it, and the step that waits for it. -->',
    '',
    '## Decisions',
    '',
    '<!-- The round-0 decisions: scope, order, what is not planned. Who said it, and when. -->',
    '',
  ].join('\n');
}
