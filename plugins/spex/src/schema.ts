// JSON Schema validation with ajv. The schemas are bundled into spex.mjs, so there is no file lookup
// at run time and the plugin needs no install step.

import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import configSchema from '../schemas/config.schema.json' with { type: 'json' };
import requirementsSchema from '../schemas/requirements.schema.json' with { type: 'json' };
import tasksSchema from '../schemas/tasks.schema.json' with { type: 'json' };
import testsSchema from '../schemas/tests.schema.json' with { type: 'json' };

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validators = {
  requirements: ajv.compile(requirementsSchema),
  tasks: ajv.compile(tasksSchema),
  tests: ajv.compile(testsSchema),
  config: ajv.compile(configSchema),
};

export type SchemaName = keyof typeof validators;

/** Returns human messages, one per schema error, with the instance path first. */
export function validate(name: SchemaName, data: unknown): string[] {
  const v = validators[name];
  if (v(data)) return [];
  return (v.errors ?? []).map(describe);
}

function describe(e: ErrorObject): string {
  const where = e.instancePath ? e.instancePath.replace(/^\//, '').replace(/\//g, '.') : '(root)';
  if (e.keyword === 'additionalProperties') {
    const extra = (e.params as { additionalProperty: string }).additionalProperty;
    const moved = extra === 'verification' ? ' (format 2: how a record is proved lives in tests.yaml; run `spex update`)' : extra === 'verify' || extra === 'quick' ? ' (format 2: a task\'s proof is a test in tests.yaml; run `spex update`)' : '';
    return `${where}: unknown field "${extra}"${moved}`;
  }
  if (e.keyword === 'required') return `${where}: missing field "${(e.params as { missingProperty: string }).missingProperty}"`;
  if (e.keyword === 'enum') return `${where}: must be one of ${(e.params as { allowedValues: string[] }).allowedValues.join(', ')}`;
  if (e.keyword === 'type') return `${where}: must be ${(e.params as { type: string }).type}` + (where.endsWith('feature') ? ' (quote it: "007")' : '');
  return `${where}: ${e.message ?? e.keyword}`;
}
