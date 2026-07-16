use std::collections::HashSet;

use serde::{Deserialize, Serialize};

pub const CURRENT_ENVELOPE_VERSION: u32 = 1;
pub const SQUAD_PRIMARY_TABLE_ID: &str = "squad.primary";
pub const SQUAD_PRIMARY_SCHEMA_VERSION: u32 = 1;
pub const MAX_STABLE_ID_BYTES: usize = 64;
pub const MAX_VIEW_LABEL_BYTES: usize = 96;
pub const MAX_SAVED_VIEWS: usize = 32;
pub const MAX_COLUMNS: usize = 64;
pub const MAX_SORT_CLAUSES: usize = 8;
pub const MAX_FILTER_DEPTH: usize = 4;
pub const MAX_FILTER_GROUPS: usize = 16;
pub const MAX_FILTER_CLAUSES: usize = 32;
pub const MAX_FILTER_TEXT_BYTES: usize = 128;
pub const MAX_FILTER_LIST_VALUES: usize = 32;
pub const MAX_LEGACY_IMPORT_RECEIPTS: usize = 16;
pub const MAX_LEGACY_FINGERPRINT_BYTES: usize = 128;
pub const MIN_COLUMN_WIDTH: f64 = 40.0;
pub const MAX_COLUMN_WIDTH: f64 = 640.0;
pub const MAX_PINNED_COLUMNS: usize = 4;
pub const MAX_FILTER_NUMBER: f64 = 1_000_000_000.0;
pub const MAX_CLIENT_PAGE: u32 = 1_000_000;
pub const MAX_CLIENT_PAGE_SIZE: u16 = 100;

const SUPPORTED_COLUMN_IDS: [&str; 18] = [
    "shirtNumber",
    "info",
    "name",
    "position",
    "age",
    "nationality",
    "heightCm",
    "preferredFoot",
    "squadRole",
    "rating",
    "potentialRating",
    "matchFitness",
    "morale",
    "condition",
    "appearances",
    "goals",
    "assists",
    "averageRating",
];

const REQUIRED_COLUMN_IDS: [&str; 4] = ["shirtNumber", "info", "name", "position"];

macro_rules! stable_id {
    ($name:ident) => {
        #[derive(Clone, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
        #[serde(transparent)]
        pub struct $name(String);

        impl $name {
            pub fn as_str(&self) -> &str {
                &self.0
            }
        }

        impl From<&str> for $name {
            fn from(value: &str) -> Self {
                Self(value.to_owned())
            }
        }

        impl From<String> for $name {
            fn from(value: String) -> Self {
                Self(value)
            }
        }

        impl std::fmt::Display for $name {
            fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                formatter.write_str(&self.0)
            }
        }
    };
}

