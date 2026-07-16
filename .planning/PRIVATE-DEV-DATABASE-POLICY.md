<!-- generated-by: gsd-doc-writer -->

# Private Development Database Policy

## Package

`dev.brasileirao-serie-a-2026` is a private development-only content package. It represents a new Série A 2026 season to be simulated by Rivallo, not a replay or import of real results.

## Required content

The package may contain 20 real clubs with names, abbreviations, private-use crests/colours/cities/stadiums; real players, private-use photos, coaches/staff; nationality/birth/position/contract facts; Rivallo-owned evaluations; competition/regulation/registration/rules; and a complete fixture set to be played.

No real asset or dataset is created, downloaded or collected by this planning checkpoint.

## Zero-state invariant

At career creation: round 1 is unplayed; standings, games, points, wins/draws/losses, goals, cards and all accumulated player/team statistics are zero; every fixture is future; no actual 2026 result is imported. Only the save may generate results.

## Isolation

- Stored outside official fictional content and identified as private in its manifest.
- Excluded from public builds, release archives, fixtures and documentation examples by automated allowlist/denylist checks.
- Not uploaded, published, redistributed or enabled by default.
- Credentials or proprietary source files are never embedded in the package.
- Asset records include provenance, rights status and a private-use marker.

## Public counterpart

Rivallo ships an official fictional database using the same schemas and validators. Tests and public examples default to fictional content so no production rule depends on the private package.

## Evaluation policy

Facts retain source/provenance metadata. Rivallo sporting evaluations are separate, versioned, calibrated, explainable and editable. A factual correction cannot silently alter an evaluation set, and a calibration update cannot silently alter an existing save snapshot.

## Gate checks

- 20 unique participants and valid registrations/contracts/references;
- complete regulation-compatible schedule and zero-state statistics;
- no result-like historical payload in the active season;
- deterministic package hash and compatible schema/game versions;
- release/build scan proves the package and private assets are absent.
