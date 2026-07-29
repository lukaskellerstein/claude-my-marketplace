# Beat templates

Starting structures by product type. Adapt — do not fill in blindly. Durations assume
2.3 words/sec narration; word counts are what fits.

Set `meta.targetSeconds` from the **sum of the section rows you keep**, not from the
heading — the heading range allows for dropping optional beats and for the ~0.85s of
lead-in and tail the reconciler adds per section.

## Web app / SaaS product — 75-95s

| Beat | Secs | Words | Content |
|---|---|---|---|
| `hook` | 7 | ~16 | The cost of the status quo, stated as a fact with a number if you have one. |
| `problem` | 10 | ~23 | What the viewer does today and why it breaks down at scale. |
| `core-flow` | 16 | ~37 | Primary job, from trigger to visible result. This is the section the demo exists for. |
| `core-flow` | 14 | ~32 | Second capability, ideally one that only works because of the first. |
| `wow` | 13 | ~30 | The non-obvious payoff: something derived, automated, or traced that the alternative cannot do. |
| `integration` | 10 | ~23 | It fits their existing stack — export, API, the tool they will not replace. |
| `close` | 7 | ~16 | The single next action. |

## Developer tool / CLI / library — 70-90s

Developers distrust polish and trust specifics. Show real terminal output and real code.

| Beat | Secs | Content |
|---|---|---|
| `hook` | 6 | The failure mode they recognise — the flaky step, the 40-minute build, the manual sync. |
| `core-flow` (`surface: code`) | 8 | The install/config, small enough to read in one breath. |
| `core-flow` | 15 | Run it. Show real output, not a summary of output. |
| `core-flow` | 14 | The flag or mode that handles the case they were about to ask about. |
| `wow` | 12 | The thing that would take an afternoon by hand. |
| `proof` | 10 | Test suite, benchmark, CI run — evidence, not a claim. |
| `close` | 6 | One command to try it. |

## AI / agent product — 70-90s

The risk is looking like a chat wrapper. Show the work, not just the answer.

| Beat | Secs | Content |
|---|---|---|
| `hook` | 7 | The task, framed as work someone is doing manually today. |
| `core-flow` | 16 | The request and the *process* — steps, tool calls, intermediate state. |
| `wow` | 15 | The artifact it produced, opened and inspected. Let it be looked at. |
| `proof` | 12 | Where it is grounded: the sources, the trace, the audit trail. Answers "can I trust it". |
| `core-flow` | 12 | Correction or steering — the viewer's real question is "what if it is wrong". |
| `close` | 7 | What to point it at first. |

## Desktop / Electron app — 65-85s

| Beat | Secs | Surface | Content |
|---|---|---|---|
| `hook` | 7 | `web` | The problem, in the main window. |
| `core-flow` | 15 | `web` | Primary flow — capture in the browser renderer where quality is best. |
| `core-flow` | 14 | `web` | Second flow, still in the renderer. |
| `wow` | 13 | `electron` | The native capability: offline, filesystem, menus, multi-window, tray. Hard-cut into it. |
| `integration` | 10 | `electron` | OS integration — file dialogs, notifications, deep links. |
| `close` | 7 | `titlecard` | Download and next step. |

Capture as much as possible in the browser renderer; reserve `electron` for beats that are
genuinely native. See `demo-capture/references/electron.md`.

## Internal tool / migration / infrastructure — 60-75s

Audience is colleagues who need to decide whether to adopt or approve. Skip the marketing
arc entirely.

| Beat | Secs | Content |
|---|---|---|
| `problem` | 10 | The current process, named honestly, including who it burdens. |
| `core-flow` | 15 | The new path, end to end. |
| `core-flow` | 14 | The awkward case everyone will ask about, handled on camera. |
| `proof` | 12 | Before/after numbers, or the rollback path. |
| `close` | 8 | Who to talk to, and what changes on Monday. |

## Release notes / changelog video — 45-60s

One section per change, ordered by how many people it affects. The opening card carries the
hook duty — the audience already uses the product.

| Beat | Secs | Content |
|---|---|---|
| `hook` (`surface: titlecard`) | 3 | Version and date. |
| `core-flow` | 12 | Biggest change, shown working. |
| `core-flow` | 12 | Second change. |
| `core-flow` | 10 | Third change. |
| `close` | 6 | Where the full changelog lives. |

## Choosing durations

Start from total length, subtract the close, and give the rest to core flows in proportion
to how much they matter:

- **60s** — 3 sections. One core flow. Ruthless.
- **90s** — 4-5 sections. The default. Two core flows plus a wow.
- **120s** — 5-6 sections. Room for a proof or integration beat.
- **over 150s** — needs chapters, and probably wants to be two videos.

If the material genuinely does not fit, cut a capability rather than compressing every
section. Four rushed sections read worse than three unhurried ones.
