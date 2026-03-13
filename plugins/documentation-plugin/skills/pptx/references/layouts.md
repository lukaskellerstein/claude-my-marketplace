# Slide Layout Catalog

Each layout below includes a description, when to use it, and a code example. Mix at least 3 different layouts in every deck.

All examples assume `LAYOUT_16x9` (10" × 5.625") and use placeholder color variables — replace with your actual palette.

---

## 1. Title Slide (Photo Background)

Full-bleed photo background with dark overlay and large white text. This is the premium default — use this instead of plain dark backgrounds.

**When to use:** Opening slide, section dividers, closing slide.

**Image sizing:** Generate the background photo at **16:9** (1920×1080). Make it specific to the presentation topic.

```javascript
function addTitleSlide(pres, { title, subtitle, bgImageData, primary, accent }) {
  const slide = pres.addSlide();

  // Full-bleed photo background
  if (bgImageData) {
    slide.background = { data: bgImageData };
  } else {
    slide.background = { color: primary };
  }

  // Dark overlay for text readability
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 5.625,
    fill: { color: "000000", transparency: 45 }
  });

  // Decorative accent element (large transparent circle, top-right)
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

Photo fills one half edge-to-edge, content on the other half. Much more impactful than a small inset image.

**When to use:** Explaining a concept alongside an illustration, before/after comparisons, feature descriptions.

**Image sizing:** Generate the image at **9:16 or 1:1** (not 16:9!) — it fills a tall, narrow space (5" × 5.625").

```javascript
function addSplitImageSlide(pres, { title, bodyText, imageData, imageSide, primary, accent }) {
  // imageSide: "left" or "right"
  const slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };

  const imgX = imageSide === "left" ? 0 : 5;
  const contentX = imageSide === "left" ? 5.4 : 0.5;

  // Full-height image (edge-to-edge on its side)
  slide.addImage({
    data: imageData,
    x: imgX, y: 0, w: 5, h: 5.625,
    sizing: { type: "cover", w: 5, h: 5.625 }
  });

  // Color accent strip at the edge where image meets content
  const stripX = imageSide === "left" ? 5 : 4.94;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: stripX, y: 0, w: 0.06, h: 5.625,
    fill: { color: accent }
  });

  // Title
  slide.addText(title, {
    x: contentX, y: 0.5, w: 4.2, h: 0.8,
    fontSize: 28, fontFace: "Georgia", color: primary,
    bold: true, margin: 0
  });

  // Body text
  slide.addText(bodyText, {
    x: contentX, y: 1.5, w: 4.2, h: 3.5,
    fontSize: 15, fontFace: "Calibri", color: "333333",
    valign: "top", align: "left"
  });

  return slide;
}
```

---

## 3. Icon + Text Rows

2–4 rows, each with an icon in a colored circle and text to its right. Great for listing features or steps.

**When to use:** Feature lists, service offerings, key points, process steps.

```javascript
async function addIconRowsSlide(pres, { title, items, primary, accent }) {
  // items: [{ icon: FaCheckCircle, label: "Feature", desc: "Description" }, ...]
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

    // Icon circle background
    slide.addShape(pres.shapes.OVAL, {
      x: 0.7, y: y, w: 0.6, h: 0.6,
      fill: { color: primary }
    });

    // Icon (pre-rendered to base64 PNG)
    const iconData = await iconToBase64Png(items[i].icon, "#FFFFFF", 256);
    slide.addImage({ data: iconData, x: 0.82, y: y + 0.12, w: 0.36, h: 0.36 });

    // Label (bold) + description
    slide.addText([
      { text: items[i].label, options: { bold: true, fontSize: 16, color: primary, breakLine: true } },
      { text: items[i].desc, options: { fontSize: 13, color: "555555" } }
    ], { x: 1.6, y: y - 0.05, w: 7.5, h: 0.7, valign: "middle", margin: 0 });
  }

  return slide;
}
```

---

## 4. Stat Callout Cards

2–4 large numbers in elevated rounded cards with labels underneath. For presenting key metrics.

**When to use:** KPIs, results, metrics, achievements, data highlights.

```javascript
function addStatCardsSlide(pres, { title, stats, primary, secondary, accent }) {
  // stats: [{ value: "42%", label: "Conversion Rate" }, ...]
  const slide = pres.addSlide();
  slide.background = { color: "F5F5F5" };

  // Decorative background circles
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

    // Elevated rounded card
    const makeCardStyle = () => ({
      fill: { color: "FFFFFF" },
      rectRadius: 0.15,
      shadow: { type: "outer", color: "000000", blur: 8, offset: 3, angle: 135, opacity: 0.12 }
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.4, w: cardW, h: 3.0,
      ...makeCardStyle()
    });

    // Colored icon circle at top of card
    slide.addShape(pres.shapes.OVAL, {
      x: x + cardW / 2 - 0.3, y: 1.7, w: 0.6, h: 0.6,
      fill: { color: accent, transparency: 15 }
    });

    // Big number
    slide.addText(stats[i].value, {
      x, y: 2.5, w: cardW, h: 1.0,
      fontSize: 48, fontFace: "Georgia", color: primary,
      bold: true, align: "center", valign: "middle"
    });

    // Label
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

## 5. Content Grid (2×2)

Four content blocks arranged in a 2×2 grid. Each block can have an icon, title, and description.

**When to use:** Comparing 4 options, pillars of a strategy, categories, quadrants.

```javascript
function addContentGridSlide(pres, { title, blocks, primary, secondary }) {
  // blocks: [{ heading: "Block 1", body: "Description" }, ...] (exactly 4)
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

    // Block background
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: bw, h: bh,
      fill: { color: secondary }
    });

    // Block heading
    slide.addText(blocks[i].heading, {
      x: x + 0.25, y: y + 0.2, w: bw - 0.5, h: 0.4,
      fontSize: 16, fontFace: "Georgia", color: primary,
      bold: true, margin: 0
    });

    // Block body
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

## 6. Timeline / Process Flow

Horizontal numbered steps connected by a line. Shows progression or workflow.

**When to use:** Project phases, process steps, roadmap, milestones.

```javascript
function addTimelineSlide(pres, { title, steps, primary, accent }) {
  // steps: ["Step 1 label", "Step 2 label", ...]
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

  // Connecting line
  slide.addShape(pres.shapes.LINE, {
    x: startX, y: lineY, w: endX - startX, h: 0,
    line: { color: "CCCCCC", width: 2 }
  });

  for (let i = 0; i < count; i++) {
    const cx = startX + i * spacing;

    // Circle
    slide.addShape(pres.shapes.OVAL, {
      x: cx - 0.25, y: lineY - 0.25, w: 0.5, h: 0.5,
      fill: { color: primary }
    });

    // Step number
    slide.addText(String(i + 1), {
      x: cx - 0.25, y: lineY - 0.25, w: 0.5, h: 0.5,
      fontSize: 16, fontFace: "Calibri", color: "FFFFFF",
      bold: true, align: "center", valign: "middle"
    });

    // Label below
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

  // Left column header
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.2, w: 4.3, h: 0.6,
    fill: { color: primary }
  });
  slide.addText(leftTitle, {
    x: 0.5, y: 1.2, w: 4.3, h: 0.6,
    fontSize: 16, fontFace: "Calibri", color: "FFFFFF",
    bold: true, align: "center", valign: "middle"
  });

  // Right column header
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: 1.2, w: 4.3, h: 0.6,
    fill: { color: accent }
  });
  slide.addText(rightTitle, {
    x: 5.2, y: 1.2, w: 4.3, h: 0.6,
    fontSize: 16, fontFace: "Calibri", color: "FFFFFF",
    bold: true, align: "center", valign: "middle"
  });

  // Left items
  const leftTextArr = leftItems.map((item, i) => ({
    text: item,
    options: { bullet: true, breakLine: i < leftItems.length - 1 }
  }));
  slide.addText(leftTextArr, {
    x: 0.5, y: 2.0, w: 4.3, h: 3.0,
    fontSize: 14, fontFace: "Calibri", color: "333333",
    valign: "top"
  });

  // Right items
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

