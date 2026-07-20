use std::collections::BTreeMap;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};
use std::time::{SystemTime, UNIX_EPOCH};

use rivallo_application::{
    AssistanceProfile, CAREER_SCHEMA_VERSION, CareerIntegrity, CareerRouteContext, CareerSaveState,
    CareerSlot, CareerWorldSnapshot, CoachCreatorDraft, DataPackageType, MatchdayState,
    PackageVisibility, ProfileWorld, ResolvedWorldDatabase, SeasonRecord,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::{MatchdayCoordinator, ProfileCoordinator, WorldDatabaseCoordinator};

const INDEX_SCHEMA_VERSION: u16 = 1;
const MAX_BACKUPS: usize = 5;

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(
    tag = "mode",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum CareerCoachChoice {
    Existing { coach_id: String },
    Created { draft: Box<CoachCreatorDraft> },
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CreateCareerRequest {
    pub display_name: String,
    pub selected_package_ids: Vec<String>,
    pub club_id: String,
    pub season_ref: String,
    pub current_date: String,
    pub assistance: AssistanceProfile,
    pub coach: CareerCoachChoice,
    pub operation_id: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SaveCareerRequest {
    pub career_id: String,
    pub expected_revision: u64,
    pub context: CareerRouteContext,
    pub operation_id: String,
    pub create_backup: bool,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CareerFailure {
    pub code: String,
    pub message: String,
    pub details: Vec<String>,
}

impl CareerFailure {
    fn new(code: &str, message: impl Into<String>) -> Self {
        Self {
            code: code.to_owned(),
            message: message.into(),
            details: Vec::new(),
        }
    }

    fn with_details(code: &str, message: impl Into<String>, details: Vec<String>) -> Self {
        Self {
            code: code.to_owned(),
            message: message.into(),
            details,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CareerSlotSummary {
    pub career_id: String,
    pub display_name: String,
    pub manager_id: String,
    pub manager_name: String,
    pub club_id: String,
    pub club_name: String,
    pub club_short_name: String,
    pub club_primary_color: String,
    pub current_date: String,
    pub season_ref: String,
    pub base_name: String,
    pub base_package_id: String,
    pub base_package_version: String,
    pub mod_count: usize,
    pub world_fingerprint: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub last_played_at: u64,
    pub last_context: CareerRouteContext,
    pub save_revision: u64,
    pub integrity: CareerIntegrity,
    pub save_state: CareerSaveState,
    pub sporting_state: String,
    pub backup_count: usize,
}

impl CareerSlotSummary {
    fn from_slot(slot: &CareerSlot, backup_count: usize) -> Self {
        let base_name = slot
            .base_snapshot
            .resolved
            .packages
            .iter()
            .find(|package| package.package_id == slot.base_snapshot.base_package_id)
            .map_or_else(
                || slot.base_snapshot.base_package_id.clone(),
                |package| package.name.clone(),
            );
        Self {
            career_id: slot.career_id.clone(),
            display_name: slot.display_name.clone(),
            manager_id: slot.manager_id.clone(),
            manager_name: slot.manager_name.clone(),
            club_id: slot.club_id.clone(),
            club_name: slot.club_name.clone(),
            club_short_name: slot.club_short_name.clone(),
            club_primary_color: slot.club_primary_color.clone(),
            current_date: slot.current_date.clone(),
            season_ref: slot.season_ref.clone(),
            base_name,
            base_package_id: slot.base_snapshot.base_package_id.clone(),
            base_package_version: slot.base_snapshot.base_package_version.clone(),
            mod_count: slot.base_snapshot.active_mods.len(),
            world_fingerprint: slot.base_snapshot.world_fingerprint.clone(),
            created_at: slot.created_at,
            updated_at: slot.updated_at,
            last_played_at: slot.last_played_at,
            last_context: slot.last_context.clone(),
            save_revision: slot.save_revision,
            integrity: slot.integrity,
            save_state: slot.save_state,
            sporting_state: slot.sporting_state.clone(),
            backup_count,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SlotEnvelope {
    checksum: String,
    slot: CareerSlot,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CareerIndexEntry {
    summary: CareerSlotSummary,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CareerIndex {
    schema_version: u16,
    revision: u64,
    last_career_id: Option<String>,
    operations: BTreeMap<String, String>,
    slots: Vec<CareerIndexEntry>,
}

impl Default for CareerIndex {
    fn default() -> Self {
        Self {
            schema_version: INDEX_SCHEMA_VERSION,
            revision: 0,
            last_career_id: None,
            operations: BTreeMap::new(),
            slots: Vec::new(),
        }
    }
}

pub struct CareerCoordinator {
    root: PathBuf,
    lock: Mutex<()>,
}

impl CareerCoordinator {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self {
            root: root.into(),
            lock: Mutex::new(()),
        }
    }

    fn lock(&self) -> Result<MutexGuard<'_, ()>, CareerFailure> {
        self.lock.lock().map_err(|_| {
            CareerFailure::new(
                "career.lock_failed",
                "As carreiras estão temporariamente indisponíveis.",
            )
        })
    }

    pub fn migrate_legacy(
        &self,
        world: &ResolvedWorldDatabase,
        matchday: &MatchdayState,
        profiles: &ProfileWorld,
    ) -> Result<CareerSlotSummary, CareerFailure> {
        let _guard = self.lock()?;
        let mut index = self.read_index()?;
        let operation_id = "migration:legacy-local:v1";
        if let Some(career_id) = index.operations.get(operation_id) {
            let slot = self.read_slot(career_id)?;
            return Ok(CareerSlotSummary::from_slot(
                &slot,
                self.backup_count(career_id),
            ));
        }
        let coach = profiles
            .coaches
            .iter()
            .find(|coach| coach.identity.club_id == matchday.club.id)
            .or_else(|| profiles.coaches.first())
            .ok_or_else(|| {
                CareerFailure::new(
                    "career.legacy_manager_missing",
                    "A carreira local não possui treinador válido para migração.",
                )
            })?;
        let now = now_ms();
        let career_id = "career.legacy.aurora".to_owned();
        let slot = CareerSlot {
            schema_version: CAREER_SCHEMA_VERSION,
            career_id: career_id.clone(),
            operation_id: operation_id.to_owned(),
            display_name: "Aurora — carreira original".to_owned(),
            manager_id: coach.identity.entity_id.clone(),
            manager_name: coach.identity.known_name.clone(),
            club_id: matchday.club.id.clone(),
            club_name: matchday.club.name.clone(),
            club_short_name: matchday.club.short_name.clone(),
            club_primary_color: matchday.club.primary_color.clone(),
            base_snapshot: world_snapshot(world.clone(), now)?,
            current_date: "2026-07-15".to_owned(),
            season_ref: first_season_ref(world).unwrap_or_else(|| "season.unavailable".to_owned()),
            created_at: now,
            updated_at: now,
            last_played_at: now,
            last_context: CareerRouteContext::default(),
            save_revision: 1,
            assistance: AssistanceProfile::Balanced,
            integrity: CareerIntegrity::Valid,
            save_state: CareerSaveState::Saved,
            sporting_state: "legacyMatchdayAvailable".to_owned(),
            matchday: matchday.clone(),
            profiles: profiles.clone(),
            portrait_asset: None,
        };
        slot.validate().map_err(|error| {
            CareerFailure::new(
                &error,
                "A carreira local não passou pela validação de migração.",
            )
        })?;
        self.write_new_slot(&slot, None)?;
        index.revision += 1;
        index.last_career_id = Some(career_id.clone());
        index
            .operations
            .insert(operation_id.to_owned(), career_id.clone());
        index.slots.push(index_entry(&slot));
        if let Err(error) = self.write_index(&index) {
            let _ = fs::remove_dir_all(self.slot_dir(&career_id));
            return Err(error);
        }
        Ok(CareerSlotSummary::from_slot(&slot, 1))
    }

    pub fn list(&self) -> Result<Vec<CareerSlotSummary>, CareerFailure> {
        let _guard = self.lock()?;
        let index = self.read_index()?;
        let mut summaries = index
            .slots
            .iter()
            .map(|entry| {
                let career_id = &entry.summary.career_id;
                self.read_slot(career_id).map_or_else(
                    |_| {
                        let mut summary = entry.summary.clone();
                        summary.integrity = CareerIntegrity::Corrupt;
                        summary.save_state = CareerSaveState::Failed;
                        summary.backup_count = self.backup_count(career_id);
                        summary
                    },
                    |slot| CareerSlotSummary::from_slot(&slot, self.backup_count(career_id)),
                )
            })
            .collect::<Vec<_>>();
        summaries.sort_by_key(|summary| std::cmp::Reverse(summary.last_played_at));
        Ok(summaries)
    }

    pub fn last_valid(&self) -> Result<Option<CareerSlotSummary>, CareerFailure> {
        let _guard = self.lock()?;
        let index = self.read_index()?;
        let Some(career_id) = index.last_career_id else {
            return Ok(None);
        };
        match self.read_slot(&career_id) {
            Ok(slot) => Ok(Some(CareerSlotSummary::from_slot(
                &slot,
                self.backup_count(&career_id),
            ))),
            Err(_) => Ok(None),
        }
    }

    pub fn create(
        &self,
        request: CreateCareerRequest,
        world: &WorldDatabaseCoordinator,
    ) -> Result<CareerSlot, CareerFailure> {
        let _guard = self.lock()?;
        let mut index = self.read_index()?;
        if let Some(career_id) = index.operations.get(&request.operation_id) {
            return self.read_slot(career_id);
        }
        validate_display_name(&request.display_name)?;
        if request.operation_id.trim().is_empty() || request.operation_id.len() > 120 {
            return Err(CareerFailure::new(
                "career.invalid_operation_id",
                "A operação de criação é inválida.",
            ));
        }
        let resolved = world
            .resolve_selection(&request.selected_package_ids)
            .map_err(|report| {
                CareerFailure::with_details(
                    "career.composition_invalid",
                    "A composição de base e mods não é válida.",
                    report
                        .diagnostics
                        .into_iter()
                        .map(|diagnostic| format!("{}: {}", diagnostic.code, diagnostic.rule))
                        .collect(),
                )
            })?;
        if resolved
            .packages
            .iter()
            .any(|package| package.visibility == PackageVisibility::PrivateDevelopment)
        {
            return Err(CareerFailure::new(
                "career.private_package_blocked",
                "Pacotes privados exigem um ambiente de desenvolvimento autorizado.",
            ));
        }
        let club = resolved
            .world
            .clubs
            .iter()
            .find(|club| club.id == request.club_id)
            .cloned()
            .ok_or_else(|| {
                CareerFailure::new(
                    "career.club_missing",
                    "O clube selecionado não existe na base.",
                )
            })?;
        let roster_count = resolved
            .world
            .profiles
            .players
            .iter()
            .filter(|player| player.identity.club_id == club.id)
            .count();
        if roster_count < 11 || resolved.world.matchday.club.id != club.id {
            return Err(CareerFailure::new(
                "career.club_roster_incomplete",
                "O clube não possui um elenco inicial completo e carregável nesta base.",
            ));
        }
        let season_exists = resolved.world.competitions.iter().any(|competition| {
            competition.seasons.iter().any(|season| {
                season.id == request.season_ref
                    && season
                        .participant_club_ids
                        .iter()
                        .any(|club_id| club_id == &club.id)
            })
        });
        if !season_exists {
            return Err(CareerFailure::new(
                "career.season_invalid",
                "A definição de início não inclui o clube selecionado.",
            ));
        }

        let now = now_ms();
        let career_id = career_id(&request.operation_id, now);
        let mut profiles = resolved.world.profiles.clone();
        let (manager_id, manager_name, portrait) = match request.coach {
            CareerCoachChoice::Existing { coach_id } => {
                let coach = profiles
                    .coaches
                    .iter()
                    .find(|coach| {
                        coach.identity.entity_id == coach_id && coach.identity.club_id == club.id
                    })
                    .ok_or_else(|| {
                        CareerFailure::new(
                            "career.coach_missing",
                            "O treinador atual não está disponível para este clube.",
                        )
                    })?;
                (
                    coach.identity.entity_id.clone(),
                    coach.identity.known_name.clone(),
                    None,
                )
            }
            CareerCoachChoice::Created { draft } => {
                let nationalities = resolved
                    .world
                    .nations
                    .iter()
                    .flat_map(|nation| [nation.name.clone(), nation.iso2.clone()])
                    .collect::<Vec<_>>();
                draft.validate(&nationalities).map_err(|errors| {
                    CareerFailure::with_details(
                        "career.coach_invalid",
                        "Revise os dados do treinador antes de criar a carreira.",
                        errors,
                    )
                })?;
                let portrait = draft.portrait.clone();
                let coach_id = format!("career:{career_id}:coach:1");
                let coach = (*draft).into_profile(coach_id.clone(), &club);
                let manager_name = coach.identity.known_name.clone();
                profiles.coaches.push(coach);
                profiles.revision += 1;
                profiles
                    .validate()
                    .map_err(|error| CareerFailure::new("career.coach_profile_invalid", error))?;
                (coach_id, manager_name, portrait)
            }
        };

        let mut matchday = resolved.world.matchday.clone();
        matchday.club = club.clone();
        matchday.round = 1;
        matchday.record = SeasonRecord::default();
        matchday.last_result = None;
        let snapshot = world_snapshot(resolved, now)?;
        let portrait_asset = portrait.as_ref().map(|portrait| {
            let kind =
                rivallo_application::validate_portrait(portrait).expect("validated portrait");
            format!("assets/coach-portrait.{kind}")
        });
        let slot = CareerSlot {
            schema_version: CAREER_SCHEMA_VERSION,
            career_id: career_id.clone(),
            operation_id: request.operation_id.clone(),
            display_name: request.display_name.trim().to_owned(),
            manager_id,
            manager_name,
            club_id: club.id.clone(),
            club_name: club.name.clone(),
            club_short_name: club.short_name.clone(),
            club_primary_color: club.primary_color.clone(),
            base_snapshot: snapshot,
            current_date: request.current_date,
            season_ref: request.season_ref,
            created_at: now,
            updated_at: now,
            last_played_at: now,
            last_context: CareerRouteContext::default(),
            save_revision: 1,
            assistance: request.assistance,
            integrity: CareerIntegrity::Valid,
            save_state: CareerSaveState::Saved,
            sporting_state: "awaitingCompetitionInitialization".to_owned(),
            matchday,
            profiles,
            portrait_asset,
        };
        slot.validate().map_err(|error| {
            CareerFailure::new(&error, "A carreira não passou pela validação final.")
        })?;
        self.write_new_slot(&slot, portrait.as_ref())?;
        index.revision += 1;
        index.last_career_id = Some(career_id.clone());
        index
            .operations
            .insert(request.operation_id, career_id.clone());
        index.slots.push(index_entry(&slot));
        if let Err(error) = self.write_index(&index) {
            let _ = fs::remove_dir_all(self.slot_dir(&career_id));
            return Err(error);
        }
        Ok(slot)
    }

    pub fn load(
        &self,
        career_id: &str,
        matchday: &MatchdayCoordinator,
        profiles: &ProfileCoordinator,
    ) -> Result<CareerSlot, CareerFailure> {
        let _guard = self.lock()?;
        let mut slot = self.read_slot(career_id)?;
        matchday
            .replace_state(slot.matchday.clone())
            .map_err(|error| CareerFailure::new("career.matchday_restore_failed", error))?;
        profiles
            .replace_world(&slot.profiles)
            .map_err(|error| CareerFailure::new("career.profile_restore_failed", error))?;
        let now = now_ms();
        slot.last_played_at = now;
        slot.updated_at = now;
        self.write_slot(&slot, false)?;
        let mut index = self.read_index()?;
        index.last_career_id = Some(career_id.to_owned());
        index.revision += 1;
        self.update_index_entry(&mut index, &slot);
        self.write_index(&index)?;
        Ok(slot)
    }

    pub fn save(
        &self,
        request: SaveCareerRequest,
        matchday: &MatchdayCoordinator,
        profiles: &ProfileCoordinator,
    ) -> Result<CareerSlot, CareerFailure> {
        let _guard = self.lock()?;
        let mut index = self.read_index()?;
        if request.operation_id.trim().is_empty() || request.operation_id.len() > 120 {
            return Err(CareerFailure::new(
                "career.invalid_operation_id",
                "A operação de save é inválida.",
            ));
        }
        if let Some(career_id) = index.operations.get(&request.operation_id) {
            if career_id != &request.career_id {
                return Err(CareerFailure::new(
                    "career.operation_conflict",
                    "A operação de save já pertence a outra carreira.",
                ));
            }
            return self.read_slot(career_id);
        }
        let mut slot = self.read_slot(&request.career_id)?;
        if slot.save_revision != request.expected_revision {
            return Err(CareerFailure::with_details(
                "career.revision_conflict",
                "A carreira mudou desde a última leitura.",
                vec![format!("revisão atual: {}", slot.save_revision)],
            ));
        }
        slot.matchday = matchday
            .state()
            .map_err(|error| CareerFailure::new("career.matchday_snapshot_failed", error))?;
        slot.profiles = profiles
            .snapshot(&slot.matchday)
            .map_err(|error| CareerFailure::new("career.profile_snapshot_failed", error))?;
        slot.last_context = sanitize_context(request.context);
        slot.save_revision += 1;
        slot.updated_at = now_ms();
        slot.last_played_at = slot.updated_at;
        slot.save_state = CareerSaveState::Saved;
        slot.validate().map_err(|error| {
            CareerFailure::new(&error, "O snapshot da carreira ficou inconsistente.")
        })?;
        self.write_slot(&slot, request.create_backup)?;
        index.revision += 1;
        index.last_career_id = Some(slot.career_id.clone());
        index
            .operations
            .insert(request.operation_id, slot.career_id.clone());
        self.update_index_entry(&mut index, &slot);
        self.write_index(&index)?;
        Ok(slot)
    }

    pub fn rename(
        &self,
        career_id: &str,
        display_name: &str,
    ) -> Result<CareerSlotSummary, CareerFailure> {
        let _guard = self.lock()?;
        validate_display_name(display_name)?;
        let mut slot = self.read_slot(career_id)?;
        slot.display_name = display_name.trim().to_owned();
        slot.updated_at = now_ms();
        slot.save_revision += 1;
        self.write_slot(&slot, true)?;
        let mut index = self.read_index()?;
        index.revision += 1;
        self.update_index_entry(&mut index, &slot);
        self.write_index(&index)?;
        Ok(CareerSlotSummary::from_slot(
            &slot,
            self.backup_count(career_id),
        ))
    }

    pub fn create_backup(&self, career_id: &str) -> Result<CareerSlotSummary, CareerFailure> {
        let _guard = self.lock()?;
        let slot = self.read_slot(career_id)?;
        self.backup_current(&slot)?;
        Ok(CareerSlotSummary::from_slot(
            &slot,
            self.backup_count(career_id),
        ))
    }

    pub fn backups(&self, career_id: &str) -> Result<Vec<String>, CareerFailure> {
        let _guard = self.lock()?;
        self.backup_names(career_id)
    }

    pub fn restore_backup(
        &self,
        career_id: &str,
        backup_name: &str,
    ) -> Result<CareerSlot, CareerFailure> {
        let _guard = self.lock()?;
        if !safe_component(backup_name) || !backup_name.ends_with(".json") {
            return Err(CareerFailure::new(
                "career.backup_name_invalid",
                "O backup selecionado é inválido.",
            ));
        }
        let source = self.backup_dir(career_id).join(backup_name);
        let mut restored = self.read_envelope(&source)?.slot;
        if restored.career_id != career_id {
            return Err(CareerFailure::new(
                "career.backup_identity_mismatch",
                "O backup pertence a outra carreira.",
            ));
        }
        let current = self.read_slot(career_id)?;
        self.backup_current(&current)?;
        restored.save_revision = current.save_revision + 1;
        restored.updated_at = now_ms();
        restored.integrity = CareerIntegrity::Recovered;
        self.write_slot(&restored, false)?;
        Ok(restored)
    }

    pub fn delete(&self, career_id: &str) -> Result<(), CareerFailure> {
        let _guard = self.lock()?;
        let mut index = self.read_index()?;
        if !index
            .slots
            .iter()
            .any(|slot| slot.summary.career_id == career_id)
        {
            return Err(CareerFailure::new(
                "career.slot_missing",
                "A carreira não existe mais.",
            ));
        }
        let target = self.slot_dir(career_id);
        if !target.starts_with(&self.root) || target == self.root {
            return Err(CareerFailure::new(
                "career.unsafe_delete_target",
                "O destino da exclusão é inseguro.",
            ));
        }
        fs::remove_dir_all(&target)
            .map_err(|error| CareerFailure::new("career.delete_failed", error.to_string()))?;
        index
            .slots
            .retain(|slot| slot.summary.career_id != career_id);
        index.operations.retain(|_, value| value != career_id);
        if index.last_career_id.as_deref() == Some(career_id) {
            index.last_career_id = index
                .slots
                .first()
                .map(|slot| slot.summary.career_id.clone());
        }
        index.revision += 1;
        self.write_index(&index)
    }

    fn update_index_entry(&self, index: &mut CareerIndex, slot: &CareerSlot) {
        if let Some(entry) = index
            .slots
            .iter_mut()
            .find(|entry| entry.summary.career_id == slot.career_id)
        {
            *entry = index_entry(slot);
        }
    }

    fn read_index(&self) -> Result<CareerIndex, CareerFailure> {
        fs::create_dir_all(&self.root)
            .map_err(|error| CareerFailure::new("career.root_unavailable", error.to_string()))?;
        let path = self.root.join("index.json");
        if !path.exists() {
            return Ok(CareerIndex::default());
        }
        let index: CareerIndex =
            serde_json::from_slice(&fs::read(&path).map_err(|error| {
                CareerFailure::new("career.index_read_failed", error.to_string())
            })?)
            .map_err(|error| CareerFailure::new("career.index_corrupt", error.to_string()))?;
        if index.schema_version != INDEX_SCHEMA_VERSION {
            return Err(CareerFailure::new(
                "career.index_incompatible",
                "O índice de carreiras exige outra versão do Rivallo.",
            ));
        }
        Ok(index)
    }

    fn write_index(&self, index: &CareerIndex) -> Result<(), CareerFailure> {
        atomic_write_json(
            &self.root.join("index.json"),
            index,
            "career.index_write_failed",
        )
    }

    fn slot_dir(&self, career_id: &str) -> PathBuf {
        self.root.join(career_id)
    }

    fn slot_path(&self, career_id: &str) -> PathBuf {
        self.slot_dir(career_id).join("slot.json")
    }

    fn backup_dir(&self, career_id: &str) -> PathBuf {
        self.slot_dir(career_id).join("backups")
    }

    fn read_slot(&self, career_id: &str) -> Result<CareerSlot, CareerFailure> {
        if !safe_component(career_id) {
            return Err(CareerFailure::new(
                "career.slot_id_invalid",
                "O identificador da carreira é inválido.",
            ));
        }
        let envelope = self.read_envelope(&self.slot_path(career_id))?;
        envelope.slot.validate().map_err(|error| {
            CareerFailure::new(&error, "A carreira falhou na verificação de integridade.")
        })?;
        Ok(envelope.slot)
    }

    fn read_envelope(&self, path: &Path) -> Result<SlotEnvelope, CareerFailure> {
        let bytes = fs::read(path)
            .map_err(|error| CareerFailure::new("career.slot_read_failed", error.to_string()))?;
        let envelope: SlotEnvelope = serde_json::from_slice(&bytes)
            .map_err(|error| CareerFailure::new("career.slot_corrupt", error.to_string()))?;
        let checksum = slot_checksum(&envelope.slot)?;
        if checksum != envelope.checksum {
            return Err(CareerFailure::new(
                "career.slot_checksum_mismatch",
                "A integridade do save não pôde ser confirmada.",
            ));
        }
        Ok(envelope)
    }

    fn write_new_slot(
        &self,
        slot: &CareerSlot,
        portrait: Option<&rivallo_application::PortraitUpload>,
    ) -> Result<(), CareerFailure> {
        let final_dir = self.slot_dir(&slot.career_id);
        if final_dir.exists() {
            return Err(CareerFailure::new(
                "career.slot_exists",
                "A carreira já existe.",
            ));
        }
        let temporary_dir = self.root.join(format!("{}.creating", slot.career_id));
        if temporary_dir.exists() {
            fs::remove_dir_all(&temporary_dir)
                .map_err(|error| CareerFailure::new("career.rollback_failed", error.to_string()))?;
        }
        fs::create_dir_all(temporary_dir.join("backups"))
            .map_err(|error| CareerFailure::new("career.create_failed", error.to_string()))?;
        if let Some(portrait) = portrait {
            let kind = rivallo_application::validate_portrait(portrait)
                .map_err(|error| CareerFailure::new("career.portrait_invalid", error))?;
            let assets = temporary_dir.join("assets");
            fs::create_dir_all(&assets).map_err(|error| {
                CareerFailure::new("career.portrait_write_failed", error.to_string())
            })?;
            sync_write(
                &assets.join(format!("coach-portrait.{kind}")),
                &portrait.bytes,
            )
            .map_err(|error| {
                CareerFailure::new("career.portrait_write_failed", error.to_string())
            })?;
        }
        let envelope = envelope(slot)?;
        atomic_write_json(
            &temporary_dir.join("slot.json"),
            &envelope,
            "career.slot_write_failed",
        )?;
        atomic_write_json(
            &temporary_dir.join("backups").join("initial.json"),
            &envelope,
            "career.backup_write_failed",
        )?;
        fs::rename(&temporary_dir, &final_dir).map_err(|error| {
            let _ = fs::remove_dir_all(&temporary_dir);
            CareerFailure::new("career.commit_failed", error.to_string())
        })
    }

    fn write_slot(&self, slot: &CareerSlot, create_backup: bool) -> Result<(), CareerFailure> {
        if create_backup && self.slot_path(&slot.career_id).exists() {
            let current = self.read_slot(&slot.career_id)?;
            self.backup_current(&current)?;
        }
        atomic_write_json(
            &self.slot_path(&slot.career_id),
            &envelope(slot)?,
            "career.slot_write_failed",
        )
    }

    fn backup_current(&self, slot: &CareerSlot) -> Result<(), CareerFailure> {
        let directory = self.backup_dir(&slot.career_id);
        fs::create_dir_all(&directory)
            .map_err(|error| CareerFailure::new("career.backup_write_failed", error.to_string()))?;
        let name = format!("{}-rev-{}.json", now_ms(), slot.save_revision);
        atomic_write_json(
            &directory.join(name),
            &envelope(slot)?,
            "career.backup_write_failed",
        )?;
        let mut backups = self.backup_names(&slot.career_id)?;
        backups.retain(|name| name != "initial.json");
        while backups.len() > MAX_BACKUPS {
            if let Some(oldest) = backups.first().cloned() {
                fs::remove_file(directory.join(&oldest)).map_err(|error| {
                    CareerFailure::new("career.backup_retention_failed", error.to_string())
                })?;
                backups.remove(0);
            }
        }
        Ok(())
    }

    fn backup_names(&self, career_id: &str) -> Result<Vec<String>, CareerFailure> {
        let directory = self.backup_dir(career_id);
        if !directory.exists() {
            return Ok(Vec::new());
        }
        let mut names = fs::read_dir(directory)
            .map_err(|error| CareerFailure::new("career.backup_list_failed", error.to_string()))?
            .filter_map(Result::ok)
            .filter(|entry| entry.path().is_file())
            .filter_map(|entry| entry.file_name().into_string().ok())
            .filter(|name| name.ends_with(".json"))
            .collect::<Vec<_>>();
        names.sort();
        Ok(names)
    }

    fn backup_count(&self, career_id: &str) -> usize {
        self.backup_names(career_id).map_or(0, |items| items.len())
    }
}

fn world_snapshot(
    resolved: ResolvedWorldDatabase,
    created_at: u64,
) -> Result<CareerWorldSnapshot, CareerFailure> {
    let base = resolved
        .packages
        .iter()
        .find(|package| package.content_type == DataPackageType::Base)
        .ok_or_else(|| {
            CareerFailure::new(
                "career.base_missing",
                "Selecione exatamente uma base principal.",
            )
        })?;
    let mods = resolved
        .packages
        .iter()
        .filter(|package| package.content_type == DataPackageType::Mod)
        .collect::<Vec<_>>();
    Ok(CareerWorldSnapshot {
        base_package_id: base.package_id.clone(),
        base_package_version: base.version.clone(),
        schema_version: resolved.schema_version,
        active_mods: mods
            .iter()
            .map(|package| package.package_id.clone())
            .collect(),
        mod_versions: mods
            .iter()
            .map(|package| format!("{}:{}", package.package_id, package.version))
            .collect(),
        load_order: resolved.fingerprint.package_order.clone(),
        package_hashes: resolved
            .packages
            .iter()
            .map(|package| format!("{}:{}", package.package_id, package.checksum))
            .collect(),
        world_fingerprint: resolved.fingerprint.value.clone(),
        fingerprint_algorithm: resolved.fingerprint.algorithm.clone(),
        game_version: "0.1.0".to_owned(),
        created_at,
        resolved,
    })
}

fn first_season_ref(world: &ResolvedWorldDatabase) -> Option<String> {
    world
        .world
        .competitions
        .iter()
        .flat_map(|competition| &competition.seasons)
        .next()
        .map(|season| season.id.clone())
}

fn validate_display_name(value: &str) -> Result<(), CareerFailure> {
    let length = value.trim().chars().count();
    if !(1..=80).contains(&length) || value.chars().any(char::is_control) {
        return Err(CareerFailure::new(
            "career.display_name_invalid",
            "O nome da carreira deve ter entre 1 e 80 caracteres.",
        ));
    }
    Ok(())
}

fn career_id(operation_id: &str, now: u64) -> String {
    let digest = Sha256::digest(operation_id.as_bytes());
    format!("career.{now}.{}", hex(&digest[..6]))
}

fn index_entry(slot: &CareerSlot) -> CareerIndexEntry {
    CareerIndexEntry {
        summary: CareerSlotSummary::from_slot(slot, 0),
    }
}

fn envelope(slot: &CareerSlot) -> Result<SlotEnvelope, CareerFailure> {
    Ok(SlotEnvelope {
        checksum: slot_checksum(slot)?,
        slot: slot.clone(),
    })
}

fn slot_checksum(slot: &CareerSlot) -> Result<String, CareerFailure> {
    let bytes = serde_json::to_vec(slot)
        .map_err(|error| CareerFailure::new("career.serialize_failed", error.to_string()))?;
    Ok(format!("sha256:{}", hex(&Sha256::digest(bytes))))
}

fn atomic_write_json<T: Serialize>(
    path: &Path,
    value: &T,
    error_code: &str,
) -> Result<(), CareerFailure> {
    let parent = path
        .parent()
        .ok_or_else(|| CareerFailure::new(error_code, "O caminho de persistência é inválido."))?;
    fs::create_dir_all(parent)
        .map_err(|error| CareerFailure::new(error_code, error.to_string()))?;
    let bytes = serde_json::to_vec_pretty(value)
        .map_err(|error| CareerFailure::new(error_code, error.to_string()))?;
    let temporary = path.with_extension("json.tmp");
    sync_write(&temporary, &bytes)
        .map_err(|error| CareerFailure::new(error_code, error.to_string()))?;
    if path.exists() {
        let rollback = path.with_extension("json.rollback");
        if rollback.exists() {
            fs::remove_file(&rollback)
                .map_err(|error| CareerFailure::new(error_code, error.to_string()))?;
        }
        fs::rename(path, &rollback)
            .map_err(|error| CareerFailure::new(error_code, error.to_string()))?;
        if let Err(error) = fs::rename(&temporary, path) {
            let _ = fs::rename(&rollback, path);
            return Err(CareerFailure::new(error_code, error.to_string()));
        }
        let _ = fs::remove_file(rollback);
    } else {
        fs::rename(&temporary, path)
            .map_err(|error| CareerFailure::new(error_code, error.to_string()))?;
    }
    Ok(())
}

fn sync_write(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    let mut file = File::create(path)?;
    file.write_all(bytes)?;
    file.sync_all()
}

fn safe_component(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 180
        && !value.contains("..")
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-' | b'_'))
}

fn sanitize_context(mut context: CareerRouteContext) -> CareerRouteContext {
    if !context.route.starts_with('/') || context.route.contains("..") || context.route.len() > 240
    {
        context.route = "/career/home".to_owned();
    }
    context.scroll_top = context.scroll_top.min(1_000_000);
    context
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .try_into()
        .unwrap_or(u64::MAX)
}

fn hex(bytes: &[u8]) -> String {
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        use std::fmt::Write as _;
        let _ = write!(output, "{byte:02x}");
    }
    output
}

#[cfg(test)]
mod tests {
    use super::*;

    fn indexed_summary(career_id: &str) -> CareerSlotSummary {
        CareerSlotSummary {
            career_id: career_id.to_owned(),
            display_name: "Carreira danificada".to_owned(),
            manager_id: "coach.test".to_owned(),
            manager_name: "Treinador Teste".to_owned(),
            club_id: "club.test".to_owned(),
            club_name: "Clube Teste".to_owned(),
            club_short_name: "TST".to_owned(),
            club_primary_color: "#237a57".to_owned(),
            current_date: "2026-01-10".to_owned(),
            season_ref: "season.test".to_owned(),
            base_name: "Base de teste".to_owned(),
            base_package_id: "base.test".to_owned(),
            base_package_version: "1.0.0".to_owned(),
            mod_count: 0,
            world_fingerprint: "fingerprint".to_owned(),
            created_at: 1,
            updated_at: 2,
            last_played_at: 3,
            last_context: CareerRouteContext::default(),
            save_revision: 1,
            integrity: CareerIntegrity::Valid,
            save_state: CareerSaveState::Saved,
            sporting_state: "awaitingCompetitionInitialization".to_owned(),
            backup_count: 0,
        }
    }

    #[test]
    fn context_rejects_path_traversal_and_caps_scroll() {
        let sanitized = sanitize_context(CareerRouteContext {
            route: "/career/../secrets".to_owned(),
            active_screen: Some("squad".to_owned()),
            active_tab: None,
            variation_id: None,
            scroll_top: u32::MAX,
        });
        assert_eq!(sanitized.route, "/career/home");
        assert_eq!(sanitized.scroll_top, 1_000_000);
    }

    #[test]
    fn generated_ids_are_safe_internal_components() {
        let id = career_id("operation:one", 42);
        assert!(safe_component(&id));
        assert_eq!(id, career_id("operation:one", 42));
    }

    #[test]
    fn list_preserves_a_corrupt_slot_from_the_durable_index() {
        let root = std::env::temp_dir().join(format!(
            "rivallo-career-corrupt-{}-{}",
            std::process::id(),
            now_ms()
        ));
        let coordinator = CareerCoordinator::new(&root);
        let career_id = "career.corrupt.fixture";
        let index = CareerIndex {
            schema_version: INDEX_SCHEMA_VERSION,
            revision: 1,
            last_career_id: Some(career_id.to_owned()),
            operations: BTreeMap::new(),
            slots: vec![CareerIndexEntry {
                summary: indexed_summary(career_id),
            }],
        };
        coordinator.write_index(&index).expect("writes index");
        let slot_dir = coordinator.slot_dir(career_id);
        fs::create_dir_all(&slot_dir).expect("creates corrupt slot directory");
        fs::write(slot_dir.join("slot.json"), b"not-json").expect("writes corrupt slot");

        let summaries = coordinator.list().expect("lists indexed slots");
        assert_eq!(summaries.len(), 1);
        assert_eq!(summaries[0].career_id, career_id);
        assert_eq!(summaries[0].integrity, CareerIntegrity::Corrupt);
        assert_eq!(summaries[0].save_state, CareerSaveState::Failed);

        fs::remove_dir_all(root).expect("removes test directory");
    }
}
