---
name: work-planning
description: >
  Design the complete work hierarchy for a Paperclip company — Goals, Projects,
  and Tasks as a unified top-down planning workflow. Produces ._planning.json
  for deterministic generation of goals/, projects/, and tasks/ directories.
  Use when creating a new company's work plan, reorganizing work structure,
  or linking goals to projects and tasks.
---

# Work Planning Skill

This skill designs the full work hierarchy for a Paperclip company following the Agent Companies specification (`agentcompanies/v1`). Work flows top-down: **Goal (Initiative) → Projects → Issues/Tasks → Sub-issues**.

Every piece of work in the company traces back to a goal. This skill produces a single `._planning.json` file consumed by `generate-plan.sh` to create all `goals/`, `projects/`, and `tasks/` directories deterministically.

## When to Use

- Creating a new company (called from `/company` Phases 2-3)
- Reorganizing or extending goals, projects, or tasks for an existing company
- Linking goals to projects and tasks
- User asks to "plan work", "define goals", "create projects", or "organize tasks"

## Step 1: Goal Design

Goals are the **strategic direction layer**. They define what success looks like.

### Goal Quality Bar

- **2-5 company goals** — fewer is better if they're precise
- Each goal must be **specific to this business** (not generic like "grow revenue")
- Goals must be **measurable or verifiable** (e.g., "Launch a public API with 3+ endpoints")
- Include a mix of product, growth, and operational goals

### Goal Fields

| Field | Required | Description |
|-------|----------|-------------|
| `slug` | Yes | Kebab-case, becomes folder name |
| `title` | Yes | The goal statement |
| `description` | Yes | Concrete deliverables or success criteria |
| `level` | No | `company`, `team`, `agent`, or `task` (auto-assigned by depth) |
| `status` | No | `planned`, `active`, `achieved`, `cancelled` (default: `active`) |
| `ownerAgentSlug` | Optional | Agent slug responsible for driving this goal (assigned after org design) |
| `projectSlugs` | Recommended | Projects that deliver on this goal |

### Building the Hierarchy

After confirming top-level goals, break each into subgoals:

1. **Subgoals** — 1-3 team-level workstreams per company goal. Every subgoal must include a `description`.
2. **Ownership** — can be deferred to an assignment step after org design. When assigning: company goals → C-level agents, subgoals → team leads or ICs.
3. **Project linkage** — connect each goal/subgoal to the projects that deliver on it.
4. **Depth** — 2 levels of nesting is usually enough. Max 4 levels.

**Checkpoint:** Present goals to the user and confirm before proceeding to Step 2.

## Step 2: Project Design

Projects group related work under a clear owner. Each project links to one or more goals.

### Project Scoping

| Scenario | Where it goes |
|----------|---------------|
| 3+ related tasks with shared theme and natural owner | **Project** — `projects/{slug}/` |
| One-off strategic directive from CEO | **Company-level task** — `tasks/` |
| Cross-cutting work spanning multiple domains | **Company-level task** — assigned to CEO |
| Ongoing operational work (reviews, reporting) | **Project task** with `recurring: true` — MUST be inside a project |

**Rule of thumb:** if 3+ tasks share a theme and a natural owner, they belong in a project.

### Project Fields

| Field | Required | Description |
|-------|----------|-------------|
| `slug` | Yes | Kebab-case, must match folder name |
| `name` | Yes | Human-readable project name |
| `description` | Yes | One-line summary of what the project delivers |
| `owner` | Optional | Agent slug of the project owner (assigned after org design) |

The project body should include `## Scope` and `## Success Criteria` sections.

### Scoping Guidelines

- 1-3 projects for a new company, more for larger orgs
- 3-8 tasks per project — fewer means too narrow, more means consider splitting
- Good names describe **outcomes** (`mvp-launch`, `api-v2`), not activities (`backend-work`)
- Every project slug must appear in at least one goal's `projectSlugs`

### Owner Selection

| Project Type | Typical Owner |
|-------------|---------------|
| Engineering / product build | CTO or lead engineer |
| Marketing campaign | CMO or content lead |
| Infrastructure / DevOps | CTO or DevOps engineer |
| Cross-functional initiative | CEO or PM |

## Step 3: Task Design

Tasks are the concrete work items. They live either under projects or at the company level.

### Task Ordering Convention

Tasks are imported in **alphabetical order by directory name**. IDs are assigned sequentially. To control import order, prefix task directory names with a two-digit number.

**Numbering must be globally unique across the entire company package.** Do not restart numbering per project — continue the sequence across all task locations:

```
projects/backend/tasks/
├── 01-setup-infrastructure/TASK.md
├── 02-build-auth/TASK.md
projects/frontend/tasks/
├── 03-design-ui/TASK.md
├── 04-build-components/TASK.md
tasks/
├── 05-strategic-review/TASK.md
├── 06-weekly-standup/TASK.md
```

