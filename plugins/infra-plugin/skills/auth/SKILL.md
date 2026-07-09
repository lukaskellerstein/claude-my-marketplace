---
name: auth
description: Authentication/authorization infra with Keycloak and OAuth2-proxy. Use for identity providers, SSO, OIDC/SAML, realm/client config, user federation, and OAuth2-proxy sidecar or ingress auth on Kubernetes.
---

# Authentication Infrastructure

Guidance for deploying and managing authentication infrastructure using **Keycloak** as the identity provider and **OAuth2-proxy** for application-level authentication on Kubernetes. Start with the Quick Start below, then load the topic file that matches your task from the Reference files table below.

## Quick Start

**Install Keycloak (Helm):**

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm install keycloak bitnami/keycloak \
  -n auth --create-namespace \
  -f keycloak-values.yaml
```

**Install OAuth2-proxy (Helm):**

```bash
helm repo add oauth2-proxy https://oauth2-proxy.github.io/manifests
helm repo update
helm install oauth2-proxy oauth2-proxy/oauth2-proxy \
  -n auth --create-namespace \
  -f oauth2-proxy-values.yaml
```

**Get a Keycloak admin token:**

```bash
TOKEN=$(curl -s -X POST "https://auth.example.com/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=$ADMIN_PASSWORD" \
  -d "grant_type=password" | jq -r '.access_token')
```

**Verify OIDC discovery for a realm:**

```bash
curl -s "https://auth.example.com/realms/my-app/.well-known/openid-configuration" | jq .
```

## Reference files

| File | Read it when you need to... |
| --- | --- |
| [KEYCLOAK.md](KEYCLOAK.md) | Deploy Keycloak (Helm or raw K8s), configure realms, create OIDC/SAML clients, set up LDAP/AD user federation, or troubleshoot Keycloak. |
| [OAUTH2_PROXY.md](OAUTH2_PROXY.md) | Deploy OAuth2-proxy (Helm), run it as a sidecar, wire it into nginx ingress external auth or Istio, or troubleshoot OAuth2-proxy. |

Both reference files define **canonical snippets** (resource requests/limits and `secretKeyRef` env stanzas) once at the top; later examples point back to them rather than repeating the full YAML.

## Security Best Practices

1. **Always use HTTPS** for Keycloak and OAuth2-proxy endpoints
2. **Rotate secrets regularly** — client secrets, cookie secrets, admin passwords
3. **Use short-lived tokens** — configure access token lifespan (5-15 minutes)
4. **Enable brute force protection** in Keycloak realm settings
5. **Restrict redirect URIs** — never use wildcards in production
6. **Use secure cookie settings** — httpOnly, secure, sameSite=lax
7. **Enable audit logging** in Keycloak for compliance
8. **Use workload identity** for Keycloak's database access on GKE
