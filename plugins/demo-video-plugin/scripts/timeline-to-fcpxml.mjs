#!/usr/bin/env node
// timeline-to-fcpxml.mjs — demo/timeline.json -> a Final Cut Pro project (FCPXML).
//
// The second finish. Remotion renders the measured timeline headlessly; this exports the
// SAME timeline as an editable FCP project, dressed with the Motion templates installed on
// this Mac — FCP's own, and MotionVFX DesignStudio elements downloaded through mExtension —
// so a human can finish it and fine-tune by hand. Nothing is re-timed here: every frame
// position comes from reconcile.mjs.
//
// Layout, chosen so every time in the file is absolute and no retime arithmetic leaks into
// anchoring:
//
//   primary storyline   one gap, the length of the video
//     lane  4+          graphics overlays (sections[].fcp.overlays), one lane per overlap
//     lane  3           captions (iTT)
//     lane  2           lower thirds (lowerThirdTemplate), and title cards that have a
//                       background — never both in one section
//     lane  1           connected storyline: clips with their effects, title cards or their
//                       backgrounds, transitions
//
// Nothing is ever anchored to an item inside the lane-1 storyline: FCP ignores such items on
// import, although the DTD allows them.
//     lane -1           narration, role dialogue
//     lane -2           music bed, role music, with ducking keyframes
//   chapter markers     one per section, which FCP also exports as YouTube chapters
//
// A MotionVFX element that was never downloaded is a placeholder that renders "The file is
// missing". The export refuses to write a file that names one, and prints what to download.
//
// In FCP, select the lane-1 storyline and choose Edit → Overwrite to Primary Storyline if
// you prefer to edit on the primary.
//
// --probe writes a short version of the same document instead: a few seconds of real footage
// with every Motion template the storyboard names, each text layer filled with a sentinel.
// Import that first. A file can validate against FCP's own DTD and still import with warnings
// or mean something else — only Final Cut Pro can tell you, and a 10-second probe tells you in
// a minute instead of after a full export.
//
// usage: node timeline-to-fcpxml.mjs [--project DIR] [--out PATH] [--version 1.14] [--no-validate]
//        node timeline-to-fcpxml.mjs --probe [--probe-seconds 6]

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fcpxmlVersions, inspectTemplate, resolveTemplate } from './lib/fcp.mjs';
import { DAILY_DOWNLOAD_LIMIT } from './lib/motionvfx.mjs';

const CROSS_DISSOLVE_UID = 'FxPlug:4731E73A-8DAC-4113-9A30-AE85B1761265';
const DUCK_RAMP_FRAMES = 6;

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const projectDir = resolve(argOf('--project', process.cwd()));
const demoDir = join(projectDir, 'demo');
const isProbe = args.includes('--probe');
const outPath = resolve(argOf('--out', join(demoDir, 'out', isProbe ? 'probe.fcpxml' : 'demo.fcpxml')));

