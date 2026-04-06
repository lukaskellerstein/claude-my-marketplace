---
name: project-design
description: >
  Design and organize Paperclip projects following the Agent Companies spec —
  PROJECT.md with YAML frontmatter, task organization within projects, owner
  assignment, and workspace configuration. Use when creating a new project,
  reorganizing tasks into projects, or deciding how to scope work across agents.
---

# Project Design Skill

This skill helps design projects for the Paperclip platform following the Agent Companies specification (`agentcompanies/v1`). Projects group related starter tasks under a clear owner and scope.

## When to Use

- Creating a new project for an existing or new company
- Deciding whether work belongs in a project or as company-level tasks
- Reorganizing existing tasks into project groupings
- Assigning project ownership to an agent
- User asks to "create a project", "organize tasks", or "scope work"

## Project vs Company-Level Tasks

Not all tasks belong in a project. Use this decision guide:

| Scenario | Where it goes |
|----------|---------------|
| 3+ related tasks with a shared theme and natural owner | **Project** — `projects/{slug}/tasks/` |
| One-off strategic directive from CEO | **Company-level** — `tasks/{slug}/TASK.md` |
| Cross-cutting work that spans multiple domains | **Company-level** — assigned to CEO |
| Cohesive deliverable with clear completion criteria | **Project** |
| Ongoing operational work (reviews, reporting) | **Company-level** with `recurring: true` |

**Rule of thumb:** if 3+ tasks share a theme and a natural owner agent, they belong in a project.

## Project File Layout

Every project lives at `projects/{project-slug}/`:

```
projects/{project-slug}/
├── PROJECT.md                  # Project definition (mandatory)
└── tasks/
    └── {task-slug}/
        └── TASK.md             # Starter task within the project
```

Project slugs are kebab-case (e.g., `mvp-launch`, `api-v2`, `marketing-website`).

## Design Process

### Step 1: Scope the Project

Define clear boundaries for what the project delivers:

- A project should represent a **cohesive deliverable or initiative** (e.g., "Q2 Launch", "API v2", "Marketing Website")
- Too broad: "Everything" or "All Engineering" — this is the company, not a project
- Too narrow: a single task — just use a company-level task instead
- A well-scoped project has 3-8 starter tasks and a clear definition of done

**Good project names** describe outcomes, not activities:

| Good | Bad |
|------|-----|
| `mvp-launch` | `backend-work` |
| `api-v2` | `coding-tasks` |
| `marketing-website` | `marketing-stuff` |
| `ci-cd-pipeline` | `devops` |
| `customer-onboarding` | `frontend` |

### Step 2: Write PROJECT.md

The mandatory definition file with YAML frontmatter:

```yaml
---
name: MVP Launch
description: Ship the minimum viable product with user auth, core workflow, and payment integration
slug: mvp-launch
owner: cto
---

## Scope

Build and deploy the initial product with these capabilities:
- User registration and authentication
- Core business workflow (describe specifics)
- Stripe payment integration for the paid tier

## Success Criteria

- Product deployed to production
- End-to-end user flow working (sign up → use → pay)
- Automated test suite with 80%+ coverage
```

**Frontmatter fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Human-readable project name |
| `description` | Yes | One-line summary of what the project delivers |
| `slug` | Yes | Kebab-case identifier, must match folder name |
| `owner` | No | Agent slug of the project owner (recommended) |

The body contains a markdown description with scope, context, and success criteria.

### Step 3: Assign Owner

The owner is the agent primarily responsible for driving the project forward. The owner does not need to do all the work — tasks within the project can be assigned to different agents.

**Owner selection guidelines:**

| Project Type | Typical Owner | Why |
|-------------|---------------|-----|
| Engineering / product build | CTO or lead engineer | Technical decision authority |
| Marketing campaign | CMO or content lead | Brand and messaging authority |
| Infrastructure / DevOps | CTO or DevOps engineer | System architecture authority |
| Cross-functional initiative | CEO or PM | Cross-team coordination |
| Design / UX overhaul | Designer or PM | User experience authority |

- Reference agent slugs from the company's `agents/` directory
- If no clear owner exists, assign to CEO — they can delegate later
- One agent can own multiple projects, but review whether they're overloaded

### Step 4: Organize Tasks

Each task within a project must satisfy **two requirements**:

1. **Folder placement** — lives at `projects/{project-slug}/tasks/{task-slug}/TASK.md`
2. **Frontmatter field** — includes `project: {project-slug}` in the YAML frontmatter

```yaml
---
name: Set up user authentication
assignee: backend-engineer
project: mvp-launch
---

Implement user registration and login using JWT tokens.

- Email/password registration with validation
- Login endpoint returning JWT access + refresh tokens
- Password reset flow via email
- Rate limiting on auth endpoints
```

**Task organization rules:**

- Every task must have both `assignee` and `project` in frontmatter
- Task assignees can differ from the project owner
- Aim for **3-8 tasks per project** — fewer means the project may be too narrow, more means consider splitting
- Use `recurring: true` for ongoing tasks (e.g., weekly reviews)
- Task slugs are kebab-case and should describe the deliverable

### Step 5: Workspace Configuration

Workspace configuration (working directory, GitHub repo) is a **Paperclip runtime concept**, not a package-level setting. The package defines the project structure and seed tasks; workspace config is set after import.

**In the package:** document the intended repo or working directory in the PROJECT.md body text if relevant:

```markdown
## Workspace

This project targets the main application repository at `github.com/company/app`.
```

**After import via Paperclip API:**

```
POST /api/companies/{companyId}/projects        # create with workspace
POST /api/projects/{projectId}/workspaces       # add workspace later
```

Workspace fields:
- `cwd` — local working directory path
- `repoUrl` — GitHub repository URL
- Provide at least one; include both when local and remote should both be tracked

### Step 6: Review and Validate

Before finalizing, check against the `references/project-checklist.md` or verify manually:

- [ ] Project slug matches folder name (kebab-case)
- [ ] PROJECT.md has all required frontmatter (name, description, slug)
- [ ] Owner agent exists in `agents/` directory
- [ ] Every task has `project` and `assignee` in frontmatter
- [ ] Task `project` values match the parent project slug
- [ ] Task assignee agents exist in `agents/` directory
- [ ] 3-8 tasks per project (review scope if outside this range)
- [ ] Project name describes an outcome, not an activity
- [ ] No duplicate slugs across projects

## Common Project Patterns

| Pattern | Projects | Example Tasks |
|---------|----------|---------------|
| **SaaS MVP** | `mvp-launch`, `marketing-site`, `ci-cd-setup` | Auth, core features, landing page, CI pipeline |
| **E-commerce** | `storefront`, `inventory-system`, `payment-integration` | Product catalog, checkout flow, Stripe setup |
| **Content platform** | `content-engine`, `distribution`, `analytics` | CMS setup, social posting, tracking dashboard |
| **Agency / services** | `client-portal`, `delivery-pipeline`, `marketing` | Project tracker, automation, outreach |

## Leveraging Other Skills

When designing projects, these skills provide complementary guidance:

- **company-creation** — the full package generation workflow that includes project creation
- **agent-design** — designing the agents who will own and work on projects
- **infrastructure-planning** — infrastructure projects (CI/CD, deployment, monitoring)
