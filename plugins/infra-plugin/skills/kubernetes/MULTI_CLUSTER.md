# Multi-Cluster Management Reference

Guide for managing multiple Kubernetes clusters and using Anthos features.

## Multi-Cluster Setup

### Multiple GKE Clusters

**Create clusters in different regions:**

```bash
# Primary cluster (us-central1)
gcloud container clusters create primary-cluster \
  --region us-central1 \
  --num-nodes 3 \
  --enable-ip-alias \
  --network my-vpc \
  --subnetwork primary-subnet

# Secondary cluster (europe-west1)
gcloud container clusters create secondary-cluster \
  --region europe-west1 \
  --num-nodes 3 \
  --enable-ip-alias \
  --network my-vpc \
  --subnetwork europe-subnet

# Tertiary cluster (asia-east1)
gcloud container clusters create tertiary-cluster \
  --region asia-east1 \
  --num-nodes 3 \
  --enable-ip-alias \
  --network my-vpc \
  --subnetwork asia-subnet
```

### Configure kubectl contexts

```bash
# Get credentials for all clusters
gcloud container clusters get-credentials primary-cluster --region us-central1
gcloud container clusters get-credentials secondary-cluster --region europe-west1
gcloud container clusters get-credentials tertiary-cluster --region asia-east1

# List contexts
kubectl config get-contexts

# Rename contexts for clarity
kubectl config rename-context gke_PROJECT_us-central1_primary-cluster primary
kubectl config rename-context gke_PROJECT_europe-west1_secondary-cluster europe
kubectl config rename-context gke_PROJECT_asia-east1_tertiary-cluster asia

# Switch between contexts
kubectl config use-context primary
kubectl config use-context europe
```

### Multi-cluster operations with kubectx

```bash
# Install kubectx
sudo apt-get install kubectx

# Switch contexts easily
kubectx primary
kubectx europe
kubectx asia

# List all contexts
kubectx

# Switch back to previous context
kubectx -
```

## GKE Multi-Cluster Ingress

### Enable Multi-Cluster Ingress

**Setup config cluster:**

```bash
# Enable Multi-Cluster Ingress
gcloud container hub ingress enable \
  --config-membership=primary-cluster

# Register clusters with fleet
gcloud container fleet memberships register primary-cluster \
  --gke-cluster us-central1/primary-cluster \
  --enable-workload-identity

gcloud container fleet memberships register europe-cluster \
  --gke-cluster europe-west1/secondary-cluster \
  --enable-workload-identity

gcloud container fleet memberships register asia-cluster \
  --gke-cluster asia-east1/tertiary-cluster \
  --enable-workload-identity
```

### Multi-Cluster Service

**Deploy to all clusters:**

```yaml
# Deploy in each cluster
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: gcr.io/PROJECT_ID/my-app:v1
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: default
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

**MultiClusterService (in config cluster):**

```yaml
apiVersion: networking.gke.io/v1
kind: MultiClusterService
metadata:
  name: my-app-mcs
  namespace: default
spec:
  template:
    spec:
      selector:
        app: my-app
      ports:
        - port: 80
          targetPort: 8080
  clusters:
    - link: us-central1/primary-cluster
    - link: europe-west1/secondary-cluster
    - link: asia-east1/tertiary-cluster
```

**MultiClusterIngress (in config cluster):**

```yaml
apiVersion: networking.gke.io/v1
kind: MultiClusterIngress
metadata:
  name: my-app-ingress
  namespace: default
