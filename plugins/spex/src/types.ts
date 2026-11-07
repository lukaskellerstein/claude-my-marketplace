// The records spex reads and writes. The JSON Schemas under schemas/ are the source of truth for
// shapes; these types mirror them so the rules read naturally.
//
// Three files per feature. requirements.yaml and tasks.yaml are the claim (what must be true, how it
// is built), written by the analyst. tests.yaml is the proof plan, written by the test analyst: the
// one who writes a claim never writes its proof.

export type Severity = 'error' | 'warning' | 'info' | 'gap';

export interface Finding {
  severity: Severity;
  code: string;
  message: string;
  fix?: string;
  path?: string;
  id?: string;
}

export interface Measure {
  metric: string;
  operator: '<' | '<=' | '==' | '>=' | '>';
  value: number;
  unit: string;
  percentile?: number;
}

export interface Scenario {
  id: string;
  given: string;
  when: string;
  then: string;
  measure?: Measure;
}

export type EarsType = 'ubiquitous' | 'event-driven' | 'state-driven' | 'optional-feature' | 'unwanted-behavior' | 'complex';
export type ReqStatus = 'draft' | 'approved' | 'built' | 'retired';
export type RelType = 'depends-on' | 'related-to' | 'conflicts-with' | 'supersedes';

export interface Requirement {
  id: string;
  type: EarsType;
  text: string;
  scope: string;
  applies_to: string[];
  acceptance: Scenario[];
  priority: 'must' | 'should' | 'could';
  status: ReqStatus;
  source: string;
  relationships?: { type: RelType; target: string }[];
  rationale?: string;
}

export interface Question {
  id: string;
  ask: string;
  why: string;
  options: { key: string; text: string; recommended?: boolean }[];
  answer?: string;
  /** Who answered: a person, the recommended option taken because nobody could be asked, or the decider agent from evidence. */
  by?: 'human' | 'default' | 'agent';
  /** For `by: agent`: the design section, file and line, or finding the answer rests on. */
  evidence?: string;
  /** For `by: agent`: high (the material states it), medium (it follows from the material) or low (a guess, read at approval). */
  confidence?: 'high' | 'medium' | 'low';
}

export interface Unknown {
  id: string;
  ask: string;
  decision?: string;
  ref?: string;
}

export interface Interface {
  id: string;
  kind: string;
  contract?: string;
}

export interface RequirementsFile {
  feature: string;
  slug: string;
  title: string;
  /** The spec in words, only when it is not spec.md in this folder. */
  spec?: string;
  goal: string;
  out_of_scope?: string[];
  interfaces?: Interface[];
  glossary?: Record<string, string>;
  questions?: Question[];
  unknowns?: Unknown[];
  requirements: Requirement[];
}

export type TaskStatus = 'todo' | 'done' | 'blocked';

export interface Task {
  id: string;
  title: string;
  kind: 'setup' | 'foundational' | 'story' | 'polish' | 'fix';
  /** The records this task makes true. Empty for a setup task whose proof is its own test. */
  requirements: string[];
  depends_on?: string[];
  parallel_group?: string;
  paths: string[];
  context?: string[];
  design?: string[];
  interfaces?: { consumes?: string[]; produces?: string[] };
  instructions: string;
  /** The claim: one observable sentence. Its proof is a test in tests.yaml, written by the test analyst. */
  done_when: string;
  source?: string;
  status: TaskStatus;
}

export interface Design {
  modules?: { id: string; path: string; role: string }[];
  entities?: { id: string; name: string; fields?: string[]; schema?: string }[];
  decisions?: { id: string; text: string; why?: string }[];
}

export interface TasksFile {
  feature: string;
  approach: string;
  boundaries?: { always?: string[]; never?: string[] };
  design?: Design;
  deferred?: { finding: string; why: string; by: string }[];
  /** Written by `spex approve`, never by a skill: a hash of tasks.yaml as a person read it. */
  approvals?: { tasks?: string };
  tasks: Task[];
}

export type TestKind = 'script' | 'session';

/**
 * One test record: how one claim is proved. A `script` is code the spex script runs (a test file under a
 * driver, or `driver: shell` steps run as commands). A `session` is a procedure a tester agent performs,
 * in the browser or against an API, and records as evidence with what it observed.
 */
