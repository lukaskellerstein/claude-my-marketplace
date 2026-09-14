// What the installed Final Cut Pro offers: its FCPXML DTDs and its Motion templates — titles,
// generators, transitions and effects, built in or installed by the user (Motion, MotionVFX and
// other packs). Read from disk, never assumed — FCP ships as "Final Cut Pro.app" and as
// "Final Cut Pro Creator Studio.app", and the template set differs between versions and machines.

import { existsSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, relative, sep } from 'node:path';
import { classify, isMotionVfx, PLACEHOLDER_DIR, splitCode } from './motionvfx.mjs';

const DTD_DIR = 'Contents/Frameworks/Interchange.framework/Versions/A/Resources';
const PE_DIR = 'Contents/PlugIns/MediaProviders/MotionEffect.fxp/Contents/Resources/PETemplates.localized';
export const USER_TEMPLATES_DIR = join(homedir(), 'Movies', 'Motion Templates.localized');

/** The four kinds of Motion template, where FCP keeps each, and its file extension. */
export const KINDS = {
  title: { dir: 'Titles.localized', ext: '.moti' },
  generator: { dir: 'Generators.localized', ext: '.motn' },
  transition: { dir: 'Transitions.localized', ext: '.motr' },
  effect: { dir: 'Effects.localized', ext: '.moef' },
};

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

/** A downloaded element carries its own pictures; a placeholder carries none. */
function previewsOf(file, name) {
  const dir = dirname(file);
  const pick = (...names) => names.map((n) => join(dir, n)).find((p) => existsSync(p)) ?? null;
  return { thumb: pick('large.png', `${name}.jpg`, 'small.png'), video: pick(`${name}.mov`) };
}

