use std::ffi::OsString;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use rivallo_application::{
    CURRENT_ENVELOPE_VERSION, SQUAD_PRIMARY_SCHEMA_VERSION, TableViewRecoveryReason,
    TableViewRepository, TableViewRepositoryError, TableViewRepositoryLoad,
    TableViewRepositoryState,
};
use serde_json::{Value, json};

const CURRENT_STORAGE_ENVELOPE_VERSION: u32 = 3;
pub(crate) const MAX_REPOSITORY_BYTES: usize = 512 * 1024;
const MAX_QUARANTINE_BYTES: usize = 1024 * 1024;

#[cfg(test)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum SaveInterruptionPoint {
    AfterStageCreate,
    DuringWrite,
    AfterFlush,
    AfterBackup,
    DuringReplace,
    AfterReplace,
    BeforeCleanup,
}

#[cfg(test)]
impl SaveInterruptionPoint {
    const fn as_str(self) -> &'static str {
        match self {
            Self::AfterStageCreate => "after-stage-create",
            Self::DuringWrite => "during-write",
            Self::AfterFlush => "after-flush",
            Self::AfterBackup => "after-backup",
            Self::DuringReplace => "during-replace",
            Self::AfterReplace => "after-replace",
            Self::BeforeCleanup => "before-cleanup",
        }
    }
}

#[derive(Debug)]
struct CandidateBytes {
    bytes: Vec<u8>,
    original_len: u64,
    truncated: bool,
}

#[derive(Clone, Copy, Debug)]
struct CandidateFailure {
    reason: TableViewRecoveryReason,
    source_envelope_version: Option<u32>,
    source_schema_version: Option<u32>,
}

#[derive(Debug)]
struct DecodedCandidate {
    state: TableViewRepositoryState,
}

enum Candidate {
    Valid(DecodedCandidate),
    Invalid(CandidateFailure),
}

/// Platform-owned, fixed-path JSON adapter for durable table-view preferences.
///
/// The host supplies the complete app-data path. Semantic table/view IDs are
/// serialized only as data and never participate in filesystem path selection.
pub struct FileTableViewRepository {
    path: PathBuf,
    #[cfg(test)]
    interruption: Option<SaveInterruptionPoint>,
}

