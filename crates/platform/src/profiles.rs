use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};
use std::time::{SystemTime, UNIX_EPOCH};

use rivallo_application::{
    ClubProfileProjection, CoachProfileProjection, GlobalProfileSearchResult, MatchdayState,
    NationProfileProjection, PlayerProfileProjection, ProfileRepository, ProfileService,
    ProfileWorld,
};

pub struct FileProfileRepository {
    path: PathBuf,
}

impl FileProfileRepository {
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

    fn read(path: &Path) -> Result<ProfileWorld, String> {
        let bytes = fs::read(path)
            .map_err(|error| format!("Não foi possível ler os perfis locais: {error}"))?;
        let world: ProfileWorld = serde_json::from_slice(&bytes)
            .map_err(|error| format!("Os perfis locais contêm dados inválidos: {error}"))?;
        world.validate()?;
        Ok(world)
    }

    fn promote_recovery(&self, source: &Path) -> Result<ProfileWorld, String> {
        let recovered = Self::read(source)?;
        if self.path.exists() && !self.quarantine_path().exists() {
            let _ = fs::rename(&self.path, self.quarantine_path());
        }
        fs::copy(source, &self.path)
            .map_err(|error| format!("Não foi possível recuperar os perfis locais: {error}"))?;
        Ok(recovered)
    }
}

impl ProfileRepository for FileProfileRepository {
    fn load(&self) -> Result<Option<ProfileWorld>, String> {
        if self.path.exists() {
            match Self::read(&self.path) {
                Ok(world) => return Ok(Some(world)),
                Err(active_error) => {
                    for candidate in [self.temporary_path(), self.backup_path()] {
                        if candidate.exists() && Self::read(&candidate).is_ok() {
                            return self.promote_recovery(&candidate).map(Some);
                        }
                    }
                    return Err(active_error);
                }
            }
        }
        for candidate in [self.temporary_path(), self.backup_path()] {
            if candidate.exists() && Self::read(&candidate).is_ok() {
                return self.promote_recovery(&candidate).map(Some);
            }
        }
        Ok(None)
    }

    fn save(&self, world: &ProfileWorld) -> Result<(), String> {
        world.validate()?;
        let parent = self
            .path
            .parent()
            .ok_or_else(|| "O caminho dos perfis locais é inválido.".to_owned())?;
        fs::create_dir_all(parent)
            .map_err(|error| format!("Não foi possível preparar a pasta de perfis: {error}"))?;
        let bytes = serde_json::to_vec_pretty(world)
            .map_err(|error| format!("Não foi possível serializar os perfis: {error}"))?;
        let temporary = self.temporary_path();
        let backup = self.backup_path();
        fs::write(&temporary, bytes)
            .map_err(|error| format!("Não foi possível salvar os perfis temporários: {error}"))?;
        if self.path.exists() {
            if backup.exists() {
                fs::remove_file(&backup).map_err(|error| {
                    format!("Não foi possível preparar o backup de perfis: {error}")
                })?;
            }
            fs::rename(&self.path, &backup)
                .map_err(|error| format!("Não foi possível proteger os perfis atuais: {error}"))?;
        }
        if let Err(error) = fs::rename(&temporary, &self.path) {
            if backup.exists() && !self.path.exists() {
                let _ = fs::rename(&backup, &self.path);
            }
            return Err(format!(
                "Não foi possível confirmar os perfis locais: {error}"
            ));
        }
        if backup.exists() {
            let _ = fs::remove_file(backup);
        }
        Ok(())
    }
}

pub struct ProfileCoordinator {
    service: Mutex<ProfileService<FileProfileRepository>>,
}

impl ProfileCoordinator {
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self {
            service: Mutex::new(ProfileService::new(FileProfileRepository::new(path))),
        }
    }

    fn service(&self) -> Result<MutexGuard<'_, ProfileService<FileProfileRepository>>, String> {
        self.service
            .lock()
            .map_err(|_| "Os perfis locais estão temporariamente indisponíveis.".to_owned())
    }

    pub fn player_profile(
        &self,
        matchday: &MatchdayState,
        player_id: &str,
        observer_club_id: &str,
        variation_id: Option<&str>,
    ) -> Result<PlayerProfileProjection, String> {
        self.service()?.player_profile(
            matchday,
            player_id,
            observer_club_id,
            variation_id,
            now_ms(),
        )
    }

    pub fn coach_profile(
        &self,
        matchday: &MatchdayState,
        coach_id: &str,
        observer_club_id: &str,
    ) -> Result<CoachProfileProjection, String> {
        self.service()?
            .coach_profile(matchday, coach_id, observer_club_id, now_ms())
    }

    pub fn club_profile(
        &self,
        matchday: &MatchdayState,
        club_id: &str,
        observer_club_id: &str,
    ) -> Result<ClubProfileProjection, String> {
        self.service()?
            .club_profile(matchday, club_id, observer_club_id, now_ms())
    }

    pub fn nation_profile(
        &self,
        matchday: &MatchdayState,
        nation_id: &str,
        observer_club_id: &str,
    ) -> Result<NationProfileProjection, String> {
        self.service()?
            .nation_profile(matchday, nation_id, observer_club_id, now_ms())
    }

    pub fn search(
        &self,
        matchday: &MatchdayState,
        observer_club_id: &str,
        query: &str,
    ) -> Result<Vec<GlobalProfileSearchResult>, String> {
        self.service()?
            .search(matchday, observer_club_id, query, now_ms())
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temporary_path(label: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time after epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("rivallo-profiles-{label}-{nonce}.json"))
    }

    fn cleanup(path: &Path) {
        for candidate in [
            path.to_path_buf(),
            path.with_extension("json.tmp"),
            path.with_extension("json.bak"),
            path.with_extension("quarantine.json"),
        ] {
            let _ = fs::remove_file(candidate);
        }
    }

    #[test]
    fn profile_history_round_trips_atomically() {
        let path = temporary_path("round-trip");
        let coordinator = ProfileCoordinator::new(&path);
        let matchday = MatchdayState::default();
        let first = coordinator
            .player_profile(&matchday, "rv-01", &matchday.club.id, None)
            .expect("profile");
        drop(coordinator);
        let reopened = ProfileCoordinator::new(&path)
            .player_profile(&matchday, "rv-01", &matchday.club.id, None)
            .expect("reopened profile");
        assert_eq!(first.rating_history, reopened.rating_history);
        assert_eq!(first.revision, reopened.revision);
        cleanup(&path);
    }

    #[test]
    fn corrupted_active_file_recovers_from_backup_with_quarantine() {
        let path = temporary_path("recovery");
        let repository = FileProfileRepository::new(&path);
        let world = ProfileWorld::seed(&MatchdayState::default(), now_ms());
        fs::write(&path, b"{invalid").expect("corrupt active");
        fs::write(
            repository.backup_path(),
            serde_json::to_vec_pretty(&world).expect("world json"),
        )
        .expect("backup");
        assert_eq!(repository.load().expect("recovery"), Some(world));
        assert!(repository.quarantine_path().exists());
        cleanup(&path);
    }
}
