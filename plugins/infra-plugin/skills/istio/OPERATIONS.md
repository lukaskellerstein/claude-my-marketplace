# Istio Operations: Workflows, Troubleshooting, and Diagnostics

Day-2 operational guidance for deploying services, rolling out changes, and diagnosing issues with `istioctl` and `kubectl`.

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

See [PATTERNS.md](PATTERNS.md) Pattern 6 for circuit breaking combined with retry.

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
