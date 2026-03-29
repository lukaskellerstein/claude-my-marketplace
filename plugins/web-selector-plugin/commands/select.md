---
description: Read element selections from the Claude Selector Chrome extension and apply changes to the codebase
argument-hint: "[override instruction for all selections]"
disable-model-invocation: true
---

# Apply Element Selections

You have a batch of element selections from the Claude Selector Chrome extension. Follow these steps:

## 1. Fetch the batch

```bash
curl -s http://localhost:3456/batch
```

If the response has no batch or an empty selections array, tell the user no selections are available and suggest they select elements in Chrome first.

## 2. Display a summary

Show a numbered list of all selections:

```
1. <tagName>.<class> — "<instruction>" (or "no instruction")
2. <tagName>#<id> — "<instruction>"
...
```

Include the `pageUrl` so the user knows which page these came from.

## 3. Save and inspect screenshots

For each selection that has a `screenshot` field, save it to a temp file and read it:

```bash
echo "<base64>" | base64 -d > /tmp/claude-selector-1.jpg
```

Use the Read tool to view each screenshot. This gives you visual context about the element's position, size, and surroundings.

## 4. Apply changes

For each selection:

1. **Find the element in the codebase** — search for CSS classes from `classList`, the `id`, `data-testid` attribute, or text content. Use `pageUrl` to identify the relevant route/component.

2. **Determine the instruction**:
   - If `$ARGUMENTS` is provided, use it as the instruction for ALL selections (override mode)
   - Otherwise, use each selection's own `instruction` field
   - If a selection has no instruction and no `$ARGUMENTS`, ask the user what they want changed for that element

3. **Apply the change** — edit the relevant source files (CSS, JSX, TSX, HTML, etc.) to implement the instruction. Use the `computedStyles` to understand current styling and the screenshot for visual context.

## 5. Clean up

After all changes are applied, clear the batch:

```bash
curl -s -X POST http://localhost:3456/clear
```

Tell the user what was changed and suggest they refresh their browser to see the results.
