# Work Planning Checklist

Quick-reference for creating goals, projects, and tasks in an Agent Companies package.

## Goals

- [ ] 2-5 top-level goals
- [ ] Each goal has `slug` and `title`
- [ ] Each goal has `description` with success criteria
- [ ] `ownerAgentSlug` references exist in `agents/`
- [ ] `projectSlugs` references exist in `projects/`
- [ ] Max 4 levels of subgoal nesting
- [ ] Goals are specific and measurable (not generic)

## PROJECT.md Frontmatter

| Field | Required | Format | Example |
|-------|----------|--------|---------|
| `name` | Yes | Human-readable | `MVP Launch` |
| `description` | Yes | One-line summary | `Ship the MVP with auth and payments` |
| `slug` | Yes | Kebab-case, matches folder | `mvp-launch` |
| `owner` | Recommended | Agent slug | `cto` |

## TASK.md Frontmatter

| Field | Required | Format | Example |
|-------|----------|--------|---------|
| `name` | Yes | Human-readable | `Set up user authentication` |
| `assignee` | Yes | Agent slug | `backend-engineer` |
| `project` | Yes (all project tasks + all recurring tasks) | Project slug | `mvp-launch` |
| `recurring` | No | Boolean | `true` |

## Task Ordering

Numbering must be **globally unique** across the entire package. Do not restart per project:

```
projects/backend/tasks/
├── 01-setup-infra/TASK.md
├── 02-build-auth/TASK.md
projects/frontend/tasks/
├── 03-design-ui/TASK.md
├── 04-build-components/TASK.md
tasks/
├── 05-strategic-review/TASK.md
```

`generate-plan.sh` assigns global numbers automatically.

## Cross-Level Validation

- [ ] Every project slug appears in at least one goal's `projectSlugs`
- [ ] Every task's `assignee` exists in `agents/`
- [ ] Every project task has `project: {project-slug}` in frontmatter
- [ ] Task `project` values match parent project slug
- [ ] 3-8 tasks per project
- [ ] No duplicate slugs across goals, projects, or tasks
- [ ] Task numbers are globally unique (no duplicates across projects)
- [ ] **No recurring tasks in `companyLevel`** — recurring tasks must be inside a project

## Naming Conventions

- **Slugs**: kebab-case, descriptive of outcome (`api-v2`, not `backend-work`)
- **Folder names**: must match slugs exactly
- **Task prefixes**: two-digit order (`01-setup-auth`, `02-build-api`)

## Common Patterns

| Type | Projects | Example Tasks |
|------|----------|---------------|
| **SaaS MVP** | `mvp-launch`, `marketing-site`, `ci-cd-setup` | Auth, core features, landing page |
| **E-commerce** | `storefront`, `inventory-system`, `payment-integration` | Catalog, checkout, Stripe |
| **Content** | `content-engine`, `distribution`, `analytics` | CMS, social posting, dashboard |
| **Agency** | `client-portal`, `delivery-pipeline`, `marketing` | Tracker, automation, outreach |