const readJson = (p, what) => {
  if (!existsSync(p)) {
    console.error(`demo-video: no ${what} at ${p}.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(p, 'utf8'));
};
let timeline = readJson(join(demoDir, 'timeline.json'), 'timeline (run reconcile.mjs first)');
const storyboard = readJson(join(demoDir, 'storyboard.json'), 'storyboard');
const fcpMeta = storyboard.meta?.fcp ?? {};

const installed = fcpxmlVersions();
const version = argOf('--version', fcpMeta.version ?? installed[0]?.version ?? '1.14');

// ── The probe ──────────────────────────────────────────────────────────────────
/**
 * A short timeline that names every Motion template the storyboard does, over real footage,
 * with a sentinel in every text layer. Built here and exported by the code below, so it tests
 * the exporter and not a second implementation of it.
 *
 * Sentinels look like FB5S#0 and FB5S#1. After importing, export the project back out of FCP:
 * the sentinels say which text layer FCPXML filled, and the parameters say what FCP kept.
 */
function probeTimeline(tl, sb) {
  const rate = tl.fps;
  const distinct = (names) => [...new Set(names.filter((n) => n && n !== 'none'))];
  const sections = sb.sections ?? [];
  const meta = sb.meta?.fcp ?? {};
  const titles = distinct([meta.titleTemplate, ...sections.map((s) => s.fcp?.titleTemplate)]);
  const backgrounds = distinct([meta.backgroundTemplate, ...sections.map((s) => s.fcp?.backgroundTemplate)]);
  const lowerThirds = distinct([meta.lowerThirdTemplate, ...sections.map((s) => s.fcp?.lowerThirdTemplate)]);
  const transitions = distinct([meta.transitionTemplate, ...sections.map((s) => s.fcp?.transitionTemplate)]);
  const effects = distinct(sections.flatMap((s) => s.fcp?.effects ?? []));
  // Overlays come from the timeline, not the storyboard: reconcile has already turned
  // position "action" into pixels and `at` into frames, and those are what we want to test.
  const overlaySpecs = [...new Map(tl.sections.flatMap((s) => s.fcp?.overlays ?? []).filter((o) => o?.template).map((o) => [o.template, o])).values()];

  /** One sentinel per text layer the template actually has, so the round-trip is readable. */
  const sentinels = (name) => {
    const { template: t } = resolveTemplate(name, { kind: ['title', 'generator'] });
    if (!t || t.status !== 'ready') return ['PROBE#0'];
    // A template with no text layer gets no text: an ignored <text> proves nothing.
    return Array.from({ length: inspectTemplate(t.path).texts.length }, (_, i) => `${t.code ?? 'PROBE'}#${i}`);
  };

  const source = tl.sections.find((s) => s.video);
  if (!source) {
    console.error('demo-video: the probe needs one captured clip, and this timeline has none.');
    process.exit(1);
  }
  const wanted = Math.round(Number(argOf('--probe-seconds', 6)) * rate);
  const clipFrames = Math.max(rate, Math.min(wanted, source.video.videoFrames ?? wanted));

  // Everything that is not the first title card, background or transition rides the clip as an
  // overlay: an overlay takes any title or generator, so one pass covers every remaining slot.
  const extras = [...overlaySpecs.map((o) => ({ template: o.template, position: o.position })), ...titles.slice(1).map((t) => ({ template: t })), ...backgrounds.slice(1).map((t) => ({ template: t })), ...lowerThirds.slice(1).map((t) => ({ template: t }))];
  const step = Math.max(1, Math.floor(clipFrames / (extras.length + 1)));
  const overlays = extras.map((o, i) => ({
    template: o.template,
    inFrame: Math.min(i * step, clipFrames - 1),
    durationFrames: Math.max(rate, clipFrames - i * step),
    text: sentinels(o.template),
    position: o.position,
  }));

  const transitionFrames = transitions.length ? Math.round(0.8 * rate) : 0;
  const cardFrames = Math.round(5 * rate);
  const clip = {
    ...source,
    id: 'probe-clip',
    title: 'Probe — clip, lower third, overlays, effects',
    startFrame: 0,
    durationInFrames: clipFrames,
    transitionIn: { kind: 'cut', frames: 0 },
    camera: { kind: 'static' },
    captions: [],
    audio: null,
    video: { ...source.video, videoFrames: clipFrames, playbackRate: 1, holdLastFrameFrames: 0 },
    lowerThird: lowerThirds.length ? { inFrame: 0, outFrame: clipFrames, text: sentinels(lowerThirds[0])[0] ?? 'PROBE#0' } : null,
    fcp: { lowerThirdTemplate: lowerThirds[0], lowerThirdText: lowerThirds.length ? sentinels(lowerThirds[0]) : undefined, effects, overlays },
  };
  const card = {
    id: 'probe-card',
    beat: 'close',
    title: 'Probe — title card and background',
    surface: 'titlecard',
    startFrame: clipFrames,
    durationInFrames: cardFrames,
    transitionIn: { kind: transitionFrames ? 'crossfade' : 'cut', frames: transitionFrames },
    captions: [],
    fcp: { titleTemplate: titles[0], backgroundTemplate: backgrounds[0], text: titles.length ? sentinels(titles[0]) : ['PROBE#0'] },
  };

  return {
    ...tl,
    title: `${tl.title ?? 'Demo'} — probe`,
    durationInFrames: clipFrames + cardFrames,
    captionsMode: 'none',
    music: null,
    sections: [clip, card],
    probe: { transitionsCovered: transitions.slice(0, 1), transitionsNotCovered: transitions.slice(1) },
  };
}

if (isProbe) timeline = probeTimeline(timeline, storyboard);

const { fps, width, height } = timeline;
const notes = [];

// ── Time: every value is a rational number of seconds, on a frame boundary ─────
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const ratio = (num, den) => {
  if (num === 0) return '0s';
  const g = gcd(num, den);
  return den / g === 1 ? `${num / g}s` : `${num / g}/${den / g}s`;
};
const frames = (n) => ratio(Math.round(n), fps);
const seconds = (s, den = fps * 1000) => ratio(Math.round(s * den), den);

// ── XML ────────────────────────────────────────────────────────────────────────
const esc = (v) =>
  String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attrs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join('');
const el = (name, a = {}, children = []) => {
  const inner = children.filter(Boolean);
  return inner.length ? `<${name}${attrs(a)}>${inner.join('')}</${name}>` : `<${name}${attrs(a)}/>`;
};

// ── Resources ──────────────────────────────────────────────────────────────────
const resources = [];
let nextId = 1;
const newId = () => `r${nextId++}`;
let nextStyle = 1;

const formatIds = new Map();
function formatFor(w, h, rateless = false) {
  const key = `${w}x${h}${rateless ? '-still' : ''}`;
  if (formatIds.has(key)) return formatIds.get(key);
  const id = newId();
  const named = !rateless && w === 1920 && h === 1080 ? `FFVideoFormat1080p${fps}` : undefined;
  resources.push(
    el('format', {
      id,
      name: rateless ? 'FFVideoFormatRateUndefined' : named,
      frameDuration: rateless ? undefined : frames(1),
      width: w,
      height: h,
      colorSpace: '1-1-1 (Rec. 709)',
    })
  );
  formatIds.set(key, id);
  return id;
}

function probe(rel) {
  const abs = join(demoDir, rel);
  if (!existsSync(abs)) throw new Error(`${rel} is in the timeline but not on disk`);
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,channels,sample_rate', '-of', 'json', abs],
    { encoding: 'utf8' }
  );
  const data = JSON.parse(out);
  const video = data.streams.find((s) => s.codec_type === 'video');
  const audio = data.streams.find((s) => s.codec_type === 'audio');
  return { abs, duration: Number(data.format?.duration ?? 0), video, audio };
}

