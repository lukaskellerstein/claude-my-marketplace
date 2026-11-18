// The NEXT block: the last lines of every reply. It names the one command that moves the spec, and says that the
// chat can be cleared first, because the state is in the files and never in the chat. The command comes from
// status.yaml alone: the phase, and if it is done. No step inside a phase is ever named.

import { openCorrections } from './corrections.js';
import { currentBranch } from './git.js';
import { isClosed, specList, stateWord, type ListedSpec } from './state.js';
import { branchOf } from './worktree.js';

export const RULE = '─'.repeat(40);

export interface Next {
  /** The command to type, or '' when nothing is next. */
  command: string;
  /** One line or more under it: why this one, and what typing it means. */
  why: string[];
  /** The spec it is about, when there is one. */
  spec: string | null;
  /** The branch the command works on: a session must start in its worktree first (`claude -w <branch>`). */
  branch?: string;
}

/** The command that moves one spec, from its state. A comment that is not finished comes first: its entry is still open. */
export function commandFor(spec: ListedSpec): Next {
  const n = phaseCommand(spec);
  // Every command but the end of the close works in the worktree of the spec, so a session starts there first.
  return isClosed(spec.state) ? n : { ...n, branch: branchOf(spec.name) };
}

function phaseCommand(spec: ListedSpec): Next {
  const dir = spec.dir;
  const s = spec.state;
  const open = openCorrections(spec.home, dir);
  const comment = open.find((c) => c.title.startsWith('comment'));
  if (comment) return { command: '/spex:comment', why: [`${comment.id} is a comment that is not finished: type it with no words, and it goes on from there.`], spec: dir };
  if (!s) return { command: `/spex:plan ${dir}`, why: ['It is the turn of this spec.'], spec: dir };
  if (s.command === 'plan') {
    if (s.state === 'started') return { command: `/spex:plan ${dir}`, why: ['The phase runs again from its first box. The files of the first run stay, and each agent reads them.'], spec: dir };
    return { command: `/spex:implement ${dir}`, why: ['Typing it approves the plan.'], spec: dir };
  }
  if (s.command === 'implement') {
    if (s.state === 'started') return { command: `/spex:implement ${dir}`, why: [`The phase runs again; a task that is done stays done.${open.length ? ` ${open.map((c) => c.id).join(', ')}: a correction is not finished, and the run finishes it.` : ''}`], spec: dir };
    return { command: `/spex:review ${dir}`, why: ['Typing it approves what implement built. To say no, type /spex:comment first.'], spec: dir };
  }
  if (s.state === 'started') return { command: `/spex:review ${dir}`, why: ['The phase runs again: the findings that wait for your answer are shown again.'], spec: dir };
  // review, done, and the spec is still in the list as open: the merge or the removal of the worktree is not finished.
  // That part changes the main folder, so it is typed in a session there.
  return { command: `/spex:review ${dir}`, why: ['The spec is closed on its branch. The merge, or the removal of the worktree, is not finished: type it in a session on the main folder, and it finishes it.'], spec: dir };
}

/** What is next for the repo: the spec that is open, else the first note of the list, else nothing. */
export function nextFor(root: string): Next {
  const list = specList(root);
  const open = list.find((s) => (s.state && !isClosed(s.state)) || (isClosed(s.state) && (s.worktree || s.branch)));
  if (open) return commandFor(open);
  const note = list.find((s) => !isClosed(s.state));
  if (note) return commandFor(note);
  return { command: '', why: [list.length ? 'Every spec is closed and merged. A new idea starts with /spex:new, a bug in merged code with /spex:new-bug.' : 'No spec yet. An idea starts with /spex:new.'], spec: null };
}

/**
 * The block as it is printed: /clear first, then the command alone on its line to copy, then the reason. With `root`,
 * a command whose branch is not the branch of this session starts with the session it needs: `claude -w spex/<spec>`,
 * then the command, typed in that session.
 */
export function renderNext(n: Next, opts: { clear?: boolean; root?: string } = {}): string {
  const clear = opts.clear ?? true;
  const lines = [RULE];
  if (!n.command) lines.push('NEXT   Nothing.', ...n.why.map((w) => `       ${w}`));
  else if (n.branch && opts.root && currentBranch(opts.root) !== n.branch) lines.push(`NEXT   claude -w ${n.branch}`, `       then, in that session: ${n.command}`, ...n.why.map((w) => `       ${w}`));
  else if (clear) lines.push('NEXT   /clear', `       ${n.command}`, ...n.why.map((w) => `       ${w}`));
  else lines.push(`NEXT   ${n.command}`, ...n.why.map((w) => `       ${w}`));
  lines.push(RULE);
  return lines.join('\n');
}

/** `📍 006 delete-old-backups · implement, started` */
export function placeLine(spec: ListedSpec): string {
  const m = spec.name.match(/^(\d{3})-(.*)$/);
  return `📍 ${m ? `${m[1]} ${m[2]}` : spec.name} · ${stateWord(spec.state)}${spec.worktree ? ` · worktree ${spec.name}` : ''}`;
}
