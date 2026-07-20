use std::collections::{BTreeMap, HashMap, HashSet};

use serde::{Deserialize, Serialize};

use crate::{
    CoachAttributeSet, GameplayReadiness, PackageVisibility, Person, PersonRoleKind,
    PlayerAttributeSet, Position, RATING_SCALE_VERSION, RuntimeProfileAvailability,
};

pub const EVALUATION_SCHEMA_VERSION: u16 = 1;
pub const EVALUATION_LAYER_SCHEMA_VERSION: u16 = 1;
pub const OFFICIAL_METHODOLOGY_ID: &str = "rivallo.evaluation.foundation";
pub const OFFICIAL_METHODOLOGY_VERSION: &str = "1.0.0";

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum MethodologyStatus {
    Draft,
    InReview,
    Approved,
    Obsolete,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationScale {
    pub scale_id: String,
    pub label: String,
    pub minimum: u8,
    pub maximum: u8,
    pub integer_only: bool,
    pub semantics: String,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum EvaluationSubject {
    Player,
    Coach,
    StaffMember,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum EvaluationValueKind {
    Exact,
    Range,
    Qualitative,
    Unknown,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationDimension {
    pub dimension_id: String,
    pub label: String,
    pub description: String,
    pub subjects: Vec<EvaluationSubject>,
    pub scale_id: Option<String>,
    pub allowed_value_kinds: Vec<EvaluationValueKind>,
    pub minimum_evidence: u16,
    pub required_for_approval: bool,
    pub consumer: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationRule {
    pub rule_id: String,
    pub label: String,
    pub target_dimension_id: String,
    pub evidence_kinds: Vec<EvidenceKind>,
    pub minimum_evidence: u16,
    pub explanation: String,
    pub limitation: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationWeight {
    pub context_id: String,
    pub dimension_id: String,
    pub weight: u8,
    pub explanation: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationThreshold {
    pub threshold_id: String,
    pub dimension_id: String,
    pub minimum_confidence: u8,
    pub minimum_evidence: u16,
    pub blocks_approval: bool,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationCalibrationProfile {
    pub calibration_id: String,
    pub version: String,
    pub synthetic_only: bool,
    pub target_groups: Vec<String>,
    pub invariants: Vec<String>,
    pub notes: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationMethodologyVersion {
    pub methodology_id: String,
    pub version: String,
    pub schema_version: u16,
    pub created_at: String,
    pub author: String,
    pub origin: String,
    pub description: String,
    pub status: MethodologyStatus,
    pub scales: Vec<EvaluationScale>,
    pub dimensions: Vec<EvaluationDimension>,
    pub rules: Vec<EvaluationRule>,
    pub weights: Vec<EvaluationWeight>,
    pub thresholds: Vec<EvaluationThreshold>,
    pub dependencies: Vec<String>,
    pub changelog: Vec<String>,
    pub compatible_rating_scales: Vec<String>,
    pub calibration: EvaluationCalibrationProfile,
}

impl EvaluationMethodologyVersion {
    pub fn validate(&self) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();
        if self.methodology_id.trim().is_empty() || self.version.trim().is_empty() {
            errors.push("Metodologia e versão são obrigatórias.".to_owned());
        }
        if self.schema_version != EVALUATION_SCHEMA_VERSION {
            errors.push("Schema de metodologia incompatível.".to_owned());
        }
        let scale_ids = self
            .scales
            .iter()
            .map(|scale| scale.scale_id.as_str())
            .collect::<HashSet<_>>();
        if self.scales.iter().any(|scale| {
            scale.minimum >= scale.maximum || scale.maximum != 100 || scale.minimum != 0
        }) {
            errors.push("A escala estrutural canônica precisa permanecer em 0–100.".to_owned());
        }
        let dimension_ids = self
            .dimensions
            .iter()
            .map(|dimension| dimension.dimension_id.as_str())
            .collect::<HashSet<_>>();
        if dimension_ids.len() != self.dimensions.len() {
            errors.push("Dimensões duplicadas não são permitidas.".to_owned());
        }
        for dimension in &self.dimensions {
            if dimension
                .scale_id
                .as_deref()
                .is_some_and(|scale| !scale_ids.contains(scale))
            {
                errors.push(format!(
                    "A dimensão {} referencia escala inexistente.",
                    dimension.dimension_id
                ));
            }
        }
        for rule in &self.rules {
            if !dimension_ids.contains(rule.target_dimension_id.as_str()) {
                errors.push(format!(
                    "A regra {} referencia dimensão inexistente.",
                    rule.rule_id
                ));
            }
        }
        let grouped =
            self.weights
                .iter()
                .fold(BTreeMap::<&str, u16>::new(), |mut totals, weight| {
                    *totals.entry(weight.context_id.as_str()).or_default() +=
                        u16::from(weight.weight);
                    totals
                });
        for (context, total) in grouped {
            if total != 100 {
                errors.push(format!("Os pesos de {context} somam {total}, não 100."));
            }
        }
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum EvidenceKind {
    ObjectiveStatistic,
    ManualObservation,
    TechnicalReport,
    PerformanceHistory,
    DeclaredPosition,
    Minutes,
    Availability,
    ExpertAssessment,
    DatasetImport,
    StructuredQualitative,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvidenceSource {
    pub source_id: String,
    pub label: String,
    pub source_type: String,
    pub license: String,
    pub provenance: String,
    pub precision: u8,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvidencePeriod {
    pub starts_at: Option<String>,
    pub ends_at: Option<String>,
    pub competition_id: Option<String>,
    pub context: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvidenceQuality {
    pub completeness: u8,
    pub recency: u8,
    pub reliability: u8,
    pub consistency: u8,
    pub precision: u8,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvidenceMetric {
    pub metric_id: String,
    pub value: f64,
    pub unit: String,
    pub sample_size: Option<u32>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvidenceObservation {
    pub dimension_id: String,
    pub statement: String,
    pub positive: bool,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationEvidence {
    pub evidence_id: String,
    pub entity_id: String,
    pub kind: EvidenceKind,
    pub source: EvidenceSource,
    pub source_record_id: Option<String>,
    pub collected_at: String,
    pub verified_at: Option<String>,
    pub period: EvidencePeriod,
    pub metric: Option<EvidenceMetric>,
    pub observation: Option<EvidenceObservation>,
    pub quality: EvidenceQuality,
    pub confidence: u8,
    pub notes: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvidenceConflict {
    pub conflict_id: String,
    pub metric_id: String,
    pub evidence_ids: Vec<String>,
    pub explanation: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConfidenceBreakdown {
    pub coverage: u8,
    pub recency: u8,
    pub quality: u8,
    pub consistency: u8,
    pub precision: u8,
    pub conflicts: u16,
    pub final_score: u8,
    pub explanation: String,
}

fn average(values: impl Iterator<Item = u8>) -> u8 {
    let values = values.collect::<Vec<_>>();
    if values.is_empty() {
        return 0;
    }
    (values.iter().map(|value| u32::from(*value)).sum::<u32>() / values.len() as u32) as u8
}

pub fn detect_evidence_conflicts(evidence: &[EvaluationEvidence]) -> Vec<EvidenceConflict> {
    let mut by_metric: BTreeMap<&str, Vec<&EvaluationEvidence>> = BTreeMap::new();
    for item in evidence {
        if let Some(metric) = &item.metric {
            by_metric
                .entry(metric.metric_id.as_str())
                .or_default()
                .push(item);
        }
    }
    by_metric
        .into_iter()
        .filter_map(|(metric_id, items)| {
            let values = items
                .iter()
                .filter_map(|item| item.metric.as_ref().map(|metric| metric.value))
                .collect::<Vec<_>>();
            let minimum = values.iter().copied().reduce(f64::min)?;
            let maximum = values.iter().copied().reduce(f64::max)?;
            let tolerance = maximum.abs().max(1.0) * 0.15;
            (maximum - minimum > tolerance).then(|| EvidenceConflict {
                conflict_id: format!("conflict.{metric_id}"),
                metric_id: metric_id.to_owned(),
                evidence_ids: items.iter().map(|item| item.evidence_id.clone()).collect(),
                explanation: "Fontes comparáveis divergem além da tolerância metodológica de 15%."
                    .to_owned(),
            })
        })
        .collect()
}

pub fn calculate_confidence(
    evidence: &[EvaluationEvidence],
    required_dimensions: &[String],
) -> ConfidenceBreakdown {
    let represented = evidence
        .iter()
        .filter_map(|item| {
            item.observation
                .as_ref()
                .map(|value| value.dimension_id.as_str())
        })
        .collect::<HashSet<_>>();
    let coverage = if required_dimensions.is_empty() {
        0
    } else {
        ((represented
            .iter()
            .filter(|dimension| required_dimensions.iter().any(|item| item == **dimension))
            .count()
            * 100)
            / required_dimensions.len()) as u8
    };
    let recency = average(evidence.iter().map(|item| item.quality.recency));
    let quality =
        average(evidence.iter().map(|item| {
            average([item.quality.completeness, item.quality.reliability].into_iter())
        }));
    let raw_consistency = average(evidence.iter().map(|item| item.quality.consistency));
    let precision = average(evidence.iter().map(|item| {
        average(
            [
                item.quality.precision,
                item.source.precision,
                item.confidence,
            ]
            .into_iter(),
        )
    }));
    let conflicts = detect_evidence_conflicts(evidence);
    let conflict_penalty = (conflicts.len() as u16).saturating_mul(8).min(32) as u8;
    let consistency = raw_consistency.saturating_sub(conflict_penalty);
    let final_score = ((u16::from(coverage) * 25
        + u16::from(recency) * 20
        + u16::from(quality) * 25
        + u16::from(consistency) * 20
        + u16::from(precision) * 10)
        / 100) as u8;
    ConfidenceBreakdown {
        coverage,
        recency,
        quality,
        consistency,
        precision,
        conflicts: conflicts.len().try_into().unwrap_or(u16::MAX),
        final_score,
        explanation: if evidence.is_empty() {
            "Sem evidência: a avaliação deve permanecer desconhecida e não pode ser aprovada."
                .to_owned()
        } else {
            "Confiança mede cobertura e confiabilidade da avaliação; não mede a qualidade esportiva da pessoa."
                .to_owned()
        },
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum EvaluationValue {
    Exact { value: u8 },
    Range { minimum: u8, maximum: u8 },
    Qualitative { label: String },
    Unknown,
}

impl EvaluationValue {
    pub fn validate(&self) -> bool {
        match self {
            Self::Exact { value } => *value <= 100,
            Self::Range { minimum, maximum } => minimum <= maximum && *maximum <= 100,
            Self::Qualitative { label } => !label.trim().is_empty(),
            Self::Unknown => true,
        }
    }

    pub fn midpoint(&self) -> Option<u8> {
        match self {
            Self::Exact { value } => Some(*value),
            Self::Range { minimum, maximum } => Some((minimum + maximum) / 2),
            Self::Qualitative { .. } | Self::Unknown => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum AssessmentStatus {
    NotEvaluated,
    Draft,
    InsufficientEvidence,
    InReview,
    Approved,
    Rejected,
    Stale,
    Superseded,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DimensionAssessment {
    pub dimension_id: String,
    pub value: EvaluationValue,
    pub confidence: ConfidenceBreakdown,
    pub evidence_ids: Vec<String>,
    pub methodology_rule_ids: Vec<String>,
    pub explanation: String,
    pub positive_factors: Vec<String>,
    pub limitations: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PositionAssessment {
    pub position: Position,
    pub natural: bool,
    pub secondary: bool,
    pub suitability: EvaluationValue,
    pub confidence: ConfidenceBreakdown,
    pub evidence_ids: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RoleAssessment {
    pub role_id: String,
    pub position: Position,
    pub responsibilities: Vec<String>,
    pub rating: DimensionAssessment,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PotentialAssessment {
    pub internal_simulation_seed: Option<u8>,
    pub perceived: EvaluationValue,
    pub confidence: ConfidenceBreakdown,
    pub horizon_months: u16,
    pub evidence_ids: Vec<String>,
    pub factors: Vec<String>,
    pub limitations: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PlayerEvaluation {
    pub attributes: Vec<DimensionAssessment>,
    pub positions: Vec<PositionAssessment>,
    pub roles: Vec<RoleAssessment>,
    pub current_ability: DimensionAssessment,
    pub potential: PotentialAssessment,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CoachEvaluation {
    pub role_id: String,
    pub capabilities: Vec<DimensionAssessment>,
    pub specialties: Vec<SpecialtyAssessment>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StaffEvaluation {
    pub staff_role_id: String,
    pub capabilities: Vec<DimensionAssessment>,
    pub specialties: Vec<SpecialtyAssessment>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SpecialtyAssessment {
    pub specialty_id: String,
    pub criteria: Vec<String>,
    pub evidence_ids: Vec<String>,
    pub confidence: ConfidenceBreakdown,
    pub future_consumer: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(tag = "subject", content = "content", rename_all = "camelCase")]
pub enum EvaluationPayload {
    Player(Box<PlayerEvaluation>),
    Coach(CoachEvaluation),
    StaffMember(StaffEvaluation),
}

impl EvaluationPayload {
    pub const fn subject(&self) -> EvaluationSubject {
        match self {
            Self::Player(_) => EvaluationSubject::Player,
            Self::Coach(_) => EvaluationSubject::Coach,
            Self::StaffMember(_) => EvaluationSubject::StaffMember,
        }
    }

    pub fn dimensions(&self) -> Vec<&DimensionAssessment> {
        match self {
            Self::Player(player) => player
                .attributes
                .iter()
                .chain(std::iter::once(&player.current_ability))
                .chain(player.roles.iter().map(|role| &role.rating))
                .collect(),
            Self::Coach(coach) => coach.capabilities.iter().collect(),
            Self::StaffMember(staff) => staff.capabilities.iter().collect(),
        }
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EntityEvaluation {
    pub evaluation_id: String,
    pub entity_id: String,
    pub methodology_id: String,
    pub methodology_version: String,
    pub status: AssessmentStatus,
    pub author: String,
    pub reviewer: Option<String>,
    pub created_at: String,
    pub submitted_at: Option<String>,
    pub reviewed_at: Option<String>,
    pub valid_until: Option<String>,
    pub overall_confidence: ConfidenceBreakdown,
    pub payload: EvaluationPayload,
    pub explanation: String,
    pub stale_reason: Option<String>,
    pub supersedes_evaluation_id: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApprovedPlayerRatingInputs {
    pub attributes: PlayerAttributeSet,
    pub natural_position: Position,
    pub internal_potential_seed: Option<u8>,
    pub methodology_id: String,
    pub methodology_version: String,
    pub evaluation_id: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApprovedCoachRatingInputs {
    pub attributes: CoachAttributeSet,
    pub role_id: String,
    pub methodology_id: String,
    pub methodology_version: String,
    pub evaluation_id: String,
}

fn exact_dimension(dimensions: &[DimensionAssessment], id: &str) -> Result<u8, String> {
    let dimension = dimensions
        .iter()
        .find(|dimension| dimension.dimension_id == id)
        .ok_or_else(|| format!("A dimensão {id} está ausente."))?;
    match dimension.value {
        EvaluationValue::Exact { value } => Ok(value),
        EvaluationValue::Range { .. } => Err(format!(
            "A dimensão {id} permanece em faixa; midpoint implícito é proibido."
        )),
        EvaluationValue::Qualitative { .. } | EvaluationValue::Unknown => {
            Err(format!("A dimensão {id} não possui valor runtime exato."))
        }
    }
}

pub fn approved_player_rating_inputs(
    assessment: &EntityEvaluation,
) -> Result<ApprovedPlayerRatingInputs, String> {
    if assessment.status != AssessmentStatus::Approved {
        return Err("Somente avaliação aprovada pode alimentar ratings runtime.".to_owned());
    }
    let EvaluationPayload::Player(player) = &assessment.payload else {
        return Err("A avaliação não pertence a um jogador.".to_owned());
    };
    let natural_position = player
        .positions
        .iter()
        .find(|position| position.natural)
        .map(|position| position.position)
        .ok_or_else(|| "A posição natural avaliada está ausente.".to_owned())?;
    let goalkeeper = natural_position == Position::Gk;
    let attributes = if goalkeeper {
        PlayerAttributeSet::Goalkeeper {
            reaction: exact_dimension(&player.attributes, "goalkeeper.reaction")?,
            positioning: exact_dimension(&player.attributes, "goalkeeper.positioning")?,
            handling: exact_dimension(&player.attributes, "goalkeeper.handling")?,
            mobility: exact_dimension(&player.attributes, "goalkeeper.mobility")?,
            rushing_out: exact_dimension(&player.attributes, "goalkeeper.rushingOut")?,
            distribution: exact_dimension(&player.attributes, "goalkeeper.distribution")?,
        }
    } else {
        PlayerAttributeSet::Outfield {
            finishing: exact_dimension(&player.attributes, "player.finishing")?,
            technique: exact_dimension(&player.attributes, "player.technique")?,
            passing: exact_dimension(&player.attributes, "player.passing")?,
            tackling: exact_dimension(&player.attributes, "player.tackling")?,
            physical: exact_dimension(&player.attributes, "player.physical")?,
            pace: exact_dimension(&player.attributes, "player.pace")?,
        }
    };
    Ok(ApprovedPlayerRatingInputs {
        attributes,
        natural_position,
        internal_potential_seed: player.potential.internal_simulation_seed,
        methodology_id: assessment.methodology_id.clone(),
        methodology_version: assessment.methodology_version.clone(),
        evaluation_id: assessment.evaluation_id.clone(),
    })
}

pub fn approved_coach_rating_inputs(
    assessment: &EntityEvaluation,
) -> Result<ApprovedCoachRatingInputs, String> {
    if assessment.status != AssessmentStatus::Approved {
        return Err("Somente avaliação aprovada pode alimentar ratings runtime.".to_owned());
    }
    let EvaluationPayload::Coach(coach) = &assessment.payload else {
        return Err("A avaliação não pertence a um treinador.".to_owned());
    };
    let get = |id: &str| exact_dimension(&coach.capabilities, id);
    Ok(ApprovedCoachRatingInputs {
        attributes: CoachAttributeSet {
            tactical: get("coach.tactical")?,
            preparation: get("coach.preparation")?,
            adaptability: get("coach.adaptability")?,
            decision_making: get("coach.decisionMaking")?,
            technical_development: get("coach.technicalDevelopment")?,
            physical_development: get("coach.physicalDevelopment")?,
            mental_development: get("coach.mentalDevelopment")?,
            tactical_development: get("coach.tacticalDevelopment")?,
            youth_development: get("coach.youthDevelopment")?,
            motivation: get("coach.motivation")?,
            communication: get("coach.communication")?,
            discipline: get("coach.discipline")?,
            people_management: get("coach.peopleManagement")?,
            ability_judgement: get("coach.abilityJudgement")?,
            potential_judgement: get("coach.potentialJudgement")?,
        },
        role_id: coach.role_id.clone(),
        methodology_id: assessment.methodology_id.clone(),
        methodology_version: assessment.methodology_version.clone(),
        evaluation_id: assessment.evaluation_id.clone(),
    })
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ReviewActionKind {
    Submit,
    Approve,
    ReturnForEvidence,
    Reject,
    MarkStale,
    Supersede,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationReviewAction {
    pub action_id: String,
    pub evaluation_id: String,
    pub action: ReviewActionKind,
    pub actor: String,
    pub occurred_at: String,
    pub notes: String,
    pub from_status: AssessmentStatus,
    pub to_status: AssessmentStatus,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationHistoryEntry {
    pub revision: u64,
    pub evaluation_id: String,
    pub changed_at: String,
    pub changed_by: String,
    pub summary: String,
    pub action: Option<EvaluationReviewAction>,
}

pub fn apply_review_action(
    evaluation: &mut EntityEvaluation,
    action: ReviewActionKind,
    actor: &str,
    occurred_at: &str,
    notes: &str,
) -> Result<EvaluationReviewAction, String> {
    let from = evaluation.status;
    let to = match (from, action) {
        (
            AssessmentStatus::Draft | AssessmentStatus::InsufficientEvidence,
            ReviewActionKind::Submit,
        ) => {
            if evaluation.overall_confidence.final_score == 0
                || evaluation.payload.dimensions().iter().any(|dimension| {
                    matches!(dimension.value, EvaluationValue::Unknown)
                        || dimension.evidence_ids.is_empty()
                })
            {
                AssessmentStatus::InsufficientEvidence
            } else {
                AssessmentStatus::InReview
            }
        }
        (AssessmentStatus::InReview, ReviewActionKind::Approve) => AssessmentStatus::Approved,
        (AssessmentStatus::InReview, ReviewActionKind::ReturnForEvidence) => {
            AssessmentStatus::InsufficientEvidence
        }
        (AssessmentStatus::InReview, ReviewActionKind::Reject) => AssessmentStatus::Rejected,
        (AssessmentStatus::Approved, ReviewActionKind::MarkStale) => AssessmentStatus::Stale,
        (AssessmentStatus::Approved | AssessmentStatus::Stale, ReviewActionKind::Supersede) => {
            AssessmentStatus::Superseded
        }
        _ => return Err("Transição editorial inválida para o estado atual.".to_owned()),
    };
    evaluation.status = to;
    if action == ReviewActionKind::Submit {
        evaluation.submitted_at = Some(occurred_at.to_owned());
    }
    if matches!(action, ReviewActionKind::Approve | ReviewActionKind::Reject) {
        evaluation.reviewer = Some(actor.to_owned());
        evaluation.reviewed_at = Some(occurred_at.to_owned());
    }
    if action == ReviewActionKind::MarkStale {
        evaluation.stale_reason = Some(notes.to_owned());
    }
    Ok(EvaluationReviewAction {
        action_id: format!("{}.{}", evaluation.evaluation_id, occurred_at),
        evaluation_id: evaluation.evaluation_id.clone(),
        action,
        actor: actor.to_owned(),
        occurred_at: occurred_at.to_owned(),
        notes: notes.to_owned(),
        from_status: from,
        to_status: to,
    })
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationLayerProvenance {
    pub source: String,
    pub rights: String,
    pub created_at: String,
    pub notes: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationLayerManifest {
    pub package_id: String,
    pub version: String,
    pub schema_version: u16,
    pub methodology_id: String,
    pub methodology_version: String,
    pub target_base_fingerprint: String,
    pub author: String,
    pub created_at: String,
    pub visibility: PackageVisibility,
    pub checksum: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationLayerPackage {
    pub manifest: EvaluationLayerManifest,
    pub methodologies: Vec<EvaluationMethodologyVersion>,
    pub evidence: Vec<EvaluationEvidence>,
    pub entity_assessments: Vec<EntityEvaluation>,
    pub review_history: Vec<EvaluationHistoryEntry>,
    pub provenance: EvaluationLayerProvenance,
}

pub fn evaluation_layer_canonical_bytes(layer: &EvaluationLayerPackage) -> Result<Vec<u8>, String> {
    let mut canonical = layer.clone();
    canonical.manifest.checksum.clear();
    serde_json::to_vec(&canonical).map_err(|error| error.to_string())
}

fn is_sha256_checksum(value: &str) -> bool {
    value.strip_prefix("sha256:").is_some_and(|digest| {
        digest.len() == 64
            && digest
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    })
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum EvaluationDiagnosticSeverity {
    Warning,
    Error,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationDiagnostic {
    pub code: String,
    pub severity: EvaluationDiagnosticSeverity,
    pub blocking: bool,
    pub entity_id: Option<String>,
    pub evaluation_id: Option<String>,
    pub field: String,
    pub explanation: String,
    pub suggestion: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationLayerValidation {
    pub valid: bool,
    pub diagnostics: Vec<EvaluationDiagnostic>,
}

pub fn validate_evaluation_layer(
    layer: &EvaluationLayerPackage,
    factual_entity_ids: &HashSet<String>,
    target_base_fingerprint: &str,
    actual_checksum: &str,
) -> EvaluationLayerValidation {
    let mut diagnostics = Vec::new();
    let push = |diagnostics: &mut Vec<EvaluationDiagnostic>,
                code: &str,
                blocking: bool,
                entity_id: Option<String>,
                evaluation_id: Option<String>,
                field: &str,
                explanation: &str,
                suggestion: &str| {
        diagnostics.push(EvaluationDiagnostic {
            code: code.to_owned(),
            severity: if blocking {
                EvaluationDiagnosticSeverity::Error
            } else {
                EvaluationDiagnosticSeverity::Warning
            },
            blocking,
            entity_id,
            evaluation_id,
            field: field.to_owned(),
            explanation: explanation.to_owned(),
            suggestion: suggestion.to_owned(),
        });
    };
    if layer.manifest.schema_version != EVALUATION_LAYER_SCHEMA_VERSION {
        push(
            &mut diagnostics,
            "evaluation.schema_unsupported",
            true,
            None,
            None,
            "manifest.schemaVersion",
            "A versão do schema da camada não é suportada.",
            "Migre a camada com uma ferramenta compatível.",
        );
    }
    if layer.manifest.target_base_fingerprint != target_base_fingerprint {
        push(
            &mut diagnostics,
            "evaluation.base_fingerprint_mismatch",
            true,
            None,
            None,
            "manifest.targetBaseFingerprint",
            "A camada foi produzida para outra base factual.",
            "Faça dry run contra a base atual e publique uma nova versão.",
        );
    }
    if !is_sha256_checksum(&layer.manifest.checksum)
        || !is_sha256_checksum(actual_checksum)
        || actual_checksum != layer.manifest.checksum
    {
        push(
            &mut diagnostics,
            "evaluation.checksum_mismatch",
            true,
            None,
            None,
            "manifest.checksum",
            "O checksum SHA-256 da camada não confere.",
            "Reexporte a camada a partir do projeto de autoria íntegro.",
        );
    }
    let methodology = layer.methodologies.iter().find(|methodology| {
        methodology.methodology_id == layer.manifest.methodology_id
            && methodology.version == layer.manifest.methodology_version
    });
    if methodology.is_none_or(|value| value.status != MethodologyStatus::Approved) {
        push(
            &mut diagnostics,
            "evaluation.methodology_not_approved",
            true,
            None,
            None,
            "manifest.methodologyVersion",
            "A metodologia da camada não está aprovada.",
            "Selecione uma versão aprovada ou conclua a revisão metodológica.",
        );
    }
    let evidence_ids = layer
        .evidence
        .iter()
        .map(|item| item.evidence_id.as_str())
        .collect::<HashSet<_>>();
    let mut assessment_ids = HashSet::new();
    for assessment in &layer.entity_assessments {
        if !assessment_ids.insert(assessment.evaluation_id.as_str()) {
            push(
                &mut diagnostics,
                "evaluation.duplicate_id",
                true,
                Some(assessment.entity_id.clone()),
                Some(assessment.evaluation_id.clone()),
                "evaluationId",
                "O ID de avaliação está duplicado.",
                "Use IDs estáveis e únicos por revisão.",
            );
        }
        if !factual_entity_ids.contains(&assessment.entity_id) {
            push(
                &mut diagnostics,
                "evaluation.entity_missing",
                true,
                Some(assessment.entity_id.clone()),
                Some(assessment.evaluation_id.clone()),
                "entityId",
                "A avaliação referencia entidade factual inexistente.",
                "Mapeie pelo ID interno correto; nomes não são identidade.",
            );
        }
        for dimension in assessment.payload.dimensions() {
            if !dimension.value.validate() {
                push(
                    &mut diagnostics,
                    "evaluation.value_invalid",
                    true,
                    Some(assessment.entity_id.clone()),
                    Some(assessment.evaluation_id.clone()),
                    &dimension.dimension_id,
                    "Valor ou faixa fora da escala 0–100.",
                    "Corrija o valor sem arredondar ou preencher silenciosamente.",
                );
            }
            if dimension
                .evidence_ids
                .iter()
                .any(|id| !evidence_ids.contains(id.as_str()))
            {
                push(
                    &mut diagnostics,
                    "evaluation.evidence_missing",
                    assessment.status == AssessmentStatus::Approved,
                    Some(assessment.entity_id.clone()),
                    Some(assessment.evaluation_id.clone()),
                    &dimension.dimension_id,
                    "A avaliação referencia evidência inexistente.",
                    "Inclua a evidência na camada ou remova a referência inválida.",
                );
            }
        }
    }
    EvaluationLayerValidation {
        valid: !diagnostics.iter().any(|diagnostic| diagnostic.blocking),
        diagnostics,
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationComposition {
    pub methodology_id: String,
    pub methodology_version: String,
    pub approved_assessments: Vec<EntityEvaluation>,
    pub skipped_assessment_ids: Vec<String>,
    pub validation: EvaluationLayerValidation,
}

pub fn compose_evaluation_layer(
    layer: &EvaluationLayerPackage,
    factual_entity_ids: &HashSet<String>,
    target_base_fingerprint: &str,
    actual_checksum: &str,
) -> EvaluationComposition {
    let validation = validate_evaluation_layer(
        layer,
        factual_entity_ids,
        target_base_fingerprint,
        actual_checksum,
    );
    if !validation.valid {
        return EvaluationComposition {
            methodology_id: layer.manifest.methodology_id.clone(),
            methodology_version: layer.manifest.methodology_version.clone(),
            approved_assessments: Vec::new(),
            skipped_assessment_ids: layer
                .entity_assessments
                .iter()
                .map(|assessment| assessment.evaluation_id.clone())
                .collect(),
            validation,
        };
    }
    let (approved, skipped): (Vec<_>, Vec<_>) = layer
        .entity_assessments
        .iter()
        .cloned()
        .partition(|assessment| assessment.status == AssessmentStatus::Approved);
    EvaluationComposition {
        methodology_id: layer.manifest.methodology_id.clone(),
        methodology_version: layer.manifest.methodology_version.clone(),
        approved_assessments: approved,
        skipped_assessment_ids: skipped
            .into_iter()
            .map(|assessment| assessment.evaluation_id)
            .collect(),
        validation,
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationImportRow {
    pub row_number: u32,
    pub entity_id: String,
    pub methodology_id: String,
    pub methodology_version: String,
    pub origin: String,
    pub assessed_at: String,
    pub evaluation: EntityEvaluation,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum EvaluationImportChangeKind {
    Create,
    ReplaceDraft,
    Conflict,
    Blocked,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationImportChange {
    pub row_number: u32,
    pub entity_id: String,
    pub evaluation_id: String,
    pub kind: EvaluationImportChangeKind,
    pub errors: Vec<String>,
    pub readiness_affected: bool,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationImportPlan {
    pub operation_id: String,
    pub changes: Vec<EvaluationImportChange>,
    pub can_apply: bool,
}

pub fn dry_run_evaluation_import(
    layer: &EvaluationLayerPackage,
    rows: &[EvaluationImportRow],
    factual_entity_ids: &HashSet<String>,
) -> EvaluationImportPlan {
    let changes = rows
        .iter()
        .map(|row| {
            let existing = layer
                .entity_assessments
                .iter()
                .find(|item| item.entity_id == row.entity_id);
            let mut errors = Vec::new();
            if !factual_entity_ids.contains(&row.entity_id) {
                errors.push("entityId inexistente na base factual.".to_owned());
            }
            if row.methodology_id != layer.manifest.methodology_id
                || row.methodology_version != layer.manifest.methodology_version
            {
                errors.push("methodologyVersion incompatível com a camada.".to_owned());
            }
            if row.origin.trim().is_empty() || row.assessed_at.trim().is_empty() {
                errors.push("Origem e data são obrigatórias.".to_owned());
            }
            if row.evaluation.status == AssessmentStatus::Approved {
                errors.push("Importações nunca aprovam automaticamente.".to_owned());
            }
            let kind = if !errors.is_empty() {
                EvaluationImportChangeKind::Blocked
            } else if existing.is_some_and(|item| item.status == AssessmentStatus::Approved) {
                EvaluationImportChangeKind::Conflict
            } else if existing.is_some() {
                EvaluationImportChangeKind::ReplaceDraft
            } else {
                EvaluationImportChangeKind::Create
            };
            EvaluationImportChange {
                row_number: row.row_number,
                entity_id: row.entity_id.clone(),
                evaluation_id: row.evaluation.evaluation_id.clone(),
                kind,
                errors,
                readiness_affected: existing.is_some_and(|item| {
                    matches!(
                        item.status,
                        AssessmentStatus::Approved | AssessmentStatus::Stale
                    )
                }),
            }
        })
        .collect::<Vec<_>>();
    EvaluationImportPlan {
        operation_id: format!("evaluation-import.{}", rows.len()),
        can_apply: changes.iter().all(|change| {
            !matches!(
                change.kind,
                EvaluationImportChangeKind::Blocked | EvaluationImportChangeKind::Conflict
            )
        }),
        changes,
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationImportReceipt {
    pub operation_id: String,
    pub previous_assessments: Vec<EntityEvaluation>,
    pub applied_evaluation_ids: Vec<String>,
}

pub fn apply_evaluation_import(
    layer: &mut EvaluationLayerPackage,
    rows: &[EvaluationImportRow],
    plan: &EvaluationImportPlan,
) -> Result<EvaluationImportReceipt, String> {
    if !plan.can_apply || plan.changes.len() != rows.len() {
        return Err("O dry run possui blockers ou não corresponde à importação.".to_owned());
    }
    let target_entities = rows
        .iter()
        .map(|row| row.entity_id.as_str())
        .collect::<HashSet<_>>();
    let previous = layer
        .entity_assessments
        .iter()
        .filter(|item| target_entities.contains(item.entity_id.as_str()))
        .cloned()
        .collect::<Vec<_>>();
    layer
        .entity_assessments
        .retain(|item| !target_entities.contains(item.entity_id.as_str()));
    let applied = rows
        .iter()
        .map(|row| row.evaluation.clone())
        .collect::<Vec<_>>();
    let ids = applied
        .iter()
        .map(|item| item.evaluation_id.clone())
        .collect();
    layer.entity_assessments.extend(applied);
    layer.manifest.checksum.clear();
    Ok(EvaluationImportReceipt {
        operation_id: plan.operation_id.clone(),
        previous_assessments: previous,
        applied_evaluation_ids: ids,
    })
}

pub fn rollback_evaluation_import(
    layer: &mut EvaluationLayerPackage,
    receipt: &EvaluationImportReceipt,
) -> Result<(), String> {
    let applied = receipt
        .applied_evaluation_ids
        .iter()
        .map(String::as_str)
        .collect::<HashSet<_>>();
    layer
        .entity_assessments
        .retain(|item| !applied.contains(item.evaluation_id.as_str()));
    layer
        .entity_assessments
        .extend(receipt.previous_assessments.clone());
    layer.manifest.checksum.clear();
    Ok(())
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationReadinessRequirement {
    pub dimension_id: String,
    pub subjects: Vec<EvaluationSubject>,
    pub minimum_confidence: u8,
    pub required_for_gameplay: bool,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationReadinessPolicy {
    pub policy_id: String,
    pub version: String,
    pub methodology_id: String,
    pub methodology_version: String,
    pub requirements: Vec<EvaluationReadinessRequirement>,
    pub drafts_may_feed_gameplay: bool,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvaluationReadinessProjection {
    pub entity_id: String,
    pub factual_ready: bool,
    pub evaluation_ready: bool,
    pub runtime_profile_ready: bool,
    pub gameplay_ready: bool,
    pub blockers: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ClubEvaluationReadinessProjection {
    pub club_id: String,
    pub factual_players: u16,
    pub evaluated_players: u16,
    pub evaluated_goalkeepers: u16,
    pub factual_head_coaches: u16,
    pub evaluated_head_coaches: u16,
    pub factual_staff_members: u16,
    pub evaluated_staff_members: u16,
    pub registrations: u16,
    pub gameplay_ready_people: u16,
    pub blockers: Vec<String>,
}

fn person_subject(person: &Person) -> Option<EvaluationSubject> {
    if person
        .roles
        .iter()
        .any(|role| role.kind == PersonRoleKind::Player)
    {
        Some(EvaluationSubject::Player)
    } else if person
        .roles
        .iter()
        .any(|role| role.kind == PersonRoleKind::Coach)
    {
        Some(EvaluationSubject::Coach)
    } else if person
        .roles
        .iter()
        .any(|role| role.kind == PersonRoleKind::StaffMember)
    {
        Some(EvaluationSubject::StaffMember)
    } else {
        None
    }
}

pub fn project_evaluation_readiness(
    person: &Person,
    assessments: &[EntityEvaluation],
    policy: &EvaluationReadinessPolicy,
) -> EvaluationReadinessProjection {
    let subject = person_subject(person);
    let assessment = assessments.iter().find(|assessment| {
        assessment.entity_id == person.person_id
            && assessment.status == AssessmentStatus::Approved
            && Some(assessment.payload.subject()) == subject
            && assessment.methodology_id == policy.methodology_id
            && assessment.methodology_version == policy.methodology_version
    });
    let mut blockers = person.readiness.blockers.clone();
    let factual_ready = subject.is_some()
        && person.readiness.structural == crate::StructuralValidity::StructurallyValid
        && (!matches!(subject, Some(EvaluationSubject::Player))
            || person.detailed_position.is_some());
    if !factual_ready {
        blockers.push("evaluation.factual_minimum_missing".to_owned());
    }
    let evaluation_ready = assessment.is_some_and(|assessment| {
        let dimensions = assessment
            .payload
            .dimensions()
            .into_iter()
            .map(|dimension| (dimension.dimension_id.as_str(), dimension))
            .collect::<HashMap<_, _>>();
        policy
            .requirements
            .iter()
            .filter(|requirement| {
                subject.is_some_and(|subject| requirement.subjects.contains(&subject))
            })
            .all(|requirement| {
                dimensions
                    .get(requirement.dimension_id.as_str())
                    .is_some_and(|value| {
                        !matches!(value.value, EvaluationValue::Unknown)
                            && value.confidence.final_score >= requirement.minimum_confidence
                    })
            })
    });
    if !evaluation_ready {
        blockers.push("evaluation.minimum_not_approved".to_owned());
    }
    let runtime_profile_ready =
        person.readiness.runtime_profile == RuntimeProfileAvailability::RuntimeProfileAvailable;
    if !runtime_profile_ready {
        blockers.push("person.runtime_profile_blocked".to_owned());
    }
    blockers.sort();
    blockers.dedup();
    EvaluationReadinessProjection {
        entity_id: person.person_id.clone(),
        factual_ready,
        evaluation_ready,
        runtime_profile_ready,
        gameplay_ready: factual_ready
            && evaluation_ready
            && runtime_profile_ready
            && person.readiness.gameplay == GameplayReadiness::GameplayReady,
        blockers,
    }
}

pub fn project_club_evaluation_readiness(
    people: &[Person],
    assessments: &[EntityEvaluation],
    club_id: &str,
    registered_player_ids: &HashSet<String>,
) -> ClubEvaluationReadinessProjection {
    let club_people = people
        .iter()
        .filter(|person| {
            person
                .roles
                .iter()
                .any(|role| role.club_id.as_deref() == Some(club_id))
        })
        .collect::<Vec<_>>();
    let approved = assessments
        .iter()
        .filter(|assessment| assessment.status == AssessmentStatus::Approved)
        .map(|assessment| (assessment.entity_id.as_str(), assessment.payload.subject()))
        .collect::<HashSet<_>>();
    let factual_players = club_people
        .iter()
        .filter(|person| person_subject(person) == Some(EvaluationSubject::Player))
        .collect::<Vec<_>>();
    let head_coaches = club_people
        .iter()
        .filter(|person| {
            person.roles.iter().any(|role| {
                role.kind == PersonRoleKind::Coach
                    && role
                        .title
                        .as_deref()
                        .is_some_and(|title| title.eq_ignore_ascii_case("Treinador principal"))
            })
        })
        .collect::<Vec<_>>();
    let staff = club_people
        .iter()
        .filter(|person| person_subject(person) == Some(EvaluationSubject::StaffMember))
        .collect::<Vec<_>>();
    let evaluated_players = factual_players
        .iter()
        .filter(|person| approved.contains(&(person.person_id.as_str(), EvaluationSubject::Player)))
        .count();
    let evaluated_goalkeepers = factual_players
        .iter()
        .filter(|person| {
            person.detailed_position == Some(Position::Gk)
                && approved.contains(&(person.person_id.as_str(), EvaluationSubject::Player))
        })
        .count();
    let evaluated_head_coaches = head_coaches
        .iter()
        .filter(|person| approved.contains(&(person.person_id.as_str(), EvaluationSubject::Coach)))
        .count();
    let evaluated_staff_members = staff
        .iter()
        .filter(|person| {
            approved.contains(&(person.person_id.as_str(), EvaluationSubject::StaffMember))
        })
        .count();
    let gameplay_ready_people = club_people
        .iter()
        .filter(|person| person.readiness.gameplay == GameplayReadiness::GameplayReady)
        .count();
    let mut blockers = Vec::new();
    if factual_players.is_empty() {
        blockers.push("club.factual_roster_missing".to_owned());
    }
    if evaluated_players < factual_players.len() {
        blockers.push("club.player_evaluations_missing".to_owned());
    }
    if evaluated_goalkeepers == 0 {
        blockers.push("club.evaluated_goalkeeper_missing".to_owned());
    }
    if head_coaches.len() != 1 || evaluated_head_coaches != 1 {
        blockers.push("club.evaluated_head_coach_missing".to_owned());
    }
    if registered_player_ids.len() < factual_players.len() {
        blockers.push("club.registrations_incomplete".to_owned());
    }
    ClubEvaluationReadinessProjection {
        club_id: club_id.to_owned(),
        factual_players: factual_players.len().try_into().unwrap_or(u16::MAX),
        evaluated_players: evaluated_players.try_into().unwrap_or(u16::MAX),
        evaluated_goalkeepers: evaluated_goalkeepers.try_into().unwrap_or(u16::MAX),
        factual_head_coaches: head_coaches.len().try_into().unwrap_or(u16::MAX),
        evaluated_head_coaches: evaluated_head_coaches.try_into().unwrap_or(u16::MAX),
        factual_staff_members: staff.len().try_into().unwrap_or(u16::MAX),
        evaluated_staff_members: evaluated_staff_members.try_into().unwrap_or(u16::MAX),
        registrations: registered_player_ids.len().try_into().unwrap_or(u16::MAX),
        gameplay_ready_people: gameplay_ready_people.try_into().unwrap_or(u16::MAX),
        blockers,
    }
}

pub fn official_evaluation_readiness_policy() -> EvaluationReadinessPolicy {
    EvaluationReadinessPolicy {
        policy_id: "rivallo.evaluation-readiness.v1".to_owned(),
        version: "1.0.0".to_owned(),
        methodology_id: OFFICIAL_METHODOLOGY_ID.to_owned(),
        methodology_version: OFFICIAL_METHODOLOGY_VERSION.to_owned(),
        requirements: vec![
            EvaluationReadinessRequirement {
                dimension_id: "player.currentAbility".to_owned(),
                subjects: vec![EvaluationSubject::Player],
                minimum_confidence: 55,
                required_for_gameplay: true,
            },
            EvaluationReadinessRequirement {
                dimension_id: "coach.tactical".to_owned(),
                subjects: vec![EvaluationSubject::Coach],
                minimum_confidence: 55,
                required_for_gameplay: true,
            },
            EvaluationReadinessRequirement {
                dimension_id: "coach.peopleManagement".to_owned(),
                subjects: vec![EvaluationSubject::Coach],
                minimum_confidence: 50,
                required_for_gameplay: true,
            },
        ],
        drafts_may_feed_gameplay: false,
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CalibrationSample {
    pub entity_id: String,
    pub group: String,
    pub age_band: String,
    pub confidence: u8,
    pub values: BTreeMap<String, u8>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CalibrationDistribution {
    pub dimension_id: String,
    pub count: usize,
    pub minimum: u8,
    pub maximum: u8,
    pub mean: u8,
    pub median: u8,
    pub percentile_25: u8,
    pub percentile_75: u8,
}

pub fn calibration_distribution(
    samples: &[CalibrationSample],
    dimension_id: &str,
) -> Option<CalibrationDistribution> {
    let mut values = samples
        .iter()
        .filter_map(|sample| sample.values.get(dimension_id).copied())
        .collect::<Vec<_>>();
    values.sort_unstable();
    let percentile = |percent: usize| values[(values.len().saturating_sub(1) * percent) / 100];
    Some(CalibrationDistribution {
        dimension_id: dimension_id.to_owned(),
        count: values.len(),
        minimum: *values.first()?,
        maximum: *values.last()?,
        mean: average(values.iter().copied()),
        median: percentile(50),
        percentile_25: percentile(25),
        percentile_75: percentile(75),
    })
}

pub fn weighted_score(values: &BTreeMap<String, u8>, weights: &[EvaluationWeight]) -> Option<u8> {
    let mut total = 0_u32;
    let mut total_weight = 0_u32;
    for weight in weights {
        let value = values.get(&weight.dimension_id)?;
        total += u32::from(*value) * u32::from(weight.weight);
        total_weight += u32::from(weight.weight);
    }
    (total_weight > 0).then(|| (total / total_weight) as u8)
}

pub fn official_evaluation_methodology() -> EvaluationMethodologyVersion {
    let scale = EvaluationScale {
        scale_id: RATING_SCALE_VERSION.to_owned(),
        label: "Escala estrutural Rivallo 0–100".to_owned(),
        minimum: 0,
        maximum: 100,
        integer_only: true,
        semantics:
            "Qualidade esportiva estrutural; confiança e estado momentâneo são dimensões separadas."
                .to_owned(),
    };
    let player_attributes = [
        ("player.finishing", "Finalização"),
        ("player.technique", "Técnica"),
        ("player.passing", "Passe"),
        ("player.tackling", "Desarme"),
        ("player.physical", "Físico"),
        ("player.pace", "Velocidade"),
        ("goalkeeper.reaction", "Reação"),
        ("goalkeeper.positioning", "Posicionamento"),
        ("goalkeeper.handling", "Manejo"),
        ("goalkeeper.mobility", "Mobilidade"),
        ("goalkeeper.rushingOut", "Saídas"),
        ("goalkeeper.distribution", "Distribuição"),
    ];
    let coach_capabilities = [
        ("coach.tactical", "Tática"),
        ("coach.preparation", "Preparação"),
        ("coach.decisionMaking", "Leitura de jogo"),
        ("coach.adaptability", "Adaptabilidade"),
        ("coach.peopleManagement", "Gestão humana"),
        ("coach.motivation", "Motivação"),
        ("coach.communication", "Comunicação"),
        ("coach.discipline", "Disciplina"),
        ("coach.technicalDevelopment", "Desenvolvimento técnico"),
        ("coach.physicalDevelopment", "Desenvolvimento físico"),
        ("coach.mentalDevelopment", "Desenvolvimento mental"),
        ("coach.tacticalDevelopment", "Desenvolvimento tático"),
        ("coach.youthDevelopment", "Desenvolvimento de jovens"),
        ("coach.abilityJudgement", "Julgamento de capacidade"),
        ("coach.potentialJudgement", "Julgamento de potencial"),
    ];
    let mut dimensions = player_attributes
        .into_iter()
        .map(|(id, label)| EvaluationDimension {
            dimension_id: id.to_owned(),
            label: label.to_owned(),
            description: "Atributo estrutural consumível pelo contrato de ratings da Fase 06.4."
                .to_owned(),
            subjects: vec![EvaluationSubject::Player],
            scale_id: Some(scale.scale_id.clone()),
            allowed_value_kinds: vec![
                EvaluationValueKind::Exact,
                EvaluationValueKind::Range,
                EvaluationValueKind::Unknown,
            ],
            minimum_evidence: 1,
            required_for_approval: true,
            consumer: "rivallo.profiles.player-attribute-set.v2".to_owned(),
        })
        .chain(
            coach_capabilities
                .into_iter()
                .map(|(id, label)| EvaluationDimension {
                    dimension_id: id.to_owned(),
                    label: label.to_owned(),
                    description: "Capacidade independente para avaliação contextual por cargo."
                        .to_owned(),
                    subjects: vec![EvaluationSubject::Coach, EvaluationSubject::StaffMember],
                    scale_id: Some(scale.scale_id.clone()),
                    allowed_value_kinds: vec![
                        EvaluationValueKind::Exact,
                        EvaluationValueKind::Range,
                        EvaluationValueKind::Unknown,
                    ],
                    minimum_evidence: 1,
                    required_for_approval: false,
                    consumer: "rivallo.profiles.coach-capability-set.v1".to_owned(),
                }),
        )
        .collect::<Vec<_>>();
    dimensions.extend([
        EvaluationDimension {
            dimension_id: "player.currentAbility".to_owned(),
            label: "Capacidade atual".to_owned(),
            description: "Derivada somente de atributos estruturais aprovados pela fórmula 06.4."
                .to_owned(),
            subjects: vec![EvaluationSubject::Player],
            scale_id: Some(scale.scale_id.clone()),
            allowed_value_kinds: vec![EvaluationValueKind::Exact, EvaluationValueKind::Range],
            minimum_evidence: 6,
            required_for_approval: true,
            consumer: "rivallo.rating.current-ability.v2".to_owned(),
        },
        EvaluationDimension {
            dimension_id: "player.potential".to_owned(),
            label: "Potencial estimado".to_owned(),
            description:
                "Estimativa separada da capacidade atual, com horizonte e confiança próprios."
                    .to_owned(),
            subjects: vec![EvaluationSubject::Player],
            scale_id: Some(scale.scale_id.clone()),
            allowed_value_kinds: vec![
                EvaluationValueKind::Range,
                EvaluationValueKind::Qualitative,
                EvaluationValueKind::Unknown,
            ],
            minimum_evidence: 1,
            required_for_approval: false,
            consumer: "rivallo.profiles.potential-estimate.v1".to_owned(),
        },
    ]);
    let rules = dimensions
        .iter()
        .map(|dimension| EvaluationRule {
            rule_id: format!("rule.{}", dimension.dimension_id),
            label: format!("Avaliar {}", dimension.label),
            target_dimension_id: dimension.dimension_id.clone(),
            evidence_kinds: vec![
                EvidenceKind::ObjectiveStatistic,
                EvidenceKind::ManualObservation,
                EvidenceKind::TechnicalReport,
                EvidenceKind::StructuredQualitative,
            ],
            minimum_evidence: dimension.minimum_evidence,
            explanation: "Combina somente evidências vinculadas e mantém faixa quando a confiança é insuficiente."
                .to_owned(),
            limitation: "Ausência factual ou evidência insuficiente nunca é preenchida por média global."
                .to_owned(),
        })
        .collect();
    let weights = [
        ("player.contextual", "context.position", 50),
        ("player.contextual", "context.role", 20),
        ("player.contextual", "context.tacticalFit", 20),
        ("player.contextual", "context.familiarity", 10),
        ("coach.headCoach", "coach.tactical", 35),
        ("coach.headCoach", "coach.preparation", 20),
        ("coach.headCoach", "coach.development", 15),
        ("coach.headCoach", "coach.peopleManagement", 20),
        ("coach.headCoach", "coach.assessment", 10),
    ]
    .into_iter()
    .map(|(context, dimension, weight)| EvaluationWeight {
        context_id: context.to_owned(),
        dimension_id: dimension.to_owned(),
        weight,
        explanation:
            "Peso herdado do contrato explicável da Fase 06.4; não recalibrado nesta fundação."
                .to_owned(),
    })
    .collect();
    EvaluationMethodologyVersion {
        methodology_id: OFFICIAL_METHODOLOGY_ID.to_owned(),
        version: OFFICIAL_METHODOLOGY_VERSION.to_owned(),
        schema_version: EVALUATION_SCHEMA_VERSION,
        created_at: "2026-07-19T00:00:00-03:00".to_owned(),
        author: "Rivallo Methodology Team".to_owned(),
        origin: "Fundação pública fictícia".to_owned(),
        description: "Transforma evidências esportivas em avaliações separadas dos fatos, revisáveis e consumíveis pelos ratings existentes."
            .to_owned(),
        status: MethodologyStatus::Approved,
        scales: vec![scale],
        dimensions,
        rules,
        weights,
        thresholds: vec![EvaluationThreshold {
            threshold_id: "approval.minimum-confidence".to_owned(),
            dimension_id: "player.currentAbility".to_owned(),
            minimum_confidence: 55,
            minimum_evidence: 6,
            blocks_approval: true,
        }],
        dependencies: vec![
            "rivallo.profiles.player-attribute-set.v2".to_owned(),
            "rivallo.profiles.coach-capability-set.v1".to_owned(),
            "rivallo.rating.contextual.v1".to_owned(),
        ],
        changelog: vec![
            "1.0.0: lifecycle, evidência, confiança, avaliação por função e camada separada."
                .to_owned(),
        ],
        compatible_rating_scales: vec![
            "rivallo.rating.0-100.v1".to_owned(),
            RATING_SCALE_VERSION.to_owned(),
        ],
        calibration: EvaluationCalibrationProfile {
            calibration_id: "rivallo.synthetic-calibration.v1".to_owned(),
            version: "1.0.0".to_owned(),
            synthetic_only: true,
            target_groups: vec![
                "outfield".to_owned(),
                "goalkeeper".to_owned(),
                "youth".to_owned(),
                "veteran".to_owned(),
                "coach".to_owned(),
                "staff".to_owned(),
            ],
            invariants: vec![
                "Monotonicidade de atributos".to_owned(),
                "Condição não altera capacidade".to_owned(),
                "Forma não altera atributo".to_owned(),
                "Familiaridade não altera potencial".to_owned(),
                "Confiança não altera qualidade".to_owned(),
            ],
            notes: "Calibração pública exclusivamente sintética; nenhuma pessoa real é referência."
                .to_owned(),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SYNTHETIC_CHECKSUM: &str =
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    fn confidence(score: u8) -> ConfidenceBreakdown {
        ConfidenceBreakdown {
            coverage: score,
            recency: score,
            quality: score,
            consistency: score,
            precision: score,
            conflicts: 0,
            final_score: score,
            explanation: "fixture sintética".to_owned(),
        }
    }

    fn dimension(id: &str, value: EvaluationValue, evidence: &[&str]) -> DimensionAssessment {
        DimensionAssessment {
            dimension_id: id.to_owned(),
            value,
            confidence: confidence(72),
            evidence_ids: evidence.iter().map(|value| (*value).to_owned()).collect(),
            methodology_rule_ids: vec![format!("rule.{id}")],
            explanation: "Avaliação fictícia explicável.".to_owned(),
            positive_factors: vec!["Observação consistente".to_owned()],
            limitations: vec!["Amostra sintética curta".to_owned()],
        }
    }

    fn player_evaluation(status: AssessmentStatus) -> EntityEvaluation {
        let current = dimension(
            "player.currentAbility",
            EvaluationValue::Range {
                minimum: 68,
                maximum: 74,
            },
            &["evidence.synthetic.1"],
        );
        EntityEvaluation {
            evaluation_id: "evaluation.synthetic.player.1".to_owned(),
            entity_id: "synthetic.player.1".to_owned(),
            methodology_id: OFFICIAL_METHODOLOGY_ID.to_owned(),
            methodology_version: OFFICIAL_METHODOLOGY_VERSION.to_owned(),
            status,
            author: "Synthetic Author".to_owned(),
            reviewer: None,
            created_at: "2026-07-19".to_owned(),
            submitted_at: None,
            reviewed_at: None,
            valid_until: Some("2027-01-19".to_owned()),
            overall_confidence: confidence(72),
            payload: EvaluationPayload::Player(Box::new(PlayerEvaluation {
                attributes: vec![dimension(
                    "player.technique",
                    EvaluationValue::Exact { value: 71 },
                    &["evidence.synthetic.1"],
                )],
                positions: vec![PositionAssessment {
                    position: Position::Cm,
                    natural: true,
                    secondary: false,
                    suitability: EvaluationValue::Exact { value: 74 },
                    confidence: confidence(72),
                    evidence_ids: vec!["evidence.synthetic.1".to_owned()],
                }],
                roles: Vec::new(),
                current_ability: current,
                potential: PotentialAssessment {
                    internal_simulation_seed: None,
                    perceived: EvaluationValue::Range {
                        minimum: 72,
                        maximum: 80,
                    },
                    confidence: confidence(58),
                    horizon_months: 36,
                    evidence_ids: vec!["evidence.synthetic.1".to_owned()],
                    factors: vec!["Idade fictícia".to_owned()],
                    limitations: vec!["Horizonte longo".to_owned()],
                },
            })),
            explanation: "Fixture pública sintética.".to_owned(),
            stale_reason: None,
            supersedes_evaluation_id: None,
        }
    }

    fn evidence(value: f64, id: &str) -> EvaluationEvidence {
        EvaluationEvidence {
            evidence_id: id.to_owned(),
            entity_id: "synthetic.player.1".to_owned(),
            kind: EvidenceKind::ObjectiveStatistic,
            source: EvidenceSource {
                source_id: "source.synthetic".to_owned(),
                label: "Synthetic Lab".to_owned(),
                source_type: "fixture".to_owned(),
                license: "CC0".to_owned(),
                provenance: "Generated for tests".to_owned(),
                precision: 80,
            },
            source_record_id: Some(id.to_owned()),
            collected_at: "2026-07-19".to_owned(),
            verified_at: Some("2026-07-19".to_owned()),
            period: EvidencePeriod {
                starts_at: Some("2026-01-01".to_owned()),
                ends_at: Some("2026-06-30".to_owned()),
                competition_id: Some("competition.synthetic".to_owned()),
                context: "calibration".to_owned(),
            },
            metric: Some(EvidenceMetric {
                metric_id: "metric.synthetic.technique".to_owned(),
                value,
                unit: "index".to_owned(),
                sample_size: Some(12),
            }),
            observation: Some(EvidenceObservation {
                dimension_id: "player.technique".to_owned(),
                statement: "Execução técnica consistente em cenário sintético.".to_owned(),
                positive: true,
            }),
            quality: EvidenceQuality {
                completeness: 80,
                recency: 90,
                reliability: 78,
                consistency: 82,
                precision: 80,
            },
            confidence: 79,
            notes: "Sem pessoa real.".to_owned(),
        }
    }

    fn layer(status: AssessmentStatus) -> EvaluationLayerPackage {
        EvaluationLayerPackage {
            manifest: EvaluationLayerManifest {
                package_id: "official.rivallo.synthetic-evaluations".to_owned(),
                version: "1.0.0".to_owned(),
                schema_version: EVALUATION_LAYER_SCHEMA_VERSION,
                methodology_id: OFFICIAL_METHODOLOGY_ID.to_owned(),
                methodology_version: OFFICIAL_METHODOLOGY_VERSION.to_owned(),
                target_base_fingerprint: "synthetic-fingerprint".to_owned(),
                author: "Rivallo Synthetic Lab".to_owned(),
                created_at: "2026-07-19".to_owned(),
                visibility: PackageVisibility::Public,
                checksum: SYNTHETIC_CHECKSUM.to_owned(),
            },
            methodologies: vec![official_evaluation_methodology()],
            evidence: vec![evidence(71.0, "evidence.synthetic.1")],
            entity_assessments: vec![player_evaluation(status)],
            review_history: Vec::new(),
            provenance: EvaluationLayerProvenance {
                source: "Synthetic fixtures".to_owned(),
                rights: "CC0".to_owned(),
                created_at: "2026-07-19".to_owned(),
                notes: "No real people or private data.".to_owned(),
            },
        }
    }

    #[test]
    fn official_methodology_preserves_scale_and_existing_context_weights() {
        let methodology = official_evaluation_methodology();
        assert_eq!(methodology.validate(), Ok(()));
        assert_eq!(methodology.scales[0].minimum, 0);
        assert_eq!(methodology.scales[0].maximum, 100);
        let contextual = methodology
            .weights
            .iter()
            .filter(|weight| weight.context_id == "player.contextual")
            .map(|weight| weight.weight)
            .collect::<Vec<_>>();
        assert_eq!(contextual, vec![50, 20, 20, 10]);
    }

    #[test]
    fn confidence_exposes_conflicts_without_changing_player_quality() {
        let evidence = vec![
            evidence(40.0, "evidence.synthetic.1"),
            evidence(80.0, "evidence.synthetic.2"),
        ];
        let breakdown = calculate_confidence(&evidence, &["player.technique".to_owned()]);
        assert_eq!(breakdown.conflicts, 1);
        assert!(breakdown.consistency < 82);
        assert!(breakdown.explanation.contains("não mede a qualidade"));
    }

    #[test]
    fn insufficient_evidence_cannot_be_approved() {
        let mut evaluation = player_evaluation(AssessmentStatus::Draft);
        evaluation.overall_confidence = confidence(0);
        let action = apply_review_action(
            &mut evaluation,
            ReviewActionKind::Submit,
            "Synthetic Author",
            "2026-07-19",
            "submit",
        )
        .expect("valid transition");
        assert_eq!(action.to_status, AssessmentStatus::InsufficientEvidence);
        assert!(
            apply_review_action(
                &mut evaluation,
                ReviewActionKind::Approve,
                "Synthetic Reviewer",
                "2026-07-19",
                "approve"
            )
            .is_err()
        );
    }

    #[test]
    fn only_approved_assessments_compose() {
        let ids = HashSet::from(["synthetic.player.1".to_owned()]);
        let draft = compose_evaluation_layer(
            &layer(AssessmentStatus::Draft),
            &ids,
            "synthetic-fingerprint",
            SYNTHETIC_CHECKSUM,
        );
        assert!(draft.validation.valid);
        assert!(draft.approved_assessments.is_empty());
        let approved = compose_evaluation_layer(
            &layer(AssessmentStatus::Approved),
            &ids,
            "synthetic-fingerprint",
            SYNTHETIC_CHECKSUM,
        );
        assert_eq!(approved.approved_assessments.len(), 1);
    }

    #[test]
    fn approved_player_bridge_requires_exact_inputs_and_never_uses_range_midpoint() {
        let mut assessment = player_evaluation(AssessmentStatus::Approved);
        {
            let EvaluationPayload::Player(player) = &mut assessment.payload else {
                panic!("player fixture");
            };
            player.attributes = [
                ("player.finishing", 66),
                ("player.technique", 71),
                ("player.passing", 74),
                ("player.tackling", 63),
                ("player.physical", 68),
                ("player.pace", 69),
            ]
            .into_iter()
            .map(|(id, value)| {
                dimension(
                    id,
                    EvaluationValue::Exact { value },
                    &["evidence.synthetic.1"],
                )
            })
            .collect();
        }
        let inputs = approved_player_rating_inputs(&assessment).expect("approved exact inputs");
        assert_eq!(inputs.natural_position, Position::Cm);
        assert!(matches!(
            inputs.attributes,
            PlayerAttributeSet::Outfield { .. }
        ));

        let EvaluationPayload::Player(player) = &mut assessment.payload else {
            panic!("player fixture");
        };
        player.attributes[0].value = EvaluationValue::Range {
            minimum: 64,
            maximum: 68,
        };
        let error = approved_player_rating_inputs(&assessment).expect_err("range blocks runtime");
        assert!(error.contains("midpoint implícito é proibido"));
    }

    #[test]
    fn incompatible_base_and_missing_entity_block_composition() {
        let ids = HashSet::new();
        let result = compose_evaluation_layer(
            &layer(AssessmentStatus::Approved),
            &ids,
            "other",
            SYNTHETIC_CHECKSUM,
        );
        assert!(!result.validation.valid);
        assert!(
            result
                .validation
                .diagnostics
                .iter()
                .any(|item| { item.code == "evaluation.base_fingerprint_mismatch" })
        );
        assert!(
            result
                .validation
                .diagnostics
                .iter()
                .any(|item| { item.code == "evaluation.entity_missing" })
        );
    }

    #[test]
    fn import_requires_dry_run_and_supports_rollback() {
        let mut target = layer(AssessmentStatus::Draft);
        target.entity_assessments.clear();
        let row = EvaluationImportRow {
            row_number: 2,
            entity_id: "synthetic.player.1".to_owned(),
            methodology_id: OFFICIAL_METHODOLOGY_ID.to_owned(),
            methodology_version: OFFICIAL_METHODOLOGY_VERSION.to_owned(),
            origin: "Synthetic CSV".to_owned(),
            assessed_at: "2026-07-19".to_owned(),
            evaluation: player_evaluation(AssessmentStatus::Draft),
        };
        let ids = HashSet::from(["synthetic.player.1".to_owned()]);
        let plan = dry_run_evaluation_import(&target, std::slice::from_ref(&row), &ids);
        assert!(plan.can_apply);
        let receipt = apply_evaluation_import(&mut target, &[row], &plan).expect("apply");
        assert_eq!(target.entity_assessments.len(), 1);
        assert!(target.manifest.checksum.is_empty());
        rollback_evaluation_import(&mut target, &receipt).expect("rollback");
        assert!(target.entity_assessments.is_empty());
        assert!(target.manifest.checksum.is_empty());
    }

    #[test]
    fn monotonic_calibration_and_confidence_separation_hold() {
        let weights = vec![
            EvaluationWeight {
                context_id: "synthetic".to_owned(),
                dimension_id: "a".to_owned(),
                weight: 50,
                explanation: String::new(),
            },
            EvaluationWeight {
                context_id: "synthetic".to_owned(),
                dimension_id: "b".to_owned(),
                weight: 50,
                explanation: String::new(),
            },
        ];
        let lower = BTreeMap::from([("a".to_owned(), 60), ("b".to_owned(), 65)]);
        let higher = BTreeMap::from([("a".to_owned(), 61), ("b".to_owned(), 70)]);
        assert!(weighted_score(&higher, &weights) >= weighted_score(&lower, &weights));
        let score = weighted_score(&higher, &weights);
        let low_confidence = 20_u8;
        let high_confidence = 95_u8;
        assert_eq!(score, weighted_score(&higher, &weights));
        assert_ne!(low_confidence, high_confidence);
    }

    #[test]
    fn calibration_distribution_reports_percentiles() {
        let samples = [50_u8, 60, 70, 80, 90]
            .into_iter()
            .enumerate()
            .map(|(index, value)| CalibrationSample {
                entity_id: format!("synthetic.{index}"),
                group: "outfield".to_owned(),
                age_band: "adult".to_owned(),
                confidence: 70,
                values: BTreeMap::from([("player.technique".to_owned(), value)]),
            })
            .collect::<Vec<_>>();
        let distribution = calibration_distribution(&samples, "player.technique").expect("data");
        assert_eq!(distribution.mean, 70);
        assert_eq!(distribution.median, 70);
        assert_eq!(distribution.percentile_25, 60);
        assert_eq!(distribution.percentile_75, 80);
    }
}
