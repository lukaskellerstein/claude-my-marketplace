---
name: infrastructure-planning
description: >
  Plan and document the required software, infrastructure, and logistics for a Paperclip
  company — domains, GitHub, Docker Hub, Kubernetes, Slack, Google Workspace, Stripe,
  shipping providers, and CI/CD pipelines. Use when setting up infrastructure for a new
  company or auditing what an existing company needs.
---

# Infrastructure Planning Skill

This skill helps plan and document all the infrastructure, external services, and logistics a Paperclip company needs to operate.

## When to Use

- Setting up infrastructure for a new company
- Auditing what services an existing company needs
- Planning CI/CD, deployment, and hosting
- Documenting infrastructure decisions

## Infrastructure Categories

### 1. Source Code & Version Control

**GitHub** is the default. Each company needs:

| Resource | Description |
|----------|-------------|
| GitHub Organization | Company org for all repositories |
| Monorepo | Single repository for all services, apps, and infra |
| GitHub CLI (`gh`) | Authenticated in Paperclip container via `GH_TOKEN` |
| GitHub Actions | CI/CD workflows for testing and deployment |

**Monorepo layout (recommended):**

```
{company-name}/
  apps/
    web/                  # Frontend (React/TypeScript or Next.js)
      Dockerfile
      package.json
      src/
  services/
    api/                  # Backend API (FastAPI or Express)
      Dockerfile
      pyproject.toml
      src/
    {domain-service}/     # Domain-specific services
      Dockerfile
      src/
  packages/
    shared/               # Shared types, utilities, constants
  infra/
    helm/                 # Helm charts for each service
    k8s/                  # Raw K8s manifests (alternative to Helm)
    docker-compose.yml    # Local dev stack
  .github/
    workflows/
      ci.yml              # Test on PR
      deploy.yml          # Build + push + deploy on merge
  README.md
```

### 2. Container Registry

**Docker Hub** is the default:

| Resource | Description |
|----------|-------------|
| Docker Hub account | Push/pull container images |
| Image naming | `{account}/{company}-{service}:{tag}` |
| Tags | `latest`, `v{semver}`, `sha-{commit}`, `dev` |
| Auth | `DOCKER_HUB_USERNAME` + `DOCKER_HUB_TOKEN` in Paperclip container |

### 3. Orchestration & Hosting

**Kubernetes** is the default:

| Resource | Description |
|----------|-------------|
| Cluster | microk8s-local (dev) or cloud (GKE, EKS, AKS) |
| Namespaces | `{company}-dev`, `{company}-staging`, `{company}-prod` |
| Ingress | Traefik as reverse proxy |
| Helm | Chart templating for each service |
| Tools | `kubectl`, `helm` installed in Paperclip container |

**Namespace plan:**

| Namespace | Purpose |
|-----------|---------|
| `{company}-dev` | Development and testing |
| `{company}-staging` | Pre-production validation |
| `{company}-prod` | Production |

### 4. Domain & DNS

| Resource | Description |
|----------|-------------|
| Primary domain | `{company}.{tld}` (e.g., `.cz`, `.com`, `.io`) |
| DNS provider | Cloudflare, Route53, or registrar DNS |
| SSL/TLS | Let's Encrypt via cert-manager or Traefik |

### 5. Communication

**Slack** (recommended):

| Channel | Purpose |
|---------|---------|
| `#general` | Company-wide announcements |
| `#engineering` | Technical discussions |
| `#marketing` | Marketing and content |
| `#operations` | Ops, fulfillment, logistics |
| `#alerts` | Automated alerts from monitoring |

### 6. Productivity

**Google Workspace** (recommended):

| Service | Use |
|---------|-----|
| Gmail | Company email ({name}@{domain}) |
| Calendar | Meeting scheduling, deadlines |
| Drive | Document storage and collaboration |
| Docs/Sheets | Business documents, spreadsheets |

### 7. Payments

**Stripe** (recommended for prepaid/subscription models):

| Resource | Description |
|----------|-------------|
| Stripe account | Payment processing |
| Test mode | `sk_test_...`, `pk_test_...` for dev/staging |
| Live mode | `sk_live_...`, `pk_live_...` for production |
| Webhooks | `STRIPE_WEBHOOK_SECRET` for event handling |
| Payment methods | Cards, Apple Pay, Google Pay, SEPA, iDEAL, Bancontact |

### 8. Database

**PostgreSQL** (recommended):

| Environment | Setup |
|-------------|-------|
| Dev | docker-compose or microk8s StatefulSet |
| Staging | Same as dev or managed |
| Production | Managed (Cloud SQL, RDS) or self-hosted StatefulSet |

### 9. Logistics (Physical Products)

If the company ships physical products:

| Region | Provider | Notes |
|--------|----------|-------|
| Czech Republic | Zasilkovna (Packeta) | Pickup points + home delivery |
| EU | DHL, DPD, GLS | Standard parcel |
| International | DHL Express, FedEx, UPS | Priority/express |
| Packaging | Custom branded boxes | Design via CMO/ContentCreator |

### 10. Monitoring & Observability

| Tool | Purpose |
|------|---------|
| Grafana | Dashboards and alerting |
| Prometheus | Metrics collection |
| Loki | Log aggregation |
| Sentry | Error tracking (frontend + backend) |

## Deployment Flow Template

```
Agent writes code
  -> git push to GitHub
    -> Unit tests run locally (pytest / npm test)
      -> docker build (inside Paperclip container)
        -> docker push to Docker Hub
          -> helm upgrade / kubectl apply to K8s
            -> Verify via API/browser
```

### CI/CD Pipeline (GitHub Actions)

**ci.yml** — runs on PRs:
- Checkout code
- Install dependencies
- Run tests (pytest, npm test)
- Lint and type-check

**deploy.yml** — runs on merge to main:
- Build Docker images
- Push to Docker Hub with commit SHA and `latest` tags
- (Optional) Deploy to dev namespace

### Environment Variables per Environment

| Category | Dev | Staging | Prod |
|----------|-----|---------|------|
| Database | Local PG | Staging PG | Prod PG (managed) |
| Payments | Test keys | Test keys | Live keys |
| AI/ML APIs | Test keys | Test keys | Prod keys |
| Domain | localhost | staging.{domain} | {domain} |

## Infrastructure Document Template

When generating `infrastructure.md` for a company, include:

1. **Source Code** — GitHub org, repo URL, monorepo layout
2. **Container Registry** — Docker Hub account, image naming convention
3. **Kubernetes** — cluster info, namespace plan, services
4. **Database** — engine, per-environment setup
5. **Payments** — provider, env vars needed
6. **Paperclip Container Access** — tools available inside the container

## Paperclip Container Tools

Agents run inside the Paperclip Docker container and have access to:

| Tool | Purpose |
|------|---------|
| `claude` | Claude Code CLI |
| `gh` | GitHub CLI (authenticated via `GH_TOKEN`) |
| `docker` | Docker CLI (host daemon via mounted socket) |
| `kubectl` | Kubernetes CLI (host kubeconfig mounted) |
| `helm` | Helm chart manager |
| `git` | Version control |
| `python3` | Python runtime |
| `uv` | Python package manager |
| `node` | Node.js runtime |
| `npm` | Node.js package manager |
