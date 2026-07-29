---
name: demo-app-prep
description: Gets a project into a demo-worthy, deterministic state before recording — boots the app, seeds realistic data, bypasses or scripts login, freezes clocks and random values, hides dev-only UI, and makes state resettable between takes. Use before capturing any demo video section, when a demo shows empty states or placeholder data, when takes are not reproducible, or when deciding how to run the app for recording.
---

# Demo App Prep

This is where most demos are actually lost. The recording is fine; the app is showing an
empty table, a dev banner, `test@test.com`, and a relative timestamp that changes between
takes.

Two goals: the app looks **used**, and every take looks **identical**.

## Order of work

1. **Boot it and look.** Run the app, open the routes the storyboard needs, and screenshot
   them. Do not plan seeding before seeing the real empty state.
2. **Decide the state strategy** — seed script, fixture load, demo account, or record
   against existing dev data. See
   [seeding-patterns.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-app-prep/references/seeding-patterns.md).
3. **Write it down as a script** in `demo/prep/`. A demo you cannot re-seed is a demo you
   cannot re-record, and you will need to re-record.
4. **Remove non-determinism.** Work the checklist in
   [determinism-checklist.md](${CLAUDE_PLUGIN_ROOT}/skills/demo-app-prep/references/determinism-checklist.md).
5. **Verify with two identical dry runs.** Same screenshots both times, or it is not ready.

## Booting the app

Record the exact command and readiness signal in the storyboard so every later stage uses
the same one:

```json
"meta": {
  "appUrl": "http://localhost:5173",
  "startCommand": "npm run dev",
  "readySignal": "http://localhost:5173"
}
```

Guidelines:

- **Prefer a production-mode build** (`npm run build && npm run preview`) over the dev
  server. No HMR overlay, no dev warnings in console, no React StrictMode double-render,
  faster and steadier paints. Use the dev server only when the demo needs it.
- **Start it in the background** and wait for the readiness signal before capture. Do not
  block a foreground shell on a long-running server.
- **Fix the port.** A demo that lands on `:5174` because `:5173` was taken will show the
  wrong URL in the address bar — though note the recording is of the page viewport only, so
  this matters mainly for anything the app itself displays.
- **Check the console.** Errors and warnings often mean the recording will show a broken
  intermediate state. Read them before recording, not after.

## Data that looks used

The bar is: a stranger looking at one frame believes real people use this.

- **Volume** — enough rows that lists scroll and pagination appears. Three rows reads as a
  prototype.
- **Names** — plausible people, companies, and projects. Not "Test User", not "asdf", not
  `foo@bar.com`, not Lorem Ipsum.
- **Magnitudes** — amounts, counts, and durations in the range a real customer would have,
  because the narration will quote them.
- **Variety** — a few edge cases visible: a long name that would wrap, a failed item among
  successes, one empty optional field. Uniform data looks generated.
- **Recency** — items dated relative to a frozen "now", so "2 hours ago" is stable across
  takes.

**Never use real customer or personal data.** Not a redacted export, not a copy of prod with
names changed. Generate it. If the user asks you to record against production data, say
plainly that the video is a distributable artifact and generate a synthetic equivalent
instead.

## Authentication

In preference order:

1. **A seeded demo account** with a known password, logged in during a `01-` section or
   before recording starts. Simplest and most honest.
2. **Injected session state** — set cookies or localStorage before navigating, so capture
   starts already authenticated. Use the Playwright MCP storage-state or cookie tools.
3. **A dev bypass flag** the app already supports (`?demo=1`, `DEMO_AUTH=1`). Acceptable if
   it is a real feature, not something you add for the video.

The `demo-playwright` server runs `--isolated`, so nothing persists between sessions. That is
deliberate — it means every take starts from the same place — but it means auth must be part
of the recorded flow or injected each time.

Never record real credentials, tokens, or API keys on screen. Check the frames for them in
review.

## Resettable state

Any section that mutates data (creates a record, deletes something, sends something) needs a
reset before the next take, or take two will start from take one's leftovers.

Mark those sections `"resetBefore": true` and make `demo/prep/reset.sh` (or equivalent)
idempotent and fast — under a few seconds, since it runs between every re-record.

Resetting by clicking "undo" in the UI is not a reset; it is another recording of the app.

## Hiding what should not be on camera

- Dev-only banners, environment badges, feature-flag panels, debug overlays.
- Notification toasts that fire on a timer and will land mid-take.
- Analytics/consent modals — dismiss before recording, or block the domain with the
  route-blocking tools.
- Third-party widgets (chat bubbles, survey prompts) that appear after N seconds.
- Anything in `brief.md`'s do-not-show list.

The cursor overlay script exposes `window.__demoHideSelectors([...])` for the simple cases,
and `--init-script` runs it in every page automatically.

## Definition of done

Before handing off to capture:

- [ ] App boots with one recorded command; readiness signal documented.
- [ ] Every storyboard route renders with realistic data, no empty states.
- [ ] Console is free of errors on the demo paths.
- [ ] Clock frozen or relative times stable; no random or rotating content.
- [ ] Dev UI, toasts, and third-party widgets suppressed.
- [ ] Auth handled and reproducible.
- [ ] `demo/prep/` scripts re-create all of the above from nothing.
- [ ] Two consecutive dry runs produce the same screenshots.

If any box cannot be ticked, say which one and what it will cost the demo. Do not proceed
to a recorded take hoping it looks acceptable — it will not, and the narration will already
be cut to it.
