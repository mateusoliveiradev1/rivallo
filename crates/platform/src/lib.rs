//! Outer composition for contract-pipeline inputs and the local loopback runtime.

mod career;
mod matchday;
pub mod persistence;
mod profiles;
mod runtime;
mod table_view;
mod world;

pub use matchday::{FileMatchdayRepository, MatchdayCoordinator};
pub use persistence::{LocalDataDirectoryResolver, SqlitePersistenceAdapter};
pub use profiles::{FileProfileRepository, ProfileCoordinator};
pub use rivallo_application::{
    AssetReference, AssistanceProfile, AttributeGroupProjection, AttributeProjection,
    AttributeSnapshot, CAREER_SCHEMA_VERSION, COACH_CREATOR_SCHEMA_VERSION, CareerIntegrity,
    CareerRouteContext, CareerSaveState, CareerSlot, CareerWorldSnapshot, ClubProfileProjection,
    ClubReadinessProjection, ClubReadinessRequirement, ClubReadinessStatus,
    ClubTacticalIdentityProjection, CoachAppearance, CoachArchetype, CoachAttributeBudgetLine,
    CoachAttributeSet, CoachBackground, CoachCreationEvaluation, CoachCreatorDraft,
    CoachDevelopmentProfile, CoachProfileProjection, CoachSportingProfile, ColumnId, ColumnPinning,
    ColumnPinningSide, ContentPackage, ContractSummary, CustomFormationIdentity,
    DataPackageCatalogEntry, EntityProfileReference, ExplainableRating, ExternalPlayerState,
    FilterGroupId, FilterGroupLogic, FilterId, FilterOperator, FilterValue, Formation,
    GlobalProfileSearchResult, KnowledgeLevel, KnowledgeValue, KnowledgeValueKind,
    LegacyImportOutcome, LegacyImportReceipt, LegacyTableViewImport, LineupSelection,
    MatchdayState, Nation, NationProfileProjection, NullOrder, OwnerScope, PackageCatalogScope,
    PackageCoverageReport, PackageManifest, PackagePatch, PackageValidationDiagnostic,
    PackageValidationReport, PersonIdentity, PlayerAttributeCategory, PlayerAttributeSet,
    PlayerDevelopmentProjection, PlayerProfileProjection, PlayerSportingProfile,
    PlayerStatisticsProjection, PlayerTrainingProfile, PortraitRecipe, PortraitUpload,
    PositionRatingProjection, PotentialEstimate, ProfileWorld, RATING_SCALE_VERSION, RatingFactor,
    RatingFactorImpact, RatingKind, RatingSnapshot, ResolvedWorldDatabase, RoleRatingProjection,
    SavedTableView, ScoutingAssessment, SortDirection, TableColumnState, TableDataWindow,
    TableDensity, TableFilterClause, TableFilterGroup, TableFilterNode, TableId, TableSort,
    TableViewEnvelopeMetadata, TableViewLoadOutcome, TableViewPolicyError, TableViewRecoveryReason,
    TableViewRepositoryError, TableViewRepositoryState, TableViewServiceError, TableViewState,
    TableViewValidationError, TacticalApproach, TacticalLibraryCommand, TacticalLine,
    TacticalMatchSnapshot, TacticalModelConfig, TacticalModelSnapshot, TacticalPlanEvent,
    TacticalPlanPreview, TacticalPlanProposal, TacticalPlanSnapshot, TacticalPlanUpdate,
    TacticalPlayerPlacement, TacticalSide, TacticalStrategyPresetSummary,
    TacticalVariationLibrarySnapshot, TacticalZone, ViewId, ViewMutability, ViewProvenance,
    WindowId, evaluate_coach_creation, project_club_readiness,
    squad_system_default_repository_state,
};
pub use table_view::{FileTableViewRepository, TableViewCoordinator};
pub use world::{
    AuthoringAssetUpload, CreatorProjectDraft, CreatorProjectMode, CreatorProjectRecord,
    CreatorProjectStatus, CreatorProjectSummary, DataPackageAuthoringSource,
    FileWorldPackageRepository, PackageDistributionReceipt, PackageHistoryEntry,
    PrivateCatalogCapability, PrivateCatalogConfig, RivmodInspection, WorldDatabaseCoordinator,
};

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

pub use career::{
    CareerCoachChoice, CareerCoordinator, CareerFailure, CareerPortrait, CareerSlotSummary,
    CreateCareerRequest, SaveCareerRequest,
};

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
