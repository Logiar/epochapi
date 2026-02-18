#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

cargo check --manifest-path contracts/rust/api_contract/Cargo.toml
