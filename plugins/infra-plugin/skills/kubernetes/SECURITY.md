# Kubernetes Security Reference

Comprehensive security configurations and best practices for GKE clusters.

## Pod Security

### Pod Security Standards

GKE supports Pod Security Standards (replacement for Pod Security Policies):

**Restricted (most secure):**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

**Baseline (middle ground):**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: baseline
```

### Security Context Best Practices

**Deployment with security hardening:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
spec:
  template:
    spec:
      # Pod-level security
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
        seccompProfile:
          type: RuntimeDefault

      containers:
        - name: app
          image: gcr.io/PROJECT/app:v1

          # Container-level security
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            runAsUser: 1000
            capabilities:
              drop:
                - ALL
              add:
                - NET_BIND_SERVICE # Only if needed

          # Volume mounts for writable directories
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: cache
              mountPath: /app/cache

      volumes:
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}
```

### AppArmor Profiles

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
  annotations:
    container.apparmor.security.beta.kubernetes.io/app: runtime/default
spec:
  containers:
    - name: app
      image: gcr.io/PROJECT/app:v1
```

## Network Security

### Network Policies

**Default deny all ingress:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

**Allow specific ingress:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
```

**Allow from specific namespace:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-monitoring
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: monitoring
```

**Default deny egress with exceptions:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # Allow DNS
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
      ports:
        - protocol: UDP
          port: 53
    # Allow access to specific service
    - to:
        - podSelector:
            matchLabels:
              app: database
      ports:
        - protocol: TCP
          port: 5432
```

### GKE Dataplane V2

Enable for improved network security and observability:

```bash
gcloud container clusters create my-cluster \
  --enable-dataplane-v2 \
  --region us-central1
```

Benefits:

- eBPF-based networking
- Better network policy performance
- Enhanced observability
- Lower latency

## Workload Identity

### Setup Workload Identity

1. Enable on cluster:

```bash
gcloud container clusters update CLUSTER_NAME \
  --workload-pool=PROJECT_ID.svc.id.goog \
  --region REGION
```

2. Create Kubernetes service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  namespace: production
```

3. Create GCP service account:

```bash
gcloud iam service-accounts create app-sa \
  --display-name="Application Service Account"
```

4. Grant GCP permissions:

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:app-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

5. Bind accounts:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  app-sa@PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:PROJECT_ID.svc.id.goog[production/app-sa]"
```

6. Annotate K8s service account:

```bash
kubectl annotate serviceaccount app-sa \
  iam.gke.io/gcp-service-account=app-sa@PROJECT_ID.iam.gserviceaccount.com \
  -n production
```

7. Use in pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  namespace: production
spec:
  serviceAccountName: app-sa
  containers:
    - name: app
      image: gcr.io/PROJECT/app:v1
```

### Least Privilege IAM

**Principle:** Grant minimum required permissions.

**Bad (too broad):**

```bash
# Don't do this
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:app-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/editor"
```

**Good (specific):**

```bash
# Grant only needed permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:app-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# For specific bucket
gsutil iam ch \
  serviceAccount:app-sa@PROJECT_ID.iam.gserviceaccount.com:objectViewer \
  gs://my-bucket
```

## Secrets Management

### GCP Secret Manager Integration

**Install External Secrets Operator:**

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace
```

**Create SecretStore:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcpsm-secret-store
  namespace: production
spec:
  provider:
    gcpsm:
      projectID: "PROJECT_ID"
      auth:
        workloadIdentity:
          clusterLocation: us-central1
          clusterName: my-cluster
          serviceAccountRef:
            name: external-secrets-sa
```

**Create ExternalSecret:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: gcpsm-secret-store
    kind: SecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
    - secretKey: database-password
      remoteRef:
        key: db-password
    - secretKey: api-key
      remoteRef:
        key: external-api-key
```

### Kubernetes Secrets Best Practices

**Encrypt secrets at rest:**

```bash
gcloud container clusters update CLUSTER_NAME \
  --database-encryption-key projects/PROJECT_ID/locations/REGION/keyRings/RING/cryptoKeys/KEY \
  --region REGION
```

**Use sealed secrets for git storage:**

```bash
# Install sealed secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/controller.yaml

# Seal a secret
kubeseal --format yaml < secret.yaml > sealed-secret.yaml
```

**Never commit plain secrets to git:**

```bash
# Add to .gitignore
echo "secret*.yaml" >> .gitignore
echo "!sealed-secret*.yaml" >> .gitignore
```

## Binary Authorization

Enforce deployment policies using Binary Authorization.

### Enable Binary Authorization

```bash
gcloud container clusters update CLUSTER_NAME \
  --enable-binauthz \
  --region REGION
```

### Create Policy

```yaml
# policy.yaml
admissionWhitelistPatterns:
  - namePattern: gcr.io/PROJECT_ID/*
  - namePattern: gcr.io/google-containers/*
  - namePattern: k8s.gcr.io/*

defaultAdmissionRule:
  requireAttestationsBy:
    - projects/PROJECT_ID/attestors/prod-attestor
  evaluationMode: REQUIRE_ATTESTATION
  enforcementMode: ENFORCED_BLOCK_AND_AUDIT_LOG

clusterAdmissionRules:
  us-central1-a.my-cluster:
    evaluationMode: REQUIRE_ATTESTATION
    enforcementMode: ENFORCED_BLOCK_AND_AUDIT_LOG
    requireAttestationsBy:
      - projects/PROJECT_ID/attestors/prod-attestor
```