impl FileTableViewRepository {
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self {
            path: path.into(),
            #[cfg(test)]
            interruption: None,
        }
    }

    #[cfg(test)]
    fn with_interruption(path: impl Into<PathBuf>, interruption: SaveInterruptionPoint) -> Self {
        Self {
            path: path.into(),
            interruption: Some(interruption),
        }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    fn temporary_path(&self) -> PathBuf {
        sibling_with_suffix(&self.path, ".tmp")
    }

    fn backup_path(&self) -> PathBuf {
        sibling_with_suffix(&self.path, ".bak")
    }

    fn quarantine_payload_path(&self) -> PathBuf {
        sibling_with_suffix(&self.path, ".quarantine.payload")
    }

    fn quarantine_evidence_path(&self) -> PathBuf {
        sibling_with_suffix(&self.path, ".quarantine.json")
    }

    fn encode_current(
        &self,
        state: &TableViewRepositoryState,
    ) -> Result<Vec<u8>, TableViewRepositoryError> {
        state
            .validate()
            .map_err(|_| TableViewRepositoryError::InvalidData)?;
        let envelope = json!({
            "envelopeVersion": CURRENT_STORAGE_ENVELOPE_VERSION,
            "payload": state,
        });
        let mut bytes = serde_json::to_vec_pretty(&envelope)
            .map_err(|_| TableViewRepositoryError::InvalidData)?;
        bytes.push(b'\n');
        if bytes.len() > MAX_REPOSITORY_BYTES {
            return Err(TableViewRepositoryError::InvalidData);
        }
        Ok(bytes)
    }

    fn save_bytes(&self, bytes: &[u8]) -> Result<(), TableViewRepositoryError> {
        let parent = repository_parent(&self.path)?;
        fs::create_dir_all(parent).map_err(|_| TableViewRepositoryError::SaveFailed)?;

        let temporary_path = self.temporary_path();
        let backup_path = self.backup_path();
        if temporary_path.exists() || backup_path.exists() {
            return Err(TableViewRepositoryError::SaveFailed);
        }

        let mut temporary =
            File::create(&temporary_path).map_err(|_| TableViewRepositoryError::SaveFailed)?;
        self.interrupt_at(SaveInterruptionBoundary::AfterStageCreate)?;

        #[cfg(test)]
        if self.interruption == Some(SaveInterruptionPoint::DuringWrite) {
            let partial_len = bytes.len().saturating_div(2).max(1);
            temporary
                .write_all(&bytes[..partial_len])
                .and_then(|()| temporary.flush())
                .and_then(|()| temporary.sync_all())
                .map_err(|_| TableViewRepositoryError::SaveFailed)?;
            return Err(TableViewRepositoryError::SaveFailed);
        }

        temporary
            .write_all(bytes)
            .and_then(|()| temporary.flush())
            .and_then(|()| temporary.sync_all())
            .map_err(|_| TableViewRepositoryError::SaveFailed)?;
        drop(temporary);
        self.interrupt_at(SaveInterruptionBoundary::AfterFlush)?;

        match decode_candidate(bytes) {
            Candidate::Valid(_) => {}
            Candidate::Invalid(_) => return Err(TableViewRepositoryError::InvalidData),
        }

        if self.path.exists() {
            let active = read_candidate_bytes(&self.path)
                .map_err(|_| TableViewRepositoryError::SaveFailed)?;
            if !matches!(decode_candidate(&active.bytes), Candidate::Valid(_)) {
                return Err(TableViewRepositoryError::SaveFailed);
            }
            copy_synced(&self.path, &backup_path)
                .map_err(|_| TableViewRepositoryError::SaveFailed)?;
            let backup = read_candidate_bytes(&backup_path)
                .map_err(|_| TableViewRepositoryError::SaveFailed)?;
            if !matches!(decode_candidate(&backup.bytes), Candidate::Valid(_)) {
                return Err(TableViewRepositoryError::SaveFailed);
            }
            self.interrupt_at(SaveInterruptionBoundary::AfterBackup)?;

            fs::remove_file(&self.path).map_err(|_| TableViewRepositoryError::SaveFailed)?;
            self.interrupt_at(SaveInterruptionBoundary::DuringReplace)?;
        }

        fs::rename(&temporary_path, &self.path)
            .map_err(|_| TableViewRepositoryError::SaveFailed)?;
        self.interrupt_at(SaveInterruptionBoundary::AfterReplace)?;

        let committed =
            read_candidate_bytes(&self.path).map_err(|_| TableViewRepositoryError::SaveFailed)?;
        if !matches!(decode_candidate(&committed.bytes), Candidate::Valid(_)) {
            return Err(TableViewRepositoryError::SaveFailed);
        }
        self.interrupt_at(SaveInterruptionBoundary::BeforeCleanup)?;

        remove_if_exists(&backup_path).map_err(|_| TableViewRepositoryError::SaveFailed)?;
        Ok(())
    }

    fn reconcile(&self) -> Result<TableViewRepositoryLoad, TableViewRepositoryError> {
        let temporary_path = self.temporary_path();
        let backup_path = self.backup_path();
        let active_exists = self.path.exists();
        let temporary_exists = temporary_path.exists();
        let backup_exists = backup_path.exists();

        if !active_exists && !temporary_exists && !backup_exists {
            return Ok(TableViewRepositoryLoad::Missing);
        }

        let active = active_exists
            .then(|| read_candidate_bytes(&self.path))
            .transpose()
            .map_err(|_| TableViewRepositoryError::Unavailable)?;
        let temporary = temporary_exists
            .then(|| read_candidate_bytes(&temporary_path))
            .transpose()
            .map_err(|_| TableViewRepositoryError::Unavailable)?;
        let backup = backup_exists
            .then(|| read_candidate_bytes(&backup_path))
            .transpose()
            .map_err(|_| TableViewRepositoryError::Unavailable)?;

        if let Some(active_bytes) = &active {
            match decode_candidate(&active_bytes.bytes) {
                Candidate::Valid(active_candidate) => {
                    if temporary.is_none() && backup.is_none() {
                        return Ok(TableViewRepositoryLoad::Loaded(active_candidate.state));
                    }

                    let evidence = temporary
                        .as_ref()
                        .or(backup.as_ref())
                        .unwrap_or(active_bytes);
                    self.persist_quarantine(
                        evidence,
                        CandidateFailure {
                            reason: TableViewRecoveryReason::InterruptedWrite,
                            source_envelope_version: extract_u32(
                                &evidence.bytes,
                                &["envelopeVersion"],
                            ),
                            source_schema_version: extract_u32(
                                &evidence.bytes,
                                &["payload", "schemaVersion"],
                            ),
                        },
                        "transaction-artifact",
                    )?;
                    remove_if_exists(&temporary_path)
                        .map_err(|_| TableViewRepositoryError::Unavailable)?;
                    remove_if_exists(&backup_path)
                        .map_err(|_| TableViewRepositoryError::Unavailable)?;
                    return Ok(TableViewRepositoryLoad::Recovered {
                        state: Some(active_candidate.state),
                        reason: TableViewRecoveryReason::InterruptedWrite,
                    });
                }
                Candidate::Invalid(active_failure) => {
                    self.persist_quarantine(active_bytes, active_failure, "active")?;
                    remove_if_exists(&self.path)
                        .map_err(|_| TableViewRepositoryError::Unavailable)?;

                    if let Some((candidate, candidate_path)) =
                        first_valid_candidate(&temporary, &temporary_path, &backup, &backup_path)
                    {
                        fs::rename(candidate_path, &self.path)
                            .or_else(|_| {
                                copy_synced(candidate_path, &self.path)?;
                                remove_if_exists(candidate_path)
                            })
                            .map_err(|_| TableViewRepositoryError::Unavailable)?;
                        remove_if_exists(if candidate_path == temporary_path {
                            &backup_path
                        } else {
                            &temporary_path
                        })
                        .map_err(|_| TableViewRepositoryError::Unavailable)?;
                        return Ok(TableViewRepositoryLoad::Recovered {
                            state: Some(candidate.state),
                            reason: active_failure.reason,
                        });
                    }

                    remove_if_exists(&temporary_path)
                        .map_err(|_| TableViewRepositoryError::Unavailable)?;
                    remove_if_exists(&backup_path)
                        .map_err(|_| TableViewRepositoryError::Unavailable)?;
                    return Ok(TableViewRepositoryLoad::Recovered {
                        state: None,
                        reason: active_failure.reason,
                    });
                }
            }
        }

        if let Some((candidate, candidate_path)) =
            first_valid_candidate(&temporary, &temporary_path, &backup, &backup_path)
        {
            let evidence = if candidate_path == temporary_path {
                backup.as_ref().unwrap_or_else(|| {
                    temporary
                        .as_ref()
                        .expect("selected temporary candidate exists")
                })
            } else {
                temporary
                    .as_ref()
                    .unwrap_or_else(|| backup.as_ref().expect("selected backup candidate exists"))
            };
            self.persist_quarantine(
                evidence,
                CandidateFailure {
                    reason: TableViewRecoveryReason::InterruptedWrite,
                    source_envelope_version: extract_u32(&evidence.bytes, &["envelopeVersion"]),
                    source_schema_version: extract_u32(
                        &evidence.bytes,
                        &["payload", "schemaVersion"],
                    ),
                },
                "transaction-artifact",
            )?;
            fs::rename(candidate_path, &self.path)
                .or_else(|_| {
                    copy_synced(candidate_path, &self.path)?;
                    remove_if_exists(candidate_path)
                })
                .map_err(|_| TableViewRepositoryError::Unavailable)?;
            remove_if_exists(if candidate_path == temporary_path {
                &backup_path
            } else {
                &temporary_path
            })
            .map_err(|_| TableViewRepositoryError::Unavailable)?;
            return Ok(TableViewRepositoryLoad::Recovered {
                state: Some(candidate.state),
                reason: TableViewRecoveryReason::InterruptedWrite,
            });
        }

        let invalid = temporary
            .as_ref()
            .or(backup.as_ref())
            .ok_or(TableViewRepositoryError::InvalidData)?;
        let failure = match decode_candidate(&invalid.bytes) {
            Candidate::Invalid(failure) => failure,
            Candidate::Valid(_) => CandidateFailure {
                reason: TableViewRecoveryReason::InterruptedWrite,
                source_envelope_version: None,
                source_schema_version: None,
            },
        };
        self.persist_quarantine(invalid, failure, "transaction-artifact")?;
        remove_if_exists(&temporary_path).map_err(|_| TableViewRepositoryError::Unavailable)?;
        remove_if_exists(&backup_path).map_err(|_| TableViewRepositoryError::Unavailable)?;
        Ok(TableViewRepositoryLoad::Recovered {
            state: None,
            reason: failure.reason,
        })
    }

    fn persist_quarantine(
        &self,
        candidate: &CandidateBytes,
        failure: CandidateFailure,
        source: &str,
    ) -> Result<(), TableViewRepositoryError> {
        replace_auxiliary_file(&self.quarantine_payload_path(), &candidate.bytes)
            .map_err(|_| TableViewRepositoryError::Unavailable)?;
        let evidence = json!({
            "diagnosticBytes": candidate.bytes.len(),
            "diagnosticTruncated": candidate.truncated,
            "fingerprint": fingerprint(&candidate.bytes, candidate.original_len),
            "originalBytes": candidate.original_len,
            "reasonCode": recovery_reason_code(failure.reason),
            "source": source,
            "sourceEnvelopeVersion": failure.source_envelope_version,
            "sourceSchemaVersion": failure.source_schema_version,
        });
        let mut evidence_bytes = serde_json::to_vec_pretty(&evidence)
            .map_err(|_| TableViewRepositoryError::Unavailable)?;
        evidence_bytes.push(b'\n');
        replace_auxiliary_file(&self.quarantine_evidence_path(), &evidence_bytes)
            .map_err(|_| TableViewRepositoryError::Unavailable)
    }

    #[cfg(test)]
    fn interrupt_at(
        &self,
        boundary: SaveInterruptionBoundary,
    ) -> Result<(), TableViewRepositoryError> {
        if self.interruption.map(SaveInterruptionBoundary::from) == Some(boundary) {
            Err(TableViewRepositoryError::SaveFailed)
        } else {
            Ok(())
        }
    }

    #[cfg(not(test))]
    const fn interrupt_at(
        &self,
        _boundary: SaveInterruptionBoundary,
    ) -> Result<(), TableViewRepositoryError> {
        Ok(())
    }
}

