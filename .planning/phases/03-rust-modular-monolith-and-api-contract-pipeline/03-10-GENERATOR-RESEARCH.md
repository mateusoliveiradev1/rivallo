# Phase 03: Safe OpenAPI-to-TypeScript Generator Replacement Research

**Researched:** 2026-07-14  
**Decision:** Recommend exactly one replacement, pending the mandatory human package-approval checkpoint.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-09:** Put generated TypeScript artifacts in the dedicated workspace package `packages/contracts-client`, independent of any application.
- **D-10:** Generate types, contract metadata, and a minimum client only. Do not add authentication, retries, product transport conveniences, or hand-maintained request/response duplicates.
- **D-11:** Research/planning selects a mature deterministic TypeScript generator; it must generate the required types and minimum client without manually editing output.
- **D-12:** Expose explicit root commands for OpenAPI generation, TypeScript client generation, and drift verification. `pnpm check` invokes verification-only, non-mutating commands.

#### Approved exception — D-10 (2026-07-14)

The human-approved exact `@hey-api/openapi-ts@0.97.3` bundled Fetch client may retain its generator-owned dormant auth, SSE, and internal support modules because this generator version cannot omit them. This exception is narrow: those modules must not be publicly exported, configured, invoked, or reachable through generated public types or metadata, and they must not enable authentication, retry, or backoff behavior. It does not authorize adding `@hey-api/client-fetch`, changing the generator version, or adding any external runtime package. D-11's generated-only ownership and D-12's non-mutating verification remain unchanged.

- **D-13:** Prefer schema-only generation. Add a fixture only if the selected tool genuinely requires an operation to prove the pipeline.
- **D-14:** Any required fixture is a test-only module with no runtime registration and no runtime artifact.
- **D-15:** A permitted fixture exposes only neutral contract introspection metadata; it has no state, football data, authentication, or persistence.
- **D-16:** Automated tests must prove that a fixture is usable by the pipeline yet absent from every production runtime registration.

### the agent's Discretion

- Exact crate names, generator libraries, dependency-policy file format, OpenAPI metadata fields beyond the explicit contract version, and test implementation patterns may be selected through research, provided they satisfy D-01 through D-16 and `03-SPEC.md`.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within Phase 3 scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research support |
|---|---|---|
| FOUND-03 | Framework-independent domain core | No change to Rust crate boundaries; replacement consumes only the committed OpenAPI document. [VERIFIED: repository] |
| DATA-02 | Contract foundation and generated client provenance | The recommendation provides generated TypeScript types and direct Fetch operation functions from `contracts/openapi.json`, with full temporary-tree drift comparison. [VERIFIED: repository; official Orval source] |
</phase_requirements>

## Summary

The committed `@hey-api/openapi-ts@0.97.3` implementation cannot meet the narrow D-10 exception: its public `client`/`createClient` surface reaches `setAuthParams`, SSE creation, and SSE retry/backoff options. Plan 03-09 proves that removing those exports also removes the required usable generated Fetch client. This is a generator capability issue, not an export-barrel issue. [VERIFIED: `03-VERIFICATION.md`; `03-09-FEASIBILITY.md`; local generated tree]

