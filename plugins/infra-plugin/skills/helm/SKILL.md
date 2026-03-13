---
name: helm-charts
description: Helm package manager for Kubernetes. Use when creating, managing, or debugging Helm charts, writing Chart.yaml or values.yaml files, templating K8s manifests with Go templates, managing Helm releases (install, upgrade, rollback), working with Helm repositories, creating chart libraries, or troubleshooting Helm deployment issues. Covers chart structure, values overrides, hooks, tests, dependencies, and OCI registry usage.
---

# Helm Package Manager

Comprehensive guidance for managing Kubernetes applications with Helm charts, from chart creation to production deployment patterns.

## Quick Start

### Basic operations

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

### Repository management

```bash
# Add repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Search for charts
helm search repo nginx
helm search hub prometheus  # Search Artifact Hub
```

## Chart Structure

### Standard layout

```
mychart/
├── Chart.yaml          # Chart metadata (name, version, dependencies)
├── Chart.lock          # Locked dependency versions
├── values.yaml         # Default configuration values
├── values.schema.json  # Optional JSON schema for values validation
├── templates/
│   ├── _helpers.tpl    # Template helpers (named templates)
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── hpa.yaml
│   ├── serviceaccount.yaml
│   ├── NOTES.txt       # Post-install usage instructions
│   └── tests/
│       └── test-connection.yaml
├── charts/             # Dependency charts (vendored)
└── .helmignore         # Files to exclude from packaging
```

### Chart.yaml

```yaml
apiVersion: v2
name: my-app
description: A Helm chart for my application
type: application  # or "library"
version: 1.2.0     # Chart version (SemVer)
appVersion: "3.1.0" # Application version

keywords:
  - app
  - backend

home: https://github.com/org/my-app
sources:
  - https://github.com/org/my-app

maintainers:
  - name: Team Name
    email: team@example.com

dependencies:
  - name: postgresql
    version: "~13.0"
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
  - name: redis
    version: "~18.0"
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
```

### values.yaml

```yaml
# Default values for my-app
replicaCount: 2

image:
  repository: gcr.io/my-project/my-app
  tag: ""  # Defaults to appVersion
  pullPolicy: IfNotPresent

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

serviceAccount:
  create: true
  annotations: {}
  name: ""

service:
  type: ClusterIP
  port: 80
  targetPort: 8080

ingress:
  enabled: false
  className: traefik
  annotations: {}
  hosts:
    - host: app.example.com
      paths:
        - path: /
          pathType: Prefix
  tls: []

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

env: []
envFrom: []

configMap:
  enabled: false
  data: {}

secret:
  enabled: false
  data: {}

livenessProbe:
  httpGet:
    path: /healthz
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: http
  initialDelaySeconds: 5
  periodSeconds: 5

nodeSelector: {}
tolerations: []
affinity: {}

postgresql:
  enabled: false

redis:
  enabled: false
```

## Go Templating

### Template helpers (_helpers.tpl)

```yaml
{{/*
Expand the name of the chart.
*/}}
{{- define "mychart.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "mychart.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "mychart.labels" -}}
helm.sh/chart: {{ include "mychart.chart" . }}
{{ include "mychart.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "mychart.selectorLabels" -}}
app.kubernetes.io/name: {{ include "mychart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Chart name and version as used by the chart label.
*/}}
{{- define "mychart.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "mychart.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "mychart.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
```

### Common template patterns

```yaml
# Conditional blocks
{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
# ...
{{- end }}

# Range (loops)
{{- range .Values.env }}
- name: {{ .name }}
  value: {{ .value | quote }}
{{- end }}

# With (scope change)
{{- with .Values.nodeSelector }}
nodeSelector:
  {{- toYaml . | nindent 8 }}
{{- end }}

# Default values
image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"

# Include and indent
{{- include "mychart.labels" . | nindent 4 }}

# toYaml for passing complex structures
resources:
  {{- toYaml .Values.resources | nindent 12 }}

# Ternary-like
replicas: {{ ternary 1 .Values.replicaCount .Values.autoscaling.enabled }}

# Required values
{{ required "image.repository is required" .Values.image.repository }}
```

### Deployment template

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "mychart.fullname" . }}
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "mychart.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
      labels:
        {{- include "mychart.labels" . | nindent 8 }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "mychart.serviceAccountName" . }}
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.targetPort }}
              protocol: TCP
          {{- with .Values.env }}
          env:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          {{- with .Values.envFrom }}
          envFrom:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          {{- with .Values.livenessProbe }}
          livenessProbe:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          {{- with .Values.readinessProbe }}
          readinessProbe:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

## Values Management

### Override strategies

```bash
# Single values file
helm install my-release ./chart -f values.yaml

# Multiple values files (later files override earlier)
helm install my-release ./chart \
  -f values.yaml \
  -f values-prod.yaml

# Inline overrides (highest priority)
helm install my-release ./chart \
  -f values.yaml \
  --set image.tag=v1.2.3 \
  --set replicaCount=3

# Set string values
helm install my-release ./chart --set-string annotations."key"="value"

# Set from file
helm install my-release ./chart --set-file config=./app-config.json
```

### Environment-specific values pattern

```
chart/
├── values.yaml           # Defaults
├── values-dev.yaml       # Dev overrides
├── values-staging.yaml   # Staging overrides
└── values-prod.yaml      # Production overrides
```

```bash
# Deploy to prod
helm upgrade --install my-release ./chart \
  -f values.yaml \
  -f values-prod.yaml \
  -n production
```

### values.schema.json (validation)

```json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["image", "service"],
  "properties": {
    "replicaCount": {
      "type": "integer",
      "minimum": 1
    },
    "image": {
      "type": "object",
      "required": ["repository"],
      "properties": {
        "repository": { "type": "string" },
        "tag": { "type": "string" },
        "pullPolicy": {
          "type": "string",
          "enum": ["Always", "IfNotPresent", "Never"]
        }
      }
    }
  }
}
```

## Hooks

### Pre/post install and upgrade hooks

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

## Chart Tests

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

## Dependencies

### Managing chart dependencies

```bash
# Download dependencies
helm dependency update ./chart

# List dependencies
helm dependency list ./chart

# Build (rebuild charts/ directory)
helm dependency build ./chart
```

### Conditional dependencies

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

## OCI Registry

### Push and pull charts via OCI

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

## Library Charts

### Creating a library chart

```yaml
# Chart.yaml
apiVersion: v2
name: common-lib
type: library
version: 1.0.0
```

```yaml
# templates/_deployment.tpl
{{- define "common-lib.deployment" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "common-lib.fullname" . }}
  labels:
    {{- include "common-lib.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "common-lib.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "common-lib.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
{{- end }}
```

### Using a library chart

```yaml
# Chart.yaml of consuming chart
dependencies:
  - name: common-lib
    version: "1.0.0"
    repository: "file://../common-lib"
```

```yaml
# templates/deployment.yaml
{{- include "common-lib.deployment" . }}
```

## Release Management

### Inspect releases

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

### Upgrade patterns

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

### Rollback

```bash
# Rollback to previous revision
helm rollback my-release -n namespace

# Rollback to specific revision
helm rollback my-release 3 -n namespace

# Rollback with wait
helm rollback my-release 3 -n namespace --wait --timeout 5m
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

## Best Practices

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

## Package Requirements

This skill requires:

- `helm` >= 3.0 — Kubernetes package manager
- `kubectl` — for cluster access and validation
- Optional: `helm-diff` plugin — for previewing upgrade changes
