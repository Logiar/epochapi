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

sleep 2

schemathesis run --url "http://127.0.0.1:8080" openapi.yaml --checks all
