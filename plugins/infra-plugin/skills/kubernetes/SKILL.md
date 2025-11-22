---
name: kubernetes-gke
description: Kubernetes cluster management and operations with focus on Google Kubernetes Engine (GKE). Use when working with Kubernetes clusters, deployments, services, pods, namespaces, GKE-specific features, kubectl commands, YAML manifests, helm charts, or when troubleshooting Kubernetes issues. Includes GKE autopilot, workload identity, config connector, and GCP integration.
---

# Kubernetes with GKE Focus

Comprehensive guidance for Kubernetes operations with specialized knowledge of Google Kubernetes Engine (GKE) features and best practices.

## Quick Start

### Check cluster status

```bash
# List GKE clusters
gcloud container clusters list

# Get cluster credentials
gcloud container clusters get-credentials CLUSTER_NAME --region REGION

# Verify connection
kubectl cluster-info
kubectl get nodes
```

### Common operations

```bash
# Deploy application
kubectl apply -f deployment.yaml

# Check pod status
kubectl get pods -n NAMESPACE

# View logs
kubectl logs POD_NAME -n NAMESPACE

# Scale deployment
kubectl scale deployment DEPLOYMENT_NAME --replicas=3 -n NAMESPACE
```

## Core Workflows

### 1. Application Deployment

**Standard deployment pattern:**

1. Create namespace (if needed):

```bash
kubectl create namespace my-app
```

2. Apply manifests in order:

```bash
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
```

3. Verify deployment:

```bash
kubectl rollout status deployment/my-app -n my-app
kubectl get all -n my-app
```

### 2. Troubleshooting Pods

**Systematic debugging approach:**

1. Check pod status:

```bash
kubectl get pods -n NAMESPACE
kubectl describe pod POD_NAME -n NAMESPACE
```

2. Review events:

```bash
kubectl get events -n NAMESPACE --sort-by='.lastTimestamp'
```

3. Check logs:

```bash
# Current logs
kubectl logs POD_NAME -n NAMESPACE

# Previous container logs (if crashed)
kubectl logs POD_NAME -n NAMESPACE --previous

# Follow logs
kubectl logs -f POD_NAME -n NAMESPACE

# Multi-container pod
kubectl logs POD_NAME -c CONTAINER_NAME -n NAMESPACE
```

4. Interactive debugging:

```bash
# Execute command in pod
kubectl exec -it POD_NAME -n NAMESPACE -- /bin/sh

# Port forward for local testing
kubectl port-forward POD_NAME 8080:80 -n NAMESPACE
```

### 3. Resource Management

**Check resource usage:**

```bash
# Node resources
kubectl top nodes

# Pod resources
kubectl top pods -n NAMESPACE

# Resource quotas
kubectl get resourcequota -n NAMESPACE

# Limit ranges
kubectl get limitrange -n NAMESPACE
```

## GKE-Specific Features

### Autopilot vs Standard Clusters

**Autopilot clusters:**

- Fully managed node pools
- Automatic scaling and updates
- Pod-based pricing
- Limited node customization
- Use for: simplified operations, cost optimization

**Standard clusters:**

- Full control over nodes
- Custom node pools
- Node-based pricing
- Machine type selection
- Use for: specific hardware requirements, advanced configurations

### Workload Identity

**Enable workload identity for GCP service access:**

1. Enable on cluster:

```bash
gcloud container clusters update CLUSTER_NAME \
  --workload-pool=PROJECT_ID.svc.id.goog \
  --region=REGION
```

2. Create Kubernetes service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-ksa
  namespace: default
```

3. Bind to GCP service account:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  GSA_NAME@PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:PROJECT_ID.svc.id.goog[NAMESPACE/KSA_NAME]"
```

4. Annotate Kubernetes service account:

```bash
kubectl annotate serviceaccount KSA_NAME \
  iam.gke.io/gcp-service-account=GSA_NAME@PROJECT_ID.iam.gserviceaccount.com \
  -n NAMESPACE
```

### GKE Ingress

**Use GKE-managed ingress controller:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "my-static-ip"
spec:
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 80
```

**For HTTPS with managed certificates:**

```yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: my-cert
spec:
  domains:
    - example.com
    - www.example.com
