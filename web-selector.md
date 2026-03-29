# Claude Selector — Technical Specification

## 1. What This Is

A system that lets a developer visually select elements on their website in Chrome, annotate each selection with an instruction (e.g., "make this button bigger", "change the color to red"), capture a screenshot of the page showing the element in context, and send everything as a batch to Claude Code — which then finds the elements in the codebase and applies the requested changes.

The system has three parts:

1. **Chrome Extension** — the UI the developer interacts with in the browser
2. **Bridge Server** — a local Node.js process that relays data between the extension and Claude Code
3. **Claude Code Plugin** — hooks, a skill, and a command that integrate into Claude Code's workflow


---


## 2. User Flow

### Step-by-step

1. Developer starts Claude Code in their project. A **SessionStart hook** automatically launches the bridge server in the background (if not already running) and registers this Claude Code session.

2. Developer opens their website in Chrome. The Claude Selector extension is installed.

3. Developer clicks the extension icon and hits **"Activate Selector"**. The cursor becomes a crosshair.

4. Developer hovers over elements — each one highlights (indigo border, label showing the tag name and class). This is purely visual feedback, no data is captured yet.

5. Developer clicks an element to select it. Three things happen:
   - A **screenshot** of the current viewport is captured, with the selected element highlighted (amber dashed border + numbered badge)
   - A small **instruction popup** appears near the element with a text field: "What should change?" The developer types an instruction like "increase font size to 18px" or presses Enter to skip
   - The element is added to the **selection list** visible in the extension popup, showing its tag, selector, instruction text, and whether a screenshot was captured

6. Developer repeats step 5 for as many elements as they want. Each gets its own screenshot and instruction. Clicking an already-selected element deselects it.

7. Developer clicks **"Send Batch to Claude Code"** in the extension popup. The entire batch — all selections with their metadata, instructions, and screenshots — is sent as a single POST request to the bridge server.

8. In Claude Code, the developer types `/claude-selector:select` (or optionally `/claude-selector:select make everything more rounded` to override all instructions with a blanket one). Claude reads the batch from the bridge, examines each selection, finds the elements in the codebase, and applies the changes.

9. When the developer closes Claude Code, a **SessionEnd hook** deregisters the session. If it was the last active session, the bridge server automatically shuts down after a short grace period.


---


## 3. Chrome Extension

### 3.1 Manifest

Manifest V3 Chrome extension. Requires permissions: `activeTab`, `scripting`. Content scripts injected on all URLs.

### 3.2 Content Script (injected into every page)

This is the core of the element picker. It handles:

**Element highlighting on hover:**
- When the selector is active, `mousemove` tracks the element under the cursor
- A fixed-position overlay div is drawn over the hovered element with an indigo border
- A small label shows the element's tag name + ID or first class (e.g., `button.cta-primary`)
- The overlay and all selector UI must use z-index near the max (2147483646+) and `pointer-events: none` so they don't interfere with the page
- All selector UI elements (overlays, toasts, instruction popups) must be ignored by the hover/click detection — check with `el.closest()` before processing

**Element selection on click:**
- Clicking an element while the selector is active should `preventDefault` and `stopImmediatePropagation` so the page doesn't react
- On click, the script collects **element info** (see data shape in section 6), then:
  1. Requests a screenshot from the background service worker (it has access to `chrome.tabs.captureVisibleTab`)
  2. Draws the selected element's highlight (amber dashed border + numbered badge) onto the screenshot using a canvas
  3. Shows the instruction popup (see below)
  4. Adds the selection to an in-memory array

**Instruction popup:**
- A small floating panel that appears near the clicked element (below it if space, above if not)
- Contains: a header showing the tag name and truncated selector, a textarea with placeholder "What should change?", a "Skip" button and an "Add" button
- Enter submits, Shift+Enter for newline, Escape skips (empty instruction)
- After the instruction is entered (or skipped), the popup disappears and the element stays highlighted with its numbered badge

**Deselection:**
- Clicking an already-selected element removes it from the list and removes its highlight
- Badges on remaining elements renumber accordingly

