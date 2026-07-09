# Manifest Patterns Reference

Reusable Kubernetes manifest patterns, Helm usage, and autoscaling.

## Deployment Best Practices

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

## Service Types

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

## ConfigMaps and Secrets

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

## Horizontal Pod Autoscaling

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

## Vertical Pod Autoscaling

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
