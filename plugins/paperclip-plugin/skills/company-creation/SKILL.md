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
- Required software (Slack, Google Workspace, Stripe?) — if Google Workspace, ask for the company domain used for GWS (e.g. `figurio.cellarwood.org`)
- Infrastructure (existing or from scratch?)
- Logistics (physical products?)
- Agent-specific settings — ask about per-agent configuration values such as:
  - Email addresses **only for GWS-eligible roles** (CEO, CMO, COO, HeadOfOperations, Content Creator, Marketing Specialist, Product Manager, Customer Support — see `role-plugin-matrix.md`). Engineers, designers, QA, and other technical roles do NOT need email addresses.
  - Company domain for GWS agent communication
  - Any role-specific settings (e.g., Slack channels, notification preferences)

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

In the company package, goals can be defined in two ways:
1. **Simple:** as strings in COMPANY.md frontmatter (creates flat company-level goals)
2. **Rich (recommended):** in a separate GOALS.md file with full hierarchy, ownership, and project linkage

When generating a company package, prefer creating a GOALS.md file with nested subgoals, agent ownership (`ownerAgentSlug`), and project linkage (`projectSlugs`). Keep simple goal strings in COMPANY.md as well for backward compatibility.

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

**Building the goal hierarchy:**

After the user confirms the top-level goals, break each company goal into subgoals and connect them to agents and projects:

1. **Subgoals** — each company goal should have 1-3 team-level subgoals that represent the concrete workstreams needed to achieve it. Subgoals can nest further (team → agent → task), but keep it practical — 2 levels of nesting is usually enough. Every subgoal must include a `description` field explaining the concrete deliverables or success criteria, just like top-level goals.
2. **Level (`level`)** — set the scope of each goal. Values: `company` (strategic objectives), `team` (team-level workstreams), `agent` (individual agent responsibilities), `task` (specific deliverables). If omitted, auto-assigned by nesting depth.
3. **Status (`status`)** — set the current state of each goal. Values: `planned` (not yet started), `active` (in progress), `achieved` (completed successfully), `cancelled` (no longer relevant). Defaults to `active` if omitted.
4. **Ownership (`ownerAgentSlug`)** — assign each goal to the agent most responsible for driving it. Company goals typically belong to C-level agents (CEO, CTO, CMO). Subgoals belong to the team leads or ICs doing the work. Use the agent slug from the `agents/` directory.
5. **Project linkage (`projectSlugs`)** — connect each goal (or subgoal) to the projects that deliver on it. Use the project slug from the `projects/` directory. A goal can link to multiple projects, and a project can be linked from multiple goals.

**Example GOALS.md for a SaaS company:**
```yaml
goals:
  - slug: launch-mvp
    title: Launch MVP web application with user authentication and core workflow
    description: Ship a functional product that users can sign up for and use daily
    level: company
    status: active
    ownerAgentSlug: cto
    projectSlugs: [mvp-backend, mvp-frontend]
    subgoals:
      - slug: build-auth-system
        title: Build authentication and user management
        description: Implement email/password and OAuth sign-up, session management, and role-based access control
        level: team
        ownerAgentSlug: backend-engineer
        projectSlugs: [mvp-backend]
      - slug: build-core-ui
        title: Build core UI and onboarding flow
        description: Build the main dashboard, onboarding wizard, and core workflow screens with responsive design
        level: team
        ownerAgentSlug: frontend-engineer
        projectSlugs: [mvp-frontend]
  - slug: acquire-beta-users
    title: Acquire first 100 beta users through content marketing and direct outreach
    description: Drive sign-ups through SEO-optimized blog content, targeted outreach, and community engagement
    level: company
    status: active
    ownerAgentSlug: cmo
    projectSlugs: [growth-marketing]
    subgoals:
      - slug: launch-blog
        title: Launch company blog with 5 seed articles
        description: Publish 5 high-quality articles targeting key pain points, with SEO optimization and social sharing
        level: team
        ownerAgentSlug: content-writer
        projectSlugs: [growth-marketing]
      - slug: run-outreach
        title: Run direct outreach campaign to 500 prospects
        description: Identify 500 ideal-profile prospects, craft personalized sequences, and track conversion to sign-ups
        level: team
        ownerAgentSlug: cmo
  - slug: establish-cicd
    title: Establish CI/CD pipeline with automated testing achieving 80%+ code coverage
    level: company
    status: active
    ownerAgentSlug: devops-engineer
    projectSlugs: [infrastructure]
  - slug: first-revenue
    title: Generate first revenue through a paid tier within 90 days of launch
    level: company
    status: active
    ownerAgentSlug: ceo
```

Also keep simple goal strings in COMPANY.md for backward compatibility:
```yaml
goals:
  - Launch MVP web application with user authentication and core workflow
  - Acquire first 100 beta users through content marketing and direct outreach
  - Establish CI/CD pipeline with automated testing achieving 80%+ code coverage
  - Generate first revenue through a paid tier within 90 days of launch
```

Ask: "Do these goals capture what success looks like for your company? I'll also break them into subgoals with ownership and project connections."

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
- The **skill-creator** skill — follow it when generating any `SKILL.md` files (required frontmatter, structure, content guidelines)

