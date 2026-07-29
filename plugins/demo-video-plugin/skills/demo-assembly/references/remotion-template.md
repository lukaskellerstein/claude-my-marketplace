# The bundled Remotion project

Lives at `assets/remotion-template/`, copied to `demo/studio/` by `init-demo.sh`. It renders
`demo/timeline.json` and needs no model-authored React for a standard demo — that is the point.

## How media resolves

`--public-dir=..` makes Remotion treat `demo/` as its public directory, so
`staticFile('capture/03-search.mp4')` resolves to `demo/capture/03-search.mp4`. No copying, no
symlinks, and the Studio hot-reloads when a clip is re-captured.

`timeline.json` is imported at build time (`../../timeline.json` from `src/Root.tsx`), so a
reconcile is picked up by the Studio automatically and `remotion render` needs no `--props`.

## Components

| File | Responsibility |
|---|---|
| `src/index.ts` | `registerRoot` |
| `src/Root.tsx` | One `<Composition id="Demo">`, dimensions/fps/duration from the timeline |
| `src/Timeline.tsx` | One `<Sequence>` per section at its absolute `startFrame`; narration as a delayed `<Audio>`; the music bed |
| `src/components/SectionShell.tsx` | Incoming transition (crossfade / fade-through-black / slide / cut) and the overlay layer |
| `src/components/Camera.tsx` | Scale drift with `transform-origin` from `camera.focus` |
| `src/components/LowerThird.tsx` | Top-left label, in and out on its own frames |
| `src/components/Captions.tsx` | The active caption chunk, bottom-centre |
| `src/sections/VideoSection.tsx` | `OffthreadVideo` with rate/trim, plus `<Freeze>` for the hold |
| `src/sections/StillSection.tsx` | Image beat, `objectFit: contain` |
| `src/sections/TitleCard.tsx` | Text card with a staggered rise |
| `src/sections/CodeSection.tsx` | Snippet with line numbers and a highlight band, no highlighter dependency |
| `src/lib/timeline.ts` | Types + `dbToGain` + `focusToOrigin` |
| `src/lib/theme.ts` | The entire visual system |

## Why `OffthreadVideo`

Remotion's newer `<Video>` from `@remotion/media` is the current recommendation for new
projects, but `OffthreadVideo` is used here deliberately:

- Frame-accurate extraction during render, which is what matters for a cut assembled from
  measured durations.
- The pipeline guarantees CFR H.264 MP4, the input it handles best.
- `trimBefore`/`trimAfter` (v4.0.319+) map cleanly to the reconciler's frame arithmetic.

Switching to `@remotion/media` is a reasonable customisation — the props are similar and it
has a documented `fallbackOffthreadVideoProps` escape hatch. Re-render a draft and check for
seek artefacts if you do.

## The hold

```tsx
<Sequence durationInFrames={videoFrames}>          {/* the clip plays */}
  <OffthreadVideo {...shared} />
</Sequence>

<Sequence from={videoFrames} durationInFrames={hold}>
  <Freeze frame={videoFrames - 1}>                 {/* its last frame, held */}
    <OffthreadVideo {...shared} />
  </Freeze>
</Sequence>
```

Both live inside `<Camera>`, so the scale drift continues across the freeze. That continuity
is what makes a held frame read as a deliberate beat rather than a stall.

## Theming

Change `src/lib/theme.ts` and nothing else:

```ts
color: { accent: '#5B8CFF', text: '#FFFFFF', surface: 'rgba(12,14,18,0.82)', … }
font:  { sans: '-apple-system, …', mono: 'ui-monospace, …' }
safeArea: { x: 88, bottom: 72, top: 64 }
```

Fonts are system fonts on purpose — no font dependency, identical render on any machine. To
use a brand font, add `@remotion/google-fonts` or `@remotion/fonts` and load it in `Root.tsx`;
be aware that a font that fails to load mid-render silently changes the layout.

The overlay style is deliberately restrained. The app UI is the subject; overlays that compete
with it make the demo look like a template.

## Extending

**New section type.** Add `sections/MySection.tsx`, dispatch on `surface` in `Timeline.tsx`,
add the surface to the `SURFACES` set in `scripts/validate-storyboard.mjs` (otherwise the
storyboard will not validate), and thread any new fields through `reconcile.mjs` and the
types in `src/lib/timeline.ts`.

**New transition.** Add a branch in `SectionShell.tsx` and to the `TransitionIn` type in
`src/lib/timeline.ts`. Remember `reconcile.mjs` computes the overlap: any transition other
than `cut` consumes `transitionIn.seconds` of overlap.

**Chapter markers / progress bar / watermark.** Add a component rendered once in
`Timeline.tsx` outside the per-section sequences, reading `timeline.sections` for boundaries.

**Anything ambitious** — use the Remotion agent skills (`/remotion-markup`,
`/remotion-captions`, `/remotion-docs`) and delegate the iteration to the
`demo-remotion-builder` subagent.

## Keep the contract

Whatever you add, sections must still be positioned by `startFrame` and `durationInFrames`
from the timeline. Those numbers come from measured audio and video; the moment a component
computes its own layout instead, the measured pipeline no longer controls the cut and A/V
drift becomes possible again.

## Local commands

```bash
cd demo/studio
npm install
npm start            # Studio, with --public-dir=.. already set
npm run typecheck
npm run render       # full-quality render to ../out/demo.mp4
```

Prefer `scripts/render.sh` over `npm run render`: it validates the timeline first and picks
concurrency and quality presets.
