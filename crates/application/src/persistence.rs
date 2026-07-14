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
