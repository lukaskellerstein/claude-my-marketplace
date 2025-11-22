# CI/CD and GitOps Reference

Continuous deployment patterns and GitOps workflows for GKE.

## GitOps with Cloud Build

### Basic Cloud Build Pipeline

**cloudbuild.yaml:**

```yaml
steps:
  # Build container image
  - name: "gcr.io/cloud-builders/docker"
    args: ["build", "-t", "gcr.io/$PROJECT_ID/my-app:$SHORT_SHA", "."]

  # Push to Container Registry
  - name: "gcr.io/cloud-builders/docker"
    args: ["push", "gcr.io/$PROJECT_ID/my-app:$SHORT_SHA"]

  # Update Kubernetes manifest
  - name: "gcr.io/cloud-builders/gcloud"
    entrypoint: "bash"
    args:
      - "-c"
      - |
        sed -i "s|IMAGE_TAG|gcr.io/$PROJECT_ID/my-app:$SHORT_SHA|g" k8s/deployment.yaml

  # Deploy to GKE
  - name: "gcr.io/cloud-builders/kubectl"
    args:
      - "apply"
      - "-f"
      - "k8s/"
    env:
      - "CLOUDSDK_COMPUTE_REGION=us-central1"
      - "CLOUDSDK_CONTAINER_CLUSTER=my-cluster"

images:
  - "gcr.io/$PROJECT_ID/my-app:$SHORT_SHA"

options:
  logging: CLOUD_LOGGING_ONLY
```

### Multi-environment deployment

**cloudbuild-staging.yaml:**

```yaml
steps:
  - name: "gcr.io/cloud-builders/docker"
    args: ["build", "-t", "gcr.io/$PROJECT_ID/my-app:$SHORT_SHA", "."]

  - name: "gcr.io/cloud-builders/docker"
    args: ["push", "gcr.io/$PROJECT_ID/my-app:$SHORT_SHA"]

  # Deploy to staging
  - name: "gcr.io/cloud-builders/kubectl"
    args:
      - "set"
      - "image"
      - "deployment/my-app"
      - "app=gcr.io/$PROJECT_ID/my-app:$SHORT_SHA"
      - "-n"
      - "staging"
    env:
      - "CLOUDSDK_COMPUTE_REGION=us-central1"
      - "CLOUDSDK_CONTAINER_CLUSTER=staging-cluster"

  # Run integration tests
  - name: "gcr.io/$PROJECT_ID/test-runner"
    args: ["run", "integration-tests", "--env=staging"]

images:
  - "gcr.io/$PROJECT_ID/my-app:$SHORT_SHA"
```

**cloudbuild-prod.yaml:**

```yaml
steps:
  - name: "gcr.io/cloud-builders/kubectl"
    args:
      - "set"
      - "image"
      - "deployment/my-app"
      - "app=gcr.io/$PROJECT_ID/my-app:$TAG_NAME"
      - "-n"
      - "production"
    env:
      - "CLOUDSDK_COMPUTE_REGION=us-central1"
      - "CLOUDSDK_CONTAINER_CLUSTER=prod-cluster"

  # Wait for rollout
  - name: "gcr.io/cloud-builders/kubectl"
    args:
      - "rollout"
      - "status"
      - "deployment/my-app"
      - "-n"
      - "production"
    env:
      - "CLOUDSDK_COMPUTE_REGION=us-central1"
      - "CLOUDSDK_CONTAINER_CLUSTER=prod-cluster"

  # Run smoke tests
  - name: "gcr.io/$PROJECT_ID/test-runner"
    args: ["run", "smoke-tests", "--env=production"]
```

### Triggers setup

```bash
# Trigger on push to main (staging)
gcloud builds triggers create github \
  --repo-name=my-app \
  --repo-owner=my-org \
  --branch-pattern="^main$" \
  --build-config=cloudbuild-staging.yaml

# Trigger on tag (production)
gcloud builds triggers create github \
  --repo-name=my-app \
  --repo-owner=my-org \
  --tag-pattern="^v[0-9]+\.[0-9]+\.[0-9]+$" \
  --build-config=cloudbuild-prod.yaml
```