Apply policy:

```bash
gcloud container binauthz policy import policy.yaml
```

### Create Attestor

```bash
# Create attestor
gcloud container binauthz attestors create prod-attestor \
  --attestation-authority-note=prod-note \
  --attestation-authority-note-project=PROJECT_ID

# Create note
gcloud container binauthz notes create prod-note \
  --attestation-authority-hint="Production attestations"
```

## RBAC (Role-Based Access Control)

### Namespace-scoped Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
```

### RoleBinding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: production
subjects:
  - kind: User
    name: developer@example.com
    apiGroup: rbac.authorization.k8s.io
  - kind: ServiceAccount
    name: monitoring-sa
    namespace: monitoring
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

### ClusterRole for broader access

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-admin
rules:
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["pods", "services", "deployments"]
    verbs: ["*"]
```

### Google Groups for GKE

Bind RBAC to Google Groups:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: developers-binding
subjects:
  - kind: Group
    name: developers@example.com
roleRef:
  kind: ClusterRole
  name: edit
  apiGroup: rbac.authorization.k8s.io
```

## Audit Logging

### Enable Kubernetes Audit Logs

```bash
gcloud container clusters update CLUSTER_NAME \
  --enable-cloud-logging \
  --logging=SYSTEM,WORKLOAD,API_SERVER \
  --region REGION
```

### View audit logs

```bash
gcloud logging read \
  'resource.type="k8s_cluster" AND protoPayload.methodName="io.k8s.core.v1.pods.create"' \
  --limit 10 \
  --format json
```

### Create audit policy for specific events

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["secrets", "configmaps"]
  - level: Metadata
    resources:
      - group: ""
        resources: ["pods"]
  - level: None
    resources:
      - group: ""
        resources: ["endpoints"]
```

## Security Scanning

### Vulnerability Scanning

Enable container scanning in Artifact Registry:

```bash
gcloud artifacts repositories create my-repo \
  --repository-format=docker \
  --location=us-central1 \
  --enable-vulnerability-scanning
```

View vulnerabilities:

```bash
gcloud artifacts docker images list us-central1-docker.pkg.dev/PROJECT/my-repo \
  --show-all-metadata \
  --format=json | jq '.[]|.vulnerabilitySummary'
```

### Admission Controller (OPA/Gatekeeper)

Install Gatekeeper:

```bash
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/deploy/gatekeeper.yaml
```

**Constraint Template (require labels):**

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels
        violation[{"msg": msg}] {
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing required labels: %v", [missing])
        }
```

**Constraint (enforce template):**

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-labels
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
    namespaces:
      - production
  parameters:
    labels:
      - app
      - owner
      - environment
```

## GKE Security Posture

Enable security posture dashboard:

```bash
gcloud container clusters update CLUSTER_NAME \
  --enable-security-posture \
  --region REGION
```

Features:

- Vulnerability detection
- Security configuration insights
- Compliance monitoring
- Threat detection

## Shielded GKE Nodes

Enable shielded nodes for additional security:

```bash
gcloud container clusters create CLUSTER_NAME \
  --enable-shielded-nodes \
  --region REGION
```

Features:

- Secure Boot
- Virtual Trusted Platform Module (vTPM)
- Integrity monitoring

## Security Checklist

### Cluster Level

- [ ] Enable Workload Identity
- [ ] Enable Binary Authorization
- [ ] Use private clusters
- [ ] Enable shielded nodes
- [ ] Configure authorized networks
- [ ] Enable audit logging
- [ ] Use Dataplane V2
- [ ] Enable security posture dashboard

### Namespace Level

- [ ] Apply Pod Security Standards
- [ ] Configure resource quotas
- [ ] Set up network policies
- [ ] Limit default service account permissions

### Pod Level

- [ ] Run as non-root
- [ ] Use read-only root filesystem
- [ ] Drop all capabilities
- [ ] Set resource limits
- [ ] Use security contexts
- [ ] Configure health checks

### Secrets Management

- [ ] Use Secret Manager or External Secrets
- [ ] Enable encryption at rest
- [ ] Rotate secrets regularly
- [ ] Use Workload Identity (no service account keys)

### Network Security

- [ ] Default deny network policies
- [ ] Limit ingress/egress
- [ ] Use TLS for service-to-service communication
- [ ] Enable Dataplane V2

### Access Control

- [ ] Use RBAC with least privilege
- [ ] Bind to Google Groups
- [ ] Regular access reviews
- [ ] Enable MFA for cluster access

### Monitoring

- [ ] Enable Cloud Logging
- [ ] Enable Cloud Monitoring
- [ ] Set up security alerts
- [ ] Monitor vulnerability scans

## References

- [GKE Hardening Guide](https://cloud.google.com/kubernetes-engine/docs/how-to/hardening-your-cluster)
- [Workload Identity](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)
- [Binary Authorization](https://cloud.google.com/binary-authorization/docs)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
