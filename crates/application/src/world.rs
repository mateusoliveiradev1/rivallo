use rivallo_domain::{
    ContentPackage, DataPackageType, PackageManifest, PackageValidationReport, PackageVisibility,
    ResolvedWorldDatabase, resolve_world_packages, validate_package,
};
use serde::{Deserialize, Serialize};

pub trait WorldPackageRepository {
    fn load_active_packages(&self) -> Result<Vec<ContentPackage>, PackageValidationReport>;
    fn load_available_packages(&self) -> Result<Vec<ContentPackage>, PackageValidationReport>;
    fn save_package(&self, package: &ContentPackage) -> Result<(), PackageValidationReport>;
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DataPackageCatalogEntry {
    pub manifest: PackageManifest,
    pub active: bool,
    pub validation: PackageValidationReport,
}

pub struct WorldDatabaseService<R> {
    repository: R,
}

impl<R: WorldPackageRepository> WorldDatabaseService<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }

    pub fn resolved(&self) -> Result<ResolvedWorldDatabase, PackageValidationReport> {
        resolve_world_packages(self.repository.load_active_packages()?)
    }

    pub fn catalog(&self) -> Result<Vec<DataPackageCatalogEntry>, PackageValidationReport> {
        let active_ids = self
            .repository
            .load_active_packages()?
            .into_iter()
            .map(|package| package.manifest.package_id)
            .collect::<std::collections::HashSet<_>>();
        let packages = self
            .repository
            .load_available_packages()?
            .into_iter()
            .map(|package| {
                let validation = self.validate_candidate(&package);
                DataPackageCatalogEntry {
                    active: active_ids.contains(&package.manifest.package_id),
                    validation,
                    manifest: package.manifest,
                }
            })
            .collect::<Vec<_>>();
        Ok(packages)
    }

    pub fn resolve_selection(
        &self,
        package_ids: &[String],
    ) -> Result<ResolvedWorldDatabase, PackageValidationReport> {
        let available = self.repository.load_available_packages()?;
        let selected = package_ids
            .iter()
            .filter_map(|package_id| {
                available
                    .iter()
                    .find(|package| package.manifest.package_id == *package_id)
                    .cloned()
            })
            .collect::<Vec<_>>();
        if selected.len() != package_ids.len() {
            return Err(PackageValidationReport::blocking(
                "catalog".to_owned(),
                "package.selection_missing",
                None,
                Some("packageIds".to_owned()),
                None,
                None,
                "Um pacote selecionado não está mais disponível no catálogo.",
                Some(
                    "Atualize o catálogo e revise a seleção antes de criar a carreira.".to_owned(),
                ),
            ));
        }
        resolve_world_packages(selected)
    }

    pub fn validate_candidate(&self, package: &ContentPackage) -> PackageValidationReport {
        let validation = validate_package(package);
        if !validation.valid {
            return validation;
        }
        let packages = if package.manifest.content_type == DataPackageType::Base {
            vec![package.clone()]
        } else {
            let mut active = match self.repository.load_active_packages() {
                Ok(active) => active,
                Err(report) => return report,
            };
            active.retain(|candidate| candidate.manifest.package_id != package.manifest.package_id);
            active.push(package.clone());
            active
        };
        match resolve_world_packages(packages) {
            Ok(resolved) => resolved.validation,
            Err(report) => report,
        }
    }

    pub fn export_candidate(
        &self,
        package: &ContentPackage,
    ) -> Result<PackageValidationReport, PackageValidationReport> {
        if package.manifest.package_id == "dev.example.league-2026"
            || package.manifest.visibility == PackageVisibility::PrivateDevelopment
        {
            return Err(PackageValidationReport::blocking(
                package.source_file.clone(),
                "package.private_development_isolated",
                Some(package.manifest.package_id.clone()),
                Some("visibility".to_owned()),
                None,
                Some(format!("{:?}", package.manifest.visibility)),
                "Pacotes privados de desenvolvimento não podem ser exportados ao catálogo público/local padrão.",
                Some("Use somente o ambiente privado explicitamente isolado; o export público aceita visibility=public.".to_owned()),
            ));
        }
        let validation = self.validate_candidate(package);
        if !validation.valid {
            return Err(validation);
        }
        self.repository.save_package(package)?;
        Ok(validation)
    }
}

#[cfg(test)]
mod tests {
    use std::{cell::Cell, rc::Rc};

    use rivallo_domain::{
        DataPackageType, PackageDependency, PackagePatchOperation, PackageVisibility, WorldEntity,
        WorldEntityKind, WorldPackageData,
    };

    use super::*;

    #[derive(Clone)]
    struct RepositoryFixture {
        active: Vec<ContentPackage>,
        available: Vec<ContentPackage>,
        save_count: Rc<Cell<usize>>,
    }

