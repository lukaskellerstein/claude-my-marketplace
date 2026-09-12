// What the installed Final Cut Pro offers: its FCPXML DTDs and its title templates. Read
// from the app bundle, never assumed — FCP ships as "Final Cut Pro.app" and as
// "Final Cut Pro Creator Studio.app", and the template set differs between versions.

import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative, sep } from 'node:path';

const DTD_DIR = 'Contents/Frameworks/Interchange.framework/Versions/A/Resources';
const TITLES_DIR =
  'Contents/PlugIns/MediaProviders/MotionEffect.fxp/Contents/Resources/PETemplates.localized/Titles.localized';
const USER_TITLES_DIR = join(homedir(), 'Movies', 'Motion Templates.localized', 'Titles.localized');

export function findFcpApps() {
  try {
    return readdirSync('/Applications')
      .filter((name) => /^Final Cut Pro.*\.app$/.test(name))
      .map((name) => join('/Applications', name));
  } catch {
    return [];
  }
}

const versionKey = (v) => v.split('.').map(Number).reduce((acc, n) => acc * 1000 + n, 0);

/** Every FCPXML version the installed FCP can import, newest first, with its DTD. */
export function fcpxmlVersions() {
  const found = new Map();
  for (const app of findFcpApps()) {
    const dir = join(app, DTD_DIR);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      const m = /^FCPXMLv(\d+)_(\d+)\.dtd$/.exec(file);
      if (m) found.set(`${m[1]}.${m[2]}`, { app, dtd: join(dir, file) });
    }
  }
  return [...found.entries()]
    .map(([version, info]) => ({ version, ...info }))
    .sort((a, b) => versionKey(b.version) - versionKey(a.version));
}

function walkTemplates(root, prefix) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.moti')) {
        const parts = relative(root, full).split(sep);
        out.push({
          name: entry.name.replace(/\.moti$/, ''),
          category: parts.length > 2 ? parts[0].replace(/\.localized$/, '') : '',
          // FCPXML names a Motion title by its path under Titles.localized.
          uid: `${prefix}/Titles.localized/${parts.join('/')}`,
          source: prefix === '...' ? 'built-in' : 'user',
        });
      }
    }
  };
  walk(root);
  return out;
}

/** Built-in titles (uid ".../Titles.localized/…") and the user's own ("~/Titles.localized/…"). */
export function listTitleTemplates() {
  const builtIn = findFcpApps().flatMap((app) => walkTemplates(join(app, TITLES_DIR), '...'));
  const user = walkTemplates(USER_TITLES_DIR, '~');
  const seen = new Set();
  return [...builtIn, ...user].filter((t) => (seen.has(t.uid) ? false : seen.add(t.uid)));
}

export function findTitleTemplate(name) {
  const all = listTitleTemplates();
  return all.find((t) => t.name === name) ?? all.find((t) => t.name.toLowerCase() === name.toLowerCase()) ?? null;
}
