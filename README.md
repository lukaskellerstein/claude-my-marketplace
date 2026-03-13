# claude-my-marketplace

A collection of [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugins providing reusable skills, agents, and commands across projects.

## Plugins

### [dev-tools-plugin](plugins/dev-tools-plugin)

General developer tooling — git workflows, code hygiene, and dependency management.

- **Skills:** git-pr, dead-code, update-dependencies
- **Agents:** dead-code-analyzer

### [documentation-plugin](plugins/documentation-plugin)

Documentation management — architecture docs, feature documentation, and Mermaid diagrams.

- **Skills:** documentation, mermaid
- **Agents:** docs-auditor
- **Commands:** docs-init, docs-feature, docs-update
- **MCP:** Mermaid Chart

### [infra-plugin](plugins/infra-plugin)

Infrastructure management for Kubernetes/GKE, Istio, Helm, Terraform, Traefik, and authentication (Keycloak, OAuth2-proxy).

- **Skills:** auth, helm, istio, kubernetes, terraform, traefik

### [media-plugin](plugins/media-plugin)

AI-powered media generation — images, videos/GIFs, music, and text-to-speech via Google Gemini.

- **Skills:** image-generation, video-generation, music-generation, speech-generation
- **MCP:** media-mcp (Gemini)

## Installation

Add a plugin to your project by adding its path to your Claude Code settings:

```bash
claude plugins add /path/to/claude-my-marketplace/plugins/<plugin-name>
```

## Author

Lukas Kellerstein
