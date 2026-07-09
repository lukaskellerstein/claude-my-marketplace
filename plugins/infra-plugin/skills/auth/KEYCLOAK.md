# Keycloak

Deploying and configuring Keycloak as the identity provider on Kubernetes.

## Canonical snippets (reused below)

**Keycloak resource block** — referenced as *[keycloak-resources]* in later examples:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

**DB secret env stanza** — referenced as *[db-secret-env]*:

```yaml
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
```

**Admin secret env stanza** — referenced as *[admin-secret-env]*:

```yaml
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
```

## Deployment on Kubernetes

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

# resources: see [keycloak-resources] canonical block above
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
            # [db-secret-env] — see canonical block above
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
            # [admin-secret-env] — see canonical block above
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
          # resources: see [keycloak-resources] canonical block above
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
```

## Realm Configuration

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

## Client Configuration

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

## User Federation

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

## Troubleshooting Keycloak

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
