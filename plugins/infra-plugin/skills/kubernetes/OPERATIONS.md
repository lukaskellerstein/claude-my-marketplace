# Operations Reference

Observability, backup/disaster recovery, and troubleshooting for GKE.

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
