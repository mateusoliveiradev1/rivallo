//! Use-case boundaries that operate only on domain-owned information.

mod matchday;
mod persistence;
mod profiles;
mod table_view;
mod world;

pub use matchday::{MatchdayRepository, MatchdayService, MatchdayServiceError};
pub use persistence::{LocalPersistenceError, LocalPersistencePort};
pub use profiles::{ProfileRepository, ProfileService};
pub use rivallo_domain::{
    AssetReference, AssistanceProfile, AttributeGroupProjection, AttributeProjection,
    AttributeSnapshot, CAREER_SCHEMA_VERSION, COACH_CREATOR_SCHEMA_VERSION, CareerIntegrity,
    CareerRouteContext, CareerSaveState, CareerSlot, CareerWorldSnapshot, Club,
    ClubProfileProjection, ClubTacticalIdentityProjection, CoachAppearance, CoachArchetype,
    CoachAttributeBudgetLine, CoachAttributeSet, CoachBackground, CoachCreationEvaluation,
    CoachCreatorDraft, CoachDevelopmentProfile, CoachProfileProjection, CoachSportingProfile,
    ContentPackage, ContractSummary, CustomFormationIdentity, DataPackageType,
    EntityProfileReference, ExplainableRating, ExternalPlayerState, Formation,
    GlobalProfileSearchResult, KnowledgeLevel, KnowledgeValue, KnowledgeValueKind, LineupSelection,
    MatchEvent, MatchResult, MatchdayState, Nation, NationProfileProjection, PackageCoverageReport,
    PackageManifest, PackagePatch, PackagePatchOperation, PackageValidationDiagnostic,
    PackageValidationReport, PackageVisibility, PersonIdentity, Player, PlayerAttributeCategory,
    PlayerAttributeSet, PlayerDevelopmentProjection, PlayerProfileProjection,
    PlayerSportingProfile, PlayerStatisticsProjection, PlayerTrainingProfile, PortraitUpload,
    Position, PositionRatingProjection, PotentialEstimate, PreferredFoot, ProfileWorld,
    RATING_SCALE_VERSION, RatingFactor, RatingFactorImpact, RatingKind, RatingSnapshot,
    ResolvedWorldDatabase, RoleRatingProjection, ScoutingAssessment, SeasonRecord, SquadRole,
    TACTICAL_PLAN_SCHEMA_VERSION, TacticalApproach, TacticalLibraryCommand, TacticalLine,
    TacticalMatchSnapshot, TacticalModelConfig, TacticalModelSnapshot, TacticalPlanEvent,
    TacticalPlanPreview, TacticalPlanProposal, TacticalPlanSnapshot, TacticalPlanUpdate,
    TacticalPlayerPlacement, TacticalSide, TacticalStrategyConfig, TacticalStrategyPresetId,
    TacticalStrategyPresetSummary, TacticalVariationLibrarySnapshot, TacticalZone, WorldEntityKind,
    WorldPackageData, evaluate_coach_creation, project_coach_profile, validate_portrait,
};
pub use table_view::{
    CURRENT_ENVELOPE_VERSION, ColumnId, ColumnPinning, ColumnPinningSide, CreateTableViewRequest,
    DuplicateTableViewRequest, FilterGroupId, FilterGroupLogic, FilterId, FilterOperator,
    FilterValue, LegacyImportOutcome, LegacyImportReceipt, LegacyTableViewImport, NullOrder,
    OwnerScope, RenameTableViewRequest, SQUAD_PRIMARY_SCHEMA_VERSION, SQUAD_PRIMARY_TABLE_ID,
    SavedTableView, SortDirection, TableColumnState, TableDataWindow, TableDensity,
    TableFilterClause, TableFilterGroup, TableFilterNode, TableId, TableSort,
    TableViewEnvelopeMetadata, TableViewLoadOutcome, TableViewPolicyCode, TableViewPolicyError,
    TableViewRecoveryReason, TableViewRepository, TableViewRepositoryError,
    TableViewRepositoryLoad, TableViewRepositoryState, TableViewService, TableViewServiceError,
    TableViewState, TableViewValidationCode, TableViewValidationError, ViewId, ViewMutability,
    ViewProvenance, WindowId, squad_system_default_repository_state,
};
pub use world::{DataPackageCatalogEntry, WorldDatabaseService, WorldPackageRepository};

use rivallo_domain::{ModuleId, PreparedContractInput};

/// Prepares neutral information for the outer contract-composition boundary.
#[derive(Default)]
pub struct ContractPreparationService;

impl ContractPreparationService {
    /// Produces domain-owned preparation information for a module.
    pub fn prepare(&self, module_id: ModuleId) -> PreparedContractInput {
        PreparedContractInput::for_module(module_id)
    }
}
