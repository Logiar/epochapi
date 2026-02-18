# epochapi

Stateless, high-performance Rust REST API for epoch timestamps.

## Endpoints

- `GET /now?format=<seconds|ms|ns|iso>[&json]`
  - Returns the current UTC timestamp in the requested format.
  - Add `json` query key (for example `?format=iso&json`) to get JSON output.

- `GET /secnow?format=<seconds|ms|ns|iso>`
  - Returns JSON by default:
    ```json
    {
      "format": "iso",
      "timestamp": "2026-01-01T00:00:00+00:00",
      "signature": "<base64url_signature>",
      "token": "iso:2026-01-01T00:00:00+00:00.<base64url_signature>"
    }
    ```

- `POST /validate`
  - Accepts exactly the JSON returned by `/secnow`.
  - Returns `200` only when:
    - `token` signature is valid,
    - `signature` matches the token suffix,
    - and `format`/`timestamp` still match the token payload.
  - Returns `400` for tampered/invalid payloads.

## Signing key

The API signs timestamps using Ed25519:

- Environment variable: `ED25519_PRIVATE_KEY_HEX`
- Must be a 32-byte private key represented as hex.
- The service fails to start if this variable is missing.

## Run locally

```bash
cargo run --release
```

## Build and run with Docker

```bash
docker build -t epochapi .
docker run --rm -p 8080:8080 \
  -e ED25519_PRIVATE_KEY_HEX=<64_hex_chars> \
  epochapi
```

## Testing

```bash
cargo test
```

To smoke-test the distroless container image locally (requires Docker, `curl`, and `jq`):

```bash
./scripts/docker-smoke-test.sh
```

The smoke test injects `ED25519_PRIVATE_KEY_HEX` automatically by generating an ephemeral key unless you explicitly provide one in your environment.

## OpenAPI

OpenAPI 3.0 spec is available at:

```
openapi.yaml
```

## Spec-first contract workflow

This repository treats `openapi.yaml` as the canonical API contract.

- Web documentation and API tester are generated from the spec.
- Rust contract interface (`api_contract::EpochApiContract`) is generated from the spec.
- Backend implementation compiles against that generated trait.

Generate artifacts:

```bash
./scripts/generate-all.sh
```

Check generated artifacts are committed and up-to-date:

```bash
./scripts/check-generated-clean.sh
```

## Web documentation site

A separate Astro site lives in `web/`.

Install dependencies and build:

```bash
cd web
npm install
npm run build
npm run test:unit
npx playwright install chromium
npm run test:a11y
```

Run locally:

```bash
cd web
PUBLIC_API_BASE_URL=http://localhost:8080 npm run dev
```

## Runtime contract test

Runtime conformance uses `uv` to create a local virtual environment, install Schemathesis, and run contract checks:

```bash
./scripts/contract-test.sh
```

## Production-like local stack with Docker Compose

The compose setup mirrors a production split-domain topology:

- `example.com` -> docs site (static Astro build)
- `api.example.com` -> API service
- `edge` (nginx) acts as the local reverse proxy / ingress

Start the full stack:

```bash
docker compose up --build
```

To route `example.com` and `api.example.com` to your local machine, add these host entries:

```text
127.0.0.1 example.com
127.0.0.1 api.example.com
```

Then visit:

- `http://example.com` for docs
- `http://api.example.com/now?format=iso` for API

### Local development allowances

To keep local debugging convenient, compose also exposes direct ports:

- `http://localhost:3000` -> docs container directly
- `http://localhost:8080` -> API container directly

These direct ports are a local-only convenience and are not intended as production exposure.

### Distroless docs image

`web/Dockerfile` builds the Astro static site and serves it from a distroless Node runtime.
This keeps the docs runtime image minimal while still allowing static hosting behavior similar
to production.
