use std::{collections::HashMap, net::SocketAddr};

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::Utc;
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};

#[derive(Clone)]
struct AppState {
    signing_key: SigningKey,
    verify_key: VerifyingKey,
}

#[derive(Serialize)]
struct TimestampResponse<'a> {
    format: &'a str,
    timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SignedTimestampResponse {
    format: String,
    timestamp: String,
    signature: String,
    token: String,
}

#[tokio::main]
async fn main() {
    let signing_key = load_signing_key().expect("failed to load signing key");
    let app = build_app(signing_key);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("listening on {addr}");
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("bind failed");
    axum::serve(listener, app).await.expect("server failed");
}

fn build_app(signing_key: SigningKey) -> Router {
    let verify_key = signing_key.verifying_key();
    let state = AppState {
        signing_key,
        verify_key,
    };

    Router::new()
        .route("/now", get(now))
        .route("/secnow", get(secnow))
        .route("/validate", post(validate))
        .with_state(state)
}

fn load_signing_key() -> Result<SigningKey, String> {
    let raw = std::env::var("ED25519_PRIVATE_KEY_HEX").map_err(|_| {
        "ED25519_PRIVATE_KEY_HEX must be set to a 32-byte private key hex value".to_string()
    })?;

    let bytes = hex::decode(&raw)
        .map_err(|_| "ED25519_PRIVATE_KEY_HEX must be valid hex for 32 bytes".to_string())?;

    if bytes.len() != 32 {
        return Err("ED25519_PRIVATE_KEY_HEX must be 32-byte hex value".to_string());
    }

    let mut secret = [0u8; 32];
    secret.copy_from_slice(&bytes);
    Ok(SigningKey::from_bytes(&secret))
}

async fn now(Query(query): Query<HashMap<String, String>>) -> impl IntoResponse {
    let format = query.get("format").map(String::as_str).unwrap_or("seconds");
    let wants_json = query.contains_key("json");

    match format_timestamp(format) {
        Ok(timestamp) => {
            if wants_json {
                (
                    StatusCode::OK,
                    Json(TimestampResponse { format, timestamp }),
                )
                    .into_response()
            } else {
                (StatusCode::OK, timestamp).into_response()
            }
        }
        Err(err) => (StatusCode::BAD_REQUEST, err).into_response(),
    }
}

async fn secnow(
    State(state): State<AppState>,
    Query(query): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let format = query.get("format").map(String::as_str).unwrap_or("seconds");

    match format_timestamp(format) {
        Ok(timestamp) => {
            let payload = format!("{format}:{timestamp}");
            let signature = state.signing_key.sign(payload.as_bytes());
            let signature_b64 = URL_SAFE_NO_PAD.encode(signature.to_bytes());
            let token = format!("{payload}.{signature_b64}");

            (
                StatusCode::OK,
                Json(SignedTimestampResponse {
                    format: format.to_string(),
                    timestamp,
                    signature: signature_b64,
                    token,
                }),
            )
                .into_response()
        }
        Err(err) => (StatusCode::BAD_REQUEST, err).into_response(),
    }
}

async fn validate(
    State(state): State<AppState>,
    Json(signed_payload): Json<SignedTimestampResponse>,
) -> impl IntoResponse {
    if verify_signed_payload(&state.verify_key, &signed_payload) {
        (StatusCode::OK, "valid").into_response()
    } else {
        (StatusCode::BAD_REQUEST, "invalid").into_response()
    }
}

fn verify_signed_payload(
    verify_key: &VerifyingKey,
    signed_payload: &SignedTimestampResponse,
) -> bool {
    let Some((payload, signature_from_token)) = signed_payload.token.rsplit_once('.') else {
        return false;
    };

    if signature_from_token != signed_payload.signature {
        return false;
    }

    let expected_payload = format!("{}:{}", signed_payload.format, signed_payload.timestamp);
    if payload != expected_payload {
        return false;
    }

    let Ok(sig_bytes) = URL_SAFE_NO_PAD.decode(&signed_payload.signature) else {
        return false;
    };

    let Ok(signature) = Signature::try_from(sig_bytes.as_slice()) else {
        return false;
    };

    verify_key.verify(payload.as_bytes(), &signature).is_ok()
}

fn format_timestamp(format: &str) -> Result<String, String> {
    let now = Utc::now();
    match format {
        "seconds" | "sec" | "s" => Ok(now.timestamp().to_string()),
        "ms" | "millis" | "milliseconds" => Ok(now.timestamp_millis().to_string()),
        "ns" | "nanos" | "nanoseconds" => Ok(now
            .timestamp_nanos_opt()
            .ok_or_else(|| "timestamp out of range for ns".to_string())?
            .to_string()),
        "iso" => Ok(now.to_rfc3339()),
        _ => Err("invalid format: use seconds|ms|ns|iso".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::{to_bytes, Body},
        http::{Request, StatusCode},
    };
    use serde_json::from_slice;
    use tower::ServiceExt;

    const TEST_PRIVATE_KEY_HEX: &str =
        "1f1e1d1c1b1a191817161514131211100f0e0d0c0b0a09080706050403020100";

    fn test_signing_key() -> SigningKey {
        let mut secret = [0u8; 32];
        secret.copy_from_slice(&hex::decode(TEST_PRIVATE_KEY_HEX).unwrap());
        SigningKey::from_bytes(&secret)
    }

    #[test]
    fn format_timestamp_supports_all_formats() {
        assert!(format_timestamp("seconds").unwrap().parse::<i64>().is_ok());
        assert!(format_timestamp("ms").unwrap().parse::<i64>().is_ok());
        assert!(format_timestamp("ns").unwrap().parse::<i64>().is_ok());
        assert!(format_timestamp("iso").unwrap().contains('T'));
    }

    #[test]
    fn format_timestamp_rejects_invalid_format() {
        assert!(format_timestamp("bogus").is_err());
    }

    #[test]
    fn load_signing_key_requires_env_var() {
        unsafe {
            std::env::remove_var("ED25519_PRIVATE_KEY_HEX");
        }

        let err = load_signing_key().expect_err("expected missing env var to fail");
        assert!(err.contains("must be set"));
    }

    #[test]
    fn load_signing_key_accepts_valid_env_var() {
        unsafe {
            std::env::set_var("ED25519_PRIVATE_KEY_HEX", TEST_PRIVATE_KEY_HEX);
        }

        let key = load_signing_key().expect("expected valid env var to parse");
        let expected = test_signing_key();
        assert_eq!(key.to_bytes(), expected.to_bytes());
    }

    #[tokio::test]
    async fn secnow_then_validate_roundtrip() {
        let app = build_app(test_signing_key());

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/secnow?format=iso")
                    .method("GET")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let signed: SignedTimestampResponse = from_slice(&body).unwrap();

        let validate_response = app
            .oneshot(
                Request::builder()
                    .uri("/validate")
                    .method("POST")
                    .header("content-type", "application/json")
                    .body(Body::from(serde_json::to_vec(&signed).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(validate_response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn validate_rejects_tampered_payload() {
        let app = build_app(test_signing_key());

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/secnow?format=seconds")
                    .method("GET")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let mut signed: SignedTimestampResponse = from_slice(&body).unwrap();
        signed.timestamp.push('9');

        let validate_response = app
            .oneshot(
                Request::builder()
                    .uri("/validate")
                    .method("POST")
                    .header("content-type", "application/json")
                    .body(Body::from(serde_json::to_vec(&signed).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(validate_response.status(), StatusCode::BAD_REQUEST);
    }
}
