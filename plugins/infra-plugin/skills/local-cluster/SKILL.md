---
name: local-cluster
description: "Local Kubernetes on a Mac for development and tests: a project's own cluster as code. k3d (K3s nodes as containers on Podman or Docker) by default; K3s in a Colima or Lima VM when the work needs the node's kernel (KVM, Kata) or runs untrusted code. Use to create, start, deploy to, check, stop or document a local cluster: up/deploy/check/down scripts, a pinned kube context, Ingress on *.localhost, image import, Headlamp."
---

# Local cluster

A project that deploys to Kubernetes gets its own cluster on the laptop. The cluster is code
in the repo, four scripts drive it, and one README says where everything is. You start it,
deploy to it and test on it yourself. The person does not start it for you, and nobody has to
remember a command.

The point is to stay close to production: the same manifests, the same Ingress, the same
images. Only a thin local overlay differs.

## First: what is already there

| You find | Do |
|---|---|
| `.kube-context` at the repo root | The project has a cluster. Read the README next to its scripts and use those scripts. Never create a second cluster for one project. |
| No pin, but a local setup in scripts or docs (`k3d`, `kind`, `colima`, `limactl`) | The project has its own way. Use it as it is. |
| Nothing | Choose a way and a lifetime below, then build the contract. |

Look at the machine before you create anything. Other projects have clusters here too:

```bash
k3d cluster list                                  # every k3d cluster, running or stopped
kubectl config get-contexts                       # every context this machine knows
lsof -iTCP:8090 -sTCP:LISTEN                      # is a port free?
```

## Choose the way

| The work needs | Way | Read |
|---|---|---|
| Only the Kubernetes API: Deployments, Services, Ingress, volumes | **k3d**: K3s nodes as containers on Podman or Docker. The default. | [K3D.md](K3D.md) |
| The kernel of the node: `/dev/kvm`, Kata or another VM-based runtime, a RuntimeClass installed on the node, systemd units | **K3s in a VM** (Colima or Lima) | [K3S-VM.md](K3S-VM.md) |
| Code that nobody trusts: an attack suite, an agent with no limits | **K3s in a disposable VM**, with the isolation rules | [K3S-VM.md](K3S-VM.md) |
| What a laptop cannot run, such as OpenShift | Not local. Say so and stop. | — |

In a k3d cluster a node is a container. A pod there does not run on a kernel of its own
node, and a VM-based runtime cannot start. That is the one line between the two ways. k3d is
also the cheap way: about 0.6 GB for an idle server node, against a VM of 16 GB or more.

## Choose the lifetime

| Lifetime | When | `down` does | Who may delete |
|---|---|---|---|
| **keep**, the default | The cluster holds things worth keeping: databases, imported images | Stops it. A start brings everything back. | The person only |
| **disposable** | Untrusted code ran in it, or every run needs a fresh cluster | Deletes exactly this one, by name, then checks that it is gone | The script |

## The contract

Every project gets the same files, whatever the way. A person, an agent and a test runner
call the same four scripts.

| File in the project | What it is |
|---|---|
| `.kube-context` | One line: the kube context of this project's cluster. The scripts read it, and the kubectl guard of this plugin reads it. |
| `k8s/local/cluster.yaml` | The cluster as code (k3d) |
| `k8s/local/env.sh` | The project's facts: lifetime, namespaces, images, host names. Sourced by the scripts. |
| `k8s/local/up.sh` | Create the cluster or start it, then wait until the way in answers |
| `k8s/local/deploy.sh` | `up`, build the images, load them, apply, restart, `check` |
| `k8s/local/check.sh` | Prove that the environment is what the README says. Changes nothing. |
| `k8s/local/down.sh` | Stop it (keep), or delete it (disposable) |
| `k8s/local/kustomization.yaml`, `local.yaml` | What `deploy` applies: the local overlay, with the namespace and the Ingress |
| `k8s/local/README.md` | Where everything is, for a person and for an agent |

What every script promises:

- **Safe to run again.** A second `up` on a running cluster only waits and reports.
- **One cluster.** It names the context from `.kube-context` in every call. It never lists
  clusters to act on them, and it never uses the current context.
- **It asks the running thing.** `check` reads the port from the load balancer and the
  server from the kubeconfig. It does not trust the value a flag once had.
- **A failure says what to run.** Exit code 1, and a last line that names the next command.

### Build it (k3d)

