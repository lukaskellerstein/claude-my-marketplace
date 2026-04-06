# Runtime Configuration Reference

Runtime config is split into two scopes: global (all agents) and per-agent.

Claude Code resolves settings in layers: user-level (global) is the baseline, project-level (per-agent) overrides specific fields.

## Global Config (`global/`)

Processed once at container startup by the Docker entrypoint. Affects all agents.

### `global/settings.json`

Baseline deny rules and shared env vars. Do NOT put per-agent `enabledPlugins` here.

```json
{
  "permissions": {
    "deny": [
      "Bash(rm -rf /)",
      "Bash(rm -rf ~)",
      "Read(./**/*.pem)",
      "Read(./**/*.key)"
    ]
  }
}
```

### `global/plugins.json`

Marketplace and plugin installation. Installs binaries globally so any agent can enable them.

```json
{
  "marketplaces": [
    {
      "source": "lukaskellerstein/claude-my-marketplace",
      "scope": "user"
    }
  ],
  "plugins": [
    { "name": "dev-tools-plugin@claude-my-marketplace", "scope": "user" },
    { "name": "office-plugin@claude-my-marketplace", "scope": "user" },
    { "name": "infra-plugin@claude-my-marketplace", "scope": "user" },
    { "name": "media-plugin@claude-my-marketplace", "scope": "user" },
    { "name": "design-plugin@claude-my-marketplace", "scope": "user" },
    { "name": "web-design-plugin@claude-my-marketplace", "scope": "user" },
    { "name": "company-plugin@claude-my-marketplace", "scope": "user" }
  ]
}
```

Only include plugins that at least one agent will use.

## Per-Agent Config (`agents/{slug}/runtime/`)

### `runtime/settings.json`

Controls which globally-installed plugins are active for this agent.

```json
{
  "enabledPlugins": {
    "dev-tools-plugin@claude-my-marketplace": true,
    "design-plugin@claude-my-marketplace": true
  },
  "permissions": {
    "allow": [
      "mcp__plugin_web-design-plugin_webdesign-playwright",
      "mcp__chrome"
    ]
  },
  "env": {
    "SOME_VAR": "value"
  }
}
```

See `role-plugin-matrix.md` in the agent-design skill for exact assignments per role.

### `runtime/mcp.json`

MCP server definitions. Most agents have empty `mcpServers: {}`.

Source file: `agents/{slug}/runtime/mcp.json` (no leading dot)
Deployed to: `<workspace>/.mcp.json` (with leading dot)

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-playwright@latest"]
    }
  }
}
```

MCP tools must also be allowed in `runtime/settings.json` permissions.

### `runtime/agents/*.md` (Subagents)

Claude Code subagent definitions. Discovered from `<cwd>/.claude/agents/`.

Source: `agents/{slug}/runtime/agents/*.md`
Deployed to: `<workspace>/.claude/agents/*.md`

```markdown
---
name: code-reviewer
description: >
  Reviews code for quality and security. Never modifies code.
model: sonnet
disallowedTools: Edit, Write
color: blue
---

You are a senior code reviewer. Report findings with file paths and line numbers.
```

Use subagents for quick in-session tasks (review, test, search). Use Paperclip task delegation for tracked, cross-agent work.

## Available Plugins (marketplace)

| Plugin | What it provides | MCP servers |
|--------|-----------------|-------------|
| `dev-tools-plugin` | Git workflows, dead-code analysis, dependency updates, docs generation | — |
| `office-plugin` | PPTX presentations, DOCX documents, XLSX spreadsheets | — |
| `infra-plugin` | Kubernetes/GKE, Istio, Helm, Terraform, Traefik, auth | — |
| `media-plugin` | AI image/video/music/speech generation, stock photos, SVG icons, charts, diagrams | media-mcp, ElevenLabs, Mermaid Chart, Playwright |
| `design-plugin` | Creative direction, styleguides, aesthetic strategy, design review | — |
| `web-design-plugin` | End-to-end website/webapp design, visual testing. Depends on: design-plugin, media-plugin | Playwright |
| `company-plugin` | Shipping (Zasilkovna, DHL), payments (Stripe) | DHL API Assistant, Stripe |

Plugin names in `enabledPlugins` use: `{name}@claude-my-marketplace`

**Dependencies:** `web-design-plugin` depends on `design-plugin`, which depends on `media-plugin` and `office-plugin`. Enable dependencies too.
