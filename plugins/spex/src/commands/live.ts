// `spex index`: the live requirements across every feature folder. `specify` reads this, a few
// records, instead of other folders.

import { buildIndex } from '../specs.js';
import type { CmdResult } from './lifecycle.js';

export function liveIndex(root: string, opts: { scope?: string; branches?: boolean; all?: boolean }): CmdResult {
  const index = buildIndex(root, { branches: opts.branches ?? false });
  const records = opts.all ? index.records.filter((r) => !opts.scope || r.scope === opts.scope) : index.live(opts.scope);
  const text = records.length
    ? records.map((r) => `${r.id}  [${r.feature} · ${r.scope} · ${r.status} · ${r.priority}${r.where === 'disk' ? '' : ` · ${r.where}`}]  ${r.text}`).join('\n')
    : `(no ${opts.all ? '' : 'live '}requirements${opts.scope ? ` in scope ${opts.scope}` : ''})`;
  return { ok: true, findings: index.findings, exit: 0, text, data: { records } };
}
