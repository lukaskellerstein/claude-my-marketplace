#!/usr/bin/env node
// Validates demo/storyboard.json. Hand-rolled (no ajv) so it runs from a hook with
// zero installed dependencies.
//
// Errors exit 1 -> the calling hook exits 2 -> Claude is shown the list and fixes it.
// Warnings print and exit 0.
//
// The point of this validator is that timing mistakes are silent until they are
// expensive. A section budgeted 8 seconds with 45 words of narration cannot work, and
// the cheapest moment to learn that is the moment the storyboard is written.

import { readFileSync } from 'node:fs';

const WPS_MIN = 1.6; // below this the narration is too sparse for the time on screen
const WPS_MAX = 3.0; // above this it is rushed
const WPS_HARD_MIN = 1.1;
const WPS_HARD_MAX = 3.6;

const ACTION_KINDS = new Set([
  'goto', 'click', 'dblclick', 'hover', 'type', 'press', 'scroll', 'selectText',
  'waitFor', 'dwell', 'drag', 'select', 'upload', 'menu', 'window', 'shortcut', 'eval',
]);
const BEATS = new Set(['hook', 'problem', 'core-flow', 'wow', 'integration', 'proof', 'close']);
const SURFACES = new Set(['web', 'electron', 'still', 'code', 'titlecard']);
const CAPTURED = new Set(['web', 'electron']);
const DRIVERS = new Set(['mcp', 'launch', 'attach']);
const RECORDERS = new Set(['playwright', 'obs', 'ffmpeg']);
const INPUTS = new Set(['cdp', 'dom']);

// Phrases that make a demo sound like every other demo. Hard-banned ones are the
// tells that a human never says out loud.
const BANNED = [
  'as you can see', 'in this video', "let's dive in", 'let us dive in', 'game-changer',
  'game changer', 'revolutioniz', 'unleash', 'supercharge', 'look no further',
];
const DISCOURAGED = [
  'simply', 'just click', 'powerful', 'seamless', 'effortless', 'cutting-edge',
  'state-of-the-art', 'robust', 'leverage', 'utilize', 'best-in-class', 'next-level',
];

const file = process.argv[2];
if (!file) {
  console.error('usage: validate-storyboard.mjs <storyboard.json> [--project DIR]');
  process.exit(1);
}

const errors = [];
const warnings = [];

let sb;
try {
  sb = JSON.parse(readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`demo-video: storyboard.json is not valid JSON — ${err.message}`);
  process.exit(1);
}

// ── meta ───────────────────────────────────────────────────────────────────────
const meta = sb.meta ?? {};
if (!meta.title) errors.push('meta.title is required.');
if (!meta.audience) {
  errors.push(
    'meta.audience is required — every narration decision depends on who is watching and what they are deciding.'
  );
}
const target = Number(meta.targetSeconds || 0);
if (!target) errors.push('meta.targetSeconds is required.');
if (meta.fps && ![24, 25, 30, 60].includes(meta.fps)) {
  errors.push(`meta.fps ${meta.fps} is not one of 24, 25, 30, 60.`);
}
for (const key of ['captureSize', 'outputSize']) {
  if (meta[key] && !/^\d{3,4}x\d{3,4}$/.test(meta[key])) {
    errors.push(`meta.${key} must look like 1600x900, got "${meta[key]}".`);
  }
}

