# Role-Plugin Assignment Matrix

Quick reference for assigning marketplace plugins and MCP permissions to agents based on their role.

## Plugin Assignments by Role

| Role | dev-tools | office | infra | media | design | web-design |
|------|-----------|--------|-------|-------|--------|------------|
| CEO | x | x | | | | |
| CTO | x | x | x | | | |
| CMO | | x | | x | x | |
| CFO | | x | | | | |
| HeadOfOperations | | x | | | | |
| Backend Engineer | x | | x | | | |
| Frontend Engineer | x | | | | x | x |
| ML/AI Engineer | x | | | | | |
| DevOps Engineer | x | | x | | | |
| QA Engineer | x | | | | | |
| UX Tester | x | | | | x | x |
| Designer | | | | x | x | |
| Content Creator | | x | | x | x | |
| Product Manager | | x | | | | |
| Researcher | | x | | | | |

## MCP Permission Mapping

When a plugin with MCP servers is enabled, the agent's `settings.json` must also allow the MCP tools.

| Plugin | MCP Server | Permission String |
|--------|-----------|-------------------|
| media-plugin | mermaid | `mcp__plugin_media-plugin_mermaid` |
| media-plugin | media-playwright | `mcp__plugin_media-plugin_media-playwright` |
| media-plugin | media-mcp | `mcp__plugin_media-plugin_media-mcp` |
| media-plugin | ElevenLabs | `mcp__plugin_media-plugin_ElevenLabs` |
| web-design-plugin | webdesign-playwright | `mcp__plugin_web-design-plugin_webdesign-playwright` |

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
