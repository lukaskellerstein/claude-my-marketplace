# Common Istio Patterns and Best Practices

Collection of production-tested patterns for implementing common service mesh scenarios.

## Traffic Management Patterns

### Pattern 1: Blue-Green Deployment

**Use Case**: Zero-downtime deployment with instant rollback capability.

```yaml
# Deploy both versions
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      containers:
        - name: myapp
          image: myapp:v1
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: green
  template:
    metadata:
      labels:
        app: myapp
        version: green
    spec:
      containers:
        - name: myapp
          image: myapp:v2
---
# Route 100% traffic to blue initially
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
    - myapp
  http:
    - route:
        - destination:
            host: myapp
            subset: blue
          weight: 100
        - destination:
            host: myapp
            subset: green
          weight: 0
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: myapp
spec:
  host: myapp
  subsets:
    - name: blue
      labels:
        version: blue
    - name: green
      labels:
        version: green
```

**Switch Traffic:**

```bash
# Switch to green
kubectl patch virtualservice myapp --type=json -p='[
  {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 0},
  {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 100}
]'

# Instant rollback if needed
kubectl patch virtualservice myapp --type=json -p='[
  {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 100},
  {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 0}
]'
```

### Pattern 2: Canary with Header-based Routing

**Use Case**: Test new version with specific users (beta testers, internal teams).

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: canary-header
spec:
  hosts:
    - myapp
  http:
    # Route beta testers to v2
    - match:
        - headers:
            x-user-group:
              exact: "beta"
      route:
        - destination:
            host: myapp
            subset: v2
    # Route internal users to v2
    - match:
        - headers:
            x-user-group:
              exact: "internal"
      route:
        - destination:
            host: myapp
            subset: v2
    # Everyone else gets v1
    - route:
        - destination:
            host: myapp
            subset: v1
```

### Pattern 3: A/B Testing

**Use Case**: Test different versions based on user segments.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ab-test
spec:
  hosts:
    - myapp
  http:
    # Mobile users get v2 with new UI
    - match:
        - headers:
            user-agent:
              regex: ".*Mobile.*"
      route:
        - destination:
            host: myapp
            subset: v2
    # Desktop users get v1
    - match:
        - headers:
            user-agent:
              regex: ".*"
      route:
        - destination:
            host: myapp
            subset: v1
```

### Pattern 4: Geographic Load Balancing

**Use Case**: Route traffic to nearest region for lower latency.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: geo-routing
spec:
  hosts:
    - myapp.example.com
  http:
    - match:
        - headers:
            cloudfront-viewer-country:
              regex: "US|CA|MX"
      route:
        - destination:
            host: myapp
            subset: us-west
    - match:
        - headers:
            cloudfront-viewer-country:
              regex: "DE|FR|UK|IT"
      route:
        - destination:
            host: myapp
            subset: eu-west
    - route:
        - destination:
            host: myapp
            subset: us-west
          weight: 50
        - destination:
            host: myapp
            subset: eu-west
          weight: 50
```

### Pattern 5: Dark Launch

**Use Case**: Deploy new version that receives traffic copy without affecting users.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: dark-launch
spec:
  hosts:
    - myapp
  http:
    - route:
        - destination:
            host: myapp
            subset: v1
          weight: 100
      mirror:
        host: myapp
        subset: v2-dark
      mirrorPercentage:
        value: 100
---
# Monitor v2-dark for errors without impacting users
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: myapp
spec:
  host: myapp
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2-dark
      labels:
        version: v2
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 10
        outlierDetection:
          consecutiveErrors: 1
          interval: 1s
          baseEjectionTime: 3m
```

## Resilience Patterns

### Pattern 6: Circuit Breaking with Retry

**Use Case**: Prevent cascade failures and retry transient errors.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: circuit-breaker
spec:
  host: backend
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 10
        http2MaxRequests: 100
        maxRequestsPerConnection: 2
    outlierDetection:
      consecutiveGatewayErrors: 5
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 40
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: backend-retry
spec:
  hosts:
    - backend
  http:
    - route:
        - destination:
            host: backend
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,reset,connect-failure,refused-stream,gateway-error
      timeout: 10s
```

### Pattern 7: Bulkhead Pattern

**Use Case**: Isolate resources to prevent one slow service from affecting others.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: bulkhead
spec:
  host: backend
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 10
        http2MaxRequests: 40
  subsets:
    - name: critical
      labels:
        priority: critical
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 200
          http:
            http2MaxRequests: 100
    - name: normal
      labels:
        priority: normal
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 50
          http:
            http2MaxRequests: 20
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: priority-routing
spec:
  hosts:
    - backend
  http:
    - match:
        - headers:
            x-priority:
              exact: "high"
      route:
        - destination:
            host: backend
            subset: critical
    - route:
        - destination:
            host: backend
            subset: normal
```