stable_id!(TableId);
stable_id!(ViewId);
stable_id!(ColumnId);
stable_id!(FilterId);
stable_id!(FilterGroupId);

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum OwnerScope {
    LocalFixed,
    #[serde(other)]
    Unsupported,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ViewProvenance {
    SystemDefault,
    UserOwned,
    SharedReadOnly,
    #[serde(other)]
    Unsupported,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ViewMutability {
    Immutable,
    Mutable,
    ReadOnly,
    #[serde(other)]
    Unsupported,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TableDensity {
    Compact,
    Standard,
    Comfortable,
    #[serde(other)]
    Unsupported,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ColumnPinningSide {
    None,
    Start,
    End,
    #[serde(other)]
    Unsupported,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnPinning {
    pub side: ColumnPinningSide,
    pub order: u8,
}

impl ColumnPinning {
    pub const fn none() -> Self {
        Self {
            side: ColumnPinningSide::None,
            order: 0,
        }
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableColumnState {
    pub column_id: ColumnId,
    pub visible: bool,
    pub width: f64,
    pub pinning: ColumnPinning,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum SortDirection {
    #[serde(rename = "asc")]
    Ascending,
    #[serde(rename = "desc")]
    Descending,
    #[serde(other)]
    Unsupported,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum NullOrder {
    First,
    Last,
    #[serde(other)]
    Unsupported,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableSort {
    pub column_id: ColumnId,
    pub direction: SortDirection,
    pub null_order: NullOrder,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum FilterOperator {
    Equals,
    Contains,
    GreaterThan,
    LessThan,
    OneOf,
    #[serde(other)]
    Unsupported,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(tag = "type", content = "value", rename_all = "camelCase")]
pub enum FilterValue {
    Text(String),
    Number(f64),
    Boolean(bool),
    TextList(Vec<String>),
    NumberList(Vec<f64>),
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableFilterClause {
    pub filter_id: FilterId,
    pub column_id: ColumnId,
    pub operator: FilterOperator,
    pub value: FilterValue,
    pub enabled: bool,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum FilterGroupLogic {
    And,
    Or,
    #[serde(other)]
    Unsupported,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(tag = "kind", content = "value", rename_all = "camelCase")]
pub enum TableFilterNode {
    Clause(TableFilterClause),
    Group(TableFilterGroup),
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableFilterGroup {
    pub group_id: FilterGroupId,
    pub logic: FilterGroupLogic,
    pub children: Vec<TableFilterNode>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(tag = "mode", rename_all = "camelCase")]
pub enum TableDataWindow {
    ClientPagination {
        page: u32,
        page_size: u16,
    },
    #[serde(other)]
    Unsupported,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableViewState {
    pub view_id: ViewId,
    pub baseline_view_id: ViewId,
    pub density: TableDensity,
    pub columns: Vec<TableColumnState>,
    pub sort: Vec<TableSort>,
    pub filter: Option<TableFilterGroup>,
    pub data_window: TableDataWindow,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedTableView {
    pub label: String,
    pub provenance: ViewProvenance,
    pub mutability: ViewMutability,
    pub state: TableViewState,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableViewEnvelopeMetadata {
    pub envelope_version: u32,
    pub revision: u64,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyImportReceipt {
    pub source_version: u16,
    pub source_fingerprint: String,
    pub table_id: TableId,
    pub schema_version: u32,
    pub owner_scope: OwnerScope,
    pub imported_view_id: ViewId,
    pub accepted_revision: u64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableViewRepositoryState {
    pub metadata: TableViewEnvelopeMetadata,
    pub table_id: TableId,
    pub schema_version: u32,
    pub owner_scope: OwnerScope,
    pub active_view_id: ViewId,
    pub default_view_id: ViewId,
    pub views: Vec<SavedTableView>,
    pub legacy_import_receipts: Vec<LegacyImportReceipt>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TableViewValidationCode {
    WrongEnvelopeVersion,
    WrongTableId,
    WrongSchemaVersion,
    WrongOwnerScope,
    TooManyViews,
    MissingSystemDefault,
    UnsupportedProvenance,
    UnsupportedMutability,
    ProvenanceMutabilityMismatch,
    InvalidStableId,
    InvalidViewLabel,
    DuplicateViewId,
    InvalidActiveViewReference,
    InvalidDefaultViewReference,
    InvalidBaselineViewReference,
    TooManyColumns,
    UnknownColumnId,
    DuplicateColumnId,
    MissingRequiredColumn,
    HiddenRequiredColumn,
    NonFiniteColumnWidth,
    ColumnWidthOutOfBounds,
    InvalidPinning,
    TooManyPinnedColumns,
    UnsupportedDensity,
    TooManySortClauses,
    DuplicateSortColumn,
    UnsupportedSort,
    TooManyFilterGroups,
    TooManyFilterClauses,
    FilterDepthExceeded,
    DuplicateFilterId,
    DuplicateFilterGroupId,
    EmptyFilterGroup,
    UnsupportedFilterGroupLogic,
    UnknownFilterColumn,
    UnsupportedFilterOperator,
    NonFiniteFilterValue,
    FilterValueOutOfBounds,
    InvalidFilterText,
    IncompatibleFilterValue,
    InvalidDataWindow,
    TooManyLegacyReceipts,
    InvalidLegacySourceVersion,
    InvalidLegacyFingerprint,
    InvalidLegacyReceipt,
    DuplicateLegacyReceipt,
    RevisionExhausted,
}

impl TableViewValidationCode {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::WrongEnvelopeVersion => "table_view.wrong_envelope_version",
            Self::WrongTableId => "table_view.wrong_table_id",
            Self::WrongSchemaVersion => "table_view.wrong_schema_version",
            Self::WrongOwnerScope => "table_view.wrong_owner_scope",
            Self::TooManyViews => "table_view.too_many_views",
            Self::MissingSystemDefault => "table_view.missing_system_default",
            Self::UnsupportedProvenance => "table_view.unsupported_provenance",
            Self::UnsupportedMutability => "table_view.unsupported_mutability",
            Self::ProvenanceMutabilityMismatch => "table_view.provenance_mutability_mismatch",
            Self::InvalidStableId => "table_view.invalid_stable_id",
            Self::InvalidViewLabel => "table_view.invalid_view_label",
            Self::DuplicateViewId => "table_view.duplicate_view_id",
            Self::InvalidActiveViewReference => "table_view.invalid_active_view_reference",
            Self::InvalidDefaultViewReference => "table_view.invalid_default_view_reference",
            Self::InvalidBaselineViewReference => "table_view.invalid_baseline_view_reference",
            Self::TooManyColumns => "table_view.too_many_columns",
            Self::UnknownColumnId => "table_view.unknown_column_id",
            Self::DuplicateColumnId => "table_view.duplicate_column_id",
            Self::MissingRequiredColumn => "table_view.missing_required_column",
            Self::HiddenRequiredColumn => "table_view.hidden_required_column",
            Self::NonFiniteColumnWidth => "table_view.non_finite_column_width",
            Self::ColumnWidthOutOfBounds => "table_view.column_width_out_of_bounds",
            Self::InvalidPinning => "table_view.invalid_pinning",
            Self::TooManyPinnedColumns => "table_view.too_many_pinned_columns",
            Self::UnsupportedDensity => "table_view.unsupported_density",
            Self::TooManySortClauses => "table_view.too_many_sort_clauses",
            Self::DuplicateSortColumn => "table_view.duplicate_sort_column",
            Self::UnsupportedSort => "table_view.unsupported_sort",
            Self::TooManyFilterGroups => "table_view.too_many_filter_groups",
            Self::TooManyFilterClauses => "table_view.too_many_filter_clauses",
            Self::FilterDepthExceeded => "table_view.filter_depth_exceeded",
            Self::DuplicateFilterId => "table_view.duplicate_filter_id",
            Self::DuplicateFilterGroupId => "table_view.duplicate_filter_group_id",
            Self::EmptyFilterGroup => "table_view.empty_filter_group",
            Self::UnsupportedFilterGroupLogic => "table_view.unsupported_filter_group_logic",
            Self::UnknownFilterColumn => "table_view.unknown_filter_column",
            Self::UnsupportedFilterOperator => "table_view.unsupported_filter_operator",
            Self::NonFiniteFilterValue => "table_view.non_finite_filter_value",
            Self::FilterValueOutOfBounds => "table_view.filter_value_out_of_bounds",
            Self::InvalidFilterText => "table_view.invalid_filter_text",
            Self::IncompatibleFilterValue => "table_view.incompatible_filter_value",
            Self::InvalidDataWindow => "table_view.invalid_data_window",
            Self::TooManyLegacyReceipts => "table_view.too_many_legacy_receipts",
            Self::InvalidLegacySourceVersion => "table_view.invalid_legacy_source_version",
            Self::InvalidLegacyFingerprint => "table_view.invalid_legacy_fingerprint",
            Self::InvalidLegacyReceipt => "table_view.invalid_legacy_receipt",
            Self::DuplicateLegacyReceipt => "table_view.duplicate_legacy_receipt",
            Self::RevisionExhausted => "table_view.revision_exhausted",
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableViewValidationError {
    pub code: TableViewValidationCode,
}

impl TableViewValidationError {
    const fn new(code: TableViewValidationCode) -> Self {
        Self { code }
    }
}

impl std::fmt::Display for TableViewValidationError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(self.code.as_str())
    }
}

impl std::error::Error for TableViewValidationError {}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TableViewRecoveryReason {
    CorruptPayload,
    FutureEnvelopeVersion,
    MissingMigrationStep,
    InterruptedWrite,
    InvalidPayload,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TableViewRepositoryLoad {
    Missing,
    Loaded(TableViewRepositoryState),
    Migrated {
        state: TableViewRepositoryState,
        from_envelope_version: u32,
        to_envelope_version: u32,
    },
    Recovered {
        state: Option<TableViewRepositoryState>,
        reason: TableViewRecoveryReason,
    },
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TableViewRepositoryError {
    Unavailable,
    InvalidData,
    SaveFailed,
}

pub trait TableViewRepository {
    fn load(&self) -> Result<TableViewRepositoryLoad, TableViewRepositoryError>;

    fn save_atomic(&self, state: &TableViewRepositoryState)
    -> Result<(), TableViewRepositoryError>;
}

impl TableViewRepositoryState {
    pub fn validate(&self) -> Result<(), TableViewValidationError> {
        if self.metadata.envelope_version != CURRENT_ENVELOPE_VERSION {
            return invalid(TableViewValidationCode::WrongEnvelopeVersion);
        }
        if self.table_id.as_str() != SQUAD_PRIMARY_TABLE_ID {
            return invalid(TableViewValidationCode::WrongTableId);
        }
        if self.schema_version != SQUAD_PRIMARY_SCHEMA_VERSION {
            return invalid(TableViewValidationCode::WrongSchemaVersion);
        }
        if self.owner_scope != OwnerScope::LocalFixed {
            return invalid(TableViewValidationCode::WrongOwnerScope);
        }
        if self.views.is_empty() || self.views.len() > MAX_SAVED_VIEWS {
            return invalid(TableViewValidationCode::TooManyViews);
        }

        let mut view_ids = HashSet::with_capacity(self.views.len());
        let mut has_system_default = false;
        for view in &self.views {
            validate_stable_id(view.state.view_id.as_str())?;
            if !view_ids.insert(view.state.view_id.clone()) {
                return invalid(TableViewValidationCode::DuplicateViewId);
            }
            view.validate()?;
            has_system_default |= view.provenance == ViewProvenance::SystemDefault;
        }

        if !has_system_default {
            return invalid(TableViewValidationCode::MissingSystemDefault);
        }
        if !view_ids.contains(&self.active_view_id) {
            return invalid(TableViewValidationCode::InvalidActiveViewReference);
        }
        if !view_ids.contains(&self.default_view_id) {
            return invalid(TableViewValidationCode::InvalidDefaultViewReference);
        }
        if self
            .views
            .iter()
            .any(|view| !view_ids.contains(&view.state.baseline_view_id))
        {
            return invalid(TableViewValidationCode::InvalidBaselineViewReference);
        }
        if self.legacy_import_receipts.len() > MAX_LEGACY_IMPORT_RECEIPTS {
            return invalid(TableViewValidationCode::TooManyLegacyReceipts);
        }

        let mut receipt_keys = HashSet::new();
        for receipt in &self.legacy_import_receipts {
            receipt.validate_for(self, &view_ids)?;
            if !receipt_keys.insert((receipt.source_version, receipt.source_fingerprint.as_str())) {
                return invalid(TableViewValidationCode::DuplicateLegacyReceipt);
            }
        }

        Ok(())
    }
}

impl SavedTableView {
    pub fn validate(&self) -> Result<(), TableViewValidationError> {
        if !is_valid_bounded_text(&self.label, MAX_VIEW_LABEL_BYTES) {
            return invalid(TableViewValidationCode::InvalidViewLabel);
        }
        if self.provenance == ViewProvenance::Unsupported {
            return invalid(TableViewValidationCode::UnsupportedProvenance);
        }
        if self.mutability == ViewMutability::Unsupported {
            return invalid(TableViewValidationCode::UnsupportedMutability);
        }
        let expected_mutability = match self.provenance {
            ViewProvenance::SystemDefault => ViewMutability::Immutable,
            ViewProvenance::UserOwned => ViewMutability::Mutable,
            ViewProvenance::SharedReadOnly => ViewMutability::ReadOnly,
            ViewProvenance::Unsupported => {
                return invalid(TableViewValidationCode::UnsupportedProvenance);
            }
        };
        if self.mutability != expected_mutability {
            return invalid(TableViewValidationCode::ProvenanceMutabilityMismatch);
        }
        if self.provenance == ViewProvenance::SystemDefault
            && self.state.baseline_view_id != self.state.view_id
        {
            return invalid(TableViewValidationCode::InvalidBaselineViewReference);
        }

        self.state.validate()
    }
}

impl TableViewState {
    pub fn validate(&self) -> Result<(), TableViewValidationError> {
        validate_stable_id(self.view_id.as_str())?;
        validate_stable_id(self.baseline_view_id.as_str())?;

        if self.density == TableDensity::Unsupported {
            return invalid(TableViewValidationCode::UnsupportedDensity);
        }
        if self.columns.len() > MAX_COLUMNS {
            return invalid(TableViewValidationCode::TooManyColumns);
        }

        let mut column_ids = HashSet::with_capacity(self.columns.len());
        let mut pinned_start = Vec::new();
        let mut pinned_end = Vec::new();
        for column in &self.columns {
            validate_stable_id(column.column_id.as_str())?;
            if !is_supported_column(column.column_id.as_str()) {
                return invalid(TableViewValidationCode::UnknownColumnId);
            }
            if !column_ids.insert(column.column_id.clone()) {
                return invalid(TableViewValidationCode::DuplicateColumnId);
            }
            if !column.width.is_finite() {
                return invalid(TableViewValidationCode::NonFiniteColumnWidth);
            }
            if !(MIN_COLUMN_WIDTH..=MAX_COLUMN_WIDTH).contains(&column.width) {
                return invalid(TableViewValidationCode::ColumnWidthOutOfBounds);
            }

            match column.pinning.side {
                ColumnPinningSide::None if column.pinning.order == 0 => {}
                ColumnPinningSide::Start => pinned_start.push(column.pinning.order),
                ColumnPinningSide::End => pinned_end.push(column.pinning.order),
                ColumnPinningSide::None | ColumnPinningSide::Unsupported => {
                    return invalid(TableViewValidationCode::InvalidPinning);
                }
            }
        }

        for required in REQUIRED_COLUMN_IDS {
            let Some(column) = self
                .columns
                .iter()
                .find(|column| column.column_id.as_str() == required)
            else {
                return invalid(TableViewValidationCode::MissingRequiredColumn);
            };
            if !column.visible {
                return invalid(TableViewValidationCode::HiddenRequiredColumn);
            }
        }

        validate_pinning(&pinned_start, &pinned_end)?;
        validate_sorts(&self.sort, &column_ids)?;
        if let Some(filter) = &self.filter {
            let mut filter_context = FilterValidationContext::default();
            validate_filter_group(filter, 1, &column_ids, &mut filter_context)?;
        }
        validate_data_window(self.data_window)
    }
}

impl LegacyImportReceipt {
    fn validate_for(
        &self,
        repository: &TableViewRepositoryState,
        view_ids: &HashSet<ViewId>,
    ) -> Result<(), TableViewValidationError> {
        if !(2..=4).contains(&self.source_version) {
            return invalid(TableViewValidationCode::InvalidLegacySourceVersion);
        }
        if !is_valid_fingerprint(&self.source_fingerprint) {
            return invalid(TableViewValidationCode::InvalidLegacyFingerprint);
        }
        if self.table_id != repository.table_id
            || self.schema_version != repository.schema_version
            || self.owner_scope != OwnerScope::LocalFixed
            || !view_ids.contains(&self.imported_view_id)
            || self.accepted_revision > repository.metadata.revision
        {
            return invalid(TableViewValidationCode::InvalidLegacyReceipt);
        }
        Ok(())
    }
}

fn invalid<T>(code: TableViewValidationCode) -> Result<T, TableViewValidationError> {
    Err(TableViewValidationError::new(code))
}

fn validate_stable_id(value: &str) -> Result<(), TableViewValidationError> {
    let valid = !value.is_empty()
        && value.len() <= MAX_STABLE_ID_BYTES
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'-'));

    if valid {
        Ok(())
    } else {
        invalid(TableViewValidationCode::InvalidStableId)
    }
}

fn is_valid_bounded_text(value: &str, max_bytes: usize) -> bool {
    !value.trim().is_empty() && value.len() <= max_bytes && !value.chars().any(char::is_control)
}

fn is_valid_fingerprint(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= MAX_LEGACY_FINGERPRINT_BYTES
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'-' | b':'))
}

fn is_supported_column(column_id: &str) -> bool {
    SUPPORTED_COLUMN_IDS.contains(&column_id)
}

fn validate_pinning(
    pinned_start: &[u8],
    pinned_end: &[u8],
) -> Result<(), TableViewValidationError> {
    if pinned_start.len() + pinned_end.len() > MAX_PINNED_COLUMNS {
        return invalid(TableViewValidationCode::TooManyPinnedColumns);
    }

    for orders in [pinned_start, pinned_end] {
        let mut sorted = orders.to_vec();
        sorted.sort_unstable();
        if sorted
            .iter()
            .enumerate()
            .any(|(index, order)| usize::from(*order) != index)
        {
            return invalid(TableViewValidationCode::InvalidPinning);
        }
    }

    Ok(())
}

fn validate_sorts(
    sorts: &[TableSort],
    columns: &HashSet<ColumnId>,
) -> Result<(), TableViewValidationError> {
    if sorts.len() > MAX_SORT_CLAUSES {
        return invalid(TableViewValidationCode::TooManySortClauses);
    }

    let mut sort_columns = HashSet::with_capacity(sorts.len());
    for sort in sorts {
        if !columns.contains(&sort.column_id) {
            return invalid(TableViewValidationCode::UnknownColumnId);
        }
        if !sort_columns.insert(sort.column_id.clone()) {
            return invalid(TableViewValidationCode::DuplicateSortColumn);
        }
        if sort.direction == SortDirection::Unsupported || sort.null_order == NullOrder::Unsupported
        {
            return invalid(TableViewValidationCode::UnsupportedSort);
        }
    }
    Ok(())
}

#[derive(Default)]
struct FilterValidationContext {
    group_ids: HashSet<FilterGroupId>,
    filter_ids: HashSet<FilterId>,
    group_count: usize,
    clause_count: usize,
}

fn validate_filter_group(
    group: &TableFilterGroup,
    depth: usize,
    columns: &HashSet<ColumnId>,
    context: &mut FilterValidationContext,
) -> Result<(), TableViewValidationError> {
    if depth > MAX_FILTER_DEPTH {
        return invalid(TableViewValidationCode::FilterDepthExceeded);
    }
    validate_stable_id(group.group_id.as_str())?;
    context.group_count += 1;
    if context.group_count > MAX_FILTER_GROUPS {
        return invalid(TableViewValidationCode::TooManyFilterGroups);
    }
    if !context.group_ids.insert(group.group_id.clone()) {
        return invalid(TableViewValidationCode::DuplicateFilterGroupId);
    }
    if group.children.is_empty() {
        return invalid(TableViewValidationCode::EmptyFilterGroup);
    }
    if group.logic == FilterGroupLogic::Unsupported {
        return invalid(TableViewValidationCode::UnsupportedFilterGroupLogic);
    }

    for child in &group.children {
        match child {
            TableFilterNode::Clause(clause) => {
                validate_filter_clause(clause, columns, context)?;
            }
            TableFilterNode::Group(child_group) => {
                validate_filter_group(child_group, depth + 1, columns, context)?;
            }
        }
    }
    Ok(())
}

fn validate_filter_clause(
    clause: &TableFilterClause,
    columns: &HashSet<ColumnId>,
    context: &mut FilterValidationContext,
) -> Result<(), TableViewValidationError> {
    context.clause_count += 1;
    if context.clause_count > MAX_FILTER_CLAUSES {
        return invalid(TableViewValidationCode::TooManyFilterClauses);
    }
    validate_stable_id(clause.filter_id.as_str())?;
    if !context.filter_ids.insert(clause.filter_id.clone()) {
        return invalid(TableViewValidationCode::DuplicateFilterId);
    }
    if !columns.contains(&clause.column_id) || !is_supported_column(clause.column_id.as_str()) {
        return invalid(TableViewValidationCode::UnknownFilterColumn);
    }
    if clause.operator == FilterOperator::Unsupported {
        return invalid(TableViewValidationCode::UnsupportedFilterOperator);
    }

    validate_filter_value(&clause.value)?;
    if !filter_value_is_compatible(clause.column_id.as_str(), clause.operator, &clause.value) {
        return invalid(TableViewValidationCode::IncompatibleFilterValue);
    }
    Ok(())
}

fn validate_filter_value(value: &FilterValue) -> Result<(), TableViewValidationError> {
    match value {
        FilterValue::Text(value) => validate_filter_text(value),
        FilterValue::Number(value) => validate_filter_number(*value),
        FilterValue::Boolean(_) => Ok(()),
        FilterValue::TextList(values) => {
            if values.is_empty() || values.len() > MAX_FILTER_LIST_VALUES {
                return invalid(TableViewValidationCode::FilterValueOutOfBounds);
            }
            for value in values {
                validate_filter_text(value)?;
            }
            Ok(())
        }
        FilterValue::NumberList(values) => {
            if values.is_empty() || values.len() > MAX_FILTER_LIST_VALUES {
                return invalid(TableViewValidationCode::FilterValueOutOfBounds);
            }
            for value in values {
                validate_filter_number(*value)?;
            }
            Ok(())
        }
    }
}

fn validate_filter_text(value: &str) -> Result<(), TableViewValidationError> {
    if is_valid_bounded_text(value, MAX_FILTER_TEXT_BYTES) {
        Ok(())
    } else {
        invalid(TableViewValidationCode::InvalidFilterText)
    }
}

fn validate_filter_number(value: f64) -> Result<(), TableViewValidationError> {
    if !value.is_finite() {
        invalid(TableViewValidationCode::NonFiniteFilterValue)
    } else if value.abs() > MAX_FILTER_NUMBER {
        invalid(TableViewValidationCode::FilterValueOutOfBounds)
    } else {
        Ok(())
    }
}

#[derive(Clone, Copy, Eq, PartialEq)]
enum ColumnValueKind {
    Text,
    Number,
    Boolean,
}

fn column_value_kind(column_id: &str) -> ColumnValueKind {
    match column_id {
        "info" => ColumnValueKind::Boolean,
        "shirtNumber" | "age" | "heightCm" | "rating" | "potentialRating" | "matchFitness"
        | "morale" | "condition" | "appearances" | "goals" | "assists" | "averageRating" => {
            ColumnValueKind::Number
        }
        _ => ColumnValueKind::Text,
    }
}

fn filter_value_is_compatible(
    column_id: &str,
    operator: FilterOperator,
    value: &FilterValue,
) -> bool {
    let kind = column_value_kind(column_id);
    matches!(
        (operator, kind, value),
        (
            FilterOperator::Equals,
            ColumnValueKind::Text,
            FilterValue::Text(_)
        ) | (
            FilterOperator::Equals,
            ColumnValueKind::Number,
            FilterValue::Number(_)
        ) | (
            FilterOperator::Equals,
            ColumnValueKind::Boolean,
            FilterValue::Boolean(_)
        ) | (
            FilterOperator::Contains,
            ColumnValueKind::Text,
            FilterValue::Text(_)
        ) | (
            FilterOperator::GreaterThan | FilterOperator::LessThan,
            ColumnValueKind::Number,
            FilterValue::Number(_),
        ) | (
            FilterOperator::OneOf,
            ColumnValueKind::Text,
            FilterValue::TextList(_)
        ) | (
            FilterOperator::OneOf,
            ColumnValueKind::Number,
            FilterValue::NumberList(_)
        )
    )
}

fn validate_data_window(data_window: TableDataWindow) -> Result<(), TableViewValidationError> {
    match data_window {
        TableDataWindow::ClientPagination { page, page_size }
            if (1..=MAX_CLIENT_PAGE).contains(&page)
                && (1..=MAX_CLIENT_PAGE_SIZE).contains(&page_size) =>
        {
            Ok(())
        }
        TableDataWindow::ClientPagination { .. } | TableDataWindow::Unsupported => {
            invalid(TableViewValidationCode::InvalidDataWindow)
        }
    }
}

#[cfg(test)]
mod tests {
    use std::{
        cell::{Cell, RefCell},
        rc::Rc,
    };

    use super::*;

    fn column(column_id: &str, width: f64) -> TableColumnState {
        TableColumnState {
            column_id: ColumnId::from(column_id),
            visible: true,
            width,
            pinning: ColumnPinning::none(),
        }
    }

    fn system_view() -> SavedTableView {
        let view_id = ViewId::from("squad.system.default");

        SavedTableView {
            label: "Padrão".to_owned(),
            provenance: ViewProvenance::SystemDefault,
            mutability: ViewMutability::Immutable,
            state: TableViewState {
                view_id: view_id.clone(),
                baseline_view_id: view_id,
                density: TableDensity::Compact,
                columns: vec![
                    column("shirtNumber", 64.0),
                    column("info", 64.0),
                    column("name", 220.0),
                    column("position", 80.0),
                    column("goals", 72.0),
                ],
                sort: vec![TableSort {
                    column_id: ColumnId::from("position"),
                    direction: SortDirection::Ascending,
                    null_order: NullOrder::Last,
                }],
                filter: None,
                data_window: TableDataWindow::ClientPagination {
                    page: 1,
                    page_size: 25,
                },
            },
        }
    }

    fn valid_repository_state() -> TableViewRepositoryState {
        let system = system_view();
        let system_id = system.state.view_id.clone();

        TableViewRepositoryState {
            metadata: TableViewEnvelopeMetadata {
                envelope_version: CURRENT_ENVELOPE_VERSION,
                revision: 0,
            },
            table_id: TableId::from(SQUAD_PRIMARY_TABLE_ID),
            schema_version: SQUAD_PRIMARY_SCHEMA_VERSION,
            owner_scope: OwnerScope::LocalFixed,
            active_view_id: system_id.clone(),
            default_view_id: system_id,
            views: vec![system],
            legacy_import_receipts: Vec::new(),
        }
    }

    #[test]
    fn accepts_the_bounded_local_fixed_squad_repository_state() {
        assert_eq!(valid_repository_state().validate(), Ok(()));
    }

    #[test]
    fn rejects_wrong_table_schema_owner_and_provenance() {
        let mut wrong_table = valid_repository_state();
        wrong_table.table_id = TableId::from("scouting.primary");
        assert_eq!(
            wrong_table.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::WrongTableId)
        );

        let mut wrong_schema = valid_repository_state();
        wrong_schema.schema_version = 2;
        assert_eq!(
            wrong_schema.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::WrongSchemaVersion)
        );

        let mut wrong_owner = valid_repository_state();
        wrong_owner.owner_scope = OwnerScope::Unsupported;
        assert_eq!(
            wrong_owner.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::WrongOwnerScope)
        );

        let mut wrong_provenance = valid_repository_state();
        wrong_provenance.views[0].provenance = ViewProvenance::Unsupported;
        assert_eq!(
            wrong_provenance.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::UnsupportedProvenance)
        );

        let mut wrong_mutability = valid_repository_state();
        wrong_mutability.views[0].mutability = ViewMutability::Mutable;
        assert_eq!(
            wrong_mutability.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::ProvenanceMutabilityMismatch)
        );
    }

    #[test]
    fn rejects_duplicate_view_column_and_sort_ids() {
        let mut duplicate_view = valid_repository_state();
        duplicate_view.views.push(duplicate_view.views[0].clone());
        assert_eq!(
            duplicate_view.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::DuplicateViewId)
        );

        let mut duplicate_column = valid_repository_state();
        duplicate_column.views[0]
            .state
            .columns
            .push(column("name", 180.0));
        assert_eq!(
            duplicate_column.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::DuplicateColumnId)
        );

        let mut duplicate_sort = valid_repository_state();
        duplicate_sort.views[0].state.sort.push(TableSort {
            column_id: ColumnId::from("position"),
            direction: SortDirection::Descending,
            null_order: NullOrder::Last,
        });
        assert_eq!(
            duplicate_sort.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::DuplicateSortColumn)
        );
    }

    #[test]
    fn rejects_invalid_active_default_and_baseline_references() {
        let missing = ViewId::from("missing.view");

        let mut invalid_active = valid_repository_state();
        invalid_active.active_view_id = missing.clone();
        assert_eq!(
            invalid_active.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::InvalidActiveViewReference)
        );

        let mut invalid_default = valid_repository_state();
        invalid_default.default_view_id = missing.clone();
        assert_eq!(
            invalid_default.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::InvalidDefaultViewReference)
        );

        let mut invalid_baseline = valid_repository_state();
        invalid_baseline.views[0].state.baseline_view_id = missing;
        assert_eq!(
            invalid_baseline.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::InvalidBaselineViewReference)
        );
    }

    #[test]
    fn rejects_non_finite_or_out_of_bounds_column_geometry() {
        let mut non_finite = valid_repository_state();
        non_finite.views[0].state.columns[0].width = f64::NAN;
        assert_eq!(
            non_finite.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::NonFiniteColumnWidth)
        );

        let mut too_wide = valid_repository_state();
        too_wide.views[0].state.columns[0].width = MAX_COLUMN_WIDTH + 1.0;
        assert_eq!(
            too_wide.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::ColumnWidthOutOfBounds)
        );
    }

    #[test]
    fn rejects_excessive_views_labels_filters_and_receipt_metadata() {
        let mut too_many_views = valid_repository_state();
        for index in 0..MAX_SAVED_VIEWS {
            let mut view = system_view();
            view.state.view_id = ViewId::from(format!("user.view.{index}"));
            view.state.baseline_view_id = ViewId::from("squad.system.default");
            view.provenance = ViewProvenance::UserOwned;
            view.mutability = ViewMutability::Mutable;
            too_many_views.views.push(view);
        }
        assert_eq!(
            too_many_views.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::TooManyViews)
        );

        let mut label_too_long = valid_repository_state();
        label_too_long.views[0].label = "a".repeat(MAX_VIEW_LABEL_BYTES + 1);
        assert_eq!(
            label_too_long.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::InvalidViewLabel)
        );

        let mut too_many_filters = valid_repository_state();
        too_many_filters.views[0].state.filter = Some(TableFilterGroup {
            group_id: FilterGroupId::from("root"),
            logic: FilterGroupLogic::And,
            children: (0..=MAX_FILTER_CLAUSES)
                .map(|index| {
                    TableFilterNode::Clause(TableFilterClause {
                        filter_id: FilterId::from(format!("goals.{index}")),
                        column_id: ColumnId::from("goals"),
                        operator: FilterOperator::GreaterThan,
                        value: FilterValue::Number(index as f64),
                        enabled: true,
                    })
                })
                .collect(),
        });
        assert_eq!(
            too_many_filters.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::TooManyFilterClauses)
        );

        let mut oversized_receipt = valid_repository_state();
        oversized_receipt
            .legacy_import_receipts
            .push(LegacyImportReceipt {
                source_version: 4,
                source_fingerprint: "f".repeat(MAX_LEGACY_FINGERPRINT_BYTES + 1),
                table_id: TableId::from(SQUAD_PRIMARY_TABLE_ID),
                schema_version: SQUAD_PRIMARY_SCHEMA_VERSION,
                owner_scope: OwnerScope::LocalFixed,
                imported_view_id: ViewId::from("squad.system.default"),
                accepted_revision: 0,
            });
        assert_eq!(
            oversized_receipt.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::InvalidLegacyFingerprint)
        );
    }

    #[test]
    fn rejects_incompatible_typed_filter_values() {
        let mut state = valid_repository_state();
        state.views[0].state.filter = Some(TableFilterGroup {
            group_id: FilterGroupId::from("root"),
            logic: FilterGroupLogic::And,
            children: vec![TableFilterNode::Clause(TableFilterClause {
                filter_id: FilterId::from("name.contains"),
                column_id: ColumnId::from("name"),
                operator: FilterOperator::Contains,
                value: FilterValue::Number(12.0),
                enabled: true,
            })],
        });

        assert_eq!(
            state.validate().map_err(|error| error.code),
            Err(TableViewValidationCode::IncompatibleFilterValue)
        );
    }

    struct RecordingRepository {
        load_result: RefCell<Result<TableViewRepositoryLoad, TableViewRepositoryError>>,
        saves: RefCell<Vec<TableViewRepositoryState>>,
    }

    impl TableViewRepository for RecordingRepository {
        fn load(&self) -> Result<TableViewRepositoryLoad, TableViewRepositoryError> {
            self.load_result.borrow().clone()
        }

        fn save_atomic(
            &self,
            state: &TableViewRepositoryState,
        ) -> Result<(), TableViewRepositoryError> {
            self.saves.borrow_mut().push(state.clone());
            Ok(())
        }
    }

    #[test]
    fn repository_port_exposes_typed_load_and_atomic_save_intent() {
        let state = valid_repository_state();
        let repository = RecordingRepository {
            load_result: RefCell::new(Ok(TableViewRepositoryLoad::Loaded(state.clone()))),
            saves: RefCell::new(Vec::new()),
        };

        assert_eq!(
            repository.load(),
            Ok(TableViewRepositoryLoad::Loaded(state.clone()))
        );
        repository.save_atomic(&state).expect("atomic save intent");
        assert_eq!(repository.saves.into_inner(), vec![state]);
    }

    struct MemoryRepository {
        load_result: RefCell<Result<TableViewRepositoryLoad, TableViewRepositoryError>>,
        saves: RefCell<Vec<TableViewRepositoryState>>,
        save_attempts: Cell<usize>,
        fail_next_save: Cell<bool>,
    }

    impl MemoryRepository {
        fn new(load: TableViewRepositoryLoad) -> Rc<Self> {
            Rc::new(Self {
                load_result: RefCell::new(Ok(load)),
                saves: RefCell::new(Vec::new()),
                save_attempts: Cell::new(0),
                fail_next_save: Cell::new(false),
            })
        }

        fn unavailable() -> Rc<Self> {
            Rc::new(Self {
                load_result: RefCell::new(Err(TableViewRepositoryError::Unavailable)),
                saves: RefCell::new(Vec::new()),
                save_attempts: Cell::new(0),
                fail_next_save: Cell::new(false),
            })
        }

        fn persisted_state(&self) -> Option<TableViewRepositoryState> {
            match self.load_result.borrow().as_ref() {
                Ok(TableViewRepositoryLoad::Loaded(state)) => Some(state.clone()),
                _ => None,
            }
        }
    }

    impl TableViewRepository for Rc<MemoryRepository> {
        fn load(
            &self,
        ) -> Result<TableViewRepositoryLoad, TableViewRepositoryError> {
            self.load_result.borrow().clone()
        }

        fn save_atomic(
            &self,
            state: &TableViewRepositoryState,
        ) -> Result<(), TableViewRepositoryError> {
            self.save_attempts.set(self.save_attempts.get() + 1);
            if self.fail_next_save.replace(false) {
                return Err(TableViewRepositoryError::SaveFailed);
            }

            self.saves.borrow_mut().push(state.clone());
            self.load_result
                .replace(Ok(TableViewRepositoryLoad::Loaded(state.clone())));
            Ok(())
        }
    }

    fn user_view(view_id: &str, label: &str) -> SavedTableView {
        let mut view = system_view();
        view.label = label.to_owned();
        view.provenance = ViewProvenance::UserOwned;
        view.mutability = ViewMutability::Mutable;
        view.state.view_id = ViewId::from(view_id);
        view.state.baseline_view_id = ViewId::from("squad.system.default");
        view
    }

    fn shared_view() -> SavedTableView {
        let mut view = system_view();
        view.label = "Compartilhada".to_owned();
        view.provenance = ViewProvenance::SharedReadOnly;
        view.mutability = ViewMutability::ReadOnly;
        view.state.view_id = ViewId::from("squad.shared.read-only");
        view.state.baseline_view_id = ViewId::from("squad.system.default");
        view
    }

    fn state_with_all_provenances() -> TableViewRepositoryState {
        let mut state = valid_repository_state();
        state.views.push(user_view("squad.user.mine", "Minha visão"));
        state.views.push(shared_view());
        state.validate().expect("all provenance fixture");
        state
    }

    fn service_for(
        state: TableViewRepositoryState,
    ) -> (
        TableViewService<Rc<MemoryRepository>>,
        Rc<MemoryRepository>,
    ) {
        let baseline = valid_repository_state();
        let repository = MemoryRepository::new(TableViewRepositoryLoad::Loaded(state));
        let service = TableViewService::new(Rc::clone(&repository), baseline)
            .expect("valid system baseline");
        (service, repository)
    }

    fn policy_code(error: TableViewServiceError) -> Option<TableViewPolicyCode> {
        match error {
            TableViewServiceError::Policy(error) => Some(error.code),
            _ => None,
        }
    }

    fn assert_fixed_owner(state: &TableViewRepositoryState) {
        assert_eq!(state.table_id.as_str(), SQUAD_PRIMARY_TABLE_ID);
        assert_eq!(state.schema_version, SQUAD_PRIMARY_SCHEMA_VERSION);
        assert_eq!(state.owner_scope, OwnerScope::LocalFixed);
        assert!(state
            .legacy_import_receipts
            .iter()
            .all(|receipt| receipt.table_id.as_str() == SQUAD_PRIMARY_TABLE_ID
                && receipt.schema_version == SQUAD_PRIMARY_SCHEMA_VERSION
                && receipt.owner_scope == OwnerScope::LocalFixed));
    }

    #[test]
    fn load_or_seed_preserves_typed_loaded_migrated_recovered_invalid_and_unavailable_states() {
        let baseline = valid_repository_state();
        let missing_repository = MemoryRepository::new(TableViewRepositoryLoad::Missing);
        let missing_service =
            TableViewService::new(Rc::clone(&missing_repository), baseline.clone())
                .expect("service");
        assert!(matches!(
            missing_service.load_or_seed().expect("seed"),
            TableViewLoadOutcome::Seeded { .. }
        ));
        assert_eq!(missing_repository.save_attempts.get(), 1);
        assert!(matches!(
            missing_service.load_or_seed().expect("subsequent load"),
            TableViewLoadOutcome::Loaded { .. }
        ));

        let unavailable_repository = MemoryRepository::unavailable();
        let unavailable_service =
            TableViewService::new(Rc::clone(&unavailable_repository), baseline.clone())
                .expect("service");
        let unavailable = unavailable_service.load_or_seed().expect("safe fallback");
        assert!(matches!(
            unavailable,
            TableViewLoadOutcome::Unavailable { .. }
        ));
        assert_fixed_owner(unavailable.state());

        let migrated_repository =
            MemoryRepository::new(TableViewRepositoryLoad::Migrated {
                state: baseline.clone(),
                from_envelope_version: 0,
                to_envelope_version: CURRENT_ENVELOPE_VERSION,
            });
        let migrated_service =
            TableViewService::new(Rc::clone(&migrated_repository), baseline.clone())
                .expect("service");
        assert!(matches!(
            migrated_service.load_or_seed().expect("migrated"),
            TableViewLoadOutcome::Migrated {
                from_envelope_version: 0,
                to_envelope_version: CURRENT_ENVELOPE_VERSION,
                ..
            }
        ));

        let recovered_repository =
            MemoryRepository::new(TableViewRepositoryLoad::Recovered {
                state: None,
                reason: TableViewRecoveryReason::CorruptPayload,
            });
        let recovered_service =
            TableViewService::new(Rc::clone(&recovered_repository), baseline.clone())
                .expect("service");
        assert!(matches!(
            recovered_service.load_or_seed().expect("recovered"),
            TableViewLoadOutcome::Recovered {
                reason: TableViewRecoveryReason::CorruptPayload,
                ..
            }
        ));

        let mut invalid_state = baseline.clone();
        invalid_state.table_id = TableId::from("invalid.table");
        let invalid_repository =
            MemoryRepository::new(TableViewRepositoryLoad::Loaded(invalid_state));
        let invalid_service =
            TableViewService::new(Rc::clone(&invalid_repository), baseline)
                .expect("service");
        assert!(matches!(
            invalid_service.load_or_seed().expect("invalid fallback"),
            TableViewLoadOutcome::Invalid {
                reason: TableViewValidationError {
                    code: TableViewValidationCode::WrongTableId
                },
                ..
            }
        ));
    }

    #[test]
    fn provenance_matrix_allows_activation_duplication_and_only_supported_default_targets() {
        for view_id in [
            "squad.system.default",
            "squad.user.mine",
            "squad.shared.read-only",
        ] {
            let (service, _) = service_for(state_with_all_provenances());
            let state = service
                .activate(&ViewId::from(view_id))
                .expect("all provenances activate");
            assert_eq!(state.active_view_id.as_str(), view_id);
        }

        for (index, source_id) in [
            "squad.system.default",
            "squad.user.mine",
            "squad.shared.read-only",
        ]
        .into_iter()
        .enumerate()
        {
            let (service, _) = service_for(state_with_all_provenances());
            let new_id = format!("squad.user.copy.{index}");
            let state = service
                .duplicate(DuplicateTableViewRequest {
                    source_view_id: ViewId::from(source_id),
                    new_view_id: ViewId::from(new_id.clone()),
                    label: format!("Cópia {index}"),
                })
                .expect("all provenances duplicate");
            let duplicate = state
                .views
                .iter()
                .find(|view| view.state.view_id.as_str() == new_id)
                .expect("duplicate view");
            assert_eq!(duplicate.provenance, ViewProvenance::UserOwned);
            assert_eq!(duplicate.mutability, ViewMutability::Mutable);
        }

        for view_id in ["squad.system.default", "squad.user.mine"] {
            let (service, _) = service_for(state_with_all_provenances());
            let state = service
                .set_default(&ViewId::from(view_id))
                .expect("supported default target");
            assert_eq!(state.default_view_id.as_str(), view_id);
        }

        let (service, _) = service_for(state_with_all_provenances());
        assert_eq!(
            service
                .set_default(&ViewId::from("squad.shared.read-only"))
                .map_err(policy_code),
            Err(Some(TableViewPolicyCode::LifecycleOperationForbidden))
        );
    }

    #[test]
    fn only_user_owned_views_support_create_rename_save_reset_and_delete() {
        let (service, _) = service_for(state_with_all_provenances());
        let created = service
            .create(CreateTableViewRequest {
                view_id: ViewId::from("squad.user.created"),
                label: "Criada".to_owned(),
            })
            .expect("create user view");
        assert_eq!(created.active_view_id.as_str(), "squad.user.created");

        let renamed = service
            .rename(RenameTableViewRequest {
                view_id: ViewId::from("squad.user.created"),
                label: "Renomeada".to_owned(),
            })
            .expect("rename user view");
        let mut editable = renamed
            .views
            .iter()
            .find(|view| view.state.view_id.as_str() == "squad.user.created")
            .expect("created view")
            .clone();
        editable.state.density = TableDensity::Comfortable;
        let saved = service.save_view(editable).expect("save user view");
        assert_eq!(
            saved
                .views
                .iter()
                .find(|view| view.state.view_id.as_str() == "squad.user.created")
                .expect("saved view")
                .state
                .density,
            TableDensity::Comfortable
        );

        let reset = service
            .reset(&ViewId::from("squad.user.created"))
            .expect("reset user view");
        let reset_view = reset
            .views
            .iter()
            .find(|view| view.state.view_id.as_str() == "squad.user.created")
            .expect("reset view");
        assert_eq!(reset_view.state.density, TableDensity::Compact);
        assert_eq!(reset_view.label, "Renomeada");

        for immutable_id in ["squad.system.default", "squad.shared.read-only"] {
            let (service, _) = service_for(state_with_all_provenances());
            assert_eq!(
                service
                    .rename(RenameTableViewRequest {
                        view_id: ViewId::from(immutable_id),
                        label: "Bloqueada".to_owned(),
                    })
                    .map_err(policy_code),
                Err(Some(TableViewPolicyCode::LifecycleOperationForbidden))
            );
            assert_eq!(
                service
                    .delete(&ViewId::from(immutable_id))
                    .map_err(policy_code),
                Err(Some(TableViewPolicyCode::LifecycleOperationForbidden))
            );
            assert_eq!(
                service
                    .reset(&ViewId::from(immutable_id))
                    .map_err(policy_code),
                Err(Some(TableViewPolicyCode::LifecycleOperationForbidden))
            );

            let mut immutable = state_with_all_provenances()
                .views
                .into_iter()
                .find(|view| view.state.view_id.as_str() == immutable_id)
                .expect("immutable fixture");
            immutable.state.density = TableDensity::Comfortable;
            assert_eq!(
                service.save_view(immutable).map_err(policy_code),
                Err(Some(TableViewPolicyCode::LifecycleOperationForbidden))
            );
        }

        let deleted = service
            .delete(&ViewId::from("squad.user.created"))
            .expect("delete user view");
        assert!(deleted
            .views
            .iter()
            .all(|view| view.state.view_id.as_str() != "squad.user.created"));
    }

    #[test]
    fn deleting_active_or_default_user_view_persists_safe_fallback_and_rebases_dependents() {
        let mut state = state_with_all_provenances();
        state.active_view_id = ViewId::from("squad.user.mine");
        state.default_view_id = ViewId::from("squad.user.mine");
        let mut dependent = user_view("squad.user.dependent", "Dependente");
        dependent.state.baseline_view_id = ViewId::from("squad.user.mine");
        state.views.push(dependent);
        state.validate().expect("delete fixture");

        let (service, repository) = service_for(state);
        let deleted = service
            .delete(&ViewId::from("squad.user.mine"))
            .expect("delete with fallback");

        assert_eq!(repository.save_attempts.get(), 1);
        assert_eq!(deleted.active_view_id.as_str(), "squad.system.default");
        assert_eq!(deleted.default_view_id.as_str(), "squad.system.default");
        assert_eq!(
            deleted
                .views
                .iter()
                .find(|view| view.state.view_id.as_str() == "squad.user.dependent")
                .expect("dependent view")
                .state
                .baseline_view_id
                .as_str(),
            "squad.system.default"
        );
        assert!(matches!(
            service.load_or_seed().expect("reload fallback"),
            TableViewLoadOutcome::Loaded { state } if state == deleted
        ));
    }

    #[test]
    fn persistence_failure_keeps_prior_baseline_and_dirty_proposal_retryable() {
        let initial = state_with_all_provenances();
        let (service, repository) = service_for(initial.clone());
        repository.fail_next_save.set(true);

        let error = service
            .rename(RenameTableViewRequest {
                view_id: ViewId::from("squad.user.mine"),
                label: "Pendente".to_owned(),
            })
            .expect_err("save failure");
        let proposal = match error {
            TableViewServiceError::PersistenceFailed {
                cause: TableViewRepositoryError::SaveFailed,
                previous,
                proposal,
            } => {
                assert_eq!(*previous, initial);
                *proposal
            }
            other => panic!("unexpected error: {other:?}"),
        };

        assert_eq!(repository.persisted_state(), Some(initial));
        assert_eq!(
            proposal
                .views
                .iter()
                .find(|view| view.state.view_id.as_str() == "squad.user.mine")
                .expect("dirty proposal")
                .label,
            "Pendente"
        );

        let retried = service
            .validate_and_save(proposal)
            .expect("retry dirty proposal");
        assert_eq!(repository.persisted_state(), Some(retried));
    }

    fn legacy_import() -> LegacyTableViewImport {
        let mut state = system_view().state;
        state.view_id = ViewId::from("squad.user.legacy-v4");
        state.baseline_view_id = ViewId::from("squad.system.default");
        state.density = TableDensity::Standard;

        LegacyTableViewImport {
            source_version: 4,
            source_fingerprint: "sha256:legacy-v4".to_owned(),
            label: "Preferências antigas".to_owned(),
            state,
        }
    }

    #[test]
    fn legacy_import_receipt_is_atomic_durable_and_idempotent() {
        let baseline = valid_repository_state();
        let repository =
            MemoryRepository::new(TableViewRepositoryLoad::Loaded(baseline.clone()));
        let service = TableViewService::new(Rc::clone(&repository), baseline)
            .expect("service");

        let first = service
            .import_legacy(legacy_import())
            .expect("first import");
        assert!(first.imported);
        assert_eq!(repository.save_attempts.get(), 1);
        assert_eq!(first.state.legacy_import_receipts, vec![first.receipt.clone()]);
        assert_fixed_owner(&first.state);

        let replay = service
            .import_legacy(legacy_import())
            .expect("strict mode replay");
        assert!(!replay.imported);
        assert_eq!(replay.receipt, first.receipt);
        assert_eq!(repository.save_attempts.get(), 1);
        assert_eq!(replay.state.views.len(), first.state.views.len());
    }

    #[test]
    fn failed_legacy_import_save_confirms_no_receipt() {
        let baseline = valid_repository_state();
        let repository =
            MemoryRepository::new(TableViewRepositoryLoad::Loaded(baseline.clone()));
        let service = TableViewService::new(Rc::clone(&repository), baseline.clone())
            .expect("service");
        repository.fail_next_save.set(true);

        assert!(matches!(
            service.import_legacy(legacy_import()),
            Err(TableViewServiceError::PersistenceFailed {
                cause: TableViewRepositoryError::SaveFailed,
                ..
            })
        ));
        assert_eq!(repository.persisted_state(), Some(baseline));
        assert!(repository
            .persisted_state()
            .expect("persisted baseline")
            .legacy_import_receipts
            .is_empty());
    }
}
