---
name: demo-setup
description: Checks and installs everything the demo-video pipeline needs — ffmpeg, Playwright browsers, the Remotion plugin, uvx, and the ElevenLabs key — and scaffolds demo/ in the target project. Use before the first demo video on a machine, when any pipeline stage reports missing tooling, when MCP video tools are absent from /mcp, or when the user asks to set up, doctor, or install the demo toolchain.
---

# Demo pipeline setup

Verify (and, when asked, install) the toolchain for demo videos.

## 1. Check first, always

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/setup.sh
```

This changes nothing. It reports on: node ≥18, ffmpeg/ffprobe, uvx, Playwright browsers, an
importable `playwright` module for the Electron path, `ELEVENLABS_API_KEY`, and whether the
Remotion plugin and agent skills are present.

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

## 5. Scaffold (optional)

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/init-demo.sh
```

Creates `demo/` with the brief template, the Remotion project, and gitignore entries.
Idempotent — never overwrites an existing brief, storyboard, or customised studio.

## Report

State plainly what is ready, what is missing, what you installed, and whether a restart is
needed. If the environment is not ready, say which stage of the pipeline would fail.
