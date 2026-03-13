---
name: auth-infrastructure
description: Authentication and authorization infrastructure using Keycloak and OAuth2-proxy. Use when setting up identity providers, SSO, OIDC/SAML integration, user federation, realm configuration, OAuth2-proxy sidecar patterns, or securing applications with external authentication. Covers Keycloak deployment on Kubernetes, realm/client configuration, and OAuth2-proxy integration for protecting web applications.
---

# Authentication Infrastructure

Comprehensive guidance for deploying and managing authentication infrastructure using Keycloak as the identity provider and OAuth2-proxy for application-level authentication.

## Keycloak

### Deployment on Kubernetes

**Helm installation:**

```bash
# Add Bitnami repo
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install Keycloak
helm install keycloak bitnami/keycloak \
  -n auth --create-namespace \
  -f keycloak-values.yaml
```

**Production values (keycloak-values.yaml):**

```yaml
auth:
  adminUser: admin
  existingSecret: keycloak-admin-secret

production: true
proxy: edge

replicaCount: 2

postgresql:
  enabled: true
  auth:
    existingSecret: keycloak-db-secret

resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"

ingress:
  enabled: true
  hostname: auth.example.com
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  tls: true
```

**Raw Kubernetes deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: keycloak
  namespace: auth
spec:
  replicas: 2
  selector:
    matchLabels:
      app: keycloak
  template:
    metadata:
      labels:
        app: keycloak
    spec:
      containers:
        - name: keycloak
          image: quay.io/keycloak/keycloak:latest
          args: ["start"]
          env:
            - name: KC_HOSTNAME
              value: "auth.example.com"
            - name: KC_PROXY
              value: "edge"
            - name: KC_DB
              value: "postgres"
            - name: KC_DB_URL
              value: "jdbc:postgresql://postgres-svc:5432/keycloak"
            - name: KC_DB_USERNAME
              valueFrom:
                secretKeyRef:
                  name: keycloak-db-secret
                  key: username
            - name: KC_DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: keycloak-db-secret
                  key: password
            - name: KEYCLOAK_ADMIN
              valueFrom:
                secretKeyRef:
                  name: keycloak-admin-secret
                  key: username
            - name: KEYCLOAK_ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: keycloak-admin-secret
                  key: password
          ports:
            - containerPort: 8080
              name: http
          readinessProbe:
            httpGet:
              path: /realms/master
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /realms/master
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 30
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
```

### Realm Configuration

**Create a realm via REST API:**

```bash
# Get admin token
TOKEN=$(curl -s -X POST "https://auth.example.com/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=$ADMIN_PASSWORD" \
  -d "grant_type=password" | jq -r '.access_token')

# Create realm
curl -s -X POST "https://auth.example.com/admin/realms" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "realm": "my-app",
    "enabled": true,
    "registrationAllowed": false,
    "loginWithEmailAllowed": true,
    "duplicateEmailsAllowed": false,
    "sslRequired": "external"
  }'
```

**Realm JSON export/import:**

```json
{
  "realm": "my-app",
  "enabled": true,
  "sslRequired": "external",
  "registrationAllowed": false,
  "loginWithEmailAllowed": true,
  "roles": {
    "realm": [
      { "name": "user", "description": "Regular user" },
      { "name": "admin", "description": "Administrator" }
    ]
  },
  "defaultRoles": ["user"],
  "clients": [
    {
      "clientId": "my-web-app",
      "enabled": true,
      "protocol": "openid-connect",
      "publicClient": false,
      "redirectUris": ["https://app.example.com/*"],
      "webOrigins": ["https://app.example.com"],
      "standardFlowEnabled": true,
      "directAccessGrantsEnabled": false
    }
  ]
}
```

### Client Configuration

**OIDC client for web applications:**

```bash
# Create client
curl -s -X POST "https://auth.example.com/admin/realms/my-app/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "my-web-app",
    "enabled": true,
    "protocol": "openid-connect",
    "publicClient": false,
    "secret": "CLIENT_SECRET_HERE",
    "redirectUris": ["https://app.example.com/oauth2/callback"],
    "webOrigins": ["https://app.example.com"],
    "standardFlowEnabled": true,
    "directAccessGrantsEnabled": false,
    "serviceAccountsEnabled": false,
    "authorizationServicesEnabled": false
  }'
```

**SAML client for enterprise SSO:**

```bash
curl -s -X POST "https://auth.example.com/admin/realms/my-app/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "https://sp.example.com/saml/metadata",
    "protocol": "saml",
    "enabled": true,
    "attributes": {
      "saml.assertion.signature": "true",
      "saml.force.post.binding": "true",
      "saml_name_id_format": "email"
    },
    "redirectUris": ["https://sp.example.com/saml/acs"]
  }'
```

### User Federation

**LDAP federation:**

```json
{
  "name": "corporate-ldap",
  "providerId": "ldap",
  "providerType": "org.keycloak.storage.UserStorageProvider",
  "config": {
    "vendor": ["ad"],
    "connectionUrl": ["ldaps://ldap.corp.example.com:636"],
    "bindDn": ["cn=service-account,ou=services,dc=corp,dc=example,dc=com"],
    "usersDn": ["ou=users,dc=corp,dc=example,dc=com"],
    "userObjectClasses": ["person, organizationalPerson, user"],
    "usernameLDAPAttribute": ["sAMAccountName"],
    "uuidLDAPAttribute": ["objectGUID"],
    "searchScope": ["2"],
    "importEnabled": ["true"],
    "syncRegistrations": ["false"],
    "editMode": ["READ_ONLY"]
  }
}
```

### Troubleshooting Keycloak

```bash
# Check Keycloak logs
kubectl logs -l app=keycloak -n auth --tail=100

# Check realm configuration
curl -s "https://auth.example.com/realms/my-app/.well-known/openid-configuration" | jq .

# Test token exchange
curl -s -X POST "https://auth.example.com/realms/my-app/protocol/openid-connect/token" \
  -d "client_id=my-web-app" \
  -d "client_secret=CLIENT_SECRET" \
  -d "grant_type=client_credentials" | jq .

# Decode JWT token
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
```

---

## OAuth2-proxy

### Deployment on Kubernetes

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

resources:
  requests:
    memory: "64Mi"
    cpu: "50m"
  limits:
    memory: "128Mi"
    cpu: "100m"

replicaCount: 2
```

### Sidecar Pattern

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
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
```

### Nginx Ingress Integration

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

### Istio Integration

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

### Troubleshooting OAuth2-proxy

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

## Security Best Practices

1. **Always use HTTPS** for Keycloak and OAuth2-proxy endpoints
2. **Rotate secrets regularly** — client secrets, cookie secrets, admin passwords
3. **Use short-lived tokens** — configure access token lifespan (5-15 minutes)
4. **Enable brute force protection** in Keycloak realm settings
5. **Restrict redirect URIs** — never use wildcards in production
6. **Use secure cookie settings** — httpOnly, secure, sameSite=lax
7. **Enable audit logging** in Keycloak for compliance
8. **Use workload identity** for Keycloak's database access on GKE
