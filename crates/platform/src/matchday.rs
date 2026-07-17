use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};

use rivallo_application::{
    LineupSelection, MatchdayRepository, MatchdayService, MatchdayState, TacticalLibraryCommand,
    TacticalPlanProposal, TacticalPlanUpdate,
};

pub struct FileMatchdayRepository {
    path: PathBuf,
}

impl FileMatchdayRepository {
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    fn temporary_path(&self) -> PathBuf {
        self.path.with_extension("json.tmp")
    }

    fn backup_path(&self) -> PathBuf {
        self.path.with_extension("json.bak")
    }

    fn quarantine_path(&self) -> PathBuf {
        self.path.with_extension("quarantine.json")
    }

    fn read_state(path: &Path) -> Result<MatchdayState, String> {
        let bytes = fs::read(path)
            .map_err(|error| format!("Não foi possível ler a carreira local: {error}"))?;
        serde_json::from_slice(&bytes)
            .map_err(|error| format!("A carreira local contém dados inválidos: {error}"))
    }

    fn promote_recovery(&self, source: &Path) -> Result<MatchdayState, String> {
        let recovered = Self::read_state(source)?;
        if self.path.exists() {
            let quarantine = self.quarantine_path();
            if !quarantine.exists() {
                let _ = fs::rename(&self.path, quarantine);
            }
        }
        fs::copy(source, &self.path)
            .map_err(|error| format!("Não foi possível recuperar a carreira local: {error}"))?;
        Ok(recovered)
    }
}

impl MatchdayRepository for FileMatchdayRepository {
    fn load(&self) -> Result<Option<MatchdayState>, String> {
        if self.path.exists() {
            match Self::read_state(&self.path) {
                Ok(state) => return Ok(Some(state)),
                Err(active_error) => {
                    for candidate in [self.temporary_path(), self.backup_path()] {
                        if candidate.exists() && Self::read_state(&candidate).is_ok() {
                            return self.promote_recovery(&candidate).map(Some);
                        }
                    }
                    return Err(active_error);
                }
            }
        }

        for candidate in [self.temporary_path(), self.backup_path()] {
            if candidate.exists() && Self::read_state(&candidate).is_ok() {
                return self.promote_recovery(&candidate).map(Some);
            }
        }
        Ok(None)
    }

    fn save(&self, state: &MatchdayState) -> Result<(), String> {
        let parent = self
            .path
            .parent()
            .ok_or_else(|| "O caminho da carreira local é inválido.".to_owned())?;
        fs::create_dir_all(parent)
            .map_err(|error| format!("Não foi possível preparar a pasta da carreira: {error}"))?;
        let bytes = serde_json::to_vec_pretty(state)
            .map_err(|error| format!("Não foi possível serializar a carreira: {error}"))?;
        let temporary_path = self.temporary_path();
        let backup_path = self.backup_path();
        fs::write(&temporary_path, bytes)
            .map_err(|error| format!("Não foi possível salvar a carreira temporária: {error}"))?;
        if self.path.exists() {
            if backup_path.exists() {
                fs::remove_file(&backup_path).map_err(|error| {
                    format!("Não foi possível preparar o backup da carreira: {error}")
                })?;
            }
            fs::rename(&self.path, &backup_path)
                .map_err(|error| format!("Não foi possível proteger a carreira atual: {error}"))?;
        }
        if let Err(error) = fs::rename(&temporary_path, &self.path) {
            if backup_path.exists() && !self.path.exists() {
                let _ = fs::rename(&backup_path, &self.path);
            }
            return Err(format!(
                "Não foi possível confirmar a carreira local: {error}"
            ));
        }
        if backup_path.exists() {
            let _ = fs::remove_file(backup_path);
        }
        Ok(())
    }
}

pub struct MatchdayCoordinator {
    service: Mutex<MatchdayService<FileMatchdayRepository>>,
}

impl MatchdayCoordinator {
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self {
            service: Mutex::new(MatchdayService::new(FileMatchdayRepository::new(path))),
        }
    }

    fn service(&self) -> Result<MutexGuard<'_, MatchdayService<FileMatchdayRepository>>, String> {
        self.service
            .lock()
            .map_err(|_| "O estado local da partida está indisponível.".to_owned())
    }

    pub fn state(&self) -> Result<MatchdayState, String> {
        self.service()?.state().map_err(|error| error.to_string())
    }

    pub fn update_lineup(&self, selection: LineupSelection) -> Result<MatchdayState, String> {
        self.service()?
            .update_lineup(selection)
            .map_err(|error| error.to_string())
    }

    pub fn update_tactical_plan(
        &self,
        proposal: TacticalPlanProposal,
    ) -> Result<TacticalPlanUpdate, String> {
        self.service()?
            .update_tactical_plan(proposal)
            .map_err(|error| error.to_string())
    }

    pub fn update_tactical_library(
        &self,
        command: TacticalLibraryCommand,
    ) -> Result<TacticalPlanUpdate, String> {
        self.service()?
            .update_tactical_library(command)
            .map_err(|error| error.to_string())
    }

    pub fn play_next_match(&self) -> Result<MatchdayState, String> {
        self.service()?
            .play_next_match()
            .map_err(|error| error.to_string())
    }
}

