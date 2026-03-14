---
name: update-docs
description: Update and maintain project documentation structure. Use when updating project docs, maintaining docs folder structure, organizing documentation, creating or updating architecture decision records (ADRs), documenting features, maintaining a documentation index, syncing docs with code changes, or restructuring docs/ folder. Covers docs-as-code practices, folder conventions, and documentation templates. NOT for root README.md — use update-readme for that.
---

# Documentation Management

Guidance for maintaining high-quality, up-to-date project documentation organized by architecture and features.

## Docs Folder Structure

Every project should maintain a unified `docs/` folder at the repository root:

```
docs/
├── README.md                    # Documentation index and navigation
├── architecture/
│   ├── README.md                # Architecture overview with system diagram
│   ├── system-overview.md       # High-level system design
│   ├── data-flow.md             # Data flow and pipeline documentation
│   ├── infrastructure.md        # Deployment and infrastructure
│   ├── security.md              # Security architecture
│   └── decisions/               # Architecture Decision Records
│       ├── README.md            # ADR index
│       ├── 001-database-choice.md
│       └── 002-auth-strategy.md
├── features/
│   ├── README.md                # Feature index
│   ├── feature-name/
│   │   ├── README.md            # Feature overview
│   │   ├── design.md            # Technical design
│   │   ├── api.md               # API documentation (if applicable)
│   │   └── changelog.md         # Feature change history
│   └── another-feature/
└── guides/
    ├── getting-started.md       # Onboarding guide
    ├── development.md           # Development workflow
    └── deployment.md            # Deployment procedures
```

## Documentation Index (docs/README.md)

The docs index serves as the entry point. It should contain:

```markdown
# Project Documentation

## Architecture
- [System Overview](architecture/system-overview.md) — high-level design and component relationships
- [Data Flow](architecture/data-flow.md) — how data moves through the system
- [Infrastructure](architecture/infrastructure.md) — deployment topology and cloud resources
- [Security](architecture/security.md) — authentication, authorization, and security controls
- [Architecture Decisions](architecture/decisions/README.md) — ADR log

## Features
- [Feature Name](features/feature-name/README.md) — description
- [Another Feature](features/another-feature/README.md) — description

## Guides
- [Getting Started](guides/getting-started.md) — setup and onboarding
- [Development](guides/development.md) — workflow and conventions
- [Deployment](guides/deployment.md) — how to deploy
```

## Architecture Documentation

### System Overview Template

```markdown
# System Overview

## Context

Brief description of what the system does and why it exists.

## System Diagram

<!-- Use mermaid for all diagrams -->

## Components

| Component | Responsibility | Technology | Owner |
|-----------|---------------|------------|-------|
| API Gateway | Request routing, auth | Traefik | Platform |
| Backend API | Business logic | Go/Python | Backend |
| Database | Persistence | PostgreSQL | Platform |

## Key Design Decisions

- **Decision**: Why this choice was made
- **Trade-offs**: What was gained vs. sacrificed

## Dependencies

### External Services
- Service A — purpose, SLA
- Service B — purpose, SLA

### Internal Dependencies
- Shared library X — version, purpose
```

### Architecture Decision Record (ADR) Template

```markdown
# ADR-NNN: Title

## Status
Accepted | Proposed | Deprecated | Superseded by ADR-NNN

## Date
YYYY-MM-DD

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult to do because of this change?

## Alternatives Considered
What other options were evaluated and why were they rejected?
```

## Feature Documentation

### Feature README Template

```markdown
# Feature: Feature Name

## Overview
One-paragraph description of what this feature does and why it exists.

## Architecture

<!-- Mermaid diagram showing the feature's components and interactions -->

## User Stories
- As a [role], I want [capability] so that [benefit]

## Technical Design

### Data Model
Relevant data structures and database changes.

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/resource | List resources |
| POST | /api/v1/resource | Create resource |

### Configuration
Environment variables or config values this feature introduces.

## Testing
How to test this feature — key scenarios and edge cases.

## Changelog
| Date | Change | PR |
|------|--------|----|
| YYYY-MM-DD | Initial implementation | #123 |
```

## Keeping Docs Up to Date

### When to update documentation

1. **New feature** — create `docs/features/<feature-name>/README.md` with design and API docs
2. **Architecture change** — update relevant architecture doc, create ADR if significant
3. **API change** — update feature's `api.md`
4. **Infrastructure change** — update `architecture/infrastructure.md`
5. **Breaking change** — update all affected docs, add changelog entry

### Documentation review checklist

- [ ] Does the docs index link to this new/changed doc?
- [ ] Are all diagrams up to date (use mermaid)?
- [ ] Are code examples accurate and tested?
- [ ] Is the feature changelog updated?
- [ ] Are ADRs created for significant decisions?
- [ ] Are deprecated features marked as such?

### Staleness detection

Signs that documentation is stale:
- References to removed files, functions, or endpoints
- Code examples that don't compile/run
- Architecture diagrams that don't match the deployed system
- Missing features that were added after the doc was written

## Writing Guidelines

1. **Lead with why** — explain motivation before implementation details
2. **Use diagrams** — a mermaid diagram is worth a thousand words
3. **Keep it scannable** — use headers, tables, and bullet points
4. **Link, don't duplicate** — reference other docs instead of copying content
5. **Date significant entries** — ADRs, changelogs, and decisions need dates
6. **Use concrete examples** — show actual commands, API calls, config snippets
7. **Mark assumptions** — explicitly state what the reader should already know
