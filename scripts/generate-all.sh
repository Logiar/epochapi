#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

node scripts/validate-openapi.mjs
node scripts/generate-web-docs-model.mjs
./scripts/generate-web-types.sh
./scripts/generate-rust-contract.sh
