---
name: kubernetes
description: Kubernetes and GKE operations: kubectl, manifests, deployments, services, workload identity, autopilot, config connector, private clusters, and troubleshooting.
---

# Kubernetes with GKE Focus

Guidance for Kubernetes operations with specialized knowledge of Google Kubernetes Engine (GKE) features and best practices. This entry file covers the common day-to-day commands and workflows; deep-dive topics live in the reference files listed at the bottom.

## Quick Start

### Connect to a cluster

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

# View logs (add --previous for a crashed container, -f to follow)
kubectl logs POD_NAME -n NAMESPACE

# Scale deployment
kubectl scale deployment DEPLOYMENT_NAME --replicas=3 -n NAMESPACE

# Interactive debug / port-forward
kubectl exec -it POD_NAME -n NAMESPACE -- /bin/sh
kubectl port-forward POD_NAME 8080:80 -n NAMESPACE
```

### Essential kubectl / gcloud reference

```bash
# Contexts
kubectl config get-contexts
kubectl config use-context CONTEXT_NAME

# Inspect resources
kubectl get all -n namespace
kubectl get pods -o wide -n namespace
kubectl describe pod POD_NAME -n namespace

# Edit / roll out
kubectl edit deployment DEPLOYMENT_NAME -n namespace
kubectl set image deployment/DEPLOYMENT_NAME CONTAINER=IMAGE -n namespace
kubectl rollout status deployment/DEPLOYMENT_NAME -n namespace

# Resource usage
kubectl top nodes
kubectl top pods -n namespace

# GKE clusters and node pools
gcloud container clusters describe CLUSTER_NAME --region REGION
gcloud container clusters resize CLUSTER_NAME --num-nodes 3 --region REGION
gcloud container node-pools list --cluster CLUSTER_NAME --region REGION
```

## Core Workflows

### 1. Application Deployment

1. Create the namespace if needed: `kubectl create namespace my-app`.
2. Apply manifests in dependency order: configmap → secret → deployment → service → ingress.
3. Verify: `kubectl rollout status deployment/my-app -n my-app` and `kubectl get all -n my-app`.

See [MANIFESTS.md](MANIFESTS.md) for production-ready deployment, service, and ConfigMap/Secret manifests.

### 2. Troubleshooting Pods

1. Check status: `kubectl get pods -n NS` then `kubectl describe pod POD -n NS`.
2. Review events: `kubectl get events -n NS --sort-by='.lastTimestamp'`.
3. Check logs (current, `--previous`, `-f`, or `-c CONTAINER` for multi-container pods).
4. Debug live: `kubectl exec -it POD -n NS -- /bin/sh` or `kubectl port-forward`.

See [OPERATIONS.md](OPERATIONS.md) for ImagePullBackOff, CrashLoopBackOff, Pending, and OOMKilled fixes.

### 3. Resource Management

Check usage and limits with `kubectl top nodes`, `kubectl top pods -n NS`, `kubectl get resourcequota -n NS`, and `kubectl get limitrange -n NS`.

## GKE at a Glance

- **Cluster modes** — Autopilot (fully managed, pod-priced) vs Standard (full node control). See [GKE_FEATURES.md](GKE_FEATURES.md).
- **Workload Identity** — pods access GCP services without service account keys; setup in [SECURITY.md](SECURITY.md).
- **Ingress & managed certs** — GKE-managed HTTP(S) load balancing; manifests in [GKE_FEATURES.md](GKE_FEATURES.md).
- **Config Connector** — manage GCP resources as Kubernetes manifests; see [CONFIG_CONNECTOR.md](CONFIG_CONNECTOR.md).
- **Networking & network policies** — pod-level isolation and private clusters; see [SECURITY.md](SECURITY.md) and [PRIVATE_CLUSTERS.md](PRIVATE_CLUSTERS.md).
- **Autoscaling & node pools** — HPA/VPA manifests and node pool sizing in [MANIFESTS.md](MANIFESTS.md) and [GKE_FEATURES.md](GKE_FEATURES.md).

## Reference files

| File | Read this when… |
| --- | --- |
| [GKE_FEATURES.md](GKE_FEATURES.md) | Choosing Autopilot vs Standard, configuring GKE Ingress / managed certificates, or sizing node pools. |
| [MANIFESTS.md](MANIFESTS.md) | Writing Deployment / Service / ConfigMap / Secret manifests, using Helm, or setting up HPA/VPA autoscaling. |
| [OPERATIONS.md](OPERATIONS.md) | Setting up monitoring/logging, Velero backups, or debugging common pod failures. |
| [CONFIG_CONNECTOR.md](CONFIG_CONNECTOR.md) | Managing GCP resources (SQL, buckets, Pub/Sub, IAM) from Kubernetes manifests. |
| [PRIVATE_CLUSTERS.md](PRIVATE_CLUSTERS.md) | Creating or accessing private GKE clusters, Cloud NAT, VPC peering, or shared VPC. |
| [SECURITY.md](SECURITY.md) | Hardening pods, network policies, Workload Identity, secrets, RBAC, Binary Authorization, or audit logging. |
| [CI_CD.md](CI_CD.md) | Building GitOps / continuous deployment pipelines for GKE. |
| [MULTI_CLUSTER.md](MULTI_CLUSTER.md) | Managing multiple clusters or using Anthos multi-cluster features. |

## Package Requirements

This skill requires the following tools:

- `kubectl` - Kubernetes command-line tool
- `gcloud` - Google Cloud SDK
- Optional: `helm` - Kubernetes package manager
- Optional: `velero` - Backup and restore tool
