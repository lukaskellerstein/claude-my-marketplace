import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Section } from '../lib/timeline';
import { theme } from '../lib/theme';

/**
 * Opening or closing card. Kept to text on a near-black field: a demo's title card exists
 * to set expectation in two seconds, and anything more elaborate delays the product.
 */
export const TitleCard: React.FC<{ section: Section }> = ({ section }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const title = section.titlecard?.title ?? section.title;
  const subtitle = section.titlecard?.subtitle;

  const rise = (delayFrames: number) =>
    interpolate(frame, [delayFrames, delayFrames + Math.round(fps * 0.55)], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.22, 0.61, 0.36, 1),
    });

  const titleIn = rise(0);
  const subtitleIn = rise(Math.round(fps * 0.18));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.color.surfaceSolid,
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: theme.font.sans,
        padding: theme.safeArea.x,
      }}
    >
      <div
        style={{
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [14, 0])}px)`,
          color: theme.color.text,
          fontSize: theme.titleCard.titleSize,
          fontWeight: 650,
          letterSpacing: '-0.02em',
          textAlign: 'center',
          lineHeight: 1.1,
          maxWidth: 1500,
        }}
      >
        {title}
      </div>

      {subtitle ? (
        <div
          style={{
            opacity: subtitleIn,
            transform: `translateY(${interpolate(subtitleIn, [0, 1], [12, 0])}px)`,
            marginTop: 26,
            color: theme.color.textMuted,
            fontSize: theme.titleCard.subtitleSize,
            fontWeight: 450,
            textAlign: 'center',
            maxWidth: 1100,
          }}
        >
          {subtitle}
        </div>
      ) : null}

      <div
        style={{
          opacity: subtitleIn * 0.9,
          marginTop: 40,
          width: 64,
          height: 3,
          borderRadius: 2,
          backgroundColor: theme.color.accent,
        }}
      />
    </AbsoluteFill>
  );
};
