import React from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../lib/theme';

/**
 * The label that names what the viewer is looking at.
 *
 * Top-left rather than the broadcast-style bottom-left, because captions live along the
 * bottom and a demo's UI usually has its own chrome down there. It appears with the
 * narration and leaves after ~3 seconds — a label that stays for the whole section stops
 * being read and starts being clutter.
 */
export const LowerThird: React.FC<{
  lowerThird: { text: string; inFrame: number; outFrame: number };
}> = ({ lowerThird }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { text, inFrame, outFrame } = lowerThird;

  const dur = Math.round(fps * 0.42);
  const enter = interpolate(frame, [inFrame, inFrame + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.22, 0.61, 0.36, 1),
  });
  const exit = interpolate(frame, [outFrame - dur, outFrame], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 1, 1),
  });
  const opacity = Math.min(enter, exit);
  if (opacity <= 0.001) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: theme.safeArea.top,
        left: theme.safeArea.x,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 22px 14px 18px',
        borderRadius: theme.radius.md,
        backgroundColor: theme.color.surface,
        backdropFilter: 'blur(10px)',
        fontFamily: theme.font.sans,
        color: theme.color.text,
        fontSize: theme.lowerThird.fontSize,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        opacity,
        transform: `translateY(${interpolate(opacity, [0, 1], [-10, 0])}px)`,
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
      }}
    >
      <span
        style={{
          width: 4,
          alignSelf: 'stretch',
          borderRadius: 2,
          backgroundColor: theme.color.accent,
        }}
      />
      {text}
    </div>
  );
};