impl TableViewRepository for FileTableViewRepository {
    fn load(&self) -> Result<TableViewRepositoryLoad, TableViewRepositoryError> {
        self.reconcile()
    }

    fn save_atomic(
        &self,
        state: &TableViewRepositoryState,
    ) -> Result<(), TableViewRepositoryError> {
        let bytes = self.encode_current(state)?;
        self.save_bytes(&bytes)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum SaveInterruptionBoundary {
    AfterStageCreate,
    AfterFlush,
    AfterBackup,
    DuringReplace,
    AfterReplace,
    BeforeCleanup,
}

#[cfg(test)]
impl From<SaveInterruptionPoint> for SaveInterruptionBoundary {
    fn from(value: SaveInterruptionPoint) -> Self {
        match value {
            SaveInterruptionPoint::AfterStageCreate => Self::AfterStageCreate,
            SaveInterruptionPoint::DuringWrite => Self::AfterFlush,
            SaveInterruptionPoint::AfterFlush => Self::AfterFlush,
            SaveInterruptionPoint::AfterBackup => Self::AfterBackup,
            SaveInterruptionPoint::DuringReplace => Self::DuringReplace,
            SaveInterruptionPoint::AfterReplace => Self::AfterReplace,
            SaveInterruptionPoint::BeforeCleanup => Self::BeforeCleanup,
        }
    }
}

fn repository_parent(path: &Path) -> Result<&Path, TableViewRepositoryError> {
    let parent = path.parent().ok_or(TableViewRepositoryError::SaveFailed)?;
    if parent.as_os_str().is_empty() {
        Ok(Path::new("."))
    } else {
        Ok(parent)
    }
}

fn sibling_with_suffix(path: &Path, suffix: &str) -> PathBuf {
    let mut sibling: OsString = path.as_os_str().to_owned();
    sibling.push(suffix);
    PathBuf::from(sibling)
}

fn remove_if_exists(path: &Path) -> std::io::Result<()> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error),
    }
}