// ── meta.capture: who drives the app, and what records it ─────────────────────
const capture = meta.capture ?? {};
if (meta.capture !== undefined) {
  if (capture.driver && !DRIVERS.has(capture.driver)) {
    errors.push(`meta.capture.driver "${capture.driver}" is not one of ${[...DRIVERS].join(', ')}.`);
  }
  if (capture.recorder && !RECORDERS.has(capture.recorder)) {
    errors.push(`meta.capture.recorder "${capture.recorder}" is not one of ${[...RECORDERS].join(', ')}.`);
  }
  if (capture.input && !INPUTS.has(capture.input)) {
    errors.push(`meta.capture.input "${capture.input}" is not one of ${[...INPUTS].join(', ')}.`);
  }
  if (capture.driver === 'attach') {
    if (!/^https?:\/\/[^\s]+$/.test(String(capture.attach ?? ''))) {
      errors.push('meta.capture.driver "attach" needs meta.capture.attach — the CDP endpoint, e.g. "http://127.0.0.1:9222".');
    }
    if (capture.recorder === 'playwright') {
      errors.push('Playwright cannot record a browser it attached to — use meta.capture.recorder "obs" with driver "attach".');
    }
  }
  if (capture.driver === 'mcp' && capture.recorder && capture.recorder !== 'playwright') {
    warnings.push('meta.capture: the demo-playwright MCP browser is headless, so OBS or ffmpeg has no window to record. Use driver "launch" or "attach".');
  }
  if (capture.recorder === 'obs' && !capture.obs?.window) {
    warnings.push(
      'meta.capture.recorder is "obs" but meta.capture.obs.window is unset, so OBS records whatever its scene shows. ' +
        'Set it to part of the window title so every take re-points the capture.'
    );
  }
  if (capture.windowSize && !/^\d{3,4}x\d{3,4}$/.test(capture.windowSize)) {
    errors.push(`meta.capture.windowSize must look like 1600x900, got "${capture.windowSize}".`);
  }
}

// ── meta.fcp: the Final Cut Pro export ─────────────────────────────────────────
if (meta.fcp !== undefined) {
  for (const key of ['titleTemplate', 'lowerThirdTemplate', 'projectName', 'captionLanguage']) {
    if (meta.fcp[key] !== undefined && typeof meta.fcp[key] !== 'string') errors.push(`meta.fcp.${key} must be a string.`);
  }
  if (meta.fcp.version !== undefined && !/^1\.\d{1,2}$/.test(String(meta.fcp.version))) {
    errors.push(`meta.fcp.version must look like "1.14", got "${meta.fcp.version}".`);
  }
}

// ── sections ───────────────────────────────────────────────────────────────────
const sections = Array.isArray(sb.sections) ? sb.sections : [];
if (sections.length < 2) errors.push('A demo needs at least 2 sections.');

const seen = new Set();
let sumTarget = 0;

