//! Transport-neutral contract metadata owned by the contracts boundary.

use utoipa::ToSchema;

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

/// The neutral schema that declares the canonical contract version.
#[derive(Clone, Debug, Eq, PartialEq, ToSchema)]
pub struct ContractManifest {
    /// The semantic version owned by the canonical Rust contract.
    pub version: String,
}

impl ContractManifest {
    /// Creates the schema value for the canonical contract version.
    pub fn current() -> Self {
        Self {
            version: CONTRACT_VERSION.to_owned(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{CONTRACT_VERSION, ContractManifest};

    #[test]
    fn manifest_carries_the_canonical_contract_version() {
        assert_eq!(ContractManifest::current().version, CONTRACT_VERSION);
    }
}
