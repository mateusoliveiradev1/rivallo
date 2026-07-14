# Authority Model

| Mode | Authority | Canonical store | Desktop role |
|---|---|---|---|
| Local career | local Rust core | SQLite | author and reader |
| Online league | Rust server | PostgreSQL/Neon | cache, projection, command queue |

The UI never writes either database directly. The client never decides a competitive outcome. Last-write-wins is forbidden for competitive decisions.
