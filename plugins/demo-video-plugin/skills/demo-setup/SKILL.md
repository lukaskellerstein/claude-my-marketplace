---
name: demo-setup
description: Checks and installs everything the demo-video pipeline needs — ffmpeg, Playwright browsers, the Remotion plugin, uvx, and the ElevenLabs key, plus the optional OBS recorder (websocket reachable, able to pause) and Final Cut Pro finish with its Motion templates and MotionVFX mExtension elements — and scaffolds demo/ in the target project. Use before the first demo video on a machine, when any pipeline stage reports missing tooling, when MCP video tools are absent from /mcp, when OBS will not connect, or when the user asks to set up, doctor, or install the demo toolchain.
---

# Demo pipeline setup

Verify (and, when asked, install) the toolchain for demo videos.

## 1. Check first, always

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/setup.sh
```

This changes nothing. It reports on: node ≥18, ffmpeg/ffprobe, uvx, Playwright browsers, an
importable `playwright` module for the script capture paths, `ELEVENLABS_API_KEY`, whether
the Remotion plugin and agent skills are present, and the two optional pieces: OBS (installed,
Node 22+, `OBS_WEBSOCKET_PASSWORD` set, the websocket answering, pausing possible) and Final
Cut Pro (installed, the newest FCPXML it imports, `xmllint`, the Motion templates ready, and
MotionVFX: how many elements are downloaded, how many are only placeholders, which theme
packs are downloaded).

Show the user the report.

## 2. Confirm before installing

If the user wants missing pieces installed, **show the exact commands first and ask**.
Some of them change state outside this project:

```bash
brew install ffmpeg                                          # system package
brew install uv                                              # system package
npx playwright install chromium                               # ~150MB download
npm install --prefix "$HOME/.cache/demo-video-plugin" playwright
claude plugin marketplace add remotion-dev/claude-code-plugin  # global Claude Code config
claude plugin install remotion@remotion                        # global Claude Code config
```

Then:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/setup.sh --install
```

**Claude Code must be restarted** after the Remotion plugin is added. Say so explicitly, then
re-run the check to confirm.

The Remotion *agent skills* (used only for custom compositions beyond the bundled template)
are a manual, optional install — see https://www.remotion.dev/docs/ai.

## 3. Verify the MCP servers

Check that both servers declared by this plugin are connected, and specifically that the video
tools are available:

- `mcp__demo-playwright__browser_start_video`
- `mcp__demo-playwright__browser_stop_video`
- `mcp__demo-playwright__browser_video_chapter`
- `mcp__demo-elevenlabs__text_to_speech`

If the video tools are absent, recording is impossible. Check in order: is `demo-playwright`
connected; does its config include `--caps=devtools`; is `@playwright/mcp` recent
(`npx @playwright/mcp@latest --version`); was Claude Code restarted after install.

## 4. ElevenLabs key

`ELEVENLABS_API_KEY` must be in the environment. If it is missing, tell the user where to put
it (shell profile, or Claude Code env settings) — do not write a key into the repo, and do not
echo a key that is already set.

If the key is present, `mcp__demo-elevenlabs__check_subscription` confirms it works and reports
remaining characters. Worth doing before a demo, since the whole narration is generated in one
pass.

## 5. OBS (optional — the crisp recorder)

Needed when a demo records with `meta.capture.recorder: "obs"`: desktop apps, and any demo
whose text must stay readable. None of it is installed or changed by `setup.sh`; the user does
the OBS side once, by hand:

1. `brew install --cask obs` — **ask first**, it is a system app.
2. OBS → Tools → WebSocket Server Settings → Enable. The password shown under "Show Connect
   Info" goes into the user's secret store and the environment as `OBS_WEBSOCKET_PASSWORD`.
   Never write it into the repo, never echo it, never pass it as a flag.
3. System Settings → Privacy & Security → Screen Recording → OBS.
4. OBS → Settings → Output → Recording Quality: anything but "Same as stream", which cannot
   pause.

Then verify, and create the capture scene for the app's window:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/obs.mjs status          # output.canPause must be true
node ${CLAUDE_PLUGIN_ROOT}/scripts/obs.mjs setup-scene --window "<part of the window title>" --size 1600x900 --fps 30
```

`setup-scene` changes OBS's scene collection and canvas size — say so before running it on a
machine where OBS is also used for other work. Full guide: `demo-capture/references/obs.md`.

## 6. Final Cut Pro (optional — the hand finish)

Nothing to install beyond FCP itself. `setup.sh` reports the newest FCPXML version it
imports; `node ${CLAUDE_PLUGIN_ROOT}/scripts/fcp-templates.mjs` lists the titles, generators,
transitions and effects `meta.fcp` can name. Guide: `demo-assembly/references/final-cut-pro.md`.

**MotionVFX (optional, recommended for the FCP finish).** mExtension is MotionVFX's free FCP
extension; with a DesignStudio subscription it downloads elements into FCP's template folders.
The plugin installs nothing here and never drives mExtension — downloads are the user's, in
FCP, up to 500 a day. If `setup.sh` shows many placeholders and few downloads, that is normal:
the whole catalog is listed, and only what the user downloaded can be used. The
`demo-graphics` skill says which elements to download for a given demo.

## 7. Scaffold (optional)

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/init-demo.sh
```

Creates `demo/` with the brief template, the Remotion project, and gitignore entries.
Idempotent — never overwrites an existing brief, storyboard, or customised studio.

## Report

State plainly what is ready, what is missing, what you installed, and whether a restart is
needed. If the environment is not ready, say which stage of the pipeline would fail.
