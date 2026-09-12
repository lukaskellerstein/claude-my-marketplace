#!/usr/bin/env node
// List the Final Cut Pro title templates installed on this machine, and the FCPXML versions
// it imports. The names printed here are what meta.fcp.titleTemplate and
// meta.fcp.lowerThirdTemplate accept.
//
// usage:
//   fcp-templates.mjs                       # categories with counts, and FCPXML versions
//   fcp-templates.mjs --category "Lower Thirds"
//   fcp-templates.mjs --find "Basic Lower Third"
//   fcp-templates.mjs --json

import { fcpxmlVersions, findFcpApps, findTitleTemplate, listTitleTemplates } from './lib/fcp.mjs';

const args = process.argv.slice(2);
const argOf = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const apps = findFcpApps();
if (!apps.length) {
  console.error('demo-video: no Final Cut Pro in /Applications.');
  process.exit(1);
}

const find = argOf('--find');
if (find) {
  const hit = findTitleTemplate(find);
  if (!hit) {
    console.error(`demo-video: no title template named "${find}". Run without --find to list them.`);
    process.exit(1);
  }
  console.log(JSON.stringify(hit, null, 2));
  process.exit(0);
}

const category = argOf('--category');
const templates = listTitleTemplates().filter((t) => !category || t.category === category);

if (args.includes('--json')) {
  console.log(JSON.stringify({ apps, fcpxml: fcpxmlVersions(), templates }, null, 2));
  process.exit(0);
}

console.log(`Final Cut Pro: ${apps.join(', ')}`);
console.log(`FCPXML import versions: ${fcpxmlVersions().map((v) => v.version).join(', ')}`);
if (category) {
  for (const t of templates) console.log(`  ${t.name}${t.source === 'user' ? '  (user)' : ''}`);
} else {
  const counts = templates.reduce((acc, t) => acc.set(t.category || '(top level)', (acc.get(t.category || '(top level)') ?? 0) + 1), new Map());
  for (const [name, n] of [...counts].sort()) console.log(`  ${name.padEnd(28)} ${n}`);
  console.log('\nList one category with --category "<name>".');
}
