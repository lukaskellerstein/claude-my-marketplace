# Testing, Debugging & Best Practices

Validate charts before shipping, render/inspect locally, and recover from stuck
releases.

## Chart tests

A `test` hook Pod (see the `helm.sh/hook: test` annotation) runs on demand via
`helm test`.

```yaml
# templates/tests/test-connection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "mychart.fullname" . }}-test-connection"
  annotations:
    "helm.sh/hook": test
spec:
  restartPolicy: Never
  containers:
    - name: wget
      image: busybox
      command: ['wget']
      args: ['{{ include "mychart.fullname" . }}:{{ .Values.service.port }}/healthz']
```

```bash
# Run tests
helm test my-release -n namespace

# Run tests with logs
helm test my-release -n namespace --logs
```

## Debugging

```bash
# Template rendering (without installing)
helm template my-release ./chart -f values.yaml

# Template with debug output
helm template my-release ./chart -f values.yaml --debug

# Dry-run install (server-side validation)
helm install my-release ./chart -f values.yaml --dry-run --debug

# Lint chart
helm lint ./chart
helm lint ./chart -f values.yaml

# Show computed values
helm show values ./chart

# Show chart info
helm show chart ./chart
helm show readme ./chart
```

### Common issues

**Template rendering errors:**
```bash
# Render specific template
helm template my-release ./chart -s templates/deployment.yaml

# Check for YAML validity
helm template my-release ./chart | kubectl apply --dry-run=client -f -
```

**Release stuck in pending/failed:**
```bash
# Check release status
helm status my-release -n namespace

# Force uninstall stuck release
helm uninstall my-release -n namespace --no-hooks

# If uninstall fails, remove secrets manually
kubectl delete secret -l owner=helm,name=my-release -n namespace
```

## Best practices

1. **Use `helm upgrade --install`** for idempotent deployments
2. **Use `--atomic`** in CI/CD to auto-rollback failed upgrades
3. **Pin chart versions** in dependencies — avoid floating versions
4. **Use `values.schema.json`** to validate values before rendering
5. **Include NOTES.txt** with post-install instructions
6. **Use named templates** in `_helpers.tpl` — avoid duplication across templates
7. **Add checksum annotations** for ConfigMaps/Secrets to trigger pod restart on config changes
8. **Test charts** with `helm lint`, `helm template`, and `helm test`
9. **Separate chart version from app version** — bump chart version for chart changes, appVersion for application changes
10. **Use `.helmignore`** to exclude CI files, tests, and docs from packaged chart
