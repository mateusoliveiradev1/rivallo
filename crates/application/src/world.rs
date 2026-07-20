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

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PackageCatalogScope {
    Public,
    PrivateDevelopment,
    Uat,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DataPackageCatalogEntry {
    pub manifest: PackageManifest,
    pub active: bool,
    pub validation: PackageValidationReport,
    pub catalog_scope: PackageCatalogScope,
    pub selectable: bool,
}

pub struct WorldDatabaseService<R> {
    repository: R,
    catalog_scope: PackageCatalogScope,
}

impl<R: WorldPackageRepository> WorldDatabaseService<R> {
    pub fn new(repository: R) -> Self {
        Self {
            repository,
            catalog_scope: PackageCatalogScope::Public,
        }
    }

    pub fn new_authorized(repository: R, catalog_scope: PackageCatalogScope) -> Self {
        Self {
            repository,
            catalog_scope,
        }
    }

    pub fn resolved(&self) -> Result<ResolvedWorldDatabase, PackageValidationReport> {
        resolve_world_packages(self.visible_packages(self.repository.load_active_packages()?))
    }

    pub fn catalog(&self) -> Result<Vec<DataPackageCatalogEntry>, PackageValidationReport> {
        let active_ids = self
            .repository
            .load_active_packages()
            .map(|packages| self.visible_packages(packages))?
            .into_iter()
            .map(|package| package.manifest.package_id)
            .collect::<std::collections::HashSet<_>>();
        let packages = self
            .repository
            .load_available_packages()
            .map(|packages| self.visible_packages(packages))?
            .into_iter()
            .map(|package| {
                let validation = self.validate_candidate(&package);
                let selectable = validation.valid && package_gameplay_ready(&package);
                DataPackageCatalogEntry {
                    active: active_ids.contains(&package.manifest.package_id),
                    validation,
                    manifest: package.manifest,
                    catalog_scope: self.catalog_scope,
                    selectable,
                }
            })
            .collect::<Vec<_>>();
        Ok(packages)
    }

    pub fn resolve_selection(
        &self,
        package_ids: &[String],
    ) -> Result<ResolvedWorldDatabase, PackageValidationReport> {
        let available = self.visible_packages(self.repository.load_available_packages()?);
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
                Ok(active) => self.visible_packages(active),
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
        let private_package = package.manifest.visibility == PackageVisibility::PrivateDevelopment;
        let visibility_allowed = match self.catalog_scope {
            PackageCatalogScope::Public => !private_package,
            PackageCatalogScope::PrivateDevelopment | PackageCatalogScope::Uat => private_package,
        };
        if !visibility_allowed {
            return Err(PackageValidationReport::blocking(
                package.source_file.clone(),
                "package.private_development_isolated",
                Some(package.manifest.package_id.clone()),
                Some("visibility".to_owned()),
                None,
                Some(format!("{:?}", package.manifest.visibility)),
                "A visibilidade do pacote não corresponde ao catálogo explicitamente autorizado.",
                Some("Use o catálogo público para pacotes públicos ou uma raiz privada dev/UAT autorizada.".to_owned()),
            ));
        }
        let validation = self.validate_candidate(package);
        if !validation.valid {
            return Err(validation);
        }
        self.repository.save_package(package)?;
        Ok(validation)
    }

    fn visible_packages(&self, packages: Vec<ContentPackage>) -> Vec<ContentPackage> {
        packages
            .into_iter()
            .filter(|package| match self.catalog_scope {
                PackageCatalogScope::Public => {
                    package.manifest.visibility == PackageVisibility::Public
                }
                PackageCatalogScope::PrivateDevelopment | PackageCatalogScope::Uat => true,
            })
            .collect()
    }
}

fn package_gameplay_ready(package: &ContentPackage) -> bool {
    let world_people = package.world.iter().flat_map(|world| world.people.iter());
    let patch_people = package
        .patches
        .iter()
        .filter_map(|patch| match patch.entity.as_ref() {
            Some(rivallo_domain::WorldEntity::Person(person)) => Some(person),
            _ => None,
        });
    world_people
        .chain(patch_people)
        .all(|person| person.readiness.gameplay == rivallo_domain::GameplayReadiness::GameplayReady)
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
    fn public_catalog_hides_private_packages_even_when_repository_returns_them() {
        let active = official_package();
        let mut private = active.clone();
        private.manifest.package_id = "dev.synthetic-hidden".to_owned();
        private.manifest.visibility = PackageVisibility::PrivateDevelopment;
        let service = WorldDatabaseService::new(RepositoryFixture {
            active: vec![active.clone()],
            available: vec![active, private],
            save_count: Rc::new(Cell::new(0)),
        });

        let catalog = service.catalog().expect("public catalog");
        assert_eq!(catalog.len(), 1);
        assert_eq!(catalog[0].catalog_scope, PackageCatalogScope::Public);
        assert!(catalog[0].selectable);
    }

    #[test]
    fn authorized_private_catalog_exposes_partial_package_as_non_selectable() {
        let active = official_package();
        let mut private = active.clone();
        private.manifest.package_id = "dev.synthetic-partial".to_owned();
        private.manifest.visibility = PackageVisibility::PrivateDevelopment;
        private.manifest.schema_version = 2;
        let world = private.world.as_mut().expect("world");
        world.schema_version = 2;
        world.people.push(
            serde_json::from_value(serde_json::json!({
                "personId": "synthetic.person.catalog",
                "externalIds": [{ "source": "synthetic", "externalId": "catalog-1" }],
                "fullName": "Pessoa Sintética Catálogo",
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
                "roles": [{
                    "roleId": "synthetic.player.catalog",
                    "kind": "player",
                    "clubId": "aurora-fc",
                    "title": null
                }],
                "provenance": [{
                    "source": "synthetic",
                    "sourceRecordId": "catalog-1",
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
                    "blockers": ["person.runtime_profile_blocked"]
                }
            }))
            .expect("partial person fixture"),
        );
        let service = WorldDatabaseService::new_authorized(
            RepositoryFixture {
                active: vec![active.clone()],
                available: vec![active, private],
                save_count: Rc::new(Cell::new(0)),
            },
            PackageCatalogScope::PrivateDevelopment,
        );

        let catalog = service.catalog().expect("private catalog");
        let private = catalog
            .iter()
            .find(|entry| entry.manifest.package_id == "dev.synthetic-partial")
            .expect("private entry");
        assert!(
            private.validation.valid,
            "{:#?}",
            private.validation.diagnostics
        );
        assert_eq!(
            private.catalog_scope,
            PackageCatalogScope::PrivateDevelopment
        );
        assert!(!private.selectable);
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