Generate all files following the structure in `references/package-structure.md`.

**Environment variable setup:**

Copy `references/setup-secrets-template.sh` to `scripts/setup-secrets.sh` in the generated package. Then customize it:
1. Remove secret variables the company doesn't need (e.g., remove `STRIPE_SECRET_KEY` if no Stripe integration)
2. Keep only the secrets required by the company's plugins and infrastructure — use the **"Environment Variables by Plugin"** section in `references/role-plugin-matrix.md` (in the agent-design skill) to determine which secrets are needed
3. The user fills in `COMPANY_ID`, `AUTH_TOKEN`, and actual secret values after import, then runs the script

**Per-agent env configuration:**

For each agent, include an `env` section in `runtime/settings.json` with agent-specific plain values collected during Phase 1. These are deployed at import time — no API call needed.

**Google Workspace env vars (`AGENT_EMAIL`, `COMPANY_DOMAIN`, `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE`) are a bundle — set ALL THREE together, and ONLY for GWS-eligible roles** (CEO, CMO, COO, HeadOfOperations, Content Creator, Marketing Specialist, Product Manager, Customer Support). See `role-plugin-matrix.md` for the authoritative list. Agents that are NOT in this list (engineers, designers, QA, etc.) must NOT have any of these three env vars.

Example `runtime/settings.json` for a GWS-eligible agent:
```json
{
  "enabledPlugins": {
    "dev-tools-plugin@claude-my-marketplace": true
  },
  "env": {
    "AGENT_EMAIL": "cto@figurio.com",
    "COMPANY_DOMAIN": "figurio.cellarwood.org",
    "GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE": "/paperclip/.gws/figurio.json"
  }
}
```

Example `runtime/settings.json` for a non-GWS agent (e.g., engineer):
```json
{
  "enabledPlugins": {
    "dev-tools-plugin@claude-my-marketplace": true
  }
}
```

**Google Workspace setup (if the company uses GWS):**

Two things are needed for GWS-eligible agents:

1. **Import GWS skills** — during package generation, run the import script to populate the company's `skills/` directory with all individual GWS skills:
   ```bash
   bash paperclip-plugin/skills/gws-cli/scripts/import-gws-skills.sh <company-root>
   ```
   This imports all GWS skills (`gws-gmail`, `gws-calendar`, `persona-exec-assistant`, etc.) from the [GWS CLI repo](https://github.com/googleworkspace/cli) into the company's `skills/` directory.

2. **Agent frontmatter** — add the role-specific GWS skills to each GWS-eligible agent's `skills:` array. See the **"Role → GWS Skills Mapping"** table in `role-plugin-matrix.md` for which skills each role needs.

3. **Agent instructions** — add a "Google Workspace" section in each GWS-eligible agent's AGENTS.md body. See `role-plugin-matrix.md` for the example.

**Quality bar:**
- `COMPANY.md` — proper YAML frontmatter with `schema: agentcompanies/v1`, version, goals (2-5 specific, measurable)
- `AGENTS.md` — specific to the business, not generic. Mentions actual systems and domains.
- `HEARTBEAT.md` — follows standard Paperclip heartbeat procedure with role-specific additions
- `SOUL.md` — two sections: strategic posture + voice and tone. Unique per agent.
- `TOOLS.md` — pre-filled with plugin capabilities, MCP servers, and role-specific usage guidelines
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
2. Step-by-step deployment instructions (see "Importing Into Paperclip" below)

## Importing Into Paperclip

The generated README.md must present these steps **in this exact order**:

### Before `docker compose up`

**Step 1: Global Config**
- Copy `global/settings.json` to `.company/claude/settings.json` in the Paperclip repo root
- Copy `global/plugins.json` to `.company/claude/plugins.json` in the Paperclip repo root

**Step 2: Google Workspace credentials** (if the company uses GWS)
- Place the service account JSON at `.company/gws/<company-slug>.json` in the Paperclip repo root

**Step 3: Start Paperclip**
```bash
cd docker && docker compose up -d
```

### After Paperclip is running

**Step 4: Company Import**
- Push the company package to GitHub
- Import via Paperclip UI or API:
  ```bash
  curl -X POST http://localhost:3100/api/companies/import \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"source": {"type": "github", "url": "https://github.com/<org>/<company-slug>"}, "target": {"mode": "new_company"}}'
  ```

**Step 5: Secrets**
- Fill in `COMPANY_ID`, `AUTH_TOKEN`, and secret values in `scripts/setup-secrets.sh`
- Run: `bash scripts/setup-secrets.sh`

## Rules

1. **Complete files** — no stubs or placeholders
2. **Business-specific** — every agent persona reflects the actual company
3. **Valid spec** — output must be a valid `agentcompanies/v1` package
4. **Goals are mandatory** — every company must have 2-5 specific, measurable goals in COMPANY.md frontmatter. Never generate a company without goals. Confirm goals with the user before generating files.
5. **Tasks belong to projects** — every non-strategic task must be placed under `projects/{slug}/tasks/` with `project` frontmatter. Only cross-cutting CEO directives go at top-level `tasks/`.
6. **Confirm before generating** — align with user on org, goals, projects, and tasks first
7. **Working import** — package must be importable via Paperclip's system
