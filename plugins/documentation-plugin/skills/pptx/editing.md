# Editing Existing PPTX Templates

Guide for modifying existing branded .pptx files — updating content, adding/removing slides, and preserving the template's design.

## When to Use

- Client provides a branded .pptx template to fill in
- Updating content in an existing presentation
- Adding new slides that match an existing deck's style
- Removing or reordering slides

## Workflow Overview

1. **Analyze** — understand the template structure
2. **Unpack** — extract PPTX for editing
3. **Edit** — modify slide XML content
4. **Add/Remove slides** — if needed
5. **Clean** — remove orphaned files
6. **Pack** — reassemble into .pptx
7. **QA** — verify output

## Step 1: Analyze the Template

### Visual Analysis

Generate thumbnails to see what the template looks like:

```bash
python ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/thumbnail.py template.pptx thumbnails/
```

Read the generated `thumbnails/grid.jpg` to see all slides at a glance, then inspect individual `thumbnails/slide-NN.jpg` files for detail.

### Content Analysis

Extract text content with markitdown:

```bash
python -m markitdown template.pptx
```

This shows all text content per slide, helping you understand the structure before editing.

## Step 2: Unpack

```bash
python ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/unpack.py template.pptx template_unpacked/
```

This extracts the PPTX ZIP and pretty-prints all XML for readability.

### Key Directory Structure

```
template_unpacked/
├── [Content_Types].xml          # File type registry
├── _rels/
│   └── .rels                    # Root relationships
├── ppt/
│   ├── presentation.xml         # Slide order (<p:sldIdLst>)
│   ├── _rels/
│   │   └── presentation.xml.rels  # Slide → file mappings
│   ├── slides/
│   │   ├── slide1.xml           # Slide content
│   │   ├── slide2.xml
│   │   └── _rels/
│   │       ├── slide1.xml.rels  # Per-slide relationships (images, layouts)
│   │       └── slide2.xml.rels
│   ├── slideLayouts/            # Layout templates
│   ├── slideMasters/            # Master slides
│   ├── media/                   # Images, embedded files
│   └── theme/                   # Theme definitions
└── docProps/                    # Document metadata
```

## Step 3: Edit Slide Content

### Locating Text in Slide XML

Text in PowerPoint XML lives inside `<a:t>` elements, nested within text runs:

```xml
<p:sp>
  <p:txBody>
    <a:p>                        <!-- Paragraph -->
      <a:r>                      <!-- Run (styled text segment) -->
        <a:rPr lang="en-US" b="1"/>  <!-- Run properties (bold, font, etc.) -->
        <a:t>Heading Text</a:t>      <!-- The actual text -->
      </a:r>
    </a:p>
  </p:txBody>
</p:sp>
```

### Common XML Editing Patterns

**Replace text content** — find the `<a:t>` element and change its text:

```xml
<!-- Before -->
<a:t>Placeholder Title</a:t>

<!-- After -->
<a:t>Quarterly Revenue Report</a:t>
```

**Bold headers** — set `b="1"` on the run properties:

```xml
<a:rPr lang="en-US" b="1" sz="2800"/>
```

**Font size** — `sz` is in hundredths of a point (2800 = 28pt):

```xml
<a:rPr sz="2800"/>  <!-- 28pt -->
<a:rPr sz="1400"/>  <!-- 14pt -->
```

**Bullet formatting** — bullets are paragraph-level:

```xml
<a:p>
  <a:pPr>
    <a:buChar char="•"/>         <!-- Bullet character -->
  </a:pPr>
  <a:r>
    <a:t>Bullet item text</a:t>
  </a:r>
</a:p>
```

**Multi-item content** — add multiple `<a:p>` elements for bullet lists:

```xml
<a:p>
  <a:pPr><a:buChar char="•"/></a:pPr>
  <a:r><a:t>First point</a:t></a:r>
</a:p>
<a:p>
  <a:pPr><a:buChar char="•"/></a:pPr>
  <a:r><a:t>Second point</a:t></a:r>
</a:p>
```

