# EnvoyFilter Configuration Guide

Advanced Envoy proxy customization for Istio service mesh.

## Overview

EnvoyFilter provides a mechanism to customize Envoy configuration for specific use cases that aren't covered by higher-level Istio APIs. Use with caution as incorrect configuration can break the mesh.

## Basic Structure

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-filter
  namespace: istio-system # Global scope
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_request(request_handle)
                request_handle:headers():add("x-custom-header", "value")
              end
```

## Common Use Cases

### 1. Add Custom Headers

**Add Static Header:**

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-header
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_OUTBOUND
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
              subFilter:
                name: "envoy.filters.http.router"
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_request(request_handle)
                request_handle:headers():add("x-request-id", request_handle:headers():get("x-request-id") or "unknown")
                request_handle:headers():add("x-source-cluster", "cluster-1")
              end
```

### 2. Custom Rate Limiting

**Local Rate Limiting:**

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: rate-limit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
              subFilter:
                name: "envoy.filters.http.router"
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.local_ratelimit
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            stat_prefix: http_local_rate_limiter
            token_bucket:
              max_tokens: 100
              tokens_per_fill: 100
              fill_interval: 60s
            filter_enabled:
              runtime_key: local_rate_limit_enabled
              default_value:
                numerator: 100
                denominator: HUNDRED
            filter_enforced:
              runtime_key: local_rate_limit_enforced
              default_value:
                numerator: 100
                denominator: HUNDRED
```

### 3. Wasm Extension

**Add WebAssembly Filter:**

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: wasm-filter
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
              subFilter:
                name: "envoy.filters.http.router"
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.wasm
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm
            config:
              name: "my_plugin"
              vm_config:
                runtime: "envoy.wasm.runtime.v8"
                code:
                  local:
                    filename: "/etc/istio/extensions/my_plugin.wasm"
              configuration:
                "@type": "type.googleapis.com/google.protobuf.StringValue"
                value: |
                  {
                    "key": "value"
                  }
```

### 4. External Authorization

**Add External Auth Filter:**

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ext-authz
  namespace: istio-system
spec:
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
              subFilter:
                name: "envoy.filters.http.router"
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.ext_authz
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
            http_service:
              server_uri:
                uri: "http://authz-service.default.svc.cluster.local:8080"
                cluster: "outbound|8080||authz-service.default.svc.cluster.local"
                timeout: 0.5s
              authorization_request:
                allowed_headers:
                  patterns:
                    - exact: "authorization"
                    - exact: "cookie"
              authorization_response:
                allowed_upstream_headers:
                  patterns:
                    - exact: "x-user-id"
            failure_mode_allow: false
            with_request_body:
              max_request_bytes: 8192
              allow_partial_message: true
```

### 5. Custom Access Logging

**Configure Structured Logging:**

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-access-log
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": "type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager"
            access_log:
              - name: envoy.access_loggers.file
                typed_config:
                  "@type": "type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog"
                  path: /dev/stdout
                  log_format:
                    json_format:
                      timestamp: "%START_TIME%"
                      method: "%REQ(:METHOD)%"
                      path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
                      protocol: "%PROTOCOL%"
                      response_code: "%RESPONSE_CODE%"
                      response_flags: "%RESPONSE_FLAGS%"
                      bytes_received: "%BYTES_RECEIVED%"
                      bytes_sent: "%BYTES_SENT%"
                      duration: "%DURATION%"
                      upstream_service_time: "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%"
                      forwarded_for: "%REQ(X-FORWARDED-FOR)%"
                      user_agent: "%REQ(USER-AGENT)%"
                      request_id: "%REQ(X-REQUEST-ID)%"
                      authority: "%REQ(:AUTHORITY)%"
                      upstream_host: "%UPSTREAM_HOST%"
```

## Lua Scripting

### Request Modification

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: lua-request-mod
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_OUTBOUND
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
              subFilter:
                name: "envoy.filters.http.router"
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_request(request_handle)
                -- Add custom authentication header
                local auth_token = os.getenv("AUTH_TOKEN")
                if auth_token then
                  request_handle:headers():add("Authorization", "Bearer " .. auth_token)
                end
                
                -- Modify path
                local path = request_handle:headers():get(":path")
                if path:match("^/v1/") then
                  request_handle:headers():replace(":path", path:gsub("^/v1/", "/api/v2/"))
                end
                
                -- Add tracing header
                request_handle:headers():add("x-trace-id", request_handle:headers():get("x-request-id"))
              end