    impl WorldPackageRepository for RepositoryFixture {
        fn load_active_packages(&self) -> Result<Vec<ContentPackage>, PackageValidationReport> {
            Ok(self.active.clone())
        }

        fn load_available_packages(&self) -> Result<Vec<ContentPackage>, PackageValidationReport> {
            Ok(self.available.clone())
        }

        fn save_package(&self, _package: &ContentPackage) -> Result<(), PackageValidationReport> {
            self.save_count.set(self.save_count.get() + 1);
            Ok(())
        }
    }

    fn official_package() -> ContentPackage {
        ContentPackage {
            manifest: serde_json::from_str(include_str!(
                "../../../data/packages/official.rivallo.foundation/manifest.json"
            ))
            .expect("official manifest"),
            world: Some(
                serde_json::from_str::<WorldPackageData>(include_str!(
                    "../../../data/packages/official.rivallo.foundation/data/world.json"
                ))
                .expect("official world"),
            ),
            patches: Vec::new(),
            source_file: "official.rivallo.foundation/manifest.json".to_owned(),
        }
    }

    #[test]
    fn catalog_marks_only_repository_active_packages_as_active() {
        let active = official_package();
        let mut inactive = active.clone();
        inactive.manifest.package_id = "community.example.catalog-mod".to_owned();
        inactive.manifest.content_type = DataPackageType::Mod;
        inactive.manifest.visibility = PackageVisibility::Public;
        inactive.world = None;
        let service = WorldDatabaseService::new(RepositoryFixture {
            active: vec![active.clone()],
            available: vec![active, inactive],
            save_count: Rc::new(Cell::new(0)),
        });

        let catalog = service.catalog().expect("catalog");
        assert_eq!(catalog.len(), 2);
        assert!(catalog[0].active);
        assert!(!catalog[1].active);
    }

    #[test]
    fn invalid_candidate_is_never_persisted() {
        let mut invalid = official_package();
        invalid.manifest.package_id = "invalid id with spaces".to_owned();
        let repository = RepositoryFixture {
            active: vec![official_package()],
            available: Vec::new(),
            save_count: Rc::new(Cell::new(0)),
        };
        let service = WorldDatabaseService::new(repository.clone());

        let report = service
            .export_candidate(&invalid)
            .expect_err("invalid package cannot be exported");
        assert!(!report.valid);
        assert_eq!(repository.save_count.get(), 0);
    }

    #[test]
    fn private_development_candidate_is_rejected_before_repository_mutation() {
        let mut private = official_package();
        private.manifest.package_id = "community.private.fixture".to_owned();
        private.manifest.visibility = PackageVisibility::PrivateDevelopment;
        let repository = RepositoryFixture {
            active: vec![official_package()],
            available: Vec::new(),
            save_count: Rc::new(Cell::new(0)),
        };
        let service = WorldDatabaseService::new(repository.clone());

        let report = service
            .export_candidate(&private)
            .expect_err("private package cannot enter the public catalog");

        assert_eq!(
            report.diagnostics[0].code,
            "package.private_development_isolated"
        );
        assert_eq!(repository.save_count.get(), 0);
    }

    #[test]
    fn mod_candidate_is_resolved_against_the_active_base_before_validation_passes() {
        let base = official_package();
        let mut broken_profile = base.world.as_ref().expect("world").profiles.players[0].clone();
        broken_profile.identity.club_id = "club.missing".to_owned();
        let mut candidate = base.clone();
        candidate.manifest.package_id = "community.uat.broken-reference".to_owned();
        candidate.manifest.content_type = DataPackageType::Mod;
        candidate.manifest.dependencies = vec![PackageDependency {
            package_id: "official.rivallo.foundation".to_owned(),
            version_requirement: ">=1.0.0 <2.0.0".to_owned(),
            optional: false,
        }];
        candidate.manifest.entrypoints.patches = Some("data/patches.json".to_owned());
        candidate.manifest.checksum =
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".to_owned();
        candidate.world = None;
        candidate.patches = vec![rivallo_domain::PackagePatch {
            operation: PackagePatchOperation::Replace,
            entity_kind: WorldEntityKind::PlayerProfile,
            target_id: broken_profile.identity.entity_id.clone(),
            entity: Some(WorldEntity::PlayerProfile(broken_profile)),
            reason: "UAT broken reference".to_owned(),
        }];
        let service = WorldDatabaseService::new(RepositoryFixture {
            active: vec![base],
            available: Vec::new(),
            save_count: Rc::new(Cell::new(0)),
        });

        let report = service.validate_candidate(&candidate);

        assert!(!report.valid);
        assert!(report.diagnostics.iter().any(|diagnostic| {
            diagnostic.code == "world.broken_club_reference"
                && diagnostic.field.as_deref() == Some("identity.clubId")
                && diagnostic.reference.as_deref() == Some("club.missing")
        }));
    }
}
