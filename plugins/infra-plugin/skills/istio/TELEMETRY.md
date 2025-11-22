# Telemetry and Observability Configuration

Comprehensive guide for configuring metrics, traces, and logs in Istio.

## Telemetry API Overview

Istio 1.11+ uses the Telemetry API for unified configuration of metrics, traces, and logs.

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
  tracing:
    - providers:
        - name: jaeger
      randomSamplingPercentage: 100.0
  accessLogging:
    - providers:
        - name: envoy
```

## Metrics Configuration

### Custom Metrics

**Add Custom Dimension:**

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: custom-metrics
  namespace: default
spec:
  metrics:
    - providers:
        - name: prometheus
      dimensions:
        request_method:
          value: "request.method"
        response_code:
          value: "response.code"
        request_host:
          value: "request.host"
        source_app:
          value: "source.workload.name | unknown"
        destination_app:
          value: "destination.workload.name | unknown"
      overrides:
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            response_code:
              value: "response.code"
```

### Disable Metrics for Specific Workload

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: disable-metrics
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - disabled: true
```

### Filter Metrics

**Reduce Metric Cardinality:**

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: filter-metrics
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          tagOverrides:
            request_protocol:
              operation: REMOVE
            grpc_response_status:
              operation: REMOVE
```

## Distributed Tracing

### Jaeger Configuration

**Basic Jaeger Setup:**

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: tracing-default
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: jaeger
      randomSamplingPercentage: 1.0
      customTags:
        environment:
          literal:
            value: "production"
        version:
          environment:
            name: VERSION
```

**Deploy Jaeger:**

```bash
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
      - name: jaeger
        image: jaegertracing/all-in-one:1.50
        env:
        - name: COLLECTOR_ZIPKIN_HOST_PORT
          value: ":9411"
        - name: COLLECTOR_OTLP_ENABLED
          value: "true"
        ports:
        - containerPort: 9411
        - containerPort: 16686
        - containerPort: 4317
        - containerPort: 4318
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-collector
  namespace: istio-system
spec:
  selector:
    app: jaeger
  ports:
  - name: zipkin
    port: 9411
    targetPort: 9411
  - name: grpc-otlp
    port: 4317
    targetPort: 4317
  - name: http-otlp
    port: 4318
    targetPort: 4318
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-query
  namespace: istio-system
spec:
  selector:
    app: jaeger
  ports:
  - name: query-http
    port: 16686
    targetPort: 16686
EOF
```

### Zipkin Configuration

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: zipkin-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 100.0
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    defaultConfig:
      tracing:
        zipkin:
          address: zipkin.istio-system:9411
```

### OpenTelemetry Configuration

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: otel-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 100.0
      customTags:
        cluster_id:
          literal:
            value: "cluster-1"
```

### Custom Sampling Strategy

**Per-Service Sampling:**

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: high-priority-tracing
  namespace: default
spec:
  selector:
    matchLabels:
      app: critical-service
  tracing:
    - providers:
        - name: jaeger
      randomSamplingPercentage: 100.0
---
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: low-priority-tracing
  namespace: default
spec:
  selector:
    matchLabels:
      app: batch-service
  tracing:
    - providers:
        - name: jaeger
      randomSamplingPercentage: 0.1
```

## Access Logging

### Standard Access Logs

**Enable JSON Access Logs:**

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: access-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: response.code >= 400
```

**Custom Access Log Format:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: |
      {
        "timestamp": "%START_TIME%",
        "method": "%REQ(:METHOD)%",
        "path": "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%",
        "protocol": "%PROTOCOL%",
        "response_code": "%RESPONSE_CODE%",
        "response_flags": "%RESPONSE_FLAGS%",
        "response_code_details": "%RESPONSE_CODE_DETAILS%",
        "bytes_received": "%BYTES_RECEIVED%",
        "bytes_sent": "%BYTES_SENT%",
        "duration": "%DURATION%",
        "upstream_service_time": "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%",
        "x_forwarded_for": "%REQ(X-FORWARDED-FOR)%",
        "user_agent": "%REQ(USER-AGENT)%",
        "request_id": "%REQ(X-REQUEST-ID)%",
        "authority": "%REQ(:AUTHORITY)%",
        "upstream_host": "%UPSTREAM_HOST%",
        "upstream_cluster": "%UPSTREAM_CLUSTER%",
        "upstream_local_address": "%UPSTREAM_LOCAL_ADDRESS%",
        "downstream_local_address": "%DOWNSTREAM_LOCAL_ADDRESS%",
        "downstream_remote_address": "%DOWNSTREAM_REMOTE_ADDRESS%",
        "requested_server_name": "%REQUESTED_SERVER_NAME%",
        "route_name": "%ROUTE_NAME%"
      }
```

