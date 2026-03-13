---
name: traefik-proxy
description: Traefik reverse proxy and ingress controller for Kubernetes and Docker environments. Use when configuring Traefik as an ingress controller, setting up routing rules, TLS termination, middleware chains, load balancing, rate limiting, circuit breakers, or troubleshooting Traefik issues. Covers both Kubernetes CRDs (IngressRoute) and file-based configuration.
---

# Traefik Reverse Proxy

Comprehensive guidance for deploying and managing Traefik as a reverse proxy and ingress controller.

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

## Kubernetes CRDs

### IngressRoute (HTTP)

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: my-app
  namespace: my-app
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`app.example.com`)
      kind: Rule
      services:
        - name: my-app-svc
          port: 80
      middlewares:
        - name: rate-limit
        - name: headers-security
    - match: Host(`app.example.com`) && PathPrefix(`/api`)
      kind: Rule
      services:
        - name: api-svc
          port: 8080
      middlewares:
        - name: strip-prefix-api
        - name: rate-limit
  tls:
    certResolver: letsencrypt
```

### IngressRouteTCP

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRouteTCP
metadata:
  name: postgres
  namespace: database
spec:
  entryPoints:
    - postgres
  routes:
    - match: HostSNI(`db.example.com`)
      services:
        - name: postgres-svc
          port: 5432
  tls:
    passthrough: true
```

### TLS Configuration

**Let's Encrypt with cert-manager:**

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: traefik
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: my-app
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`app.example.com`)
      kind: Rule
      services:
        - name: my-app-svc
          port: 80
  tls:
    secretName: app-tls-cert
```

**TLS options (min version, ciphers):**

```yaml
apiVersion: traefik.io/v1alpha1
kind: TLSOption
metadata:
  name: strict-tls
  namespace: traefik
spec:
  minVersion: VersionTLS12
  cipherSuites:
    - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
    - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
    - TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
  sniStrict: true
```

## Middleware

### Rate limiting

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: rate-limit
spec:
  rateLimit:
    average: 100
    burst: 50
    period: 1m
    sourceCriterion:
      ipStrategy:
        depth: 1
```

### Security headers

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: headers-security
spec:
  headers:
    frameDeny: true
    contentTypeNosniff: true
    browserXssFilter: true
    referrerPolicy: "strict-origin-when-cross-origin"
    customResponseHeaders:
      X-Robots-Tag: "noindex,nofollow"
    stsSeconds: 31536000
    stsIncludeSubdomains: true
    stsPreload: true
    forceSTSHeader: true
```

### Authentication (Basic Auth)

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: basic-auth
spec:
  basicAuth:
    secret: auth-secret
---
apiVersion: v1
kind: Secret
metadata:
  name: auth-secret
type: Opaque
data:
  users: |
    # htpasswd -nb user password | base64
    dXNlcjokYXByMSRrZXkkLi4uCg==
```

### Forward Auth (OAuth2-proxy integration)

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: oauth2-auth
spec:
  forwardAuth:
    address: http://oauth2-proxy.auth.svc.cluster.local:4180/oauth2/auth
    trustForwardHeader: true
    authResponseHeaders:
      - X-Auth-Request-User
      - X-Auth-Request-Email
      - X-Auth-Request-Access-Token
```

### Strip prefix

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: strip-prefix-api
spec:
  stripPrefix:
    prefixes:
      - /api
```

### Circuit breaker

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: circuit-breaker
spec:
  circuitBreaker:
    expression: "LatencyAtQuantileMS(50.0) > 1000 || ResponseCodeRatio(500, 600, 0, 600) > 0.3"
```

### Retry

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: retry
spec:
  retry:
    attempts: 3
    initialInterval: 100ms
```

### Compress

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: compress
spec:
  compress:
    excludedContentTypes:
      - text/event-stream
```

### Middleware chains

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: secure-chain
spec:
  chain:
    middlewares:
      - name: rate-limit
      - name: headers-security
      - name: compress
```

## Load Balancing

### Weighted round robin

```yaml
apiVersion: traefik.io/v1alpha1
kind: TraefikService
metadata:
  name: weighted-svc
spec:
  weighted:
    services:
      - name: app-v1
        port: 80
        weight: 80
      - name: app-v2
        port: 80
        weight: 20
```

