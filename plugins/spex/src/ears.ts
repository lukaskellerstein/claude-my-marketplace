// EARS sentence checks. The regexes are nex's (platform/nex/runner/spec_check.py); the one-shall
// and one-duty checks are new and warn in v1 until the false-positive rate is measured.

import type { EarsType } from './types.js';

export const EARS: Record<EarsType, RegExp> = {
  ubiquitous: /^The .+ shall .+\.$/,
  'event-driven': /^When .+, the .+ shall .+\.$/,
  'state-driven': /^While .+, the .+ shall .+\.$/,
  'optional-feature': /^Where .+, the .+ shall .+\.$/,
  'unwanted-behavior': /^If .+, then the .+ shall .+\.$/,
  complex: /^(While|When|Where|If) .+, (while|when|where|if) .+, the .+ shall .+\.$/i,
};

export const EARS_SHAPE: Record<EarsType, string> = {
  ubiquitous: 'The <system> shall <response>.',
  'event-driven': 'When <trigger>, the <system> shall <response>.',
  'state-driven': 'While <state>, the <system> shall <response>.',
  'optional-feature': 'Where <feature is present>, the <system> shall <response>.',
  'unwanted-behavior': 'If <unwanted condition>, then the <system> shall <response>.',
  complex: '<While|When|Where|If> <a>, <while|when|where|if> <b>, the <system> shall <response>.',
};

export const CONDITION = /\b(if|when|whenever|while|unless)\b/i;
export const BANNED_BUILTIN = ['user-friendly', 'user friendly', 'fast', 'quick', 'robust', 'appropriate', 'adequate', 'easy', 'intuitive', 'gracefully', 'as needed', 'etc'];
export const HAS_NUMBER = /\b\d+(\.\d+)?\s*(ms|s|sec|seconds?|min|minutes?|%|percent|MB|KB|GB|req\/s|rps)\b/i;
export const PLACEHOLDER_WORDS = /\b(TODO|TBD|TKTK|NEEDS CLARIFICATION)\b|\?\?\?/;

export function bannedRegex(extra: string[]): RegExp {
  const words = [...BANNED_BUILTIN, ...extra].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(${words.join('|')})\\b`, 'i');
}

/** Text with every quoted or backticked span blanked, so a word inside a literal does not count. */
export function stripLiterals(text: string): string {
  return text.replace(/`[^`]*`|"[^"]*"|'[^']*'/g, (m) => ' '.repeat(m.length));
}

export function shallCount(text: string): number {
  return (stripLiterals(text).match(/\bshall\b/gi) ?? []).length;
}

/** The clause after the first ` shall `, literals blanked. */
export function duty(text: string): string {
  const stripped = stripLiterals(text);
  const i = stripped.search(/\bshall\b/i);
  return i < 0 ? '' : stripped.slice(i + 5);
}

export function hasSecondDuty(text: string): boolean {
  return /\b(and|or|except)\b/i.test(duty(text));
}

/** `<…>` outside backticks is a placeholder; inside backticks it is a literal like `<token>`. */
export function hasAnglePlaceholder(text: string): boolean {
  const noTicks = text.replace(/`[^`]*`/g, '');
  return /<[^<>]{1,40}>/.test(noTicks);
}

/** REQ-007-001 → REQ_007_001; REQ-007-001/AC-1 → REQ_007_001_AC_1 */
export function testId(reqId: string, scenarioId?: string): string {
  const base = reqId.replace(/-/g, '_');
  return scenarioId ? `${base}_${scenarioId.replace(/-/g, '_')}` : base;
}

/** T09 of feature 007 → TASK_007_09: the token a task test's name starts with. The feature is in it, so a search finds only this feature's tests. */
export function taskTestId(feature: string, taskId: string): string {
  return `TASK_${feature.replace(/-/g, '_')}_${taskId.replace(/^T/, '')}`;
}

/** The name token of one `covers` id: a scenario (REQ-007-001/AC-1), a record (REQ-007-001) or a task (T09). */
export function coverToken(feature: string, id: string): string {
  if (/^T[0-9]+$/.test(id)) return taskTestId(feature, id);
  const [req, ac] = id.split('/');
  return testId(req, ac);
}
