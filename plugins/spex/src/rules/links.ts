// What a step takes from the others, and what it gives them. A step of a roadmap lists, in spec.md:
//   ## Introduces   - `nex:rung-fix`: the label of a ticket built on a rung's branch
//   ## Uses         - `nex:rung-fix` ← 031-the-fix-on-dev-goes-down
//                   - `AutoMerge` ← built (spec 23)
// A name a step uses comes from a step it depends on, directly or through others, from what is built, or from
// outside the roadmap (a page in another repo, a service a person sets up), named in the roadmap file. So
// a missing depends_on is found by a program, not by a careful reader, and two steps that both claim to bring
// one name are a boundary to fix. The same pass reads three more things a reader misses: a stub that brings
// too much for one spec, a design bullet that does not say whether it is new, and a step named by a number
// that a re-cut of the roadmap gave to another step.

import { join } from 'node:path';
import { readText } from '../io.js';
import { roadmapSteps } from '../roadmap.js';
import { STEP_NAME } from '../roadmapfile.js';
import { featureDirs, loadFeature } from '../specs.js';
import type { Config, Feature, Finding } from '../types.js';
import { DESIGN_SECTION, resolveDependency, sectionBodies, specDocPath, specMeta, specMetaOf } from './spec.js';

export interface UseLine {
  name: string;
  /** `built`, `outside`, a folder name, or null when the line says no source. */
  from: string | null;
  raw: string;
}

const items = (body: string | undefined): string[] =>
  (body ?? '')
    .split('\n')
    .map((l) => l.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/)?.[1]?.trim())
    .filter((x): x is string => !!x);

