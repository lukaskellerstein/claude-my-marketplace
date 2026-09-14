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
//   - MotionVFX also serves a read-only public catalog over HTTP (see API below). It needs no
//     login and it covers the whole catalog, so an element that is only a placeholder on this
//     Mac can still be looked at before anyone spends a download on it.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
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

// ── The public DesignStudio catalog ───────────────────────────────────────────────
// Read-only, no login, no key. It answers three questions the local folders cannot: what does
// an element that was never downloaded look like, what else is in its collection, and what is
// in the catalog for a role we have nothing downloaded for. Everything above this line works
// offline; only these functions touch the network, and only when a command asks for them.

export const API = 'https://www.motionvfx.com/design-studio/api/v2';

/** Codes are 4 characters. Reject anything else before it becomes a URL. */
export function code4(value) {
  const code = String(value ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)) throw new Error(`"${value}" is not a MotionVFX 4-character code`);
  return code;
}

// Node's fetch ignores the HTTPS_PROXY environment, so inside a sandboxed agent session it
// cannot even resolve the host. curl honours the proxy and is on every Mac. Try fetch first,
// fall back to curl once, and remember which one worked.
let viaCurl = false;

export async function get(url, { fetchImpl = globalThis.fetch, timeoutMs = 20000, toFile = null } = {}) {
  const curl = () => {
    const flags = ['-sS', '--fail', '--max-time', String(Math.ceil(timeoutMs / 1000)), '-H', 'accept: application/json'];
    if (toFile) {
      execFileSync('curl', [...flags, '-o', toFile, url], { stdio: 'pipe' });
      return null;
    }
    return execFileSync('curl', [...flags, url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  };
  if (viaCurl) return curl();
  if (typeof fetchImpl !== 'function') throw new Error('the MotionVFX catalog needs Node 18+ (global fetch) or curl');
  let response;
  try {
    response = await fetchImpl(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    // A network-level failure, not an HTTP error: the proxy is the usual reason.
    if (fetchImpl !== globalThis.fetch) throw error;
    viaCurl = true;
    return curl();
  }
  if (!response.ok) throw new Error(`MotionVFX catalog answered ${response.status} for ${url}`);
  if (!toFile) return response.text();
  writeFileSync(toFile, Buffer.from(await response.arrayBuffer()));
  return null;
}

async function api(path, options = {}) {
  const body = JSON.parse(await get(`${API}${path}`, options));
  if (!body?.data) throw new Error(`MotionVFX catalog returned no data for ${path}`);
  return body.data;
}

/** The largest rendition that is not wider than maxWidth, in the first format that exists. */
function rendition(group, formats, maxWidth = 960) {
  const sizes = Object.entries(group ?? {})
    .map(([width, variants]) => ({ width: Number(width), variants }))
    .filter((s) => Number.isFinite(s.width))
    .sort((a, b) => b.width - a.width);
  const picked = sizes.find((s) => s.width <= maxWidth) ?? sizes.at(-1);
  if (!picked) return null;
  for (const format of formats) {
    const v = picked.variants?.[format];
    if (v?.src) return { url: v.src, width: v.width, height: v.height, format };
  }
  return null;
}

function toElement(raw, maxWidth) {
  const frames = Number(raw.extra_data?.duration);
  const fps = Number(raw.extra_data?.frameRate);
  const detail = String(raw.detail_url ?? `/elements/${raw.token}`);
  return {
    code: raw.token,
    name: raw.name,
    // The local folder name is "<name> <code>"; that is what --find and the storyboard take.
    localName: raw.name && raw.token ? `${raw.name} ${raw.token}` : null,
    released: raw.release_date ?? null,
    url: `https://www.motionvfx.com/design-studio${detail.startsWith('/') ? '' : '/'}${detail}`,
    seconds: Number.isFinite(frames) && Number.isFinite(fps) && fps > 0 ? Number((frames / fps).toFixed(3)) : null,
    kind: raw.fcp_kind ?? null,
    folder: raw.fcp_folder ?? null,
    fcp: raw.mac_fcp !== false,
    tiers: raw.tiers ?? [],
    styles: (raw.style_list ?? []).map((s) => s.name ?? s).filter(Boolean),
    tags: (raw.tag_list ?? []).map((t) => t.name ?? t).filter(Boolean),
    image: rendition(raw.grid_prev_img_data, ['jpeg', 'webp'], maxWidth),
    video: rendition(raw.grid_prev_video_data, ['h264', 'h265'], maxWidth),
  };
}

/** One element by its code, with its preview still and preview movie. */
export async function catalogElement(code, options = {}) {
  const wanted = code4(code);
  const data = await api(`/elements/${encodeURIComponent(wanted)}`, options);
  const raw = Array.isArray(data.results) ? data.results[0] : data.results;
  if (!raw?.token) throw new Error(`the MotionVFX catalog has no element ${wanted}`);
  return toElement(raw, options.maxWidth);
}

async function mapLimit(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await worker(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return out;
}

/** Many elements at once. A failure becomes `{ code, error }`, so one bad code loses one row. */
export async function catalogElements(codes, { concurrency = 6, ...options } = {}) {
  return mapLimit([...new Set(codes.map(code4))], concurrency, async (code) => {
    try {
      return await catalogElement(code, options);
    } catch (error) {
      return { code, error: error.message };
    }
  });
}

/**
 * Search the whole catalog by text. `q` is the catalog's search parameter; every other name is
 * ignored, which returns the entire catalog and looks like a working search. There is no
 * server-side kind filter, so a kind is filtered here and more pages are read until it fills.
 * `total` is how many elements match the text, not how many are returned.
 */
export async function catalogSearch({ text = '', kind = null, limit = 24, maxPages = 5 } = {}, options = {}) {
  const results = [];
  let total = 0;
  for (let page = 1; page <= maxPages; page += 1) {
    const query = new URLSearchParams({ q: text, per_page: String(Math.min(Math.max(limit, 24), 100)), page: String(page) });
    const data = await api(`/elements?${query}`, options);
    total = data.q_total_results ?? total;
    for (const raw of data.results ?? []) {
      const element = toElement(raw, options.maxWidth);
      if (element.fcp && (!kind || element.kind === kind)) results.push(element);
    }
    if (results.length >= limit || !data.has_next) break;
  }
  return { total, results: results.slice(0, limit) };
}

/**
 * Which official collections the given codes belong to, and how much of each is downloaded.
 * The catalog has ~113 collections, so this is one request per collection: slow, and worth it
 * only when the question is "what would complete this pack".
 */
export async function catalogCollections(codes, { concurrency = 6, ...options } = {}) {
  const have = new Set(codes.map(code4));
  const all = [];
  for (let page = 1; ; page += 1) {
    const query = new URLSearchParams({ include: 'id,name,slug,type', per_page: '100', page: String(page) });
    const data = await api(`/collections?${query}`, options);
    all.push(...(data.results ?? []));
    if (!data.has_next) break;
  }
  const rows = await mapLimit(all, concurrency, async (collection) => {
    const data = await api(`/collections/${encodeURIComponent(collection.slug)}/elements`, options);
    const members = data.results ?? [];
    const downloaded = members.filter((m) => have.has(m.token));
    return {
      name: collection.name,
      slug: collection.slug,
      downloaded: downloaded.length,
      total: members.length,
      codes: downloaded.map((m) => m.token),
      missing: members
        .filter((m) => !have.has(m.token))
        .map((m) => ({ code: m.token, name: m.name, kind: m.fcp_kind ?? null })),
    };
  });
  return rows.filter((row) => row.downloaded > 0).sort((a, b) => b.downloaded - a.downloaded);
}
