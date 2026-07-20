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
    pub fn point_budget(self) -> u16 {
        match self {
            Self::ProfessionalPlayer => 290,
            Self::AmateurPlayer => 265,
            Self::TacticalAnalyst | Self::YouthDeveloper | Self::PeopleManager => 275,
            Self::Beginner => 235,
            Self::Balanced => 260,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CoachAppearance {
    pub skin_tone: u8,
    pub face_shape: String,
    pub hair_style: String,
    pub hair_color: String,
    pub facial_hair: String,
    pub glasses: bool,
    pub clothing: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PortraitUpload {
    pub file_name: String,
    pub mime_type: String,
    pub bytes: Vec<u8>,
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

        let values = attribute_values(&self.attributes);
        if values.iter().any(|value| !(20..=85).contains(value)) {
            errors.push("capacidades devem permanecer entre 20 e 85".to_owned());
        }
        let cost: u16 = values
            .iter()
            .map(|value| u16::from(value.saturating_sub(40)))
            .sum();
        if cost > self.background.point_budget() {
            errors.push(format!(
                "capacidades excedem o orçamento de {} pontos",
                self.background.point_budget()
            ));
        }
        if values.iter().all(|value| *value >= 80) {
            errors.push("o perfil precisa manter limitações reais".to_owned());
        }

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

    pub fn into_profile(self, coach_id: String, club: &Club) -> CoachSportingProfile {
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
                started_at: "career-start".to_owned(),
                expires_at: "indefinido".to_owned(),
                squad_status: "Treinador principal".to_owned(),
            }),
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

    #[test]
    fn rejects_an_all_maximum_coach_and_unsafe_portraits() {
        let draft = CoachCreatorDraft {
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
            qualification: "Licença Nacional".to_owned(),
            experience_years: 4,
            reputation: 45,
            style: "Equilibrado".to_owned(),
            preferred_formations: vec!["4-3-3".to_owned()],
            specialties: vec![],
            attributes: attributes(85),
            appearance: CoachAppearance {
                skin_tone: 3,
                face_shape: "oval".to_owned(),
                hair_style: "curto".to_owned(),
                hair_color: "castanho".to_owned(),
                facial_hair: "nenhuma".to_owned(),
                glasses: false,
                clothing: "social".to_owned(),
            },
            portrait: Some(PortraitUpload {
                file_name: "coach.svg".to_owned(),
                mime_type: "image/svg+xml".to_owned(),
                bytes: b"<svg/>".to_vec(),
            }),
        };
        let errors = draft
            .validate(&["Brasil".to_owned()])
            .expect_err("invalid creator draft");
        assert!(errors.iter().any(|error| error.contains("orçamento")));
        assert!(errors.iter().any(|error| error.contains("PNG")));
    }
}
