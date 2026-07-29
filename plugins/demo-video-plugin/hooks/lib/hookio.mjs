// Shared helpers for demo-video-plugin hooks.
// Hooks receive a JSON payload on stdin and communicate back via stdout JSON
// (informational) or exit code 2 + stderr (Claude must read and act on it).

import { execFileSync } from 'node:child_process';
import { accessSync, constants, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

export async function readHookInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function projectDir(input) {
  return input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

export function demoDir(input) {
  return join(projectDir(input), 'demo');
}

/** Informational context that Claude sees but that does not block anything. */
export function emitContext(hookEventName, additionalContext) {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext } })
  );
  process.exit(0);
}

/** Blocking feedback: Claude is shown the message and expected to fix it. */
export function fail(message) {
  process.stderr.write(message.endsWith('\n') ? message : `${message}\n`);
  process.exit(2);
}

export function silent() {
  process.exit(0);
}

/** PATH lookup without spawning a shell — hooks must not emit stray stderr. */
export function which(bin) {
  const dirs = (process.env.PATH || '').split(':').filter(Boolean);
  for (const dir of dirs) {
    try {
      accessSync(join(dir, bin), constants.X_OK);
      return true;
    } catch {
      /* keep looking */
    }
  }
  return false;
}

export function run(bin, args, opts = {}) {
  return execFileSync(bin, args, { encoding: 'utf8', stdio: 'pipe', ...opts });
}

/** ffprobe a media file -> { durationSeconds, width, height, fps, hasAudio }. */
export function probe(file) {
  const out = run('ffprobe', [
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    file,
  ]);
  const data = JSON.parse(out);
  const video = (data.streams || []).find((s) => s.codec_type === 'video');
  const audio = (data.streams || []).find((s) => s.codec_type === 'audio');

  // format.duration is the reliable one for the transcoded output; a webm straight out
  // of Playwright often reports a container/stream duration that is simply wrong.
  const durationSeconds = Number(
    data.format?.duration ?? video?.duration ?? audio?.duration ?? 0
  );

  let fps = null;
  if (video?.avg_frame_rate && video.avg_frame_rate !== '0/0') {
    const [n, d] = video.avg_frame_rate.split('/').map(Number);
    if (d) fps = n / d;
  }

  return {
    durationSeconds: Number(durationSeconds.toFixed(3)),
    width: video?.width ?? null,
    height: video?.height ?? null,
    fps: fps ? Number(fps.toFixed(3)) : null,
    codec: video?.codec_name ?? audio?.codec_name ?? null,
    hasAudio: Boolean(audio),
  };
}

/** Newest file with one of `exts` under `dir` (recursive, shallow depth 2). */
export function newestFile(dir, exts, maxAgeMs = 10 * 60 * 1000) {
  if (!existsSync(dir)) return null;
  const candidates = [];
  const walk = (d, depth) => {
    if (depth > 2) return;
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p, depth + 1);
      else if (exts.some((e) => entry.name.toLowerCase().endsWith(e))) {
        const st = statSync(p);
        candidates.push({ path: resolve(p), mtimeMs: st.mtimeMs, size: st.size });
      }
    }
  };
  walk(dir, 0);
  const fresh = candidates
    .filter((c) => Date.now() - c.mtimeMs < maxAgeMs)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return fresh[0] ?? null;
}
