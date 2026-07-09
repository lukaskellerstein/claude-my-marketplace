---
name: helm
description: Helm chart authoring, templating, and release management for Kubernetes: charts, values, templating functions, repositories, dependencies, and lifecycle operations.
---

# Helm Package Manager

Guidance for managing Kubernetes applications with Helm charts, from chart
creation to production deployment. This entry keeps the most common commands
inline; deeper topics live in the reference files below and load on demand.

## Quick Start

```bash
# Install / upgrade / rollback / uninstall a release
helm install my-release ./chart -n namespace
helm upgrade --install my-release ./chart -n namespace -f values.yaml
helm rollback my-release 1 -n namespace
helm uninstall my-release -n namespace

# List releases
helm list -n namespace
helm list -A                      # All namespaces

# Repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm search repo nginx
helm search hub prometheus         # Search Artifact Hub

# Validate before shipping
helm lint ./chart
helm template my-release ./chart -f values.yaml
helm install my-release ./chart --dry-run --debug
```

## Reference files

| File | Read this when… |
|------|-----------------|
| [CHART-AUTHORING.md](CHART-AUTHORING.md) | Laying out a chart, writing `Chart.yaml` / `values.yaml` (canonical blocks), or building a library chart. |
| [TEMPLATING.md](TEMPLATING.md) | Writing Go templates: `_helpers.tpl` named templates, template functions/patterns, and the deployment template. |
| [VALUES.md](VALUES.md) | Overriding values (`-f` / `--set`), env-specific value files, or `values.schema.json` validation. |
| [REPOSITORIES.md](REPOSITORIES.md) | Adding repos, managing sub-chart dependencies, or pushing/pulling charts via OCI registries. |
| [RELEASES.md](RELEASES.md) | Install/upgrade/rollback patterns, inspecting releases, or lifecycle hooks. |
| [TESTING.md](TESTING.md) | Chart tests, debugging/rendering issues, recovering stuck releases, and best practices. |

## Package Requirements

- `helm` >= 3.0 — Kubernetes package manager
- `kubectl` — for cluster access and validation
- Optional: `helm-diff` plugin — for previewing upgrade changes
