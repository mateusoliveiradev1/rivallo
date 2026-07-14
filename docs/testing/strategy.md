# Test Strategy

Frontend: ESLint, Prettier, TypeScript, Vitest/RTL, Playwright, screenshots, accessibility. Rust: fmt, clippy warnings-as-errors, nextest, proptest, SQLx integration/migration/concurrency/idempotency tests. Contracts: generated OpenAPI/client drift checks. CI jobs are frontend-quality, rust-quality, integration, contracts, visual, and desktop-build.

ESLint flat config handles semantics; Prettier formatting; TypeScript typing; Impeccable visual anti-pattern detection. No duplicate formatter rules.
