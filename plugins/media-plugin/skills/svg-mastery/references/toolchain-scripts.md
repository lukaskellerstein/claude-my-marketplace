# SVG Toolchain & Scripts

Every library and CLI worth reaching for, with install command and a minimal working snippet. Organized JS vs Python, by job: **optimize · parse/manipulate · render (rasterize) · sanitize · geometry**. All are runnable on demand (`npx` / `pip install`) — nothing needs to be pre-installed in the project.

> The end-to-end QA pipeline that ties these together lives in [validation-and-qa.md](validation-and-qa.md). This file is the parts catalog.

---

## JavaScript / Node

### Optimize — SVGO
```bash
npm i -g svgo        # or: npx svgo ...
svgo in.svg -o out.svg
svgo -rf ./icons -o ./icons-min        # recursive folder
```
```js
import { optimize } from 'svgo';
const { data } = optimize(svgString, { path: 'in.svg', multipass: true });
```
Config (precision + ID prefixing — prevents collisions when inlining many SVGs):
```js
// svgo.config.js
export default {
  multipass: true,
  plugins: [
    { name: 'preset-default', params: { overrides: { removeViewBox: false } } }, // NEVER remove viewBox
    { name: 'prefixIds', params: { prefix: 'icon' } },
    { name: 'cleanupNumericValues', params: { floatPrecision: 2 } },
    'sortAttrs',
  ],
};
```
Full plugin walkthrough: [optimization.md](optimization.md).

### Parse / manipulate
- **svgson** — SVG ⇄ JSON AST; best for structural edits programmatically.
  ```bash
  npm i svgson
  ```
  ```js
  import { parse, stringify } from 'svgson';
  const ast = await parse(svgString);
  ast.children.push({ name: 'circle', type: 'element', attributes: { cx: '50', cy: '50', r: '8' }, children: [] });
  const out = stringify(ast);
  ```
- **@svgdotjs/svg.js** — fluent builder/manipulator (browser; Node via `svgdom`).
- **svgpath** — transform/normalize path `d` strings:
  ```js
  import svgpath from 'svgpath';
  const d = svgpath('M10 10 A20 20 0 0 1 30 30').unarc().abs().round(2).toString(); // arc→cubic
  ```
- **svg-path-parser** / **path-data-polyfill** — tokenize `d` into commands.

### Render to raster (for the inspect step)
- **@resvg/resvg-js** — fast, Rust-backed, no browser (static SVG).
  ```bash
  npm i @resvg/resvg-js
  ```
  ```js
  const { Resvg } = require('@resvg/resvg-js');
  const png = new Resvg(svgBuffer, { fitTo: { mode: 'width', value: 1200 }, background: 'white' }).render().asPng();
  ```
- **sharp** — librsvg-backed; rasterize + resize in one.
  ```js
  await require('sharp')(Buffer.from(svgString)).png().toFile('out.png');
  ```
- **playwright / puppeteer** — headless Chrome; the only option for CSS animation, JS, web fonts, blend modes. Snippet in [validation-and-qa.md](validation-and-qa.md).

### Sanitize untrusted SVG — DOMPurify
```bash
npm i dompurify        # + jsdom on the server
```
```js
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirty, { USE_PROFILES: { svg: true, svgFilters: true } });
```
Keep it current (older versions had SVG-namespace mutation-XSS bypasses).

### Geometry without a browser
- **svg-path-properties** — `getTotalLength`/`getPointAtLength` equivalents in Node.

---

## Python

### Parse / validate
- **lxml** — XML parsing + DTD/RELAX-NG validation, XPath.
  ```bash
  pip install lxml
  ```
  ```python
  from lxml import etree
  doc = etree.parse("in.svg")                 # raises on malformed XML
  ```
- **defusedxml** — safe parsing of untrusted XML (blocks XXE / billion-laughs). Use it instead of stdlib `xml.etree` on any untrusted input.

### Generate / manipulate
- **svgwrite** — build SVGs programmatically.
  ```python
  import svgwrite
  dwg = svgwrite.Drawing("out.svg", viewBox="0 0 100 100")
  dwg.add(dwg.circle(center=(50, 50), r=40, fill="#6366f1"))
  dwg.save()
  ```
- **svgelements** — spec-accurate parser modeling coordinates/transforms (great for analysis).
- **svgpathtools** — path geometry: length, point sampling, tangents, bbox, arc handling.
  ```bash
  pip install svgpathtools
  ```
  ```python
  from svgpathtools import parse_path
  p = parse_path("M10 10 C20 20 40 20 50 10")
  print(p.length(), p.point(0.5), p.bbox())
  ```

### Render to raster
- **cairosvg** — SVG → PNG/PDF/PS (CLI + library).
  ```bash
  pip install cairosvg
  cairosvg in.svg -o out.png -W 1200 -b white
  ```
  ```python
  import cairosvg
  cairosvg.svg2png(url="in.svg", write_to="out.png", output_width=1200)
  ```
- **rsvg / rsvg-convert** (librsvg CLI): `rsvg-convert -w 1200 in.svg -o out.png`.

### Optimize
- **scour** — alternative optimizer to SVGO: `pip install scour && scour -i in.svg -o out.svg`.

---

## CLI quick reference (no language runtime needed)
```bash
xmllint --noout file.svg          # well-formedness (libxml2, preinstalled)
vnu --format gnu file.svg         # W3C correctness check (needs Java / html5validator)
cairosvg file.svg -o out.png -W 1200 -b white
rsvg-convert -w 1200 file.svg -o out.png
npx svgo file.svg -o file.min.svg
```

## Recommended pipeline (the "always beautiful, no bugs" sequence)
```
author/edit  →  xmllint --noout      (parse-safe?)
             →  svgo (fixed config)   (clean, prefix IDs, set precision)
             →  resvg / cairosvg → PNG (or headless Chrome if CSS/JS/fonts)
             →  Read the PNG, inspect against the brief
             →  fix, repeat
             →  (untrusted source?) DOMPurify / defusedxml before any of the above
```

## See also
- [validation-and-qa.md](validation-and-qa.md) — how to drive these tools as one loop.
- [bug-catalog.md](bug-catalog.md) — what each tool helps you catch.
- [path-geometry.md](path-geometry.md) — the math the geometry libraries implement.
- [optimization.md](optimization.md) — SVGO config in depth.
