// `spex new`: the next feature folder. The number also counts branch names, so two branches do not
// both become 008.

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { branchNames, isGitRepo } from '../git.js';
import { ensureDir, fileExists, isDir, readText, writeText } from '../io.js';
import { SPECS_DIR } from '../specs.js';
import type { CmdResult } from './lifecycle.js';

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

export function newFeature(root: string, slug: string, opts: { brief?: string }): CmdResult {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: `slug "${slug}" must be lower-case words joined by dashes`, fix: 'Example: csv-export' }], exit: 2, text: '' };
  const n = String(nextNumber(root)).padStart(3, '0');
  const dir = `${SPECS_DIR}/${n}-${slug}`;
  ensureDir(join(root, dir));
  let brief: string | null = null;
  if (opts.brief) {
    if (!fileExists(opts.brief)) return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: `brief ${opts.brief} does not exist`, fix: 'Pass the path of the brief file.' }], exit: 2, text: '' };
    brief = `${dir}/brief.md`;
    writeText(join(root, brief), readText(opts.brief));
  }
  return { ok: true, findings: [], exit: 0, text: `${dir}${brief ? ` (brief copied to ${brief})` : ''}`, data: { dir, feature: n, slug, brief } };
}
