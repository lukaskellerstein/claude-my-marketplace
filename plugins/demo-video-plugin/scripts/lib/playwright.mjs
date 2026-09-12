// Resolve the `playwright` module from the project, or from the plugin's own cache, so the
// capture scripts run in projects that do not depend on Playwright themselves.

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadPlaywright(projectDir) {
  const candidates = [
    join(projectDir, 'node_modules', 'playwright'),
    join(projectDir, 'node_modules', '@playwright', 'test'),
    join(process.env.HOME || '', '.cache', 'demo-video-plugin', 'node_modules', 'playwright'),
  ];
  for (const dir of candidates) {
    if (!existsSync(dir)) continue;
    try {
      const require = createRequire(join(dir, 'package.json'));
      const mod = await import(pathToFileURL(require.resolve('.')).href);
      const api = mod.chromium ? mod : mod.default;
      if (api?.chromium) return api;
    } catch {
      /* try the next candidate */
    }
  }
  console.error(
    'demo-video: Playwright is not importable. Install it once for the plugin:\n' +
      '  npm install --prefix "$HOME/.cache/demo-video-plugin" playwright\n' +
      'or add it to the project: npm install -D playwright'
  );
  process.exit(1);
}
