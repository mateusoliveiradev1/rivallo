use rivallo_domain::{LineupSelection, MatchResult, MatchdayError, MatchdayState};

pub trait MatchdayRepository {
    fn load(&self) -> Result<Option<MatchdayState>, String>;
    fn save(&self, state: &MatchdayState) -> Result<(), String>;
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MatchdayServiceError {
    InvalidLineup(String),
    Persistence(String),
}

impl std::fmt::Display for MatchdayServiceError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidLineup(message) | Self::Persistence(message) => {
                formatter.write_str(message)
            }
        }
    }
}

impl std::error::Error for MatchdayServiceError {}

impl From<MatchdayError> for MatchdayServiceError {
    fn from(error: MatchdayError) -> Self {
        match error {
            MatchdayError::InvalidLineup(message) => Self::InvalidLineup(message),
        }
    }
}

pub struct MatchdayService<R> {
    repository: R,
}

impl<R: MatchdayRepository> MatchdayService<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }

    pub fn state(&self) -> Result<MatchdayState, MatchdayServiceError> {
        match self
            .repository
            .load()
            .map_err(MatchdayServiceError::Persistence)?
        {
            Some(mut state) => {
                if state.backfill_player_profiles() {
                    self.repository
                        .save(&state)
                        .map_err(MatchdayServiceError::Persistence)?;
                }
                Ok(state)
            }
            None => {
                let state = MatchdayState::default();
                self.repository
                    .save(&state)
                    .map_err(MatchdayServiceError::Persistence)?;
                Ok(state)
            }
        }
    }

    pub fn update_lineup(
        &self,
        selection: LineupSelection,
    ) -> Result<MatchdayState, MatchdayServiceError> {
        let mut state = self.state()?;
        state.apply_selection(selection)?;
        self.repository
            .save(&state)
            .map_err(MatchdayServiceError::Persistence)?;
        Ok(state)
    }

    pub fn play_next_match(&self) -> Result<MatchdayState, MatchdayServiceError> {
        let mut state = self.state()?;
        let _: MatchResult = state.play_next_match()?;
        self.repository
            .save(&state)
            .map_err(MatchdayServiceError::Persistence)?;
        Ok(state)
    }
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use super::*;

    #[derive(Default)]
    struct MemoryRepository {
        state: RefCell<Option<MatchdayState>>,
    }

    impl MatchdayRepository for MemoryRepository {
        fn load(&self) -> Result<Option<MatchdayState>, String> {
            Ok(self.state.borrow().clone())
        }

        fn save(&self, state: &MatchdayState) -> Result<(), String> {
            self.state.replace(Some(state.clone()));
            Ok(())
        }
    }

    #[test]
    fn initializes_and_persists_the_first_playable_state() {
        let service = MatchdayService::new(MemoryRepository::default());
        let initial = service.state().expect("initial state");
        let played = service.play_next_match().expect("play match");
        assert_eq!(initial.round, 1);
        assert_eq!(played.round, 2);
        assert_eq!(service.state().expect("reloaded state"), played);
    }

    #[test]
    fn backfills_and_persists_detailed_profiles_for_an_existing_career() {
        let mut legacy = MatchdayState::default();
        legacy.players[0].shirt_number = 0;
        legacy.players[0].nationality.clear();
        legacy.players[0].height_cm = 0;
        legacy.players[0].potential_rating = 0;
        let service = MatchdayService::new(MemoryRepository {
            state: RefCell::new(Some(legacy)),
        });

        let migrated = service.state().expect("migrated state");
        assert_eq!(migrated.players[0].shirt_number, 1);
        assert_eq!(migrated.players[0].nationality, "BRA");
        assert_eq!(migrated.players[0].height_cm, 190);
        assert_eq!(migrated.players[0].potential_rating, 76);
        assert_eq!(service.state().expect("persisted migration"), migrated);
    }
}
