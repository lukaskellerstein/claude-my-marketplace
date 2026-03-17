# Slide Layout Catalog

Each layout below includes a description, when to use it, and a complete PptxGenJS implementation. Mix at least 3 different layouts in every deck.

All examples assume `LAYOUT_16x9` (10" x 5.625").

---

## 1. Title Slide (Photo Background)

Full-bleed photo background with dark overlay and large white text. This is the premium default.

**When to use:** Opening slide, section dividers, closing slide.

**Image:** Source a **16:9** (1920x1080) background photo via the `image-sourcing` skill. Make it specific to the presentation topic.

```javascript
function addTitleSlide(pres, { title, subtitle, bgImageData, primary, accent }) {
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

  // Decorative circle
  slide.addShape(pres.shapes.OVAL, {
    x: 7, y: -1.5, w: 5, h: 5,
    fill: { color: accent, transparency: 80 }
  });

  // Accent bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y: 1.3, w: 1.5, h: 0.06, fill: { color: accent }
  });

  slide.addText(title, {
    x: 0.8, y: 1.5, w: 8.4, h: 1.5,
    fontSize: 44, fontFace: "Georgia", color: "FFFFFF",
    bold: true, align: "left"
  });

  slide.addText(subtitle, {
    x: 0.8, y: 3.2, w: 8.4, h: 0.8,
    fontSize: 18, fontFace: "Calibri", color: "EEEEEE",
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
function addSplitImageSlide(pres, { title, bodyText, imageData, imageSide, primary, accent }) {
  const slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };

  const imgX = imageSide === "left" ? 0 : 5;
  const contentX = imageSide === "left" ? 5.4 : 0.5;

  slide.addImage({
    data: imageData,
    x: imgX, y: 0, w: 5, h: 5.625,
    sizing: { type: "cover", w: 5, h: 5.625 }
  });

  slide.addShape(pres.shapes.RECTANGLE, {
    x: imageSide === "left" ? 5 : 4.94, y: 0, w: 0.06, h: 5.625,
    fill: { color: accent }
  });

  slide.addText(title, {
    x: contentX, y: 0.5, w: 4.2, h: 0.8,
    fontSize: 28, fontFace: "Georgia", color: primary,
    bold: true, margin: 0
  });

  slide.addText(bodyText, {
    x: contentX, y: 1.5, w: 4.2, h: 3.5,
    fontSize: 15, fontFace: "Calibri", color: "333333",
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
function addStatCardsSlide(pres, { title, stats, primary, secondary, accent }) {
  const slide = pres.addSlide();
  slide.background = { color: "F5F5F5" };

  slide.addShape(pres.shapes.OVAL, {
    x: -1.5, y: 3.5, w: 4, h: 4,
    fill: { color: primary, transparency: 92 }
  });

  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.7,
    fontSize: 28, fontFace: "Georgia", color: primary,
    bold: true, margin: 0
  });

  const count = stats.length;
  const cardW = (9 - (count - 1) * 0.4) / count;
  const startX = 0.5;

  for (let i = 0; i < count; i++) {
    const x = startX + i * (cardW + 0.4);

    const makeCardStyle = () => ({
      fill: { color: "FFFFFF" },
      rectRadius: 0.15,
      shadow: { type: "outer", color: "000000", blur: 8, offset: 3, angle: 135, opacity: 0.12 }
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.4, w: cardW, h: 3.0,
      ...makeCardStyle()
    });

    slide.addShape(pres.shapes.OVAL, {
      x: x + cardW / 2 - 0.3, y: 1.7, w: 0.6, h: 0.6,
      fill: { color: accent, transparency: 15 }
    });

    slide.addText(stats[i].value, {
      x, y: 2.5, w: cardW, h: 1.0,
      fontSize: 48, fontFace: "Georgia", color: primary,
      bold: true, align: "center", valign: "middle"
    });

    slide.addText(stats[i].label, {
      x: x + 0.2, y: 3.5, w: cardW - 0.4, h: 0.7,
      fontSize: 13, fontFace: "Calibri", color: "666666",
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
function addContentGridSlide(pres, { title, blocks, primary, secondary }) {
  const slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.7,
    fontSize: 28, fontFace: "Georgia", color: primary,
    bold: true, margin: 0
  });

  const positions = [
    { x: 0.5, y: 1.3 },  { x: 5.1, y: 1.3 },
    { x: 0.5, y: 3.4 },  { x: 5.1, y: 3.4 }
  ];
  const bw = 4.3, bh = 1.8;

  for (let i = 0; i < 4; i++) {
    const { x, y } = positions[i];

    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: bw, h: bh,
      fill: { color: secondary }
    });

    slide.addText(blocks[i].heading, {
      x: x + 0.25, y: y + 0.2, w: bw - 0.5, h: 0.4,
      fontSize: 16, fontFace: "Georgia", color: primary,
      bold: true, margin: 0
    });

    slide.addText(blocks[i].body, {
      x: x + 0.25, y: y + 0.7, w: bw - 0.5, h: 0.9,
      fontSize: 13, fontFace: "Calibri", color: "444444",
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
async function addIconRowsSlide(pres, { title, items, primary, accent }) {
  const slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.7,
    fontSize: 28, fontFace: "Georgia", color: primary,
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
    ], { x: 1.6, y: y - 0.05, w: 7.5, h: 0.7, valign: "middle", margin: 0 });
  }

  return slide;
}
```