**Selection display:**
- Selected elements show an amber dashed border with a red circular badge showing the selection number (1, 2, 3...)
- All highlights must reposition correctly if the page scrolls (they use `position: fixed` based on `getBoundingClientRect`)

**Controls:**
- Escape deactivates the selector (pauses — selections are preserved)
- The extension popup can re-activate, clear all, or send the batch

### 3.3 Background Service Worker

Handles two things:
- Toggling the content script on extension icon click (inject if not present, send toggle message if it is)
- Responding to `captureTab` messages from the content script by calling `chrome.tabs.captureVisibleTab` and returning the data URL

### 3.4 Extension Popup

A small popup (approximately 340px wide) with:
- **Header** showing the extension name and a status dot (green when bridge is connected)
- **Status bar** showing bridge connection status (polls `GET /health` every few seconds) and selection count
- **Activate/Pause Selector** button
- **Send Batch to Claude Code** button (disabled when no selections, shows "Sending..." then "Sent ✓" feedback)
- **Clear All** button
- **Selection list** showing each selection with: numbered badge, tag name + class/ID, instruction text (or "no instruction" in muted text), and a camera icon if screenshot was captured

### 3.5 Screenshot Capture

The screenshot process works as follows:
1. Content script sends `{ action: "captureTab" }` to the background service worker
2. Background calls `chrome.tabs.captureVisibleTab(windowId, { format: "png" })` and returns the data URL
3. Content script creates an offscreen canvas, draws the screenshot, then overlays:
   - An amber dashed rectangle around the element's bounding rect (accounting for `devicePixelRatio`)
   - A label badge showing the element's tag name
4. The canvas is exported as base64 JPEG (quality 0.75 for reasonable size) — just the base64 data, no `data:` prefix
5. This base64 string is stored with the selection

The screenshot shows the entire visible viewport, giving Claude Code context about the element's surroundings, layout position, and visual relationship to other elements.


---


## 4. Bridge Server

A zero-dependency Node.js HTTP + WebSocket server running on `localhost:3456`.

### 4.1 Core Purpose

It holds selection data in memory and serves it to Claude Code on demand. The Chrome extension writes to it; Claude Code reads from it.

### 4.2 Endpoints

**Selection endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/batch` | Receive a batch of selections from the Chrome extension. Body is JSON (can be large due to base64 screenshots — allow up to 50MB). Stores it as the "current batch" and broadcasts to WebSocket clients. |
| `GET` | `/batch` | Return the current batch. This is what Claude Code reads. |
| `GET` | `/batch/history?limit=N` | Return previous batches (default limit 5, max stored 10). |
| `POST` | `/selection` | Legacy: receive a single selection (backward compat). |
| `GET` | `/selection` | Legacy: return the latest single selection. |
| `GET` | `/history?limit=N` | Legacy: individual selection history. |
| `POST` | `/clear` | Reset all state (batch, selections, history). |

**Session lifecycle endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/session/register` | Register a Claude Code session. Body: `{ session_id, pid?, cwd?, model? }`. Cancels any pending shutdown timer. |
| `POST` | `/session/deregister` | Deregister a session. If this was the last session, start a shutdown timer. |
| `POST` | `/session/heartbeat` | Refresh the `last_heartbeat` timestamp for a session. If the session doesn't exist, auto-register it. |
| `GET` | `/sessions` | List all active sessions. |
| `POST` | `/shutdown` | Force immediate shutdown. |

**Utility:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns server PID, port, WebSocket client count, active session count, whether a batch exists, uptime. |

All endpoints return JSON. All should set `Access-Control-Allow-Origin: *` for local cross-origin from the extension.

### 4.3 Session Lifecycle and Auto-Shutdown

The bridge tracks Claude Code sessions by ID. Key behaviors:
- **Registration** cancels any pending shutdown timer
- **Deregistration** of the last session starts a grace timer (default 3 seconds, configurable via `SHUTDOWN_GRACE_MS` env var)
- If the grace period elapses with no sessions, the server exits cleanly (removes PID file, closes WebSocket connections)
- A **stale session cleanup** runs every 60 seconds: any session that hasn't sent a heartbeat in 5 minutes is automatically deregistered
- This handles the case where Claude Code crashes without firing the SessionEnd hook

### 4.4 PID File

