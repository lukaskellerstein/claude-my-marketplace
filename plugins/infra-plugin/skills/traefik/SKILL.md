---
name: traefik
description: Traefik reverse proxy and ingress: routers, services, middlewares, TLS/certificates, and Kubernetes CRD (IngressRoute) configuration.
---

# Traefik Reverse Proxy

Guidance for deploying and managing Traefik as a reverse proxy and ingress
controller across Kubernetes (CRDs) and Docker/standalone (file-based) setups.

Start here for the common install, then load the topic file you need from the
reference table below — content loads on demand to stay token-efficient.

## Quick Start

### Kubernetes deployment with Helm

```bash
helm repo add traefik https://traefik.github.io/charts
helm repo update

helm install traefik traefik/traefik \
  -n traefik --create-namespace \
  -f traefik-values.yaml
```

**Production values (traefik-values.yaml):**

```yaml
deployment:
  replicas: 2

ingressRoute:
  dashboard:
    enabled: false  # Disable in production

ports:
  web:
    port: 8000
    exposedPort: 80
    redirectTo:
      port: websecure
  websecure:
    port: 8443
    exposedPort: 443
    tls:
      enabled: true

providers:
  kubernetesCRD:
    enabled: true
    allowCrossNamespace: true
  kubernetesIngress:
    enabled: true

logs:
  general:
    level: INFO
  access:
    enabled: true

metrics:
  prometheus:
    entryPoint: metrics

resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "500m"
    memory: "256Mi"

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

After install, define an IngressRoute to expose an app — see
[ROUTING.md](ROUTING.md).

## Reference files

| File | Read this when… |
|------|-----------------|
| [ROUTING.md](ROUTING.md) | Defining routers & services: IngressRoute (HTTP), IngressRouteTCP, weighted load balancing, mirroring, sticky sessions. |
| [MIDDLEWARE.md](MIDDLEWARE.md) | Adding rate limiting, security headers, auth (basic/forward), strip-prefix, circuit breaker, retry, compress, or chains. |
| [TLS.md](TLS.md) | Terminating TLS: cert-manager/Let's Encrypt, `secretName` vs `certResolver`, TLSOption (min version, ciphers). |
| [PROVIDERS.md](PROVIDERS.md) | Non-Kubernetes setups: static `traefik.yml`, dynamic file config, certificate resolvers, and Docker Compose labels. |
| [OPERATIONS.md](OPERATIONS.md) | Monitoring (Prometheus metrics), troubleshooting commands, and production best practices. |
