// A roadmap is computed, never stored: the steps of one idea are the folders under specs/ whose spec.md
// front matter says `roadmap: <name>`, in `step` order. Each step is a stub (`status: planned`) until its
// turn comes, so there is no second file to keep in sync with the folders.

import { isBuilt, specMetaOf, waitsFor, type SpecMeta } from './rules/spec.js';
import { featureDirs } from './specs.js';

export interface RoadmapStep {
  dir: string;
  name: string;
  meta: SpecMeta;
  built: boolean;
  /** The dependencies that are not built yet. Empty means the step can be shaped. */
  waits: { dir: string; state: string }[];
}

/** Every folder that names the roadmap, sorted by step, then by folder name. */
export function roadmapSteps(root: string, name: string): RoadmapStep[] {
  const out: RoadmapStep[] = [];
  for (const dir of featureDirs(root)) {
    const meta = specMetaOf(root, dir);
    if (!meta || meta.roadmap !== name) continue;
    out.push({ dir, name: dir.split('/').pop() ?? dir, meta, built: isBuilt(root, dir), waits: waitsFor(root, meta) });
  }
  return out.sort((a, b) => (a.meta.step ?? 1e9) - (b.meta.step ?? 1e9) || a.dir.localeCompare(b.dir));
}

/** The roadmap names on disk, with how many steps each has. */
export function roadmapNames(root: string): { name: string; steps: number; built: number; planned: number }[] {
  const by = new Map<string, { name: string; steps: number; built: number; planned: number }>();
  for (const dir of featureDirs(root)) {
    const meta = specMetaOf(root, dir);
    if (!meta?.roadmap) continue;
    const row = by.get(meta.roadmap) ?? { name: meta.roadmap, steps: 0, built: 0, planned: 0 };
    row.steps++;
    if (isBuilt(root, dir)) row.built++;
    if (meta.status === 'planned') row.planned++;
    by.set(meta.roadmap, row);
  }
  return [...by.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** The first planned step whose dependencies are all built, or null. */
export function nextPlanned(steps: RoadmapStep[]): RoadmapStep | null {
  return steps.find((s) => s.meta.status === 'planned' && !s.waits.length) ?? null;
}
