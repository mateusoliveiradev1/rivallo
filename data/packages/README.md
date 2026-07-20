# Rivallo data packages

This directory contains public, data-only packages that may be bundled with Rivallo. Each package
has a versioned `manifest.json`, a `data/world.json` entrypoint for base content, optional typed
patches for mods, and package-relative assets.

The official public package is `official.rivallo.foundation`. The private development package
`dev.example.league-2026` must never be placed below this directory, committed, bundled, used
by public tests, or enabled by default.

Package data is authored as UTF-8 JSON and resolved once into an indexed immutable runtime world.
React screens consume typed application projections; they do not parse packages.

See `docs/data-packages/authoring.md` and the schemas in `data/schemas/`.
