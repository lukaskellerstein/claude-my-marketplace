---
name: graph-generation
description: Generate any chart, graph, diagram, map, infographic, or data visualization and save it as an image file. Use when the user asks to create any visual output — data charts (bar, line, pie, scatter, histogram, heatmap, radial/gauge), software diagrams (flowcharts, sequence, state, class, ER, C4 architecture), geographic maps (choropleth, world/country maps, location markers), network graphs, treemaps, sankey diagrams, financial charts (candlestick/OHLC), infographics (timelines, stat dashboards, process flows, comparison panels, radial progress), or any other visualization. Uses two rendering engines — Mermaid (via MCP server) for software/architecture diagrams, and D3.js (via Playwright) for data-driven visualizations, maps, and infographics. Supports both light and dark themed output.
---

# Graph Generation

Generate any chart, graph, diagram, map, or visualization and save it as an image. This skill uses two rendering engines based on the type of graph:

| Engine | Best For | How it renders |
|---|---|---|
| **Mermaid** | Software diagrams (flowcharts, sequence, state, class, ER, C4, Gantt) | Self-contained HTML with mermaid.js CDN, rendered via Playwright MCP with high-DPI settings, then screenshotted to PNG |
| **D3.js** | Data-driven charts, maps, financial charts, network graphs, hierarchical visualizations, infographics | Self-contained HTML with D3.js CDN, rendered via Playwright MCP with high-DPI settings, then screenshotted to PNG |

## Decision Guide

Pick the chart type you need, then read its pattern file for a ready-to-use code example.

**Mermaid patterns** (software diagrams — paste into Mermaid HTML template):

| You need... | Pattern |
|---|---|
| C4 Context (system boundaries, actors) | [patterns/mermaid/c4-context.md](patterns/mermaid/c4-context.md) |
| C4 Container (services, databases, queues) | [patterns/mermaid/c4-container.md](patterns/mermaid/c4-container.md) |
| Sequence diagram (API calls, interactions) | [patterns/mermaid/sequence.md](patterns/mermaid/sequence.md) |
| Flowchart (process, data flow, decisions) | [patterns/mermaid/flowchart.md](patterns/mermaid/flowchart.md) |
| Entity-Relationship (database schema) | [patterns/mermaid/er-diagram.md](patterns/mermaid/er-diagram.md) |
| State machine (lifecycle, transitions) | [patterns/mermaid/state-machine.md](patterns/mermaid/state-machine.md) |
| Deployment architecture (infra topology) | [patterns/mermaid/deployment.md](patterns/mermaid/deployment.md) |
| Class diagram (domain model, types) | [patterns/mermaid/class-diagram.md](patterns/mermaid/class-diagram.md) |

**D3 patterns** (data visualizations — JS code to place inside D3 HTML template):

| You need... | Pattern |
|---|---|
| Bar chart | [patterns/d3/bar-chart.md](patterns/d3/bar-chart.md) |
| Line chart | [patterns/d3/line-chart.md](patterns/d3/line-chart.md) |
| Pie / donut chart | [patterns/d3/pie-donut.md](patterns/d3/pie-donut.md) |
| Scatter plot | [patterns/d3/scatter-plot.md](patterns/d3/scatter-plot.md) |
| Choropleth map (world) | [patterns/d3/choropleth-map.md](patterns/d3/choropleth-map.md) |
| Location marker map | [patterns/d3/location-marker-map.md](patterns/d3/location-marker-map.md) |
| Candlestick / OHLC (financial) | [patterns/d3/candlestick.md](patterns/d3/candlestick.md) |
| Treemap | [patterns/d3/treemap.md](patterns/d3/treemap.md) |
| Sankey diagram | [patterns/d3/sankey.md](patterns/d3/sankey.md) |
| Heatmap | [patterns/d3/heatmap.md](patterns/d3/heatmap.md) |
| Force-directed network graph | [patterns/d3/network-graph.md](patterns/d3/network-graph.md) |
| Radial / gauge / progress ring | [patterns/d3/radial-gauge.md](patterns/d3/radial-gauge.md) |
| Timeline infographic | [patterns/d3/timeline.md](patterns/d3/timeline.md) |
| Stat dashboard infographic | [patterns/d3/stat-dashboard.md](patterns/d3/stat-dashboard.md) |
| Word cloud | D3 (no pattern file yet — build with d3-cloud module) |
| Comparison panel / feature matrix | D3 (custom — combine card layout techniques from stat-dashboard) |

---

# Part 1: Mermaid Diagrams