```

Add annotation to Ingress:

```yaml
metadata:
  annotations:
    networking.gke.io/managed-certificates: my-cert
```

### Config Connector

**Manage GCP resources from Kubernetes:**

See [CONFIG_CONNECTOR.md](references/CONFIG_CONNECTOR.md) for complete setup and usage patterns.

### GKE Networking

**Network policies for pod security:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-namespace
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
              name: allowed-namespace
```

**Private clusters:**

- Control plane is private
- Use Cloud NAT for egress
- VPC peering for internal access
- See [PRIVATE_CLUSTERS.md](references/PRIVATE_CLUSTERS.md) for setup

## Manifest Patterns

### Deployment Best Practices

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
        version: v1.2.3
    spec:
      serviceAccountName: my-ksa
      containers:
        - name: app
          image: gcr.io/PROJECT_ID/my-app:v1.2.3
          ports:
            - containerPort: 8080
              name: http
          env:
            - name: ENV_VAR
              valueFrom:
                configMapKeyRef:
                  name: my-config
                  key: config-key
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
      # Security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      # Node affinity for GKE
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: cloud.google.com/gke-nodepool
                    operator: In
                    values:
                      - default-pool
```

### Service Types

**ClusterIP (internal):**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: ClusterIP
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

**LoadBalancer (external):**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-lb-service
  annotations:
    cloud.google.com/load-balancer-type: "Internal" # For internal LB
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

### ConfigMaps and Secrets

**ConfigMap:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
data:
  app.properties: |
    key1=value1
    key2=value2
  config.json: |
    {
      "setting": "value"
    }
```

**Secret (use GCP Secret Manager with workload identity when possible):**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-secret
type: Opaque
data:
  password: BASE64_ENCODED_VALUE
```

## Helm Integration

### Basic Helm operations

```bash
# Add repository
helm repo add stable https://charts.helm.sh/stable
helm repo update

# Install chart
helm install my-release stable/nginx-ingress -n namespace

# Upgrade release
helm upgrade my-release stable/nginx-ingress -n namespace

# List releases
helm list -n namespace

# Uninstall release
helm uninstall my-release -n namespace
```

### Custom values

Create `values.yaml`:

```yaml
replicaCount: 3
image:
  repository: gcr.io/PROJECT_ID/app
  tag: v1.0.0
resources:
  requests:
    memory: 256Mi
    cpu: 250m
```

Install with custom values:

```bash
helm install my-release ./chart -f values.yaml -n namespace
```

## Monitoring and Logging

### GKE Observability

**Cloud Logging:**

```bash
# View logs in Cloud Console
gcloud logging read "resource.type=k8s_container" --limit 50

# Stream logs
gcloud logging read "resource.type=k8s_container" --limit 50 --format json | jq .
```

**Cloud Monitoring:**

- Workload metrics automatically collected
- Create custom dashboards in Cloud Console
- Set up alerts for pod crashes, resource limits

### Common kubectl monitoring

```bash
# Watch pods
kubectl get pods -n namespace -w

# Describe all resources
kubectl describe all -n namespace

# Get pod metrics
kubectl top pod POD_NAME -n namespace

# View resource usage
kubectl describe node NODE_NAME
```

## Security Best Practices

### Pod Security

1. **Use non-root users:**

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
```

2. **Read-only root filesystem:**

```yaml
securityContext:
  readOnlyRootFilesystem: true
```

3. **Drop capabilities:**

```yaml
securityContext:
  capabilities:
    drop:
      - ALL
```

4. **Use network policies** to restrict traffic

5. **Use workload identity** instead of service account keys

### GKE Security Features

- **Binary Authorization**: Enforce deployment policies
- **Shielded GKE Nodes**: Secure boot and integrity monitoring
- **Pod Security Policies/Standards**: Enforce pod security requirements
- **Private clusters**: Isolate control plane

See [SECURITY.md](references/SECURITY.md) for detailed security configurations.

## Backup and Disaster Recovery

### Velero for backups

