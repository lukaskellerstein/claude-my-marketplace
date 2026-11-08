// `spex roadmap [name]`: the steps of one idea, computed from the folders, with where each one stands.
// Without a name: every roadmap on disk. With --init: the roadmap file's skeleton, one coverage row per
// design section. With --coverage: every design section has a row, every row names a real section and
// real steps, every step covers a section and cites it in its source. Dex reads --json.

import { join } from 'node:path';
import { loadConfig } from '../config.js';
import { DESIGN_FORMAT, convertHint, designNames, designOutline, resolveAnchor, splitRef, type DesignSection } from '../design.js';
import { fileExists, readText, writeText } from '../io.js';
import { nextPlanned, roadmapNames, roadmapSteps } from '../roadmap.js';
import { readRoadmapFile, roadmapFilePath, roadmapTemplate, type CoverageRow } from '../roadmapfile.js';
import { loadFeature } from '../specs.js';
import type { Finding } from '../types.js';
import { whatNext, type CmdResult } from './lifecycle.js';

const usage = (message: string, fix: string): CmdResult => ({ ok: false, findings: [{ severity: 'error', code: 'USAGE', message, fix }], exit: 2, text: '' });

export function roadmap(root: string, name?: string, opts: { coverage?: boolean; init?: boolean; source?: string[]; force?: boolean } = {}): CmdResult {
  if (!name) {
    const rows = roadmapNames(root);
    const text = rows.length ? rows.map((r) => `${r.name}  ${r.steps} step(s): ${r.built} built · ${r.steps - r.built - r.planned} in progress · ${r.planned} planned`).join('\n') : '(no roadmap: no spec.md under specs/ names one)';
    return { ok: true, findings: [], exit: 0, text, data: { roadmaps: rows } };
  }
  if (opts.init) return initRoadmap(root, name, opts.source ?? [], opts.force === true);
  if (opts.coverage) return roadmapCoverage(root, name);
  const steps = roadmapSteps(root, name);
  if (!steps.length) return usage(`no folder under specs/ names roadmap ${name}`, 'Run `spex roadmap` for the names on disk.');
  const { config } = loadConfig(root);
  const rows = steps.map((s) => {
    const stage = whatNext(root, config, loadFeature(root, s.dir)).stage;
    return { step: s.meta.step, dir: s.dir, status: s.meta.status, stage, built: s.built, depends_on: s.meta.depends_on, waits: s.waits.map((w) => w.dir), source: s.meta.source };
  });
  const next = nextPlanned(steps);
  const lines = rows.map((r) => {
    const stepNo = r.step === null ? '?' : String(r.step);
    const where = r.built ? 'built' : r.stage;
    const extra = r.waits.length ? `  waits: ${r.waits.map((w) => w.split('/').pop()).join(', ')}` : r.depends_on.length ? `  after: ${r.depends_on.join(', ')}` : '';
    return `${stepNo.padStart(2)}. ${r.dir}  ${where}${extra}`;
  });
  const built = rows.filter((r) => r.built).length;
  const planned = rows.filter((r) => r.status === 'planned').length;
  lines.unshift(`# roadmap ${name} — ${rows.length} step(s): ${built} built · ${rows.length - built - planned} in progress · ${planned} planned`);
  lines.push('', next ? `next planned step: ${next.dir} (its dependencies are built) → /spex:new ${next.dir}` : planned ? 'every planned step waits for one that is not built' : 'every step is shaped or built');
  const file = roadmapFilePath(name);
  const findings: Finding[] = fileExists(join(root, file)) ? [] : [{ severity: 'warning', code: 'ROADMAP-FILE', message: `${file} does not exist: nothing says which design sections the steps leave out`, path: file, fix: `spex roadmap ${name} --init --source <design file>, fill its Coverage table, then spex roadmap ${name} --coverage.` }];
  return { ok: true, findings, exit: 0, text: lines.join('\n'), data: { roadmap: name, file: fileExists(join(root, file)) ? file : null, steps: rows, next: next?.dir ?? null } };
}

