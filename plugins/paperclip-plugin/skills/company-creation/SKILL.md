---
name: company-creation
description: >
  Generate a complete Paperclip company package following the Agent Companies spec
  (agentcompanies/v1) — COMPANY.md, agents with instruction bundles and runtime config,
  projects, tasks, skills, global config, and .paperclip.yaml. Use when creating a new
  company from scratch or from an existing repo.
---

# Company Creation Skill

Generate complete, import-ready company packages for the Paperclip platform.

## When to Use

- User wants to create a new company on Paperclip
- User has a business idea and needs the full agent organization generated
- User invokes `/company <description>`

## Two Modes

### Mode 1: Company From Scratch

The user describes what they want. Interview them, then generate the package.

### Mode 2: Company From a Repo

The user provides a git repo URL or local path. Analyze the repo, then create a company that wraps it. Default to referencing existing skills rather than copying them.

## Generation Process

### Phase 1: Discovery Interview

Use AskUserQuestion. Ask 2-3 focused questions per round:

**From scratch:**
- Company purpose and domain
- What agents they need (propose a hiring plan, don't ask open-ended)
- Tech stack preferences (default: React/TS frontend, Python/FastAPI backend, Docker/K8s)
- Required software (Slack, Google Workspace, Stripe?)
- Infrastructure (existing or from scratch?)
- Logistics (physical products?)

**From repo:**
- Confirm the agents you plan to create
- Whether to reference or vendor discovered skills (default: reference)
- Company name and customization

### Phase 2: Org Design

Propose an org chart with:
- Agent names, roles, and reporting lines
- Monthly budgets per agent
- Plugin assignments per agent (from `references/role-plugin-matrix.md`)
- Total monthly cost

Use `references/standard-roles.md` as a catalog of available roles.

Ask: "Does this org structure look right?"

### Phase 3: Goal & Task Definition

Propose:
1. Company goal — clear, measurable objective
2. Initial tasks (5-10) — strategic tasks assigned to CEO

### Phase 4: Generate the Package

**Read the references first:**
- `references/package-structure.md` — the full folder structure and deployment paths
- `references/standard-roles.md` — role catalog for inspiration
- `references/runtime-config.md` — global vs per-agent config, MCP, subagents

Generate all files following the structure in `references/package-structure.md`.

**Quality bar:**
- `COMPANY.md` — proper YAML frontmatter with `schema: agentcompanies/v1`, version, goals
- `AGENTS.md` — specific to the business, not generic. Mentions actual systems and domains.
- `HEARTBEAT.md` — follows standard Paperclip heartbeat procedure with role-specific additions
- `SOUL.md` — two sections: strategic posture + voice and tone. Unique per agent.
- `TOOLS.md` — minimal scaffold, NOT pre-filled
- `runtime/settings.json` — follows exact `enabledPlugins` object format from role-plugin-matrix
- `runtime/mcp.json` — empty for most agents. Frontend/QA get Chrome DevTools.
- `.paperclip.yaml` — adapter config, budgets, env inputs. Only agents with overrides appear.
- `global/settings.json` — universal deny rules
- `global/plugins.json` — marketplace + all plugin installs needed by the company

### Phase 5: README and LICENSE

**README.md** — company description, org chart, how to import, citations
**LICENSE** — MIT default, or match source repo

### Phase 6: Summary

Present:
1. Files created with brief descriptions
2. Import instructions (GitHub import + global config setup)
3. Manual steps needed (credentials, domain, Docker compose)

## Importing Into Paperclip

The generated package imports via two paths:

**Spec-compliant files (via Paperclip import):**
- Push to GitHub, then import via UI or `POST /companies/import` with `source.type: "github"`
- Handles: COMPANY.md, agents (AGENTS.md + instruction bundles + runtime/ files), projects, tasks, skills, .paperclip.yaml

**Global config (manual setup):**
- Copy `global/` files into the Paperclip repo at `docker/init/claude/`
- Add to `docker/docker-compose.yml`: `- ./init/claude:/docker-init/claude:ro`
- Rebuild/restart container

## Rules

1. **Complete files** — no stubs or placeholders
2. **Business-specific** — every agent persona reflects the actual company
3. **Valid spec** — output must be a valid `agentcompanies/v1` package
4. **Confirm before generating** — align with user on org, goals, tasks first
5. **Working import** — package must be importable via Paperclip's system
