# claude-my-marketplace

A collection of [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugins providing reusable skills, agents, and commands across projects.

## Plugins

### [dev-tools-plugin](plugins/dev-tools-plugin)

General developer tooling — git workflows, code hygiene, dependency management, and spec-driven development.

- **Skills:** git-pr, dead-code, update-dependencies, sync-spec-kit
- **Agents:** dead-code-analyzer

### [documentation-plugin](plugins/documentation-plugin)

Documentation and Office document generation — architecture docs, Mermaid diagrams, D3.js charts, and professional PPTX/DOCX/XLSX files.

- **Skills:** update-docs, update-feature-docs, update-readme, graph-generation, pptx, docx, xlsx
- **MCP:** Mermaid Chart, Playwright

### [infra-plugin](plugins/infra-plugin)

Infrastructure management for Kubernetes/GKE, Istio, Helm, Terraform, Traefik, and authentication (Keycloak, OAuth2-proxy).

- **Skills:** auth, helm, istio, kubernetes, terraform, traefik

### [figma-plugin](plugins/figma-plugin)

Design and Figma integration — automate Figma via Plugin API in the browser, extract design tokens, generate code from designs, audit design systems, and use pre-made icon libraries (Lucide, Heroicons, Tabler) for clean SVG icons.

- **Skills:** figma-bridge, figma-rest-api, design-tokens, design-to-code, design-system, icon-library
- **MCP:** Playwright

### [media-plugin](plugins/media-plugin)

AI-powered media generation — images, videos/GIFs, music, and text-to-speech via Google Gemini and ElevenLabs. Also supports sourcing stock photos from Unsplash, Pexels, and Pixabay.

- **Skills:** image-generation, image-sourcing, video-generation, music-generation, speech-generation
- **Agents:** media-director
- **MCP:** media-mcp (Gemini), ElevenLabs

## Installation

### 1. Add the marketplace

Add this repository as a plugin marketplace using the `/plugin` slash command inside Claude Code:

```
/plugin marketplace add lukaskellerstein/claude-my-marketplace
```

Or via the CLI:

```bash
claude plugin marketplace add lukaskellerstein/claude-my-marketplace
```

### 2. Install a plugin

Once the marketplace is added, install individual plugins:

```
/plugin install dev-tools-plugin@claude-my-marketplace
/plugin install documentation-plugin@claude-my-marketplace
/plugin install infra-plugin@claude-my-marketplace
/plugin install figma-plugin@claude-my-marketplace
/plugin install media-plugin@claude-my-marketplace
```

### 3. Update

To pull the latest versions:

```
/plugin marketplace update
```

## Author

Lukas Kellerstein
