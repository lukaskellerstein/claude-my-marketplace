#!/usr/bin/env bash
# Build, load and deploy this project into its local cluster, then check it.
# Run it again after every code change: it rebuilds and restarts.
#   k8s/local/deploy.sh             up, build the images, import, apply, restart, check
#   k8s/local/deploy.sh --no-build  the same, without the image builds
set -euo pipefail
# shellcheck source-path=SCRIPTDIR source=env.sh
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
case "${1:-}" in
  "" | --no-build) ;;
  *) echo "usage: $0 [--no-build]" >&2; exit 2 ;;
esac

"$HERE/up.sh"
cd "$ROOT"   # the build folders and KUSTOMIZE_DIR are relative to the repo root

if [ "${1:-}" != "--no-build" ] && [ "${#IMAGES[@]}" -gt 0 ]; then
  # --load puts the image in the local store. Without it a buildx builder keeps the image in
  # its cache, and the OLD image gets imported. The builder keeps running after a build, so
  # stop it, also when a build fails. Its cache stays in a volume for the next build.
  trap '"${DOCKER[@]}" buildx stop >/dev/null 2>&1 || true' EXIT
  names=()
  for entry in "${IMAGES[@]}"; do
    read -r image folder <<<"$entry"
    echo "==> build $image ($folder/)"
    "${DOCKER[@]}" build --load -q -t "$image" "$folder"
    names+=("$image")
  done
  "${DOCKER[@]}" buildx stop >/dev/null 2>&1 || true
  trap - EXIT

  # No registry: copy the images into every node. The manifests say
  # imagePullPolicy: IfNotPresent, so a node uses its copy and never asks a registry.
  echo "==> import into the cluster"
  k3d image import "${names[@]}" -c "$CLUSTER"
fi

echo "==> apply $KUSTOMIZE_DIR"
"${KUBECTL[@]}" apply -k "$KUSTOMIZE_DIR"

# The tag stays the same, so an apply alone does not change a running pod: restart every
# Deployment that runs an image built here.
for ns in ${NAMESPACES[@]+"${NAMESPACES[@]}"}; do
  deployments="$("${KUBECTL[@]}" -n "$ns" get deploy \
    -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.spec.template.spec.containers[*].image}{"\n"}{end}' |
    awk '/localhost\// {print "deploy/" $1}')"
  [ -n "$deployments" ] || continue
  echo "==> restart in $ns:" $deployments
  # shellcheck disable=SC2086
  "${KUBECTL[@]}" -n "$ns" rollout restart $deployments >/dev/null
  for deployment in $deployments; do
    "${KUBECTL[@]}" -n "$ns" rollout status "$deployment" --timeout=300s
  done
done

"$HERE/check.sh"
