---
name: update-readme
description: Create or update a professional root-level README.md for a repository. Use when creating a README, updating a README, generating a README, improving a README, making a professional README, crafting an open-source README, or adding badges, diagrams, and quick-start sections to a project's main README file.
---

# README Generation & Maintenance

Guide for creating and maintaining professional, comprehensive root-level `README.md` files for open-source and internal projects.

## When to Use

- Creating a new `README.md` for a repository
- Updating or improving an existing root-level README
- Making a project's README more professional or complete

## When NOT to Use

- For `docs/` folder structure and internal documentation → use `update-docs`
- For feature-specific documentation → use `update-docs`
- For architecture decision records → use `update-docs`

## Workflow

1. **Analyze the repository** — scan language, framework, project structure, purpose, existing docs
2. **Identify gaps** — compare current README (if any) against the standard sections below
3. **Generate/update** — produce a complete, professional README following the template

## README Sections Template

A professional open-source README should include these sections in order:

### 1. Title + Badges

```markdown
# Project Name

[![Build Status](badge-url)](link)
[![Version](badge-url)](link)
[![License](badge-url)](link)
[![Coverage](badge-url)](link)
```

Use [shields.io](https://shields.io) for consistent badge styling. Common badges: build/CI status, version/release, license, test coverage, downloads.

### 2. Description

One-liner describing what the project does, followed by a brief paragraph expanding on the value proposition.

```markdown
> A brief, compelling one-line description of what this project does.

Project Name does X by Y, enabling Z. It is designed for [target audience] who need [capability].
```

### 3. Key Features

Bullet list of the most important features. Keep to 5-8 items.

```markdown
## Features

- **Feature A** — short description
- **Feature B** — short description
- **Feature C** — short description
```

### 4. Architecture Overview

Always include at least one mermaid diagram showing the system architecture.

```markdown
## Architecture

<!-- Use graph-generation skill for complex visualizations -->

```mermaid
graph TD
    A[Client] --> B[API Gateway]
    B --> C[Service A]
    B --> D[Service B]
    C --> E[(Database)]
`` `
```

Common README diagrams:
- **System architecture** — C4 context or container diagram
- **Data flow** — how data moves through the system
- **Deployment overview** — infrastructure and deployment topology

Use the `graph-generation` skill for complex or multi-diagram visualizations.

### 5. Quick Start / Getting Started

Keep to 5 steps or fewer. Show the fastest path from zero to running.

```markdown
## Quick Start

### Prerequisites

- Node.js >= 18
- Docker (optional)

### Installation

`` `bash
git clone https://github.com/org/project.git
cd project
npm install
`` `

### Run

`` `bash
npm start
`` `
```

### 6. Usage / Examples

Show practical code snippets demonstrating common use cases.

```markdown
## Usage

`` `javascript
import { Project } from 'project-name';

const result = Project.doSomething({ option: 'value' });
console.log(result);
`` `
```

### 7. Configuration

Document environment variables, config files, and key settings.

```markdown
## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | Database connection string | — |
| `LOG_LEVEL` | Logging verbosity | `info` |
```

### 8. API Reference

Brief overview with link to full docs if extensive.

```markdown
## API Reference

See the [full API documentation](docs/api.md) for details.

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/items` | List all items |
| POST | `/api/v1/items` | Create an item |
```

### 9. Project Structure

Tree view of key directories to orient new contributors.

```markdown
## Project Structure

`` `
├── src/
│   ├── api/          # REST API routes
│   ├── services/     # Business logic
│   ├── models/       # Data models
│   └── utils/        # Shared utilities
├── tests/            # Test suites
├── docs/             # Documentation
└── scripts/          # Build and deploy scripts
`` `
```

### 10. Contributing

```markdown
## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
```

### 11. License

```markdown
## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
```

## Best Practices

1. **Lead with what the project does, not how** — readers need to know if this project is relevant before they care about implementation
2. **Keep Quick Start to <5 steps** — if it takes more, simplify or provide a one-line install
3. **Use badges for at-a-glance project health** — build status, coverage, and version tell contributors the project is maintained
4. **Include screenshots/GIFs for UI projects** — visual projects need visual documentation
5. **Keep it scannable** — use headers, bullets, and tables; avoid walls of text
6. **Link to detailed docs/ rather than duplicating** — the README is an entry point, not the full documentation
7. **Always include at least one architecture diagram** — mermaid diagrams render natively on GitHub
8. **Update the README when the project changes** — stale READMEs erode trust
9. **Test all code examples** — broken examples are worse than no examples
10. **Consider your audience** — write for someone seeing the project for the first time
