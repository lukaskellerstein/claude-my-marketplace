// A roadmap is computed, never stored: the steps of one idea are the folders under specs/ whose spec.md
// front matter says `roadmap: <name>`, in `step` order. Each step is a note (no status.yaml) until its
// turn comes, so there is no second file to keep in sync with the folders.

import { isBuilt, specMetaOf, waitsFor, type SpecMeta } from './rules/spec.js';
import { featureDirs } from './specs.js';
import { isClosed, liveState } from './state.js';
import { mainRoot } from './worktree.js';
import type { SpecState } from './types.js';

export interface RoadmapStep {
  dir: string;
  name: string;
  meta: SpecMeta;
  /** From status.yaml: null is a note. */
  state: SpecState | null;
  built: boolean;
  /** The dependencies that are not built yet. Empty means the step can be shaped. */
  waits: { dir: string; state: string }[];
}

/** Every folder that names the roadmap, sorted by step, then by folder name. */
export function roadmapSteps(root: string, name: string): RoadmapStep[] {
  const out: RoadmapStep[] = [];
  const main = mainRoot(root);
  for (const dir of featureDirs(root)) {
    const meta = specMetaOf(root, dir);
    if (!meta || meta.roadmap !== name) continue;
    // An open step has its status.yaml in its worktree: read it there, as the list does.
    const state = liveState(root, dir, main);
    out.push({ dir, name: dir.split('/').pop() ?? dir, meta, state, built: isClosed(state) || isBuilt(root, dir), waits: waitsFor(root, meta) });
  }
  return out.sort((a, b) => (a.meta.step ?? 1e9) - (b.meta.step ?? 1e9) || a.dir.localeCompare(b.dir));
}

/** The roadmap names on disk, with how many steps each has. */
export function roadmapNames(root: string): { name: string; steps: number; built: number; planned: number }[] {
  const by = new Map<string, { name: string; steps: number; built: number; planned: number }>();
  const main = mainRoot(root);
  for (const dir of featureDirs(root)) {
    const meta = specMetaOf(root, dir);
    if (!meta?.roadmap) continue;
    const row = by.get(meta.roadmap) ?? { name: meta.roadmap, steps: 0, built: 0, planned: 0 };
    row.steps++;
    if (isBuilt(root, dir)) row.built++;
    if (liveState(root, dir, main) === null && !isBuilt(root, dir)) row.planned++;
    by.set(meta.roadmap, row);
  }
  return [...by.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** The first note whose dependencies are all built, or null. */
export function nextPlanned(steps: RoadmapStep[]): RoadmapStep | null {
  return steps.find((s) => s.state === null && !s.built && !s.waits.length) ?? null;
}
