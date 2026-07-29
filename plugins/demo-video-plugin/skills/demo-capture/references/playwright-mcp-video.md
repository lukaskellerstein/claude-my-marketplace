# Playwright MCP video recording

## The tools

Provided by the `demo-playwright` server declared by this plugin:

| Tool | Parameters | Notes |
|---|---|---|
| `browser_start_video` | `filename?`, `size?: {width, height}` | Begins recording. Pass `<section-id>.webm` and the capture size as the nested `size` object — there are no top-level width/height params. |
| `browser_stop_video` | — | Ends recording and flushes the file. The clip does not exist until this returns. |
| `browser_video_chapter` | `title` (required), `description?`, `duration?` | Marks a labelled chapter. Call before `start_video` for each section. |
| `browser_video_show_actions` / `browser_video_hide_actions` | — | Overlays the actions being taken. Useful for debugging, **off for a real demo** — it looks like a test report. |

Output is **WebM**, written to the server's `--output-dir` (`./demo/capture`).

## Requirements

These tools exist **only** when the server runs with `--caps=devtools`, which this plugin's
`plugin.json` already sets:

```json
"args": ["@playwright/mcp@latest", "--caps=devtools,vision,network,storage,testing",
         "--headless", "--isolated", "--viewport-size=1600x900",
         "--output-dir=./demo/capture",
         "--init-script=${CLAUDE_PLUGIN_ROOT}/assets/cursor-overlay.js"]
```

The other caps matter too: `vision` gates the coordinate mouse tools, `network` gates
`browser_route` (blocking third-party noise), `storage` gates the cookie/localStorage/
storage-state tools (starting a section authenticated), and `testing` gates
`browser_verify_element_visible` / `browser_verify_text_visible`.

If `/mcp` does not list the video tools, recording is impossible until that is fixed. Check
in this order: is the `demo-playwright` server connected; is `--caps=devtools` present; is
`@playwright/mcp` recent enough (`npx @playwright/mcp@latest --version`); did Claude Code
restart after the plugin was installed.

## Known gotchas

**There is no `--save-video` flag or env var.** Recording is driven only by the start/stop
tools above. The one alternative is a config file setting `browser.contextOptions.recordVideo`
(standard Playwright options), which records the whole session as one file — a last resort
you would then have to split with ffmpeg; avoid it.

**No mouse cursor is recorded.** This is a Playwright limitation, not a configuration
mistake. The `--init-script` cursor overlay is the fix and it is mandatory for anything
anyone will watch.

**The WebM is VP8 at a fixed 25 fps.** Its container duration is unreliable, Remotion seeks
VP8 slowly and sometimes inaccurately, and 25 fps does not match the composition fps — which
is why the `postprocess-clip` hook immediately transcodes to H.264 MP4 at the composition
fps and measures the result. Never feed a raw WebM to Remotion, and never trust its nominal
duration.

**Recording is per browser context.** `--isolated` means each session starts clean; a
navigation does not end a recording, but closing the context does.

## Why headless

Headless is the default here deliberately:

- No window chrome, no OS decorations, no dependence on screen size or resolution.
- Exact, reproducible dimensions.
- No risk of another window overlapping the recording.
- Video capture goes through the same CDP screencast path either way, so there is no quality
  penalty.

Switch to headed only when the app genuinely misbehaves headless (rare — usually WebGL,
media autoplay, or a native file dialog).

## Motion tools

| Purpose | Tool |
|---|---|
| Glide the pointer | `browser_mouse_move_xy` (repeatedly, or with steps) |
| Click at a point | `browser_mouse_click_xy` after moving |
| Click a semantic element | `browser_click` — convenient, but jumps; prefer move-then-click for anything on camera |
| Scroll | `browser_mouse_wheel` in small increments |
| Type | `browser_type` with `slowly: true`, or per-character presses |
| Wait for a condition | `browser_wait_for` (text/state) |
| Read the page | `browser_snapshot` (accessibility tree) — use in rehearsal to learn real names |
| Verify state | `browser_verify_element_visible`, `browser_verify_text_visible` |

Use `browser_snapshot` freely during **rehearsal** to resolve targets and get element
coordinates. Avoid it mid-recording — it is slow and large, and the pause shows up in the
clip.

## Per-section recipe

```
1. (rehearsal only) browser_snapshot -> resolve every target, note coordinates
2. navigate + set up state          [before recording starts]
3. browser_video_chapter  title: "<section title>"
4. browser_start_video    filename: "<id>.webm", size: {width: 1600, height: 900}
5. wait ~0.5s              so the clip does not open mid-paint
6. actions, with eased motion and dwell
7. hold the final state ~0.6s
8. browser_stop_video
9. read the postprocess-clip hook report -> measured duration
```

## Blocking noise

Third-party requests add latency and can render UI mid-take:

```
browser_route  — block analytics, error reporting, chat widgets, survey tools
```

Do this before recording, not during.

## Storage state for authentication

`--isolated` starts with no cookies. To begin a section already authenticated, set cookies or
localStorage before navigating (`browser_set_storage_state`, `browser_cookie_set`,
`browser_localstorage_set`), or make login a recorded part of an early section.

Never record credentials, tokens, or keys on camera — including in a URL or a devtools panel.
