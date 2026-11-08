// A design document's outline: its sections, each with the anchor a `source` or a coverage row names.
// The roadmap round starts from this list, so the steps come from the author's own units, not from a
// reading of the text that differs from one session to the next. HTML: every heading with an `id`.
// Markdown: every heading, by its GitHub slug, its number (`3.2` for "3.2 Scoring") and a slug prefix
// (`phase-6` for "Phase 6: the proof").

import { join } from 'node:path';
import { fileExists, readText } from './io.js';

export interface DesignSection {
  file: string;
  /** The anchor a person writes after `#`: the HTML id, or the Markdown slug. */
  anchor: string;
  /** Other anchors that name the same section: the heading's number. */
  aliases: string[];
  /** How a source cites it: the id in HTML (a link works), the number in Markdown when it has one (`#3.2`), else the slug. */
  cite: string;
  level: number;
  title: string;
  /** The anchor of the nearest enclosing section, or null for a top one. */
  parent: string | null;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const unescape = (s: string): string =>
  s.replace(/&(#?\w+);/g, (m, e: string) => {
    if (ENTITIES[e]) return ENTITIES[e];
    if (!e.startsWith('#')) return m;
    const code = /^#x/i.test(e) ? parseInt(e.slice(2), 16) : Number(e.slice(1));
    return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
  });

/** GitHub's heading slug: lower case, punctuation gone, spaces to dashes. */
export function slugOf(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s/g, '-');
}

/** "3.2 Scoring" → 3.2; "3. The features" → 3; "Phase 6: the proof" → none. */
function numberOf(title: string): string | null {
  const m = title.match(/^(\d+(?:\.\d+)*)\.?\s/);
  return m ? m[1] : null;
}

interface Heading {
  level: number;
  title: string;
  id: string | null;
  /** The text under the heading, up to the next heading of any level; fenced blocks left out in Markdown. */
  body: string;
  /** Markdown's fenced blocks under it; HTML keeps its blocks in body, as multi-line <code>. */
  blocks: string[];
}

function htmlHeadings(text: string): Heading[] {
  const out: Heading[] = [];
  const all = [...text.matchAll(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi)];
  all.forEach((m, i) => {
    const id = m[2].match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
    const title = unescape(m[3].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    const end = (m.index ?? 0) + m[0].length;
    out.push({ level: Number(m[1]), title, id, body: text.slice(end, i + 1 < all.length ? all[i + 1].index : text.length), blocks: [] });
  });
  return out;
}

function markdownHeadings(text: string): Heading[] {
  const out: Heading[] = [];
  let fence: string | null = null;
  let block = '';
  for (const line of text.split('\n')) {
    const f = line.match(/^\s*(```+|~~~+)/);
    if (f) {
      if (!fence) {
        fence = f[1][0];
        block = '';
      } else if (f[1][0] === fence) {
        fence = null;
        if (out.length) out[out.length - 1].blocks.push(block);
      }
      continue;
    }
    if (fence) {
      block += line + '\n';
      continue;
    }
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (m) out.push({ level: m[1].length, title: m[2].replace(/[*_`]/g, ''), id: null, body: '', blocks: [] });
    else if (out.length) out[out.length - 1].body += line + '\n';
  }
  return out;
}

/** The sections of a design text, each with its own text: a heading with no id gives its text to the section above it. */
function parseDesign(text: string, file: string): { section: DesignSection; body: string; blocks: string[] }[] {
  const html = /\.html?$/i.test(file);
  const headings = html ? htmlHeadings(text) : markdownHeadings(text);
  const out: { section: DesignSection; body: string; blocks: string[] }[] = [];
  const stack: { section: DesignSection; body: string; blocks: string[] }[] = [];
  const seen = new Map<string, number>();
  for (const h of headings) {
    while (stack.length && stack[stack.length - 1].section.level >= h.level) stack.pop();
    let anchor = html ? h.id : slugOf(h.title);
    if (!anchor) {
      // an HTML heading with no id cannot be named, so it is no section; it still ends the ones above it
      if (stack.length) {
        stack[stack.length - 1].body += h.body;
        stack[stack.length - 1].blocks.push(...h.blocks);
      }
      continue;
    }
    if (!html) {
      // GitHub numbers a repeated slug: intro, intro-1, intro-2
      const n = seen.get(anchor) ?? 0;
      seen.set(anchor, n + 1);
      if (n) anchor = `${anchor}-${n}`;
    }
    const num = numberOf(h.title);
    const section: DesignSection = { file, anchor, aliases: num ? [num] : [], cite: html ? anchor : (num ?? anchor), level: h.level, title: h.title, parent: stack.length ? stack[stack.length - 1].section.anchor : null };
    const entry = { section, body: h.body, blocks: [...h.blocks] };
    out.push(entry);
    stack.push(entry);
  }
  return out;
}

