//! Outer composition for contract-pipeline inputs and the local loopback runtime.

mod matchday;
pub mod persistence;
mod runtime;
mod table_view;

pub use matchday::{FileMatchdayRepository, MatchdayCoordinator};
pub use persistence::{LocalDataDirectoryResolver, SqlitePersistenceAdapter};
pub use rivallo_application::{Formation, LineupSelection, MatchdayState, TacticalApproach};
pub use table_view::FileTableViewRepository;

pub use runtime::{
    CancellationToken, LOCAL_API_ADDRESS, LOCAL_API_PORT, LOCAL_API_SERVICE_ID,
    READINESS_POLL_INTERVAL, READINESS_TIMEOUT, RUNTIME_PROTOCOL, ReadinessDiagnostic,
    ReadinessPayload, SHUTDOWN_CONTROL_MESSAGE, read_shutdown_control, run_local_api,
    validate_readiness_response,
};

use rivallo_contracts::{CONTRACT_VERSION, ContractManifest, ContractMetadata};
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    info(title = "Rivallo Contract Schemas", version = CONTRACT_VERSION),
    paths(contract_manifest_for_generation),
    components(schemas(ContractManifest))
)]
struct ContractDocument;

/// Declares the neutral, test-only contract introspection operation for code generation.
///
/// This is OpenAPI metadata only: it is deliberately not a runtime handler or registration.
#[utoipa::path(
    get,
    path = "/_contract/manifest",
    responses((status = 200, description = "Contract manifest metadata", body = ContractManifest)),
    tag = "contract-introspection"
)]
#[allow(
    dead_code,
    reason = "Utoipa consumes this test-only OpenAPI declaration"
)]
fn contract_manifest_for_generation() {}

/// Composes the contract-only OpenAPI document owned by the Rust contract pipeline.
///
/// This document deliberately contains no operations or runtime registration.
pub fn schema_only_openapi() -> utoipa::openapi::OpenApi {
    ContractDocument::openapi()
}

/// Serializes the contract-only OpenAPI document with deterministic pretty JSON formatting.
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
    fn composes_contract_schemas_with_only_the_test_generation_operation() {
        let document = serde_json::to_value(schema_only_openapi()).expect("OpenAPI serializes");

        assert_eq!(document["info"]["version"], CONTRACT_VERSION);
        assert!(document["paths"].get("/_contract/manifest").is_some());
        assert!(document["components"].get("securitySchemes").is_none());
        assert!(
            document["components"]["schemas"]
                .get("ContractManifest")
                .is_some()
        );
    }
}
