#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME=${IMAGE_NAME:-epochapi:test}
CONTAINER_NAME=${CONTAINER_NAME:-epochapi-smoke}
PORT=${PORT:-18080}
PRIVATE_KEY_HEX=${ED25519_PRIVATE_KEY_HEX:-}

if [[ -z "$PRIVATE_KEY_HEX" ]]; then
  # Generate ephemeral 32-byte key hex for smoke testing only.
  PRIVATE_KEY_HEX=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
fi

if [[ ! "$PRIVATE_KEY_HEX" =~ ^[0-9a-fA-F]{64}$ ]]; then
  echo "[docker-smoke] ED25519_PRIVATE_KEY_HEX must be exactly 64 hex chars" >&2
  exit 1
fi

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup

echo "[docker-smoke] Building image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" .

echo "[docker-smoke] Starting container: $CONTAINER_NAME"
docker run -d --name "$CONTAINER_NAME" -p "$PORT:8080" \
  -e "ED25519_PRIVATE_KEY_HEX=$PRIVATE_KEY_HEX" \
  "$IMAGE_NAME" >/dev/null

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
