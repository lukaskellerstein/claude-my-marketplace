# HCL Fundamentals

Core building blocks of a Terraform configuration: providers, variables, outputs, locals, and data sources.

## Provider configuration

This canonical `terraform {}` + `provider` block is referenced by other reference files (modules, GCP resources). Pin provider versions with `~>` for minor-version flexibility.

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

## Variables and outputs

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

## Locals and data sources

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