const assetIds = new Map();
function assetFor(rel, kind) {
  if (assetIds.has(rel)) return assetIds.get(rel);
  const p = probe(rel);
  const id = newId();
  const src = el('media-rep', { kind: 'original-media', src: pathToFileURL(p.abs).href });
  const name = rel.split('/').pop();
  if (kind === 'still') {
    resources.push(
      el('asset', { id, name, start: '0s', duration: '0s', hasVideo: 1, videoSources: 1, format: formatFor(p.video.width, p.video.height, true) }, [src])
    );
  } else if (kind === 'video') {
    resources.push(
      el(
        'asset',
        {
          id,
          name,
          start: '0s',
          duration: frames(Math.round(p.duration * fps)),
          hasVideo: 1,
          videoSources: 1,
          format: formatFor(p.video.width, p.video.height),
        },
        [src]
      )
    );
  } else {
    const rate = Number(p.audio?.sample_rate ?? 48000);
    resources.push(
      el(
        'asset',
        {
          id,
          name,
          start: '0s',
          duration: seconds(p.duration, rate),
          hasAudio: 1,
          audioSources: 1,
          audioChannels: p.audio?.channels ?? 2,
          audioRate: rate,
        },
        [src]
      )
    );
  }
  const entry = { id, duration: p.duration, frames: Math.round(p.duration * fps) };
  assetIds.set(rel, entry);
  return entry;
}

const effectIds = new Map();
function effectFor(name, uid) {
  if (effectIds.has(uid)) return effectIds.get(uid);
  const id = newId();
  resources.push(el('effect', { id, name, uid }));
  effectIds.set(uid, id);
  return id;
}

// ── Motion templates ───────────────────────────────────────────────────────────
const downloads = new Map(); // placeholder name -> where the timeline names it

