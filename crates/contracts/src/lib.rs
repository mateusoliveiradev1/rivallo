//! Transport-neutral contract metadata owned by the contracts boundary.

/// The semantic version used by contract exports and generated clients.
pub const CONTRACT_VERSION: &str = "0.1.0";

/// Metadata supplied by the contracts boundary to an outer composer.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ContractMetadata {
    semantic_version: &'static str,
}

impl ContractMetadata {
    /// Returns the metadata for the canonical contract version.
    pub const fn current() -> Self {
        Self {
            semantic_version: CONTRACT_VERSION,
        }
    }

    /// Returns the semantic version owned by this contract metadata.
    pub const fn semantic_version(&self) -> &'static str {
        self.semantic_version
    }
}

#[cfg(test)]
mod tests {
    use super::{ContractManifest, CONTRACT_VERSION};

    #[test]
    fn manifest_carries_the_canonical_contract_version() {
        assert_eq!(ContractManifest::current().version, CONTRACT_VERSION);
    }
}
