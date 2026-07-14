# Data Strategy

SQLite and PostgreSQL use separately tested migrations and need not share a schema. SQLite stores local careers, cache/projections, preferences, sync metadata, snapshots, and queued commands. PostgreSQL stores online users, leagues, memberships, authoritative state, commands/events/projections/audit/versions/jobs. Official fixtures are fictional; real/private datapacks remain out of source control.
