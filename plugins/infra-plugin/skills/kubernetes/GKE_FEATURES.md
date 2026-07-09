# GKE Features Reference

GKE-specific cluster features: cluster modes, ingress, and node pool configuration.

## Autopilot vs Standard Clusters

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

## Workload Identity

Workload Identity lets pods access GCP services without service account keys. See [SECURITY.md](SECURITY.md) for the complete setup (enable on cluster, create/bind Kubernetes and GCP service accounts, annotate, and use in pods).

## GKE Ingress

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

## Node Pool Configuration

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
