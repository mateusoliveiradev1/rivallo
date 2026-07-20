use std::ffi::OsString;
use std::io;
use std::path::{Path, PathBuf};

const APP_DATA_ISOLATION_GUARD: &str = "authorized-isolated-runtime";
const ISOLATED_DIRECTORY_PREFIX: &str = "uat-";

pub fn isolated_app_data_dir_from_environment(
    normal_app_data_dir: &Path,
) -> io::Result<Option<PathBuf>> {
    resolve_isolated_app_data_dir(
        normal_app_data_dir,
        std::env::var_os("RIVALLO_APP_DATA_DIR"),
        std::env::var("RIVALLO_APP_DATA_ISOLATION_GUARD")
            .ok()
            .as_deref(),
    )
}

fn resolve_isolated_app_data_dir(
    normal_app_data_dir: &Path,
    raw_path: Option<OsString>,
    guard: Option<&str>,
) -> io::Result<Option<PathBuf>> {
    let Some(raw_path) = raw_path else {
        return Ok(None);
    };
    if guard != Some(APP_DATA_ISOLATION_GUARD) {
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "RIVALLO_APP_DATA_DIR requires the runtime isolation guard",
        ));
    }

    let path = PathBuf::from(raw_path);
    let leaf = path.file_name().and_then(|value| value.to_str());
    if !path.is_absolute()
        || !leaf.is_some_and(|value| value.starts_with(ISOLATED_DIRECTORY_PREFIX))
    {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "RIVALLO_APP_DATA_DIR must be an absolute uat-* directory",
        ));
    }
    if path == normal_app_data_dir {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "RIVALLO_APP_DATA_DIR cannot replace the normal AppData directory",
        ));
    }
    if path.exists() && !path.is_dir() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "RIVALLO_APP_DATA_DIR must identify a directory",
        ));
    }

    std::fs::create_dir_all(&path)?;
    let canonical_path = std::fs::canonicalize(&path)?;
    let canonical_normal = std::fs::canonicalize(normal_app_data_dir)
        .unwrap_or_else(|_| normal_app_data_dir.to_path_buf());
    if canonical_path == canonical_normal || canonical_path.file_name().is_none() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "RIVALLO_APP_DATA_DIR resolves to an unsafe directory",
        ));
    }
    Ok(Some(canonical_path))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn test_root(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "rivallo-runtime-paths-{}-{}-{label}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system clock")
                .as_nanos()
        ))
    }

    #[test]
    fn absent_override_keeps_the_normal_app_data_contract() {
        let normal = test_root("normal");
        assert_eq!(
            resolve_isolated_app_data_dir(&normal, None, None).expect("no override"),
            None
        );
        assert!(!normal.exists());
    }

    #[test]
    fn guarded_absolute_uat_directory_is_process_scoped() {
        let normal = test_root("normal");
        let isolated = test_root("uat-valid").join("uat-session");

        let resolved = resolve_isolated_app_data_dir(
            &normal,
            Some(isolated.clone().into_os_string()),
            Some(APP_DATA_ISOLATION_GUARD),
        )
        .expect("valid isolated path")
        .expect("override present");
        assert_eq!(
            resolved,
            std::fs::canonicalize(&isolated).expect("canonical path")
        );
        assert!(resolved.is_dir());

        assert_eq!(
            resolve_isolated_app_data_dir(&normal, None, None).expect("next process state"),
            None,
            "an isolated resolution must not persist without environment input"
        );
        std::fs::remove_dir_all(isolated.parent().expect("isolated parent"))
            .expect("remove isolated fixture");
    }

    #[test]
    fn invalid_or_unguarded_overrides_fail_closed() {
        let normal = test_root("normal").join("uat-normal");
        let isolated = test_root("uat-invalid").join("uat-session");

        assert_eq!(
            resolve_isolated_app_data_dir(&normal, Some(isolated.into_os_string()), None)
                .expect_err("guard is mandatory")
                .kind(),
            io::ErrorKind::PermissionDenied
        );
        assert_eq!(
            resolve_isolated_app_data_dir(
                &normal,
                Some(OsString::from("relative-uat-session")),
                Some(APP_DATA_ISOLATION_GUARD),
            )
            .expect_err("relative path is unsafe")
            .kind(),
            io::ErrorKind::InvalidInput
        );
        assert_eq!(
            resolve_isolated_app_data_dir(
                &normal,
                Some(normal.clone().into_os_string()),
                Some(APP_DATA_ISOLATION_GUARD),
            )
            .expect_err("normal AppData cannot be redirected")
            .kind(),
            io::ErrorKind::InvalidInput
        );
        let filesystem_root = normal
            .ancestors()
            .last()
            .expect("filesystem root")
            .to_path_buf();
        assert_eq!(
            resolve_isolated_app_data_dir(
                &normal,
                Some(filesystem_root.into_os_string()),
                Some(APP_DATA_ISOLATION_GUARD),
            )
            .expect_err("filesystem root is unsafe")
            .kind(),
            io::ErrorKind::InvalidInput
        );

        let file_parent = test_root("uat-file");
        std::fs::create_dir_all(&file_parent).expect("creates file fixture parent");
        let file = file_parent.join("uat-not-a-directory");
        std::fs::write(&file, b"fixture").expect("creates file fixture");
        assert_eq!(
            resolve_isolated_app_data_dir(
                &normal,
                Some(file.into_os_string()),
                Some(APP_DATA_ISOLATION_GUARD),
            )
            .expect_err("file target is unsafe")
            .kind(),
            io::ErrorKind::InvalidInput
        );
        std::fs::remove_dir_all(file_parent).expect("removes file fixture");
    }
}
