// Recorders for the script-driven capture paths. Playwright's recordVideo is not here: it
// is a launch-time option of the browser, so capture-electron.mjs handles it inline.
//
// Every recorder has the same shape:
//   prepare()  before the take — point at the window, refuse to start over a recording
//   start()    returns once frames are being written
//   pause() / resume()   cut a wait out of the clip; a no-op where pausing is impossible
//   elapsed()  seconds on the recording's own clock (pauses removed)
//   stop()     returns the raw file path
//   close()

import { copyFileSync, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectObs, ObsError, pointWindow, recordingCanPause, RecordState } from './obs-client.mjs';

const scriptsDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const isState = (state) => (data) => data.outputState === state;

/** Dry runs and rehearsals: a wall clock, nothing written. */
export function createNoRecorder() {
  let t0 = performance.now();
  return {
    kind: 'none',
    canPause: false,
    async prepare() {},
    async start() {
      t0 = performance.now();
    },
    async pause() {},
    async resume() {},
    elapsed: () => (performance.now() - t0) / 1000,
    async stop() {
      return null;
    },
    async close() {},
  };
}

/**
 * OBS over obs-websocket. `input` is the macOS Screen Capture input to re-point at
 * `window` before every take; omit both to record whatever the scene already shows.
 */
export async function createObsRecorder({ input, window: title, scene, warn = console.warn } = {}) {
  const obs = await connectObs();
  let t0 = 0;
  let pausedAt = null;
  let pausedTotal = 0;

  const recorder = {
    kind: 'obs',
    canPause: true,

    async prepare() {
      const status = await obs.call('GetRecordStatus');
      if (status.outputActive) {
        throw new Error('OBS is already recording. Stop that recording first — a take never records over another one.');
      }
      if (scene) await obs.call('SetCurrentProgramScene', { sceneName: scene });
      if (input && title) {
        const pointed = await pointWindow(obs, input, title);
        if (pointed.ambiguous) warn(`demo-video: several OBS windows contain "${title}"; recording "${pointed.window}".`);
      }
      const pause = await recordingCanPause(obs);
      if (pause.canPause === false) {
        recorder.canPause = false;
        warn(
          `demo-video: OBS cannot pause with ${pause.mode} output (${pause.detail}). Waits marked compress:"pause" ` +
            'will stay in the clip. Fix: Settings → Output → Recording Quality other than "Same as stream".'
        );
      }
    },

    async start() {
      await obs.callAndWait('StartRecord', undefined, 'RecordStateChanged', isState(RecordState.STARTED), 15000);
      t0 = performance.now();
      pausedAt = null;
      pausedTotal = 0;
    },

    async pause() {
      if (!recorder.canPause || pausedAt !== null) return;
      try {
        // A real pause confirms in ~50 ms; no event in 1.5 s means it will not come.
        await obs.callAndWait('PauseRecord', undefined, 'RecordStateChanged', isState(RecordState.PAUSED), 1500);
        pausedAt = performance.now();
      } catch (err) {
        if (err instanceof ObsError) throw err;
        // PauseRecord reports success even when the output cannot pause.
        recorder.canPause = false;
        warn('demo-video: OBS accepted PauseRecord but did not pause; the wait stays in the clip.');
      }
    },

    async resume() {
      if (pausedAt === null) return;
      await obs.callAndWait('ResumeRecord', undefined, 'RecordStateChanged', isState(RecordState.RESUMED), 5000);
      pausedTotal += performance.now() - pausedAt;
      pausedAt = null;
    },

    elapsed() {
      if (!t0) return 0;
      return ((pausedAt ?? performance.now()) - t0 - pausedTotal) / 1000;
    },

    async stop() {
      await recorder.resume();
      // The file is finalised only after STOPPED, not when StopRecord answers.
      const { response, event } = await obs.callAndWait(
        'StopRecord',
        undefined,
        'RecordStateChanged',
        isState(RecordState.STOPPED),
        60000
      );
      return event.outputPath ?? response.outputPath;
    },

    async close() {
      obs.close();
    },
  };
  return recorder;
}

export async function createRecorder(kind, options) {
  if (kind === 'none') return createNoRecorder();
  if (kind === 'obs') return createObsRecorder(options);
  throw new Error(`recorder "${kind}" cannot be driven from a script — use "obs", or capture-electron.mjs for "playwright"`);
}

/**
 * Move a raw recording to demo/capture/raw/<id><ext> and normalise it into the pipeline's
 * clip contract: CFR H.264 demo/capture/<id>.mp4 plus a measured <id>.json sidecar.
 */
export function saveClip({ rawPath, id, captureDir, fps }) {
  if (!rawPath || !existsSync(rawPath)) throw new Error(`the recorder reported no file (${rawPath ?? 'none'})`);
  const rawDir = join(captureDir, 'raw');
  mkdirSync(rawDir, { recursive: true });
  const kept = join(rawDir, `${id}${extname(rawPath) || '.mov'}`);
  try {
    renameSync(rawPath, kept);
  } catch {
    copyFileSync(rawPath, kept); // across volumes, e.g. ~/Movies on another disk
    unlinkSync(rawPath);
  }
  const bytes = statSync(kept).size;
  if (bytes < 4096) throw new Error(`${basename(kept)} is ${bytes} bytes — the recording failed`);
  // Progress goes to stderr: stdout carries the capture script's JSON report.
  execFileSync('bash', [join(scriptsDir, 'transcode-clip.sh'), kept, join(captureDir, `${id}.mp4`), '--fps', String(fps)], {
    stdio: ['ignore', process.stderr, process.stderr],
  });
  return { raw: kept, clip: `capture/${id}.mp4`, bytes };
}
