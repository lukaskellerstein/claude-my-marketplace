# State Management and Backends

Remote state, state operations, and locking. Use remote state with locking in production — never local state.

## Remote state with GCS

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

Use a distinct `prefix` per environment so each environment has a separate state file within the same bucket.

## State operations

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

For more import examples (including generating config), see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## State locking

The GCS backend supports state locking automatically. If a lock becomes stale (e.g. a crashed run):

```bash
# Force unlock (use only when lock is stale)
terraform force-unlock LOCK_ID
```