#[cfg(test)]
mod tests {
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::*;

    fn temporary_path(label: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time after epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("rivallo-matchday-{label}-{nonce}.json"))
    }

    fn cleanup(repository: &FileMatchdayRepository) {
        for path in [
            repository.path().to_path_buf(),
            repository.temporary_path(),
            repository.backup_path(),
            repository.quarantine_path(),
        ] {
            let _ = fs::remove_file(path);
        }
    }

    #[test]
    fn file_repository_round_trips_matchday_state() {
        let path = temporary_path("round-trip");
        let repository = FileMatchdayRepository::new(&path);
        let state = MatchdayState::default();
        repository.save(&state).expect("save state");
        assert_eq!(repository.load().expect("load state"), Some(state));
        cleanup(&repository);
    }

    #[test]
    fn coordinator_reopens_multiple_independent_variations_from_disk() {
        let path = temporary_path("variation-library-round-trip");
        let coordinator = MatchdayCoordinator::new(&path);
        let initial = coordinator.state().expect("initial career");
        let library = initial.tactical_library.as_ref().expect("tactical library");
        let original = library.variations[0].clone();
        let first_id = original.variation_id.clone();
        let mut first = TacticalPlanProposal {
            expected_revision: original.revision,
            variation_id: first_id.clone(),
            name: "4-3-3 Volante Alto".to_owned(),
            source_preset_id: original.source_preset_id.clone(),
            formation: original.formation,
            placements: original.placements.clone(),
            bench: original.bench.clone(),
            custom_formation: original.custom_formation.clone(),
            approach: initial.approach,
        };
        first.placements[5].normalized_x = 0.58;
        let saved_first = coordinator
            .update_tactical_plan(first)
            .expect("save first variation");
        let first_snapshot = saved_first
            .state
            .tactical_library
            .as_ref()
            .expect("library")
            .variations[0]
            .clone();
        let mut second = TacticalPlanProposal {
            expected_revision: 0,
            variation_id: "tactical-variation.laterais-altos".to_owned(),
            name: "4-3-3 Laterais Altos".to_owned(),
            source_preset_id: first_snapshot.source_preset_id.clone(),
            formation: first_snapshot.formation,
            placements: first_snapshot.placements.clone(),
            bench: first_snapshot.bench.clone(),
            custom_formation: first_snapshot.custom_formation.clone(),
            approach: saved_first.state.approach,
        };
        second.placements[1].normalized_x = 0.43;
        second.placements[4].normalized_x = 0.43;
        coordinator
            .update_tactical_plan(second)
            .expect("save second variation");
        drop(coordinator);

        let reopened = MatchdayCoordinator::new(&path)
            .state()
            .expect("reopen career from disk");
        let library = reopened
            .tactical_library
            .as_ref()
            .expect("reopened library");
        assert_eq!(library.variations.len(), 2);
        let first = library
            .variations
            .iter()
            .find(|variation| variation.variation_id == first_id)
            .expect("first variation");
        let second = library
            .variations
            .iter()
            .find(|variation| variation.variation_id == "tactical-variation.laterais-altos")
            .expect("second variation");
        assert_eq!(first.placements[5].normalized_x, 0.58);
        assert_eq!(second.placements[1].normalized_x, 0.43);
        assert_ne!(
            first.placements[1].normalized_x,
            second.placements[1].normalized_x
        );

        cleanup(&FileMatchdayRepository::new(path));
    }

    #[test]
    fn interrupted_temporary_write_is_recovered_without_losing_the_plan() {
        let repository = FileMatchdayRepository::new(temporary_path("temporary-recovery"));
        let state = MatchdayState::default();
        fs::write(
            repository.temporary_path(),
            serde_json::to_vec_pretty(&state).expect("serialize state"),
        )
        .expect("write interrupted candidate");

        assert_eq!(repository.load().expect("recover candidate"), Some(state));
        assert!(repository.path().exists());
        cleanup(&repository);
    }

    #[test]
    fn corrupt_active_uses_valid_backup_and_keeps_quarantine_evidence() {
        let repository = FileMatchdayRepository::new(temporary_path("backup-recovery"));
        let state = MatchdayState::default();
        fs::write(repository.path(), b"{invalid").expect("write corrupt active");
        fs::write(
            repository.backup_path(),
            serde_json::to_vec_pretty(&state).expect("serialize backup"),
        )
        .expect("write backup");

        assert_eq!(repository.load().expect("recover backup"), Some(state));
        assert!(repository.quarantine_path().exists());
        cleanup(&repository);
    }
}
