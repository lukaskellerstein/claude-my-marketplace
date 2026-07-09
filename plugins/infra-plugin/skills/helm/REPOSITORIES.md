# Repositories, Dependencies & OCI

Managing chart sources: classic HTTP repos, sub-chart dependencies, and OCI
registries.

## Repository management

```bash
# Add repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Search for charts
helm search repo nginx
helm search hub prometheus  # Search Artifact Hub
```

## Managing chart dependencies

Dependencies are declared in the `dependencies:` stanza of `Chart.yaml` (see
[CHART-AUTHORING.md](CHART-AUTHORING.md)) and vendored into `charts/`.

```bash
# Download dependencies
helm dependency update ./chart

# List dependencies
helm dependency list ./chart

# Build (rebuild charts/ directory)
helm dependency build ./chart
```

### Conditional dependencies

Use `condition` (a boolean values path) or `tags` (group toggles) to
enable/disable sub-charts.

```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "~13.0"
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
    tags:
      - database
```

### Overriding dependency values

Set sub-chart values under a key matching the dependency `name`.

```yaml
# values.yaml — override sub-chart values under their name
postgresql:
  enabled: true
  auth:
    postgresPassword: secret
    database: myapp
  primary:
    persistence:
      size: 10Gi
```

## OCI registry

Charts can be stored as OCI artifacts instead of in a classic repo.

```bash
# Login to registry
helm registry login gcr.io -u _json_key --password-stdin < key.json

# Package chart
helm package ./chart

# Push to OCI registry
helm push my-app-1.2.0.tgz oci://gcr.io/my-project/charts

# Pull from OCI registry
helm pull oci://gcr.io/my-project/charts/my-app --version 1.2.0

# Install from OCI
helm install my-release oci://gcr.io/my-project/charts/my-app --version 1.2.0
```
