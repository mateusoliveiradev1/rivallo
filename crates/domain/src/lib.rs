//! Framework-independent primitives shared by the modular-monolith core.

mod matchday;

pub use matchday::{
    Club, Formation, LineupSelection, MatchEvent, MatchResult, MatchdayError, MatchdayState,
    Player, Position, PreferredFoot, SeasonRecord, SquadRole, TacticalApproach,
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