sections.forEach((s, i) => {
  const at = `sections[${i}]${s?.id ? ` (${s.id})` : ''}`;

  if (!s.id) errors.push(`${at}: id is required.`);
  else {
    if (!/^\d{2}-[a-z0-9][a-z0-9-]*$/.test(s.id)) {
      errors.push(`${at}: id must be a zero-padded ordinal plus a slug, e.g. "03-search".`);
    }
    if (seen.has(s.id)) errors.push(`${at}: duplicate id "${s.id}".`);
    seen.add(s.id);
    const ordinal = Number(s.id.slice(0, 2));
    if (ordinal !== i + 1) {
      warnings.push(
        `${at}: id ordinal ${ordinal} does not match its position ${i + 1}. Renumber so file names sort in play order.`
      );
    }
  }

  if (!BEATS.has(s.beat)) errors.push(`${at}: beat "${s.beat}" is not one of ${[...BEATS].join(', ')}.`);
  if (!s.title) errors.push(`${at}: title is required (it is also the video chapter name).`);
  if (!SURFACES.has(s.surface)) {
    errors.push(`${at}: surface "${s.surface}" is not one of ${[...SURFACES].join(', ')}.`);
  }

  const secs = Number(s.targetSeconds || 0);
  if (!secs) errors.push(`${at}: targetSeconds is required.`);
  sumTarget += secs;
  if (secs > 25) {
    warnings.push(
      `${at}: ${secs}s is a long single beat. Viewers disengage; consider splitting it into two sections.`
    );
  }

  // Narration pacing — the single most common cause of an unusable timeline.
  const vo = String(s.voiceover ?? '');
  if (s.voiceover === undefined) errors.push(`${at}: voiceover is required (use "" for a deliberately silent beat).`);
  const words = vo.trim() ? vo.trim().split(/\s+/).length : 0;
  if (words && secs) {
    const wps = words / secs;
    const suggested = Math.round(secs * 2.3);
    if (wps < WPS_HARD_MIN || wps > WPS_HARD_MAX) {
      errors.push(
        `${at}: ${words} words in ${secs}s is ${wps.toFixed(2)} words/sec — unusable. ` +
          `Aim for ~${suggested} words, or change targetSeconds to ~${Math.ceil(words / 2.3)}s.`
      );
    } else if (wps < WPS_MIN || wps > WPS_MAX) {
      warnings.push(
        `${at}: ${wps.toFixed(2)} words/sec (${words} words in ${secs}s). Comfortable is 1.6-3.0; ` +
          `~${suggested} words would sit in the middle.`
      );
    }
  }

  const lower = vo.toLowerCase();
  for (const phrase of BANNED) {
    if (lower.includes(phrase)) {
      errors.push(`${at}: narration contains "${phrase}" — banned demo filler. Say what changed for the user instead.`);
    }
  }
  for (const phrase of DISCOURAGED) {
    if (lower.includes(phrase)) {
      warnings.push(`${at}: narration contains "${phrase}" — vague marketing word, prefer a concrete claim.`);
    }
  }
  if (/\b(click|clicking|press|pressing|tap)\b/i.test(vo) && s.beat !== 'problem') {
    warnings.push(
      `${at}: narration describes the interaction ("click"/"press"). The picture already shows that — narrate why it matters.`
    );
  }
  if (words > 12 && (vo.match(/\band\b/gi) || []).length >= 3) {
    warnings.push(`${at}: narration stacks several claims. One idea per section reads better; consider splitting.`);
  }

  // Captured sections need executable intent and a gradeable outcome.
  if (CAPTURED.has(s.surface)) {
    if (!Array.isArray(s.actions) || s.actions.length === 0) {
      errors.push(`${at}: surface "${s.surface}" needs at least one action to capture.`);
    }
    if (!s.successCriteria) {
      errors.push(
        `${at}: successCriteria is required for captured sections — the frame critic grades the take against it.`
      );
    }
  }
  if (s.surface === 'still' && !s.still) errors.push(`${at}: surface "still" requires a still path.`);
  if (s.surface === 'code' && !String(s.code?.content ?? '').trim()) {
    errors.push(
      `${at}: surface "code" requires code.content — paste the literal snippet. ` +
        'Nothing reads code.file from disk at render time; without content the section renders blank.'
    );
  }

  if (s.setup !== undefined && !Array.isArray(s.setup)) {
    errors.push(`${at}: setup must be an array of actions (they run before recording starts).`);
  }

  const checkAction = (a, aat) => {
    if (!ACTION_KINDS.has(a.kind)) {
      errors.push(`${aat}: unknown kind "${a.kind}". Allowed: ${[...ACTION_KINDS].join(', ')}.`);
      return;
    }
    if (a.kind === 'goto' && !a.path) errors.push(`${aat}: goto requires path.`);
    if (a.kind === 'type' && !a.text) errors.push(`${aat}: type requires text.`);
    if (a.kind === 'press' && !a.key) errors.push(`${aat}: press requires key.`);
    if (['click', 'dblclick', 'hover', 'type', 'select', 'drag', 'upload'].includes(a.kind) && !a.target) {
      errors.push(`${aat}: ${a.kind} requires target (a human description the operator resolves from the snapshot).`);
    }
    if (a.kind === 'scroll' && a.by === undefined) errors.push(`${aat}: scroll requires by (pixels).`);
    if (a.kind === 'selectText' && !String(a.text ?? '').trim()) {
      errors.push(`${aat}: selectText requires text — the exact passage to select, as rendered.`);
    }
    if (a.in !== undefined && (!Array.isArray(a.in) || !a.in.length || a.in.some((x) => typeof x !== 'string'))) {
      errors.push(`${aat}: in must be a non-empty array of CSS selectors (shadow hosts and iframes, outermost first).`);
    }
    if (a.input !== undefined && !INPUTS.has(a.input)) errors.push(`${aat}: input "${a.input}" is not one of cdp, dom.`);
    if (a.state !== undefined && !['visible', 'hidden'].includes(a.state)) {
      errors.push(`${aat}: state must be "visible" or "hidden".`);
    }
    if (a.compress !== undefined) {
      if (a.kind !== 'waitFor' || a.compress !== 'pause') {
        errors.push(`${aat}: compress is only "pause", and only on waitFor.`);
      } else if (capture.recorder !== 'obs') {
        warnings.push(`${aat}: compress "pause" needs meta.capture.recorder "obs"; with another recorder the wait stays in the clip.`);
      }
    }
  };
  (s.setup ?? []).forEach((a, j) => checkAction(a, `${at}.setup[${j}]`));
  (s.actions ?? []).forEach((a, j) => checkAction(a, `${at}.actions[${j}]`));

  if (s.camera?.to !== undefined && (s.camera.to < 1 || s.camera.to > 1.6)) {
    warnings.push(`${at}: camera.to ${s.camera.to} is outside 1.0-1.6; heavy zoom on a screen recording looks soft.`);
  }
  if (s.transitionIn?.seconds !== undefined && s.transitionIn.seconds > 0.8) {
    warnings.push(`${at}: a ${s.transitionIn.seconds}s transition is slow for a demo; 0.3-0.5s reads better.`);
  }
});

