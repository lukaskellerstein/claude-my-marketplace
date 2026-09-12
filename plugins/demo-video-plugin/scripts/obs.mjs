#!/usr/bin/env node
// OBS control for the demo pipeline, over obs-websocket v5. Every command prints JSON.
// The capture scripts use the same client as a module; this CLI is for setup, checks, and
// recording by hand.
//
// Needs Node 22+ and OBS with Tools → WebSocket Server Settings → Enable. The password is
// read from OBS_WEBSOCKET_PASSWORD (OBS_WEBSOCKET_URL overrides ws://127.0.0.1:4455).
//
// usage:
//   obs.mjs status
//   obs.mjs windows      --input demo-window
//   obs.mjs setup-scene  --window "My App" [--scene demo-video] [--input demo-window]
//                        [--size 1600x900] [--fps 30] [--crop-top 0]
//   obs.mjs point        --window "My App" [--input demo-window]
//   obs.mjs record-dir   [PATH]
//   obs.mjs start | pause | resume | stop

import { resolve } from 'node:path';
import { connectObs, ObsError, pointWindow, recordingCanPause, RecordState } from './lib/obs-client.mjs';

const [command, ...rest] = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 && rest[i + 1] !== undefined ? rest[i + 1] : fallback;
};
const positional = rest.find((a, i) => !a.startsWith('--') && !rest[i - 1]?.startsWith('--'));

const DEFAULT_SCENE = 'demo-video';
const DEFAULT_INPUT = 'demo-window';
const print = (value) => process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);

async function status(obs) {
  const [version, record, video, dir, scenes, pause] = await Promise.all([
    obs.call('GetVersion'),
    obs.call('GetRecordStatus'),
    obs.call('GetVideoSettings'),
    obs.call('GetRecordDirectory'),
    obs.call('GetSceneList'),
    recordingCanPause(obs),
  ]);
  const param = async (parameterCategory, parameterName) =>
    (await obs.call('GetProfileParameter', { parameterCategory, parameterName })).parameterValue;
  const simple = pause.mode === 'Simple';
  return {
    obs: version.obsVersion,
    websocket: version.obsWebSocketVersion,
    rpcVersion: version.rpcVersion,
    recording: { active: record.outputActive, paused: record.outputPaused, seconds: record.outputDuration / 1000 },
    video: {
      base: `${video.baseWidth}x${video.baseHeight}`,
      output: `${video.outputWidth}x${video.outputHeight}`,
      fps: Number((video.fpsNumerator / video.fpsDenominator).toFixed(3)),
    },
    output: {
      mode: pause.mode,
      encoder: await param(simple ? 'SimpleOutput' : 'AdvOut', 'RecEncoder'),
      format: await param(simple ? 'SimpleOutput' : 'AdvOut', 'RecFormat2'),
      canPause: pause.canPause,
      detail: pause.detail,
    },
    recordDirectory: dir.recordDirectory,
    programScene: scenes.currentProgramSceneName,
  };
}

async function ensureScene(obs, sceneName) {
  const { scenes } = await obs.call('GetSceneList');
  if (!scenes.some((s) => s.sceneName === sceneName)) await obs.call('CreateScene', { sceneName });
}

async function ensureInput(obs, sceneName, inputName) {
  try {
    const { inputKind } = await obs.call('GetInputSettings', { inputName });
    if (inputKind !== 'screen_capture') {
      throw new Error(`input "${inputName}" exists but is a ${inputKind}, not a macOS Screen Capture — pass another --input`);
    }
    return false;
  } catch (err) {
    if (!(err instanceof ObsError) || err.code !== 600) throw err;
  }
  const { inputKinds } = await obs.call('GetInputKindList');
  if (!inputKinds.includes('screen_capture')) {
    throw new Error('this OBS has no "screen_capture" input (macOS Screen Capture needs macOS 13+ and OBS 30+)');
  }
  await obs.call('CreateInput', {
    sceneName,
    inputName,
    inputKind: 'screen_capture',
    inputSettings: { type: 1, show_cursor: false, show_hidden_windows: true },
  });
  return true;
}

