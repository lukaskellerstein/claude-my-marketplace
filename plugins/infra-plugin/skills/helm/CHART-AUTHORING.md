# Chart Authoring & Structure

How to lay out a chart and write its metadata/values files. The `Chart.yaml` and
`values.yaml` blocks shown here are the canonical references used by the other
topic files.

## Standard layout

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

## Chart.yaml (canonical)

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

The `dependencies:` stanza is expanded on in [REPOSITORIES.md](REPOSITORIES.md).

## values.yaml (canonical)

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

Overriding these values at deploy time is covered in [VALUES.md](VALUES.md).

## Library charts

A `type: library` chart ships reusable named templates instead of installable
resources. Consuming charts import it as a `file://` dependency and call its
templates with `include`.

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

Consume it:

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
