<!-- generated-by: gsd-doc-writer -->

# Coach Creator Contract

## Purpose

Phase 06.6 provides a robust coach creator shared with the data-editor schema. A player may create a career coach or select an existing database coach without bypassing identity, validation or progression rules.

## Editable profile

Name, surname, known name, nationality, birthplace, birth date, appearance/avatar/clothing, experience, playing history, licences, languages, favourite club, tactical style, preferred formations, philosophy, management profile, specialties, initial reputation and initial attributes.

## Balance model

Archetype sets strengths/trade-offs and suggested values. Experience/licences/history establish a bounded point budget, unlocks and minimum/maximum ranges. Advantages have costs or linked limitations; no valid configuration can set every attribute to maximum. Difficulty may alter assistance or budget within explicit rules, never secretly.

## Creation flow

Identity → background → visual appearance → tactical/management profile → attributes/advantages → accessibility/preferences → review/impact summary → validate → save/select. Each step is resumable locally inside the wizard; the career slot is not committed until the full career transaction succeeds.

## Explainable impact and progression

Review states how choices affect reputation, staff/player interactions, tactical familiarity, recommendations and starting opportunities. Coach development is event-driven/versioned; licences, experience and achievements change projections over time without rewriting creation history.

## Accessibility and assets

Keyboard-complete controls, visible focus, labelled visual alternatives, non-colour-only selection, zoom/long-text support and reduced motion. Avatar/assets use validated package IDs/provenance; missing assets have deterministic fallback.

The primary appearance path is the local procedural Avatar Studio. It persists a versioned
`PortraitRecipe` (seed, editable traits, palette, clothing, background and locks) independently from
the derived PNGs. The same recipe renders the same portrait without nationality-based inference and
produces 512, 256, 128 and 64 pixel derivatives for profile, cards and sidebar. PNG, JPEG and WebP
upload remains optional; external SVG and remote generation are not accepted.

## Validation and persistence

Coach domain owns age/date consistency, enum/reference validity, point budget, prerequisites, incompatible advantages and attribute ranges. Persist stable coach ID, creator schema version, choices, portrait recipe/renderer version, derived starting values and explanation snapshot. Migration is explicit and tested.

## Tests and acceptance

Boundary/property tests for budgets and prerequisites; no-max-all invariant; create/select/edit-draft/restart/migration; keyboard/screen-reader/error-summary; database-editor schema round-trip. Acceptance requires a valid coach to enter the created career and visible explanation of every constrained/derived starting value.