## GitOps with Flux

### Install Flux

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Bootstrap Flux
flux bootstrap github \
  --owner=my-org \
  --repository=gitops-repo \
  --branch=main \
  --path=clusters/production \
  --personal
```

### Repository Structure

```
gitops-repo/
├── clusters/
│   ├── production/
│   │   ├── flux-system/
│   │   └── apps/
│   └── staging/
│       ├── flux-system/
│       └── apps/
├── apps/
│   ├── my-app/
│   │   ├── base/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── kustomization.yaml
│   │   ├── staging/
│   │   │   └── kustomization.yaml
│   │   └── production/
│   │       └── kustomization.yaml
│   └── other-app/
└── infrastructure/
    ├── namespaces/
    ├── rbac/
    └── network-policies/
```

### Flux GitRepository

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/my-org/my-app
  ref:
    branch: main
```

### Flux Kustomization

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  path: ./k8s
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-app
  validation: client
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: production
```

### Flux ImageRepository and Policy

**Automatically update images:**

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: gcr.io/PROJECT_ID/my-app
  interval: 1m

---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: 1.x.x

---
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageUpdateAutomation
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m
  sourceRef:
    kind: GitRepository
    name: gitops-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxbot@example.com
        name: Flux Bot
      messageTemplate: "[ci skip] Update image {{range .Updated.Images}}{{println .}}{{end}}"
    push:
      branch: main
  update:
    path: ./clusters/production/apps
    strategy: Setters
```

## GitOps with Argo CD

### Install Argo CD

```bash
# Create namespace
kubectl create namespace argocd

# Install Argo CD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port forward to access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

### Argo CD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/my-app
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### Argo CD with Helm

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-helm-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://charts.example.com
    chart: my-chart
    targetRevision: 1.2.3
    helm:
      values: |
        replicaCount: 3
        image:
          repository: gcr.io/PROJECT_ID/my-app
          tag: v1.2.3
        resources:
          limits:
            memory: 512Mi
            cpu: 500m
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Multi-environment with Argo CD

**App of Apps pattern:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: staging-apps
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/gitops
    targetRevision: main
    path: apps/staging
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Canary Deployments with Flagger

### Install Flagger

```bash
# Add Flagger Helm repository
helm repo add flagger https://flagger.app

# Install Flagger
helm upgrade -i flagger flagger/flagger \
  --namespace istio-system \
  --set meshProvider=istio \
  --set metricsServer=http://prometheus:9090
```

### Canary Resource

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    webhooks:
      - name: load-test
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.production/"
```

### Blue-Green Deployment

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 10
    iterations: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
    webhooks:
      - name: smoke-test
        url: http://flagger-loadtester/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sd 'test' http://my-app-canary/token | grep token"
  strategy:
    blueGreen:
      enabled: true
```

## Rolling Updates

### Deployment Strategy

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2 # Max new pods during update
      maxUnavailable: 1 # Max unavailable during update
  template:
    spec:
      containers:
        - name: app
          image: gcr.io/PROJECT_ID/my-app:v2
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Monitor rollout

```bash
# Watch rollout status
kubectl rollout status deployment/my-app -n production

# View rollout history
kubectl rollout history deployment/my-app -n production

# Rollback to previous version
kubectl rollout undo deployment/my-app -n production

# Rollback to specific revision
kubectl rollout undo deployment/my-app --to-revision=3 -n production

# Pause rollout
kubectl rollout pause deployment/my-app -n production

