// `spex comment --words <file>`: the person's words at any time, for the one spec that is open. The script keeps
// them in corrections.md, word for word, as an open entry, before any agent reads them. The skill then sorts a
// question from a change. A question is answered from the files, and `spex correction --close` closes the entry. A
// change goes through the analyst, the planner and the test analyst, and `spex stamp` closes it. No code is written.
// With no words, the command finds a comment that is not finished and goes on from there.
//
// `spex correction <dir> …` writes any other entry of corrections.md: a verdict of the decider, an answer of the
// person, a pick of the review, a line the close passed to a later spec.

import { join } from 'node:path';
import { FIELDS, addCorrection, closeCorrections, openCorrections, readCorrections, type Field } from '../corrections.js';
import { fileExists, readText } from '../io.js';
import { nextFor } from '../next.js';
import { loadFeature } from '../specs.js';
import { findSpec, isClosed, specList, stateWord } from '../state.js';
import type { Finding } from '../types.js';
import { enterGate } from '../worktree.js';
import type { CmdResult } from './lifecycle.js';

const refuse = (findings: Finding[], exit = 6, data: Record<string, unknown> = {}): CmdResult => ({ ok: false, findings, exit, text: '', data });

export const COMMENT_TITLE = 'comment · your words';

export function comment(root: string, opts: { words?: string; text?: string }): CmdResult {
  const open = specList(root).find((s) => s.state && !isClosed(s.state));
  if (!open) {
    const n = nextFor(root);
    return refuse([{ severity: 'error', code: 'COMMENT-NO-SPEC', message: 'no spec is open: comment works on the one spec that plan has started and that is not merged', fix: `A note that waits is changed with /spex:delete and /spex:new. Merged code is changed with /spex:new-bug or /spex:new.${n.command ? ` Next: ${n.command}` : ''}` }], 6, { next: n.command || null });
  }
  // The words go into corrections.md of the open spec, in its worktree: only a session that started there writes it.
  const gate = enterGate(root, open.name, open.dir, 'comment');
  if (gate) return refuse([{ ...gate, fix: (gate.fix ?? '').replace(`/spex:comment ${open.dir}`, '/spex:comment <your words>') }], 6, { dir: open.dir });
  let words = opts.text?.trim() ?? '';
  if (opts.words) {
    const src = fileExists(opts.words) ? opts.words : join(root, opts.words);
    if (!fileExists(src)) return refuse([{ severity: 'error', code: 'USAGE', message: `${opts.words} does not exist`, fix: 'Pass the path of a file that holds the words of the person, word for word.' }], 2);
    words = readText(src).trim();
  }
  const home = open.home;
  const waiting = openCorrections(home, open.dir).filter((c) => c.title === COMMENT_TITLE);
  let entry = waiting[0];
  let resumed = false;
  if (!words) {
    if (!entry) return refuse([{ severity: 'error', code: 'USAGE', message: 'comment needs your words', fix: 'Type /spex:comment with a question, or with what must change.' }], 2);
    resumed = true;
  } else entry = addCorrection(home, open.dir, { title: COMMENT_TITLE, fields: { 'You said': `"${words}"` }, open: true });
  const feature = loadFeature(home, open.dir);
  const planned = !!feature.tasks && !!feature.tests;
  const lines = [
    `comment kept as ${entry.id} in ${open.dir}/corrections.md${resumed ? ' (it was not finished; this run goes on from there)' : ', word for word'}`,
    `spec: ${open.dir} · ${stateWord(open.state)}`,
    `worktree: ${home}`,
    `you said: ${entry.fields['You said'] ?? ''}`,
    planned ? 'a plan exists: a change goes through the analyst, the planner and the test analyst, then `spex stamp`' : 'no plan exists yet: a change goes through the analyst only; plan writes the tasks and the tests when it runs again',
  ];
  if (waiting.length > (resumed ? 1 : 0)) lines.push(`also not finished: ${waiting.filter((c) => c.id !== entry.id).map((c) => c.id).join(', ')}`);
  return { ok: true, findings: [], exit: 0, text: lines.join('\n'), data: { dir: open.dir, entry: entry.id, words: entry.fields['You said'] ?? '', worktree: open.worktree ? home : null, state: open.state, planned, resumed, open: waiting.map((c) => c.id) } };
}

export interface CorrectionInput {
  title?: string;
  close?: string[];
  done?: string;
  fields: Partial<Record<Field, string>>;
  /** Written closed at once: a verdict that needs no more work. */
  closed?: boolean;
}

export function correction(root: string, given: string, input: CorrectionInput): CmdResult {
  const spec = findSpec(root, given);
  if (!spec) return refuse([{ severity: 'error', code: 'SPEC-UNKNOWN', message: `${given} is no spec folder under specs/`, fix: 'Name the folder: specs/007-csv-export.' }], 2);
  const home = spec.home;
  if (input.close?.length) {
    const closed = closeCorrections(home, spec.dir, input.close.includes('all') ? [] : input.close, input.done?.trim() || 'done', input.fields);
    if (!closed.length) return refuse([{ severity: 'error', code: 'CORRECTION-NONE', message: `no open entry ${input.close.join(', ')} in ${spec.dir}/corrections.md`, fix: `Open now: ${openCorrections(home, spec.dir).map((c) => c.id).join(', ') || 'none'}.` }], 2);
    return { ok: true, findings: [], exit: 0, text: `closed in ${spec.dir}/corrections.md: ${closed.join(', ')}`, data: { dir: spec.dir, closed } };
  }
  if (!input.title?.trim()) return refuse([{ severity: 'error', code: 'USAGE', message: 'correction needs --title, or --close <id>', fix: `spex correction <dir> --title "implement, round 1 · the spec was wrong (small)" ${FIELDS.map((f) => `[--${f.toLowerCase().replace(' ', '-')} "…"]`).join(' ')} [--closed]` }], 2);
  const c = addCorrection(home, spec.dir, { title: input.title, fields: input.fields, open: !input.closed, closedBy: input.closed ? input.done?.trim() || 'no more work' : '' });
  return { ok: true, findings: [], exit: 0, text: `${c.id} written to ${spec.dir}/corrections.md (${c.open ? 'open: `spex stamp` or the end of the phase closes it' : 'closed'})`, data: { dir: spec.dir, entry: c.id, open: c.open, entries: readCorrections(home, spec.dir).length } };
}
