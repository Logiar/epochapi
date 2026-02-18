#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export ED25519_PRIVATE_KEY_HEX="1f1e1d1c1b1a191817161514131211100f0e0d0c0b0a09080706050403020100"

cargo run --release >/tmp/epochapi-contract.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in $(seq 1 60); do
  if curl --silent --show-error --fail "http://127.0.0.1:8080/now" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl --silent --show-error --fail "http://127.0.0.1:8080/now" >/dev/null 2>&1; then
  echo "Server did not become ready in time" >&2
  if [ -f /tmp/epochapi-contract.log ]; then
    tail -n 200 /tmp/epochapi-contract.log >&2
  fi
  exit 1
fi

schemathesis run --url "http://127.0.0.1:8080" openapi.yaml --checks all