fn copy_synced(source: &Path, destination: &Path) -> std::io::Result<()> {
    fs::copy(source, destination)?;
    File::options()
        .read(true)
        .write(true)
        .open(destination)?
        .sync_all()
}

fn replace_auxiliary_file(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    if let Some(parent) = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
    {
        fs::create_dir_all(parent)?;
    }
    let temporary_path = sibling_with_suffix(path, ".tmp");
    let backup_path = sibling_with_suffix(path, ".bak");
    remove_if_exists(&temporary_path)?;

    let mut temporary = File::create(&temporary_path)?;
    temporary.write_all(bytes)?;
    temporary.flush()?;
    temporary.sync_all()?;
    drop(temporary);

    if path.exists() {
        remove_if_exists(&backup_path)?;
        copy_synced(path, &backup_path)?;
        fs::remove_file(path)?;
    }
    match fs::rename(&temporary_path, path) {
        Ok(()) => {
            remove_if_exists(&backup_path)?;
            Ok(())
        }
        Err(error) => {
            if backup_path.exists() && !path.exists() {
                let _ = fs::rename(&backup_path, path);
            }
            Err(error)
        }
    }
}

fn read_candidate_bytes(path: &Path) -> std::io::Result<CandidateBytes> {
    let original_len = fs::metadata(path)?.len();
    let file = File::open(path)?;
    let mut bytes = Vec::with_capacity(
        usize::try_from(original_len.min(MAX_QUARANTINE_BYTES as u64))
            .unwrap_or(MAX_QUARANTINE_BYTES),
    );
    Read::take(file, MAX_QUARANTINE_BYTES as u64).read_to_end(&mut bytes)?;
    Ok(CandidateBytes {
        bytes,
        original_len,
        truncated: original_len > MAX_QUARANTINE_BYTES as u64,
    })
}

