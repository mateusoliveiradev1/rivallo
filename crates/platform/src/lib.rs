//! Outer composition for contract-pipeline inputs; this crate hosts no runtime transport.

use rivallo_contracts::{CONTRACT_VERSION, ContractManifest, ContractMetadata};
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    info(title = "Rivallo Contract Schemas", version = CONTRACT_VERSION),
    components(schemas(ContractManifest))
)]
struct ContractDocument;

/// Composes the schema-only OpenAPI document owned by the Rust contract pipeline.
///
/// This document deliberately contains no operations or runtime registration.
pub fn schema_only_openapi() -> utoipa::openapi::OpenApi {
    ContractDocument::openapi()
}

/// Serializes the schema-only OpenAPI document with deterministic pretty JSON formatting.
pub fn schema_only_openapi_json() -> Result<String, serde_json::Error> {
    serde_json::to_string_pretty(&schema_only_openapi())
}

/// Contract-export information composed at the platform boundary.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractExportPreparation<T> {
    prepared_input: T,
    metadata: ContractMetadata,
}

impl<T> ContractExportPreparation<T> {
    /// Returns the neutral preparation input supplied by the application boundary.
    pub fn prepared_input(&self) -> &T {
        &self.prepared_input
    }

    /// Returns the contracts-owned metadata selected for export.
    pub fn metadata(&self) -> ContractMetadata {
        self.metadata
    }
}

/// Combines neutral application output with contracts metadata for later export.
pub fn prepare_contract_export<T>(prepared_input: T) -> ContractExportPreparation<T> {
    ContractExportPreparation {
        prepared_input,
        metadata: ContractMetadata::current(),
    }
}

#[cfg(test)]
mod tests {
    use rivallo_contracts::CONTRACT_VERSION;

    use super::schema_only_openapi;

    #[test]
    fn composes_contract_schemas_without_runtime_paths() {
        let document = serde_json::to_value(schema_only_openapi()).expect("OpenAPI serializes");

        assert_eq!(document["info"]["version"], CONTRACT_VERSION);
        assert_eq!(document["paths"], serde_json::json!({}));
        assert!(
            document["components"]["schemas"]
                .get("ContractManifest")
                .is_some()
        );
    }
}
