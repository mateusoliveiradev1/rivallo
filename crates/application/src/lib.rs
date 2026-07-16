//! Use-case boundaries that operate only on domain-owned information.

mod matchday;
mod persistence;
mod table_view;

pub use matchday::{MatchdayRepository, MatchdayService, MatchdayServiceError};
pub use persistence::{LocalPersistenceError, LocalPersistencePort};
pub use rivallo_domain::{
    Club, Formation, LineupSelection, MatchEvent, MatchResult, MatchdayState, Player, Position,
    PreferredFoot, SeasonRecord, SquadRole, TacticalApproach,
};

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
