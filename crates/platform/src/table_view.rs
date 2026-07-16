#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    use rivallo_application::{
        TableViewRecoveryReason, TableViewRepository, TableViewRepositoryError,
        TableViewRepositoryLoad, TableViewRepositoryState, squad_system_default_repository_state,
    };

    use super::{FileTableViewRepository, MAX_REPOSITORY_BYTES, SaveInterruptionPoint};

    struct TestDirectory {
        path: PathBuf,
    }

    impl TestDirectory {
        fn new(case: &str) -> Self {
            let nonce = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system clock after epoch")
                .as_nanos();
            let path = std::env::temp_dir().join(format!("rivallo-table-view-{case}-{nonce}"));
            fs::create_dir_all(&path).expect("create isolated test directory");
            Self { path }
        }

        fn join(&self, file_name: &str) -> PathBuf {
            self.path.join(file_name)
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    fn state_from_load(load: TableViewRepositoryLoad) -> Option<TableViewRepositoryState> {
        match load {
            TableViewRepositoryLoad::Missing => None,
            TableViewRepositoryLoad::Loaded(state)
            | TableViewRepositoryLoad::Migrated { state, .. } => Some(state),
            TableViewRepositoryLoad::Recovered { state, .. } => state,
        }
    }

    fn assert_valid_generation(
        repository: &FileTableViewRepository,
        previous: &TableViewRepositoryState,
        next: &TableViewRepositoryState,
    ) -> TableViewRepositoryState {
        let recovered = state_from_load(repository.load().expect("recover interrupted save"))
            .expect("previous or next valid generation");
        recovered.validate().expect("recovered state remains valid");
        assert!(
            recovered == *previous || recovered == *next,
            "recovery must expose exactly the previous or next complete generation"
        );
        recovered
    }

    #[test]
    fn absent_repository_returns_missing_without_creating_artifacts() {
        let directory = TestDirectory::new("missing");
        let repository = FileTableViewRepository::new(directory.join("table-views.json"));

        assert_eq!(
            repository.load().expect("missing repository"),
            TableViewRepositoryLoad::Missing
        );
        assert!(!repository.path().exists());
        assert!(!repository.temporary_path().exists());
        assert!(!repository.backup_path().exists());
    }

    #[test]
    fn valid_state_round_trips_as_deterministic_bounded_bytes_on_an_isolated_path() {
        let directory = TestDirectory::new("round-trip");
        let table_view_path = directory.join("table-views.json");
        let matchday_path = directory.join("first-playable.json");
        let matchday_sentinel = br#"{"matchday":"untouched"}"#;
        fs::write(&matchday_path, matchday_sentinel).expect("write matchday sentinel");

        let repository = FileTableViewRepository::new(&table_view_path);
        let state = squad_system_default_repository_state();
        repository.save_atomic(&state).expect("first save");
        let first_bytes = fs::read(&table_view_path).expect("first repository bytes");

        let loaded =
            state_from_load(repository.load().expect("load current state")).expect("stored state");
        assert_eq!(loaded, state);
        repository.save_atomic(&loaded).expect("repeat save");
        let second_bytes = fs::read(&table_view_path).expect("second repository bytes");

        assert_eq!(first_bytes, second_bytes);
        assert!(second_bytes.len() <= MAX_REPOSITORY_BYTES);
        assert_eq!(
            fs::read(&matchday_path).expect("matchday sentinel remains"),
            matchday_sentinel
        );
        assert_ne!(repository.path(), Path::new("first-playable.json"));
        assert!(
            fs::read_dir(&directory.path)
                .expect("list test directory")
                .filter_map(Result::ok)
                .all(|entry| !entry
                    .file_name()
                    .to_string_lossy()
                    .contains("squad.primary")),
            "semantic table IDs must never become filenames"
        );
    }

    #[test]
    fn invalid_collection_count_is_rejected_before_any_bytes_are_staged() {
        let directory = TestDirectory::new("count-bound");
        let repository = FileTableViewRepository::new(directory.join("table-views.json"));
        let mut oversized = squad_system_default_repository_state();
        let extra = oversized.views[0].clone();
        oversized.views.extend(std::iter::repeat_n(extra, 33));

        assert_eq!(
            repository.save_atomic(&oversized),
            Err(TableViewRepositoryError::InvalidData)
        );
        assert!(!repository.path().exists());
        assert!(!repository.temporary_path().exists());
        assert!(!repository.backup_path().exists());
    }

    #[test]
    fn oversized_input_is_bounded_before_json_parse_and_quarantined_whole() {
        let directory = TestDirectory::new("byte-bound");
        let repository = FileTableViewRepository::new(directory.join("table-views.json"));
        let oversized = vec![b'{'; MAX_REPOSITORY_BYTES + 1];
        fs::write(repository.path(), &oversized).expect("write oversized candidate");

        assert_eq!(
            repository.load().expect("recover oversized candidate"),
            TableViewRepositoryLoad::Recovered {
                state: None,
                reason: TableViewRecoveryReason::InvalidPayload,
            }
        );
        assert_eq!(
            fs::read(repository.quarantine_payload_path())
                .expect("whole oversized payload retained"),
            oversized
        );
        assert!(repository.quarantine_evidence_path().exists());
        assert!(!repository.path().exists());
    }

    #[test]
    fn every_replacement_interruption_recovers_previous_or_new_complete_generation() {
        let interruption_points = [
            SaveInterruptionPoint::AfterStageCreate,
            SaveInterruptionPoint::DuringWrite,
            SaveInterruptionPoint::AfterFlush,
            SaveInterruptionPoint::AfterBackup,
            SaveInterruptionPoint::DuringReplace,
            SaveInterruptionPoint::AfterReplace,
            SaveInterruptionPoint::BeforeCleanup,
        ];

        for point in interruption_points {
            let directory = TestDirectory::new(point.as_str());
            let path = directory.join("table-views.json");
            let baseline_repository = FileTableViewRepository::new(&path);
            let previous = squad_system_default_repository_state();
            baseline_repository
                .save_atomic(&previous)
                .expect("persist previous generation");
            let mut next = previous.clone();
            next.metadata.revision = 1;

            let interrupted = FileTableViewRepository::with_interruption(&path, point);
            assert_eq!(
                interrupted.save_atomic(&next),
                Err(TableViewRepositoryError::SaveFailed),
                "fault at {} must interrupt the transaction",
                point.as_str()
            );

            let recovery_repository = FileTableViewRepository::new(&path);
            let recovered = assert_valid_generation(&recovery_repository, &previous, &next);
            assert!(
                recovery_repository.quarantine_evidence_path().exists(),
                "fault at {} must retain bounded recovery evidence",
                point.as_str()
            );
            assert!(
                fs::metadata(recovery_repository.quarantine_payload_path())
                    .expect("diagnostic payload evidence")
                    .len()
                    <= MAX_REPOSITORY_BYTES as u64
            );

            let stable = state_from_load(
                recovery_repository
                    .load()
                    .expect("second load after reconciliation"),
            )
            .expect("stable recovered generation");
            assert_eq!(stable, recovered);
            assert!(recovery_repository.quarantine_evidence_path().exists());
        }
    }
}
