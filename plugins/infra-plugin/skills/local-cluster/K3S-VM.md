# K3s in a VM

Use this way only when k3d cannot do the work:

| The work needs | Why k3d cannot do it |
|---|---|
| `/dev/kvm`, Kata or another VM-based runtime | A k3d node is a container. A VM-based runtime cannot start in it. |
| A runtime or a RuntimeClass installed on the node, systemd units | The node must be a real machine with its own kernel and init. |
| To run code that nobody trusts | A container on your engine is too close to your laptop. |

K3s in a VM is conformant Kubernetes on a real node: the pod runs on the node's kernel, and
a `runtimeClassName` is the same field as on any cluster. The cost is memory: a VM of 16 GB
or more, against about 0.6 GB for a k3d server node.

There is no template for this way. Every case differs. This file gives the parts, each with
the reason it exists.

## Which VM

| Tool | Use it when | Know this |
|---|---|---|
| **Colima** | The VM stays for weeks and also builds the images | It brings its own Docker engine and containerd. Do not install a second containerd. |
| **Lima** (`limactl`) | The VM must start bare, like a cloud VM, or it runs untrusted code | You control every mount and every package. |
| Podman machine | Never for this | Nested guests lose interrupts and hang: 2 of 23 started, against 20 of 20 under `vz` (measured in October 2026 on an Apple M5 Max). |

Both use Apple's hypervisor: `vz` with nested virtualization. It needs an Apple Silicon Mac
with an M3 or later and macOS 15 or newer. A VM-based runtime needs it. gVisor does not.

Sizes that worked: 8 CPU, 24 GB and 100 GB disk for a platform with a workflow engine, a
Git forge and an identity provider. 8 CPU, 32 GB and 80 GB for one node with every sandbox
runtime installed. 2 CPU, 4 GB and 20 GB for a bare box.

## The contract is the same

- `.kube-context` holds `k3s-<name>`. The kubectl guard reads it as it does for k3d.
- `k8s/local/up.sh` makes or starts the VM, installs K3s in it, merges the kubeconfig, loads
  the images, applies the manifests and waits. Safe to run again.
- `deploy.sh`, `check.sh` and `down.sh` keep their meaning. In a keep VM, `down` stops and
  never deletes.
- A box where everything runs inside the VM over ssh has no context on the Mac. It needs no
  pin, and its scripts name the box instead.

## Colima: a VM that stays

```bash
PROFILE=myapp
CTX="k3s-$PROFILE"
# Every docker call goes to the profile's engine. DOCKER_HOST would win over DOCKER_CONTEXT.
export DOCKER_CONTEXT="colima-$PROFILE"
unset DOCKER_HOST
vm() { colima ssh -p "$PROFILE" -- sudo "$@"; }

if ! colima status "$PROFILE" >/dev/null 2>&1; then
  if colima list --json 2>/dev/null | grep -q "\"name\":\"$PROFILE\""; then
    colima start "$PROFILE" --activate=false
  else
    colima start "$PROFILE" --vm-type vz --nested-virtualization \
      --cpus 8 --memory 24 --disk 100 --activate=false
  fi
fi
vm bash -s <k8s/local/k3s-node.sh      # K3s, as root in the VM
```

- `--activate=false`: Colima otherwise makes its Docker context the person's current one.
- The size goes on the command line only when the profile is created. Colima saves the flags
  of every start, so the same flags later undo a size the person set by hand.

### K3s in the VM

The node script runs as root in the VM. It installs K3s only when the version differs, and
restarts K3s only when its config changed.

