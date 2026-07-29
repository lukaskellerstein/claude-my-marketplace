// Visual system for the overlay layer (lower-thirds, captions, title cards).
//
// Deliberately restrained: the app UI is the subject, and overlays that compete with it
// make a demo look like a template. Everything here is system fonts, so the project has
// no font dependency and renders identically on any machine.
//
// To match a product's brand, change these values — nothing else needs to know.

export const theme = {
  font: {
    sans:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, ui-sans-serif, system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },
  color: {
    ink: '#0B0D10',
    surface: 'rgba(12, 14, 18, 0.82)',
    surfaceSolid: '#0C0E12',
    text: '#FFFFFF',
    textMuted: 'rgba(255, 255, 255, 0.68)',
    accent: '#5B8CFF',
    // Same hue as accent, as a bare triple so components can animate the alpha.
    accentRgb: '91, 140, 255',
    panel: '#111318',
    letterbox: '#07080A',
  },
  radius: { sm: 8, md: 14, lg: 22 },
  // Captions and lower-thirds sit inside this margin so they survive any crop.
  safeArea: { x: 88, bottom: 72, top: 64 },
  caption: {
    fontSize: 34,
    lineHeight: 1.28,
    maxWidth: 1180,
    paddingX: 22,
    paddingY: 12,
  },
  lowerThird: {
    fontSize: 40,
    subtitleSize: 22,
  },
  titleCard: {
    titleSize: 88,
    subtitleSize: 32,
  },
} as const;

/** Standard ease for overlay motion — quick in, settled out. */
export const EASE_OUT = [0.22, 0.61, 0.36, 1] as const;
