# Multi-cluster Istio Configuration

Guide for setting up and managing Istio across multiple Kubernetes clusters.

## Deployment Models

### 1. Primary-Remote Model

Single control plane in primary cluster, remote clusters use remote control plane.

**Primary Cluster Setup:**

```bash
# Install Istio on primary cluster
istioctl install --set profile=default \
  --set values.global.meshID=mesh1 \
  --set values.global.multiCluster.clusterName=cluster1 \
  --set values.global.network=network1

# Enable endpoint discovery
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: istio-remote-secret-cluster2
  namespace: istio-system
  labels:
    istio/multiCluster: "true"
type: Opaque
data:
  cluster2: $(kubectl --context=cluster2 config view --flatten -o json | base64 -w 0)
EOF
```

**Remote Cluster Setup:**

```bash
# Install Istio remote configuration
istioctl install --set profile=remote \
  --set values.global.meshID=mesh1 \
  --set values.global.multiCluster.clusterName=cluster2 \
  --set values.global.network=network2 \
  --set values.global.remotePilotAddress=${ISTIOD_REMOTE_EP}
```

### 2. Multi-Primary Model

Control plane in each cluster, shared mesh configuration.

**Cluster 1:**

```bash
istioctl install --set profile=default \
  --set values.global.meshID=mesh1 \
  --set values.global.multiCluster.clusterName=cluster1 \
  --set values.global.network=network1

# Create remote secret for cluster2
istioctl create-remote-secret --context=cluster2 --name=cluster2 | \
  kubectl apply -f - --context=cluster1
```

**Cluster 2:**

```bash
istioctl install --set profile=default \
  --set values.global.meshID=mesh1 \
  --set values.global.multiCluster.clusterName=cluster2 \
  --set values.global.network=network2

# Create remote secret for cluster1
istioctl create-remote-secret --context=cluster1 --name=cluster1 | \
  kubectl apply -f - --context=cluster2
```

## Network Configuration

### Same Network

Clusters in the same network can reach pod IPs directly.

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster1
      network: network1
```

### Different Networks

Clusters in different networks require east-west gateway.

**Deploy East-West Gateway:**

```bash
# Generate gateway manifest
samples/multicluster/gen-eastwest-gateway.sh \
  --mesh mesh1 --cluster cluster1 --network network1 | \
  kubectl apply -f -

# Expose services via gateway
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: cross-network-gateway
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
  - port:
      number: 15443
      name: tls
      protocol: TLS
    tls:
      mode: AUTO_PASSTHROUGH
    hosts:
    - "*.local"
EOF
```

## Service Discovery

### ServiceEntry for Remote Services

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-service
spec:
  hosts:
    - service.cluster2.global
  location: MESH_INTERNAL
  ports:
    - number: 8080
      name: http
      protocol: HTTP
  resolution: DNS
  endpoints:
    - address: service.cluster2.svc.cluster.local
      locality: us-west/zone1
```

## Cross-Cluster Traffic Management

### VirtualService for Multi-Cluster

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews-route
spec:
  hosts:
    - reviews.global
  http:
    - match:
        - headers:
            region:
              exact: us-west
      route:
        - destination:
            host: reviews.cluster1.svc.cluster.local
    - route:
        - destination:
            host: reviews.cluster2.svc.cluster.local
```

### DestinationRule for Locality

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: reviews-destination
spec:
  host: reviews.global
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
          - from: us-west/zone1/*
            to:
              "us-west/zone1/*": 80
              "us-west/zone2/*": 20
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 60s
```

## Security in Multi-Cluster

### Trust Domain Federation

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    trustDomain: cluster.local
    trustDomainAliases:
    - cluster1.local
    - cluster2.local
```

### Cross-Cluster AuthorizationPolicy

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: cross-cluster-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/default/sa/frontend"
              - "cluster1.local/ns/default/sa/frontend"
              - "cluster2.local/ns/default/sa/frontend"
```

## Troubleshooting Multi-Cluster

### Verify Cluster Connectivity

```bash
# Check remote secrets
kubectl get secrets -n istio-system -l istio/multiCluster=true

# Verify endpoint discovery
istioctl proxy-config endpoints deploy/istio-ingressgateway -n istio-system | grep cluster2

# Test cross-cluster communication
kubectl exec -it pod-name -c istio-proxy -- curl http://service.cluster2.svc.cluster.local
```

### Debug East-West Gateway

```bash
# Check gateway status
kubectl get svc -n istio-system -l istio=eastwestgateway

# Verify gateway configuration
istioctl proxy-config routes deploy/istio-eastwestgateway -n istio-system

# Check gateway logs
kubectl logs -n istio-system deploy/istio-eastwestgateway -c istio-proxy
```

### Common Issues

**Issue: Services not discovered across clusters**

```bash
# Verify remote secret configuration
kubectl get secret -n istio-system -l istio/multiCluster=true -o yaml

# Check istiod logs
kubectl logs -n istio-system deploy/istiod | grep "cluster2"

# Verify network configuration
kubectl get cm istio -n istio-system -o yaml | grep network
```

**Issue: mTLS failures between clusters**

```bash
# Check certificate distribution
istioctl proxy-config secret deploy/my-app -n default

# Verify trust domain configuration
kubectl get cm istio -n istio-system -o yaml | grep trustDomain

# Test mTLS
istioctl experimental authz check pod-name -a app=my-app
```

## Monitoring Multi-Cluster

### Prometheus Federation

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus
  namespace: istio-system
data:
  prometheus.yml: |
    global:
      external_labels:
        cluster: cluster1
    scrape_configs:
    - job_name: 'federate'
      honor_labels: true
      metrics_path: '/federate'
      params:
        'match[]':
          - '{job="kubernetes-pods"}'
      static_configs:
        - targets:
          - 'prometheus.cluster2.svc.cluster.local:9090'
```

### Distributed Tracing

Configure Jaeger for cross-cluster tracing:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      tracing:
        zipkin:
          address: jaeger-collector.istio-system:9411
        sampling: 100.0
```

## Best Practices

1. **Use consistent mesh IDs** across all clusters
2. **Configure network topology** correctly for optimal routing
3. **Implement locality-aware load balancing** for reduced latency
4. **Monitor cross-cluster traffic** with distributed tracing
5. **Test failover scenarios** regularly
6. **Keep Istio versions aligned** across clusters
7. **Use east-west gateways** for network isolation
8. **Implement proper RBAC** for multi-tenant scenarios

## Migration Strategy

### Gradual Migration to Multi-Cluster

1. **Phase 1**: Deploy Istio in both clusters independently
2. **Phase 2**: Establish trust between clusters
3. **Phase 3**: Configure service discovery
4. **Phase 4**: Implement traffic routing policies
5. **Phase 5**: Enable cross-cluster observability
6. **Phase 6**: Test and validate failover

### Rollback Plan

```bash
# Remove remote cluster configuration
kubectl delete secret istio-remote-secret-cluster2 -n istio-system

# Reconfigure services for single cluster
kubectl delete serviceentry -n default --all

# Restore original VirtualServices
kubectl apply -f original-virtualservice.yaml
```