function walk(root, kind, source) {
  const { dir, ext } = KINDS[kind];
  const out = [];
  const visit = (folder) => {
    let entries;
    try {
      entries = readdirSync(folder, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(folder, entry.name);
      if (entry.isDirectory()) {
        // mExtension's shared stand-ins are not templates of their own.
        if (entry.name !== PLACEHOLDER_DIR) visit(full);
        continue;
      }
      if (!entry.name.endsWith(ext) || !(entry.isFile() || entry.isSymbolicLink())) continue;
      // mExtension lists its whole catalog as links to one stand-in per kind. Used in a
      // project, a stand-in renders "The file is missing, please re-download the element".
      let status = 'ready';
      if (entry.isSymbolicLink()) {
        let target = '';
        try {
          target = readlinkSync(full);
        } catch {
          /* unreadable link: treat as not downloaded */
        }
        if (!target || target.split(/[\\/]/).includes(PLACEHOLDER_DIR) || !existsSync(full)) status = 'placeholder';
      }
      const parts = relative(root, full).split(sep);
      const name = entry.name.slice(0, -ext.length);
      // Only user templates carry a vendor code; a built-in name is just a name.
      const { base, code } = source === 'user' ? splitCode(name) : { base: name, code: null };
      const t = {
        kind,
        name,
        base,
        code,
        category: parts.length > 2 ? parts[0].replace(/\.localized$/, '') : '',
        group: parts.length > 3 ? parts[1].replace(/\.localized$/, '') : '',
        // FCPXML names a Motion template by its path under its kind's folder.
        uid: `${source === 'built-in' ? '...' : '~'}/${dir}/${parts.join('/')}`,
        source,
        status,
        path: full,
      };
      t.vendor = isMotionVfx(t) ? 'motionvfx' : null;
      t.role = classify(t);
      if (status === 'ready') Object.assign(t, previewsOf(full, name));
      out.push(t);
    }
  };
  visit(root);
  return out;
}

let catalog = null;

function scan(apps, userRoot) {
  const seen = new Set();
  const found = [];
  for (const k of Object.keys(KINDS)) {
    const builtIn = apps.flatMap((app) => walk(join(app, PE_DIR, KINDS[k].dir), k, 'built-in'));
    const user = walk(join(userRoot, KINDS[k].dir), k, 'user');
    for (const t of [...builtIn, ...user]) {
      if (seen.has(t.uid)) continue;
      seen.add(t.uid);
      found.push(t);
    }
  }
  return found;
}

/**
 * Every Motion template on this Mac, built-in first. Scanned once per process.
 * `apps` and `userRoot` exist so tests can scan a folder they built themselves; leave them out.
 */
export function listTemplates({ kind, apps, userRoot } = {}) {
  const custom = apps !== undefined || userRoot !== undefined;
  if (custom) {
    const found = scan(apps ?? findFcpApps(), userRoot ?? USER_TEMPLATES_DIR);
    return kind ? found.filter((t) => [kind].flat().includes(t.kind)) : found;
  }
  if (!catalog) catalog = scan(findFcpApps(), USER_TEMPLATES_DIR);
  return kind ? catalog.filter((t) => [kind].flat().includes(t.kind)) : catalog;
}

/**
 * Find a template by exact name, by name in any case, by its MotionVFX code ("FB5S"), or by
 * its name without the code when exactly one downloaded template has it. A downloaded
 * template wins over a placeholder of the same name.
 */
export function findTemplate(query, { kind, templates } = {}) {
  const q = String(query ?? '').trim();
  if (!q) return null;
  const all = templates ? templates.filter((t) => !kind || [kind].flat().includes(t.kind)) : listTemplates({ kind });
  const rank = (t) => (t.status === 'ready' ? 0 : 1);
  const best = (hits) => hits.sort((a, b) => rank(a) - rank(b))[0] ?? null;
  const sameBase = all.filter((t) => t.status === 'ready' && t.code && t.base.toLowerCase() === q.toLowerCase());
  return (
    best(all.filter((t) => t.name === q)) ??
    best(all.filter((t) => t.name.toLowerCase() === q.toLowerCase())) ??
    (/^[A-Z0-9]{4}$/i.test(q) ? best(all.filter((t) => t.code === q.toUpperCase())) : null) ??
    (sameBase.length === 1 ? sameBase[0] : null)
  );
}

/** ready | placeholder | missing, with the template when there is one. */
export function resolveTemplate(query, { kind, templates } = {}) {
  const template = findTemplate(query, { kind, templates });
  return { template, status: template?.status ?? 'missing' };
}

const decode = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/**
 * What a template exposes: its length, its text layers in file order (the order the FCPXML
 * export fills them), its published parameters, and its drop zones.
 */
export function inspectTemplate(path) {
  const xml = readFileSync(path, 'utf8');
  const setting = (tag) => Number(new RegExp(`<sceneSettings>[\\s\\S]*?<${tag}>([\\d.]+)</${tag}>`).exec(xml)?.[1] ?? 0);
  const frameRate = setting('frameRate') || 30;
  const durationFrames = setting('duration');

  const textFactories = new Set(
    [...xml.matchAll(/<factory id="(\d+)"[^>]*>\s*<description>Text<\/description>/g)].map((m) => m[1])
  );
  const nodes = [...xml.matchAll(/<scenenode name="([^"]*)" id="\d+" factoryID="(\d+)"/g)].filter((m) => textFactories.has(m[2]));
  const texts = nodes.map((m, i) => {
    const chunk = xml.slice(m.index, nodes[i + 1]?.index ?? xml.length);
    return {
      layer: decode(m[1]),
      text: decode(/<text>([\s\S]*?)<\/text>/.exec(chunk)?.[1] ?? ''),
      font: /<font>([^<]+)<\/font>/.exec(chunk)?.[1] ?? null,
    };
  });

  const publish = /<publishSettings>([\s\S]*?)<\/publishSettings>/.exec(xml)?.[1] ?? '';
  const params = [...new Set([...publish.matchAll(/<target [^>]*name="([^"]+)"/g)].map((m) => decode(m[1])))];

  // FCPXML addresses a published parameter as 9999/<every group and layer above the object>/
  // <object>/<channel>. Confirmed by FCP's own export of a MotionVFX lower third, and by FCP
  // keeping such a key on import and dropping one without the enclosing group.
  const ancestors = new Map();
  const stack = [];
  for (const m of xml.matchAll(/<(\/?)(group|layer|scenenode|behavior|filter)\b([^>]*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClosing] = m;
    if (closing) {
      stack.pop();
      continue;
    }
    const id = /\bid="(\d+)"/.exec(attrs)?.[1];
    if (id && !ancestors.has(id)) ancestors.set(id, stack.filter((s) => s.container).map((s) => s.id));
    if (!selfClosing) stack.push({ id, container: tag === 'group' || tag === 'layer' });
  }
  const keys = {};
  for (const m of publish.matchAll(/<target object="(\d+)" channel="\.\/([^"]+)" name="([^"]+)"\/>/g)) {
    const [, object, channel, name] = m;
    if (ancestors.has(object) && !keys[decode(name)]) keys[decode(name)] = ['9999', ...ancestors.get(object), object, channel].join('/');
  }

  // How an export can move the element. A template that draws the picture underneath into its
  // own frame ("Title Background") cannot be moved as a whole without dragging the footage along;
  // MotionVFX's mOSC plugin gives most of those a Content Position that moves only the element.
  const moscObject = /<target object="(\d+)" channel="\.\/2\/1\/13" name="Content Position"\/>/.exec(publish)?.[1];
  // Attribute order is not guaranteed, so read the whole tag for that object and look inside it.
  const moscTag = moscObject ? new RegExp(`<scenenode\\b[^>]*\\bid="${moscObject}"[^>]*>`).exec(xml)?.[0] : null;
  const mosc = Boolean(moscTag && moscTag.includes('pluginName="mOSC"'));
  const drawsBackground = /<(layer|scenenode)\b[^>]*\bname="Title Background"/.test(xml);

  return {
    name: basename(path).replace(/\.(moti|motn|motr|moef)$/, ''),
    placement: mosc ? 'content-position' : drawsBackground ? 'fixed' : 'transform',
    width: setting('width'),
    height: setting('height'),
    frameRate,
    durationFrames,
    seconds: Number((durationFrames / frameRate).toFixed(3)),
    texts,
    params,
    keys,
    dropZones: params.filter((p) => /^drop ?zone( \d+)?$/i.test(p)),
    fonts: [...new Set(texts.map((t) => t.font).filter(Boolean))],
  };
}

/**
 * Every template a storyboard names, with where it is named and which kinds may fill that
 * slot. The export and `fcp-templates.mjs --check` both read the storyboard through this.
 */
export function storyboardTemplateRefs(storyboard) {
  const refs = [];
  const add = (where, name, kind) => {
    if (typeof name === 'string' && name && name !== 'none') refs.push({ where, name, kind });
  };
  const fcp = storyboard?.meta?.fcp ?? {};
  add('meta.fcp.titleTemplate', fcp.titleTemplate, ['title', 'generator']);
  add('meta.fcp.lowerThirdTemplate', fcp.lowerThirdTemplate, ['title']);
  add('meta.fcp.transitionTemplate', fcp.transitionTemplate, ['transition']);
  add('meta.fcp.backgroundTemplate', fcp.backgroundTemplate, ['generator', 'title']);
  for (const s of storyboard?.sections ?? []) {
    const f = s.fcp ?? {};
    const at = `sections[${s.id}].fcp`;
    add(`${at}.titleTemplate`, f.titleTemplate, ['title', 'generator']);
    add(`${at}.lowerThirdTemplate`, f.lowerThirdTemplate, ['title']);
    add(`${at}.transitionTemplate`, f.transitionTemplate, ['transition']);
    add(`${at}.backgroundTemplate`, f.backgroundTemplate, ['generator', 'title']);
    (f.effects ?? []).forEach((e, i) => add(`${at}.effects[${i}]`, e, ['effect']));
    (f.overlays ?? []).forEach((o, i) => add(`${at}.overlays[${i}]`, o?.template, ['title', 'generator']));
  }
  return refs;
}