function initRoadmap(root: string, name: string, design: string[], force: boolean): CmdResult {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) return usage(`roadmap "${name}" must be lower-case words joined by dashes`, 'Example: spex roadmap reports --init --source docs/design.md');
  if (!design.length) return usage('--init needs the design: --source <file>, once per file', 'Example: spex roadmap reports --init --source docs/design.md');
  const path = roadmapFilePath(name);
  if (fileExists(join(root, path)) && !force) return { ok: false, findings: [{ severity: 'error', code: 'ROADMAP-FILE', message: `${path} exists`, path, fix: 'Edit it. --force writes a new skeleton and loses the rows.' }], exit: 6, text: '' };
  const outlines = new Map<string, DesignSection[]>();
  for (const file of design) {
    if (!DESIGN_FORMAT.test(file)) return usage(`--source ${file}: spex reads Markdown and HTML designs, not this format`, convertHint(file));
    const o = designOutline(root, file);
    if (!o) return usage(`--source ${file}: no such file`, 'Name the design file as a path from the repo root.');
    outlines.set(file, o);
  }
  writeText(join(root, path), roadmapTemplate(name, design, outlines));
  const counts = design.map((f) => `${f}: ${outlines.get(f)!.length} section(s)`);
  return { ok: true, findings: [], exit: 0, text: `${path} written: one empty coverage row per section of the top two levels\n${counts.join('\n')}\nFill Where and Why in every row; a row covers the sections under it. Then spex roadmap ${name} --coverage.`, data: { file: path, design, sections: Object.fromEntries([...outlines].map(([f, o]) => [f, o.length])) } };
}

/** The sections no row covers: a row covers its section and everything under it; a section is covered when all its children are. */
function uncoveredOf(sections: DesignSection[], direct: Set<string>, whole: boolean): DesignSection[] {
  if (whole) return [];
  const children = new Map<string, DesignSection[]>();
  for (const s of sections) if (s.parent) children.set(s.parent, [...(children.get(s.parent) ?? []), s]);
  const byAnchor = new Map(sections.map((s) => [s.anchor, s]));
  const ancestorCovered = (s: DesignSection): boolean => {
    for (let p = s.parent; p; p = byAnchor.get(p)?.parent ?? null) if (direct.has(p)) return true;
    return false;
  };
  const memo = new Map<string, boolean>();
  const covered = (s: DesignSection): boolean => {
    const hit = memo.get(s.anchor);
    if (hit !== undefined) return hit;
    const kids = children.get(s.anchor) ?? [];
    const v = direct.has(s.anchor) || ancestorCovered(s) || (kids.length > 0 && kids.every(covered));
    memo.set(s.anchor, v);
    return v;
  };
  // Name the deepest gaps: an uncovered section whose children are all covered, or that has none.
  return sections.filter((s) => !covered(s) && (children.get(s.anchor) ?? []).every(covered));
}

