use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

use crate::matchday::{Player, Position, TacticalApproach, TacticalLine, TacticalPlayerPlacement};

pub const TACTICAL_MODEL_SCHEMA_VERSION: u16 = 1;
pub const TACTICAL_MATCH_SNAPSHOT_SCHEMA_VERSION: u16 = 1;
const LEFT_CORRIDOR_LIMIT: f64 = 1.0 / 3.0;
const RIGHT_CORRIDOR_LIMIT: f64 = 2.0 / 3.0;
const SAME_LINE_COVER_DISTANCE: f64 = 0.26;

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TacticalStrategyPresetId {
    #[default]
    Balanced,
    Protagonist,
    Compact,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TacticalBuildUp {
    Direct,
    #[default]
    Supported,
    Patient,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TacticalProgression {
    Outside,
    #[default]
    Balanced,
    Inside,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TacticalLossReaction {
    CounterPress,
    #[default]
    Balanced,
    Regroup,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TacticalRegainReaction {
    CounterAttack,
    #[default]
    Balanced,
    RetainPossession,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TacticalForceDirection {
    Inside,
    #[default]
    Neutral,
    Outside,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum GoalkeeperDistribution {
    Quick,
    #[default]
    Balanced,
    Safe,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InPossessionStrategy {
    pub width: u8,
    pub tempo: u8,
    pub passing_risk: u8,
    pub players_forward: u8,
    pub build_up: TacticalBuildUp,
    pub progression: TacticalProgression,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OutOfPossessionStrategy {
    pub block_height: u8,
    pub defensive_line: u8,
    pub pressure: u8,
    pub compactness: u8,
    pub duel_aggression: u8,
    pub force_direction: TacticalForceDirection,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransitionStrategy {
    pub speed: u8,
    pub players_forward: u8,
    pub defensive_security: u8,
    pub loss_reaction: TacticalLossReaction,
    pub regain_reaction: TacticalRegainReaction,
    pub goalkeeper_distribution: GoalkeeperDistribution,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalStrategyConfig {
    pub preset_id: TacticalStrategyPresetId,
    pub customized: bool,
    pub in_possession: InPossessionStrategy,
    pub out_of_possession: OutOfPossessionStrategy,
    pub transitions: TransitionStrategy,
}

impl TacticalStrategyConfig {
    pub fn for_preset(preset: TacticalStrategyPresetId) -> Self {
        match preset {
            TacticalStrategyPresetId::Balanced => Self {
                preset_id: preset,
                customized: false,
                in_possession: InPossessionStrategy {
                    width: 55,
                    tempo: 50,
                    passing_risk: 45,
                    players_forward: 50,
                    build_up: TacticalBuildUp::Supported,
                    progression: TacticalProgression::Balanced,
                },
                out_of_possession: OutOfPossessionStrategy {
                    block_height: 50,
                    defensive_line: 50,
                    pressure: 50,
                    compactness: 60,
                    duel_aggression: 50,
                    force_direction: TacticalForceDirection::Neutral,
                },
                transitions: TransitionStrategy {
                    speed: 50,
                    players_forward: 50,
                    defensive_security: 60,
                    loss_reaction: TacticalLossReaction::Balanced,
                    regain_reaction: TacticalRegainReaction::Balanced,
                    goalkeeper_distribution: GoalkeeperDistribution::Balanced,
                },
            },
            TacticalStrategyPresetId::Protagonist => Self {
                preset_id: preset,
                customized: false,
                in_possession: InPossessionStrategy {
                    width: 72,
                    tempo: 68,
                    passing_risk: 62,
                    players_forward: 72,
                    build_up: TacticalBuildUp::Supported,
                    progression: TacticalProgression::Inside,
                },
                out_of_possession: OutOfPossessionStrategy {
                    block_height: 72,
                    defensive_line: 70,
                    pressure: 78,
                    compactness: 66,
                    duel_aggression: 64,
                    force_direction: TacticalForceDirection::Outside,
                },
                transitions: TransitionStrategy {
                    speed: 75,
                    players_forward: 72,
                    defensive_security: 42,
                    loss_reaction: TacticalLossReaction::CounterPress,
                    regain_reaction: TacticalRegainReaction::CounterAttack,
                    goalkeeper_distribution: GoalkeeperDistribution::Quick,
                },
            },
            TacticalStrategyPresetId::Compact => Self {
                preset_id: preset,
                customized: false,
                in_possession: InPossessionStrategy {
                    width: 42,
                    tempo: 38,
                    passing_risk: 28,
                    players_forward: 38,
                    build_up: TacticalBuildUp::Patient,
                    progression: TacticalProgression::Outside,
                },
                out_of_possession: OutOfPossessionStrategy {
                    block_height: 38,
                    defensive_line: 40,
                    pressure: 42,
                    compactness: 82,
                    duel_aggression: 48,
                    force_direction: TacticalForceDirection::Outside,
                },
                transitions: TransitionStrategy {
                    speed: 38,
                    players_forward: 32,
                    defensive_security: 82,
                    loss_reaction: TacticalLossReaction::Regroup,
                    regain_reaction: TacticalRegainReaction::RetainPossession,
                    goalkeeper_distribution: GoalkeeperDistribution::Safe,
                },
            },
        }
    }

    pub fn from_legacy(approach: TacticalApproach) -> Self {
        Self::for_preset(match approach {
            TacticalApproach::Balanced => TacticalStrategyPresetId::Balanced,
            TacticalApproach::FrontFoot => TacticalStrategyPresetId::Protagonist,
            TacticalApproach::Compact => TacticalStrategyPresetId::Compact,
        })
    }

    pub fn legacy_approach(&self) -> TacticalApproach {
        match self.preset_id {
            TacticalStrategyPresetId::Balanced => TacticalApproach::Balanced,
            TacticalStrategyPresetId::Protagonist => TacticalApproach::FrontFoot,
            TacticalStrategyPresetId::Compact => TacticalApproach::Compact,
        }
    }
}

impl Default for TacticalStrategyConfig {
    fn default() -> Self {
        Self::for_preset(TacticalStrategyPresetId::Balanced)
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TacticalInstructionCategory {
    Circulation,
    Risk,
    Pressure,
    Width,
    Compactness,
    Creativity,
    Marking,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TacticalInstructionScope {
    Collective,
    Sector,
    Position,
    Role,
    Individual,
}

impl TacticalInstructionScope {
    fn precedence(self) -> u8 {
        match self {
            Self::Collective => 10,
            Self::Sector => 20,
            Self::Position => 30,
            Self::Role => 40,
            Self::Individual => 50,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalInstruction {
    pub instruction_id: String,
    pub category: TacticalInstructionCategory,
    pub scope: TacticalInstructionScope,
    pub target: String,
    pub value: String,
    pub intensity: u8,
    pub description: String,
    pub expected_effects: Vec<String>,
    pub requirements: Vec<String>,
    pub incompatibilities: Vec<String>,
    pub precedence: u8,
    pub familiarity_impact: i8,
    pub revision: u64,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedTacticalInstruction {
    pub instruction_id: String,
    pub scope: TacticalInstructionScope,
    pub target: String,
    pub behavior: String,
    pub expected_effects: Vec<String>,
    pub precedence: u8,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalInstructionConflict {
    pub conflict_id: String,
    pub instruction_ids: Vec<String>,
    pub winner_id: String,
    pub reason: String,
    pub resolved_behavior: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpponentKnowledge {
    pub confidence: u8,
    pub source: String,
    pub observed_at: u64,
    pub expires_at: Option<u64>,
    pub known_facts: Vec<String>,
    pub unknown_facts: Vec<String>,
    pub threats: Vec<String>,
    pub vulnerabilities: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OppositionInstruction {
    pub instruction_id: String,
    pub scope: TacticalInstructionScope,
    pub target_id: String,
    pub pressure: u8,
    pub tight_marking: bool,
    pub preferred_foot: Option<String>,
    pub blocked_lane: Option<String>,
    pub protected_zone: Option<String>,
    pub expires_at: Option<u64>,
}

#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalOppositionPlan {
    pub opponent_id: Option<String>,
    pub knowledge: Option<OpponentKnowledge>,
    pub instructions: Vec<OppositionInstruction>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalModelConfig {
    pub schema_version: u16,
    pub strategy: TacticalStrategyConfig,
    pub instructions: Vec<TacticalInstruction>,
    pub opposition: TacticalOppositionPlan,
}

impl Default for TacticalModelConfig {
    fn default() -> Self {
        Self {
            schema_version: TACTICAL_MODEL_SCHEMA_VERSION,
            strategy: TacticalStrategyConfig::default(),
            instructions: default_instructions(),
            opposition: TacticalOppositionPlan::default(),
        }
    }
}

pub fn default_instructions() -> Vec<TacticalInstruction> {
    vec![
        TacticalInstruction {
            instruction_id: "collective.build-up-supported".to_owned(),
            category: TacticalInstructionCategory::Circulation,
            scope: TacticalInstructionScope::Collective,
            target: "team".to_owned(),
            value: "supported".to_owned(),
            intensity: 55,
            description: "Aproximar apoios durante a primeira fase de construção.".to_owned(),
            expected_effects: vec![
                "mais linhas de passe curtas".to_owned(),
                "progressão inicial menos direta".to_owned(),
            ],
            requirements: vec!["estrutura de saída válida".to_owned()],
            incompatibilities: vec!["collective.build-up-direct".to_owned()],
            precedence: 10,
            familiarity_impact: -2,
            revision: 0,
        },
        TacticalInstruction {
            instruction_id: "collective.counter-press".to_owned(),
            category: TacticalInstructionCategory::Pressure,
            scope: TacticalInstructionScope::Collective,
            target: "team".to_owned(),
            value: "counterPress".to_owned(),
            intensity: 65,
            description: "Reagir de imediato ao perder a bola antes de reorganizar o bloco."
                .to_owned(),
            expected_effects: vec![
                "recuperação mais próxima da perda".to_owned(),
                "maior exposição se a primeira pressão for superada".to_owned(),
            ],
            requirements: vec!["segurança defensiva coordenada".to_owned()],
            incompatibilities: vec!["collective.regroup".to_owned()],
            precedence: 10,
            familiarity_impact: -3,
            revision: 0,
        },
    ]
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TacticalGamePhase {
    Base,
    InPossession,
    OutOfPossession,
    OffensiveTransition,
    DefensiveTransition,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalPhasePlayer {
    pub player_id: String,
    pub normalized_x: f64,
    pub normalized_y: f64,
    pub responsibilities: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalPhaseStructure {
    pub phase: TacticalGamePhase,
    pub players: Vec<TacticalPhasePlayer>,
    pub width: u8,
    pub depth: u8,
    pub compactness: u8,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalSpatialAnalysis {
    pub defensive_line: u8,
    pub midfield_line: u8,
    pub attacking_line: u8,
    pub width: u8,
    pub depth: u8,
    pub compactness: u8,
    pub left_corridor_players: u8,
    pub central_corridor_players: u8,
    pub right_corridor_players: u8,
    pub empty_corridors: Vec<String>,
    pub asymmetry: i8,
    pub average_player_distance: u8,
    pub average_sector_distance: u8,
    pub players_between_lines: Vec<String>,
    pub cover_pairs: Vec<String>,
    pub build_up_shape: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedTacticalStrategy {
    pub preset_id: TacticalStrategyPresetId,
    pub customized: bool,
    pub mentality: String,
    pub risk: u8,
    pub physical_demand: u8,
    pub strengths: Vec<String>,
    pub vulnerabilities: Vec<String>,
    pub explicit_parameters: Vec<TacticalParameter>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalStrategyPresetSummary {
    pub preset_id: TacticalStrategyPresetId,
    pub config: TacticalStrategyConfig,
    pub resolved: ResolvedTacticalStrategy,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalParameter {
    pub parameter_id: String,
    pub value: u8,
    pub explanation: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FamiliarityDimension {
    pub dimension_id: String,
    pub score: u8,
    pub explanation: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerTacticalFamiliarity {
    pub player_id: String,
    pub position: u8,
    pub role: u8,
    pub zone: u8,
    pub plan: u8,
    pub responsibilities: u8,
    pub contextual: u8,
    pub explanations: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UnitTacticalFamiliarity {
    pub unit_id: String,
    pub score: u8,
    pub player_ids: Vec<String>,
    pub explanation: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FamiliarityChange {
    pub event_id: String,
    pub previous: u8,
    pub current: u8,
    pub dimension_id: String,
    pub origin: String,
    pub occurred_at: u64,
    pub variation_id: String,
    pub player_id: Option<String>,
    pub unit_id: Option<String>,
    pub explanation: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalFamiliaritySnapshot {
    pub schema_version: u16,
    pub overall: u8,
    pub collective: Vec<FamiliarityDimension>,
    pub individuals: Vec<PlayerTacticalFamiliarity>,
    pub units: Vec<UnitTacticalFamiliarity>,
    pub history: Vec<FamiliarityChange>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalDiagnostic {
    pub valid: bool,
    pub readiness: u8,
    pub strengths: Vec<String>,
    pub vulnerabilities: Vec<String>,
    pub risks: Vec<String>,
    pub alerts: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalConfigChange {
    pub path: String,
    pub from: u8,
    pub to: u8,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalRecommendation {
    pub recommendation_id: String,
    pub reason: String,
    pub proposed_changes: Vec<TacticalConfigChange>,
    pub benefit: String,
    pub risk: String,
    pub affected_players: Vec<String>,
    pub confidence: u8,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalMatchSnapshot {
    pub schema_version: u16,
    pub tactical_plan_id: String,
    pub variation_id: String,
    pub revision: u64,
    pub starters: Vec<String>,
    pub bench: Vec<String>,
    pub normalized_placements: Vec<TacticalPlayerPlacement>,
    pub structures: Vec<TacticalPhaseStructure>,
    pub strategy: ResolvedTacticalStrategy,
    pub instructions: Vec<ResolvedTacticalInstruction>,
    pub opposition: TacticalOppositionPlan,
    pub familiarity: TacticalFamiliaritySnapshot,
    pub spatial: TacticalSpatialAnalysis,
    pub risks: Vec<String>,
    pub vulnerabilities: Vec<String>,
    pub valid: bool,
    pub created_at: u64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalModelSnapshot {
    pub schema_version: u16,
    pub config: TacticalModelConfig,
    pub structures: Vec<TacticalPhaseStructure>,
    pub spatial: TacticalSpatialAnalysis,
    pub resolved_strategy: ResolvedTacticalStrategy,
    pub resolved_instructions: Vec<ResolvedTacticalInstruction>,
    pub instruction_conflicts: Vec<TacticalInstructionConflict>,
    pub opposition: TacticalOppositionPlan,
    pub familiarity: TacticalFamiliaritySnapshot,
    pub diagnostic: TacticalDiagnostic,
    pub recommendations: Vec<TacticalRecommendation>,
    pub match_snapshot: TacticalMatchSnapshot,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalComparisonChange {
    pub change_id: String,
    pub label: String,
    pub before: String,
    pub after: String,
    pub cause: String,
    pub expected_consequences: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalComparison {
    pub from_revision: u64,
    pub to_revision: u64,
    pub changes: Vec<TacticalComparisonChange>,
    pub familiarity_before: u8,
    pub familiarity_after: u8,
    pub affected_players: Vec<String>,
    pub risks_created: Vec<String>,
    pub risks_reduced: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticalPlanPreview {
    pub model: TacticalModelSnapshot,
    pub comparison: Option<TacticalComparison>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct TacticalResolutionContext<'a> {
    pub tactical_plan_id: &'a str,
    pub variation_id: &'a str,
    pub revision: u64,
    pub placements: &'a [TacticalPlayerPlacement],
    pub bench: &'a [String],
    pub players: &'a [Player],
    pub config: TacticalModelConfig,
    pub previous: Option<&'a TacticalModelSnapshot>,
    pub now: u64,
    pub record_history: bool,
}

fn clamp_score(value: i16) -> u8 {
    value.clamp(0, 100) as u8
}

fn average(values: impl IntoIterator<Item = u8>) -> u8 {
    let values: Vec<_> = values.into_iter().collect();
    if values.is_empty() {
        return 0;
    }
    (values.iter().map(|value| u32::from(*value)).sum::<u32>() / values.len() as u32) as u8
}

fn normalized_percent(value: f64) -> u8 {
    (value.clamp(0.0, 1.0) * 100.0).round() as u8
}

fn line_average(placements: &[TacticalPlayerPlacement], line: TacticalLine) -> u8 {
    let values = placements
        .iter()
        .filter(|placement| placement.line == line)
        .map(|placement| normalized_percent(placement.normalized_x));
    average(values)
}

fn spatial_analysis(placements: &[TacticalPlayerPlacement]) -> TacticalSpatialAnalysis {
    let min_x = placements
        .iter()
        .map(|placement| placement.normalized_x)
        .fold(1.0, f64::min);
    let max_x = placements
        .iter()
        .map(|placement| placement.normalized_x)
        .fold(0.0, f64::max);
    let min_y = placements
        .iter()
        .map(|placement| placement.normalized_y)
        .fold(1.0, f64::min);
    let max_y = placements
        .iter()
        .map(|placement| placement.normalized_y)
        .fold(0.0, f64::max);
    // Corridors describe occupied field thirds. `side` remains the nominal
    // placement label from 06.2 and deliberately uses a wider centre band.
    let left = placements
        .iter()
        .filter(|placement| placement.normalized_y < LEFT_CORRIDOR_LIMIT)
        .count() as u8;
    let centre = placements
        .iter()
        .filter(|placement| {
            placement.normalized_y >= LEFT_CORRIDOR_LIMIT
                && placement.normalized_y <= RIGHT_CORRIDOR_LIMIT
        })
        .count() as u8;
    let right = placements
        .iter()
        .filter(|placement| placement.normalized_y > RIGHT_CORRIDOR_LIMIT)
        .count() as u8;
    let mut pair_distances = Vec::new();
    let mut cover_pairs = Vec::new();
    for (index, first) in placements.iter().enumerate() {
        for second in placements.iter().skip(index + 1) {
            let distance = ((first.normalized_x - second.normalized_x).powi(2)
                + (first.normalized_y - second.normalized_y).powi(2))
            .sqrt();
            pair_distances.push(normalized_percent(distance));
            if distance <= SAME_LINE_COVER_DISTANCE && first.line == second.line {
                cover_pairs.push(format!("{}:{}", first.player_id, second.player_id));
            }
        }
    }
    let defence = line_average(placements, TacticalLine::Defence);
    let midfield = line_average(placements, TacticalLine::Midfield);
    let attack = line_average(placements, TacticalLine::Attack);
    let sector_gaps = [
        midfield.saturating_sub(defence),
        attack.saturating_sub(midfield),
    ];
    let average_sector_distance = average(sector_gaps);
    let compactness = clamp_score(100 - i16::from(average_sector_distance) * 2);
    let empty_corridors = [("left", left), ("centre", centre), ("right", right)]
        .into_iter()
        .filter(|(_, count)| *count == 0)
        .map(|(name, _)| name.to_owned())
        .collect();
    let players_between_lines = placements
        .iter()
        .filter(|placement| {
            let x = normalized_percent(placement.normalized_x);
            (x > defence.saturating_add(8) && x < midfield.saturating_sub(8))
                || (x > midfield.saturating_add(8) && x < attack.saturating_sub(8))
        })
        .map(|placement| placement.player_id.clone())
        .collect();
    let build_up_defenders = placements
        .iter()
        .filter(|placement| placement.line == TacticalLine::Defence)
        .count();

    TacticalSpatialAnalysis {
        defensive_line: defence,
        midfield_line: midfield,
        attacking_line: attack,
        width: normalized_percent(max_y - min_y),
        depth: normalized_percent(max_x - min_x),
        compactness,
        left_corridor_players: left,
        central_corridor_players: centre,
        right_corridor_players: right,
        empty_corridors,
        asymmetry: (i16::from(right) - i16::from(left)).clamp(-100, 100) as i8,
        average_player_distance: average(pair_distances),
        average_sector_distance,
        players_between_lines,
        cover_pairs,
        build_up_shape: if build_up_defenders == 3 {
            "backThree".to_owned()
        } else {
            format!("back{build_up_defenders}")
        },
    }
}

fn phase_point(
    placement: &TacticalPlayerPlacement,
    phase: TacticalGamePhase,
    strategy: &TacticalStrategyConfig,
) -> (f64, f64) {
    if phase == TacticalGamePhase::Base {
        return (placement.normalized_x, placement.normalized_y);
    }
    let line_bias = match placement.line {
        TacticalLine::Goal => 0.25,
        TacticalLine::Defence => 0.55,
        TacticalLine::Midfield => 0.8,
        TacticalLine::Attack => 1.0,
    };
    let (x_offset, width_factor) = match phase {
        TacticalGamePhase::Base => unreachable!("base phase returned before deriving offsets"),
        TacticalGamePhase::InPossession => (
            (f64::from(strategy.in_possession.tempo) - 50.0) * 0.0012 * line_bias,
            f64::from(strategy.in_possession.width) / 55.0,
        ),
        TacticalGamePhase::OutOfPossession => (
            (f64::from(strategy.out_of_possession.block_height) - 50.0) * 0.001,
            1.0 - (f64::from(strategy.out_of_possession.compactness) - 50.0) * 0.006,
        ),
        TacticalGamePhase::OffensiveTransition => (
            f64::from(strategy.transitions.speed) * 0.0008 * line_bias,
            1.0 + f64::from(strategy.transitions.players_forward) * 0.0015,
        ),
        TacticalGamePhase::DefensiveTransition => (
            -f64::from(strategy.transitions.defensive_security) * 0.0006 * line_bias,
            1.0 - f64::from(strategy.out_of_possession.compactness) * 0.002,
        ),
    };
    let x =
        ((placement.normalized_x + x_offset).clamp(0.0, 1.0) * 1_000_000.0).round() / 1_000_000.0;
    let y = ((0.5 + (placement.normalized_y - 0.5) * width_factor).clamp(0.0, 1.0) * 1_000_000.0)
        .round()
        / 1_000_000.0;
    (x, y)
}

fn phase_responsibilities(
    placement: &TacticalPlayerPlacement,
    phase: TacticalGamePhase,
) -> Vec<String> {
    let line = match placement.line {
        TacticalLine::Goal => "protectGoal",
        TacticalLine::Defence => "protectDepth",
        TacticalLine::Midfield => "connectSectors",
        TacticalLine::Attack => "threatenLastLine",
    };
    let phase_rule = match phase {
        TacticalGamePhase::Base => "holdBasePosition",
        TacticalGamePhase::InPossession => "offerPossessionSupport",
        TacticalGamePhase::OutOfPossession => "protectAssignedZone",
        TacticalGamePhase::OffensiveTransition => "supportProgression",
        TacticalGamePhase::DefensiveTransition => "restoreDefensiveBalance",
    };
    vec![line.to_owned(), phase_rule.to_owned()]
}

fn derive_structures(
    placements: &[TacticalPlayerPlacement],
    strategy: &TacticalStrategyConfig,
) -> Vec<TacticalPhaseStructure> {
    [
        TacticalGamePhase::Base,
        TacticalGamePhase::InPossession,
        TacticalGamePhase::OutOfPossession,
        TacticalGamePhase::OffensiveTransition,
        TacticalGamePhase::DefensiveTransition,
    ]
    .into_iter()
    .map(|phase| {
        let players: Vec<_> = placements
            .iter()
            .map(|placement| {
                let (normalized_x, normalized_y) = phase_point(placement, phase, strategy);
                TacticalPhasePlayer {
                    player_id: placement.player_id.clone(),
                    normalized_x,
                    normalized_y,
                    responsibilities: phase_responsibilities(placement, phase),
                }
            })
            .collect();
        let min_x = players
            .iter()
            .map(|player| player.normalized_x)
            .fold(1.0, f64::min);
        let max_x = players
            .iter()
            .map(|player| player.normalized_x)
            .fold(0.0, f64::max);
        let min_y = players
            .iter()
            .map(|player| player.normalized_y)
            .fold(1.0, f64::min);
        let max_y = players
            .iter()
            .map(|player| player.normalized_y)
            .fold(0.0, f64::max);
        let average_neighbour_distance = average(players.iter().map(|player| {
            players
                .iter()
                .filter(|candidate| candidate.player_id != player.player_id)
                .map(|candidate| {
                    normalized_percent(
                        ((player.normalized_x - candidate.normalized_x).powi(2)
                            + (player.normalized_y - candidate.normalized_y).powi(2))
                        .sqrt(),
                    )
                })
                .min()
                .unwrap_or(0)
        }));
        TacticalPhaseStructure {
            phase,
            players,
            width: normalized_percent(max_y - min_y),
            depth: normalized_percent(max_x - min_x),
            compactness: clamp_score(100 - i16::from(average_neighbour_distance) * 3),
        }
    })
    .collect()
}

pub fn resolve_strategy(config: &TacticalStrategyConfig) -> ResolvedTacticalStrategy {
    let risk = average([
        config.in_possession.passing_risk,
        config.in_possession.players_forward,
        100_u8.saturating_sub(config.transitions.defensive_security),
    ]);
    let physical_demand = average([
        config.out_of_possession.pressure,
        config.out_of_possession.duel_aggression,
        config.transitions.speed,
    ]);
    let mut strengths = Vec::new();
    let mut vulnerabilities = Vec::new();
    if config.in_possession.width >= 65 {
        strengths.push("amplitude para abrir o bloco adversário".to_owned());
    }
    if config.out_of_possession.compactness >= 70 {
        strengths.push("proteção coordenada do corredor central".to_owned());
    }
    if config.out_of_possession.pressure >= 70 {
        strengths.push("pressão alta com iniciativa após a perda".to_owned());
    }
    if config.out_of_possession.defensive_line >= 68 {
        vulnerabilities.push("espaço nas costas da linha defensiva".to_owned());
    }
    if config.transitions.defensive_security <= 45 {
        vulnerabilities.push("rest defence reduzida durante ataques longos".to_owned());
    }
    if config.in_possession.passing_risk >= 65 {
        vulnerabilities.push("perdas em zonas interiores sob pressão".to_owned());
    }
    ResolvedTacticalStrategy {
        preset_id: config.preset_id,
        customized: config.customized,
        mentality: match config.preset_id {
            TacticalStrategyPresetId::Balanced => "Equilibrada",
            TacticalStrategyPresetId::Protagonist => "Positiva",
            TacticalStrategyPresetId::Compact => "Cautelosa",
        }
        .to_owned(),
        risk,
        physical_demand,
        strengths,
        vulnerabilities,
        explicit_parameters: vec![
            TacticalParameter {
                parameter_id: "width".to_owned(),
                value: config.in_possession.width,
                explanation: "Amplitude-alvo da equipe com a bola.".to_owned(),
            },
            TacticalParameter {
                parameter_id: "tempo".to_owned(),
                value: config.in_possession.tempo,
                explanation: "Velocidade desejada da circulação.".to_owned(),
            },
            TacticalParameter {
                parameter_id: "defensiveLine".to_owned(),
                value: config.out_of_possession.defensive_line,
                explanation: "Altura de referência da última linha.".to_owned(),
            },
            TacticalParameter {
                parameter_id: "pressure".to_owned(),
                value: config.out_of_possession.pressure,
                explanation: "Intensidade e frequência das ações de pressão.".to_owned(),
            },
            TacticalParameter {
                parameter_id: "compactness".to_owned(),
                value: config.out_of_possession.compactness,
                explanation: "Distância-alvo entre setores sem a bola.".to_owned(),
            },
            TacticalParameter {
                parameter_id: "transitionSpeed".to_owned(),
                value: config.transitions.speed,
                explanation: "Velocidade desejada após mudança de posse.".to_owned(),
            },
        ],
    }
}

pub fn tactical_strategy_preset_catalog() -> Vec<TacticalStrategyPresetSummary> {
    [
        TacticalStrategyPresetId::Balanced,
        TacticalStrategyPresetId::Protagonist,
        TacticalStrategyPresetId::Compact,
    ]
    .into_iter()
    .map(|preset_id| {
        let config = TacticalStrategyConfig::for_preset(preset_id);
        let resolved = resolve_strategy(&config);
        TacticalStrategyPresetSummary {
            preset_id,
            config,
            resolved,
        }
    })
    .collect()
}

fn resolve_instructions(
    instructions: &[TacticalInstruction],
) -> (
    Vec<ResolvedTacticalInstruction>,
    Vec<TacticalInstructionConflict>,
) {
    let mut ordered = instructions.to_vec();
    ordered.sort_by(|left, right| {
        right
            .scope
            .precedence()
            .cmp(&left.scope.precedence())
            .then_with(|| right.precedence.cmp(&left.precedence))
            .then_with(|| left.instruction_id.cmp(&right.instruction_id))
    });
    let mut accepted: Vec<TacticalInstruction> = Vec::new();
    let mut conflicts = Vec::new();
    for instruction in ordered {
        let conflict = accepted.iter().find(|accepted_instruction| {
            instruction
                .incompatibilities
                .contains(&accepted_instruction.instruction_id)
                || accepted_instruction
                    .incompatibilities
                    .contains(&instruction.instruction_id)
                || (instruction.category == accepted_instruction.category
                    && instruction.target == accepted_instruction.target
                    && instruction.value != accepted_instruction.value)
        });
        if let Some(winner) = conflict {
            conflicts.push(TacticalInstructionConflict {
                conflict_id: format!("{}:{}", winner.instruction_id, instruction.instruction_id),
                instruction_ids: vec![winner.instruction_id.clone(), instruction.instruction_id],
                winner_id: winner.instruction_id.clone(),
                reason: format!(
                    "{} vence porque o escopo {:?} possui precedência superior ou identidade estável anterior.",
                    winner.instruction_id, winner.scope
                ),
                resolved_behavior: winner.value.clone(),
            });
        } else {
            accepted.push(instruction);
        }
    }
    let resolved = accepted
        .into_iter()
        .map(|instruction| ResolvedTacticalInstruction {
            instruction_id: instruction.instruction_id,
            scope: instruction.scope,
            target: instruction.target,
            behavior: instruction.value,
            expected_effects: instruction.expected_effects,
            precedence: instruction.scope.precedence() + instruction.precedence,
        })
        .collect();
    (resolved, conflicts)
}

fn expected_line(position: Position) -> TacticalLine {
    match position {
        Position::Gk => TacticalLine::Goal,
        Position::Rb | Position::Cb | Position::Lb => TacticalLine::Defence,
        Position::Dm | Position::Cm | Position::Am => TacticalLine::Midfield,
        Position::Rw | Position::Lw | Position::St => TacticalLine::Attack,
    }
}

fn position_group(position: Position) -> u8 {
    match position {
        Position::Gk => 0,
        Position::Rb | Position::Cb | Position::Lb => 1,
        Position::Dm | Position::Cm | Position::Am => 2,
        Position::Rw | Position::Lw | Position::St => 3,
    }
}

fn familiarity(
    context: &TacticalResolutionContext<'_>,
    instructions: &[ResolvedTacticalInstruction],
) -> TacticalFamiliaritySnapshot {
    let strategy = &context.config.strategy;
    let player_by_id: HashMap<_, _> = context
        .players
        .iter()
        .map(|player| (&player.id, player))
        .collect();
    let structure_complexity = average([
        strategy.in_possession.width.abs_diff(55),
        strategy.out_of_possession.defensive_line.abs_diff(50),
        strategy.out_of_possession.pressure.abs_diff(50),
    ]);
    let strategy_score = clamp_score(92 - i16::from(structure_complexity));
    let instruction_score = clamp_score(94 - instructions.len() as i16 * 3);
    let individuals: Vec<_> = context
        .placements
        .iter()
        .filter_map(|placement| {
            let player = player_by_id.get(&placement.player_id)?;
            let position = if player.position == placement.position_id {
                100
            } else if position_group(player.position) == position_group(placement.position_id) {
                78
            } else {
                52
            };
            let zone = if expected_line(player.position) == placement.line {
                96
            } else {
                64
            };
            let role = if placement.role_id.is_some() { 78 } else { 86 };
            let responsibility_count = instructions
                .iter()
                .filter(|instruction| {
                    instruction.target == "team"
                        || instruction.target == placement.player_id
                        || instruction.target == format!("{:?}", placement.line).to_lowercase()
                })
                .count();
            let responsibilities = clamp_score(96 - responsibility_count as i16 * 4);
            let plan = average([strategy_score, instruction_score, zone]);
            let contextual = average([position, role, zone, plan, responsibilities]);
            Some(PlayerTacticalFamiliarity {
                player_id: placement.player_id.clone(),
                position,
                role,
                zone,
                plan,
                responsibilities,
                contextual,
                explanations: vec![
                    if position == 100 {
                        "posição nominal preservada".to_owned()
                    } else {
                        "posição nominal diferente da posição natural".to_owned()
                    },
                    format!("{responsibility_count} responsabilidades resolvidas neste plano"),
                ],
            })
        })
        .collect();
    let base_structure = average(individuals.iter().map(|player| player.zone));
    let position_familiarity = average(individuals.iter().map(|player| player.position));
    let continuity = context.previous.map_or(82, |previous_model| {
        let previous_ids: HashSet<_> = previous_model
            .match_snapshot
            .starters
            .iter()
            .map(String::as_str)
            .collect();
        let retained = context
            .placements
            .iter()
            .filter(|placement| previous_ids.contains(placement.player_id.as_str()))
            .count();
        clamp_score(45 + retained as i16 * 5)
    });
    let in_possession = clamp_score(
        96 - i16::from(strategy.in_possession.width.abs_diff(55)) / 2
            - i16::from(strategy.in_possession.tempo.abs_diff(50)) / 3,
    );
    let out_of_possession = clamp_score(
        96 - i16::from(strategy.out_of_possession.defensive_line.abs_diff(50)) / 2
            - i16::from(strategy.out_of_possession.pressure.abs_diff(50)) / 3,
    );
    let offensive_transition =
        clamp_score(96 - i16::from(strategy.transitions.speed.abs_diff(50)) / 2);
    let defensive_transition =
        clamp_score(96 - i16::from(strategy.transitions.defensive_security.abs_diff(60)) / 2);
    let collective = vec![
        FamiliarityDimension {
            dimension_id: "baseStructure".to_owned(),
            score: base_structure,
            explanation: "Média da familiaridade dos titulares com suas zonas base.".to_owned(),
        },
        FamiliarityDimension {
            dimension_id: "position".to_owned(),
            score: position_familiarity,
            explanation:
                "Compatibilidade persistida entre posição natural e responsabilidade nominal."
                    .to_owned(),
        },
        FamiliarityDimension {
            dimension_id: "inPossession".to_owned(),
            score: in_possession,
            explanation: "Complexidade explícita da largura e do ritmo com a bola.".to_owned(),
        },
        FamiliarityDimension {
            dimension_id: "outOfPossession".to_owned(),
            score: out_of_possession,
            explanation: "Complexidade explícita da linha e da pressão sem a bola.".to_owned(),
        },
        FamiliarityDimension {
            dimension_id: "offensiveTransition".to_owned(),
            score: offensive_transition,
            explanation: "Distância da transição ofensiva em relação ao plano equilibrado."
                .to_owned(),
        },
        FamiliarityDimension {
            dimension_id: "defensiveTransition".to_owned(),
            score: defensive_transition,
            explanation: "Distância da segurança defensiva em relação ao plano equilibrado."
                .to_owned(),
        },
        FamiliarityDimension {
            dimension_id: "collectiveInstructions".to_owned(),
            score: instruction_score,
            explanation: "Quantidade e complexidade das instruções coletivas resolvidas."
                .to_owned(),
        },
        FamiliarityDimension {
            dimension_id: "continuity".to_owned(),
            score: continuity,
            explanation: "Continuidade do XI dentro desta variação, sem efeito de treino."
                .to_owned(),
        },
    ];
    let overall = average(collective.iter().map(|dimension| dimension.score));
    let units = [
        ("defensiveUnit", TacticalLine::Defence),
        ("midfieldUnit", TacticalLine::Midfield),
        ("attackingUnit", TacticalLine::Attack),
    ]
    .into_iter()
    .map(|(unit_id, line)| {
        let player_ids: Vec<_> = context
            .placements
            .iter()
            .filter(|placement| placement.line == line)
            .map(|placement| placement.player_id.clone())
            .collect();
        let score = average(individuals.iter().filter_map(|player| {
            player_ids
                .contains(&player.player_id)
                .then_some(player.contextual)
        }));
        UnitTacticalFamiliarity {
            unit_id: unit_id.to_owned(),
            score,
            player_ids,
            explanation: format!("Familiaridade contextual dos jogadores da unidade {unit_id}."),
        }
    })
    .collect();
    let mut history = context
        .previous
        .map(|model| model.familiarity.history.clone())
        .unwrap_or_default();
    if context.record_history {
        let previous_overall = context
            .previous
            .map_or(0, |model| model.familiarity.overall);
        if previous_overall != overall {
            history.push(FamiliarityChange {
                event_id: format!("{}.{}.overall", context.variation_id, context.revision),
                previous: previous_overall,
                current: overall,
                dimension_id: "overall".to_owned(),
                origin: "tacticalPlanSaved".to_owned(),
                occurred_at: context.now,
                variation_id: context.variation_id.to_owned(),
                player_id: None,
                unit_id: None,
                explanation: format!(
                    "Familiaridade coletiva mudou de {previous_overall}% para {overall}% após salvar estratégia, estrutura ou instruções."
                ),
            });
        }
        for individual in &individuals {
            let previous_score = context
                .previous
                .and_then(|model| {
                    model
                        .familiarity
                        .individuals
                        .iter()
                        .find(|candidate| candidate.player_id == individual.player_id)
                })
                .map_or(0, |candidate| candidate.contextual);
            if previous_score != individual.contextual {
                history.push(FamiliarityChange {
                    event_id: format!(
                        "{}.{}.player.{}",
                        context.variation_id, context.revision, individual.player_id
                    ),
                    previous: previous_score,
                    current: individual.contextual,
                    dimension_id: "playerContext".to_owned(),
                    origin: "tacticalPlanSaved".to_owned(),
                    occurred_at: context.now,
                    variation_id: context.variation_id.to_owned(),
                    player_id: Some(individual.player_id.clone()),
                    unit_id: None,
                    explanation: individual.explanations.join("; "),
                });
            }
        }
    }
    TacticalFamiliaritySnapshot {
        schema_version: 1,
        overall,
        collective,
        individuals,
        units,
        history,
    }
}

fn validate_config(config: &TacticalModelConfig) -> Result<(), String> {
    if config.schema_version != TACTICAL_MODEL_SCHEMA_VERSION {
        return Err("A versão do modelo tático é incompatível.".to_owned());
    }
    let values = [
        config.strategy.in_possession.width,
        config.strategy.in_possession.tempo,
        config.strategy.in_possession.passing_risk,
        config.strategy.in_possession.players_forward,
        config.strategy.out_of_possession.block_height,
        config.strategy.out_of_possession.defensive_line,
        config.strategy.out_of_possession.pressure,
        config.strategy.out_of_possession.compactness,
        config.strategy.out_of_possession.duel_aggression,
        config.strategy.transitions.speed,
        config.strategy.transitions.players_forward,
        config.strategy.transitions.defensive_security,
    ];
    if values.iter().any(|value| *value > 100) {
        return Err("Parâmetros táticos precisam permanecer entre 0 e 100.".to_owned());
    }
    let mut instruction_ids = HashSet::new();
    for instruction in &config.instructions {
        if instruction.instruction_id.trim().is_empty()
            || !instruction_ids.insert(instruction.instruction_id.as_str())
            || instruction.intensity > 100
            || instruction.precedence > 100
            || !(-100..=100).contains(&instruction.familiarity_impact)
        {
            return Err(
                "As instruções precisam de identidades únicas, intensidade, precedência e impacto válidos."
                    .to_owned(),
            );
        }
    }
    if let Some(knowledge) = &config.opposition.knowledge {
        if knowledge.confidence > 100 {
            return Err(
                "A confiança do relatório adversário precisa estar entre 0 e 100.".to_owned(),
            );
        }
    }
    let mut opposition_instruction_ids = HashSet::new();
    for instruction in &config.opposition.instructions {
        if instruction.instruction_id.trim().is_empty()
            || instruction.target_id.trim().is_empty()
            || !opposition_instruction_ids.insert(instruction.instruction_id.as_str())
            || instruction.pressure > 100
        {
            return Err(
                "As instruções de oposição precisam de identidades, alvos e pressão válidos."
                    .to_owned(),
            );
        }
    }
    Ok(())
}

fn current_opposition(plan: &TacticalOppositionPlan, now: u64) -> TacticalOppositionPlan {
    let mut resolved = plan.clone();
    if resolved
        .knowledge
        .as_ref()
        .and_then(|knowledge| knowledge.expires_at)
        .is_some_and(|expires_at| expires_at <= now)
    {
        resolved.knowledge = None;
    }
    resolved.instructions.retain(|instruction| {
        instruction
            .expires_at
            .is_none_or(|expires_at| expires_at > now)
    });
    resolved
}

fn diagnostic(
    spatial: &TacticalSpatialAnalysis,
    strategy: &ResolvedTacticalStrategy,
    familiarity: &TacticalFamiliaritySnapshot,
    conflicts: &[TacticalInstructionConflict],
) -> TacticalDiagnostic {
    let mut alerts = Vec::new();
    let mut risks = strategy.vulnerabilities.clone();
    if !spatial.empty_corridors.is_empty() {
        alerts.push(format!(
            "Corredores sem ocupação base: {}.",
            spatial.empty_corridors.join(", ")
        ));
    }
    if spatial.asymmetry.unsigned_abs() >= 3 {
        risks.push("concentração lateral reduz opções no lado oposto".to_owned());
    }
    if !conflicts.is_empty() {
        alerts.push(format!(
            "{} conflito(s) de instrução resolvido(s) por precedência.",
            conflicts.len()
        ));
    }
    if familiarity.overall < 70 {
        alerts.push("Familiaridade coletiva abaixo do limiar de atenção de 70%.".to_owned());
    }
    let readiness = average([
        familiarity.overall,
        spatial.compactness,
        100_u8.saturating_sub(strategy.risk / 2),
    ]);
    TacticalDiagnostic {
        valid: true,
        readiness,
        strengths: strategy.strengths.clone(),
        vulnerabilities: strategy.vulnerabilities.clone(),
        risks,
        alerts,
    }
}

fn recommendations(
    placements: &[TacticalPlayerPlacement],
    spatial: &TacticalSpatialAnalysis,
    config: &TacticalStrategyConfig,
) -> Vec<TacticalRecommendation> {
    let affected_players = placements
        .iter()
        .map(|placement| placement.player_id.clone())
        .collect();
    let mut recommendations = Vec::new();
    if spatial.width < 45 {
        recommendations.push(TacticalRecommendation {
            recommendation_id: "staff.restore-width".to_owned(),
            reason: format!(
                "A estrutura base ocupa {}% da largura e concentra apoios.",
                spatial.width
            ),
            proposed_changes: vec![TacticalConfigChange {
                path: "strategy.inPossession.width".to_owned(),
                from: config.in_possession.width,
                to: 55,
            }],
            benefit: "criar uma linha de passe adicional no corredor oposto".to_owned(),
            risk: "aumentar a distância para reagir após a perda".to_owned(),
            affected_players,
            confidence: 82,
        });
    } else if spatial.compactness < 55 {
        recommendations.push(TacticalRecommendation {
            recommendation_id: "staff.improve-compactness".to_owned(),
            reason: format!(
                "A distância média entre setores produz compactação de {}%.",
                spatial.compactness
            ),
            proposed_changes: vec![TacticalConfigChange {
                path: "strategy.outOfPossession.compactness".to_owned(),
                from: config.out_of_possession.compactness,
                to: 70,
            }],
            benefit: "reduzir espaço entre meio e defesa".to_owned(),
            risk: "ceder mais largura ao adversário".to_owned(),
            affected_players,
            confidence: 78,
        });
    }
    recommendations
}

pub fn resolve_tactical_model(
    context: TacticalResolutionContext<'_>,
) -> Result<TacticalModelSnapshot, String> {
    validate_config(&context.config)?;
    let spatial = spatial_analysis(context.placements);
    let structures = derive_structures(context.placements, &context.config.strategy);
    let resolved_strategy = resolve_strategy(&context.config.strategy);
    let (resolved_instructions, instruction_conflicts) =
        resolve_instructions(&context.config.instructions);
    let opposition = current_opposition(&context.config.opposition, context.now);
    let familiarity = familiarity(&context, &resolved_instructions);
    let diagnostic = diagnostic(
        &spatial,
        &resolved_strategy,
        &familiarity,
        &instruction_conflicts,
    );
    let recommendations = recommendations(context.placements, &spatial, &context.config.strategy);
    let starters = context
        .placements
        .iter()
        .map(|placement| placement.player_id.clone())
        .collect();
    let match_snapshot = TacticalMatchSnapshot {
        schema_version: TACTICAL_MATCH_SNAPSHOT_SCHEMA_VERSION,
        tactical_plan_id: context.tactical_plan_id.to_owned(),
        variation_id: context.variation_id.to_owned(),
        revision: context.revision,
        starters,
        bench: context.bench.to_vec(),
        normalized_placements: context.placements.to_vec(),
        structures: structures.clone(),
        strategy: resolved_strategy.clone(),
        instructions: resolved_instructions.clone(),
        opposition: opposition.clone(),
        familiarity: familiarity.clone(),
        spatial: spatial.clone(),
        risks: diagnostic.risks.clone(),
        vulnerabilities: diagnostic.vulnerabilities.clone(),
        valid: diagnostic.valid,
        created_at: context.now,
    };
    Ok(TacticalModelSnapshot {
        schema_version: TACTICAL_MODEL_SCHEMA_VERSION,
        config: context.config,
        structures,
        spatial,
        resolved_strategy,
        resolved_instructions,
        instruction_conflicts,
        opposition,
        familiarity,
        diagnostic,
        recommendations,
        match_snapshot,
    })
}

pub fn compare_tactical_models(
    from_revision: u64,
    before: &TacticalModelSnapshot,
    after: &TacticalModelSnapshot,
) -> TacticalComparison {
    let mut changes = Vec::new();
    let mut push_numeric =
        |id: &str, label: &str, before_value: u8, after_value: u8, cause: &str| {
            if before_value != after_value {
                changes.push(TacticalComparisonChange {
                    change_id: id.to_owned(),
                    label: label.to_owned(),
                    before: before_value.to_string(),
                    after: after_value.to_string(),
                    cause: cause.to_owned(),
                    expected_consequences: after
                        .resolved_strategy
                        .strengths
                        .iter()
                        .chain(after.resolved_strategy.vulnerabilities.iter())
                        .take(4)
                        .cloned()
                        .collect(),
                });
            }
        };
    push_numeric(
        "width",
        "Largura com a bola",
        before.config.strategy.in_possession.width,
        after.config.strategy.in_possession.width,
        "Ajuste de estratégia",
    );
    push_numeric(
        "tempo",
        "Ritmo",
        before.config.strategy.in_possession.tempo,
        after.config.strategy.in_possession.tempo,
        "Ajuste de estratégia",
    );
    push_numeric(
        "defensiveLine",
        "Linha defensiva",
        before.config.strategy.out_of_possession.defensive_line,
        after.config.strategy.out_of_possession.defensive_line,
        "Ajuste sem a bola",
    );
    push_numeric(
        "pressure",
        "Pressão",
        before.config.strategy.out_of_possession.pressure,
        after.config.strategy.out_of_possession.pressure,
        "Ajuste sem a bola",
    );
    push_numeric(
        "compactness",
        "Compactação",
        before.config.strategy.out_of_possession.compactness,
        after.config.strategy.out_of_possession.compactness,
        "Ajuste sem a bola",
    );
    if before.resolved_instructions.len() != after.resolved_instructions.len() {
        changes.push(TacticalComparisonChange {
            change_id: "instructions".to_owned(),
            label: "Instruções resolvidas".to_owned(),
            before: before.resolved_instructions.len().to_string(),
            after: after.resolved_instructions.len().to_string(),
            cause: "Editor de instruções".to_owned(),
            expected_consequences: after
                .resolved_instructions
                .iter()
                .flat_map(|instruction| instruction.expected_effects.iter())
                .take(4)
                .cloned()
                .collect(),
        });
    }
    let before_risks: HashSet<_> = before.diagnostic.risks.iter().cloned().collect();
    let after_risks: HashSet<_> = after.diagnostic.risks.iter().cloned().collect();
    TacticalComparison {
        from_revision,
        to_revision: after.match_snapshot.revision,
        changes,
        familiarity_before: before.familiarity.overall,
        familiarity_after: after.familiarity.overall,
        affected_players: after
            .familiarity
            .individuals
            .iter()
            .filter(|player| {
                before
                    .familiarity
                    .individuals
                    .iter()
                    .find(|candidate| candidate.player_id == player.player_id)
                    .is_none_or(|candidate| candidate.contextual != player.contextual)
            })
            .map(|player| player.player_id.clone())
            .collect(),
        risks_created: after_risks.difference(&before_risks).cloned().collect(),
        risks_reduced: before_risks.difference(&after_risks).cloned().collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::matchday::MatchdayState;

    fn resolve(
        state: &MatchdayState,
        config: TacticalModelConfig,
        now: u64,
    ) -> TacticalModelSnapshot {
        let library = state.tactical_library.as_ref().expect("library");
        let plan = library.variations.first().expect("plan");
        resolve_tactical_model(TacticalResolutionContext {
            tactical_plan_id: "tactical-plan.primary",
            variation_id: &plan.variation_id,
            revision: plan.revision,
            placements: &plan.placements,
            bench: &plan.bench,
            players: &state.players,
            config,
            previous: None,
            now,
            record_history: true,
        })
        .expect("resolve model")
    }

    #[test]
    fn resolves_five_phases_and_spatial_facts_from_normalized_placements() {
        let state = MatchdayState::default();
        let model = resolve(&state, TacticalModelConfig::default(), 100);
        assert_eq!(model.structures.len(), 5);
        assert_eq!(model.structures[0].phase, TacticalGamePhase::Base);
        assert_eq!(
            model.structures[0].players[0].normalized_x,
            model.match_snapshot.normalized_placements[0].normalized_x
        );
        assert!(model.spatial.width > 0);
        assert!(model.spatial.depth > 0);
        assert_eq!(model.spatial.left_corridor_players, 3);
        assert_eq!(model.spatial.central_corridor_players, 5);
        assert_eq!(model.spatial.right_corridor_players, 3);
        assert_eq!(model.spatial.build_up_shape, "back4");
        assert!(!model.spatial.cover_pairs.is_empty());
    }

    #[test]
    fn preset_resolution_is_explicit_deterministic_and_customizable() {
        let first = TacticalStrategyConfig::for_preset(TacticalStrategyPresetId::Protagonist);
        let second = TacticalStrategyConfig::for_preset(TacticalStrategyPresetId::Protagonist);
        assert_eq!(first, second);
        assert_eq!(first.out_of_possession.pressure, 78);
        assert_eq!(
            first.transitions.loss_reaction,
            TacticalLossReaction::CounterPress
        );
        assert!(!first.customized);
    }

    #[test]
    fn individual_instruction_wins_a_collective_conflict_with_an_explanation() {
        let state = MatchdayState::default();
        let player_id = state.tactical_library.as_ref().expect("library").variations[0].placements
            [0]
        .player_id
        .clone();
        let mut config = TacticalModelConfig::default();
        config.instructions.push(TacticalInstruction {
            instruction_id: "individual.regroup".to_owned(),
            category: TacticalInstructionCategory::Pressure,
            scope: TacticalInstructionScope::Individual,
            target: player_id,
            value: "regroup".to_owned(),
            intensity: 40,
            description: "Preservar o jogador após a perda.".to_owned(),
            expected_effects: vec!["mais proteção".to_owned()],
            requirements: vec![],
            incompatibilities: vec!["collective.counter-press".to_owned()],
            precedence: 50,
            familiarity_impact: -2,
            revision: 0,
        });
        let model = resolve(&state, config, 100);
        assert_eq!(model.instruction_conflicts.len(), 1);
        assert_eq!(
            model.instruction_conflicts[0].winner_id,
            "individual.regroup"
        );
        assert!(
            model.instruction_conflicts[0]
                .reason
                .contains("precedência")
        );
    }

    #[test]
    fn opposition_knowledge_and_instructions_expire_without_fabricating_data() {
        let state = MatchdayState::default();
        let config = TacticalModelConfig {
            opposition: TacticalOppositionPlan {
                opponent_id: Some("opponent".to_owned()),
                knowledge: Some(OpponentKnowledge {
                    confidence: 64,
                    source: "analyst-report".to_owned(),
                    observed_at: 10,
                    expires_at: Some(20),
                    known_facts: vec!["progressão pelo lado direito".to_owned()],
                    unknown_facts: vec!["escalação".to_owned()],
                    threats: vec!["amplitude".to_owned()],
                    vulnerabilities: vec![],
                }),
                instructions: vec![OppositionInstruction {
                    instruction_id: "press-right-back".to_owned(),
                    scope: TacticalInstructionScope::Position,
                    target_id: "RB".to_owned(),
                    pressure: 70,
                    tight_marking: true,
                    preferred_foot: None,
                    blocked_lane: Some("inside".to_owned()),
                    protected_zone: None,
                    expires_at: Some(20),
                }],
            },
            ..TacticalModelConfig::default()
        };
        let current = resolve(&state, config.clone(), 15);
        assert_eq!(
            current
                .opposition
                .knowledge
                .as_ref()
                .expect("knowledge")
                .confidence,
            64
        );
        assert_eq!(current.opposition.instructions.len(), 1);
        let expired = resolve(&state, config, 20);
        assert!(expired.opposition.knowledge.is_none());
        assert!(expired.opposition.instructions.is_empty());
    }

    #[test]
    fn familiarity_is_multidimensional_individual_explainable_and_historical() {
        let state = MatchdayState::default();
        let initial = resolve(&state, TacticalModelConfig::default(), 100);
        assert!(initial.familiarity.collective.len() >= 8);
        assert_eq!(initial.familiarity.individuals.len(), 11);
        assert_eq!(initial.familiarity.units.len(), 3);
        assert!(!initial.familiarity.history.is_empty());
        assert!(
            initial
                .familiarity
                .history
                .iter()
                .all(|event| !event.explanation.is_empty())
        );
    }

    #[test]
    fn match_snapshot_is_serializable_versioned_and_free_of_visual_coordinates() {
        let state = MatchdayState::default();
        let model = resolve(&state, TacticalModelConfig::default(), 100);
        fn assert_serializable<T: Serialize>(_: &T) {}
        assert_serializable(&model.match_snapshot);
        assert_eq!(model.match_snapshot.schema_version, 1);
        assert_eq!(model.match_snapshot.starters.len(), 11);
        assert_eq!(model.match_snapshot.normalized_placements.len(), 11);
    }

    #[test]
    fn spatial_interpretation_reports_empty_corridors_asymmetry_and_a_back_three() {
        let state = MatchdayState::default();
        let plan = state.tactical_library.as_ref().expect("library").variations[0].clone();
        let mut placements = plan.placements.clone();
        for (index, placement) in placements.iter_mut().enumerate() {
            placement.normalized_y = if index < 2 { 0.18 } else { 0.5 };
            if (1..=3).contains(&index) {
                placement.line = TacticalLine::Defence;
            } else if index > 3 {
                placement.line = TacticalLine::Midfield;
            }
        }
        let model = resolve_tactical_model(TacticalResolutionContext {
            tactical_plan_id: &plan.variation_id,
            variation_id: &plan.variation_id,
            revision: plan.revision,
            placements: &placements,
            bench: &plan.bench,
            players: &state.players,
            config: TacticalModelConfig::default(),
            previous: None,
            now: 100,
            record_history: false,
        })
        .expect("spatial model");

        assert_eq!(model.spatial.build_up_shape, "backThree");
        assert!(model.spatial.empty_corridors.contains(&"right".to_owned()));
        assert!(model.spatial.asymmetry < 0);
        assert_eq!(model.match_snapshot.normalized_placements, placements);
    }

    #[test]
    fn all_instruction_scopes_resolve_with_explicit_precedence() {
        let state = MatchdayState::default();
        let instructions = [
            TacticalInstructionScope::Collective,
            TacticalInstructionScope::Sector,
            TacticalInstructionScope::Position,
            TacticalInstructionScope::Role,
            TacticalInstructionScope::Individual,
        ]
        .into_iter()
        .enumerate()
        .map(|(index, scope)| TacticalInstruction {
            instruction_id: format!("scope.{index}"),
            category: TacticalInstructionCategory::Creativity,
            scope,
            target: format!("target.{index}"),
            value: format!("behavior.{index}"),
            intensity: 50,
            description: format!("scope {index}"),
            expected_effects: vec![format!("effect {index}")],
            requirements: vec![],
            incompatibilities: vec![],
            precedence: 0,
            familiarity_impact: -1,
            revision: 0,
        })
        .collect();
        let config = TacticalModelConfig {
            instructions,
            ..TacticalModelConfig::default()
        };

        let model = resolve(&state, config, 100);
        assert_eq!(model.resolved_instructions.len(), 5);
        assert!(model.instruction_conflicts.is_empty());
        assert!(
            model.resolved_instructions[0].precedence > model.resolved_instructions[4].precedence
        );
    }

    #[test]
    fn match_snapshot_is_deterministic() {
        let state = MatchdayState::default();
        let first = resolve(&state, TacticalModelConfig::default(), 777);
        let second = resolve(&state, TacticalModelConfig::default(), 777);
        assert_eq!(first.match_snapshot, second.match_snapshot);
        assert!(first.match_snapshot.valid);
    }

    #[test]
    fn invalid_instruction_and_opposition_bounds_are_rejected_without_panicking() {
        let state = MatchdayState::default();
        let plan = state.tactical_library.as_ref().expect("library").variations[0].clone();
        let mut config = TacticalModelConfig::default();
        config.instructions[0].precedence = 101;
        assert!(
            resolve_tactical_model(TacticalResolutionContext {
                tactical_plan_id: &plan.variation_id,
                variation_id: &plan.variation_id,
                revision: plan.revision,
                placements: &plan.placements,
                bench: &plan.bench,
                players: &state.players,
                config,
                previous: None,
                now: 100,
                record_history: false,
            })
            .is_err()
        );

        let mut config = TacticalModelConfig::default();
        config.opposition.instructions.push(OppositionInstruction {
            instruction_id: "opposition.invalid-pressure".to_owned(),
            scope: TacticalInstructionScope::Individual,
            target_id: "opponent.player".to_owned(),
            pressure: 101,
            tight_marking: false,
            preferred_foot: None,
            blocked_lane: None,
            protected_zone: None,
            expires_at: None,
        });
        assert!(
            resolve_tactical_model(TacticalResolutionContext {
                tactical_plan_id: &plan.variation_id,
                variation_id: &plan.variation_id,
                revision: plan.revision,
                placements: &plan.placements,
                bench: &plan.bench,
                players: &state.players,
                config,
                previous: None,
                now: 100,
                record_history: false,
            })
            .is_err()
        );
    }

    #[test]
    fn strategy_catalog_exposes_explicit_resolved_parameters() {
        let catalog = tactical_strategy_preset_catalog();
        assert_eq!(catalog.len(), 3);
        assert!(
            catalog
                .iter()
                .all(|preset| !preset.resolved.explicit_parameters.is_empty())
        );
        assert_ne!(catalog[0].config, catalog[1].config);
    }
}