/**
 * A template for one slot: { id, t } when it is downloaded; null when the slot is empty or
 * the template is not on this Mac (with a note). A placeholder is remembered for the download
 * list — the export stops before writing anything.
 */
function template(name, kind, where, instead = 'skipped') {
  if (!name || name === 'none') return null;
  const { template: t, status } = resolveTemplate(name, { kind });
  if (status === 'placeholder') {
    downloads.set(t.name, [...(downloads.get(t.name) ?? []), where]);
    return { id: null, t };
  }
  if (!t) {
    notes.push(`${where}: no ${[kind].flat().join(' or ')} template "${name}" on this Mac; ${instead}`);
    return null;
  }
  return { id: effectFor(t.name, t.uid), t };
}

function titleOr(name, fallback, where, kind = 'title') {
  const hit = template(name, kind, where, `used "${fallback}"`);
  if (hit) return hit;
  const base = resolveTemplate(fallback, { kind: 'title' }).template;
  if (!base) throw new Error(`"${fallback}" is not installed — run fcp-templates.mjs --list --kind title`);
  return { id: effectFor(base.name, base.uid), t: base };
}

const inspected = new Map();
const info = (t) => {
  if (t.status !== 'ready') return null;
  if (!inspected.has(t.path)) inspected.set(t.path, inspectTemplate(t.path));
  return inspected.get(t.path);
};
/** The template's own length in timeline frames — a Motion template's natural duration. */
const ownFrames = (t) => Math.round((info(t)?.seconds ?? 0) * fps);

const ANCHOR_POINTS = {
  center: [0.5, 0.5], top: [0.5, 0.25], bottom: [0.5, 0.75], left: [0.25, 0.5], right: [0.75, 0.5],
  'top-left': [0.25, 0.25], 'top-right': [0.75, 0.25], 'bottom-left': [0.25, 0.75], 'bottom-right': [0.75, 0.75],
};
const round4 = (v) => Number(v.toFixed(4));

/**
 * Move a template's design centre to a point in output pixels. Returns the <param>s and the
 * <adjust-transform> to write — never both.
 *
 * Most MotionVFX templates draw the picture underneath into their own frame, so moving the
 * whole title with adjust-transform drags a copy of the footage along and leaves black behind.
 * Their mOSC "Content Position" moves only the element: normalized to the template scene, y up,
 * the scene fitted to the frame by height — measured in FCP against a grid. One that draws the
 * footage but has no mOSC control stays where its designer put it.
 */
function placement(t, position, where) {
  if (position === undefined || position === 'center') return { params: [], transform: null };
  if (!Array.isArray(position) && !ANCHOR_POINTS[position]) {
    // reconcile turns "action" into pixels; anything else here never reached it.
    notes.push(`${where}: position "${position}" is not a point or an anchor — left where the design puts it`);
    return { params: [], transform: null };
  }
  const [x, y] = Array.isArray(position) ? position : ANCHOR_POINTS[position].map((v, i) => v * (i ? height : width));
  const scene = info(t);
  if (scene?.placement === 'content-position' && scene.width && scene.height) {
    const nx = 0.5 + ((x - width / 2) * scene.height) / (height * scene.width);
    const ny = 0.5 + (height / 2 - y) / height;
    const key = scene.keys['Content Position'];
    return { params: [el('param', { name: 'Content Position', key, value: `${round4(nx)} ${round4(ny)}` })], transform: null };
  }
  if (scene?.placement === 'fixed') {
    notes.push(`${where}: "${t.name}" draws the footage under it and has no position control — left where its design puts it; move it in FCP`);
    return { params: [], transform: null };
  }
  // FCPXML position is an offset from the frame centre, in percent of the frame height, y up.
  const pct = (v) => Number(v.toFixed(3));
  return { params: [], transform: el('adjust-transform', { position: `${pct(((x - width / 2) / height) * 100)} ${pct(((height / 2 - y) / height) * 100)}` }) };
}