Large quote with attribution over a full-bleed photo. Maximum visual impact.

**When to use:** Customer quotes, expert opinions, mission statements.

**Image sizing:** Generate the background photo at **16:9** (1920×1080). Choose atmospheric, moody imagery relevant to the quote's theme.

```javascript
function addQuoteSlide(pres, { quote, author, role, bgImageData, primary, accent }) {
  const slide = pres.addSlide();

  // Full-bleed photo background
  if (bgImageData) {
    slide.background = { data: bgImageData };
  } else {
    slide.background = { color: primary };
  }

  // Dark overlay
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 5.625,
    fill: { color: "000000", transparency: 40 }
  });

  // Accent bar before quote
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 1.2, y: 1.3, w: 0.06, h: 2.5,
    fill: { color: accent }
  });

  // Large opening quote mark
  slide.addText("\u201C", {
    x: 0.3, y: 0.3, w: 2, h: 1.5,
    fontSize: 120, fontFace: "Georgia", color: "FFFFFF",
    bold: true, transparency: 40, margin: 0
  });

  // Quote text
  slide.addText(quote, {
    x: 1.6, y: 1.5, w: 7.2, h: 2.5,
    fontSize: 22, fontFace: "Georgia", color: "FFFFFF",
    italic: true, align: "left", valign: "middle"
  });

  // Author
  slide.addText([
    { text: author, options: { bold: true, fontSize: 16, color: "FFFFFF", breakLine: true } },
    { text: role, options: { fontSize: 13, color: "DDDDDD" } }
  ], { x: 1.6, y: 4.2, w: 7.2, h: 0.8, align: "left", margin: 0 });

  return slide;
}
```

