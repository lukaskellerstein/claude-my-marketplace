# Advanced Patterns

Meta-arguments and expressions for dynamic, conditional, and protected resources.

## for_each and dynamic blocks

Use `for_each` to create a resource per element, and `dynamic` blocks to generate repeated nested blocks from a variable.

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

## Conditional resources

Use `count` with a ternary to create a resource only under certain conditions.

```hcl
resource "google_compute_global_address" "static_ip" {
  count = var.environment == "prod" ? 1 : 0
  name  = "${var.project_id}-static-ip"
}
```

## Lifecycle rules

Protect and stabilize resources. Applies to the GKE cluster from [MODULES.md](MODULES.md).

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
