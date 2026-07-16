use rivallo_domain::{
    LineupSelection, MatchResult, MatchdayError, MatchdayState, TacticalPlanProposal,
    TacticalPlanUpdate,
};

pub trait MatchdayRepository {
    fn load(&self) -> Result<Option<MatchdayState>, String>;
    fn save(&self, state: &MatchdayState) -> Result<(), String>;
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MatchdayServiceError {
    InvalidLineup(String),
    InvalidTacticalPlan(String),
    TacticalPlanConflict {
        expected_revision: u64,
        actual_revision: u64,
    },
    Persistence(String),
}

impl std::fmt::Display for MatchdayServiceError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidLineup(message)
            | Self::InvalidTacticalPlan(message)
            | Self::Persistence(message) => formatter.write_str(message),
            Self::TacticalPlanConflict {
                expected_revision,
                actual_revision,
            } => write!(
                formatter,
                "tactical_plan_conflict:{expected_revision}:{actual_revision}"
            ),
        }
    }
}

impl std::error::Error for MatchdayServiceError {}

impl From<MatchdayError> for MatchdayServiceError {
    fn from(error: MatchdayError) -> Self {
        match error {
            MatchdayError::InvalidLineup(message) => Self::InvalidLineup(message),
            MatchdayError::InvalidTacticalPlan(message) => Self::InvalidTacticalPlan(message),
            MatchdayError::TacticalPlanConflict {
                expected_revision,
                actual_revision,
            } => Self::TacticalPlanConflict {
                expected_revision,
                actual_revision,
            },
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
                let changed_profiles = state.backfill_player_profiles();
                let changed_tactics = state.backfill_tactical_plan()?;
                if changed_profiles || changed_tactics {
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

    pub fn update_tactical_plan(
        &self,
        proposal: TacticalPlanProposal,
    ) -> Result<TacticalPlanUpdate, MatchdayServiceError> {
        let mut state = self.state()?;
        let event = state.apply_tactical_plan(proposal)?;
        self.repository
            .save(&state)
            .map_err(MatchdayServiceError::Persistence)?;
        Ok(TacticalPlanUpdate { state, event })
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

    fn proposal_from(state: &MatchdayState) -> TacticalPlanProposal {
        let plan = state.tactical_plan.clone().expect("tactical plan");
        TacticalPlanProposal {
            expected_revision: plan.revision,
            plan_id: plan.plan_id,
            name: plan.name,
            source_preset_id: plan.source_preset_id,
            formation: plan.formation,
            placements: plan.placements,
            bench: plan.bench,
            custom_formation: plan.custom_formation,
            approach: state.approach,
        }
    }

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

    #[test]
    fn saves_the_complete_tactical_plan_and_rejects_a_stale_retry() {
        let service = MatchdayService::new(MemoryRepository::default());
        let state = service.state().expect("initial state");
        let mut proposal = proposal_from(&state);
        proposal.placements[5].normalized_x = 0.54;
        let update = service
            .update_tactical_plan(proposal.clone())
            .expect("save tactical plan");
        assert_eq!(
            update
                .state
                .tactical_plan
                .as_ref()
                .expect("saved tactical plan")
                .revision,
            1
        );
        assert!(matches!(
            service.update_tactical_plan(proposal),
            Err(MatchdayServiceError::TacticalPlanConflict {
                expected_revision: 0,
                actual_revision: 1,
            })
        ));
        assert_eq!(service.state().expect("state after conflict"), update.state);
    }

    #[test]
    fn recovers_one_invalid_tactical_record_without_discarding_the_career() {
        let mut legacy = MatchdayState::default();
        legacy
            .tactical_plan
            .as_mut()
            .expect("tactical plan")
            .placements[0]
            .normalized_x = 0.7;
        legacy.round = 12;
        let service = MatchdayService::new(MemoryRepository {
            state: RefCell::new(Some(legacy)),
        });

        let recovered = service.state().expect("recover tactical record");
        assert_eq!(recovered.round, 12);
        assert_eq!(
            recovered
                .tactical_plan
                .as_ref()
                .expect("recovered plan")
                .placements[0]
                .normalized_x,
            0.09
        );
        assert_eq!(service.state().expect("persisted recovery"), recovered);
    }
}
