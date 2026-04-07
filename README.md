# claude-my-marketplace

[![GitHub](https://img.shields.io/github/stars/lukaskellerstein/claude-my-marketplace?style=flat&logo=github)](https://github.com/lukaskellerstein/claude-my-marketplace)
[![Plugins](https://img.shields.io/badge/plugins-8-blue?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0id2hpdGUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE0IiBoZWlnaHQ9IjE0IiByeD0iMiIvPjwvc3ZnPg==)](plugins/)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-compatible-orange?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0id2hpdGUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOCIvPjwvc3ZnPg==)](https://docs.anthropic.com/en/docs/claude-code)

> A curated collection of [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugins for design, development, documentation, media generation, and infrastructure management.

This marketplace bundles **8 plugins** with **45+ skills**, **16 specialized agents**, and multiple MCP server integrations — giving Claude Code capabilities spanning the full software development lifecycle from design to deployment, plus autonomous AI company creation.

## Plugins

### [company-plugin](plugins/company-plugin) `v1.1.0`

Business operations toolkit — shipping logistics via Zásilkovna (Czech) and payment processing via Stripe.

- **Skills:** zasilkovna, stripe
- **MCP:** Stripe

### [dev-tools-plugin](plugins/dev-tools-plugin) `v1.2.1`

General developer tooling — git workflows, code hygiene, dependency management, spec-driven development, and project documentation generation.

- **Skills:** git-pr, dead-code, update-dependencies, sync-spec-kit, update-docs, update-feature-docs, update-readme
- **Agents:** dead-code-analyzer, sync-spec-kit-agent

### [office-plugin](plugins/office-plugin) `v5.0.1`

Office document generation — professional PowerPoint presentations, Word documents, and Excel spreadsheets.

- **Skills:** pptx, docx, xlsx

### [infra-plugin](plugins/infra-plugin) `v1.0.1`

Infrastructure management for Kubernetes/GKE, Istio, Helm, Terraform, Traefik, and authentication (Keycloak, OAuth2-proxy).

- **Skills:** auth, helm, istio, kubernetes, terraform, traefik

### [media-plugin](plugins/media-plugin) `v1.5.1`

AI-powered media generation — images, videos/GIFs, music, text-to-speech, and data visualizations (charts, graphs, diagrams, maps) via Google Gemini, ElevenLabs, D3.js, and Mermaid. Also supports sourcing stock photos and fetching pre-made SVG icons.

- **Skills:** image-generation, image-sourcing, video-generation, music-generation, speech-generation, icon-library, graph-generation, svg-mastery
- **Agents:** media-director
- **Commands:** /media-generate, /media-assets
- **MCP:** media-mcp (Gemini), ElevenLabs, Mermaid Chart, Playwright

### [design-plugin](plugins/design-plugin) `v1.1.1`

Design direction and creative guidance — the "taste layer" that makes AI-assisted design intentional rather than generic. Styleguides, aesthetic strategy, typography pairings, color mood systems, media prompt crafting, and design review.

- **Skills:** styleguide, frontend-aesthetics, media-prompt-craft, design-review, design-system
- **Agents:** design-director
- **Commands:** /design

### [web-design-plugin](plugins/web-design-plugin) `v1.5.10`

End-to-end website/webapp design and implementation — from brief to working React/Vite code. Orchestrates design direction, content architecture, media generation, parallel per-page implementation, and visual testing with an opinionated anti-slop workflow.

- **Skills:** animation-system, page-architecture, css-architecture, variation
- **Agents:** page-builder, scaffold-builder, assembler, variation-generator, visual-fixer-app, visual-fixer-page, design-doc-foundation, design-doc-animation, design-doc-data, design-doc-media, design-doc-pages
- **Commands:** /web-design
- **MCP:** Playwright

### [paperclip-plugin](plugins/paperclip-plugin) `v2.0.3`

Autonomous AI company advisor for the [Paperclip](https://paperclip.ing) platform — create, design, analyze, and manage AI-powered companies with proper agent hierarchies, runtime configurations, and infrastructure following the Agent Companies spec.

- **Skills:** company-creation, agent-design, project-design, company-analysis, infrastructure-planning
- **Agents:** company-builder
- **Commands:** /company, /company-analyze, /brainstorming

## Architecture

### Plugin Dependencies

```mermaid
graph TD
    webdesign[web-design-plugin] --> design[design-plugin]
    design --> media[media-plugin]
    design --> office[office-plugin]
    dev[dev-tools-plugin]
    infra[infra-plugin]
    company[company-plugin]
    paperclip[paperclip-plugin]

    style media fill:#4a9eff,color:#fff
    style design fill:#a855f7,color:#fff
    style webdesign fill:#22c55e,color:#fff
    style office fill:#eab308,color:#000
    style dev fill:#6b7280,color:#fff
    style infra fill:#6b7280,color:#fff
    style company fill:#ef4444,color:#fff
    style paperclip fill:#f97316,color:#fff
```

- **media-plugin** is foundational — used by design-plugin for image/video/music/speech generation, icon sourcing, and data visualizations
- **design-plugin** provides creative direction — used by web-design-plugin for design system auditing and styleguides
- **web-design-plugin** uses design-plugin skills for aesthetic direction, styleguides, and design review
- **office-plugin** is used by design-plugin for PPTX image dimension references
- **dev-tools-plugin**, **infra-plugin**, **company-plugin**, and **paperclip-plugin** are standalone with no cross-plugin dependencies

### Commands

| Plugin | Command | Purpose |
|--------|---------|---------|
| design-plugin | `/design` | Design direction workflow |
| media-plugin | `/media-generate` | Generate a media asset with guided prompts |
| media-plugin | `/media-assets` | List and manage generated media assets |
| paperclip-plugin | `/company` | Create an AI company |
| paperclip-plugin | `/company-analyze` | Analyze an existing AI company |
| paperclip-plugin | `/brainstorming` | Brainstorm AI company ideas |
| web-design-plugin | `/web-design` | End-to-end website design workflow |

### MCP Server Integrations

| Plugin | MCP Server | Purpose |
|--------|-----------|---------|
| media-plugin | `media-mcp` (uvx) | AI media generation via Google Gemini |
| media-plugin | `elevenlabs-mcp` (uvx) | Text-to-speech and voice cloning |
| media-plugin | Mermaid Chart (HTTP) | Diagram generation |
| media-plugin | Playwright (npx) | D3.js chart rendering |
| web-design-plugin | Playwright (npx) | Visual testing of built websites |
| company-plugin | `@stripe/mcp` (npx) | Stripe payments, subscriptions, invoicing |

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
/plugin install office-plugin@claude-my-marketplace
/plugin install company-plugin@claude-my-marketplace
/plugin install infra-plugin@claude-my-marketplace
/plugin install media-plugin@claude-my-marketplace
/plugin install paperclip-plugin@claude-my-marketplace
/plugin install design-plugin@claude-my-marketplace
/plugin install web-design-plugin@claude-my-marketplace
```

### 3. Update

To pull the latest versions:

```
/plugin marketplace update
```

## Environment Variables

The **media-plugin** and **company-plugin** require environment variables. All other plugins work without any configuration.

### media-plugin

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key for image, video, and music generation via the `media-mcp` server. Get one at [aistudio.google.com](https://aistudio.google.com/apikey). |
| `ELEVENLABS_API_KEY` | **Yes** | ElevenLabs API key for text-to-speech, voice cloning, and audio tools. Get one at [elevenlabs.io](https://elevenlabs.io). |
| `MEDIA_OUTPUT_DIR` | Recommended | Absolute path where generated media files are saved. When set, MCP servers return file paths instead of base64 data, keeping the conversation context clean. Falls back to the current directory if unset. |

### company-plugin

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | **Yes** | Stripe secret API key for the Stripe MCP server. Use `sk_test_...` keys for development. Get one at [dashboard.stripe.com](https://dashboard.stripe.com). |
| `ZASILKOVNA_API_KEY` | **Yes** | Zásilkovna (Packeta) API password for shipment operations. Get one from the Zásilkovna client section. |

### Setup by OS

#### macOS / Linux (bash)

Add to your `~/.bashrc`, `~/.bash_profile`, or `~/.zshrc`:

```bash
export GEMINI_API_KEY="your-gemini-api-key"
export ELEVENLABS_API_KEY="your-elevenlabs-api-key"
export MEDIA_OUTPUT_DIR="/path/to/media/output"
export STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
export ZASILKOVNA_API_KEY="your-zasilkovna-api-key"
```

Then reload your shell:

```bash
source ~/.bashrc   # or ~/.zshrc
```

#### Windows (PowerShell)

Set permanently for your user via PowerShell:

```powershell
[System.Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "your-gemini-api-key", "User")
[System.Environment]::SetEnvironmentVariable("ELEVENLABS_API_KEY", "your-elevenlabs-api-key", "User")
[System.Environment]::SetEnvironmentVariable("MEDIA_OUTPUT_DIR", "C:\path\to\media\output", "User")
[System.Environment]::SetEnvironmentVariable("STRIPE_SECRET_KEY", "sk_test_your-stripe-secret-key", "User")
[System.Environment]::SetEnvironmentVariable("ZASILKOVNA_API_KEY", "your-zasilkovna-api-key", "User")
```

Then restart your terminal for changes to take effect.

#### Windows (Command Prompt)

Set permanently via `setx`:

```cmd
setx GEMINI_API_KEY "your-gemini-api-key"
setx ELEVENLABS_API_KEY "your-elevenlabs-api-key"
setx MEDIA_OUTPUT_DIR "C:\path\to\media\output"
setx STRIPE_SECRET_KEY "sk_test_your-stripe-secret-key"
setx ZASILKOVNA_API_KEY "your-zasilkovna-api-key"
```

Then restart your terminal for changes to take effect.

## Author

Lukas Kellerstein
