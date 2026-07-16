<!-- generated-by: gsd-doc-writer -->

# Inbox Event Contract

## Purpose

Inbox turns domain events into traceable information and decisions. It is a projection/interaction surface, never the source of injuries, transfers, finances or other sporting facts.

## Item envelope

Stable item ID, source event/domain/entity IDs, type/category, severity (`informative`, `actionable`, `urgent`, `blocking`), title/summary, occurred/published/updated times, optional deadline, read/archive status, action descriptors, deep-link context, source label and deduplication key/version.

## Producers

Injury, suspension, post-match report, unhappy player, training report, scouting report, offer/response, contract, registration, calendar change, draw, board decision, development and finance problem events. New types require a schema/version and owning route.

## Projection rules

- At-least-once events are deduplicated by source/version.
- Later corrections update/replace with audit context; they do not create unexplained duplicates.
- Blocking/urgent deadlines sort deterministically before unread actionable and informative items.
- Archiving never deletes the authoritative source event/report.
- Read/archive state persists independently of source-domain state.

## Actions

Open context, mark read/unread, archive/restore, favourite when applicable and execute declared decision commands. A decision action shows consequence/deadline and uses expected-version/idempotency data; success/failure returns domain feedback and updates the item.

## Deep links

Each item targets an owning route plus stable entity/context ID: player injury → Squad profile/availability; offer → Transfer negotiation; calendar change → changed fixture; report → Reports document; registration → Competition registration; finance problem → ledger/alert context.

## Empty/error/deadline states

Empty Inbox confirms there are no pending items and links to Home. Expired actions state outcome and remain auditable. Missing target entities use a safe historical/diagnostic state. Malformed/unsupported events go to diagnostics/dead-letter projection and cannot crash the Inbox.

## Tests and acceptance

Deduplication, ordering, correction, read/archive durability, deadline transitions, deep-link resolution, command idempotency/version conflicts, missing target, projection rebuild, accessibility and high-volume pagination. Every item identifies what happened, why/cause, expected consequence, available response, authoritative source and update time.
