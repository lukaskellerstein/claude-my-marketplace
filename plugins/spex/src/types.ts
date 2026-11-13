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
  /** The repo the task writes, a key of config.repos; absent for this repo. Its paths and context are inside it. */
  repo?: string;
  paths: string[];
  context?: string[];
  design?: string[];
  interfaces?: { consumes?: string[]; produces?: string[] };
  instructions: string;
  /** The claim: one observable sentence. Its proof is a test in tests.yaml, written by the test analyst. */
  done_when: string;
  source?: string;
  /** A fix task a review finding became: how bad it is (P1 likely or harmful, P2 rare but real, P3 rare and harmless). */
  severity?: Priority;
  /** The finding a person accepted with `spex review accept`: `<feature>-<round>/F<n>`. Such a task needs no second approval. */
  review?: string;
  status: TaskStatus;
}

/** How bad a review finding is. P1: likely in normal use, or data loss, security, wrong money. P2: wrong in a rare but real case. P3: rare and harmless. */
export type Priority = 'P1' | 'P2' | 'P3';
export type FindingSeverity = Priority | 'nit';
export type Pick = 'fix' | 'defer' | 'skip';

/** One finding of a review round, in .spex/review/<feature>-<round>.findings.yaml. The finder writes the claim and the fix plan; others build and prove it. */
export interface ReviewFinding {
  id: string;
  severity: FindingSeverity;
  title: string;
  file: string;
  line?: number;
  /** The failure scenario: the state and the input. It becomes the red test. Needed for P1–P3 and a fix pick. */
  when?: string;
  /** What goes wrong, as a person sees it. Needed for P1–P3 and a fix pick. */
  effect?: string;
  /** The proposed fix: what and where, no code. It becomes the task's instructions. Needed for a fix pick. */
  fix?: string;
  /** The claim the test proves once the fix is in. Needed for a fix pick. */
  done_when?: string;
  requirements?: string[];
  paths?: string[];
  context?: string[];
  pick: Pick;
  /** Why it waits (defer) or does not matter (skip). */
  why?: string;
}

export interface FindingsFile {
  feature: string;
  round: number;
  findings: ReviewFinding[];
  /** Written by `spex review accept`, never by a skill. */
  accepted?: { at: string; by: string; tasks: string[]; deferred: string[]; skipped: string[] };
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
  deferred?: { finding: string; why: string; by: string; severity?: FindingSeverity }[];
  /** Written by the script when it stamps the plan, never by a skill: a hash of spec.md, of the records and of this file as the plan ended. */
  approvals?: { tasks?: string; spec?: string; requirements?: string };
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
  /** Written by the script when it stamps the plan, never by a skill: a hash of tests.yaml as the plan ended. */
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
  /** How many names one step of a roadmap may introduce before spex check says to split it. */
  step_introduces: number;
}

/** One more way to run script tests: the command (with {ids}) and the folder its files live in. */
export interface Driver {
  cmd: string;
  dir?: string;
  /** The repo the command runs in and the folder is in, a key of config.repos; absent for this repo. */
  repo?: string;
}

/** Another git repo a task may write. Specs and .spex/ stay in this repo; the code and its tests may live there. */
export interface RepoConfig {
  /** From this repo's root: ../forks/odh-dashboard. */
  path: string;
  /** The branch its review diff starts from. Absent: the commit it was at when its first task opened. */
  base?: string;
  /** Run in it, after this repo's fast_checks, when a task of the feature writes it. */
  fast_checks?: string[];
  /** No task writes these, inside it; its drivers' folders are protected too. */
  protected?: string[];
  /** How the close merges it. commit false: the script does not commit the branch of that repo, a person did. Absent: it commits, as on every branch of a spec. Empty cmd: a person merges it. */
  close?: { commit?: boolean; cmd?: string };
}

export interface Config {
  /** The shape of the files in specs/ and .spex/, as one integer. The script reads exactly one; a missing line means 1. */
  format: number;
  acceptance_dir: string;
  acceptance_cmd: string;
  /** Named drivers past the default: `playwright: {cmd: 'npx playwright test --grep "{ids}"', dir: tests/e2e}`. */
  drivers: Record<string, Driver>;
  /** Other git repos a task may write, by name: `dashboard: {path: ../forks/odh-dashboard}`. */
  repos: Record<string, RepoConfig>;
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
  /** Auto mode: nobody is asked; the decider agent settles every question with evidence, and the person reads the answers in each digest. */
  auto: boolean;
  /** The script commits on the base branch (the notes of new, new-bug and delete) only when this is true. On the branch of a spec it always commits. */
  commit: boolean;
  /** The branch a spec starts from and merges into. Empty: the branch the main folder is on. */
  base: string;
  /** How the close merges: cmd pushes, opens the request and merges it. Empty cmd: a person merges, then types review again. */
  close: { cmd: string };
  /** What runs one time in a new worktree: install the packages, copy .env. */
  worktree: { setup: string };
  /** The environment the tests need, as scripts of the project: spex knows no tool. Absent: no environment. */
  env?: EnvConfig;
}

/** The environment contract: four scripts and one address. */
export interface EnvConfig {
  /** Start it, or do nothing when it runs. At the start of implement. */
  up?: string;
  /** Put the code of this folder into it. Before every full test run. */
  deploy?: string;
  /** Exit 0 when the app answers. After every deploy. */
  check?: string;
  /** Stop it, never delete it. At the close. */
  down?: string;
  /** Where the tests find the app. Given to every test command as SPEX_ENV_URL. */
  url?: string;
}

/** The phase a spec is in. status.yaml in the folder of the spec holds it, and nothing else does. No file: the spec is a note. */
export type Phase = 'plan' | 'implement' | 'review';
export interface SpecState {
  command: Phase;
  state: 'started' | 'done';
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
  /** The tree without specs/: when only notes changed since, the proof still holds for the code. */
  code?: string;
  ok: boolean;
  round: number;
  at: string;
  fast_checks: { ok: boolean; tail: string };
  scripts: { id: string; ok: boolean; cmd: string; exit: number | null; tail: string }[];
  sessions: { id: string; status: SessionStatus; tree: string | null; observed: string | null }[];
}

export class UsageError extends Error {}