/** The name of a list item: its first `code` span, else the words before a colon or a dash. */
const nameOf = (item: string): string => (item.match(/`([^`]+)`/)?.[1] ?? item.split(/\s+(?:←|<-|—|-)\s+|:\s/)[0]).trim();

export function introducesOf(sections: Map<string, string>): string[] {
  return items(sections.get('introduces')).map(nameOf).filter(Boolean);
}

export function usesOf(sections: Map<string, string>): UseLine[] {
  return items(sections.get('uses')).map((raw) => {
    const arrow = raw.match(/(?:←|<-)\s*(.*)$/);
    const target = arrow?.[1]?.trim() ?? '';
    const kind = target.match(/^(built|outside)\b/i)?.[1]?.toLowerCase();
    const from = !arrow ? null : kind ? kind : (target.match(/\d{3}-[a-z][a-z0-9-]*|\b\d{3}\b/)?.[0] ?? target.split(/\s/)[0] ?? null);
    return { name: nameOf(raw.replace(/\s*(?:←|<-).*$/, '')), from: from || null, raw };
  });
}

/** Every folder a step builds on, through depends_on, transitively. */
export function dependencyClosure(root: string, dir: string): Set<string> {
  const out = new Set<string>();
  const todo = [dir];
  while (todo.length) {
    const d = todo.pop()!;
    for (const dep of specMetaOf(root, d)?.depends_on ?? []) {
      const target = resolveDependency(root, dep);
      if (target && !out.has(target)) {
        out.add(target);
        todo.push(target);
      }
    }
  }
  return out;
}

const TAG = /\[(new|built|changes)\b[^\]]*\]\s*$/i;

export function checkLinks(ctx: { root: string; config: Config; feature: Feature }): Finding[] {
  const findings: Finding[] = [];
  const doc = specDocPath(ctx.root, ctx.feature);
  if (!doc || doc.missing) return findings;
  const text = readText(join(ctx.root, doc.path));
  const meta = specMeta(text);
  const sections = sectionBodies(text);
  const here = ctx.feature.dir;
  const name = here.split('/').pop()!;

  // USES: where each name comes from, and that it can come from there
  const closure = dependencyClosure(ctx.root, here);
  for (const u of usesOf(sections)) {
    if (!u.from) {
      findings.push({ severity: 'error', code: 'USES-FROM', message: `Uses \`${u.name}\` says no source`, path: doc.path, fix: 'End the line with ← <step folder>, ← built (where it was built) or ← outside (who builds it).' });
      continue;
    }
    if (u.from === 'built' || u.from === 'outside') continue; // the roadmap file's Outside section says who
    const target = resolveDependency(ctx.root, u.from);
    if (!target) {
      findings.push({ severity: 'error', code: 'USES-FROM', message: `Uses \`${u.name}\` ← ${u.from}, which is no folder under specs/`, path: doc.path, fix: 'Name the step folder that introduces it, or write ← built.' });
      continue;
    }
    if (target === here) continue;
    if (!closure.has(target)) findings.push({ severity: 'error', code: 'USES-DEPENDS', message: `Uses \`${u.name}\` from ${target.split('/').pop()}, which ${name} does not depend on`, path: doc.path, fix: `Add ${target.split('/').pop()} to depends_on (or a step that depends on it). Without it ${name} can be built first, and the name does not exist yet.` });
    const theirs = specDocPath(ctx.root, loadFeature(ctx.root, target));
    if (!theirs || theirs.missing) continue;
    const their = sectionBodies(readText(join(ctx.root, theirs.path)));
    if (their.has('introduces') && !introducesOf(their).includes(u.name)) findings.push({ severity: 'error', code: 'USES-INTRODUCES', message: `Uses \`${u.name}\` from ${target.split('/').pop()}, which does not list it under Introduces`, path: doc.path, fix: `Add it to ${theirs.path} under Introduces, or name the step that brings it.` });
  }

  // INTRODUCES: one name, one step of the roadmap; and a step that brings too much is two steps
  const mine = introducesOf(sections);
  const others = !meta.roadmap ? [] : roadmapSteps(ctx.root, meta.roadmap).filter((o) => o.dir !== here).map((other) => {
    const o = specDocPath(ctx.root, loadFeature(ctx.root, other.dir));
    return { name: other.name, brings: !o || o.missing ? [] : introducesOf(sectionBodies(readText(join(ctx.root, o.path)))) };
  });
  for (const other of others) {
    const both = other.brings.filter((n) => mine.includes(n));
    if (both.length) findings.push({ severity: 'warning', code: 'INTRODUCES-TWICE', message: `${other.name} introduces ${both.map((n) => `\`${n}\``).join(', ')} too`, path: doc.path, fix: 'One step brings a name; the other uses it (← that step) or changes it (say how under What).' });
  }

  // USES-MISSING: what the step builds or proves names a name another step brings, and no Uses line says so. The
  // writer of a stub knows the steps before it best; a reviewer found most of these by hand.
  const listed = new Set(usesOf(sections).map((u) => u.name));
  const said = ['what', DESIGN_SECTION.toLowerCase(), 'success'].map((k) => sections.get(k) ?? '').join('\n');
  const spans = new Set([...said.matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim()));
  for (const other of others) {
    const names = other.brings.filter((n) => spans.has(n) && !listed.has(n) && !mine.includes(n));
    if (names.length) findings.push({ severity: 'warning', code: 'USES-MISSING', message: `names ${names.map((n) => `\`${n}\``).join(', ')}, which ${other.name} introduces, with no Uses line`, path: doc.path, fix: `Add \`${names[0]}\` ← ${other.name} under Uses and ${other.name} to depends_on, so it comes first. Or, when this step does not need it, move it to Not this; when it means another thing by the name, give one of them another name.` });
  }
  const cap = ctx.config.limits.step_introduces;
  if (mine.length > cap) findings.push({ severity: 'warning', code: 'SPEC-SIZE', message: `introduces ${mine.length} names, over limits.step_introduces (${cap})`, path: doc.path, fix: 'Split the step where its names fall into two groups, or say under Decisions why it stays one.' });

  // TAG: a planned step says, per design bullet, whether it is new, built already, or a change to what is built
  if (meta.status === 'planned') {
    const untagged = items(sections.get(DESIGN_SECTION.toLowerCase())).filter((b) => !TAG.test(b));
    if (untagged.length) findings.push({ severity: 'warning', code: 'SPEC-TAG', message: `${untagged.length} bullet(s) under ${DESIGN_SECTION} say neither [new], [built …] nor [changes …]`, path: doc.path, fix: 'End each bullet with [new], [built: spec 24] or [changes: spec 21], from the code and the status the repo records.' });
  }

  // STEP-REF: a step is named by its folder, which a re-cut cannot give to another step
  const body = text.replace(/^---\n[\s\S]*?\n---\n?/, '').replace(/^> Planned: .*$/m, '').replace(/<!--[\s\S]*?-->/g, '');
  const bare = [...new Set([...body.matchAll(/\bsteps? (\d{3})\b/gi)].map((m) => m[1]))];
  if (bare.length) findings.push({ severity: 'warning', code: 'SPEC-STEPREF', message: `names step(s) by number only: ${bare.join(', ')}`, path: doc.path, fix: 'Write the folder name (041-the-weekly-cut-onto-staging): a re-cut of the roadmap renumbers steps, a folder name stays true or fails this check.' });
  const folders = new Set(featureDirs(ctx.root).map((d) => d.split('/').pop()!));
  const gone = new Set<string>();
  for (const m of body.matchAll(STEP_NAME)) {
    if (folders.has(m[0])) continue;
    const before = body.slice(Math.max(0, m.index! - 40), m.index!);
    if (/\b(deleted|dropped|archived|old|former)\b[^.\n]*$/i.test(before)) continue; // history, said as history
    gone.add(m[0]);
  }
  if (gone.size) findings.push({ severity: 'warning', code: 'SPEC-STEPREF', message: `names folder(s) that do not exist: ${[...gone].join(', ')}`, path: doc.path, fix: 'Name the folder as it is now. If the text is history, say so: "the deleted 001-training-record".' });
  return findings;
}
