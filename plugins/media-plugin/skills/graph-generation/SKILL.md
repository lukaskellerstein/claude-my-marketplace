---
name: graph-generation
description: ALWAYS use this skill when the user asks to create, draw, design, produce, or generate any visual asset that is not a photograph or illustration. Fires on words like diagram, chart, graph, flowchart, architecture, system map, topology, sequence diagram, state machine, class diagram, ER diagram, C4, UML, BPMN, mind map, org chart, wireframe, mockup, UI sketch, infographic, dashboard, treemap, sankey, heatmap, choropleth, network graph, map, plot, visualization, mermaid, d3, drawio, draw.io, .drawio, or any request to "visualize", "render", "show as a diagram", or produce .drawio / .png / .svg / .pdf architecture artifacts. Fires on domain phrasings like "AWS architecture", "Kubernetes namespaces", "microservices diagram", "identity/auth flow", "repo topology", "dev environment", "system context", "data flow", "pipeline diagram", "network topology", "P&ID", "wiring diagram". Routes to Mermaid for text-based docs diagrams, D3.js for data-driven charts/maps, and Draw.io for architecture/vendor-icon/editable deliverables. This skill enforces a domain-shape search step (for AWS/Azure/GCP/Cisco/Kubernetes/P&ID/electrical/BPMN) and a mandatory edge-routing postprocess step — skipping the skill produces unprofessional diagrams with overlapping edges and generic boxes.
---

# Graph Generation

Generate any chart, graph, diagram, map, or visualization and save it as an image or editable file. This skill supports three rendering engines — **pick the right one first**, then read that engine's README and pattern file.

## How to use this skill

1. **Pick the engine** using the decision guide below — this is the most important step
2. **Read the engine's README** for workflow, templates, and best practices:
   - Mermaid → [patterns/mermaid/README.md](patterns/mermaid/README.md)
   - D3.js → [patterns/d3/README.md](patterns/d3/README.md)
   - Draw.io → [patterns/drawio/README.md](patterns/drawio/README.md)
3. **Read the specific pattern file** (for Mermaid/D3) or the [xml-reference.md](patterns/drawio/xml-reference.md) (for Draw.io)
4. Generate, render, and save

Do **not** try to memorize engine-specific details from this file — the engine READMEs are the source of truth for workflows.

## HARD RULES for Draw.io (must follow, do not skip)

These two rules are why this skill exists. Skipping them produces diagrams that look amateurish — overlapping edges, generic boxes instead of real cloud/k8s icons, visible conflict points. If you write `.drawio` XML without following them, the output is wrong.

1. **Shape search is MANDATORY** for any diagram involving AWS / Azure / GCP / Oracle / Cisco / Kubernetes / P&ID / electrical / BPMN / rack equipment / Ory / Traefik / NATS / Postgres / Docker / any branded technology. Before writing XML, call:
   ```
   node ${CLAUDE_PLUGIN_ROOT}/skills/graph-generation/patterns/drawio/shape-search/search.js "<terms>"
   ```
   Use the returned `style` string verbatim and the returned `w`/`h` as the mxGeometry dimensions. Generic `rounded=0;whiteSpace=wrap;html=1;` rectangles are NOT acceptable for these domains. Skip shape search only for plain flowcharts, UML, ERD, org charts, mind maps, or when the user explicitly asks for "simple shapes".

2. **Postprocessing is MANDATORY** for every `.drawio` file written to disk. After writing, run:
   ```
   node ${CLAUDE_PLUGIN_ROOT}/skills/graph-generation/patterns/drawio/postprocessor/postprocess.js <file> <file>
   ```
   This is handled automatically by a PostToolUse hook on `Write`, so in most cases you don't need to run it manually — but verify the file was processed (the hook prints a before/after report). If the hook did not run, invoke the script yourself. Approach A (MCP `open_drawio_xml`) already runs this server-side; no manual step needed there.

Neither rule applies to Mermaid or D3.

## When to Use What Engine

| Engine | Pick when the user needs... | Avoid when... |
|---|---|---|
| **Mermaid** | Quick text-based software diagrams for docs or PRs (flowcharts, sequence, state, ER, class, Gantt, C4). Output embedded in markdown (GitHub, Notion, MkDocs) using fenced ```` ```mermaid ```` blocks. Simple/standard shapes where layout can be auto-generated. Diagrams that live in source control as plain text. | User needs vendor icons (AWS, Azure, GCP, Cisco), pixel-perfect manual layout, UI mockups, or data-driven charts. |
| **D3.js** | Data-driven visualizations — bar/line/pie/scatter/heatmap charts, choropleth/marker maps, network/force graphs, treemaps, sankey, candlesticks, infographics (timelines, stat dashboards), custom visual layouts matched to a specific website's theme. Anything requiring binding numerical data to visual attributes. | User wants a "diagram" of boxes and arrows — use Mermaid or Draw.io. |
| **Draw.io** | Professional architecture diagrams with **vendor shape libraries** (AWS, Azure, GCP, Kubernetes, Cisco, etc.). **UI/UX mockups and wireframes**. Diagrams the **user will open and edit later in a GUI**. Formal deliverables needing polished PNG/SVG/PDF output with embedded editable source. Complex diagrams requiring manual positioning. | A quick throwaway diagram would do — Mermaid is faster. Data visualization with numeric input — use D3. |

### Rule-of-thumb decision tree

```
Is the output a data-driven chart (axes, scales, data points)?
  → D3.js

Is it a software/system diagram that fits in markdown as plain text?
  → Mermaid

Does it need vendor icons, manual layout polish, UI mockups, or
later editing by the user in a GUI?
  → Draw.io
```

### Cross-reference: diagram type → engine

| If the user asks for... | Default engine | Notes |
|---|---|---|
| Flowchart in a README/PR | Mermaid | Text-based, version-controllable |
| Flowchart for a client deliverable | Draw.io | Polished output, vendor icons if needed |
| AWS/Azure/GCP architecture | Draw.io | Native cloud shape libraries |
| Microservices/container diagram | Mermaid C4 (simple) or Draw.io (polished) | Mermaid for docs, Draw.io for decks |
| Sequence / API interaction | Mermaid | Auto-layout works well here |
| ER / database schema | Mermaid (docs) or Draw.io (manual control) | |
| State machine / lifecycle | Mermaid | |
| Class diagram | Mermaid | |
| Network topology with Cisco icons | Draw.io | Only Draw.io ships Cisco shape lib |
| UI mockup / wireframe | Draw.io | Mockup shape library |
| Bar/line/pie/scatter/heatmap | D3.js | |
| Choropleth / location map | D3.js | |
| Treemap / sankey / network graph | D3.js | |
| Candlestick / OHLC financial | D3.js | |
| Timeline / stat dashboard infographic | D3.js | |

## How each engine renders (1-liner)

| Engine | Output | Rendering |
|---|---|---|
| **Mermaid** | PNG (or inline markdown) | Self-contained HTML with mermaid.js CDN → Playwright MCP screenshot at high DPI |
| **D3.js** | PNG or SVG | Self-contained HTML with D3 CDN → Playwright MCP screenshot at high DPI |
| **Draw.io** | `.drawio`, `.drawio.png/svg/pdf` | Native `mxGraphModel` XML → draw.io CLI export (with embedded editable XML), or MCP opens in editor |

## Universal quality rule

Whatever engine you pick, the output must be **high-resolution** (at least 2x DPI for PNG) and **theme-matched** to the context where it will be displayed (light docs, dark websites, branded decks). All three engine READMEs cover their respective high-DPI / theming settings.
