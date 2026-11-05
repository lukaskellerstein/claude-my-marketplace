// The records spex reads and writes. The JSON Schemas under schemas/ are the source of truth for
// shapes; these types mirror them so the rules read naturally.

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
  verification: { mode: 'isolated-interface' | 'implementation-aware'; method: 'test' | 'property-test' | 'measure' | 'inspection'; rationale?: string };
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
  by?: 'human' | 'default';
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
  brief?: string;
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
  requirements: string[];
  depends_on?: string[];
  parallel_group?: string;
  paths: string[];
  context?: string[];
  design?: string[];
  interfaces?: { consumes?: string[]; produces?: string[] };
  instructions: string;
  verify?: string[];
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
  quick?: { reason: string };
  deferred?: { finding: string; why: string; by: string }[];
  tasks: Task[];
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

export interface Config {
  acceptance_dir: string;
  acceptance_cmd: string;
  fast_checks: string[];
  source_dirs: string[];
  protected: string[];
  scopes: string[];
  banned_words: string[];
  limits: Limits;
  review_rounds: number;
}

/** One feature folder as loaded from disk. Either file may be missing. */
export interface Feature {
  dir: string; // repo-relative, e.g. specs/007-csv-export
  name: string; // folder name
  requirements?: RequirementsFile;
  tasks?: TasksFile;
  requirementsPath: string;
  tasksPath: string;
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
  commands: { cmd: string; exit: number | null; ms: number; tail: string }[];
}

export class UsageError extends Error {}
