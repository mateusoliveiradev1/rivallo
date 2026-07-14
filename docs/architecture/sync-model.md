# Synchronisation Model

Online commands contain command/actor/league/aggregate IDs, expected version, idempotency key, timestamp, and versioned payload. Server validation produces events and current aggregate version; clients update SQLite projections. Durable outbox/inbox, retry, reconciliation, conflict display, and correlation IDs make disruption explicit.