---

## 9. Chart Slide

A chart (bar, line, pie) with a title and optional annotation text.

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

  // Chart
  const defaultOpts = {
    x: 0.5, y: 1.2, w: 9, h: 3.8,
    showTitle: false,
    valGridLine: { color: "E8E8E8", size: 0.5 },
    catGridLine: { style: "none" }
  };
  slide.addChart(chartType, chartData, { ...defaultOpts, ...chartOpts });

  // Optional annotation below chart
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

## 10. Closing Slide (Photo Background + CTA)

Full-bleed photo with overlay and centered call-to-action. Mirrors the title slide for visual bookending.

**When to use:** Last slide, next steps, contact information, thank you.

**Image sizing:** Generate at **16:9** (1920×1080). Can reuse the title slide photo or pick a complementary image.

```javascript
function addClosingSlide(pres, { headline, subtext, contactInfo, bgImageData, primary, accent }) {
  const slide = pres.addSlide();

  // Full-bleed photo background (or gradient fallback)
  if (bgImageData) {
    slide.background = { data: bgImageData };
  } else {
    slide.background = { color: primary };
  }

  // Dark overlay
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 5.625,
    fill: { color: "000000", transparency: 50 }
  });

  // Decorative elements
  slide.addShape(pres.shapes.OVAL, {
    x: -2, y: -2, w: 6, h: 6,
    fill: { color: accent, transparency: 85 }
  });
  slide.addShape(pres.shapes.OVAL, {
    x: 7, y: 3, w: 5, h: 5,
    fill: { color: accent, transparency: 88 }
  });

  // Accent bar
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

## Layout Selection Guide

| Content Type | Recommended Layouts |
|-------------|-------------------|
| Opening / section divider | Title Slide (Photo Background) |
| Feature list / key points | Icon + Text Rows |
| KPIs / metrics / results | Stat Callout Cards |
| Explaining a concept | Split-Image Slide |
| Comparing options | Comparison (Side by Side) |
| Strategy pillars / categories | Content Grid (2×2) |
| Process / workflow / roadmap | Timeline / Process Flow |
| Customer quote / testimonial | Quote / Testimonial (Photo Background) |
| Data / charts / trends | Chart Slide |
| Closing / CTA / contact | Closing Slide (Photo Background) |

### Image Generation Plan

Before generating slides, plan which slides need images and at what aspect ratio:

| Slide | Image Type | Aspect Ratio | Notes |
|-------|-----------|--------------|-------|
| Title | Full-bleed background | 16:9 | Topic-specific, atmospheric |
| Split-Image | Half-slide photo | 9:10 or 1:1 | Relevant to slide content |
| Quote | Full-bleed background | 16:9 | Moody, atmospheric |
| Closing | Full-bleed background | 16:9 | Can reuse title photo |

**Generate all needed images BEFORE starting the PptxGenJS script.** This avoids mid-script interruptions.

For a 10-slide deck, a good rhythm might be:

1. **Title Slide (Photo BG)** — full-bleed image + dark overlay, white text
2. **Split-Image** — photo left, agenda/overview right
3. **Icon + Text Rows** — key features on light background
4. **Stat Callout Cards** — metrics with elevated rounded cards
5. **Content Grid** — strategy pillars on light background
6. **Chart Slide** — data/trends on clean background
7. **Split-Image** — photo right, deep dive left (alternate side from slide 2)
8. **Timeline** — roadmap on light background
9. **Quote (Photo BG)** — testimonial over atmospheric image
10. **Closing Slide (Photo BG)** — CTA over image, bookends with title

**Key rule: At least 3 slides should have photo backgrounds. Never more than 2 consecutive plain-background slides.**
