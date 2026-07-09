# Routing: Routers & Services (Kubernetes CRDs)

## IngressRoute (HTTP)

The canonical HTTP route. Multiple `routes` can match different hosts/paths and
attach different middleware chains. This is the base object referenced elsewhere
in this skill.

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

For TLS variants of the `tls:` block (secretName, TLSOption), see [TLS.md](TLS.md).
For the middleware definitions referenced above, see [MIDDLEWARE.md](MIDDLEWARE.md).

## IngressRouteTCP

TCP routing uses `HostSNI` matching. Use `tls.passthrough: true` to forward
encrypted traffic to the backend unchanged.

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

## Load Balancing (TraefikService)

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

Sticky sessions are configured on the service reference inside an IngressRoute
(same structure as the canonical IngressRoute above), adding a `sticky.cookie`:

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
