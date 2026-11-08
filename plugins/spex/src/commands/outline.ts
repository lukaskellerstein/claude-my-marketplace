// `spex outline <file>…`: a design's sections with the anchor a `source` or a coverage row names. The roadmap
// round reads this list first, so the steps start from the author's units, the same ones in every session.

import { designOutline, type DesignSection } from '../design.js';
import type { CmdResult } from './lifecycle.js';

export function outline(root: string, files: string[]): CmdResult {
  if (!files.length) return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: 'outline needs a design file', fix: 'Example: spex outline docs/design.md' }], exit: 2, text: '' };
  const lines: string[] = [];
  const data: { file: string; sections: DesignSection[] }[] = [];
  for (const file of files) {
    const sections = designOutline(root, file);
    if (!sections) return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: `${file}: no such file`, fix: 'Name the design file as a path from the repo root.' }], exit: 2, text: '' };
    data.push({ file, sections });
    const top = Math.min(...sections.map((s) => s.level));
    lines.push(`# ${file} — ${sections.length} section(s)`);
    for (const s of sections) lines.push(`${'  '.repeat(s.level - top)}#${s.cite}  ${s.title}`);
    lines.push('');
  }
  return { ok: true, findings: [], exit: 0, text: lines.join('\n').trimEnd(), data: { files: data } };
}
