---
name: skill-creator
description: >
  Create properly structured SKILL.md files for Paperclip company agents.
  Ensures correct YAML frontmatter, Agent Skills spec compliance, and
  domain-specific content. Use when generating skills during company creation.
---

# Skill Creator

Create well-structured `SKILL.md` files that comply with the Agent Skills specification and work correctly in Paperclip company packages.

## When to Use

- During company generation (Phase 5) when creating custom skills for agents
- When an agent needs a new skill added to the company package
- When fixing or improving existing skills that are missing frontmatter or structure

## Skill File Structure

Every skill lives at `skills/<skill-slug>/SKILL.md` in the company package.

```
skills/
└── api-design/
    ├── SKILL.md              # Required — the skill definition
    ├── scripts/              # Optional — automation scripts
    ├── references/           # Optional — reference docs, templates
    └── assets/               # Optional — images, diagrams
```

## Required SKILL.md Format

Every SKILL.md MUST have YAML frontmatter with at minimum `name` and `description`:

```yaml
---
name: api-design
description: >
  REST API design conventions for the Figurio e-commerce platform.
  Covers endpoint naming, pagination, error responses, and authentication.
---

# API Design

[skill content here]
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Skill slug (matches directory name, kebab-case) |
| `description` | yes | 1-3 sentence description. Be specific — this is used for skill discovery and triggering. |
| `allowed-tools` | no | List of tools the skill may use (e.g., `Read`, `Grep`, `Bash`) |
| `metadata.paperclip.tags` | no | Tags for categorization (e.g., `engineering`, `review`) |
| `metadata.sources` | no | Attribution for referenced/vendored content |

### Description Guidelines

The `description` field is critical — it determines when the skill gets triggered and how agents discover it.

**Good descriptions** are specific and actionable:
```yaml
description: >
  REST API design conventions for the Figurio e-commerce platform.
  Covers endpoint naming, pagination, error responses, and authentication.
```

**Bad descriptions** are vague or generic:
```yaml
description: API design patterns  # Too vague — which API? what patterns?
```

## Content Guidelines

### Structure the Body

Use clear sections with headers. Common patterns:

```markdown
# Skill Title

## When to Use
[When should the agent invoke this skill?]

## Conventions / Rules / Process
[The actual guidance — this is the core of the skill]

## Examples
[Concrete examples showing the conventions applied]

## Anti-patterns
[What NOT to do — optional but valuable]
```

### Make It Specific

Skills must be specific to the company's domain, tech stack, and conventions — not generic boilerplate.

**Good** (specific to the company):
```markdown
## URL Structure

All Figurio API endpoints follow:
- `/api/v1/{resource}` for collections
- `/api/v1/{resource}/{id}` for single items
- Product endpoints: `/api/v1/products`, `/api/v1/products/{sku}`
- Order endpoints: `/api/v1/orders`, `/api/v1/orders/{orderId}`
```

**Bad** (generic boilerplate):
```markdown
## URL Structure

Use RESTful URL conventions with proper resource naming.
```

### Keep It Lean

- Target 50-200 lines for most skills
- Focus on "how we do this here" not general best practices
- Include only what the agent needs to follow the convention
- Skip obvious things — agents already know general programming patterns

## Complete Example

```yaml
---
name: api-design
description: >
  REST API design conventions for the Figurio e-commerce platform.
  Covers endpoint naming, pagination, error responses, and authentication.
---

# API Design

## When to Use

When designing or reviewing REST API endpoints for the Figurio backend (FastAPI).

## URL Conventions

- Base path: `/api/v1/`
- Collections: `/api/v1/{resource}` (plural nouns)
- Single item: `/api/v1/{resource}/{id}`
- Nested resources: `/api/v1/products/{sku}/reviews`
- Actions: `POST /api/v1/orders/{id}/cancel` (verb as last segment)

## Pagination

All list endpoints return paginated responses:

| Parameter | Default | Max |
|-----------|---------|-----|
| `page` | 1 | — |
| `per_page` | 20 | 100 |

Response envelope:
\```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 142,
    "total_pages": 8
  }
}
\```

## Error Format

All errors return:
\```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product with SKU 'XYZ' not found",
    "details": {}
  }
}
\```

Status codes:
- 400 — validation error
- 401 — missing or invalid auth
- 403 — insufficient permissions
- 404 — resource not found
- 409 — conflict (e.g., duplicate SKU)
- 422 — unprocessable entity
- 500 — internal error (never expose stack traces)

## Authentication

All endpoints require `Authorization: Bearer <token>` header.
Public endpoints (product catalog, health check) are explicitly marked in the router.
```

## Checklist

Before finalizing a skill, verify:

- [ ] YAML frontmatter with `name` and `description`
- [ ] `name` matches the directory name (kebab-case)
- [ ] `description` is specific (mentions the company/domain, not generic)
- [ ] Body has clear sections with headers
- [ ] Content is specific to the company, not generic boilerplate
- [ ] 50-200 lines (lean, not padded)
- [ ] No duplicate guidance already covered by another skill
