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

## Environment Variables by Plugin

Each plugin's MCP servers require specific OS-level environment variables. These must be present in the agent's process environment at runtime. In Paperclip, they are injected via company secrets + `adapterConfig.env`.

### Plugin → Required Env Vars

| Plugin | Env Var | Kind | Required | Description |
|--------|---------|------|----------|-------------|
| media-plugin | `GEMINI_API_KEY` | secret | yes | Google Gemini API key for image, video, and music generation |
| media-plugin | `ELEVENLABS_API_KEY` | secret | no | ElevenLabs API key for text-to-speech |
| media-plugin | `MEDIA_OUTPUT_DIR` | plain | no | Output directory for generated media files |
| company-plugin | `STRIPE_SECRET_KEY` | secret | yes | Stripe secret API key (`sk_test_...` for dev, `sk_live_...` for production) |

Plugins without MCP env vars: `dev-tools-plugin`, `office-plugin`, `infra-plugin`, `design-plugin`, `web-design-plugin`.

### Role → Required Env Vars

Derived from role×plugin assignments above. Only roles that use plugins with env vars are listed.

| Role | Env Vars Needed (via plugin) |
|------|------------------------------|
| CEO | `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` |
| CMO | `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `MEDIA_OUTPUT_DIR`, `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` |
| COO | `STRIPE_SECRET_KEY`, `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` |
| HeadOfOperations | `STRIPE_SECRET_KEY`, `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` |
| UI Designer | `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `MEDIA_OUTPUT_DIR` |
| Designer | `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `MEDIA_OUTPUT_DIR` |
| Content Creator | `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `MEDIA_OUTPUT_DIR`, `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` |
| Marketing Specialist | `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `MEDIA_OUTPUT_DIR`, `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` |
| Product Manager | `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` |
| Customer Support | `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` |
| Warehouse Manager | `STRIPE_SECRET_KEY` |
| Supply Chain Manager | `STRIPE_SECRET_KEY` |

### Infrastructure-Level Env Vars

These are not plugin-specific but are needed by agents that interact with external infrastructure. They are set as company-wide secrets:

| Env Var | Kind | Description |
|---------|------|-------------|
| `GH_TOKEN` | secret | GitHub personal access token for `gh` CLI |
| `DOCKER_HUB_USERNAME` | secret | Docker Hub username for image push/pull |
| `DOCKER_HUB_TOKEN` | secret | Docker Hub access token |
| `STRIPE_WEBHOOK_SECRET` | secret | Stripe webhook signing secret |
| `DATABASE_URL` | secret | PostgreSQL connection string |
| `SENTRY_DSN` | plain | Sentry error tracking DSN |
| `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` | plain | Path to GWS service account JSON (per-company, e.g. `/paperclip/.gws/<company>.json`) |

## Google Workspace Skills

The `gws` CLI is pre-installed in the Paperclip container via npm. The individual GWS skills (`gws-gmail`, `gws-calendar`, `persona-exec-assistant`, etc.) come from the [Google Workspace CLI repo](https://github.com/googleworkspace/cli) and are imported into each company's `skills/` directory during generation via `paperclip-plugin/scripts/import-gws-skills.sh` (called automatically by `pre-generate.sh`).

The `gws-cli` skill in the paperclip-plugin is a **reference only** — it documents all available GWS tools and hosts the import script. It is NOT copied into generated companies. Agents list the individual GWS skills in their frontmatter instead.

### GWS-Eligible Roles

Only these roles get GWS access (env vars + GWS skills in frontmatter):

CEO, CMO, COO, HeadOfOperations, Content Creator, Marketing Specialist, Product Manager, Customer Support

### Role → GWS Skills Mapping

Each GWS-eligible role needs specific GWS skills listed in their AGENTS.md `skills:` frontmatter. Select from the skills imported by the script based on what the role needs:

| Role | GWS Skills (add to `skills:` frontmatter) |
|------|------------------------------------------|
| CEO | `gws-gmail`, `gws-gmail-send`, `gws-gmail-read`, `gws-gmail-reply`, `gws-gmail-triage`, `gws-calendar`, `gws-calendar-agenda`, `gws-calendar-insert`, `gws-drive`, `gws-docs`, `gws-tasks`, `gws-meet`, `gws-shared`, `persona-exec-assistant`, `gws-workflow-meeting-prep`, `gws-workflow-standup-report`, `gws-workflow-weekly-digest` |
| CMO | `gws-gmail`, `gws-gmail-send`, `gws-gmail-read`, `gws-gmail-reply`, `gws-gmail-triage`, `gws-calendar`, `gws-calendar-agenda`, `gws-drive`, `gws-docs`, `gws-sheets`, `gws-forms`, `gws-shared`, `persona-content-creator`, `persona-sales-ops` |
| COO | `gws-gmail`, `gws-gmail-send`, `gws-gmail-read`, `gws-gmail-reply`, `gws-gmail-triage`, `gws-calendar`, `gws-calendar-agenda`, `gws-drive`, `gws-docs`, `gws-sheets`, `gws-tasks`, `gws-shared`, `persona-project-manager` |
| HeadOfOperations | `gws-gmail`, `gws-gmail-send`, `gws-gmail-read`, `gws-gmail-reply`, `gws-gmail-triage`, `gws-calendar`, `gws-calendar-agenda`, `gws-drive`, `gws-docs`, `gws-sheets`, `gws-tasks`, `gws-shared`, `persona-project-manager` |
| Content Creator | `gws-gmail`, `gws-gmail-send`, `gws-gmail-read`, `gws-gmail-reply`, `gws-calendar`, `gws-calendar-agenda`, `gws-drive`, `gws-drive-upload`, `gws-docs`, `gws-docs-write`, `gws-sheets`, `gws-shared`, `persona-content-creator` |
| Marketing Specialist | `gws-gmail`, `gws-gmail-send`, `gws-gmail-read`, `gws-gmail-reply`, `gws-gmail-triage`, `gws-calendar`, `gws-calendar-agenda`, `gws-drive`, `gws-sheets`, `gws-sheets-append`, `gws-forms`, `gws-shared`, `persona-sales-ops` |
| Product Manager | `gws-gmail`, `gws-gmail-send`, `gws-gmail-read`, `gws-gmail-reply`, `gws-gmail-triage`, `gws-calendar`, `gws-calendar-agenda`, `gws-calendar-insert`, `gws-drive`, `gws-docs`, `gws-sheets`, `gws-tasks`, `gws-shared`, `persona-project-manager`, `gws-workflow-meeting-prep` |
| Customer Support | `gws-gmail`, `gws-gmail-send`, `gws-gmail-read`, `gws-gmail-reply`, `gws-gmail-reply-all`, `gws-gmail-forward`, `gws-gmail-triage`, `gws-calendar`, `gws-calendar-agenda`, `gws-docs`, `gws-sheets`, `gws-shared`, `persona-customer-support`, `gws-workflow-email-to-task` |

### Agent Setup for GWS

For each GWS-eligible agent:

1. **Frontmatter:** add the role's GWS skills from the table above to the `skills:` array
2. **Env vars:** set `AGENT_EMAIL`, `COMPANY_DOMAIN`, and `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` in `runtime/settings.json` (all three as a bundle)
3. **Body:** add a "Google Workspace" section in AGENTS.md describing available tools

Example AGENTS.md for a CEO:
```yaml
---
name: CEO
title: Chief Executive Officer
reportsTo: null
skills:
  - strategy-review
  - delegation-playbook
  - gws-gmail
  - gws-gmail-send
  - gws-gmail-read
  - gws-gmail-reply
  - gws-gmail-triage
  - gws-calendar
  - gws-calendar-agenda
  - gws-calendar-insert
  - gws-drive
  - gws-docs
  - gws-tasks
  - gws-meet
  - gws-shared
  - persona-exec-assistant
  - gws-workflow-meeting-prep
  - gws-workflow-standup-report
  - gws-workflow-weekly-digest
---
```

```markdown
## Google Workspace

You have full access to Google Workspace via the `gws` CLI. Your email is configured via the `AGENT_EMAIL` environment variable.

**Available tools:** Gmail (send, read, reply, triage), Calendar (events, agenda, create), Drive (files, folders), Docs, Sheets, Tasks, Meet.

Run `gws --help` or `gws <service> --help` for CLI documentation.

**Common skills:**
- `/gws-gmail-triage` — inbox summary
- `/gws-calendar-agenda` — upcoming events
- `/persona-exec-assistant` — combined inbox + calendar + tasks workflows
- `/gws-workflow-meeting-prep` — prepare for next meeting
- `/gws-workflow-standup-report` — daily standup summary
```

## Agent-Level MCP Servers

Some agents need MCP servers defined in their own `mcp.json` (not from plugins):

| MCP Server | Permission | Which Agents |
|-----------|------------|-------------|
| chrome-devtools (Chrome DevTools) | `mcp__chrome-devtools` | Frontend Engineer, QA Engineer, UX Tester |

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
      "mcp__chrome-devtools"
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
      "mcp__chrome-devtools"
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