### Conditional Logging

**Log Only Errors:**

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: error-logging
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: response.code >= 500
```

### Logging to External Services

**Send Logs to Fluentd:**

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: fluentd-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: fluentd
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    extensionProviders:
    - name: fluentd
      envoyFileAccessLog:
        path: /dev/stdout
        logFormat:
          labels:
            source: "istio"
            cluster: "production"
```

## Prometheus Integration

### Configure Prometheus Scraping

**ServiceMonitor for Istio:**

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istio-component-monitor
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: pilot
  endpoints:
    - port: http-monitoring
      interval: 15s
---
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: envoy-stats-monitor
  namespace: istio-system
spec:
  selector:
    matchExpressions:
      - key: istio-prometheus-ignore
        operator: DoesNotExist
  podMetricsEndpoints:
    - path: /stats/prometheus
      interval: 15s
```

### Custom Prometheus Queries

**Useful Queries:**

```promql
# Request rate
rate(istio_requests_total[5m])

# Error rate
rate(istio_requests_total{response_code=~"5.."}[5m])

# Request duration p95
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service)
)

# Success rate
sum(rate(istio_requests_total{response_code!~"5.."}[5m]))
/
sum(rate(istio_requests_total[5m])) * 100

# Traffic by service
sum(rate(istio_requests_total[5m])) by (destination_service)
```

## Grafana Dashboards

### Deploy Grafana with Istio Dashboards

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
  namespace: istio-system
data:
  istio-mesh-dashboard.json: |
    {
      "dashboard": {
        "title": "Istio Mesh Dashboard",
        "panels": [
          {
            "title": "Request Volume",
            "targets": [
              {
                "expr": "sum(rate(istio_requests_total[5m]))"
              }
            ]
          }
        ]
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:10.2.0
        ports:
        - containerPort: 3000
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          value: "admin"
        - name: GF_AUTH_ANONYMOUS_ENABLED
          value: "true"
        volumeMounts:
        - name: dashboards
          mountPath: /etc/grafana/provisioning/dashboards
      volumes:
      - name: dashboards
        configMap:
          name: grafana-dashboards
EOF
```

## Kiali Configuration

### Deploy Kiali

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kiali
  namespace: istio-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kiali
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kiali
  template:
    metadata:
      labels:
        app: kiali
    spec:
      serviceAccountName: kiali
      containers:
      - name: kiali
        image: quay.io/kiali/kiali:v1.79
        ports:
        - containerPort: 20001
        env:
        - name: PROMETHEUS_SERVICE_URL
          value: "http://prometheus.istio-system:9090"
        - name: GRAFANA_SERVICE_URL
          value: "http://grafana.istio-system:3000"
        - name: JAEGER_SERVICE_URL
          value: "http://jaeger-query.istio-system:16686"
---
apiVersion: v1
kind: Service
metadata:
  name: kiali
  namespace: istio-system
spec:
  selector:
    app: kiali
  ports:
  - port: 20001
    targetPort: 20001
EOF
```

## Advanced Observability Patterns

### Service Level Indicators (SLIs)

**Define SLIs with Prometheus:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: istio-system
data:
  sli-rules.yml: |
    groups:
    - name: sli
      interval: 30s
      rules:
      - record: sli:request_success_rate:5m
        expr: |
          sum(rate(istio_requests_total{response_code!~"5.."}[5m])) 
          / 
          sum(rate(istio_requests_total[5m]))
      
      - record: sli:request_latency_p95:5m
        expr: |
          histogram_quantile(0.95, 
            sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le)
          )
      
      - record: sli:error_rate:5m
        expr: |
          sum(rate(istio_requests_total{response_code=~"5.."}[5m])) 
          / 
          sum(rate(istio_requests_total[5m]))
```

