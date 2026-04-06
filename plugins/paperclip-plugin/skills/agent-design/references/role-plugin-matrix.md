# Role-Plugin Assignment Matrix

Quick reference for assigning marketplace plugins and MCP permissions to agents based on their role.

## Available Plugins

| Plugin | What it provides | MCP servers |
|--------|-----------------|-------------|
| `dev-tools-plugin` | Git workflows, dead-code analysis, dependency updates, docs generation | — |
| `office-plugin` | PPTX presentations, DOCX documents, XLSX spreadsheets | — |
| `infra-plugin` | K8s/GKE, Istio, Helm, Terraform, Traefik, auth | — |
| `media-plugin` | AI image/video/music/speech, stock photos, SVG icons, charts, diagrams | media-mcp, ElevenLabs, Mermaid, Playwright |
| `design-plugin` | Creative direction, styleguides, typography, color systems, design review | — |
| `web-design-plugin` | Website/webapp design, visual testing (depends on: design-plugin → media-plugin) | Playwright |
| `company-plugin` | Shipping logistics (Zásilkovna, DHL), payment processing (Stripe) | DHL API Assistant, Stripe |

**Plugin dependencies:** `web-design-plugin` → `design-plugin` → `media-plugin` + `office-plugin`. Enable all dependencies.

## Plugin Assignments by Role

| Role | dev-tools | office | infra | media | design | web-design | company |
|------|-----------|--------|-------|-------|--------|------------|---------|
| CEO | x | x | | | | | |
| CTO | x | x | x | | | | |
| CMO | | x | | x | x | | |
| CFO | | x | | | | | |
| COO | | x | | | | | x |
| HeadOfOperations | | x | | | | | x |
| Backend Engineer | x | | x | | | | |
| Frontend Engineer | x | | | | x | x | |
| Fullstack Engineer | x | | | | x | | |
| ML/AI Engineer | x | | | | | | |
| DevOps Engineer | x | | x | | | | |
| QA Engineer | x | | | | | | |
| UX Tester | x | | | | x | x | |
| UI Designer | | | | x | x | | |
| UX Designer | | | | | x | x | |
| Designer | | | | x | x | | |
| Content Creator | | x | | x | x | | |
| Marketing Specialist | | x | | x | | | |
| Product Manager | | x | | | | | |
| Researcher | | x | | | | | |
| Customer Support | | x | | | | | |
| Warehouse Manager | | x | | | | | x |
| Supply Chain Manager | | x | | | | | x |

## MCP Permission Mapping

When a plugin with MCP servers is enabled, the agent's `settings.json` must also allow the MCP tools.

| Plugin | MCP Server | Permission String |
|--------|-----------|-------------------|
| media-plugin | mermaid | `mcp__plugin_media-plugin_mermaid` |
| media-plugin | media-playwright | `mcp__plugin_media-plugin_media-playwright` |
| media-plugin | media-mcp | `mcp__plugin_media-plugin_media-mcp` |
| media-plugin | ElevenLabs | `mcp__plugin_media-plugin_ElevenLabs` |
| web-design-plugin | webdesign-playwright | `mcp__plugin_web-design-plugin_webdesign-playwright` |
| company-plugin | DHL API Assistant | `mcp__plugin_company-plugin_dhl-api-assistant` |
| company-plugin | Stripe | `mcp__plugin_company-plugin_stripe` |

## Agent-Level MCP Servers

Some agents need MCP servers defined in their own `mcp.json` (not from plugins):

| MCP Server | Permission | Which Agents |
|-----------|------------|-------------|
| chrome (Chrome DevTools) | `mcp__chrome` | Frontend Engineer, QA Engineer, UX Tester |

## settings.json Examples

### CEO (dev-tools + office + media)

```json
{
  "enabledPlugins": {
    "dev-tools-plugin@claude-my-marketplace": true,
    "office-plugin@claude-my-marketplace": true,
    "media-plugin@claude-my-marketplace": true
  },
  "permissions": {
    "allow": [
      "mcp__plugin_media-plugin_mermaid",
      "mcp__plugin_media-plugin_media-playwright"
    ]
  }
}
```

### CTO (dev-tools + office + media + infra)

```json
{
  "enabledPlugins": {
    "dev-tools-plugin@claude-my-marketplace": true,
    "office-plugin@claude-my-marketplace": true,
    "media-plugin@claude-my-marketplace": true,
    "infra-plugin@claude-my-marketplace": true
  },
  "permissions": {
    "allow": [
      "mcp__plugin_media-plugin_mermaid",
      "mcp__plugin_media-plugin_media-playwright"
    ]
  }
}
```

### CMO (office + media + design)

```json
{
  "enabledPlugins": {
    "office-plugin@claude-my-marketplace": true,
    "media-plugin@claude-my-marketplace": true,
    "design-plugin@claude-my-marketplace": true
  },
  "permissions": {
    "allow": [
      "mcp__plugin_media-plugin_mermaid",
      "mcp__plugin_media-plugin_media-playwright",
      "mcp__plugin_media-plugin_media-mcp",
      "mcp__plugin_media-plugin_ElevenLabs"
    ]
  }
}
```

### Backend Engineer (dev-tools + infra)

```json
{
  "enabledPlugins": {
    "dev-tools-plugin@claude-my-marketplace": true,
    "infra-plugin@claude-my-marketplace": true
  }
}
```

### Frontend Engineer (dev-tools + design + web-design)

```json
{
  "enabledPlugins": {
    "dev-tools-plugin@claude-my-marketplace": true,
    "design-plugin@claude-my-marketplace": true,
    "web-design-plugin@claude-my-marketplace": true
  },
  "permissions": {
    "allow": [
      "mcp__plugin_web-design-plugin_webdesign-playwright",
      "mcp__chrome"
    ]
  }
}
```

### Content Creator (office + media + design)

```json
{
  "enabledPlugins": {
    "office-plugin@claude-my-marketplace": true,
    "media-plugin@claude-my-marketplace": true,
    "design-plugin@claude-my-marketplace": true
  },
  "permissions": {
    "allow": [
      "mcp__plugin_media-plugin_mermaid",
      "mcp__plugin_media-plugin_media-playwright",
      "mcp__plugin_media-plugin_media-mcp",
      "mcp__plugin_media-plugin_ElevenLabs"
    ]
  }
}
```

### QA Engineer (dev-tools only, with chrome MCP)

```json
{
  "enabledPlugins": {
    "dev-tools-plugin@claude-my-marketplace": true
  },
  "permissions": {
    "allow": [
      "mcp__chrome"
    ]
  }
}
```

### HeadOfOperations / COO (office + company)

```json
{
  "enabledPlugins": {
    "office-plugin@claude-my-marketplace": true,
    "company-plugin@claude-my-marketplace": true
  },
  "permissions": {
    "allow": [
      "mcp__plugin_company-plugin_dhl-api-assistant",
      "mcp__plugin_company-plugin_stripe"
    ]
  }
}
```
