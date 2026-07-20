//! Framework-independent primitives shared by the modular-monolith core.

mod career;
mod matchday;
mod portrait;
mod profiles;
mod tactics;
mod world;

pub use career::{
    AssistanceProfile, CAREER_SCHEMA_VERSION, COACH_CREATOR_SCHEMA_VERSION, CareerIntegrity,
    CareerRouteContext, CareerSaveState, CareerSlot, CareerWorldSnapshot, CoachAppearance,
    CoachArchetype, CoachAttributeBudgetLine, CoachBackground, CoachCreationEvaluation,
    CoachCreatorDraft, PortraitUpload, evaluate_coach_creation, validate_portrait,
};
pub use matchday::{
    Club, CustomFormationIdentity, Formation, LineupSelection, MatchEvent, MatchResult,
    MatchdayError, MatchdayState, Player, Position, PreferredFoot, SeasonRecord, SquadRole,
    TACTICAL_LIBRARY_SCHEMA_VERSION, TACTICAL_PLAN_SCHEMA_VERSION, TacticalApproach,
    TacticalLibraryCommand, TacticalLine, TacticalPlanEvent, TacticalPlanProposal,
    TacticalPlanSnapshot, TacticalPlanUpdate, TacticalPlayerPlacement, TacticalSide,
    TacticalVariationLibrarySnapshot, TacticalZone,
};
pub use portrait::{PORTRAIT_RENDERER_VERSION, PortraitFeatureLocks, PortraitRecipe};
pub use profiles::{
    ASSESSMENT_VERSION, AttributeGroupProjection, AttributeProjection, AttributeSnapshot,
    ClubProfileProjection, ClubTacticalIdentityProjection, CoachAttributeSet,
    CoachDevelopmentProfile, CoachProfileProjection, CoachSportingProfile, ContractSummary,
    EntityProfileReference, ExplainableRating, ExternalPlayerState, GlobalProfileSearchResult,
    KnowledgeLevel, KnowledgeValue, KnowledgeValueKind, NationProfileProjection,
    PROFILE_PROJECTION_SCHEMA_VERSION, PROFILE_WORLD_SCHEMA_VERSION, PersonIdentity,
    PlayerAttributeCategory, PlayerAttributeSet, PlayerDevelopmentProjection,
    PlayerProfileProjection, PlayerSportingProfile, PlayerStatisticsProjection,
    PlayerTrainingProfile, PositionRatingProjection, PotentialEstimate, ProfileWorld,
    RATING_SCALE_VERSION, RatingFactor, RatingFactorImpact, RatingKind, RatingSnapshot,
    RoleRatingProjection, ScoutingAssessment, project_club_profile, project_coach_profile,
    project_nation_profile, project_player_profile,
};
pub use tactics::{
    FamiliarityChange, FamiliarityDimension, GoalkeeperDistribution, InPossessionStrategy,
    OpponentKnowledge, OppositionInstruction, OutOfPossessionStrategy, PlayerTacticalFamiliarity,
    ResolvedTacticalInstruction, ResolvedTacticalStrategy, TACTICAL_MATCH_SNAPSHOT_SCHEMA_VERSION,
    TACTICAL_MODEL_SCHEMA_VERSION, TacticalBuildUp, TacticalComparison, TacticalComparisonChange,
    TacticalConfigChange, TacticalDiagnostic, TacticalForceDirection, TacticalGamePhase,
    TacticalInstruction, TacticalInstructionCategory, TacticalInstructionConflict,
    TacticalInstructionScope, TacticalLossReaction, TacticalMatchSnapshot, TacticalModelConfig,
    TacticalModelSnapshot, TacticalOppositionPlan, TacticalParameter, TacticalPhasePlayer,
    TacticalPhaseStructure, TacticalPlanPreview, TacticalProgression, TacticalRecommendation,
    TacticalRegainReaction, TacticalSpatialAnalysis, TacticalStrategyConfig,
    TacticalStrategyPresetId, TacticalStrategyPresetSummary, TransitionStrategy,
    UnitTacticalFamiliarity, compare_tactical_models, default_instructions, resolve_strategy,
    resolve_tactical_model, tactical_strategy_preset_catalog,
};
pub use world::{
    AssetReference, AttributeDefinition, City, ClubReadinessProjection, ClubReadinessRequirement,
    ClubReadinessStatus, Competition, CompetitionCalendarConstraints, CompetitionRules,
    CompetitionSeasonDefinition, CompetitionStageDefinition, CompetitionStageKind, ContentPackage,
    DataPackageType, DateWindow, ExternalIdentifier, FactualContract, FactualIdentityStatus,
    FactualProvenance, GameplayReadiness, MINIMUM_WORLD_DATABASE_SCHEMA_VERSION, Nation,
    PackageConflict, PackageCoverageReport, PackageDependency, PackageEntrypoints, PackageManifest,
    PackagePatch, PackagePatchOperation, PackageProvenance, PackageValidationDiagnostic,
    PackageValidationReport, PackageVisibility, Person, PersonReadiness, PersonRoleAssignment,
    PersonRoleKind, PositionDefinition, ProvenanceVerificationStatus, Region,
    RegistrationReadinessProjection, RegistrationValidity, ResolvedWorldDatabase, RoleDefinition,
    RuntimeProfileAvailability, SeasonPlayerRegistration, SportingEvaluationStatus, Stadium,
    StructuralValidity, TraitDefinition, ValidationSeverity, WORLD_DATABASE_SCHEMA_VERSION,
    WorldDatabaseFingerprint, WorldEntity, WorldEntityKind, WorldPackageData,
    project_club_readiness, project_registration_readiness, resolve_world_packages,
    validate_package,
};

/// A neutral identifier for a module participating in contract preparation.
#[derive(Clone, Debug, Eq, Hash, PartialEq)]
pub struct ModuleId(String);

impl ModuleId {
    /// Creates a module identifier from its stable name.
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    /// Returns the stable module name.
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// Domain-owned information that an outer layer can use to prepare a contract.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PreparedContractInput {
    module_id: ModuleId,
}

impl PreparedContractInput {
    /// Associates preparation information with a neutral module identity.
    pub fn for_module(module_id: ModuleId) -> Self {
        Self { module_id }
    }

    /// Returns the module identity selected for contract preparation.
    pub fn module_id(&self) -> &ModuleId {
        &self.module_id
    }
}
