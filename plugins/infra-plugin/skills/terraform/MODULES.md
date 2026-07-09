# Module Patterns

How to author a reusable module and consume it. Modules keep infrastructure DRY and composable.

## Creating a module

A module is a directory with `main.tf`, `variables.tf`, and `outputs.tf`. This example is a GKE cluster module.

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

## Using modules

Consume the module from an environment directory. The `networking` and service-account inputs come from resources defined in [GCP-RESOURCES.md](GCP-RESOURCES.md); `local.*` values come from [HCL-FUNDAMENTALS.md](HCL-FUNDAMENTALS.md).

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

Lifecycle rules on the cluster resource (e.g. `ignore_changes`, `prevent_destroy`) are covered in [ADVANCED-PATTERNS.md](ADVANCED-PATTERNS.md).
