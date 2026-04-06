# Slide Layout Catalog

Each layout below includes a description, when to use it, and a complete PptxGenJS implementation. Mix at least 3 different layouts in every deck.

All examples assume `LAYOUT_16x9` (10" x 5.625"). All layout functions accept font and color parameters — **never hardcode Georgia/Calibri**. Use the fonts from your chosen design template.

---

## 1. Title Slide (Photo Background)

Full-bleed photo background with dark overlay and large white text.

**When to use:** Opening slide, section dividers, closing slide.

**Image:** Source a **16:9** (1920x1080) background photo via the `image-sourcing` skill. Make it specific to the presentation topic.

```javascript
function addTitleSlide(pres, { title, subtitle, bgImageData, primary, accent, headerFont, bodyFont }) {
  const slide = pres.addSlide();

  if (bgImageData) {
    slide.background = { data: bgImageData };
  } else {
    slide.background = { color: primary };
  }

  // Dark overlay
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 5.625,
    fill: { color: "000000", transparency: 45 }
  });

  slide.addText(title, {
    x: 0.8, y: 1.2, w: 8.4, h: 2.0,
    fontSize: 48, fontFace: headerFont, color: "FFFFFF",
    bold: true, align: "left", valign: "bottom"
  });

  slide.addText(subtitle, {
    x: 0.8, y: 3.5, w: 8.4, h: 0.8,
    fontSize: 18, fontFace: bodyFont, color: "E2E8F0",
    align: "left"
  });

  return slide;
}
```

---

## 2. Split-Image Slide (Text + Full-Height Photo)

Photo fills one half edge-to-edge, content on the other half.

**When to use:** Explaining a concept alongside an illustration, before/after comparisons, feature descriptions.

**Image:** Source a **9:10 or 1:1** photo via the `image-sourcing` skill — it fills a tall, narrow space.

```javascript
function addSplitImageSlide(pres, { title, bodyText, imageData, imageSide, primary, accent, headerFont, bodyFont }) {
  const slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };

  const imgX = imageSide === "left" ? 0 : 5;
  const contentX = imageSide === "left" ? 5.5 : 0.5;

  slide.addImage({
    data: imageData,
    x: imgX, y: 0, w: 5, h: 5.625,
    sizing: { type: "cover", w: 5, h: 5.625 }
  });

  slide.addText(title, {
    x: contentX, y: 0.8, w: 4.0, h: 1.0,
    fontSize: 28, fontFace: headerFont, color: primary,
    bold: true, margin: 0, valign: "bottom"
  });

  slide.addText(bodyText, {
    x: contentX, y: 2.0, w: 4.0, h: 3.0,
    fontSize: 15, fontFace: bodyFont, color: "333333",
    valign: "top", align: "left"
  });

  return slide;
}
```

---

## 3. Stat Callout Cards

2-4 large numbers in elevated rounded cards with shadows.

**When to use:** KPIs, results, metrics, achievements, data highlights.

```javascript
function addStatCardsSlide(pres, { title, stats, primary, secondary, accent, headerFont, bodyFont }) {
  const slide = pres.addSlide();
  slide.background = { color: "F5F5F5" };

  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.7,
    fontSize: 28, fontFace: headerFont, color: primary,
    bold: true, margin: 0
  });

  const count = stats.length;
  const cardW = (9 - (count - 1) * 0.4) / count;
  const startX = 0.5;

  for (let i = 0; i < count; i++) {
    const x = startX + i * (cardW + 0.4);

    const makeCardStyle = () => ({
      fill: { color: "FFFFFF" },
      rectRadius: 0.12,
      shadow: { type: "outer", color: "000000", blur: 10, offset: 3, angle: 135, opacity: 0.1 }
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.4, w: cardW, h: 3.0,
      ...makeCardStyle()
    });

    slide.addText(stats[i].value, {
      x, y: 1.8, w: cardW, h: 1.5,
      fontSize: 72, fontFace: headerFont, color: primary,
      bold: true, align: "center", valign: "bottom"
    });

    slide.addText(stats[i].label, {
      x: x + 0.2, y: 3.5, w: cardW - 0.4, h: 0.7,
      fontSize: 13, fontFace: bodyFont, color: "666666",
      align: "center", valign: "top"
    });
  }

  return slide;
}
```

---

## 4. Content Grid (2x2)

