# Mermaid Engine

Use **mermaid.js** for software diagrams. For embedding in markdown docs, use fenced ```` ```mermaid ```` code blocks. For **high-resolution image output**, render via Playwright MCP.

## When this engine is right

- Quick text-based software diagrams for docs or PRs
- Flowcharts, sequence, state, ER, class, Gantt, C4
- Simple/standard shapes where layout can be auto-generated
- Diagrams that live in source control as plain text

**Avoid Mermaid when:** the diagram needs vendor icons (AWS/Azure/GCP/Cisco), pixel-perfect manual layout, UI mockups, or data-driven charts — use Draw.io or D3.js instead.

## Pattern Index

Pick the diagram type you need, then open its pattern file for a ready-to-use code example.

| You need... | Pattern |
|---|---|
| C4 Context (system boundaries, actors) | [c4-context.md](c4-context.md) |
| C4 Container (services, databases, queues) | [c4-container.md](c4-container.md) |
| Sequence diagram (API calls, interactions) | [sequence.md](sequence.md) |
| Flowchart (process, data flow, decisions) | [flowchart.md](flowchart.md) |
| Entity-Relationship (database schema) | [er-diagram.md](er-diagram.md) |
| State machine (lifecycle, transitions) | [state-machine.md](state-machine.md) |
| Deployment architecture (infra topology) | [deployment.md](deployment.md) |
| Class diagram (domain model, types) | [class-diagram.md](class-diagram.md) |

## Image Rendering Workflow

1. **Write an HTML file** using the template below with the diagram definition
2. **Open it in Playwright** with a large viewport and high `deviceScaleFactor`
3. **Wait for rendering** then screenshot

### HTML Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    body { margin: 0; padding: 40px; background: white; }
    .mermaid { display: flex; justify-content: center; }
  </style>
</head>
<body>
  <div class="mermaid">
    %% PASTE MERMAID DIAGRAM CODE HERE %%
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      themeVariables: {
        fontSize: '16px'
      }
    });
  </script>
</body>
</html>
```

### Playwright Steps

```
1. mcp__media-playwright__browser_resize → width: 1200, height: 800, deviceScaleFactor: 2
2. mcp__media-playwright__browser_navigate → file:///absolute/path/to/diagram.html
3. mcp__media-playwright__browser_wait_for → selector: ".mermaid svg", state: "visible"
4. mcp__media-playwright__browser_take_screenshot → saves high-res PNG
```

**Key settings:**
- `deviceScaleFactor: 2` produces 2x resolution (e.g., 1200x800 viewport → 2400x1600 image)
- Set `fontSize: '16px'` or higher in mermaid config for readable text
- Add `padding: 40px` on body to prevent diagram edges being cut off

## Mermaid Themes

| Theme | Description |
|---|---|
| `default` | Light purple/blue tones (recommended) |
| `neutral` | Black and white, clean for documents |
| `dark` | Dark background |
| `forest` | Green tones |
| `base` | Minimal, customizable via `themeVariables` |

## Mermaid Diagram Types

| Diagram Type | Use For |
|---|---|
| **Flowchart** | Decision logic, process flows, algorithms |
| **Sequence** | API calls, service interactions, request/response flows |
| **C4 Context** | System boundaries, external actors, high-level architecture |
| **C4 Container** | Services, databases, message queues within a system |
| **C4 Component** | Internal structure of a single service |
| **Entity-Relationship** | Database schemas, data models |
| **Class** | Object models, type hierarchies, domain models |
| **State** | Lifecycle states, status transitions, workflows |
| **Gantt** | Timelines, project phases, migration plans |
| **Architecture** (beta) | Cloud infrastructure, deployment topology |

## Best Practices

1. **One diagram per concept** — don't overload a single diagram; split complex systems into multiple views
2. **Use consistent naming** — same service/component names across all diagrams
3. **Label relationships** — always annotate arrows with protocol, action, or data type
4. **Keep it readable** — limit to ~10-15 nodes per diagram; use subgraphs for grouping
5. **Always use Playwright for image output** — render via HTML + mermaid.js CDN with `deviceScaleFactor: 2` for crisp images
6. **Match the audience** — C4 Context for stakeholders, Sequence for developers, ER for database teams
7. **Update diagrams with code** — when architecture changes, update the diagram in the same PR