---

## 6. Timeline / Process Flow

Horizontal numbered steps connected by a line. Shows progression or workflow.

**When to use:** Project phases, process steps, roadmap, milestones.

```javascript
function addTimelineSlide(pres, { title, steps, primary, accent }) {
  const slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.7,
    fontSize: 28, fontFace: "Georgia", color: primary,
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
      fontSize: 16, fontFace: "Calibri", color: "FFFFFF",
      bold: true, align: "center", valign: "middle"
    });

    slide.addText(steps[i], {
      x: cx - 1, y: lineY + 0.5, w: 2, h: 0.8,
      fontSize: 12, fontFace: "Calibri", color: "444444",
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
function addComparisonSlide(pres, { title, leftTitle, leftItems, rightTitle, rightItems, primary, accent }) {
  const slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.7,
    fontSize: 28, fontFace: "Georgia", color: primary,
    bold: true, margin: 0
  });

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.2, w: 4.3, h: 0.6,
    fill: { color: primary }
  });
  slide.addText(leftTitle, {
    x: 0.5, y: 1.2, w: 4.3, h: 0.6,
    fontSize: 16, fontFace: "Calibri", color: "FFFFFF",
    bold: true, align: "center", valign: "middle"
  });

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: 1.2, w: 4.3, h: 0.6,
    fill: { color: accent }
  });
  slide.addText(rightTitle, {
    x: 5.2, y: 1.2, w: 4.3, h: 0.6,
    fontSize: 16, fontFace: "Calibri", color: "FFFFFF",
    bold: true, align: "center", valign: "middle"
  });

  const leftTextArr = leftItems.map((item, i) => ({
    text: item,
    options: { bullet: true, breakLine: i < leftItems.length - 1 }
  }));
  slide.addText(leftTextArr, {
    x: 0.5, y: 2.0, w: 4.3, h: 3.0,
    fontSize: 14, fontFace: "Calibri", color: "333333",
    valign: "top"
  });

  const rightTextArr = rightItems.map((item, i) => ({
    text: item,
    options: { bullet: true, breakLine: i < rightItems.length - 1 }
  }));
  slide.addText(rightTextArr, {
    x: 5.2, y: 2.0, w: 4.3, h: 3.0,
    fontSize: 14, fontFace: "Calibri", color: "333333",
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
function addQuoteSlide(pres, { quote, author, role, bgImageData, primary, accent }) {
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

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 1.2, y: 1.3, w: 0.06, h: 2.5,
    fill: { color: accent }
  });

  slide.addText("\u201C", {
    x: 0.3, y: 0.3, w: 2, h: 1.5,
    fontSize: 120, fontFace: "Georgia", color: "FFFFFF",
    bold: true, transparency: 40, margin: 0
  });

  slide.addText(quote, {
    x: 1.6, y: 1.5, w: 7.2, h: 2.5,
    fontSize: 22, fontFace: "Georgia", color: "FFFFFF",
    italic: true, align: "left", valign: "middle"
  });

  slide.addText([
    { text: author, options: { bold: true, fontSize: 16, color: "FFFFFF", breakLine: true } },
    { text: role, options: { fontSize: 13, color: "DDDDDD" } }
  ], { x: 1.6, y: 4.2, w: 7.2, h: 0.8, align: "left", margin: 0 });

  return slide;
}
```

---

## 9. Chart Slide

A chart (bar, line, pie) with a title. **Always use native PptxGenJS charts** — they remain editable in PowerPoint.

**When to use:** Data presentation, trends, comparisons, financial results.

```javascript
function addChartSlide(pres, { title, annotation, chartType, chartData, chartOpts, primary }) {
  const slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.7,
    fontSize: 28, fontFace: "Georgia", color: primary,
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
      fontSize: 11, fontFace: "Calibri", color: "999999",
      italic: true
    });
  }

  return slide;
}
```

---

## 10. Closing Slide (Photo/Solid + CTA)

Full-bleed photo or solid color with centered call-to-action. Mirrors the title slide.

**When to use:** Last slide, next steps, contact information, thank you.

**Image:** Reuse the title photo or source a new **16:9** photo via the `image-sourcing` skill.