Four content blocks in a 2x2 grid with card styling.

**When to use:** Comparing 4 options, pillars of a strategy, categories, quadrants.

```javascript
function addContentGridSlide(pres, { title, blocks, primary, secondary, headerFont, bodyFont }) {
  const slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.7,
    fontSize: 28, fontFace: headerFont, color: primary,
    bold: true, margin: 0
  });

  const positions = [
    { x: 0.5, y: 1.3 },  { x: 5.1, y: 1.3 },
    { x: 0.5, y: 3.4 },  { x: 5.1, y: 3.4 }
  ];
  const bw = 4.3, bh = 1.8;

  for (let i = 0; i < 4; i++) {
    const { x, y } = positions[i];

    const makeCard = () => ({
      fill: { color: secondary },
      rectRadius: 0.1,
      shadow: { type: "outer", color: "000000", blur: 4, offset: 1, angle: 135, opacity: 0.06 }
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: bw, h: bh,
      ...makeCard()
    });

    slide.addText(blocks[i].heading, {
      x: x + 0.25, y: y + 0.2, w: bw - 0.5, h: 0.4,
      fontSize: 16, fontFace: headerFont, color: primary,
      bold: true, margin: 0
    });

    slide.addText(blocks[i].body, {
      x: x + 0.25, y: y + 0.7, w: bw - 0.5, h: 0.9,
      fontSize: 13, fontFace: bodyFont, color: "444444",
      valign: "top", margin: 0
    });
  }

  return slide;
}
```

---

## 5. Icon + Text Rows

2-4 rows, each with an icon in a colored circle and text to its right.

**When to use:** Feature lists, service offerings, key points, process steps.

```javascript
function addIconRowsSlide(pres, { title, items, primary, accent, headerFont, bodyFont }) {
  const slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.7,
    fontSize: 28, fontFace: headerFont, color: primary,
    bold: true, margin: 0
  });

  const startY = 1.4;
  const rowH = 1.0;

  for (let i = 0; i < items.length; i++) {
    const y = startY + i * rowH;

    slide.addShape(pres.shapes.OVAL, {
      x: 0.7, y: y, w: 0.6, h: 0.6,
      fill: { color: primary }
    });

    slide.addText([
      { text: items[i].label, options: { bold: true, fontSize: 16, color: primary, breakLine: true } },
      { text: items[i].desc, options: { fontSize: 13, color: "555555" } }
    ], { x: 1.6, y: y - 0.05, w: 7.5, h: 0.7, fontFace: bodyFont, valign: "middle", margin: 0 });
  }

  return slide;
}
```

---

## 6. Timeline / Process Flow

Horizontal numbered steps connected by a line.

**When to use:** Project phases, process steps, roadmap, milestones.

```javascript
function addTimelineSlide(pres, { title, steps, primary, accent, headerFont, bodyFont }) {
  const slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.7,
    fontSize: 28, fontFace: headerFont, color: primary,
    bold: true, margin: 0
  });

  const count = steps.length;
  const lineY = 2.8;
  const startX = 1.2;
  const endX = 8.8;
  const spacing = (endX - startX) / (count - 1);

  slide.addShape(pres.shapes.LINE, {
    x: startX, y: lineY, w: endX - startX, h: 0,
    line: { color: "CCCCCC", width: 2 }
  });

  for (let i = 0; i < count; i++) {
    const cx = startX + i * spacing;

    slide.addShape(pres.shapes.OVAL, {
      x: cx - 0.25, y: lineY - 0.25, w: 0.5, h: 0.5,
      fill: { color: primary }
    });

    slide.addText(String(i + 1), {
      x: cx - 0.25, y: lineY - 0.25, w: 0.5, h: 0.5,
      fontSize: 16, fontFace: bodyFont, color: "FFFFFF",
      bold: true, align: "center", valign: "middle"
    });

    slide.addText(steps[i], {
      x: cx - 1, y: lineY + 0.5, w: 2, h: 0.8,
      fontSize: 12, fontFace: bodyFont, color: "444444",
      align: "center", valign: "top"
    });
  }

  return slide;
}
```

---

## 7. Comparison (Side by Side)

Two columns comparing options — before/after, pros/cons, old/new.

**When to use:** Product comparison, before/after, option A vs B.