### Mirroring (shadow traffic)

```yaml
apiVersion: traefik.io/v1alpha1
kind: TraefikService
metadata:
  name: mirror-svc
spec:
  mirroring:
    name: app-primary
    port: 80
    mirrors:
      - name: app-canary
        port: 80
        percent: 10
```

### Sticky sessions

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: sticky-app
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`app.example.com`)
      kind: Rule
      services:
        - name: my-app-svc
          port: 80
          sticky:
            cookie:
              name: srv_id
              secure: true
              httpOnly: true
```

## File-based Configuration (Docker/Standalone)

### Static configuration (traefik.yml)

```yaml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web

providers:
  file:
    directory: /etc/traefik/dynamic
    watch: true
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false

api:
  dashboard: true
  insecure: false

log:
  level: INFO

accessLog:
  filePath: /var/log/traefik/access.log

metrics:
  prometheus:
    entryPoint: metrics
```

### Dynamic configuration

```yaml
# /etc/traefik/dynamic/routes.yml
http:
  routers:
    my-app:
      rule: "Host(`app.example.com`)"
      service: my-app
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      middlewares:
        - rate-limit
        - security-headers

  services:
    my-app:
      loadBalancer:
        servers:
          - url: "http://backend1:8080"
          - url: "http://backend2:8080"
        healthCheck:
          path: /health
          interval: "10s"
          timeout: "3s"

  middlewares:
    rate-limit:
      rateLimit:
        average: 100
        burst: 50
    security-headers:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
```

### Docker Compose

```yaml
services:
  traefik:
    image: traefik:v3.0
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/etc/traefik/traefik.yml:ro
      - ./dynamic:/etc/traefik/dynamic:ro
      - letsencrypt:/letsencrypt
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`traefik.example.com`)"
      - "traefik.http.routers.dashboard.service=api@internal"
      - "traefik.http.routers.dashboard.middlewares=auth"

  my-app:
    image: my-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.my-app.rule=Host(`app.example.com`)"
      - "traefik.http.routers.my-app.entrypoints=websecure"
      - "traefik.http.routers.my-app.tls.certresolver=letsencrypt"
      - "traefik.http.services.my-app.loadbalancer.server.port=8080"

volumes:
  letsencrypt:
```

## Monitoring

### Prometheus metrics

Traefik exposes metrics at the `/metrics` endpoint:

```yaml
# ServiceMonitor for Prometheus Operator
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: traefik
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: traefik
  endpoints:
    - port: metrics
      interval: 30s
```

### Key metrics to monitor

- `traefik_entrypoint_requests_total` — total requests per entrypoint
- `traefik_service_requests_total` — requests per service (with status codes)
- `traefik_entrypoint_request_duration_seconds` — request latency
- `traefik_service_open_connections` — active connections
- `traefik_tls_certs_not_after` — certificate expiry

## Troubleshooting

```bash
# Check Traefik logs
kubectl logs -l app.kubernetes.io/name=traefik -n traefik --tail=100

# Check loaded configuration
kubectl port-forward -n traefik svc/traefik 9000:9000
# Then visit http://localhost:9000/api/rawdata

# Verify IngressRoute
kubectl get ingressroute -A
kubectl describe ingressroute my-app -n my-app

# Check middleware
kubectl get middleware -A
kubectl describe middleware rate-limit -n my-app

# Check TLS certificates
kubectl get certificates -A
kubectl describe certificate app-tls-cert -n my-app

# Debug routing
# Enable debug logging temporarily
kubectl edit deployment traefik -n traefik
# Set log level to DEBUG
```

## Best Practices

1. **Always redirect HTTP to HTTPS** in production
2. **Use middleware chains** to combine security, rate limiting, and compression
3. **Set resource limits** on Traefik pods
4. **Enable access logs** for debugging and auditing
5. **Use health checks** on backend services
6. **Configure circuit breakers** for unreliable backends
7. **Pin Traefik version** in Helm values — don't use `latest`
8. **Disable the dashboard** in production, or protect it with authentication
9. **Use TLSOption** to enforce minimum TLS 1.2
10. **Monitor certificate expiry** with Prometheus alerts
