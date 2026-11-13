// The tests.yaml rules: every claim has a proof, every proof names a claim that exists, a script has a name
// its file carries, a session says why a script cannot judge it, a real system it writes has the one-time
// yes, and no step is a person's step.

import { join } from 'node:path';
import { SHELL } from '../config.js';
import { testId } from '../ears.js';
import { bytes, fileExists, readText } from '../io.js';
import { claimsOf, isFileTest, isScript, nameToken, personActor, splitCover, testFiles } from '../tests.js';
import type { Finding } from '../types.js';
import { evidencePath } from '../verify.js';
import { fromRoot } from '../repos.js';
import type { RuleContext } from './requirements.js';

const clip = (text: string, max = 100): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function checkTests(ctx: RuleContext): Finding[] {
  const { feature, config } = ctx;
  const out: Finding[] = [];
  const file = feature.tests;
  const reqs = feature.requirements;
  const path = feature.testsPath;
  const f = (severity: Finding['severity'], code: string, message: string, fix: string, id?: string): void => {
    out.push({ severity, code, message, fix, path, id });
  };
  if (!file) {
    if (reqs) out.push({ severity: 'info', code: 'TEST-MISSING', message: `${feature.dir} has no tests.yaml: no proof plan yet`, path: feature.dir, fix: '/spex:requirements starts the test analyst, which writes it from the records; /spex:tasks adds the task tests.' });
    return out;
  }
  if (!reqs) {
    f('error', 'TEST-REQ', `${path} has no requirements.yaml next to it`, 'A proof plan answers a spec. Run /spex:requirements first.');
    return out;
  }
  if (file.feature !== reqs.feature) f('error', 'TEST-FEATURE', `tests.yaml feature "${file.feature}" differs from requirements.yaml feature "${reqs.feature}"`, 'Use the same feature id in both files.');

  const scenarios = new Set<string>();
  const records = new Set<string>();
  const retired = new Set<string>();
  for (const r of reqs.requirements) {
    if (r.status === 'retired') retired.add(r.id);
    else records.add(r.id);
    for (const a of r.acceptance) scenarios.add(`${r.id}/${a.id}`);
  }
  const tasks = new Map((feature.tasks?.tasks ?? []).map((t) => [t.id, t]));
  const seen = new Set<string>();
  const names = new Map<string, string>();

  for (const t of file.tests) {
    // TEST-ID
    if (seen.has(t.id)) f('error', 'TEST-ID', `${t.id} appears twice`, 'Test ids are unique. Give the second test the next free number.', t.id);
    seen.add(t.id);

    // TEST-COVERS: every claim it names exists
    for (const c of t.covers) {
      const s = splitCover(c);
      if (s.task) {
        if (!feature.tasks) f('error', 'TEST-COVERS', `${t.id} covers ${c}, but there is no tasks.yaml yet`, 'Task tests come after /spex:tasks. Cover a record or a scenario, or wait for the plan.', t.id);
        else if (!tasks.has(s.task)) f('error', 'TEST-COVERS', `${t.id} covers ${c}, which is not in tasks.yaml`, 'Fix the id, or drop the test.', t.id);
      } else if (s.ac) {
        if (!scenarios.has(c)) f('error', 'TEST-COVERS', `${t.id} covers ${c}, which is not a scenario in requirements.yaml`, 'Fix the id: REQ-007-001/AC-1 names a record and one of its acceptance entries.', t.id);
        else if (retired.has(s.req!)) f('warning', 'TEST-RETIRED', `${t.id} covers ${c} of a retired record`, 'Retire the test with the record, or point it at the record that superseded it.', t.id);
      } else if (!records.has(s.req!)) {
        if (retired.has(s.req!)) f('warning', 'TEST-RETIRED', `${t.id} covers retired ${c}`, 'Retire the test with the record, or point it at the record that superseded it.', t.id);
        else f('error', 'TEST-COVERS', `${t.id} covers ${c}, which is not in requirements.yaml`, 'Fix the id, or drop the test.', t.id);
      }
    }

    if (isScript(t)) {
      // TEST-DRIVER
      if (t.driver && t.driver !== SHELL && !config.drivers[t.driver]) f('error', 'TEST-DRIVER', `${t.id}: driver "${t.driver}" is not in .spex/config.yaml drivers`, `Add drivers.${t.driver}: {cmd: "… {ids} …", dir: …}, use \`shell\`, or drop driver for the default (acceptance_cmd).`, t.id);
      if (isFileTest(t)) {
        // TEST-NAME: a file test is found by its name, and the name says what it proves
        const token = nameToken(feature, t);
        if (!t.name) f('error', 'TEST-NAME', `${t.id}: a script test under a driver needs a name`, `Name it ${token}_<what_it_checks>; spex finds the test in its file by this name.`, t.id);
        else {
          if (!t.name.startsWith(token)) f('error', 'TEST-NAME', `${t.id}: name ${t.name} does not start with ${token}, the token of ${t.covers[0]}`, `The first id in covers gives the prefix: ${token}_<what_it_checks>.`, t.id);
          if (names.has(t.name)) f('error', 'TEST-NAME', `${t.id}: name ${t.name} is also ${names.get(t.name)}'s`, 'Two tests cannot share a name: the runner filters by it.', t.id);
          names.set(t.name, t.id);
          // TEST-FILE: the file, once named, holds the test
          if (t.file) {
            const abs = join(ctx.root, t.file);
            if (!fileExists(abs)) f('info', 'TEST-FILE', `${t.id}: ${t.file} does not exist yet`, 'The test developer writes it: /spex:develop-tests.', t.id);
            else if (!readText(abs).includes(t.name)) {
              // A later batch often writes into a file an earlier batch created: with no run on record, the test is
              // not written yet. Only a test that ran once, red or green, and is now gone from its file is a broken record.
              const ran = (['fail', 'pass'] as const).some((e) => fileExists(evidencePath(ctx.root, reqs.feature, t.id, e)));
              if (ran) f('error', 'TEST-FILE', `${t.id}: ${t.file} holds no test named ${t.name}, but ${t.id} ran before`, 'Fix `file` or `name`: the file is where the test developer put it, the name is what it is called there.', t.id);
              else f('info', 'TEST-FILE', `${t.id}: ${t.file} has no test named ${t.name} yet`, 'The test developer writes it: /spex:develop-tests.', t.id);
            }
          }
        }
      }
    } else {
      // TEST-SESSION-WHY: a session is an agent's claim, so it needs a reason over a script
      if (!(t.why ?? '').trim()) f('error', 'TEST-SESSION-WHY', `${t.id}: a session needs a why`, 'Say why a script cannot judge this (a visual judgment, a live run that spends real resources, a third-party UI with no API). If a script can, make it a script.', t.id);
    }

    // TEST-TOUCHES: a real system a test writes has the one-time yes
    for (const s of t.touches ?? []) {
      if (!config.live.includes(s)) f('error', 'TEST-TOUCHES', `${t.id} touches ${s}, which is not in .spex/config.yaml live[]`, `A real system a test writes needs the one-time yes: add "${s}" to live[] on purpose, or make the test not write it.`, t.id);
    }

    // TEST-PERSON: no step is a person's step
    for (const text of [...t.steps, ...t.expect, ...(t.why ? [t.why] : [])]) {
      const hit = personActor(text, config.people);
      if (hit) f('error', 'TEST-PERSON', `${t.id}: "${hit}" makes a step a person's step: ${clip(text)}`, 'The process has no manual step. Give the step to the test: the API call, the browser step, the command. A credential or a running system goes to needs[].', t.id);
    }
  }

  // TEST-COVER (gap): every live scenario and every task has a proof
  const covered = new Set(file.tests.flatMap((t) => t.covers));
  for (const r of reqs.requirements) {
    if (r.status === 'retired') continue;
    for (const a of r.acceptance) {
      if (!covered.has(r.id) && !covered.has(`${r.id}/${a.id}`)) out.push({ severity: 'gap', code: 'TEST-COVER', message: `${r.id}/${a.id} has no test in tests.yaml`, fix: `The test analyst adds one: /spex:requirements ${feature.dir} runs it for the scenarios that lack a test.`, path, id: r.id });
    }
  }
  for (const t of feature.tasks?.tasks ?? []) {
    const claims = claimsOf(feature, t);
    if (![...claims].some((c) => covered.has(c))) out.push({ severity: 'gap', code: 'TEST-COVER', message: `${t.id} has no test in tests.yaml`, fix: `The test analyst adds one from its done_when: /spex:tasks ${feature.dir} runs it for the tasks that lack a test.`, path, id: t.id });
  }

  // TEST-STALE: a test of a record this feature supersedes
  const supersedes = reqs.requirements.flatMap((r) => (r.relationships ?? []).filter((x) => x.type === 'supersedes').map((x) => x.target));
  if (supersedes.length) {
    const files = testFiles(ctx.root, config);
    for (const old of supersedes) {
      const needle = testId(old);
      const hits = files.filter((p) => readText(fromRoot(ctx.root, p)).includes(needle));
      if (hits.length) f('warning', 'TEST-STALE', `${old} is superseded by this feature but ${hits.join(', ')} still tests it`, 'When the test developer writes the superseding test, it retires the old one.', old);
    }
  }

  // FILE-SIZE
  const size = bytes(readText(join(ctx.root, path)));
  if (size > config.limits.file_kb * 1024) f('warning', 'FILE-SIZE', `${path} is ${Math.round(size / 1024)} KB, above limits.file_kb ${config.limits.file_kb}`, 'A proof plan that big is two features. Split it.');

  return out;
}
