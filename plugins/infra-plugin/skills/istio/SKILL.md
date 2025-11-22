---
name: istio
description: Manage Istio service mesh configurations, traffic management, security policies, and observability. Use when working with Istio, service mesh, traffic routing, virtual services, destination rules, gateways, mTLS, authentication policies, authorization policies, or microservices networking in Kubernetes.
---

# Istio Service Mesh Management

Comprehensive expertise for managing Istio service mesh in Kubernetes environments, including traffic management, security, and observability configurations.

## Core Capabilities

This skill helps with:

- **Traffic Management**: VirtualServices, DestinationRules, Gateways, ServiceEntries
- **Security**: PeerAuthentication, RequestAuthentication, AuthorizationPolicies, mTLS configuration
- **Observability**: Telemetry, metrics, tracing, logging configuration
- **Networking**: Sidecars, WorkloadEntries, EnvoyFilters
- **Multi-cluster**: Multi-cluster mesh configuration and troubleshooting

## Prerequisites

Required tools (I'll check for these):

- `kubectl` - Kubernetes CLI
- `istioctl` - Istio CLI tool

Optional but recommended:

- `helm` - For Istio installation via Helm charts

## Quick Start Examples

### Check Istio Installation

```bash
# Verify Istio is installed
istioctl version

# Check control plane status
kubectl -n istio-system get pods

# Verify proxy status
istioctl proxy-status
```

### Traffic Management

**Create a VirtualService for canary deployment:**

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
        - destination:
            host: my-service
            subset: v2
    - route:
        - destination:
            host: my-service
            subset: v1
          weight: 90
        - destination:
            host: my-service
            subset: v2
          weight: 10
```

**Create corresponding DestinationRule:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

### Security Configuration

**Enable strict mTLS mesh-wide:**

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

**Create an AuthorizationPolicy:**

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

### Gateway Configuration

**Create an Ingress Gateway:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "example.com"
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: example-credential
      hosts:
        - "example.com"
```

## Common Workflows

### 1. Deploy a New Service with Istio

```bash
# Label namespace for automatic sidecar injection
kubectl label namespace default istio-injection=enabled

# Deploy your application
kubectl apply -f deployment.yaml

# Verify sidecar injection
kubectl get pods -o jsonpath='{.items[*].spec.containers[*].name}'

# Create VirtualService and DestinationRule
kubectl apply -f virtualservice.yaml
kubectl apply -f destinationrule.yaml

# Test traffic routing
kubectl exec -it pod-name -c istio-proxy -- curl http://my-service
```

### 2. Implement Canary Deployment

```bash
# Deploy v2 of your service
kubectl apply -f deployment-v2.yaml

# Create traffic split (90/10)
kubectl apply -f virtualservice-canary.yaml

# Monitor traffic distribution
istioctl dashboard prometheus
# Query: rate(istio_requests_total{destination_service="my-service"}[1m])

# Gradually increase v2 traffic
# Update VirtualService weights: 70/30, 50/50, 30/70, 0/100

# Finalize deployment
kubectl delete -f deployment-v1.yaml
```

### 3. Configure Circuit Breaking

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: circuit-breaker
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 10
        maxRequestsPerConnection: 2
    outlierDetection:
      consecutiveErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 40
```

### 4. Enable Request Timeout and Retries

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: timeout-retry
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,reset,connect-failure,refused-stream
```

## Troubleshooting Guide

### Common Issues and Solutions

**Issue: Sidecar not injected**

```bash
# Check namespace label
kubectl get namespace -L istio-injection

# Check pod annotations
kubectl get pod pod-name -o yaml | grep sidecar.istio.io

# Manual injection (if needed)
istioctl kube-inject -f deployment.yaml | kubectl apply -f -
```

**Issue: Traffic not routing correctly**

```bash
# Verify VirtualService configuration
kubectl get virtualservice my-service -o yaml

# Check destination rule
kubectl get destinationrule my-service -o yaml

# Analyze proxy configuration
istioctl proxy-config routes pod-name

# Check logs
kubectl logs pod-name -c istio-proxy
```

**Issue: mTLS connection failures**

```bash
# Check PeerAuthentication
kubectl get peerauthentication -A

# Verify certificates
istioctl proxy-config secret pod-name

# Test mTLS connectivity
istioctl experimental authz check pod-name
```

**Issue: High latency or timeouts**

```bash
# Check circuit breaker status
istioctl proxy-config cluster pod-name --fqdn my-service

# Analyze metrics
istioctl dashboard prometheus

# Check for outlier detection
kubectl logs -n istio-system deploy/istiod | grep outlier
```

## Diagnostic Commands

### Proxy Status and Configuration

```bash
# Get proxy status for all pods
istioctl proxy-status

# Get specific proxy configuration
istioctl proxy-config cluster pod-name
istioctl proxy-config listener pod-name
istioctl proxy-config route pod-name
istioctl proxy-config endpoint pod-name

# Get bootstrap configuration
istioctl proxy-config bootstrap pod-name

# Get secrets configuration
istioctl proxy-config secret pod-name
```

### Validation and Analysis

```bash
# Analyze Istio configuration
istioctl analyze

# Validate specific resource
istioctl validate -f virtualservice.yaml

# Describe configuration issues
istioctl analyze --namespace default

# Experimental features
istioctl experimental describe pod pod-name
istioctl experimental wait --for=distribution virtualservice/my-service
```

### Metrics and Observability

```bash
# Open Kiali dashboard
istioctl dashboard kiali

# Open Prometheus dashboard
istioctl dashboard prometheus

# Open Grafana dashboard
istioctl dashboard grafana

# Open Jaeger dashboard
istioctl dashboard jaeger

# View metrics for a service
kubectl exec -it pod-name -c istio-proxy -- curl localhost:15000/stats/prometheus
```

## Security Best Practices

### 1. Enable Strict mTLS

Always enable strict mTLS for production environments:

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

### 2. Implement Fine-grained Authorization

Use AuthorizationPolicies with least privilege principle:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: default
spec:
  action: DENY
  rules:
    - {}
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-specific
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/frontend"]
      to:
        - operation:
            methods: ["GET"]
```

### 3. JWT Authentication

Configure JWT validation for external authentication:

```yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      audiences:
        - "my-app"
```

## Performance Optimization

### Resource Management

```yaml
# Sidecar resource limits
apiVersion: v1
kind: Pod
metadata:
  annotations:
    sidecar.istio.io/proxyCPU: "100m"
    sidecar.istio.io/proxyMemory: "128Mi"
    sidecar.istio.io/proxyCPULimit: "500m"
    sidecar.istio.io/proxyMemoryLimit: "512Mi"
```

### Sidecar Scoping

Reduce sidecar configuration overhead:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: default
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

## Advanced Patterns

### Multi-cluster Configuration

For detailed multi-cluster setup, see [MULTICLUSTER.md](MULTICLUSTER.md).

### Custom Envoy Filters

For advanced Envoy configuration, see [ENVOYFILTER.md](ENVOYFILTER.md).

### Telemetry Configuration

For observability setup, see [TELEMETRY.md](TELEMETRY.md).

## Working with This Skill

When you ask me to:

- Create or modify Istio resources, I'll provide proper YAML configurations
- Debug issues, I'll guide you through systematic troubleshooting
- Implement patterns, I'll suggest best practices and gotchas
- Analyze configurations, I'll use `istioctl analyze` and other diagnostic tools

I always:

1. Check if required tools are available
2. Verify current Istio version for compatibility
3. Validate configurations before applying
4. Provide rollback steps for risky changes
5. Include monitoring and verification steps

## Version Compatibility

This skill is tested with:

- Istio 1.18.x - 1.24.x
- Kubernetes 1.26.x - 1.31.x

For version-specific features, I'll note compatibility requirements.

## Additional Resources

- [Istio Official Documentation](https://istio.io/latest/docs/)
- [Istio GitHub Repository](https://github.com/istio/istio)
- [Istio Community](https://istio.io/latest/about/community/)

For more detailed guidance on specific topics:

- Multi-cluster setup: [MULTICLUSTER.md](MULTICLUSTER.md)
- EnvoyFilter examples: [ENVOYFILTER.md](ENVOYFILTER.md)
- Telemetry configuration: [TELEMETRY.md](TELEMETRY.md)
- Common patterns: [PATTERNS.md](PATTERNS.md)
