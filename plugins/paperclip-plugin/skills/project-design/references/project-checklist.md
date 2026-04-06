# Project Design Checklist

Quick-reference for creating projects in an Agent Companies package.

## PROJECT.md Frontmatter

| Field | Required | Format | Example |
|-------|----------|--------|---------|
| `name` | Yes | Human-readable | `MVP Launch` |
| `description` | Yes | One-line summary | `Ship the MVP with auth, core workflow, and payments` |
| `slug` | Yes | Kebab-case, matches folder | `mvp-launch` |
| `owner` | Recommended | Agent slug | `cto` |

## TASK.md Frontmatter (within projects)

| Field | Required | Format | Example |
|-------|----------|--------|---------|
| `name` | Yes | Human-readable | `Set up user authentication` |
| `assignee` | Yes | Agent slug | `backend-engineer` |
| `project` | Yes | Project slug | `mvp-launch` |
| `recurring` | No | Boolean | `true` |

## Naming Conventions

- **Slugs**: kebab-case, descriptive of outcome (`api-v2`, not `backend-work`)
- **Folder names**: must match slugs exactly
- **Task slugs**: describe the deliverable (`setup-auth`, `build-landing-page`)

## Validation Checklist

- [ ] Project slug matches folder name
- [ ] PROJECT.md has `name`, `description`, `slug`
- [ ] Owner agent slug exists in `agents/`
- [ ] Every task placed at `projects/{project-slug}/tasks/{task-slug}/TASK.md`
- [ ] Every task has `project: {project-slug}` in frontmatter
- [ ] Every task has `assignee: {agent-slug}` in frontmatter
- [ ] All referenced agent slugs exist in `agents/`
- [ ] 3-8 tasks per project
- [ ] No duplicate slugs across projects

## Common Project Patterns

**SaaS / Web App**
- `mvp-launch` (owner: cto) — core product build
- `marketing-site` (owner: cmo) — landing page, content, SEO
- `ci-cd-setup` (owner: cto or devops) — pipeline, testing, deployment

**E-commerce**
- `storefront` (owner: cto) — catalog, search, checkout
- `inventory-system` (owner: backend-engineer) — stock, fulfillment
- `payment-integration` (owner: backend-engineer) — Stripe, invoicing

**Content / Media**
- `content-engine` (owner: cmo) — CMS, editorial workflow
- `distribution` (owner: cmo) — social, email, syndication
- `analytics-dashboard` (owner: cto) — tracking, reporting

**Agency / Professional Services**
- `client-portal` (owner: cto) — project tracker, client access
- `delivery-pipeline` (owner: cto) — automation, templates
- `marketing` (owner: cmo) — outreach, portfolio site