### Pattern 8: Graceful Degradation

**Use Case**: Fallback to cached or default responses when service is unavailable.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: graceful-degradation
spec:
  hosts:
    - recommendations
  http:
    - fault:
        abort:
          percentage:
            value: 0
      route:
        - destination:
            host: recommendations
            subset: live
      timeout: 2s
      retries:
        attempts: 2
        perTryTimeout: 1s
---
# EnvoyFilter for fallback response
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: fallback-response
spec:
  workloadSelector:
    labels:
      app: frontend
  configPatches:
    - applyTo: HTTP_ROUTE
      match:
        context: SIDECAR_OUTBOUND
        routeConfiguration:
          vhost:
            name: recommendations.default.svc.cluster.local:80
            route:
              name: default
      patch:
        operation: MERGE
        value:
          route:
            timeout: 2s
            retry_policy:
              num_retries: 2
              per_try_timeout: 1s
```

## Security Patterns

### Pattern 9: Zero Trust with Strict mTLS

**Use Case**: Enforce encryption and authentication for all service-to-service communication.

```yaml
# Enable strict mTLS mesh-wide
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
---
# Per-namespace override if needed
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: namespace-policy
  namespace: legacy
spec:
  mtls:
    mode: PERMISSIVE
---
# Per-service override
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: service-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: legacy-app
  mtls:
    mode: PERMISSIVE
  portLevelMtls:
    8080:
      mode: DISABLE
