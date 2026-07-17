use std::collections::HashSet;
use std::time::{SystemTime, UNIX_EPOCH};

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

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PreferredFoot {
    Left,
    #[default]
    Right,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SquadRole {
    KeyPlayer,
    FirstTeam,
    #[default]
    Rotation,
    Prospect,
    Backup,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum Formation {
    #[serde(rename = "4-3-3")]
    FourThreeThree,
    #[serde(rename = "4-2-3-1")]
    FourTwoThreeOne,
    #[serde(rename = "4-4-2")]
    FourFourTwo,
    #[serde(rename = "4-4-1-1")]
    FourFourOneOne,
    #[serde(rename = "4-1-4-1")]
    FourOneFourOne,
    #[serde(rename = "4-3-1-2")]
    FourThreeOneTwo,
    #[serde(rename = "4-2-2-2")]
    FourTwoTwoTwo,
    #[serde(rename = "4-3-2-1")]
    FourThreeTwoOne,
    #[serde(rename = "4-1-2-1-2")]
    FourOneTwoOneTwo,
    #[serde(rename = "4-2-4")]
    FourTwoFour,
    #[serde(rename = "3-5-2")]
    ThreeFiveTwo,
    #[serde(rename = "3-4-3")]
    ThreeFourThree,
    #[serde(rename = "3-4-2-1")]
    ThreeFourTwoOne,
    #[serde(rename = "3-1-4-2")]
    ThreeOneFourTwo,
    #[serde(rename = "3-2-4-1")]
    ThreeTwoFourOne,
    #[serde(rename = "3-4-1-2")]
    ThreeFourOneTwo,
    #[serde(rename = "5-3-2")]
    FiveThreeTwo,
    #[serde(rename = "5-2-3")]
    FiveTwoThree,
    #[serde(rename = "5-4-1")]
    FiveFourOne,
    #[serde(rename = "5-2-1-2")]
    FiveTwoOneTwo,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TacticalApproach {
    Balanced,
    FrontFoot,
    Compact,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Player {
    pub id: String,
    pub name: String,
    pub short_name: String,
    #[serde(default)]
    pub shirt_number: u8,
    pub position: Position,
    pub age: u8,
    #[serde(default)]
    pub nationality: String,
    #[serde(default)]
    pub height_cm: u16,
    #[serde(default)]
    pub preferred_foot: PreferredFoot,
    #[serde(default)]
    pub squad_role: SquadRole,
    pub rating: u8,
    #[serde(default)]
    pub potential_rating: u8,
    #[serde(default)]
    pub match_fitness: u8,
    #[serde(default)]
    pub morale: u8,
    pub condition: u8,
    #[serde(default)]
    pub appearances: u16,
    #[serde(default)]
    pub goals: u16,
    #[serde(default)]
    pub assists: u16,
    #[serde(default)]
    pub average_rating: f32,
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

pub const TACTICAL_PLAN_SCHEMA_VERSION: u16 = 3;
pub const TACTICAL_LIBRARY_SCHEMA_VERSION: u16 = 1;
pub const MAX_BENCH_SIZE: usize = 7;

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TacticalSide {
    Left,
    Centre,
    Right,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TacticalLine {
    Goal,
    Defence,
    Midfield,
    Attack,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TacticalZone {
    Goal,
    DefensiveThird,
    MiddleThird,
    FinalThird,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalPlayerPlacement {
    pub player_id: String,
    pub normalized_x: f64,
    pub normalized_y: f64,
    pub position_id: Position,
    pub role_id: Option<String>,
    pub side: TacticalSide,
    pub line: TacticalLine,
    pub zone: TacticalZone,
    pub source_preset_slot_id: Option<String>,
    pub revision: u64,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomFormationIdentity {
    pub id: String,
    pub name: String,
    pub is_custom: bool,
    pub origin: String,
    pub created_at_revision: u64,
    pub updated_at_revision: u64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalPlanSnapshot {
    pub schema_version: u16,
    #[serde(alias = "planId")]
    pub variation_id: String,
    pub name: String,
    pub source_preset_id: Option<String>,
    pub formation: Formation,
    pub placements: Vec<TacticalPlayerPlacement>,
    pub bench: Vec<String>,
    pub custom_formation: CustomFormationIdentity,
    pub revision: u64,
    #[serde(default)]
    pub created_at: u64,
    #[serde(default)]
    pub updated_at: u64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalVariationLibrarySnapshot {
    pub schema_version: u16,
    pub revision: u64,
    pub active_variation_id: String,
    pub primary_variation_id: String,
    pub variations: Vec<TacticalPlanSnapshot>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalPlanProposal {
    pub expected_revision: u64,
    pub variation_id: String,
    pub name: String,
    pub source_preset_id: Option<String>,
    pub formation: Formation,
    pub placements: Vec<TacticalPlayerPlacement>,
    pub bench: Vec<String>,
    pub custom_formation: CustomFormationIdentity,
    pub approach: TacticalApproach,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum TacticalLibraryCommand {
    Activate {
        #[serde(rename = "expectedLibraryRevision")]
        expected_library_revision: u64,
        #[serde(rename = "variationId")]
        variation_id: String,
    },
    SetPrimary {
        #[serde(rename = "expectedLibraryRevision")]
        expected_library_revision: u64,
        #[serde(rename = "variationId")]
        variation_id: String,
    },
    Delete {
        #[serde(rename = "expectedLibraryRevision")]
        expected_library_revision: u64,
        #[serde(rename = "variationId")]
        variation_id: String,
    },
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum TacticalPlanEvent {
    VariationSaved {
        variation_id: String,
        accepted_revision: u64,
    },
    ConflictDetected {
        variation_id: String,
        expected_revision: u64,
        actual_revision: u64,
    },
    VariationActivated {
        variation_id: String,
        accepted_library_revision: u64,
    },
    PrimaryVariationChanged {
        variation_id: String,
        accepted_library_revision: u64,
    },
    VariationDeleted {
        variation_id: String,
        active_variation_id: String,
        accepted_library_revision: u64,
    },
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalPlanUpdate {
    pub state: MatchdayState,
    pub event: TacticalPlanEvent,
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

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchdayState {
    pub club: Club,
    pub opponent: Club,
    pub round: u16,
    pub players: Vec<Player>,
    pub formation: Formation,
    pub approach: TacticalApproach,
    #[serde(default)]
    pub tactical_library: Option<TacticalVariationLibrarySnapshot>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tactical_plan: Option<TacticalPlanSnapshot>,
    #[serde(default)]
    pub last_tactical_event: Option<TacticalPlanEvent>,
    pub record: SeasonRecord,
    pub last_result: Option<MatchResult>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MatchdayError {
    InvalidLineup(String),
    InvalidTacticalPlan(String),
    TacticalPlanConflict {
        expected_revision: u64,
        actual_revision: u64,
    },
    TacticalLibraryConflict {
        expected_revision: u64,
        actual_revision: u64,
    },
}

impl std::fmt::Display for MatchdayError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidLineup(message) | Self::InvalidTacticalPlan(message) => {
                formatter.write_str(message)
            }
            Self::TacticalPlanConflict {
                expected_revision,
                actual_revision,
            } => write!(
                formatter,
                "O plano foi alterado em outra operação (esperada {expected_revision}, atual {actual_revision}). Recarregue antes de salvar."
            ),
            Self::TacticalLibraryConflict {
                expected_revision,
                actual_revision,
            } => write!(
                formatter,
                "A biblioteca tática foi alterada em outra operação (esperada {expected_revision}, atual {actual_revision}). Recarregue antes de continuar."
            ),
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
                      condition: u8| {
            let (
                shirt_number,
                nationality,
                height_cm,
                preferred_foot,
                squad_role,
                potential_rating,
                match_fitness,
                morale,
                appearances,
                goals,
                assists,
                average_rating,
            ) = match id {
                "rv-01" => (
                    1,
                    "BRA",
                    190,
                    PreferredFoot::Right,
                    SquadRole::FirstTeam,
                    76,
                    92,
                    78,
                    16,
                    0,
                    0,
                    7.18,
                ),
                "rv-02" => (
                    22,
                    "BRA",
                    177,
                    PreferredFoot::Right,
                    SquadRole::FirstTeam,
                    76,
                    88,
                    74,
                    14,
                    0,
                    3,
                    6.91,
                ),
                "rv-03" => (
                    3,
                    "BRA",
                    188,
                    PreferredFoot::Right,
                    SquadRole::KeyPlayer,
                    78,
                    91,
                    82,
                    16,
                    1,
                    0,
                    7.24,
                ),
                "rv-04" => (
                    4,
                    "BRA",
                    186,
                    PreferredFoot::Right,
                    SquadRole::FirstTeam,
                    78,
                    94,
                    79,
                    15,
                    0,
                    1,
                    7.08,
                ),
                "rv-05" => (
                    16,
                    "BRA",
                    175,
                    PreferredFoot::Left,
                    SquadRole::FirstTeam,
                    82,
                    96,
                    86,
                    15,
                    1,
                    4,
                    7.32,
                ),
                "rv-06" => (
                    5,
                    "URU",
                    184,
                    PreferredFoot::Right,
                    SquadRole::KeyPlayer,
                    79,
                    90,
                    84,
                    16,
                    2,
                    2,
                    7.41,
                ),
                "rv-07" => (
                    8,
                    "BRA",
                    181,
                    PreferredFoot::Right,
                    SquadRole::FirstTeam,
                    84,
                    95,
                    88,
                    15,
                    3,
                    5,
                    7.36,
                ),
                "rv-08" => (
                    10,
                    "BRA",
                    178,
                    PreferredFoot::Left,
                    SquadRole::FirstTeam,
                    79,
                    87,
                    76,
                    13,
                    2,
                    6,
                    7.12,
                ),
                "rv-09" => (
                    7,
                    "BRA",
                    174,
                    PreferredFoot::Left,
                    SquadRole::KeyPlayer,
                    86,
                    97,
                    91,
                    16,
                    6,
                    7,
                    7.62,
                ),
                "rv-10" => (
                    9,
                    "BRA",
                    187,
                    PreferredFoot::Right,
                    SquadRole::KeyPlayer,
                    82,
                    93,
                    89,
                    16,
                    11,
                    2,
                    7.71,
                ),
                "rv-11" => (
                    11,
                    "BRA",
                    176,
                    PreferredFoot::Right,
                    SquadRole::FirstTeam,
                    82,
                    94,
                    85,
                    15,
                    5,
                    5,
                    7.38,
                ),
                "rv-12" => (
                    12,
                    "BRA",
                    193,
                    PreferredFoot::Right,
                    SquadRole::Prospect,
                    81,
                    83,
                    72,
                    2,
                    0,
                    0,
                    6.88,
                ),
                "rv-13" => (
                    14,
                    "BRA",
                    190,
                    PreferredFoot::Right,
                    SquadRole::Backup,
                    72,
                    78,
                    68,
                    5,
                    0,
                    0,
                    6.72,
                ),
                "rv-14" => (
                    27,
                    "BRA",
                    179,
                    PreferredFoot::Right,
                    SquadRole::Prospect,
                    86,
                    89,
                    81,
                    7,
                    1,
                    2,
                    7.03,
                ),
                "rv-15" => (
                    20,
                    "ARG",
                    176,
                    PreferredFoot::Left,
                    SquadRole::Rotation,
                    83,
                    90,
                    83,
                    10,
                    3,
                    3,
                    7.15,
                ),
                "rv-16" => (
                    17,
                    "POR",
                    172,
                    PreferredFoot::Right,
                    SquadRole::Rotation,
                    75,
                    86,
                    73,
                    9,
                    2,
                    2,
                    6.89,
                ),
                "rv-17" => (
                    19,
                    "BRA",
                    185,
                    PreferredFoot::Right,
                    SquadRole::Rotation,
                    75,
                    76,
                    65,
                    8,
                    4,
                    1,
                    6.96,
                ),
                "rv-18" => (
                    25,
                    "BRA",
                    178,
                    PreferredFoot::Left,
                    SquadRole::Prospect,
                    82,
                    91,
                    80,
                    6,
                    0,
                    2,
                    6.94,
                ),
                _ => unreachable!("unknown default player profile"),
            };

            Player {
                id: id.to_owned(),
                name: name.to_owned(),
                short_name: short_name.to_owned(),
                shirt_number,
                position,
                age,
                nationality: nationality.to_owned(),
                height_cm,
                preferred_foot,
                squad_role,
                rating,
                potential_rating,
                match_fitness,
                morale,
                condition,
                appearances,
                goals,
                assists,
                average_rating,
                selected: starters.contains(id),
            }
        };

        let mut state = Self {
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
            tactical_library: None,
            tactical_plan: None,
            last_tactical_event: None,
            record: SeasonRecord::default(),
            last_result: None,
        };
        let initial = TacticalPlanSnapshot::from_legacy(&state);
        state.tactical_library = Some(TacticalVariationLibrarySnapshot {
            schema_version: TACTICAL_LIBRARY_SCHEMA_VERSION,
            revision: 0,
            active_variation_id: initial.variation_id.clone(),
            primary_variation_id: initial.variation_id.clone(),
            variations: vec![initial],
        });
        state
    }
}

impl TacticalPlanSnapshot {
    fn from_legacy(state: &MatchdayState) -> Self {
        let coordinates = [
            (0.09, 0.50),
            (0.30, 0.84),
            (0.24, 0.62),
            (0.24, 0.38),
            (0.30, 0.16),
            (0.48, 0.50),
            (0.59, 0.69),
            (0.59, 0.31),
            (0.80, 0.78),
            (0.88, 0.50),
            (0.80, 0.22),
        ];
        let starters: Vec<_> = state
            .players
            .iter()
            .filter(|player| player.selected)
            .collect();
        let placements = starters
            .iter()
            .enumerate()
            .map(|(index, player)| {
                let (normalized_x, normalized_y) = coordinates[index];
                TacticalPlayerPlacement {
                    player_id: player.id.clone(),
                    normalized_x,
                    normalized_y,
                    position_id: player.position,
                    role_id: None,
                    side: side_from_coordinate(normalized_y),
                    line: line_from_coordinate(normalized_x),
                    zone: zone_from_coordinate(normalized_x),
                    source_preset_slot_id: Some(format!("legacy.{index}")),
                    revision: 0,
                }
            })
            .collect();
        let selected_ids: HashSet<_> = starters.iter().map(|player| player.id.as_str()).collect();
        let bench = state
            .players
            .iter()
            .filter(|player| !selected_ids.contains(player.id.as_str()))
            .take(MAX_BENCH_SIZE)
            .map(|player| player.id.clone())
            .collect();

        Self {
            schema_version: TACTICAL_PLAN_SCHEMA_VERSION,
            variation_id: "tactical-variation.primary".to_owned(),
            name: state.formation.to_string(),
            source_preset_id: Some(state.formation.to_string()),
            formation: state.formation,
            placements,
            bench,
            custom_formation: CustomFormationIdentity {
                id: "formation.primary".to_owned(),
                name: state.formation.to_string(),
                is_custom: false,
                origin: "legacy-migration".to_owned(),
                created_at_revision: 0,
                updated_at_revision: 0,
            },
            revision: 0,
            created_at: unix_timestamp_ms(),
            updated_at: unix_timestamp_ms(),
        }
    }
}

fn unix_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |duration| duration.as_millis() as u64)
}

impl std::fmt::Display for Formation {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(match self {
            Self::FourThreeThree => "4-3-3",
            Self::FourTwoThreeOne => "4-2-3-1",
            Self::FourFourTwo => "4-4-2",
            Self::FourFourOneOne => "4-4-1-1",
            Self::FourOneFourOne => "4-1-4-1",
            Self::FourThreeOneTwo => "4-3-1-2",
            Self::FourTwoTwoTwo => "4-2-2-2",
            Self::FourThreeTwoOne => "4-3-2-1",
            Self::FourOneTwoOneTwo => "4-1-2-1-2",
            Self::FourTwoFour => "4-2-4",
            Self::ThreeFiveTwo => "3-5-2",
            Self::ThreeFourThree => "3-4-3",
            Self::ThreeFourTwoOne => "3-4-2-1",
            Self::ThreeOneFourTwo => "3-1-4-2",
            Self::ThreeTwoFourOne => "3-2-4-1",
            Self::ThreeFourOneTwo => "3-4-1-2",
            Self::FiveThreeTwo => "5-3-2",
            Self::FiveTwoThree => "5-2-3",
            Self::FiveFourOne => "5-4-1",
            Self::FiveTwoOneTwo => "5-2-1-2",
        })
    }
}

fn side_from_coordinate(normalized_y: f64) -> TacticalSide {
    if normalized_y < 0.4 {
        TacticalSide::Left
    } else if normalized_y > 0.6 {
        TacticalSide::Right
    } else {
        TacticalSide::Centre
    }
}

fn line_from_coordinate(normalized_x: f64) -> TacticalLine {
    if normalized_x <= 0.18 {
        TacticalLine::Goal
    } else if normalized_x <= 0.38 {
        TacticalLine::Defence
    } else if normalized_x <= 0.70 {
        TacticalLine::Midfield
    } else {
        TacticalLine::Attack
    }
}

fn zone_from_coordinate(normalized_x: f64) -> TacticalZone {
    if normalized_x <= 0.18 {
        TacticalZone::Goal
    } else if normalized_x <= 0.38 {
        TacticalZone::DefensiveThird
    } else if normalized_x <= 0.70 {
        TacticalZone::MiddleThird
    } else {
        TacticalZone::FinalThird
    }
}

impl MatchdayState {
    /// Completes careers created before detailed squad profiles were introduced.
    /// The zero shirt number is reserved as the migration sentinel and is never
    /// used by a seeded player.
    pub fn backfill_player_profiles(&mut self) -> bool {
        let defaults = Self::default();
        let mut changed = false;

        for player in &mut self.players {
            if player.shirt_number != 0 {
                continue;
            }
            let Some(profile) = defaults
                .players
                .iter()
                .find(|profile| profile.id == player.id)
            else {
                continue;
            };

            player.shirt_number = profile.shirt_number;
            player.nationality.clone_from(&profile.nationality);
            player.height_cm = profile.height_cm;
            player.preferred_foot = profile.preferred_foot;
            player.squad_role = profile.squad_role;
            player.potential_rating = profile.potential_rating;
            player.match_fitness = profile.match_fitness;
            player.morale = profile.morale;
            player.appearances = profile.appearances;
            player.goals = profile.goals;
            player.assists = profile.assists;
            player.average_rating = profile.average_rating;
            changed = true;
        }

        changed
    }

    /// Migrates the pre-library 06.2 record into one authoritative variation
    /// library without allowing invalid tactical data to make the career unreadable.
    pub fn backfill_tactical_plan(&mut self) -> Result<bool, MatchdayError> {
        if let Some(library) = &self.tactical_library {
            if library.schema_version > TACTICAL_LIBRARY_SCHEMA_VERSION {
                return Err(MatchdayError::InvalidTacticalPlan(
                    "A biblioteca tática pertence a uma versão mais nova do Rivallo.".to_owned(),
                ));
            }
            if library.schema_version == TACTICAL_LIBRARY_SCHEMA_VERSION
                && self.validate_tactical_library(library).is_ok()
            {
                let changed = self.tactical_plan.take().is_some();
                self.sync_active_variation()?;
                return Ok(changed);
            }
        }

        let mut variation = self
            .tactical_plan
            .take()
            .unwrap_or_else(|| TacticalPlanSnapshot::from_legacy(self));
        if variation.schema_version > TACTICAL_PLAN_SCHEMA_VERSION {
            return Err(MatchdayError::InvalidTacticalPlan(
                "O plano tático pertence a uma versão mais nova do Rivallo.".to_owned(),
            ));
        }
        variation.schema_version = TACTICAL_PLAN_SCHEMA_VERSION;
        if variation.variation_id.trim().is_empty()
            || variation.variation_id == "tactical-plan.primary"
        {
            variation.variation_id = "tactical-variation.primary".to_owned();
        }
        let migrated_at = unix_timestamp_ms();
        if variation.created_at == 0 {
            variation.created_at = migrated_at;
        }
        if variation.updated_at == 0 {
            variation.updated_at = variation.created_at;
        }
        if self.validate_tactical_plan(&variation).is_err() {
            variation = TacticalPlanSnapshot::from_legacy(self);
        }
        self.tactical_library = Some(TacticalVariationLibrarySnapshot {
            schema_version: TACTICAL_LIBRARY_SCHEMA_VERSION,
            revision: 0,
            active_variation_id: variation.variation_id.clone(),
            primary_variation_id: variation.variation_id.clone(),
            variations: vec![variation],
        });
        self.last_tactical_event = None;
        self.sync_active_variation()?;
        Ok(true)
    }

    pub fn validate_tactical_library(
        &self,
        library: &TacticalVariationLibrarySnapshot,
    ) -> Result<(), MatchdayError> {
        if library.schema_version != TACTICAL_LIBRARY_SCHEMA_VERSION {
            return Err(MatchdayError::InvalidTacticalPlan(
                "A versão da biblioteca tática é incompatível.".to_owned(),
            ));
        }
        if library.variations.is_empty() {
            return Err(MatchdayError::InvalidTacticalPlan(
                "A biblioteca precisa manter ao menos uma variação.".to_owned(),
            ));
        }
        let mut ids = HashSet::new();
        for variation in &library.variations {
            self.validate_tactical_plan(variation)?;
            if !ids.insert(variation.variation_id.as_str()) {
                return Err(MatchdayError::InvalidTacticalPlan(
                    "Duas variações não podem compartilhar a mesma identidade.".to_owned(),
                ));
            }
        }
        if !ids.contains(library.active_variation_id.as_str())
            || !ids.contains(library.primary_variation_id.as_str())
        {
            return Err(MatchdayError::InvalidTacticalPlan(
                "A variação ativa e a principal precisam existir na biblioteca.".to_owned(),
            ));
        }
        Ok(())
    }

    pub fn validate_tactical_plan(&self, plan: &TacticalPlanSnapshot) -> Result<(), MatchdayError> {
        if plan.schema_version != TACTICAL_PLAN_SCHEMA_VERSION {
            return Err(MatchdayError::InvalidTacticalPlan(
                "A versão do plano tático é incompatível.".to_owned(),
            ));
        }
        if plan.variation_id.trim().is_empty()
            || plan.name.trim().is_empty()
            || plan.name.len() > 80
        {
            return Err(MatchdayError::InvalidTacticalPlan(
                "O plano precisa de identidade e nome válidos.".to_owned(),
            ));
        }
        if plan.created_at == 0 || plan.updated_at < plan.created_at {
            return Err(MatchdayError::InvalidTacticalPlan(
                "As datas da variação são inválidas.".to_owned(),
            ));
        }
        if plan.placements.len() != STARTING_XI_SIZE {
            return Err(MatchdayError::InvalidTacticalPlan(
                "O campo precisa conter exatamente 11 titulares.".to_owned(),
            ));
        }
        if plan.bench.len() > MAX_BENCH_SIZE {
            return Err(MatchdayError::InvalidTacticalPlan(format!(
                "O banco aceita no máximo {MAX_BENCH_SIZE} jogadores."
            )));
        }

        let known_players: HashSet<_> = self
            .players
            .iter()
            .map(|player| player.id.as_str())
            .collect();
        let mut all_players = HashSet::new();
        for placement in &plan.placements {
            if !known_players.contains(placement.player_id.as_str()) {
                return Err(MatchdayError::InvalidTacticalPlan(
                    "O plano referencia um jogador inexistente.".to_owned(),
                ));
            }
            if !all_players.insert(placement.player_id.as_str()) {
                return Err(MatchdayError::InvalidTacticalPlan(
                    "O mesmo jogador não pode ocupar dois lugares.".to_owned(),
                ));
            }
            if !placement.normalized_x.is_finite()
                || !placement.normalized_y.is_finite()
                || !(0.0..=1.0).contains(&placement.normalized_x)
                || !(0.0..=1.0).contains(&placement.normalized_y)
            {
                return Err(MatchdayError::InvalidTacticalPlan(
                    "Há uma coordenada fora dos limites do campo.".to_owned(),
                ));
            }
        }
        for player_id in &plan.bench {
            if !known_players.contains(player_id.as_str()) {
                return Err(MatchdayError::InvalidTacticalPlan(
                    "O banco referencia um jogador inexistente.".to_owned(),
                ));
            }
            if !all_players.insert(player_id.as_str()) {
                return Err(MatchdayError::InvalidTacticalPlan(
                    "Um jogador não pode estar no campo e no banco ao mesmo tempo.".to_owned(),
                ));
            }
        }

        for (index, placement) in plan.placements.iter().enumerate() {
            for other in plan.placements.iter().skip(index + 1) {
                let distance = (placement.normalized_x - other.normalized_x)
                    .hypot(placement.normalized_y - other.normalized_y);
                if distance < 0.01 {
                    return Err(MatchdayError::InvalidTacticalPlan(
                        "Dois jogadores estão sobrepostos e não podem ser operados.".to_owned(),
                    ));
                }
            }
        }

        let goalkeepers: Vec<_> = plan
            .placements
            .iter()
            .filter(|placement| {
                self.players.iter().any(|player| {
                    player.id == placement.player_id && player.position == Position::Gk
                })
            })
            .collect();
        if goalkeepers.len() != 1 {
            return Err(MatchdayError::InvalidTacticalPlan(
                "A escalação precisa de exatamente um goleiro.".to_owned(),
            ));
        }
        if goalkeepers[0].normalized_x > 0.25 {
            return Err(MatchdayError::InvalidTacticalPlan(
                "O goleiro precisa permanecer no setor defensivo permitido.".to_owned(),
            ));
        }

        Ok(())
    }

    pub fn apply_tactical_plan(
        &mut self,
        proposal: TacticalPlanProposal,
    ) -> Result<TacticalPlanEvent, MatchdayError> {
        let mut library = self.tactical_library.clone().ok_or_else(|| {
            MatchdayError::InvalidTacticalPlan("Biblioteca tática ausente.".into())
        })?;
        let existing_index = library
            .variations
            .iter()
            .position(|variation| variation.variation_id == proposal.variation_id);
        let actual_revision = existing_index.map_or(0, |index| library.variations[index].revision);
        if proposal.expected_revision != actual_revision {
            return Err(MatchdayError::TacticalPlanConflict {
                expected_revision: proposal.expected_revision,
                actual_revision,
            });
        }

        let accepted_revision = actual_revision + 1;
        let now = unix_timestamp_ms();
        let created_at = existing_index.map_or(now, |index| library.variations[index].created_at);
        let plan = TacticalPlanSnapshot {
            schema_version: TACTICAL_PLAN_SCHEMA_VERSION,
            variation_id: proposal.variation_id,
            name: proposal.name,
            source_preset_id: proposal.source_preset_id,
            formation: proposal.formation,
            placements: proposal
                .placements
                .into_iter()
                .map(|placement| TacticalPlayerPlacement {
                    revision: accepted_revision,
                    side: side_from_coordinate(placement.normalized_y),
                    line: line_from_coordinate(placement.normalized_x),
                    zone: zone_from_coordinate(placement.normalized_x),
                    ..placement
                })
                .collect(),
            bench: proposal.bench,
            custom_formation: CustomFormationIdentity {
                updated_at_revision: accepted_revision,
                ..proposal.custom_formation
            },
            revision: accepted_revision,
            created_at,
            updated_at: now.max(created_at),
        };
        self.validate_tactical_plan(&plan)?;
        if let Some(index) = existing_index {
            library.variations[index] = plan.clone();
        } else {
            library.variations.push(plan.clone());
            library.revision += 1;
        }
        library.active_variation_id = plan.variation_id.clone();
        self.validate_tactical_library(&library)?;
        self.tactical_library = Some(library);
        self.sync_active_variation()?;
        self.approach = proposal.approach;
        let event = TacticalPlanEvent::VariationSaved {
            variation_id: plan.variation_id.clone(),
            accepted_revision,
        };
        self.last_tactical_event = Some(event.clone());
        Ok(event)
    }

    pub fn apply_tactical_library_command(
        &mut self,
        command: TacticalLibraryCommand,
    ) -> Result<TacticalPlanEvent, MatchdayError> {
        let (expected_revision, variation_id) = match &command {
            TacticalLibraryCommand::Activate {
                expected_library_revision,
                variation_id,
            }
            | TacticalLibraryCommand::SetPrimary {
                expected_library_revision,
                variation_id,
            }
            | TacticalLibraryCommand::Delete {
                expected_library_revision,
                variation_id,
            } => (*expected_library_revision, variation_id.clone()),
        };
        let mut library = self.tactical_library.clone().ok_or_else(|| {
            MatchdayError::InvalidTacticalPlan("Biblioteca tática ausente.".into())
        })?;
        if expected_revision != library.revision {
            return Err(MatchdayError::TacticalLibraryConflict {
                expected_revision,
                actual_revision: library.revision,
            });
        }
        let index = library
            .variations
            .iter()
            .position(|variation| variation.variation_id == variation_id)
            .ok_or_else(|| {
                MatchdayError::InvalidTacticalPlan("A variação selecionada não existe.".into())
            })?;
        let accepted_library_revision = library.revision + 1;
        let event = match command {
            TacticalLibraryCommand::Activate { .. } => {
                library.active_variation_id = variation_id.clone();
                TacticalPlanEvent::VariationActivated {
                    variation_id,
                    accepted_library_revision,
                }
            }
            TacticalLibraryCommand::SetPrimary { .. } => {
                library.primary_variation_id = variation_id.clone();
                TacticalPlanEvent::PrimaryVariationChanged {
                    variation_id,
                    accepted_library_revision,
                }
            }
            TacticalLibraryCommand::Delete { .. } => {
                if library.variations.len() == 1 {
                    return Err(MatchdayError::InvalidTacticalPlan(
                        "A única variação da biblioteca não pode ser excluída.".into(),
                    ));
                }
                library.variations.remove(index);
                if library.primary_variation_id == variation_id {
                    library.primary_variation_id = library.variations[0].variation_id.clone();
                }
                if library.active_variation_id == variation_id {
                    library.active_variation_id = library.primary_variation_id.clone();
                }
                TacticalPlanEvent::VariationDeleted {
                    variation_id,
                    active_variation_id: library.active_variation_id.clone(),
                    accepted_library_revision,
                }
            }
        };
        library.revision = accepted_library_revision;
        self.validate_tactical_library(&library)?;
        self.tactical_library = Some(library);
        self.sync_active_variation()?;
        self.last_tactical_event = Some(event.clone());
        Ok(event)
    }

    fn sync_active_variation(&mut self) -> Result<(), MatchdayError> {
        let plan = self
            .tactical_library
            .as_ref()
            .and_then(|library| {
                library
                    .variations
                    .iter()
                    .find(|variation| variation.variation_id == library.active_variation_id)
            })
            .cloned()
            .ok_or_else(|| MatchdayError::InvalidTacticalPlan("Variação ativa ausente.".into()))?;
        let selected: HashSet<_> = plan
            .placements
            .iter()
            .map(|placement| placement.player_id.as_str())
            .collect();
        for player in &mut self.players {
            player.selected = selected.contains(player.id.as_str());
        }
        self.formation = plan.formation;
        Ok(())
    }

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
            Formation::FourThreeThree
            | Formation::FourTwoFour
            | Formation::ThreeFourThree
            | Formation::ThreeTwoFourOne
            | Formation::FiveTwoThree => 2,
            Formation::FourTwoThreeOne
            | Formation::FourThreeOneTwo
            | Formation::FourTwoTwoTwo
            | Formation::FourThreeTwoOne
            | Formation::FourOneTwoOneTwo
            | Formation::ThreeFiveTwo
            | Formation::ThreeFourTwoOne
            | Formation::ThreeOneFourTwo
            | Formation::ThreeFourOneTwo
            | Formation::FiveThreeTwo
            | Formation::FiveTwoOneTwo => 1,
            Formation::FourFourTwo
            | Formation::FourFourOneOne
            | Formation::FourOneFourOne
            | Formation::FiveFourOne => 0,
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
        let creators: Vec<_> = selected
            .iter()
            .copied()
            .filter(|player| {
                matches!(
                    player.position,
                    Position::Cm | Position::Am | Position::Rw | Position::Lw
                )
            })
            .collect();
        let mut events = Vec::new();
        let mut scorer_ids = Vec::new();
        let mut assistant_ids = Vec::new();
        for goal in 0..home_goals {
            let scorer = scorers
                .get(usize::from(goal) % scorers.len().max(1))
                .copied()
                .unwrap_or(selected[0]);
            scorer_ids.push(scorer.id.clone());
            if let Some(assistant) = creators
                .iter()
                .cycle()
                .skip(usize::from(goal))
                .take(creators.len())
                .find(|player| player.id != scorer.id)
            {
                assistant_ids.push(assistant.id.clone());
            }
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
        let selected_ids: HashSet<_> = selected.iter().map(|player| player.id.clone()).collect();
        drop(creators);
        drop(scorers);
        drop(selected);

        for player in &mut self.players {
            if !selected_ids.contains(&player.id) {
                continue;
            }

            let goals = scorer_ids.iter().filter(|id| *id == &player.id).count() as u16;
            let assists = assistant_ids.iter().filter(|id| *id == &player.id).count() as u16;
            let previous_appearances = player.appearances;
            let result_modifier = match home_goals.cmp(&away_goals) {
                std::cmp::Ordering::Greater => 0.45,
                std::cmp::Ordering::Equal => 0.1,
                std::cmp::Ordering::Less => -0.25,
            };
            let match_rating =
                (6.4_f32 + result_modifier + goals as f32 * 0.8 + assists as f32 * 0.35)
                    .clamp(5.0, 10.0);
            player.average_rating = ((player.average_rating * f32::from(previous_appearances)
                + match_rating)
                / f32::from(previous_appearances + 1)
                * 100.0)
                .round()
                / 100.0;
            player.appearances += 1;
            player.goals += goals;
            player.assists += assists;
            player.match_fitness = player.match_fitness.saturating_sub(4);
            player.condition = player.condition.saturating_sub(3);
            player.morale = match home_goals.cmp(&away_goals) {
                std::cmp::Ordering::Greater => player.morale.saturating_add(4).min(100),
                std::cmp::Ordering::Equal => player.morale.saturating_add(1).min(100),
                std::cmp::Ordering::Less => player.morale.saturating_sub(4),
            };
        }
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

    fn proposal_from(state: &MatchdayState) -> TacticalPlanProposal {
        let library = state
            .tactical_library
            .as_ref()
            .expect("default tactical library");
        let plan = library
            .variations
            .iter()
            .find(|variation| variation.variation_id == library.active_variation_id)
            .cloned()
            .expect("active tactical variation");
        TacticalPlanProposal {
            expected_revision: plan.revision,
            variation_id: plan.variation_id,
            name: plan.name,
            source_preset_id: plan.source_preset_id,
            formation: plan.formation,
            placements: plan.placements,
            bench: plan.bench,
            custom_formation: plan.custom_formation,
            approach: state.approach,
        }
    }

    #[test]
    fn default_matchday_has_a_valid_eighteen_player_squad_and_xi() {
        let state = MatchdayState::default();
        assert_eq!(state.players.len(), 18);
        assert_eq!(state.selection().player_ids.len(), 11);
        assert_eq!(
            state
                .players
                .iter()
                .map(|player| player.shirt_number)
                .collect::<HashSet<_>>()
                .len(),
            18
        );
        assert!(state.players.iter().all(|player| {
            player.shirt_number > 0
                && player.nationality.len() == 3
                && player.height_cm >= 170
                && player.potential_rating >= player.rating
                && (6.0..=10.0).contains(&player.average_rating)
        }));
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
    fn tactical_plan_accepts_normalized_free_coordinates_atomically() {
        let mut state = MatchdayState::default();
        let mut proposal = proposal_from(&state);
        proposal.placements[5].normalized_x = 0.537;
        proposal.placements[5].normalized_y = 0.463;
        proposal.custom_formation.is_custom = true;
        proposal.custom_formation.name = "Assimetria Aurora".to_owned();

        let event = state
            .apply_tactical_plan(proposal)
            .expect("valid free tactical plan");
        let library = state.tactical_library.as_ref().expect("saved library");
        let saved = library
            .variations
            .iter()
            .find(|variation| variation.variation_id == library.active_variation_id)
            .expect("saved variation");
        assert_eq!(saved.revision, 1);
        assert_eq!(saved.placements[5].normalized_x, 0.537);
        assert_eq!(saved.placements[5].side, TacticalSide::Centre);
        assert_eq!(saved.placements[5].line, TacticalLine::Midfield);
        assert!(matches!(
            event,
            TacticalPlanEvent::VariationSaved {
                accepted_revision: 1,
                ..
            }
        ));
    }

    #[test]
    fn tactical_plan_rejects_duplicate_overlap_invalid_goalkeeper_and_unknown_players() {
        type ProposalMutation = Box<dyn Fn(&mut TacticalPlanProposal)>;
        let cases: Vec<ProposalMutation> = vec![
            Box::new(|proposal| {
                proposal.placements[1].player_id = proposal.placements[0].player_id.clone();
            }),
            Box::new(|proposal| {
                proposal.placements[1].normalized_x = proposal.placements[0].normalized_x;
                proposal.placements[1].normalized_y = proposal.placements[0].normalized_y;
            }),
            Box::new(|proposal| proposal.placements[0].normalized_x = 0.6),
            Box::new(|proposal| proposal.placements[2].player_id = "player.unknown".to_owned()),
        ];

        for mutate in cases {
            let mut state = MatchdayState::default();
            let before = state.clone();
            let mut proposal = proposal_from(&state);
            mutate(&mut proposal);
            assert!(matches!(
                state.apply_tactical_plan(proposal),
                Err(MatchdayError::InvalidTacticalPlan(_))
            ));
            assert_eq!(
                state, before,
                "invalid proposal must not partially mutate state"
            );
        }
    }

    #[test]
    fn tactical_plan_rejects_stale_revision_without_mutating_state() {
        let mut state = MatchdayState::default();
        let mut first = proposal_from(&state);
        first.placements[5].normalized_x = 0.52;
        state.apply_tactical_plan(first).expect("first save");
        let accepted = state.clone();

        let mut stale = proposal_from(&state);
        stale.expected_revision = 0;
        stale.placements[5].normalized_x = 0.7;
        assert_eq!(
            state.apply_tactical_plan(stale),
            Err(MatchdayError::TacticalPlanConflict {
                expected_revision: 0,
                actual_revision: 1,
            })
        );
        assert_eq!(state, accepted);
    }

    #[test]
    fn variations_from_the_same_preset_keep_geometry_revisions_and_identity_independent() {
        let mut state = MatchdayState::default();
        let mut volante_alto = proposal_from(&state);
        volante_alto.name = "4-3-3 Volante Alto".to_owned();
        volante_alto.placements[5].normalized_x = 0.58;
        state
            .apply_tactical_plan(volante_alto)
            .expect("save volante alto");

        let mut laterais_altos = proposal_from(&state);
        laterais_altos.expected_revision = 0;
        laterais_altos.variation_id = "tactical-variation.laterais-altos".to_owned();
        laterais_altos.name = "4-3-3 Laterais Altos".to_owned();
        laterais_altos.placements[1].normalized_x = 0.43;
        laterais_altos.placements[4].normalized_x = 0.43;
        state
            .apply_tactical_plan(laterais_altos)
            .expect("save laterais altos");

        let library = state.tactical_library.as_ref().expect("variation library");
        assert_eq!(library.variations.len(), 2);
        assert_eq!(library.revision, 1, "only insertion revises the collection");
        let volante = library
            .variations
            .iter()
            .find(|variation| variation.name == "4-3-3 Volante Alto")
            .expect("volante variation");
        let laterais = library
            .variations
            .iter()
            .find(|variation| variation.name == "4-3-3 Laterais Altos")
            .expect("fullback variation");
        assert_eq!(volante.source_preset_id, laterais.source_preset_id);
        assert_ne!(volante.variation_id, laterais.variation_id);
        assert_eq!(volante.revision, 1);
        assert_eq!(laterais.revision, 1);
        assert_eq!(volante.placements[5].normalized_x, 0.58);
        assert_eq!(laterais.placements[5].normalized_x, 0.58);
        assert_ne!(volante.placements[1].normalized_x, 0.43);
        assert_eq!(laterais.placements[1].normalized_x, 0.43);

        let volante_id = volante.variation_id.clone();
        state
            .apply_tactical_library_command(TacticalLibraryCommand::Activate {
                expected_library_revision: 1,
                variation_id: volante_id.clone(),
            })
            .expect("activate volante variation");
        assert_eq!(
            state
                .tactical_library
                .as_ref()
                .expect("library")
                .active_variation_id,
            volante_id
        );

        let reopened = state.clone();
        assert_eq!(reopened, state);
        assert_eq!(
            reopened
                .tactical_library
                .as_ref()
                .expect("reopened library")
                .variations
                .len(),
            2
        );
    }

    #[test]
    fn library_lifecycle_preserves_a_valid_primary_and_rejects_stale_commands() {
        let mut state = MatchdayState::default();
        let original_id = state
            .tactical_library
            .as_ref()
            .expect("library")
            .active_variation_id
            .clone();
        let mut duplicate = proposal_from(&state);
        duplicate.expected_revision = 0;
        duplicate.variation_id = "tactical-variation.secondary".to_owned();
        duplicate.name = "Secundária".to_owned();
        state
            .apply_tactical_plan(duplicate)
            .expect("create secondary");

        state
            .apply_tactical_library_command(TacticalLibraryCommand::SetPrimary {
                expected_library_revision: 1,
                variation_id: "tactical-variation.secondary".to_owned(),
            })
            .expect("set primary");
        let accepted = state.clone();
        assert_eq!(
            state.apply_tactical_library_command(TacticalLibraryCommand::Activate {
                expected_library_revision: 1,
                variation_id: original_id.clone(),
            }),
            Err(MatchdayError::TacticalLibraryConflict {
                expected_revision: 1,
                actual_revision: 2,
            })
        );
        assert_eq!(state, accepted);

        state
            .apply_tactical_library_command(TacticalLibraryCommand::Delete {
                expected_library_revision: 2,
                variation_id: "tactical-variation.secondary".to_owned(),
            })
            .expect("delete current primary");
        let library = state
            .tactical_library
            .as_ref()
            .expect("library after delete");
        assert_eq!(library.variations.len(), 1);
        assert_eq!(library.primary_variation_id, original_id);
        assert_eq!(library.active_variation_id, original_id);
    }

    #[test]
    fn migrates_the_single_06_2_plan_into_the_same_variation_identity_system() {
        let mut legacy = MatchdayState::default();
        let mut plan = legacy
            .tactical_library
            .take()
            .and_then(|library| library.variations.into_iter().next())
            .expect("legacy plan");
        plan.schema_version = 2;
        plan.variation_id = "tactical-plan.primary".to_owned();
        plan.name = "4-3-3 Legado Personalizado".to_owned();
        plan.placements[5].normalized_x = 0.57;
        plan.created_at = 0;
        plan.updated_at = 0;
        legacy.tactical_plan = Some(plan);

        assert!(
            legacy
                .backfill_tactical_plan()
                .expect("migrate legacy plan")
        );
        assert!(legacy.tactical_plan.is_none());
        let library = legacy.tactical_library.as_ref().expect("migrated library");
        assert_eq!(library.variations.len(), 1);
        assert_eq!(library.primary_variation_id, library.active_variation_id);
        assert_eq!(library.variations[0].name, "4-3-3 Legado Personalizado");
        assert_eq!(library.variations[0].placements[5].normalized_x, 0.57);
        assert_eq!(
            library.variations[0].schema_version,
            TACTICAL_PLAN_SCHEMA_VERSION
        );
        assert!(library.variations[0].created_at > 0);
    }

    #[test]
    fn simulation_is_deterministic_and_advances_the_record() {
        let mut first = MatchdayState::default();
        let mut second = MatchdayState::default();
        let starter_before = first.players[0].clone();
        let goals_before: u16 = first.players.iter().map(|player| player.goals).sum();
        let assists_before: u16 = first.players.iter().map(|player| player.assists).sum();
        let first_result = first.play_next_match().expect("valid default lineup");
        let second_result = second.play_next_match().expect("valid default lineup");
        let simulated_goals = u16::from(first_result.home_goals);
        let expected_morale = match first_result.home_goals.cmp(&first_result.away_goals) {
            std::cmp::Ordering::Greater => starter_before.morale.saturating_add(4).min(100),
            std::cmp::Ordering::Equal => starter_before.morale.saturating_add(1).min(100),
            std::cmp::Ordering::Less => starter_before.morale.saturating_sub(4),
        };
        assert_eq!(first_result, second_result);
        assert_eq!(first.round, 2);
        assert_eq!(first.record.played, 1);
        assert_eq!(first.last_result, Some(first_result));
        assert_eq!(first.players[0].appearances, starter_before.appearances + 1);
        assert_eq!(
            first.players[0].match_fitness,
            starter_before.match_fitness - 4
        );
        assert_eq!(first.players[0].condition, starter_before.condition - 3);
        assert_eq!(first.players[0].morale, expected_morale);
        assert_ne!(
            first.players[0].average_rating,
            starter_before.average_rating
        );
        assert_eq!(
            first.players.iter().map(|player| player.goals).sum::<u16>(),
            goals_before + simulated_goals
        );
        assert_eq!(
            first
                .players
                .iter()
                .map(|player| player.assists)
                .sum::<u16>(),
            assists_before + simulated_goals
        );
    }
}