```javascript
function addComparisonSlide(pres, { title, leftTitle, leftItems, rightTitle, rightItems, primary, accent, headerFont, bodyFont }) {
  const slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.7,
    fontSize: 28, fontFace: headerFont, color: primary,
    bold: true, margin: 0
  });

  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 1.2, w: 4.3, h: 0.6,
    fill: { color: primary }, rectRadius: 0.06
  });
  slide.addText(leftTitle, {
    x: 0.5, y: 1.2, w: 4.3, h: 0.6,
    fontSize: 16, fontFace: bodyFont, color: "FFFFFF",
    bold: true, align: "center", valign: "middle"
  });

  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.2, y: 1.2, w: 4.3, h: 0.6,
    fill: { color: accent }, rectRadius: 0.06
  });
  slide.addText(rightTitle, {
    x: 5.2, y: 1.2, w: 4.3, h: 0.6,
    fontSize: 16, fontFace: bodyFont, color: "FFFFFF",
    bold: true, align: "center", valign: "middle"
  });

  const leftTextArr = leftItems.map((item, i) => ({
    text: item,
    options: { bullet: true, breakLine: i < leftItems.length - 1 }
  }));
  slide.addText(leftTextArr, {
    x: 0.5, y: 2.0, w: 4.3, h: 3.0,
    fontSize: 14, fontFace: bodyFont, color: "333333",
    valign: "top"
  });

  const rightTextArr = rightItems.map((item, i) => ({
    text: item,
    options: { bullet: true, breakLine: i < rightItems.length - 1 }
  }));
  slide.addText(rightTextArr, {
    x: 5.2, y: 2.0, w: 4.3, h: 3.0,
    fontSize: 14, fontFace: bodyFont, color: "333333",
    valign: "top"
  });

  return slide;
}
```

---

## 8. Quote / Testimonial (Photo Background)

Large quote with attribution over a full-bleed photo.

**When to use:** Customer quotes, expert opinions, mission statements.

**Image:** Source a **16:9** (1920x1080) atmospheric, moody photo via the `image-sourcing` skill.

```javascript
function addQuoteSlide(pres, { quote, author, role, bgImageData, primary, accent, headerFont, bodyFont }) {
  const slide = pres.addSlide();

  if (bgImageData) {
    slide.background = { data: bgImageData };
  } else {
    slide.background = { color: primary };
  }

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 5.625,
    fill: { color: "000000", transparency: 40 }
  });

  slide.addText(quote, {
    x: 1.2, y: 1.0, w: 7.6, h: 2.8,
    fontSize: 28, fontFace: headerFont, color: "FFFFFF",
    italic: true, align: "left", valign: "middle"
  });

  slide.addText([
    { text: author, options: { bold: true, fontSize: 16, color: "FFFFFF", breakLine: true } },
    { text: role, options: { fontSize: 13, color: "BBBBBB" } }
  ], { x: 1.2, y: 4.2, w: 7.6, h: 0.8, fontFace: bodyFont, align: "left", margin: 0 });

  return slide;
}
```

---

## 9. Chart Slide

A chart (bar, line, pie) with a title. **Always use native PptxGenJS charts** — they remain editable in PowerPoint.

**When to use:** Data presentation, trends, comparisons, financial results.

```javascript
function addChartSlide(pres, { title, annotation, chartType, chartData, chartOpts, primary, headerFont, bodyFont }) {
  const slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.7,
    fontSize: 28, fontFace: headerFont, color: primary,
    bold: true, margin: 0
  });

  const defaultOpts = {
    x: 0.5, y: 1.2, w: 9, h: 3.8,
    showTitle: false,
    valGridLine: { color: "E8E8E8", size: 0.5 },
    catGridLine: { style: "none" }
  };
  slide.addChart(chartType, chartData, { ...defaultOpts, ...chartOpts });

  if (annotation) {
    slide.addText(annotation, {
      x: 0.5, y: 5.1, w: 9, h: 0.4,
      fontSize: 11, fontFace: bodyFont, color: "999999",
      italic: true
    });
  }

  return slide;
}
```

---

## 10. Closing Slide

Full-bleed photo or solid color with centered call-to-action. Mirrors the title slide.

**When to use:** Last slide, next steps, contact information, thank you.

**Image:** Reuse the title photo or source a new **16:9** photo via the `image-sourcing` skill.

