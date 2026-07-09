# Troubleshooting and Imports

Diagnosing common Terraform problems and importing existing infrastructure into state.

## Common issues

```bash
# State lock stuck (see STATE-BACKENDS.md for details)
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

## Import existing resources

Bring resources created outside Terraform under management. For in-state `terraform import` basics, see [STATE-BACKENDS.md](STATE-BACKENDS.md).

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