spec:
  template:
    spec:
      backend:
        serviceName: my-app-mcs
        servicePort: 80
      rules:
        - host: app.example.com
          http:
            paths:
              - path: /*
                backend:
                  serviceName: my-app-mcs
                  servicePort: 80
```

## GKE Multi-Cluster Services (MCS)

### Service Discovery Across Clusters

**Enable MCS:**

```bash
gcloud container fleet multi-cluster-services enable

# Register clusters
gcloud container fleet memberships register primary \
  --gke-cluster=us-central1/primary-cluster \
  --enable-workload-identity

gcloud container fleet memberships register secondary \
  --gke-cluster=europe-west1/secondary-cluster \
  --enable-workload-identity
```

**Export service from cluster:**

```yaml
# In primary cluster
apiVersion: net.gke.io/v1
kind: ServiceExport
metadata:
  name: my-service
  namespace: default
```

**Access from other cluster:**

```yaml
# In secondary cluster - service is automatically imported
apiVersion: v1
kind: Pod
metadata:
  name: client
spec:
  containers:
    - name: client
      image: busybox
      command:
        - sh
        - -c
        - |
          # Access via multi-cluster DNS
          wget -O- my-service.default.svc.clusterset.local
```

## Anthos Config Management

### Install Anthos Config Management

```bash
# Enable Config Management
gcloud beta container fleet config-management enable

# Create config-management.yaml
cat > config-management.yaml << EOF
applySpecVersion: 1
spec:
  configSync:
    enabled: true
    sourceFormat: unstructured
    git:
      syncRepo: https://github.com/my-org/config-repo
      syncBranch: main
      secretType: none
      policyDir: "clusters"
  policyController:
    enabled: true
    templateLibraryInstalled: true
    auditIntervalSeconds: 60
EOF

# Apply to all clusters
gcloud beta container fleet config-management apply \
  --membership=primary-cluster \
  --config=config-management.yaml

gcloud beta container fleet config-management apply \
  --membership=secondary-cluster \
  --config=config-management.yaml
```

### Config Management Repository Structure

```
config-repo/
├── clusters/
│   ├── primary/
│   │   ├── namespace.yaml
│   │   └── deployment.yaml
│   ├── secondary/
│   │   ├── namespace.yaml
│   │   └── deployment.yaml
│   └── all-clusters/
│       ├── network-policy.yaml
│       └── resource-quota.yaml
├── namespaces/
│   ├── production/
│   │   ├── namespace.yaml
│   │   └── rbac.yaml
│   └── staging/
│       ├── namespace.yaml
│       └── rbac.yaml
└── cluster-registry/
    ├── selector-primary.yaml
    └── selector-secondary.yaml
```

**ClusterSelector:**

```yaml
apiVersion: configmanagement.gke.io/v1
kind: ClusterSelector
metadata:
  name: primary-selector
spec:
  selector:
    matchLabels:
      environment: production
      region: us-central1
```

**Apply to matching clusters:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
  annotations:
    configmanagement.gke.io/cluster-selector: primary-selector
spec:
  replicas: 5
  # ...
```

## Anthos Service Mesh

### Install Anthos Service Mesh

```bash
# Download installation script
curl https://storage.googleapis.com/csm-artifacts/asm/asmcli > asmcli
chmod +x asmcli

# Install ASM on primary cluster
./asmcli install \
  --project_id PROJECT_ID \
  --cluster_name primary-cluster \
  --cluster_location us-central1 \
  --enable_all \
  --option ca-gcp

# Install ASM on secondary cluster
./asmcli install \
  --project_id PROJECT_ID \
  --cluster_name secondary-cluster \
  --cluster_location europe-west1 \
  --enable_all \
  --option ca-gcp
```

### Multi-Cluster Service Mesh

**Configure multi-cluster mesh:**

```bash
# Create east-west gateway in each cluster
kubectl apply -n istio-system -f \
  samples/multicluster/expose-services.yaml

# Get endpoint of primary cluster
export PRIMARY_GW=$(kubectl -n istio-system get service \
  istio-eastwestgateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Configure secondary cluster to access primary
istioctl create-remote-secret \
  --context=primary \
  --name=primary | \
  kubectl apply -f - --context=secondary

# Configure primary cluster to access secondary
istioctl create-remote-secret \
  --context=secondary \
  --name=secondary | \
  kubectl apply -f - --context=primary
```

**Enable sidecar injection:**

```bash
# Label namespace for injection
kubectl label namespace default istio-injection=enabled

# Restart pods to inject sidecar
kubectl rollout restart deployment -n default
```

### Service Mesh Configuration

**DestinationRule for multi-cluster:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
          - from: us-central1/*
            to:
              "us-central1/*": 80
              "europe-west1/*": 20
          - from: europe-west1/*
            to:
              "europe-west1/*": 80
              "us-central1/*": 20
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

**VirtualService for traffic routing:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
  namespace: default
spec:
  hosts:
    - my-service.default.svc.cluster.local
  http:
    - match:
        - headers:
            region:
              exact: europe
      route:
        - destination:
            host: my-service.default.svc.cluster.local
            subset: europe
    - route:
        - destination:
            host: my-service.default.svc.cluster.local
            subset: us
```

## Disaster Recovery and Failover

### Active-Passive Setup

**Primary cluster (active):**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 5
  # ... app configuration
```

**Secondary cluster (passive):**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 0 # Scaled to 0, ready for failover
  # ... identical app configuration
```

**Failover procedure:**

```bash
# Scale down primary
kubectl scale deployment my-app --replicas=0 -n production --context=primary

# Scale up secondary
kubectl scale deployment my-app --replicas=5 -n production --context=secondary

# Update DNS or load balancer to point to secondary cluster
```

### Active-Active Setup

**Deploy to all clusters:**

```bash
# Apply to all clusters
for context in primary secondary tertiary; do
  kubectl apply -f app-deployment.yaml --context=$context
done

# Use global load balancer or Multi-Cluster Ingress for traffic distribution
```

### Backup and Restore Across Clusters

**Velero for cross-cluster backups:**

```bash
# Backup from primary
velero backup create primary-backup \
  --include-namespaces production

# Restore to secondary
velero restore create --from-backup primary-backup \
  --context=secondary

# Verify restore
kubectl get all -n production --context=secondary
```

## Monitoring Multi-Cluster

### Cloud Monitoring

**View metrics from all clusters:**

```bash
gcloud monitoring dashboards list

# Query metrics across clusters
gcloud monitoring time-series list \
  --filter='resource.type="k8s_cluster"' \
  --format=json
```

### Centralized Logging

**Configure log aggregation:**

```bash
# Enable Cloud Logging on all clusters
for cluster in primary secondary tertiary; do
  gcloud container clusters update $cluster \
    --enable-cloud-logging \
    --logging=SYSTEM,WORKLOAD \
    --region REGION
done

# Query logs from all clusters
gcloud logging read \
  'resource.type="k8s_cluster" AND severity="ERROR"' \
  --limit 100
```

## Federation (Deprecated - Use Fleet)

Note: Kubernetes Federation v2 is deprecated. Use GKE Fleet and Multi-Cluster Services instead.

## Best Practices

1. **Use consistent configuration** across clusters
2. **Implement proper RBAC** for multi-cluster access
3. **Monitor latency** between clusters
4. **Plan for network failures** between regions
5. **Test failover procedures** regularly
6. **Use GitOps** for configuration management
7. **Implement proper observability** across clusters
8. **Consider data locality** requirements
9. **Plan for cost optimization** (don't over-replicate)
10. **Document** cluster purposes and dependencies

## Cost Optimization

- Use **regional clusters** instead of multiple single-zone clusters where possible
- Implement **autoscaling** based on actual usage
- Use **preemptible nodes** for non-critical workloads
- Monitor **cross-region traffic costs**
- Use **committed use discounts** for predictable workloads
- Consider **cluster consolidation** where appropriate

## Troubleshooting

### Service discovery not working

**Check MCS status:**

```bash
kubectl get serviceexport -A
kubectl get serviceimport -A
kubectl describe serviceexport SERVICE_NAME -n NAMESPACE
```

### Multi-Cluster Ingress issues

**Verify MCI configuration:**

```bash
kubectl describe multiclusteringress INGRESS_NAME -n NAMESPACE
kubectl describe multiclusterservice SERVICE_NAME -n NAMESPACE

# Check backend health
gcloud compute backend-services list
gcloud compute backend-services get-health BACKEND_SERVICE
```

### Context confusion

**Always verify current context:**

```bash
kubectl config current-context

# Use explicit context in commands
kubectl get pods --context=primary
kubectl get pods --context=secondary
```

## References

- [GKE Multi-Cluster Ingress](https://cloud.google.com/kubernetes-engine/docs/concepts/multi-cluster-ingress)
- [Anthos Config Management](https://cloud.google.com/anthos-config-management/docs)
- [Anthos Service Mesh](https://cloud.google.com/service-mesh/docs)
- [GKE Fleet Management](https://cloud.google.com/kubernetes-engine/docs/fleets-overview)