// ── narrative shape ────────────────────────────────────────────────────────────
if (sections.length) {
  const first = sections[0];
  if (first && !['hook', 'problem'].includes(first.beat)) {
    warnings.push(
      `sections[0] opens with beat "${first.beat}". Opening on the viewer's problem or a hook holds attention far better than opening on a feature.`
    );
  }
  const last = sections[sections.length - 1];
  if (last && last.beat !== 'close') {
    warnings.push(`The last section is beat "${last.beat}", not "close". End with what the viewer should do next.`);
  }
  if (!sections.some((s) => s.beat === 'core-flow')) {
    errors.push('No section has beat "core-flow". A demo with no core flow does not demonstrate the product.');
  }
  if (!sections.some((s) => s.beat === 'wow')) {
    warnings.push('No "wow" beat. Most demos need one moment that earns a reaction, or they read as a feature tour.');
  }
}

// ── total budget ───────────────────────────────────────────────────────────────
if (target && sumTarget) {
  const drift = (sumTarget - target) / target;
  const pct = (drift * 100).toFixed(0);
  if (Math.abs(drift) > 0.25) {
    errors.push(
      `Section durations sum to ${sumTarget.toFixed(1)}s but meta.targetSeconds is ${target}s (${pct}% off). ` +
        'Rebalance the sections or change the target.'
    );
  } else if (Math.abs(drift) > 0.1) {
    warnings.push(`Sections sum to ${sumTarget.toFixed(1)}s vs target ${target}s (${pct}% off).`);
  }
}

// ── cost estimate, so the narrative gate can be an informed decision ──────────
const totalWords = sections.reduce(
  (n, s) => n + (String(s.voiceover ?? '').trim() ? String(s.voiceover).trim().split(/\s+/).length : 0),
  0
);
const estChars = sections.reduce((n, s) => n + String(s.voiceover ?? '').length, 0);

if (errors.length) {
  console.error(
    [
      `demo-video: storyboard.json has ${errors.length} error(s) — fix before capture or narration.`,
      ...errors.map((e) => `  ERROR  ${e}`),
      ...warnings.map((w) => `  warn   ${w}`),
    ].join('\n')
  );
  process.exit(1);
}

const summary = [
  `demo-video: storyboard valid — ${sections.length} sections, ${sumTarget.toFixed(1)}s planned ` +
    `(target ${target}s), ${totalWords} narration words, ~${estChars} ElevenLabs characters.`,
];
if (warnings.length) summary.push(...warnings.map((w) => `  warn   ${w}`));
console.log(summary.join('\n'));
