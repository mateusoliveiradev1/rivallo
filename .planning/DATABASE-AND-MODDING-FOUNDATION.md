<!-- generated-by: gsd-doc-writer -->

# Database and Modding Foundation

## Authority and separation

Game code contains generic rules and schemas, never specific clubs, players or competitions. Content packages provide entities/assets/translations. Factual data and Rivallo sporting evaluations are separate records so identity corrections do not implicitly recalibrate ratings.

| Factual data                                                                                 | Rivallo evaluation                                                                  |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| name, birth, nationality, height, position, club, contract, stadium, competition, regulation | attributes, ability, rating, potential, personality, suitability, style, reputation |

Evaluations carry evaluation-set ID/version, methodology/calibration version, author/source note, effective date and explanation components; they are editable and independent of compiled code.

## Core entity families

Countries, regions, cities, clubs, competitions, seasons, players, coaches, staff, stadiums, contracts, registrations, rivalries, attributes, styles, rules, calendars, assets and translations use globally stable, package-qualified IDs. References are validated before a package can be activated.

## Package contract

Every database or mod declares: `id`, `version`, `schemaVersion`, compatible `gameVersion`, author, type, dependencies, conflicts, load-order constraints, assets, translations, patches and content hashes. The resolver produces a deterministic resolved graph plus validation/conflict report.

A mod may replace a database, add competitions, patch players/transfers/rules/translations or add photos/crests. Patches target stable IDs and declare operation semantics; array position and translated labels are never identity.

## Shared editor ecosystem

Editors cover player, coach, staff, club, competition, season, stadium, rules, contracts, registrations, calendar and assets. They share:

- schema-driven tables/forms, search, filters and accessible error summary;
- stable-ID creation/reference pickers and referential-integrity validation;
- import/export, preview/diff, history/audit metadata and validation reports;
- safe undo/redo for local reversible edits; irreversible migrations require explicit confirmation/backup;
- asset provenance/licence metadata and translation key tooling.

Phase 06.5 builds schemas/resolver/foundation; Phase 09.7 completes the full editor/mod workflow.

## Resolution and activation

1. Parse manifests and reject unsupported schema/game versions.
2. Resolve dependencies/conflicts/load order deterministically.
3. Apply base then ordered patches in an isolated candidate graph.
4. Validate schemas, IDs, references, rules, assets and translations.
5. Produce resolved hashes and an impact/conflict report.
6. Activate only after successful validation and explicit career-creation selection.

## Save pinning and migration

A new career records base ID/version/hash, ordered mod IDs/versions/hashes, schema/game version, seed, start date and resolved world snapshot. Later package updates do not rewrite that snapshot. Migration is an explicit tool: backup → candidate conversion → validation → impact/conflict report → confirmation → atomic replacement; failure leaves the original intact.

## Validation and security gates

- deterministic round-trip and identical resolved hash;
- referential integrity and rule/calendar consistency;
- dependency cycle/conflict and unsupported-version rejection;
- archive path traversal, oversized/decompression abuse and unsafe asset rejection;
- no executable scripts in the initial official mod format;
- public-build exclusion check for private packages;
- migration/backup/crash-recovery and long-save compatibility tests.
