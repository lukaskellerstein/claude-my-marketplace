// File and YAML helpers. YAML is loaded with the core schema on purpose: `no` stays a string and a
// date stays a string, so the only implicit type left is a number, and the schemas demand strings
// where a number would be a mistake ("007").

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { parse, parseDocument, type Document } from 'yaml';
import type { Finding } from './types.js';

export const YAML_OPTS = { schema: 'core' as const, strict: true };

export function readText(path: string): string {
  return readFileSync(path, 'utf8');
}

export function fileExists(path: string): boolean {
  return existsSync(path);
}

export function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function writeText(path: string, text: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, text);
}

export function bytes(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

/** Parse YAML. On failure returns a finding instead of throwing, so one broken file is one finding. */
export function loadYaml(path: string, code: string): { data?: unknown; finding?: Finding } {
  let text: string;
  try {
    text = readText(path);
  } catch (e) {
    return { finding: { severity: 'error', code, message: `cannot read ${path}: ${(e as Error).message}`, path } };
  }
  try {
    const data = parse(text, YAML_OPTS);
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return { finding: { severity: 'error', code, message: `${path} is empty or not a mapping`, path, fix: 'The file must be a YAML mapping with the fields the schema lists.' } };
    }
    return { data };
  } catch (e) {
    return { finding: { severity: 'error', code, message: `${path} does not parse: ${(e as Error).message}`, path, fix: 'Fix the YAML syntax. Quote strings that contain a colon or start with a backtick.' } };
  }
}

/** Open a YAML file as a document, so an edit keeps comments and layout. */
export function openDocument(path: string): Document.Parsed {
  return parseDocument(readText(path), YAML_OPTS);
}

export function saveDocument(path: string, doc: Document): void {
  writeText(path, doc.toString({ lineWidth: 0, flowCollectionPadding: false }));
}

/** Walk a directory and return repo-relative file paths. Skips node_modules and dot folders. */
export function walk(root: string, dir: string, out: string[] = []): string[] {
  if (!isDir(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(root, full, out);
    else out.push(toPosix(relative(root, full)));
  }
  return out;
}

export function toPosix(p: string): string {
  return p.split(sep).join('/');
}

export function abs(root: string, p: string): string {
  return resolve(root, p);
}

export function lineCount(text: string): number {
  if (text.length === 0) return 0;
  return text.split('\n').length;
}
