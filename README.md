# Rivallo (working title)

Rivallo is a desktop-first football management game for private online leagues and local careers. The official game world will be fictional; “Rivallo” is a working codename pending naming and trademark research.

## Development

Phase 2 establishes root workspaces and quality tooling only. It supports Windows, macOS, and Linux, with stable Node.js 22.0.0+, pnpm 10.0.0+, and matching stable Rust/Cargo 1.88.0+ required. Install those tools independently; the repository never installs or updates a toolchain for you.

From a clean checkout, run:

```text
pnpm install --frozen-lockfile
pnpm toolchains
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm rust:fmt
pnpm rust:clippy
pnpm rust:test
pnpm smoke
pnpm check
```

`pnpm check` is the fail-fast aggregate and begins with toolchain validation. If it reports an unavailable or unsupported tool, follow its manual remediation and rerun it. Dependency installation only installs the declared JavaScript dependencies; it does not install or update Node.js, pnpm, Rust, or Cargo.

Every Rust/Cargo probe runs with `RUSTUP_AUTO_INSTALL=0`. Install an unavailable Rust channel and its `rustfmt`/`clippy` components manually; a quality command must never download them.

Root manifests and quality configuration belong to Phase 2. Phase 3 owns Rust crates and API contracts. Phase 4 owns the desktop/API shell, persistence, containers, and CI. Application, crate, Tauri, axum/API, persistence, integration, Docker, and CI-specific commands are intentionally absent until those phases.

See [`.planning/ROADMAP.md`](.planning/ROADMAP.md), [`docs/product/vision.md`](docs/product/vision.md), and [`CONTRIBUTING.md`](CONTRIBUTING.md).
