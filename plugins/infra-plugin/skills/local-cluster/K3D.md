# k3d: K3s nodes as containers

[K3s](https://docs.k3s.io/) is a small Kubernetes distribution that runs on Linux only.
[k3d](https://k3d.io/) runs K3s nodes as containers on Docker or Podman, so the same cluster
runs on macOS. A node is a container: a cluster starts in seconds and is gone in seconds.

K3s brings the parts that a bare cluster on a laptop lacks:

| Part | What it gives |
|---|---|
| Traefik | An Ingress: `http://app.localhost:8090` reaches the app, with no `port-forward` |
| ServiceLB | `type: LoadBalancer` Services work |
| local-path storage | A `PersistentVolumeClaim` gets a disk |
| metrics-server | `kubectl top`, and CPU and memory in Headlamp |

Why not the others: kind has no Ingress, LoadBalancer or metrics out of the box. minikube is
heavier and calls its Podman driver experimental. Rancher Desktop brings a second container
engine.

## Tools

| Tool | Why | macOS |
|---|---|---|
| Podman or Docker | Runs the nodes, builds the images | Podman Desktop or Docker Desktop |
| `docker` CLI | The scripts build and inspect through it, also on Podman | Comes with either |
| kubectl | Talks to the cluster | `brew install kubectl` |
| k3d | Creates the cluster | `brew install k3d` |
| Headlamp | Watches the cluster in a window | `brew install --cask headlamp` |

**Podman on macOS.** k3d talks to Podman through the Docker API. The k3d docs say it "is not
guaranteed to work with Podman" and needs Podman 4 or higher. It works with no extra setup
when two things are true:

```bash
podman machine inspect --format '{{.Rootful}}'    # true
ls -l /var/run/docker.sock                        # -> …/podman/machine/podman.sock
```

If the first is `false`: `podman machine stop`, `podman machine set --rootful`,
`podman machine start`. If the second is missing:
`sudo /opt/podman/bin/podman-mac-helper install` (it ships with Podman Desktop), then stop
and start the machine. Without the socket link, the k3d docs give another way: set
`DOCKER_HOST` to the machine's ssh address from `podman system connection ls`.

The scripts use the `docker` CLI. On a machine with a `podman` docker context they call
`docker --context podman`, and plain `docker` otherwise.

## Before the first create: three free values

One machine holds many clusters. Each needs its own name, port and subnet.

```bash
k3d cluster list                                   # the names that exist
lsof -iTCP:8090 -sTCP:LISTEN                       # no output: the port is free
docker network ls --format '{{.Name}}' | while read -r n; do
  docker network inspect "$n" --format '{{.Name}} {{range .IPAM.Config}}{{.Subnet}}{{end}}'
done                                               # the subnets in use
```

With Podman and no `podman` docker context, the subnet of one network is
`podman network inspect <name> --format '{{range .Subnets}}{{.Subnet}}{{end}}'`.

- **Name**: the repo's name. The kube context becomes `k3d-<name>`.
- **Port**: one port of the machine for the Ingress. `8090`, `8091` and so on.
- **Subnet**: a `/24` that no network uses. Podman hands out `10.89.0.0/24`, `10.89.1.0/24`
  and up by itself, so take a high one: `10.89.101.0/24`, `10.89.102.0/24`.

## `cluster.yaml`, line by line

The template is `templates/k3d/cluster.yaml`.

| Line | Why |
|---|---|
| `metadata.name` | The cluster's name. It must be the name in `.kube-context` without `k3d-`. `env.sh` stops when they differ. |
| `servers: 1`, `agents: 0` | One node runs everything. Add agents only when the work is about more nodes. See Traps. |
| `image` | The K3s version, pinned. The default moves with every k3d release. |
| `subnet` | With a subnet, k3d gives the server node a fixed IP. Without one, Podman can give it a new IP at a start, K3s stops with `failed to find interface with specified node ip`, and the start hangs. |
| `kubeAPI.hostIP: 127.0.0.1` | The API server listens on this machine only. No `hostPort`: k3d picks a free one and keeps it. |
| `ports: 127.0.0.1:8090:80` on `loadbalancer` | Port 8090 of this machine, on localhost only, goes to port 80 of the load balancer, where Traefik answers. |
| `kubeconfig.updateDefaultKubeconfig: true` | The context `k3d-<name>` goes into `~/.kube/config`, where kubectl and Headlamp find it. |
| `kubeconfig.switchCurrentContext: false` | The person's current context stays. A cluster made in the background must not move it. |
| `runtime.labels` | Podman Desktop and Docker Desktop show the containers as one group. |

k3d expands `$VAR` and `${VAR}` everywhere in this file before it reads it, also in a
comment. Keep the file free of dollar signs.

## Create, start, stop, delete

You create the cluster once. After that it is there, running or stopped.

| `k3d cluster list` shows | It is | Do |
|---|---|---|
| No such name | Not there | `k3d cluster create --config cluster.yaml` |
| `name   0/1   0/0   true` | There, stopped | `k3d cluster start <name>` |
| `name   1/1   0/0   true` | There, running | Nothing |

`up.sh` does exactly this. A create on a cluster that is there stops at once and changes
nothing: `Failed to create cluster '<name>' because a cluster with that name already exists`.
Do not delete the cluster to get past that. A start brings back every namespace, image and
volume. A delete loses them all.

```bash
k3d cluster stop <name>      # frees the memory, keeps everything
k3d cluster start <name>     # back, with all namespaces and data
k3d cluster delete <name>    # gone, and its context too
```

A create starts these containers: `k3d-<name>-server-0` (the control plane), one
`k3d-<name>-agent-N` per agent, and `k3d-<name>-serverlb` (the load balancer in front, which
owns the port of the machine). Stop and start with `k3d`, not with the buttons of Podman
Desktop: k3d keeps its own record of the cluster.

After a restart of the Podman machine or of the Mac, the cluster is stopped. Podman does not
start the nodes again by itself. `up.sh` does.

## Images

There is no registry. Build the image, then copy it into every node:

```bash
docker build --load -t localhost/myapp-backend:dev backend
k3d image import localhost/myapp-backend:dev -c <name>
```

- `--load` puts the image into the local store. Without it, a buildx builder keeps the image
  in its cache, and the old image gets imported.
- The manifests say `imagePullPolicy: IfNotPresent` and name the image as built
  (`localhost/…`). A node then uses its copy and never asks a registry.
- A new build with the same tag needs a new import and a `kubectl rollout restart`. An
  `apply` alone changes nothing, because the manifest did not change. `deploy.sh` restarts
  every Deployment whose image starts with `localhost/`.
- Public images (Postgres, Redis) need no import. The nodes pull them on first use, so on a
  first deploy a backend can restart a few times until its database is pulled and ready.

## The way in: one host name per app

```text
curl ──► app.localhost:8090 ──► serverlb ──► Traefik ──► Service ──► a pod
         (the laptop)           (container)  (Ingress: host app.localhost)
```

- The port of the machine is the door into the whole cluster. Traefik reads the host name
  of each request and picks the app. A name that no Ingress claims gets a 404.
- Every `*.localhost` name means this machine
  ([RFC 6761](https://www.rfc-editor.org/rfc/rfc6761#section-6.3)), so a new app needs only
  a `host:` in its Ingress. `curl` and Chromium resolve such a name by themselves. Other
  clients (Python, Node) ask the system resolver. A current macOS knows the name. An older
  system may not, and in a sandboxed session the same lookup failed. Then send the name as
  a header: `curl -H 'Host: app.localhost' http://127.0.0.1:8090/`. `check.sh` always does
  that.
- `kubectl get ingress` shows port 80, not 8090. The Ingress lives inside the cluster and
  does not know the port of the machine. That port is in `cluster.yaml` only, and
  `docker port k3d-<name>-serverlb` shows it on the running cluster.
- Traefik is ready about a minute after a create. `up.sh` waits for it.
- The Traefik dashboard shows every route. K3s turns it on but does not publish it:
  `kubectl --context k3d-<name> -n kube-system port-forward deploy/traefik 9000:8080`
  together with an `IngressRoute` on the entry point `traefik` for `api@internal`.

## From a pod to the laptop

A model gateway or a database that runs on the laptop is reachable from a pod as:

| Engine | Name |
|---|---|
| Podman | `host.containers.internal` |
| Docker Desktop | `host.docker.internal` |

`host.k3d.internal`, the name k3d adds, points to the Podman VM and not to the Mac. On
Podman it does not reach a service on the Mac.

## Kubeconfig and Headlamp

- `up.sh` keeps the context in the default kubeconfig and never switches the current
  context. If the context is missing, it runs
  `k3d kubeconfig merge <name> --kubeconfig-merge-default --kubeconfig-switch-context=false`.
- Headlamp reads `~/.kube/config` and lists every context. Open it, click `k3d-<name>`.
- A kubeconfig in a file of the project: export `KUBECONFIG=<file>` before the scripts. k3d
  and kubectl then use that file, and `~/.kube/config` stays untouched. Headlamp then needs
  both: start it with `KUBECONFIG=~/.kube/config:<file>`.

## More than one cluster

Each k3d cluster is its own set of containers, so several run at the same time. Give each
its own port and subnet. Headlamp lists all of them. A second cluster next to a running one
was ready after 13 s.

## What was measured

On an Apple Silicon Mac with Podman 6.0.2 (rootful machine), k3d v5.9.0 and K3s v1.36.4, in
October 2026. One machine, one day: measure again before you promise a number.

| What | Result |
|---|---|
| `k3d cluster create`, images already pulled | 22 s for 3 nodes |
| Traefik ready | 59 s after the create |
| Memory, idle | Server 627 MB, each agent 120 to 160 MB, load balancer 13 MB |
| `k3d image import` of 19 images (5.5 GB) | 59 s |
| `k3d cluster start`, 46 pods in the cluster | 18 s until the nodes are Ready, about 2 min until the Ingress answers |
| Stop, then start, with a `subnet`, 3 times | Stop 13 to 21 s, start 20 to 22 s, the server kept its IP |
| Stop, then start, without a `subnet` | The server got a new IP, K3s stopped, the start hung for more than 4 min |
| A restart of the Podman machine | The cluster stayed stopped until a `k3d cluster start` |

The template itself (1 server, 0 agents, binds on `127.0.0.1`), on the same machine in
November 2026:

| What | Result |
|---|---|
| `up.sh` on a new cluster, until the Ingress answers | 43 s |
| `deploy.sh` of one small public app, with `check.sh` | 4 to 5 s |
| `down.sh` (stop), then `up.sh` (start) until the Ingress answers | 15 s, then 16 s. The API port stayed the same, and the app was back |
| `down.sh --delete` | 16 s. No container, network, volume or context was left |
| Who listens on the Ingress port and on the API port | The engine's proxy, on `127.0.0.1` only. The LAN address of the Mac got no answer |
| The person's current kube context | The same before and after |

## Traps

| Trap | Symptom | Fix |
|---|---|---|
| No `subnet` in `cluster.yaml` | A start hangs. `podman logs k3d-<name>-server-0` shows `failed to find interface with specified node ip` | A cluster made without a subnet has no fixed IP. Delete it and create it again with the subnet, then deploy again. |
| An agent node restarts in a loop | Full CPU, the node is never `Ready`. On Podman an agent gets a new IP when its container restarts, and its Node object keeps the old one. | Delete the Node object and restart the container: `kubectl --context k3d-<name> delete node <node>`, then `docker restart <node>`. With `agents: 0` this cannot happen. |
| A create on a cluster that exists | `a cluster with that name already exists` | Start it. Never delete it for this. |
| The current context moved | Every later `kubectl` goes to the new cluster | `switchCurrentContext: false` in `cluster.yaml`, and `--context` in every call. |
| A build without `--load` | The pods run the old code after a deploy | `docker build --load`. `deploy.sh` has it. |
| The buildx builder keeps running | A container named `buildx_buildkit_…` uses memory | `docker buildx stop` after the builds. `deploy.sh` has it. |
| A dollar sign in `cluster.yaml` | k3d replaces it with an environment variable, or with nothing | Write no `$` in the file. |
| A CronJob in a stopped cluster | At the next start it runs at once, for the time it missed | Expect it, or suspend the CronJob before a stop. |
| The first requests after a deploy | 404 or 503 for a few seconds, also when the Deployment is `Available`. Traefik learns of a new Ingress and of a new pod a little later: 404 means no route yet, 503 means a route and no pod behind it. | Wait and ask again. `check.sh` gives every host `CHECK_WAIT` seconds (60) before a 404 or a 503 counts. |