```bash
# Install Velero
velero install \
  --provider gcp \
  --plugins velero/velero-plugin-for-gcp:v1.5.0 \
  --bucket BUCKET_NAME \
  --secret-file ./credentials-velero

# Backup namespace
velero backup create my-backup --include-namespaces my-namespace

# Restore backup
velero restore create --from-backup my-backup

# Schedule automatic backups
velero schedule create daily-backup --schedule="0 2 * * *" --include-namespaces my-namespace
```

## Performance Optimization

### Node Pool Configuration

**For compute-intensive workloads:**

```bash
gcloud container node-pools create compute-pool \
  --cluster CLUSTER_NAME \
  --machine-type n2-standard-8 \
  --num-nodes 3 \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 10 \
  --region REGION
```

**For memory-intensive workloads:**

```bash
gcloud container node-pools create memory-pool \
  --cluster CLUSTER_NAME \
  --machine-type n2-highmem-8 \
  --num-nodes 2 \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 5 \
  --region REGION
```

### Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Vertical Pod Autoscaling

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  updatePolicy:
    updateMode: "Auto"
```

## Common Issues and Solutions

### ImagePullBackOff

**Cause**: Cannot pull container image
**Solutions**:

- Verify image exists: `gcloud container images list --repository=gcr.io/PROJECT_ID`
- Check permissions: Ensure node service account has Storage Object Viewer role
- For Artifact Registry: Configure authentication

### CrashLoopBackOff

**Cause**: Container crashes repeatedly
**Solutions**:

1. Check logs: `kubectl logs POD_NAME --previous`
2. Verify environment variables and secrets
3. Check resource limits
4. Review liveness/readiness probes

### Pending Pods

**Cause**: Cannot schedule pod
**Solutions**:

1. Check node resources: `kubectl top nodes`
2. Review pod events: `kubectl describe pod POD_NAME`
3. Check resource requests vs available capacity
4. Verify node selectors and taints

### OOMKilled

**Cause**: Container exceeded memory limit
**Solutions**:

1. Increase memory limits
2. Review application memory usage
3. Consider VPA for automatic adjustment

## Quick Reference

### Essential kubectl commands

```bash
# Contexts
kubectl config get-contexts
kubectl config use-context CONTEXT_NAME

# Resources
kubectl get all -n namespace
kubectl get pods -o wide -n namespace
kubectl get svc,deploy,ing -n namespace

# Editing
kubectl edit deployment DEPLOYMENT_NAME -n namespace
kubectl set image deployment/DEPLOYMENT_NAME CONTAINER=IMAGE -n namespace

# Debugging
kubectl describe pod POD_NAME -n namespace
kubectl exec -it POD_NAME -n namespace -- bash
kubectl logs -f POD_NAME -n namespace

# Cleanup
kubectl delete pod POD_NAME -n namespace
kubectl delete -f manifest.yaml
```

### GKE CLI commands

```bash
# Clusters
gcloud container clusters list
gcloud container clusters describe CLUSTER_NAME --region REGION
gcloud container clusters resize CLUSTER_NAME --num-nodes 3 --region REGION

# Node pools
gcloud container node-pools list --cluster CLUSTER_NAME --region REGION
gcloud container node-pools describe POOL_NAME --cluster CLUSTER_NAME --region REGION

# Operations
gcloud container operations list
gcloud container operations describe OPERATION_ID --region REGION
```

## Advanced Topics

For detailed information on advanced features, see:

- [CONFIG_CONNECTOR.md](references/CONFIG_CONNECTOR.md) - Manage GCP resources from Kubernetes
- [PRIVATE_CLUSTERS.md](references/PRIVATE_CLUSTERS.md) - Setup and networking for private GKE clusters
- [SECURITY.md](references/SECURITY.md) - Comprehensive security configurations
- [CI_CD.md](references/CI_CD.md) - GitOps and continuous deployment patterns
- [MULTI_CLUSTER.md](references/MULTI_CLUSTER.md) - Multi-cluster management and Anthos

## Package Requirements

This skill requires the following tools:

- `kubectl` - Kubernetes command-line tool
- `gcloud` - Google Cloud SDK
- Optional: `helm` - Kubernetes package manager
- Optional: `velero` - Backup and restore tool