# Resume rollout
kubectl rollout resume deployment/my-app -n production
```

## Testing in CI/CD

### Integration Tests

```yaml
# cloudbuild-test.yaml
steps:
  # Deploy to test environment
  - name: "gcr.io/cloud-builders/kubectl"
    args:
      - "apply"
      - "-f"
      - "k8s/test/"
    env:
      - "CLOUDSDK_COMPUTE_REGION=us-central1"
      - "CLOUDSDK_CONTAINER_CLUSTER=test-cluster"

  # Wait for deployment
  - name: "gcr.io/cloud-builders/kubectl"
    args:
      - "wait"
      - "--for=condition=available"
      - "--timeout=300s"
      - "deployment/my-app"
      - "-n"
      - "test"
    env:
      - "CLOUDSDK_COMPUTE_REGION=us-central1"
      - "CLOUDSDK_CONTAINER_CLUSTER=test-cluster"

  # Run tests
  - name: "gcr.io/$PROJECT_ID/test-runner"
    args:
      - "pytest"
      - "tests/integration/"
      - "--env=test"
      - "--junitxml=test-results.xml"

  # Cleanup
  - name: "gcr.io/cloud-builders/kubectl"
    args:
      - "delete"
      - "-f"
      - "k8s/test/"
    env:
      - "CLOUDSDK_COMPUTE_REGION=us-central1"
      - "CLOUDSDK_CONTAINER_CLUSTER=test-cluster"
```

## Secrets in CI/CD

### Use Secret Manager in Cloud Build

```yaml
availableSecrets:
  secretManager:
    - versionName: projects/PROJECT_ID/secrets/db-password/versions/latest
      env: "DB_PASSWORD"

steps:
  - name: "gcr.io/cloud-builders/kubectl"
    entrypoint: "bash"
    args:
      - "-c"
      - |
        kubectl create secret generic app-secrets \
          --from-literal=db-password=$$DB_PASSWORD \
          --dry-run=client -o yaml | kubectl apply -f -
    secretEnv: ["DB_PASSWORD"]
    env:
      - "CLOUDSDK_COMPUTE_REGION=us-central1"
      - "CLOUDSDK_CONTAINER_CLUSTER=my-cluster"
```

### Sealed Secrets in GitOps

```bash
# Install kubeseal
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/kubeseal-linux-amd64
sudo install -m 755 kubeseal-linux-amd64 /usr/local/bin/kubeseal

# Create sealed secret
kubectl create secret generic app-secret \
  --from-literal=api-key=secret123 \
  --dry-run=client -o yaml | \
  kubeseal -o yaml > sealed-secret.yaml

# Commit to git
git add sealed-secret.yaml
git commit -m "Add sealed secret"
git push
```

## GitHub Actions for GKE

```yaml
name: Deploy to GKE

on:
  push:
    branches: [main]

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT }}
  GKE_CLUSTER: my-cluster
  GKE_REGION: us-central1
  IMAGE: my-app

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT }}

      - name: Configure Docker
        run: gcloud auth configure-docker

      - name: Build
        run: |
          docker build -t gcr.io/$PROJECT_ID/$IMAGE:$GITHUB_SHA .

      - name: Push
        run: |
          docker push gcr.io/$PROJECT_ID/$IMAGE:$GITHUB_SHA

      - name: Get GKE credentials
        run: |
          gcloud container clusters get-credentials $GKE_CLUSTER \
            --region $GKE_REGION

      - name: Deploy
        run: |
          kubectl set image deployment/$IMAGE $IMAGE=gcr.io/$PROJECT_ID/$IMAGE:$GITHUB_SHA
          kubectl rollout status deployment/$IMAGE
```

## Best Practices

1. **Immutable infrastructure**: Never modify running deployments, always deploy new versions
2. **Git as source of truth**: All configuration in git, deployed via GitOps
3. **Automated testing**: Run tests before production deployment
4. **Progressive delivery**: Use canary or blue-green deployments
5. **Rollback strategy**: Maintain ability to quickly rollback
6. **Environment parity**: Keep environments as similar as possible
7. **Secrets management**: Use Secret Manager, never commit secrets
8. **Audit trail**: All changes tracked in git with proper commit messages

## References

- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Flux Documentation](https://fluxcd.io/docs/)
- [Argo CD Documentation](https://argo-cd.readthedocs.io/)
- [Flagger Documentation](https://docs.flagger.app/)