```bash
K3S_VERSION=v1.36.5+k3s1
IP="$(ip -4 -o addr show eth0 | awk '{print $4}' | cut -d/ -f1)"

cat >/etc/rancher/k3s/config.yaml <<EOF
disable: [traefik, servicelb]          # only when the project brings its own way in
service-node-port-range: 40000-49999
https-listen-port: 46443
node-ip: $IP
advertise-address: $IP
bind-address: $IP
kubelet-arg: ["address=$IP"]
kube-proxy-arg: ["nodeport-addresses=$IP/32"]
write-kubeconfig-mode: "0600"
EOF

curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="$K3S_VERSION" INSTALL_K3S_SYMLINK=skip sh -s - server
until k3s kubectl get --raw /readyz >/dev/null 2>&1; do sleep 2; done
```

Why K3s binds the VM's own address, and why the `kubectl` link is skipped: Colima maps a
port that the VM holds on `0.0.0.0` to `0.0.0.0` on the Mac, the LAN included. Lima's guest
agent does the same for every NodePort when it finds a `kubectl` in the VM.

### Ports on `127.0.0.1` only

Each NodePort is its own host port. One simple rule keeps them readable: host port = service
port + 40000. `systemd-socket-proxyd` publishes each one on the VM's `127.0.0.1`, and Lima
maps that to the Mac's `127.0.0.1`.

```ini
# /etc/systemd/system/local-port@.socket
[Socket]
ListenStream=127.0.0.1:%i
[Install]
WantedBy=sockets.target

# /etc/systemd/system/local-port@.service   ($IP is the VM's own address)
[Service]
ExecStart=/usr/lib/systemd/systemd-socket-proxyd $IP:%i
```

Enable `local-port@<port>.socket` for every port, and disable the units of ports that left
the list. A running proxy keeps the address it started with: stop the service and restart
the socket after a change.

### The kubeconfig

K3s writes `/etc/rancher/k3s/k3s.yaml` with the names `default`. Merge it into the Mac's
kubeconfig as its own context, and keep the person's current context:

```bash
merge_kubeconfig() {
  local into="$1" new merged
  new="$(mktemp)"; merged="$(mktemp)"
  vm cat /etc/rancher/k3s/k3s.yaml \
    | sed -E -e "s/^(  name|    cluster|    user|- name): default$/\1: $CTX/" -e '/^current-context:/d' \
             -e 's#server: https://[^:]+:#server: https://127.0.0.1:#' >"$new"
  [ -f "$into" ] || : >"$into"
  KUBECONFIG="$new:$into" kubectl config view --raw >"$merged"
  cat "$merged" >"$into"   # through the file, so a symlinked kubeconfig stays a link
  rm -f "$new" "$merged"
}
merge_kubeconfig "$HOME/.kube/config"
```

The file holds the admin key of the cluster. It goes from file to file and never to the
terminal.

### Images

The VM's Docker engine builds, and K3s has its own containerd. Copy each image across:

```bash
docker build -q -t docker.io/myapp/backend:dev backend
docker save docker.io/myapp/backend:dev | vm k3s ctr -n k8s.io images import -
```

Write the `docker.io/` prefix: containerd reads `myapp/backend:dev` as
`docker.io/myapp/backend:dev`, and the name in the manifest must match.

## Lima: a bare VM

```yaml
base: template:ubuntu-24.04
vmType: vz
nestedVirtualization: true
cpus: 8
memory: 32GiB
disk: 80GiB
mounts: []
containerd:
  system: false        # the template otherwise installs a containerd that collides with yours
  user: false
networks:
  - vzNAT: true        # an address the Mac reaches directly, for ssh and rsync
```

```bash
limactl create --tty=false --mount-none --name "$NAME" vm.yaml
limactl start --tty=false "$NAME"
# sshd answers before cloud-init is done: wait for it before the first command in the VM
```

K3s on the box, with the parts a test does not use turned off (about 300 MB):

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="$K3S_VERSION" sh -s - \
  --disable traefik --disable servicelb --disable metrics-server
