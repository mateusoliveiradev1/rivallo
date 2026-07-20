use rivallo_domain::{
    ContentPackage, PackageManifest, PackageValidationReport, PackageVisibility,
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
        Ok(self
            .repository
            .load_available_packages()?
            .into_iter()
            .map(|package| DataPackageCatalogEntry {
                active: active_ids.contains(&package.manifest.package_id),
                validation: validate_package(&package),
                manifest: package.manifest,
            })
            .collect())
    }

    pub fn validate_candidate(&self, package: &ContentPackage) -> PackageValidationReport {
        validate_package(package)
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
        let validation = validate_package(package);
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

    use rivallo_domain::{DataPackageType, PackageVisibility, WorldPackageData};

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
}
