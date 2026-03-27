---
name: update-docs
description: >
  Create or update project documentation. If no docs/ folder exists, creates comprehensive
  documentation from scratch using multiple parallel agents covering architecture, infrastructure,
  security, tech stack, and features. If docs/ already exists, re-analyzes the codebase and
  updates all sections EXCEPT docs/features/ (use update-feature-docs for feature documentation).

  <example>
  Context: User wants to create documentation for a project
  user: "create documentation for this project"
  </example>

  <example>
  Context: User wants to update existing docs
  user: "/update-docs"
  </example>

  <example>
  Context: Project has no docs
  user: "this project has no docs, can you write them?"
  </example>

  <example>
  Context: User wants to refresh docs after changes
  user: "update the project documentation"
  </example>

  <example>
  Context: User wants comprehensive documentation
  user: "document this entire codebase"
  </example>
---

# Create or Update Project Documentation

Create comprehensive project documentation from scratch, or update existing documentation to reflect the current state of the codebase. Orchestrates multiple parallel agents to analyze different aspects of the project.

## Mode Detection

Check if `docs/` exists at the repository root:

- **No `docs/` folder** → **Create mode**: generate everything from scratch
- **`docs/` folder exists** → **Update mode**: re-analyze the codebase and update all sections **except** `docs/features/` (feature docs are managed by `/update-feature-docs`)

## Target Structure

```
docs/
├── README.md                           # Documentation index and navigation
├── architecture/
│   ├── README.md                       # Architecture overview with C4 diagrams
│   └── decisions/
│       └── README.md                   # ADR index
├── infrastructure/
│   └── README.md                       # Deployment, CI/CD, environments
├── security/
│   └── README.md                       # Security architecture and controls
├── tech-stack/
│   └── README.md                       # Languages, frameworks, dependencies
├── features/
│   └── README.md                       # Feature index (create-mode only)
└── guides/
    └── README.md                       # Getting started and development guides
```

## Workflow

### Step 1: Quick Codebase Scan

Before launching agents, do a quick scan to understand the project:
- Check if `docs/` exists and what's already documented
- Identify the primary language(s) and framework(s)
- List top-level directories and key config files
- Check for infrastructure files (Dockerfile, docker-compose, Terraform, k8s manifests, CI configs)
- Check for security-related files (auth configs, .env.example, security policies)

Determine the mode: **Create** or **Update**.

### Step 2: Launch Parallel Agents

Launch **agents in parallel** using the Agent tool. In **Create mode**, launch all 5 agents. In **Update mode**, launch agents 1-4 only (skip Features Analyst — features are managed separately).

Each agent prompt below should include the mode context. In Update mode, tell each agent to read the existing doc first and update it to reflect the current codebase state.

#### Agent 1: Architecture Analyst
```
Analyze the codebase architecture and [create|update] docs/architecture/README.md.

[UPDATE MODE: Read the existing docs/architecture/README.md first. Preserve any
manually-added content, ADR references, and custom sections. Update diagrams,
component tables, and descriptions to reflect the current codebase.]

Include:
- System overview (what the project does, why it exists)
- Mermaid C4 Context diagram (system boundary, users, external dependencies)
- Mermaid C4 Container diagram (internal services, databases, queues, storage)
- Component table: each service/module, its responsibility, and technology
- Key design patterns used (MVC, microservices, event-driven, etc.)
- Data flow description (how data moves through the system)
- Internal and external dependencies

Also [create|update] docs/architecture/decisions/README.md as an ADR index with template instructions.

IMPORTANT: Base everything on actual code analysis. Use mermaid for ALL diagrams.
```

#### Agent 2: Infrastructure Analyst
```
Analyze the project's infrastructure and deployment setup and [create|update] docs/infrastructure/README.md.

[UPDATE MODE: Read the existing docs/infrastructure/README.md first. Preserve any
manually-added deployment notes, environment-specific details, and custom sections.
Update to reflect current infrastructure files.]

Include:
- Deployment topology (where and how the app runs)
- CI/CD pipeline description (GitHub Actions, GitLab CI, etc.)
- Environment breakdown (dev, staging, production)
- Container setup (Dockerfile analysis, docker-compose services)
- Cloud resources (if identifiable from IaC files: Terraform, CDK, CloudFormation, Pulumi)
- Monitoring and observability setup (logging, metrics, alerts)
- Database and storage infrastructure
- Networking (load balancers, CDN, DNS if visible)
- How to deploy (step-by-step)

If no infrastructure files exist, document what's known and note what's missing.

IMPORTANT: Base everything on actual files found in the repo.
```

