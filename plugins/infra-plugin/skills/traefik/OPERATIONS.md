# Monitoring, Troubleshooting & Best Practices

## Prometheus metrics

Traefik exposes metrics at the `/metrics` endpoint. Scrape with a ServiceMonitor:

```yaml
# ServiceMonitor for Prometheus Operator
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: traefik
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: traefik
  endpoints:
    - port: metrics
      interval: 30s
```

### Key metrics to monitor

- `traefik_entrypoint_requests_total` — total requests per entrypoint
- `traefik_service_requests_total` — requests per service (with status codes)
- `traefik_entrypoint_request_duration_seconds` — request latency
- `traefik_service_open_connections` — active connections
- `traefik_tls_certs_not_after` — certificate expiry

## Troubleshooting

```bash
# Check Traefik logs
kubectl logs -l app.kubernetes.io/name=traefik -n traefik --tail=100

# Check loaded configuration
kubectl port-forward -n traefik svc/traefik 9000:9000
# Then visit http://localhost:9000/api/rawdata

# Verify IngressRoute
kubectl get ingressroute -A
kubectl describe ingressroute my-app -n my-app

# Check middleware
kubectl get middleware -A
kubectl describe middleware rate-limit -n my-app

# Check TLS certificates
kubectl get certificates -A
kubectl describe certificate app-tls-cert -n my-app

# Debug routing
# Enable debug logging temporarily
kubectl edit deployment traefik -n traefik
# Set log level to DEBUG
```

## Best Practices

1. **Always redirect HTTP to HTTPS** in production
2. **Use middleware chains** to combine security, rate limiting, and compression
3. **Set resource limits** on Traefik pods
4. **Enable access logs** for debugging and auditing
5. **Use health checks** on backend services
6. **Configure circuit breakers** for unreliable backends
7. **Pin Traefik version** in Helm values — don't use `latest`
8. **Disable the dashboard** in production, or protect it with authentication
9. **Use TLSOption** to enforce minimum TLS 1.2
10. **Monitor certificate expiry** with Prometheus alerts
