---
name: terraform-iac
description: Terraform Infrastructure as Code for provisioning and managing cloud resources. Use when writing or modifying Terraform configurations (.tf files), managing state, creating modules, working with providers (GCP, AWS, Azure), planning/applying infrastructure changes, importing existing resources, or troubleshooting Terraform issues. Covers HCL syntax, module patterns, state management, and CI/CD integration.
---

# Terraform Infrastructure as Code

Comprehensive guidance for managing infrastructure with Terraform, with focus on production patterns and best practices.

## Quick Start

### Basic workflow

```bash
# Initialize working directory
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

## HCL Fundamentals

### Provider configuration

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
```

### Variables and outputs

```hcl
# variables.tf
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "labels" {
  description = "Common labels for all resources"
  type        = map(string)
  default     = {}
}

# outputs.tf
output "cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = google_container_cluster.primary.endpoint
  sensitive   = true
}
```

### Locals and data sources

```hcl
locals {
  common_labels = merge(var.labels, {
    environment = var.environment
    managed_by  = "terraform"
  })

  cluster_name = "${var.project_id}-${var.environment}-gke"
}

data "google_project" "current" {}

data "google_client_config" "default" {}
```

## State Management

### Remote state with GCS

```hcl
# backend.tf
terraform {
  backend "gcs" {
    bucket = "my-project-terraform-state"
    prefix = "env/prod"
  }
}
```

**Create the state bucket:**

```bash
gsutil mb -l us-central1 gs://my-project-terraform-state
gsutil versioning set on gs://my-project-terraform-state
```

### State operations

```bash
# List resources in state
terraform state list

# Show resource details
terraform state show google_container_cluster.primary

# Move resource in state (rename)
terraform state mv google_container_cluster.old google_container_cluster.new

# Remove resource from state (without destroying)
terraform state rm google_container_cluster.imported

# Import existing resource
terraform import google_container_cluster.primary projects/PROJECT/locations/REGION/clusters/CLUSTER
```

### State locking

GCS backend supports state locking automatically. For troubleshooting lock issues:

```bash
# Force unlock (use only when lock is stale)
terraform force-unlock LOCK_ID
```

## Module Patterns

### Creating a module

```hcl
# modules/gke-cluster/main.tf
resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.region

  remove_default_node_pool = true
  initial_node_count       = 1

  networking_mode = "VPC_NATIVE"

  network    = var.network_id
  subnetwork = var.subnet_id

  ip_allocation_policy {
    cluster_secondary_range_name  = var.pods_range_name
    services_secondary_range_name = var.services_range_name
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  release_channel {
    channel = var.release_channel
  }

  resource_labels = var.labels
}

resource "google_container_node_pool" "primary" {
  name       = "${var.cluster_name}-primary"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = var.node_count

  autoscaling {
    min_node_count = var.min_nodes
    max_node_count = var.max_nodes
  }

  node_config {
    machine_type    = var.machine_type
    service_account = var.node_service_account
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    labels = var.labels
  }
}

# modules/gke-cluster/variables.tf
variable "cluster_name" {
  type = string
}

variable "region" {
  type = string
}

variable "project_id" {
  type = string
}

variable "network_id" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "pods_range_name" {
  type = string
}

variable "services_range_name" {
  type = string
}

variable "release_channel" {
  type    = string
  default = "REGULAR"
}

variable "node_count" {
  type    = number
  default = 3
}

variable "min_nodes" {
  type    = number
  default = 1
}

variable "max_nodes" {
  type    = number
  default = 10
}

variable "machine_type" {
  type    = string
  default = "e2-standard-4"
}

variable "node_service_account" {
  type = string
}

variable "labels" {
  type    = map(string)
  default = {}
}

# modules/gke-cluster/outputs.tf
output "cluster_id" {
  value = google_container_cluster.primary.id
}

output "cluster_endpoint" {
  value     = google_container_cluster.primary.endpoint
  sensitive = true
}

output "cluster_ca_certificate" {
  value     = google_container_cluster.primary.master_auth[0].cluster_ca_certificate
  sensitive = true
}
```

### Using modules

