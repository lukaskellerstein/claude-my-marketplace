# The local cluster of myapp

myapp runs on this laptop in its own Kubernetes cluster. The cluster is code in this
folder, four scripts drive it, and this page says where everything is. A person and an
agent use the same scripts.

| What | Value |
|---|---|
| Way | k3d: K3s nodes as containers on Podman |
| Cluster | `myapp`, defined in `k8s/local/cluster.yaml` |
| Kube context | `k3d-myapp`, pinned in `.kube-context` at the repo root |
| Lifetime | keep: `down.sh` stops the cluster, and nothing deletes it |
| Way in | `http://<app>.localhost:8090`, on `127.0.0.1` only |
| Nodes | 1 server, 0 agents, K3s `v1.36.4-k3s1` |

## Commands

Every command is safe to run again.

| Command | What it does |
|---|---|
| `k8s/local/up.sh` | Creates the cluster, or starts it, and waits until the Ingress answers |
| `k8s/local/deploy.sh` | `up`, then builds the images, imports them, applies `k8s/local`, restarts, checks |
| `k8s/local/deploy.sh --no-build` | The same, without the image builds |
| `k8s/local/check.sh` | Proves the cluster, the namespaces and every host name. Changes nothing |
| `k8s/local/down.sh` | Stops the cluster. Everything in it stays |

## Services and ports

| Service | URL | Namespace | Sign-in |
|---|---|---|---|
| myapp | <http://myapp.localhost:8090> | `myapp` | none |

A pod reaches this laptop as `host.containers.internal` (Podman) or `host.docker.internal`
(Docker).

## How to test each part

| Part | How |
|---|---|
| The whole environment | `k8s/local/check.sh` |
| A page of the app | A browser on the URL above. Chromium and `curl` resolve `*.localhost` themselves |
| The API from a script | `curl -H 'Host: myapp.localhost' http://127.0.0.1:8090/…`, which needs no name lookup |
| Pods, logs, events | `kubectl --context k3d-myapp -n myapp get pods`, `logs`, `describe` |
| The cluster in a window | Headlamp, context `k3d-myapp` |

## What an agent may do

- **Without a question:** `up.sh`, `deploy.sh`, `check.sh`, `down.sh`, and every `kubectl`
  read that names `--context k3d-myapp`.
- **Through the scripts only:** changes to the cluster. Change a manifest in `k8s/`, then run
  `deploy.sh`. No `kubectl apply`, `patch` or `edit` by hand: the next deploy undoes it.
- **Never without the person's word:** `down.sh --delete`, `k3d cluster delete`, and any
  `kubectl` call on another context.

## Traps

| Trap | What to do |
|---|---|
| After a restart of Podman or of the Mac the cluster is stopped | `k8s/local/up.sh`. Do not create it again |
| `k3d cluster create` says the cluster already exists | It does. `up.sh` starts it. Never delete it to get past this |
| A new build does not show up | The tag is the same, so `deploy.sh` restarts the Deployments. Run it, do not only `apply` |
