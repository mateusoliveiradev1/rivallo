//! Use-case boundaries that operate only on domain-owned information.

mod matchday;
mod persistence;
mod table_view;

pub use matchday::{MatchdayRepository, MatchdayService, MatchdayServiceError};
pub use persistence::{LocalPersistenceError, LocalPersistencePort};
pub use rivallo_domain::{
    Club, CustomFormationIdentity, Formation, LineupSelection, MatchEvent, MatchResult,
    MatchdayState, Player, Position, PreferredFoot, SeasonRecord, SquadRole,
    TACTICAL_PLAN_SCHEMA_VERSION, TacticalApproach, TacticalLibraryCommand, TacticalLine,
    TacticalPlanEvent, TacticalPlanProposal, TacticalPlanSnapshot, TacticalPlanUpdate,
    TacticalPlayerPlacement, TacticalSide, TacticalVariationLibrarySnapshot, TacticalZone,
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
