use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

use rivallo_application::{
    AssetReference, ContentPackage, DataPackageCatalogEntry, PackageCatalogScope, PackageManifest,
    PackagePatch, PackageValidationReport, PackageVisibility, ResolvedWorldDatabase,
    WorldDatabaseService, WorldEntityKind, WorldPackageData, WorldPackageRepository,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};

const MAX_MANIFEST_BYTES: u64 = 256 * 1024;
const MAX_WORLD_BYTES: u64 = 16 * 1024 * 1024;
const MAX_PATCH_BYTES: u64 = 4 * 1024 * 1024;
const MAX_ASSET_BYTES: u64 = 16 * 1024 * 1024;
const MAX_AUTHORING_ASSETS: usize = 128;
const MAX_AUTHORING_ASSET_TOTAL_BYTES: usize = 64 * 1024 * 1024;
const MAX_RIVMOD_BYTES: u64 = 128 * 1024 * 1024;
const CREATOR_PROJECT_SCHEMA_VERSION: u16 = 1;
const RIVMOD_FORMAT_VERSION: u16 = 1;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PrivateCatalogCapability {
    Development,
    Uat,
}

#[derive(Clone, Debug)]
pub struct PrivateCatalogConfig {
    pub root: PathBuf,
    pub capability: PrivateCatalogCapability,
    pub private_guard_passed: bool,
    pub public_build: bool,
}

impl PrivateCatalogConfig {
    pub fn from_environment() -> Option<Self> {
        let root = std::env::var_os("RIVALLO_PRIVATE_CATALOG_ROOT").map(PathBuf::from)?;
        let capability = match std::env::var("RIVALLO_PRIVATE_CATALOG_CAPABILITY")
            .ok()?
            .as_str()
        {
            "development" => PrivateCatalogCapability::Development,
            "uat" => PrivateCatalogCapability::Uat,
            _ => return None,
        };
        Some(Self {
            root,
            capability,
            private_guard_passed: std::env::var("RIVALLO_PRIVATE_CATALOG_GUARD")
                .is_ok_and(|value| value == "passed"),
            public_build: !cfg!(debug_assertions),
        })
    }
}