**Primary recommendation:** replace Hey API with exact `orval@8.21.0`, configured with its official `client: 'fetch'` generator and no mutator, mocks, query framework, runtime validation, or custom transport. The official fetch generator emits per-operation functions that call the platform `fetch` directly and accept only optional standard `RequestInit`; its source has no auth configuration, SSE client, retry loop, or backoff mechanism. [CITED: https://github.com/orval-labs/orval/blob/master/samples/next-app-with-fetch/orval.config.ts; CITED: https://github.com/orval-labs/orval/blob/master/packages/fetch/src/index.ts]

This is the only recommended replacement. It needs a neutral test-only OpenAPI operation because the committed document has `paths: {}` and Orval's Fetch output is operation-scoped. D-13 through D-16 explicitly permit that narrow fixture when technically necessary. The fixture must expose only `ContractManifest`, be excluded from every production runtime registration, and be covered by the existing scope/pipeline tests. [VERIFIED: `contracts/openapi.json`; `03-VERIFICATION.md`; `03-CONTEXT.md` D-13–D-16]

## Architectural Responsibility Map

| Capability | Primary tier | Secondary tier | Rationale |
|---|---|---|---|
| Canonical schema and neutral operation fixture | Rust contracts/platform pipeline | — | Rust remains the source of truth; the fixture exists solely to give the code generator one contract operation. [VERIFIED: D-05, D-13–D-16] |
| OpenAPI-to-TypeScript generation | Build tooling | `packages/contracts-client` | The Node generator consumes only committed `contracts/openapi.json`; no application/runtime owns transport behavior. [VERIFIED: existing scripts] |
| Request execution | Generated consumer client | browser/Node Fetch | Generated functions call the standard Fetch API only. [CITED: Orval fetch generator source] |
| Authentication, SSE, retries, backoff | — | — | Explicitly absent from generator configuration and generated public surface; later phases own any such policy. [VERIFIED: D-10; Orval fetch generator source] |

## Candidate Evaluation

| Candidate | Result | Evidence-based disposition |
|---|---|---|
| `orval@8.21.0` with `client: 'fetch'` | **Recommended, pending approval** | Official repository documents native Fetch support and publishes a Fetch sample. Its fetch template emits direct `fetch(...)` calls and optional `RequestInit`, rather than a bundled client core. [CITED: https://github.com/orval-labs/orval/blob/master/README.md; CITED: https://github.com/orval-labs/orval/blob/master/packages/fetch/src/index.ts] |
| Keep `@hey-api/openapi-ts@0.97.3` | Rejected | Public generated client invokes auth/SSE machinery and exposes security/SSE retry options; the strict D-10 exception is failed. [VERIFIED: `03-VERIFICATION.md`; `03-09-FEASIBILITY.md`] |
| `@openapitools/openapi-generator-cli@2.39.1` / `typescript-fetch` | Rejected | It introduces a Java-backed generator distribution and a package `postinstall` (`opencollective || exit 0`); this is needless runtime/toolchain and install-hook expansion where one supported direct-Fetch generator exists. No migration experiment supports it. [VERIFIED: npm registry metadata] |
| `openapi-typescript-codegen@0.31.0` | Rejected | Registry provenance was checked, but this research did not obtain current official documentation proving a D-10-safe Fetch surface for the exact version. It is therefore not a safe recommendation. [VERIFIED: npm registry metadata; package-legitimacy seam] |

## Standard Stack

| Component | Exact version | Role | Compatibility finding |
|---|---:|---|---|
| `orval` | `8.21.0` | OpenAPI v3 JSON to generated TypeScript types and narrow Fetch functions | npm reports `8.21.0`; published 2026-07-12. The official README says Orval generates TypeScript clients from OpenAPI and supports native Fetch. [VERIFIED: npm registry; CITED: https://github.com/orval-labs/orval/blob/master/README.md] |
| Node.js | `>=22.18.0` | Generator runtime | Orval 8's official README requires Node 22.18+; this machine has Node `v24.16.0`, so no local compatibility blocker exists. [CITED: https://github.com/orval-labs/orval/blob/master/README.md; VERIFIED: `node --version`] |
| Prettier | existing `3.9.5` lock resolution | Stable generator formatting | Orval declares `prettier >=3.0.0` as a peer; the existing lock resolves Prettier 3.9.5. Pinning Orval and retaining the existing formatter makes the complete-tree byte comparison authoritative. [VERIFIED: npm registry metadata; `pnpm-lock.yaml`] |

### Supported configuration and safe surface

The official sample uses `defineConfig`, a local `input.target`, a generated `output.target`, `client: 'fetch'`, `clean: true`, and `formatter: 'prettier'`. The recommendation narrows that sample to a single local input and explicitly omits the sample's `mock`, `baseUrl`, and mutator features. [CITED: https://github.com/orval-labs/orval/blob/master/samples/next-app-with-fetch/orval.config.ts]

```ts
// packages/contracts-client/orval.config.ts
import { defineConfig } from 'orval';

export default defineConfig({
  contracts: {
    input: { target: '../../contracts/openapi.json' },
    output: {
      target: 'src/generated/contracts.ts',
      mode: 'single',
      client: 'fetch',
      clean: true,
      formatter: 'prettier',
    },
  },
});
```

The exact Fetch template creates one exported async function per OpenAPI operation, builds a URL, and calls global `fetch(url, { ...options, method, headers, body })`. Its only caller-controlled transport option is `RequestInit`; it has no generated auth option, SSE factory, retry counter, delay, or backoff. It can generate NDJSON handling when the *input contract* declares an NDJSON response, so the Phase 3 fixture must not declare any streaming response. [CITED: https://github.com/orval-labs/orval/blob/master/packages/fetch/src/index.ts]

## Required Migration Shape

1. Obtain human approval for `orval@8.21.0` before changing `package.json` or the lockfile; the legitimacy seam flags the current publication as `SUS` solely because it is two days old. [VERIFIED: package-legitimacy seam]
2. Replace the Hey API exact pin and `openapi-ts.config.ts` with `orval@8.21.0` and the local `orval.config.ts` above. Do not add `@orval/fetch` separately: the `orval` package owns the officially paired Fetch generator, and emitted code uses global Fetch. [VERIFIED: npm registry dependencies; CITED: Orval Fetch source]
3. Change `scripts/generate-contract-client.mjs` only to invoke the locally installed Orval CLI through Node/Pnpm-safe process execution. Preserve `CONTRACT_CLIENT_OUTPUT` redirection so the existing isolated verifier continues to compare the entire generated tree byte-for-byte. [VERIFIED: existing generation and drift scripts]
4. Add the minimum neutral, test-only operation only if a generation experiment confirms it is required to produce the D-10 Fetch function. It returns `ContractManifest`, has no parameters/security schemes/streaming content, and is not registered in runtime code. [VERIFIED: D-13–D-16; `contracts/openapi.json` has no paths]
5. Make `packages/contracts-client/src/index.ts` a transparent generated export boundary. It may export generated operation functions and generated types/metadata, but contains no handwritten client, auth header injection, retry wrapper, SSE adapter, or duplicate request/response type. [VERIFIED: D-09–D-11]

### Determinism and cross-platform expectation

The existing process already serializes writers by root command and verifies the complete generated output in a fresh OS temp directory; it is cross-platform Node code and cleans that directory in `finally`. Retain that mechanism, pin `orval` exactly, consume only the committed local JSON input, and let the drift check—not an assumption about output stability—prove determinism on every run. [VERIFIED: `scripts/generate-contract-client.mjs`; `scripts/verify-contract-client-drift.mjs`]

Orval's official README publishes explicit Windows PowerShell and CMD Docker examples, while this project will use the local Node package rather than Docker. This is positive cross-platform evidence, but the project-specific proof remains the existing Node-mediated generation and temporary-output test on Windows. [CITED: https://github.com/orval-labs/orval/blob/master/README.md; VERIFIED: repository scripts]

## Package Legitimacy Audit

| Package | Registry/version | Source repository | Postinstall | Verdict | Disposition |
|---|---|---|---|---|---|
| `orval` | npm `8.21.0`, published 2026-07-12 | `github.com/orval-labs/orval` | none reported | **SUS** (`too-new`) | **Flagged — mandatory `checkpoint:human-verify` before install** |

`orval` is officially identified by its repository README and its npm `repository` metadata, then passes the source/provenance part of the gate. It has 1,227,741 weekly downloads according to the legitimacy seam, carries an MIT license, and no `postinstall` script was returned by `npm view`. The seam nevertheless returns `SUS` because the latest publication is recent; that verdict cannot be waived by this research. [VERIFIED: npm registry; package-legitimacy seam; CITED: https://github.com/orval-labs/orval/blob/master/README.md]

**Packages removed due to SLOP:** none.  
**Packages flagged as suspicious:** `orval` — a human package approval checkpoint remains required.

## Verification Contract

The replacement is acceptable only when all of these pass:

1. `pnpm contracts:client:generate` is the only writer and regenerates the same committed tree twice from `contracts/openapi.json`.
2. `pnpm contracts:client:check` directs generation to a fresh temporary output directory, checks inventory plus bytes, does not alter tracked files, and prints the writer command on drift.
3. The package-root import exposes generated `ContractManifest` types/metadata and at least one generated direct Fetch operation function; no handwritten request wrapper is added.
4. A focused source/runtime test rejects root exports and generated public text containing `security`, `auth`, `sse`, `retry`, or `backoff`, and asserts the operation accepts only ordinary `RequestInit` transport options.
5. The neutral fixture is proven absent from production registration and from scope-prohibited authentication/runtime code.
6. `pnpm check` remains writer-free and green on Windows with the locked Node/pnpm workspace.

## Common Pitfalls

- **Reintroducing a custom mutator:** the official sample shows a mutator as an optional feature; do not configure it, since it becomes a handwritten transport layer and can reintroduce auth/retry behavior. [CITED: Orval Fetch sample]
- **Treating any operation as acceptable:** the fixture is permitted only because `client: 'fetch'` produces operation-scoped functions; it must remain neutral, test-only, and unregistered. [VERIFIED: D-13–D-16]
- **Leaving broad Hey API exports in place:** this preserves the failed public reachability path. Remove its config/output as one atomic migration after approval. [VERIFIED: `03-09-FEASIBILITY.md`]
- **Using an unpinned generator:** output changes must be attributable to a reviewed dependency update; use exact `8.21.0`, lock it, and retain byte comparison. [VERIFIED: D-11–D-12; existing drift verifier]

## Security Domain

| Concern | Control |
|---|---|
| D-10 transport scope | Direct generated Fetch functions only; no mutator, auth configuration, retry/backoff wrapper, or SSE/streaming fixture. [CITED: Orval Fetch source; VERIFIED: D-10] |
| Supply chain | Exact package pin, lockfile update only after human approval, registry/provenance/postinstall audit recorded here. [VERIFIED: package-legitimacy protocol] |
| Input provenance | Generator reads only committed `contracts/openapi.json`, never a remote URL. [VERIFIED: existing generator configuration pattern; D-08/D-12] |
| Drift masking | Temporary-directory generation and byte comparison stay non-mutating. [VERIFIED: existing verifier] |

## Sources

### Primary

- [Orval official repository README](https://github.com/orval-labs/orval/blob/master/README.md) — OpenAPI-to-TypeScript support, native Fetch support, Node 22.18+ requirement, and Windows examples. [CITED]
- [Official Fetch sample](https://github.com/orval-labs/orval/blob/master/samples/next-app-with-fetch/orval.config.ts) — `defineConfig`, `client: 'fetch'`, local input/output configuration. [CITED]
- [Official Fetch generator source](https://github.com/orval-labs/orval/blob/master/packages/fetch/src/index.ts) — direct Fetch/`RequestInit` output and source-level absence of bundled auth/SSE/retry/backoff machinery. [CITED]
- npm registry metadata for `orval@8.21.0` — exact version, publication date, integrity, engine, peer/dependency and postinstall fields. [VERIFIED: npm registry]
- Package legitimacy seam for `orval` — registry existence, repository, downloads, postinstall, and `SUS` verdict. [VERIFIED: package-legitimacy seam]
- Repository artifacts `03-VERIFICATION.md`, `03-09-FEASIBILITY.md`, `03-CONTEXT.md`, `package.json`, `pnpm-lock.yaml`, and the generation/drift scripts. [VERIFIED: repository]

## Assumptions Log

| # | Claim | Risk if wrong |
|---|---|---|
| A1 | The exact `mode: 'single'` setting remains accepted by `orval@8.21.0`. The official sample verifies the surrounding v8 configuration but uses `tags-split`. | Generation config could need an approved documented adjustment; do not install or implement until the approval checkpoint includes a local dry-run. |

## Open Question

**Does Orval require the neutral fixture to produce the minimum generated Fetch function?**

- What we know: the committed OpenAPI document has no paths, and the official Fetch template emits one operation function at a time. [VERIFIED: `contracts/openapi.json`; Orval Fetch source]
- Recommendation: after approval, perform a read-only temp-output dry run with the schema-only document. If no callable function is emitted, add exactly one D-13–D-16-compliant contract-introspection fixture and prove its absence from runtime registration.

## Final Recommendation

Approve **`orval@8.21.0` only** as the replacement, then migrate the generated package to official `client: 'fetch'` output and preserve the existing isolated drift checker. This removes the Hey API public auth/SSE/retry/backoff reachability because the recommended generator emits narrow direct Fetch functions rather than a feature-rich client core.

**Human package approval checkpoint remains required: YES.** The mandatory legitimacy gate rates `orval` as `SUS` because its current release is recent, despite verified official provenance, high usage, no postinstall, Node compatibility, and direct-Fetch output evidence.
