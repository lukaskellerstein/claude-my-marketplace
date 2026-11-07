// `spex roadmap [name]`: the steps of one idea, computed from the folders, with where each one stands.
// Without a name: every roadmap on disk. /spex:archive reads this for the re-plan round; Dex reads --json.

import { loadConfig } from '../config.js';
import { nextPlanned, roadmapNames, roadmapSteps } from '../roadmap.js';
import { loadFeature } from '../specs.js';
import { whatNext, type CmdResult } from './lifecycle.js';

export function roadmap(root: string, name?: string): CmdResult {
  if (!name) {
    const rows = roadmapNames(root);
    const text = rows.length ? rows.map((r) => `${r.name}  ${r.steps} step(s): ${r.built} built · ${r.steps - r.built - r.planned} in progress · ${r.planned} planned`).join('\n') : '(no roadmap: no spec.md under specs/ names one)';
    return { ok: true, findings: [], exit: 0, text, data: { roadmaps: rows } };
  }
  const steps = roadmapSteps(root, name);
  if (!steps.length) return { ok: false, findings: [{ severity: 'error', code: 'USAGE', message: `no folder under specs/ names roadmap ${name}`, fix: 'Run `spex roadmap` for the names on disk.' }], exit: 2, text: '' };
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
  return { ok: true, findings: [], exit: 0, text: lines.join('\n'), data: { roadmap: name, steps: rows, next: next?.dir ?? null } };
}
