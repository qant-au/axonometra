#!/usr/bin/env bash
# restart.sh — rebuild the standalone Axonometra Docker image and
# serve it on the host. After the container is healthy the script
# stays attached and tails the logs until the user presses 'D' — at
# which point it detaches and exits 0 but leaves the container
# running. Ctrl+C while watching has the same effect. Pass
# NO_WATCH=1 (or run with a non-tty stdin) to skip the watch.
#
#   http://localhost:4890   axonometra (single SPA)
#
# Usage:
#   bash restart.sh                  # rebuild & restart, wait for HTTP 200,
#                                    # then tail logs until 'D'
#   PORT=4891 bash restart.sh        # override host port (default 4890)
#   TAG=axonometra:dev bash restart.sh
#   NO_WATCH=1 bash restart.sh       # skip the log watch (CI / non-interactive)
#
# Reserved host-port range for axonometra: 4890-4899. Default is 4890.
#
# Exits 0 once the container responds, or non-zero on build / start /
# poll failure.

set -euo pipefail

PORT="${PORT:-4890}"
TAG="${TAG:-axonometra}"
NAME="${NAME:-axonometra-dev}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-60}"
NO_WATCH="${NO_WATCH:-0}"

cd "$(dirname "$0")"

cleanup_on_interrupt() {
  echo
  echo "==> Caught interrupt — stopping container"
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  exit 130
}
trap cleanup_on_interrupt INT TERM

wait_for_http() {
  local url="$1"
  local label="$2"
  local deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))
  while true; do
    if curl --silent --fail --max-time 2 --output /dev/null "$url"; then
      echo "==> $label is up at $url"
      return 0
    fi
    if (( $(date +%s) >= deadline )); then
      echo "ERROR: $label did not respond within ${TIMEOUT_SECONDS}s ($url)" >&2
      return 1
    fi
    sleep 1
  done
}

echo "==> Stopping any prior \"$NAME\" container"
docker rm -f "$NAME" >/dev/null 2>&1 || true

echo "==> Building image \"$TAG\""
docker build -t "$TAG" -f Dockerfile .

echo "==> Starting container \"$NAME\" on host port $PORT"
# Container listens on 8080 internally (nginx-unprivileged base).
docker run -d --rm --name "$NAME" -p "${PORT}:8080" "$TAG" >/dev/null

if ! wait_for_http "http://localhost:${PORT}/" "Axonometra"; then
  docker logs "$NAME" >&2 || true
  exit 1
fi

echo "==> Done."
echo "    Axonometra:  http://localhost:${PORT}/"

# ---- Watch loop ----
if [[ "$NO_WATCH" == "1" ]] || [[ ! -t 0 ]]; then
  if [[ "$NO_WATCH" != "1" ]]; then
    echo
    echo "==> stdin is not a tty; skipping the log watch."
    echo "    Follow logs with: docker logs -f $NAME"
  fi
  exit 0
fi

WATCH_PIDS=()
WATCH_STTY=""

detach_from_watch() {
  if [[ -n "$WATCH_STTY" ]]; then
    stty "$WATCH_STTY" </dev/tty 2>/dev/null || true
    WATCH_STTY=""
  fi
  if (( ${#WATCH_PIDS[@]} > 0 )); then
    kill "${WATCH_PIDS[@]}" 2>/dev/null || true
    wait "${WATCH_PIDS[@]}" 2>/dev/null || true
    WATCH_PIDS=()
  fi
}

on_watch_signal() {
  detach_from_watch
  echo
  echo "==> Detached. Container still running:"
  echo "    docker logs -f $NAME"
  exit 0
}

trap detach_from_watch EXIT
trap on_watch_signal INT TERM

echo
echo "==> Watching container — press 'D' to detach (container keeps running)."

docker logs -f --tail 20 "$NAME" 2>&1 | sed -u "s|^|[$NAME] |" &
WATCH_PIDS+=("$!")

WATCH_STTY=$(stty -g </dev/tty 2>/dev/null || true)
stty -icanon -echo </dev/tty 2>/dev/null || true

while IFS= read -r -n 1 watch_char </dev/tty; do
  case "$watch_char" in
    d|D) break ;;
  esac
done

on_watch_signal
