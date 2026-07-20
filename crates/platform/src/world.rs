use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

use rivallo_application::{
    ContentPackage, DataPackageCatalogEntry, PackageManifest, PackagePatch,
    PackageValidationReport, PackageVisibility, ResolvedWorldDatabase, WorldDatabaseService,
    WorldEntityKind, WorldPackageData, WorldPackageRepository,
};
use sha2::{Digest, Sha256};

const MAX_MANIFEST_BYTES: u64 = 256 * 1024;
const MAX_WORLD_BYTES: u64 = 16 * 1024 * 1024;
const MAX_PATCH_BYTES: u64 = 4 * 1024 * 1024;
const MAX_ASSET_BYTES: u64 = 16 * 1024 * 1024;

const OFFICIAL_MANIFEST: &str =
    include_str!("../../../data/packages/official.rivallo.foundation/manifest.json");
const OFFICIAL_WORLD: &str =
    include_str!("../../../data/packages/official.rivallo.foundation/data/world.json");

pub struct FileWorldPackageRepository {
    user_packages_root: PathBuf,
}

impl FileWorldPackageRepository {
    pub fn new(user_packages_root: impl Into<PathBuf>) -> Self {
        Self {
            user_packages_root: user_packages_root.into(),
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
        if manifest.package_id == "dev.example.league-2026"
            || manifest.visibility == PackageVisibility::PrivateDevelopment
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
        let mut content_bytes = world_bytes.unwrap_or_default();
        content_bytes.extend(patch_bytes.unwrap_or_default());
        verify_checksum(&manifest, &content_bytes, &display_path(&manifest_path))?;
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
        reject_public_export(package)?;
        reject_unmaterialized_assets(package)?;
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
        let mut manifest = package.manifest.clone();
        let mut content = world_bytes;
        content.extend(patch_bytes);
        manifest.checksum = format!("sha256:{:x}", Sha256::digest(&content));
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
}

impl WorldDatabaseCoordinator {
    pub fn new(user_packages_root: impl Into<PathBuf>) -> Self {
        Self {
            service: WorldDatabaseService::new(FileWorldPackageRepository::new(user_packages_root)),
        }
    }

    pub fn resolved(&self) -> Result<ResolvedWorldDatabase, PackageValidationReport> {
        self.service.resolved()
    }

    pub fn catalog(&self) -> Result<Vec<DataPackageCatalogEntry>, PackageValidationReport> {
        self.service.catalog()
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
    ) -> PackageValidationReport {
        match parse_authoring_package(manifest_json, world_json, patches_json) {
            Ok(package) => self.service.validate_candidate(&package),
            Err(report) => report,
        }
    }

    pub fn export_authoring(
        &self,
        manifest_json: &str,
        world_json: Option<&str>,
        patches_json: Option<&str>,
    ) -> Result<PackageValidationReport, PackageValidationReport> {
        let package = parse_authoring_package(manifest_json, world_json, patches_json)?;
        self.service.export_candidate(&package)
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
    content: &[u8],
    file: &str,
) -> Result<(), PackageValidationReport> {
    let actual = format!("sha256:{:x}", Sha256::digest(content));
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
            return Err(PackageValidationReport::blocking(
                display_path(&path),
                "package.local_svg_unsupported",
                Some(asset.id.clone()),
                Some("asset.mediaType".to_owned()),
                None,
                Some(asset.media_type.clone()),
                "SVG local não é aceito no catálogo de mods v1 porque sanitização parcial não é uma fronteira de segurança.",
                Some("Converta o asset para PNG, WebP ou JPEG.".to_owned()),
            ));
        }
        let actual = format!("sha256:{:x}", Sha256::digest(&bytes));
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

fn reject_public_export(package: &ContentPackage) -> Result<(), PackageValidationReport> {
    if package.manifest.package_id != "dev.example.league-2026"
        && package.manifest.visibility != PackageVisibility::PrivateDevelopment
    {
        return Ok(());
    }
    Err(PackageValidationReport::blocking(
        package.source_file.clone(),
        "package.private_development_isolated",
        Some(package.manifest.package_id.clone()),
        Some("visibility".to_owned()),
        None,
        Some(format!("{:?}", package.manifest.visibility)),
        "Pacotes privados de desenvolvimento não podem ser gravados no catálogo público/local padrão.",
        Some("Use o ambiente privado explicitamente isolado.".to_owned()),
    ))
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
    fn all_local_svg_assets_are_rejected_before_catalog_acceptance() {
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
        assert_eq!(report.diagnostics[0].code, "package.local_svg_unsupported");
        assert_eq!(
            report.diagnostics[0].entity_id.as_deref(),
            Some("asset.unsafe.svg")
        );
        fs::remove_dir_all(root).expect("cleanup fixture");
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
        let package_root = root.join("dev.example.league-2026");
        fs::create_dir_all(&package_root).expect("create private fixture");
        let mut manifest: PackageManifest =
            serde_json::from_str(OFFICIAL_MANIFEST).expect("manifest fixture");
        manifest.package_id = "dev.example.league-2026".to_owned();
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
