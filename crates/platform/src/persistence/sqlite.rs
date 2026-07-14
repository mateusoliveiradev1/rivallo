//! Disconnected SQLite adapter shape for a later storage phase.

use std::path::PathBuf;

use rivallo_application::{LocalPersistenceError, LocalPersistencePort};

/// Supplies the operating system's per-user local-data directory.
///
/// OS-specific lookup remains behind this platform-owned abstraction.
pub trait LocalDataDirectoryResolver {
    /// Returns the per-user location when the operating system can supply it.
    fn local_data_directory(&self) -> Option<PathBuf>;
}

/// Inert boundary reserved for a future SQLite-backed implementation.
///
/// Construction stores only the resolver. It performs no I/O and opens no store.
pub struct SqlitePersistenceAdapter<R> {
    resolver: R,
}

impl<R> SqlitePersistenceAdapter<R> {
    /// Creates a disconnected adapter around an injected location resolver.
    pub fn new(resolver: R) -> Self {
        Self { resolver }
    }
}

impl<R: LocalDataDirectoryResolver> SqlitePersistenceAdapter<R> {
    fn resolved_local_data_directory(&self) -> Result<PathBuf, LocalPersistenceError> {
        let directory = self
            .resolver
            .local_data_directory()
            .ok_or(LocalPersistenceError::Unavailable)?;

        if directory.is_absolute() {
            Ok(directory)
        } else {
            Err(LocalPersistenceError::InvalidData)
        }
    }
}

impl<R: LocalDataDirectoryResolver> LocalPersistencePort for SqlitePersistenceAdapter<R> {
    fn verify_capability(&self) -> Result<(), LocalPersistenceError> {
        let _directory = self.resolved_local_data_directory()?;
        Err(LocalPersistenceError::Unavailable)
    }
}

#[cfg(test)]
mod tests {
    use std::{cell::Cell, path::PathBuf};

    use rivallo_application::{LocalPersistenceError, LocalPersistencePort};

    use super::{LocalDataDirectoryResolver, SqlitePersistenceAdapter};

    struct Resolver<'a> {
        calls: &'a Cell<usize>,
        directory: Option<PathBuf>,
    }

    impl LocalDataDirectoryResolver for Resolver<'_> {
        fn local_data_directory(&self) -> Option<PathBuf> {
            self.calls.set(self.calls.get() + 1);
            self.directory.clone()
        }
    }

    #[test]
    fn construction_is_inert() {
        let calls = Cell::new(0);
        let _adapter = SqlitePersistenceAdapter::new(Resolver {
            calls: &calls,
            directory: None,
        });

        assert_eq!(calls.get(), 0);
    }

    #[test]
    fn missing_location_is_recoverably_unavailable() {
        let calls = Cell::new(0);
        let adapter = SqlitePersistenceAdapter::new(Resolver {
            calls: &calls,
            directory: None,
        });

        assert_eq!(
            adapter.verify_capability(),
            Err(LocalPersistenceError::Unavailable)
        );
        assert_eq!(calls.get(), 1);
    }

    #[test]
    fn relative_location_is_invalid_data() {
        let calls = Cell::new(0);
        let adapter = SqlitePersistenceAdapter::new(Resolver {
            calls: &calls,
            directory: Some(PathBuf::from("relative-location")),
        });

        assert_eq!(
            adapter.verify_capability(),
            Err(LocalPersistenceError::InvalidData)
        );
    }
}