async function setupScene(obs) {
  const title = flag('window');
  if (!title) throw new Error('setup-scene needs --window "<part of the window title>"');
  const sceneName = flag('scene', DEFAULT_SCENE);
  const inputName = flag('input', DEFAULT_INPUT);

  const size = flag('size');
  const fps = flag('fps');
  if (size || fps) {
    const settings = {};
    if (size) {
      const [w, h] = size.split('x').map(Number);
      Object.assign(settings, { baseWidth: w, baseHeight: h, outputWidth: w, outputHeight: h });
    }
    if (fps) Object.assign(settings, { fpsNumerator: Number(fps), fpsDenominator: 1 });
    await obs.call('SetVideoSettings', settings); // refused while any output is active
  }

  await ensureScene(obs, sceneName);
  const created = await ensureInput(obs, sceneName, inputName);
  const pointed = await pointWindow(obs, inputName, title);
  await obs.call('SetCurrentProgramScene', { sceneName });

  const video = await obs.call('GetVideoSettings');
  const { sceneItemId } = await obs.call('GetSceneItemId', { sceneName, sourceName: inputName });
  await obs.call('SetSceneItemTransform', {
    sceneName,
    sceneItemId,
    sceneItemTransform: {
      positionX: 0,
      positionY: 0,
      alignment: 5, // top-left
      cropTop: Number(flag('crop-top', 0)),
      boundsType: 'OBS_BOUNDS_SCALE_INNER',
      boundsAlignment: 0,
      boundsWidth: video.baseWidth,
      boundsHeight: video.baseHeight,
    },
  });
  // Give ScreenCaptureKit a moment to deliver a frame, so the source size is real.
  await new Promise((r) => setTimeout(r, 800));
  const { sceneItemTransform: t } = await obs.call('GetSceneItemTransform', { sceneName, sceneItemId });
  const sourceSize = `${t.sourceWidth}x${t.sourceHeight - Number(flag('crop-top', 0))}`;
  const canvas = `${video.baseWidth}x${video.baseHeight}`;

  return {
    scene: sceneName,
    input: inputName,
    createdInput: created,
    window: pointed.window,
    ambiguous: pointed.ambiguous,
    canvas,
    sourceSize,
    pixelExact: sourceSize === canvas,
    advice:
      sourceSize === canvas
        ? 'The window fills the canvas 1:1.'
        : `The window captures at ${sourceSize} but the canvas is ${canvas}, so text is resampled. Size the window's content to the canvas (or use --crop-top for a title bar), then run setup-scene again.`,
  };
}

async function record(obs, action) {
  const run = (request, state, ms) =>
    obs.callAndWait(request, undefined, 'RecordStateChanged', (d) => d.outputState === state, ms);
  switch (action) {
    case 'start':
      return { recording: true, outputPath: (await run('StartRecord', RecordState.STARTED, 15000)).event.outputPath };
    case 'pause':
      try {
        await run('PauseRecord', RecordState.PAUSED, 3000);
        return { paused: true };
      } catch (err) {
        if (err instanceof ObsError) throw err;
        return { paused: false, reason: 'OBS accepted PauseRecord but did not pause — see `status` → output.canPause' };
      }
    case 'resume':
      await run('ResumeRecord', RecordState.RESUMED, 5000);
      return { paused: false };
    default: {
      const { response, event } = await run('StopRecord', RecordState.STOPPED, 60000);
      return { recording: false, outputPath: event.outputPath ?? response.outputPath };
    }
  }
}

const COMMANDS = {
  status,
  'setup-scene': setupScene,
  async windows(obs) {
    const inputName = flag('input', DEFAULT_INPUT);
    const { propertyItems } = await obs.call('GetInputPropertiesListPropertyItems', { inputName, propertyName: 'window' });
    return propertyItems.filter((i) => i.itemValue).map((i) => ({ name: i.itemName, id: i.itemValue }));
  },
  async point(obs) {
    const title = flag('window');
    if (!title) throw new Error('point needs --window "<part of the window title>"');
    return pointWindow(obs, flag('input', DEFAULT_INPUT), title);
  },
  async 'record-dir'(obs) {
    if (positional) await obs.call('SetRecordDirectory', { recordDirectory: resolve(positional) });
    return obs.call('GetRecordDirectory');
  },
  start: (obs) => record(obs, 'start'),
  pause: (obs) => record(obs, 'pause'),
  resume: (obs) => record(obs, 'resume'),
  stop: (obs) => record(obs, 'stop'),
};

if (!COMMANDS[command]) {
  console.error(`usage: obs.mjs ${Object.keys(COMMANDS).join(' | ')}   (see the header of this file)`);
  process.exit(2);
}

let obs;
try {
  obs = await connectObs();
  print(await COMMANDS[command](obs));
} catch (err) {
  console.error(`demo-video: ${err.message}`);
  process.exitCode = 1;
} finally {
  obs?.close();
}