### Alerting Rules

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: istio-system
data:
  alerts.yml: |
    groups:
    - name: istio-alerts
      rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(istio_requests_total{response_code=~"5.."}[5m])) 
          / 
          sum(rate(istio_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% for {{ $labels.destination_service }}"
      
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, 
            sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service)
          ) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "P95 latency is above 1s for {{ $labels.destination_service }}"
      
      - alert: CircuitBreakerOpen
        expr: |
          sum(increase(envoy_cluster_upstream_rq_pending_overflow[5m])) by (cluster_name) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker opened"
          description: "Circuit breaker is open for {{ $labels.cluster_name }}"
```

## Log Aggregation

### ELK Stack Integration

**Fluentd Configuration:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: istio-system
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*istio-proxy*.log
      pos_file /var/log/fluentd-istio.pos
      tag istio.proxy
      <parse>
        @type json
        time_key timestamp
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    <filter istio.proxy>
      @type record_transformer
      <record>
        cluster_name "production"
        environment "prod"
      </record>
    </filter>

    <match istio.proxy>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      logstash_format true
      logstash_prefix istio
      <buffer>
        @type file
        path /var/log/fluentd-buffers/istio
        flush_mode interval
        flush_interval 5s
      </buffer>
    </match>
```

## Performance Optimization

### Reduce Telemetry Overhead

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: optimize-telemetry
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          disabled: false
        - match:
            metric: REQUEST_COUNT
            mode: CLIENT_AND_SERVER
          disabled: false
        - match:
            metric: REQUEST_DURATION
            mode: CLIENT_AND_SERVER
          disabled: false
        - match:
            metric: REQUEST_SIZE
          disabled: true
        - match:
            metric: RESPONSE_SIZE
          disabled: true
```

### Sampling Strategies

**Adaptive Sampling:**

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: adaptive-sampling
  namespace: default
spec:
  tracing:
    - providers:
        - name: jaeger
      randomSamplingPercentage: 1.0
      customTags:
        error:
          literal:
            value: "false"
    - match:
        mode: SERVER
      providers:
        - name: jaeger
      randomSamplingPercentage: 100.0
      filter:
        expression: response.code >= 500
```

## Troubleshooting Observability

### Check Telemetry Configuration

```bash
# Verify Telemetry resources
kubectl get telemetry -A

# Check proxy telemetry settings
istioctl proxy-config bootstrap pod-name | jq '.bootstrap.stats_config'

# Verify metrics endpoint
kubectl exec pod-name -c istio-proxy -- curl localhost:15000/stats/prometheus

# Check tracing configuration
istioctl proxy-config bootstrap pod-name | jq '.bootstrap.tracing'
```

### Debug Missing Metrics

```bash
# Check Prometheus targets
kubectl port-forward -n istio-system svc/prometheus 9090:9090
# Visit http://localhost:9090/targets

# Verify metric labels
kubectl exec pod-name -c istio-proxy -- curl localhost:15000/stats/prometheus | grep istio_requests_total

# Check telemetry logs
kubectl logs -n istio-system deploy/istiod | grep telemetry
```

### Trace Collection Issues

```bash
# Verify Jaeger collector
kubectl logs -n istio-system deploy/jaeger

# Check trace sampling
istioctl proxy-config bootstrap pod-name | jq '.bootstrap.tracing.http.config'

# Test trace generation
kubectl exec pod-name -- curl -H "x-b3-sampled: 1" http://service-name
```

## Best Practices

1. **Start with low sampling rates** in production (1-5%)
2. **Use selective logging** with filters to reduce volume
3. **Monitor telemetry overhead** on CPU and memory
4. **Implement proper retention policies** for metrics and traces
5. **Use service-specific configurations** for critical services
6. **Aggregate logs centrally** for better analysis
7. **Set up proper alerting** based on SLIs/SLOs
8. **Regular dashboard reviews** to identify issues early
9. **Document custom metrics** and their purpose
10. **Test observability changes** in non-production first