```javascript
function addClosingSlide(pres, { headline, subtext, contactInfo, bgImageData, primary, accent, headerFont, bodyFont }) {
  const slide = pres.addSlide();

  if (bgImageData) {
    slide.background = { data: bgImageData };
  } else {
    slide.background = { color: primary };
  }

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 5.625,
    fill: { color: "000000", transparency: 50 }
  });

  slide.addText(headline, {
    x: 1, y: 1.5, w: 8, h: 1.2,
    fontSize: 40, fontFace: headerFont, color: "FFFFFF",
    bold: true, align: "center", valign: "middle"
  });

  slide.addText(subtext, {
    x: 1, y: 3.0, w: 8, h: 0.6,
    fontSize: 16, fontFace: bodyFont, color: "E2E8F0",
    align: "center"
  });

  if (contactInfo) {
    slide.addText(contactInfo, {
      x: 1, y: 4.0, w: 8, h: 0.6,
      fontSize: 14, fontFace: bodyFont, color: "BBBBBB",
      align: "center"
    });
  }

  return slide;
}
```

---

## 11. Big Idea / Impact Slide

One powerful statement anchored to the left, dramatic whitespace on the right. Use for "one big idea" moments or section dividers.

**When to use:** Key insight, provocative question, thesis statement, section transition.

```javascript
function addBigIdeaSlide(pres, { statement, attribution, primary, accent, headerFont, bodyFont }) {
  const slide = pres.addSlide();
  slide.background = { color: primary };

  // Subtle background shape (optional depth)
  slide.addShape(pres.shapes.OVAL, {
    x: 5, y: -1, w: 8, h: 8,
    fill: { color: accent, transparency: 92 }
  });

  slide.addText(statement, {
    x: 0.8, y: 0.8, w: 5.5, h: 3.5,
    fontSize: 36, fontFace: headerFont, color: "FFFFFF",
    bold: true, align: "left", valign: "top"
  });

  if (attribution) {
    slide.addText(attribution, {
      x: 0.8, y: 4.5, w: 5.5, h: 0.5,
      fontSize: 13, fontFace: bodyFont, color: "94A3B8",
      align: "left"
    });
  }

  return slide;
}
```

---

## 12. Photo Hero

Full-bleed photo with minimal text overlay at the bottom. Maximum visual impact.

**When to use:** Emotional impact, portfolio pieces, product showcase, photography-first slides.

**Image:** Source a **16:9** (1920x1080) high-quality photo via the `image-sourcing` skill.

```javascript
function addPhotoHeroSlide(pres, { caption, bgImageData, position, bodyFont }) {
  const slide = pres.addSlide();
  slide.background = { data: bgImageData };

  // Bottom gradient overlay
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 3.5, w: 10, h: 2.125,
    fill: { color: "000000", transparency: 35 }
  });

  const textX = position === "right" ? 5 : 0.8;
  const textAlign = position === "right" ? "right" : "left";

  slide.addText(caption, {
    x: textX, y: 4.2, w: 4.2, h: 0.8,
    fontSize: 18, fontFace: bodyFont, color: "FFFFFF",
    align: textAlign, valign: "bottom"
  });

  return slide;
}
```

---

## 13. Bold Stats

Stats on a bold colored background — no cards, just numbers and dividers. More modern than white-card stats.

**When to use:** High-impact metrics, results summary, dashboard-style data.

```javascript
function addBoldStatsSlide(pres, { title, stats, bgColor, textColor, accentColor, headerFont, bodyFont }) {
  const slide = pres.addSlide();
  slide.background = { color: bgColor };

  slide.addText(title, {
    x: 0.8, y: 0.5, w: 8.4, h: 0.7,
    fontSize: 28, fontFace: headerFont, color: textColor,
    bold: true, margin: 0
  });

  const count = stats.length;
  const colW = 8.4 / count;

  for (let i = 0; i < count; i++) {
    const x = 0.8 + i * colW;

    slide.addText(stats[i].value, {
      x, y: 1.8, w: colW, h: 1.5,
      fontSize: 72, fontFace: headerFont, color: textColor,
      bold: true, align: "left", valign: "bottom", margin: 0
    });

    // Thin divider between columns
    if (i < count - 1) {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: x + colW - 0.05, y: 1.8, w: 0.02, h: 3.0,
        fill: { color: accentColor, transparency: 60 }
      });
    }

    slide.addText(stats[i].label, {
      x, y: 3.4, w: colW - 0.3, h: 0.8,
      fontSize: 14, fontFace: bodyFont, color: textColor,
      align: "left", valign: "top", margin: 0
    });
  }

  return slide;
}
```

