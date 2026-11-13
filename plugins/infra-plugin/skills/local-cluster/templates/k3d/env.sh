# shellcheck shell=bash
# The facts of this project's local cluster, and the helpers every script in this folder uses.
# Sourced by up.sh, deploy.sh, check.sh and down.sh. Never run it.

# --- the facts of this project: change these -----------------------------------------------
LIFETIME=keep                 # keep: down.sh stops the cluster. disposable: down.sh deletes it.
NAMESPACES=(myapp)            # the namespaces this project owns in the cluster
KUSTOMIZE_DIR=k8s/local       # what deploy.sh applies, from the repo root: kubectl apply -k
IMAGES=(                      # "image  build-folder", the folder from the repo root. None: IMAGES=()
  "localhost/myapp-backend:dev  backend"
)
HOSTS=(myapp.localhost)       # the host name of each Ingress. check.sh calls every one. None: HOSTS=()
# -------------------------------------------------------------------------------------------

die() { echo "error: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "missing tool: $1"; }

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# The repo root is the nearest folder above this one that holds .kube-context: the one name
# that these scripts and the kubectl guard both read.
ROOT="$HERE"
while [ ! -f "$ROOT/.kube-context" ]; do
  [ "$ROOT" = / ] && die "no .kube-context in a folder above $HERE"
  ROOT="$(dirname "$ROOT")"
done
CONTEXT="$(awk '{sub(/#.*/, "")} NF {print $1; exit}' "$ROOT/.kube-context")"
case "$CONTEXT" in
  k3d-?*) ;;
  *) die "the first name in $ROOT/.kube-context must be k3d-<cluster>, found '${CONTEXT}'" ;;
esac
CLUSTER="${CONTEXT#k3d-}"

# cluster.yaml and .kube-context are two files with one name. They must agree.
CONFIG="$HERE/cluster.yaml"
[ -f "$CONFIG" ] || die "no $CONFIG"
in_config="$(awk '/^metadata:/ {m=1; next} m && /^[^[:space:]#]/ {m=0} m && $1 == "name:" {print $2; exit}' "$CONFIG")"
[ "$in_config" = "$CLUSTER" ] \
  || die "cluster.yaml names the cluster '${in_config}', .kube-context names '${CONTEXT}': make them agree"

# Every kubectl call names the cluster. The current context of the machine can be another one.
KUBECTL=(kubectl --context "$CONTEXT")

# The docker CLI reaches Podman through its "podman" context, when there is one.
if docker context inspect podman >/dev/null 2>&1; then DOCKER=(docker --context podman); else DOCKER=(docker); fi

engine_up() {
  "${DOCKER[@]}" info >/dev/null 2>&1 \
    || die "no container engine answers. Podman: podman machine start. A sandboxed session: it cannot reach the socket"
}

# The port of this machine that reaches the Ingress, asked of the running load balancer.
lb_port() {
  { "${DOCKER[@]}" port "k3d-$CLUSTER-serverlb" 80/tcp 2>/dev/null || true; } | awk -F: 'NR == 1 {print $NF}'
}

# The same port as cluster.yaml plans it, before the cluster exists. Empty when the line has another shape.
planned_port() {
  sed -n 's/^ *- port: *\([0-9.]*:\)\{0,1\}\([0-9][0-9]*\):80.*/\2/p' "$CONFIG" | head -1
}
