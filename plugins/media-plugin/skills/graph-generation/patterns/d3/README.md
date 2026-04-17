# D3.js Engine

Generate data-driven charts, maps, infographics, and visualizations as image files using **D3.js** rendered in a browser via **Playwright MCP**.

## When this engine is right

- Data-driven visualizations — bar/line/pie/scatter/heatmap charts
- Geographic maps with data overlays (choropleth, location markers)
- Network/force graphs, treemaps, sankey, candlesticks
- Infographics (timelines, stat dashboards) with custom layouts
- Anything requiring binding numerical data to visual attributes
- When chart styling needs to match a specific website's theme

**Avoid D3.js when:** the user wants a "diagram" of boxes and arrows — use Mermaid (for docs) or Draw.io (for polished deliverables) instead.

## Pattern Index

Pick the chart type you need, then open its pattern file for JS code to place inside the D3 HTML template.

| You need... | Pattern |
|---|---|
| Bar chart | [bar-chart.md](bar-chart.md) |
| Line chart | [line-chart.md](line-chart.md) |
| Pie / donut chart | [pie-donut.md](pie-donut.md) |
| Scatter plot | [scatter-plot.md](scatter-plot.md) |
| Choropleth map (world) | [choropleth-map.md](choropleth-map.md) |
| Location marker map | [location-marker-map.md](location-marker-map.md) |
| Candlestick / OHLC (financial) | [candlestick.md](candlestick.md) |
| Treemap | [treemap.md](treemap.md) |
| Sankey diagram | [sankey.md](sankey.md) |
| Heatmap | [heatmap.md](heatmap.md) |
| Force-directed network graph | [network-graph.md](network-graph.md) |
| Radial / gauge / progress ring | [radial-gauge.md](radial-gauge.md) |
| Timeline infographic | [timeline.md](timeline.md) |
| Stat dashboard infographic | [stat-dashboard.md](stat-dashboard.md) |
| Word cloud | no pattern file yet — build with d3-cloud module |
| Comparison panel / feature matrix | no pattern file yet — combine card layout techniques from stat-dashboard |

## Workflow

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

## Sizing and Resolution

**Always use `deviceScaleFactor: 2`** when calling `mcp__media-playwright__browser_resize` before navigating to any chart HTML.

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

## Tips

1. **Always set `background: white`** on body — Playwright screenshots default to transparent. **Exception:** for dark-themed sites, set the background to match the site's background color (e.g., `#0A0A0A`).
2. **Run force simulations synchronously** with `.tick(N)` for static output
3. **Use `d3.format`** for axis tick formatting (e.g., `d3.format(",.0f")` for thousands separators)
4. **Add titles/labels** — standalone chart images need context that surrounding documentation would otherwise provide
5. **Test the HTML locally** in a browser before screenshotting if the chart is complex
6. **For maps, always load data asynchronously** — use `d3.json()` for TopoJSON/GeoJSON data
7. **Wrap chart code in `async` IIFE** when using `await d3.json()` or `await d3.csv()` for external data
8. **Match the website theme** — when generating charts for a website, use the site's color palette, background color, and font. Dark sites need dark-themed charts.
9. **Infographics are D3 charts** — timelines, stat dashboards, process flows, and comparison panels are built as custom D3 visualizations using the same HTML→Playwright→screenshot workflow
