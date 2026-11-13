#!/usr/bin/env bash
# Stop the local cluster of this project, or delete it.
#   k8s/local/down.sh            LIFETIME=keep: stop it. Everything in it stays: namespaces, images, volumes.
#                                LIFETIME=disposable: delete it.
#   k8s/local/down.sh --delete   delete it, whatever LIFETIME says. In a keep cluster this is
#                                the person's call, never an agent's: a delete loses every volume.
# It names exactly one cluster, the one in .kube-context. It never lists and never sweeps,
# so it cannot touch the cluster of another project.
set -euo pipefail
# shellcheck source-path=SCRIPTDIR source=env.sh
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
mode="$LIFETIME"
case "${1:-}" in
  "") ;;
  --delete) mode=disposable ;;
  *) echo "usage: $0 [--delete]" >&2; exit 2 ;;
esac
need k3d; need docker
engine_up

if ! k3d cluster get "$CLUSTER" >/dev/null 2>&1; then
  echo "down: there is no cluster $CLUSTER"
  exit 0
fi

if [ "$mode" = disposable ]; then
  k3d cluster delete "$CLUSTER"
  # Ask k3d if it is gone. The exit code of a delete is not proof.
  if k3d cluster get "$CLUSTER" >/dev/null 2>&1; then
    die "the cluster $CLUSTER still exists after the delete. Look: k3d cluster list"
  fi
  echo "down: deleted the cluster $CLUSTER and its context $CONTEXT"
else
  k3d cluster stop "$CLUSTER"
  echo "down: stopped the cluster $CLUSTER. k8s/local/up.sh starts it again with everything in it"
fi
