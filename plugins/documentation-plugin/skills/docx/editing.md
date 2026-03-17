# Editing Existing DOCX Files

Guide for modifying existing .docx files — updating content, working with tracked changes, adding comments, and preserving formatting.

## When to Use

- Updating content in an existing Word document
- Adding tracked changes (redlines) to a document for review
- Adding comments to a document
- Modifying formatting or styles
- Adding/removing sections or pages

## Workflow Overview

1. **Analyze** — understand the document structure
2. **Unpack** — extract DOCX for editing
3. **Edit** — modify XML content
4. **Clean up** — merge runs, simplify redlines (optional)
5. **Pack** — reassemble into .docx
6. **QA** — verify output

## Step 1: Analyze the Document

### Visual Analysis

Generate page thumbnails to see what the document looks like:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/docx/scripts/thumbnail.py document.docx thumbnails
```

### Content Analysis

Extract text content:

```bash
python -m markitdown document.docx
```

## Step 2: Unpack

```bash
# Basic unpack
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/unpack.py document.docx doc_unpacked/

# With run merging (makes XML much cleaner for editing)
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/unpack.py document.docx doc_unpacked/ --merge-runs

# With tracked change simplification
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/unpack.py document.docx doc_unpacked/ --merge-runs --simplify-redlines
```

### Key Directory Structure

```
doc_unpacked/
├── [Content_Types].xml          # File type registry
├── _rels/
│   └── .rels                    # Root relationships
├── word/
│   ├── document.xml             # Main document content
│   ├── _rels/
│   │   └── document.xml.rels    # Document relationships (images, etc.)
│   ├── styles.xml               # Style definitions
│   ├── settings.xml             # Document settings
│   ├── numbering.xml            # List numbering definitions
│   ├── fontTable.xml            # Font declarations
│   ├── footnotes.xml            # Footnotes (if any)
│   ├── endnotes.xml             # Endnotes (if any)
│   ├── comments.xml             # Comments (if any)
│   ├── commentsExtended.xml     # Extended comment metadata
│   ├── commentsIds.xml          # Comment IDs
│   ├── media/                   # Images and embedded files
│   └── theme/                   # Theme definitions
└── docProps/                    # Document metadata
```

## Step 3: Edit Document Content

### DOCX XML Structure

Text in DOCX XML lives inside `<w:t>` elements, nested within runs and paragraphs:

```xml
<w:body>
  <w:p>                          <!-- Paragraph -->
    <w:pPr>                      <!-- Paragraph properties -->
      <w:pStyle w:val="Heading1"/>
    </w:pPr>
    <w:r>                        <!-- Run (styled text segment) -->
      <w:rPr>                    <!-- Run properties -->
        <w:b/>                   <!-- Bold -->
        <w:sz w:val="36"/>       <!-- Font size in half-points -->
      </w:rPr>
      <w:t>Section Title</w:t>  <!-- The actual text -->
    </w:r>
  </w:p>
</w:body>
```

### Common XML Editing Patterns

**Replace text** — find `<w:t>` and change its content:
```xml
<!-- Before -->
<w:t>Old text here</w:t>

<!-- After -->
<w:t>New text here</w:t>
```

**Bold/formatting** — in `<w:rPr>`:
```xml
<w:rPr>
  <w:b/>                    <!-- Bold -->
  <w:i/>                    <!-- Italic -->
  <w:u w:val="single"/>     <!-- Underline -->
  <w:sz w:val="24"/>        <!-- 12pt (half-points) -->
  <w:color w:val="1B3A5C"/> <!-- Text color -->
  <w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/>
</w:rPr>
```

**Preserve whitespace** — always set on `<w:t>` with leading/trailing spaces:
```xml
<w:t xml:space="preserve"> text with spaces </w:t>
```

**Smart quotes** — use Unicode entities:
```xml
<w:t>&#x201C;Quoted text&#x201D;</w:t>  <!-- "Quoted text" -->
```

### Tracked Changes

To add an insertion (new text):
```xml
<w:ins w:id="1" w:author="Claude" w:date="2026-03-17T00:00:00Z">
  <w:r>
    <w:t>New text to insert</w:t>
  </w:r>
</w:ins>
```

To mark a deletion:
```xml
<w:del w:id="2" w:author="Claude" w:date="2026-03-17T00:00:00Z">
  <w:r>
    <w:rPr><w:del/></w:rPr>
    <w:delText xml:space="preserve">Text being deleted</w:delText>
  </w:r>
</w:del>
```

**Critical rules for tracked changes:**
- Use `<w:t>` inside `<w:ins>` (insertions)
- Use `<w:delText>` inside `<w:del>` (deletions) — NEVER `<w:t>`
- Every tracked change needs a unique `w:id`
- Always include `w:author` and `w:date` attributes

### Adding Comments

Use the comment script for the easy path:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/docx/scripts/comment.py doc_unpacked/ "Comment text" --author "Claude"
```

Then insert the printed markers into `word/document.xml`:
```xml
<!-- Before the commented text -->
<w:commentRangeStart w:id="1"/>

<!-- The text being commented on stays as-is -->
<w:r><w:t>Commented text</w:t></w:r>

<!-- After the commented text -->
<w:commentRangeEnd w:id="1"/>
<w:r>
  <w:rPr><w:rStyle w:val="CommentReference"/></w:rPr>
  <w:commentReference w:id="1"/>
</w:r>
```

### Replacing Images

1. Find the image reference in `word/_rels/document.xml.rels`:
   ```xml
   <Relationship Id="rId5" Type="...relationships/image" Target="media/image1.png"/>
   ```
2. Replace the file at `word/media/image1.png`
3. Keep the same filename to avoid updating references

## Step 4: Pack

```bash
# Basic pack
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/pack.py doc_unpacked/ output.docx

# Pack with validation
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/pack.py doc_unpacked/ output.docx --validate --original document.docx
```

## Step 5: QA

```bash
# Visual QA
python3 ${CLAUDE_PLUGIN_ROOT}/skills/docx/scripts/thumbnail.py output.docx thumbnails

# Schema validation (with original comparison for template editing)
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/office/validate.py output.docx --original document.docx -v

# Content QA
python -m markitdown output.docx
```

The `--original` flag filters pre-existing validation errors — only reports NEW issues introduced by your edits.

## Accepting Tracked Changes

To accept all tracked changes and produce a clean document:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/docx/scripts/accept_changes.py document.docx clean.docx
```

## Common Pitfalls

### Text Encoding
- Always use UTF-8 encoding
- Escape special characters: `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`
- Use XML entities for smart quotes

### Whitespace
- Always add `xml:space="preserve"` on `<w:t>` elements with leading/trailing whitespace
- Use `--merge-runs` when unpacking to consolidate fragmented runs

### Tracked Changes
- Use `<w:delText>` (not `<w:t>`) inside `<w:del>` elements
- Use `<w:t>` (not `<w:delText>`) inside `<w:ins>` elements
- Each tracked change needs a unique ID
- paraId values must be < 0x80000000 (use `--auto-repair` to fix)

### Comment Markers
- Every `commentRangeStart` must have a matching `commentRangeEnd` with the same ID
- The `commentReference` run must appear after the `commentRangeEnd`
