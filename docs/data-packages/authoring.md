# Authoring Rivallo data packages

## Layout

```text
package-id/
  manifest.json
  <entrypoints.world>
  <entrypoints.patches>   # optional for mods
  <entrypoints.assets>/   # optional, data-only images
```

`manifest.json` follows `data/schemas/package-manifest.schema.json`. A base package supplies a
complete `world.json`; a mod supplies typed patches and may also supply assets. IDs are persistent
identities and must not be derived from a label, filename, current club, array position, or sort
order. External source IDs belong in `externalIds` and never replace the internal ID.

## Resolution

The resolver validates every candidate before activation, requires exactly one base, checks
dependencies/conflicts, sorts deterministically by `loadOrderHint` then `packageId`, applies typed
patches in declaration order, revalidates references, and emits a fingerprint plus diagnostics.
Invalid candidates never replace the active resolved world.

## Diagnostics

Every diagnostic carries severity, blocking state, file, entity, field, reference, invalid value,
violated rule, and a correction suggestion when one is available. Editors should group errors by
file/entity and focus the first invalid field without hiding warnings.

## Security and assets

Only JSON and local PNG, WebP or JPEG images are accepted from user packages in schema v1. The
formal schema can describe bundled official SVGs, but the local catalog rejects every SVG instead
of treating a partial sanitizer as a security boundary. Paths are relative, cannot contain `..`,
roots or drive prefixes, must remain below `entrypoints.assets`, and are canonicalized below the
real package root. Symlinks, junctions/reparse points, oversized inputs, unsupported media and
SHA-256 mismatches block loading. Assets declare provenance, rights and an exact SHA-256 checksum.

The JSON editor exports world and patch payloads to the entrypoints declared by the manifest. It
does not accept raw asset bytes, so candidates containing asset declarations or asset patches are
rejected before any catalog mutation instead of producing an incomplete package. A binary-aware
authoring tool may materialize those files later while preserving the same manifest contract.

At runtime the desktop reference catalog keeps the stable asset ID and package metadata separate
from the rendered source. Bundled assets resolve through the compiled catalog; a future activated
local package may receive a backend-validated `runtimeSource`, which the frontend converts to a
Tauri asset URL. React components never concatenate package roots or interpret package files.

## Saves

A future new career pins base/mod IDs, versions, hashes, schema, load order, seed and resolved world
snapshot. Package updates do not mutate an existing save. Migration remains explicit, backed up,
validated and atomic.
