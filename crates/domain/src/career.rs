use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::{
    Club, CoachAttributeSet, CoachSportingProfile, ContractSummary, MatchdayState, PersonIdentity,
    ProfileWorld, ResolvedWorldDatabase,
};

pub const CAREER_SCHEMA_VERSION: u16 = 1;
pub const COACH_CREATOR_SCHEMA_VERSION: u16 = 1;

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum AssistanceProfile {
    Guided,
    Balanced,
    FullControl,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CoachBackground {
    ProfessionalPlayer,
    AmateurPlayer,
    TacticalAnalyst,
    YouthDeveloper,
    PeopleManager,
    Beginner,
    Balanced,
}

impl CoachBackground {
    const fn base_budget(self) -> u16 {
        match self {
            Self::ProfessionalPlayer => 165,
            Self::AmateurPlayer => 145,
            Self::TacticalAnalyst | Self::YouthDeveloper | Self::PeopleManager => 140,
            Self::Beginner => 92,
            Self::Balanced => 128,
        }
    }

    const fn base_cap(self) -> u8 {
        match self {
            Self::ProfessionalPlayer => 67,
            Self::AmateurPlayer => 64,
            Self::TacticalAnalyst | Self::YouthDeveloper | Self::PeopleManager => 63,
            Self::Beginner => 54,
            Self::Balanced => 60,
        }
    }

    const fn maximum_experience(self) -> u8 {
        match self {
            Self::ProfessionalPlayer => 15,
            Self::AmateurPlayer => 10,
            Self::TacticalAnalyst | Self::YouthDeveloper | Self::PeopleManager => 8,
            Self::Beginner => 2,
            Self::Balanced => 6,
        }
    }

    const fn maximum_reputation(self) -> u8 {
        match self {
            Self::ProfessionalPlayer => 58,
            Self::AmateurPlayer => 52,
            Self::TacticalAnalyst | Self::YouthDeveloper | Self::PeopleManager => 50,
            Self::Beginner => 38,
            Self::Balanced => 46,
        }
    }

    const fn high_attribute_limit(self) -> u8 {
        match self {
            Self::ProfessionalPlayer => 4,
            Self::AmateurPlayer
            | Self::TacticalAnalyst
            | Self::YouthDeveloper
            | Self::PeopleManager => 3,
            Self::Balanced => 2,
            Self::Beginner => 0,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CoachArchetype {
    #[default]
    Balanced,
    Strategist,
    PeopleManager,
    YouthDeveloper,
    Analyst,
    FormerPlayer,
    MatchPreparer,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoachAttributeBudgetLine {
    pub attribute_id: String,
    pub value: u8,
    pub cost: u16,
    pub next_cost: Option<u16>,
    pub cap: u8,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoachCreationEvaluation {
    pub schema_version: u16,
    pub cost_model_version: String,
    pub budget: u16,
    pub used_points: u16,
    pub remaining_points: i16,
    pub attribute_cap: u8,
    pub cap_reason: String,
    pub high_attribute_limit: u8,
    pub high_attribute_count: u8,
    pub specialty_limit: u8,
    pub contextual_rating: u8,
    pub reputation_cap: u8,
    pub experience_cap: u8,
    pub balance_label: String,
    pub strengths: Vec<String>,
    pub limitations: Vec<String>,
    pub attribute_lines: Vec<CoachAttributeBudgetLine>,
    pub valid: bool,
    pub errors: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CoachAppearance {
    #[serde(default)]
    pub seed: u64,
    #[serde(default = "default_portrait_renderer_version")]
    pub renderer_version: u16,
    pub skin_tone: u8,
    pub face_shape: String,
    pub hair_style: String,
    pub hair_color: String,
    pub facial_hair: String,
    pub glasses: bool,
    pub clothing: String,
}

const fn default_portrait_renderer_version() -> u16 {
    1
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PortraitUpload {
    pub file_name: String,
    pub mime_type: String,
    pub bytes: Vec<u8>,
    #[serde(default)]
    pub derivatives: BTreeMap<String, Vec<u8>>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CoachCreatorDraft {
    pub first_name: String,
    pub last_name: String,
    pub known_name: String,
    pub nationality: String,
    pub secondary_nationality: Option<String>,
    pub birthplace: Option<String>,
    pub birth_date: String,
    pub age: u8,
    pub languages: Vec<String>,
    pub background: CoachBackground,
    #[serde(default)]
    pub archetype: CoachArchetype,
    pub qualification: String,
    pub experience_years: u8,
    pub reputation: u8,
    pub style: String,
    pub preferred_formations: Vec<String>,
    pub specialties: Vec<String>,
    pub attributes: CoachAttributeSet,
    pub appearance: CoachAppearance,
    pub portrait: Option<PortraitUpload>,
}

impl CoachCreatorDraft {
    pub fn validate(&self, known_nationalities: &[String]) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();
        for (label, value) in [
            ("nome", self.first_name.as_str()),
            ("sobrenome", self.last_name.as_str()),
            ("nome conhecido", self.known_name.as_str()),
        ] {
            let length = value.trim().chars().count();
            if !(1..=80).contains(&length) || value.chars().any(char::is_control) {
                errors.push(format!("{label} deve ter entre 1 e 80 caracteres válidos"));
            }
        }
        if !(21..=85).contains(&self.age) {
            errors.push("idade deve estar entre 21 e 85 anos".to_owned());
        }
        if !valid_iso_date(&self.birth_date) {
            errors.push("data de nascimento deve usar AAAA-MM-DD".to_owned());
        }
        if !known_nationalities
            .iter()
            .any(|nation| nation.eq_ignore_ascii_case(self.nationality.trim()))
        {
            errors.push("nacionalidade deve existir na base selecionada".to_owned());
        }
        if self.preferred_formations.is_empty() || self.preferred_formations.len() > 3 {
            errors.push("selecione entre uma e três formações favoritas".to_owned());
        }
        if self.specialties.len() > 2 {
            errors.push("selecione no máximo duas especialidades".to_owned());
        }
        if self.appearance.skin_tone > 7 {
            errors.push("tom de pele fora da faixa suportada".to_owned());
        }

        errors.extend(evaluate_coach_creation(self).errors);

        if let Some(portrait) = &self.portrait {
            if let Err(error) = validate_portrait(portrait) {
                errors.push(error);
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }

    pub fn into_profile(
        self,
        coach_id: String,
        club: &Club,
        career_start_date: &str,
        portrait_asset_id: Option<String>,
    ) -> CoachSportingProfile {
        let full_name = format!("{} {}", self.first_name.trim(), self.last_name.trim());
        CoachSportingProfile {
            identity: PersonIdentity {
                entity_id: coach_id,
                full_name,
                known_name: self.known_name.trim().to_owned(),
                nationality: self.nationality.trim().to_owned(),
                birth_date: self.birth_date,
                age: self.age,
                club_id: club.id.clone(),
                club_name: club.name.clone(),
                club_short_name: club.short_name.clone(),
                club_primary_color: club.primary_color.clone(),
            },
            role: "Treinador principal".to_owned(),
            reputation: self.reputation,
            qualification: self.qualification,
            experience_years: self.experience_years,
            style: self.style,
            preferred_formations: self.preferred_formations,
            attributes: self.attributes,
            specialties: self.specialties,
            contract: Some(ContractSummary {
                club_id: club.id.clone(),
                started_at: career_start_date.to_owned(),
                expires_at: String::new(),
                squad_status: "Treinador principal".to_owned(),
            }),
            portrait_asset_id,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CareerRouteContext {
    pub route: String,
    pub active_screen: Option<String>,
    pub active_tab: Option<String>,
    pub variation_id: Option<String>,
    pub scroll_top: u32,
}

impl Default for CareerRouteContext {
    fn default() -> Self {
        Self {
            route: "/career/home".to_owned(),
            active_screen: Some("squad".to_owned()),
            active_tab: None,
            variation_id: None,
            scroll_top: 0,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CareerIntegrity {
    Valid,
    Recovered,
    Corrupt,
    Incompatible,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CareerSaveState {
    Saved,
    Pending,
    Saving,
    Failed,
    ReadOnly,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CareerWorldSnapshot {
    pub base_package_id: String,
    pub base_package_version: String,
    pub schema_version: u16,
    pub active_mods: Vec<String>,
    pub mod_versions: Vec<String>,
    pub load_order: Vec<String>,
    pub package_hashes: Vec<String>,
    pub world_fingerprint: String,
    pub fingerprint_algorithm: String,
    pub game_version: String,
    pub created_at: u64,
    pub resolved: ResolvedWorldDatabase,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CareerSlot {
    pub schema_version: u16,
    pub career_id: String,
    pub operation_id: String,
    pub display_name: String,
    pub manager_id: String,
    pub manager_name: String,
    pub club_id: String,
    pub club_name: String,
    pub club_short_name: String,
    pub club_primary_color: String,
    pub base_snapshot: CareerWorldSnapshot,
    pub current_date: String,
    pub season_ref: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub last_played_at: u64,
    pub last_context: CareerRouteContext,
    pub save_revision: u64,
    pub assistance: AssistanceProfile,
    pub integrity: CareerIntegrity,
    pub save_state: CareerSaveState,
    pub sporting_state: String,
    pub matchday: MatchdayState,
    pub profiles: ProfileWorld,
    pub portrait_asset: Option<String>,
}

impl CareerSlot {
    pub fn validate(&self) -> Result<(), String> {
        if self.schema_version != CAREER_SCHEMA_VERSION {
            return Err("career.unsupported_schema_version".to_owned());
        }
        if self.career_id.is_empty() || self.display_name.trim().is_empty() {
            return Err("career.invalid_identity".to_owned());
        }
        if self.base_snapshot.world_fingerprint != self.base_snapshot.resolved.fingerprint.value {
            return Err("career.snapshot_fingerprint_mismatch".to_owned());
        }
        if self.matchday.club.id != self.club_id {
            return Err("career.club_snapshot_mismatch".to_owned());
        }
        if !self
            .profiles
            .coaches
            .iter()
            .any(|coach| coach.identity.entity_id == self.manager_id)
        {
            return Err("career.manager_missing".to_owned());
        }
        Ok(())
    }
}

fn valid_iso_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes
            .iter()
            .enumerate()
            .all(|(index, byte)| matches!(index, 4 | 7) || byte.is_ascii_digit())
}

fn attribute_values(attributes: &CoachAttributeSet) -> [u8; 15] {
    [
        attributes.tactical,
        attributes.preparation,
        attributes.adaptability,
        attributes.decision_making,
        attributes.technical_development,
        attributes.physical_development,
        attributes.mental_development,
        attributes.tactical_development,
        attributes.youth_development,
        attributes.motivation,
        attributes.communication,
        attributes.discipline,
        attributes.people_management,
        attributes.ability_judgement,
        attributes.potential_judgement,
    ]
}

fn attribute_entries(attributes: &CoachAttributeSet) -> [(&'static str, u8); 15] {
    [
        ("tactical", attributes.tactical),
        ("preparation", attributes.preparation),
        ("adaptability", attributes.adaptability),
        ("decisionMaking", attributes.decision_making),
        ("technicalDevelopment", attributes.technical_development),
        ("physicalDevelopment", attributes.physical_development),
        ("mentalDevelopment", attributes.mental_development),
        ("tacticalDevelopment", attributes.tactical_development),
        ("youthDevelopment", attributes.youth_development),
        ("motivation", attributes.motivation),
        ("communication", attributes.communication),
        ("discipline", attributes.discipline),
        ("peopleManagement", attributes.people_management),
        ("abilityJudgement", attributes.ability_judgement),
        ("potentialJudgement", attributes.potential_judgement),
    ]
}

const fn progressive_attribute_cost(value: u8) -> u16 {
    if value <= 40 {
        0
    } else if value <= 50 {
        (value - 40) as u16
    } else if value <= 60 {
        10 + ((value - 50) as u16 * 2)
    } else {
        30 + ((value - 60) as u16 * 3)
    }
}

fn qualification_level(qualification: &str) -> Option<u8> {
    match qualification.trim() {
        "Licença Regional" => Some(0),
        "Licença Nacional" => Some(1),
        "Licença Continental" => Some(2),
        _ => None,
    }
}

fn coach_category_scores(attributes: &CoachAttributeSet) -> BTreeMap<&'static str, u8> {
    let weighted = |parts: &[(u8, u16)]| {
        let total: u32 = parts
            .iter()
            .map(|(value, weight)| u32::from(*value) * u32::from(*weight))
            .sum();
        let weights: u32 = parts.iter().map(|(_, weight)| u32::from(*weight)).sum();
        ((total + weights / 2) / weights) as u8
    };
    BTreeMap::from([
        (
            "Tática",
            weighted(&[
                (attributes.tactical, 40),
                (attributes.adaptability, 25),
                (attributes.decision_making, 35),
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
    ])
}

pub fn evaluate_coach_creation(draft: &CoachCreatorDraft) -> CoachCreationEvaluation {
    let qualification = qualification_level(&draft.qualification);
    let license_bonus = qualification.map_or(0, |level| u16::from(level) * 8);
    let cap_bonus = qualification.unwrap_or(0);
    let attribute_cap = draft
        .background
        .base_cap()
        .saturating_add(cap_bonus)
        .min(70);
    let experience_cap = draft.background.maximum_experience();
    let reputation_cap = draft.background.maximum_reputation();
    let specialty_limit = if draft.background == CoachBackground::Beginner {
        1
    } else {
        2
    };
    let budget = draft
        .background
        .base_budget()
        .saturating_add(license_bonus)
        .saturating_add(u16::from(draft.experience_years.min(experience_cap)) * 2);
    let specialty_cost = u16::try_from(draft.specialties.len())
        .unwrap_or(u16::MAX)
        .saturating_mul(8);
    let attribute_lines: Vec<_> = attribute_entries(&draft.attributes)
        .into_iter()
        .map(|(attribute_id, value)| CoachAttributeBudgetLine {
            attribute_id: attribute_id.to_owned(),
            value,
            cost: progressive_attribute_cost(value),
            next_cost: (value < attribute_cap).then(|| {
                progressive_attribute_cost(value.saturating_add(1))
                    .saturating_sub(progressive_attribute_cost(value))
            }),
            cap: attribute_cap,
        })
        .collect();
    let used_points = attribute_lines
        .iter()
        .map(|line| line.cost)
        .sum::<u16>()
        .saturating_add(specialty_cost);
    let high_attribute_count = attribute_values(&draft.attributes)
        .into_iter()
        .filter(|value| *value >= 60)
        .count() as u8;
    let high_attribute_limit = draft.background.high_attribute_limit();
    let mut errors = Vec::new();
    if qualification.is_none() {
        errors.push("licença não reconhecida pela política de criação".to_owned());
    }
    if draft.experience_years > experience_cap {
        errors.push(format!(
            "o histórico escolhido permite no máximo {experience_cap} anos de experiência"
        ));
    }
    if draft.reputation > reputation_cap {
        errors.push(format!(
            "a reputação inicial não pode exceder {reputation_cap} para este histórico"
        ));
    }
    if attribute_lines.iter().any(|line| line.value < 20) {
        errors.push("capacidades iniciais não podem ficar abaixo de 20".to_owned());
    }
    if attribute_lines.iter().any(|line| line.value > line.cap) {
        errors.push(format!(
            "uma ou mais capacidades excedem o cap inicial {attribute_cap}"
        ));
    }
    if used_points > budget {
        errors.push(format!(
            "capacidades e especialidades excedem o orçamento autoritativo de {budget} pontos"
        ));
    }
    if high_attribute_count > high_attribute_limit {
        errors.push(format!(
            "este histórico permite no máximo {high_attribute_limit} capacidades em nível 60+"
        ));
    }
    if draft.specialties.len() > usize::from(specialty_limit) {
        errors.push(format!(
            "este histórico permite no máximo {specialty_limit} especialidade(s)"
        ));
    }
    let mut deduplicated = draft.specialties.clone();
    deduplicated.sort();
    deduplicated.dedup();
    if deduplicated.len() != draft.specialties.len() {
        errors.push("especialidades duplicadas não são permitidas".to_owned());
    }

    let categories = coach_category_scores(&draft.attributes);
    let contextual_rating = {
        let score = |category| u32::from(categories.get(category).copied().unwrap_or(0));
        ((score("Tática") * 35
            + score("Preparação") * 20
            + score("Desenvolvimento") * 15
            + score("Gestão humana") * 20
            + score("Avaliação") * 10
            + 50)
            / 100) as u8
    };
    let mut ordered: Vec<_> = categories.into_iter().collect();
    ordered.sort_by_key(|(_, score)| *score);
    let limitations = ordered
        .iter()
        .take(2)
        .map(|(label, _)| (*label).to_owned())
        .collect();
    let strengths = ordered
        .iter()
        .rev()
        .take(2)
        .map(|(label, _)| (*label).to_owned())
        .collect();
    let spread = attribute_values(&draft.attributes)
        .into_iter()
        .max()
        .unwrap_or(0)
        .saturating_sub(
            attribute_values(&draft.attributes)
                .into_iter()
                .min()
                .unwrap_or(0),
        );
    let balance_label = if !errors.is_empty() {
        "Configuração inválida"
    } else if spread >= 25 || high_attribute_count == high_attribute_limit.max(1) {
        "Muito concentrado"
    } else if spread >= 14 {
        "Especialista"
    } else {
        "Perfil equilibrado"
    }
    .to_owned();

    CoachCreationEvaluation {
        schema_version: COACH_CREATOR_SCHEMA_VERSION,
        cost_model_version: "rivallo.coach-creation-budget.v2".to_owned(),
        budget,
        used_points,
        remaining_points: i16::try_from(budget).unwrap_or(i16::MAX)
            - i16::try_from(used_points).unwrap_or(i16::MAX),
        attribute_cap,
        cap_reason: format!(
            "Cap definido por histórico ({:?}) e licença ({})",
            draft.background, draft.qualification
        ),
        high_attribute_limit,
        high_attribute_count,
        specialty_limit,
        contextual_rating,
        reputation_cap,
        experience_cap,
        balance_label,
        strengths,
        limitations,
        attribute_lines,
        valid: errors.is_empty(),
        errors,
    }
}

pub fn validate_portrait(portrait: &PortraitUpload) -> Result<&'static str, String> {
    const MAX_BYTES: usize = 5 * 1024 * 1024;
    if portrait.bytes.is_empty() || portrait.bytes.len() > MAX_BYTES {
        return Err("retrato deve ter entre 1 byte e 5 MB".to_owned());
    }
    let safe_name = portrait
        .file_name
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '_'));
    if !safe_name || portrait.file_name.contains("..") {
        return Err("nome de arquivo do retrato é inseguro".to_owned());
    }
    let kind = if portrait.bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        "png"
    } else if portrait.bytes.starts_with(&[0xff, 0xd8, 0xff]) {
        "jpeg"
    } else if portrait.bytes.len() >= 12
        && &portrait.bytes[..4] == b"RIFF"
        && &portrait.bytes[8..12] == b"WEBP"
    {
        "webp"
    } else {
        return Err("retrato precisa ser PNG, JPEG ou WebP válido".to_owned());
    };
    let expected = match kind {
        "png" => "image/png",
        "jpeg" => "image/jpeg",
        _ => "image/webp",
    };
    if portrait.mime_type != expected {
        return Err("MIME do retrato não corresponde ao conteúdo".to_owned());
    }
    let allowed_derivatives = ["profile", "card", "miniCard", "sidebar"];
    if portrait.derivatives.iter().any(|(name, bytes)| {
        !allowed_derivatives.contains(&name.as_str())
            || bytes.len() > 2 * 1024 * 1024
            || !bytes.starts_with(b"\x89PNG\r\n\x1a\n")
    }) {
        return Err("derivados do retrato precisam ser PNG locais e reconhecidos".to_owned());
    }
    Ok(kind)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn attributes(value: u8) -> CoachAttributeSet {
        CoachAttributeSet {
            tactical: value,
            preparation: value,
            adaptability: value,
            decision_making: value,
            technical_development: value,
            physical_development: value,
            mental_development: value,
            tactical_development: value,
            youth_development: value,
            motivation: value,
            communication: value,
            discipline: value,
            people_management: value,
            ability_judgement: value,
            potential_judgement: value,
        }
    }

    fn valid_draft() -> CoachCreatorDraft {
        CoachCreatorDraft {
            first_name: "Lia".to_owned(),
            last_name: "Torres".to_owned(),
            known_name: "Lia Torres".to_owned(),
            nationality: "Brasil".to_owned(),
            secondary_nationality: None,
            birthplace: None,
            birth_date: "1990-02-03".to_owned(),
            age: 36,
            languages: vec!["Português".to_owned()],
            background: CoachBackground::Balanced,
            archetype: CoachArchetype::Balanced,
            qualification: "Licença Nacional".to_owned(),
            experience_years: 4,
            reputation: 45,
            style: "Equilibrado".to_owned(),
            preferred_formations: vec!["4-3-3".to_owned()],
            specialties: vec![],
            attributes: attributes(40),
            appearance: CoachAppearance {
                seed: 1,
                renderer_version: 1,
                skin_tone: 3,
                face_shape: "oval".to_owned(),
                hair_style: "curto".to_owned(),
                hair_color: "castanho".to_owned(),
                facial_hair: "nenhuma".to_owned(),
                glasses: false,
                clothing: "social".to_owned(),
            },
            portrait: None,
        }
    }

    #[test]
    fn rejects_an_all_maximum_coach_and_unsafe_portraits() {
        let mut draft = valid_draft();
        draft.attributes = attributes(85);
        draft.portrait = Some(PortraitUpload {
            file_name: "coach.svg".to_owned(),
            mime_type: "image/svg+xml".to_owned(),
            bytes: b"<svg/>".to_vec(),
            derivatives: BTreeMap::new(),
        });
        let errors = draft
            .validate(&["Brasil".to_owned()])
            .expect_err("invalid creator draft");
        assert!(errors.iter().any(|error| error.contains("orçamento")));
        assert!(errors.iter().any(|error| error.contains("cap inicial")));
        assert!(errors.iter().any(|error| error.contains("PNG")));
    }

    #[test]
    fn applies_progressive_costs_caps_and_background_limits_authoritatively() {
        assert_eq!(progressive_attribute_cost(40), 0);
        assert_eq!(progressive_attribute_cost(50), 10);
        assert_eq!(progressive_attribute_cost(60), 30);
        assert_eq!(progressive_attribute_cost(70), 60);

        let mut beginner = valid_draft();
        beginner.background = CoachBackground::Beginner;
        beginner.qualification = "Licença Regional".to_owned();
        beginner.experience_years = 12;
        beginner.reputation = 60;
        beginner.attributes = attributes(60);
        beginner.specialties = vec!["Tática".to_owned(), "Gestão humana".to_owned()];
        let evaluation = evaluate_coach_creation(&beginner);

        assert!(!evaluation.valid);
        assert_eq!(evaluation.attribute_cap, 54);
        assert_eq!(evaluation.high_attribute_limit, 0);
        assert_eq!(evaluation.specialty_limit, 1);
        assert!(evaluation.used_points > evaluation.budget);
        assert!(evaluation.errors.iter().any(|error| error.contains("cap")));
        assert!(
            evaluation
                .errors
                .iter()
                .any(|error| error.contains("experiência"))
        );
    }

    #[test]
    fn contextual_rating_uses_named_categories_instead_of_map_order() {
        let mut draft = valid_draft();
        draft.attributes = attributes(40);
        draft.attributes.tactical = 60;
        draft.attributes.adaptability = 60;
        draft.attributes.decision_making = 60;
        let evaluation = evaluate_coach_creation(&draft);

        assert_eq!(evaluation.contextual_rating, 47);
        assert_eq!(
            evaluation.strengths.first().map(String::as_str),
            Some("Tática")
        );
    }
}
