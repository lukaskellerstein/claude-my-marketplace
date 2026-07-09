---
name: terraform
description: Terraform infrastructure-as-code for provisioning cloud and Kubernetes resources: modules, state and backends, providers, and plan/apply workflows.
---

# Terraform Infrastructure as Code

Guidance for managing infrastructure with Terraform, focused on production patterns and best practices. This entry keeps the common workflow inline; deeper topics live in the reference files below and load on demand.

## Quick Start

### Basic workflow

```bash
# Initialize working directory (downloads providers, configures backend)
terraform init

# Preview changes
terraform plan

# Apply changes
terraform apply

# Destroy resources (use with caution)
terraform destroy
```

### Project structure

```
infrastructure/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   └── prod/
├── modules/
│   ├── networking/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── gke-cluster/
│   └── database/
└── shared/
    └── providers.tf
```

## Reference files

Load the file that matches your task:

| File | Read this when… |
| --- | --- |
| [HCL-FUNDAMENTALS.md](HCL-FUNDAMENTALS.md) | Writing providers, variables, outputs, locals, or data sources (canonical `required_providers` block lives here). |
| [STATE-BACKENDS.md](STATE-BACKENDS.md) | Configuring remote state (GCS), running `terraform state` operations, or fixing locks. |
| [MODULES.md](MODULES.md) | Authoring a reusable module or wiring one up with `module {}` (full GKE-cluster module example). |
| [GCP-RESOURCES.md](GCP-RESOURCES.md) | Provisioning GCP resources: VPC/subnets/NAT, IAM & service accounts, Cloud SQL. |
| [ADVANCED-PATTERNS.md](ADVANCED-PATTERNS.md) | Using `for_each`, `dynamic` blocks, conditional `count`, or `lifecycle` rules. |
| [CICD.md](CICD.md) | Running Terraform in CI/CD (GitHub Actions plan-on-PR / apply-on-merge, workload identity). |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Debugging failures, provider/lock conflicts, `TF_LOG`, or importing existing resources. |

## Best Practices

1. **Use remote state** with locking (GCS, S3) — never local state in production
2. **Pin provider versions** — use `~>` for minor version flexibility
3. **Use modules** for reusable infrastructure components
4. **Separate environments** — different state files per environment
5. **Use variables and locals** — no hardcoded values
6. **Enable deletion protection** on critical resources (databases, clusters)
7. **Use workload identity federation** for CI/CD — no service account keys
8. **Run `terraform fmt`** and `terraform validate` in CI
9. **Review plans before apply** — especially in production
10. **Tag/label all resources** for cost tracking and organization
