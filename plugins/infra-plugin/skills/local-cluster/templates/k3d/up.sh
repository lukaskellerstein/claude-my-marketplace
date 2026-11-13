#!/usr/bin/env bash
# The local cluster of this project: create it, or start it, then wait until it answers.
# Safe to run again: on a running cluster it only waits and reports.
#   k8s/local/up.sh
set -euo pipefail
# shellcheck source-path=SCRIPTDIR source=env.sh
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
need k3d; need kubectl; need docker; need curl
engine_up

if k3d cluster get "$CLUSTER" >/dev/null 2>&1; then
  # There already, running or stopped. A start on a running cluster changes nothing.
  # Never delete a cluster to get past an error here: a start brings back every namespace,
  # image and volume in it, and a delete loses them all.
  k3d cluster start "$CLUSTER" >/dev/null
else
  port="$(planned_port)"
  if [ -n "$port" ] && pid="$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -1)" && [ -n "$pid" ]; then
    die "port $port is taken by pid $pid ($(ps -p "$pid" -o args= 2>/dev/null || echo "its command is not readable")). Pick a free port in cluster.yaml"
  fi
  echo "==> create the cluster $CLUSTER"
  k3d cluster create --config "$CONFIG"
fi

# The context is in the kubeconfig, and the person's current context stays what it is.
if ! kubectl config get-contexts "$CONTEXT" >/dev/null 2>&1; then
  k3d kubeconfig merge "$CLUSTER" --kubeconfig-merge-default --kubeconfig-switch-context=false >/dev/null
fi

# Two waits. `kubectl wait --all` with no object yet is an error, so poll for the object first.
echo "==> wait for the node"
for _ in $(seq 1 60); do
  [ -n "$("${KUBECTL[@]}" get nodes -o name 2>/dev/null)" ] && break
  sleep 2
done
"${KUBECTL[@]}" wait --for=condition=Ready node --all --timeout=180s >/dev/null

# K3s installs Traefik with a Job after it starts: about a minute after a create, and up to
# two minutes after a start with many pods. A cluster without Traefik: remove this block.
echo "==> wait for Traefik, the Ingress"
for _ in $(seq 1 90); do
  "${KUBECTL[@]}" -n kube-system get deploy traefik >/dev/null 2>&1 && break
  sleep 2
done
"${KUBECTL[@]}" -n kube-system rollout status deploy/traefik --timeout=180s >/dev/null

PORT="$(lb_port)"
[ -n "$PORT" ] || die "the load balancer k3d-$CLUSTER-serverlb publishes no port for 80"
answered=no
for _ in $(seq 1 90); do
  # Any answer counts: Traefik says 404 for a host that no app owns.
  if curl -s -o /dev/null -m 2 "http://127.0.0.1:$PORT"; then answered=yes; break; fi
  sleep 2
done
[ "$answered" = yes ] || die "nothing answers on 127.0.0.1:$PORT after 3 minutes"

echo "up: context $CONTEXT, Ingress on http://<app>.localhost:$PORT"
