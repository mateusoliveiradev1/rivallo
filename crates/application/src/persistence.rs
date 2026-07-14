//! Application-owned boundary for future local persistence capabilities.

/// Stable recovery classes exposed by the local-persistence boundary.
///
/// Adapter-specific causes deliberately remain private to the outer platform layer.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalPersistenceError {
    /// The local store cannot currently provide its capability.
    Unavailable,
    /// Persisted bytes cannot be accepted as valid application data.
    InvalidData,
}

/// Capability boundary implemented by an outer local-persistence adapter.
///
/// This probe carries no product records and does not prescribe any storage engine.
pub trait LocalPersistencePort {
    /// Verifies that the adapter could provide its persistence capability.
    fn verify_capability(&self) -> Result<(), LocalPersistenceError>;
}

#[cfg(test)]
mod tests {
    use super::{LocalPersistenceError, LocalPersistencePort};

    struct UnavailablePersistence;

    impl LocalPersistencePort for UnavailablePersistence {
        fn verify_capability(&self) -> Result<(), LocalPersistenceError> {
            Err(LocalPersistenceError::Unavailable)
        }
    }

    #[test]
    fn exposes_recovery_safe_failure_classes() {
        assert_eq!(
            UnavailablePersistence.verify_capability(),
            Err(LocalPersistenceError::Unavailable)
        );
        assert_ne!(
            LocalPersistenceError::Unavailable,
            LocalPersistenceError::InvalidData
        );
    }
}
