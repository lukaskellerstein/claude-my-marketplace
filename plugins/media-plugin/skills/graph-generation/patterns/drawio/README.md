# Draw.io Engine

> **Source:** Adapted from the upstream draw.io skill at https://github.com/jgraph/drawio-mcp/blob/main/skill-cli/drawio/SKILL.md and merged with the draw.io MCP server tooling at https://github.com/jgraph/drawio-mcp/tree/main/mcp-tool-server.

Generate draw.io diagrams as native `.drawio` files, or open them directly in the draw.io editor via the MCP server. Export to PNG, SVG, or PDF with the diagram XML embedded so the exported file remains editable in draw.io.

## When this engine is right

- Professional architecture diagrams with **vendor shape libraries** (AWS, Azure, GCP, Kubernetes, Cisco)
- **UI/UX mockups and wireframes** (draw.io ships a mockup shape library)
- Diagrams the **user will open and edit later in a GUI**
- Formal deliverables needing polished PNG/SVG/PDF output with embedded editable source
- Complex diagrams requiring manual positioning / pixel-perfect layout

**Avoid Draw.io when:** a quick throwaway diagram would do (use Mermaid — it's faster) or the input is numeric data for charts (use D3.js).

## Two approaches — pick one

| Approach | When to use | Output |
|---|---|---|
| **Draw.io MCP** (`drawio` server) | User wants to **view/edit interactively** in the draw.io web editor. No file saved to disk. | Opens a `draw.io` URL in the browser |
| **Draw.io CLI + `.drawio` file** | User wants a **file saved** — either editable (`.drawio`) or exported (`.drawio.png` / `.svg` / `.pdf`) with embedded editable XML | File on disk |

---

## Before generating: search for domain shapes

draw.io ships **10,000+ shapes** across AWS, Azure, GCP, Cisco, Kubernetes, BPMN, P&ID, electrical, rack equipment, UML extended, and more. Generic rectangles with labels look unprofessional for these domains — use the real icons.

**Use `search.js` when the diagram is:**
- Cloud architecture (AWS, Azure, GCP, Oracle)
- Network topology (Cisco, rack/server equipment)
- Kubernetes / container orchestration
- P&ID (valves, instruments, vessels)
- Electrical / circuit diagrams
- BPMN with specific task types
- Any domain where the user expects branded/standardized symbols

**Skip `search.js` for:** flowcharts, UML (class/sequence/state/activity), ERD, org charts, mind maps, Venn, timelines, wireframes — these are fine with basic geometric shapes. Also skip if the user says "simple shapes" or "don't search".

### How to search

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/graph-generation/patterns/drawio/shape-search/search.js "aws lambda" --limit 5
node ${CLAUDE_PLUGIN_ROOT}/skills/graph-generation/patterns/drawio/shape-search/search.js "cisco router" --json
node ${CLAUDE_PLUGIN_ROOT}/skills/graph-generation/patterns/drawio/shape-search/search.js "pid globe valve"
```

Each result gives you a `style` string that drops straight into an `mxCell`:

```xml
<mxCell id="fn1" value="PaymentFn" style="<paste style from search result>" vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="78" height="78" as="geometry"/>
</mxCell>
```

Use the `w` and `h` from the search result as the `width` / `height` — these are the shape's designed proportions and icons look distorted otherwise.

---

## Approach A: Draw.io MCP (interactive editor)

The `drawio` MCP server provides three tools that open diagrams directly in the draw.io editor.

| MCP tool | Accepts | Use for |
|---|---|---|
| `mcp__drawio__open_drawio_xml` | Raw `mxGraphModel` XML | Full control, vendor icons, manual layouts |
| `mcp__drawio__open_drawio_mermaid` | Mermaid.js syntax | Convert an existing Mermaid diagram to an editable draw.io diagram |
| `mcp__drawio__open_drawio_csv` | CSV with parent/child relationships | Org charts, simple hierarchies from tabular data |

**Common parameters:** `lightbox` (read-only view, default `false`), `dark` (`"auto"` / `"true"` / `"false"`, default `"auto"`).

**Note:** `open_drawio_xml` already runs the edge-routing postprocessor server-side before opening the browser, so you don't need to postprocess XML manually when using MCP. For Approach B (files on disk), you **do** need to run it — see the workflow below.

### Examples

**Open AWS architecture in the editor:**
```
mcp__drawio__open_drawio_xml → content: "<mxGraphModel>...</mxGraphModel>", dark: "auto"
```

**Convert Mermaid to editable draw.io:**
```
mcp__drawio__open_drawio_mermaid → content: "sequenceDiagram\n  Alice->>Bob: Hello"
```

**CSV to org chart:**
```
mcp__drawio__open_drawio_csv → content: "name,manager\nCEO,\nCTO,CEO\nEng1,CTO"
```

---

## Approach B: CLI + `.drawio` file (saved output)

When the user needs a file — editable source or exported PNG/SVG/PDF — generate native `.drawio` XML, write it to disk, then optionally export via the draw.io desktop CLI.

### Workflow

1. **Search for domain shapes first** (see the "Before generating" section above). Skip for plain flowcharts/UML/ERD; required for AWS/Azure/GCP/Cisco/K8s/P&ID/electrical/BPMN diagrams
2. **Generate `mxGraphModel` XML** for the requested diagram (see [xml-reference.md](xml-reference.md)). Paste shape styles and dimensions straight from `search.js` results
3. **Write the XML** to a `.drawio` file in the working directory (use the Write tool)
4. **Post-process edge routing** — always run the local postprocessor. It simplifies waypoints, reroutes edges around vertex collisions, and straightens approach angles:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/skills/graph-generation/patterns/drawio/postprocessor/postprocess.js diagram.drawio diagram.drawio
   ```
   The second argument is the output path (in-place overwrite is fine). The script prints a before/after report (intersections, waypoints, alignment near-misses) and reverts automatically if the pass would make the diagram worse. On first run, install its single dep once: `cd ${CLAUDE_PLUGIN_ROOT}/skills/graph-generation/patterns/drawio/postprocessor && npm install` (skip if `node_modules` already exists)
5. **If the user requested an export format** (png, svg, pdf), locate the draw.io CLI (see below), export with `--embed-diagram`, then delete the source `.drawio` file. If the CLI is not found, keep the `.drawio` file and tell the user they can install the draw.io desktop app to enable export, or open the `.drawio` file directly
6. **Open the result** — the exported file if exported, or the `.drawio` file otherwise. If the open command fails, print the file path so the user can open it manually

### Choosing the output format

Check the user's request for a format preference. Examples:

- `create a flowchart` → `flowchart.drawio`
- `png flowchart for login` → `login-flow.drawio.png`
- `svg: ER diagram` → `er-diagram.drawio.svg`
- `pdf architecture overview` → `architecture-overview.drawio.pdf`

If no format is mentioned, just write the `.drawio` file and open it in draw.io. The user can always ask to export later.

### Supported export formats

| Format | Embed XML | Notes |
|---|---|---|
| `png` | Yes (`-e`) | Viewable everywhere, editable in draw.io after opening |
| `svg` | Yes (`-e`) | Scalable, editable in draw.io, embed in web docs |
| `pdf` | Yes (`-e`) | Printable, editable in draw.io |
| `jpg` | No | Lossy, no embedded XML — avoid unless explicitly requested |

PNG, SVG, and PDF all support `--embed-diagram` — the exported file contains the full diagram XML, so opening it in draw.io recovers the editable diagram.

### Locating the draw.io CLI

The draw.io desktop app includes a command-line interface for exporting. Detect the environment, then locate the CLI accordingly:

#### WSL2 (Windows Subsystem for Linux)

WSL2 is detected when `/proc/version` contains `microsoft` or `WSL`:

```bash
grep -qi microsoft /proc/version 2>/dev/null && echo "WSL2"
```

On WSL2, use the Windows draw.io Desktop executable via `/mnt/c/...`:

```bash
DRAWIO_CMD=`/mnt/c/Program Files/draw.io/draw.io.exe`
```

The backtick quoting is required to handle the space in `Program Files` in bash.

If draw.io is installed in a non-default location, check common alternatives:

```bash
# Default install path
`/mnt/c/Program Files/draw.io/draw.io.exe`

# Per-user install (if the above does not exist)
`/mnt/c/Users/$WIN_USER/AppData/Local/Programs/draw.io/draw.io.exe`
```

#### macOS

```bash
/Applications/draw.io.app/Contents/MacOS/draw.io
```

#### Linux (native)

```bash
drawio   # typically on PATH via snap/apt/flatpak
```

#### Windows (native, non-WSL2)

```
"C:\Program Files\draw.io\draw.io.exe"
```

Use `which drawio` (or `where drawio` on Windows) to check if it's on PATH before falling back to the platform-specific path.

### Export command

```bash
drawio -x -f <format> -e -b 10 -o <output> <input.drawio>
```

**WSL2 example:**
```bash
`/mnt/c/Program Files/draw.io/draw.io.exe` -x -f png -e -b 10 -o diagram.drawio.png diagram.drawio
```

**Key flags:**
- `-x` / `--export`: export mode
- `-f` / `--format`: output format (png, svg, pdf, jpg)
- `-e` / `--embed-diagram`: embed diagram XML in the output (PNG, SVG, PDF only)
- `-o` / `--output`: output file path
- `-b` / `--border`: border width around diagram (default: 0)
- `-t` / `--transparent`: transparent background (PNG only)
- `-s` / `--scale`: scale the diagram size
- `--width` / `--height`: fit into specified dimensions (preserves aspect ratio)
- `-a` / `--all-pages`: export all pages (PDF only)
- `-p` / `--page-index`: select a specific page (1-based)

### Opening the result

| Environment | Command |
|---|---|
| macOS | `open <file>` |
| Linux (native) | `xdg-open <file>` |
| WSL2 | `cmd.exe /c start "" "$(wslpath -w <file>)"` |
| Windows | `start <file>` |

**WSL2 notes:**
- `wslpath -w <file>` converts a WSL2 path (e.g. `/home/user/diagram.drawio`) to a Windows path (e.g. `C:\Users\...`). Required because `cmd.exe` cannot resolve `/mnt/c/...` style paths.
- The empty string `""` after `start` is required to prevent `start` from interpreting the filename as a window title.

**WSL2 example:**
```bash
cmd.exe /c start "" "$(wslpath -w diagram.drawio)"
```

---

## File naming conventions

- Use a descriptive filename based on the diagram content (e.g., `login-flow`, `database-schema`)
- Use lowercase with hyphens for multi-word names
- For export, use double extensions: `name.drawio.png`, `name.drawio.svg`, `name.drawio.pdf` — this signals the file contains embedded diagram XML
- After a successful export, delete the intermediate `.drawio` file — the exported file contains the full diagram

## XML format basics

A `.drawio` file is native mxGraphModel XML. Always generate XML directly — Mermaid and CSV formats require server-side conversion and cannot be saved as native files (use Approach A for those).

### Basic structure

Every diagram must have this structure:

```xml
<mxGraphModel adaptiveColors="auto">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <!-- Diagram cells go here with parent="1" -->
  </root>
</mxGraphModel>
```

- Cell `id="0"` is the root layer
- Cell `id="1"` is the default parent layer
- All diagram elements use `parent="1"` unless using multiple layers

## Full XML reference

For the complete draw.io XML reference — common styles, edge routing, containers, layers, tags, metadata, dark mode colors, shape libraries (AWS/Azure/GCP/Kubernetes/Cisco), and well-formedness rules — see:

**Local (always available):** [xml-reference.md](xml-reference.md)

**Upstream (may have newer content):** https://raw.githubusercontent.com/jgraph/drawio-mcp/main/shared/xml-reference.md

## Best Practices

1. **Use vendor shape libraries** when building cloud/network diagrams — this is the primary reason to pick Draw.io over Mermaid
2. **Double-extension naming** (`diagram.drawio.png`) signals the file contains embedded editable XML
3. **Delete the intermediate `.drawio` file** after successful export — the exported file contains the full diagram
4. **If the CLI is not found**, keep the `.drawio` file and tell the user to install the draw.io desktop app, or open the file manually — do not try to install the CLI

## CRITICAL: XML well-formedness

- **NEVER include ANY XML comments (`<!-- -->`) in the output.** XML comments are strictly forbidden — they waste tokens, can cause parse errors, and serve no purpose in diagram XML.
- Escape special characters in attribute values: `&amp;`, `&lt;`, `&gt;`, `&quot;`
- Always use unique `id` values for each `mxCell`
- **Every edge needs a geometry child**: `<mxGeometry relative="1" as="geometry" />` — self-closing edge cells won't render

## Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| draw.io CLI not found | Desktop app not installed or not on PATH | Keep the `.drawio` file and tell the user to install the draw.io desktop app, or open the file manually |
| Export produces empty/corrupt file | Invalid XML (e.g. double hyphens in comments, unescaped special characters) | Validate XML well-formedness before writing |
| Diagram opens but looks blank | Missing root cells `id="0"` and `id="1"` | Ensure the basic mxGraphModel structure is complete |
| Edges not rendering | Edge mxCell is self-closing (no child mxGeometry element) | Every edge must have `<mxGeometry relative="1" as="geometry" />` as a child element |
| File won't open after export | Incorrect file path or missing file association | Print the absolute file path so the user can open it manually |
