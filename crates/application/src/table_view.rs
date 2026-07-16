#[cfg(test)]
mod tests {
    use std::cell::RefCell;

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
        fn load(
            &self,
        ) -> Result<TableViewRepositoryLoad, TableViewRepositoryError> {
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
}