for _ in $(seq 1 60); do [ -n "$(kubectl get nodes -o name 2>/dev/null)" ] && break; sleep 5; done
kubectl wait --for=condition=Ready node --all --timeout=300s
```

Both waits are needed. For about 20 seconds after K3s starts, the API answers but the node
is not registered, and `kubectl wait --all` with no object fails at once.

## Untrusted code: the isolation rules

A VM on a laptop must stand where a cloud VM stands: a machine with nothing private next to
it. These rules are on the box before any untrusted code runs.

1. **No host folder.** `mounts: []` in the template and `limactl create --mount-none`. The
   Ubuntu template's own mount of the home folder survives an empty list. A mounted home
   hands the code the real `~/.ssh`.
2. **A host guard.** An nftables table of its own drops every new connection from the VM to
   a private address through the uplink: `10.0.0.0/8`, `100.64.0.0/10`, `169.254.0.0/16`,
   `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7`, `fe80::/10`. This covers a host process, a
   container, a pod and a nested guest. DNS to the VM's own resolvers stays open, replies
   stay open, and traffic that never leaves the VM is untouched. Lima's `192.168.5.2` is the
   Mac's own localhost: without the guard, every dev server on the Mac is one connect away.
   Use `delete table` and recreate, never `flush ruleset`: K3s keeps rules of its own. Keep
   the guard in a systemd unit, so it is there after a VM restart.
3. **An unprivileged user.** The VM otherwise logs in as the Mac user. Make a user in the
   provision script and run everything as that user.
4. **A throwaway ssh key** outside the repo. The key that reaches a hostile box must be
   disposable too.
5. **Disposable, and exact.** `down` deletes exactly its own box by name:
   `limactl delete -f "$NAME"`. It never sweeps a prefix. A sweep in a single `down` once
   destroyed a neighbour's live box. Only an explicit `--all` sweeps, by a prefix that only
   this project uses, and it reports every other VM without touching it.
6. **Ask the hypervisor.** A delete returns before the machine is gone, so check
   `limactl list` before the script says `deleted`. A state file is a cache, not a fact.
7. **Check from the inside.** Ask the sandbox which kernel answered. A setup that silently
   falls back to `runc` exits 0 and prints what the test expects. The check of the guard
   must see two things: the connect to the Mac fails, and the guard's drop counter moves. A
   timeout alone also happens when the Mac's firewall drops the packet.

## Traps

| Trap | Symptom | Fix |
|---|---|---|
| Lima mounts the home folder | `mounts: []` in the template, and `~` is still in the VM | `limactl create --mount-none`, and a check for zero host mounts |
| cloud-init is not done when sshd answers | The user does not exist yet: `Permission denied (publickey)` | `cloud-init status --wait` before the first command |
| `loginctl enable-linger` during boot | systemd-logind spins at full CPU, every ssh login stalls about 25 s | Set linger by file: `touch /var/lib/systemd/linger/<user>` |
| A port on `0.0.0.0` in the VM | Colima maps it to `0.0.0.0` on the Mac, so the LAN reaches the cluster | Bind K3s to the VM's address and publish each port on `127.0.0.1` with `systemd-socket-proxyd` |
| K3s starts before Colima's data disk is mounted | After a VM restart the API serves a certificate of an unknown CA: K3s made a new cluster on the root disk | Start K3s after `cloud-final.service`, with `ExecStartPre` that waits for `mountpoint -q /var/lib/rancher` |
| A node-level runtime installed before a K3s restart | The runtime is gone from the node | Install it after K3s, never before |
| `kubectl wait --all` right after K3s starts | `error: no matching resources found` | Poll for the object first, then wait |
| An export appended to `~/.bashrc` | A non-interactive ssh skips it: the file starts with an interactive-shell guard | A dedicated env file that the scripts source |
| `--write-kubeconfig-mode 0644` | Every user of the VM reads the admin key | Only on a box that lives for minutes. Otherwise `0600` and a scoped kubeconfig |
| `$(… \| grep -c X \|\| echo 0)` in a check | It reports healthy when the count is 0: `grep -c` prints `0` and exits 1, so the value is two lines | Test the pipeline with `grep -q` |