/** A title takes text; a generator cannot be given text through FCPXML. */
function graphic(hit, attrs, strings, children, where, position) {
  const { params, transform } = placement(hit.t, position, where);
  const zones = info(hit.t)?.dropZones.length ?? 0;
  if (zones) notes.push(`${where}: "${hit.t.name}" has ${zones} drop zone(s) — they show "DROP ZONE" art until media is dropped in, in FCP`);
  if (hit.t.kind === 'generator') {
    if (strings?.some(Boolean)) notes.push(`${where}: "${hit.t.name}" is a generator — FCPXML cannot set its text; edit it in FCP`);
    return el('video', { ref: hit.id, ...attrs }, [...params, transform, ...children]);
  }
  return el('title', { ref: hit.id, ...attrs }, [...params, ...texts(strings ?? []), transform, ...children]);
}

/**
 * A plain <text> per string, filling the template's text layers in file order (confirmed by
 * import). No text-style: given even an empty one, FCP replaces the template's fonts with its
 * own default (Abel, 12 pt). Trailing empty entries are dropped; an inner "" blanks its layer.
 */
function texts(strings) {
  const list = [...strings];
  while (list.length && !list[list.length - 1]) list.pop();
  return list.map((s) => el('text', {}, [esc(s ?? '')]));
}

// ── The storyline (lane 1) ─────────────────────────────────────────────────────
const sections = timeline.sections;
const half = (s) => Math.floor((s?.transitionIn?.frames ?? 0) / 2);
const storyline = [];
const chapters = [];
const cardsOnBackground = [];

