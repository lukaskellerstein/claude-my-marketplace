---
name: init-docs
description: >
  Initialize comprehensive project documentation from scratch for projects with no existing docs.
  Launches multiple parallel agents to cover infrastructure, architecture, security, tech stack, and features.
  Use when a project has no documentation and needs a complete docs/ folder created.
  NOT for updating existing docs — use update-feature-docs or update-readme for that.

  <example>
  Context: User wants to create documentation for a project
  user: "create documentation for this project"
  </example>

  <example>
  Context: User wants to initialize docs
  user: "/init-docs"
  </example>

  <example>
  Context: Project has no docs
  user: "this project has no docs, can you write them?"
  </example>

  <example>
  Context: User wants comprehensive documentation
  user: "document this entire codebase"
  </example>
---

# Initialize Project Documentation

Generate comprehensive documentation for a project that has no existing docs. This skill orchestrates multiple parallel agents to analyze different aspects of the codebase and produce a complete `docs/` folder.

## Prerequisites

Before starting, verify:
1. No `docs/` folder exists (or it's empty). If docs already exist, warn the user and ask if they want to overwrite.
2. The project has actual source code to document.

## Target Structure

```
docs/
├── README.md                           # Documentation index and navigation
├── architecture/
│   ├── README.md                       # Architecture overview with C4 diagrams
│   └── decisions/
│       └── README.md                   # ADR index (empty to start)
├── infrastructure/
│   └── README.md                       # Deployment, CI/CD, environments
├── security/
│   └── README.md                       # Security architecture and controls
├── tech-stack/
│   └── README.md                       # Languages, frameworks, dependencies
├── features/
│   └── README.md                       # Feature index
└── guides/
    └── README.md                       # Getting started and development guides
```

## Workflow

### Step 1: Quick Codebase Scan

Before launching agents, do a quick scan to understand the project:
- Check for existing docs, README.md, and any scattered documentation
- Identify the primary language(s) and framework(s)
- List top-level directories and key config files
- Check for infrastructure files (Dockerfile, docker-compose, Terraform, k8s manifests, CI configs)
- Check for security-related files (auth configs, .env.example, security policies)

### Step 2: Launch Parallel Agents

Launch **5 agents in parallel** using the Agent tool, each analyzing a specific aspect:

#### Agent 1: Architecture Analyst
```
Analyze the codebase architecture and produce docs/architecture/README.md.

Include:
- System overview (what the project does, why it exists)
- Mermaid C4 Context diagram (system boundary, users, external dependencies)
- Mermaid C4 Container diagram (internal services, databases, queues, storage)
- Component table: each service/module, its responsibility, and technology
- Key design patterns used (MVC, microservices, event-driven, etc.)
- Data flow description (how data moves through the system)
- Internal and external dependencies

Also create docs/architecture/decisions/README.md as an empty ADR index with template instructions.

IMPORTANT: Base everything on actual code analysis. Use mermaid for ALL diagrams.
```

#### Agent 2: Infrastructure Analyst
```
Analyze the project's infrastructure and deployment setup and produce docs/infrastructure/README.md.

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
Analyze the project's security posture and produce docs/security/README.md.

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
Analyze the project's technology choices and produce docs/tech-stack/README.md.

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

#### Agent 5: Features Analyst
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

After agents complete, create `docs/guides/README.md` with:
- **Getting Started** — how to set up the development environment (based on package managers, config files, and scripts found)
- **Development Workflow** — how to run, test, and build the project
- **Deployment** — link to infrastructure docs

### Step 4: Generate Documentation Index

Create `docs/README.md` that links to all generated sections:
- Architecture overview
- Infrastructure and deployment
- Security
- Tech stack
- Features index
- Guides

### Step 5: Validate

- Verify all generated files exist and are non-empty
- Verify all internal links in docs/README.md point to real files
- Validate any mermaid diagrams using the mermaid MCP server

## Output

Print a summary:
```
Documentation initialized:
  docs/README.md                    — Documentation index
  docs/architecture/README.md       — Architecture overview with C4 diagrams
  docs/architecture/decisions/      — ADR index
  docs/infrastructure/README.md     — Infrastructure and deployment
  docs/security/README.md           — Security architecture
  docs/tech-stack/README.md         — Tech stack and dependencies
  docs/features/README.md           — Feature index
  docs/guides/README.md             — Getting started and development guides
```

## Important

- Always use mermaid diagrams — never ASCII art or external image links
- Use the mermaid MCP server (`mcp__mermaid__*`) to validate diagram syntax
- Base ALL content on actual codebase analysis — never speculate or assume
- Keep generated docs concise — they are starting points to be expanded
- Never include actual secrets, credentials, or sensitive data
- If a section has no relevant content (e.g., no infrastructure files), create the file with a brief note about what's missing and recommendations
