# Recording with OBS

OBS records a real window at native pixels and 60 fps, driven over obs-websocket by the
capture scripts. Playwright still drives the app; OBS only records it.

## When to choose it

| Recorder | Records | Quality | Choose it when |
|---|---|---|---|
| `playwright` | the page, headless | VP8, 25 fps, ~1 Mbps — soft text, choppy motion | a web app, a quick demo, no OBS on the machine |
| `obs` | a real window | native pixels, 60 fps, hardware H.264/HEVC/ProRes | a desktop app, a text-heavy UI, any demo where text must stay readable |
| `ffmpeg` | the whole screen, cropped | OK, real OS cursor, fixed length | a native menu or dialog nobody else can record |

`obs` pairs with the `launch` and `attach` drivers. It cannot pair with the MCP driver: the
`demo-playwright` browser is headless, so there is no window to record.

## One-time setup

1. **OBS 30+** on macOS 13+ (the ScreenCaptureKit source). `brew install --cask obs`.
2. **WebSocket server**: OBS → Tools → WebSocket Server Settings → Enable. "Show Connect
   Info" shows the password. Put it in your secret store and export it as
   `OBS_WEBSOCKET_PASSWORD`. Never write it into a repo, a storyboard, or a command line;
   the scripts read the environment and never print it. `OBS_WEBSOCKET_URL` overrides
   `ws://127.0.0.1:4455`.
3. **Screen Recording permission** for OBS: System Settings → Privacy & Security.
4. **Output settings**, once, in the OBS UI (Settings → Output, Simple mode):

   | Setting | Value | Why |
   |---|---|---|
   | Recording Quality | High Quality, Medium File Size | **"Same as stream" cannot pause**, and pausing is how agent waits leave the clip |
   | Recording Format | Hybrid MOV (the macOS default) | survives a crash mid-take; the only hybrid format that also takes ProRes |
   | Encoder | Apple VT H264 or HEVC Hardware Encoder | the pipeline transcodes every clip to H.264 anyway |

   These are not set over the websocket on purpose: OBS applies output settings only when it
   rebuilds its outputs (Settings OK, a profile switch, a restart), so `SetProfileParameter`
   alone changes a stored value and nothing else.
5. **Check**: `node scripts/obs.mjs status` — `output.canPause` must be `true`.
6. **Scene**: `node scripts/obs.mjs setup-scene --window "<part of the title>" --size 1600x900 --fps 30`.
   It creates the scene `demo-video` and a macOS Screen Capture input `demo-window` (window
   mode, cursor hidden, hidden windows listed), fits the window to the canvas, and reports
   `pixelExact`.

## Canvas and window size

The canvas is `meta.captureSize`. Make the window's content exactly that size and the
capture is 1:1; `setup-scene` says `pixelExact: false` otherwise, because resampled text is
the one thing this recorder exists to avoid.

- **Title bar**: window capture includes it. Crop it with `--crop-top <px>`, or make the
  window taller by the title bar.
- **Retina displays** capture at 2×: a 1600×900 window is 3200×1800 pixels. Use that as the
  canvas and `captureSize`; the clip is downscaled at render, so camera zooms stay sharp.
- **Attach driver**: `meta.capture.windowSize` resizes the window over CDP so its viewport
  is that size. Electron may refuse, and a tiling window manager (yabai, Amethyst) resizes
  the window straight back — float the window first. The script reports both cases.
- **Never resize mid-take.**

## How a take runs

```
prepare   refuse if OBS is already recording; switch to the scene;
          re-point the input at the window (its id changes every launch);
          check the output can pause
start     StartRecord, then wait for RecordStateChanged STARTED — frames are being written
actions   the storyboard, with the drawn cursor (window.__demoCursor)
stop      StopRecord, then wait for STOPPED — only then is the file finalised
save      move to demo/capture/raw/<id>.mov, transcode to demo/capture/<id>.mp4 + <id>.json,
          write <id>.actions.json (every action, in seconds on the clip's own clock)
```