fn private_catalog_unavailable() -> PackageValidationReport {
    PackageValidationReport::blocking(
        "<private-catalog>".to_owned(),
        "package.private_catalog_unauthorized",
        None,
        Some("privateCatalog".to_owned()),
        None,
        None,
        "O catálogo privado não está autorizado neste ambiente.",
        Some("Habilite explicitamente uma capability development/UAT com raiz isolada.".to_owned()),
    )
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AuthoringAssetUpload {
    pub id: String,
    pub entity_id: String,
    pub kind: String,
    pub path: String,
    pub media_type: String,
    pub bytes: Vec<u8>,
    pub provenance: String,
    pub rights: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CreatorProjectMode {
    QuickMod,
    DataStudio,
}

#[derive(Clone, Copy, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CreatorProjectStatus {
    Draft,
    Modified,
    Valid,
    ValidWithWarnings,
    Blocked,
    Exported,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DataPackageAuthoringSource {
    pub manifest_json: String,
    pub world_json: Option<String>,
    pub patches_json: Option<String>,
    #[serde(default)]
    pub assets: Vec<AuthoringAssetUpload>,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CreatorProjectDraft {
    pub project_id: String,
    pub name: String,
    pub mode: CreatorProjectMode,
    pub base_package_id: String,
    pub source: DataPackageAuthoringSource,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CreatorProjectRecord {
    pub schema_version: u16,
    pub project_id: String,
    pub name: String,
    pub mode: CreatorProjectMode,
    pub status: CreatorProjectStatus,
    pub base_package_id: String,
    pub package_id: String,
    pub version: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub last_exported_at: Option<u64>,
    pub revision: u64,
    pub source: DataPackageAuthoringSource,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatorProjectSummary {
    pub project_id: String,
    pub name: String,
    pub mode: CreatorProjectMode,
    pub status: CreatorProjectStatus,
    pub base_package_id: String,
    pub package_id: String,
    pub version: String,
    pub updated_at: u64,
    pub last_exported_at: Option<u64>,
    pub entity_count: usize,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RivmodBundle {
    format_version: u16,
    exported_at: u64,
    manifest_json: String,
    world_json: Option<String>,
    patches_json: Option<String>,
    assets: Vec<AuthoringAssetUpload>,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageDistributionReceipt {
    pub package_id: String,
    pub name: String,
    pub version: String,
    pub path: String,
    pub size: u64,
    pub sha256: String,
    pub status: String,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RivmodInspection {
    pub receipt: PackageDistributionReceipt,
    pub validation: PackageValidationReport,
    pub dependencies: Vec<String>,
    pub conflicts: Vec<String>,
    pub update_from_version: Option<String>,
    pub downgrade: bool,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageHistoryEntry {
    pub package_id: String,
    pub version: String,
    pub name: String,
    pub archived_at: u64,
}

const OFFICIAL_MANIFEST: &str =
    include_str!("../../../data/packages/official.rivallo.foundation/manifest.json");
const OFFICIAL_WORLD: &str =
    include_str!("../../../data/packages/official.rivallo.foundation/data/world.json");

pub struct FileWorldPackageRepository {
    user_packages_root: PathBuf,
    catalog_scope: PackageCatalogScope,
}

impl FileWorldPackageRepository {
    pub fn new(user_packages_root: impl Into<PathBuf>) -> Self {
        Self {
            user_packages_root: user_packages_root.into(),
            catalog_scope: PackageCatalogScope::Public,
        }
    }

    pub fn new_authorized(
        user_packages_root: impl Into<PathBuf>,
        catalog_scope: PackageCatalogScope,
    ) -> Self {
        Self {
            user_packages_root: user_packages_root.into(),
            catalog_scope,
        }
    }

    pub fn user_packages_root(&self) -> &Path {
        &self.user_packages_root
    }

    fn bundled_official(&self) -> Result<ContentPackage, PackageValidationReport> {
        let manifest: PackageManifest = parse_json(
            OFFICIAL_MANIFEST.as_bytes(),
            "official.rivallo.foundation/manifest.json",
            "package.invalid_manifest_json",
        )?;
        let world: WorldPackageData = parse_json(
            OFFICIAL_WORLD.as_bytes(),
            "official.rivallo.foundation/data/world.json",
            "package.invalid_world_json",
        )?;
        verify_checksum(
            &manifest,
            OFFICIAL_WORLD.as_bytes(),
            &[],
            "official.rivallo.foundation/manifest.json",
        )?;
        Ok(ContentPackage {
            manifest,
            world: Some(world),
            patches: Vec::new(),
            source_file: "official.rivallo.foundation/manifest.json".to_owned(),
        })
    }

    fn available_user_packages(&self) -> Result<Vec<ContentPackage>, PackageValidationReport> {
        if !self.user_packages_root.exists() {
            return Ok(Vec::new());
        }
        let mut entries = fs::read_dir(&self.user_packages_root)
            .map_err(|error| {
                io_report(
                    &self.user_packages_root,
                    "package.catalog_read_failed",
                    error,
                )
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| {
                io_report(
                    &self.user_packages_root,
                    "package.catalog_read_failed",
                    error,
                )
            })?;
        entries.sort_by_key(fs::DirEntry::path);
        let mut packages = Vec::with_capacity(entries.len());
        for entry in entries {
            let directory = entry.path();
            let metadata = fs::symlink_metadata(&directory)
                .map_err(|error| io_report(&directory, "package.catalog_read_failed", error))?;
            if is_link_or_reparse(&metadata) {
                return Err(PackageValidationReport::blocking(
                    display_path(&directory),
                    "package.symlink_or_junction_rejected",
                    None,
                    Some("packageRoot".to_owned()),
                    None,
                    None,
                    "Entradas do catálogo público não podem ser symlinks, junctions ou reparse points.",
                    Some(
                        "Copie o pacote para um diretório real sob a raiz do catálogo.".to_owned(),
                    ),
                ));
            }
            if !metadata.is_dir() {
                continue;
            }
            ensure_real_descendant(&self.user_packages_root, &directory, "packageRoot")?;
            packages.push(self.read_package(&directory)?);
        }
        Ok(packages)
    }

    fn read_package(&self, package_root: &Path) -> Result<ContentPackage, PackageValidationReport> {
        let manifest_path = package_root.join("manifest.json");
        let manifest_bytes = read_bounded(package_root, &manifest_path, MAX_MANIFEST_BYTES)?;
        let manifest: PackageManifest = parse_json(
            &manifest_bytes,
            &display_path(&manifest_path),
            "package.invalid_manifest_json",
        )?;
        if self.catalog_scope == PackageCatalogScope::Public
            && manifest.visibility == PackageVisibility::PrivateDevelopment
        {
            return Err(PackageValidationReport::blocking(
                display_path(&manifest_path),
                "package.private_development_isolated",
                Some(manifest.package_id),
                Some("packageId".to_owned()),
                None,
                None,
                "O pacote privado de desenvolvimento não pode entrar no catálogo público/local padrão.",
                Some(
                    "Mantenha-o fora do build e use um ambiente privado explicitamente isolado."
                        .to_owned(),
                ),
            ));
        }
        if self.catalog_scope != PackageCatalogScope::Public
            && manifest.visibility != PackageVisibility::PrivateDevelopment
        {
            return Err(PackageValidationReport::blocking(
                "<private-catalog>".to_owned(),
                "package.private_catalog_visibility_mismatch",
                Some(manifest.package_id),
                Some("visibility".to_owned()),
                None,
                None,
                "O catálogo privado aceita somente pacotes privateDevelopment.",
                Some("Mova pacotes públicos para o catálogo público normal.".to_owned()),
            ));
        }
        let world_path = resolve_entrypoint(package_root, &manifest.entrypoints.world)?;
        let world_bytes = if world_path.exists() {
            Some(read_bounded(package_root, &world_path, MAX_WORLD_BYTES)?)
        } else {
            None
        };
        let world: Option<WorldPackageData> = world_bytes
            .as_deref()
            .map(|bytes| {
                parse_json(
                    bytes,
                    &display_path(&world_path),
                    "package.invalid_world_json",
                )
            })
            .transpose()?;
        let patches_path = manifest
            .entrypoints
            .patches
            .as_deref()
            .map(|path| resolve_entrypoint(package_root, path))
            .transpose()?;
        let patch_bytes = patches_path
            .as_ref()
            .filter(|path| path.exists())
            .map(|path| read_bounded(package_root, path, MAX_PATCH_BYTES))
            .transpose()?;
        let patches: Vec<PackagePatch> = patch_bytes
            .as_deref()
            .map(|bytes| {
                parse_json(
                    bytes,
                    &patches_path
                        .as_ref()
                        .map_or_else(|| "data/patches.json".to_owned(), |path| display_path(path)),
                    "package.invalid_patch_json",
                )
            })
            .transpose()?
            .unwrap_or_default();
        verify_checksum(
            &manifest,
            world_bytes.as_deref().unwrap_or_default(),
            patch_bytes.as_deref().unwrap_or_default(),
            &display_path(&manifest_path),
        )?;
        if let Some(world) = &world {
            validate_asset_files(
                package_root,
                manifest.assets.iter().chain(world.assets.iter()),
            )?;
        } else {
            validate_asset_files(package_root, manifest.assets.iter())?;
        }
        Ok(ContentPackage {
            manifest,
            world,
            patches,
            source_file: display_path(&manifest_path),
        })
    }

    fn write_package(&self, package: &ContentPackage) -> Result<(), PackageValidationReport> {
        self.write_package_with_assets(package, &[])
    }

    fn write_package_with_assets(
        &self,
        package: &ContentPackage,
        assets: &[AuthoringAssetUpload],
    ) -> Result<(), PackageValidationReport> {
        self.reject_export(package)?;
        if assets.is_empty() {
            reject_unmaterialized_assets(package)?;
        }
        fs::create_dir_all(&self.user_packages_root).map_err(|error| {
            io_report(
                &self.user_packages_root,
                "package.catalog_create_failed",
                error,
            )
        })?;
        let target = self.user_packages_root.join(&package.manifest.package_id);
        ensure_direct_child(&self.user_packages_root, &target)?;
        let temporary = self
            .user_packages_root
            .join(format!(".{}.tmp", package.manifest.package_id));
        let backup = self
            .user_packages_root
            .join(format!(".{}.bak", package.manifest.package_id));
        for path in [&temporary, &backup] {
            if path.exists() {
                ensure_direct_child(&self.user_packages_root, path)?;
                ensure_real_descendant(&self.user_packages_root, path, "transactionPath")?;
                fs::remove_dir_all(path).map_err(|error| {
                    io_report(path, "package.stale_transaction_cleanup_failed", error)
                })?;
            }
        }
        fs::create_dir_all(&temporary)
            .map_err(|error| io_report(&temporary, "package.export_prepare_failed", error))?;
        let world_bytes = package
            .world
            .as_ref()
            .map(serde_json::to_vec_pretty)
            .transpose()
            .map_err(|error| serialization_report("data/world.json", error))?
            .unwrap_or_default();
        let patch_bytes = if package.patches.is_empty() {
            Vec::new()
        } else {
            serde_json::to_vec_pretty(&package.patches)
                .map_err(|error| serialization_report("data/patches.json", error))?
        };
        if !world_bytes.is_empty() {
            let world_path = resolve_entrypoint(&temporary, &package.manifest.entrypoints.world)?;
            write_synced(&world_path, &world_bytes)?;
        }
        if !patch_bytes.is_empty() {
            let Some(patches_entrypoint) = package.manifest.entrypoints.patches.as_deref() else {
                return Err(PackageValidationReport::blocking(
                    package.source_file.clone(),
                    "package.missing_patch_entrypoint",
                    Some(package.manifest.package_id.clone()),
                    Some("entrypoints.patches".to_owned()),
                    None,
                    None,
                    "Pacotes com patches precisam declarar onde data/patches.json será materializado.",
                    Some("Defina entrypoints.patches com um caminho relativo seguro.".to_owned()),
                ));
            };
            let patches_path = resolve_entrypoint(&temporary, patches_entrypoint)?;
            write_synced(&patches_path, &patch_bytes)?;
        }
        for asset in assets {
            let asset_path = resolve_entrypoint(&temporary, &asset.path)?;
            write_synced(&asset_path, &asset.bytes)?;
        }
        if !assets.is_empty() {
            validate_asset_files(&temporary, package.manifest.assets.iter())?;
        }
        let mut manifest = package.manifest.clone();
        manifest.checksum =
            package_content_checksum(manifest.schema_version, &world_bytes, &patch_bytes)?;
        let manifest_bytes = serde_json::to_vec_pretty(&manifest)
            .map_err(|error| serialization_report("manifest.json", error))?;
        write_synced(&temporary.join("manifest.json"), &manifest_bytes)?;
        if target.exists() {
            ensure_real_descendant(&self.user_packages_root, &target, "exportTarget")?;
            fs::rename(&target, &backup)
                .map_err(|error| io_report(&target, "package.backup_failed", error))?;
        }
        if let Err(error) = fs::rename(&temporary, &target) {
            if backup.exists() && !target.exists() {
                let _ = fs::rename(&backup, &target);
            }
            return Err(io_report(&target, "package.atomic_replace_failed", error));
        }
        if backup.exists() {
            let _ = fs::remove_dir_all(backup);
        }
        Ok(())
    }

    fn reject_export(&self, package: &ContentPackage) -> Result<(), PackageValidationReport> {
        let private_package = package.manifest.visibility == PackageVisibility::PrivateDevelopment;
        let allowed = match self.catalog_scope {
            PackageCatalogScope::Public => !private_package,
            PackageCatalogScope::PrivateDevelopment | PackageCatalogScope::Uat => private_package,
        };
        if allowed {
            return Ok(());
        }
        Err(PackageValidationReport::blocking(
            package.source_file.clone(),
            "package.private_development_isolated",
            Some(package.manifest.package_id.clone()),
            Some("visibility".to_owned()),
            None,
            Some(format!("{:?}", package.manifest.visibility)),
            "A visibilidade do pacote não corresponde ao catálogo autorizado.",
            Some(
                "Use uma raiz privada dev/UAT autorizada para visibility=privateDevelopment."
                    .to_owned(),
            ),
        ))
    }
}

impl WorldPackageRepository for FileWorldPackageRepository {
    fn load_active_packages(&self) -> Result<Vec<ContentPackage>, PackageValidationReport> {
        Ok(vec![self.bundled_official()?])
    }

    fn load_available_packages(&self) -> Result<Vec<ContentPackage>, PackageValidationReport> {
        let mut packages = vec![self.bundled_official()?];
        packages.extend(self.available_user_packages()?);
        Ok(packages)
    }

    fn save_package(&self, package: &ContentPackage) -> Result<(), PackageValidationReport> {
        self.write_package(package)
    }
}

pub struct WorldDatabaseCoordinator {
    service: WorldDatabaseService<FileWorldPackageRepository>,
    private_service: Option<WorldDatabaseService<FileWorldPackageRepository>>,
    private_catalog_scope: Option<PackageCatalogScope>,
    user_packages_root: PathBuf,
    creator_projects_root: PathBuf,
    package_history_root: PathBuf,
}

impl WorldDatabaseCoordinator {
    pub fn new(user_packages_root: impl Into<PathBuf>) -> Self {
        let user_packages_root = user_packages_root.into();
        let app_data_root = user_packages_root
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or_else(|| user_packages_root.clone());
        Self {
            service: WorldDatabaseService::new(FileWorldPackageRepository::new(
                user_packages_root.clone(),
            )),
            private_service: None,
            private_catalog_scope: None,
            user_packages_root,
            creator_projects_root: app_data_root.join("creator-projects"),
            package_history_root: app_data_root.join("package-history"),
        }
    }

    pub fn with_private_catalog(
        mut self,
        config: PrivateCatalogConfig,
    ) -> Result<Self, PackageValidationReport> {
        if config.public_build
            || !config.private_guard_passed
            || !config.root.is_absolute()
            || config.root == self.user_packages_root
            || config.root.starts_with(&self.user_packages_root)
            || self.user_packages_root.starts_with(&config.root)
        {
            return Err(PackageValidationReport::blocking(
                "<private-catalog>".to_owned(),
                "package.private_catalog_unauthorized",
                None,
                Some("privateCatalog".to_owned()),
                None,
                None,
                "O catálogo privado exige build não público, raiz explícita e private guard aprovado.",
                Some(
                    "Defina uma raiz isolada e capability development/UAT fora do build público."
                        .to_owned(),
                ),
            ));
        }
        let scope = match config.capability {
            PrivateCatalogCapability::Development => PackageCatalogScope::PrivateDevelopment,
            PrivateCatalogCapability::Uat => PackageCatalogScope::Uat,
        };
        self.private_service = Some(WorldDatabaseService::new_authorized(
            FileWorldPackageRepository::new_authorized(config.root, scope),
            scope,
        ));
        self.private_catalog_scope = Some(scope);
        Ok(self)
    }

    pub fn resolved(&self) -> Result<ResolvedWorldDatabase, PackageValidationReport> {
        self.service.resolved()
    }

    pub fn catalog(&self) -> Result<Vec<DataPackageCatalogEntry>, PackageValidationReport> {
        self.service.catalog()
    }

    pub fn private_catalog(&self) -> Result<Vec<DataPackageCatalogEntry>, PackageValidationReport> {
        self.private_service.as_ref().map_or_else(
            || Err(private_catalog_unavailable()),
            WorldDatabaseService::catalog,
        )
    }

    pub fn private_catalog_scope(&self) -> Option<PackageCatalogScope> {
        self.private_catalog_scope
    }

    pub fn resolve_private_selection(
        &self,
        package_ids: &[String],
    ) -> Result<ResolvedWorldDatabase, PackageValidationReport> {
        self.private_service.as_ref().map_or_else(
            || Err(private_catalog_unavailable()),
            |service| service.resolve_selection(package_ids),
        )
    }

    pub fn export_private_candidate(
        &self,
        package: &ContentPackage,
    ) -> Result<PackageValidationReport, PackageValidationReport> {
        self.private_service.as_ref().map_or_else(
            || Err(private_catalog_unavailable()),
            |service| service.export_candidate(package),
        )
    }

    pub fn runtime_asset_location(&self, asset: &AssetReference) -> Option<(String, String)> {
        let repository = FileWorldPackageRepository::new(&self.user_packages_root);
        let packages = repository.available_user_packages().ok()?;
        for package in packages.into_iter().rev() {
            if package.manifest.visibility != PackageVisibility::Public {
                continue;
            }
            if !package
                .manifest
                .assets
                .iter()
                .any(|candidate| candidate.id == asset.id)
            {
                continue;
            }
            let path = self
                .user_packages_root
                .join(&package.manifest.package_id)
                .join(&asset.path);
            if path.is_file()
                && ensure_real_descendant(&self.user_packages_root, &path, "runtimeAsset").is_ok()
            {
                return Some((
                    package.manifest.package_id,
                    path.to_string_lossy().into_owned(),
                ));
            }
        }
        None
    }

    pub fn resolve_selection(
        &self,
        package_ids: &[String],
    ) -> Result<ResolvedWorldDatabase, PackageValidationReport> {
        self.service.resolve_selection(package_ids)
    }

    pub fn validate_candidate(&self, package: &ContentPackage) -> PackageValidationReport {
        self.service.validate_candidate(package)
    }

    pub fn export_candidate(
        &self,
        package: &ContentPackage,
    ) -> Result<PackageValidationReport, PackageValidationReport> {
        self.service.export_candidate(package)
    }

    pub fn validate_authoring(
        &self,
        manifest_json: &str,
        world_json: Option<&str>,
        patches_json: Option<&str>,
        assets: &[AuthoringAssetUpload],
    ) -> PackageValidationReport {
        match prepare_authoring_package(manifest_json, world_json, patches_json, assets) {
            Ok(package) => self.service.validate_candidate(&package),
            Err(report) => report,
        }
    }

    pub fn export_authoring(
        &self,
        manifest_json: &str,
        world_json: Option<&str>,
        patches_json: Option<&str>,
        assets: &[AuthoringAssetUpload],
    ) -> Result<PackageValidationReport, PackageValidationReport> {
        let package = prepare_authoring_package(manifest_json, world_json, patches_json, assets)?;
        let validation = self.service.validate_candidate(&package);
        if !validation.valid {
            return Err(validation);
        }
        FileWorldPackageRepository::new(&self.user_packages_root)
            .write_package_with_assets(&package, assets)?;
        Ok(validation)
    }

    pub fn list_creator_projects(
        &self,
    ) -> Result<Vec<CreatorProjectSummary>, PackageValidationReport> {
        if !self.creator_projects_root.exists() {
            return Ok(Vec::new());
        }
        let mut records = fs::read_dir(&self.creator_projects_root)
            .map_err(|error| {
                io_report(
                    &self.creator_projects_root,
                    "creator.projects_read_failed",
                    error,
                )
            })?
            .filter_map(Result::ok)
            .filter(|entry| {
                entry
                    .path()
                    .extension()
                    .is_some_and(|value| value == "json")
            })
            .map(|entry| self.read_creator_project_file(&entry.path()))
            .collect::<Result<Vec<_>, _>>()?;
        records.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
        Ok(records.iter().map(project_summary).collect())
    }

    pub fn load_creator_project(
        &self,
        project_id: &str,
    ) -> Result<CreatorProjectRecord, PackageValidationReport> {
        ensure_creator_id(project_id, "projectId")?;
        self.read_creator_project_file(
            &self
                .creator_projects_root
                .join(format!("{project_id}.json")),
        )
    }

    pub fn save_creator_project(
        &self,
        draft: CreatorProjectDraft,
    ) -> Result<CreatorProjectRecord, PackageValidationReport> {
        ensure_creator_id(&draft.project_id, "projectId")?;
        if draft.name.trim().is_empty() || draft.name.chars().count() > 120 {
            return Err(creator_report(
                "creator.project_name_invalid",
                "name",
                "Informe um nome de projeto com até 120 caracteres.",
            ));
        }
        let package = prepare_authoring_package(
            &draft.source.manifest_json,
            draft.source.world_json.as_deref(),
            draft.source.patches_json.as_deref(),
            &draft.source.assets,
        )?;
        let validation = self.service.validate_candidate(&package);
        let status = project_status(&validation);
        let now = unix_ms();
        fs::create_dir_all(&self.creator_projects_root).map_err(|error| {
            io_report(
                &self.creator_projects_root,
                "creator.projects_create_failed",
                error,
            )
        })?;
        let target = self
            .creator_projects_root
            .join(format!("{}.json", draft.project_id));
        let existing = target
            .exists()
            .then(|| self.read_creator_project_file(&target))
            .transpose()?;
        let record = CreatorProjectRecord {
            schema_version: CREATOR_PROJECT_SCHEMA_VERSION,
            project_id: draft.project_id,
            name: draft.name.trim().to_owned(),
            mode: draft.mode,
            status,
            base_package_id: draft.base_package_id,
            package_id: package.manifest.package_id,
            version: package.manifest.version,
            created_at: existing.as_ref().map_or(now, |value| value.created_at),
            updated_at: now,
            last_exported_at: existing.as_ref().and_then(|value| value.last_exported_at),
            revision: existing.as_ref().map_or(1, |value| value.revision + 1),
            source: draft.source,
        };
        write_json_atomic(&self.creator_projects_root, &target, &record)?;
        Ok(record)
    }

    pub fn delete_creator_project(&self, project_id: &str) -> Result<(), PackageValidationReport> {
        ensure_creator_id(project_id, "projectId")?;
        let target = self
            .creator_projects_root
            .join(format!("{project_id}.json"));
        if target.exists() {
            fs::remove_file(&target)
                .map_err(|error| io_report(&target, "creator.project_delete_failed", error))?;
        }
        Ok(())
    }

    pub fn mark_creator_project_exported(
        &self,
        project_id: &str,
        package_id: &str,
        version: &str,
    ) -> Result<CreatorProjectRecord, PackageValidationReport> {
        ensure_creator_id(project_id, "projectId")?;
        let target = self
            .creator_projects_root
            .join(format!("{project_id}.json"));
        let mut record = self.read_creator_project_file(&target)?;
        if record.package_id != package_id || record.version != version {
            return Err(creator_report(
                "creator.export_project_identity_mismatch",
                "projectId",
                "O bundle exportado não corresponde ao projeto de autoria aberto.",
            ));
        }
        let now = unix_ms();
        record.status = CreatorProjectStatus::Exported;
        record.last_exported_at = Some(now);
        record.updated_at = now;
        write_json_atomic(&self.creator_projects_root, &target, &record)?;
        Ok(record)
    }

    pub fn fork_installed_package(
        &self,
        package_id: &str,
        project_id: &str,
        name: &str,
        mode: CreatorProjectMode,
        next_version: Option<&str>,
        duplicate_package_id: Option<&str>,
    ) -> Result<CreatorProjectRecord, PackageValidationReport> {
        ensure_creator_id(package_id, "packageId")?;
        ensure_creator_id(project_id, "projectId")?;
        let repository = FileWorldPackageRepository::new(&self.user_packages_root);
        let package_root = self.user_packages_root.join(package_id);
        if !package_root.exists() {
            return Err(creator_report(
                "creator.package_not_editable",
                "packageId",
                "Somente bundles locais exportados ou instalados podem originar uma nova versão.",
            ));
        }
        ensure_real_descendant(&self.user_packages_root, &package_root, "packageRoot")?;
        let mut package = repository.read_package(&package_root)?;
        if let Some(version) = next_version {
            let Some(next) = semver_tuple(version) else {
                return Err(creator_report(
                    "creator.version_invalid",
                    "version",
                    "Informe uma versão semântica válida no formato major.minor.patch.",
                ));
            };
            let Some(current) = semver_tuple(&package.manifest.version) else {
                return Err(creator_report(
                    "creator.installed_version_invalid",
                    "version",
                    "A versão instalada é inválida e não pode originar uma atualização.",
                ));
            };
            if next <= current {
                return Err(creator_report(
                    "creator.version_not_greater",
                    "version",
                    "A nova versão precisa ser superior à versão instalada.",
                ));
            }
            package.manifest.version = version.to_owned();
        }
        if let Some(duplicate_id) = duplicate_package_id {
            ensure_creator_id(duplicate_id, "packageId")?;
            if duplicate_id == package.manifest.package_id {
                return Err(creator_report(
                    "creator.duplicate_id_unchanged",
                    "packageId",
                    "A duplicação precisa usar um novo packageId.",
                ));
            }
            package.manifest.package_id = duplicate_id.to_owned();
            package.manifest.version = next_version.unwrap_or("1.0.0").to_owned();
        }
        package.manifest.name = name.trim().to_owned();
        let source = source_from_installed_package(&package_root, &package)?;
        self.save_creator_project(CreatorProjectDraft {
            project_id: project_id.to_owned(),
            name: name.to_owned(),
            mode,
            base_package_id: package
                .manifest
                .dependencies
                .first()
                .map_or_else(String::new, |dependency| dependency.package_id.clone()),
            source,
        })
    }

    pub fn export_rivmod(
        &self,
        source: &DataPackageAuthoringSource,
        destination: &Path,
    ) -> Result<PackageDistributionReceipt, PackageValidationReport> {
        let package = prepare_authoring_package(
            &source.manifest_json,
            source.world_json.as_deref(),
            source.patches_json.as_deref(),
            &source.assets,
        )?;
        let validation = self.service.validate_candidate(&package);
        if !validation.valid {
            return Err(validation);
        }
        if destination
            .extension()
            .is_none_or(|value| value != "rivmod")
        {
            return Err(creator_report(
                "creator.bundle_extension_invalid",
                "destination",
                "O arquivo compartilhável precisa usar a extensão .rivmod.",
            ));
        }
        let parent = destination.parent().ok_or_else(|| {
            creator_report(
                "creator.bundle_destination_invalid",
                "destination",
                "Escolha uma pasta válida para exportar o mod.",
            )
        })?;
        fs::create_dir_all(parent)
            .map_err(|error| io_report(parent, "creator.bundle_prepare_failed", error))?;
        let normalized = normalized_authoring_source(package.clone(), &source.assets)?;
        let bundle = RivmodBundle {
            format_version: RIVMOD_FORMAT_VERSION,
            exported_at: unix_ms(),
            manifest_json: normalized.manifest_json,
            world_json: normalized.world_json,
            patches_json: normalized.patches_json,
            assets: normalized.assets,
        };
        let bytes = serde_json::to_vec_pretty(&bundle)
            .map_err(|error| serialization_report("bundle.rivmod", error))?;
        if bytes.len() as u64 > MAX_RIVMOD_BYTES {
            return Err(creator_report(
                "creator.bundle_too_large",
                "bundle",
                "O bundle excede o limite seguro de 128 MB.",
            ));
        }
        write_single_file_atomic(destination, &bytes)?;
        Ok(distribution_receipt(
            &package.manifest,
            destination,
            &bytes,
            "Exportado",
        ))
    }

    pub fn inspect_rivmod(&self, path: &Path) -> Result<RivmodInspection, PackageValidationReport> {
        let (_bundle, bytes, package) = self.read_rivmod(path)?;
        let validation = self.service.validate_candidate(&package);
        let installed = self
            .service
            .catalog()?
            .into_iter()
            .find(|entry| entry.manifest.package_id == package.manifest.package_id);
        let installed_version = installed
            .as_ref()
            .map(|entry| entry.manifest.version.clone());
        let downgrade = installed_version
            .as_ref()
            .is_some_and(|version| semver_tuple(&package.manifest.version) < semver_tuple(version));
        Ok(RivmodInspection {
            receipt: distribution_receipt(&package.manifest, path, &bytes, "Inspecionado"),
            validation,
            dependencies: package
                .manifest
                .dependencies
                .iter()
                .map(|value| format!("{} {}", value.package_id, value.version_requirement))
                .collect(),
            conflicts: package
                .manifest
                .conflicts
                .iter()
                .map(|value| format!("{} · {}", value.package_id, value.reason))
                .collect(),
            update_from_version: installed_version,
            downgrade,
        })
    }

    pub fn install_rivmod(
        &self,
        path: &Path,
    ) -> Result<PackageDistributionReceipt, PackageValidationReport> {
        let (bundle, bytes, package) = self.read_rivmod(path)?;
        let inspection = self.inspect_rivmod(path)?;
        if !inspection.validation.valid || inspection.downgrade {
            return Err(creator_report(
                "creator.bundle_install_blocked",
                "bundle",
                "A instalação foi bloqueada por validação ou tentativa de downgrade.",
            ));
        }
        self.backup_installed_package(&package.manifest.package_id)?;
        FileWorldPackageRepository::new(&self.user_packages_root)
            .write_package_with_assets(&package, &bundle.assets)?;
        Ok(distribution_receipt(
            &package.manifest,
            path,
            &bytes,
            "Instalado",
        ))
    }

    pub fn package_history(
        &self,
        package_id: &str,
    ) -> Result<Vec<PackageHistoryEntry>, PackageValidationReport> {
        ensure_creator_id(package_id, "packageId")?;
        let root = self.package_history_root.join(package_id);
        if !root.exists() {
            return Ok(Vec::new());
        }
        ensure_real_descendant(&self.package_history_root, &root, "historyRoot")?;
        let repository = FileWorldPackageRepository::new(&self.package_history_root);
        let mut history = Vec::new();
        for entry in fs::read_dir(&root)
            .map_err(|error| io_report(&root, "creator.history_read_failed", error))?
        {
            let entry =
                entry.map_err(|error| io_report(&root, "creator.history_read_failed", error))?;
            let metadata = fs::symlink_metadata(entry.path())
                .map_err(|error| io_report(&entry.path(), "creator.history_read_failed", error))?;
            if is_link_or_reparse(&metadata) || !metadata.is_dir() {
                continue;
            }
            let package = repository.read_package(&entry.path())?;
            let archived_at = metadata
                .modified()
                .ok()
                .and_then(|value| value.duration_since(std::time::UNIX_EPOCH).ok())
                .map_or(0, |value| value.as_millis().try_into().unwrap_or(u64::MAX));
            history.push(PackageHistoryEntry {
                package_id: package.manifest.package_id,
                version: package.manifest.version,
                name: package.manifest.name,
                archived_at,
            });
        }
        history
            .sort_by(|left, right| semver_tuple(&right.version).cmp(&semver_tuple(&left.version)));
        Ok(history)
    }

    pub fn rollback_installed_package(
        &self,
        package_id: &str,
        version: &str,
    ) -> Result<PackageDistributionReceipt, PackageValidationReport> {
        ensure_creator_id(package_id, "packageId")?;
        ensure_creator_id(version, "version")?;
        let history = self.package_history_root.join(package_id).join(version);
        if !history.exists() {
            return Err(creator_report(
                "creator.history_version_missing",
                "version",
                "A versão solicitada não existe no histórico seguro.",
            ));
        }
        ensure_real_descendant(&self.package_history_root, &history, "historyVersion")?;
        let historical =
            FileWorldPackageRepository::new(&self.package_history_root).read_package(&history)?;
        if historical.manifest.package_id != package_id || historical.manifest.version != version {
            return Err(creator_report(
                "creator.history_identity_mismatch",
                "version",
                "O histórico não corresponde ao packageId e versão solicitados.",
            ));
        }
        let validation = self.service.validate_candidate(&historical);
        if !validation.valid {
            return Err(validation);
        }
        self.backup_installed_package(package_id)?;
        let target = self.user_packages_root.join(package_id);
        let temporary = self
            .user_packages_root
            .join(format!(".{package_id}.rollback.tmp"));
        let backup = self
            .user_packages_root
            .join(format!(".{package_id}.rollback.bak"));
        for stale in [&temporary, &backup] {
            if stale.exists() {
                fs::remove_dir_all(stale)
                    .map_err(|error| io_report(stale, "creator.rollback_cleanup_failed", error))?;
            }
        }
        copy_package_directory(&history, &temporary)?;
        if target.exists() {
            ensure_real_descendant(&self.user_packages_root, &target, "rollbackTarget")?;
            fs::rename(&target, &backup)
                .map_err(|error| io_report(&target, "creator.rollback_backup_failed", error))?;
        }
        if let Err(error) = fs::rename(&temporary, &target) {
            if backup.exists() && !target.exists() {
                let _ = fs::rename(&backup, &target);
            }
            return Err(io_report(&target, "creator.rollback_replace_failed", error));
        }
        if backup.exists() {
            fs::remove_dir_all(&backup)
                .map_err(|error| io_report(&backup, "creator.rollback_cleanup_failed", error))?;
        }
        let manifest_bytes = fs::read(target.join("manifest.json"))
            .map_err(|error| io_report(&target, "creator.rollback_receipt_failed", error))?;
        Ok(distribution_receipt(
            &historical.manifest,
            &target,
            &manifest_bytes,
            "Rollback concluído",
        ))
    }

    fn read_creator_project_file(
        &self,
        path: &Path,
    ) -> Result<CreatorProjectRecord, PackageValidationReport> {
        ensure_real_descendant(&self.creator_projects_root, path, "projectFile")?;
        let bytes = read_bounded(&self.creator_projects_root, path, MAX_RIVMOD_BYTES)?;
        let mut record: CreatorProjectRecord =
            parse_json(&bytes, &display_path(path), "creator.project_json_invalid")?;
        if record.schema_version != CREATOR_PROJECT_SCHEMA_VERSION {
            return Err(creator_report(
                "creator.project_schema_unsupported",
                "schemaVersion",
                "O projeto precisa ser migrado antes de continuar a edição.",
            ));
        }
        if migrate_verified_new_entity_operations(&mut record)? {
            let backup = path.with_extension("pre-origin-migration.bak");
            if !backup.exists() {
                fs::copy(path, &backup)
                    .map_err(|error| io_report(&backup, "creator.project_backup_failed", error))?;
            }
            record.status = CreatorProjectStatus::Modified;
            record.updated_at = unix_ms();
            record.revision = record.revision.saturating_add(1);
            write_json_atomic(&self.creator_projects_root, path, &record)?;
        }
        Ok(record)
    }

    fn read_rivmod(
        &self,
        path: &Path,
    ) -> Result<(RivmodBundle, Vec<u8>, ContentPackage), PackageValidationReport> {
        if path.extension().is_none_or(|value| value != "rivmod") {
            return Err(creator_report(
                "creator.bundle_extension_invalid",
                "bundle",
                "Selecione um arquivo .rivmod.",
            ));
        }
        let metadata = fs::symlink_metadata(path)
            .map_err(|error| io_report(path, "creator.bundle_read_failed", error))?;
        if is_link_or_reparse(&metadata) || !metadata.is_file() || metadata.len() > MAX_RIVMOD_BYTES
        {
            return Err(creator_report(
                "creator.bundle_file_unsafe",
                "bundle",
                "O bundle é inválido, excessivo ou usa um link inseguro.",
            ));
        }
        let bytes =
            fs::read(path).map_err(|error| io_report(path, "creator.bundle_read_failed", error))?;
        let bundle: RivmodBundle =
            parse_json(&bytes, &display_path(path), "creator.bundle_json_invalid")?;
        if bundle.format_version != RIVMOD_FORMAT_VERSION {
            return Err(creator_report(
                "creator.bundle_version_unsupported",
                "formatVersion",
                "A versão deste bundle ainda não é suportada.",
            ));
        }
        let package = prepare_authoring_package(
            &bundle.manifest_json,
            bundle.world_json.as_deref(),
            bundle.patches_json.as_deref(),
            &bundle.assets,
        )?;
        verify_authoring_checksum(
            &package,
            bundle.world_json.as_deref(),
            bundle.patches_json.as_deref(),
        )?;
        Ok((bundle, bytes, package))
    }

    fn backup_installed_package(&self, package_id: &str) -> Result<(), PackageValidationReport> {
        let source = self.user_packages_root.join(package_id);
        if !source.exists() {
            return Ok(());
        }
        let repository = FileWorldPackageRepository::new(&self.user_packages_root);
        let package = repository.read_package(&source)?;
        let destination = self
            .package_history_root
            .join(package_id)
            .join(&package.manifest.version);
        if destination.exists() {
            return Ok(());
        }
        copy_package_directory(&source, &destination)
    }
}

fn ensure_creator_id(value: &str, field: &str) -> Result<(), PackageValidationReport> {
    let valid = !value.is_empty()
        && value.len() <= 160
        && !value.contains("..")
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-' | b'_' | b':'));
    if valid {
        Ok(())
    } else {
        Err(creator_report(
            "creator.identifier_invalid",
            field,
            "Use um identificador estável sem espaços, barras ou caminhos relativos.",
        ))
    }
}

fn creator_report(code: &str, field: &str, message: &str) -> PackageValidationReport {
    PackageValidationReport::blocking(
        "<creator-studio>".to_owned(),
        code,
        None,
        Some(field.to_owned()),
        None,
        None,
        message,
        None,
    )
}

fn project_status(validation: &PackageValidationReport) -> CreatorProjectStatus {
    if !validation.valid {
        CreatorProjectStatus::Blocked
    } else if validation.diagnostics.is_empty() {
        CreatorProjectStatus::Valid
    } else {
        CreatorProjectStatus::ValidWithWarnings
    }
}

fn migrate_verified_new_entity_operations(
    record: &mut CreatorProjectRecord,
) -> Result<bool, PackageValidationReport> {
    let Some(patches_json) = record.source.patches_json.as_deref() else {
        return Ok(false);
    };
    let mut patches: Vec<Value> = serde_json::from_str(patches_json)
        .map_err(|error| serialization_report("data/patches.json", error))?;
    let verified = [
        ("community.example.city.sao-paulo", "city"),
        ("community.example.stadium.Estádio Horizonte", "stadium"),
        (
            "community.example.club.sao-paulo-futebol-clube",
            "club",
        ),
    ];
    let mut changed = false;
    for patch in &mut patches {
        let target_id = patch.get("targetId").and_then(Value::as_str);
        let entity_kind = patch.get("entityKind").and_then(Value::as_str);
        let is_verified = verified
            .iter()
            .any(|(id, kind)| target_id == Some(*id) && entity_kind == Some(*kind));
        if is_verified && patch.get("operation").and_then(Value::as_str) == Some("replace") {
            patch["operation"] = Value::String("add".to_owned());
            changed = true;
        }
    }
    if changed {
        record.source.patches_json = Some(
            serde_json::to_string_pretty(&patches)
                .map_err(|error| serialization_report("data/patches.json", error))?,
        );
    }
    Ok(changed)
}

fn project_summary(record: &CreatorProjectRecord) -> CreatorProjectSummary {
    let patch_count = record
        .source
        .patches_json
        .as_deref()
        .and_then(|value| serde_json::from_str::<Vec<PackagePatch>>(value).ok())
        .map_or(0, |patches| patches.len());
    CreatorProjectSummary {
        project_id: record.project_id.clone(),
        name: record.name.clone(),
        mode: record.mode,
        status: record.status,
        base_package_id: record.base_package_id.clone(),
        package_id: record.package_id.clone(),
        version: record.version.clone(),
        updated_at: record.updated_at,
        last_exported_at: record.last_exported_at,
        entity_count: patch_count + record.source.assets.len(),
    }
}

fn unix_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .try_into()
        .unwrap_or(u64::MAX)
}

fn semver_tuple(value: &str) -> Option<(u32, u32, u32)> {
    let core = value.split_once('-').map_or(value, |(core, _)| core);
    let mut parts = core.split('.');
    let result = (
        parts.next()?.parse().ok()?,
        parts.next()?.parse().ok()?,
        parts.next()?.parse().ok()?,
    );
    parts.next().is_none().then_some(result)
}

fn normalized_authoring_source(
    mut package: ContentPackage,
    assets: &[AuthoringAssetUpload],
) -> Result<DataPackageAuthoringSource, PackageValidationReport> {
    let world_json = package
        .world
        .as_ref()
        .map(serde_json::to_string_pretty)
        .transpose()
        .map_err(|error| serialization_report("data/world.json", error))?;
    let patches_json = (!package.patches.is_empty())
        .then(|| serde_json::to_string_pretty(&package.patches))
        .transpose()
        .map_err(|error| serialization_report("data/patches.json", error))?;
    package.manifest.checksum = package_content_checksum(
        package.manifest.schema_version,
        world_json.as_deref().unwrap_or_default().as_bytes(),
        patches_json.as_deref().unwrap_or_default().as_bytes(),
    )?;
    let manifest_json = serde_json::to_string_pretty(&package.manifest)
        .map_err(|error| serialization_report("manifest.json", error))?;
    Ok(DataPackageAuthoringSource {
        manifest_json,
        world_json,
        patches_json,
        assets: assets.to_vec(),
    })
}

fn source_from_installed_package(
    package_root: &Path,
    package: &ContentPackage,
) -> Result<DataPackageAuthoringSource, PackageValidationReport> {
    let assets = package
        .manifest
        .assets
        .iter()
        .map(|asset| {
            let path = resolve_entrypoint(package_root, &asset.path)?;
            let bytes = read_bounded(package_root, &path, MAX_ASSET_BYTES)?;
            Ok(AuthoringAssetUpload {
                id: asset.id.clone(),
                entity_id: asset.entity_id.clone().unwrap_or_default(),
                kind: asset.kind.clone(),
                path: asset.path.clone(),
                media_type: asset.media_type.clone(),
                bytes,
                provenance: asset.provenance.clone(),
                rights: asset.rights.clone(),
            })
        })
        .collect::<Result<Vec<_>, PackageValidationReport>>()?;
    normalized_authoring_source(package.clone(), &assets)
}

fn verify_authoring_checksum(
    package: &ContentPackage,
    world_json: Option<&str>,
    patches_json: Option<&str>,
) -> Result<(), PackageValidationReport> {
    let expected = package
        .manifest
        .checksum
        .strip_prefix("sha256:")
        .unwrap_or(&package.manifest.checksum);
    let actual = package_content_checksum(
        package.manifest.schema_version,
        world_json.unwrap_or_default().as_bytes(),
        patches_json.unwrap_or_default().as_bytes(),
    )?;
    let actual = actual.strip_prefix("sha256:").unwrap_or(&actual);
    if expected == actual {
        Ok(())
    } else {
        Err(creator_report(
            "creator.bundle_checksum_mismatch",
            "manifest.checksum",
            "O checksum do conteúdo não corresponde ao manifesto do bundle.",
        ))
    }
}

fn distribution_receipt(
    manifest: &PackageManifest,
    path: &Path,
    bytes: &[u8],
    status: &str,
) -> PackageDistributionReceipt {
    PackageDistributionReceipt {
        package_id: manifest.package_id.clone(),
        name: manifest.name.clone(),
        version: manifest.version.clone(),
        path: display_path(path),
        size: bytes.len() as u64,
        sha256: format!("{:X}", Sha256::digest(bytes)),
        status: status.to_owned(),
    }
}

fn write_json_atomic<T: Serialize>(
    root: &Path,
    target: &Path,
    value: &T,
) -> Result<(), PackageValidationReport> {
    fs::create_dir_all(root)
        .map_err(|error| io_report(root, "creator.write_prepare_failed", error))?;
    ensure_direct_child(root, target)?;
    let bytes = serde_json::to_vec_pretty(value)
        .map_err(|error| serialization_report(&display_path(target), error))?;
    write_single_file_atomic(target, &bytes)
}

fn write_single_file_atomic(target: &Path, bytes: &[u8]) -> Result<(), PackageValidationReport> {
    let parent = target.parent().ok_or_else(|| {
        creator_report(
            "creator.write_target_invalid",
            "target",
            "O destino de gravação é inválido.",
        )
    })?;
    let name = target
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| {
            creator_report(
                "creator.write_target_invalid",
                "target",
                "O nome do arquivo de destino é inválido.",
            )
        })?;
    let temporary = parent.join(format!(".{name}.tmp"));
    let backup = parent.join(format!(".{name}.bak"));
    for stale in [&temporary, &backup] {
        if stale.exists() {
            fs::remove_file(stale)
                .map_err(|error| io_report(stale, "creator.write_cleanup_failed", error))?;
        }
    }
    if target.exists() {
        let metadata = fs::symlink_metadata(target)
            .map_err(|error| io_report(target, "creator.write_target_inspection_failed", error))?;
        if is_link_or_reparse(&metadata) || !metadata.is_file() {
            return Err(creator_report(
                "creator.write_target_unsafe",
                "target",
                "O destino existente é um link, diretório ou reparse point inseguro.",
            ));
        }
    }
    write_synced(&temporary, bytes)?;
    if target.exists() {
        fs::rename(target, &backup)
            .map_err(|error| io_report(target, "creator.write_backup_failed", error))?;
    }
    if let Err(error) = fs::rename(&temporary, target) {
        if backup.exists() && !target.exists() {
            let _ = fs::rename(&backup, target);
        }
        return Err(io_report(target, "creator.write_replace_failed", error));
    }
    if backup.exists() {
        let _ = fs::remove_file(backup);
    }
    Ok(())
}

fn copy_package_directory(
    source: &Path,
    destination: &Path,
) -> Result<(), PackageValidationReport> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| io_report(parent, "creator.history_prepare_failed", error))?;
    }
    fs::create_dir_all(destination)
        .map_err(|error| io_report(destination, "creator.history_prepare_failed", error))?;
    for entry in fs::read_dir(source)
        .map_err(|error| io_report(source, "creator.history_read_failed", error))?
    {
        let entry =
            entry.map_err(|error| io_report(source, "creator.history_read_failed", error))?;
        let metadata = fs::symlink_metadata(entry.path())
            .map_err(|error| io_report(&entry.path(), "creator.history_read_failed", error))?;
        if is_link_or_reparse(&metadata) {
            return Err(creator_report(
                "creator.history_link_rejected",
                "package",
                "O pacote contém um link inseguro e não pode entrar no histórico.",
            ));
        }
        let target = destination.join(entry.file_name());
        if metadata.is_dir() {
            copy_package_directory(&entry.path(), &target)?;
        } else if metadata.is_file() {
            fs::copy(entry.path(), &target)
                .map_err(|error| io_report(&target, "creator.history_write_failed", error))?;
        }
    }
    Ok(())
}

fn prepare_authoring_package(
    manifest_json: &str,
    world_json: Option<&str>,
    patches_json: Option<&str>,
    assets: &[AuthoringAssetUpload],
) -> Result<ContentPackage, PackageValidationReport> {
    let mut package = parse_authoring_package(manifest_json, world_json, patches_json)?;
    if assets.is_empty() {
        return Ok(package);
    }
    if assets.len() > MAX_AUTHORING_ASSETS
        || assets.iter().map(|asset| asset.bytes.len()).sum::<usize>()
            > MAX_AUTHORING_ASSET_TOTAL_BYTES
    {
        return Err(PackageValidationReport::blocking(
            "<editor>/assets",
            "package.authoring_assets_too_large",
            Some(package.manifest.package_id.clone()),
            Some("assets".to_owned()),
            None,
            Some(assets.len().to_string()),
            "O conjunto de imagens excede os limites seguros do editor.",
            Some("Use até 128 imagens e 64 MB no total.".to_owned()),
        ));
    }
    let mut ids = std::collections::HashSet::new();
    let mut paths = std::collections::HashSet::new();
    let mut references = Vec::with_capacity(assets.len());
    for asset in assets {
        let safe_path = !asset.path.contains("..")
            && asset.path.starts_with("assets/")
            && asset
                .path
                .bytes()
                .all(|value| value.is_ascii_alphanumeric() || b"/._-".contains(&value));
        let safe_identity = !asset.id.trim().is_empty()
            && !asset.entity_id.trim().is_empty()
            && !asset.kind.trim().is_empty()
            && ids.insert(asset.id.clone())
            && paths.insert(asset.path.clone());
        if !safe_path
            || !safe_identity
            || asset.bytes.is_empty()
            || asset.bytes.len() as u64 > MAX_ASSET_BYTES
            || !valid_image_payload(&asset.media_type, &asset.bytes)
        {
            return Err(PackageValidationReport::blocking(
                "<editor>/assets",
                "package.authoring_asset_invalid",
                Some(asset.id.clone()),
                Some("asset".to_owned()),
                None,
                Some(asset.path.clone()),
                "A imagem precisa ser PNG, JPEG ou WebP válido, com caminho e identidade seguros.",
                Some("Escolha novamente uma imagem local de até 16 MB.".to_owned()),
            ));
        }
        references.push(rivallo_application::AssetReference {
            id: asset.id.clone(),
            entity_id: Some(asset.entity_id.clone()),
            kind: asset.kind.clone(),
            path: asset.path.clone(),
            media_type: asset.media_type.clone(),
            checksum: format!("sha256:{:x}", Sha256::digest(&asset.bytes)),
            provenance: asset.provenance.trim().to_owned(),
            rights: asset.rights.trim().to_owned(),
            private_use: false,
        });
    }
    package.manifest.entrypoints.assets = Some("assets".to_owned());
    package.manifest.assets = references;
    Ok(package)
}

fn valid_image_payload(media_type: &str, bytes: &[u8]) -> bool {
    match media_type {
        "image/png" => bytes.starts_with(b"\x89PNG\r\n\x1a\n"),
        "image/jpeg" => bytes.starts_with(&[0xff, 0xd8, 0xff]),
        "image/webp" => bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP",
        _ => false,
    }
}

fn parse_authoring_package(
    manifest_json: &str,
    world_json: Option<&str>,
    patches_json: Option<&str>,
) -> Result<ContentPackage, PackageValidationReport> {
    if manifest_json.len() as u64 > MAX_MANIFEST_BYTES
        || world_json.is_some_and(|value| value.len() as u64 > MAX_WORLD_BYTES)
        || patches_json.is_some_and(|value| value.len() as u64 > MAX_PATCH_BYTES)
    {
        return Err(PackageValidationReport::blocking(
            "<editor>",
            "package.authoring_payload_too_large",
            None,
            Some("payload".to_owned()),
            None,
            None,
            "O conteúdo de autoria excede os limites seguros do formato v1.",
            Some("Divida o pacote ou remova dados/assets indevidos.".to_owned()),
        ));
    }
    let manifest = parse_json(
        manifest_json.as_bytes(),
        "<editor>/manifest.json",
        "package.invalid_manifest_json",
    )?;
    let world = world_json
        .filter(|value| !value.trim().is_empty())
        .map(|value| {
            parse_json(
                value.as_bytes(),
                "<editor>/data/world.json",
                "package.invalid_world_json",
            )
        })
        .transpose()?;
    let patches = patches_json
        .filter(|value| !value.trim().is_empty())
        .map(|value| {
            parse_json(
                value.as_bytes(),
                "<editor>/data/patches.json",
                "package.invalid_patch_json",
            )
        })
        .transpose()?
        .unwrap_or_default();
    Ok(ContentPackage {
        manifest,
        world,
        patches,
        source_file: "<editor>/manifest.json".to_owned(),
    })
}

fn read_bounded(
    root: &Path,
    path: &Path,
    maximum: u64,
) -> Result<Vec<u8>, PackageValidationReport> {
    ensure_real_descendant(root, path, "path")?;
    let metadata = fs::symlink_metadata(path)
        .map_err(|error| io_report(path, "package.file_read_failed", error))?;
    if is_link_or_reparse(&metadata) || !metadata.is_file() || metadata.len() > maximum {
        return Err(PackageValidationReport::blocking(
            display_path(path),
            "package.unsafe_file",
            None,
            Some("path".to_owned()),
            None,
            Some(metadata.len().to_string()),
            "Arquivos precisam ser regulares, não-symlink e respeitar o limite de tamanho.",
            Some(format!(
                "Use um arquivo local de no máximo {maximum} bytes."
            )),
        ));
    }
    fs::read(path).map_err(|error| io_report(path, "package.file_read_failed", error))
}

fn parse_json<T: serde::de::DeserializeOwned>(
    bytes: &[u8],
    file: &str,
    code: &str,
) -> Result<T, PackageValidationReport> {
    serde_json::from_slice(bytes).map_err(|error| {
        PackageValidationReport::blocking(
            file,
            code,
            None,
            Some(format!("line:{} column:{}", error.line(), error.column())),
            None,
            None,
            "O JSON precisa corresponder ao schema versionado declarado.",
            Some("Corrija a sintaxe/campo indicado e valide novamente.".to_owned()),
        )
    })
}

fn verify_checksum(
    manifest: &PackageManifest,
    world: &[u8],
    patches: &[u8],
    file: &str,
) -> Result<(), PackageValidationReport> {
    let actual = package_content_checksum(manifest.schema_version, world, patches)?;
    if manifest.checksum == actual {
        return Ok(());
    }
    Err(PackageValidationReport::blocking(
        file,
        "package.checksum_mismatch",
        Some(manifest.package_id.clone()),
        Some("checksum".to_owned()),
        None,
        Some(manifest.checksum.clone()),
        "O checksum declarado precisa corresponder exatamente ao conteúdo carregado.",
        Some(format!("Reexporte o pacote; checksum calculado: {actual}.")),
    ))
}

fn package_content_checksum(
    schema_version: u16,
    world: &[u8],
    patches: &[u8],
) -> Result<String, PackageValidationReport> {
    let mut content = Vec::new();
    for source in [world, patches] {
        if source.is_empty() {
            if schema_version >= 2 {
                content.extend_from_slice(&0_u64.to_be_bytes());
            }
            continue;
        }
        let normalized = if schema_version >= 2 {
            canonical_json_bytes(source)?
        } else {
            normalize_line_endings(source)
        };
        if schema_version >= 2 {
            content.extend_from_slice(&(normalized.len() as u64).to_be_bytes());
        }
        content.extend_from_slice(&normalized);
    }
    Ok(format!("sha256:{:x}", Sha256::digest(&content)))
}

fn canonical_json_bytes(source: &[u8]) -> Result<Vec<u8>, PackageValidationReport> {
    let mut value: Value = serde_json::from_slice(source)
        .map_err(|error| serialization_report("<checksum-json>", error))?;
    canonicalize_json_value(&mut value);
    serde_json::to_vec(&value).map_err(|error| serialization_report("<checksum-json>", error))
}

fn canonicalize_json_value(value: &mut Value) {
    match value {
        Value::Array(items) => {
            for item in items {
                canonicalize_json_value(item);
            }
        }
        Value::Object(object) => {
            let mut entries = std::mem::take(object).into_iter().collect::<Vec<_>>();
            entries.sort_by(|(left, _), (right, _)| left.cmp(right));
            for (key, mut item) in entries {
                canonicalize_json_value(&mut item);
                object.insert(key, item);
            }
        }
        Value::Null | Value::Bool(_) | Value::Number(_) | Value::String(_) => {}
    }
}

fn normalize_line_endings(source: &[u8]) -> Vec<u8> {
    let mut normalized = Vec::with_capacity(source.len());
    let mut index = 0;
    while index < source.len() {
        if source[index] == b'\r' {
            normalized.push(b'\n');
            index += usize::from(source.get(index + 1) == Some(&b'\n')) + 1;
        } else {
            normalized.push(source[index]);
            index += 1;
        }
    }
    normalized
}

fn resolve_entrypoint(root: &Path, relative: &str) -> Result<PathBuf, PackageValidationReport> {
    if relative.is_empty()
        || relative.contains("..")
        || relative.contains(':')
        || relative.starts_with(['/', '\\'])
    {
        return Err(PackageValidationReport::blocking(
            display_path(root),
            "package.unsafe_path",
            None,
            Some("entrypoint".to_owned()),
            None,
            Some(relative.to_owned()),
            "Entrypoints precisam permanecer abaixo da raiz do pacote.",
            Some("Use um caminho relativo sem '..', drive ou raiz absoluta.".to_owned()),
        ));
    }
    Ok(root.join(relative.replace('/', std::path::MAIN_SEPARATOR_STR)))
}

fn validate_asset_files<'a>(
    root: &Path,
    assets: impl Iterator<Item = &'a rivallo_application::AssetReference>,
) -> Result<(), PackageValidationReport> {
    for asset in assets {
        let path = resolve_entrypoint(root, &asset.path)?;
        let bytes = read_bounded(root, &path, MAX_ASSET_BYTES)?;
        if asset.media_type == "image/svg+xml" {
            validate_safe_svg(&bytes, asset, &path)?;
        }
        let checksum_bytes = if asset.media_type == "image/svg+xml" {
            normalize_line_endings(&bytes)
        } else {
            bytes
        };
        let actual = format!("sha256:{:x}", Sha256::digest(&checksum_bytes));
        let declared = if asset.checksum.starts_with("sha256:") {
            asset.checksum.clone()
        } else {
            format!("sha256:{}", asset.checksum)
        };
        if declared != actual {
            return Err(PackageValidationReport::blocking(
                display_path(&path),
                "package.asset_checksum_mismatch",
                Some(asset.id.clone()),
                Some("asset.checksum".to_owned()),
                None,
                Some(asset.checksum.clone()),
                "O checksum do asset precisa corresponder aos bytes locais carregados.",
                Some(format!(
                    "Atualize o checksum para {actual} após revisar o arquivo."
                )),
            ));
        }
    }
    Ok(())
}

fn validate_safe_svg(
    bytes: &[u8],
    asset: &rivallo_application::AssetReference,
    path: &Path,
) -> Result<(), PackageValidationReport> {
    let source = std::str::from_utf8(bytes).map_err(|_| {
        PackageValidationReport::blocking(
            display_path(path),
            "package.unsafe_svg",
            Some(asset.id.clone()),
            Some("asset".to_owned()),
            None,
            None,
            "SVG precisa ser UTF-8 e conter somente marcação vetorial local.",
            Some("Remova conteúdo binário, scripts e referências externas.".to_owned()),
        )
    })?;
    let compact = source.to_ascii_lowercase();
    let forbidden = [
        "<script",
        "javascript:",
        "data:",
        "http:",
        "https:",
        "<!doctype",
        "<!entity",
        "<foreignobject",
        "xlink:href",
        "url(",
    ];
    let event_handler = contains_svg_event_handler(compact.as_bytes());
    let looks_like_svg = compact.contains("<svg") && compact.contains("</svg>");
    if !looks_like_svg || event_handler || forbidden.iter().any(|item| compact.contains(item)) {
        return Err(PackageValidationReport::blocking(
            display_path(path),
            "package.unsafe_svg",
            Some(asset.id.clone()),
            Some("asset".to_owned()),
            None,
            None,
            "SVG contém marcação ativa, referência externa ou estrutura não permitida.",
            Some("Mantenha apenas elementos vetoriais locais sem scripts, eventos, URLs ou entidades.".to_owned()),
        ));
    }
    Ok(())
}

fn contains_svg_event_handler(source: &[u8]) -> bool {
    let mut index = 0;
    while index + 2 < source.len() {
        let boundary = index == 0
            || source[index - 1].is_ascii_whitespace()
            || matches!(source[index - 1], b'<' | b'/');
        if boundary && source[index] == b'o' && source[index + 1] == b'n' {
            let mut cursor = index + 2;
            while cursor < source.len()
                && (source[cursor].is_ascii_alphanumeric()
                    || matches!(source[cursor], b'_' | b'-' | b':'))
            {
                cursor += 1;
            }
            if cursor > index + 2 {
                while cursor < source.len() && source[cursor].is_ascii_whitespace() {
                    cursor += 1;
                }
                if source.get(cursor) == Some(&b'=') {
                    return true;
                }
            }
        }
        index += 1;
    }
    false
}

fn reject_unmaterialized_assets(package: &ContentPackage) -> Result<(), PackageValidationReport> {
    let asset_count = package.manifest.assets.len()
        + package.world.as_ref().map_or(0, |world| world.assets.len())
        + package
            .patches
            .iter()
            .filter(|patch| patch.entity_kind == WorldEntityKind::Asset)
            .count();
    if asset_count == 0 {
        return Ok(());
    }
    Err(PackageValidationReport::blocking(
        package.source_file.clone(),
        "package.asset_payload_missing",
        Some(package.manifest.package_id.clone()),
        Some("assets".to_owned()),
        None,
        Some(asset_count.to_string()),
        "A exportação JSON v1 não transporta os bytes dos assets e não pode criar um pacote quebrado.",
        Some("Remova as referências de asset ou materialize os arquivos por uma ferramenta de autoria que preserve bytes e checksums.".to_owned()),
    ))
}

fn ensure_real_descendant(
    root: &Path,
    path: &Path,
    field: &str,
) -> Result<(), PackageValidationReport> {
    let canonical_root = fs::canonicalize(root)
        .map_err(|error| io_report(root, "package.root_resolution_failed", error))?;
    let canonical_path = fs::canonicalize(path)
        .map_err(|error| io_report(path, "package.file_read_failed", error))?;
    if !canonical_path.starts_with(&canonical_root) || canonical_path == canonical_root {
        return Err(unsafe_path_report(path, field));
    }
    let relative = path
        .strip_prefix(root)
        .map_err(|_| unsafe_path_report(path, field))?;
    let mut current = root.to_path_buf();
    for component in relative.components() {
        current.push(component.as_os_str());
        let metadata = fs::symlink_metadata(&current)
            .map_err(|error| io_report(&current, "package.file_read_failed", error))?;
        if is_link_or_reparse(&metadata) {
            return Err(PackageValidationReport::blocking(
                display_path(&current),
                "package.symlink_or_junction_rejected",
                None,
                Some(field.to_owned()),
                None,
                None,
                "Pacotes públicos não podem atravessar symlinks, junctions ou reparse points.",
                Some("Copie arquivos regulares para dentro da raiz real do pacote.".to_owned()),
            ));
        }
    }
    Ok(())
}

#[cfg(windows)]
fn is_link_or_reparse(metadata: &fs::Metadata) -> bool {
    use std::os::windows::fs::MetadataExt;

    const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x0400;
    metadata.file_type().is_symlink()
        || metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0
}

#[cfg(not(windows))]
fn is_link_or_reparse(metadata: &fs::Metadata) -> bool {
    metadata.file_type().is_symlink()
}

fn unsafe_path_report(path: &Path, field: &str) -> PackageValidationReport {
    PackageValidationReport::blocking(
        display_path(path),
        "package.unsafe_path",
        None,
        Some(field.to_owned()),
        None,
        None,
        "O caminho canônico precisa permanecer abaixo da raiz real do pacote.",
        Some("Remova traversal, symlink ou junction e use um arquivo local regular.".to_owned()),
    )
}

fn ensure_direct_child(root: &Path, child: &Path) -> Result<(), PackageValidationReport> {
    if child.parent() == Some(root) && child != root {
        Ok(())
    } else {
        Err(PackageValidationReport::blocking(
            display_path(child),
            "package.unsafe_target",
            None,
            Some("packageId".to_owned()),
            None,
            None,
            "O destino exportado precisa ser filho direto do catálogo de pacotes.",
            Some("Use um packageId estável sem separadores de caminho.".to_owned()),
        ))
    }
}

fn write_synced(path: &Path, bytes: &[u8]) -> Result<(), PackageValidationReport> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| io_report(parent, "package.export_prepare_failed", error))?;
    }
    let mut file = fs::File::create(path)
        .map_err(|error| io_report(path, "package.export_write_failed", error))?;
    file.write_all(bytes)
        .and_then(|_| file.sync_all())
        .map_err(|error| io_report(path, "package.export_sync_failed", error))
}

fn serialization_report(file: &str, error: serde_json::Error) -> PackageValidationReport {
    PackageValidationReport::blocking(
        file,
        "package.serialization_failed",
        None,
        None,
        None,
        None,
        format!("Não foi possível serializar o pacote: {error}"),
        Some("Corrija valores fora do schema e tente novamente.".to_owned()),
    )
}

fn io_report(path: &Path, code: &str, error: std::io::Error) -> PackageValidationReport {
    PackageValidationReport::blocking(
        display_path(path),
        code,
        None,
        Some("path".to_owned()),
        None,
        None,
        format!("Falha de filesystem: {error}"),
        Some("Verifique permissões, espaço disponível e integridade do caminho.".to_owned()),
    )
}

fn display_path(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

#[cfg(test)]
mod tests {
    use std::time::{SystemTime, UNIX_EPOCH};

    use rivallo_application::{DataPackageType, WorldPackageRepository};

    use super::*;

    fn temporary_root(label: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time after epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("rivallo-world-{label}-{nonce}"))
    }

    fn authoring_manifest(package_id: &str) -> String {
        let mut manifest: PackageManifest =
            serde_json::from_str(OFFICIAL_MANIFEST).expect("manifest fixture");
        manifest.package_id = package_id.to_owned();
        manifest.name = "Community asset fixture".to_owned();
        manifest.content_type = DataPackageType::Mod;
        manifest.assets.clear();
        serde_json::to_string(&manifest).expect("authoring manifest json")
    }

    fn authoring_asset(media_type: &str, path: &str, bytes: Vec<u8>) -> AuthoringAssetUpload {
        AuthoringAssetUpload {
            id: "asset.community.coach.portrait".to_owned(),
            entity_id: "community.coach".to_owned(),
            kind: "coachPortrait".to_owned(),
            path: path.to_owned(),
            media_type: media_type.to_owned(),
            bytes,
            provenance: "Community test".to_owned(),
            rights: "Original content".to_owned(),
        }
    }

    fn empty_mod_source(package_id: &str, version: &str) -> DataPackageAuthoringSource {
        let mut manifest: PackageManifest =
            serde_json::from_str(OFFICIAL_MANIFEST).expect("manifest fixture");
        manifest.package_id = package_id.to_owned();
        manifest.name = "Creator lifecycle fixture".to_owned();
        manifest.version = version.to_owned();
        manifest.content_type = DataPackageType::Mod;
        manifest.checksum =
            "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855".to_owned();
        manifest.assets.clear();
        DataPackageAuthoringSource {
            manifest_json: serde_json::to_string_pretty(&manifest).expect("manifest json"),
            world_json: None,
            patches_json: None,
            assets: Vec::new(),
        }
    }

    #[test]
    fn verified_legacy_draft_entities_migrate_from_replace_to_add_only() {
        let mut source = empty_mod_source("community.example.brasileirao", "1.0.0");
        source.patches_json = Some(
            serde_json::json!([
                {
                    "operation": "replace",
                    "entityKind": "stadium",
                    "targetId": "community.example.stadium.Estádio Horizonte",
                    "entity": { "kind": "stadium", "value": {} },
                    "reason": "legacy"
                },
                {
                    "operation": "replace",
                    "entityKind": "competition",
                    "targetId": "competition.official.brasileirao",
                    "entity": { "kind": "competition", "value": {} },
                    "reason": "legitimate base edit"
                }
            ])
            .to_string(),
        );
        let mut record = CreatorProjectRecord {
            schema_version: CREATOR_PROJECT_SCHEMA_VERSION,
            project_id: "project.community.example.brasileirao".to_owned(),
            name: "Brasileirão".to_owned(),
            mode: CreatorProjectMode::DataStudio,
            status: CreatorProjectStatus::Blocked,
            base_package_id: "official.rivallo.foundation".to_owned(),
            package_id: "community.example.brasileirao".to_owned(),
            version: "1.0.0".to_owned(),
            created_at: 1,
            updated_at: 1,
            last_exported_at: None,
            revision: 1,
            source,
        };
        assert!(migrate_verified_new_entity_operations(&mut record).expect("migration"));
        let patches: Vec<Value> =
            serde_json::from_str(record.source.patches_json.as_deref().expect("patches"))
                .expect("valid patches");
        assert_eq!(patches[0]["operation"], "add");
        assert_eq!(patches[1]["operation"], "replace");
        assert!(!migrate_verified_new_entity_operations(&mut record).expect("idempotent"));
    }

    #[test]
    fn creator_project_bundle_update_and_rollback_are_separate_atomic_lifecycles() {
        let root = temporary_root("creator-lifecycle");
        let packages = root.join("packages");
        let coordinator = WorldDatabaseCoordinator::new(&packages);
        let v1 = empty_mod_source("community.example.lifecycle", "1.0.0");

        let project = coordinator
            .save_creator_project(CreatorProjectDraft {
                project_id: "project.community.example.lifecycle".to_owned(),
                name: "Lifecycle project".to_owned(),
                mode: CreatorProjectMode::DataStudio,
                base_package_id: "official.rivallo.foundation".to_owned(),
                source: v1.clone(),
            })
            .expect("save authoring project");
        assert_eq!(project.revision, 1);
        assert!(!packages.join("community.example.lifecycle").exists());

        let bundle_v1 = root.join("lifecycle-1.0.0.rivmod");
        coordinator
            .export_rivmod(&v1, &bundle_v1)
            .expect("export v1 bundle");
        let exported = coordinator
            .mark_creator_project_exported(
                &project.project_id,
                "community.example.lifecycle",
                "1.0.0",
            )
            .expect("record project export");
        assert_eq!(exported.status, CreatorProjectStatus::Exported);
        assert!(exported.last_exported_at.is_some());
        coordinator
            .install_rivmod(&bundle_v1)
            .expect("install v1 bundle");

        let v2 = empty_mod_source("community.example.lifecycle", "1.0.1");
        let bundle_v2 = root.join("lifecycle-1.0.1.rivmod");
        coordinator
            .export_rivmod(&v2, &bundle_v2)
            .expect("export v2 bundle");
        coordinator
            .install_rivmod(&bundle_v2)
            .expect("install v2 bundle");

        let history = coordinator
            .package_history("community.example.lifecycle")
            .expect("list package history");
        assert!(history.iter().any(|entry| entry.version == "1.0.0"));
        let receipt = coordinator
            .rollback_installed_package("community.example.lifecycle", "1.0.0")
            .expect("rollback to preserved v1");
        assert_eq!(receipt.version, "1.0.0");
        assert_eq!(receipt.status, "Rollback concluído");
        fs::remove_dir_all(root).expect("cleanup fixture");
    }

    #[test]
    fn authoring_png_is_materialized_with_authoritative_checksum() {
        let root = temporary_root("authoring-png");
        let asset = authoring_asset(
            "image/png",
            "assets/coachPortrait/community-coach.png",
            b"\x89PNG\r\n\x1a\ncommunity-image".to_vec(),
        );
        let package = prepare_authoring_package(
            &authoring_manifest("community.example.authoring-png"),
            None,
            None,
            std::slice::from_ref(&asset),
        )
        .expect("valid PNG upload");
        let expected_checksum = format!("sha256:{:x}", Sha256::digest(&asset.bytes));

        assert_eq!(package.manifest.assets.len(), 1);
        assert_eq!(package.manifest.assets[0].checksum, expected_checksum);
        FileWorldPackageRepository::new(&root)
            .write_package_with_assets(&package, std::slice::from_ref(&asset))
            .expect("materialize image atomically");

        let package_root = root.join("community.example.authoring-png");
        assert_eq!(
            fs::read(package_root.join(&asset.path)).expect("materialized image"),
            asset.bytes
        );
        let persisted_manifest: PackageManifest = serde_json::from_slice(
            &fs::read(package_root.join("manifest.json")).expect("persisted manifest"),
        )
        .expect("manifest schema");
        assert_eq!(persisted_manifest.assets[0].checksum, expected_checksum);
        let coordinator = WorldDatabaseCoordinator::new(&root);
        let (source_package_id, runtime_path) = coordinator
            .runtime_asset_location(&persisted_manifest.assets[0])
            .expect("installed asset has a validated runtime location");
        assert_eq!(source_package_id, "community.example.authoring-png");
        assert_eq!(
            PathBuf::from(runtime_path),
            package_root.join(&persisted_manifest.assets[0].path)
        );
        fs::remove_dir_all(root).expect("cleanup fixture");
    }

    #[test]
    fn authoring_rejects_false_mime_and_svg_uploads() {
        let false_mime = authoring_asset(
            "image/png",
            "assets/coachPortrait/community-coach.png",
            b"\xff\xd8\xffnot-a-png".to_vec(),
        );
        let report = prepare_authoring_package(
            &authoring_manifest("community.example.false-mime"),
            None,
            None,
            &[false_mime],
        )
        .expect_err("declared MIME must match the file signature");
        assert_eq!(
            report.diagnostics[0].code,
            "package.authoring_asset_invalid"
        );

        let svg = authoring_asset(
            "image/svg+xml",
            "assets/coachPortrait/community-coach.svg",
            br#"<svg xmlns="http://www.w3.org/2000/svg"/>"#.to_vec(),
        );
        let report = prepare_authoring_package(
            &authoring_manifest("community.example.svg"),
            None,
            None,
            &[svg],
        )
        .expect_err("SVG authoring uploads are never accepted");
        assert_eq!(
            report.diagnostics[0].code,
            "package.authoring_asset_invalid"
        );
    }

    #[test]
    fn authoring_rejects_asset_path_traversal_and_oversize_images() {
        let traversal = authoring_asset(
            "image/png",
            "assets/../outside.png",
            b"\x89PNG\r\n\x1a\nfixture".to_vec(),
        );
        let report = prepare_authoring_package(
            &authoring_manifest("community.example.traversal"),
            None,
            None,
            &[traversal],
        )
        .expect_err("asset path traversal must be rejected");
        assert_eq!(
            report.diagnostics[0].code,
            "package.authoring_asset_invalid"
        );

        let mut bytes = vec![0; MAX_ASSET_BYTES as usize + 1];
        bytes[..8].copy_from_slice(b"\x89PNG\r\n\x1a\n");
        let oversized = authoring_asset(
            "image/png",
            "assets/coachPortrait/community-coach.png",
            bytes,
        );
        let report = prepare_authoring_package(
            &authoring_manifest("community.example.oversized"),
            None,
            None,
            &[oversized],
        )
        .expect_err("individual authoring assets have a hard size limit");
        assert_eq!(
            report.diagnostics[0].code,
            "package.authoring_asset_invalid"
        );
    }

    #[test]
    fn bundled_official_package_is_the_only_automatic_active_authority() {
        let root = temporary_root("active");
        let repository = FileWorldPackageRepository::new(&root);
        let service = WorldDatabaseService::new(repository);

        let resolved = service.resolved().expect("bundled world resolves");

        assert_eq!(resolved.packages.len(), 1);
        assert_eq!(
            resolved.packages[0].package_id,
            "official.rivallo.foundation"
        );
        assert_eq!(resolved.coverage.players, 21);
        assert_eq!(resolved.world.matchday.players.len(), 18);
        assert!(
            !root.exists(),
            "read-only resolution must not create storage"
        );
    }

    #[test]
    fn catalog_rejects_checksum_mismatch_with_structured_diagnostic() {
        let root = temporary_root("checksum");
        let package_root = root.join("community.invalid.checksum");
        fs::create_dir_all(package_root.join("data")).expect("create fixture");
        let mut manifest: PackageManifest =
            serde_json::from_str(OFFICIAL_MANIFEST).expect("manifest fixture");
        manifest.package_id = "community.invalid.checksum".to_owned();
        manifest.content_type = DataPackageType::Mod;
        manifest.checksum =
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".to_owned();
        fs::write(
            package_root.join("manifest.json"),
            serde_json::to_vec_pretty(&manifest).expect("manifest json"),
        )
        .expect("write manifest");
        fs::write(
            package_root.join("data/world.json"),
            OFFICIAL_WORLD.as_bytes(),
        )
        .expect("write content with mismatched checksum");
        let repository = FileWorldPackageRepository::new(&root);

        let report = repository
            .load_available_packages()
            .expect_err("checksum mismatch blocks catalog");

        assert_eq!(report.diagnostics[0].code, "package.checksum_mismatch");
        assert_eq!(report.diagnostics[0].field.as_deref(), Some("checksum"));
        assert!(report.diagnostics[0].suggestion.is_some());
        fs::remove_dir_all(root).expect("cleanup fixture");
    }

    #[test]
    fn editor_export_is_atomic_and_does_not_activate_the_mod() {
        let root = temporary_root("export");
        let repository = FileWorldPackageRepository::new(&root);
        let mut package = repository.bundled_official().expect("official fixture");
        package.manifest.package_id = "community.example.empty-mod".to_owned();
        package.manifest.name = "Empty editor round-trip mod".to_owned();
        package.manifest.content_type = DataPackageType::Mod;
        package.world = None;
        package.patches.clear();
        package.manifest.checksum =
            "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855".to_owned();

        repository.save_package(&package).expect("atomic export");
        let catalog = repository
            .load_available_packages()
            .expect("exported package reloads");
        let active = repository.load_active_packages().expect("active packages");

        assert_eq!(catalog.len(), 2);
        assert_eq!(active.len(), 1);
        assert!(
            root.join("community.example.empty-mod/manifest.json")
                .exists()
        );
        assert!(!root.join(".community.example.empty-mod.tmp").exists());
        assert!(!root.join(".community.example.empty-mod.bak").exists());
        fs::remove_dir_all(root).expect("cleanup fixture");
    }

    #[test]
    fn export_materializes_declared_entrypoints_instead_of_fixed_paths() {
        let root = temporary_root("custom-entrypoints");
        let repository = FileWorldPackageRepository::new(&root);
        let mut package = repository.bundled_official().expect("official fixture");
        package.manifest.package_id = "community.example.custom-entrypoints".to_owned();
        package.manifest.entrypoints.world = "content/database.json".to_owned();
        package.manifest.entrypoints.patches = Some("overrides/patch-set.json".to_owned());
        package.world.as_mut().expect("world").assets.clear();
        package.patches.push(PackagePatch {
            operation: rivallo_application::PackagePatchOperation::Remove,
            entity_kind: WorldEntityKind::Trait,
            target_id: "official.rivallo.trait.placeholder".to_owned(),
            entity: None,
            reason: "entrypoint fixture".to_owned(),
        });

        repository
            .save_package(&package)
            .expect("custom entrypoints export");

        let package_root = root.join("community.example.custom-entrypoints");
        assert!(package_root.join("content/database.json").is_file());
        assert!(package_root.join("overrides/patch-set.json").is_file());
        assert!(!package_root.join("data/world.json").exists());
        assert!(!package_root.join("data/patches.json").exists());
        fs::remove_dir_all(root).expect("cleanup fixture");
    }

    #[test]
    fn entrypoints_cannot_escape_the_package_root() {
        let root = temporary_root("traversal");
        let report = resolve_entrypoint(&root, "../outside/world.json")
            .expect_err("path traversal must be rejected");

        assert_eq!(report.diagnostics[0].code, "package.unsafe_path");
        assert_eq!(report.diagnostics[0].field.as_deref(), Some("entrypoint"));
    }

    #[test]
    fn active_svg_assets_are_rejected_before_catalog_acceptance() {
        let root = temporary_root("unsafe-svg");
        fs::create_dir_all(root.join("assets")).expect("create asset directory");
        fs::write(
            root.join("assets/unsafe.svg"),
            br#"<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>"#,
        )
        .expect("write unsafe svg fixture");
        let asset = rivallo_application::AssetReference {
            id: "asset.unsafe.svg".to_owned(),
            entity_id: None,
            kind: "nationFlag".to_owned(),
            path: "assets/unsafe.svg".to_owned(),
            media_type: "image/svg+xml".to_owned(),
            checksum: "test-fixture".to_owned(),
            provenance: "test".to_owned(),
            rights: "test".to_owned(),
            private_use: false,
        };

        let report = validate_asset_files(&root, std::iter::once(&asset))
            .expect_err("local SVG must be rejected");
        assert_eq!(report.diagnostics[0].code, "package.unsafe_svg");
        assert_eq!(
            report.diagnostics[0].entity_id.as_deref(),
            Some("asset.unsafe.svg")
        );
        fs::remove_dir_all(root).expect("cleanup fixture");
    }

    #[test]
    fn safe_svg_checksum_is_portable_across_line_endings() {
        let lf = b"<svg xmlns=\"http://www.w3.org/2000/svg\">\n<path d=\"M0 0h1v1z\"/>\n</svg>";
        let crlf =
            b"<svg xmlns=\"http://www.w3.org/2000/svg\">\r\n<path d=\"M0 0h1v1z\"/>\r\n</svg>";
        assert_eq!(
            Sha256::digest(normalize_line_endings(lf)),
            Sha256::digest(normalize_line_endings(crlf))
        );
    }

    #[test]
    fn svg_event_handlers_are_rejected_even_with_whitespace_before_equals() {
        assert!(contains_svg_event_handler(b"<svg onload=\"run()\"></svg>"));
        assert!(contains_svg_event_handler(
            b"<svg onload \n = \"run()\"></svg>"
        ));
        assert!(!contains_svg_event_handler(
            b"<svg xmlns=\"http-disabled-by-separate-rule\"><path d=\"M0 0\"/></svg>"
        ));
    }

    #[test]
    fn json_checksum_is_canonical_in_v2_and_lf_portable_in_v1() {
        let left = br#"{"b":[2,1],"a":{"known":true}}"#;
        let equivalent = b"{\r\n  \"a\": { \"known\": true },\r\n  \"b\": [2, 1]\r\n}";
        assert_eq!(
            package_content_checksum(2, left, &[]).expect("canonical left"),
            package_content_checksum(2, equivalent, &[]).expect("canonical equivalent")
        );
        assert_ne!(
            package_content_checksum(2, left, &[]).expect("canonical left"),
            package_content_checksum(2, br#"{"b":[1,2],"a":{"known":true}}"#, &[])
                .expect("meaningfully different")
        );
        assert_eq!(
            package_content_checksum(1, b"{\n  \"a\": 1\n}", &[]).expect("v1 lf"),
            package_content_checksum(1, b"{\r\n  \"a\": 1\r\n}", &[]).expect("v1 crlf")
        );
    }

    #[test]
    fn local_asset_checksum_is_verified_against_exact_bytes() {
        let root = temporary_root("asset-checksum");
        fs::create_dir_all(root.join("assets")).expect("create asset directory");
        fs::write(root.join("assets/portrait.webp"), b"not-a-real-webp")
            .expect("write asset fixture");
        let asset = rivallo_application::AssetReference {
            id: "asset.invalid.checksum".to_owned(),
            entity_id: None,
            kind: "playerPortrait".to_owned(),
            path: "assets/portrait.webp".to_owned(),
            media_type: "image/webp".to_owned(),
            checksum: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
                .to_owned(),
            provenance: "test".to_owned(),
            rights: "test".to_owned(),
            private_use: false,
        };

        let report = validate_asset_files(&root, std::iter::once(&asset))
            .expect_err("asset checksum mismatch must be rejected");

        assert_eq!(
            report.diagnostics[0].code,
            "package.asset_checksum_mismatch"
        );
        assert!(report.diagnostics[0].suggestion.is_some());
        fs::remove_dir_all(root).expect("cleanup fixture");
    }

    #[test]
    fn editor_export_with_unmaterialized_assets_is_rejected_without_mutation() {
        let root = temporary_root("asset-export");
        let repository = FileWorldPackageRepository::new(&root);
        let mut package = repository.bundled_official().expect("official fixture");
        package.manifest.package_id = "community.example.asset-export".to_owned();

        let report = repository
            .save_package(&package)
            .expect_err("JSON-only export cannot materialize asset bytes");

        assert_eq!(report.diagnostics[0].code, "package.asset_payload_missing");
        assert!(
            !root.exists(),
            "rejection must happen before catalog mutation"
        );
    }

    #[test]
    fn private_development_package_is_isolated_from_the_public_catalog() {
        let root = temporary_root("private-package");
        let package_root = root.join("dev.synthetic-league");
        fs::create_dir_all(&package_root).expect("create private fixture");
        let mut manifest: PackageManifest =
            serde_json::from_str(OFFICIAL_MANIFEST).expect("manifest fixture");
        manifest.package_id = "dev.synthetic-league".to_owned();
        manifest.visibility = PackageVisibility::PrivateDevelopment;
        fs::write(
            package_root.join("manifest.json"),
            serde_json::to_vec_pretty(&manifest).expect("manifest json"),
        )
        .expect("write private manifest");

        let report = FileWorldPackageRepository::new(&root)
            .load_available_packages()
            .expect_err("private package must remain isolated");
        assert_eq!(
            report.diagnostics[0].code,
            "package.private_development_isolated"
        );
        fs::remove_dir_all(root).expect("cleanup fixture");
    }

    #[test]
    fn private_development_export_is_rejected_before_catalog_mutation() {
        let root = temporary_root("private-export");
        let repository = FileWorldPackageRepository::new(&root);
        let mut package = repository.bundled_official().expect("official fixture");
        package.manifest.package_id = "community.private.fixture".to_owned();
        package.manifest.visibility = PackageVisibility::PrivateDevelopment;

        let report = repository
            .save_package(&package)
            .expect_err("private export must remain isolated");

        assert_eq!(
            report.diagnostics[0].code,
            "package.private_development_isolated"
        );
        assert!(
            !root.exists(),
            "rejection must happen before catalog mutation"
        );
    }

    #[test]
    fn private_catalog_requires_an_isolated_guarded_non_public_configuration() {
        let public_root = temporary_root("public-catalog");
        let nested_private_root = public_root.join("private");
        let report = WorldDatabaseCoordinator::new(&public_root)
            .with_private_catalog(PrivateCatalogConfig {
                root: nested_private_root,
                capability: PrivateCatalogCapability::Development,
                private_guard_passed: true,
                public_build: false,
            })
            .err()
            .expect("overlapping roots must be rejected");
        assert_eq!(
            report.diagnostics[0].code,
            "package.private_catalog_unauthorized"
        );
        assert_eq!(report.diagnostics[0].file, "<private-catalog>");

        let private_root = temporary_root("release-private-catalog");
        let report = WorldDatabaseCoordinator::new(&public_root)
            .with_private_catalog(PrivateCatalogConfig {
                root: private_root,
                capability: PrivateCatalogCapability::Uat,
                private_guard_passed: true,
                public_build: true,
            })
            .err()
            .expect("public builds must reject private capability");
        assert_eq!(
            report.diagnostics[0].code,
            "package.private_catalog_unauthorized"
        );
        assert!(!format!("{report:?}").contains(public_root.to_string_lossy().as_ref()));
    }

    #[test]
    fn authorized_uat_catalog_discovers_and_sandboxes_only_its_private_package() {
        let public_root = temporary_root("authorized-public");
        let private_root = temporary_root("authorized-private");
        let private_repository =
            FileWorldPackageRepository::new_authorized(&private_root, PackageCatalogScope::Uat);
        let mut private_package = private_repository
            .bundled_official()
            .expect("official package fixture");
        private_package.manifest.package_id = "dev.synthetic-uat-package".to_owned();
        private_package.manifest.name = "Synthetic UAT package".to_owned();
        private_package.manifest.schema_version = 2;
        private_package.manifest.visibility = PackageVisibility::PrivateDevelopment;
        private_package.manifest.content_type = rivallo_application::DataPackageType::Mod;
        private_package.manifest.assets.clear();
        private_package.manifest.entrypoints.patches = Some("data/patches.json".to_owned());
        let person = serde_json::json!({
            "personId": "synthetic.person.uat",
            "externalIds": [{ "source": "synthetic-uat", "externalId": "uat-person-1" }],
            "fullName": "Pessoa Sintética UAT",
            "knownName": null,
            "birthDate": null,
            "heightCm": null,
            "weightKg": null,
            "preferredFoot": null,
            "nationalityId": null,
            "secondNationalityId": null,
            "detailedPosition": null,
            "shirtNumber": null,
            "contract": null,
            "roles": [
                { "roleId": "synthetic.player.uat", "kind": "player", "clubId": "aurora-fc", "title": null },
                { "roleId": "synthetic.coach.uat", "kind": "coach", "clubId": "aurora-fc", "title": "Função UAT" },
                { "roleId": "synthetic.staff.uat", "kind": "staffMember", "clubId": "aurora-fc", "title": "Comissão UAT" }
            ],
            "provenance": [{
                "source": "synthetic-uat",
                "sourceRecordId": "uat-person-1",
                "observedAt": null,
                "verificationStatus": "pending",
                "fields": ["fullName"]
            }],
            "readiness": {
                "identity": "partialFactualIdentity",
                "structural": "structurallyValid",
                "runtimeProfile": "runtimeProfileBlocked",
                "evaluation": "awaitingEvaluation",
                "gameplay": "gameplayBlocked",
                "blockers": ["person.runtime_profile_blocked", "person.gameplay_blocked"]
            }
        });
        let mut competition =
            private_package.world.as_ref().expect("world").competitions[0].clone();
        competition.seasons[0].player_registrations.push(
            serde_json::from_value(serde_json::json!({
                "registrationId": "synthetic.registration.uat",
                "playerId": "synthetic.player.uat",
                "clubId": "aurora-fc",
                "shirtNumber": null,
                "contractReference": null,
                "eligible": false
            }))
            .expect("synthetic registration"),
        );
        private_package.world = None;
        private_package.patches = vec![
            serde_json::from_value(serde_json::json!({
                "operation": "add",
                "entityKind": "person",
                "targetId": "synthetic.person.uat",
                "entity": { "kind": "person", "value": person },
                "reason": "Synthetic partial factual UAT import"
            }))
            .expect("person patch"),
            serde_json::from_value(serde_json::json!({
                "operation": "replace",
                "entityKind": "competition",
                "targetId": competition.id,
                "entity": { "kind": "competition", "value": competition },
                "reason": "Synthetic registration UAT import"
            }))
            .expect("registration patch"),
        ];
        private_repository
            .save_package(&private_package)
            .expect("write isolated private package");

        let public = WorldDatabaseCoordinator::new(&public_root);
        assert!(
            public
                .catalog()
                .expect("public catalog")
                .iter()
                .all(|entry| entry.manifest.package_id != "dev.synthetic-uat-package")
        );
        let coordinator = public
            .with_private_catalog(PrivateCatalogConfig {
                root: private_root.clone(),
                capability: PrivateCatalogCapability::Uat,
                private_guard_passed: true,
                public_build: false,
            })
            .expect("authorized UAT catalog");
        let catalog = coordinator.private_catalog().expect("private catalog");
        let entry = catalog
            .iter()
            .find(|entry| entry.manifest.package_id == "dev.synthetic-uat-package")
            .expect("private package discovered");
        assert_eq!(entry.catalog_scope, PackageCatalogScope::Uat);
        assert!(!entry.selectable);

        let sandbox = coordinator
            .resolve_private_selection(&[
                "official.rivallo.foundation".to_owned(),
                "dev.synthetic-uat-package".to_owned(),
            ])
            .expect("private in-memory sandbox");
        assert_eq!(sandbox.packages.len(), 2);
        assert!(sandbox.packages.iter().any(|package| {
            package.package_id == "dev.synthetic-uat-package"
                && package.visibility == PackageVisibility::PrivateDevelopment
        }));
        assert_eq!(sandbox.world.people.len(), 1);
        assert_eq!(sandbox.world.people[0].roles.len(), 3);
        assert!(
            sandbox
                .world
                .profiles
                .players
                .iter()
                .all(|profile| { profile.identity.entity_id != "synthetic.player.uat" })
        );
        assert!(
            !public_root.exists(),
            "sandbox must not mutate the public catalog"
        );

        fs::remove_dir_all(private_root).expect("cleanup private UAT fixture");
    }

    #[cfg(unix)]
    #[test]
    fn symlinked_asset_cannot_escape_package_root() {
        use std::os::unix::fs::symlink;

        let root = temporary_root("symlink-escape");
        let outside = temporary_root("symlink-outside");
        fs::create_dir_all(root.join("assets")).expect("create package asset directory");
        fs::create_dir_all(&outside).expect("create outside directory");
        fs::write(outside.join("portrait.webp"), b"outside").expect("write outside file");
        symlink(
            outside.join("portrait.webp"),
            root.join("assets/portrait.webp"),
        )
        .expect("create symlink fixture");
        let report = read_bounded(&root, &root.join("assets/portrait.webp"), MAX_ASSET_BYTES)
            .expect_err("symlink escape must be rejected");

        assert!(matches!(
            report.diagnostics[0].code.as_str(),
            "package.unsafe_path" | "package.symlink_or_junction_rejected"
        ));
        fs::remove_dir_all(root).expect("cleanup package fixture");
        fs::remove_dir_all(outside).expect("cleanup outside fixture");
    }

    #[cfg(windows)]
    #[test]
    fn symlinked_asset_cannot_escape_package_root() {
        use std::io::ErrorKind;
        use std::os::windows::fs::symlink_file;

        let root = temporary_root("symlink-escape");
        let outside = temporary_root("symlink-outside");
        fs::create_dir_all(root.join("assets")).expect("create package asset directory");
        fs::create_dir_all(&outside).expect("create outside directory");
        fs::write(outside.join("portrait.webp"), b"outside").expect("write outside file");
        if let Err(error) = symlink_file(
            outside.join("portrait.webp"),
            root.join("assets/portrait.webp"),
        ) {
            fs::remove_dir_all(root).expect("cleanup package fixture");
            fs::remove_dir_all(outside).expect("cleanup outside fixture");
            if error.kind() == ErrorKind::PermissionDenied || error.raw_os_error() == Some(1314) {
                return;
            }
            panic!("create symlink fixture: {error}");
        }
        let report = read_bounded(&root, &root.join("assets/portrait.webp"), MAX_ASSET_BYTES)
            .expect_err("symlink escape must be rejected");

        assert!(matches!(
            report.diagnostics[0].code.as_str(),
            "package.unsafe_path" | "package.symlink_or_junction_rejected"
        ));
        fs::remove_dir_all(root).expect("cleanup package fixture");
        fs::remove_dir_all(outside).expect("cleanup outside fixture");
    }
}
