// A small glob matcher for write allowlists: `**`, `*`, `?`. No dependency, no surprises.

export function globToRegex(pattern: string): RegExp {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        re += '.*';
        i++;
        if (pattern[i + 1] === '/') i++;
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

export function isGlob(pattern: string): boolean {
  return /[*?]/.test(pattern);
}

/** A path matches a pattern when equal, when the pattern is a folder prefix, or when the glob matches. */
export function pathMatches(pattern: string, path: string): boolean {
  if (pattern === path) return true;
  if (pattern.endsWith('/') && path.startsWith(pattern)) return true;
  if (isGlob(pattern)) return globToRegex(pattern).test(path);
  return false;
}

function literalPrefix(pattern: string): string {
  const i = pattern.search(/[*?]/);
  return i < 0 ? pattern : pattern.slice(0, i);
}

/** Two allowlist entries overlap when one could name a file the other names. */
export function patternsOverlap(a: string, b: string): boolean {
  if (pathMatches(a, b) || pathMatches(b, a)) return true;
  if (isGlob(a) || isGlob(b)) {
    const pa = literalPrefix(a);
    const pb = literalPrefix(b);
    return pa.startsWith(pb) || pb.startsWith(pa);
  }
  return false;
}

export function underAny(path: string, prefixes: string[]): string | null {
  for (const p of prefixes) {
    const norm = p.endsWith('/') ? p : p + '/';
    if (path === p || path.startsWith(norm) || (isGlob(p) && globToRegex(p).test(path))) return p;
    if (isGlob(path) && literalPrefix(path).startsWith(norm)) return p;
  }
  return null;
}