export function roadmapCoverage(root: string, name: string): CmdResult {
  const file = readRoadmapFile(root, name);
  const path = roadmapFilePath(name);
  if (!file) return { ok: false, findings: [{ severity: 'error', code: 'ROADMAP-FILE', message: `${path} does not exist`, path, fix: `spex roadmap ${name} --init --source <design file> writes its skeleton.` }], exit: 4, text: '' };
  const findings: Finding[] = [...file.findings];
  const steps = roadmapSteps(root, name);
  const stepNames = new Set(steps.map((s) => s.name));
  const design = file.design.length ? file.design : [...new Set(steps.flatMap((s) => s.meta.source.map((x) => x.split('#')[0]).filter(Boolean)))];
  if (!file.design.length) findings.push({ severity: 'warning', code: 'ROADMAP-FILE', message: `${path} names no design: in its front matter; the steps' sources stand in (${design.join(', ') || 'none'})`, path, fix: 'Add design: ["<file>", …] to the front matter: every file the roadmap must cover.' });
  const outlines = new Map<string, DesignSection[]>();
  for (const f of design) {
    if (!DESIGN_FORMAT.test(f)) {
      findings.push({ severity: 'error', code: 'ROADMAP-DESIGN', message: `${f}: spex reads Markdown and HTML designs, not this format`, path, fix: `${convertHint(f)} Then name the copy in design:.` });
      continue;
    }
    const o = designOutline(root, f);
    if (o) outlines.set(f, o);
    else findings.push({ severity: 'error', code: 'ROADMAP-DESIGN', message: `the design file ${f} does not exist`, path, fix: 'Point design: at the file as it is now.' });
  }
  const direct = new Map<string, Set<string>>(design.map((f) => [f, new Set<string>()]));
  const whole = new Set<string>();
  const covers = new Map<string, { file: string; section: DesignSection | null }[]>();
  const rowsAt = new Map<string, CoverageRow[]>(); // `file#anchor`, or `file#` for a row of the whole file
  const rowAt = (key: string, row: CoverageRow): void => void rowsAt.set(key, [...(rowsAt.get(key) ?? []), row]);
  for (const row of file.rows) {
    const at = `line ${row.line}`;
    const { file: f, anchor } = splitRef(row.ref, design);
    if (!f || !outlines.has(f)) {
      findings.push({ severity: 'error', code: 'ROADMAP-ROW', message: `${at}: ${row.ref} names no design file of this roadmap`, path, fix: `Write file#section with a file from design: (${design.join(', ')}).` });
      continue;
    }
    let section: DesignSection | null = null;
    if (anchor === null) {
      whole.add(f);
      rowAt(`${f}#`, row);
    } else {
      section = resolveAnchor(outlines.get(f)!, anchor);
      if (!section) {
        findings.push({ severity: 'error', code: 'ROADMAP-ROW', message: `${at}: ${row.ref} is no section of ${f}`, path, fix: `spex outline ${f} lists its sections and their anchors.` });
        continue;
      }
      direct.get(f)!.add(section.anchor);
      rowAt(`${f}#${section.anchor}`, row);
    }
    if (!row.where.trim()) {
      findings.push({ severity: 'error', code: 'ROADMAP-ROW', message: `${at}: ${row.ref} has an empty Where`, path, fix: 'Name the step folders that build it, or write built, not planned, outside or context, with the reason under Why.' });
      continue;
    }
    if (!row.steps.length && !row.kinds.length) findings.push({ severity: 'error', code: 'ROADMAP-ROW', message: `${at}: Where says "${row.where}"`, path, fix: 'Where holds step folders (029-deploy-one-push), or built, not planned, outside or context.' });
    if (row.kinds.length && !row.why.trim() && !row.where.replace(/built|not planned|outside|context|[\s;,·:—-]/gi, '').length) findings.push({ severity: 'error', code: 'ROADMAP-WHY', message: `${at}: ${row.ref} is ${row.kinds.join(' and ')} with no reason`, path, fix: 'Say why under Why: built by which spec, the reason it is not planned, who does it outside, or why it is context only.' });
    for (const s of row.steps) {
      if (!stepNames.has(s)) findings.push({ severity: 'error', code: 'ROADMAP-STEP', message: `${at}: ${s} is no step of roadmap ${name}`, path, fix: `spex roadmap ${name} lists its steps.` });
      else covers.set(s, [...(covers.get(s) ?? []), { file: f, section }]);
    }
  }
  const uncovered: { file: string; anchor: string; title: string }[] = [];
  for (const [f, o] of outlines) for (const s of uncoveredOf(o, direct.get(f)!, whole.has(f))) uncovered.push({ file: f, anchor: s.cite, title: s.title });
  if (uncovered.length) findings.push({ severity: 'error', code: 'ROADMAP-UNCOVERED', message: `${uncovered.length} design section(s) have no row: ${uncovered.slice(0, 30).map((u) => `${u.file}#${u.anchor}`).join(', ')}${uncovered.length > 30 ? ', …' : ''}`, path, fix: 'Give each a row: the steps that build it, or built, not planned, outside or context, with the reason. A gap nobody chose is a gap.' });
  for (const step of steps) {
    const rows = covers.get(step.name);
    if (!rows) {
      findings.push({ severity: 'warning', code: 'ROADMAP-IDLE', message: `${step.name} covers no design section in ${path}`, path: step.dir, fix: 'Add its sections to the table, or drop the step (spex drop) when the design does not ask for it.' });
      continue;
    }
    // The shaping of a step reads only its source: every section the table gives it must be there, or above it.
    const cited = step.meta.source.map((src) => splitRef(src, design)).map(({ file: f, anchor }) => ({ f, s: f && anchor && outlines.has(f) ? resolveAnchor(outlines.get(f)!, anchor) : null, whole: !!f && !anchor }));
    for (const { f, s, whole: w } of cited) if (f && outlines.has(f) && !s && !w) findings.push({ severity: 'warning', code: 'ROADMAP-SOURCE', message: `${step.name}: source ${f} names no section that ${f} has`, path: step.dir, fix: `spex outline ${f} lists the anchors.` });
    for (const r of rows) {
      if (!r.section) continue;
      const lineage: string[] = [];
      for (let a: string | null = r.section.anchor; a; a = outlines.get(r.file)!.find((x) => x.anchor === a)?.parent ?? null) lineage.push(a);
      const ok = cited.some((c) => c.f === r.file && (c.whole || (c.s && lineage.includes(c.s.anchor))));
      if (!ok) findings.push({ severity: 'warning', code: 'ROADMAP-SOURCE', message: `${step.name} covers ${r.file}#${r.section.cite} in the table, but its source does not name it`, path: step.dir, fix: 'Add it to source in the front matter: the shaping of a step reads only its source.' });
    }
  }
  // Every name a section fixes (a key, a command, a label, a record path) is in a stub of the roadmap, or the file
  // says why not. A row says where a section goes; this says that what the section fixes went there too.
  const corpus = [...steps.map((s) => join(root, s.dir, 'spec.md')).filter(fileExists).map(readText), readText(join(root, path))].join('\n').toLowerCase();
  const leftOut = new Set<string>();
  for (const m of (file.sections.get('names left out') ?? '').matchAll(/([\w./-]*)#([\w.-]+)/g)) {
    const { file: f, anchor } = splitRef(`${m[1]}#${m[2]}`, design);
    const s = f && anchor && outlines.has(f) ? resolveAnchor(outlines.get(f)!, anchor) : null;
    if (s) leftOut.add(`${f}#${s.anchor}`);
  }
  let unplaced = 0;
  for (const [f, o] of outlines) {
    const names = designNames(root, f);
    if (!names) continue;
    let stepSections = 0;
    let stepNames = 0;
    const byAnchor = new Map(o.map((s) => [s.anchor, s]));
    for (const s of o) {
      // the rows that govern it: its own, or those of the nearest section above it that has one
      let gov: CoverageRow[] | undefined;
      let out = false;
      for (let a: string | null = s.anchor; a && !gov && !out; a = byAnchor.get(a)?.parent ?? null) {
        out = leftOut.has(`${f}#${a}`);
        gov = rowsAt.get(`${f}#${a}`);
      }
      gov ??= rowsAt.get(`${f}#`);
      const by = [...new Set((gov ?? []).flatMap((r) => r.steps))];
      if (out || !by.length) continue;
      stepSections++;
      stepNames += (names.get(s.anchor) ?? []).length;
      const missing = (names.get(s.anchor) ?? []).filter((n) => !corpus.includes(n.toLowerCase()));
      if (!missing.length) continue;
      unplaced += missing.length;
      findings.push({ severity: 'warning', code: 'ROADMAP-NAMES', message: `${f}#${s.cite} (${by.join(', ')}): ${missing.length} name(s) it fixes are in no stub: ${missing.slice(0, 15).map((n) => `\`${n}\``).join(' · ')}${missing.length > 15 ? ' …' : ''}`, path, fix: 'Write each into From the design of the step that uses it, tagged; or list it under ## Names left out in the roadmap file, with why (built, an example). A file#section there leaves out all its names.' });
    }
    // A design in prose marks few names: then a clean names check proves little, and the review carries the weight.
    if (stepSections >= 3 && stepNames < 2 * stepSections) findings.push({ severity: 'warning', code: 'ROADMAP-PROSE', message: `${f}: ${stepNames} name(s) in code across the ${stepSections} section(s) the steps cover: the names check sees little of this design`, path, fix: 'The round-0 review reads each stub against its sections in full. Once it ran and its findings are in, say so under Decisions.' });
  }
  const total = [...outlines.values()].reduce((n, o) => n + o.length, 0);
  const errors = findings.filter((f) => f.severity === 'error').length;
  const text = `# coverage of roadmap ${name} — ${total} design section(s) in ${outlines.size} file(s), ${file.rows.length} row(s), ${uncovered.length} without a row${unplaced ? `, ${unplaced} design name(s) in no stub` : ''}${errors ? `, ${errors} error(s)` : ''}`;
  return { ok: errors === 0, findings, exit: errors ? 4 : 0, text, data: { roadmap: name, file: path, design, sections: total, rows: file.rows.length, uncovered, unplaced } };
}
