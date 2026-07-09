# Releases & Lifecycle

Install, upgrade, rollback, inspect releases, and run lifecycle hooks.

## Core operations

```bash
# Install a release
helm install my-release ./chart -n namespace

# Upgrade a release
helm upgrade my-release ./chart -n namespace -f values.yaml

# Rollback to previous revision
helm rollback my-release 1 -n namespace

# Uninstall a release
helm uninstall my-release -n namespace

# List releases
helm list -n namespace
helm list -A  # All namespaces
```

## Upgrade patterns

```bash
# Upgrade with atomic (auto-rollback on failure)
helm upgrade my-release ./chart -n namespace \
  -f values.yaml \
  --atomic \
  --timeout 5m

# Upgrade or install if not exists
helm upgrade --install my-release ./chart -n namespace -f values.yaml

# Dry-run to preview changes
helm upgrade my-release ./chart -n namespace -f values.yaml --dry-run

# Diff plugin (shows what will change)
helm diff upgrade my-release ./chart -n namespace -f values.yaml
```

## Rollback

```bash
# Rollback to previous revision
helm rollback my-release -n namespace

# Rollback to specific revision
helm rollback my-release 3 -n namespace

# Rollback with wait
helm rollback my-release 3 -n namespace --wait --timeout 5m
```

## Inspect releases

```bash
# Release history
helm history my-release -n namespace

# Show current values
helm get values my-release -n namespace
helm get values my-release -n namespace -a  # Including defaults

# Show rendered manifests
helm get manifest my-release -n namespace

# Show release notes
helm get notes my-release -n namespace

# Show all release info
helm get all my-release -n namespace
```

## Hooks

Hooks let you run resources (typically Jobs) at defined points in the release
lifecycle.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "mychart.fullname" . }}-db-migrate
  annotations:
    "helm.sh/hook": pre-upgrade,pre-install
    "helm.sh/hook-weight": "-5"       # Lower runs first
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          command: ["python", "manage.py", "migrate"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
  backoffLimit: 1
```

### Hook types

| Hook | Description |
|------|-------------|
| `pre-install` | Before any resources are installed |
| `post-install` | After all resources are installed |
| `pre-upgrade` | Before any resources are upgraded |
| `post-upgrade` | After all resources are upgraded |
| `pre-delete` | Before any resources are deleted |
| `post-delete` | After all resources are deleted |
| `pre-rollback` | Before rollback |
| `post-rollback` | After rollback |
| `test` | When `helm test` is invoked |

### Delete policies

- `before-hook-creation` — delete previous hook resource before new one is created
- `hook-succeeded` — delete after hook succeeds
- `hook-failed` — delete after hook fails