Use **mermaid.js** for software diagrams. For embedding in markdown docs, use fenced ```` ```mermaid ```` code blocks. For **high-resolution image output**, render via Playwright MCP.

## Mermaid Image Rendering Workflow

1. **Write an HTML file** using the template below with the diagram definition
2. **Open it in Playwright** with a large viewport and high `deviceScaleFactor`
3. **Wait for rendering** then screenshot

### HTML Template for Mermaid Image Output

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

### Mermaid Themes

| Theme | Description |
|---|---|
| `default` | Light purple/blue tones (recommended) |
| `neutral` | Black and white, clean for documents |
| `dark` | Dark background |
| `forest` | Green tones |
| `base` | Minimal, customizable via `themeVariables` |

### Mermaid Diagram Types

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

For code patterns of each diagram type, see the individual files in [patterns/mermaid/](patterns/mermaid/).

### Mermaid Best Practices

1. **One diagram per concept** — don't overload a single diagram; split complex systems into multiple views
2. **Use consistent naming** — same service/component names across all diagrams
3. **Label relationships** — always annotate arrows with protocol, action, or data type
4. **Keep it readable** — limit to ~10-15 nodes per diagram; use subgraphs for grouping
5. **Always use Playwright for image output** — render via HTML + mermaid.js CDN with `deviceScaleFactor: 2` for crisp images
6. **Match the audience** — C4 Context for stakeholders, Sequence for developers, ER for database teams
7. **Update diagrams with code** — when architecture changes, update the diagram in the same PR

---

# Part 2: D3.js Data Visualizations

Generate data-driven charts, maps, infographics, and visualizations as image files using **D3.js** rendered in a browser via **Playwright MCP**.

## D3 Workflow

Every D3 graph follows this 3-step process:

1. **Write a self-contained HTML file** using the template below with your chart JS code
2. **Open it in Playwright** with high-DPI settings using `mcp__media-playwright__browser_navigate`
3. **Screenshot it** using `mcp__media-playwright__browser_take_screenshot` to save as high-res PNG

### HTML Template (Light Theme)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <!-- Add extra modules here if needed (topojson, d3-sankey, etc.) -->
  <style>body { margin: 0; background: white; font-family: sans-serif; }</style>
</head>
<body>
<svg id="chart"></svg>
<script>
  // CHART JS CODE GOES HERE
</script>
</body>
</html>
```

### Dark Theme Variant

For dark-background websites, change the `<style>` block:
```html
<style>
  body { margin: 0; background: #0A0A0A; font-family: sans-serif; }
  text { fill: #A0A0A0; }
</style>
```
Then adjust colors in the JS: text/labels use `--color-text-secondary` (e.g., `#A0A0A0`), axis lines use `--color-border` (e.g., `#2A2A2A`), card backgrounds use `--color-card` (e.g., `#1E1E1E`), data series use the site's accent palette. After creating axes: `svg.selectAll(".axis text").attr("fill", "#A0A0A0"); svg.selectAll(".axis line, .axis path").attr("stroke", "#2A2A2A");`

### Extra CDN Scripts

Add to `<head>` when needed:
- Maps: `<script src="https://d3js.org/topojson.v3.min.js"></script>`
- Sankey: `<script src="https://cdn.jsdelivr.net/npm/d3-sankey@0.12/dist/d3-sankey.min.js"></script>`
- Word cloud: `<script src="https://cdn.jsdelivr.net/npm/d3-cloud@1/build/d3.layout.cloud.js"></script>`
- Hexbin: `<script src="https://cdn.jsdelivr.net/npm/d3-hexbin@0.2/build/d3-hexbin.min.js"></script>`

### Playwright Steps

```
1. mcp__media-playwright__browser_resize → width: 1200, height: 800, deviceScaleFactor: 2
2. mcp__media-playwright__browser_navigate → file:///absolute/path/to/chart.html
3. mcp__media-playwright__browser_take_screenshot → saves high-res PNG to desired output path
```

### Alternative: Extract SVG

Instead of a screenshot, extract the SVG markup directly (resolution-independent):
```
mcp__media-playwright__browser_evaluate → document.querySelector('svg').outerHTML
```
Then write the returned SVG string to a `.svg` file.

For JS code patterns of each chart type, see the individual files in [patterns/d3/](patterns/d3/).

## Sizing and Resolution

**Always use `deviceScaleFactor: 2`** when calling `mcp__media-playwright__browser_resize` before navigating to any chart HTML. This applies to both Mermaid and D3 charts.

- Default viewport: `width: 1200, height: 800, deviceScaleFactor: 2` (produces 2400x1600 image)
- Default chart SVG size: `width=800, height=500` for landscape charts
- Maps: `width=960, height=500` (standard for world maps)
- Square charts (pie, network): `width=600, height=600`

## Color Schemes

| Scheme | Best For |
|---|---|
| `d3.schemeTableau10` | Categorical data (default choice) |
| `d3.schemeCategory10` | Categorical data (alternative) |
| `d3.interpolateBlues` | Sequential single-hue |
| `d3.interpolateViridis` | Sequential multi-hue (colorblind-safe) |
| `d3.interpolateRdYlGn` | Diverging (red-yellow-green) |
| `d3.interpolateSpectral` | Diverging (spectral) |
| `d3.interpolateYlOrRd` | Sequential warm (heatmaps) |

## D3 Tips

1. **Always set `background: white`** on body — Playwright screenshots default to transparent. **Exception:** for dark-themed sites, set the background to match the site's background color (e.g., `#0A0A0A`).
2. **Run force simulations synchronously** with `.tick(N)` for static output
3. **Use `d3.format`** for axis tick formatting (e.g., `d3.format(",.0f")` for thousands separators)
4. **Add titles/labels** — standalone chart images need context that surrounding documentation would otherwise provide
5. **Test the HTML locally** in a browser before screenshotting if the chart is complex
6. **For maps, always load data asynchronously** — use `d3.json()` for TopoJSON/GeoJSON data
7. **Wrap chart code in `async` IIFE** when using `await d3.json()` or `await d3.csv()` for external data
8. **Match the website theme** — when generating charts for a website, use the site's color palette, background color, and font. Dark sites need dark-themed charts.
9. **Infographics are D3 charts** — timelines, stat dashboards, process flows, and comparison panels are built as custom D3 visualizations using the same HTML→Playwright→screenshot workflow
