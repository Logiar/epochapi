use serde::{Deserialize, Serialize};

include!(concat!(env!("OUT_DIR"), "/generated_contract.rs"));

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimestampResponse {
    pub format: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignedTimestampResponse {
    pub format: String,
    pub timestamp: String,
    pub signature: String,
    pub token: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ContractError {
    InvalidRequest,
    InvalidSignature,
    Internal,
}

pub type ContractResult<T> = Result<T, ContractError>;
