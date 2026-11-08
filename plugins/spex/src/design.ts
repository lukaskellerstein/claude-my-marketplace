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
}

function htmlHeadings(text: string): Heading[] {
  const out: Heading[] = [];
  for (const m of text.matchAll(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi)) {
    const id = m[2].match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
    const title = unescape(m[3].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    out.push({ level: Number(m[1]), title, id });
  }
  return out;
}

function markdownHeadings(text: string): Heading[] {
  const out: Heading[] = [];
  let fence: string | null = null;
  for (const line of text.split('\n')) {
    const f = line.match(/^\s*(```+|~~~+)/);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      continue;
    }
    if (fence) continue;
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (m) out.push({ level: m[1].length, title: m[2].replace(/[*_`]/g, ''), id: null });
  }
  return out;
}

/** The sections of one design file, in document order. Null when the file does not exist. */
export function designOutline(root: string, file: string): DesignSection[] | null {
  const abs = join(root, file);
  if (!fileExists(abs)) return null;
  const text = readText(abs);
  const html = /\.html?$/i.test(file);
  const headings = html ? htmlHeadings(text) : markdownHeadings(text);
  const out: DesignSection[] = [];
  const stack: DesignSection[] = [];
  const seen = new Map<string, number>();
  for (const h of headings) {
    while (stack.length && stack[stack.length - 1].level >= h.level) stack.pop();
    let anchor = html ? h.id : slugOf(h.title);
    if (!anchor) continue; // an HTML heading with no id cannot be named, so it is no section; it still ends the ones above it
    if (!html) {
      // GitHub numbers a repeated slug: intro, intro-1, intro-2
      const n = seen.get(anchor) ?? 0;
      seen.set(anchor, n + 1);
      if (n) anchor = `${anchor}-${n}`;
    }
    const num = numberOf(h.title);
    const section: DesignSection = { file, anchor, aliases: num ? [num] : [], cite: html ? anchor : (num ?? anchor), level: h.level, title: h.title, parent: stack.length ? stack[stack.length - 1].anchor : null };
    out.push(section);
    stack.push(section);
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