```hcl
module "gke" {
  source = "../../modules/gke-cluster"

  cluster_name         = local.cluster_name
  region               = var.region
  project_id           = var.project_id
  network_id           = module.networking.network_id
  subnet_id            = module.networking.subnet_id
  pods_range_name      = "pods"
  services_range_name  = "services"
  node_service_account = google_service_account.gke_nodes.email
  labels               = local.common_labels
}
```

## GCP Resource Patterns

### VPC networking

```hcl
resource "google_compute_network" "main" {
  name                    = "${var.project_id}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "gke" {
  name          = "${var.project_id}-gke-subnet"
  ip_cidr_range = "10.0.0.0/20"
  region        = var.region
  network       = google_compute_network.main.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.4.0.0/14"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.8.0.0/20"
  }

  private_ip_google_access = true
}

resource "google_compute_router" "router" {
  name    = "${var.project_id}-router"
  region  = var.region
  network = google_compute_network.main.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "${var.project_id}-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}
```

### IAM and service accounts

```hcl
resource "google_service_account" "gke_nodes" {
  account_id   = "gke-node-sa"
  display_name = "GKE Node Service Account"
}

resource "google_project_iam_member" "gke_node_roles" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/artifactregistry.reader",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}
```

### Cloud SQL

```hcl
resource "google_sql_database_instance" "main" {
  name             = "${var.project_id}-${var.environment}-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = var.environment == "prod" ? "db-custom-4-16384" : "db-f1-micro"
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = var.environment == "prod"
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }
  }

  deletion_protection = var.environment == "prod"
}
```

## Advanced Patterns

### for_each and dynamic blocks

```hcl
# Create multiple namespaces
resource "kubernetes_namespace" "namespaces" {
  for_each = toset(["app", "monitoring", "auth", "ingress"])

  metadata {
    name   = each.value
    labels = local.common_labels
  }
}

# Dynamic blocks for firewall rules
resource "google_compute_firewall" "rules" {
  for_each = var.firewall_rules

  name    = each.key
  network = google_compute_network.main.name

  dynamic "allow" {
    for_each = each.value.allow
    content {
      protocol = allow.value.protocol
      ports    = allow.value.ports
    }
  }

  source_ranges = each.value.source_ranges
  target_tags   = each.value.target_tags
}
```

### Conditional resources

```hcl
resource "google_compute_global_address" "static_ip" {
  count = var.environment == "prod" ? 1 : 0
  name  = "${var.project_id}-static-ip"
}
```

### Lifecycle rules

```hcl
resource "google_container_cluster" "primary" {
  # ...

  lifecycle {
    ignore_changes = [
      node_config,
      initial_node_count,
    ]
    prevent_destroy = true
  }
}
```

## CI/CD Integration

### GitHub Actions workflow

```yaml
name: Terraform
on:
  push:
    branches: [main]
    paths: ["infrastructure/**"]
  pull_request:
    paths: ["infrastructure/**"]

jobs:
  terraform:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.SA_EMAIL }}

      - name: Terraform Init
        run: terraform init
        working-directory: infrastructure/environments/prod

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -out=tfplan
        working-directory: infrastructure/environments/prod

      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const output = `${{ steps.plan.outputs.stdout }}`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '### Terraform Plan\n```\n' + output + '\n```'
            });

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve tfplan
        working-directory: infrastructure/environments/prod
```

## Troubleshooting

### Common issues

```bash
# State lock stuck
terraform force-unlock LOCK_ID

# Provider version conflicts
terraform providers lock -platform=linux_amd64

# Refresh state to match reality
terraform refresh

# Plan with specific target
terraform plan -target=module.gke

# Verbose logging
TF_LOG=DEBUG terraform plan

# Validate configuration
terraform validate

# Format check
terraform fmt -check -recursive
```

### Import existing resources

```bash
# Import a GKE cluster
terraform import google_container_cluster.primary \
  projects/PROJECT_ID/locations/REGION/clusters/CLUSTER_NAME

# Import a VPC
terraform import google_compute_network.main \
  projects/PROJECT_ID/global/networks/NETWORK_NAME

# Generate import blocks (Terraform 1.5+)
terraform plan -generate-config-out=generated.tf
```

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
