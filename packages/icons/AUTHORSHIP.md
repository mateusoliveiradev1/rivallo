# Rivallo Football Icon Authorship

## Provenance

The Version 1.1.0 football proof set was authored specifically for the Rivallo project on 2026-07-15 by the project team with Codex assistance. The geometry was constructed directly on a 24-unit master grid for the repository and is rendered only at the approved 16px, 20px, and 24px sizes.

No external SVG path, crest, icon library, or game asset was imported into these football-specific icons. FootSim, Football Manager, EA FC, Brasfoot, club identities, and third-party crest libraries were not used as geometry sources.

## Versioned entries

- `football-ball` — Version 1.1.0 — enlarged silhouette, balanced five-panel seam rhythm, and clearer small-size negative space.
- `goal-frame` — Version 1.1.0 — perspective frame with restrained orthogonal net structure for cleaner 16px rendering.
- `training-cone` — Version 1.1.0 — simplified tapered body, two readable bands, and a stable rectangular base.

Version 1.0.0 remains the provenance baseline. Version 1.1.0 is an optical refinement of the same three meanings; it does not add a football concept or identity asset.

## Normative construction grammar

Every Rivallo football icon must satisfy the exported `footballIconGrammar` contract:

- author on the 24-unit master grid and render only at 16px, 20px, or 24px;
- keep all geometry inside the 2–22 optical safe zone, including the outer stroke;
- use a 1.75px `currentColor` stroke with round caps and joins and no fill;
- respect the detail ceiling: no more than four geometry elements and fourteen path commands per path;
- remain static, fixed, local React geometry with no URL, imported path, style, event, animation, or consumer-supplied markup.

## Extension checklist

Before a future football concept enters the registry, its owning screen contract must record the intended meaning, usage context, likely ambiguity, and visible-label fallback. Geometry is permitted only after that meaning is approved and can be distinguished at all three sizes without relying on colour. The author must then add versioned metadata, provenance history, safe-boundary tests, optical comparison on both graphite surfaces, and human originality/non-imitation review.

Training, tactics, scouting, medicine, club identity, pitch, logo, crest, mascot, and final-name geometry are intentionally outside this proof inventory until their owning phases approve them.

## Review boundary

Automated checks validate fixed local geometry, metadata consistency, safe SVG attributes, and the absence of external references. They do not assert originality, non-imitation, or optical harmony. Those judgments remain reserved for the Phase 5 human visual review at 16px, 20px, and 24px.
