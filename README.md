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

## OpenAPI

OpenAPI 3.0 spec is available at:

```
openapi.yaml
```
