// MotionVFX in Final Cut Pro. Every vendor-specific fact the plugin relies on lives here, so a
// change on MotionVFX's side is a change to one file.
//
//   - mExtension (the in-FCP browser) installs elements as ordinary Motion templates under
//     ~/Movies/Motion Templates.localized/<Kind>.localized/<Product>/<Name CODE>/<Name CODE>.<ext>.
//   - The whole catalog is listed there, but an element that was never downloaded is a symlink
//     into <Product>/.mExt-Placeholders/. The stand-in renders "The file is missing, please
//     re-download the element" — so it must never reach an export.
//   - A downloaded element folder holds large.png (640×360), small.png, an .identity-<hash>
//     file, and for some products (mCaptions) a <Name>.jpg and a 5 s <Name>.mov preview.
//   - Names end in a 4-character code that is unique across the catalog ("Keynote Lower3rd FB5S").
//   - DesignStudio theme packs share a prefix: "<Pack> Title", "<Pack> Lower3rd", "<Pack> Module",
//     "<Pack> Transition", and one generator intro.

import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const PLACEHOLDER_DIR = '.mExt-Placeholders';
export const MEXTENSION_APP = '/Applications/motionVFX/Plugins/mExtension.app';
export const MEXTENSION_DATA = join(homedir(), 'Movies', '.mExtension');
export const DAILY_DOWNLOAD_LIMIT = 500;

export function mextension() {
  return {
    app: existsSync(MEXTENSION_APP) ? MEXTENSION_APP : null,
    data: existsSync(MEXTENSION_DATA) ? MEXTENSION_DATA : null,
  };
}

/** "Keynote Lower3rd FB5S" -> { base: "Keynote Lower3rd", code: "FB5S" }. */
export function splitCode(name) {
  const m = /^(.+) ([A-Z0-9]{4})$/.exec(name);
  return m ? { base: m[1], code: m[2] } : { base: name, code: null };
}

export function isMotionVfx(t) {
  if (t.source !== 'user') return false;
  if (t.status === 'placeholder') return true;
  try {
    return readdirSync(dirname(t.path)).some((n) => n.startsWith('.identity-'));
  } catch {
    return false;
  }
}

// Roles are a shortlist, not a verdict: the name says what an element is for, the thumbnail
// says whether it fits. First match wins, so the narrow rules come first.
const PACK_PART = /^(.+) (Module|Lower3rd|Title|Transition|Intro)$/;
const TITLE_RULES = [
  ['lower-third', /lower ?3rd|lower third/i],
  ['module', / Module$/],
  ['cursor', /cursor|^click$|point click|radial click|^pointer$/i],
  ['callout', /callout|arrow|magnif|highlight|focus brackets|selection|speech|thought|bubble|badge|^tick$|sparkle|asterisk|scribble|^pin$|^flag$|glow stroke|strikethrough|^quote$|^question$|^like$|statement|destination|droplet halo|^accept$/i],
  ['background', /^(abstract |dimmed |smooth )?gradient( clouds| curtain| flux)?$|^grid$|^flat$|^curtain$|background|backdrop/i],
  ['frame', /drop ?zone|placeholder|avatar|display|monitor|^player$|footage|device|mockup/i],
  ['infographic', /chart|diagram|graph|histogram|table|percent|meter|timeline|structure|process|pyramid|mind map|comparison|layout|location|coordinate|compass|counter|countdown|progress|steps?\b|common set|linear set|value|column|single bar|range bar|descriptive bar|altitude|audio wave|^number$|calendar|clock|date/i],
  ['ui', /button|slider|switch|search|log ?in|pop-up|volume|colou?r|theme mode|calculator|icon|playhead|blade|bezier|brush|^pen$|alignment|prompt|wand|categories|toolbar|menu|rating|reactions/i],
  ['title', /title|intro|opener|header|slogan|introduction|kinetic|typography|cascade|logo/i],
];
const BUILT_IN_CATEGORY_ROLES = {
  'Lower Thirds': 'lower-third',
  'Bumper:Opener': 'intro',
  Backgrounds: 'background',
  Solids: 'background',
  Textures: 'background',
};

export function classify(t) {
  if (t.kind === 'transition') return 'transition';
  if (t.kind === 'effect') return 'effect';
  if (t.category === 'mCaptions') return 'caption-style';
  if (BUILT_IN_CATEGORY_ROLES[t.category]) return BUILT_IN_CATEGORY_ROLES[t.category];
  const base = t.base ?? t.name;
  if (t.kind === 'generator') return /gradient|background|backdrop|texture|solid|grid/i.test(base) ? 'background' : 'intro';
  return TITLE_RULES.find(([, re]) => re.test(base))?.[0] ?? 'text';
}

/**
 * MotionVFX theme packs among the given templates: a prefix with at least two of
 * Module / Lower3rd / Title / Transition / Intro, plus the pack's generator intro.
 */
export function packs(templates) {
  const mx = templates.filter((t) => t.vendor === 'motionvfx');
  const parts = new Map();
  for (const t of mx) {
    const m = PACK_PART.exec(t.base);
    if (m) parts.set(m[1], (parts.get(m[1]) ?? new Set()).add(m[2]));
  }
  const names = [...parts].filter(([, kinds]) => kinds.size >= 2).map(([name]) => name);
  const out = new Map(names.map((n) => [n, []]));
  for (const t of mx) {
    const direct = PACK_PART.exec(t.base)?.[1];
    const pack =
      (direct && out.has(direct) ? direct : null) ??
      (t.kind === 'generator'
        ? names.find((n) => t.base === n || t.base.startsWith(`${n} `) || t.base.endsWith(` ${n}`))
        : null);
    if (pack) out.get(pack).push(t);
  }
  return [...out].map(([pack, members]) => ({ pack, members })).sort((a, b) => a.pack.localeCompare(b.pack));
}
