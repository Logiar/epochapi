#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

git diff --exit-code -- web/src/generated openapi.yaml contracts/rust/api_contract
