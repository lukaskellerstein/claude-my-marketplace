---
name: element-selector
description: >
  Read and process browser element selections sent from the Claude Selector Chrome extension
  via the local bridge server. Use when the user mentions: "select element", "change this button",
  "fix the styling", "/select", "browser extension", "what did I select", "read my selections",
  "apply selections", "batch selections", "element picker", "visual selector".
---

# Element Selector — Bridge API & Workflow

## What This Is

The Claude Selector system lets developers visually select elements on their website in Chrome, annotate each selection with an instruction (e.g., "make this button bigger"), capture a screenshot, and send everything as a batch to Claude Code. You then find the elements in the codebase and apply the requested changes.

## Reading Selections from the Bridge

The bridge server runs on `localhost:3456` (or `$CLAUDE_SELECTOR_PORT` if set).

### Fetch the current batch

```bash
curl -s http://localhost:3456/batch
```

Returns:

```json
{
  "batch": {
    "pageUrl": "https://mysite.com/landing",
    "pageTitle": "My Site — Landing Page",
    "selections": [ ...selection objects... ],
    "timestamp": "2026-03-29T14:22:01.000Z"
  }
}
```

### Fetch batch history

```bash
curl -s "http://localhost:3456/batch/history?limit=5"
```

### Check bridge health

```bash
curl -s http://localhost:3456/health
```

### Clear all state

```bash
curl -s -X POST http://localhost:3456/clear
```

## Selection Object Shape

Each selection contains:

| Field | Description |
|-------|-------------|
| `selector` | CSS selector uniquely identifying the element |
| `tagName` | HTML tag name (e.g., `button`, `div`) |
| `id` | Element ID or null |
| `classList` | Array of CSS classes |
| `textContent` | Truncated text content (max 300 chars) |
| `attributes` | Key-value map of HTML attributes |
| `computedStyles` | Key computed CSS properties (color, fontSize, padding, etc.) |
| `boundingRect` | Position and size `{ x, y, width, height }` |
| `parentTag` | Tag name of parent element |
| `childCount` | Number of child elements |
| `instruction` | User's instruction for this element (may be empty) |
| `screenshot` | Base64-encoded JPEG of viewport with element highlighted |

## Decoding Screenshots

Screenshots are base64-encoded JPEG strings (no `data:` prefix). To save one:

```bash
echo "<base64-string>" | base64 -d > /tmp/selection-1.jpg
```

Or in the Bash tool:

```bash
echo "$SCREENSHOT_BASE64" | base64 -d > /tmp/selection-1.jpg
```

Then use the Read tool to view the saved image file.

## Workflow

1. **Fetch** the batch from `GET /batch`
2. **Summarize** what was selected — show the user a numbered list with tag, selector, and instruction
3. **Save screenshots** to temp files and inspect them to understand visual context
4. **For each selection with an instruction**: find the element in the codebase using the CSS selector, class names, text content, and tag name. Apply the requested change.
5. **For selections without instructions**: ask the user what they want changed, or skip if they say so
6. **Clear** the batch after processing with `POST /clear`

## Tips for Finding Elements in Code

- Search for CSS class names from `classList`
- Search for `data-testid` or `id` attributes
- Search for text content snippets
- Use the `tagName` and `computedStyles` to narrow down which component renders the element
- The `pageUrl` tells you which page/route the element is on — use this to find the relevant component

## Bridge API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/batch` | Store a batch of selections |
| `GET` | `/batch` | Read the current batch |
| `GET` | `/batch/history?limit=N` | Previous batches (max 10) |
| `POST` | `/selection` | Store a single selection |
| `GET` | `/selection` | Read the latest single selection |
| `GET` | `/history?limit=N` | Single selection history |
| `POST` | `/clear` | Reset all state |
| `POST` | `/session/register` | Register a Claude Code session |
| `POST` | `/session/deregister` | Deregister a session |
| `POST` | `/session/heartbeat` | Refresh session heartbeat |
| `GET` | `/sessions` | List active sessions |
| `GET` | `/health` | Server health and status |
| `POST` | `/shutdown` | Force shutdown |
