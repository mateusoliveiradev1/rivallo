use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};

use rivallo_application::{LineupSelection, MatchdayRepository, MatchdayService, MatchdayState};

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
}

impl MatchdayRepository for FileMatchdayRepository {
    fn load(&self) -> Result<Option<MatchdayState>, String> {
        if !self.path.exists() {
            return Ok(None);
        }
        let bytes = fs::read(&self.path)
            .map_err(|error| format!("Não foi possível ler a carreira local: {error}"))?;
        serde_json::from_slice(&bytes)
            .map(Some)
            .map_err(|error| format!("A carreira local contém dados inválidos: {error}"))
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
        let temporary_path = self.path.with_extension("json.tmp");
        fs::write(&temporary_path, bytes)
            .map_err(|error| format!("Não foi possível salvar a carreira temporária: {error}"))?;
        if self.path.exists() {
            fs::remove_file(&self.path).map_err(|error| {
                format!("Não foi possível substituir a carreira local: {error}")
            })?;
        }
        fs::rename(&temporary_path, &self.path)
            .map_err(|error| format!("Não foi possível confirmar a carreira local: {error}"))?;
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

    #[test]
    fn file_repository_round_trips_matchday_state() {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time after epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("rivallo-matchday-{nonce}.json"));
        let repository = FileMatchdayRepository::new(&path);
        let state = MatchdayState::default();
        repository.save(&state).expect("save state");
        assert_eq!(repository.load().expect("load state"), Some(state));
        let _ = fs::remove_file(path);
    }
}
