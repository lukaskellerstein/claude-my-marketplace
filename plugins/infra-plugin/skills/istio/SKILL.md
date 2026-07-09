---
name: istio
description: Istio service mesh: traffic management, gateways, virtual services, destination rules, mTLS, authorization policies, EnvoyFilters, and observability.
---

# Istio Service Mesh Management

Expertise for managing Istio service mesh in Kubernetes: traffic management, security, and observability.

## Core Capabilities

- **Traffic Management**: VirtualServices, DestinationRules, Gateways, ServiceEntries
- **Security**: PeerAuthentication, RequestAuthentication, AuthorizationPolicies, mTLS
- **Observability**: Telemetry, metrics, tracing, logging
- **Networking**: Sidecars, WorkloadEntries, EnvoyFilters
- **Multi-cluster**: Multi-cluster mesh setup and troubleshooting

## Prerequisites

- `kubectl` - Kubernetes CLI (required)
- `istioctl` - Istio CLI (required)
- `helm` - For Helm-based installation (optional)

Tested with Istio 1.18.x–1.24.x and Kubernetes 1.26.x–1.31.x.

## Quick Start

```bash
# Install / upgrade the control plane
istioctl install --set profile=default -y

# Verify installation and control plane
istioctl version
kubectl -n istio-system get pods
istioctl proxy-status

# Enable automatic sidecar injection for a namespace
kubectl label namespace default istio-injection=enabled

# Validate configuration
istioctl analyze
```

For operational workflows (deploy, canary, circuit breaking) and diagnostics, see [OPERATIONS.md](OPERATIONS.md).

## Core Concepts (Short Examples)

### VirtualService — routing (e.g. canary by header + weight)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
    - my-service
  http:
    - match:
        - headers:
            canary:
              exact: "true"
      route:
        - destination: { host: my-service, subset: v2 }
    - route:
        - destination: { host: my-service, subset: v1 }
          weight: 90
        - destination: { host: my-service, subset: v2 }
          weight: 10
```

### DestinationRule — subsets and traffic policy

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp: { maxConnections: 100 }
      http: { http1MaxPendingRequests: 50, http2MaxRequests: 100 }
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
  subsets:
    - name: v1
      labels: { version: v1 }
    - name: v2
      labels: { version: v2 }
```

### Gateway — ingress (HTTP + TLS)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port: { number: 80, name: http, protocol: HTTP }
      hosts: ["example.com"]
    - port: { number: 443, name: https, protocol: HTTPS }
      tls: { mode: SIMPLE, credentialName: example-credential }
      hosts: ["example.com"]
```

### mTLS — PeerAuthentication (strict, mesh-wide)

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

### AuthorizationPolicy — least-privilege allow

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: frontend-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: frontend
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/backend"]
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/*"]
```

## Reference Files

| File | Read this when… |
| --- | --- |
| [OPERATIONS.md](OPERATIONS.md) | Deploying/canary rollouts, circuit breaking & retries, troubleshooting sidecar injection / routing / mTLS / latency, or running `istioctl proxy-config`, `analyze`, and dashboard diagnostics. |
| [PATTERNS.md](PATTERNS.md) | Production patterns: blue-green, A/B, dark launch, bulkhead, zero-trust mTLS, defense-in-depth authz, JWT/external auth, multi-tenancy, connection-pool and sidecar performance tuning, chaos testing. |
| [MULTICLUSTER.md](MULTICLUSTER.md) | Setting up or debugging a multi-cluster mesh: primary-remote/multi-primary models, cross-network gateways, trust-domain federation. |
| [ENVOYFILTER.md](ENVOYFILTER.md) | Writing custom EnvoyFilters: header manipulation, rate limiting, Wasm/Lua, ext_authz, custom load balancing. |
| [TELEMETRY.md](TELEMETRY.md) | Configuring observability: custom metrics, tracing (Jaeger/Zipkin/OTel), access logging, Prometheus/Grafana/Kiali. |

## Working Principles

When creating or debugging Istio resources I:

1. Check required tools and current Istio version for compatibility
2. Validate configurations with `istioctl analyze` before applying
3. Define VirtualService and DestinationRule together, roll out gradually
4. Provide rollback steps for risky changes and verification/monitoring steps

## Additional Resources

- [Istio Documentation](https://istio.io/latest/docs/)
- [Istio GitHub](https://github.com/istio/istio)
- [Istio Community](https://istio.io/latest/about/community/)