A take that fails mid-way stops the recording and keeps the file as
`capture/raw/<id>.failed.mov` for inspection. It never becomes a clip.

## Pausing through waits

An agent run, a build or an upload takes as long as it takes. Mark the wait:

```json
{ "kind": "waitFor", "target": "css=.answer", "idleUpTo": 120, "compress": "pause", "showSeconds": 1.5 }
```

The take shows `showSeconds` of the wait starting, pauses the recording, and resumes the
moment the target appears. The clip gets a clean jump cut instead of a minute of spinner.
Narrate the gap honestly ("a few seconds later") when the result is not instant in real use.

`PauseRecord` answers success even when OBS cannot pause. So the recorder waits up to 1.5 s
for the `PAUSED` event; without it, it warns and keeps the wait in the clip. The action log's
clock excludes paused time, so its timestamps match the clip.

## Windows on another desktop (Space)

- A ScreenCaptureKit single-window capture is independent of Space and occlusion (Apple,
  WWDC22 "Take ScreenCaptureKit to the next level"). OBS lists only on-screen windows unless
  `show_hidden_windows` is on, and `setup-scene` and every take turn it on.
- **Not guaranteed**: that macOS keeps delivering fresh frames for a window on an inactive
  Space. One developer report says frames update only while the mouse moves on that display.
  Measure it on your machine before relying on it: record 10 s of a window with something
  animating on another desktop, then `extract-frames.sh` the clip. If the frames repeat,
  record on a visible desktop.
- CDP mouse events can fail to reach a window on a hidden desktop (seen with Electron). Set
  `meta.capture.input` to `"dom"`.
- A **minimised** window stops the stream until restored.

## Input modes

| `meta.capture.input` | How actions reach the app | Gains | Loses |
|---|---|---|---|
| `cdp` (default) | real input through Playwright | hover styles, focus rings, default key actions | needs a window that receives input |
| `dom` | events dispatched inside the page | works on a hidden desktop and in scriptless iframes | CSS `:hover` never triggers; a synthetic key does nothing by default |

`selectText` is always dom: a held-button drag hangs Playwright on Electron. Both modes draw
the same cursor.

## obs-websocket requests used

| Purpose | Requests / events |
|---|---|
| status | `GetVersion`, `GetRecordStatus`, `GetVideoSettings`, `GetRecordDirectory`, `GetSceneList`, `GetProfileParameter` |
| scene | `CreateScene`, `GetInputKindList`, `CreateInput` (`screen_capture`), `SetInputSettings`, `GetInputPropertiesListPropertyItems` (`window`), `GetSceneItemId`, `SetSceneItemTransform`, `GetSceneItemTransform`, `SetVideoSettings`, `SetCurrentProgramScene` |
| a take | `StartRecord`, `PauseRecord`, `ResumeRecord`, `StopRecord`; event `RecordStateChanged` (`OBS_WEBSOCKET_OUTPUT_STARTED` / `PAUSED` / `RESUMED` / `STOPPED`, with `outputPath`) |

Protocol v5, rpcVersion 1: https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md

## Failure modes

| Message or symptom | Cause | Fix |
|---|---|---|
| `OBS rejected the password` | `OBS_WEBSOCKET_PASSWORD` differs from OBS | copy it again from Show Connect Info |
| `cannot reach OBS` | OBS closed, or the server is disabled | open OBS; Tools → WebSocket Server Settings → Enable |
| `OBS lists no window containing "…"` | the app is not open, the title differs, or it is minimised | the message lists what OBS sees; pick a part of that |
| `OBS cannot pause … RecQuality=Stream` | "Same as stream" quality | Settings → Output → another Recording Quality |
| `OBS is already recording` | a manual recording is running | stop it; a take never records over another |
| a black clip | no Screen Recording permission for OBS | grant it, restart OBS |
| a frozen clip | the window was minimised, or on a Space macOS stopped updating | restore it; record on a visible desktop |
| `pixelExact: false` | the window content is not the canvas size | resize the window, or `--crop-top` the title bar |
| `this Node has no global WebSocket` | Node older than 22 | upgrade Node |
