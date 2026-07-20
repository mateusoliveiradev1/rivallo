use serde::{Deserialize, Serialize};

use crate::{Club, MatchdayState, Player, Position, TacticalModelSnapshot};

pub const PROFILE_WORLD_SCHEMA_VERSION: u16 = 2;
pub const PROFILE_PROJECTION_SCHEMA_VERSION: u16 = 2;
pub const RATING_SCALE_VERSION: &str = "rivallo.rating.0-100.v2";
pub const ASSESSMENT_VERSION: u16 = 1;

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum KnowledgeLevel {
    OwnClub,
    WellKnown,
    Partial,
    Limited,
    Unknown,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum KnowledgeValueKind {
    Exact,
    Range,
    Qualitative,
    Unknown,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeValue {
    pub kind: KnowledgeValueKind,
    pub value: Option<u8>,
    pub minimum: Option<u8>,
    pub maximum: Option<u8>,
    pub label: String,
}

impl KnowledgeValue {
    fn exact(value: u8) -> Self {
        Self {
            kind: KnowledgeValueKind::Exact,
            value: Some(value),
            minimum: None,
            maximum: None,
            label: value.to_string(),
        }
    }

    fn range(value: u8, width: u8) -> Self {
        let minimum = value.saturating_sub(width);
        let maximum = value.saturating_add(width).min(100);
        Self {
            kind: KnowledgeValueKind::Range,
            value: None,
            minimum: Some(minimum),
            maximum: Some(maximum),
            label: format!("{minimum}–{maximum}"),
        }
    }

    fn qualitative(value: u8) -> Self {
        let label = match value {
            80..=100 => "Excelente",
            70..=79 => "Muito bom",
            60..=69 => "Bom",
            50..=59 => "Regular",
            _ => "Abaixo da média",
        };
        Self {
            kind: KnowledgeValueKind::Qualitative,
            value: None,
            minimum: None,
            maximum: None,
            label: label.to_owned(),
        }
    }

    fn unknown() -> Self {
        Self {
            kind: KnowledgeValueKind::Unknown,
            value: None,
            minimum: None,
            maximum: None,
            label: "Desconhecido".to_owned(),
        }
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoutingAssessment {
    pub entity_id: String,
    pub observer_club_id: String,
    pub knowledge_level: KnowledgeLevel,
    pub confidence: u8,
    pub source: String,
    pub observed_at: u64,
    pub updated_at: u64,
    pub expires_at: Option<u64>,
    pub known_fields: Vec<String>,
    pub estimated_fields: Vec<String>,
    pub hidden_fields: Vec<String>,
    pub assessment_version: u16,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PlayerAttributeCategory {
    Outfield,
    Goalkeeper,
}

impl PlayerAttributeCategory {
    const fn label(self) -> &'static str {
        match self {
            Self::Outfield => "Atributos de jogador de linha",
            Self::Goalkeeper => "Atributos de goleiro",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
enum PlayerAttributeId {
    Finishing,
    Technique,
    Passing,
    Tackling,
    Physical,
    Pace,
    Reaction,
    Positioning,
    Handling,
    Mobility,
    RushingOut,
    Distribution,
}

impl PlayerAttributeId {
    const fn id(self) -> &'static str {
        match self {
            Self::Finishing => "finishing",
            Self::Technique => "technique",
            Self::Passing => "passing",
            Self::Tackling => "tackling",
            Self::Physical => "physical",
            Self::Pace => "pace",
            Self::Reaction => "reaction",
            Self::Positioning => "positioning",
            Self::Handling => "handling",
            Self::Mobility => "mobility",
            Self::RushingOut => "rushingOut",
            Self::Distribution => "distribution",
        }
    }

    const fn label(self) -> &'static str {
        match self {
            Self::Finishing => "Finalização",
            Self::Technique => "Técnica",
            Self::Passing => "Passe",
            Self::Tackling => "Desarme",
            Self::Physical => "Físico",
            Self::Pace => "Velocidade",
            Self::Reaction => "Reação",
            Self::Positioning => "Posicionamento",
            Self::Handling => "Manejo",
            Self::Mobility => "Mobilidade",
            Self::RushingOut => "Saídas",
            Self::Distribution => "Distribuição",
        }
    }

    const fn description(self) -> &'static str {
        match self {
            Self::Finishing => {
                "Capacidade de converter oportunidades em gol com precisão e controle."
            }
            Self::Technique => "Qualidade no domínio, condução e execução de ações com a bola.",
            Self::Passing => {
                "Qualidade e precisão ao executar passes curtos, longos e sob pressão."
            }
            Self::Tackling => {
                "Capacidade de recuperar a bola em disputas e desarmes sem perder o controle."
            }
            Self::Physical => {
                "Força, resistência e capacidade de sustentar disputas durante a partida."
            }
            Self::Pace => {
                "Capacidade de acelerar, alcançar velocidade e responder em deslocamentos."
            }
            Self::Reaction => {
                "Capacidade de responder rapidamente a chutes, desvios, rebotes e situações inesperadas."
            }
            Self::Positioning => {
                "Capacidade de se colocar no lugar certo para fechar ângulos e antecipar jogadas."
            }
            Self::Handling => {
                "Capacidade de controlar a bola com segurança ao encaixar, segurar ou espalmar."
            }
            Self::Mobility => {
                "Capacidade de se mover na área, saltar, cair, levantar e alcançar bolas difíceis."
            }
            Self::RushingOut => {
                "Capacidade de sair do gol no momento certo em cruzamentos, lançamentos e duelos."
            }
            Self::Distribution => {
                "Capacidade de repor a bola com qualidade usando os pés ou as mãos."
            }
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(tag = "model", rename_all = "camelCase")]
pub enum PlayerAttributeSet {
    Outfield {
        finishing: u8,
        technique: u8,
        passing: u8,
        tackling: u8,
        physical: u8,
        pace: u8,
    },
    Goalkeeper {
        reaction: u8,
        positioning: u8,
        handling: u8,
        mobility: u8,
        #[serde(rename = "rushingOut")]
        rushing_out: u8,
        distribution: u8,
    },
    Legacy {
        technical: u8,
        physical: u8,
        mental: u8,
        attacking: u8,
        defensive: u8,
        goalkeeping: u8,
    },
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PlayerAttributeSetWire {
    model: Option<String>,
    finishing: Option<u8>,
    technique: Option<u8>,
    passing: Option<u8>,
    tackling: Option<u8>,
    physical: Option<u8>,
    pace: Option<u8>,
    reaction: Option<u8>,
    positioning: Option<u8>,
    handling: Option<u8>,
    mobility: Option<u8>,
    rushing_out: Option<u8>,
    distribution: Option<u8>,
    technical: Option<u8>,
    mental: Option<u8>,
    attacking: Option<u8>,
    defensive: Option<u8>,
    goalkeeping: Option<u8>,
}

impl<'de> Deserialize<'de> for PlayerAttributeSet {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use serde::de::Error;
        let wire = PlayerAttributeSetWire::deserialize(deserializer)?;
        let required = |value: Option<u8>, field: &'static str| {
            value.ok_or_else(|| D::Error::missing_field(field))
        };
        match wire.model.as_deref() {
            Some("outfield") => Ok(Self::Outfield {
                finishing: required(wire.finishing, "finishing")?,
                technique: required(wire.technique, "technique")?,
                passing: required(wire.passing, "passing")?,
                tackling: required(wire.tackling, "tackling")?,
                physical: required(wire.physical, "physical")?,
                pace: required(wire.pace, "pace")?,
            }),
            Some("goalkeeper") => Ok(Self::Goalkeeper {
                reaction: required(wire.reaction, "reaction")?,
                positioning: required(wire.positioning, "positioning")?,
                handling: required(wire.handling, "handling")?,
                mobility: required(wire.mobility, "mobility")?,
                rushing_out: required(wire.rushing_out, "rushingOut")?,
                distribution: required(wire.distribution, "distribution")?,
            }),
            Some(other) => Err(D::Error::custom(format!(
                "modelo de atributos desconhecido: {other}"
            ))),
            None => Ok(Self::Legacy {
                technical: required(wire.technical, "technical")?,
                physical: required(wire.physical, "physical")?,
                mental: required(wire.mental, "mental")?,
                attacking: required(wire.attacking, "attacking")?,
                defensive: required(wire.defensive, "defensive")?,
                goalkeeping: required(wire.goalkeeping, "goalkeeping")?,
            }),
        }
    }
}

impl PlayerAttributeSet {
    fn category(&self) -> PlayerAttributeCategory {
        match self {
            Self::Goalkeeper { .. } => PlayerAttributeCategory::Goalkeeper,
            Self::Outfield { .. } | Self::Legacy { .. } => PlayerAttributeCategory::Outfield,
        }
    }

    fn ids(&self) -> &'static [PlayerAttributeId; 6] {
        const OUTFIELD: [PlayerAttributeId; 6] = [
            PlayerAttributeId::Finishing,
            PlayerAttributeId::Technique,
            PlayerAttributeId::Passing,
            PlayerAttributeId::Tackling,
            PlayerAttributeId::Physical,
            PlayerAttributeId::Pace,
        ];
        const GOALKEEPER: [PlayerAttributeId; 6] = [
            PlayerAttributeId::Reaction,
            PlayerAttributeId::Positioning,
            PlayerAttributeId::Handling,
            PlayerAttributeId::Mobility,
            PlayerAttributeId::RushingOut,
            PlayerAttributeId::Distribution,
        ];
        match self {
            Self::Goalkeeper { .. } => &GOALKEEPER,
            Self::Outfield { .. } | Self::Legacy { .. } => &OUTFIELD,
        }
    }

    fn value(&self, attribute: PlayerAttributeId) -> Option<u8> {
        match (self, attribute) {
            (Self::Outfield { finishing, .. }, PlayerAttributeId::Finishing) => Some(*finishing),
            (Self::Outfield { technique, .. }, PlayerAttributeId::Technique) => Some(*technique),
            (Self::Outfield { passing, .. }, PlayerAttributeId::Passing) => Some(*passing),
            (Self::Outfield { tackling, .. }, PlayerAttributeId::Tackling) => Some(*tackling),
            (Self::Outfield { physical, .. }, PlayerAttributeId::Physical) => Some(*physical),
            (Self::Outfield { pace, .. }, PlayerAttributeId::Pace) => Some(*pace),
            (Self::Goalkeeper { reaction, .. }, PlayerAttributeId::Reaction) => Some(*reaction),
            (Self::Goalkeeper { positioning, .. }, PlayerAttributeId::Positioning) => {
                Some(*positioning)
            }
            (Self::Goalkeeper { handling, .. }, PlayerAttributeId::Handling) => Some(*handling),
            (Self::Goalkeeper { mobility, .. }, PlayerAttributeId::Mobility) => Some(*mobility),
            (Self::Goalkeeper { rushing_out, .. }, PlayerAttributeId::RushingOut) => {
                Some(*rushing_out)
            }
            (Self::Goalkeeper { distribution, .. }, PlayerAttributeId::Distribution) => {
                Some(*distribution)
            }
            _ => None,
        }
    }

    fn migrate(self, position: Position) -> Self {
        let Self::Legacy {
            technical,
            physical,
            mental,
            attacking,
            defensive,
            goalkeeping,
        } = self
        else {
            return self;
        };
        if position == Position::Gk {
            Self::Goalkeeper {
                reaction: weighted(&[(goalkeeping, 3), (mental, 1)]),
                positioning: weighted(&[(goalkeeping, 2), (mental, 1), (defensive, 1)]),
                handling: weighted(&[(goalkeeping, 3), (technical, 1)]),
                mobility: weighted(&[(physical, 3), (goalkeeping, 1)]),
                rushing_out: weighted(&[(goalkeeping, 2), (physical, 1), (mental, 1)]),
                distribution: weighted(&[(technical, 3), (goalkeeping, 1)]),
            }
        } else {
            Self::Outfield {
                finishing: weighted(&[(attacking, 3), (technical, 1)]),
                technique: technical,
                passing: weighted(&[(technical, 3), (mental, 1)]),
                tackling: defensive,
                physical,
                pace: weighted(&[(physical, 3), (attacking, 1)]),
            }
        }
    }

    fn physical_profile(&self) -> u8 {
        match self {
            Self::Outfield { physical, pace, .. } => weighted(&[(*physical, 70), (*pace, 30)]),
            Self::Goalkeeper {
                mobility,
                rushing_out,
                ..
            } => weighted(&[(*mobility, 70), (*rushing_out, 30)]),
            Self::Legacy { physical, .. } => *physical,
        }
    }

    fn tactical_reading(&self) -> u8 {
        match self {
            Self::Outfield {
                technique,
                passing,
                tackling,
                ..
            } => weighted(&[(*technique, 35), (*passing, 40), (*tackling, 25)]),
            Self::Goalkeeper {
                positioning,
                handling,
                distribution,
                ..
            } => weighted(&[(*positioning, 45), (*handling, 20), (*distribution, 35)]),
            Self::Legacy {
                technical,
                mental,
                defensive,
                ..
            } => weighted(&[(*technical, 30), (*mental, 50), (*defensive, 20)]),
        }
    }

    fn is_legacy(&self) -> bool {
        matches!(self, Self::Legacy { .. })
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttributeProjection {
    pub attribute_id: String,
    pub label: String,
    pub description: String,
    pub category: PlayerAttributeCategory,
    pub perceived: KnowledgeValue,
    pub confidence: u8,
    pub source: String,
    pub updated_at: u64,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttributeGroupProjection {
    pub category: PlayerAttributeCategory,
    pub label: String,
    pub attributes: Vec<AttributeProjection>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum RatingKind {
    CurrentAbility,
    Position,
    Role,
    TacticalFit,
    Contextual,
    CoachRole,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum RatingFactorImpact {
    Positive,
    Neutral,
    Negative,
    ContextOnly,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RatingFactor {
    pub factor_id: String,
    pub label: String,
    pub value: u8,
    pub weight: u8,
    pub contribution: i16,
    pub impact: RatingFactorImpact,
    pub explanation: String,
    pub source: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplainableRating {
    pub rating_kind: RatingKind,
    pub context_id: String,
    pub context_label: String,
    pub real_value: Option<u8>,
    pub perceived: KnowledgeValue,
    pub confidence: u8,
    pub source: String,
    pub updated_at: u64,
    pub scale_version: String,
    pub factors: Vec<RatingFactor>,
    pub summary: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PositionRatingProjection {
    pub position_id: Position,
    pub suitability: String,
    pub rating: ExplainableRating,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoleRatingProjection {
    pub role_id: String,
    pub role_label: String,
    pub position_id: Position,
    pub responsibilities: Vec<String>,
    pub rating: ExplainableRating,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContractSummary {
    pub club_id: String,
    pub started_at: String,
    pub expires_at: String,
    pub squad_status: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonIdentity {
    pub entity_id: String,
    pub full_name: String,
    pub known_name: String,
    pub nationality: String,
    pub birth_date: String,
    pub age: u8,
    pub club_id: String,
    pub club_name: String,
    pub club_short_name: String,
    pub club_primary_color: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerSportingProfile {
    pub identity: PersonIdentity,
    pub shirt_number: u8,
    pub height_cm: u16,
    pub weight_kg: Option<u16>,
    pub preferred_foot: String,
    pub squad_role: String,
    pub natural_position: Position,
    pub attributes: PlayerAttributeSet,
    pub internal_potential: u8,
    pub contract: Option<ContractSummary>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalPlayerState {
    pub profile: PlayerSportingProfile,
    pub condition: Option<u8>,
    pub match_fitness: Option<u8>,
    pub appearances: u16,
    pub goals: u16,
    pub assists: u16,
    pub average_rating: Option<u8>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PotentialEstimate {
    pub perceived: KnowledgeValue,
    pub confidence: u8,
    pub source: String,
    pub updated_at: u64,
    pub dynamic: bool,
    pub explanation: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RatingSnapshot {
    pub snapshot_id: String,
    pub entity_id: String,
    pub rating_kind: RatingKind,
    pub value: u8,
    pub position_id: Option<Position>,
    pub role_id: Option<String>,
    pub variation_id: Option<String>,
    pub familiarity: Option<u8>,
    pub confidence: u8,
    pub source: String,
    pub recorded_at: u64,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttributeSnapshot {
    pub snapshot_id: String,
    pub player_id: String,
    pub attributes: PlayerAttributeSet,
    pub source: String,
    pub recorded_at: u64,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerDevelopmentProjection {
    pub player_id: String,
    pub current_ability: u8,
    pub potential_estimate: PotentialEstimate,
    pub attribute_history: Vec<AttributeSnapshot>,
    pub rating_history: Vec<RatingSnapshot>,
    pub personality: Option<String>,
    pub professionalism: Option<u8>,
    pub ambition: Option<u8>,
    pub status: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerTrainingProfile {
    pub player_id: String,
    pub preferred_position: Position,
    pub preferred_role_id: String,
    pub future_individual_plan_id: Option<String>,
    pub status: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerStatisticsProjection {
    pub appearances: u16,
    pub minutes: Option<u32>,
    pub goals: u16,
    pub assists: u16,
    pub cards: Option<u16>,
    pub average_rating: Option<u8>,
    pub source: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerProfileProjection {
    pub schema_version: u16,
    pub revision: u64,
    pub identity: PersonIdentity,
    pub shirt_number: u8,
    pub height_cm: u16,
    pub weight_kg: Option<u16>,
    pub preferred_foot: String,
    pub squad_role: String,
    pub natural_position: Position,
    pub current_ability: ExplainableRating,
    pub contextual_rating: ExplainableRating,
    pub tactical_fit: ExplainableRating,
    pub tactical_familiarity: Option<u8>,
    pub position_ratings: Vec<PositionRatingProjection>,
    pub role_ratings: Vec<RoleRatingProjection>,
    pub attribute_groups: Vec<AttributeGroupProjection>,
    pub condition: Option<u8>,
    pub match_fitness: Option<u8>,
    pub form: KnowledgeValue,
    pub potential: PotentialEstimate,
    pub knowledge: ScoutingAssessment,
    pub strengths: Vec<String>,
    pub weaknesses: Vec<String>,
    pub alerts: Vec<String>,
    pub contract: Option<ContractSummary>,
    pub statistics: PlayerStatisticsProjection,
    pub rating_history: Vec<RatingSnapshot>,
    pub development: PlayerDevelopmentProjection,
    pub training: PlayerTrainingProfile,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoachAttributeSet {
    pub tactical: u8,
    pub preparation: u8,
    pub adaptability: u8,
    pub decision_making: u8,
    pub technical_development: u8,
    pub physical_development: u8,
    pub mental_development: u8,
    pub tactical_development: u8,
    pub youth_development: u8,
    pub motivation: u8,
    pub communication: u8,
    pub discipline: u8,
    pub people_management: u8,
    pub ability_judgement: u8,
    pub potential_judgement: u8,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoachSportingProfile {
    pub identity: PersonIdentity,
    pub role: String,
    pub reputation: u8,
    pub qualification: String,
    pub experience_years: u8,
    pub style: String,
    pub preferred_formations: Vec<String>,
    pub attributes: CoachAttributeSet,
    pub specialties: Vec<String>,
    pub contract: Option<ContractSummary>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoachDevelopmentProfile {
    pub coach_id: String,
    pub technical_development: u8,
    pub physical_development: u8,
    pub mental_development: u8,
    pub tactical_development: u8,
    pub youth_development: u8,
    pub position_adaptation: u8,
    pub role_teaching: u8,
    pub motivation: u8,
    pub people_management: u8,
    pub assessment_accuracy: u8,
    pub specialties: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoachProfileProjection {
    pub schema_version: u16,
    pub revision: u64,
    pub identity: PersonIdentity,
    pub role: String,
    pub reputation: KnowledgeValue,
    pub qualification: String,
    pub experience_years: u8,
    pub style: String,
    pub preferred_formations: Vec<String>,
    pub contextual_rating: ExplainableRating,
    pub category_ratings: Vec<ExplainableRating>,
    pub knowledge: ScoutingAssessment,
    pub strengths: Vec<String>,
    pub weaknesses: Vec<String>,
    pub specialties: Vec<String>,
    pub contract: Option<ContractSummary>,
    pub career_history: Vec<String>,
    pub rating_history: Vec<RatingSnapshot>,
    pub development: CoachDevelopmentProfile,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityProfileReference {
    pub entity_id: String,
    pub entity_type: String,
    pub name: String,
    pub secondary_label: String,
    pub route: String,
    pub nationality: Option<String>,
    pub club_id: Option<String>,
    pub visual_code: String,
    pub perceived_rating: Option<KnowledgeValue>,
    pub contract: Option<ContractSummary>,
    pub confidence: Option<u8>,
    pub knowledge_level: KnowledgeLevel,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClubTacticalIdentityProjection {
    pub formation: Option<String>,
    pub mentality: Option<String>,
    pub style: Option<String>,
    pub pressure: Option<u8>,
    pub defensive_line: Option<u8>,
    pub transition: Option<String>,
    pub confidence: u8,
    pub source: String,
    pub updated_at: u64,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClubProfileProjection {
    pub schema_version: u16,
    pub revision: u64,
    pub entity_id: String,
    pub name: String,
    pub short_name: String,
    pub city: String,
    pub primary_color: String,
    pub country_code: Option<String>,
    pub competition_name: Option<String>,
    pub stadium_name: Option<String>,
    pub current_position: Option<u16>,
    pub next_fixture: Option<String>,
    pub form: Vec<String>,
    pub head_coach: Option<EntityProfileReference>,
    pub players: Vec<EntityProfileReference>,
    pub staff: Vec<EntityProfileReference>,
    pub tactics: Option<ClubTacticalIdentityProjection>,
    pub knowledge: ScoutingAssessment,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NationProfileProjection {
    pub schema_version: u16,
    pub revision: u64,
    pub entity_id: String,
    pub name: String,
    pub code: String,
    pub confederation: Option<String>,
    pub clubs: Vec<EntityProfileReference>,
    pub players: Vec<EntityProfileReference>,
    pub coaches: Vec<EntityProfileReference>,
    pub competitions: Vec<String>,
    pub knowledge: ScoutingAssessment,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalProfileSearchResult {
    pub entity_id: String,
    pub entity_type: String,
    pub name: String,
    pub secondary_label: String,
    pub route: String,
    pub knowledge_level: KnowledgeLevel,
    pub context: String,
    pub visual_code: String,
    pub confidence: Option<u8>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileWorld {
    pub schema_version: u16,
    pub revision: u64,
    pub players: Vec<PlayerSportingProfile>,
    pub external_players: Vec<ExternalPlayerState>,
    pub coaches: Vec<CoachSportingProfile>,
    pub assessments: Vec<ScoutingAssessment>,
    pub rating_history: Vec<RatingSnapshot>,
    pub attribute_history: Vec<AttributeSnapshot>,
}

fn clamp_score(value: i16) -> u8 {
    value.clamp(0, 100) as u8
}

fn weighted(parts: &[(u8, u8)]) -> u8 {
    let weight: u32 = parts.iter().map(|(_, weight)| u32::from(*weight)).sum();
    if weight == 0 {
        return 0;
    }
    let total: u32 = parts
        .iter()
        .map(|(value, weight)| u32::from(*value) * u32::from(*weight))
        .sum();
    ((total + weight / 2) / weight).min(100) as u8
}

fn normalize_attribute_values(
    mut values: [u8; 6],
    weights: &[(PlayerAttributeId, u8); 6],
    target: u8,
) -> [u8; 6] {
    let score = |candidate: &[u8; 6]| {
        weighted(
            &candidate
                .iter()
                .zip(weights.iter())
                .map(|(value, (_, weight))| (*value, *weight))
                .collect::<Vec<_>>(),
        )
    };
    let offset = i16::from(target) - i16::from(score(&values));
    for value in &mut values {
        *value = clamp_score(i16::from(*value) + offset);
    }
    for _ in 0..1_200 {
        let current = score(&values);
        if current == target {
            break;
        }
        let increase = current < target;
        let mut changed = false;
        for (index, _) in weights.iter().enumerate() {
            let value = &mut values[index];
            if increase && *value < 100 {
                *value += 1;
                changed = true;
            } else if !increase && *value > 0 {
                *value -= 1;
                changed = true;
            }
            if score(&values) == target {
                return values;
            }
        }
        if !changed {
            break;
        }
    }
    values
}

fn attribute_seed(player: &Player) -> PlayerAttributeSet {
    let base = i16::from(player.rating);
    if player.position == Position::Gk {
        let values = normalize_attribute_values(
            [base + 4, base + 3, base + 2, base, base - 1, base - 3].map(clamp_score),
            &position_weights(Position::Gk),
            player.rating,
        );
        PlayerAttributeSet::Goalkeeper {
            reaction: values[0],
            positioning: values[1],
            handling: values[2],
            mobility: values[3],
            rushing_out: values[4],
            distribution: values[5],
        }
    } else {
        let offsets = match player.position {
            Position::Rb | Position::Lb => [-7, 1, 2, 4, 3, 5],
            Position::Cb => [-12, -2, 1, 6, 5, -1],
            Position::Dm => [-8, 2, 5, 5, 3, -1],
            Position::Cm => [-2, 5, 6, -1, 1, 1],
            Position::Am => [4, 6, 5, -7, -2, 3],
            Position::Rw | Position::Lw => [4, 6, 1, -9, -2, 7],
            Position::St => [7, 3, -3, -12, 4, 4],
            Position::Gk => unreachable!("goleiro tratado acima"),
        };
        let values = normalize_attribute_values(
            offsets.map(|offset| clamp_score(base + offset)),
            &position_weights(player.position),
            player.rating,
        );
        PlayerAttributeSet::Outfield {
            finishing: values[0],
            technique: values[1],
            passing: values[2],
            tackling: values[3],
            physical: values[4],
            pace: values[5],
        }
    }
}

#[cfg(test)]
fn birth_date_for(age: u8, index: usize) -> String {
    let year = 2026_u16.saturating_sub(u16::from(age));
    format!("{year}-{:02}-{:02}", index % 12 + 1, index % 27 + 1)
}

#[cfg(test)]
fn own_player_profile(player: &Player, club: &Club, index: usize) -> PlayerSportingProfile {
    PlayerSportingProfile {
        identity: PersonIdentity {
            entity_id: player.id.clone(),
            full_name: player.name.clone(),
            known_name: player.short_name.clone(),
            nationality: player.nationality.clone(),
            birth_date: birth_date_for(player.age, index),
            age: player.age,
            club_id: club.id.clone(),
            club_name: club.name.clone(),
            club_short_name: club.short_name.clone(),
            club_primary_color: club.primary_color.clone(),
        },
        shirt_number: player.shirt_number,
        height_cm: player.height_cm,
        weight_kg: Some(68 + (index as u16 * 3) % 19),
        preferred_foot: format!("{:?}", player.preferred_foot).to_lowercase(),
        squad_role: format!("{:?}", player.squad_role),
        natural_position: player.position,
        attributes: attribute_seed(player),
        internal_potential: player.potential_rating.max(player.rating),
        contract: Some(ContractSummary {
            club_id: club.id.clone(),
            started_at: "2025-01-01".to_owned(),
            expires_at: format!("20{}-12-31", 27 + index % 4),
            squad_status: format!("{:?}", player.squad_role),
        }),
    }
}

fn assessment(
    entity_id: &str,
    observer_club_id: &str,
    level: KnowledgeLevel,
    confidence: u8,
    source: &str,
    now: u64,
) -> ScoutingAssessment {
    let (known_fields, estimated_fields, hidden_fields) = match level {
        KnowledgeLevel::OwnClub => (
            vec!["identity", "attributes", "condition", "contract"],
            vec!["potential"],
            vec!["internalPotential"],
        ),
        KnowledgeLevel::WellKnown => (
            vec!["identity", "career", "publicStatistics"],
            vec!["attributes", "ratings", "potential"],
            vec!["internalPotential"],
        ),
        KnowledgeLevel::Partial => (
            vec!["identity", "publicStatistics"],
            vec!["attributes", "ratings", "potential"],
            vec!["condition", "internalPotential"],
        ),
        KnowledgeLevel::Limited => (
            vec!["identity"],
            vec!["ratings"],
            vec!["attributes", "condition", "internalPotential"],
        ),
        KnowledgeLevel::Unknown => (
            vec!["identity"],
            vec![],
            vec!["attributes", "ratings", "condition", "internalPotential"],
        ),
    };
    ScoutingAssessment {
        entity_id: entity_id.to_owned(),
        observer_club_id: observer_club_id.to_owned(),
        knowledge_level: level,
        confidence,
        source: source.to_owned(),
        observed_at: now,
        updated_at: now,
        expires_at: (!matches!(level, KnowledgeLevel::OwnClub)).then_some(now + 90 * 86_400_000),
        known_fields: known_fields.into_iter().map(str::to_owned).collect(),
        estimated_fields: estimated_fields.into_iter().map(str::to_owned).collect(),
        hidden_fields: hidden_fields.into_iter().map(str::to_owned).collect(),
        assessment_version: ASSESSMENT_VERSION,
    }
}

#[cfg(test)]
struct ExternalPlayerSeed<'a> {
    id: &'a str,
    name: &'a str,
    known_name: &'a str,
    nationality: &'a str,
    age: u8,
    position: Position,
    rating: u8,
    potential: u8,
    club: &'a Club,
    index: usize,
}

#[cfg(test)]
fn external_player(seed: ExternalPlayerSeed<'_>) -> ExternalPlayerState {
    let ExternalPlayerSeed {
        id,
        name,
        known_name,
        nationality,
        age,
        position,
        rating,
        potential,
        club,
        index,
    } = seed;
    let seed_player = Player {
        id: id.to_owned(),
        name: name.to_owned(),
        short_name: known_name.to_owned(),
        shirt_number: 7 + index as u8,
        position,
        age,
        nationality: nationality.to_owned(),
        height_cm: 176 + index as u16 * 4,
        preferred_foot: crate::PreferredFoot::Right,
        squad_role: crate::SquadRole::KeyPlayer,
        rating,
        potential_rating: potential,
        match_fitness: 91,
        morale: 75,
        condition: 94,
        appearances: 14,
        goals: 2 + index as u16 * 3,
        assists: 1 + index as u16 * 2,
        average_rating: 7.05 + index as f32 * 0.18,
        selected: true,
    };
    ExternalPlayerState {
        profile: PlayerSportingProfile {
            identity: PersonIdentity {
                entity_id: id.to_owned(),
                full_name: name.to_owned(),
                known_name: known_name.to_owned(),
                nationality: nationality.to_owned(),
                birth_date: birth_date_for(age, 20 + index),
                age,
                club_id: club.id.clone(),
                club_name: club.name.clone(),
                club_short_name: club.short_name.clone(),
                club_primary_color: club.primary_color.clone(),
            },
            shirt_number: seed_player.shirt_number,
            height_cm: seed_player.height_cm,
            weight_kg: Some(73 + index as u16 * 4),
            preferred_foot: "right".to_owned(),
            squad_role: "KeyPlayer".to_owned(),
            natural_position: position,
            attributes: attribute_seed(&seed_player),
            internal_potential: potential,
            contract: Some(ContractSummary {
                club_id: club.id.clone(),
                started_at: "2024-01-01".to_owned(),
                expires_at: "2028-12-31".to_owned(),
                squad_status: "Jogador-chave".to_owned(),
            }),
        },
        condition: Some(94),
        match_fitness: Some(91),
        appearances: seed_player.appearances,
        goals: seed_player.goals,
        assists: seed_player.assists,
        average_rating: Some((seed_player.average_rating * 10.0).round() as u8),
    }
}

#[cfg(test)]
fn coach(
    id: &str,
    name: &str,
    nationality: &str,
    age: u8,
    club: &Club,
    own: bool,
) -> CoachSportingProfile {
    let attributes = if own {
        CoachAttributeSet {
            tactical: 79,
            preparation: 76,
            adaptability: 74,
            decision_making: 77,
            technical_development: 81,
            physical_development: 70,
            mental_development: 78,
            tactical_development: 82,
            youth_development: 84,
            motivation: 80,
            communication: 83,
            discipline: 72,
            people_management: 81,
            ability_judgement: 78,
            potential_judgement: 80,
        }
    } else {
        CoachAttributeSet {
            tactical: 82,
            preparation: 80,
            adaptability: 78,
            decision_making: 81,
            technical_development: 74,
            physical_development: 79,
            mental_development: 73,
            tactical_development: 77,
            youth_development: 69,
            motivation: 76,
            communication: 72,
            discipline: 84,
            people_management: 75,
            ability_judgement: 80,
            potential_judgement: 73,
        }
    };
    CoachSportingProfile {
        identity: PersonIdentity {
            entity_id: id.to_owned(),
            full_name: name.to_owned(),
            known_name: name.to_owned(),
            nationality: nationality.to_owned(),
            birth_date: birth_date_for(age, if own { 40 } else { 41 }),
            age,
            club_id: club.id.clone(),
            club_name: club.name.clone(),
            club_short_name: club.short_name.clone(),
            club_primary_color: club.primary_color.clone(),
        },
        role: "Treinador principal".to_owned(),
        reputation: if own { 72 } else { 76 },
        qualification: "Licença Continental Pro".to_owned(),
        experience_years: if own { 11 } else { 15 },
        style: if own {
            "Posse apoiada e desenvolvimento de jovens".to_owned()
        } else {
            "Bloco intenso e transições verticais".to_owned()
        },
        preferred_formations: if own {
            vec!["4-3-3".to_owned(), "4-2-3-1".to_owned()]
        } else {
            vec!["4-4-2".to_owned(), "3-4-2-1".to_owned()]
        },
        attributes,
        specialties: if own {
            vec![
                "Desenvolvimento de jovens".to_owned(),
                "Ensino tático".to_owned(),
            ]
        } else {
            vec![
                "Preparação física".to_owned(),
                "Organização defensiva".to_owned(),
            ]
        },
        contract: Some(ContractSummary {
            club_id: club.id.clone(),
            started_at: "2025-01-01".to_owned(),
            expires_at: "2027-12-31".to_owned(),
            squad_status: "Treinador principal".to_owned(),
        }),
    }
}

impl ProfileWorld {
    pub fn migrate(mut self) -> Result<Self, String> {
        if self.schema_version == PROFILE_WORLD_SCHEMA_VERSION {
            return Ok(self);
        }
        if self.schema_version != 1 {
            return Err("A versão do catálogo de perfis é incompatível.".to_owned());
        }
        let positions: std::collections::HashMap<_, _> = self
            .players
            .iter()
            .chain(self.external_players.iter().map(|player| &player.profile))
            .map(|profile| (profile.identity.entity_id.clone(), profile.natural_position))
            .collect();
        for profile in &mut self.players {
            profile.attributes = profile.attributes.clone().migrate(profile.natural_position);
        }
        for player in &mut self.external_players {
            player.profile.attributes = player
                .profile
                .attributes
                .clone()
                .migrate(player.profile.natural_position);
        }
        for snapshot in &mut self.attribute_history {
            let position = positions
                .get(&snapshot.player_id)
                .copied()
                .unwrap_or(Position::Cm);
            snapshot.attributes = snapshot.attributes.clone().migrate(position);
        }
        self.schema_version = PROFILE_WORLD_SCHEMA_VERSION;
        Ok(self)
    }

    pub fn reconcile_matchday(&mut self, state: &MatchdayState) -> bool {
        let mut changed = false;
        for player in &state.players {
            let Some(profile) = self
                .players
                .iter_mut()
                .find(|profile| profile.identity.entity_id == player.id)
            else {
                continue;
            };
            let current = position_rating(&profile.attributes, profile.natural_position).0;
            if profile.natural_position != player.position
                || profile.attributes.is_legacy()
                || current != player.rating
            {
                profile.natural_position = player.position;
                profile.attributes = attribute_seed(player);
                changed = true;
            }
        }
        if changed {
            self.revision = self.revision.saturating_add(1);
        }
        changed
    }

    pub fn seed(state: &MatchdayState, now: u64) -> Self {
        let mut world = crate::world::bundled_official_world().profiles;
        world.reconcile_matchday(state);
        for assessment in &mut world.assessments {
            if assessment.observed_at == 0 {
                assessment.observed_at = now;
            }
            if assessment.updated_at == 0 {
                assessment.updated_at = now;
            }
        }
        world
    }

    #[cfg(test)]
    #[allow(
        dead_code,
        reason = "legacy fixture retained only for package migration regression"
    )]
    fn legacy_hardcoded_seed(state: &MatchdayState, now: u64) -> Self {
        let players: Vec<_> = state
            .players
            .iter()
            .enumerate()
            .map(|(index, player)| own_player_profile(player, &state.club, index))
            .collect();
        let external_players = vec![
            external_player(ExternalPlayerSeed {
                id: "rv-fdv-01",
                name: "Martín Gouveia",
                known_name: "M. Gouveia",
                nationality: "URU",
                age: 25,
                position: Position::Am,
                rating: 79,
                potential: 82,
                club: &state.opponent,
                index: 0,
            }),
            external_player(ExternalPlayerSeed {
                id: "rv-fdv-02",
                name: "Leandro Vilar",
                known_name: "L. Vilar",
                nationality: "BRA",
                age: 22,
                position: Position::St,
                rating: 76,
                potential: 84,
                club: &state.opponent,
                index: 1,
            }),
            external_player(ExternalPlayerSeed {
                id: "rv-fdv-03",
                name: "Nicolás Arce",
                known_name: "N. Arce",
                nationality: "ARG",
                age: 29,
                position: Position::Cb,
                rating: 77,
                potential: 78,
                club: &state.opponent,
                index: 2,
            }),
        ];
        let coaches = vec![
            coach(
                "coach.aurora.head",
                "Helena Sampaio",
                "BRA",
                43,
                &state.club,
                true,
            ),
            coach(
                "coach.ferroviario.head",
                "Raúl Mendonza",
                "ARG",
                49,
                &state.opponent,
                false,
            ),
        ];
        let mut assessments: Vec<_> = players
            .iter()
            .map(|profile| {
                assessment(
                    &profile.identity.entity_id,
                    &state.club.id,
                    KnowledgeLevel::OwnClub,
                    100,
                    "Comissão técnica e rotina do clube",
                    now,
                )
            })
            .collect();
        assessments.extend([
            assessment(
                "rv-fdv-01",
                &state.club.id,
                KnowledgeLevel::WellKnown,
                82,
                "Partidas anteriores e estatísticas públicas",
                now,
            ),
            assessment(
                "rv-fdv-02",
                &state.club.id,
                KnowledgeLevel::Partial,
                58,
                "Observação parcial da comissão",
                now,
            ),
            assessment(
                "rv-fdv-03",
                &state.club.id,
                KnowledgeLevel::Limited,
                34,
                "Informação pública limitada",
                now,
            ),
            assessment(
                "coach.aurora.head",
                &state.club.id,
                KnowledgeLevel::OwnClub,
                100,
                "Contrato e trabalho diário",
                now,
            ),
            assessment(
                "coach.ferroviario.head",
                &state.club.id,
                KnowledgeLevel::Partial,
                61,
                "Carreira pública e estilo observado",
                now,
            ),
        ]);
        let attribute_history = players
            .iter()
            .map(|profile| AttributeSnapshot {
                snapshot_id: format!("{}.attributes.bootstrap", profile.identity.entity_id),
                player_id: profile.identity.entity_id.clone(),
                attributes: profile.attributes.clone(),
                source: "Marco inicial da Fase 06.4".to_owned(),
                recorded_at: now,
            })
            .collect();
        Self {
            schema_version: PROFILE_WORLD_SCHEMA_VERSION,
            revision: 0,
            players,
            external_players,
            coaches,
            assessments,
            rating_history: Vec::new(),
            attribute_history,
        }
    }

    pub fn validate(&self) -> Result<(), String> {
        if self.schema_version != PROFILE_WORLD_SCHEMA_VERSION {
            return Err("A versão do catálogo de perfis é incompatível.".to_owned());
        }
        let mut ids = std::collections::HashSet::new();
        for id in self
            .players
            .iter()
            .map(|profile| profile.identity.entity_id.as_str())
            .chain(
                self.external_players
                    .iter()
                    .map(|player| player.profile.identity.entity_id.as_str()),
            )
            .chain(
                self.coaches
                    .iter()
                    .map(|profile| profile.identity.entity_id.as_str()),
            )
        {
            if id.is_empty() || !ids.insert(id) {
                return Err("Os perfis precisam de IDs globais estáveis e únicos.".to_owned());
            }
        }
        if self.assessments.iter().any(|assessment| {
            assessment.confidence > 100 || assessment.assessment_version != ASSESSMENT_VERSION
        }) {
            return Err("A avaliação de conhecimento é inválida.".to_owned());
        }
        if self
            .players
            .iter()
            .chain(self.external_players.iter().map(|player| &player.profile))
            .any(|profile| {
                profile.attributes.is_legacy()
                    || profile
                        .attributes
                        .ids()
                        .iter()
                        .filter_map(|attribute| profile.attributes.value(*attribute))
                        .any(|value| value > 100)
            })
            || self
                .attribute_history
                .iter()
                .any(|snapshot| snapshot.attributes.is_legacy())
        {
            return Err(
                "Os atributos do perfil precisam usar o modelo esportivo atual.".to_owned(),
            );
        }
        Ok(())
    }

    fn assessment_for(&self, entity_id: &str, observer_club_id: &str) -> ScoutingAssessment {
        self.assessments
            .iter()
            .find(|assessment| {
                assessment.entity_id == entity_id && assessment.observer_club_id == observer_club_id
            })
            .cloned()
            .unwrap_or_else(|| {
                assessment(
                    entity_id,
                    observer_club_id,
                    KnowledgeLevel::Unknown,
                    0,
                    "Nenhuma fonte disponível",
                    0,
                )
            })
    }

    pub fn search(
        &self,
        state: &MatchdayState,
        observer_club_id: &str,
        query: &str,
    ) -> Vec<GlobalProfileSearchResult> {
        let query = query.trim().to_lowercase();
        let matches = |identity: &PersonIdentity| {
            query.is_empty()
                || identity.full_name.to_lowercase().contains(&query)
                || identity.known_name.to_lowercase().contains(&query)
                || identity.club_name.to_lowercase().contains(&query)
        };
        let mut results: Vec<_> = self
            .players
            .iter()
            .chain(self.external_players.iter().map(|player| &player.profile))
            .filter(|profile| matches(&profile.identity))
            .map(|profile| {
                let knowledge = self.assessment_for(&profile.identity.entity_id, observer_club_id);
                GlobalProfileSearchResult {
                    entity_id: profile.identity.entity_id.clone(),
                    entity_type: "player".to_owned(),
                    name: profile.identity.full_name.clone(),
                    secondary_label: format!(
                        "{} · {:?}",
                        profile.identity.club_name, profile.natural_position
                    ),
                    route: format!("/players/{}", profile.identity.entity_id),
                    knowledge_level: knowledge.knowledge_level,
                    context: format!(
                        "{} · {:?}",
                        profile.identity.club_name, profile.natural_position
                    ),
                    visual_code: format!("{:?}", profile.natural_position),
                    confidence: Some(knowledge.confidence),
                }
            })
            .collect();
        results.extend(
            self.coaches
                .iter()
                .filter(|coach| matches(&coach.identity))
                .map(|coach| {
                    let knowledge =
                        self.assessment_for(&coach.identity.entity_id, observer_club_id);
                    GlobalProfileSearchResult {
                        entity_id: coach.identity.entity_id.clone(),
                        entity_type: "coach".to_owned(),
                        name: coach.identity.full_name.clone(),
                        secondary_label: format!("{} · {}", coach.identity.club_name, coach.role),
                        route: format!("/coaches/{}", coach.identity.entity_id),
                        knowledge_level: knowledge.knowledge_level,
                        context: format!("{} · {}", coach.identity.club_name, coach.role),
                        visual_code: "TEC".to_owned(),
                        confidence: Some(knowledge.confidence),
                    }
                }),
        );
        for club in [&state.club, &state.opponent] {
            if query.is_empty()
                || club.name.to_lowercase().contains(&query)
                || club.short_name.to_lowercase().contains(&query)
                || club.city.to_lowercase().contains(&query)
            {
                let own = club.id == observer_club_id;
                let (_, competition_name, _) = club_metadata(club);
                results.push(GlobalProfileSearchResult {
                    entity_id: club.id.clone(),
                    entity_type: "club".to_owned(),
                    name: club.name.clone(),
                    secondary_label: competition_name.unwrap_or_else(|| club.city.clone()),
                    route: format!("/clubs/{}", club.id),
                    knowledge_level: if own {
                        KnowledgeLevel::OwnClub
                    } else {
                        KnowledgeLevel::Partial
                    },
                    context: format!("{} · {}", club.city, club.short_name),
                    visual_code: club.short_name.clone(),
                    confidence: Some(if own { 100 } else { 61 }),
                });
            }
        }
        for (code, name, confederation) in nation_catalog() {
            if query.is_empty()
                || code.to_lowercase().contains(&query)
                || name.to_lowercase().contains(&query)
                || confederation.to_lowercase().contains(&query)
            {
                let known_count = self
                    .players
                    .iter()
                    .chain(self.external_players.iter().map(|player| &player.profile))
                    .filter(|profile| {
                        canonical_nation_code(&profile.identity.nationality) == Some(*code)
                    })
                    .count()
                    + self
                        .coaches
                        .iter()
                        .filter(|coach| {
                            canonical_nation_code(&coach.identity.nationality) == Some(*code)
                        })
                        .count();
                results.push(GlobalProfileSearchResult {
                    entity_id: code.to_lowercase(),
                    entity_type: "nation".to_owned(),
                    name: (*name).to_owned(),
                    secondary_label: format!("{code} · {known_count} entidades conhecidas"),
                    route: format!("/nations/{}", code.to_lowercase()),
                    knowledge_level: KnowledgeLevel::WellKnown,
                    context: (*confederation).to_owned(),
                    visual_code: (*code).to_owned(),
                    confidence: None,
                });
            }
        }
        results.sort_by(|left, right| left.name.cmp(&right.name));
        results
    }
}

fn nation_catalog() -> &'static [(&'static str, &'static str, &'static str)] {
    &[
        ("ARG", "Argentina", "CONMEBOL"),
        ("BRA", "Brasil", "CONMEBOL"),
        ("PRT", "Portugal", "UEFA"),
        ("URY", "Uruguai", "CONMEBOL"),
    ]
}

fn canonical_nation_code(value: &str) -> Option<&'static str> {
    match value.trim().to_uppercase().as_str() {
        "AR" | "ARG" => Some("ARG"),
        "BR" | "BRA" => Some("BRA"),
        "PT" | "POR" | "PRT" => Some("PRT"),
        "UY" | "URU" | "URY" => Some("URY"),
        _ => None,
    }
}

fn profile_ability(profile: &PlayerSportingProfile) -> u8 {
    position_rating(&profile.attributes, profile.natural_position).0
}

fn player_reference(
    world: &ProfileWorld,
    profile: &PlayerSportingProfile,
    observer_club_id: &str,
) -> EntityProfileReference {
    let knowledge = world.assessment_for(&profile.identity.entity_id, observer_club_id);
    EntityProfileReference {
        entity_id: profile.identity.entity_id.clone(),
        entity_type: "player".to_owned(),
        name: profile.identity.full_name.clone(),
        secondary_label: format!("{} · {:?}", profile.identity.age, profile.natural_position),
        route: format!("/players/{}", profile.identity.entity_id),
        nationality: Some(profile.identity.nationality.clone()),
        club_id: Some(profile.identity.club_id.clone()),
        visual_code: format!("{:?}", profile.natural_position),
        perceived_rating: Some(perceived(profile_ability(profile), &knowledge, true)),
        contract: profile.contract.clone(),
        confidence: Some(knowledge.confidence),
        knowledge_level: knowledge.knowledge_level,
    }
}

fn coach_reference(
    world: &ProfileWorld,
    coach: &CoachSportingProfile,
    observer_club_id: &str,
) -> EntityProfileReference {
    let knowledge = world.assessment_for(&coach.identity.entity_id, observer_club_id);
    EntityProfileReference {
        entity_id: coach.identity.entity_id.clone(),
        entity_type: "coach".to_owned(),
        name: coach.identity.full_name.clone(),
        secondary_label: coach.role.clone(),
        route: format!("/coaches/{}", coach.identity.entity_id),
        nationality: Some(coach.identity.nationality.clone()),
        club_id: Some(coach.identity.club_id.clone()),
        visual_code: "TEC".to_owned(),
        perceived_rating: Some(perceived(coach.reputation, &knowledge, true)),
        contract: coach.contract.clone(),
        confidence: Some(knowledge.confidence),
        knowledge_level: knowledge.knowledge_level,
    }
}

fn club_reference(club: &Club, observer_club_id: &str) -> EntityProfileReference {
    let own = club.id == observer_club_id;
    let (country_code, _, _) = club_metadata(club);
    EntityProfileReference {
        entity_id: club.id.clone(),
        entity_type: "club".to_owned(),
        name: club.name.clone(),
        secondary_label: club.city.clone(),
        route: format!("/clubs/{}", club.id),
        nationality: country_code,
        club_id: Some(club.id.clone()),
        visual_code: club.short_name.clone(),
        perceived_rating: None,
        contract: None,
        confidence: Some(if own { 100 } else { 61 }),
        knowledge_level: if own {
            KnowledgeLevel::OwnClub
        } else {
            KnowledgeLevel::Partial
        },
    }
}

fn club_metadata(club: &Club) -> (Option<String>, Option<String>, Option<String>) {
    let defaults = MatchdayState::default();
    let canonical = [&defaults.club, &defaults.opponent]
        .into_iter()
        .find(|candidate| candidate.id == club.id);
    (
        club.country_code
            .clone()
            .or_else(|| canonical.and_then(|candidate| candidate.country_code.clone())),
        club.competition_name
            .clone()
            .or_else(|| canonical.and_then(|candidate| candidate.competition_name.clone())),
        club.stadium_name
            .clone()
            .or_else(|| canonical.and_then(|candidate| candidate.stadium_name.clone())),
    )
}

pub fn project_club_profile(
    world: &ProfileWorld,
    state: &MatchdayState,
    club_id: &str,
    observer_club_id: &str,
    now: u64,
) -> Result<ClubProfileProjection, String> {
    let club = [&state.club, &state.opponent]
        .into_iter()
        .find(|club| club.id == club_id)
        .ok_or_else(|| "Clube não encontrado.".to_owned())?;
    let (country_code, competition_name, stadium_name) = club_metadata(club);
    let own = club.id == observer_club_id;
    let players = world
        .players
        .iter()
        .chain(world.external_players.iter().map(|player| &player.profile))
        .filter(|profile| profile.identity.club_id == club.id)
        .map(|profile| player_reference(world, profile, observer_club_id))
        .collect();
    let staff: Vec<_> = world
        .coaches
        .iter()
        .filter(|coach| coach.identity.club_id == club.id)
        .map(|coach| coach_reference(world, coach, observer_club_id))
        .collect();
    let head_coach = staff.first().cloned();
    let tactics = own
        .then(|| {
            state
                .tactical_library
                .as_ref()
                .and_then(|library| {
                    library
                        .variations
                        .iter()
                        .find(|plan| plan.variation_id == library.active_variation_id)
                })
                .or(state.tactical_plan.as_ref())
        })
        .flatten()
        .map(|plan| {
            let model = plan.tactical_model.as_ref();
            ClubTacticalIdentityProjection {
                formation: Some(format!("{:?}", plan.formation)),
                mentality: model.map(|value| value.resolved_strategy.mentality.clone()),
                style: model.map(|value| format!("{:?}", value.config.strategy.preset_id)),
                pressure: model.map(|value| value.config.strategy.out_of_possession.pressure),
                defensive_line: model
                    .map(|value| value.config.strategy.out_of_possession.defensive_line),
                transition: model.map(|value| {
                    format!(
                        "{:?} / {:?}",
                        value.config.strategy.transitions.loss_reaction,
                        value.config.strategy.transitions.regain_reaction
                    )
                }),
                confidence: 100,
                source: "Plano tático ativo do clube".to_owned(),
                updated_at: plan.updated_at,
            }
        });
    Ok(ClubProfileProjection {
        schema_version: PROFILE_PROJECTION_SCHEMA_VERSION,
        revision: world.revision,
        entity_id: club.id.clone(),
        name: club.name.clone(),
        short_name: club.short_name.clone(),
        city: club.city.clone(),
        primary_color: club.primary_color.clone(),
        country_code,
        competition_name,
        stadium_name,
        current_position: None,
        next_fixture: None,
        form: Vec::new(),
        head_coach,
        players,
        staff,
        tactics,
        knowledge: assessment(
            &format!("club:{}", club.id),
            observer_club_id,
            if own {
                KnowledgeLevel::OwnClub
            } else {
                KnowledgeLevel::Partial
            },
            if own { 100 } else { 61 },
            if own {
                "Cadastro e rotina do clube"
            } else {
                "Próximo adversário e observação disponível"
            },
            now,
        ),
    })
}

pub fn project_nation_profile(
    world: &ProfileWorld,
    state: &MatchdayState,
    nation_id: &str,
    observer_club_id: &str,
    now: u64,
) -> Result<NationProfileProjection, String> {
    let code =
        canonical_nation_code(nation_id).ok_or_else(|| "Nação não encontrada.".to_owned())?;
    let (_, name, confederation) = nation_catalog()
        .iter()
        .find(|(candidate, _, _)| *candidate == code)
        .ok_or_else(|| "Nação não encontrada.".to_owned())?;
    let clubs: Vec<_> = [&state.club, &state.opponent]
        .into_iter()
        .filter(|club| {
            club_metadata(club)
                .0
                .as_deref()
                .and_then(canonical_nation_code)
                == Some(code)
        })
        .map(|club| club_reference(club, observer_club_id))
        .collect();
    let players = world
        .players
        .iter()
        .chain(world.external_players.iter().map(|player| &player.profile))
        .filter(|profile| canonical_nation_code(&profile.identity.nationality) == Some(code))
        .map(|profile| player_reference(world, profile, observer_club_id))
        .collect();
    let coaches = world
        .coaches
        .iter()
        .filter(|coach| canonical_nation_code(&coach.identity.nationality) == Some(code))
        .map(|coach| coach_reference(world, coach, observer_club_id))
        .collect();
    let mut competitions: Vec<_> = [&state.club, &state.opponent]
        .into_iter()
        .filter(|club| {
            club_metadata(club)
                .0
                .as_deref()
                .and_then(canonical_nation_code)
                == Some(code)
        })
        .filter_map(|club| club_metadata(club).1)
        .collect();
    competitions.sort();
    competitions.dedup();
    Ok(NationProfileProjection {
        schema_version: PROFILE_PROJECTION_SCHEMA_VERSION,
        revision: world.revision,
        entity_id: code.to_lowercase(),
        name: (*name).to_owned(),
        code: code.to_owned(),
        confederation: Some((*confederation).to_owned()),
        clubs,
        players,
        coaches,
        competitions,
        knowledge: assessment(
            &format!("nation:{}", code.to_lowercase()),
            observer_club_id,
            KnowledgeLevel::WellKnown,
            100,
            "Identidade pública e universo atualmente carregado",
            now,
        ),
    })
}

fn position_weights(position: Position) -> [(PlayerAttributeId, u8); 6] {
    use PlayerAttributeId as Attribute;
    match position {
        Position::Gk => [
            (Attribute::Reaction, 25),
            (Attribute::Positioning, 20),
            (Attribute::Handling, 20),
            (Attribute::Mobility, 15),
            (Attribute::RushingOut, 10),
            (Attribute::Distribution, 10),
        ],
        Position::Rb | Position::Lb => [
            (Attribute::Finishing, 5),
            (Attribute::Technique, 15),
            (Attribute::Passing, 15),
            (Attribute::Tackling, 25),
            (Attribute::Physical, 20),
            (Attribute::Pace, 20),
        ],
        Position::Cb => [
            (Attribute::Finishing, 0),
            (Attribute::Technique, 10),
            (Attribute::Passing, 15),
            (Attribute::Tackling, 35),
            (Attribute::Physical, 25),
            (Attribute::Pace, 15),
        ],
        Position::Dm => [
            (Attribute::Finishing, 5),
            (Attribute::Technique, 15),
            (Attribute::Passing, 25),
            (Attribute::Tackling, 25),
            (Attribute::Physical, 20),
            (Attribute::Pace, 10),
        ],
        Position::Cm => [
            (Attribute::Finishing, 10),
            (Attribute::Technique, 25),
            (Attribute::Passing, 30),
            (Attribute::Tackling, 10),
            (Attribute::Physical, 15),
            (Attribute::Pace, 10),
        ],
        Position::Am => [
            (Attribute::Finishing, 20),
            (Attribute::Technique, 25),
            (Attribute::Passing, 25),
            (Attribute::Tackling, 5),
            (Attribute::Physical, 10),
            (Attribute::Pace, 15),
        ],
        Position::Rw | Position::Lw => [
            (Attribute::Finishing, 20),
            (Attribute::Technique, 25),
            (Attribute::Passing, 15),
            (Attribute::Tackling, 5),
            (Attribute::Physical, 10),
            (Attribute::Pace, 25),
        ],
        Position::St => [
            (Attribute::Finishing, 35),
            (Attribute::Technique, 20),
            (Attribute::Passing, 10),
            (Attribute::Tackling, 0),
            (Attribute::Physical, 20),
            (Attribute::Pace, 15),
        ],
    }
}

fn position_rating(attributes: &PlayerAttributeSet, position: Position) -> (u8, Vec<RatingFactor>) {
    let weights = position_weights(position);
    let value = weighted(
        &weights
            .iter()
            .filter_map(|(attribute, weight)| {
                attributes.value(*attribute).map(|value| (value, *weight))
            })
            .collect::<Vec<_>>(),
    );
    let factors = weights
        .into_iter()
        .filter(|(_, weight)| *weight > 0)
        .filter_map(|(attribute, weight)| {
            let factor_value = attributes.value(attribute)?;
            RatingFactor {
                factor_id: format!("attribute.{}", attribute.id()),
                label: attribute.label().to_owned(),
                value: factor_value,
                weight,
                contribution: i16::from(factor_value) * i16::from(weight) / 100,
                impact: if factor_value >= 75 {
                    RatingFactorImpact::Positive
                } else if factor_value < 60 {
                    RatingFactorImpact::Negative
                } else {
                    RatingFactorImpact::Neutral
                },
                explanation: format!(
                    "{} responde por {weight}% da avaliação desta posição.",
                    attribute.label()
                ),
                source: "Atributos autoritativos do perfil".to_owned(),
            }
            .into()
        })
        .collect();
    (value, factors)
}

fn perceived(value: u8, knowledge: &ScoutingAssessment, allow_exact: bool) -> KnowledgeValue {
    match knowledge.knowledge_level {
        KnowledgeLevel::OwnClub if allow_exact => KnowledgeValue::exact(value),
        KnowledgeLevel::WellKnown => KnowledgeValue::range(value, 2),
        KnowledgeLevel::Partial => KnowledgeValue::range(value, 5),
        KnowledgeLevel::Limited => KnowledgeValue::qualitative(value),
        KnowledgeLevel::Unknown => KnowledgeValue::unknown(),
        KnowledgeLevel::OwnClub => KnowledgeValue::range(value, 3),
    }
}

fn rating(
    kind: RatingKind,
    context_id: impl Into<String>,
    context_label: impl Into<String>,
    value: u8,
    factors: Vec<RatingFactor>,
    knowledge: &ScoutingAssessment,
    summary: impl Into<String>,
) -> ExplainableRating {
    let exact = matches!(knowledge.knowledge_level, KnowledgeLevel::OwnClub);
    ExplainableRating {
        rating_kind: kind,
        context_id: context_id.into(),
        context_label: context_label.into(),
        real_value: exact.then_some(value),
        perceived: perceived(value, knowledge, true),
        confidence: knowledge.confidence,
        source: knowledge.source.clone(),
        updated_at: knowledge.updated_at,
        scale_version: RATING_SCALE_VERSION.to_owned(),
        factors,
        summary: summary.into(),
    }
}

fn default_role(position: Position) -> (&'static str, &'static str, [&'static str; 2]) {
    match position {
        Position::Gk => (
            "goalkeeper-support",
            "Goleiro · Apoio",
            ["Defender a meta", "Iniciar curto"],
        ),
        Position::Rb | Position::Lb => (
            "fullback-support",
            "Lateral · Apoio",
            ["Dar amplitude", "Proteger corredor"],
        ),
        Position::Cb => (
            "central-defender-defend",
            "Zagueiro · Defesa",
            ["Proteger profundidade", "Vencer duelos"],
        ),
        Position::Dm => (
            "holding-midfielder-support",
            "Volante · Suporte",
            ["Proteger entrelinhas", "Circular seguro"],
        ),
        Position::Cm => (
            "central-midfielder-support",
            "Meia central · Suporte",
            ["Conectar setores", "Dar continuidade"],
        ),
        Position::Am => (
            "playmaker-attack",
            "Armador · Ataque",
            ["Criar entrelinhas", "Acelerar o último passe"],
        ),
        Position::Rw | Position::Lw => (
            "winger-attack",
            "Extremo · Ataque",
            ["Atacar largura", "Chegar à área"],
        ),
        Position::St => (
            "striker-attack",
            "Atacante · Ataque",
            ["Atacar profundidade", "Finalizar"],
        ),
    }
}

fn tactical_context<'a>(
    state: &'a MatchdayState,
    variation_id: Option<&str>,
) -> Option<(&'a str, &'a TacticalModelSnapshot)> {
    let library = state.tactical_library.as_ref()?;
    let id = variation_id.unwrap_or(&library.active_variation_id);
    library
        .variations
        .iter()
        .find(|variation| variation.variation_id == id)
        .and_then(|variation| {
            variation
                .tactical_model
                .as_ref()
                .map(|model| (variation.variation_id.as_str(), model))
        })
}

fn attribute_groups(
    attributes: &PlayerAttributeSet,
    knowledge: &ScoutingAssessment,
) -> Vec<AttributeGroupProjection> {
    let category = attributes.category();
    vec![AttributeGroupProjection {
        category,
        label: category.label().to_owned(),
        attributes: attributes
            .ids()
            .iter()
            .filter_map(|attribute| {
                let value = attributes.value(*attribute)?;
                Some(AttributeProjection {
                    attribute_id: format!("attribute.{}", attribute.id()),
                    label: attribute.label().to_owned(),
                    description: attribute.description().to_owned(),
                    category,
                    perceived: perceived(value, knowledge, true),
                    confidence: knowledge.confidence,
                    source: knowledge.source.clone(),
                    updated_at: knowledge.updated_at,
                })
            })
            .collect(),
    }]
}

fn contextual_player_rating(
    profile: &PlayerSportingProfile,
    state: &MatchdayState,
    variation_id: Option<&str>,
    knowledge: &ScoutingAssessment,
) -> (
    ExplainableRating,
    ExplainableRating,
    Option<u8>,
    Position,
    String,
) {
    let (active_variation_id, model) = tactical_context(state, variation_id)
        .map(|(id, model)| (Some(id), Some(model)))
        .unwrap_or((None, None));
    let placement = active_variation_id.and_then(|id| {
        state
            .tactical_library
            .as_ref()?
            .variations
            .iter()
            .find(|variation| variation.variation_id == id)?
            .placements
            .iter()
            .find(|placement| placement.player_id == profile.identity.entity_id)
    });
    let position = placement.map_or(profile.natural_position, |placement| placement.position_id);
    let (position_value, _) = position_rating(&profile.attributes, position);
    let (default_role_id, default_role_label, _) = default_role(position);
    let role_id = placement
        .and_then(|placement| placement.role_id.as_deref())
        .unwrap_or(default_role_id)
        .to_owned();
    let role_value = position_value;
    let familiarity = model.and_then(|model| {
        model
            .familiarity
            .individuals
            .iter()
            .find(|candidate| candidate.player_id == profile.identity.entity_id)
            .map(|candidate| candidate.contextual)
    });
    let physical_profile = profile.attributes.physical_profile();
    let tactical_reading = profile.attributes.tactical_reading();
    let tactical_fit_value = model.map_or(65, |model| {
        let demand_match = 100_u8.abs_diff(model.resolved_strategy.physical_demand);
        let physical_fit = 100_u8
            .saturating_sub(physical_profile.abs_diff(model.resolved_strategy.physical_demand));
        weighted(&[
            (physical_fit, 45),
            (tactical_reading, 35),
            (100 - demand_match / 2, 20),
        ])
    });
    let tactical_factors = vec![
        RatingFactor {
            factor_id: "tactical.physicalDemand".to_owned(),
            label: "Exigência física".to_owned(),
            value: physical_profile,
            weight: 45,
            contribution: i16::from(physical_profile) * 45 / 100,
            impact: RatingFactorImpact::Neutral,
            explanation:
                "Compara o físico estrutural à exigência da variação, sem usar condição momentânea."
                    .to_owned(),
            source: "TacticalModelSnapshot schema 2".to_owned(),
        },
        RatingFactor {
            factor_id: "tactical.mental".to_owned(),
            label: "Leitura do plano".to_owned(),
            value: tactical_reading,
            weight: 35,
            contribution: i16::from(tactical_reading) * 35 / 100,
            impact: RatingFactorImpact::Neutral,
            explanation:
                "Representa capacidade mental para executar responsabilidades desta estrutura."
                    .to_owned(),
            source: "Atributos autoritativos + snapshot tático".to_owned(),
        },
    ];
    let tactical_fit = rating(
        RatingKind::TacticalFit,
        active_variation_id.unwrap_or("no-active-variation"),
        active_variation_id.map_or("Sem variação ativa", |_| "Encaixe na variação ativa"),
        tactical_fit_value,
        tactical_factors,
        knowledge,
        "Compatibilidade estrutural com a variação; não inclui condição, forma ou potencial.",
    );
    let familiarity_value = familiarity.unwrap_or(65);
    let contextual_value = weighted(&[
        (position_value, 50),
        (role_value, 20),
        (tactical_fit_value, 20),
        (familiarity_value, 10),
    ]);
    let contextual = rating(
        RatingKind::Contextual,
        active_variation_id.unwrap_or("profile-context"),
        format!(
            "{} · {default_role_label}",
            format!("{position:?}").to_uppercase()
        ),
        contextual_value,
        vec![
            RatingFactor {
                factor_id: "context.position".to_owned(),
                label: "Rating por posição".to_owned(),
                value: position_value,
                weight: 50,
                contribution: i16::from(position_value) / 2,
                impact: RatingFactorImpact::Neutral,
                explanation: "Qualidade estrutural no espaço nominal selecionado.".to_owned(),
                source: "Motor de ratings 0–100 v1".to_owned(),
            },
            RatingFactor {
                factor_id: "context.role".to_owned(),
                label: "Rating por função".to_owned(),
                value: role_value,
                weight: 20,
                contribution: i16::from(role_value) / 5,
                impact: RatingFactorImpact::Neutral,
                explanation: "Qualidade para cumprir as responsabilidades da função.".to_owned(),
                source: "Motor de ratings 0–100 v1".to_owned(),
            },
            RatingFactor {
                factor_id: "context.tacticalFit".to_owned(),
                label: "Encaixe tático".to_owned(),
                value: tactical_fit_value,
                weight: 20,
                contribution: i16::from(tactical_fit_value) / 5,
                impact: RatingFactorImpact::Neutral,
                explanation: "Compatibilidade com exigências e responsabilidades da variação."
                    .to_owned(),
                source: "TacticalModelSnapshot schema 2".to_owned(),
            },
            RatingFactor {
                factor_id: "context.familiarity".to_owned(),
                label: "Familiaridade".to_owned(),
                value: familiarity_value,
                weight: 10,
                contribution: i16::from(familiarity_value) / 10,
                impact: RatingFactorImpact::ContextOnly,
                explanation:
                    "Conhecimento do plano vindo diretamente da 06.3; contado uma única vez."
                        .to_owned(),
                source: "TacticalFamiliaritySnapshot schema 1".to_owned(),
            },
        ],
        knowledge,
        "Estimativa contextual. Condição, forma e potencial permanecem separados.",
    );
    (contextual, tactical_fit, familiarity, position, role_id)
}

fn profile_for<'a>(world: &'a ProfileWorld, player_id: &str) -> Option<&'a PlayerSportingProfile> {
    world
        .players
        .iter()
        .find(|profile| profile.identity.entity_id == player_id)
        .or_else(|| {
            world
                .external_players
                .iter()
                .find(|player| player.profile.identity.entity_id == player_id)
                .map(|player| &player.profile)
        })
}

fn state_for_player(
    world: &ProfileWorld,
    state: &MatchdayState,
    player_id: &str,
) -> (Option<u8>, Option<u8>, u16, u16, u16, Option<u8>) {
    if let Some(player) = state.players.iter().find(|player| player.id == player_id) {
        return (
            Some(player.condition),
            Some(player.match_fitness),
            player.appearances,
            player.goals,
            player.assists,
            Some((player.average_rating * 10.0).round() as u8),
        );
    }
    world
        .external_players
        .iter()
        .find(|player| player.profile.identity.entity_id == player_id)
        .map(|player| {
            (
                player.condition,
                player.match_fitness,
                player.appearances,
                player.goals,
                player.assists,
                player.average_rating,
            )
        })
        .unwrap_or((None, None, 0, 0, 0, None))
}

pub fn project_player_profile(
    world: &mut ProfileWorld,
    state: &MatchdayState,
    player_id: &str,
    observer_club_id: &str,
    variation_id: Option<&str>,
    now: u64,
) -> Result<PlayerProfileProjection, String> {
    world.validate()?;
    let profile = profile_for(world, player_id)
        .cloned()
        .ok_or_else(|| "Jogador não encontrado.".to_owned())?;
    let knowledge = world.assessment_for(player_id, observer_club_id);
    let (current_value, current_factors) =
        position_rating(&profile.attributes, profile.natural_position);
    let current_ability = rating(
        RatingKind::CurrentAbility,
        "structural",
        "Capacidade atual estrutural",
        current_value,
        current_factors,
        &knowledge,
        "Qualidade estrutural sem condição, forma, familiaridade ou potencial.",
    );
    let (contextual_rating, tactical_fit, familiarity, active_position, role_id) =
        contextual_player_rating(&profile, state, variation_id, &knowledge);
    let positions = [
        Position::Gk,
        Position::Rb,
        Position::Cb,
        Position::Lb,
        Position::Dm,
        Position::Cm,
        Position::Am,
        Position::Rw,
        Position::Lw,
        Position::St,
    ];
    let mut position_ratings: Vec<_> = positions
        .into_iter()
        .filter(|position| match profile.attributes.category() {
            PlayerAttributeCategory::Goalkeeper => *position == Position::Gk,
            PlayerAttributeCategory::Outfield => *position != Position::Gk,
        })
        .map(|position| {
            let (value, factors) = position_rating(&profile.attributes, position);
            let suitability = if position == profile.natural_position {
                "Natural"
            } else if value + 6 >= current_value {
                "Aceitável"
            } else {
                "Improvisada"
            };
            PositionRatingProjection {
                position_id: position,
                suitability: suitability.to_owned(),
                rating: rating(
                    RatingKind::Position,
                    format!("position.{position:?}").to_lowercase(),
                    format!("Rating como {position:?}"),
                    value,
                    factors,
                    &knowledge,
                    "Qualidade estrutural para este espaço nominal.",
                ),
            }
        })
        .collect();
    position_ratings.sort_by(|left, right| {
        right
            .rating
            .real_value
            .unwrap_or(right.rating.perceived.maximum.unwrap_or(0))
            .cmp(
                &left
                    .rating
                    .real_value
                    .unwrap_or(left.rating.perceived.maximum.unwrap_or(0)),
            )
    });
    let (default_role_id, default_role_label, responsibilities) = default_role(active_position);
    let role_value = position_rating(&profile.attributes, active_position).0;
    let role_rating = rating(
        RatingKind::Role,
        role_id.clone(),
        default_role_label,
        role_value,
        vec![RatingFactor {
            factor_id: "role.positionBase".to_owned(),
            label: "Base posicional".to_owned(),
            value: role_value,
            weight: 100,
            contribution: i16::from(role_value),
            impact: RatingFactorImpact::Neutral,
            explanation: "A função especializa a posição sem duplicar o peso dos mesmos atributos."
                .to_owned(),
            source: "Motor de ratings 0–100 v1".to_owned(),
        }],
        &knowledge,
        "Qualidade para as responsabilidades desta função.",
    );
    let role_ratings = vec![RoleRatingProjection {
        role_id: if role_id.is_empty() {
            default_role_id.to_owned()
        } else {
            role_id.clone()
        },
        role_label: default_role_label.to_owned(),
        position_id: active_position,
        responsibilities: responsibilities.into_iter().map(str::to_owned).collect(),
        rating: role_rating,
    }];
    let potential = PotentialEstimate {
        perceived: perceived(profile.internal_potential, &knowledge, false),
        confidence: if matches!(knowledge.knowledge_level, KnowledgeLevel::OwnClub) {
            82
        } else {
            knowledge.confidence.saturating_sub(8)
        },
        source: knowledge.source.clone(),
        updated_at: knowledge.updated_at,
        dynamic: false,
        explanation: "Estimativa atual; potencial dinâmico pertence à Fase 06.8.".to_owned(),
    };
    let (condition, match_fitness, appearances, goals, assists, average_rating) =
        state_for_player(world, state, player_id);
    let exact_state = matches!(knowledge.knowledge_level, KnowledgeLevel::OwnClub);
    let visible_condition = exact_state.then_some(condition).flatten();
    let visible_fitness = exact_state.then_some(match_fitness).flatten();
    let form = average_rating.map_or_else(KnowledgeValue::unknown, |value| {
        perceived(value, &knowledge, true)
    });
    let snapshot = RatingSnapshot {
        snapshot_id: format!(
            "{}.{}.{}.{}",
            player_id,
            contextual_rating.context_id,
            contextual_rating
                .real_value
                .unwrap_or(contextual_rating.perceived.maximum.unwrap_or(0)),
            world.revision + 1
        ),
        entity_id: player_id.to_owned(),
        rating_kind: RatingKind::Contextual,
        value: contextual_rating
            .real_value
            .unwrap_or(contextual_rating.perceived.maximum.unwrap_or(current_value)),
        position_id: Some(active_position),
        role_id: Some(role_id),
        variation_id: variation_id.map(str::to_owned).or_else(|| {
            state
                .tactical_library
                .as_ref()
                .map(|library| library.active_variation_id.clone())
        }),
        familiarity,
        confidence: knowledge.confidence,
        source: knowledge.source.clone(),
        recorded_at: now,
    };
    let should_record = world
        .rating_history
        .iter()
        .rev()
        .find(|candidate| candidate.entity_id == player_id)
        .is_none_or(|previous| {
            previous.value != snapshot.value
                || previous.position_id != snapshot.position_id
                || previous.role_id != snapshot.role_id
                || previous.variation_id != snapshot.variation_id
                || previous.familiarity != snapshot.familiarity
                || previous.confidence != snapshot.confidence
        });
    if should_record {
        world.rating_history.push(snapshot);
        world.revision += 1;
    }
    let rating_history: Vec<_> = world
        .rating_history
        .iter()
        .filter(|snapshot| snapshot.entity_id == player_id)
        .cloned()
        .collect();
    let attribute_history: Vec<_> = world
        .attribute_history
        .iter()
        .filter(|snapshot| snapshot.player_id == player_id)
        .cloned()
        .collect();
    let mut ranked: Vec<_> = profile
        .attributes
        .ids()
        .iter()
        .filter_map(|attribute| {
            profile
                .attributes
                .value(*attribute)
                .map(|value| (attribute.label().to_owned(), value))
        })
        .collect();
    ranked.sort_by_key(|(_, value)| *value);
    let weaknesses = ranked
        .iter()
        .take(2)
        .map(|(label, _)| label.clone())
        .collect();
    let strengths = ranked
        .iter()
        .rev()
        .take(2)
        .map(|(label, _)| label.clone())
        .collect();
    let mut alerts = Vec::new();
    if knowledge.confidence < 60 {
        alerts.push(
            "Avaliação com baixa confiança; valores aparecem como faixa ou descrição.".to_owned(),
        );
    }
    if knowledge
        .expires_at
        .is_some_and(|expires_at| expires_at <= now)
    {
        alerts
            .push("Informação desatualizada; solicite nova observação em fase futura.".to_owned());
    }
    if condition.is_some_and(|value| value < 90) && exact_state {
        alerts.push("Condição atual requer atenção antes da próxima partida.".to_owned());
    }
    let development = PlayerDevelopmentProjection {
        player_id: player_id.to_owned(),
        current_ability: current_value,
        potential_estimate: potential.clone(),
        attribute_history,
        rating_history: rating_history.clone(),
        personality: None,
        professionalism: None,
        ambition: None,
        status: "Fundação disponível; progressão dinâmica ainda não implementada.".to_owned(),
    };
    Ok(PlayerProfileProjection {
        schema_version: PROFILE_PROJECTION_SCHEMA_VERSION,
        revision: world.revision,
        identity: profile.identity,
        shirt_number: profile.shirt_number,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        preferred_foot: profile.preferred_foot,
        squad_role: profile.squad_role,
        natural_position: profile.natural_position,
        current_ability,
        contextual_rating,
        tactical_fit,
        tactical_familiarity: familiarity,
        position_ratings,
        role_ratings,
        attribute_groups: attribute_groups(&profile.attributes, &knowledge),
        condition: visible_condition,
        match_fitness: visible_fitness,
        form,
        potential: potential.clone(),
        knowledge: knowledge.clone(),
        strengths,
        weaknesses,
        alerts,
        contract: profile.contract,
        statistics: PlayerStatisticsProjection {
            appearances,
            minutes: None,
            goals,
            assists,
            cards: None,
            average_rating,
            source: if exact_state {
                "Registro da carreira".to_owned()
            } else {
                "Estatísticas públicas disponíveis".to_owned()
            },
        },
        rating_history,
        development,
        training: PlayerTrainingProfile {
            player_id: player_id.to_owned(),
            preferred_position: active_position,
            preferred_role_id: default_role_id.to_owned(),
            future_individual_plan_id: None,
            status: "Nenhum plano individual: o sistema de treinamento pertence à Fase 06.8."
                .to_owned(),
        },
    })
}

fn coach_categories(attributes: &CoachAttributeSet) -> Vec<(&'static str, u8)> {
    vec![
        (
            "Tática",
            weighted(&[
                (attributes.tactical, 50),
                (attributes.decision_making, 30),
                (attributes.adaptability, 20),
            ]),
        ),
        (
            "Preparação",
            weighted(&[
                (attributes.preparation, 60),
                (attributes.discipline, 20),
                (attributes.communication, 20),
            ]),
        ),
        (
            "Desenvolvimento",
            weighted(&[
                (attributes.technical_development, 20),
                (attributes.physical_development, 20),
                (attributes.mental_development, 20),
                (attributes.tactical_development, 20),
                (attributes.youth_development, 20),
            ]),
        ),
        (
            "Gestão humana",
            weighted(&[
                (attributes.people_management, 45),
                (attributes.communication, 30),
                (attributes.motivation, 25),
            ]),
        ),
        (
            "Avaliação",
            weighted(&[
                (attributes.ability_judgement, 55),
                (attributes.potential_judgement, 45),
            ]),
        ),
    ]
}

pub fn project_coach_profile(
    world: &mut ProfileWorld,
    coach_id: &str,
    observer_club_id: &str,
    now: u64,
) -> Result<CoachProfileProjection, String> {
    world.validate()?;
    let coach = world
        .coaches
        .iter()
        .find(|coach| coach.identity.entity_id == coach_id)
        .cloned()
        .ok_or_else(|| "Treinador não encontrado.".to_owned())?;
    let knowledge = world.assessment_for(coach_id, observer_club_id);
    let categories = coach_categories(&coach.attributes);
    let category_ratings: Vec<_> = categories
        .iter()
        .map(|(label, value)| {
            rating(
                RatingKind::CoachRole,
                format!("coach.{}", label.to_lowercase().replace(' ', "-")),
                *label,
                *value,
                vec![RatingFactor {
                    factor_id: format!("coach.{}", label.to_lowercase().replace(' ', "-")),
                    label: (*label).to_owned(),
                    value: *value,
                    weight: 100,
                    contribution: i16::from(*value),
                    impact: RatingFactorImpact::Neutral,
                    explanation: "Composição determinística dos atributos desta categoria."
                        .to_owned(),
                    source: "Motor de ratings de treinadores v1".to_owned(),
                }],
                &knowledge,
                "Categoria independente; não existe OVR único de treinador.",
            )
        })
        .collect();
    let contextual_value = weighted(&[
        (categories[0].1, 35),
        (categories[1].1, 20),
        (categories[2].1, 15),
        (categories[3].1, 20),
        (categories[4].1, 10),
    ]);
    let contextual_rating = rating(
        RatingKind::CoachRole,
        "head-coach",
        "Treinador principal",
        contextual_value,
        categories
            .iter()
            .zip([35, 20, 15, 20, 10])
            .map(|((label, value), weight)| RatingFactor {
                factor_id: format!("coach.{}", label.to_lowercase().replace(' ', "-")),
                label: (*label).to_owned(),
                value: *value,
                weight,
                contribution: i16::from(*value) * i16::from(weight) / 100,
                impact: RatingFactorImpact::Neutral,
                explanation: format!(
                    "Relevância de {weight}% para o cargo de treinador principal."
                ),
                source: "Motor de ratings de treinadores v1".to_owned(),
            })
            .collect(),
        &knowledge,
        "Adequação ao cargo atual; outras funções usam pesos próprios.",
    );
    let snapshot = RatingSnapshot {
        snapshot_id: format!(
            "{coach_id}.head-coach.{}.{}",
            contextual_value,
            world.revision + 1
        ),
        entity_id: coach_id.to_owned(),
        rating_kind: RatingKind::CoachRole,
        value: contextual_value,
        position_id: None,
        role_id: Some("head-coach".to_owned()),
        variation_id: None,
        familiarity: None,
        confidence: knowledge.confidence,
        source: knowledge.source.clone(),
        recorded_at: now,
    };
    if world
        .rating_history
        .iter()
        .rev()
        .find(|candidate| candidate.entity_id == coach_id)
        .is_none_or(|previous| {
            previous.value != snapshot.value || previous.confidence != snapshot.confidence
        })
    {
        world.rating_history.push(snapshot);
        world.revision += 1;
    }
    let rating_history = world
        .rating_history
        .iter()
        .filter(|snapshot| snapshot.entity_id == coach_id)
        .cloned()
        .collect();
    let mut strengths: Vec<_> = categories
        .iter()
        .filter(|(_, value)| *value >= 78)
        .map(|(label, _)| (*label).to_owned())
        .collect();
    if strengths.is_empty() {
        strengths.push("Perfil equilibrado".to_owned());
    }
    let weaknesses = categories
        .iter()
        .filter(|(_, value)| *value < 72)
        .map(|(label, _)| (*label).to_owned())
        .collect();
    Ok(CoachProfileProjection {
        schema_version: PROFILE_PROJECTION_SCHEMA_VERSION,
        revision: world.revision,
        identity: coach.identity.clone(),
        role: coach.role,
        reputation: perceived(coach.reputation, &knowledge, true),
        qualification: coach.qualification,
        experience_years: coach.experience_years,
        style: coach.style,
        preferred_formations: coach.preferred_formations,
        contextual_rating,
        category_ratings,
        knowledge: knowledge.clone(),
        strengths,
        weaknesses,
        specialties: coach.specialties.clone(),
        contract: coach.contract,
        career_history: vec![
            format!("Atual · {}", coach.identity.club_name),
            "Histórico anterior não disponível nesta base inicial.".to_owned(),
        ],
        rating_history,
        development: CoachDevelopmentProfile {
            coach_id: coach_id.to_owned(),
            technical_development: coach.attributes.technical_development,
            physical_development: coach.attributes.physical_development,
            mental_development: coach.attributes.mental_development,
            tactical_development: coach.attributes.tactical_development,
            youth_development: coach.attributes.youth_development,
            position_adaptation: weighted(&[
                (coach.attributes.tactical_development, 60),
                (coach.attributes.communication, 40),
            ]),
            role_teaching: weighted(&[
                (coach.attributes.tactical_development, 55),
                (coach.attributes.technical_development, 45),
            ]),
            motivation: coach.attributes.motivation,
            people_management: coach.attributes.people_management,
            assessment_accuracy: weighted(&[
                (coach.attributes.ability_judgement, 50),
                (coach.attributes.potential_judgement, 50),
            ]),
            specialties: coach.specialties,
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const NOW: u64 = 1_784_102_400_000;

    #[test]
    fn player_rating_is_deterministic_and_keeps_temporary_state_separate() {
        let state = MatchdayState::default();
        let mut world = ProfileWorld::seed(&state, NOW);
        let first = project_player_profile(&mut world, &state, "rv-09", &state.club.id, None, NOW)
            .expect("player profile");
        let second = project_player_profile(
            &mut world,
            &state,
            "rv-09",
            &state.club.id,
            None,
            NOW + 86_400_000,
        )
        .expect("same player profile opened later");
        assert_eq!(first.current_ability, second.current_ability);
        assert_eq!(first.contextual_rating, second.contextual_rating);
        assert_eq!(first.rating_history.len(), 1);
        assert_eq!(second.rating_history.len(), 1);
        assert_eq!(
            second.contextual_rating.updated_at,
            first.contextual_rating.updated_at
        );
        assert!(!first.current_ability.factors.iter().any(|factor| {
            matches!(
                factor.factor_id.as_str(),
                "condition" | "form" | "potential"
            )
        }));
        assert_eq!(first.condition, Some(98));
        assert!(!first.potential.dynamic);
    }

    #[test]
    fn natural_position_ovr_matches_the_matchday_canonical_rating() {
        let state = MatchdayState::default();
        let mut world = ProfileWorld::seed(&state, NOW);
        for player in &state.players {
            let profile =
                project_player_profile(&mut world, &state, &player.id, &state.club.id, None, NOW)
                    .expect("canonical player profile");
            assert_eq!(
                profile.current_ability.real_value,
                Some(player.rating),
                "OVR divergente para {}",
                player.name
            );
            assert_eq!(profile.attribute_groups.len(), 1);
            assert_eq!(profile.attribute_groups[0].attributes.len(), 6);
            assert!(
                profile.attribute_groups[0]
                    .attributes
                    .iter()
                    .all(|attribute| !attribute.description.is_empty())
            );
        }
    }

    #[test]
    fn legacy_attribute_world_migrates_without_leaving_generic_categories() {
        let state = MatchdayState::default();
        let mut world = ProfileWorld::seed(&state, NOW);
        world.schema_version = 1;
        world.players[0].attributes = PlayerAttributeSet::Legacy {
            technical: 74,
            physical: 72,
            mental: 75,
            attacking: 70,
            defensive: 76,
            goalkeeping: 30,
        };
        world.attribute_history[0].attributes = world.players[0].attributes.clone();

        let migrated = world.migrate().expect("legacy migration");

        assert_eq!(migrated.schema_version, PROFILE_WORLD_SCHEMA_VERSION);
        assert!(!migrated.players[0].attributes.is_legacy());
        assert!(!migrated.attribute_history[0].attributes.is_legacy());
        migrated.validate().expect("valid migrated world");
    }

    #[test]
    fn external_profiles_never_expose_internal_values_without_own_club_knowledge() {
        let state = MatchdayState::default();
        let mut world = ProfileWorld::seed(&state, NOW);
        for player_id in ["rv-fdv-01", "rv-fdv-02", "rv-fdv-03"] {
            let profile =
                project_player_profile(&mut world, &state, player_id, &state.club.id, None, NOW)
                    .expect("external player profile");
            assert_eq!(profile.current_ability.real_value, None);
            assert_eq!(profile.contextual_rating.real_value, None);
            assert_ne!(profile.potential.perceived.kind, KnowledgeValueKind::Exact);
            assert_eq!(profile.condition, None);
        }
    }

    #[test]
    fn tactical_context_consumes_the_existing_variation_and_familiarity_once() {
        let state = MatchdayState::default();
        let library = state.tactical_library.as_ref().expect("tactical library");
        let variation = &library.variations[0];
        let model = variation.tactical_model.as_ref().expect("tactical model");
        let mut world = ProfileWorld::seed(&state, NOW);
        let profile = project_player_profile(
            &mut world,
            &state,
            "rv-01",
            &state.club.id,
            Some(&variation.variation_id),
            NOW,
        )
        .expect("profile with tactics");
        let canonical = model
            .familiarity
            .individuals
            .iter()
            .find(|candidate| candidate.player_id == "rv-01")
            .expect("canonical familiarity")
            .contextual;
        assert_eq!(profile.tactical_familiarity, Some(canonical));
        assert_eq!(
            profile
                .contextual_rating
                .factors
                .iter()
                .filter(|factor| factor.factor_id == "context.familiarity")
                .count(),
            1
        );
        assert_eq!(
            profile.rating_history[0].variation_id,
            Some(variation.variation_id.clone())
        );
    }

    #[test]
    fn coaches_are_first_class_contextual_and_explainable_entities() {
        let state = MatchdayState::default();
        let mut world = ProfileWorld::seed(&state, NOW);
        let coach = project_coach_profile(&mut world, "coach.aurora.head", &state.club.id, NOW)
            .expect("coach profile");
        assert_eq!(coach.category_ratings.len(), 5);
        assert_eq!(coach.contextual_rating.rating_kind, RatingKind::CoachRole);
        assert!(!coach.development.specialties.is_empty());
        assert_eq!(coach.rating_history.len(), 1);
    }

    #[test]
    fn search_uses_global_ids_and_routes_for_all_entity_types() {
        let state = MatchdayState::default();
        let world = ProfileWorld::seed(&state, NOW);
        let results = world.search(&state, &state.club.id, "");
        assert!(
            results
                .iter()
                .any(|result| result.route.starts_with("/players/"))
        );
        assert!(
            results
                .iter()
                .any(|result| result.route.starts_with("/coaches/"))
        );
        assert!(
            results
                .iter()
                .any(|result| result.route.starts_with("/clubs/"))
        );
        assert!(
            results
                .iter()
                .any(|result| result.route.starts_with("/nations/"))
        );
        assert!(results.iter().all(|result| !result.entity_id.is_empty()));
    }

    #[test]
    fn club_profile_reuses_existing_people_and_protects_external_knowledge() {
        let state = MatchdayState::default();
        let world = ProfileWorld::seed(&state, NOW);
        let own = project_club_profile(&world, &state, &state.club.id, &state.club.id, NOW)
            .expect("own club");
        assert_eq!(own.players.len(), state.players.len());
        assert_eq!(own.staff.len(), 1);
        assert!(own.tactics.is_some());
        assert_eq!(own.knowledge.knowledge_level, KnowledgeLevel::OwnClub);

        let external =
            project_club_profile(&world, &state, &state.opponent.id, &state.club.id, NOW)
                .expect("external club");
        assert_eq!(external.players.len(), 3);
        assert!(external.tactics.is_none());
        assert_eq!(external.knowledge.knowledge_level, KnowledgeLevel::Partial);
        assert!(external.players.iter().all(|player| {
            player
                .perceived_rating
                .as_ref()
                .is_none_or(|rating| rating.kind != KnowledgeValueKind::Exact)
        }));
    }

    #[test]
    fn nation_profile_aggregates_only_loaded_entities_and_competitions() {
        let state = MatchdayState::default();
        let world = ProfileWorld::seed(&state, NOW);
        let nation = project_nation_profile(&world, &state, "bra", &state.club.id, NOW)
            .expect("nation profile");
        assert_eq!(nation.code, "BRA");
        assert_eq!(nation.clubs.len(), 2);
        assert!(!nation.players.is_empty());
        assert_eq!(nation.competitions, vec!["Liga Horizonte"]);
        assert_eq!(
            project_nation_profile(&world, &state, "missing", &state.club.id, NOW)
                .expect_err("missing nation"),
            "Nação não encontrada."
        );
    }

    #[test]
    fn canonical_club_metadata_keeps_legacy_saves_navigable() {
        let mut state = MatchdayState::default();
        state.club.country_code = None;
        state.club.competition_name = None;
        state.opponent.country_code = None;
        state.opponent.competition_name = None;
        let world = ProfileWorld::seed(&state, NOW);

        let club = project_club_profile(&world, &state, &state.club.id, &state.club.id, NOW)
            .expect("legacy own club");
        assert_eq!(club.country_code.as_deref(), Some("BRA"));
        assert_eq!(club.competition_name.as_deref(), Some("Liga Horizonte"));

        let nation = project_nation_profile(&world, &state, "bra", &state.club.id, NOW)
            .expect("legacy nation profile");
        assert_eq!(nation.clubs.len(), 2);
        assert_eq!(nation.competitions, vec!["Liga Horizonte"]);
    }
}
