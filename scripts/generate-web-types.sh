#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

npx --prefix web openapi-typescript openapi.yaml -o web/src/generated/openapi.ts