On startup, the server writes its PID and port to `~/.claude-selector-bridge.pid`. Before starting, it checks if this file exists and if the referenced process is alive — if so, it exits (don't start a duplicate). If the file exists but the process is dead, it removes the stale file and starts normally. On shutdown, it removes the PID file.

### 4.5 WebSocket

The server also accepts WebSocket upgrades on the same port. This is optional — it allows real-time streaming if needed in the future (e.g., a live dashboard of selections). On connection, the server sends an `init` message with the current state. When a new batch arrives, it broadcasts to all WebSocket clients.


---


## 5. Claude Code Plugin

The system is packaged as a Claude Code plugin so it can be installed with `claude plugin install --dir ./claude-selector` or tested with `claude --plugin-dir ./claude-selector`.

### 5.1 Directory Structure

```
claude-selector/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── element-selector/
│       └── SKILL.md
├── commands/
│   └── select.md
├── hooks/
│   ├── hooks.json
│   └── scripts/
│       ├── session-start.sh
│       ├── session-end.sh
│       └── heartbeat.sh
├── bridge-server/
│   ├── server.js
│   └── package.json
├── chrome-extension/
│   └── (all extension files)
└── README.md
```

### 5.2 plugin.json

Standard plugin manifest with name `"claude-selector"`, version, description, and keywords. Only `plugin.json` goes inside `.claude-plugin/` — everything else is at the root.

### 5.3 Skill: `element-selector`

A `SKILL.md` file that Claude auto-activates when the context involves browser element selections. It should contain:
- An explanation of what the system is and what data is available
- The exact `curl` commands to read the batch from the bridge
- How to decode and save screenshots (base64 → PNG file)
- A workflow guide: read selections → find in codebase → apply changes → ask about uninstucted ones
- The API reference table for the bridge

The skill description (in frontmatter) should trigger on keywords like: "select element", "change this button", "fix the styling", "/select", "browser extension", "what did I select", "read my selections".

### 5.4 Command: `select.md`

A slash command at `commands/select.md` that the user invokes with `/claude-selector:select`. It should have `disable-model-invocation: true` (user-only, not auto-triggered). It should instruct Claude to:
1. Fetch the batch from `curl -s http://localhost:3456/batch`
2. Parse and display a summary of what was selected
3. Save screenshots to temp files for inspection
4. For each selection, find the element in the codebase using the CSS selector and apply the instruction
5. If `$ARGUMENTS` is provided, use it as an override instruction for all selections
6. If a selection has no instruction, ask the user

### 5.5 Hooks

Configured in `hooks/hooks.json` using the plugin hooks format (`{ "hooks": { ... } }`). Three hooks:

**SessionStart (matcher: "startup"):**
- Runs `hooks/scripts/session-start.sh`
- The script reads the session JSON from stdin (contains `session_id`, `cwd`, `model`)
- Checks if bridge is alive by hitting `GET /health`
- If not alive, starts `node ${CLAUDE_PLUGIN_ROOT}/bridge-server/server.js` in the background (nohup + disown), waits up to 3 seconds for it to come up
- Registers the session via `POST /session/register`
- Outputs `additionalContext` JSON so Claude knows the bridge is available

**SessionEnd (no matcher):**
- Runs `hooks/scripts/session-end.sh`
- Reads `session_id` from stdin, calls `POST /session/deregister`
- Non-blocking — if the bridge is already down, silently ignores

**PostToolUse (matcher: "\*", async: true):**
- Runs `hooks/scripts/heartbeat.sh`
- Sends `POST /session/heartbeat` with the session ID
- Async so it doesn't slow down tool execution
- This keeps the session alive and prevents stale cleanup from killing it during long-running work

All hook scripts should use `${CLAUDE_PLUGIN_ROOT}` to reference paths relative to the plugin root, making them portable.


---


## 6. Data Shapes

### 6.1 Single Selection Object

This is what the content script collects for each clicked element:

```json
{
  "selector": ".hero-section > button.cta-primary:nth-of-type(1)",
  "tagName": "button",
  "id": null,
  "classList": ["cta-primary", "btn-lg"],
  "textContent": "Get Started Free",
  "attributes": {
    "class": "cta-primary btn-lg",
    "type": "submit",
    "data-testid": "hero-cta"
  },
  "computedStyles": {
    "color": "rgb(255, 255, 255)",
    "backgroundColor": "rgb(99, 102, 241)",
    "fontSize": "18px",
    "fontFamily": "Inter, sans-serif",
    "fontWeight": "600",
    "padding": "12px 24px",
    "margin": "0px",
    "border": "0px none rgb(255, 255, 255)",
    "borderRadius": "8px",
    "display": "inline-flex",
    "position": "relative",
    "width": "200px",
    "height": "48px",
    "textAlign": "center",
    "lineHeight": "24px",
    "letterSpacing": "normal",
    "boxShadow": "rgba(0, 0, 0, 0.1) 0px 4px 6px",
    "opacity": "1",
    "transform": "none",
    "gap": "8px",
    "flexDirection": "row",
    "justifyContent": "center",
    "alignItems": "center",
    "gridTemplateColumns": "none"
  },
  "boundingRect": {
    "x": 520,
    "y": 340,
    "width": 200,
    "height": 48
  },
  "parentTag": "div",
  "childCount": 2,
  "instruction": "add a gradient background from indigo to purple, increase border-radius to 12px",
  "screenshot": "<base64-encoded JPEG string, typically 50-200KB>"
}
```

**Selector generation logic:** Try `#id` first. If no ID, try `tag.class1.class2` and check uniqueness with `querySelectorAll`. If not unique, walk up the DOM building a path with `tag:nth-of-type(n)` segments, stopping at the first ancestor with an ID.

**Computed styles to capture:** color, backgroundColor, fontSize, fontFamily, fontWeight, padding, margin, border, borderRadius, display, position, width, height, textAlign, lineHeight, letterSpacing, boxShadow, opacity, transform, gap, flexDirection, justifyContent, alignItems, gridTemplateColumns.

**textContent:** Truncated to 300 characters.

### 6.2 Batch Object

What the extension sends to `POST /batch` and Claude Code reads from `GET /batch`:

```json
{
  "batch": {
    "pageUrl": "https://mysite.com/landing",
    "pageTitle": "My Site — Landing Page",
    "selections": [
      { "...selection object 1..." },
      { "...selection object 2..." },
      { "...selection object 3..." }
    ],
    "timestamp": "2026-03-29T14:22:01.000Z"
  }
}
```

### 6.3 Session Registration

What the SessionStart hook sends to `POST /session/register`:

```json
{
  "session_id": "abc-123-def",
  "pid": 12345,
  "cwd": "/home/user/my-project",
  "model": "claude-sonnet-4-20250514"
}
```


---


## 7. Edge Cases and Considerations

### Screenshot size
Base64 JPEGs at quality 0.75 are typically 50-200KB per screenshot. A batch of 10 selections could be 2MB. The bridge server should accept bodies up to 50MB to be safe. Claude Code reads this over localhost so speed isn't a concern.

### Elements inside iframes
The content script only has access to the top frame. Elements inside iframes won't be selectable. This is a known limitation — documenting it is sufficient.

### Dynamic/SPAs
The CSS selector is generated at click time. If the page re-renders and the DOM structure changes, the selector may become stale. The screenshot serves as the ground truth — Claude can use it alongside the selector to locate the right element.

### Multiple monitors / device pixel ratio
Screenshots are captured at the device's pixel ratio. The canvas drawing of highlights must multiply coordinates by `devicePixelRatio` to align correctly with the captured image.

### Bridge already running
The SessionStart hook must check if the bridge is already alive before trying to start it. The bridge itself must also check for a stale PID file on startup. Two layers of protection against duplicate instances.

### Claude Code crashes
If Claude Code is killed (SIGKILL, power loss), the SessionEnd hook won't fire. The heartbeat mechanism and 5-minute stale timeout handle this: the bridge will eventually deregister the dead session and shut down if no other sessions exist.

### Port conflicts
If port 3456 is taken, the user can set `CLAUDE_SELECTOR_PORT` env var. They also need to update the `BRIDGE_URL` constant in the Chrome extension's content script and popup. A future improvement could make the extension configurable via an options page.