/** The sections of one design file, in document order. Null when the file does not exist. */
export function designOutline(root: string, file: string): DesignSection[] | null {
  const abs = join(root, file);
  if (!fileExists(abs)) return null;
  return parseDesign(readText(abs), file).map((e) => e.section);
}

/** The keys of a block that reads as config (YAML, JSON, TOML): most of its lines are `key:` or `"key":`. Else none. */
function blockKeys(block: string): string[] {
  const lines = block.split('\n').map((l) => l.replace(/(^|\s)#.*$/, '')).filter((l) => l.trim() && !/^\s*[[\]{}],?\s*$/.test(l));
  // a line's keys: `key:` or `key =` at its start (YAML, TOML), and every `"key":` in it (JSON, also on one line)
  const per = lines.map((l) => [...new Set([l.match(/^\s*(?:-\s+)?["']?([A-Za-z_][\w.-]*)["']?\s*[:=](?:\s|$)/)?.[1], ...[...l.matchAll(/"([A-Za-z_][\w.-]*)"\s*:/g)].map((m) => m[1])].filter((k): k is string => !!k))]);
  const keyed = per.filter((k) => k.length).length;
  return keyed >= Math.max(1, lines.length / 2) && per.flat().length >= 2 ? per.flat() : [];
}

/** The design formats spex reads: Markdown and HTML. Plain text reads as Markdown. */
export const DESIGN_FORMAT = /\.(md|markdown|mdx|txt|html?)$/i;

/** How to turn a design of another format into Markdown beside it, for the fix of an error. */
export function convertHint(file: string): string {
  const md = file.replace(/\.[^./]+$/, '') + '.md';
  if (/\.(docx?|odt|rtf|epub)$/i.test(file)) return `Convert it, then cite the copy: pandoc -t gfm "${file}" -o "${md}".`;
  if (/\.(pdf|pptx?|xlsx?)$/i.test(file)) return `Convert it, then cite the copy: uvx markitdown "${file}" > "${md}". Then make each of its sections a # heading: spex reads sections from headings.`;
  return `Save it as Markdown (a Google Doc: File, Download, Markdown; Notion or Confluence: export to Markdown) as ${md}, and cite that.`;
}

/**
 * The names each section fixes in its own text: `code` in Markdown, <code> in HTML, and the keys of its config
 * blocks (YAML, JSON). A commit hash and a name longer than 60 characters are left out: nobody looks one up.
 */
export function designNames(root: string, file: string): Map<string, string[]> | null {
  const abs = join(root, file);
  if (!fileExists(abs)) return null;
  const html = /\.html?$/i.test(file);
  const out = new Map<string, string[]>();
  for (const { section, body, blocks } of parseDesign(readText(abs), file)) {
    const raw = html ? [...body.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '').matchAll(/<code\b[^>]*>([\s\S]*?)<\/code>/gi)].map((m) => unescape(m[1].replace(/<[^>]+>/g, ''))) : [...body.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
    const all = [...blocks, ...raw.filter((r) => r.includes('\n'))].flatMap(blockKeys);
    const names = new Set<string>();
    for (const r of [...raw.filter((x) => !x.includes('\n')), ...all]) {
      const n = r.replace(/\s+/g, ' ').trim(); // Markdown keeps `<run>` as it is
      if (n.length < 3 || n.length > 60 || !/[\p{L}\p{N}]/u.test(n) || /^[0-9a-f]{7,40}(…|\.\.\.)?$/i.test(n)) continue;
      names.add(n);
    }
    out.set(section.anchor, [...names]);
  }
  return out;
}

/** The section an anchor names: the anchor itself, an alias, or the one section whose slug starts with `<anchor>-`. */
export function resolveAnchor(sections: DesignSection[], anchor: string): DesignSection | null {
  const a = anchor.replace(/^#/, '').trim();
  const exact = sections.find((s) => s.anchor === a) ?? sections.find((s) => s.aliases.includes(a));
  if (exact) return exact;
  const prefix = sections.filter((s) => s.anchor.startsWith(`${a.toLowerCase()}-`));
  return prefix.length === 1 ? prefix[0] : null;
}

/** `file#anchor` → its parts. A bare `#anchor` takes the one design file when there is exactly one. */
export function splitRef(ref: string, files: string[]): { file: string | null; anchor: string | null } {
  const clean = ref.replace(/`/g, '').trim();
  const hash = clean.indexOf('#');
  const file = hash < 0 ? clean : clean.slice(0, hash);
  const anchor = hash < 0 ? null : clean.slice(hash + 1).trim() || null;
  if (file) return { file, anchor };
  return { file: files.length === 1 ? files[0] : null, anchor };
}
