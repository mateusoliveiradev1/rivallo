use std::collections::HashSet;

use serde::{Deserialize, Serialize};

const STARTING_XI_SIZE: usize = 11;

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Position {
    Gk,
    Rb,
    Cb,
    Lb,
    Dm,
    Cm,
    Am,
    Rw,
    Lw,
    St,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum Formation {
    #[serde(rename = "4-3-3")]
    FourThreeThree,
    #[serde(rename = "4-2-3-1")]
    FourTwoThreeOne,
    #[serde(rename = "4-4-2")]
    FourFourTwo,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TacticalApproach {
    Balanced,
    FrontFoot,
    Compact,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Player {
    pub id: String,
    pub name: String,
    pub short_name: String,
    pub position: Position,
    pub age: u8,
    pub rating: u8,
    pub condition: u8,
    pub selected: bool,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Club {
    pub id: String,
    pub name: String,
    pub short_name: String,
    pub city: String,
    pub primary_color: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LineupSelection {
    pub player_ids: Vec<String>,
    pub formation: Formation,
    pub approach: TacticalApproach,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchEvent {
    pub minute: u8,
    pub kind: String,
    pub text: String,
    pub for_user_club: bool,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchResult {
    pub round: u16,
    pub home_club: String,
    pub away_club: String,
    pub home_goals: u8,
    pub away_goals: u8,
    pub possession: u8,
    pub shots: u8,
    pub shots_against: u8,
    pub events: Vec<MatchEvent>,
}

#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SeasonRecord {
    pub played: u16,
    pub wins: u16,
    pub draws: u16,
    pub losses: u16,
    pub goals_for: u16,
    pub goals_against: u16,
    pub points: u16,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchdayState {
    pub club: Club,
    pub opponent: Club,
    pub round: u16,
    pub players: Vec<Player>,
    pub formation: Formation,
    pub approach: TacticalApproach,
    pub record: SeasonRecord,
    pub last_result: Option<MatchResult>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MatchdayError {
    InvalidLineup(String),
}

impl std::fmt::Display for MatchdayError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidLineup(message) => formatter.write_str(message),
        }
    }
}

impl std::error::Error for MatchdayError {}

impl Default for MatchdayState {
    fn default() -> Self {
        let starters = HashSet::from([
            "rv-01", "rv-02", "rv-03", "rv-04", "rv-05", "rv-06", "rv-07", "rv-08", "rv-09",
            "rv-10", "rv-11",
        ]);
        let player = |id: &str,
                      name: &str,
                      short_name: &str,
                      position: Position,
                      age: u8,
                      rating: u8,
                      condition: u8| Player {
            id: id.to_owned(),
            name: name.to_owned(),
            short_name: short_name.to_owned(),
            position,
            age,
            rating,
            condition,
            selected: starters.contains(id),
        };

        Self {
            club: Club {
                id: "aurora-fc".to_owned(),
                name: "Aurora Futebol Clube".to_owned(),
                short_name: "AUR".to_owned(),
                city: "Porto Claro".to_owned(),
                primary_color: "#35c88a".to_owned(),
            },
            opponent: Club {
                id: "ferroviario-do-vale".to_owned(),
                name: "Ferroviário do Vale".to_owned(),
                short_name: "FDV".to_owned(),
                city: "Vale do Norte".to_owned(),
                primary_color: "#d18a42".to_owned(),
            },
            round: 1,
            players: vec![
                player(
                    "rv-01",
                    "Caio Brandão",
                    "C. Brandão",
                    Position::Gk,
                    27,
                    76,
                    96,
                ),
                player("rv-02", "Davi Moura", "D. Moura", Position::Rb, 24, 73, 92),
                player("rv-03", "Iago Serpa", "I. Serpa", Position::Cb, 29, 78, 89),
                player("rv-04", "Breno Vidal", "B. Vidal", Position::Cb, 25, 75, 94),
                player(
                    "rv-05",
                    "Nilo Azevedo",
                    "N. Azevedo",
                    Position::Lb,
                    22,
                    74,
                    97,
                ),
                player("rv-06", "Tomás Paiva", "T. Paiva", Position::Dm, 28, 79, 91),
                player(
                    "rv-07",
                    "Luan Seixas",
                    "L. Seixas",
                    Position::Cm,
                    23,
                    77,
                    95,
                ),
                player(
                    "rv-08",
                    "Ravi Monteiro",
                    "R. Monteiro",
                    Position::Cm,
                    26,
                    76,
                    90,
                ),
                player(
                    "rv-09",
                    "Enzo Falcão",
                    "E. Falcão",
                    Position::Rw,
                    21,
                    78,
                    98,
                ),
                player(
                    "rv-10",
                    "Murilo Braga",
                    "M. Braga",
                    Position::St,
                    27,
                    81,
                    93,
                ),
                player("rv-11", "Noah Teles", "N. Teles", Position::Lw, 24, 77, 96),
                player("rv-12", "Ícaro Reis", "Í. Reis", Position::Gk, 20, 68, 100),
                player("rv-13", "Otávio Luz", "O. Luz", Position::Cb, 31, 72, 87),
                player(
                    "rv-14",
                    "Pietro Nunes",
                    "P. Nunes",
                    Position::Cm,
                    19,
                    71,
                    100,
                ),
                player("rv-15", "Gael Ramos", "G. Ramos", Position::Am, 22, 74, 97),
                player(
                    "rv-16",
                    "Theo Barros",
                    "T. Barros",
                    Position::Rw,
                    25,
                    73,
                    94,
                ),
                player("rv-17", "Samuel Lins", "S. Lins", Position::St, 30, 75, 86),
                player(
                    "rv-18",
                    "Vitor Amaral",
                    "V. Amaral",
                    Position::Lb,
                    21,
                    70,
                    99,
                ),
            ],
            formation: Formation::FourThreeThree,
            approach: TacticalApproach::Balanced,
            record: SeasonRecord::default(),
            last_result: None,
        }
    }
}

impl MatchdayState {
    pub fn selection(&self) -> LineupSelection {
        LineupSelection {
            player_ids: self
                .players
                .iter()
                .filter(|player| player.selected)
                .map(|player| player.id.clone())
                .collect(),
            formation: self.formation,
            approach: self.approach,
        }
    }

    pub fn apply_selection(&mut self, selection: LineupSelection) -> Result<(), MatchdayError> {
        if selection.player_ids.len() != STARTING_XI_SIZE {
            return Err(MatchdayError::InvalidLineup(
                "Selecione exatamente 11 titulares.".to_owned(),
            ));
        }

        let selected: HashSet<_> = selection.player_ids.iter().collect();
        if selected.len() != STARTING_XI_SIZE
            || selection
                .player_ids
                .iter()
                .any(|id| !self.players.iter().any(|player| &player.id == id))
        {
            return Err(MatchdayError::InvalidLineup(
                "A escalação contém jogadores inválidos ou repetidos.".to_owned(),
            ));
        }

        let goalkeepers = self
            .players
            .iter()
            .filter(|player| selected.contains(&player.id) && player.position == Position::Gk)
            .count();
        if goalkeepers != 1 {
            return Err(MatchdayError::InvalidLineup(
                "A escalação precisa de exatamente um goleiro.".to_owned(),
            ));
        }

        for player in &mut self.players {
            player.selected = selected.contains(&player.id);
        }
        self.formation = selection.formation;
        self.approach = selection.approach;
        Ok(())
    }

    pub fn play_next_match(&mut self) -> Result<MatchResult, MatchdayError> {
        let selection = self.selection();
        self.apply_selection(selection)?;

        let selected: Vec<_> = self
            .players
            .iter()
            .filter(|player| player.selected)
            .collect();
        let rating_total: u16 = selected.iter().map(|player| u16::from(player.rating)).sum();
        let condition_total: u16 = selected
            .iter()
            .map(|player| u16::from(player.condition))
            .sum();
        let base_strength = (rating_total + condition_total / 10) / STARTING_XI_SIZE as u16;
        let approach_bias = match self.approach {
            TacticalApproach::Balanced => 1,
            TacticalApproach::FrontFoot => 3,
            TacticalApproach::Compact => 0,
        };
        let formation_bias = match self.formation {
            Formation::FourThreeThree => 2,
            Formation::FourTwoThreeOne => 1,
            Formation::FourFourTwo => 0,
        };
        let seed = selected
            .iter()
            .flat_map(|player| player.id.bytes())
            .fold(u64::from(self.round) * 97, |accumulator, byte| {
                accumulator.wrapping_mul(31).wrapping_add(u64::from(byte))
            });
        let attacking_roll = ((seed >> 3) % 3) as u8;
        let defending_roll = ((seed >> 9) % 3) as u8;
        let strength_bonus = u8::from(base_strength + approach_bias + formation_bias >= 86);
        let home_goals = (attacking_roll + strength_bonus).min(4);
        let away_goals = (defending_roll + u8::from(base_strength < 84)).min(3);
        let possession = match self.approach {
            TacticalApproach::Balanced => 52,
            TacticalApproach::FrontFoot => 58,
            TacticalApproach::Compact => 46,
        };
        let scorers: Vec<_> = selected
            .iter()
            .copied()
            .filter(|player| {
                matches!(
                    player.position,
                    Position::St | Position::Rw | Position::Lw | Position::Am
                )
            })
            .collect();
        let mut events = Vec::new();
        for goal in 0..home_goals {
            let scorer = scorers
                .get(usize::from(goal) % scorers.len().max(1))
                .copied()
                .unwrap_or(selected[0]);
            events.push(MatchEvent {
                minute: 14 + goal * 19,
                kind: "goal".to_owned(),
                text: format!("Gol do Aurora — {} concluiu a jogada.", scorer.short_name),
                for_user_club: true,
            });
        }
        for goal in 0..away_goals {
            events.push(MatchEvent {
                minute: 31 + goal * 23,
                kind: "goal".to_owned(),
                text: "Gol do Ferroviário do Vale em transição rápida.".to_owned(),
                for_user_club: false,
            });
        }
        events.sort_by_key(|event| event.minute);
        events.push(MatchEvent {
            minute: 90,
            kind: "fullTime".to_owned(),
            text: "Fim de jogo.".to_owned(),
            for_user_club: home_goals >= away_goals,
        });

        let result = MatchResult {
            round: self.round,
            home_club: self.club.name.clone(),
            away_club: self.opponent.name.clone(),
            home_goals,
            away_goals,
            possession,
            shots: 7 + home_goals * 2 + attacking_roll,
            shots_against: 6 + away_goals * 2 + defending_roll,
            events,
        };
        self.record.played += 1;
        self.record.goals_for += u16::from(home_goals);
        self.record.goals_against += u16::from(away_goals);
        match home_goals.cmp(&away_goals) {
            std::cmp::Ordering::Greater => {
                self.record.wins += 1;
                self.record.points += 3;
            }
            std::cmp::Ordering::Equal => {
                self.record.draws += 1;
                self.record.points += 1;
            }
            std::cmp::Ordering::Less => self.record.losses += 1,
        }
        self.round += 1;
        self.last_result = Some(result.clone());
        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_matchday_has_a_valid_eighteen_player_squad_and_xi() {
        let state = MatchdayState::default();
        assert_eq!(state.players.len(), 18);
        assert_eq!(state.selection().player_ids.len(), 11);
        assert_eq!(
            state
                .players
                .iter()
                .filter(|player| player.selected && player.position == Position::Gk)
                .count(),
            1
        );
    }

    #[test]
    fn rejects_an_incomplete_lineup() {
        let mut state = MatchdayState::default();
        let mut selection = state.selection();
        selection.player_ids.pop();
        assert!(matches!(
            state.apply_selection(selection),
            Err(MatchdayError::InvalidLineup(_))
        ));
    }

    #[test]
    fn simulation_is_deterministic_and_advances_the_record() {
        let mut first = MatchdayState::default();
        let mut second = MatchdayState::default();
        let first_result = first.play_next_match().expect("valid default lineup");
        let second_result = second.play_next_match().expect("valid default lineup");
        assert_eq!(first_result, second_result);
        assert_eq!(first.round, 2);
        assert_eq!(first.record.played, 1);
        assert_eq!(first.last_result, Some(first_result));
    }
}
