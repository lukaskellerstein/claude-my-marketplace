# TLS & Certificates

TLS is attached to a route via the `tls:` block on the canonical IngressRoute
(see [ROUTING.md](ROUTING.md)). There are two common forms:

- `tls.certResolver: letsencrypt` — Traefik's own ACME resolver (see
  [PROVIDERS.md](PROVIDERS.md) for the `certificatesResolvers` static config).
- `tls.secretName: app-tls-cert` — a certificate provisioned externally, e.g.
  by cert-manager (below).

## Let's Encrypt with cert-manager

The `ClusterIssuer` requests certificates via the ACME HTTP-01 challenge; the
IngressRoute then consumes the resulting secret through `tls.secretName`.

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

## TLS options (min version, ciphers)

Reference a `TLSOption` from a route's `tls.options` to enforce a minimum TLS
version and a restricted cipher suite.

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