```

### Pattern 10: Defense in Depth Authorization

**Use Case**: Layer multiple authorization policies for comprehensive security.

```yaml
# Layer 1: Default deny all
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
# Layer 2: Allow specific services
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: default
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/frontend"]
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/*"]
      when:
        - key: request.headers[x-api-version]
          values: ["v1", "v2"]
---
# Layer 3: Rate limit per source
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: rate-limit-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: backend
  action: CUSTOM
  provider:
    name: rate-limiter
  rules:
    - to:
        - operation:
            paths: ["/api/*"]
---
# Layer 4: Audit all requests
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: audit-logging
  namespace: default
spec:
  selector:
    matchLabels:
      app: backend
  accessLogging:
    - providers:
        - name: envoy
```

### Pattern 11: External Authorization

**Use Case**: Integrate with external auth service (OAuth2, OPA, custom).

```yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: istio-system
spec:
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      audiences:
        - "api.example.com"
      forwardOriginalToken: true
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: default
spec:
  selector:
    matchLabels:
      app: api
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[scope]
          values: ["read", "write"]
---
# External authorization with OPA
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: opa-authz
  namespace: istio-system
spec:
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
              subFilter:
                name: "envoy.filters.http.router"
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.ext_authz
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
            grpc_service:
              envoy_grpc:
                cluster_name: "outbound|9191||opa.default.svc.cluster.local"
              timeout: 0.5s
            failure_mode_allow: false
```

## Observability Patterns

### Pattern 12: Distributed Tracing Setup

**Use Case**: End-to-end request tracing across services.

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: tracing-config
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: jaeger
      randomSamplingPercentage: 1.0
      customTags:
        cluster_id:
          literal:
            value: "prod-cluster-1"
        environment:
          literal:
            value: "production"
        version:
          environment:
            name: VERSION
            defaultValue: "unknown"
---
# Higher sampling for critical paths
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: critical-path-tracing
  namespace: default
spec:
  selector:
    matchLabels:
      trace: "always"
  tracing:
    - providers:
        - name: jaeger
      randomSamplingPercentage: 100.0
---
# Sample errors at 100%
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: error-tracing
  namespace: default
spec:
  tracing:
    - providers:
        - name: jaeger
      randomSamplingPercentage: 100.0
      match:
        mode: SERVER
      filter:
        expression: response.code >= 500
```

### Pattern 13: Custom Metrics for SLIs

**Use Case**: Track service-level indicators for SLOs.

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: sli-metrics
  namespace: default
spec:
  metrics:
    - providers:
        - name: prometheus
      dimensions:
        # Business metrics
        order_value:
          value: request.headers['x-order-value'] | "0"
        user_tier:
          value: request.headers['x-user-tier'] | "free"
        # Technical metrics
        cache_hit:
          value: response.headers['x-cache'] | "miss"
        backend_duration:
          value: response.headers['x-backend-duration'] | "0"
      overrides:
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            response_code:
              value: response.code
            cache_status:
              value: response.headers['x-cache'] | "miss"
```

## Multi-tenant Patterns

### Pattern 14: Namespace Isolation

**Use Case**: Separate teams/environments with network policies.

```yaml
# Tenant A namespace
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-a
  labels:
    istio-injection: enabled
    tenant: a
---
# Only allow traffic within tenant
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: tenant-isolation
  namespace: tenant-a
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["tenant-a"]
---
# Allow specific cross-tenant communication
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-shared-services
  namespace: tenant-a
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["tenant-a"]
    - from:
        - source:
            namespaces: ["shared-services"]
            principals: ["cluster.local/ns/shared-services/sa/api-gateway"]
```

### Pattern 15: Resource Quotas per Tenant

**Use Case**: Prevent resource exhaustion from single tenant.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: tenant-quotas
  namespace: shared-backend
spec:
  host: shared-backend
  subsets:
    - name: tenant-a
      labels:
        app: shared-backend
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 100
          http:
            http1MaxPendingRequests: 10
            http2MaxRequests: 100
    - name: tenant-b
      labels:
        app: shared-backend
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 50
          http:
            http1MaxPendingRequests: 5
            http2MaxRequests: 50
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: tenant-routing
  namespace: shared-backend
spec:
  hosts:
    - shared-backend
  http:
    - match:
        - headers:
            x-tenant-id:
              exact: "tenant-a"
      route:
        - destination:
            host: shared-backend
            subset: tenant-a
    - match:
        - headers:
            x-tenant-id:
              exact: "tenant-b"
      route:
        - destination:
            host: shared-backend
            subset: tenant-b
```

## Performance Patterns

### Pattern 16: Connection Pooling Optimization

**Use Case**: Optimize connection reuse and reduce overhead.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: optimized-connections
spec:
  host: high-traffic-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
        connectTimeout: 30ms
        tcpKeepalive:
          time: 7200s
          interval: 75s
      http:
        http1MaxPendingRequests: 1024
        http2MaxRequests: 1024
        maxRequestsPerConnection: 0 # Unlimited
        maxRetries: 3
        idleTimeout: 3600s
    loadBalancer:
      simple: LEAST_REQUEST
      warmupDurationSecs: 60
```

### Pattern 17: Sidecar Resource Optimization

**Use Case**: Reduce sidecar overhead for high-scale deployments.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: optimized-sidecar
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  egress:
    - hosts:
        - "./my-dependencies.default.svc.cluster.local"
        - "istio-system/*"
    - port:
        number: 443
        protocol: HTTPS
        name: external-https
      hosts:
        - "external-api.com"
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
---
# Pod annotations for resource limits
apiVersion: v1
kind: Pod
metadata:
  annotations:
    sidecar.istio.io/proxyCPU: "50m"
    sidecar.istio.io/proxyMemory: "128Mi"
    sidecar.istio.io/proxyCPULimit: "200m"
    sidecar.istio.io/proxyMemoryLimit: "256Mi"
    sidecar.istio.io/componentLogLevel: "warning"
```

## Testing Patterns

### Pattern 18: Chaos Engineering

**Use Case**: Test resilience by injecting faults.

```yaml
# Inject delays for 50% of requests
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: chaos-delay
spec:
  hosts:
    - backend
  http:
    - fault:
        delay:
          percentage:
            value: 50
          fixedDelay: 5s
      route:
        - destination:
            host: backend
---
# Inject failures for 10% of requests
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: chaos-abort
spec:
  hosts:
    - backend
  http:
    - fault:
        abort:
          percentage:
            value: 10
          httpStatus: 503
      route:
        - destination:
            host: backend
---
# Combine delay and abort
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: chaos-combined
spec:
  hosts:
    - backend
  http:
    - fault:
        delay:
          percentage:
            value: 25
          fixedDelay: 3s
        abort:
          percentage:
            value: 5
          httpStatus: 500
      route:
        - destination:
            host: backend
```

## Best Practices Summary

### Traffic Management

1. Always define both VirtualService and DestinationRule together
2. Use subsets for version management
3. Implement gradual rollouts (10% → 25% → 50% → 100%)
4. Keep traffic weights as percentages that sum to 100
5. Use header-based routing for testing before percentage-based rollouts

### Resilience

1. Set appropriate timeouts (should be less than upstream timeout)
2. Configure retries only for idempotent operations
3. Use circuit breakers to prevent cascade failures
4. Implement graceful degradation strategies
5. Test failure scenarios regularly

### Security

1. Enable strict mTLS mesh-wide
2. Start with deny-all authorization policies
3. Use service accounts for fine-grained access control
4. Implement defense in depth with multiple policy layers
5. Audit all security-related changes

### Observability

1. Start with low sampling rates (1-5%) in production
2. Sample 100% of errors for debugging
3. Use custom metrics for business KPIs
4. Implement structured logging
5. Set up alerting based on SLOs

### Performance

1. Limit sidecar egress configuration to required services
2. Optimize connection pool settings based on load
3. Use appropriate load balancing algorithms
4. Monitor and tune resource limits
5. Regular performance testing under load
