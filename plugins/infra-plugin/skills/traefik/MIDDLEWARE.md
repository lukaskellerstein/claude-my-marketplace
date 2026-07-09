# Middlewares

Middlewares are referenced by name from a route (see the canonical IngressRoute
in [ROUTING.md](ROUTING.md)). All examples use `apiVersion: traefik.io/v1alpha1`,
`kind: Middleware`.

## Rate limiting

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

## Security headers

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

## Authentication (Basic Auth)

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

## Forward Auth (OAuth2-proxy integration)

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

## Strip prefix

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

## Circuit breaker

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: circuit-breaker
spec:
  circuitBreaker:
    expression: "LatencyAtQuantileMS(50.0) > 1000 || ResponseCodeRatio(500, 600, 0, 600) > 0.3"
```

## Retry

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

## Compress

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

## Middleware chains

Combine several middlewares into one reusable name:

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
