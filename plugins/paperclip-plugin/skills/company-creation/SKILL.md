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

### Phase 3: Goals

**This is mandatory — do not skip or defer goals to later.**

Goals are the **strategic direction layer** of a Paperclip company. They sit at the top of the work hierarchy: **Goal (Initiative) → Projects → Issues → Sub-issues**. Every piece of work in the company traces back to a goal.

In Paperclip, goals are first-class objects with:
- **Title** — the goal statement
- **Description** — optional context and success criteria
- **Level** — `company`, `team`, `agent`, or `task` (start with `company`-level goals)
- **Status** — `planned` → `active` → `achieved` or `cancelled`
- **Hierarchy** — goals can have parent goals, forming a tree
- **Ownership** — goals can be owned by a specific agent

In the company package, goals are defined as strings in COMPANY.md frontmatter. On import, Paperclip creates them as `company`-level goals with status `active`. After import, agents and managers can break them into sub-goals (team/agent level) through the API.

**Why goals matter:**
- They define what success looks like for the company
- Projects link to goals — showing which work contributes to which objective
- Issues inherit goalId from their project or parent issue, creating traceability
- Agents set `goalId` when creating subtasks, so all work rolls up to a strategic objective
- The CEO uses goals to prioritize and allocate work across the organization

Draft 2-5 company goals and present them to the user for confirmation before proceeding.

**Goal quality bar:**
- Each goal must be specific to this business (not generic like "grow revenue" or "build technology")
- Goals must be measurable or verifiable (e.g., "Launch a public API with 3+ endpoints" not "Build technology")
- Include a mix of product, growth, and operational goals
- 2 goals minimum, 5 maximum — fewer is better if they're precise

**Example goals for a SaaS company:**
```yaml
goals:
  - Launch MVP web application with user authentication and core workflow
  - Acquire first 100 beta users through content marketing and direct outreach
  - Establish CI/CD pipeline with automated testing achieving 80%+ code coverage
  - Generate first revenue through a paid tier within 90 days of launch
```

Ask: "Do these goals capture what success looks like for your company?"

**Do not proceed to Phase 4 until the user has confirmed or adjusted the goals.**

### Phase 4: Project & Task Definition

Propose:
1. Projects (1-3) — group related work under a clear owner (e.g., "mvp-launch", "marketing-engine", "infrastructure-setup")
2. Starter tasks per project (3-8 each) — placed under `projects/{slug}/tasks/` with `project` frontmatter
3. Company-level strategic tasks — cross-cutting CEO directives at top-level `tasks/`

**Task-project assignment:** every non-strategic task must belong to a project. Place tasks at `projects/{project-slug}/tasks/{task-slug}/TASK.md` and include `project: {project-slug}` in frontmatter. Only CEO-level cross-cutting directives belong at top-level `tasks/`. See the **project-design** skill for detailed guidance.

### Phase 5: Generate the Package

**Read the references first:**
- `references/package-structure.md` — the full folder structure and deployment paths
- `references/standard-roles.md` — role catalog for inspiration
- `references/runtime-config.md` — global vs per-agent config, MCP, subagents

Generate all files following the structure in `references/package-structure.md`.

**Quality bar:**
- `COMPANY.md` — proper YAML frontmatter with `schema: agentcompanies/v1`, version, goals (2-5 specific, measurable)
- `AGENTS.md` — specific to the business, not generic. Mentions actual systems and domains.
- `HEARTBEAT.md` — follows standard Paperclip heartbeat procedure with role-specific additions
- `SOUL.md` — two sections: strategic posture + voice and tone. Unique per agent.
- `TOOLS.md` — minimal scaffold, NOT pre-filled
- `PROJECT.md` — proper YAML frontmatter with name, description, slug, owner. At least one project per company.
- Tasks under projects — every non-strategic task lives at `projects/{slug}/tasks/{slug}/TASK.md` with `project` and `assignee` frontmatter. See the **project-design** skill for detailed guidance.
- `runtime/settings.json` — follows exact `enabledPlugins` object format from role-plugin-matrix
- `runtime/mcp.json` — empty for most agents. Frontend/QA get Chrome DevTools.
- `.paperclip.yaml` — adapter config, budgets, env inputs. Only agents with overrides appear.
- `global/settings.json` — universal deny rules
- `global/plugins.json` — marketplace + all plugin installs needed by the company

### Phase 6: README and LICENSE

**README.md** — company description, org chart, how to import, citations
**LICENSE** — MIT default, or match source repo

### Phase 7: Summary

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
4. **Goals are mandatory** — every company must have 2-5 specific, measurable goals in COMPANY.md frontmatter. Never generate a company without goals. Confirm goals with the user before generating files.
5. **Tasks belong to projects** — every non-strategic task must be placed under `projects/{slug}/tasks/` with `project` frontmatter. Only cross-cutting CEO directives go at top-level `tasks/`.
6. **Confirm before generating** — align with user on org, goals, projects, and tasks first
7. **Working import** — package must be importable via Paperclip's system
