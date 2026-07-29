# Voice and model selection

## Models

| Model | Use for | Trade-off |
|---|---|---|
| `eleven_multilingual_v2` | **Default for demo narration.** Most stable and natural for read-aloud copy. | Slower than turbo/flash; irrelevant here since we generate a handful of short files. |
| `eleven_v3` | When you want more expressive delivery, or need its language coverage. | More variance between takes — regenerate and compare before committing a whole demo to it. |
| `eleven_turbo_v2_5` | Latency-sensitive interactive use. | Not needed for pre-rendered narration; slightly less natural on long sentences. |
| `eleven_flash_v2_5` | Cheapest, fastest. | Audible quality drop on narration-length copy. Acceptable for a scratch pass while iterating on timing. |

A useful pattern: generate scratch narration with a cheap model while the storyboard timing
is still moving, then regenerate the final pass with `eleven_multilingual_v2` once the section
lengths are settled. Re-reconcile after the switch — durations change.

## Parameters

| Parameter | Range | Effect on demo narration |
|---|---|---|
| `stability` | 0–1 | 0.45–0.6 is the useful band. Lower gets expressive and inconsistent between files; higher gets flat and can clip emphasis. |
| `similarity_boost` | 0–1 | 0.7–0.8. Higher tracks the reference voice more tightly; too high can introduce artefacts. |
| `style` | 0–1 | Keep low (0–0.3) for demos. Style exaggeration reads as performance, which costs credibility. |
| `speed` | 0.7–1.2 | Use 0.95–1.05 to nudge a line into its budget. Outside 0.9–1.1 is audible. |
| `use_speaker_boost` | bool | Usually leave on; marginal for clean read copy. |

Keep parameters **identical across all sections**. Different stability per file is audible as
the narrator's mood shifting between beats.

## Choosing by audience

**Technical evaluator (engineer, architect).** Dry, conversational, unperformed. The narration
is making claims that must sound checkable. Anything with sell in it triggers scepticism.

**Business evaluator (finance, ops, exec).** Measured and slightly formal, unhurried, clear on
numbers. Slower than you would pick for developers — the audience is following domain logic,
not code.

**Internal colleagues.** Plain and neutral. Marketing polish on an internal tool video reads
as spin, and undermines a proposal.

**Existing users (release notes).** Brisk and matter-of-fact. They already decided; do not
sell to them.

## Language

- Set `language` explicitly rather than relying on detection, especially for short lines where
  detection is unreliable.
- For a multilingual demo, generate one language per full pass with the same voice — do not
  mix languages inside a section.
- Non-English narration with an English product name: check the name's pronunciation
  specifically. It is where switching accents most often breaks.

## Auditioning efficiently

1. Take the **longest** section's line — it exposes pacing and breath, which a short line
   hides.
2. Generate it with two or three candidate voices.
3. Play them back **against the actual clip** if it exists, not in isolation. A voice that
   sounds good alone can be wrong over a UI.
4. Judge: does it sound like someone who uses this product, or someone selling it?

Then commit the winner to `meta.voice` and generate everything with it.

## Consistency across re-recordings

Record in `meta.voice` (and in `brief.md` for the humans): voice id, model id, and every
parameter. When one section is regenerated weeks later, matching these is what keeps it from
standing out. Voice ids are stable; voice *names* are not necessarily unique — store the id.
