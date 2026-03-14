---
description: Inspect a Figma file or node — get structure, styles, components, and properties
argument-hint: "<figma-url> [--depth=N] [--components] [--styles] [--tokens]"
allowed-tools: ["Read", "Write", "Bash", "WebFetch", "mcp__design-playwright__browser_navigate", "mcp__design-playwright__browser_evaluate", "mcp__design-playwright__browser_snapshot"]
---

# Inspect Figma Design

Quick command to inspect a Figma file and extract design information.

## Usage

```
/design-inspect https://www.figma.com/design/ABC123/MyFile
/design-inspect https://www.figma.com/design/ABC123/MyFile?node-id=1-2
/design-inspect https://www.figma.com/design/ABC123/MyFile --components
/design-inspect https://www.figma.com/design/ABC123/MyFile --styles --tokens
```

## Steps

1. **Parse the arguments**: Extract the Figma URL and any flags.

2. **Extract file key and node ID** from the URL:
   - File key: segment after `/design/` or `/file/`
   - Node ID: from `node-id` query param (convert `-` to `:`)

3. **Choose inspection method**:

   - **If `FIGMA_ACCESS_TOKEN` is set** → Use REST API (faster, no browser needed):
     ```bash
     curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
       "https://api.figma.com/v1/files/{file_key}?depth=2"
     ```

   - **If no token** → Use Playwright to open the file and inspect via Plugin API

4. **Based on flags, extract**:

   - **(default)**: File name, pages, top-level frame structure
   - **--components**: List all components with names and descriptions
   - **--styles**: List all paint styles, text styles, effect styles
   - **--tokens**: Extract design tokens (colors, typography, spacing) in JSON format
   - **--depth=N**: How deep to traverse the node tree (default: 2)

5. **Present results** in a clean, structured format.

## If URL is missing

Ask the user:
```
Please provide a Figma file URL to inspect:
https://www.figma.com/design/<file-key>/<file-name>

Or if you have the file open in the browser, I can inspect the current selection via Plugin API.
```