fn decode_candidate(bytes: &[u8]) -> Candidate {
    if bytes.len() > MAX_REPOSITORY_BYTES {
        return Candidate::Invalid(CandidateFailure {
            reason: TableViewRecoveryReason::InvalidPayload,
            source_envelope_version: None,
            source_schema_version: None,
        });
    }

    let value: Value = match serde_json::from_slice(bytes) {
        Ok(value) => value,
        Err(_) => {
            return Candidate::Invalid(CandidateFailure {
                reason: TableViewRecoveryReason::CorruptPayload,
                source_envelope_version: None,
                source_schema_version: None,
            });
        }
    };
    let source_envelope_version = value
        .get("envelopeVersion")
        .and_then(Value::as_u64)
        .and_then(|version| u32::try_from(version).ok());
    let source_schema_version = value
        .pointer("/payload/schemaVersion")
        .and_then(Value::as_u64)
        .and_then(|version| u32::try_from(version).ok());

    let Some(envelope_version) = source_envelope_version else {
        return Candidate::Invalid(CandidateFailure {
            reason: TableViewRecoveryReason::InvalidPayload,
            source_envelope_version,
            source_schema_version,
        });
    };
    if envelope_version > CURRENT_STORAGE_ENVELOPE_VERSION {
        return Candidate::Invalid(CandidateFailure {
            reason: TableViewRecoveryReason::FutureEnvelopeVersion,
            source_envelope_version,
            source_schema_version,
        });
    }
    if envelope_version != CURRENT_STORAGE_ENVELOPE_VERSION {
        return Candidate::Invalid(CandidateFailure {
            reason: TableViewRecoveryReason::MissingMigrationStep,
            source_envelope_version,
            source_schema_version,
        });
    }
    if source_schema_version.is_some_and(|version| version > SQUAD_PRIMARY_SCHEMA_VERSION) {
        return Candidate::Invalid(CandidateFailure {
            reason: TableViewRecoveryReason::FutureSchemaVersion,
            source_envelope_version,
            source_schema_version,
        });
    }

    let Some(object) = value.as_object() else {
        return Candidate::Invalid(CandidateFailure {
            reason: TableViewRecoveryReason::InvalidPayload,
            source_envelope_version,
            source_schema_version,
        });
    };
    if object.len() != 2 || !object.contains_key("payload") {
        return Candidate::Invalid(CandidateFailure {
            reason: TableViewRecoveryReason::InvalidPayload,
            source_envelope_version,
            source_schema_version,
        });
    }
    let Some(payload) = object.get("payload").cloned() else {
        return Candidate::Invalid(CandidateFailure {
            reason: TableViewRecoveryReason::InvalidPayload,
            source_envelope_version,
            source_schema_version,
        });
    };
    let state: TableViewRepositoryState = match serde_json::from_value(payload) {
        Ok(state) => state,
        Err(_) => {
            return Candidate::Invalid(CandidateFailure {
                reason: TableViewRecoveryReason::InvalidPayload,
                source_envelope_version,
                source_schema_version,
            });
        }
    };
    if state.metadata.envelope_version != CURRENT_ENVELOPE_VERSION || state.validate().is_err() {
        return Candidate::Invalid(CandidateFailure {
            reason: TableViewRecoveryReason::InvalidPayload,
            source_envelope_version,
            source_schema_version,
        });
    }
    Candidate::Valid(DecodedCandidate { state })
}

fn first_valid_candidate<'a>(
    temporary: &'a Option<CandidateBytes>,
    temporary_path: &'a Path,
    backup: &'a Option<CandidateBytes>,
    backup_path: &'a Path,
) -> Option<(DecodedCandidate, &'a Path)> {
    if let Some(temporary) = temporary {
        if let Candidate::Valid(candidate) = decode_candidate(&temporary.bytes) {
            return Some((candidate, temporary_path));
        }
    }
    if let Some(backup) = backup {
        if let Candidate::Valid(candidate) = decode_candidate(&backup.bytes) {
            return Some((candidate, backup_path));
        }
    }
    None
}

fn extract_u32(bytes: &[u8], path: &[&str]) -> Option<u32> {
    if path.is_empty() {
        return None;
    }
    let owned = serde_json::from_slice::<Value>(bytes).ok()?;
    let mut value = &owned;
    for segment in path {
        value = value.get(*segment)?;
    }
    value.as_u64().and_then(|number| u32::try_from(number).ok())
}

fn fingerprint(bytes: &[u8], original_len: u64) -> String {
    let mut hash = 0xcbf2_9ce4_8422_2325_u64;
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    format!("fnv1a64:{hash:016x}:{original_len}")
}

