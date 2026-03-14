---
name: figma-rest-api
description: >
  Read and inspect Figma files via the Figma REST API without needing the browser open.
  Use when the user wants to get file structure, list components/styles, export images,
  read comments, or inspect node properties from a Figma URL or file key.
  Requires a FIGMA_ACCESS_TOKEN environment variable.
---

# Figma REST API

Access Figma file data programmatically via the REST API using curl. This works without the browser — just needs a Figma file key and access token.

## When to Use

- User shares a Figma URL and wants to inspect the file structure
- User wants to list all components, styles, or pages in a Figma file
- User wants to export images/assets from Figma
- User wants to read comments on a Figma file
- User wants design data without opening the browser

## When NOT to Use

- User wants to **modify** Figma designs → use **figma-plugin-api** skill (requires browser)
- User wants to create new elements → use **figma-plugin-api** skill

## Authentication

Requires a Figma personal access token set as `FIGMA_ACCESS_TOKEN`:

```bash
# Check if token is available
echo $FIGMA_ACCESS_TOKEN
```

The user can generate a token at: Settings → Account → Personal access tokens in Figma.

## Extracting the File Key

From a Figma URL like:
```
https://www.figma.com/design/ABC123xyz/My-Design-File?node-id=1-2
```

- **File key**: `ABC123xyz` (the segment after `/design/` or `/file/`)
- **Node ID**: `1-2` (from `node-id` query parameter, replace `-` with `:` → `1:2`)

## API Endpoints

### Get File

```bash
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/{file_key}"
```

Returns the full file tree with all nodes, styles, and components. For large files, use query params to limit scope:

```bash
# Get specific nodes only
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/{file_key}/nodes?ids=1:2,3:4"

# Get just the first level (no deep children)
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/{file_key}?depth=1"
```

### Get File Components

```bash
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/{file_key}/components"
```

### Get File Styles

```bash
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/{file_key}/styles"
```

### Export Images

```bash
# Export specific nodes as PNG
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/images/{file_key}?ids=1:2,3:4&format=png&scale=2"

# Export as SVG
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/images/{file_key}?ids=1:2&format=svg"

# Supported formats: png, jpg, svg, pdf
# Scale: 0.01 to 4 (default 1)
```

### Get Comments

```bash
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/{file_key}/comments"
```

### Get Component Sets (Variants)

```bash
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/{file_key}/component_sets"
```

### Get File Variables

```bash
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/{file_key}/variables/local"
```

### Get File Version History

```bash
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/{file_key}/versions"
```

## Response Structure

### File nodes have this structure:

```json
{
  "id": "1:2",
  "name": "Frame Name",
  "type": "FRAME",
  "children": [...],
  "backgroundColor": { "r": 1, "g": 1, "b": 1, "a": 1 },
  "absoluteBoundingBox": { "x": 0, "y": 0, "width": 375, "height": 812 },
  "fills": [{ "type": "SOLID", "color": { "r": 1, "g": 1, "b": 1, "a": 1 } }],
  "strokes": [],
  "strokeWeight": 0,
  "cornerRadius": 0,
  "effects": [],
  "layoutMode": "VERTICAL",
  "itemSpacing": 8,
  "paddingTop": 16
}
```

### Node types:

`DOCUMENT`, `CANVAS` (page), `FRAME`, `GROUP`, `COMPONENT`, `COMPONENT_SET`, `INSTANCE`, `RECTANGLE`, `ELLIPSE`, `LINE`, `TEXT`, `VECTOR`, `BOOLEAN_OPERATION`, `STAR`, `REGULAR_POLYGON`, `SLICE`, `SECTION`

## Common Workflows

### List all pages and top-level frames

```bash
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/{file_key}?depth=2" | jq '.document.children[] | {name, id, children: [.children[]? | {name, id, type}]}'
```

### Export all components as SVG

```bash
# 1. Get component IDs
COMPONENTS=$(curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/{file_key}/components" | jq -r '.meta.components[].node_id' | tr '\n' ',')

# 2. Get export URLs
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/images/{file_key}?ids=${COMPONENTS}&format=svg"
```

## Tips

- Use `jq` to parse JSON responses — pipe curl output through `jq`
- Use `?depth=1` or `?depth=2` for large files to avoid massive responses
- Node IDs use `:` in the API but `-` in URLs (convert `-` to `:`)
- Export scale `2` gives retina-quality PNGs
- Rate limits: 30 requests per minute per token
