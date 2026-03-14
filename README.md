# claude-my-marketplace

A collection of [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugins providing reusable skills, agents, and commands across projects.

## Plugins

### [dev-tools-plugin](plugins/dev-tools-plugin)

General developer tooling — git workflows, code hygiene, and dependency management.

- **Skills:** git-pr, dead-code, update-dependencies
- **Agents:** dead-code-analyzer

### [documentation-plugin](plugins/documentation-plugin)

Documentation management — architecture docs, feature documentation, Mermaid diagrams, D3.js charts, and professional PowerPoint presentations using a hybrid HTML/CSS + PptxGenJS workflow (visual layers designed in HTML/CSS, screenshotted with Playwright as slide backgrounds, with editable text added via PptxGenJS).

- **Skills:** documentation, graph-generation, pptx
- **Agents:** docs-auditor
- **Commands:** docs-init, docs-feature, docs-update
- **MCP:** Mermaid Chart, Playwright

### [infra-plugin](plugins/infra-plugin)

Infrastructure management for Kubernetes/GKE, Istio, Helm, Terraform, Traefik, and authentication (Keycloak, OAuth2-proxy).

- **Skills:** auth, helm, istio, kubernetes, terraform, traefik

### [figma-plugin](plugins/figma-plugin)

Design and Figma integration — automate Figma via Plugin API in the browser, extract design tokens, generate code from designs, audit design systems, and use pre-made icon libraries (Lucide, Heroicons, Tabler) for clean SVG icons.

- **Skills:** figma-plugin-api, figma-rest-api, design-tokens, design-to-code, design-system, icon-library
- **Agents:** figma-automator, design-auditor
- **Commands:** design-inspect, design-tokens
- **MCP:** Playwright

### [media-plugin](plugins/media-plugin)

AI-powered media generation — images, videos/GIFs, music, and text-to-speech via Google Gemini. Also supports sourcing stock photos from Unsplash, Pexels, and Pixabay.

- **Skills:** image-generation, image-sourcing, video-generation, music-generation, speech-generation
- **Agents:** media-director
- **Commands:** media-generate, media-assets
- **MCP:** media-mcp (Gemini)

## Installation

Add a plugin to your project by adding its path to your Claude Code settings:

```bash
claude plugins add /path/to/claude-my-marketplace/plugins/<plugin-name>
```

## Author

Lukas Kellerstein