**Smart quotes** — use proper Unicode quotes in XML:

```xml
<a:t>&#x201C;Quote text&#x201D;</a:t>  <!-- "Quote text" -->
```

### Replacing Images

1. Find the image reference in `ppt/slides/_rels/slideN.xml.rels`:
   ```xml
   <Relationship Id="rId2" Type="...relationships/image" Target="../media/image1.png"/>
   ```
2. Replace the file at `ppt/media/image1.png` with the new image
3. Keep the same filename to avoid updating references

If the new image has different dimensions, update the extent in the slide XML:

```xml
<a:ext cx="9144000" cy="5143500"/>  <!-- Width and height in EMUs (1 inch = 914400 EMUs) -->
```

## Step 4: Add or Remove Slides

### Adding a Slide (Duplicating an Existing One)

```bash
python ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/add_slide.py template_unpacked/ 2
```

This duplicates slide 2 and outputs the `<p:sldId>` element to insert into `ppt/presentation.xml`.

**After running the script**, manually insert the printed `<p:sldId>` element into the `<p:sldIdLst>` in `ppt/presentation.xml` at the desired position:

```xml
<p:sldIdLst>
  <p:sldId id="256" r:id="rId2"/>
  <p:sldId id="257" r:id="rId3"/>
  <p:sldId id="258" r:id="rId7"/>  <!-- ← Insert new slide here -->
  <p:sldId id="259" r:id="rId4"/>
</p:sldIdLst>
```

The order in `<p:sldIdLst>` determines the slide order in the presentation.

### Removing a Slide

1. Delete the `<p:sldId>` element from `<p:sldIdLst>` in `ppt/presentation.xml`
2. Run the clean script to remove orphaned files:

```bash
python ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/clean.py template_unpacked/
```

### Reordering Slides

Just reorder the `<p:sldId>` elements within `<p:sldIdLst>`. No file changes needed.

## Step 5: Clean

After adding or removing slides, clean up orphaned files:

```bash
python ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/clean.py template_unpacked/
```

This removes:
- Slide XML files not referenced in `<p:sldIdLst>`
- Corresponding .rels files
- Unreferenced media files
- Stale Content_Types entries

## Step 6: Pack

```bash
python ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/pack.py template_unpacked/ output.pptx
```

This condenses the pretty-printed XML and creates a proper PPTX ZIP file.

## Step 7: QA

Follow the same QA process as creating from scratch:

```bash
# Visual QA
python ${CLAUDE_PLUGIN_ROOT}/skills/pptx/scripts/thumbnail.py output.pptx qa_output/

# Content QA
python -m markitdown output.pptx
```

Inspect the thumbnails and text output. Verify:
- All content was updated correctly
- No placeholder text remains
- Added slides appear in the correct position
- Removed slides are gone
- Images display correctly
- Template styling is preserved

## Common Pitfalls

### Template Adaptation
- **Preserve the slide master/layout references** — don't change `<p:sp>` elements with `idx` attributes that reference the layout. These define the placeholder positions.
- **Respect the theme** — colors like `<a:schemeClr val="dk1"/>` reference the theme. Don't replace with hardcoded colors unless you want to override the template's theme.

### Text Overflow
- PowerPoint doesn't auto-shrink text by default. If you add more text than the original, it may overflow.
- Check `<a:bodyPr>` for `autoFit` settings: `<a:normAutofit/>` enables auto-shrink.
- Consider splitting long content across multiple slides instead of cramming it in.

### Orphaned Visuals
- After removing slides, always run `clean.py` to remove orphaned media files. Left-behind images bloat the file.
- After adding slides, verify the new slide's .rels file points to correct media files.

### XML Encoding
- Always use UTF-8 encoding when writing XML
- Escape special characters: `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`
- Use XML entities for smart quotes: `&#x201C;` ("), `&#x201D;` ("), `&#x2018;` ('), `&#x2019;` (')
