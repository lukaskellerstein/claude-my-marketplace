# Determinism checklist

Every source of variation between takes. Anything left unfixed here shows up as a section
that no longer matches its neighbours after a re-record — the most expensive kind of defect,
because it appears only in the finished video.

## Time

| Source | Fix |
|---|---|
| "2 minutes ago" relative timestamps | Freeze the clock and seed relative to the same instant |
| Clocks, "last updated" fields | Freeze the clock |
| Date pickers defaulting to today | Freeze the clock, or seed dates well away from the boundary |
| Anything that expires (sessions, trials) | Seed with a far-future expiry |
| Animations keyed to wall-clock time | Usually fine; check the first frame of the section |

The cursor overlay exposes `window.__demoFreezeClock('2026-03-17T09:20:00Z')`, applied in
every page via `--init-script`. For Electron, set `meta.electron.freezeClock`. If the app
gets time from the server, freeze it there too — or seed absolute timestamps and avoid
relative formatting on demo paths.

## Randomness

- Random avatars, colours, or placeholder images assigned per render.
- Shuffled lists, "random tip of the day", A/B assignment.
- Generated ids visible in the UI (they will differ between takes and between the clip and
  the narration).
- Sort orders that tie-break non-deterministically — two rows with the same timestamp can
  swap. Seed distinct values.

## Network and timing

- **Warm the caches during rehearsal**, then record. First-load compile in a dev server can
  be seconds; the recorded take should hit primed paths.
- Mark every wait `idleUpTo` so a variable-length wait is capped and compressible.
- Block analytics, error reporting, and third-party widget domains with the route tools —
  they add unpredictable latency and can render UI.
- If a real external call is slow and variable, consider stubbing just that call, and say so.

## UI that appears on its own

- Toast notifications on timers or websockets.
- Cookie/consent banners, onboarding tours, "what's new" modals.
- Chat bubbles and survey prompts that appear after N seconds.
- Session-expiry warnings.
- Dev tooling: HMR overlays, error overlays, environment badges, flag panels, the React
  Query/Redux devtools.

Fix by disabling the feature for the demo build where possible; otherwise
`window.__demoHideSelectors(['#intercom-container', '.dev-banner'])`.

## Viewport and layout

- **Fix the viewport** (`--viewport-size=1600x900`) and never resize mid-demo; a resize
  changes the recording dimensions.
- Watch for responsive breakpoints: 1600px wide may collapse a sidebar you wanted visible.
  Check at the actual capture size, not at your window size.
- System font fallbacks differ per machine; if the app loads webfonts, wait for them before
  the first action or the first frames will reflow.
- `prefers-color-scheme` — pin light or dark explicitly rather than inheriting the machine.
- Scrollbar appearance differs across platforms and can flicker; hide it on demo paths if it
  is distracting.

## Focus and hover state

- A leftover `:focus` ring from the previous section's last click can appear in the next
  clip. Blur or reset between takes.
- Hover styles depend on where the pointer was left. Move the pointer to a neutral position
  at the end of each section.
- Autofocused inputs can steal the first keystroke; check the first action of each section.

## Application state

- Persisted UI state (collapsed panels, chosen tabs, dismissed banners) lives in
  localStorage. `--isolated` clears it per session, which means it resets — verify the demo
  does not depend on state a returning user would have.
- Mutations from a previous take: set `resetBefore: true` on sections that create or delete.
- Multi-tab or multi-window state, if the demo uses more than one.

## Verification

Two dry runs, screenshots compared:

```
For each storyboard section:
  run the rehearsal, screenshot the final state
  reset, run again, screenshot again
  the two must be visually identical apart from the cursor
```

Any difference is a determinism bug. Find it now — after narration is recorded, fixing it
means re-cutting the section.

## Accepting non-determinism

Sometimes it cannot be removed: live data, a real third-party integration, a genuinely
random model output. In that case:

- Confine it to a single section, so a re-record affects one clip.
- Set `videoLed: true` so the clip's own length drives the section rather than being fitted
  to narration.
- Write narration that stays true regardless of the specific values ("results come back
  ranked by relevance", not "the top result is the auth diagram").
