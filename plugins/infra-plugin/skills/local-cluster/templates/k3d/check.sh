#!/usr/bin/env bash
# Prove that the local cluster is what k8s/local/README.md says. It changes nothing.
#   k8s/local/check.sh            the cluster, the namespaces, every host name
#   k8s/local/check.sh --cluster  the cluster only: before the first deploy
# Exit 0: every line passed. Exit 1: the FAIL line says what is wrong and what to run.
# It asks the running parts (the kubeconfig, the load balancer, the Ingress), never a flag.
set -euo pipefail
# shellcheck source-path=SCRIPTDIR source=env.sh
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
case "${1:-}" in
  "" | --cluster) ;;
  *) echo "usage: $0 [--cluster]" >&2; exit 2 ;;
esac
need kubectl; need curl; need docker

ok() { echo "ok    $*"; }
fail() { echo "FAIL  $*" >&2; exit 1; }

# 1. The pinned context is a cluster on this machine. A pin that names a remote cluster stops here.
server="$(kubectl --context "$CONTEXT" config view --minify -o jsonpath='{.clusters[0].cluster.server}' 2>/dev/null || true)"
case "$server" in
  https://127.0.0.1:* | https://localhost:* | https://0.0.0.0:* | "https://[::1]:"*) ok "context $CONTEXT -> $server" ;;
  "") fail "no context $CONTEXT in the kubeconfig. Run: k8s/local/up.sh" ;;
  *) fail "context $CONTEXT points to $server, which is not this machine" ;;
esac

# 2. The nodes answer and are Ready.
"${KUBECTL[@]}" wait --for=condition=Ready node --all --timeout=60s >/dev/null 2>&1 \
  || fail "the nodes of $CONTEXT are not Ready. Run: k8s/local/up.sh"
ok "nodes Ready: $("${KUBECTL[@]}" get nodes --no-headers | wc -l | tr -d ' ')"

# 3. The Ingress answers on this machine's port. 000 means no answer at all.
PORT="$(lb_port)"
[ -n "$PORT" ] || fail "the load balancer k3d-$CLUSTER-serverlb publishes no port for 80. Run: k8s/local/up.sh"
code="$(curl -s -o /dev/null -m 5 -w '%{http_code}' "http://127.0.0.1:$PORT" || true)"
[ "$code" != 000 ] || fail "nothing answers on 127.0.0.1:$PORT. Run: k8s/local/up.sh"
ok "Ingress answers on 127.0.0.1:$PORT (HTTP $code for a host that no app owns)"

[ "${1:-}" = "--cluster" ] && exit 0

# 4. Every Deployment of this project is Available.
for ns in ${NAMESPACES[@]+"${NAMESPACES[@]}"}; do
  "${KUBECTL[@]}" get namespace "$ns" >/dev/null 2>&1 || fail "no namespace $ns. Run: k8s/local/deploy.sh"
  # `kubectl wait --all` with no object is an error, so ask for the objects first.
  if [ -n "$("${KUBECTL[@]}" -n "$ns" get deploy -o name)" ]; then
    "${KUBECTL[@]}" -n "$ns" wait --for=condition=Available deploy --all --timeout=120s >/dev/null 2>&1 \
      || fail "a Deployment in $ns is not Available. Look: kubectl --context $CONTEXT -n $ns get pods"
  fi
  ok "namespace $ns: every Deployment Available"
done

# 5. Every host name reaches its app through the Ingress. The Host header goes to 127.0.0.1,
#    so the check does not depend on how this machine resolves *.localhost.
#    2xx and 3xx: the app answers. 401 and 403: it answers and wants a sign-in.
#    Traefik learns of a new Ingress and of a new pod a few seconds after the rollout. Until
#    then it says 404 (no route yet) or 503 (a route, and no pod behind it). So every host
#    gets CHECK_WAIT seconds before its answer counts as a failure.
WAIT="${CHECK_WAIT:-60}"
for host in ${HOSTS[@]+"${HOSTS[@]}"}; do
  deadline=$((SECONDS + WAIT))
  while :; do
    code="$(curl -s -o /dev/null -m 5 -w '%{http_code}' -H "Host: $host" "http://127.0.0.1:$PORT/" || true)"
    case "$code" in 2?? | 3?? | 401 | 403) break ;; esac
    [ "$SECONDS" -ge "$deadline" ] && break
    sleep 2
  done
  case "$code" in
    2?? | 3?? | 401 | 403) ok "http://$host:$PORT -> HTTP $code" ;;
    404) fail "http://$host:$PORT -> 404 for ${WAIT}s: no Ingress owns this host. Look: kubectl --context $CONTEXT get ingress -A" ;;
    503) fail "http://$host:$PORT -> 503 for ${WAIT}s: the Ingress has no ready pod behind it. Look: kubectl --context $CONTEXT get pods -A" ;;
    *) fail "http://$host:$PORT -> HTTP $code for ${WAIT}s" ;;
  esac
done
