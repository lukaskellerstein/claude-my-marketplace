# Values Management

Overriding the canonical `values.yaml` (see
[CHART-AUTHORING.md](CHART-AUTHORING.md)) at deploy time, and validating input.

## Override strategies

Precedence, lowest to highest: chart `values.yaml` < each `-f` file (later wins)
< `--set` flags.

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

## Environment-specific values pattern

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

## values.schema.json (validation)

Placed at the chart root, this JSON Schema is enforced before rendering, so bad
input fails fast.

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
