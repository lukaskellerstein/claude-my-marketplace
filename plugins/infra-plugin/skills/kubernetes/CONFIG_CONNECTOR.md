# Config Connector Reference

Config Connector allows you to manage GCP resources through Kubernetes manifests.

## Installation

### Enable Config Connector on GKE cluster

```bash
gcloud container clusters update CLUSTER_NAME \
  --update-addons ConfigConnector=ENABLED \
  --region REGION
```

### Configure Config Connector

1. Create namespace for Config Connector:

```bash
kubectl create namespace cnrm-system
```

2. Create service account for Config Connector:

```bash
gcloud iam service-accounts create cnrm-system

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:cnrm-system@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/editor"
```

3. Bind with workload identity:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  cnrm-system@PROJECT_ID.iam.gserviceaccount.com \
  --member="serviceAccount:PROJECT_ID.svc.id.goog[cnrm-system/cnrm-controller-manager]" \
  --role="roles/iam.workloadIdentityUser"
```

4. Create ConfigConnector resource:

```yaml
apiVersion: core.cnrm.cloud.google.com/v1beta1
kind: ConfigConnector
metadata:
  name: configconnector.core.cnrm.cloud.google.com
spec:
  mode: cluster
  googleServiceAccount: "cnrm-system@PROJECT_ID.iam.gserviceaccount.com"
```

## Common Resources

### Cloud SQL Instance

```yaml
apiVersion: sql.cnrm.cloud.google.com/v1beta1
kind: SQLInstance
metadata:
  name: my-postgres
  namespace: default
spec:
  databaseVersion: POSTGRES_14
  region: us-central1
  settings:
    tier: db-custom-2-7680
    availabilityType: REGIONAL
    backupConfiguration:
      enabled: true
      startTime: "03:00"
    ipConfiguration:
      ipv4Enabled: false
      privateNetworkRef:
        name: my-network
```

### Cloud Storage Bucket

```yaml
apiVersion: storage.cnrm.cloud.google.com/v1beta1
kind: StorageBucket
metadata:
  name: my-app-storage
  namespace: default
spec:
  location: us-central1
  storageClass: STANDARD
  uniformBucketLevelAccess: true
  lifecycleRule:
    - action:
        type: Delete
      condition:
        age: 365
```

### Pub/Sub Topic and Subscription

```yaml
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubTopic
metadata:
  name: my-topic
  namespace: default
spec:
  messageRetentionDuration: "604800s"
---
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubSubscription
metadata:
  name: my-subscription
  namespace: default
spec:
  topicRef:
    name: my-topic
  ackDeadlineSeconds: 20
  messageRetentionDuration: "604800s"
```

### IAM Service Account

```yaml
apiVersion: iam.cnrm.cloud.google.com/v1beta1
kind: IAMServiceAccount
metadata:
  name: my-app-sa
  namespace: default
spec:
  displayName: "My Application Service Account"
---
apiVersion: iam.cnrm.cloud.google.com/v1beta1
kind: IAMPolicyMember
metadata:
  name: my-app-sa-policy
  namespace: default
spec:
  member: serviceAccount:my-app-sa@PROJECT_ID.iam.gserviceaccount.com
  role: roles/storage.objectViewer
  resourceRef:
    apiVersion: storage.cnrm.cloud.google.com/v1beta1
    kind: StorageBucket
    name: my-app-storage
```

### Secret Manager Secret

```yaml
apiVersion: secretmanager.cnrm.cloud.google.com/v1beta1
kind: SecretManagerSecret
metadata:
  name: db-password
  namespace: default
spec:
  replication:
    automatic: true
```

### Cloud Memorystore (Redis)

```yaml
apiVersion: redis.cnrm.cloud.google.com/v1beta1
kind: RedisInstance
metadata:
  name: my-cache
  namespace: default
spec:
  tier: STANDARD_HA
  memorySizeGb: 4
  region: us-central1
  authorizedNetworkRef:
    name: my-network
  redisVersion: REDIS_6_X
```

## Usage Patterns

### Create GCP resource from Kubernetes

1. Apply manifest:

```bash
kubectl apply -f resource.yaml
```

2. Check status:

```bash
kubectl get sqlinstance my-postgres -o yaml
kubectl describe sqlinstance my-postgres
```

3. Wait for ready:

```bash
kubectl wait --for=condition=Ready sqlinstance/my-postgres --timeout=600s
```

### Use connection info in application

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: app
          env:
            - name: DB_HOST
              valueFrom:
                configMapKeyRef:
                  name: my-postgres-connection
                  key: privateIp
            - name: DB_NAME
              value: "mydb"
```

## Best Practices

1. **Use separate namespaces** for different environments (dev, staging, prod)

2. **Version control all manifests** in git repositories

3. **Use references** instead of hardcoded values:

```yaml
spec:
  networkRef:
    name: my-network
  subnetworkRef:
    name: my-subnet
```

4. **Set proper deletion policies**:

```yaml
metadata:
  annotations:
    cnrm.cloud.google.com/deletion-policy: "abandon" # Keep resource on delete
```

5. **Monitor resource creation**:

```bash
kubectl get gcp -A
kubectl get events -A | grep -i error
```

## Troubleshooting

### Resource stuck in pending

Check events and conditions:

```bash
kubectl describe RESOURCE_TYPE RESOURCE_NAME
```

Look for:

- Permission errors (service account lacks IAM roles)
- Quota exceeded
- Invalid configuration

### Delete protection

For resources with deletion protection (SQL instances), update first:

```bash
kubectl patch sqlinstance my-postgres --type=merge \
  -p '{"spec":{"settings":{"deletionProtectionEnabled":false}}}'
```

Then delete:

```bash
kubectl delete sqlinstance my-postgres
```

## Reference

Full Config Connector documentation:

- [Supported Resources](https://cloud.google.com/config-connector/docs/reference/overview)
- [Installation Guide](https://cloud.google.com/config-connector/docs/how-to/install-upgrade-uninstall)
- [Resource Reference](https://cloud.google.com/config-connector/docs/reference/resource-docs/)