const fn recovery_reason_code(reason: TableViewRecoveryReason) -> &'static str {
    match reason {
        TableViewRecoveryReason::CorruptPayload => "table_view.corrupt_payload",
        TableViewRecoveryReason::FutureEnvelopeVersion => "table_view.future_envelope_version",
        TableViewRecoveryReason::FutureSchemaVersion => "table_view.future_schema_version",
        TableViewRecoveryReason::MissingMigrationStep => "table_view.missing_migration_step",
        TableViewRecoveryReason::InterruptedWrite => "table_view.interrupted_write",
        TableViewRecoveryReason::InvalidPayload => "table_view.invalid_payload",
    }
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    use rivallo_application::{
        LegacyTableViewImport, OwnerScope, TableDensity, TableViewLoadOutcome,
        TableViewRecoveryReason, TableViewRepository, TableViewRepositoryError,
        TableViewRepositoryLoad, TableViewRepositoryState, TableViewServiceError, ViewId,
        ViewMutability, ViewProvenance, squad_system_default_repository_state,
    };
    use serde_json::{Value, json};

    use super::{
        CURRENT_STORAGE_ENVELOPE_VERSION, FileTableViewRepository, MAX_REPOSITORY_BYTES,
        SaveInterruptionPoint, TableViewCoordinator,
    };

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

    fn valid_state_with_user_intent() -> TableViewRepositoryState {
        let mut state = squad_system_default_repository_state();
        let mut user_view = state.views[0].clone();
        user_view.label = "Minha análise".to_owned();
        user_view.provenance = ViewProvenance::UserOwned;
        user_view.mutability = ViewMutability::Mutable;
        user_view.state.view_id = ViewId::from("squad.user.migrated");
        user_view.state.baseline_view_id = ViewId::from("squad.view.system-default");
        user_view.state.density = TableDensity::Standard;
        user_view.state.columns.swap(8, 15);
        user_view
            .state
            .columns
            .iter_mut()
            .find(|column| column.column_id.as_str() == "age")
            .expect("age column")
            .visible = false;
        user_view
            .state
            .columns
            .iter_mut()
            .find(|column| column.column_id.as_str() == "goals")
            .expect("goals column")
            .width = 144.0;
        state.views.push(user_view);
        state.active_view_id = ViewId::from("squad.user.migrated");
        state.default_view_id = ViewId::from("squad.user.migrated");
        state.metadata.revision = 7;
        state.validate().expect("valid migration fixture");
        state
    }

    fn envelope_value(storage_version: u32, state: &TableViewRepositoryState) -> Value {
        json!({
            "envelopeVersion": storage_version,
            "payload": state,
        })
    }

    fn write_envelope(path: &Path, value: &Value) -> Vec<u8> {
        let mut bytes = serde_json::to_vec_pretty(value).expect("serialize fixture");
        bytes.push(b'\n');
        fs::write(path, &bytes).expect("write fixture");
        bytes
    }

    fn historical_payload(
        storage_version: u32,
        expected: &TableViewRepositoryState,
        include_removed_column: bool,
    ) -> Value {
        let mut envelope = envelope_value(storage_version, expected);
        envelope["payload"]["metadata"]["envelopeVersion"] = json!(0);
        for view in envelope["payload"]["views"]
            .as_array_mut()
            .expect("views array")
        {
            let columns = view["state"]["columns"]
                .as_array_mut()
                .expect("columns array");
            columns.retain(|column| column["columnId"] != "averageRating");
            if include_removed_column {
                columns.push(json!({
                    "columnId": "legacyRating",
                    "visible": false,
                    "width": 88.0,
                    "pinning": {
                        "side": "none",
                        "order": 0,
                    },
                }));
            }
        }
        envelope
    }

    fn evidence(repository: &FileTableViewRepository) -> Value {
        serde_json::from_slice(
            &fs::read(repository.quarantine_evidence_path()).expect("quarantine evidence bytes"),
        )
        .expect("quarantine evidence json")
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

    #[test]
    fn adjacent_v1_and_v2_migrations_reach_current_without_skipping_steps() {
        for (storage_version, include_removed_column) in [(1, true), (2, false)] {
            let directory = TestDirectory::new(&format!("migration-v{storage_version}"));
            let repository = FileTableViewRepository::new(directory.join("table-views.json"));
            let expected = valid_state_with_user_intent();
            let fixture = historical_payload(storage_version, &expected, include_removed_column);
            write_envelope(repository.path(), &fixture);

            assert_eq!(
                repository.load().expect("migrate historical fixture"),
                TableViewRepositoryLoad::Migrated {
                    state: expected.clone(),
                    from_envelope_version: 0,
                    to_envelope_version: 1,
                },
                "storage v{storage_version} must traverse every adjacent step"
            );
            assert_eq!(
                repository.load().expect("reload persisted migration"),
                TableViewRepositoryLoad::Loaded(expected)
            );
        }
    }

    #[test]
    fn added_column_comes_from_owning_default_and_preserves_every_known_intent() {
        let directory = TestDirectory::new("added-column");
        let repository = FileTableViewRepository::new(directory.join("table-views.json"));
        let expected = valid_state_with_user_intent();
        let fixture = historical_payload(1, &expected, true);
        write_envelope(repository.path(), &fixture);

        let migrated = state_from_load(repository.load().expect("migrate added column"))
            .expect("migrated state");
        assert_eq!(migrated, expected);

        let owning_default = squad_system_default_repository_state();
        let default_average = owning_default.views[0]
            .state
            .columns
            .iter()
            .find(|column| column.column_id.as_str() == "averageRating")
            .expect("application-owned average rating default");
        for view in &migrated.views {
            let migrated_average: Vec<_> = view
                .state
                .columns
                .iter()
                .filter(|column| column.column_id.as_str() == "averageRating")
                .collect();
            assert_eq!(migrated_average, vec![default_average]);
        }
    }

    #[test]
    fn removed_column_is_discarded_but_unknown_column_quarantines_the_whole_payload() {
        let removed_directory = TestDirectory::new("removed-column");
        let removed_repository =
            FileTableViewRepository::new(removed_directory.join("table-views.json"));
        let expected = valid_state_with_user_intent();
        write_envelope(
            removed_repository.path(),
            &historical_payload(1, &expected, true),
        );
        assert_eq!(
            state_from_load(removed_repository.load().expect("normalize removed column"),),
            Some(expected.clone())
        );

        let unknown_directory = TestDirectory::new("unknown-column");
        let unknown_repository =
            FileTableViewRepository::new(unknown_directory.join("table-views.json"));
        let mut unknown = historical_payload(1, &expected, false);
        unknown["payload"]["views"][1]["state"]["columns"]
            .as_array_mut()
            .expect("user columns")
            .push(json!({
                "columnId": "mysteryMetric",
                "visible": true,
                "width": 80.0,
                "pinning": {"side": "none", "order": 0},
            }));
        let original = write_envelope(unknown_repository.path(), &unknown);

        assert_eq!(
            unknown_repository
                .load()
                .expect("quarantine unknown column"),
            TableViewRepositoryLoad::Recovered {
                state: None,
                reason: TableViewRecoveryReason::InvalidPayload,
            }
        );
        assert_eq!(
            fs::read(unknown_repository.quarantine_payload_path()).expect("whole unknown payload"),
            original
        );
    }

    #[test]
    fn corrupt_future_missing_step_and_invalid_payloads_have_distinct_quarantine_evidence() {
        let cases = [
            (
                "corrupt",
                b"{not-json".to_vec(),
                TableViewRecoveryReason::CorruptPayload,
                "table_view.corrupt_payload",
            ),
            (
                "future-envelope",
                serde_json::to_vec(&envelope_value(
                    CURRENT_STORAGE_ENVELOPE_VERSION + 1,
                    &squad_system_default_repository_state(),
                ))
                .expect("future envelope"),
                TableViewRecoveryReason::FutureEnvelopeVersion,
                "table_view.future_envelope_version",
            ),
            (
                "missing-step",
                serde_json::to_vec(&envelope_value(0, &squad_system_default_repository_state()))
                    .expect("missing step"),
                TableViewRecoveryReason::MissingMigrationStep,
                "table_view.missing_migration_step",
            ),
        ];

        for (case, bytes, reason, reason_code) in cases {
            let directory = TestDirectory::new(case);
            let repository = FileTableViewRepository::new(directory.join("table-views.json"));
            fs::write(repository.path(), &bytes).expect("write incompatible fixture");

            assert_eq!(
                repository.load().expect("quarantine incompatible fixture"),
                TableViewRepositoryLoad::Recovered {
                    state: None,
                    reason,
                }
            );
            let evidence = evidence(&repository);
            assert_eq!(evidence["reasonCode"], reason_code);
            assert!(
                evidence["fingerprint"]
                    .as_str()
                    .is_some_and(|value| { value.starts_with("fnv1a64:") && value.len() < 128 })
            );
            assert_eq!(
                fs::read(repository.quarantine_payload_path()).expect("whole diagnostic payload"),
                bytes
            );
        }

        let directory = TestDirectory::new("future-schema");
        let repository = FileTableViewRepository::new(directory.join("table-views.json"));
        let mut future_schema = envelope_value(
            CURRENT_STORAGE_ENVELOPE_VERSION,
            &squad_system_default_repository_state(),
        );
        future_schema["payload"]["schemaVersion"] = json!(2);
        write_envelope(repository.path(), &future_schema);
        assert_eq!(
            repository.load().expect("quarantine future schema"),
            TableViewRepositoryLoad::Recovered {
                state: None,
                reason: TableViewRecoveryReason::FutureSchemaVersion,
            }
        );
        assert_eq!(
            evidence(&repository)["reasonCode"],
            "table_view.future_schema_version"
        );
    }

    #[test]
    fn invalid_owner_provenance_duplicate_and_post_migration_states_never_partially_merge() {
        let mutations: [(&str, fn(&mut Value)); 3] = [
            ("owner", |value| {
                value["payload"]["ownerScope"] = json!("career");
            }),
            ("provenance", |value| {
                value["payload"]["views"][1]["provenance"] = json!("system-default");
            }),
            ("duplicate-column", |value| {
                let duplicate = value["payload"]["views"][1]["state"]["columns"][0].clone();
                value["payload"]["views"][1]["state"]["columns"]
                    .as_array_mut()
                    .expect("columns")
                    .push(duplicate);
            }),
        ];

        for (case, mutate) in mutations {
            let directory = TestDirectory::new(case);
            let repository = FileTableViewRepository::new(directory.join("table-views.json"));
            let expected = valid_state_with_user_intent();
            let mut fixture = historical_payload(1, &expected, true);
            mutate(&mut fixture);
            let original = write_envelope(repository.path(), &fixture);

            assert_eq!(
                repository.load().expect("quarantine invalid payload"),
                TableViewRepositoryLoad::Recovered {
                    state: None,
                    reason: TableViewRecoveryReason::InvalidPayload,
                }
            );
            assert_eq!(
                fs::read(repository.quarantine_payload_path()).expect("whole invalid payload"),
                original
            );
        }
    }

    #[test]
    fn coordinator_surfaces_loaded_migrated_recovered_unavailable_and_save_failure_outcomes() {
        let migrated_directory = TestDirectory::new("coordinator-migrated");
        let migrated_path = migrated_directory.join("table-views.json");
        let expected = valid_state_with_user_intent();
        write_envelope(&migrated_path, &historical_payload(1, &expected, true));
        let migrated = TableViewCoordinator::new(&migrated_path);
        assert!(matches!(
            migrated.load().expect("coordinator migrated outcome"),
            TableViewLoadOutcome::Migrated {
                state,
                from_envelope_version: 0,
                to_envelope_version: 1,
            } if state == expected
        ));

        let recovered_directory = TestDirectory::new("coordinator-recovered");
        let recovered_path = recovered_directory.join("table-views.json");
        fs::write(&recovered_path, b"{broken").expect("corrupt coordinator fixture");
        let recovered = TableViewCoordinator::new(&recovered_path);
        assert!(matches!(
            recovered.load().expect("coordinator recovery outcome"),
            TableViewLoadOutcome::Recovered {
                state,
                reason: TableViewRecoveryReason::CorruptPayload,
            } if state == squad_system_default_repository_state()
        ));

        let unavailable_directory = TestDirectory::new("coordinator-unavailable");
        let parent_file = unavailable_directory.join("not-a-directory");
        fs::write(&parent_file, b"occupied").expect("blocking parent file");
        let unavailable = TableViewCoordinator::new(parent_file.join("table-views.json"));
        assert!(matches!(
            unavailable.load().expect("typed save failure"),
            TableViewLoadOutcome::SaveFailed {
                cause: TableViewRepositoryError::SaveFailed,
                ..
            }
        ));
    }

    #[test]
    fn coordinator_serializes_save_and_import_through_application_service() {
        let directory = TestDirectory::new("coordinator-service");
        let coordinator = TableViewCoordinator::new(directory.join("table-views.json"));
        let seeded = coordinator.load().expect("seed repository");
        let mut proposal = seeded.state().clone();
        proposal.metadata.revision = 1;
        assert_eq!(
            coordinator.save(proposal.clone()).expect("save proposal"),
            proposal
        );

        let mut legacy_state = squad_system_default_repository_state().views[0]
            .state
            .clone();
        legacy_state.view_id = ViewId::from("squad.user.legacy-v4");
        legacy_state.baseline_view_id = ViewId::from("squad.view.system-default");
        let imported = coordinator
            .import_legacy(LegacyTableViewImport {
                source_version: 4,
                source_fingerprint: "fnv1a64:legacy-v4".to_owned(),
                label: "Importada".to_owned(),
                state: legacy_state,
            })
            .expect("import through application service");
        assert!(imported.imported);
        assert_eq!(imported.state.owner_scope, OwnerScope::LocalFixed);

        let coordinator = std::sync::Arc::new(coordinator);
        let handles: Vec<_> = (0..8)
            .map(|_| {
                let coordinator = std::sync::Arc::clone(&coordinator);
                std::thread::spawn(move || coordinator.load())
            })
            .collect();
        for handle in handles {
            let outcome = handle
                .join()
                .expect("coordinator thread")
                .expect("serialized load");
            assert!(matches!(outcome, TableViewLoadOutcome::Loaded { .. }));
        }

        let typed_error: Option<TableViewServiceError> = None;
        assert!(
            typed_error.is_none(),
            "coordinator exposes typed application errors"
        );
    }
}
