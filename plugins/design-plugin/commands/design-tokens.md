---
description: Extract design tokens from a Figma file and output as CSS, Tailwind, or JSON
argument-hint: "<figma-url> [--format=css|tailwind|json|style-dictionary] [--output=path]"
allowed-tools: ["Read", "Write", "Bash", "WebFetch", "mcp__design-playwright__browser_navigate", "mcp__design-playwright__browser_evaluate"]
---

# Extract Design Tokens

Quick command to extract design tokens from a Figma file into code-ready formats.

## Usage

```
/design-tokens https://www.figma.com/design/ABC123/MyFile
/design-tokens https://www.figma.com/design/ABC123/MyFile --format=css
/design-tokens https://www.figma.com/design/ABC123/MyFile --format=tailwind --output=tailwind.config.js
/design-tokens https://www.figma.com/design/ABC123/MyFile --format=json --output=tokens.json
/design-tokens https://www.figma.com/design/ABC123/MyFile --format=style-dictionary
```

## Steps

1. **Parse arguments**: Extract URL, format (default: `css`), and output path.

2. **Extract tokens from Figma**:

   - **If `FIGMA_ACCESS_TOKEN` is set**:
     ```bash
     # Get styles
     curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
       "https://api.figma.com/v1/files/{file_key}/styles"

     # Get variables
     curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
       "https://api.figma.com/v1/files/{file_key}/variables/local"
     ```

   - **If no token** → Use Playwright + Plugin API to extract local styles and variables

3. **Process tokens** into categories: colors, typography, spacing, shadows, radii.

4. **Generate output** in the requested format:
   - `css` → CSS custom properties (`:root { --color-primary: #3B82F6; }`)
   - `tailwind` → Tailwind theme config object
   - `json` → Raw JSON token map
   - `style-dictionary` → Style Dictionary format with `{ value, type }` structure

5. **Write or display**:
   - If `--output` is provided, write to the specified file
   - Otherwise, display the tokens in the conversation

## If URL is missing

Ask the user for a Figma file URL or offer to extract tokens from the currently open browser tab.
