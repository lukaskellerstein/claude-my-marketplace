// `spex outline <file>…`: a design's sections with the anchor a `source` or a coverage row names. The roadmap
// round reads this list first, so the steps start from the author's units, the same ones in every session.

import { DESIGN_FORMAT, convertHint, designOutline, type DesignSection } from '../design.js';
import { readText } from '../io.js';
import { join } from 'node:path';
import type { Finding } from '../types.js';
import type { CmdResult } from './lifecycle.js';

export function outline(root: string, files: string[]): CmdResult {
  if (!files.length) return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: 'outline needs a design file', fix: 'Example: spex outline docs/design.md' }], exit: 2, text: '' };
  const lines: string[] = [];
  const data: { file: string; sections: DesignSection[] }[] = [];
  const findings: Finding[] = [];
  for (const file of files) {
    if (!DESIGN_FORMAT.test(file)) return { ok: false, findings: [{ severity: 'error', code: 'DESIGN-FORMAT', message: `${file}: spex reads Markdown and HTML designs, not this format`, fix: convertHint(file) }], exit: 2, text: '' };
    const sections = designOutline(root, file);
    if (!sections) return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: `${file}: no such file`, fix: 'Name the design file as a path from the repo root.' }], exit: 2, text: '' };
    // A converted PDF is often one long text: no headings, so no sections a step or a row can name.
    const kb = Buffer.byteLength(readText(join(root, file)), 'utf8') / 1024;
    if (kb > 8 && sections.length < kb / 8) findings.push({ severity: 'warning', code: 'DESIGN-HEADINGS', message: `${file}: ${sections.length} section(s) in ${Math.round(kb)} KB`, path: file, fix: 'Make each part of the design a heading (# in Markdown, <h2 id> in HTML): a step and a coverage row name sections, and text under no heading has no name.' });
    data.push({ file, sections });
    const top = Math.min(...sections.map((s) => s.level));
    lines.push(`# ${file} — ${sections.length} section(s)`);
    for (const s of sections) lines.push(`${'  '.repeat(s.level - top)}#${s.cite}  ${s.title}`);
    lines.push('');
  }
  return { ok: true, findings, exit: 0, text: lines.join('\n').trimEnd(), data: { files: data } };
}
