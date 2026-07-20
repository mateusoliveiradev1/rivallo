use std::collections::HashSet;
use std::sync::OnceLock;

use serde::{Deserialize, Serialize};

use crate::{
    Club, CoachSportingProfile, ExternalPlayerState, MatchdayState, Player, PlayerSportingProfile,
    Position, PreferredFoot, ProfileWorld,
};

pub const WORLD_DATABASE_SCHEMA_VERSION: u16 = 2;
pub const MINIMUM_WORLD_DATABASE_SCHEMA_VERSION: u16 = 1;

static BUNDLED_OFFICIAL_WORLD: OnceLock<WorldPackageData> = OnceLock::new();

pub(crate) fn bundled_official_world() -> WorldPackageData {
    BUNDLED_OFFICIAL_WORLD
        .get_or_init(|| {
            serde_json::from_str(include_str!(
                "../../../data/packages/official.rivallo.foundation/data/world.json"
            ))
            .expect("the bundled official world package must match the Rust contract")
        })
        .clone()
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DataPackageType {
    Base,
    Mod,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PackageVisibility {
    Public,
    PrivateDevelopment,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PackageDependency {
    pub package_id: String,
    pub version_requirement: String,
    #[serde(default)]
    pub optional: bool,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PackageConflict {
    pub package_id: String,
    pub reason: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PackageEntrypoints {
    pub world: String,
    #[serde(default)]
    pub patches: Option<String>,
    #[serde(default)]
    pub assets: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PackageProvenance {
    pub source: String,
    pub rights: String,
    pub created_at: String,
    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PackageManifest {
    pub package_id: String,
    pub name: String,
    pub version: String,
    pub schema_version: u16,
    pub game_version_compatibility: String,
    pub author: String,
    pub description: String,
    pub content_type: DataPackageType,
    #[serde(default)]
    pub dependencies: Vec<PackageDependency>,
    #[serde(default)]
    pub conflicts: Vec<PackageConflict>,
    #[serde(default)]
    pub load_order_hint: i32,
    pub entrypoints: PackageEntrypoints,
    #[serde(default)]
    pub assets: Vec<AssetReference>,
    pub provenance: PackageProvenance,
    pub visibility: PackageVisibility,
    pub checksum: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ExternalIdentifier {
    pub source: String,
    pub external_id: String,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PersonRoleKind {
    Player,
    Coach,
    StaffMember,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PersonRoleAssignment {
    pub role_id: String,
    pub kind: PersonRoleKind,
    #[serde(default)]
    pub club_id: Option<String>,
    #[serde(default)]
    pub title: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FactualContract {
    pub club_id: String,
    #[serde(default)]
    pub started_at: Option<String>,
    #[serde(default)]
    pub expires_at: Option<String>,
    #[serde(default)]
    pub squad_status: Option<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ProvenanceVerificationStatus {
    Pending,
    Verified,
    Disputed,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FactualProvenance {
    pub source: String,
    #[serde(default)]
    pub source_record_id: Option<String>,
    #[serde(default)]
    pub observed_at: Option<String>,
    pub verification_status: ProvenanceVerificationStatus,
    #[serde(default)]
    pub fields: Vec<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum FactualIdentityStatus {
    PartialFactualIdentity,
    VerifiedFactualIdentity,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum StructuralValidity {
    StructurallyValid,
    StructurallyBlocked,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum RuntimeProfileAvailability {
    RuntimeProfileBlocked,
    RuntimeProfileAvailable,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SportingEvaluationStatus {
    AwaitingEvaluation,
    Evaluated,
    NotApplicable,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum GameplayReadiness {
    GameplayBlocked,
    GameplayReady,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PersonReadiness {
    pub identity: FactualIdentityStatus,
    pub structural: StructuralValidity,
    pub runtime_profile: RuntimeProfileAvailability,
    pub evaluation: SportingEvaluationStatus,
    pub gameplay: GameplayReadiness,
    #[serde(default)]
    pub blockers: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Person {
    pub person_id: String,
    #[serde(default)]
    pub external_ids: Vec<ExternalIdentifier>,
    pub full_name: String,
    #[serde(default)]
    pub known_name: Option<String>,
    #[serde(default)]
    pub birth_date: Option<String>,
    #[serde(default)]
    pub height_cm: Option<u16>,
    #[serde(default)]
    pub weight_kg: Option<u16>,
    #[serde(default)]
    pub preferred_foot: Option<PreferredFoot>,
    #[serde(default)]
    pub nationality_id: Option<String>,
    #[serde(default)]
    pub second_nationality_id: Option<String>,
    #[serde(default)]
    pub detailed_position: Option<Position>,
    #[serde(default)]
    pub shirt_number: Option<u16>,
    #[serde(default)]
    pub contract: Option<FactualContract>,
    pub roles: Vec<PersonRoleAssignment>,
    pub provenance: Vec<FactualProvenance>,
    pub readiness: PersonReadiness,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Nation {
    pub id: String,
    pub name: String,
    pub iso2: String,
    pub iso3: String,
    #[serde(default)]
    pub aliases: Vec<String>,
    #[serde(default)]
    pub confederation_id: Option<String>,
    #[serde(default)]
    pub flag_asset_id: Option<String>,
    #[serde(default)]
    pub external_ids: Vec<ExternalIdentifier>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Region {
    pub id: String,
    pub nation_id: String,
    pub name: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct City {
    pub id: String,
    pub nation_id: String,
    #[serde(default)]
    pub region_id: Option<String>,
    pub name: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Stadium {
    pub id: String,
    pub name: String,
    pub city_id: String,
    #[serde(default)]
    pub owner_club_id: Option<String>,
    pub capacity: u32,
    #[serde(default)]
    pub asset_id: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CompetitionRules {
    pub points_for_win: u8,
    pub points_for_draw: u8,
    pub points_for_loss: u8,
    pub participant_count: u16,
    pub rounds: u16,
    pub legs: u8,
    #[serde(default)]
    pub tie_breakers: Vec<String>,
    #[serde(default = "default_minimum_roster_size")]
    pub minimum_roster_size: u16,
    #[serde(default = "default_minimum_goalkeepers")]
    pub minimum_goalkeepers: u8,
    #[serde(default = "default_starters")]
    pub starters: u8,
    #[serde(default = "default_bench_size")]
    pub bench_size: u8,
    #[serde(default = "default_substitutions")]
    pub substitutions: u8,
    #[serde(default)]
    pub extra_time: bool,
    #[serde(default)]
    pub penalties: bool,
    #[serde(default)]
    pub foreign_player_limit: Option<u8>,
    #[serde(default)]
    pub minimum_homegrown_players: Option<u8>,
    #[serde(default)]
    pub promotion_slots: u8,
    #[serde(default)]
    pub relegation_slots: u8,
}

const fn default_minimum_roster_size() -> u16 {
    18
}

const fn default_minimum_goalkeepers() -> u8 {
    2
}

const fn default_starters() -> u8 {
    11
}

const fn default_bench_size() -> u8 {
    7
}

const fn default_substitutions() -> u8 {
    5
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CompetitionStageKind {
    #[default]
    RoundRobin,
    DoubleRoundRobin,
    Groups,
    Knockout,
    TwoLeggedKnockout,
    SingleFinal,
    Qualifying,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CompetitionStageDefinition {
    pub id: String,
    pub name: String,
    pub order: u16,
    #[serde(default)]
    pub kind: CompetitionStageKind,
    pub participant_count: u16,
    #[serde(default)]
    pub group_count: u16,
    #[serde(default = "default_stage_legs")]
    pub legs: u8,
    #[serde(default)]
    pub advance_count: u16,
    #[serde(default)]
    pub eliminate_count: u16,
    #[serde(default)]
    pub points_for_win: Option<u8>,
    #[serde(default)]
    pub points_for_draw: Option<u8>,
    #[serde(default)]
    pub points_for_loss: Option<u8>,
    #[serde(default)]
    pub tie_breakers: Vec<String>,
    #[serde(default)]
    pub extra_time: bool,
    #[serde(default)]
    pub penalties: bool,
    #[serde(default)]
    pub neutral_venue: bool,
}

const fn default_stage_legs() -> u8 {
    1
}

#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CompetitionCalendarConstraints {
    #[serde(default)]
    pub preferred_weekdays: Vec<u8>,
    #[serde(default)]
    pub kickoff_times: Vec<String>,
    #[serde(default)]
    pub minimum_rest_days: u8,
    #[serde(default)]
    pub blocked_dates: Vec<String>,
    #[serde(default)]
    pub neutral_venue: bool,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SeasonPlayerRegistration {
    #[serde(default)]
    pub registration_id: Option<String>,
    pub player_id: String,
    pub club_id: String,
    #[serde(default)]
    pub shirt_number: Option<u8>,
    #[serde(default)]
    pub contract_reference: Option<String>,
    #[serde(default)]
    pub eligible: bool,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CompetitionSeasonDefinition {
    pub id: String,
    pub competition_id: String,
    pub label: String,
    pub start_date: String,
    pub end_date: String,
    pub rules: CompetitionRules,
    #[serde(default)]
    pub participant_club_ids: Vec<String>,
    #[serde(default)]
    pub stages: Vec<CompetitionStageDefinition>,
    #[serde(default)]
    pub registration_windows: Vec<DateWindow>,
    #[serde(default)]
    pub calendar_constraints: CompetitionCalendarConstraints,
    #[serde(default)]
    pub player_registrations: Vec<SeasonPlayerRegistration>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DateWindow {
    pub start_date: String,
    pub end_date: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Competition {
    pub id: String,
    pub name: String,
    pub short_name: String,
    pub nation_id: String,
    #[serde(default)]
    pub logo_asset_id: Option<String>,
    #[serde(default)]
    pub region_id: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub level: Option<u8>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub primary_color: Option<String>,
    #[serde(default)]
    pub secondary_color: Option<String>,
    #[serde(default)]
    pub base_season_id: Option<String>,
    #[serde(default)]
    pub seasons: Vec<CompetitionSeasonDefinition>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PositionDefinition {
    pub id: Position,
    pub label: String,
    pub abbreviation: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RoleDefinition {
    pub id: String,
    pub position_id: Position,
    pub label: String,
    #[serde(default)]
    pub responsibilities: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttributeDefinition {
    pub id: String,
    pub label: String,
    pub category: String,
    pub minimum: u8,
    pub maximum: u8,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TraitDefinition {
    pub id: String,
    pub label: String,
    pub description: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AssetReference {
    pub id: String,
    #[serde(default)]
    pub entity_id: Option<String>,
    pub kind: String,
    pub path: String,
    pub media_type: String,
    pub checksum: String,
    pub provenance: String,
    pub rights: String,
    #[serde(default)]
    pub private_use: bool,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorldPackageData {
    pub schema_version: u16,
    pub matchday: MatchdayState,
    pub profiles: ProfileWorld,
    #[serde(default)]
    pub clubs: Vec<Club>,
    #[serde(default)]
    pub people: Vec<Person>,
    #[serde(default)]
    pub nations: Vec<Nation>,
    #[serde(default)]
    pub regions: Vec<Region>,
    #[serde(default)]
    pub cities: Vec<City>,
    #[serde(default)]
    pub stadiums: Vec<Stadium>,
    #[serde(default)]
    pub competitions: Vec<Competition>,
    #[serde(default)]
    pub positions: Vec<PositionDefinition>,
    #[serde(default)]
    pub roles: Vec<RoleDefinition>,
    #[serde(default)]
    pub attributes: Vec<AttributeDefinition>,
    #[serde(default)]
    pub traits: Vec<TraitDefinition>,
    #[serde(default)]
    pub assets: Vec<AssetReference>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum WorldEntityKind {
    Club,
    Person,
    MatchdayPlayer,
    PlayerProfile,
    ExternalPlayer,
    Coach,
    Nation,
    Region,
    City,
    Stadium,
    Competition,
    Position,
    Role,
    Attribute,
    Trait,
    Asset,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(tag = "kind", content = "value", rename_all = "camelCase")]
pub enum WorldEntity {
    Club(Club),
    Person(Person),
    MatchdayPlayer(Player),
    PlayerProfile(PlayerSportingProfile),
    ExternalPlayer(ExternalPlayerState),
    Coach(Box<CoachSportingProfile>),
    Nation(Nation),
    Region(Region),
    City(City),
    Stadium(Stadium),
    Competition(Competition),
    Position(PositionDefinition),
    Role(RoleDefinition),
    Attribute(AttributeDefinition),
    Trait(TraitDefinition),
    Asset(AssetReference),
}

impl WorldEntity {
    pub fn kind(&self) -> WorldEntityKind {
        match self {
            Self::Club(_) => WorldEntityKind::Club,
            Self::Person(_) => WorldEntityKind::Person,
            Self::MatchdayPlayer(_) => WorldEntityKind::MatchdayPlayer,
            Self::PlayerProfile(_) => WorldEntityKind::PlayerProfile,
            Self::ExternalPlayer(_) => WorldEntityKind::ExternalPlayer,
            Self::Coach(_) => WorldEntityKind::Coach,
            Self::Nation(_) => WorldEntityKind::Nation,
            Self::Region(_) => WorldEntityKind::Region,
            Self::City(_) => WorldEntityKind::City,
            Self::Stadium(_) => WorldEntityKind::Stadium,
            Self::Competition(_) => WorldEntityKind::Competition,
            Self::Position(_) => WorldEntityKind::Position,
            Self::Role(_) => WorldEntityKind::Role,
            Self::Attribute(_) => WorldEntityKind::Attribute,
            Self::Trait(_) => WorldEntityKind::Trait,
            Self::Asset(_) => WorldEntityKind::Asset,
        }
    }

    pub fn id(&self) -> &str {
        match self {
            Self::Club(value) => &value.id,
            Self::Person(value) => &value.person_id,
            Self::MatchdayPlayer(value) => &value.id,
            Self::PlayerProfile(value) => &value.identity.entity_id,
            Self::ExternalPlayer(value) => &value.profile.identity.entity_id,
            Self::Coach(value) => &value.identity.entity_id,
            Self::Nation(value) => &value.id,
            Self::Region(value) => &value.id,
            Self::City(value) => &value.id,
            Self::Stadium(value) => &value.id,
            Self::Competition(value) => &value.id,
            Self::Position(value) => position_id(value.id),
            Self::Role(value) => &value.id,
            Self::Attribute(value) => &value.id,
            Self::Trait(value) => &value.id,
            Self::Asset(value) => &value.id,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PackagePatchOperation {
    Add,
    Replace,
    Remove,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PackagePatch {
    pub operation: PackagePatchOperation,
    pub entity_kind: WorldEntityKind,
    pub target_id: String,
    #[serde(default)]
    pub entity: Option<WorldEntity>,
    pub reason: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ContentPackage {
    pub manifest: PackageManifest,
    #[serde(default)]
    pub world: Option<WorldPackageData>,
    #[serde(default)]
    pub patches: Vec<PackagePatch>,
    #[serde(default)]
    pub source_file: String,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ValidationSeverity {
    Error,
    Warning,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageValidationDiagnostic {
    pub code: String,
    pub severity: ValidationSeverity,
    pub file: String,
    #[serde(default)]
    pub entity_id: Option<String>,
    #[serde(default)]
    pub field: Option<String>,
    #[serde(default)]
    pub reference: Option<String>,
    #[serde(default)]
    pub invalid_value: Option<String>,
    pub rule: String,
    #[serde(default)]
    pub suggestion: Option<String>,
    pub blocking: bool,
}

#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageValidationReport {
    pub valid: bool,
    pub diagnostics: Vec<PackageValidationDiagnostic>,
}

impl PackageValidationReport {
    #[allow(clippy::too_many_arguments)]
    pub fn blocking(
        file: impl Into<String>,
        code: impl Into<String>,
        entity_id: Option<String>,
        field: Option<String>,
        reference: Option<String>,
        invalid_value: Option<String>,
        rule: impl Into<String>,
        suggestion: Option<String>,
    ) -> Self {
        Self {
            valid: false,
            diagnostics: vec![PackageValidationDiagnostic {
                code: code.into(),
                severity: ValidationSeverity::Error,
                file: file.into(),
                entity_id,
                field,
                reference,
                invalid_value,
                rule: rule.into(),
                suggestion,
                blocking: true,
            }],
        }
    }

    #[allow(
        clippy::too_many_arguments,
        reason = "structured package diagnostics intentionally preserve every authoring field"
    )]
    fn error(
        &mut self,
        package: &ContentPackage,
        code: &str,
        entity_id: Option<&str>,
        field: Option<&str>,
        reference: Option<&str>,
        invalid_value: Option<&str>,
        rule: &str,
        suggestion: Option<&str>,
    ) {
        self.diagnostics.push(PackageValidationDiagnostic {
            code: code.to_owned(),
            severity: ValidationSeverity::Error,
            file: package.source_file.clone(),
            entity_id: entity_id.map(str::to_owned),
            field: field.map(str::to_owned),
            reference: reference.map(str::to_owned),
            invalid_value: invalid_value.map(str::to_owned),
            rule: rule.to_owned(),
            suggestion: suggestion.map(str::to_owned),
            blocking: true,
        });
        self.valid = false;
    }

    fn merge(&mut self, other: Self) {
        self.valid &= other.valid;
        self.diagnostics.extend(other.diagnostics);
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldDatabaseFingerprint {
    pub algorithm: String,
    pub value: String,
    pub schema_version: u16,
    pub package_order: Vec<String>,
}

#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageCoverageReport {
    pub clubs: usize,
    pub people: usize,
    pub players: usize,
    pub coaches: usize,
    pub nations: usize,
    pub cities: usize,
    pub stadiums: usize,
    pub competitions: usize,
    pub positions: usize,
    pub roles: usize,
    pub attributes: usize,
    pub assets: usize,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedWorldDatabase {
    pub schema_version: u16,
    pub world: WorldPackageData,
    pub packages: Vec<PackageManifest>,
    pub fingerprint: WorldDatabaseFingerprint,
    pub coverage: PackageCoverageReport,
    pub validation: PackageValidationReport,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ClubReadinessStatus {
    Available,
    AvailableWithWarnings,
    Blocked,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClubReadinessRequirement {
    pub code: String,
    pub label: String,
    pub satisfied: bool,
    pub blocking: bool,
    pub current: Option<u16>,
    pub required: Option<u16>,
    pub editor_module: String,
    pub suggestion: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClubReadinessProjection {
    pub club_id: String,
    pub season_id: String,
    pub status: ClubReadinessStatus,
    pub requirements: Vec<ClubReadinessRequirement>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum RegistrationValidity {
    StructurallyValid,
    StructurallyBlocked,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistrationReadinessProjection {
    pub registration_id: String,
    pub player_id: String,
    pub structural: RegistrationValidity,
    pub person_runtime: RuntimeProfileAvailability,
    pub squad_gameplay: GameplayReadiness,
    pub blockers: Vec<String>,
}

pub fn project_registration_readiness(
    world: &WorldPackageData,
    season_id: &str,
) -> Vec<RegistrationReadinessProjection> {
    let runtime_player_ids = world
        .profiles
        .players
        .iter()
        .map(|profile| profile.identity.entity_id.as_str())
        .chain(
            world
                .profiles
                .external_players
                .iter()
                .map(|state| state.profile.identity.entity_id.as_str()),
        )
        .collect::<HashSet<_>>();
    let factual_players = world
        .people
        .iter()
        .flat_map(|person| {
            person
                .roles
                .iter()
                .filter(|role| role.kind == PersonRoleKind::Player)
                .map(move |role| (role.role_id.as_str(), person))
        })
        .collect::<std::collections::HashMap<_, _>>();
    let club_ids = world
        .clubs
        .iter()
        .map(|club| club.id.as_str())
        .collect::<HashSet<_>>();
    world
        .competitions
        .iter()
        .flat_map(|competition| &competition.seasons)
        .filter(|season| season.id == season_id)
        .flat_map(|season| {
            season.player_registrations.iter().map(|registration| {
                let factual = factual_players
                    .get(registration.player_id.as_str())
                    .copied();
                let target_exists = factual.is_some()
                    || runtime_player_ids.contains(registration.player_id.as_str());
                let structural = target_exists && club_ids.contains(registration.club_id.as_str());
                let runtime_available = runtime_player_ids
                    .contains(registration.player_id.as_str())
                    && factual.is_none_or(|person| {
                        person.readiness.runtime_profile
                            == RuntimeProfileAvailability::RuntimeProfileAvailable
                    });
                let gameplay_ready = runtime_available
                    && factual.is_none_or(|person| {
                        person.readiness.gameplay == GameplayReadiness::GameplayReady
                    });
                let mut blockers = Vec::new();
                if !target_exists {
                    blockers.push("registration.target_missing".to_owned());
                }
                if !club_ids.contains(registration.club_id.as_str()) {
                    blockers.push("registration.club_missing".to_owned());
                }
                if structural && !runtime_available {
                    blockers.push("registration.person_runtime_blocked".to_owned());
                }
                if runtime_available && !gameplay_ready {
                    blockers.push("registration.person_gameplay_blocked".to_owned());
                }
                RegistrationReadinessProjection {
                    registration_id: registration.registration_id.clone().unwrap_or_else(|| {
                        format!("legacy.registration.{}", registration.player_id)
                    }),
                    player_id: registration.player_id.clone(),
                    structural: if structural {
                        RegistrationValidity::StructurallyValid
                    } else {
                        RegistrationValidity::StructurallyBlocked
                    },
                    person_runtime: if runtime_available {
                        RuntimeProfileAvailability::RuntimeProfileAvailable
                    } else {
                        RuntimeProfileAvailability::RuntimeProfileBlocked
                    },
                    squad_gameplay: if gameplay_ready {
                        GameplayReadiness::GameplayReady
                    } else {
                        GameplayReadiness::GameplayBlocked
                    },
                    blockers,
                }
            })
        })
        .collect()
}

pub fn project_club_readiness(
    world: &WorldPackageData,
    season_id: &str,
) -> Vec<ClubReadinessProjection> {
    let season_context = world.competitions.iter().find_map(|competition| {
        competition
            .seasons
            .iter()
            .find(|season| season.id == season_id)
            .map(|season| (competition, season))
    });
    world
        .clubs
        .iter()
        .map(|club| {
            let profiles = world
                .profiles
                .players
                .iter()
                .filter(|player| player.identity.club_id == club.id)
                .collect::<Vec<_>>();
            let loadable_player_ids = world
                .matchday
                .players
                .iter()
                .map(|player| player.id.as_str())
                .collect::<HashSet<_>>();
            let loadable_profiles = profiles
                .iter()
                .filter(|player| loadable_player_ids.contains(player.identity.entity_id.as_str()))
                .copied()
                .collect::<Vec<_>>();
            let active_coaches = world
                .profiles
                .coaches
                .iter()
                .filter(|coach| {
                    coach.identity.club_id == club.id
                        && coach.role == "Treinador principal"
                        && coach.contract.as_ref().is_none_or(|contract| {
                            contract.club_id == club.id
                                && contract.squad_status == "Treinador principal"
                        })
                })
                .count();
            let (minimum_roster, minimum_goalkeepers, participates) =
                season_context.map_or((18, 2, false), |(_, season)| {
                    (
                        season.rules.minimum_roster_size.max(11),
                        season.rules.minimum_goalkeepers.max(1),
                        season.participant_club_ids.iter().any(|id| id == &club.id),
                    )
                });
            let goalkeepers = loadable_profiles
                .iter()
                .filter(|player| player.natural_position == Position::Gk)
                .count();
            let nation_exists = club.nation_id.as_ref().map_or_else(
                || {
                    club.country_code.as_ref().is_some_and(|code| {
                        world.nations.iter().any(|nation| {
                            nation.iso2.eq_ignore_ascii_case(code)
                                || nation.iso3.eq_ignore_ascii_case(code)
                        })
                    })
                },
                |id| world.nations.iter().any(|nation| nation.id == *id),
            );
            let city_exists = club
                .city_id
                .as_ref()
                .map_or(!club.city.trim().is_empty(), |id| {
                    world.cities.iter().any(|city| city.id == *id)
                });
            let competition_matches = season_context.is_some_and(|(competition, _)| {
                club.competition_id
                    .as_ref()
                    .is_none_or(|id| id == &competition.id)
            });
            let mut requirements = vec![
                readiness_requirement(
                    "club.identity",
                    "Identidade do clube",
                    !club.name.trim().is_empty() && !club.short_name.trim().is_empty(),
                    true,
                    None,
                    None,
                    "clubs",
                    "Preencha nome e sigla no módulo Clubes.",
                ),
                readiness_requirement(
                    "club.nation",
                    "Nação válida",
                    nation_exists,
                    true,
                    None,
                    None,
                    "clubs",
                    "Selecione uma nação existente pelo picker do clube.",
                ),
                readiness_requirement(
                    "club.city",
                    "Cidade válida",
                    city_exists,
                    true,
                    None,
                    None,
                    "clubs",
                    "Selecione ou crie uma cidade antes de vincular o clube.",
                ),
                readiness_requirement(
                    "club.competition",
                    "Competição da temporada",
                    competition_matches && season_context.is_some(),
                    true,
                    None,
                    None,
                    "competitions",
                    "Vincule o clube à competição desta temporada.",
                ),
                readiness_requirement(
                    "club.registration",
                    "Inscrição na temporada",
                    participates,
                    true,
                    None,
                    None,
                    "seasons",
                    "Adicione o clube aos participantes da temporada.",
                ),
                readiness_requirement(
                    "club.roster",
                    "Elenco mínimo",
                    loadable_profiles.len() >= usize::from(minimum_roster),
                    true,
                    Some(loadable_profiles.len().try_into().unwrap_or(u16::MAX)),
                    Some(minimum_roster),
                    "players",
                    "Crie ou importe jogadores vinculados a este clube.",
                ),
                readiness_requirement(
                    "club.goalkeepers",
                    "Goleiros mínimos",
                    goalkeepers >= usize::from(minimum_goalkeepers),
                    true,
                    Some(goalkeepers.try_into().unwrap_or(u16::MAX)),
                    Some(minimum_goalkeepers.into()),
                    "players",
                    "Adicione goleiros ao elenco conforme o regulamento.",
                ),
                readiness_requirement(
                    "club.head_coach",
                    "Treinador principal",
                    active_coaches == 1,
                    true,
                    Some(active_coaches.try_into().unwrap_or(u16::MAX)),
                    Some(1),
                    "coaches",
                    "Defina exatamente um treinador principal ativo.",
                ),
            ];
            if club.city_id.is_none() || club.nation_id.is_none() || club.competition_id.is_none() {
                requirements.push(readiness_requirement(
                    "club.legacy_references",
                    "Referências legadas por texto",
                    false,
                    false,
                    None,
                    None,
                    "clubs",
                    "Converta cidade, nação e competição para referências por ID estável.",
                ));
            }
            let has_blocker = requirements
                .iter()
                .any(|requirement| requirement.blocking && !requirement.satisfied);
            let has_warning = requirements
                .iter()
                .any(|requirement| !requirement.blocking && !requirement.satisfied);
            ClubReadinessProjection {
                club_id: club.id.clone(),
                season_id: season_id.to_owned(),
                status: if has_blocker {
                    ClubReadinessStatus::Blocked
                } else if has_warning {
                    ClubReadinessStatus::AvailableWithWarnings
                } else {
                    ClubReadinessStatus::Available
                },
                requirements,
            }
        })
        .collect()
}

#[allow(clippy::too_many_arguments)]
fn readiness_requirement(
    code: &str,
    label: &str,
    satisfied: bool,
    blocking: bool,
    current: Option<u16>,
    required: Option<u16>,
    editor_module: &str,
    suggestion: &str,
) -> ClubReadinessRequirement {
    ClubReadinessRequirement {
        code: code.to_owned(),
        label: label.to_owned(),
        satisfied,
        blocking,
        current,
        required,
        editor_module: editor_module.to_owned(),
        suggestion: suggestion.to_owned(),
    }
}

fn valid_stable_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 160
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-' | b'_' | b':'))
        && !value.contains("..")
}

fn valid_relative_path(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 260
        && !value.starts_with(['/', '\\'])
        && !value.contains("..")
        && !value.contains(':')
        && !value.contains('\0')
        && value.split(['/', '\\']).all(|segment| !segment.is_empty())
}

fn valid_version(value: &str) -> bool {
    let core = value.split_once('-').map_or(value, |(core, _)| core);
    let mut parts = core.split('.');
    matches!(parts.next(), Some(part) if part.parse::<u32>().is_ok())
        && matches!(parts.next(), Some(part) if part.parse::<u32>().is_ok())
        && matches!(parts.next(), Some(part) if part.parse::<u32>().is_ok())
        && parts.next().is_none()
}

fn version_tuple(value: &str) -> Option<(u32, u32, u32)> {
    let core = value.split_once('-').map_or(value, |(core, _)| core);
    let mut parts = core.split('.');
    let tuple = (
        parts.next()?.parse().ok()?,
        parts.next()?.parse().ok()?,
        parts.next()?.parse().ok()?,
    );
    parts.next().is_none().then_some(tuple)
}

fn version_satisfies(requirement: &str, candidate: &str) -> bool {
    let Some(candidate) = version_tuple(candidate) else {
        return false;
    };
    requirement.split_whitespace().all(|clause| {
        let (operator, version) = if let Some(value) = clause.strip_prefix(">=") {
            (">=", value)
        } else if let Some(value) = clause.strip_prefix("<=") {
            ("<=", value)
        } else if let Some(value) = clause.strip_prefix('>') {
            (">", value)
        } else if let Some(value) = clause.strip_prefix('<') {
            ("<", value)
        } else if let Some(value) = clause.strip_prefix('=') {
            ("=", value)
        } else {
            ("=", clause)
        };
        let Some(required) = version_tuple(version) else {
            return false;
        };
        match operator {
            ">=" => candidate >= required,
            "<=" => candidate <= required,
            ">" => candidate > required,
            "<" => candidate < required,
            _ => candidate == required,
        }
    })
}

fn position_id(position: Position) -> &'static str {
    match position {
        Position::Gk => "GK",
        Position::Rb => "RB",
        Position::Cb => "CB",
        Position::Lb => "LB",
        Position::Dm => "DM",
        Position::Cm => "CM",
        Position::Am => "AM",
        Position::Rw => "RW",
        Position::Lw => "LW",
        Position::St => "ST",
    }
}

fn push_duplicate_errors(
    package: &ContentPackage,
    report: &mut PackageValidationReport,
    values: impl IntoIterator<Item = (WorldEntityKind, String)>,
) {
    let mut ids: HashSet<(WorldEntityKind, String)> = HashSet::new();
    for (kind, id) in values {
        if !valid_stable_id(&id) {
            report.error(
                package,
                "world.invalid_stable_id",
                Some(&id),
                Some("id"),
                None,
                Some(&id),
                "IDs persistentes devem ser globais, estáveis e independentes de nome, índice e ordem.",
                Some("Use um ID de namespace estável, por exemplo official.rivallo.entity.000001."),
            );
        }
        if !ids.insert((kind, id.clone())) {
            report.error(
                package,
                "world.duplicate_id",
                Some(&id),
                Some("id"),
                Some(&format!("{kind:?}")),
                Some(&id),
                "Cada entidade persistente precisa de um ID global único.",
                Some("Renomeie um dos IDs e atualize todas as referências."),
            );
        }
    }
}

pub fn validate_package(package: &ContentPackage) -> PackageValidationReport {
    let mut report = PackageValidationReport {
        valid: true,
        diagnostics: Vec::new(),
    };
    let manifest = &package.manifest;
    if !valid_stable_id(&manifest.package_id) {
        report.error(
            package,
            "package.invalid_id",
            Some(&manifest.package_id),
            Some("packageId"),
            None,
            Some(&manifest.package_id),
            "O packageId deve ser estável e usar apenas caracteres seguros.",
            Some("Use um namespace como community.autor.pacote."),
        );
    }
    if !valid_version(&manifest.version) {
        report.error(
            package,
            "package.invalid_version",
            Some(&manifest.package_id),
            Some("version"),
            None,
            Some(&manifest.version),
            "A versão do pacote deve seguir major.minor.patch.",
            Some("Informe uma versão como 1.0.0."),
        );
    }
    if !version_satisfies(&manifest.game_version_compatibility, "0.1.0") {
        report.error(
            package,
            "package.incompatible_game_version",
            Some(&manifest.package_id),
            Some("gameVersionCompatibility"),
            None,
            Some(&manifest.game_version_compatibility),
            "O pacote precisa declarar compatibilidade com a versão atual do Rivallo.",
            Some("Ajuste o intervalo após validar o pacote com Rivallo 0.1.0."),
        );
    }
    if !(MINIMUM_WORLD_DATABASE_SCHEMA_VERSION..=WORLD_DATABASE_SCHEMA_VERSION)
        .contains(&manifest.schema_version)
    {
        report.error(
            package,
            "package.unsupported_schema",
            Some(&manifest.package_id),
            Some("schemaVersion"),
            None,
            Some(&manifest.schema_version.to_string()),
            "A versão do schema precisa ser suportada pelo jogo.",
            Some("Migre o pacote para schemaVersion 2; a versão 1 continua legível."),
        );
    }
    for (field, path) in [
        ("entrypoints.world", manifest.entrypoints.world.as_str()),
        (
            "entrypoints.patches",
            manifest
                .entrypoints
                .patches
                .as_deref()
                .unwrap_or("data/patches.json"),
        ),
    ] {
        if !valid_relative_path(path) {
            report.error(
                package,
                "package.unsafe_path",
                Some(&manifest.package_id),
                Some(field),
                None,
                Some(path),
                "Entrypoints precisam permanecer dentro da raiz do pacote.",
                Some("Use um caminho relativo sem '..', drive ou raiz absoluta."),
            );
        }
    }
    let checksum = manifest
        .checksum
        .strip_prefix("sha256:")
        .unwrap_or(&manifest.checksum);
    if checksum.len() != 64
        || !checksum
            .bytes()
            .all(|value| value.is_ascii_hexdigit() && !value.is_ascii_uppercase())
    {
        report.error(
            package,
            "package.missing_checksum",
            Some(&manifest.package_id),
            Some("checksum"),
            None,
            None,
            "Todo pacote precisa declarar checksum do conteúdo.",
            Some("Gere novamente o manifesto com o editor/validador de pacotes."),
        );
    }
    for asset in manifest
        .assets
        .iter()
        .chain(package.world.iter().flat_map(|world| world.assets.iter()))
    {
        let asset_checksum = asset
            .checksum
            .strip_prefix("sha256:")
            .unwrap_or(&asset.checksum);
        if !valid_relative_path(&asset.path)
            || !matches!(
                asset.media_type.as_str(),
                "image/png" | "image/webp" | "image/jpeg" | "image/svg+xml"
            )
        {
            report.error(
                package,
                "package.unsafe_asset",
                Some(&asset.id),
                Some("path"),
                None,
                Some(&asset.path),
                "Assets devem ser imagens data-only em caminho relativo seguro.",
                Some("Use PNG, WebP, JPEG ou SVG local sem scripts e sem path traversal."),
            );
        }
        if asset_checksum.len() != 64
            || !asset_checksum
                .bytes()
                .all(|value| value.is_ascii_hexdigit() && !value.is_ascii_uppercase())
        {
            report.error(
                package,
                "package.invalid_asset_checksum",
                Some(&asset.id),
                Some("asset.checksum"),
                None,
                Some(&asset.checksum),
                "Cada asset precisa declarar SHA-256 minúsculo dos bytes exatos.",
                Some("Calcule o SHA-256 do arquivo local e atualize a referência."),
            );
        }
        if manifest.entrypoints.assets.as_deref().is_none_or(|root| {
            !valid_relative_path(root)
                || !asset.path.replace('\\', "/").starts_with(&format!(
                    "{}/",
                    root.replace('\\', "/").trim_end_matches('/')
                ))
        }) {
            report.error(
                package,
                "package.asset_outside_entrypoint",
                Some(&asset.id),
                Some("asset.path"),
                manifest.entrypoints.assets.as_deref(),
                Some(&asset.path),
                "Todo asset precisa permanecer abaixo de entrypoints.assets.",
                Some("Declare entrypoints.assets e mova o arquivo para esse diretório."),
            );
        }
    }
    if !package.patches.is_empty() && manifest.entrypoints.patches.is_none() {
        report.error(
            package,
            "package.missing_patch_entrypoint",
            Some(&manifest.package_id),
            Some("entrypoints.patches"),
            None,
            None,
            "Pacotes com patches precisam declarar um entrypoint de patches.",
            Some("Defina entrypoints.patches com um caminho relativo seguro."),
        );
    }
    if let Some(world) = &package.world {
        if !(MINIMUM_WORLD_DATABASE_SCHEMA_VERSION..=WORLD_DATABASE_SCHEMA_VERSION)
            .contains(&world.schema_version)
        {
            report.error(
                package,
                "world.unsupported_schema",
                Some(&manifest.package_id),
                Some("world.schemaVersion"),
                None,
                Some(&world.schema_version.to_string()),
                "O world.json deve usar o schema mundial suportado.",
                Some("Migre world.json para schemaVersion 2; a versão 1 continua legível."),
            );
        }
        let entities = world_entities(world)
            .into_iter()
            .map(|entity| (entity.kind(), entity.id().to_owned()));
        push_duplicate_errors(package, &mut report, entities);
        validate_world_references(package, world, &mut report);
        if let Err(reason) = world.profiles.validate() {
            report.error(
                package,
                "world.invalid_profiles",
                Some(&manifest.package_id),
                Some("profiles"),
                None,
                None,
                &reason,
                Some("Corrija o catálogo de perfis usando os contratos existentes."),
            );
        }
    } else if manifest.content_type == DataPackageType::Base {
        report.error(
            package,
            "package.base_without_world",
            Some(&manifest.package_id),
            Some("entrypoints.world"),
            None,
            None,
            "Um pacote base precisa fornecer um mundo completo.",
            Some("Adicione data/world.json ao pacote base."),
        );
    }
    for patch in &package.patches {
        let entity_matches = patch.entity.as_ref().is_none_or(|entity| {
            entity.kind() == patch.entity_kind && entity.id() == patch.target_id
        });
        let payload_required = patch.operation != PackagePatchOperation::Remove;
        if !valid_stable_id(&patch.target_id)
            || !entity_matches
            || payload_required != patch.entity.is_some()
        {
            report.error(
                package,
                "package.invalid_patch",
                Some(&patch.target_id),
                Some("patch"),
                Some(&format!("{:?}", patch.entity_kind)),
                None,
                "O patch precisa ter operação, tipo, alvo e payload coerentes.",
                Some("Use payload em add/replace e omita-o em remove; preserve o mesmo ID/tipo."),
            );
        }
    }
    report
}

fn world_entities(world: &WorldPackageData) -> Vec<WorldEntity> {
    let mut entities = Vec::new();
    entities.extend(world.clubs.iter().cloned().map(WorldEntity::Club));
    entities.extend(world.people.iter().cloned().map(WorldEntity::Person));
    entities.extend(
        world
            .matchday
            .players
            .iter()
            .cloned()
            .map(WorldEntity::MatchdayPlayer),
    );
    entities.extend(
        world
            .profiles
            .players
            .iter()
            .cloned()
            .map(WorldEntity::PlayerProfile),
    );
    entities.extend(
        world
            .profiles
            .external_players
            .iter()
            .cloned()
            .map(WorldEntity::ExternalPlayer),
    );
    entities.extend(
        world
            .profiles
            .coaches
            .iter()
            .cloned()
            .map(|coach| WorldEntity::Coach(Box::new(coach))),
    );
    entities.extend(world.nations.iter().cloned().map(WorldEntity::Nation));
    entities.extend(world.regions.iter().cloned().map(WorldEntity::Region));
    entities.extend(world.cities.iter().cloned().map(WorldEntity::City));
    entities.extend(world.stadiums.iter().cloned().map(WorldEntity::Stadium));
    entities.extend(
        world
            .competitions
            .iter()
            .cloned()
            .map(WorldEntity::Competition),
    );
    entities.extend(world.positions.iter().cloned().map(WorldEntity::Position));
    entities.extend(world.roles.iter().cloned().map(WorldEntity::Role));
    entities.extend(world.attributes.iter().cloned().map(WorldEntity::Attribute));
    entities.extend(world.traits.iter().cloned().map(WorldEntity::Trait));
    entities.extend(world.assets.iter().cloned().map(WorldEntity::Asset));
    entities
}

fn validate_world_references(
    package: &ContentPackage,
    world: &WorldPackageData,
    report: &mut PackageValidationReport,
) {
    let club_ids: HashSet<_> = world.clubs.iter().map(|value| value.id.as_str()).collect();
    for club in &world.clubs {
        if let Some(history) = club.history_summary.as_deref() {
            let length = history.trim().chars().count();
            let unsafe_control = history.chars().any(|character| {
                character.is_control() && !matches!(character, '\n' | '\r' | '\t')
            });
            if length > 1_200 || unsafe_control {
                report.error(
                    package,
                    "world.invalid_club_history",
                    Some(&club.id),
                    Some("historySummary"),
                    None,
                    None,
                    "A história do clube deve ser texto simples com até 1.200 caracteres.",
                    Some("Remova caracteres de controle ou reduza o resumo histórico."),
                );
            }
        }
    }
    for active_club in [&world.matchday.club, &world.matchday.opponent] {
        if !club_ids.contains(active_club.id.as_str()) {
            broken_reference(package, report, "matchday", "clubId", &active_club.id);
        }
    }
    let nation_ids: HashSet<_> = world
        .nations
        .iter()
        .map(|value| value.id.as_str())
        .collect();
    let city_ids: HashSet<_> = world.cities.iter().map(|value| value.id.as_str()).collect();
    let region_ids: HashSet<_> = world
        .regions
        .iter()
        .map(|value| value.id.as_str())
        .collect();
    let asset_ids: HashSet<_> = package
        .manifest
        .assets
        .iter()
        .chain(world.assets.iter())
        .map(|value| value.id.as_str())
        .collect();
    let position_ids: HashSet<_> = world
        .positions
        .iter()
        .map(|value| position_id(value.id))
        .collect();
    let runtime_player_ids: HashSet<_> = world
        .profiles
        .players
        .iter()
        .map(|value| value.identity.entity_id.as_str())
        .chain(
            world
                .profiles
                .external_players
                .iter()
                .map(|value| value.profile.identity.entity_id.as_str()),
        )
        .collect();
    let runtime_coach_ids: HashSet<_> = world
        .profiles
        .coaches
        .iter()
        .map(|value| value.identity.entity_id.as_str())
        .collect();
    let mut factual_role_ids = HashSet::new();
    let mut factual_player_ids = HashSet::new();
    for person in &world.people {
        if person.full_name.trim().is_empty() || person.full_name.chars().count() > 160 {
            report.error(
                package,
                "person.missing_name",
                Some(&person.person_id),
                Some("fullName"),
                None,
                Some(&person.full_name),
                "A identidade factual precisa conter um nome conhecido pela fonte.",
                Some("Informe o nome factual; não use string vazia como dado conhecido."),
            );
        }
        for external_id in &person.external_ids {
            if external_id.source.trim().is_empty()
                || external_id.source.chars().count() > 120
                || external_id.external_id.trim().is_empty()
                || external_id.external_id.chars().count() > 160
            {
                report.error(
                    package,
                    "person.invalid_external_id",
                    Some(&person.person_id),
                    Some("externalIds"),
                    Some("source 1..=120; externalId 1..=160"),
                    Some(&format!(
                        "{}:{}",
                        external_id.source, external_id.external_id
                    )),
                    "Identificadores externos precisam preservar fonte e valor não vazios.",
                    Some("Corrija o identificador ou remova-o quando a fonte não o conhece."),
                );
            }
        }
        for (field, value, maximum) in [
            ("knownName", person.known_name.as_deref(), 160),
            ("birthDate", person.birth_date.as_deref(), 10),
        ] {
            if value.is_some_and(|value| value.trim().is_empty() || value.chars().count() > maximum)
            {
                report.error(
                    package,
                    "person.invalid_optional_fact",
                    Some(&person.person_id),
                    Some(field),
                    Some(&format!("1..={maximum} caracteres ou null")),
                    value,
                    "Um fato opcional conhecido não pode ser vazio ou exceder o limite contratual.",
                    Some("Use um valor válido ou null quando o fato for desconhecido."),
                );
            }
        }
        if person.roles.is_empty() {
            report.error(
                package,
                "person.missing_role",
                Some(&person.person_id),
                Some("roles"),
                None,
                None,
                "A pessoa precisa ter ao menos um papel factual.",
                Some("Adicione um papel player, coach ou staffMember sem duplicar a pessoa."),
            );
        }
        for role in &person.roles {
            if role.kind == PersonRoleKind::Player {
                factual_player_ids.insert(role.role_id.as_str());
            }
            if !valid_stable_id(&role.role_id) || !factual_role_ids.insert(role.role_id.as_str()) {
                report.error(
                    package,
                    "person.invalid_or_duplicate_role_id",
                    Some(&person.person_id),
                    Some("roles.roleId"),
                    None,
                    Some(&role.role_id),
                    "Cada papel factual precisa de um ID estável e único.",
                    Some("Preserve o playerId/coachId/staffMemberId da fonte na reimportação."),
                );
            }
            if role
                .club_id
                .as_ref()
                .is_some_and(|id| !club_ids.contains(id.as_str()))
            {
                broken_reference(
                    package,
                    report,
                    &person.person_id,
                    "roles.clubId",
                    role.club_id.as_deref().unwrap_or_default(),
                );
            }
            if role
                .title
                .as_deref()
                .is_some_and(|title| title.trim().is_empty() || title.chars().count() > 160)
            {
                report.error(
                    package,
                    "person.invalid_optional_fact",
                    Some(&person.person_id),
                    Some("roles.title"),
                    Some("1..=160 caracteres ou null"),
                    role.title.as_deref(),
                    "O título factual conhecido não pode ser vazio.",
                    Some("Informe o título ou use null quando ele não estiver disponível."),
                );
            }
        }
        for (field, nation_id) in [
            ("nationalityId", person.nationality_id.as_deref()),
            (
                "secondNationalityId",
                person.second_nationality_id.as_deref(),
            ),
        ] {
            if nation_id.is_some_and(|id| !nation_ids.contains(id)) {
                broken_reference(
                    package,
                    report,
                    &person.person_id,
                    field,
                    nation_id.unwrap_or_default(),
                );
            }
        }
        if person
            .contract
            .as_ref()
            .is_some_and(|contract| !club_ids.contains(contract.club_id.as_str()))
        {
            broken_reference(
                package,
                report,
                &person.person_id,
                "contract.clubId",
                person
                    .contract
                    .as_ref()
                    .map_or("", |contract| contract.club_id.as_str()),
            );
        }
        for (field, value, minimum, maximum) in [
            ("heightCm", person.height_cm, 100, 250),
            ("weightKg", person.weight_kg, 30, 250),
            ("shirtNumber", person.shirt_number, 1, 255),
        ] {
            if value.is_some_and(|value| !(minimum..=maximum).contains(&value)) {
                report.error(
                    package,
                    "person.fact_out_of_range",
                    Some(&person.person_id),
                    Some(field),
                    Some(&format!("{minimum}..={maximum}")),
                    value.map(|value| value.to_string()).as_deref(),
                    "O fato informado está fora do intervalo contratual.",
                    Some("Corrija o valor ou remova-o quando a fonte não o conhece."),
                );
            }
        }
        let has_runtime_profile = person.roles.iter().any(|role| match role.kind {
            PersonRoleKind::Player => runtime_player_ids.contains(role.role_id.as_str()),
            PersonRoleKind::Coach => runtime_coach_ids.contains(role.role_id.as_str()),
            PersonRoleKind::StaffMember => false,
        });
        let readiness = &person.readiness;
        let claims_runtime =
            readiness.runtime_profile == RuntimeProfileAvailability::RuntimeProfileAvailable;
        let claims_gameplay = readiness.gameplay == GameplayReadiness::GameplayReady;
        let evaluated = readiness.evaluation == SportingEvaluationStatus::Evaluated;
        let structurally_valid = readiness.structural == StructuralValidity::StructurallyValid;
        if claims_runtime != has_runtime_profile
            || (claims_gameplay && (!claims_runtime || !evaluated || !structurally_valid))
            || ((!claims_gameplay || !claims_runtime || !evaluated)
                && readiness.blockers.is_empty())
        {
            report.error(
                package,
                "person.readiness_inconsistent",
                Some(&person.person_id),
                Some("readiness"),
                None,
                None,
                "Readiness factual, estrutural, de avaliação e de gameplay precisa ser coerente com os perfis disponíveis.",
                Some("Mantenha runtime/gameplay bloqueados e registre blockers enquanto a avaliação estiver ausente."),
            );
        }
        if person.provenance.is_empty() {
            report.error(
                package,
                "person.provenance_missing",
                Some(&person.person_id),
                Some("provenance"),
                None,
                None,
                "Toda identidade factual precisa preservar a origem dos fatos.",
                Some("Adicione fonte, estado de verificação e os campos cobertos."),
            );
        }
        for provenance in &person.provenance {
            let duplicate_fields =
                provenance.fields.iter().collect::<HashSet<_>>().len() != provenance.fields.len();
            let invalid_record = provenance
                .source_record_id
                .as_deref()
                .is_some_and(|value| value.trim().is_empty() || value.chars().count() > 160);
            if provenance.source.trim().is_empty()
                || provenance.source.chars().count() > 500
                || invalid_record
                || duplicate_fields
            {
                report.error(
                    package,
                    "person.invalid_provenance",
                    Some(&person.person_id),
                    Some("provenance"),
                    Some("source 1..=500; sourceRecordId 1..=160 ou null; fields únicos"),
                    provenance.source_record_id.as_deref(),
                    "A proveniência precisa preservar fonte válida, IDs não vazios e campos únicos.",
                    Some("Corrija a origem factual sem substituir ausência por string vazia."),
                );
            }
        }
        if person
            .readiness
            .blockers
            .iter()
            .collect::<HashSet<_>>()
            .len()
            != person.readiness.blockers.len()
        {
            report.error(
                package,
                "person.duplicate_readiness_blocker",
                Some(&person.person_id),
                Some("readiness.blockers"),
                Some("itens únicos"),
                None,
                "Blockers de readiness não podem ser duplicados.",
                Some("Mantenha uma ocorrência acionável por blocker."),
            );
        }
    }
    for nation in &world.nations {
        if nation
            .flag_asset_id
            .as_ref()
            .is_some_and(|id| !asset_ids.contains(id.as_str()))
        {
            broken_reference(
                package,
                report,
                &nation.id,
                "flagAssetId",
                nation.flag_asset_id.as_deref().unwrap_or_default(),
            );
        }
    }
    for profile in world.profiles.players.iter().chain(
        world
            .profiles
            .external_players
            .iter()
            .map(|value| &value.profile),
    ) {
        if !club_ids.contains(profile.identity.club_id.as_str()) {
            report.error(
                package,
                "world.broken_club_reference",
                Some(&profile.identity.entity_id),
                Some("identity.clubId"),
                Some(&profile.identity.club_id),
                None,
                "Todo perfil precisa referenciar um clube existente.",
                Some("Adicione o clube ou corrija identity.clubId."),
            );
        }
    }
    for region in &world.regions {
        if !nation_ids.contains(region.nation_id.as_str()) {
            broken_reference(package, report, &region.id, "nationId", &region.nation_id);
        }
    }
    for city in &world.cities {
        if !nation_ids.contains(city.nation_id.as_str()) {
            broken_reference(package, report, &city.id, "nationId", &city.nation_id);
        }
        if city
            .region_id
            .as_ref()
            .is_some_and(|id| !region_ids.contains(id.as_str()))
        {
            broken_reference(
                package,
                report,
                &city.id,
                "regionId",
                city.region_id.as_deref().unwrap_or_default(),
            );
        }
    }
    for stadium in &world.stadiums {
        if !city_ids.contains(stadium.city_id.as_str()) {
            broken_reference(package, report, &stadium.id, "cityId", &stadium.city_id);
        }
        if stadium
            .owner_club_id
            .as_ref()
            .is_some_and(|id| !club_ids.contains(id.as_str()))
        {
            broken_reference(
                package,
                report,
                &stadium.id,
                "ownerClubId",
                stadium.owner_club_id.as_deref().unwrap_or_default(),
            );
        }
        if stadium
            .asset_id
            .as_ref()
            .is_some_and(|id| !asset_ids.contains(id.as_str()))
        {
            broken_reference(
                package,
                report,
                &stadium.id,
                "assetId",
                stadium.asset_id.as_deref().unwrap_or_default(),
            );
        }
    }
    for role in &world.roles {
        let role_position = position_id(role.position_id);
        if !position_ids.contains(role_position) {
            broken_reference(package, report, &role.id, "positionId", role_position);
        }
    }
    for attribute in &world.attributes {
        if attribute.minimum > attribute.maximum {
            report.error(
                package,
                "world.invalid_attribute_range",
                Some(&attribute.id),
                Some("minimum"),
                Some("maximum"),
                Some(&format!("{} > {}", attribute.minimum, attribute.maximum)),
                "O mínimo de um atributo não pode exceder o máximo.",
                Some("Inverta ou corrija os limites declarados."),
            );
        }
    }
    let mut season_ids = HashSet::new();
    for competition in &world.competitions {
        if !nation_ids.contains(competition.nation_id.as_str()) {
            broken_reference(
                package,
                report,
                &competition.id,
                "nationId",
                &competition.nation_id,
            );
        }
        if competition
            .logo_asset_id
            .as_ref()
            .is_some_and(|id| !asset_ids.contains(id.as_str()))
        {
            broken_reference(
                package,
                report,
                &competition.id,
                "logoAssetId",
                competition.logo_asset_id.as_deref().unwrap_or_default(),
            );
        }
        for season in &competition.seasons {
            if !season_ids.insert(season.id.as_str()) {
                report.error(
                    package,
                    "world.duplicate_season_id",
                    Some(&season.id),
                    Some("season.id"),
                    Some(&competition.id),
                    Some(&season.id),
                    "IDs de temporadas precisam ser globais e únicos no pacote mundial.",
                    Some("Renomeie a temporada e atualize suas referências."),
                );
            }
            let unique_participants = season
                .participant_club_ids
                .iter()
                .collect::<HashSet<_>>()
                .len();
            if season.competition_id != competition.id {
                broken_reference(
                    package,
                    report,
                    &season.id,
                    "competitionId",
                    &season.competition_id,
                );
            }
            if !valid_stable_id(&season.id)
                || season.rules.participant_count < 2
                || season.rules.rounds == 0
                || !(1..=4).contains(&season.rules.legs)
                || season.start_date >= season.end_date
            {
                report.error(
                    package,
                    "world.invalid_competition_rules",
                    Some(&season.id),
                    Some("rules"),
                    Some(&competition.id),
                    None,
                    "Temporadas precisam de ID estável, datas ordenadas, ao menos dois participantes, rodadas positivas e 1–4 pernas.",
                    Some("Corrija a definição sem gerar calendário nesta fase."),
                );
            }
            if season.rules.participant_count as usize != season.participant_club_ids.len()
                || unique_participants != season.participant_club_ids.len()
                || season
                    .participant_club_ids
                    .iter()
                    .any(|id| !club_ids.contains(id.as_str()))
            {
                report.error(
                    package,
                    "world.invalid_competition_participants",
                    Some(&season.id),
                    Some("participantClubIds"),
                    Some(&competition.id),
                    None,
                    "Participantes precisam existir e corresponder ao participantCount.",
                    Some("Corrija a lista ou o participantCount sem gerar calendário nesta fase."),
                );
            }
            let mut registration_ids = HashSet::new();
            let mut registration_targets = HashSet::new();
            for registration in &season.player_registrations {
                let diagnostic_id = registration
                    .registration_id
                    .as_deref()
                    .unwrap_or(&registration.player_id);
                if world.schema_version >= 2
                    && registration.registration_id.as_ref().is_none_or(|id| {
                        !valid_stable_id(id) || !registration_ids.insert(id.as_str())
                    })
                {
                    report.error(
                        package,
                        "registration.invalid_or_duplicate_id",
                        Some(diagnostic_id),
                        Some("registrationId"),
                        Some(&season.id),
                        registration.registration_id.as_deref(),
                        "Inscrições v2 precisam de registrationId estável e único.",
                        Some("Preserve o registrationId da fonte em importações repetidas."),
                    );
                }
                if !registration_targets.insert(registration.player_id.as_str()) {
                    report.error(
                        package,
                        "registration.duplicate_target",
                        Some(diagnostic_id),
                        Some("playerId"),
                        Some(&season.id),
                        Some(&registration.player_id),
                        "Uma pessoa não pode ter duas inscrições na mesma temporada.",
                        Some("Atualize a inscrição existente em vez de criar outra."),
                    );
                }
                if !factual_player_ids.contains(registration.player_id.as_str())
                    && !runtime_player_ids.contains(registration.player_id.as_str())
                {
                    broken_reference(
                        package,
                        report,
                        diagnostic_id,
                        "playerId",
                        &registration.player_id,
                    );
                }
                if !club_ids.contains(registration.club_id.as_str())
                    || !season
                        .participant_club_ids
                        .iter()
                        .any(|id| id == &registration.club_id)
                {
                    broken_reference(
                        package,
                        report,
                        diagnostic_id,
                        "clubId",
                        &registration.club_id,
                    );
                }
                if registration.shirt_number.is_some_and(|number| number == 0) {
                    report.error(
                        package,
                        "registration.invalid_shirt_number",
                        Some(diagnostic_id),
                        Some("shirtNumber"),
                        Some("1..=255"),
                        registration
                            .shirt_number
                            .map(|number| number.to_string())
                            .as_deref(),
                        "Número ausente deve permanecer nulo; zero não representa um fato conhecido.",
                        Some("Use null ou um número entre 1 e 255."),
                    );
                }
            }
        }
    }
}

fn broken_reference(
    package: &ContentPackage,
    report: &mut PackageValidationReport,
    entity_id: &str,
    field: &str,
    reference: &str,
) {
    report.error(
        package,
        "world.broken_reference",
        Some(entity_id),
        Some(field),
        Some(reference),
        None,
        "A referência precisa apontar para uma entidade existente no mundo resolvido.",
        Some("Adicione a entidade referenciada ou corrija o ID."),
    );
}

pub fn resolve_world_packages(
    mut packages: Vec<ContentPackage>,
) -> Result<ResolvedWorldDatabase, PackageValidationReport> {
    packages.sort_by(|left, right| {
        left.manifest
            .load_order_hint
            .cmp(&right.manifest.load_order_hint)
            .then_with(|| left.manifest.package_id.cmp(&right.manifest.package_id))
    });
    let mut report = PackageValidationReport {
        valid: true,
        diagnostics: Vec::new(),
    };
    let package_ids: HashSet<_> = packages
        .iter()
        .map(|package| package.manifest.package_id.as_str())
        .collect();
    let base_count = packages
        .iter()
        .filter(|package| package.manifest.content_type == DataPackageType::Base)
        .count();
    for package in &packages {
        report.merge(validate_package(package));
        for dependency in &package.manifest.dependencies {
            if !dependency.optional && !package_ids.contains(dependency.package_id.as_str()) {
                report.error(
                    package,
                    "package.missing_dependency",
                    Some(&package.manifest.package_id),
                    Some("dependencies"),
                    Some(&dependency.package_id),
                    None,
                    "Toda dependência obrigatória precisa estar ativa.",
                    Some("Ative a dependência ou remova o mod do conjunto."),
                );
            } else if let Some(required) = packages
                .iter()
                .find(|candidate| candidate.manifest.package_id == dependency.package_id)
                && !version_satisfies(&dependency.version_requirement, &required.manifest.version)
            {
                report.error(
                    package,
                    "package.incompatible_dependency",
                    Some(&package.manifest.package_id),
                    Some("dependencies.versionRequirement"),
                    Some(&dependency.package_id),
                    Some(&required.manifest.version),
                    "A versão ativa da dependência não satisfaz o intervalo declarado.",
                    Some("Ative uma versão compatível ou atualize o mod."),
                );
            }
        }
        for conflict in &package.manifest.conflicts {
            if package_ids.contains(conflict.package_id.as_str()) {
                report.error(
                    package,
                    "package.conflict",
                    Some(&package.manifest.package_id),
                    Some("conflicts"),
                    Some(&conflict.package_id),
                    None,
                    &conflict.reason,
                    Some("Desative um dos pacotes conflitantes."),
                );
            }
        }
    }
    let mut resolved_dependencies = HashSet::new();
    loop {
        let previous = resolved_dependencies.len();
        for package in &packages {
            if package.manifest.dependencies.iter().all(|dependency| {
                dependency.optional
                    || resolved_dependencies.contains(dependency.package_id.as_str())
                    || !package_ids.contains(dependency.package_id.as_str())
            }) {
                resolved_dependencies.insert(package.manifest.package_id.as_str());
            }
        }
        if resolved_dependencies.len() == previous {
            break;
        }
    }
    if resolved_dependencies.len() != packages.len() {
        let package = packages
            .iter()
            .find(|package| !resolved_dependencies.contains(package.manifest.package_id.as_str()))
            .cloned()
            .unwrap_or_else(empty_package);
        report.error(
            &package,
            "package.dependency_cycle",
            Some(&package.manifest.package_id),
            Some("dependencies"),
            None,
            None,
            "Dependências de pacotes precisam formar um grafo acíclico.",
            Some("Remova ao menos uma dependência do ciclo."),
        );
    }
    if base_count != 1 {
        let package = packages.first().cloned().unwrap_or_else(empty_package);
        report.error(
            &package,
            "package.invalid_base_count",
            None,
            Some("contentType"),
            None,
            Some(&base_count.to_string()),
            "Exatamente um pacote base deve estar ativo.",
            Some("Selecione uma base e mantenha os demais pacotes como mods."),
        );
    }
    if !report.valid {
        return Err(report);
    }
    let base_index = packages
        .iter()
        .position(|package| package.manifest.content_type == DataPackageType::Base)
        .expect("validated single base");
    let mut world = packages[base_index]
        .world
        .clone()
        .expect("validated base world");
    migrate_world_to_current(&mut world);
    for package in &packages {
        if package.manifest.content_type == DataPackageType::Mod {
            for patch in &package.patches {
                apply_patch(&mut world, patch, package, &mut report);
            }
        }
    }
    let resolved_candidate = ContentPackage {
        manifest: packages[base_index].manifest.clone(),
        world: Some(world.clone()),
        patches: Vec::new(),
        source_file: "<resolved-world>".to_owned(),
    };
    report.merge(validate_package(&resolved_candidate));
    if !report.valid {
        return Err(report);
    }
    let order: Vec<_> = packages
        .iter()
        .map(|package| package.manifest.package_id.clone())
        .collect();
    let fingerprint_source = packages
        .iter()
        .map(|package| {
            format!(
                "{}:{}:{}",
                package.manifest.package_id, package.manifest.version, package.manifest.checksum
            )
        })
        .collect::<Vec<_>>()
        .join("|");
    let fingerprint = WorldDatabaseFingerprint {
        algorithm: "fnv1a64".to_owned(),
        value: format!("{:016x}", fnv1a64(fingerprint_source.as_bytes())),
        schema_version: WORLD_DATABASE_SCHEMA_VERSION,
        package_order: order,
    };
    let coverage = PackageCoverageReport {
        clubs: world.clubs.len(),
        people: world.people.len(),
        players: world.profiles.players.len() + world.profiles.external_players.len(),
        coaches: world.profiles.coaches.len(),
        nations: world.nations.len(),
        cities: world.cities.len(),
        stadiums: world.stadiums.len(),
        competitions: world.competitions.len(),
        positions: world.positions.len(),
        roles: world.roles.len(),
        attributes: world.attributes.len(),
        assets: world.assets.len(),
    };
    Ok(ResolvedWorldDatabase {
        schema_version: WORLD_DATABASE_SCHEMA_VERSION,
        world,
        packages: packages
            .into_iter()
            .map(|package| package.manifest)
            .collect(),
        fingerprint,
        coverage,
        validation: report,
    })
}

fn migrate_world_to_current(world: &mut WorldPackageData) {
    if world.schema_version >= WORLD_DATABASE_SCHEMA_VERSION {
        return;
    }
    for competition in &mut world.competitions {
        for season in &mut competition.seasons {
            for registration in &mut season.player_registrations {
                if registration.registration_id.is_none() {
                    let source = format!(
                        "{}|{}|{}|{}",
                        competition.id, season.id, registration.player_id, registration.club_id
                    );
                    registration.registration_id = Some(format!(
                        "migration.registration.{:016x}",
                        fnv1a64(source.as_bytes())
                    ));
                }
            }
        }
    }
    world.schema_version = WORLD_DATABASE_SCHEMA_VERSION;
}

fn apply_patch(
    world: &mut WorldPackageData,
    patch: &PackagePatch,
    package: &ContentPackage,
    report: &mut PackageValidationReport,
) {
    let found = contains_entity(world, patch.entity_kind, &patch.target_id);
    match patch.operation {
        PackagePatchOperation::Add if found => patch_conflict(package, report, patch, "já existe"),
        PackagePatchOperation::Replace | PackagePatchOperation::Remove if !found => {
            patch_conflict(package, report, patch, "não existe")
        }
        PackagePatchOperation::Remove => remove_entity(world, patch.entity_kind, &patch.target_id),
        PackagePatchOperation::Add | PackagePatchOperation::Replace => {
            if patch.operation == PackagePatchOperation::Replace {
                remove_entity(world, patch.entity_kind, &patch.target_id);
            }
            if let Some(entity) = &patch.entity {
                insert_entity(world, entity.clone());
            }
        }
    }
}

fn patch_conflict(
    package: &ContentPackage,
    report: &mut PackageValidationReport,
    patch: &PackagePatch,
    state: &str,
) {
    report.error(
        package,
        "package.patch_conflict",
        Some(&patch.target_id),
        Some("patch.operation"),
        Some(&format!("{:?}", patch.entity_kind)),
        Some(&format!("{:?}", patch.operation)),
        &format!("O alvo {state} para a operação solicitada."),
        Some("Use add para entidade nova, replace/remove para entidade existente."),
    );
}

fn contains_entity(world: &WorldPackageData, kind: WorldEntityKind, id: &str) -> bool {
    world_entities(world)
        .iter()
        .any(|entity| entity.kind() == kind && entity.id() == id)
}

fn remove_entity(world: &mut WorldPackageData, kind: WorldEntityKind, id: &str) {
    match kind {
        WorldEntityKind::Club => world.clubs.retain(|value| value.id != id),
        WorldEntityKind::Person => world.people.retain(|value| value.person_id != id),
        WorldEntityKind::MatchdayPlayer => world.matchday.players.retain(|value| value.id != id),
        WorldEntityKind::PlayerProfile => world
            .profiles
            .players
            .retain(|value| value.identity.entity_id != id),
        WorldEntityKind::ExternalPlayer => world
            .profiles
            .external_players
            .retain(|value| value.profile.identity.entity_id != id),
        WorldEntityKind::Coach => world
            .profiles
            .coaches
            .retain(|value| value.identity.entity_id != id),
        WorldEntityKind::Nation => world.nations.retain(|value| value.id != id),
        WorldEntityKind::Region => world.regions.retain(|value| value.id != id),
        WorldEntityKind::City => world.cities.retain(|value| value.id != id),
        WorldEntityKind::Stadium => world.stadiums.retain(|value| value.id != id),
        WorldEntityKind::Competition => world.competitions.retain(|value| value.id != id),
        WorldEntityKind::Position => world.positions.retain(|value| position_id(value.id) != id),
        WorldEntityKind::Role => world.roles.retain(|value| value.id != id),
        WorldEntityKind::Attribute => world.attributes.retain(|value| value.id != id),
        WorldEntityKind::Trait => world.traits.retain(|value| value.id != id),
        WorldEntityKind::Asset => world.assets.retain(|value| value.id != id),
    }
}

fn insert_entity(world: &mut WorldPackageData, entity: WorldEntity) {
    match entity {
        WorldEntity::Club(value) => {
            if world.matchday.club.id == value.id {
                world.matchday.club = value.clone();
            }
            if world.matchday.opponent.id == value.id {
                world.matchday.opponent = value.clone();
            }
            world.clubs.push(value);
        }
        WorldEntity::Person(value) => world.people.push(value),
        WorldEntity::MatchdayPlayer(value) => world.matchday.players.push(value),
        WorldEntity::PlayerProfile(value) => world.profiles.players.push(value),
        WorldEntity::ExternalPlayer(value) => world.profiles.external_players.push(value),
        WorldEntity::Coach(value) => world.profiles.coaches.push(*value),
        WorldEntity::Nation(value) => world.nations.push(value),
        WorldEntity::Region(value) => world.regions.push(value),
        WorldEntity::City(value) => world.cities.push(value),
        WorldEntity::Stadium(value) => world.stadiums.push(value),
        WorldEntity::Competition(value) => world.competitions.push(value),
        WorldEntity::Position(value) => world.positions.push(value),
        WorldEntity::Role(value) => world.roles.push(value),
        WorldEntity::Attribute(value) => world.attributes.push(value),
        WorldEntity::Trait(value) => world.traits.push(value),
        WorldEntity::Asset(value) => world.assets.push(value),
    }
}

fn fnv1a64(bytes: &[u8]) -> u64 {
    bytes.iter().fold(0xcbf29ce484222325, |hash, byte| {
        (hash ^ u64::from(*byte)).wrapping_mul(0x100000001b3)
    })
}

fn empty_package() -> ContentPackage {
    ContentPackage {
        manifest: PackageManifest {
            package_id: "invalid.empty".to_owned(),
            name: "Invalid empty package set".to_owned(),
            version: "0.0.0".to_owned(),
            schema_version: WORLD_DATABASE_SCHEMA_VERSION,
            game_version_compatibility: ">=0.1.0".to_owned(),
            author: "Rivallo".to_owned(),
            description: String::new(),
            content_type: DataPackageType::Mod,
            dependencies: Vec::new(),
            conflicts: Vec::new(),
            load_order_hint: 0,
            entrypoints: PackageEntrypoints {
                world: "data/world.json".to_owned(),
                patches: None,
                assets: None,
            },
            assets: Vec::new(),
            provenance: PackageProvenance {
                source: "internal validation".to_owned(),
                rights: "not applicable".to_owned(),
                created_at: "1970-01-01".to_owned(),
                notes: None,
            },
            visibility: PackageVisibility::Public,
            checksum: "invalid".to_owned(),
        },
        world: None,
        patches: Vec::new(),
        source_file: "<package-set>".to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn partial_person() -> Person {
        Person {
            person_id: "synthetic.person.alpha".to_owned(),
            external_ids: vec![ExternalIdentifier {
                source: "synthetic-source".to_owned(),
                external_id: "record-alpha".to_owned(),
            }],
            full_name: "Pessoa Sintética Alpha".to_owned(),
            known_name: None,
            birth_date: None,
            height_cm: None,
            weight_kg: None,
            preferred_foot: None,
            nationality_id: None,
            second_nationality_id: None,
            detailed_position: None,
            shirt_number: None,
            contract: None,
            roles: vec![
                PersonRoleAssignment {
                    role_id: "synthetic.player.alpha".to_owned(),
                    kind: PersonRoleKind::Player,
                    club_id: Some("aurora-fc".to_owned()),
                    title: None,
                },
                PersonRoleAssignment {
                    role_id: "synthetic.coach.alpha".to_owned(),
                    kind: PersonRoleKind::Coach,
                    club_id: Some("aurora-fc".to_owned()),
                    title: Some("Função sintética".to_owned()),
                },
                PersonRoleAssignment {
                    role_id: "synthetic.staff.alpha".to_owned(),
                    kind: PersonRoleKind::StaffMember,
                    club_id: Some("aurora-fc".to_owned()),
                    title: Some("Comissão sintética".to_owned()),
                },
            ],
            provenance: vec![FactualProvenance {
                source: "synthetic-source".to_owned(),
                source_record_id: Some("record-alpha".to_owned()),
                observed_at: None,
                verification_status: ProvenanceVerificationStatus::Pending,
                fields: vec!["fullName".to_owned()],
            }],
            readiness: PersonReadiness {
                identity: FactualIdentityStatus::PartialFactualIdentity,
                structural: StructuralValidity::StructurallyValid,
                runtime_profile: RuntimeProfileAvailability::RuntimeProfileBlocked,
                evaluation: SportingEvaluationStatus::AwaitingEvaluation,
                gameplay: GameplayReadiness::GameplayBlocked,
                blockers: vec![
                    "person.partial_identity".to_owned(),
                    "person.runtime_profile_blocked".to_owned(),
                    "person.gameplay_blocked".to_owned(),
                ],
            },
        }
    }

    fn official_package() -> ContentPackage {
        ContentPackage {
            manifest: serde_json::from_str(include_str!(
                "../../../data/packages/official.rivallo.foundation/manifest.json"
            ))
            .expect("official manifest"),
            world: Some(bundled_official_world()),
            patches: Vec::new(),
            source_file: "official.rivallo.foundation/manifest.json".to_owned(),
        }
    }

    #[test]
    fn official_package_is_valid_and_resolves_deterministically() {
        let package = official_package();
        let validation = validate_package(&package);
        assert!(validation.valid, "{:#?}", validation.diagnostics);

        let first = resolve_world_packages(vec![package.clone()]).expect("resolve official world");
        let second = resolve_world_packages(vec![package]).expect("resolve same official world");

        assert_eq!(first.fingerprint, second.fingerprint);
        assert_eq!(first.world.matchday.club.id, "aurora-fc");
        assert_eq!(first.world.profiles.players.len(), 18);
        assert_eq!(first.world.nations.len(), 4);
        assert_eq!(first.world.competitions.len(), 1);
    }

    #[test]
    fn partial_person_preserves_unknowns_provenance_and_multiple_roles_without_profiles() {
        let mut package = official_package();
        package.manifest.schema_version = WORLD_DATABASE_SCHEMA_VERSION;
        {
            let world = package.world.as_mut().expect("world");
            world.schema_version = WORLD_DATABASE_SCHEMA_VERSION;
            world.people.push(partial_person());
        }

        let validation = validate_package(&package);
        assert!(validation.valid, "{:#?}", validation.diagnostics);
        let encoded = serde_json::to_string(package.world.as_ref().expect("world"))
            .expect("serialize partial world");
        let decoded: WorldPackageData = serde_json::from_str(&encoded).expect("read partial world");
        let person = decoded.people.first().expect("partial person");

        assert_eq!(person.roles.len(), 3);
        assert!(person.birth_date.is_none());
        assert!(person.height_cm.is_none());
        assert!(person.preferred_foot.is_none());
        assert_eq!(
            person.provenance[0].source_record_id.as_deref(),
            Some("record-alpha")
        );
        assert!(
            decoded
                .profiles
                .players
                .iter()
                .all(|profile| { profile.identity.entity_id != "synthetic.player.alpha" })
        );
        assert!(
            decoded
                .profiles
                .coaches
                .iter()
                .all(|profile| { profile.identity.entity_id != "synthetic.coach.alpha" })
        );
    }

    #[test]
    fn omitted_optional_facts_decode_as_unknown_without_defaults() {
        let person: Person = serde_json::from_value(serde_json::json!({
            "personId": "synthetic.person.minimal",
            "fullName": "Pessoa Sintética Mínima",
            "roles": [{ "roleId": "synthetic.player.minimal", "kind": "player" }],
            "provenance": [{
                "source": "synthetic",
                "verificationStatus": "pending"
            }],
            "readiness": {
                "identity": "partialFactualIdentity",
                "structural": "structurallyValid",
                "runtimeProfile": "runtimeProfileBlocked",
                "evaluation": "awaitingEvaluation",
                "gameplay": "gameplayBlocked"
            }
        }))
        .expect("minimal factual person");

        assert!(person.external_ids.is_empty());
        assert!(person.birth_date.is_none());
        assert!(person.height_cm.is_none());
        assert!(person.weight_kg.is_none());
        assert!(person.preferred_foot.is_none());
        assert!(person.contract.is_none());
        assert!(person.readiness.blockers.is_empty());
    }

    #[test]
    fn partial_registration_is_structurally_valid_but_runtime_and_gameplay_blocked() {
        let mut world = bundled_official_world();
        world.schema_version = WORLD_DATABASE_SCHEMA_VERSION;
        world.people.push(partial_person());
        let season_id = {
            let season = &mut world.competitions[0].seasons[0];
            season.player_registrations.push(SeasonPlayerRegistration {
                registration_id: Some("synthetic.registration.alpha".to_owned()),
                player_id: "synthetic.player.alpha".to_owned(),
                club_id: "aurora-fc".to_owned(),
                shirt_number: None,
                contract_reference: None,
                eligible: false,
            });
            season.id.clone()
        };

        let projection = project_registration_readiness(&world, &season_id)
            .into_iter()
            .find(|registration| registration.registration_id == "synthetic.registration.alpha")
            .expect("registration projection");

        assert_eq!(
            projection.structural,
            RegistrationValidity::StructurallyValid
        );
        assert_eq!(
            projection.person_runtime,
            RuntimeProfileAvailability::RuntimeProfileBlocked
        );
        assert_eq!(
            projection.squad_gameplay,
            GameplayReadiness::GameplayBlocked
        );
        assert_eq!(
            projection.blockers,
            vec!["registration.person_runtime_blocked"]
        );
    }

    #[test]
    fn registration_validation_rejects_duplicate_targets_and_broken_references() {
        let mut package = official_package();
        package.manifest.schema_version = WORLD_DATABASE_SCHEMA_VERSION;
        let world = package.world.as_mut().expect("world");
        world.schema_version = WORLD_DATABASE_SCHEMA_VERSION;
        world.people.push(partial_person());
        let season = &mut world.competitions[0].seasons[0];
        season.player_registrations.extend([
            SeasonPlayerRegistration {
                registration_id: Some("synthetic.registration.alpha".to_owned()),
                player_id: "synthetic.player.alpha".to_owned(),
                club_id: "aurora-fc".to_owned(),
                shirt_number: None,
                contract_reference: None,
                eligible: false,
            },
            SeasonPlayerRegistration {
                registration_id: Some("synthetic.registration.beta".to_owned()),
                player_id: "synthetic.player.alpha".to_owned(),
                club_id: "missing.club".to_owned(),
                shirt_number: None,
                contract_reference: None,
                eligible: false,
            },
        ]);

        let report = validate_package(&package);
        assert!(!report.valid);
        assert!(report.diagnostics.iter().any(|diagnostic| {
            diagnostic.code == "registration.duplicate_target"
                && diagnostic.field.as_deref() == Some("playerId")
        }));
        assert!(report.diagnostics.iter().any(|diagnostic| {
            diagnostic.code == "world.broken_reference"
                && diagnostic.field.as_deref() == Some("clubId")
                && diagnostic.reference.as_deref() == Some("missing.club")
        }));
    }

    #[test]
    fn v1_registration_migrates_in_memory_with_a_stable_id() {
        let mut first_package = official_package();
        let first_world = first_package.world.as_mut().expect("world");
        first_world.schema_version = 1;
        let season = &mut first_world.competitions[0].seasons[0];
        let player_id = first_world.profiles.players[0].identity.entity_id.clone();
        season.player_registrations.push(SeasonPlayerRegistration {
            registration_id: None,
            player_id,
            club_id: "aurora-fc".to_owned(),
            shirt_number: Some(1),
            contract_reference: None,
            eligible: true,
        });
        let second_package = first_package.clone();

        let first = resolve_world_packages(vec![first_package]).expect("migrate v1 world");
        let second = resolve_world_packages(vec![second_package]).expect("repeat v1 migration");
        let first_id = first.world.competitions[0].seasons[0].player_registrations[0]
            .registration_id
            .clone();
        let second_id = second.world.competitions[0].seasons[0].player_registrations[0]
            .registration_id
            .clone();

        assert_eq!(first.schema_version, WORLD_DATABASE_SCHEMA_VERSION);
        assert_eq!(first.world.schema_version, WORLD_DATABASE_SCHEMA_VERSION);
        assert_eq!(first_id, second_id);
        assert!(first_id.is_some_and(|id| id.starts_with("migration.registration.")));
    }

    #[test]
    fn club_readiness_uses_season_rules_and_returns_actionable_blockers() {
        let mut world = bundled_official_world();
        let season_id = "official.rivallo.competition.liga-horizonte.season.demo";
        let ready = project_club_readiness(&world, season_id);
        let active = ready
            .iter()
            .find(|entry| entry.club_id == "aurora-fc")
            .expect("active club readiness");
        assert_ne!(active.status, ClubReadinessStatus::Blocked);
        assert!(active.requirements.iter().all(|requirement| {
            !requirement.editor_module.is_empty() && !requirement.suggestion.is_empty()
        }));

        world
            .profiles
            .coaches
            .retain(|coach| coach.identity.club_id != "aurora-fc");
        let blocked = project_club_readiness(&world, season_id);
        let active = blocked
            .iter()
            .find(|entry| entry.club_id == "aurora-fc")
            .expect("blocked club readiness");
        assert_eq!(active.status, ClubReadinessStatus::Blocked);
        assert!(
            active.requirements.iter().any(|requirement| {
                requirement.code == "club.head_coach" && requirement.blocking
            })
        );
    }

    #[test]
    fn typed_mod_patch_replaces_existing_club_without_index_identity() {
        let base = official_package();
        let mut changed = base.world.as_ref().expect("world").clubs[0].clone();
        changed.primary_color = "#123456".to_owned();
        let mod_package = ContentPackage {
            manifest: PackageManifest {
                package_id: "community.example.club-colour".to_owned(),
                name: "Club colour example".to_owned(),
                version: "1.0.0".to_owned(),
                schema_version: WORLD_DATABASE_SCHEMA_VERSION,
                game_version_compatibility: ">=0.1.0 <0.2.0".to_owned(),
                author: "Example".to_owned(),
                description: "Typed data-only patch".to_owned(),
                content_type: DataPackageType::Mod,
                dependencies: vec![PackageDependency {
                    package_id: "official.rivallo.foundation".to_owned(),
                    version_requirement: ">=1.0.0".to_owned(),
                    optional: false,
                }],
                conflicts: Vec::new(),
                load_order_hint: 100,
                entrypoints: PackageEntrypoints {
                    world: "data/world.json".to_owned(),
                    patches: Some("data/patches.json".to_owned()),
                    assets: None,
                },
                assets: Vec::new(),
                provenance: PackageProvenance {
                    source: "test".to_owned(),
                    rights: "test".to_owned(),
                    created_at: "2026-07-17".to_owned(),
                    notes: None,
                },
                visibility: PackageVisibility::Public,
                checksum: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
                    .to_owned(),
            },
            world: None,
            patches: vec![PackagePatch {
                operation: PackagePatchOperation::Replace,
                entity_kind: WorldEntityKind::Club,
                target_id: "aurora-fc".to_owned(),
                entity: Some(WorldEntity::Club(changed)),
                reason: "Example replacement".to_owned(),
            }],
            source_file: "community.example.club-colour/manifest.json".to_owned(),
        };

        let resolved = resolve_world_packages(vec![mod_package, base]).expect("valid mod graph");
        assert_eq!(resolved.world.matchday.club.primary_color, "#123456");
        assert_eq!(
            resolved.fingerprint.package_order[0],
            "official.rivallo.foundation"
        );
    }

    #[test]
    fn invalid_packages_explain_unsafe_assets_and_broken_references() {
        let mut package = official_package();
        let world = package.world.as_mut().expect("world");
        world.stadiums[0].city_id = "missing.city".to_owned();
        world.assets[0].path = "../escape.js".to_owned();
        world.assets[0].media_type = "application/javascript".to_owned();

        let report = validate_package(&package);
        assert!(!report.valid);
        assert!(report.diagnostics.iter().any(|item| {
            item.code == "package.unsafe_asset"
                && item.file == "official.rivallo.foundation/manifest.json"
                && item.blocking
                && item.suggestion.is_some()
        }));
        assert!(
            report
                .diagnostics
                .iter()
                .any(|item| item.code == "world.broken_reference"
                    && item.field.as_deref() == Some("cityId"))
        );
    }

    #[test]
    fn resolver_rejects_dependency_cycles_with_a_blocking_diagnostic() {
        let base = official_package();
        let mut first = base.clone();
        first.manifest.package_id = "community.cycle.first".to_owned();
        first.manifest.content_type = DataPackageType::Mod;
        first.manifest.load_order_hint = 100;
        first.manifest.dependencies = vec![PackageDependency {
            package_id: "community.cycle.second".to_owned(),
            version_requirement: ">=1.0.0".to_owned(),
            optional: false,
        }];
        first.world = None;

        let mut second = first.clone();
        second.manifest.package_id = "community.cycle.second".to_owned();
        second.manifest.dependencies[0].package_id = "community.cycle.first".to_owned();

        let report = resolve_world_packages(vec![base, first, second])
            .expect_err("dependency cycle must block resolution");
        assert!(
            report
                .diagnostics
                .iter()
                .any(|diagnostic| diagnostic.code == "package.dependency_cycle"
                    && diagnostic.blocking)
        );
    }

    #[test]
    fn validator_rejects_packages_incompatible_with_the_current_game_version() {
        let mut package = official_package();
        package.manifest.game_version_compatibility = ">=9.0.0 <10.0.0".to_owned();

        let report = validate_package(&package);
        assert!(!report.valid);
        assert!(report.diagnostics.iter().any(|diagnostic| {
            diagnostic.code == "package.incompatible_game_version"
                && diagnostic.field.as_deref() == Some("gameVersionCompatibility")
                && diagnostic.blocking
        }));
    }

    #[test]
    fn validator_rejects_cross_reference_and_range_gaps() {
        let mut package = official_package();
        let world = package.world.as_mut().expect("world");
        world.nations[0].flag_asset_id = Some("asset.missing.flag".to_owned());
        world.stadiums[0].asset_id = Some("asset.missing.stadium".to_owned());
        let removed_position = world.roles[0].position_id;
        world
            .positions
            .retain(|position| position.id != removed_position);
        world.attributes[0].minimum = 20;
        world.attributes[0].maximum = 1;
        let season = &mut world.competitions[0].seasons[0];
        season.competition_id = "competition.missing".to_owned();
        season.rules.rounds = 0;

        let report = validate_package(&package);

        assert!(!report.valid);
        for (code, field) in [
            ("world.broken_reference", "flagAssetId"),
            ("world.broken_reference", "assetId"),
            ("world.broken_reference", "positionId"),
            ("world.broken_reference", "competitionId"),
            ("world.invalid_attribute_range", "minimum"),
            ("world.invalid_competition_rules", "rules"),
        ] {
            assert!(
                report.diagnostics.iter().any(|diagnostic| {
                    diagnostic.code == code && diagnostic.field.as_deref() == Some(field)
                }),
                "missing diagnostic {code}/{field}: {:#?}",
                report.diagnostics
            );
        }
    }

    #[test]
    fn new_package_contracts_reject_unknown_fields_during_json_parsing() {
        let mut manifest =
            serde_json::to_value(official_package().manifest).expect("manifest json");
        manifest.as_object_mut().expect("manifest object").insert(
            "unexpectedExecutableHook".to_owned(),
            serde_json::json!("script.js"),
        );

        let error = serde_json::from_value::<PackageManifest>(manifest)
            .expect_err("unknown manifest field must be rejected");

        assert!(error.to_string().contains("unknown field"));
    }
}