sections.forEach((s, i) => {
  const next = sections[i + 1];
  // The edit sits in the middle of each crossfade overlap; the halves become handles.
  const k0 = half(s);
  const k1 = s.durationInFrames - ((next?.transitionIn?.frames ?? 0) - half(next));
  const offset = s.startFrame + k0;
  const duration = k1 - k0;
  if (duration <= 0) throw new Error(`${s.id}: no picture left after transitions (${duration} frames)`);

  if (i > 0 && s.transitionIn?.kind !== 'cut' && s.transitionIn?.frames > 0) {
    const where = `${s.id} transition`;
    const motion = template(s.fcp?.transitionTemplate ?? fcpMeta.transitionTemplate, 'transition', where, 'used Cross Dissolve');
    const timing = { offset: frames(s.startFrame), duration: frames(s.transitionIn.frames) };
    if (motion) {
      const own = ownFrames(motion.t);
      if (own && Math.abs(own - s.transitionIn.frames) > own / 2) {
        notes.push(
          `${where}: "${motion.t.name}" is ${(own / fps).toFixed(2)}s long but this edit gives it ${(s.transitionIn.frames / fps).toFixed(2)}s — ` +
            `set transitionIn.seconds to ${(own / fps).toFixed(2)} and re-reconcile`
        );
      }
      storyline.push(el('transition', { name: motion.t.name, ...timing }, [el('filter-video', { ref: motion.id, name: motion.t.name })]));
    } else {
      if (s.transitionIn.kind !== 'crossfade') notes.push(`${s.id}: "${s.transitionIn.kind}" became a Cross Dissolve`);
      const ref = effectFor('Cross Dissolve', CROSS_DISSOLVE_UID);
      storyline.push(el('transition', { name: 'Cross Dissolve', ...timing }, [el('filter-video', { ref, name: 'Cross Dissolve' })]));
    }
  }

  // Effects ride on the section's own picture, in the order the storyboard lists them.
  const effects = (s.fcp?.effects ?? [])
    .map((e, j) => template(e, 'effect', `${s.id} effects[${j}]`))
    .filter(Boolean)
    .map((e) => el('filter-video', { ref: e.id, name: e.t.name }));

  const name = `${s.id} ${s.title}`;
  const clipMarkers = [];
  const cam = s.camera ?? {};
  let transform = null;
  if (cam.kind && cam.kind !== 'static' && cam.to !== cam.from) {
    if (cam.focus && cam.focus !== 'center') {
      clipMarkers.push(el('marker', { start: frames(k0), duration: frames(1), value: `camera ${cam.kind} to ${cam.to} toward ${cam.focus}` }));
      notes.push(`${s.id}: camera focus "${cam.focus}" is a marker — set the zoom in FCP`);
    } else {
      transform = el('adjust-transform', {}, [
        el('param', { name: 'scale' }, [
          el('keyframeAnimation', {}, [
            el('keyframe', { time: frames(k0), value: `${cam.from} ${cam.from}` }),
            el('keyframe', { time: frames(k1), value: `${cam.to} ${cam.to}` }),
          ]),
        ]),
      ]);
    }
  }

  if (s.surface === 'titlecard') {
    const where = `${s.id} title card`;
    const card = titleOr(s.fcp?.titleTemplate ?? fcpMeta.titleTemplate, 'Basic Title', where, ['title', 'generator']);
    const strings = s.fcp?.text ?? [s.titlecard?.title ?? s.title, s.titlecard?.subtitle];
    const background = template(s.fcp?.backgroundTemplate ?? fcpMeta.backgroundTemplate, ['generator', 'title'], `${s.id} background`);
    if (background) {
      // The background carries the storyline, so transitions dissolve it. The card cannot be
      // connected to it: FCP ignores items anchored inside a connected storyline ("Anchored
      // items were ignored") although the DTD allows them. It goes on lane 2 of the gap, above.
      storyline.push(
        graphic(background, { name: `${name} background`, offset: frames(offset), start: frames(k0), duration: frames(duration) }, [], [], where)
      );
      cardsOnBackground.push(graphic(card, { name, lane: 2, offset: frames(offset), start: frames(k0), duration: frames(duration) }, strings, [], where));
    } else {
      storyline.push(graphic(card, { name, offset: frames(offset), start: frames(k0), duration: frames(duration) }, strings, [], where));
    }
  } else if (s.surface === 'still' && s.still) {
    const asset = assetFor(s.still, 'still');
    storyline.push(
      el('video', { ref: asset.id, name, offset: frames(offset), start: frames(k0), duration: frames(duration) }, [transform, ...effects])
    );
  } else if (s.video) {
    const v = s.video;
    const asset = assetFor(v.src, 'video');
    const trim = v.trimBefore ?? 0;
    const retimed = Math.abs(v.playbackRate - 1) > 1e-6 || v.holdLastFrameFrames > 0;
    let timeMap = null;
    let start = frames(trim + k0);
    if (retimed) {
      // time = position in the section, value = position in the source clip. A flat last
      // segment is the held frame. Rate × frames lands a fraction past the media's end, so
      // the run ends on the end of the media and the hold sits on its last frame.
      const runEnd = Math.min((trim + v.videoFrames * v.playbackRate) / fps, asset.frames / fps);
      const points = [
        el('timept', { time: '0s', value: frames(trim), interp: 'linear' }),
        el('timept', { time: frames(v.videoFrames), value: seconds(runEnd), interp: 'linear' }),
      ];
      if (v.holdLastFrameFrames > 0) {
        const held = frames(Math.min(runEnd * fps, asset.frames - 1));
        points.push(el('timept', { time: frames(s.durationInFrames), value: held, interp: 'linear' }));
      }
      timeMap = el('timeMap', {}, points);
      start = frames(k0);
    }
    storyline.push(
      el('asset-clip', { ref: asset.id, name, offset: frames(offset), start, duration: frames(duration) }, [
        timeMap,
        transform,
        ...clipMarkers,
        ...effects,
      ])
    );
  } else {
    if (s.surface === 'code') notes.push(`${s.id}: code sections are not exported — render that range from Remotion and drop it in`);
    storyline.push(
      el('gap', { name, offset: frames(offset), start: '0s', duration: frames(duration) }, [
        el('marker', { start: '0s', duration: frames(1), value: `${s.surface} section — not exported, see ${s.id}` }),
      ])
    );
  }

  chapters.push(el('chapter-marker', { start: frames(offset), duration: frames(1), value: s.title, posterOffset: '0s' }));
});

// ── Anchored lanes ─────────────────────────────────────────────────────────────
const anchored = [el('spine', { lane: 1, offset: '0s', name: 'Picture' }, storyline), ...cardsOnBackground];