Without numeric prefixes, tasks sort alphabetically by slug, which may not reflect intended execution order.

Note: `generate-plan.sh` assigns global ordering automatically — the `order` field in `._planning.json` is ignored. The script numbers tasks sequentially: all project tasks first (in project key order), then company-level tasks.

### Task Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Human-readable task name |
| `assignee` | Optional | Agent slug (assigned after org design, required before generation) |
| `project` | Yes (project tasks + all recurring tasks) | Parent project slug |
| `recurring` | No | `true` for ongoing work — task MUST be inside a project |

### Task Organization Rules

- Every project task lives at `projects/{project-slug}/tasks/{NN-task-slug}/TASK.md`
- Every project task has `project: {project-slug}` in frontmatter
- Company-level tasks live at `tasks/{NN-slug}/TASK.md` — one-off CEO strategic directives only
- **Recurring tasks MUST NEVER be company-level.** They must always live inside a project (`projects/{slug}/tasks/`). Recurring tasks become Routines, and Routines require a project. If no existing project fits, create a dedicated project (e.g. `operations`, `company-rituals`).
- Aim for **3-8 tasks per project**
- Task assignees can differ from the project owner
- Task slugs describe the deliverable (`setup-auth`, `build-landing-page`)
- All referenced `assignee` agent slugs must exist in `agents/`

## Step 4: Produce `._planning.json`

After the user confirms goals, projects, and tasks, write a `._planning.json` file in the company root with this structure:

```json
{
  "goals": [
    {
      "slug": "launch-mvp",
      "title": "Launch MVP web application",
      "description": "Ship a functional product users can sign up for and use daily",
      "level": "company",
      "status": "active",
      "ownerAgentSlug": "cto",
      "projectSlugs": ["mvp-backend", "mvp-frontend"],
      "subgoals": [
        {
          "slug": "build-auth-system",
          "title": "Build authentication and user management",
          "description": "Implement email/password and OAuth sign-up, session management, and RBAC",
          "level": "team",
          "ownerAgentSlug": "backend-engineer",
          "projectSlugs": ["mvp-backend"]
        }
      ]
    }
  ],
  "projects": [
    {
      "slug": "mvp-backend",
      "name": "MVP Backend",
      "description": "Backend API with auth, core workflow, and payment integration",
      "owner": "backend-engineer",
      "body": "## Scope\n\nBuild and deploy the backend API with:\n- User authentication (JWT)\n- Core business workflow endpoints\n- Stripe payment integration\n\n## Success Criteria\n\n- API deployed to production\n- All endpoints tested with 80%+ coverage"
    }
  ],
  "tasks": {
    "projects": {
      "mvp-backend": [
        {
          "slug": "setup-project",
          "name": "Set up FastAPI project structure",
          "assignee": "backend-engineer",
          "body": "Initialize the FastAPI project with directory structure, dependencies, and Docker setup.",
          "recurring": false
        },
        {
          "slug": "build-auth",
          "name": "Implement user authentication",
          "assignee": "backend-engineer",
          "body": "Implement JWT-based auth with email/password registration, login, and password reset.",
          "recurring": false
        },
        {
          "slug": "strategic-review",
          "name": "Weekly strategic review",
          "assignee": "ceo",
          "body": "Review company progress against goals. Check blocked tasks, reassign if needed.",
          "recurring": true
        }
      ]
    },
    "companyLevel": []
  }
}
```

Then run the generation script:
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/generate-plan.sh <company-root> <company-root>/._planning.json
```

This creates all `goals/`, `projects/`, and `tasks/` directories with proper frontmatter, ordering prefixes, and cross-references.

## Cross-Level Consistency Checks

Before producing `._planning.json`, verify:

- [ ] Every project slug appears in at least one goal's `projectSlugs`
- [ ] Every project task's `project` matches its parent project slug
- [ ] 2-5 top-level goals
- [ ] 3-8 tasks per project
- [ ] No duplicate slugs across goals, projects, or tasks

**Required before generation** (can be deferred during initial planning):
- [ ] Every goal's `ownerAgentSlug` exists in `agents/`
- [ ] Every task's `assignee` exists in `agents/`
- [ ] Every project's `owner` exists in `agents/`

## Common Planning Patterns

| Business Type | Goals | Projects | Task Examples |
|--------------|-------|----------|---------------|
| **SaaS MVP** | Launch product, acquire users, build pipeline | `mvp-launch`, `marketing-site`, `ci-cd-setup` | Auth, core features, landing page, CI pipeline |
| **E-commerce** | Launch store, scale inventory, payment flow | `storefront`, `inventory-system`, `payment-integration` | Product catalog, checkout, Stripe setup |
| **Content platform** | Launch CMS, grow audience, track metrics | `content-engine`, `distribution`, `analytics` | CMS setup, social posting, dashboard |
| **Agency** | Client portal, delivery pipeline, marketing | `client-portal`, `delivery-pipeline`, `marketing` | Project tracker, automation, outreach |
