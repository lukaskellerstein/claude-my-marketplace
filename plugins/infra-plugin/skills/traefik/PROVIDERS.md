# File-based Configuration & Providers (Docker/Standalone)

For non-Kubernetes deployments, Traefik is configured through a static file plus
watched dynamic files, and/or the Docker provider.

## Static configuration (traefik.yml)

Defines entrypoints, certificate resolvers, providers, and observability. Loaded
once at startup.

```yaml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web

providers:
  file:
    directory: /etc/traefik/dynamic
    watch: true
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false

api:
  dashboard: true
  insecure: false

log:
  level: INFO

accessLog:
  filePath: /var/log/traefik/access.log

metrics:
  prometheus:
    entryPoint: metrics
```

## Dynamic configuration

Watched files defining routers, services, and middlewares. Hot-reloaded.

```yaml
# /etc/traefik/dynamic/routes.yml
http:
  routers:
    my-app:
      rule: "Host(`app.example.com`)"
      service: my-app
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      middlewares:
        - rate-limit
        - security-headers

  services:
    my-app:
      loadBalancer:
        servers:
          - url: "http://backend1:8080"
          - url: "http://backend2:8080"
        healthCheck:
          path: /health
          interval: "10s"
          timeout: "3s"

  middlewares:
    rate-limit:
      rateLimit:
        average: 100
        burst: 50
    security-headers:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
```

## Docker Compose

The Docker provider reads router/service config from container labels.

```yaml
services:
  traefik:
    image: traefik:v3.0
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/etc/traefik/traefik.yml:ro
      - ./dynamic:/etc/traefik/dynamic:ro
      - letsencrypt:/letsencrypt
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`traefik.example.com`)"
      - "traefik.http.routers.dashboard.service=api@internal"
      - "traefik.http.routers.dashboard.middlewares=auth"

  my-app:
    image: my-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.my-app.rule=Host(`app.example.com`)"
      - "traefik.http.routers.my-app.entrypoints=websecure"
      - "traefik.http.routers.my-app.tls.certresolver=letsencrypt"
      - "traefik.http.services.my-app.loadbalancer.server.port=8080"

volumes:
  letsencrypt:
```
