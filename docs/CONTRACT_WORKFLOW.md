# Contract Workflow

`openapi.yaml` is the single source of truth for:

- backend contract surface,
- interactive website documentation,
- generated web client types.

## Update process

1. Edit `openapi.yaml`.
2. Run `./scripts/generate-all.sh`.
3. Fix backend implementation errors until `cargo check` passes.
4. Run `npm run build` inside `web/`.
5. Run `./scripts/check-generated-clean.sh`.

If step 3 fails after spec changes, the generated Rust trait changed and backend code must be updated.

## Runtime conformance

Run `./scripts/contract-test.sh` to execute runtime API checks against the live server.
