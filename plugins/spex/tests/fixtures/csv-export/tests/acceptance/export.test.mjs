// Acceptance tests for the fixture. They "pass" once src/state.txt says implemented, which is what
// the lifecycle test writes in place of real code. The ids in the names are what spex looks for.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const state = () => readFileSync(new URL('../../src/state.txt', import.meta.url), 'utf8').trim();

test('REQ_007_001_AC_1_writes_open_tasks_as_csv', () => {
  assert.equal(state(), 'implemented');
});

test('REQ_007_002_AC_1_refuses_overwrite', () => {
  assert.equal(state(), 'implemented');
});
