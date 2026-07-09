# OAuth2-proxy

Protecting web applications with OAuth2-proxy, backed by a Keycloak OIDC provider.

## Canonical snippets (reused below)

**OAuth2-proxy resource block** — referenced as *[proxy-resources]* in later examples:

```yaml
resources:
  requests:
    memory: "64Mi"
    cpu: "50m"
  limits:
    memory: "128Mi"
    cpu: "100m"
```

**Proxy secret env stanza** — referenced as *[proxy-secret-env]*:

```yaml
- name: OAUTH2_PROXY_CLIENT_SECRET
  valueFrom:
    secretKeyRef:
      name: oauth2-proxy-secret
      key: client-secret
- name: OAUTH2_PROXY_COOKIE_SECRET
  valueFrom:
    secretKeyRef:
      name: oauth2-proxy-secret
      key: cookie-secret
```

## Deployment on Kubernetes

**Helm installation:**

```bash
helm repo add oauth2-proxy https://oauth2-proxy.github.io/manifests
helm repo update

helm install oauth2-proxy oauth2-proxy/oauth2-proxy \
  -n auth --create-namespace \
  -f oauth2-proxy-values.yaml
```

**Production values (oauth2-proxy-values.yaml):**

```yaml
config:
  clientID: "my-web-app"
  clientSecret: "CLIENT_SECRET_HERE"
  cookieSecret: "RANDOM_32_BYTE_BASE64"

extraArgs:
  provider: keycloak-oidc
  oidc-issuer-url: "https://auth.example.com/realms/my-app"
  email-domain: "*"
  cookie-secure: "true"
  cookie-httponly: "true"
  cookie-samesite: "lax"
  set-xauthrequest: "true"
  pass-access-token: "true"
  skip-provider-button: "true"

ingress:
  enabled: true
  hosts:
    - auth.example.com
  annotations:
    kubernetes.io/ingress.class: "nginx"

# resources: see [proxy-resources] canonical block above
resources:
  requests:
    memory: "64Mi"
    cpu: "50m"
  limits:
    memory: "128Mi"
    cpu: "100m"

replicaCount: 2
```

## Sidecar Pattern

**Deploy OAuth2-proxy as a sidecar:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-app:latest
          ports:
            - containerPort: 8080
        - name: oauth2-proxy
          image: quay.io/oauth2-proxy/oauth2-proxy:latest
          args:
            - --http-address=0.0.0.0:4180
            - --upstream=http://localhost:8080
            - --provider=keycloak-oidc
            - --oidc-issuer-url=https://auth.example.com/realms/my-app
            - --client-id=my-web-app
            - --email-domain=*
            - --cookie-secure=true
            - --set-xauthrequest=true
            - --pass-access-token=true
          env:
            # [proxy-secret-env] — see canonical block above
            - name: OAUTH2_PROXY_CLIENT_SECRET
              valueFrom:
                secretKeyRef:
                  name: oauth2-proxy-secret
                  key: client-secret
            - name: OAUTH2_PROXY_COOKIE_SECRET
              valueFrom:
                secretKeyRef:
                  name: oauth2-proxy-secret
                  key: cookie-secret
          ports:
            - containerPort: 4180
              name: proxy
          readinessProbe:
            httpGet:
              path: /ping
              port: 4180
            periodSeconds: 10
          # resources: see [proxy-resources] canonical block above
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
```

## Nginx Ingress Integration

**Use OAuth2-proxy as external auth with nginx ingress:**

```yaml
# OAuth2-proxy service
apiVersion: v1
kind: Service
metadata:
  name: oauth2-proxy
  namespace: auth
spec:
  selector:
    app: oauth2-proxy
  ports:
    - port: 4180
      targetPort: 4180
---
# Protected application ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  annotations:
    nginx.ingress.kubernetes.io/auth-url: "https://auth.example.com/oauth2/auth"
    nginx.ingress.kubernetes.io/auth-signin: "https://auth.example.com/oauth2/start?rd=$scheme://$host$escaped_request_uri"
    nginx.ingress.kubernetes.io/auth-response-headers: "X-Auth-Request-User,X-Auth-Request-Email,X-Auth-Request-Access-Token"
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

## Istio Integration

**Use OAuth2-proxy with Istio:**

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: my-app
spec:
  jwtRules:
    - issuer: "https://auth.example.com/realms/my-app"
      jwksUri: "https://auth.example.com/realms/my-app/protocol/openid-connect/certs"
      forwardOriginalToken: true
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-auth
  namespace: my-app
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[realm_access][roles]
          values: ["user", "admin"]
```

## Troubleshooting OAuth2-proxy

```bash
# Check proxy logs
kubectl logs -l app=oauth2-proxy -n auth --tail=100

# Test callback URL
curl -v "https://auth.example.com/oauth2/auth" -H "Cookie: _oauth2_proxy=..."

# Verify OIDC discovery
curl -s "https://auth.example.com/realms/my-app/.well-known/openid-configuration" | jq '.authorization_endpoint, .token_endpoint'

# Check cookie settings
curl -v "https://app.example.com/" 2>&1 | grep -i set-cookie
```