```

### Response Modification

```yaml
inline_code: |
  function envoy_on_response(response_handle)
    -- Add security headers
    response_handle:headers():add("X-Content-Type-Options", "nosniff")
    response_handle:headers():add("X-Frame-Options", "DENY")
    response_handle:headers():add("X-XSS-Protection", "1; mode=block")
    
    -- Modify response based on status code
    local status = response_handle:headers():get(":status")
    if status == "503" then
      response_handle:headers():add("Retry-After", "60")
    end
    
    -- Log response details
    local body = response_handle:body()
    if body then
      response_handle:logInfo("Response body length: " .. #body:getBytes(0, body:length()))
    end
  end
```

## Advanced Patterns

### Circuit Breaking with Custom Logic

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-circuit-breaker
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: CLUSTER
      match:
        context: SIDECAR_OUTBOUND
        cluster:
          service: backend.default.svc.cluster.local
      patch:
        operation: MERGE
        value:
          circuit_breakers:
            thresholds:
              - priority: DEFAULT
                max_connections: 1000
                max_pending_requests: 100
                max_requests: 1000
                max_retries: 3
              - priority: HIGH
                max_connections: 2000
                max_pending_requests: 200
                max_requests: 2000
                max_retries: 5
          outlier_detection:
            consecutive_5xx: 5
            interval: 10s
            base_ejection_time: 30s
            max_ejection_percent: 50
            enforcing_consecutive_5xx: 100
            enforcing_success_rate: 100
            success_rate_minimum_hosts: 5
            success_rate_request_volume: 100
            success_rate_stdev_factor: 1900
```

### Custom Load Balancing

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-lb
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: CLUSTER
      match:
        context: SIDECAR_OUTBOUND
        cluster:
          service: backend.default.svc.cluster.local
      patch:
        operation: MERGE
        value:
          lb_policy: RING_HASH
          ring_hash_lb_config:
            minimum_ring_size: 1024
            maximum_ring_size: 8192
            hash_function: XX_HASH
```

### TCP Proxy Configuration

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: tcp-proxy
  namespace: default
spec:
  workloadSelector:
    labels:
      app: tcp-app
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          portNumber: 9999
          filterChain:
            filter:
              name: "envoy.filters.network.tcp_proxy"
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy
            stat_prefix: tcp
            idle_timeout: 300s
            max_connect_attempts: 3
            upstream_idle_timeout: 3600s
```

## Testing and Validation

### Verify Filter Configuration

```bash
# Get Envoy configuration
istioctl proxy-config listeners pod-name -o json

# Check specific filter
istioctl proxy-config listeners pod-name --port 8080 -o json | \
  jq '.[] | .filterChains[0].filters[] | select(.name=="envoy.filters.network.http_connection_manager")'

# Validate EnvoyFilter
istioctl analyze -n default
```

### Debug Filter Issues

```bash
# Check Envoy logs for filter errors
kubectl logs pod-name -c istio-proxy | grep -i "filter"

# Get filter statistics
kubectl exec pod-name -c istio-proxy -- curl -s localhost:15000/stats | grep lua

# Check configuration dump
kubectl exec pod-name -c istio-proxy -- curl -s localhost:15000/config_dump
```

## Best Practices

1. **Scope filters appropriately**: Use workloadSelector to limit impact
2. **Test in non-production first**: Verify filters don't break traffic
3. **Use higher-level APIs when possible**: EnvoyFilter is for advanced cases only
4. **Version your filters**: Document changes and maintain versions
5. **Monitor performance impact**: Watch for increased latency or CPU usage
6. **Validate configuration**: Use `istioctl analyze` before applying
7. **Keep filters simple**: Complex logic can cause performance issues
8. **Document custom filters**: Explain purpose and expected behavior

## Troubleshooting

### Common Issues

**Filter not applied:**

```bash
# Check filter syntax
istioctl analyze -n default

# Verify workload selector
kubectl get pods -n default --show-labels

# Check Envoy configuration
istioctl proxy-config listeners pod-name
```

**Filter causes errors:**

```bash
# Check Envoy logs
kubectl logs pod-name -c istio-proxy --tail=100

# Get detailed configuration
kubectl exec pod-name -c istio-proxy -- curl localhost:15000/config_dump > config.json

# Test with filter disabled
kubectl label pod pod-name istio.io/rev=disabled
```

**Performance degradation:**

```bash
# Check filter stats
kubectl exec pod-name -c istio-proxy -- curl localhost:15000/stats/prometheus | grep envoy_lua

# Monitor CPU usage
kubectl top pod pod-name --containers

# Profile Envoy
kubectl exec pod-name -c istio-proxy -- curl -s localhost:15000/cpuprofiler
```

## Security Considerations

1. **Validate Lua scripts**: Ensure no security vulnerabilities
2. **Limit external calls**: Minimize dependencies in filters
3. **Sanitize inputs**: Always validate data from headers/body
4. **Use RBAC**: Restrict who can create EnvoyFilters
5. **Audit changes**: Track all EnvoyFilter modifications
6. **Test thoroughly**: Verify filters don't introduce vulnerabilities

## Migration Guide

### From Mixer to EnvoyFilter

Old Mixer policy:

```yaml
apiVersion: config.istio.io/v1alpha2
kind: rule
metadata:
  name: quota
spec:
  actions:
    - handler: quotaHandler
      instances:
        - requestCountQuota
```

New EnvoyFilter equivalent:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: quota-filter
spec:
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.local_ratelimit
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            stat_prefix: http_local_rate_limiter
            token_bucket:
              max_tokens: 1000
              tokens_per_fill: 1000
              fill_interval: 60s
```