for (const s of sections) {
  if (!s.audio) continue;
  const asset = assetFor(s.audio.src, 'audio');
  anchored.push(
    el('asset-clip', {
      ref: asset.id,
      name: `${s.id} narration`,
      lane: -1,
      offset: frames(s.startFrame + s.audio.delayFrames),
      start: '0s',
      duration: frames(Math.floor(asset.duration * fps)),
      audioRole: 'dialogue',
    })
  );
}

if (timeline.music) {
  const m = timeline.music;
  const asset = assetFor(m.src, 'audio');
  const length = Math.min(Math.floor(asset.duration * fps), timeline.durationInFrames);
  // Lines closer than two ramps are one duck; otherwise the keyframes would run backwards.
  const ducks = [];
  for (const r of [...m.duckRanges].sort((a, b) => a.startFrame - b.startFrame)) {
    const last = ducks[ducks.length - 1];
    if (last && r.startFrame - DUCK_RAMP_FRAMES <= last.endFrame + DUCK_RAMP_FRAMES) last.endFrame = Math.max(last.endFrame, r.endFrame);
    else ducks.push({ ...r });
  }
  const points = new Map([[0, m.gainDb]]);
  const at = (f, db) => points.set(Math.max(0, Math.min(length, f)), db);
  for (const r of ducks) {
    at(r.startFrame - DUCK_RAMP_FRAMES, m.gainDb);
    at(r.startFrame, m.duckDb);
    at(r.endFrame, m.duckDb);
    at(r.endFrame + DUCK_RAMP_FRAMES, m.gainDb);
  }
  const keys = [...points.entries()]
    .sort(([a], [b]) => a - b)
    .map(([f, db]) => el('keyframe', { time: frames(f), value: `${db}dB` }));
  anchored.push(
    el('asset-clip', { ref: asset.id, name: 'music', lane: -2, offset: '0s', start: '0s', duration: frames(length), audioRole: 'music' }, [
      el('adjust-volume', {}, [el('param', { name: 'amount' }, [el('keyframeAnimation', {}, keys)])]),
    ])
  );
}

for (const s of sections) {
  if (!s.lowerThird) continue;
  const lt = s.lowerThird;
  const where = `${s.id} lower third`;
  const hit = titleOr(s.fcp?.lowerThirdTemplate ?? fcpMeta.lowerThirdTemplate, 'Basic Lower Third', where);
  anchored.push(
    graphic(
      hit,
      { name: where, lane: 2, offset: frames(s.startFrame + lt.inFrame), start: '0s', duration: frames(lt.outFrame - lt.inFrame) },
      s.fcp?.lowerThirdText ?? [lt.text],
      [],
      where
    )
  );
}

// Overlays: one lane per overlap, from lane 4 up, so nothing covers the captions' lane.
const laneEnds = [];
const laneFor = (from, to) => {
  let i = laneEnds.findIndex((end) => end <= from);
  if (i < 0) i = laneEnds.push(0) - 1;
  laneEnds[i] = to;
  return 4 + i;
};
for (const s of sections) {
  for (const [j, o] of (s.fcp?.overlays ?? []).entries()) {
    const where = `${s.id} overlays[${j}]`;
    const hit = template(o.template, ['title', 'generator'], where);
    if (!hit) continue;
    const own = ownFrames(hit.t);
    const duration = Math.max(1, Math.min(o.durationFrames ?? (own || 3 * fps), o.maxFrames ?? Infinity));
    const from = s.startFrame + o.inFrame;
    anchored.push(
      graphic(
        hit,
        { name: `${s.id} ${hit.t.base}`, lane: laneFor(from, from + duration), offset: frames(from), start: '0s', duration: frames(duration) },
        o.text,
        [],
        where,
        o.position
      )
    );
  }
}

if (timeline.captionsMode !== 'none') {
  const role = `iTT?captionFormat=ITT.${fcpMeta.captionLanguage ?? 'en'}`;
  for (const s of sections) {
    for (const c of s.captions ?? []) {
      const id = `ts${nextStyle++}`;
      anchored.push(
        el('caption', { name: c.text.slice(0, 40), lane: 3, offset: frames(s.startFrame + c.startFrame), start: '0s', duration: frames(c.endFrame - c.startFrame), role }, [
          el('text', { placement: 'bottom' }, [`<text-style ref="${id}">${esc(c.text)}</text-style>`]),
          el('text-style-def', { id }, [
            el('text-style', { font: '.AppleSystemUIFont', fontSize: 13, fontFace: 'Regular', fontColor: '1 1 1 1', backgroundColor: '0 0 0 1' }),
          ]),
        ])
      );
    }
  }
}

