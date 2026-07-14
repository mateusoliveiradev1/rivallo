# Design

## Scene and strategy

Scene: a quiet technical room beside a floodlit stadium, used by a manager making a decisive late-night call. Use a restrained, dark-first product palette: blue-green graphite surfaces, gold only for premium moments, emerald for primary action, and semantic status colours.

The Impeccable palette seed was not adopted as a brand primary: red is explicitly reserved for danger and loss in the product brief.

## Tokens (planned single source of truth)

Use OKLCH tokens in `packages/design-tokens`; map them to CSS properties and Tailwind. Initial roles: `bg`, `surface`, `surface-elevated`, `overlay`, `border`, `text`, `text-muted`, `brand-gold`, `action-emerald`, `danger-red`, `warning-amber`, `info-cyan`, focus, selection, chart series, and contextual club colour.

## Typography and geometry

Inter is used for UI, tables, and forms; Space Grotesk or Inter Tight only for brand and level-one headings. Use tabular numerals for statistics, a tight product type scale, 8px-based spacing, restrained 6–12px radii, and shallow elevation.

## Interaction

Most transitions are 150–250ms and communicate state only. Every control has default, hover, focus-visible, active, selected, disabled, loading, and applicable error states. Reduced motion replaces transitions with instant changes or crossfades.

## Gate 2 evidence

Design briefs must be approved before important screens are implemented. UI Lab, screenshots at 1366×768, 1920×1080 and 2560×1080, keyboard checks, contrast checks, and Impeccable critique/audit/polish/harden/adapt reports are required.