export interface TestRecord {
  id: string;
  /** What it proves: `REQ-007-001/AC-1`, a whole record `REQ-007-001`, or a task `T09`. */
  covers: string[];
  kind: TestKind;
  /** script: a key of config.drivers, `shell`, or absent for the default (acceptance_cmd). session: browser, api, cli, … */
  driver?: string;
  /** script, file-based: the test's name in the file. It starts with the token of the first id in covers. */
  name?: string;
  /** script, file-based: the file that holds it, once written (the test analyst may name the intended file). */
  file?: string;
  /** The procedure: what runs, with what. For a session, what the tester does, step by step. */
  steps: string[];
  /** What is observed, with its exact value. */
  expect: string[];
  /** Env vars (GITLAB_TOKEN) or commands (`kubectl get nodes`) the test needs; the gate checks them. */
  needs?: string[];
  /** The real systems the test writes; each must be in config.live, the one-time yes. */
  touches?: string[];
  /** session: why a script cannot judge this. */
  why?: string;
}

export interface TestsFile {
  feature: string;
  /** Written by `spex approve`, never by a skill: a hash of tests.yaml as a person read it. */
  approvals?: { tests?: string };
  tests: TestRecord[];
}

export interface Limits {
  task_files: number;
  instructions_bytes: number;
  approach_bytes: number;
  context_kb: number;
  diff_kb: number;
  file_kb: number;
  tests_scenarios: number;
  verify_minutes: number;
}

/** One more way to run script tests: the command (with {ids}) and the folder its files live in. */
export interface Driver {
  cmd: string;
  dir?: string;
}

export interface Config {
  /** The shape of the files in specs/ and .spex/, as one integer. The script reads exactly one; a missing line means 1. */
  format: number;
  acceptance_dir: string;
  acceptance_cmd: string;
  /** Named drivers past the default: `playwright: {cmd: 'npx playwright test --grep "{ids}"', dir: tests/e2e}`. */
  drivers: Record<string, Driver>;
  fast_checks: string[];
  source_dirs: string[];
  protected: string[];
  scopes: string[];
  banned_words: string[];
  /** The real systems a test may write (github:org/repo, gitlab:group/project, cluster:laptop). The one-time yes. */
  live: string[];
  /** Names that must not appear as an actor in a task or a test: the person at the keyboard. */
  people: string[];
  limits: Limits;
  review_rounds: number;
  verify_rounds: number;
  /** The stages past gate 1 that need a person's `spex approve`: tasks, tests. Spec and records always do. */
  approvals: ('tasks' | 'tests')[];
  /** Auto mode: nobody is asked; the decider agent settles every question with evidence, and the person reads the answers at the gates. */
  auto: boolean;
  /** How `spex ship` merges: commit the working tree first, then run cmd (push, open the request, merge it). Empty cmd: a person merges, then `spex ship --merged`. */
  ship: { commit: boolean; cmd: string };
}

/** One feature folder as loaded from disk. Any file may be missing. */
export interface Feature {
  dir: string; // repo-relative, e.g. specs/007-csv-export
  name: string; // folder name
  requirements?: RequirementsFile;
  tasks?: TasksFile;
  tests?: TestsFile;
  requirementsPath: string;
  tasksPath: string;
  testsPath: string;
  errors: Finding[]; // parse errors, so a broken file still reports
}

export interface Evidence {
  feature: string;
  task: string;
  tree: string;
  expect: 'pass' | 'fail';
  ok: boolean;
  at: string;
  ids_seen: boolean;
  /** The test ids the run covered. */
  tests: string[];
  commands: { cmd: string; exit: number | null; ms: number; tail: string }[];
}

/** What a tester agent observed in one session, recorded by `spex session`: a claim with artifacts, never the script's proof. */
export interface SessionEvidence {
  feature: string;
  test: string;
  tree: string;
  result: 'pass' | 'fail';
  observed: string;
  artifacts: string[];
  at: string;
}

export type SessionStatus = 'pass' | 'fail' | 'pending' | 'stale';

/** The whole-feature run `spex verify` writes: every script's result, every session's status at this tree. */
export interface VerifyEvidence {
  feature: string;
  tree: string;
  ok: boolean;
  round: number;
  at: string;
  fast_checks: { ok: boolean; tail: string };
  scripts: { id: string; ok: boolean; cmd: string; exit: number | null; tail: string }[];
  sessions: { id: string; status: SessionStatus; tree: string | null; observed: string | null }[];
}

export class UsageError extends Error {}
