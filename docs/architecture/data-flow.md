# Data Flow

`React → application port → Tauri/platform adapter → Rust core → persistence/sync port`.

Online: `desktop command queue → API → server application/domain → PostgreSQL transaction + outbox → response/events → desktop projection`. API OpenAPI is generated from the backend and generates the TypeScript client.
