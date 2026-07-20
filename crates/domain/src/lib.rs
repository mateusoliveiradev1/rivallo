//! Framework-independent primitives shared by the modular-monolith core.

mod matchday;
mod tactics;

pub use matchday::{
    Club, CustomFormationIdentity, Formation, LineupSelection, MatchEvent, MatchResult,
    MatchdayError, MatchdayState, Player, Position, PreferredFoot, SeasonRecord, SquadRole,
    TACTICAL_LIBRARY_SCHEMA_VERSION, TACTICAL_PLAN_SCHEMA_VERSION, TacticalApproach,
    TacticalLibraryCommand, TacticalLine, TacticalPlanEvent, TacticalPlanProposal,
    TacticalPlanSnapshot, TacticalPlanUpdate, TacticalPlayerPlacement, TacticalSide,
    TacticalVariationLibrarySnapshot, TacticalZone,
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
