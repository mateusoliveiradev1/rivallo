use std::io::{self, Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::sync::{Arc, Mutex, MutexGuard};
use std::thread;
use std::time::{Duration, Instant};

use rivallo_platform::{
    AssetReference, ClubProfileProjection, CoachProfileProjection, ColumnId, ColumnPinning,
    ColumnPinningSide, ContentPackage, DataPackageCatalogEntry, FilterGroupId, FilterGroupLogic,
    FilterId, FilterOperator, FilterValue, Formation, GlobalProfileSearchResult, LOCAL_API_ADDRESS,
    LegacyImportOutcome, LegacyImportReceipt, LegacyTableViewImport, LineupSelection,
    MatchdayCoordinator, MatchdayState, Nation, NationProfileProjection, NullOrder, OwnerScope,
    PackageValidationReport, PlayerProfileProjection, ProfileCoordinator, READINESS_POLL_INTERVAL,
    READINESS_TIMEOUT, ReadinessDiagnostic, ResolvedWorldDatabase, SHUTDOWN_CONTROL_MESSAGE,
    SavedTableView, SortDirection, TableColumnState, TableDataWindow, TableDensity,
    TableFilterClause, TableFilterGroup, TableFilterNode, TableId, TableSort, TableViewCoordinator,
    TableViewEnvelopeMetadata, TableViewLoadOutcome, TableViewPolicyError, TableViewRecoveryReason,
    TableViewRepositoryState, TableViewServiceError, TableViewState, TableViewValidationError,
    TacticalApproach, TacticalLibraryCommand, TacticalMatchSnapshot, TacticalPlanPreview,
    TacticalPlanProposal, TacticalPlanUpdate, TacticalStrategyPresetSummary, ViewId,
    ViewMutability, ViewProvenance, WindowId, WorldDatabaseCoordinator,
    squad_system_default_repository_state, validate_readiness_response,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, RunEvent, State};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};

