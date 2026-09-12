# Capturing Electron / desktop apps

Playwright MCP drives a headless Chromium it launched itself, so **it cannot drive an Electron
app**. Desktop demos use one of four paths, and the first is often most of the demo.

| Path | Driver | Recorder | Quality | Pick it for |
|---|---|---|---|---|
| 1. Renderer in Chromium | `mcp` | `playwright` | good, deterministic | a renderer that works in a plain browser |
| 2. Launch | `launch` | `playwright` or `obs` | OBS: best | apps the pipeline may start: native menus, multi-window |
| 3. Attach | `attach` | `obs` | best | apps whose launch must stay their own |
| 4. Screen capture | — | `ffmpeg` | lower, real OS cursor | a native beat nothing else can see |

Decide per beat, not per demo. A desktop demo with four sections from path 1 and two from
path 3 is normal.

## Path 1 — the renderer in Chromium

Almost every Electron app's renderer is a web app. If it runs against a dev server
(`http://localhost:5173`) or from built assets **and works without the preload bridge**,
point the normal web pipeline at it and mark those sections `surface: web`.

```bash
grep -rn "loadURL\|loadFile\|contextBridge" --include=*.{ts,js,mjs} src electron main 2>/dev/null | head
```

A `loadURL('http://localhost:...')` means the renderer is browser-reachable. A renderer that
gets its data through `contextBridge` / `ipcRenderer` is **empty** in a plain browser — do
not fake the bridge for the video; use path 2 or 3.

You cannot show: native menus, native dialogs, tray, multi-window, OS notifications, deep
links, or anything behind `ipcRenderer`.

## Path 2 — launch: scripts/capture-electron.mjs

A real Playwright `_electron.launch`, one launch per section, driven by the storyboard
`actions`. Configured from `meta.electron`:

```json
"electron": {
  "args": ["."],
  "cwd": ".",
  "appName": "My App",
  "freezeClock": "2026-03-17T09:20:00Z",
  "env": { "DEMO_MODE": "1" }
},
"capture": { "driver": "launch", "recorder": "obs", "obs": { "window": "My App" } }
```

```bash
node scripts/capture-electron.mjs --project . --dry                        # rehearse everything
node scripts/capture-electron.mjs --project . --recorder obs               # record with OBS
node scripts/capture-electron.mjs --project . --section 07-native          # one section
```

- **One launch per section.** Each section starts from clean app state — usually a feature,
  occasionally a problem if a section depends on the previous one's state (make it one
  section instead, or use `setup` actions).
- **Recorder `playwright`**: `recordVideo` is a launch option; `app.close()` flushes the file.
  Electron is known to produce zero-length WebM on some Playwright/Electron combinations; the
  script size-checks every take and names the OBS command for any empty one.
- **Recorder `obs`**: no `recordVideo`. The window gets a new id every launch, so the OBS
  input is re-pointed at `meta.capture.obs.window` before each take.

### Native actions

Two action kinds only work with this path:

```json
{ "kind": "menu",   "to": "File>New Window" }   // native application menu
{ "kind": "window", "to": 1 }                    // switch to another window by index
```

Native menus cannot be clicked as pixels — Playwright cannot see them. The script traverses
`Menu.getApplicationMenu()` by label and calls `item.click()` in the main process, which
triggers the same handler a real click would. The menu itself does not appear on camera; what
the viewer sees is the result. If the menu opening must be visible, that is path 4.

Native file dialogs are the same story: they are OS windows, invisible to Playwright and to
a window capture. Either stub the dialog in demo mode (`dialog.showOpenDialog` returning a
fixed path when `DEMO_MODE=1`) and narrate the outcome, or pass the document on the command
line if the app accepts one.

## Path 3 — attach: scripts/capture-attached.mjs

The app runs on its own; the script attaches over CDP, records the window with OBS, and never
launches, closes or restarts it. This is the path when the launch carries something the
pipeline must not own:

- an isolated database or data directory set by environment variables,
- a wrapper script that places the window or marks it as automated,
- a packaged build instead of the dev tree,
- an app that takes a minute to warm up and should stay warm across takes.

Start the app from a `demo/prep/` script with a debugging port (Electron:
`--remote-debugging-port=9222`, or the app's own switch), then:

```json
"capture": {
  "driver": "attach",
  "recorder": "obs",
  "attach": "http://127.0.0.1:9222",
  "page": "My App",
  "input": "cdp",
  "windowSize": "1600x900",
  "obs": { "input": "demo-window", "window": "My App" }
}
```

```bash
node scripts/capture-attached.mjs --project . --dry
node scripts/capture-attached.mjs --project . --section 03-ask
```

- **Make sure the port belongs to the demo instance.** A developer's own running copy of the
  app may hold the same port. Attaching to it drives their window and their data.
- `resetBefore` runs `demo/prep/reset.sh`, which may restart the app; the script reconnects
  for up to 30 s.
- Apps that keep their UI in a **shadow root** or the content in a **sandboxed iframe with
  scripting off** need `in` on the action — see the action table in the demo-capture skill.
  Playwright's own locators cannot enter a scriptless frame; the `in` chain is resolved from
  the parent page, which can.
- A held-button drag hangs Playwright on Electron, so select text with `selectText`.
- If clicks do nothing — typically a window on a hidden macOS desktop — set `input: "dom"`.

## Path 4 — macOS screen capture

```bash
bash scripts/capture-screen-macos.sh --app "My App" --out demo/capture/07-native.webm --seconds 20
bash scripts/capture-screen-macos.sh --list     # find the avfoundation screen device
```

Records the front window of the named app with ffmpeg/avfoundation, crops to the window
bounds via AppleScript, then normalises to the standard CFR MP4 + sidecar.

- **Screen Recording permission** for the terminal running Claude Code, and **Accessibility**
  for the window-bounds lookup, otherwise it records the whole screen.
- The real OS cursor is captured, not the styled overlay — visually inconsistent with the
  other sections.
- **Nothing else may be on screen.** Notifications, other windows, and the menu bar clock all
  land in the recording. Turn on Do Not Disturb.
- Timing is fixed by `--seconds`; there is no action-driven stop.

Keep path-4 sections short and few, behind a hard cut with a lower-third.

## Presenting a surface change

The reconciler already forces a hard cut when `surface` changes between sections. Reinforce it:

- Add `onScreenText` ("Desktop app", "Native menus") on the first native section.
- Have the narration acknowledge the shift in one clause — "on the desktop, the same library
  works offline" — so the viewer knows why the picture changed character.

## Windows and Linux

Paths 1–3 are cross-platform in principle, but the OBS input the scripts create is the macOS
Screen Capture source (`screen_capture`); on Windows and Linux create the window-capture
source by hand and leave `meta.capture.obs.input` unset. Path 4 is macOS-only as written;
the equivalents are `ffmpeg -f gdigrab -i title="My App"` on Windows and `ffmpeg -f x11grab`
on Linux. Neither is implemented here — write it into `demo/prep/` for that project.
