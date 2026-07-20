use std::collections::HashSet;

use rivallo_application::{
    EvaluationComposition, EvaluationImportPlan, EvaluationImportReceipt, EvaluationImportRow,
    EvaluationLayerPackage, EvaluationLayerValidation, apply_evaluation_import,
    compose_evaluation_layer, evaluation_layer_canonical_bytes, rollback_evaluation_import,
    validate_evaluation_layer,
};
use sha2::{Digest, Sha256};

/// Computes the integrity digest at the outer boundary over domain-canonical bytes.
pub fn evaluation_layer_checksum(layer: &EvaluationLayerPackage) -> Result<String, String> {
    let bytes = evaluation_layer_canonical_bytes(layer)?;
    Ok(format!("sha256:{:x}", Sha256::digest(bytes)))
}

/// Seals a mutable authoring package after all domain mutations are complete.
pub fn seal_evaluation_layer(layer: &mut EvaluationLayerPackage) -> Result<(), String> {
    layer.manifest.checksum = evaluation_layer_checksum(layer)?;
    Ok(())
}

pub fn validate_evaluation_layer_package(
    layer: &EvaluationLayerPackage,
    factual_entity_ids: &HashSet<String>,
    target_base_fingerprint: &str,
) -> Result<EvaluationLayerValidation, String> {
    let actual_checksum = evaluation_layer_checksum(layer)?;
    Ok(validate_evaluation_layer(
        layer,
        factual_entity_ids,
        target_base_fingerprint,
        &actual_checksum,
    ))
}

pub fn compose_verified_evaluation_layer(
    layer: &EvaluationLayerPackage,
    factual_entity_ids: &HashSet<String>,
    target_base_fingerprint: &str,
) -> Result<EvaluationComposition, String> {
    let actual_checksum = evaluation_layer_checksum(layer)?;
    Ok(compose_evaluation_layer(
        layer,
        factual_entity_ids,
        target_base_fingerprint,
        &actual_checksum,
    ))
}

pub fn apply_evaluation_import_and_seal(
    layer: &mut EvaluationLayerPackage,
    rows: &[EvaluationImportRow],
    plan: &EvaluationImportPlan,
) -> Result<EvaluationImportReceipt, String> {
    let receipt = apply_evaluation_import(layer, rows, plan)?;
    seal_evaluation_layer(layer)?;
    Ok(receipt)
}

pub fn rollback_evaluation_import_and_seal(
    layer: &mut EvaluationLayerPackage,
    receipt: &EvaluationImportReceipt,
) -> Result<(), String> {
    rollback_evaluation_import(layer, receipt)?;
    seal_evaluation_layer(layer)
}

#[cfg(test)]
mod tests {
    use rivallo_application::{
        EvaluationLayerManifest, EvaluationLayerProvenance, PackageVisibility,
    };

    use super::*;

    fn empty_layer() -> EvaluationLayerPackage {
        EvaluationLayerPackage {
            manifest: EvaluationLayerManifest {
                package_id: "official.rivallo.synthetic-evaluations".to_owned(),
                version: "1.0.0".to_owned(),
                schema_version: 1,
                methodology_id: "rivallo.evaluation.foundation".to_owned(),
                methodology_version: "1.0.0".to_owned(),
                target_base_fingerprint: "synthetic-fingerprint".to_owned(),
                author: "Rivallo Synthetic Lab".to_owned(),
                created_at: "2026-07-19".to_owned(),
                visibility: PackageVisibility::Public,
                checksum: String::new(),
            },
            methodologies: Vec::new(),
            evidence: Vec::new(),
            entity_assessments: Vec::new(),
            review_history: Vec::new(),
            provenance: EvaluationLayerProvenance {
                source: "Synthetic fixtures".to_owned(),
                rights: "CC0".to_owned(),
                created_at: "2026-07-19".to_owned(),
                notes: "No real people or private data.".to_owned(),
            },
        }
    }

    #[test]
    fn seals_canonical_bytes_and_detects_content_changes() {
        let mut layer = empty_layer();
        seal_evaluation_layer(&mut layer).expect("layer seals");
        let sealed = layer.manifest.checksum.clone();

        assert_eq!(sealed.len(), "sha256:".len() + 64);
        assert_eq!(evaluation_layer_checksum(&layer).expect("checksum"), sealed);

        layer.provenance.notes.push_str(" Changed.");
        assert_ne!(evaluation_layer_checksum(&layer).expect("checksum"), sealed);
    }
}