const PROBE_IO_TIMEOUT: Duration = Duration::from_millis(400);
const OWNED_READINESS_INTERVAL: Duration = Duration::from_secs(1);
const COOPERATIVE_SHUTDOWN_WAIT: Duration = Duration::from_millis(750);
const MAX_READINESS_RESPONSE_BYTES: u64 = 8 * 1024;
const INVALID_TABLE_VIEW_DTO: &str = "table_view.invalid_dto";

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableViewRepositoryMetadataDto {
    envelope_version: u32,
    revision: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableViewPinningDto {
    side: String,
    order: Option<u8>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableViewColumnDto {
    column_id: String,
    visible: bool,
    width: f64,
    pinning: TableViewPinningDto,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableViewSortDto {
    column_id: String,
    direction: String,
    nulls: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
enum TableViewFilterValueDto {
    Text {
        value: String,
    },
    Number {
        value: f64,
    },
    Boolean {
        value: bool,
    },
    #[serde(rename = "enum")]
    Enumeration {
        value: String,
    },
    EnumSet {
        value: Vec<String>,
    },
    NumberRange {
        min: f64,
        max: f64,
    },
    TextList {
        value: Vec<String>,
    },
    NumberList {
        value: Vec<f64>,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
enum TableViewFilterNodeDto {
    Clause {
        filter_id: String,
        column_id: String,
        operator: String,
        value: TableViewFilterValueDto,
        enabled: bool,
    },
    Group {
        group_id: String,
        logic: String,
        children: Vec<TableViewFilterNodeDto>,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableViewFilterGroupDto {
    kind: String,
    group_id: String,
    logic: String,
    children: Vec<TableViewFilterNodeDto>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableViewGroupingDto {
    group_id: String,
    column_id: String,
    mode: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableViewDataWindowDto {
    window_id: String,
    mode: String,
    page: u32,
    page_size: u16,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableViewStateDto {
    table_id: String,
    schema_version: u32,
    owner_scope: String,
    view_id: String,
    baseline_view_id: String,
    provenance: String,
    label: String,
    density: String,
    columns: Vec<TableViewColumnDto>,
    sort: Vec<TableViewSortDto>,
    filter: TableViewFilterGroupDto,
    grouping: Vec<TableViewGroupingDto>,
    data_window: TableViewDataWindowDto,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SavedTableViewDto {
    mutability: String,
    state: TableViewStateDto,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyImportReceiptDto {
    source_version: u16,
    source_fingerprint: String,
    table_id: String,
    schema_version: u32,
    owner_scope: String,
    imported_view_id: String,
    accepted_revision: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableViewRepositoryStateDto {
    metadata: TableViewRepositoryMetadataDto,
    table_id: String,
    schema_version: u32,
    owner_scope: String,
    active_view_id: String,
    default_view_id: String,
    views: Vec<SavedTableViewDto>,
    legacy_import_receipts: Vec<LegacyImportReceiptDto>,
}

#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveTableViewsRequestDto {
    state: TableViewRepositoryStateDto,
}

#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DataPackageAuthoringDto {
    manifest_json: String,
    world_json: Option<String>,
    patches_json: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorldReferenceCatalogDto {
    assets: Vec<WorldAssetReferenceDto>,
    nations: Vec<Nation>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorldAssetReferenceDto {
    #[serde(flatten)]
    asset: AssetReference,
    source_package_id: Option<String>,
    runtime_source: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImportLegacyTablePreferencesRequestDto {
    source_version: u16,
    source_fingerprint: String,
    state: TableViewStateDto,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct TableViewSaveReceiptDto {
    table_id: &'static str,
    schema_version: u32,
    owner_scope: &'static str,
    accepted_revision: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(
    tag = "status",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
enum LoadTableViewsResponse {
    Loaded {
        state: TableViewRepositoryStateDto,
    },
    Migrated {
        state: TableViewRepositoryStateDto,
        from_envelope_version: u32,
        to_envelope_version: u32,
    },
    Recovered {
        state: TableViewRepositoryStateDto,
        reason: TableViewRecoveryReason,
    },
    Unavailable {
        fallback: TableViewRepositoryStateDto,
    },
    Invalid {
        fallback: TableViewRepositoryStateDto,
        reason: String,
    },
    SaveFailed {
        fallback: TableViewRepositoryStateDto,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(
    tag = "status",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
enum SaveTableViewsResponse {
    Confirmed {
        state: TableViewRepositoryStateDto,
        receipt: TableViewSaveReceiptDto,
    },
    Invalid {
        reason: String,
    },
    Unavailable,
    SaveFailed,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(
    tag = "status",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
enum ImportLegacyTablePreferencesResponse {
    Confirmed {
        state: Box<TableViewRepositoryStateDto>,
        receipt: LegacyImportReceiptDto,
        imported: bool,
    },
    Invalid {
        reason: String,
    },
    Unavailable,
    SaveFailed,
}

fn owner_scope_name(owner_scope: OwnerScope) -> &'static str {
    match owner_scope {
        OwnerScope::LocalFixed => "local-fixed",
        OwnerScope::Unsupported => "unsupported",
    }
}

fn parse_owner_scope(value: &str) -> Result<OwnerScope, &'static str> {
    match value {
        "local-fixed" => Ok(OwnerScope::LocalFixed),
        _ => Err(INVALID_TABLE_VIEW_DTO),
    }
}

fn provenance_name(provenance: ViewProvenance) -> &'static str {
    match provenance {
        ViewProvenance::SystemDefault => "system-default",
        ViewProvenance::UserOwned => "user-owned",
        ViewProvenance::SharedReadOnly => "shared-read-only",
        ViewProvenance::Unsupported => "unsupported",
    }
}

fn parse_provenance(value: &str) -> Result<ViewProvenance, &'static str> {
    match value {
        "system-default" => Ok(ViewProvenance::SystemDefault),
        "user-owned" => Ok(ViewProvenance::UserOwned),
        "shared-read-only" => Ok(ViewProvenance::SharedReadOnly),
        _ => Err(INVALID_TABLE_VIEW_DTO),
    }
}

fn mutability_name(mutability: ViewMutability) -> &'static str {
    match mutability {
        ViewMutability::Immutable => "immutable",
        ViewMutability::Mutable => "mutable",
        ViewMutability::ReadOnly => "read-only",
        ViewMutability::Unsupported => "unsupported",
    }
}

fn parse_mutability(value: &str) -> Result<ViewMutability, &'static str> {
    match value {
        "immutable" => Ok(ViewMutability::Immutable),
        "mutable" => Ok(ViewMutability::Mutable),
        "read-only" => Ok(ViewMutability::ReadOnly),
        _ => Err(INVALID_TABLE_VIEW_DTO),
    }
}

fn density_name(density: TableDensity) -> &'static str {
    match density {
        TableDensity::Compact => "compact",
        TableDensity::Standard => "standard",
        TableDensity::Comfortable => "comfortable",
        TableDensity::Unsupported => "unsupported",
    }
}

fn parse_density(value: &str) -> Result<TableDensity, &'static str> {
    match value {
        "compact" => Ok(TableDensity::Compact),
        "standard" => Ok(TableDensity::Standard),
        "comfortable" => Ok(TableDensity::Comfortable),
        _ => Err(INVALID_TABLE_VIEW_DTO),
    }
}

fn pinning_side_name(side: ColumnPinningSide) -> &'static str {
    match side {
        ColumnPinningSide::None => "none",
        ColumnPinningSide::Start => "start",
        ColumnPinningSide::End => "end",
        ColumnPinningSide::Unsupported => "unsupported",
    }
}

fn parse_pinning(pinning: TableViewPinningDto) -> Result<ColumnPinning, &'static str> {
    match (pinning.side.as_str(), pinning.order) {
        ("none", None) => Ok(ColumnPinning::none()),
        ("start", Some(order)) => Ok(ColumnPinning {
            side: ColumnPinningSide::Start,
            order,
        }),
        ("end", Some(order)) => Ok(ColumnPinning {
            side: ColumnPinningSide::End,
            order,
        }),
        _ => Err(INVALID_TABLE_VIEW_DTO),
    }
}

fn sort_direction_name(direction: SortDirection) -> &'static str {
    match direction {
        SortDirection::Ascending => "asc",
        SortDirection::Descending => "desc",
        SortDirection::Unsupported => "unsupported",
    }
}

fn parse_sort_direction(value: &str) -> Result<SortDirection, &'static str> {
    match value {
        "asc" => Ok(SortDirection::Ascending),
        "desc" => Ok(SortDirection::Descending),
        _ => Err(INVALID_TABLE_VIEW_DTO),
    }
}

fn null_order_name(null_order: NullOrder) -> &'static str {
    match null_order {
        NullOrder::First => "first",
        NullOrder::Last => "last",
        NullOrder::Unsupported => "unsupported",
    }
}

fn parse_null_order(value: &str) -> Result<NullOrder, &'static str> {
    match value {
        "first" => Ok(NullOrder::First),
        "last" => Ok(NullOrder::Last),
        _ => Err(INVALID_TABLE_VIEW_DTO),
    }
}

fn filter_operator_name(operator: FilterOperator) -> &'static str {
    match operator {
        FilterOperator::Equals => "equals",
        FilterOperator::Contains => "contains",
        FilterOperator::GreaterThan => "greater-than",
        FilterOperator::GreaterThanOrEqual => "greater-than-or-equal",
        FilterOperator::LessThan => "less-than",
        FilterOperator::LessThanOrEqual => "less-than-or-equal",
        FilterOperator::OneOf => "one-of",
        FilterOperator::Unsupported => "unsupported",
    }
}

fn parse_filter_operator(value: &str) -> Result<FilterOperator, &'static str> {
    match value {
        "equals" => Ok(FilterOperator::Equals),
        "contains" => Ok(FilterOperator::Contains),
        "greater-than" => Ok(FilterOperator::GreaterThan),
        "greater-than-or-equal" => Ok(FilterOperator::GreaterThanOrEqual),
        "less-than" => Ok(FilterOperator::LessThan),
        "less-than-or-equal" => Ok(FilterOperator::LessThanOrEqual),
        "one-of" => Ok(FilterOperator::OneOf),
        _ => Err(INVALID_TABLE_VIEW_DTO),
    }
}

fn filter_logic_name(logic: FilterGroupLogic) -> &'static str {
    match logic {
        FilterGroupLogic::And => "and",
        FilterGroupLogic::Or => "or",
        FilterGroupLogic::Unsupported => "unsupported",
    }
}

fn parse_filter_logic(value: &str) -> Result<FilterGroupLogic, &'static str> {
    match value {
        "and" => Ok(FilterGroupLogic::And),
        "or" => Ok(FilterGroupLogic::Or),
        _ => Err(INVALID_TABLE_VIEW_DTO),
    }
}

impl From<&FilterValue> for TableViewFilterValueDto {
    fn from(value: &FilterValue) -> Self {
        match value {
            FilterValue::Text(value) => Self::Text {
                value: value.clone(),
            },
            FilterValue::Number(value) => Self::Number { value: *value },
            FilterValue::Boolean(value) => Self::Boolean { value: *value },
            FilterValue::Enum(value) => Self::Enumeration {
                value: value.clone(),
            },
            FilterValue::EnumSet(value) => Self::EnumSet {
                value: value.clone(),
            },
            FilterValue::NumberRange { min, max } => Self::NumberRange {
                min: *min,
                max: *max,
            },
            FilterValue::TextList(value) => Self::TextList {
                value: value.clone(),
            },
            FilterValue::NumberList(value) => Self::NumberList {
                value: value.clone(),
            },
        }
    }
}

impl From<TableViewFilterValueDto> for FilterValue {
    fn from(value: TableViewFilterValueDto) -> Self {
        match value {
            TableViewFilterValueDto::Text { value } => Self::Text(value),
            TableViewFilterValueDto::Number { value } => Self::Number(value),
            TableViewFilterValueDto::Boolean { value } => Self::Boolean(value),
            TableViewFilterValueDto::Enumeration { value } => Self::Enum(value),
            TableViewFilterValueDto::EnumSet { value } => Self::EnumSet(value),
            TableViewFilterValueDto::NumberRange { min, max } => Self::NumberRange { min, max },
            TableViewFilterValueDto::TextList { value } => Self::TextList(value),
            TableViewFilterValueDto::NumberList { value } => Self::NumberList(value),
        }
    }
}

impl From<&TableFilterNode> for TableViewFilterNodeDto {
    fn from(node: &TableFilterNode) -> Self {
        match node {
            TableFilterNode::Clause(clause) => Self::Clause {
                filter_id: clause.filter_id.as_str().to_owned(),
                column_id: clause.column_id.as_str().to_owned(),
                operator: filter_operator_name(clause.operator).to_owned(),
                value: (&clause.value).into(),
                enabled: clause.enabled,
            },
            TableFilterNode::Group(group) => Self::Group {
                group_id: group.group_id.as_str().to_owned(),
                logic: filter_logic_name(group.logic).to_owned(),
                children: group.children.iter().map(Into::into).collect(),
            },
        }
    }
}

impl TryFrom<TableViewFilterNodeDto> for TableFilterNode {
    type Error = &'static str;

    fn try_from(node: TableViewFilterNodeDto) -> Result<Self, Self::Error> {
        match node {
            TableViewFilterNodeDto::Clause {
                filter_id,
                column_id,
                operator,
                value,
                enabled,
            } => Ok(Self::Clause(TableFilterClause {
                filter_id: FilterId::from(filter_id),
                column_id: ColumnId::from(column_id),
                operator: parse_filter_operator(&operator)?,
                value: value.into(),
                enabled,
            })),
            TableViewFilterNodeDto::Group {
                group_id,
                logic,
                children,
            } => Ok(Self::Group(TableFilterGroup {
                group_id: FilterGroupId::from(group_id),
                logic: parse_filter_logic(&logic)?,
                children: children
                    .into_iter()
                    .map(TryInto::try_into)
                    .collect::<Result<_, _>>()?,
            })),
        }
    }
}

impl From<&TableFilterGroup> for TableViewFilterGroupDto {
    fn from(group: &TableFilterGroup) -> Self {
        Self {
            kind: "group".to_owned(),
            group_id: group.group_id.as_str().to_owned(),
            logic: filter_logic_name(group.logic).to_owned(),
            children: group.children.iter().map(Into::into).collect(),
        }
    }
}

impl TryFrom<TableViewFilterGroupDto> for TableFilterGroup {
    type Error = &'static str;

    fn try_from(group: TableViewFilterGroupDto) -> Result<Self, Self::Error> {
        if group.kind != "group" {
            return Err(INVALID_TABLE_VIEW_DTO);
        }
        Ok(Self {
            group_id: FilterGroupId::from(group.group_id),
            logic: parse_filter_logic(&group.logic)?,
            children: group
                .children
                .into_iter()
                .map(TryInto::try_into)
                .collect::<Result<_, _>>()?,
        })
    }
}

impl TableViewStateDto {
    fn from_application(
        state: &TableViewState,
        repository: &TableViewRepositoryState,
        view: &SavedTableView,
    ) -> Self {
        let filter =
            state
                .filter
                .as_ref()
                .map(Into::into)
                .unwrap_or_else(|| TableViewFilterGroupDto {
                    kind: "group".to_owned(),
                    group_id: "filters.root".to_owned(),
                    logic: "and".to_owned(),
                    children: Vec::new(),
                });
        Self {
            table_id: repository.table_id.as_str().to_owned(),
            schema_version: repository.schema_version,
            owner_scope: owner_scope_name(repository.owner_scope).to_owned(),
            view_id: state.view_id.as_str().to_owned(),
            baseline_view_id: state.baseline_view_id.as_str().to_owned(),
            provenance: provenance_name(view.provenance).to_owned(),
            label: view.label.clone(),
            density: density_name(state.density).to_owned(),
            columns: state
                .columns
                .iter()
                .map(|column| TableViewColumnDto {
                    column_id: column.column_id.as_str().to_owned(),
                    visible: column.visible,
                    width: column.width,
                    pinning: TableViewPinningDto {
                        side: pinning_side_name(column.pinning.side).to_owned(),
                        order: (column.pinning.side != ColumnPinningSide::None)
                            .then_some(column.pinning.order),
                    },
                })
                .collect(),
            sort: state
                .sort
                .iter()
                .map(|sort| TableViewSortDto {
                    column_id: sort.column_id.as_str().to_owned(),
                    direction: sort_direction_name(sort.direction).to_owned(),
                    nulls: null_order_name(sort.null_order).to_owned(),
                })
                .collect(),
            filter,
            grouping: Vec::new(),
            data_window: match &state.data_window {
                TableDataWindow::ClientPagination {
                    window_id,
                    page,
                    page_size,
                } => TableViewDataWindowDto {
                    window_id: window_id.as_str().to_owned(),
                    mode: "client-pagination".to_owned(),
                    page: *page,
                    page_size: *page_size,
                },
                TableDataWindow::Unsupported => TableViewDataWindowDto {
                    window_id: "unsupported".to_owned(),
                    mode: "unsupported".to_owned(),
                    page: 0,
                    page_size: 0,
                },
            },
        }
    }

    fn try_into_application(
        self,
        table_id: &str,
        schema_version: u32,
        owner_scope: &str,
    ) -> Result<TableViewState, &'static str> {
        if self.table_id != table_id
            || self.schema_version != schema_version
            || self.owner_scope != owner_scope
            || !self.grouping.is_empty()
        {
            return Err(INVALID_TABLE_VIEW_DTO);
        }
        let data_window = if self.data_window.mode == "client-pagination" {
            TableDataWindow::ClientPagination {
                window_id: WindowId::from(self.data_window.window_id),
                page: self.data_window.page,
                page_size: self.data_window.page_size,
            }
        } else {
            return Err(INVALID_TABLE_VIEW_DTO);
        };
        Ok(TableViewState {
            view_id: ViewId::from(self.view_id),
            baseline_view_id: ViewId::from(self.baseline_view_id),
            density: parse_density(&self.density)?,
            columns: self
                .columns
                .into_iter()
                .map(|column| {
                    Ok(TableColumnState {
                        column_id: ColumnId::from(column.column_id),
                        visible: column.visible,
                        width: column.width,
                        pinning: parse_pinning(column.pinning)?,
                    })
                })
                .collect::<Result<_, &'static str>>()?,
            sort: self
                .sort
                .into_iter()
                .map(|sort| {
                    Ok(TableSort {
                        column_id: ColumnId::from(sort.column_id),
                        direction: parse_sort_direction(&sort.direction)?,
                        null_order: parse_null_order(&sort.nulls)?,
                    })
                })
                .collect::<Result<_, &'static str>>()?,
            filter: Some(self.filter.try_into()?),
            data_window,
        })
    }
}

impl From<&LegacyImportReceipt> for LegacyImportReceiptDto {
    fn from(receipt: &LegacyImportReceipt) -> Self {
        Self {
            source_version: receipt.source_version,
            source_fingerprint: receipt.source_fingerprint.clone(),
            table_id: receipt.table_id.as_str().to_owned(),
            schema_version: receipt.schema_version,
            owner_scope: owner_scope_name(receipt.owner_scope).to_owned(),
            imported_view_id: receipt.imported_view_id.as_str().to_owned(),
            accepted_revision: receipt.accepted_revision,
        }
    }
}

impl TryFrom<LegacyImportReceiptDto> for LegacyImportReceipt {
    type Error = &'static str;

    fn try_from(receipt: LegacyImportReceiptDto) -> Result<Self, Self::Error> {
        Ok(Self {
            source_version: receipt.source_version,
            source_fingerprint: receipt.source_fingerprint,
            table_id: TableId::from(receipt.table_id),
            schema_version: receipt.schema_version,
            owner_scope: parse_owner_scope(&receipt.owner_scope)?,
            imported_view_id: ViewId::from(receipt.imported_view_id),
            accepted_revision: receipt.accepted_revision,
        })
    }
}

impl From<&TableViewRepositoryState> for TableViewRepositoryStateDto {
    fn from(state: &TableViewRepositoryState) -> Self {
        Self {
            metadata: TableViewRepositoryMetadataDto {
                envelope_version: state.metadata.envelope_version,
                revision: state.metadata.revision,
            },
            table_id: state.table_id.as_str().to_owned(),
            schema_version: state.schema_version,
            owner_scope: owner_scope_name(state.owner_scope).to_owned(),
            active_view_id: state.active_view_id.as_str().to_owned(),
            default_view_id: state.default_view_id.as_str().to_owned(),
            views: state
                .views
                .iter()
                .map(|view| SavedTableViewDto {
                    mutability: mutability_name(view.mutability).to_owned(),
                    state: TableViewStateDto::from_application(&view.state, state, view),
                })
                .collect(),
            legacy_import_receipts: state
                .legacy_import_receipts
                .iter()
                .map(Into::into)
                .collect(),
        }
    }
}

impl TryFrom<TableViewRepositoryStateDto> for TableViewRepositoryState {
    type Error = &'static str;

    fn try_from(state: TableViewRepositoryStateDto) -> Result<Self, Self::Error> {
        if state.table_id != "squad.primary"
            || state.schema_version != 1
            || state.owner_scope != "local-fixed"
        {
            return Err(INVALID_TABLE_VIEW_DTO);
        }
        let table_id = state.table_id;
        let owner_scope = state.owner_scope;
        let schema_version = state.schema_version;
        let views = state
            .views
            .into_iter()
            .map(|view| {
                let provenance = parse_provenance(&view.state.provenance)?;
                let label = view.state.label.clone();
                Ok(SavedTableView {
                    label,
                    provenance,
                    mutability: parse_mutability(&view.mutability)?,
                    state: view.state.try_into_application(
                        &table_id,
                        schema_version,
                        &owner_scope,
                    )?,
                })
            })
            .collect::<Result<_, &'static str>>()?;
        Ok(Self {
            metadata: TableViewEnvelopeMetadata {
                envelope_version: state.metadata.envelope_version,
                revision: state.metadata.revision,
            },
            table_id: TableId::from(table_id),
            schema_version,
            owner_scope: parse_owner_scope(&owner_scope)?,
            active_view_id: ViewId::from(state.active_view_id),
            default_view_id: ViewId::from(state.default_view_id),
            views,
            legacy_import_receipts: state
                .legacy_import_receipts
                .into_iter()
                .map(TryInto::try_into)
                .collect::<Result<_, _>>()?,
        })
    }
}

impl TryFrom<ImportLegacyTablePreferencesRequestDto> for LegacyTableViewImport {
    type Error = &'static str;

    fn try_from(request: ImportLegacyTablePreferencesRequestDto) -> Result<Self, Self::Error> {
        if request.state.table_id != "squad.primary"
            || request.state.schema_version != 1
            || request.state.owner_scope != "local-fixed"
            || request.state.provenance != "user-owned"
        {
            return Err(INVALID_TABLE_VIEW_DTO);
        }
        let label = request.state.label.clone();
        Ok(Self {
            source_version: request.source_version,
            source_fingerprint: request.source_fingerprint,
            label,
            state: request
                .state
                .try_into_application("squad.primary", 1, "local-fixed")?,
        })
    }
}

fn fallback_table_views() -> TableViewRepositoryStateDto {
    (&squad_system_default_repository_state()).into()
}

fn invalid_load(
    fallback: &TableViewRepositoryState,
    reason: impl Into<String>,
) -> LoadTableViewsResponse {
    LoadTableViewsResponse::Invalid {
        fallback: fallback.into(),
        reason: reason.into(),
    }
}

fn load_table_views_response(
    outcome: Result<TableViewLoadOutcome, TableViewServiceError>,
) -> LoadTableViewsResponse {
    match outcome {
        Ok(TableViewLoadOutcome::Loaded { state } | TableViewLoadOutcome::Seeded { state }) => {
            LoadTableViewsResponse::Loaded {
                state: (&state).into(),
            }
        }
        Ok(TableViewLoadOutcome::Unavailable { fallback }) => LoadTableViewsResponse::Unavailable {
            fallback: (&fallback).into(),
        },
        Ok(TableViewLoadOutcome::Invalid { fallback, reason }) => {
            invalid_load(&fallback, reason.code.as_str())
        }
        Ok(TableViewLoadOutcome::InvalidRepositoryData { fallback }) => {
            invalid_load(&fallback, "table_view.invalid_repository_data")
        }
        Ok(TableViewLoadOutcome::Migrated {
            state,
            from_envelope_version,
            to_envelope_version,
        }) => LoadTableViewsResponse::Migrated {
            state: (&state).into(),
            from_envelope_version,
            to_envelope_version,
        },
        Ok(TableViewLoadOutcome::Recovered { state, reason }) => {
            LoadTableViewsResponse::Recovered {
                state: (&state).into(),
                reason,
            }
        }
        Ok(TableViewLoadOutcome::SaveFailed { fallback, .. }) => {
            LoadTableViewsResponse::SaveFailed {
                fallback: (&fallback).into(),
            }
        }
        Err(TableViewServiceError::Validation(TableViewValidationError { code })) => {
            LoadTableViewsResponse::Invalid {
                fallback: fallback_table_views(),
                reason: code.as_str().to_owned(),
            }
        }
        Err(TableViewServiceError::Policy(TableViewPolicyError { code })) => {
            LoadTableViewsResponse::Invalid {
                fallback: fallback_table_views(),
                reason: code.as_str().to_owned(),
            }
        }
        Err(TableViewServiceError::RepositoryUnavailable) => LoadTableViewsResponse::Unavailable {
            fallback: fallback_table_views(),
        },
        Err(TableViewServiceError::InvalidRepositoryData) => LoadTableViewsResponse::Invalid {
            fallback: fallback_table_views(),
            reason: "table_view.invalid_repository_data".to_owned(),
        },
        Err(TableViewServiceError::PersistenceFailed { previous, .. }) => {
            LoadTableViewsResponse::SaveFailed {
                fallback: previous.as_ref().into(),
            }
        }
    }
}

fn mutation_error_reason(error: &TableViewServiceError) -> Option<String> {
    match error {
        TableViewServiceError::Validation(error) => Some(error.code.as_str().to_owned()),
        TableViewServiceError::Policy(error) => Some(error.code.as_str().to_owned()),
        TableViewServiceError::InvalidRepositoryData => {
            Some("table_view.invalid_repository_data".to_owned())
        }
        TableViewServiceError::RepositoryUnavailable
        | TableViewServiceError::PersistenceFailed { .. } => None,
    }
}

fn save_table_views_response(
    outcome: Result<TableViewRepositoryState, TableViewServiceError>,
) -> SaveTableViewsResponse {
    match outcome {
        Ok(state) => SaveTableViewsResponse::Confirmed {
            receipt: TableViewSaveReceiptDto {
                table_id: "squad.primary",
                schema_version: 1,
                owner_scope: "local-fixed",
                accepted_revision: state.metadata.revision,
            },
            state: (&state).into(),
        },
        Err(error) => {
            if let Some(reason) = mutation_error_reason(&error) {
                SaveTableViewsResponse::Invalid { reason }
            } else {
                match error {
                    TableViewServiceError::RepositoryUnavailable => {
                        SaveTableViewsResponse::Unavailable
                    }
                    TableViewServiceError::PersistenceFailed { .. } => {
                        SaveTableViewsResponse::SaveFailed
                    }
                    _ => unreachable!("typed mutation errors handled above"),
                }
            }
        }
    }
}

fn import_legacy_table_preferences_response(
    outcome: Result<LegacyImportOutcome, TableViewServiceError>,
) -> ImportLegacyTablePreferencesResponse {
    match outcome {
        Ok(outcome) => ImportLegacyTablePreferencesResponse::Confirmed {
            state: Box::new((&outcome.state).into()),
            receipt: (&outcome.receipt).into(),
            imported: outcome.imported,
        },
        Err(error) => {
            if let Some(reason) = mutation_error_reason(&error) {
                ImportLegacyTablePreferencesResponse::Invalid { reason }
            } else {
                match error {
                    TableViewServiceError::RepositoryUnavailable => {
                        ImportLegacyTablePreferencesResponse::Unavailable
                    }
                    TableViewServiceError::PersistenceFailed { .. } => {
                        ImportLegacyTablePreferencesResponse::SaveFailed
                    }
                    _ => unreachable!("typed mutation errors handled above"),
                }
            }
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
enum ServiceOwnership {
    Owned,
    Reused,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
enum FailureCode {
    PortOccupied,
    UnhealthyResponse,
    MalformedReadiness,
    IncompatibleService,
    ReadinessTimeout,
    SidecarStartFailed,
    OwnedChildExited,
    OwnedReadinessLost,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct LifecycleFailure {
    code: FailureCode,
    message: &'static str,
    diagnostic: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(tag = "state", rename_all = "camelCase")]
enum LifecycleStatus {
    Initializing,
    Ready { ownership: ServiceOwnership },
    RecoverableFailure { failure: LifecycleFailure },
}

type OwnedChild = Arc<Mutex<Option<CommandChild>>>;

struct LifecycleInner {
    status: LifecycleStatus,
    generation: u64,
    owned_child: Option<OwnedChild>,
    shutting_down: bool,
}

struct LifecycleManager {
    inner: Mutex<LifecycleInner>,
}

impl LifecycleManager {
    fn new() -> Self {
        Self {
            inner: Mutex::new(LifecycleInner {
                status: LifecycleStatus::Initializing,
                generation: 0,
                owned_child: None,
                shutting_down: false,
            }),
        }
    }

    fn lock(&self) -> MutexGuard<'_, LifecycleInner> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn status(&self) -> LifecycleStatus {
        self.lock().status.clone()
    }

    fn begin(self: &Arc<Self>, app: AppHandle) {
        let (generation, previous_child) = {
            let mut inner = self.lock();
            inner.generation += 1;
            inner.status = LifecycleStatus::Initializing;
            inner.shutting_down = false;
            (inner.generation, inner.owned_child.take())
        };
        let manager = Arc::clone(self);
        tauri::async_runtime::spawn_blocking(move || {
            stop_owned_child(previous_child);
            run_lifecycle_attempt(app, manager, generation);
        });
    }

    fn is_current(&self, generation: u64) -> bool {
        let inner = self.lock();
        inner.generation == generation && !inner.shutting_down
    }

    fn is_initializing(&self, generation: u64) -> bool {
        let inner = self.lock();
        inner.generation == generation
            && !inner.shutting_down
            && matches!(inner.status, LifecycleStatus::Initializing)
    }

    fn is_ready_owned(&self, generation: u64) -> bool {
        let inner = self.lock();
        inner.generation == generation
            && !inner.shutting_down
            && matches!(
                inner.status,
                LifecycleStatus::Ready {
                    ownership: ServiceOwnership::Owned
                }
            )
    }

    fn store_owned_child(&self, generation: u64, child: OwnedChild) -> bool {
        let mut inner = self.lock();
        if inner.generation != generation || inner.shutting_down {
            return false;
        }
        inner.owned_child = Some(child);
        true
    }

    fn mark_ready(&self, generation: u64, ownership: ServiceOwnership) {
        let mut inner = self.lock();
        if inner.generation == generation && !inner.shutting_down {
            inner.status = LifecycleStatus::Ready { ownership };
        }
    }

    fn mark_failure(&self, generation: u64, failure: LifecycleFailure) {
        let mut inner = self.lock();
        if inner.generation == generation && !inner.shutting_down {
            inner.status = LifecycleStatus::RecoverableFailure { failure };
        }
    }

    fn shutdown_owned(&self) {
        let owned_child = {
            let mut inner = self.lock();
            inner.generation += 1;
            inner.shutting_down = true;
            inner.owned_child.take()
        };
        stop_owned_child(owned_child);
    }
}

#[derive(Debug)]
enum ProbeResult {
    Compatible,
    NotListening,
    Failure(LifecycleFailure),
}

enum InitialAction {
    Reuse,
    Spawn,
    Fail(LifecycleFailure),
}

fn decide_initial_probe(result: ProbeResult) -> InitialAction {
    match result {
        ProbeResult::Compatible => InitialAction::Reuse,
        ProbeResult::NotListening => InitialAction::Spawn,
        ProbeResult::Failure(failure) => InitialAction::Fail(failure),
    }
}

fn run_lifecycle_attempt(app: AppHandle, manager: Arc<LifecycleManager>, generation: u64) {
    if !manager.is_current(generation) {
        return;
    }

    match decide_initial_probe(probe_readiness()) {
        InitialAction::Reuse => {
            manager.mark_ready(generation, ServiceOwnership::Reused);
            return;
        }
        InitialAction::Fail(failure) => {
            manager.mark_failure(generation, failure);
            return;
        }
        InitialAction::Spawn => {}
    }

    let command = match app.shell().sidecar("local_api") {
        Ok(command) => command,
        Err(_) => {
            manager.mark_failure(generation, sidecar_start_failure());
            return;
        }
    };
    let (mut events, child) = match command.spawn() {
        Ok(spawned) => spawned,
        Err(_) => {
            manager.mark_failure(generation, sidecar_start_failure());
            return;
        }
    };
    let owned_child = Arc::new(Mutex::new(Some(child)));
    if !manager.store_owned_child(generation, Arc::clone(&owned_child)) {
        stop_owned_child(Some(owned_child));
        return;
    }

    let exit_manager = Arc::clone(&manager);
    tauri::async_runtime::spawn(async move {
        while let Some(event) = events.recv().await {
            if matches!(event, CommandEvent::Terminated(_)) {
                exit_manager.mark_failure(
                    generation,
                    LifecycleFailure {
                        code: FailureCode::OwnedChildExited,
                        message: "The local service stopped unexpectedly.",
                        diagnostic: "owned_child_exited",
                    },
                );
                break;
            }
        }
    });

    let deadline = Instant::now() + READINESS_TIMEOUT;
    loop {
        if !manager.is_initializing(generation) {
            return;
        }
        match probe_readiness() {
            ProbeResult::Compatible => {
                manager.mark_ready(generation, ServiceOwnership::Owned);
                start_owned_readiness_monitor(manager, generation);
                return;
            }
            ProbeResult::NotListening if Instant::now() < deadline => {
                thread::sleep(READINESS_POLL_INTERVAL);
            }
            ProbeResult::NotListening => {
                manager.mark_failure(
                    generation,
                    LifecycleFailure {
                        code: FailureCode::ReadinessTimeout,
                        message: "The local service did not become ready in time.",
                        diagnostic: "readiness_timeout",
                    },
                );
                return;
            }
            ProbeResult::Failure(failure) => {
                manager.mark_failure(generation, failure);
                return;
            }
        }
    }
}

fn start_owned_readiness_monitor(manager: Arc<LifecycleManager>, generation: u64) {
    tauri::async_runtime::spawn_blocking(move || {
        while manager.is_ready_owned(generation) {
            thread::sleep(OWNED_READINESS_INTERVAL);
            if !manager.is_ready_owned(generation) {
                break;
            }
            if !matches!(probe_readiness(), ProbeResult::Compatible) {
                manager.mark_failure(
                    generation,
                    LifecycleFailure {
                        code: FailureCode::OwnedReadinessLost,
                        message: "The local service is no longer ready.",
                        diagnostic: "owned_readiness_lost",
                    },
                );
                break;
            }
        }
    });
}

fn probe_readiness() -> ProbeResult {
    let address: SocketAddr = LOCAL_API_ADDRESS
        .parse()
        .expect("the fixed platform address is valid");
    let mut stream = match TcpStream::connect_timeout(&address, PROBE_IO_TIMEOUT) {
        Ok(stream) => stream,
        Err(error)
            if matches!(
                error.kind(),
                io::ErrorKind::ConnectionRefused
                    | io::ErrorKind::TimedOut
                    | io::ErrorKind::NotConnected
            ) =>
        {
            return ProbeResult::NotListening;
        }
        Err(_) => return ProbeResult::Failure(port_occupied_failure()),
    };
    if stream.set_read_timeout(Some(PROBE_IO_TIMEOUT)).is_err()
        || stream.set_write_timeout(Some(PROBE_IO_TIMEOUT)).is_err()
        || stream
            .write_all(b"GET /ready HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n")
            .is_err()
    {
        return ProbeResult::Failure(port_occupied_failure());
    }

    let mut response = Vec::new();
    if stream
        .take(MAX_READINESS_RESPONSE_BYTES + 1)
        .read_to_end(&mut response)
        .is_err()
        || response.len() as u64 > MAX_READINESS_RESPONSE_BYTES
    {
        return ProbeResult::Failure(malformed_readiness_failure());
    }
    let Some(headers_end) = response.windows(4).position(|bytes| bytes == b"\r\n\r\n") else {
        return ProbeResult::Failure(malformed_readiness_failure());
    };
    let Some(status) = response
        .split(|byte| *byte == b'\n')
        .next()
        .and_then(|line| std::str::from_utf8(line).ok())
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|status| status.parse::<u16>().ok())
    else {
        return ProbeResult::Failure(malformed_readiness_failure());
    };
    let body = &response[headers_end + 4..];
    match validate_readiness_response(status, body) {
        Ok(_) => ProbeResult::Compatible,
        Err(ReadinessDiagnostic::UnhealthyStatus(_)) => ProbeResult::Failure(LifecycleFailure {
            code: FailureCode::UnhealthyResponse,
            message: "A local service answered but is not ready.",
            diagnostic: "unhealthy_readiness_response",
        }),
        Err(ReadinessDiagnostic::MalformedPayload) => {
            ProbeResult::Failure(malformed_readiness_failure())
        }
        Err(ReadinessDiagnostic::Incompatible) => ProbeResult::Failure(LifecycleFailure {
            code: FailureCode::IncompatibleService,
            message: "A different or incompatible local service is using the required address.",
            diagnostic: "incompatible_local_service",
        }),
    }
}

fn port_occupied_failure() -> LifecycleFailure {
    LifecycleFailure {
        code: FailureCode::PortOccupied,
        message: "The local service address is occupied and cannot be reused safely.",
        diagnostic: "local_address_occupied",
    }
}

fn malformed_readiness_failure() -> LifecycleFailure {
    LifecycleFailure {
        code: FailureCode::MalformedReadiness,
        message: "The local service returned an invalid readiness response.",
        diagnostic: "malformed_readiness_response",
    }
}

fn sidecar_start_failure() -> LifecycleFailure {
    LifecycleFailure {
        code: FailureCode::SidecarStartFailed,
        message: "The local service could not be started.",
        diagnostic: "sidecar_start_failed",
    }
}

fn stop_owned_child(owned_child: Option<OwnedChild>) {
    let Some(owned_child) = owned_child else {
        return;
    };
    let child = owned_child
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .take();
    let Some(mut child) = child else {
        return;
    };
    let shutdown = format!("{SHUTDOWN_CONTROL_MESSAGE}\n");
    let _ = child.write(shutdown.as_bytes());
    thread::sleep(COOPERATIVE_SHUTDOWN_WAIT);
    let _ = child.kill();
}

#[tauri::command]
fn lifecycle_status(manager: State<'_, Arc<LifecycleManager>>) -> LifecycleStatus {
    manager.status()
}

#[tauri::command]
fn retry_lifecycle(app: AppHandle, manager: State<'_, Arc<LifecycleManager>>) -> LifecycleStatus {
    manager.inner().begin(app);
    manager.status()
}

#[tauri::command]
fn matchday_state(gameplay: State<'_, Arc<MatchdayCoordinator>>) -> Result<MatchdayState, String> {
    gameplay.state()
}

#[tauri::command]
fn update_matchday_lineup(
    player_ids: Vec<String>,
    formation: Formation,
    approach: TacticalApproach,
    gameplay: State<'_, Arc<MatchdayCoordinator>>,
) -> Result<MatchdayState, String> {
    gameplay.update_lineup(LineupSelection {
        player_ids,
        formation,
        approach,
    })
}

#[tauri::command]
fn update_tactical_plan(
    proposal: TacticalPlanProposal,
    gameplay: State<'_, Arc<MatchdayCoordinator>>,
) -> Result<TacticalPlanUpdate, String> {
    gameplay.update_tactical_plan(proposal)
}

#[tauri::command]
fn preview_tactical_plan(
    proposal: TacticalPlanProposal,
    gameplay: State<'_, Arc<MatchdayCoordinator>>,
) -> Result<TacticalPlanPreview, String> {
    gameplay.preview_tactical_plan(proposal)
}

#[tauri::command]
fn tactical_strategy_catalog(
    gameplay: State<'_, Arc<MatchdayCoordinator>>,
) -> Result<Vec<TacticalStrategyPresetSummary>, String> {
    gameplay.tactical_strategy_catalog()
}

#[tauri::command]
fn tactical_match_snapshot(
    variation_id: String,
    gameplay: State<'_, Arc<MatchdayCoordinator>>,
) -> Result<TacticalMatchSnapshot, String> {
    gameplay.tactical_match_snapshot(&variation_id)
}

#[tauri::command]
fn update_tactical_library(
    request: TacticalLibraryCommand,
    gameplay: State<'_, Arc<MatchdayCoordinator>>,
) -> Result<TacticalPlanUpdate, String> {
    gameplay.update_tactical_library(request)
}

#[tauri::command]
fn play_next_match(gameplay: State<'_, Arc<MatchdayCoordinator>>) -> Result<MatchdayState, String> {
    gameplay.play_next_match()
}

#[tauri::command]
fn player_profile(
    player_id: String,
    variation_id: Option<String>,
    gameplay: State<'_, Arc<MatchdayCoordinator>>,
    profiles: State<'_, Arc<ProfileCoordinator>>,
) -> Result<PlayerProfileProjection, String> {
    let matchday = gameplay.state()?;
    profiles.player_profile(
        &matchday,
        &player_id,
        &matchday.club.id,
        variation_id.as_deref(),
    )
}

#[tauri::command]
fn preview_player_profile(
    player_id: String,
    variation_id: Option<String>,
    gameplay: State<'_, Arc<MatchdayCoordinator>>,
    profiles: State<'_, Arc<ProfileCoordinator>>,
) -> Result<PlayerProfileProjection, String> {
    let matchday = gameplay.state()?;
    profiles.preview_player_profile(
        &matchday,
        &player_id,
        &matchday.club.id,
        variation_id.as_deref(),
    )
}

#[tauri::command]
fn coach_profile(
    coach_id: String,
    gameplay: State<'_, Arc<MatchdayCoordinator>>,
    profiles: State<'_, Arc<ProfileCoordinator>>,
) -> Result<CoachProfileProjection, String> {
    let matchday = gameplay.state()?;
    profiles.coach_profile(&matchday, &coach_id, &matchday.club.id)
}

#[tauri::command]
fn club_profile(
    club_id: String,
    gameplay: State<'_, Arc<MatchdayCoordinator>>,
    profiles: State<'_, Arc<ProfileCoordinator>>,
) -> Result<ClubProfileProjection, String> {
    let matchday = gameplay.state()?;
    profiles.club_profile(&matchday, &club_id, &matchday.club.id)
}

#[tauri::command]
fn nation_profile(
    nation_id: String,
    gameplay: State<'_, Arc<MatchdayCoordinator>>,
    profiles: State<'_, Arc<ProfileCoordinator>>,
) -> Result<NationProfileProjection, String> {
    let matchday = gameplay.state()?;
    profiles.nation_profile(&matchday, &nation_id, &matchday.club.id)
}

#[tauri::command]
fn search_profiles(
    query: String,
    gameplay: State<'_, Arc<MatchdayCoordinator>>,
    profiles: State<'_, Arc<ProfileCoordinator>>,
) -> Result<Vec<GlobalProfileSearchResult>, String> {
    let matchday = gameplay.state()?;
    profiles.search(&matchday, &matchday.club.id, &query)
}

#[tauri::command]
fn world_database_status(
    world: State<'_, Arc<WorldDatabaseCoordinator>>,
) -> Result<ResolvedWorldDatabase, PackageValidationReport> {
    world.resolved()
}

#[tauri::command]
fn world_reference_catalog(
    world: State<'_, Arc<WorldDatabaseCoordinator>>,
) -> Result<WorldReferenceCatalogDto, PackageValidationReport> {
    let resolved = world.resolved()?;
    let source_package_id =
        (resolved.packages.len() == 1).then(|| resolved.packages[0].package_id.clone());
    Ok(WorldReferenceCatalogDto {
        assets: resolved
            .world
            .assets
            .into_iter()
            .map(|asset| WorldAssetReferenceDto {
                asset,
                source_package_id: source_package_id.clone(),
                runtime_source: None,
            })
            .collect(),
        nations: resolved.world.nations,
    })
}

#[tauri::command]
fn data_package_catalog(
    world: State<'_, Arc<WorldDatabaseCoordinator>>,
) -> Result<Vec<DataPackageCatalogEntry>, PackageValidationReport> {
    world.catalog()
}

#[tauri::command]
fn validate_data_package(
    package: ContentPackage,
    world: State<'_, Arc<WorldDatabaseCoordinator>>,
) -> PackageValidationReport {
    world.validate_candidate(&package)
}

#[tauri::command]
fn export_data_package(
    package: ContentPackage,
    world: State<'_, Arc<WorldDatabaseCoordinator>>,
) -> Result<PackageValidationReport, PackageValidationReport> {
    world.export_candidate(&package)
}

#[tauri::command]
fn validate_data_package_source(
    source: DataPackageAuthoringDto,
    world: State<'_, Arc<WorldDatabaseCoordinator>>,
) -> PackageValidationReport {
    world.validate_authoring(
        &source.manifest_json,
        source.world_json.as_deref(),
        source.patches_json.as_deref(),
    )
}

#[tauri::command]
fn export_data_package_source(
    source: DataPackageAuthoringDto,
    world: State<'_, Arc<WorldDatabaseCoordinator>>,
) -> Result<PackageValidationReport, PackageValidationReport> {
    world.export_authoring(
        &source.manifest_json,
        source.world_json.as_deref(),
        source.patches_json.as_deref(),
    )
}

#[tauri::command]
fn load_table_views(table_views: State<'_, Arc<TableViewCoordinator>>) -> LoadTableViewsResponse {
    load_table_views_response(table_views.load())
}

#[tauri::command]
fn save_table_views(
    request: SaveTableViewsRequestDto,
    table_views: State<'_, Arc<TableViewCoordinator>>,
) -> SaveTableViewsResponse {
    let proposal = match TableViewRepositoryState::try_from(request.state) {
        Ok(proposal) => proposal,
        Err(reason) => {
            return SaveTableViewsResponse::Invalid {
                reason: reason.to_owned(),
            };
        }
    };
    save_table_views_response(table_views.save(proposal))
}

#[tauri::command]
fn import_legacy_table_preferences(
    request: ImportLegacyTablePreferencesRequestDto,
    table_views: State<'_, Arc<TableViewCoordinator>>,
) -> ImportLegacyTablePreferencesResponse {
    let conversion: Result<LegacyTableViewImport, &'static str> = request.try_into();
    let legacy = match conversion {
        Ok(legacy) => legacy,
        Err(reason) => {
            return ImportLegacyTablePreferencesResponse::Invalid {
                reason: reason.to_owned(),
            };
        }
    };
    import_legacy_table_preferences_response(table_views.import_legacy(legacy))
}

fn main() {
    let manager = Arc::new(LifecycleManager::new());
    let exit_manager = Arc::clone(&manager);
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Arc::clone(&manager))
        .invoke_handler(tauri::generate_handler![
            lifecycle_status,
            retry_lifecycle,
            matchday_state,
            update_matchday_lineup,
            update_tactical_plan,
            preview_tactical_plan,
            tactical_strategy_catalog,
            tactical_match_snapshot,
            update_tactical_library,
            play_next_match,
            player_profile,
            preview_player_profile,
            coach_profile,
            club_profile,
            nation_profile,
            search_profiles,
            world_database_status,
            world_reference_catalog,
            data_package_catalog,
            validate_data_package,
            export_data_package,
            validate_data_package_source,
            export_data_package_source,
            load_table_views,
            save_table_views,
            import_legacy_table_preferences
        ])
        .setup(move |app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_decorations(false);
                let _ = window.set_fullscreen(true);
            }
            let matchday_path = app.path().app_data_dir()?.join("first-playable.json");
            let profiles_path = app
                .path()
                .app_data_dir()?
                .join("player-coach-profiles.json");
            let table_views_path = app.path().app_data_dir()?.join("table-views.json");
            let data_packages_path = app.path().app_data_dir()?.join("data-packages");
            let world = Arc::new(WorldDatabaseCoordinator::new(data_packages_path));
            let bootstrap = world.resolved().map_err(|report| {
                io::Error::other(format!(
                    "the active world package failed validation: {:?}",
                    report.diagnostics
                ))
            })?;
            app.manage(Arc::new(MatchdayCoordinator::with_initial_state(
                matchday_path,
                bootstrap.world.matchday.clone(),
            )));
            app.manage(Arc::new(ProfileCoordinator::with_initial_world(
                profiles_path,
                bootstrap.world.profiles.clone(),
            )));
            app.manage(Arc::new(TableViewCoordinator::new(table_views_path)));
            app.manage(world);
            manager.begin(app.handle().clone());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to build the Rivallo desktop host");

    app.run(move |_app, event| {
        if matches!(event, RunEvent::Exit) {
            exit_manager.shutdown_owned();
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn table_view_dto_round_trips_the_application_owned_repository_contract() {
        let expected = squad_system_default_repository_state();
        let dto = TableViewRepositoryStateDto::from(&expected);

        assert_eq!(dto.table_id, "squad.primary");
        assert_eq!(dto.schema_version, 1);
        assert_eq!(dto.owner_scope, "local-fixed");
        assert_eq!(dto.views[0].state.provenance, "system-default");
        assert!(dto.views[0].state.grouping.is_empty());

        let actual = TableViewRepositoryState::try_from(dto).expect("valid table-view DTO");
        assert_eq!(actual, expected);
    }

    #[test]
    fn table_view_dto_rejects_unsupported_grouping_before_repository_mutation() {
        let mut dto = TableViewRepositoryStateDto::from(&squad_system_default_repository_state());
        dto.views[0].state.grouping.push(TableViewGroupingDto {
            group_id: "group.position".to_owned(),
            column_id: "position".to_owned(),
            mode: "position".to_owned(),
        });

        assert_eq!(
            TableViewRepositoryState::try_from(dto),
            Err(INVALID_TABLE_VIEW_DTO)
        );
    }

    #[test]
    fn compatible_reuse_has_no_owned_child_or_monitor() {
        let manager = LifecycleManager::new();
        manager.mark_ready(0, ServiceOwnership::Reused);

        assert_eq!(
            manager.status(),
            LifecycleStatus::Ready {
                ownership: ServiceOwnership::Reused
            }
        );
        assert!(!manager.is_ready_owned(0));
        assert!(manager.lock().owned_child.is_none());
    }

    #[test]
    fn owned_child_exit_becomes_recoverable_failure() {
        let manager = LifecycleManager::new();
        manager.mark_ready(0, ServiceOwnership::Owned);
        manager.mark_failure(
            0,
            LifecycleFailure {
                code: FailureCode::OwnedChildExited,
                message: "The local service stopped unexpectedly.",
                diagnostic: "owned_child_exited",
            },
        );

        assert!(matches!(
            manager.status(),
            LifecycleStatus::RecoverableFailure {
                failure: LifecycleFailure {
                    code: FailureCode::OwnedChildExited,
                    ..
                }
            }
        ));
    }

    #[test]
    fn owned_readiness_loss_becomes_recoverable_failure() {
        let manager = LifecycleManager::new();
        manager.mark_ready(0, ServiceOwnership::Owned);
        manager.mark_failure(
            0,
            LifecycleFailure {
                code: FailureCode::OwnedReadinessLost,
                message: "The local service is no longer ready.",
                diagnostic: "owned_readiness_lost",
            },
        );

        assert!(matches!(
            manager.status(),
            LifecycleStatus::RecoverableFailure {
                failure: LifecycleFailure {
                    code: FailureCode::OwnedReadinessLost,
                    ..
                }
            }
        ));
    }

    #[test]
    fn retry_probes_again_before_spawning() {
        assert!(matches!(
            decide_initial_probe(ProbeResult::Compatible),
            InitialAction::Reuse
        ));
        assert!(matches!(
            decide_initial_probe(ProbeResult::NotListening),
            InitialAction::Spawn
        ));
    }

    #[test]
    fn shutdown_contacts_only_the_owned_child() {
        let manager = LifecycleManager::new();
        manager.mark_ready(0, ServiceOwnership::Reused);
        manager.shutdown_owned();

        assert!(manager.lock().owned_child.is_none());
        assert!(manager.lock().shutting_down);
    }
}
