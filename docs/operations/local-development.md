# Local Development

## Phase 3 foundation

Phase 3 provides four Rust crates: `rivallo-domain` holds framework-independent primitives, `rivallo-application` prepares neutral use cases, `rivallo-contracts` owns versioned transport schemas, and `rivallo-platform` composes and exports those schemas. The committed `contracts/openapi.json` and `packages/contracts-client/src/generated/` are generated artifacts, not hand-maintained models. Exact `orval@8.21.0` converts the local committed OpenAPI document into generated types, metadata, and a direct Fetch operation.

Executable API routes, desktop/Tauri integration, persistence, infrastructure, identity, and product behavior remain later-phase work. There is no runtime server, health check, Docker/CI workflow, database, or product service to run here.

## Prerequisites

Install stable Node.js 22.0.0 or newer, pnpm 10.0.0 or newer, and stable Rust/Cargo 1.88.0 or newer yourself. Rust must provide `rustfmt`, `clippy`, and `cargo-nextest`. Use supported Windows, macOS, or Linux tooling; the root Node adapters choose the platform executable names.

Every Rust/Cargo child process uses `RUSTUP_AUTO_INSTALL=0`. Project commands never install or update a Rust toolchain: install the selected channel and required components manually when validation reports them missing. Install JavaScript dependencies with `pnpm install --frozen-lockfile`.

## Generate intentionally

Writers are explicit and serialized per artifact. Do not run two writers for the same artifact at once.

```text
pnpm contracts:openapi:generate
pnpm contracts:client:generate
```

Run the OpenAPI writer before the client writer after a Rust-contract change. Commit their tracked outputs only when the intended generated diff has been reviewed.

The OpenAPI document includes one neutral `/_contract/manifest` operation solely because Orval Fetch generation is operation-scoped. It is test-only contract introspection metadata: there is no runtime handler, route registration, state, authentication, persistence, streaming, or product behavior behind it. The generated operation accepts ordinary `RequestInit` options only; do not add a transport wrapper, mutator, runtime package, auth headers, retry, backoff, or SSE behavior.

## Verify without writes

From a clean checkout, run individual checks or the aggregate:

```text
pnpm toolchains
pnpm rust:fmt
pnpm rust:clippy
pnpm rust:test
pnpm rust:architecture
pnpm contracts:openapi:check
pnpm contracts:client:check
pnpm check
```

`pnpm check` is fail-fast and toolchain-first. It runs only verification paths after validation; it never invokes either generation writer or repairs tracked artifacts. If an OpenAPI drift check fails, run `pnpm contracts:openapi:generate`; if a client drift check fails, run `pnpm contracts:client:generate`, then review the diff and rerun the matching check. The client check regenerates the complete Orval output into a fresh temporary tree, compares inventory and bytes, and never repairs the tracked tree. Repeated checks may create ignored local output such as `node_modules/`, `target/`, and temporary directories, but must not change tracked OpenAPI or client files.