```javascript
function addClosingSlide(pres, { headline, subtext, contactInfo, bgImageData, primary, accent }) {
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

  slide.addShape(pres.shapes.OVAL, {
    x: -2, y: -2, w: 6, h: 6,
    fill: { color: accent, transparency: 85 }
  });
  slide.addShape(pres.shapes.OVAL, {
    x: 7, y: 3, w: 5, h: 5,
    fill: { color: accent, transparency: 88 }
  });

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 4.25, y: 1.6, w: 1.5, h: 0.05, fill: { color: accent }
  });

  slide.addText(headline, {
    x: 1, y: 1.8, w: 8, h: 1,
    fontSize: 36, fontFace: "Georgia", color: "FFFFFF",
    bold: true, align: "center", valign: "middle"
  });

  slide.addText(subtext, {
    x: 1, y: 3.0, w: 8, h: 0.6,
    fontSize: 16, fontFace: "Calibri", color: "EEEEEE",
    align: "center"
  });

  if (contactInfo) {
    slide.addText(contactInfo, {
      x: 1, y: 4.0, w: 8, h: 0.6,
      fontSize: 14, fontFace: "Calibri", color: "DDDDDD",
      align: "center"
    });
  }

  return slide;
}
```

---

## 11. Content + Dark Overlay Cards

Photo background with dark overlay and elevated rounded cards containing content. Great for "why" or "value proposition" slides.

**When to use:** Value propositions, key reasons, feature highlights over a visual background.

**Image:** Source a **16:9** (1920x1080) photo relevant to the topic via the `image-sourcing` skill.

```javascript
function addOverlayCardsSlide(pres, { title, subtitle, cards, bgImageData, primary, accent }) {
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

  // Title
  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.7,
    fontSize: 32, fontFace: "Georgia", color: "FFFFFF",
    bold: true, margin: 0
  });

  // Subtitle
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 1.0, w: 7, h: 0.5,
      fontSize: 15, fontFace: "Calibri", color: "EEEEEE",
      margin: 0
    });
  }

  // Cards
  const count = cards.length;
  const cardW = (9 - (count - 1) * 0.3) / count;
  const startX = 0.5;
  const cardY = 1.8;
  const cardH = 3.3;

  for (let i = 0; i < count; i++) {
    const x = startX + i * (cardW + 0.3);

    // Semi-transparent card background
    const makeCardStyle = () => ({
      fill: { color: "FFFFFF", transparency: 80 },
      rectRadius: 0.15,
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.2 }
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: cardY, w: cardW, h: cardH,
      ...makeCardStyle()
    });

    // Icon circle
    slide.addShape(pres.shapes.OVAL, {
      x: x + 0.3, y: cardY + 0.3, w: 0.5, h: 0.5,
      fill: { color: accent, transparency: 20 }
    });

    // Card title
    slide.addText(cards[i].title, {
      x: x + 0.3, y: cardY + 1.0, w: cardW - 0.6, h: 0.5,
      fontSize: 16, fontFace: "Georgia", color: "FFFFFF",
      bold: true, margin: 0
    });

    // Card body
    slide.addText(cards[i].body, {
      x: x + 0.3, y: cardY + 1.5, w: cardW - 0.6, h: 1.6,
      fontSize: 12, fontFace: "Calibri", color: "DDDDDD",
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
| Opening / section divider | Title Slide (Photo Background) |
| Feature list / key points | Icon + Text Rows |
| KPIs / metrics / results | Stat Callout Cards |
| Explaining a concept | Split-Image Slide |
| Comparing options | Comparison (Side by Side) |
| Strategy pillars / categories | Content Grid (2x2) |
| Process / workflow / roadmap | Timeline / Process Flow |
| Customer quote / testimonial | Quote / Testimonial (Photo Background) |
| Value propositions over photo | Content + Dark Overlay Cards |
| Data / charts / trends | Chart Slide |
| Closing / CTA / contact | Closing Slide |

### Image Plan

Before generating slides, plan which slides need images and at what aspect ratio:

| Slide | Image Type | Aspect Ratio | Notes |
|-------|-----------|--------------|-------|
| Title | Full-bleed background | 16:9 | Topic-specific, atmospheric |
| Split-Image | Half-slide photo | 9:10 or 1:1 | Relevant to slide content |
| Quote | Full-bleed background | 16:9 | Moody, atmospheric |
| Content + Overlay Cards | Full-bleed background | 16:9 | Relevant to topic |
| Closing | Full-bleed background | 16:9 | Can reuse title photo |

**Gather all needed images BEFORE starting the generation script.** Use the `image-sourcing` skill to search Unsplash first; fall back to the `image-generation` skill only when no suitable stock photo exists.

### Recommended Deck Rhythm (10 slides)

1. **Title Slide** — photo background + dark overlay + decorative shapes, white text
2. **Split-Image** — photo left, agenda/overview right
3. **Icon + Text Rows** — light background with decorative shapes
4. **Stat Callout Cards** — rounded cards with shadows for metrics
5. **Content Grid** — 2x2 blocks on light background
6. **Chart Slide** — native chart on clean background
7. **Split-Image** — photo right, deep dive left (alternate side)
8. **Timeline** — roadmap on light background
9. **Quote** — testimonial over atmospheric photo
10. **Closing Slide** — photo/solid background + CTA, bookends with title

**Key rule: At least 3 slides should have photo backgrounds. Never more than 2 consecutive plain-background slides.**
