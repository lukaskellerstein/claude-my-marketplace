# Capturing Electron / desktop apps

Playwright MCP drives Chromium over CDP and **cannot launch or attach to an Electron app**.
So desktop demos use three tiers, and the first one is usually most of the demo.

## Tier 1 — capture the renderer in Chromium (preferred)

Almost every Electron app's renderer is a web app. If it runs against a dev server
(`http://localhost:5173`) or from built assets, point the normal web pipeline at it and mark
those sections `surface: web`.

You get: the styled cursor overlay, headless determinism, exact framing, the video tools, and
all the motion quality of the web path.

You cannot show: native menus, native dialogs, tray, multi-window, OS notifications, deep
links, offline behaviour, or anything behind `ipcRenderer`.

Decide per beat, not per demo. A desktop-app demo where four of six sections are captured in
Chromium and two are genuinely native is the normal, good outcome.

Check whether tier 1 is available:

```bash
grep -rn "loadURL\|loadFile" --include=*.{ts,js,mjs} src electron main 2>/dev/null | head
cat package.json | grep -A3 '"scripts"'
```

A `loadURL('http://localhost:...')` in development means the renderer is browser-reachable.

## Tier 2 — scripts/capture-electron.mjs

A real Playwright Electron session, driven by the same storyboard `actions`:

```bash
node scripts/capture-electron.mjs --project . --dry                 # rehearse everything
node scripts/capture-electron.mjs --project .                       # record all electron sections
node scripts/capture-electron.mjs --project . --section 07-native   # one section
```

Configured from `meta.electron` in the storyboard:

```json
"electron": {
  "args": ["."],
  "cwd": ".",
  "appName": "My App",
  "freezeClock": "2026-03-17T09:20:00Z",
  "env": { "DEMO_MODE": "1" }
}
```

How it works, and what that implies:

- **One launch per section**, because `recordVideo` is a launch-time option. Each section
  therefore starts from clean app state — usually a feature, occasionally a problem if a
  section depends on the previous one's state (make it one section instead).
- The cursor overlay is injected via both `addInitScript` and a direct evaluate, so it applies
  to the already-open window and to later navigations.
- `app.close()` is what flushes the video file. The script always closes, even after a
  failure.
- Output is size-checked, then handed to `transcode-clip.sh` for the same CFR MP4 + sidecar
  contract the web path produces.

### Native actions

Two action kinds only work here:

```json
{ "kind": "menu",   "to": "File>New Window" }   // native application menu
{ "kind": "window", "to": 1 }                    // switch to another window by index
```

Native menus cannot be clicked as pixels — Playwright cannot see them. The script traverses
`Menu.getApplicationMenu()` by label and calls `item.click()` in the main process, which
triggers the same handler a real click would. The menu itself does not appear on camera; what
the viewer sees is the result. If the menu opening must be visible, that is tier 3.

Native file dialogs are the same story: they are OS windows, invisible to Playwright and to
the recording. Either stub the dialog in demo mode (`dialog.showOpenDialog` returning a fixed
path when `DEMO_MODE=1`) and narrate the outcome, or use tier 3.

### The empty-WebM failure

Electron `recordVideo` is known to produce zero-length `.webm` on some Playwright/Electron
combinations. The script detects it and prints the tier-3 command. If you hit it:

1. Try updating Playwright and Electron first — it is version-dependent.
2. Confirm the app actually opened a window (`firstWindow()` resolving is not proof it
   painted).
3. Otherwise go to tier 3 for those sections.

Never let an empty or near-empty clip reach the timeline. The reconciler and the timeline
validator both reject it, but the cheapest place to catch it is here.

## Tier 3 — macOS screen capture

```bash
bash scripts/capture-screen-macos.sh --app "My App" --out demo/capture/07-native.webm --seconds 20
bash scripts/capture-screen-macos.sh --list     # find the avfoundation screen device
```

Records the front window of the named app with ffmpeg/avfoundation, crops to the window
bounds via AppleScript, then normalises to the standard CFR MP4 + sidecar.

Requirements and costs:

- **Screen Recording permission** for the terminal running Claude Code
  (System Settings → Privacy & Security → Screen Recording). Also **Accessibility**
  permission for the window-bounds lookup, otherwise it records the whole screen.
- The real OS cursor is captured, not the styled overlay — visually inconsistent with the
  other sections.
- Display scaling can soften text; window size is whatever the app opened at.
- **Nothing else may be on screen.** Notifications, other windows, and the menu bar clock all
  land in the recording. Turn on Do Not Disturb.
- Timing is fixed by `--seconds`; there is no action-driven stop.

Because of the cursor inconsistency, keep tier-3 sections short and few, and put them behind a
hard cut with a lower-third so the surface change reads as deliberate.

## Presenting a surface change

The reconciler already forces a hard cut when `surface` changes between sections. Reinforce it:

- Add `onScreenText` ("Desktop app", "Native menus") on the first native section.
- Have the narration acknowledge the shift in one clause — "on the desktop, the same library
  works offline" — so the viewer knows why the picture changed character.

## Windows and Linux

Tiers 1 and 2 are cross-platform. Tier 3 is macOS-only as written; the equivalents are
`ffmpeg -f gdigrab -i title="My App"` on Windows and `ffmpeg -f x11grab` on Linux. Neither is
implemented here — if you need one, write it into `demo/prep/` for that project rather than
assuming the bundled script works.
