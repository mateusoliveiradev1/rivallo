use rivallo_domain::{
    ClubProfileProjection, CoachProfileProjection, GlobalProfileSearchResult, MatchdayState,
    NationProfileProjection, PlayerProfileProjection, ProfileWorld, project_club_profile,
    project_coach_profile, project_nation_profile, project_player_profile,
};

pub trait ProfileRepository {
    fn load(&self) -> Result<Option<ProfileWorld>, String>;
    fn save(&self, world: &ProfileWorld) -> Result<(), String>;
}

pub struct ProfileService<R> {
    repository: R,
    initial_world: Option<ProfileWorld>,
}

impl<R: ProfileRepository> ProfileService<R> {
    pub fn new(repository: R) -> Self {
        Self {
            repository,
            initial_world: None,
        }
    }

    pub fn with_initial_world(repository: R, initial_world: ProfileWorld) -> Self {
        Self {
            repository,
            initial_world: Some(initial_world),
        }
    }

    fn initial_world(&self, matchday: &MatchdayState, now: u64) -> ProfileWorld {
        let mut world = self
            .initial_world
            .clone()
            .unwrap_or_else(|| ProfileWorld::seed(matchday, now));
        world.reconcile_matchday(matchday);
        world
    }

    fn world(&self, matchday: &MatchdayState, now: u64) -> Result<ProfileWorld, String> {
        match self.repository.load()? {
            Some(world) => {
                let mut world = world.migrate()?;
                let changed = world.reconcile_matchday(matchday);
                world.validate()?;
                if changed {
                    self.repository.save(&world)?;
                }
                Ok(world)
            }
            None => {
                let world = self.initial_world(matchday, now);
                world.validate()?;
                self.repository.save(&world)?;
                Ok(world)
            }
        }
    }

    fn read_only_world(&self, matchday: &MatchdayState, now: u64) -> Result<ProfileWorld, String> {
        let mut world = self
            .repository
            .load()?
            .unwrap_or_else(|| self.initial_world(matchday, now));
        world = world.migrate()?;
        world.reconcile_matchday(matchday);
        world.validate()?;
        Ok(world)
    }

    pub fn snapshot(&self, matchday: &MatchdayState, now: u64) -> Result<ProfileWorld, String> {
        self.world(matchday, now)
    }

    pub fn replace_world(&self, world: &ProfileWorld) -> Result<(), String> {
        world.validate()?;
        self.repository.save(world)
    }

    pub fn player_profile(
        &self,
        matchday: &MatchdayState,
        player_id: &str,
        observer_club_id: &str,
        variation_id: Option<&str>,
        now: u64,
    ) -> Result<PlayerProfileProjection, String> {
        let mut world = self.world(matchday, now)?;
        let revision = world.revision;
        let projection = project_player_profile(
            &mut world,
            matchday,
            player_id,
            observer_club_id,
            variation_id,
            now,
        )?;
        if world.revision != revision {
            self.repository.save(&world)?;
        }
        Ok(projection)
    }

    pub fn preview_player_profile(
        &self,
        matchday: &MatchdayState,
        player_id: &str,
        observer_club_id: &str,
        variation_id: Option<&str>,
        now: u64,
    ) -> Result<PlayerProfileProjection, String> {
        let mut world = self.read_only_world(matchday, now)?;
        project_player_profile(
            &mut world,
            matchday,
            player_id,
            observer_club_id,
            variation_id,
            now,
        )
    }

    pub fn coach_profile(
        &self,
        matchday: &MatchdayState,
        coach_id: &str,
        observer_club_id: &str,
        now: u64,
    ) -> Result<CoachProfileProjection, String> {
        let mut world = self.world(matchday, now)?;
        let revision = world.revision;
        let projection = project_coach_profile(&mut world, coach_id, observer_club_id, now)?;
        if world.revision != revision {
            self.repository.save(&world)?;
        }
        Ok(projection)
    }

    pub fn club_profile(
        &self,
        matchday: &MatchdayState,
        club_id: &str,
        observer_club_id: &str,
        now: u64,
    ) -> Result<ClubProfileProjection, String> {
        let world = self.world(matchday, now)?;
        project_club_profile(&world, matchday, club_id, observer_club_id, now)
    }

    pub fn nation_profile(
        &self,
        matchday: &MatchdayState,
        nation_id: &str,
        observer_club_id: &str,
        now: u64,
    ) -> Result<NationProfileProjection, String> {
        let world = self.world(matchday, now)?;
        project_nation_profile(&world, matchday, nation_id, observer_club_id, now)
    }

    pub fn search(
        &self,
        matchday: &MatchdayState,
        observer_club_id: &str,
        query: &str,
        now: u64,
    ) -> Result<Vec<GlobalProfileSearchResult>, String> {
        Ok(self
            .world(matchday, now)?
            .search(matchday, observer_club_id, query))
    }
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use super::*;

    #[derive(Default)]
    struct MemoryProfileRepository {
        world: RefCell<Option<ProfileWorld>>,
    }

    impl ProfileRepository for MemoryProfileRepository {
        fn load(&self) -> Result<Option<ProfileWorld>, String> {
            Ok(self.world.borrow().clone())
        }

        fn save(&self, world: &ProfileWorld) -> Result<(), String> {
            self.world.replace(Some(world.clone()));
            Ok(())
        }
    }

    #[test]
    fn initializes_persists_and_reuses_profile_snapshots() {
        let matchday = MatchdayState::default();
        let service = ProfileService::new(MemoryProfileRepository::default());
        let first = service
            .player_profile(
                &matchday,
                "rv-01",
                &matchday.club.id,
                None,
                1_784_102_400_000,
            )
            .expect("first profile");
        let second = service
            .player_profile(
                &matchday,
                "rv-01",
                &matchday.club.id,
                None,
                1_784_102_400_001,
            )
            .expect("reopened profile");
        assert_eq!(first.rating_history.len(), 1);
        assert_eq!(second.rating_history.len(), 1);
        assert_eq!(first.revision, second.revision);
    }

    #[test]
    fn returns_recoverable_not_found_errors() {
        let matchday = MatchdayState::default();
        let service = ProfileService::new(MemoryProfileRepository::default());
        assert_eq!(
            service
                .player_profile(
                    &matchday,
                    "missing",
                    &matchday.club.id,
                    None,
                    1_784_102_400_000,
                )
                .expect_err("missing player"),
            "Jogador não encontrado."
        );
        assert_eq!(
            service
                .coach_profile(&matchday, "missing", &matchday.club.id, 1_784_102_400_000,)
                .expect_err("missing coach"),
            "Treinador não encontrado."
        );
    }

    #[test]
    fn previews_player_ratings_without_initializing_or_saving_profile_history() {
        let matchday = MatchdayState::default();
        let service = ProfileService::new(MemoryProfileRepository::default());

        let preview = service
            .preview_player_profile(
                &matchday,
                "rv-01",
                &matchday.club.id,
                None,
                1_784_102_400_000,
            )
            .expect("read-only profile preview");

        assert_eq!(preview.identity.entity_id, "rv-01");
        assert!(service.repository.world.borrow().is_none());
    }
}
