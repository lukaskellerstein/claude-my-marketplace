// Bundle src/cli.ts into scripts/spex.mjs: one file, Node 20+, no install step for users.
// The banner gives the CommonJS dependencies (yaml, ajv) a `require` inside the ESM bundle.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'scripts/spex.mjs',
  banner: {
    js: ['#!/usr/bin/env node', "import { createRequire as __createRequire } from 'node:module';", 'const require = __createRequire(import.meta.url);'].join('\n'),
  },
  logLevel: 'warning',
  legalComments: 'none',
  // Whitespace and syntax only: identifiers stay, so a stack trace from a user's repo still reads.
  minifyWhitespace: true,
  minifySyntax: true,
});