1. Pick three values that no other cluster on this machine uses: a name (the repo's name),
   a port for the Ingress, and a `/24` subnet. [K3D.md](K3D.md) shows how to find free ones.
2. Copy `${CLAUDE_PLUGIN_ROOT}/skills/local-cluster/templates/k3d/` into the project:
   `kube-context` becomes `.kube-context` at the repo root, `environment.md` becomes
   `k8s/local/README.md`, and the other files go to `k8s/local/` under their own names.
3. Replace `myapp`, `8090` and `10.89.101.0/24` in every copied file. Fill the facts at the
   top of `env.sh`. Pin the K3s image in `cluster.yaml` to the version that `k3d version`
   prints as the default.
4. Run `k8s/local/up.sh`, then `k8s/local/check.sh --cluster`.
5. Put the project's manifests into the overlay, with one Ingress host per app. Run
   `k8s/local/deploy.sh`. It ends with `check.sh`.
6. Finish `k8s/local/README.md` and add the block below to the project's `CLAUDE.md`.

For K3s in a VM there is no template. Every case differs, so [K3S-VM.md](K3S-VM.md) gives
the parts. The contract stays the same: the same four scripts and the same pin.

## Rules

1. **Every `kubectl` names `--context`.** The current context of the machine is whatever was
   used last, and it can be a remote cluster with admin rights. Never run
   `kubectl config use-context`. In a project with `.kube-context`, the guard of this plugin
   asks the person before a `kubectl` call that names no context or another one.
2. **Touch only the cluster in `.kube-context`.** Every other cluster on the machine belongs
   to another project. Do not stop it, delete it or deploy to it.
3. **Never delete a keep cluster to get past an error.** `cluster already exists` means: start
   it. A delete loses every volume, namespace and imported image.
4. **Change the cluster through the scripts.** Change a manifest, then run `deploy.sh`. A
   `kubectl apply`, `patch` or `edit` by hand is undone by the next deploy, and nobody knows
   why it worked before.
5. **Read with the least power that works.** A `kubectl get`, `logs` or `describe` with
   `--context` is fine. For a cluster that holds real secrets, give the agent its own
   identity: a ServiceAccount bound to the built-in ClusterRole `view` (it reads no Secret),
   and a token for one hour from `kubectl create token <account> --duration=1h`.
6. **Ports listen on `127.0.0.1` only.** The LAN sees nothing of the cluster.
7. **Secrets never pass through the session.** A script builds them from an encrypted file or
   generates them. Nothing prints a value.
8. **Pin what you install.** The K3s image, the K3s version in a VM.

Permission rules worth adding to the project's `.claude/settings.json`:

```json
{
  "permissions": {
    "ask": [
      "Bash(k3d cluster delete:*)",
      "Bash(*down.sh --delete*)",
      "Bash(kubectl delete:*)",
      "Bash(kubectl * delete *)",
      "Bash(colima delete:*)",
      "Bash(limactl delete:*)"
    ]
  }
}
```

## Reach it

- **A URL is a host name plus the port of the machine**: `http://<app>.localhost:<port>`.
  Traefik, the Ingress that K3s brings, picks the app by the host name. No `port-forward`
  and no `/etc/hosts` line.
- **A browser test** opens that URL. Chromium and `curl` resolve every `*.localhost` name to
  this machine by themselves.
- **Other clients** (Python, Node) ask the system resolver. A current macOS knows the name.
  An older system may not, and in a sandboxed session the same lookup failed. Check it once:
  `python3 -c 'import socket; print(socket.gethostbyname("x.localhost"))'`. If it fails,
  call `http://127.0.0.1:<port>` with a `Host: <app>.localhost` header.
- **Right after a deploy** the Ingress can answer 404 or 503 for a few seconds, also when
  the Deployment is `Available`. `check.sh` waits for it. A test that calls the URL by
  itself runs after `check.sh`, not before.
- **Headlamp** is the window on the cluster. It reads `~/.kube/config` and lists every
  context. It installs nothing into the cluster.
- **From a pod to the laptop** (a model gateway, a database on the host):
  `host.containers.internal` on Podman, `host.docker.internal` on Docker.

## The sandbox

A sandboxed session cannot reach the socket of the container engine, and it cannot read
`~/.kube/config`. `up.sh` then stops with `no container engine answers`. Do not work around
it. Tell the person: the project decides once if the sandbox is off for this repo, or if the
socket is allowed. That socket controls every container on the machine.

## Document it

`k8s/local/README.md` holds five things. `templates/k3d/environment.md` is the shape:

1. What and where: the way, the cluster's name, the context, the lifetime, the way in.
2. The commands, each with what it does.
3. Services and ports: one table with URL, namespace and sign-in.
4. How to test each part: one table, part by part, with the tool.
5. What an agent may do without a question, what goes through the scripts, and what needs
   the person's word.

The project's `CLAUDE.md` gets a short block, so every session knows the cluster exists:

```markdown
## Local cluster

This project runs in its own Kubernetes cluster on the laptop: context `k3d-myapp`
(pinned in `.kube-context`), way in `http://myapp.localhost:8090`.
`k8s/local/up.sh` starts it, `k8s/local/deploy.sh` builds and deploys, `k8s/local/check.sh`
proves it, `k8s/local/down.sh` stops it. Every `kubectl` names `--context k3d-myapp`.
Change the cluster through `deploy.sh` only. Never delete the cluster. Details:
`k8s/local/README.md`.
```

When you are done, tell the person: the way and the lifetime, the context, the URLs, the
four commands, and what you did not check.

## Reference files

| File | Read this when… |
|---|---|
| [K3D.md](K3D.md) | Building or debugging a k3d cluster: Podman setup, `cluster.yaml`, free ports and subnets, images, Ingress host names, kubeconfig, more than one cluster, measured times and memory, traps. |
| [K3S-VM.md](K3S-VM.md) | The work needs the node's kernel or runs untrusted code: Colima or Lima, K3s in the VM, ports on `127.0.0.1`, kubeconfig merge, images, the isolation rules, disposable boxes, traps. |
| [templates/k3d/](templates/k3d/) | Starting a k3d cluster in a project: the files of the contract, ready to copy. |

## Package Requirements

- `k3d` and `kubectl`
- Podman (Podman Desktop on macOS) or Docker, with the `docker` CLI
- `curl`, `lsof`, `awk`, `sed`: on every Mac
- Optional: Headlamp, to watch the cluster
- For the VM way: `colima` or `limactl` (Lima 2.0 or newer)
