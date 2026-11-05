// The requirement rules. Each finding carries the code from the README table and a fix text: that
// text is the only place the rule is explained, so the skills stay short.

import { join } from 'node:path';
import { parse } from 'yaml';
import { BANNED_BUILTIN, CONDITION, EARS, EARS_SHAPE, HAS_NUMBER, PLACEHOLDER_WORDS, bannedRegex, hasAnglePlaceholder, hasSecondDuty, shallCount } from '../ears.js';
import { showAtRef } from '../git.js';
import { YAML_OPTS, bytes, fileExists, readText } from '../io.js';
import type { RecordIndex } from '../specs.js';
import type { Config, Feature, Finding, Requirement, RequirementsFile } from '../types.js';

export interface RuleContext {
  root: string;
  config: Config;
  feature: Feature;
  index: RecordIndex;
  base?: string;
}

export function checkRequirements(ctx: RuleContext): Finding[] {
  const { feature, config } = ctx;
  const out: Finding[] = [];
  const file = feature.requirements;
  if (!file) return out;
  const path = feature.requirementsPath;
  const f = (severity: Finding['severity'], code: string, message: string, fix: string, id?: string): void => {
    out.push({ severity, code, message, fix, path, id });
  };

  const expectedPrefix = `REQ-${file.feature.toUpperCase()}-`;
  const seen = new Set<string>();
  const localIds = new Set(file.requirements.map((r) => r.id));
  const interfaceIds = new Set((file.interfaces ?? []).map((i) => i.id));
  const banned = bannedRegex(config.banned_words);
  const knownScopes = new Set(config.scopes);

  for (const i of file.interfaces ?? []) {
    if (i.contract && !fileExists(join(ctx.root, i.contract)) && !fileExists(join(ctx.root, feature.dir, i.contract))) {
      f('error', 'REQ-INTERFACE', `interface ${i.id}: contract file ${i.contract} does not exist`, 'Write the contract file, or point `contract` at the file that exists (repo-relative or relative to the feature folder).', i.id);
    }
  }

  for (const r of file.requirements) {
    // REQ-ID
    if (seen.has(r.id)) f('error', 'REQ-ID', `${r.id} appears twice`, 'Ids are never reused. Give the second record the next free number.', r.id);
    seen.add(r.id);
    if (!r.id.startsWith(expectedPrefix)) f('error', 'REQ-ID', `${r.id} does not belong to feature ${file.feature}`, `Ids in this file start with ${expectedPrefix}.`, r.id);

    // REQ-EARS
    const text = r.text.trim();
    if (!text.includes(' shall ')) f('error', 'REQ-EARS', `${r.id}: text has no " shall "`, `Write one EARS sentence: ${EARS_SHAPE[r.type]}`, r.id);
    else if (!EARS[r.type].test(text)) f('error', 'REQ-EARS', `${r.id}: text does not match the ${r.type} shape`, `Rewrite as: ${EARS_SHAPE[r.type]} — one sentence, ending with a period.`, r.id);

    // REQ-UBIQ-COND
    if (r.type === 'ubiquitous' && CONDITION.test(text)) f('error', 'REQ-UBIQ-COND', `${r.id}: a ubiquitous requirement has a condition word`, 'A ubiquitous requirement holds always. Make it event-driven (When …), state-driven (While …) or unwanted-behavior (If …, then …).', r.id);

    // REQ-ONE-SHALL / REQ-ONE-DUTY (warnings in v1)
    const shalls = shallCount(text);
    if (shalls > 1) f('warning', 'REQ-ONE-SHALL', `${r.id}: ${shalls} "shall" in one sentence`, 'One record carries one duty. Split it into one record per shall.', r.id);
    if (hasSecondDuty(text)) f('warning', 'REQ-ONE-DUTY', `${r.id}: the clause after "shall" has an "and", "or" or "except"`, 'If the sentence names two duties, split it. If the "and" is inside one duty (a list of fields), put the list in backticks or leave it: this is a warning.', r.id);

    // REQ-BANNED
    const m = text.match(banned);
    if (m) f('error', 'REQ-BANNED', `${r.id}: "${m[1]}" cannot be tested`, `Replace "${m[1]}" with a number and a unit, or with the exact behavior. Built-in banned words: ${BANNED_BUILTIN.join(', ')}.`, r.id);

    // REQ-MEASURE
    if (HAS_NUMBER.test(text) && !r.acceptance.some((a) => a.measure)) f('error', 'REQ-MEASURE', `${r.id}: the text has a number with a unit but no scenario has a measure`, 'Add `measure: {metric, operator, value, unit}` to the scenario that checks the number.', r.id);

    // REQ-SCENARIO
    for (const a of r.acceptance) {
      if (!a.given.trim() || !a.when.trim() || !a.then.trim()) f('error', 'REQ-SCENARIO', `${r.id}/${a.id}: given, when and then must all be filled`, 'Write real values: a list name, a count, an exit code.', r.id);
      else if (a.then.trim().length < 12) f('error', 'REQ-SCENARIO', `${r.id}/${a.id}: "then" is too short to assert anything`, 'State what is observed and its exact value, in at least 12 characters.', r.id);
      for (const field of ['given', 'when', 'then'] as const) {
        if (PLACEHOLDER_WORDS.test(a[field])) f('error', 'REQ-PLACEHOLDER', `${r.id}/${a.id}: "${field}" holds a placeholder`, 'Replace TODO, TBD, TKTK, ??? and NEEDS CLARIFICATION with the real value, or add a question.', r.id);
      }
    }

    // REQ-PLACEHOLDER on text
    if (PLACEHOLDER_WORDS.test(text) || hasAnglePlaceholder(text)) f('error', 'REQ-PLACEHOLDER', `${r.id}: text holds a placeholder`, 'Replace the placeholder with the real value. A literal like `<token>` goes in backticks.', r.id);

    // REQ-IMPL-RATIONALE
    if ((r.verification.mode === 'implementation-aware' || r.verification.method === 'inspection') && !(r.verification.rationale ?? '').trim()) f('error', 'REQ-IMPL-RATIONALE', `${r.id}: ${r.verification.mode === 'implementation-aware' ? 'implementation-aware' : 'inspection'} needs a rationale`, 'Say why the interface cannot show this and what the test reads instead.', r.id);

    // REQ-INTERFACE
    for (const iface of r.applies_to) {
      if (!interfaceIds.has(iface)) f('error', 'REQ-INTERFACE', `${r.id}: applies_to "${iface}" is not a declared interface`, 'Add the interface to `interfaces[]` (id, kind, optional contract), or fix the id.', r.id);
    }

    // REQ-SCOPE
    if (knownScopes.size && !knownScopes.has(r.scope)) f('warning', 'REQ-SCOPE', `${r.id}: scope "${r.scope}" is not in specs/spex.yaml scopes[]`, `Use one of: ${[...knownScopes].join(', ')}, or add "${r.scope}" to scopes[] on purpose.`, r.id);

    // REQ-REL-TARGET
    for (const rel of r.relationships ?? []) {
      if (rel.target === r.id) f('error', 'REQ-REL-TARGET', `${r.id}: relationship points at itself`, 'Point it at another record.', r.id);
      else if (!localIds.has(rel.target) && !ctx.index.has(rel.target)) f('error', 'REQ-REL-TARGET', `${r.id}: ${rel.type} target ${rel.target} does not exist in any feature on disk or on a branch`, 'Fix the id, or write the record it should point at.', r.id);
      // REQ-SUPERSEDE-DUP
      if (rel.type === 'supersedes') {
        const others = ctx.index.supersededBy(rel.target).filter((feat) => feat !== file.feature);
        if (others.length) f('error', 'REQ-SUPERSEDE-DUP', `${r.id} and feature ${others.join(', ')} both supersede ${rel.target}`, 'Two open features cannot replace the same behavior. A person decides which one wins; the other depends on it.', r.id);
      }
    }
  }

  // REQ-QUESTION-OPEN (info)
  for (const q of file.questions ?? []) {
    if (!q.answer) f('info', 'REQ-QUESTION-OPEN', `${q.id} has no answer: ${q.ask}`, 'Run /spex:clarify. With nobody to ask, the recommended option is taken as `by: default`.', q.id);
  }

  // REQ-FROZEN
  if (ctx.base) out.push(...frozenCheck(ctx, file));

  // FILE-SIZE
  const size = bytes(readText(join(ctx.root, path)));
  if (size > config.limits.file_kb * 1024) f('warning', 'FILE-SIZE', `${path} is ${Math.round(size / 1024)} KB, above limits.file_kb ${config.limits.file_kb}`, 'A spec that big is two features. Split it by scope.');

  return out;
}

function frozenCheck(ctx: RuleContext, file: RequirementsFile): Finding[] {
  const out: Finding[] = [];
  const text = showAtRef(ctx.root, ctx.base!, ctx.feature.requirementsPath);
  if (!text) return out; // the feature does not exist at the base: nothing is frozen yet
  let baseFile: RequirementsFile;
  try {
    baseFile = parse(text, YAML_OPTS) as RequirementsFile;
  } catch {
    return out;
  }
  const baseById = new Map<string, Requirement>((baseFile.requirements ?? []).map((r) => [r.id, r]));
  for (const r of file.requirements) {
    const b = baseById.get(r.id);
    if (!b || (b.status !== 'approved' && b.status !== 'built')) continue;
    const same = b.text === r.text && JSON.stringify(b.acceptance) === JSON.stringify(r.acceptance);
    if (!same) out.push({ severity: 'error', code: 'REQ-FROZEN', message: `${r.id} is ${b.status} at ${ctx.base} and its text or scenarios changed`, fix: 'A record on main is frozen. Add a new record with `relationships: [{type: supersedes, target: ' + r.id + '}]` and restore the old text.', path: ctx.feature.requirementsPath, id: r.id });
  }
  return out;
}