---

## 14. Dark Elevated Cards

Cards on dark backgrounds — the modern alternative to white cards on light gray.

**When to use:** Feature showcases, tech presentations, dark-theme decks, value propositions.

```javascript
function addDarkCardsSlide(pres, { title, cards, bgColor, surfaceColor, textColor, accentColor, headerFont, bodyFont }) {
  const slide = pres.addSlide();
  slide.background = { color: bgColor }; // e.g., "0F172A"

  slide.addText(title, {
    x: 0.8, y: 0.4, w: 8.4, h: 0.7,
    fontSize: 28, fontFace: headerFont, color: textColor,
    bold: true, margin: 0
  });

  const count = cards.length;
  const cardW = (8.4 - (count - 1) * 0.3) / count;

  for (let i = 0; i < count; i++) {
    const x = 0.8 + i * (cardW + 0.3);

    const makeCard = () => ({
      fill: { color: surfaceColor }, // e.g., "1E293B"
      rectRadius: 0.12,
      shadow: { type: "outer", color: "000000", blur: 10, offset: 3, angle: 135, opacity: 0.3 }
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.5, w: cardW, h: 3.5,
      ...makeCard()
    });

    // Accent top strip
    slide.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.3, y: 1.8, w: 1.2, h: 0.04,
      fill: { color: accentColor }
    });

    slide.addText(cards[i].title, {
      x: x + 0.3, y: 2.1, w: cardW - 0.6, h: 0.5,
      fontSize: 18, fontFace: headerFont, color: textColor,
      bold: true, margin: 0
    });

    slide.addText(cards[i].body, {
      x: x + 0.3, y: 2.7, w: cardW - 0.6, h: 2.0,
      fontSize: 13, fontFace: bodyFont, color: "94A3B8",
      valign: "top", margin: 0
    });
  }

  return slide;
}
```

---

## Layout Selection Guide

| Content Type | Recommended Layout |
|-------------|-------------------|
| Opening / section divider | Title Slide or Big Idea |
| Feature list / key points | Icon + Text Rows |
| KPIs / metrics / results | Stat Callout Cards or Bold Stats |
| Explaining a concept | Split-Image Slide |
| Comparing options | Comparison (Side by Side) |
| Strategy pillars / categories | Content Grid (2x2) |
| Process / workflow / roadmap | Timeline / Process Flow |
| Customer quote / testimonial | Quote / Testimonial (Photo Background) |
| Key insight / provocative question | Big Idea / Impact Slide |
| Visual impact / portfolio | Photo Hero |
| Feature showcase (dark theme) | Dark Elevated Cards |
| Data / charts / trends | Chart Slide |
| Closing / CTA / contact | Closing Slide |

### Image Plan

Before generating slides, plan which slides need images and at what aspect ratio:

| Slide | Image Type | Aspect Ratio | Notes |
|-------|-----------|--------------|-------|
| Title | Full-bleed background | 16:9 | Topic-specific, atmospheric |
| Split-Image | Half-slide photo | 9:10 or 1:1 | Relevant to slide content |
| Quote | Full-bleed background | 16:9 | Moody, atmospheric |
| Photo Hero | Full-bleed background | 16:9 | High-quality, impactful |
| Closing | Full-bleed background | 16:9 | Can reuse title photo |

**Gather all needed images BEFORE starting the generation script.** Use the `image-sourcing` skill to search Unsplash first; fall back to the `image-generation` skill only when no suitable stock photo exists.

### Deck Rhythm Principles

1. **Bookend with impact**: First and last slides should share visual DNA (same photo, same color, mirrored layout).
2. **Alternate visual weight**: After a dense content slide, follow with a breathing slide (photo, big quote, or single stat).
3. **No more than 2 consecutive slides with the same background treatment**.
4. **Section dividers reset the eye**: Use a dark/photo/Big Idea slide to signal "new topic."
5. **One idea per slide**: If a slide has a title AND bullets AND a chart AND a photo, split it.
6. **End strong**: The closing slide should feel as polished as the title slide.
7. **At least 3 slides should have photo backgrounds.**