#### Agent 3: Security Analyst
```
Analyze the project's security posture and [create|update] docs/security/README.md.

[UPDATE MODE: Read the existing docs/security/README.md first. Preserve any
manually-added security policies, compliance notes, and custom sections.
Update to reflect current security configuration.]

Include:
- Authentication mechanism (OAuth, JWT, session-based, API keys, etc.)
- Authorization model (RBAC, ABAC, policies)
- Secrets management (how secrets are handled, .env patterns)
- Input validation and sanitization approach
- CORS and CSP configuration
- Dependency security (lock files, audit tools)
- Known security considerations for the tech stack
- Data protection (encryption at rest/in transit)
- Security-related environment variables
- Recommendations for security improvements

If limited security setup exists, document what's present and recommend best practices.

IMPORTANT: Never include actual secrets or credentials in documentation.
```

#### Agent 4: Tech Stack Analyst
```
Analyze the project's technology choices and [create|update] docs/tech-stack/README.md.

[UPDATE MODE: Read the existing docs/tech-stack/README.md first. Preserve any
manually-added context or rationale. Update versions, add new dependencies,
remove deprecated ones.]

Include:
- Primary language(s) and version(s)
- Frameworks and libraries (with versions from package files)
- Build tools and task runners
- Testing frameworks and tools
- Linting and formatting tools
- Database technologies
- Message queues / event systems
- External APIs and services integrated
- Development tools (dev containers, hot reload, etc.)
- Dependency management approach
- Technology table: category | technology | version | purpose

IMPORTANT: Extract actual versions from package.json, requirements.txt, go.mod, Cargo.toml, etc.
```

#### Agent 5: Features Analyst (Create mode ONLY)
```
Analyze the codebase to identify distinct features and produce docs/features/README.md.

Include:
- Feature index table: feature name | description | key files/modules | status
- For each identified feature, create a brief entry describing:
  - What the feature does
  - Key files and modules involved
  - User-facing vs internal
  - Dependencies on other features

Identify features by looking at:
- Route handlers / API endpoints
- UI components and pages
- Service modules and business logic
- CLI commands
- Background jobs / workers
- Integration points

IMPORTANT: Keep feature descriptions concise (2-3 sentences each). This is an index, not full documentation.
```

### Step 3: Generate Guides

After agents complete, create or update `docs/guides/README.md` with:
- **Getting Started** — how to set up the development environment (based on package managers, config files, and scripts found)
- **Development Workflow** — how to run, test, and build the project
- **Deployment** — link to infrastructure docs

In **Update mode**, read the existing file first and preserve manually-added content.

### Step 4: Generate Documentation Index

Create or update `docs/README.md` that links to all sections:
- Architecture overview
- Infrastructure and deployment
- Security
- Tech stack
- Features index
- Guides

In **Update mode**, preserve any custom links or sections while ensuring all standard sections are present and links are correct.

### Step 5: Validate

- Verify all generated files exist and are non-empty
- Verify all internal links in docs/README.md point to real files
- Validate any mermaid diagrams using the mermaid MCP server

## Output

Print a summary:
```
Documentation [created|updated]:
  docs/README.md                    — Documentation index
  docs/architecture/README.md       — Architecture overview with C4 diagrams
  docs/architecture/decisions/      — ADR index
  docs/infrastructure/README.md     — Infrastructure and deployment
  docs/security/README.md           — Security architecture
  docs/tech-stack/README.md         — Tech stack and dependencies
  docs/features/README.md           — Feature index [create mode only]
  docs/guides/README.md             — Getting started and development guides
```

## Important

- Always use mermaid diagrams — never ASCII art or external image links
- Use the mermaid MCP server (`mcp__mermaid__*`) to validate diagram syntax
- Base ALL content on actual codebase analysis — never speculate or assume
- Keep generated docs concise — they are starting points to be expanded
- Never include actual secrets, credentials, or sensitive data
- If a section has no relevant content (e.g., no infrastructure files), create the file with a brief note about what's missing and recommendations
- In **Update mode**, NEVER touch `docs/features/` — that is managed exclusively by `/update-feature-docs`
- In **Update mode**, preserve manually-added content — read existing files before overwriting