// ── Document ───────────────────────────────────────────────────────────────────
const total = frames(timeline.durationInFrames);
// The probe is named apart from the film, so importing both into one library cannot confuse them.
const projectName = `${fcpMeta.projectName ?? timeline.title ?? 'Demo'}${isProbe ? ' — probe' : ''}`;
const sequenceFormat = formatFor(width, height);
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<!DOCTYPE fcpxml>',
  el('fcpxml', { version }, [
    el('resources', {}, resources),
    el('library', {}, [
      el('event', { name: projectName }, [
        el('project', { name: projectName }, [
          el('sequence', { format: sequenceFormat, duration: total, tcStart: '0s', tcFormat: 'NDF', audioLayout: 'stereo', audioRate: '48k' }, [
            el('spine', {}, [el('gap', { name: 'Demo', offset: '0s', start: '0s', duration: total }, [...anchored, ...chapters])]),
          ]),
        ]),
      ]),
    ]),
  ]),
].join('\n');

if (downloads.size) {
  console.error(
    [
      `demo-video: ${downloads.size} template(s) are MotionVFX placeholders, not downloaded elements. FCP would show ` +
        '"The file is missing, please re-download the element" in their place, so nothing was written.',
      `Download them in Final Cut Pro → mExtension (search each 4-character code; ${DAILY_DOWNLOAD_LIMIT} downloads a day), then export again:`,
      ...[...downloads].map(([n, where]) => `  ${n.padEnd(40)} ${where.join(', ')}`),
    ].join('\n')
  );
  process.exit(1);
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${xml}\n`);

// ── Validate against the DTD the installed FCP imports with ────────────────────
let validation = 'skipped (--no-validate)';
if (!args.includes('--no-validate')) {
  const dtd = installed.find((v) => v.version === version)?.dtd;
  if (!dtd) {
    validation = `skipped — no FCPXMLv${version.replace('.', '_')}.dtd in an installed Final Cut Pro`;
  } else {
    try {
      // --dtdvalid takes a URL: the app name has spaces, so a bare path does not parse.
      execFileSync('xmllint', ['--noout', '--dtdvalid', pathToFileURL(dtd).href, outPath], { stdio: 'pipe' });
      validation = `valid against ${dtd.split('/').pop()}`;
    } catch (err) {
      console.error(`demo-video: ${outPath} does not validate:\n${String(err.stderr || err.message).trim()}`);
      process.exit(1);
    }
  }
}

const appName = (installed[0]?.app ?? '/Applications/Final Cut Pro.app').split('/').pop().replace(/\.app$/, '');
const lines = [
  `demo-video: FCPXML ${version} -> ${outPath}`,
  `  ${sections.length} sections, ${(timeline.durationInFrames / fps).toFixed(2)}s @ ${fps}fps, ${validation}`,
  `  import: File → Import → XML in Final Cut Pro, or: open -a "${appName}" "${outPath}"`,
  ...[...new Set(notes)].map((n) => `  note   ${n}`),
  ...(isProbe
    ? [
        '',
        'This is the probe, not the film. Import it into a throwaway library and check, in order:',
        '  1. It imports with NO warnings. A warning is a failed test, even when the picture looks right.',
        '  2. Every title shows its sentinel (CODE#0, CODE#1) — an empty layer means the text order is wrong.',
        '  3. No template shows "The file is missing", sample text, or grey "DROP ZONE" art.',
        '  4. The footage under each overlay is whole: no black band, no shifted picture.',
        '  5. Each title is readable at its entrance, its settled hold, and its exit — not only one frame.',
        '  Then File → Export XML from that project and read it back: it says which parameters FCP kept.',
        ...(timeline.probe?.transitionsNotCovered.length
          ? [`  Not covered by this probe: ${timeline.probe.transitionsNotCovered.join(', ')} (one transition per probe).`]
          : []),
      ]
    : []),
];
console.log(lines.join('\n'));
