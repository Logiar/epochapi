#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME=${IMAGE_NAME:-epochapi:test}
CONTAINER_NAME=${CONTAINER_NAME:-epochapi-smoke}
PORT=${PORT:-18080}

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup

echo "[docker-smoke] Building image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" .

echo "[docker-smoke] Starting container: $CONTAINER_NAME"
docker run -d --name "$CONTAINER_NAME" -p "$PORT:8080" "$IMAGE_NAME" >/dev/null

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT}/now?format=s" >/dev/null; then
    break
  fi
  sleep 1
done

payload_file=$(mktemp)
trap 'rm -f "$payload_file"; cleanup' EXIT

curl -fsS "http://127.0.0.1:${PORT}/secnow?format=iso" > "$payload_file"
jq -e '.format and .timestamp and .signature and .token' "$payload_file" >/dev/null

status=$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "http://127.0.0.1:${PORT}/validate" \
  -H 'content-type: application/json' \
  --data @"$payload_file")

if [[ "$status" != "200" ]]; then
  echo "[docker-smoke] Expected 200 for valid payload, got $status" >&2
  exit 1
fi

tampered_file=$(mktemp)
trap 'rm -f "$payload_file" "$tampered_file"; cleanup' EXIT
jq '.timestamp="tampered"' "$payload_file" > "$tampered_file"
status=$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "http://127.0.0.1:${PORT}/validate" \
  -H 'content-type: application/json' \
  --data @"$tampered_file")

if [[ "$status" != "400" ]]; then
  echo "[docker-smoke] Expected 400 for tampered payload, got $status" >&2
  exit 1
fi

echo "[docker-smoke] PASS"
