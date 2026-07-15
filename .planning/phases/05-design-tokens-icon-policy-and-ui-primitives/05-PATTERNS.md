# Phase 5 Pattern Mapping — Design Tokens, Icon Policy and UI Primitives

**Mapped:** 2026-07-15
**Purpose:** identify existing repository patterns that Phase 5 plans should reuse, and explicitly identify responsibilities with no real local analogue.

## Scope and dependency direction

The Phase 5 data flow is fixed by the approved context and UI contract:

```text
authored semantic tokens
  -> deterministic CSS emitter + contrast/integrity checks
  -> Rivallo styles, icons and primitives
  -> semantic DenseTable
  -> development-only UI Lab with deterministic fixtures
  -> DOM and browser evidence
```

The normal desktop path remains the explicit lifecycle shell. The UI Lab must be selected only at a development entry boundary and must not call Tauri, the local API, contracts, persistence, or network services. Production screens, dashboard data, tactics, a pitch, persistence, a mascot and final branding remain outside Phase 5.

## Closest local analogues

| Planned responsibility | Closest existing analogue | Reuse | Do not copy / missing precedent |
|---|---|---|---|
| Token authoring and CSS emission | `scripts/generate-contract-client.mjs`; `scripts/generate-openapi.mjs` | Repository-root resolution, explicit output target, deterministic writer, actionable failure | No token source or CSS emitter exists |
| Generated token drift check | `scripts/verify-contract-client-drift.mjs`; `scripts/verify-openapi-drift.mjs` | Generate into OS temp storage, byte/tree compare, never repair during check, cleanup in `finally`, print regeneration command | No colour conversion or contrast implementation exists |
| Token tests | `tooling-tests/contracts-client-generation.test.mjs`; `tooling-tests/openapi-pipeline.test.mjs` | Repeat generation, compare bytes, inject altered expected target, assert non-mutating failure | No current CSS/token/contrast tests |
| Bootstrap style migration | `apps/desktop/src/styles.css` | Preserve graphite intent, Inter, visible focus, explicit state colours and reduced motion | Replace raw values with semantic variables; do not preserve obsolete 3px/3px focus dimensions over the approved 2px/2px contract |
| Workspace icon package | `packages/contracts-client/package.json` and `src/index.ts` | Small private workspace package with one public TypeScript entrypoint | No icon wrapper, SVG registry or asset-versioning pattern exists |
| Primitive semantics | `apps/desktop/src/App.tsx` | Native elements, discriminated explicit states, `role=status/alert`, `aria-live`, `aria-busy`, native `disabled` | No reusable component API, Radix composition, CSS-module or component-test pattern exists |
| DenseTable | None | Use the repository's general native-first accessibility posture only | No table, sorting, selection, sticky header, column policy or table-test analogue exists |
| UI Lab entry boundary | `apps/desktop/src/main.tsx`; DEV disclosure in `App.tsx` | Keep one desktop mount, guard development-only content with `import.meta.env.DEV`, preserve `<App />` for normal operation | No router, route registry, Lab fixture, preview-frame or shell-proof pattern exists |
| Vitest DOM setup | `vitest.config.mjs`; Node tooling tests | Retain non-watch `vitest run`, deterministic test discovery and serial behavior where shared files are touched | Current Vitest is Node-only and contains no browser-like environment or React interaction harness |
| Playwright evidence | None | Follow repository non-watch/idempotent quality rules | No Playwright config, browser server fixture, screenshot policy or browser test exists |
| Root quality integration | `package.json`; `scripts/run-quality.mjs`; `.github/workflows/ci.yml` | Real named scripts, writer/check separation, fail-fast aggregate, explicit file coverage, CI reuse | Current lint covers only `.mjs`; current formatter list is explicit and must be extended for all Phase 5 files |

## Pattern 1 — deterministic authored-output pipeline

Use the contract pipeline as the direct structural analogue for tokens.

### Writer shape

`scripts/generate-contract-client.mjs:5-13` establishes repository-relative paths and permits an isolated output override:

```js
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = process.env.CONTRACT_CLIENT_OUTPUT
  ? resolve(process.env.CONTRACT_CLIENT_OUTPUT)
  : resolve(packageDirectory, 'src', 'generated', 'contracts.ts');
```

`scripts/generate-contract-client.mjs:20-24,36-40` fails with the real exit status and an actionable command. The token emitter should do the same, naming the token-generation command and surfacing the underlying detail. It must not install, update, or silently repair dependencies.

### Non-mutating drift checker shape

`scripts/verify-contract-client-drift.mjs:11-13,22-27` creates isolated output and directs the writer to it:

```js
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'rivallo-contract-client-'));
const result = spawnSync(process.execPath, ['scripts/generate-contract-client.mjs'], {
  cwd: repositoryRoot,
  env: { ...process.env, CONTRACT_CLIENT_OUTPUT: temporaryTarget },
});
```

`scripts/verify-contract-client-drift.mjs:36-53` compares the complete sorted inventory and bytes, reports the writer command, then removes temporary data in `finally`. The token check should copy this behavior for the complete generated CSS artifact rather than generating into the tracked path and using `git diff`.

For a single generated file, `scripts/verify-openapi-drift.mjs:40-46` is the smaller analogue:

```js
if (!readFileSync(temporaryDocument).equals(readFileSync(committedDocument))) {
  console.error('OpenAPI drift detected. Regenerate the committed document with:');
  console.error('pnpm contracts:openapi:generate');
  process.exitCode = 1;
}
```

### Test shape

`tooling-tests/contracts-client-generation.test.mjs:57-70` runs the writer twice and proves byte-identical output. Lines 73-85 prove the checker does not mutate committed output. Lines 88-107 copy the expected artifact into a temporary directory, introduce controlled drift, expect non-zero status and an actionable command, and prove the altered bytes remain unchanged.

The token pipeline should mirror all three guarantees:

1. repeated generation is byte-identical;
2. the check leaves tracked token output untouched;
3. controlled drift fails with the exact repair command and does not self-heal.

There is no existing contrast engine or OKLCH-to-sRGB resolver to copy. That implementation must be selected deliberately and tested against declared semantic foreground/background pairs; it must not infer arbitrary pairs or report idealized out-of-gamut values as browser evidence.

## Pattern 2 — preserve the lifecycle shell while migrating styles

`apps/desktop/src/App.tsx:4-28` models host state as a discriminated union (`initializing`, `ready`, `recoverableFailure`) instead of a truthy flag. Lines 106-171 render each state explicitly with appropriate live-region semantics. New Status, Skeleton, Error State and Button primitives should preserve this explicit-state model when the lifecycle shell adopts them.

Concrete semantics worth retaining:

```tsx
<div className="state-content" role="status" aria-live="polite" aria-busy="true">
```

from `apps/desktop/src/App.tsx:110-117`, and:

```tsx
<div className="failure-content" role="alert">
```

from `apps/desktop/src/App.tsx:130-138`.

`apps/desktop/src/styles.css` is the migration source, not a final token system:

- lines 1-14: Inter/system fallback, cold near-white foreground, graphite canvas;
- lines 32-36: a visible cyan focus outline;
- lines 81-90: tonal panel separation and explicit failure surface;
- lines 136-165: compact 6px controls and short functional transitions;
- lines 248-256: mandatory `prefers-reduced-motion` override.

Phase 5 should replace raw hexadecimal values, timing values, radii and layers in this file with semantic `--rv-*` properties emitted from the canonical token source. It must retain the lifecycle copy and behavior. The approved contract supersedes bootstrap literals where they differ: focus becomes 2px with 2px offset, controls remain 32px where applicable, and colour cannot be the only state cue.

`apps/desktop/src/main.tsx:7-17` is the stable mount boundary. `apps/desktop/src/App.tsx:154-169` is the only current development-only UI precedent:

```tsx
{import.meta.env.DEV && (
  <details className="development-diagnostics">...</details>
)}
```

Use the same explicit development guard at the UI Lab entry boundary, but do not embed the Lab inside a lifecycle state or make lifecycle readiness a prerequisite. The normal path must continue to render `App`; a production attempt to reach the Lab must resolve to the operational shell or a deliberate not-found outcome.

## Pattern 3 — small private workspace packages, with a real gap for icons

`packages/contracts-client/package.json:1-8` is the only real TypeScript workspace-package analogue:

```json
{
  "name": "@rivallo/contracts-client",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" }
}
```

`packages/contracts-client/src/index.ts:1` keeps the public surface behind one entrypoint. A `packages/icons` package can reuse this minimal package/entrypoint boundary and the existing `packages/*` workspace inclusion from `pnpm-workspace.yaml:1-3`.

No real local analogue exists for any of the following:

- a Lucide wrapper that constrains semantic names, 16/20/24 sizes and 1.75px optical weight;
- a typed football-SVG registry;
- original SVG source organization or version metadata;
- decorative versus meaningful icon accessibility metadata;
- visual/optical icon review at multiple sizes.

The plan must define these as new Rivallo contracts, not claim they copy the contracts-client generator. The only reusable aspect is package ownership and a narrow export surface. SVG paths must be original and must not be sourced from FootSim, other managers, crest libraries, emoji or a second icon family.

## Pattern 4 — native semantics and explicit state, with no component framework precedent

`apps/desktop/src/App.tsx:145-152` uses a native button with native disabled behavior and preserves action context while retrying. Lines 154-169 use native `details`, `summary`, `button`, `code` and a polite confirmation region. This is the correct native-first posture for Button, IconButton, TextField, Select, Checkbox, Pagination and ScrollArea.

The existing component is not an API template. There is no reusable component directory, polymorphic-prop convention, ref-forwarding convention, variant helper, Radix wrapper, portal provider, ID helper, form-field composition or component stylesheet organization. Plans must establish one coherent convention and apply it across the full approved inventory; they must not proliferate one-off files styled directly in the Lab.

The primitive dependency direction must remain:

```text
tokens + approved icon boundary
  -> native/Radix behavior primitives with Rivallo styling
  -> lifecycle shell adoption and UI Lab specimens
```

Primitive modules must not import `@tauri-apps/api`, `@rivallo/contracts-client`, API helpers, persistence code or product/domain types. Radix, where approved, supplies composite keyboard/focus behavior only; no shadcn output, theme package or generated visual registry is a local pattern or an allowed addition.

## Pattern 5 — DenseTable has no local analogue

There is no existing `<table>`, grid abstraction, sorting control, row-selection model, sticky header, responsive column policy, table fixture or table test in the repository. DenseTable must therefore be implemented directly from `05-UI-SPEC.md` rather than reverse-engineered from a local component.

New code should nevertheless follow established repository principles:

- native semantic elements before ARIA recreation;
- explicit finite state instead of ambiguous booleans;
- local deterministic data rather than side effects;
- no domain rules in React;
- no persistence, API, Tauri or contracts-client imports;
- non-mutating, non-watch verification.

The first implementation must begin with `<table>`, `<caption>`, `<thead>`, `<tbody>`, scoped headers and cells in a labelled native overflow region. A div-grid or a table framework would introduce a new, prohibited pattern. Compact/comfortable density and column visibility are local fixture state only. Server sorting, server pagination, virtualization, column-order persistence, saved views and a squad schema have no Phase 5 owner.

## Pattern 6 — UI Lab isolation and deterministic fixtures are new responsibilities

No router or route library is installed. `apps/desktop/vite.config.ts:1-7` contains only the React plugin, and `apps/desktop/src/main.tsx` mounts one `App`. The narrow analogue is therefore an entry-boundary predicate using Vite's existing `import.meta.env.DEV`, not adding a production navigation system merely to expose one internal route.

No local fixture convention exists. UI Lab fixtures should be committed TypeScript objects owned by the Lab or the primitive they exercise, with stable ordering and stable identifiers. They may include football-shaped names, statuses and nationality data only to exercise layout/accessibility. They must not become a player/club model, fetch data, invoke Tauri, import the generated contracts client, or simulate a tactical pitch.

No preview-frame or AppShell component exists. Expanded (232px) and collapsed (56px) navigation are proof compositions owned by the Lab, with local reset-on-reload state. They are not production product navigation and must not replace the lifecycle shell.

Styling should consume the same emitted semantic CSS variables and shared primitives as every specimen. A second hand-authored Lab palette or duplicate component implementations would violate the single-source direction.

## Pattern 7 — test/config growth must extend, not misrepresent, current coverage

`vitest.config.mjs:3-7` currently discovers only Node tooling tests:

```js
test: {
  include: ['tooling-tests/**/*.test.mjs'],
  fileParallelism: false,
}
```

There is no DOM environment, React rendering library, user-event helper or test setup file. Existing tests such as `tooling-tests/phase-4-desktop.test.mjs:65-108` inspect source text; that is useful for a static scope fence but is not a substitute for interaction tests. Primitive and DenseTable plans must add a real browser-like Vitest environment and assert roles, names, focus, keyboard operation, label/help/error association and live behavior through rendered DOM.

`apps/desktop/src/react-runtime.d.ts:1-47` is a narrow handwritten declaration sufficient only for the current bootstrap. It is not a component typing pattern. The Phase 5 dependency/type plan must account for real React component/event/ref types rather than continually expanding this shim ad hoc.

There is no Playwright package, configuration, web-server setup or browser test. The first Playwright plan must therefore define a real non-watch UI Lab suite, its Vite server lifecycle, three desktop viewport projects/evidence, reduced-motion and keyboard checks, and narrow artifact handling. Temporary browser output must be ignored; screenshots, traces, caches and sessions must not be committed accidentally. A screenshot baseline should be versioned only if the approved plan explicitly chooses deterministic visual regression evidence, not as incidental local output.

## Pattern 8 — root scripts, quality aggregate and CI

`package.json:6-24` is the canonical public command surface. New Phase 5 commands must be real and named by responsibility, following the existing writer/check split (`contracts:*:generate` versus `contracts:*:check`). Token generation may mutate only its declared generated artifact; token check, DOM tests, UI Lab browser checks and the aggregate must not modify tracked files.

`scripts/run-quality.mjs:35-55` verifies that every required root command exists. Lines 100-118 execute non-mutating checks in a fixed, fail-fast sequence and print the command that stopped on failure. `tooling-tests/workspace-config.test.mjs:32-56` explicitly enforces that writers are excluded from the non-mutating aggregate. Phase 5 should extend all three locations together when it adds token and browser checks.

`package.json:7-8` currently enumerates formatter inputs and lints only scripts/tooling configuration. Phase 5 must expand formatter and ESLint coverage to the new package, desktop TypeScript/TSX, component tests, generated CSS policy and Playwright configuration. New files must not escape quality merely because the current lists are narrow.

`.github/workflows/ci.yml:12-29` separates JavaScript/TypeScript checks from Rust/desktop checks and uses `pnpm install --frozen-lockfile`. Browser installation and the UI Lab browser command have no existing job analogue; the plan must add the minimum explicit CI setup needed for the chosen Playwright browser, without Docker or infrastructure dependencies.

`scripts/run-quality.mjs:65-98` and `scripts/check-toolchains.mjs:85-139` demonstrate actionable failures and cross-platform command handling. New helpers should report the failing artifact/pair/test plus a concrete repair command and return non-zero; they must never install or update tools automatically.

## Expected file roles for planning

Names below describe responsibilities and likely ownership; the planner may refine exact filenames while preserving the boundaries.

| Role | Likely location | Pattern source |
|---|---|---|
| Authored semantic token object and declared contrast pairs | `packages/design-tokens/src/*` or another single shared package | New responsibility; workspace package shell from `packages/contracts-client` only |
| Generated CSS custom properties | tracked generated CSS under the token package or desktop styles boundary | Writer/drift pattern from contract scripts |
| Token emitter and drift checker | `scripts/generate-*.mjs`, `scripts/verify-*-drift.mjs` | Contract generation/check scripts |
| Token integrity/drift tests | `tooling-tests/*token*.test.mjs` | Contract generation tests |
| Generic icon wrapper + original football registry | `packages/icons/src/*` | New responsibility; narrow workspace export analogue only |
| Shared primitive components and styles | `apps/desktop/src/ui/*` or a deliberately shared UI package | New API convention; native semantics from `App.tsx` |
| DenseTable and tests | alongside shared primitives and DOM tests | No local analogue; approved UI contract is canonical |
| UI Lab route, categories, fixtures and styles | isolated development-only desktop subtree | DEV guard from `App.tsx`; otherwise new responsibility |
| DOM test setup | Vitest config/setup plus colocated component tests | Extend current Vitest; no DOM analogue |
| UI Lab browser evidence | root Playwright config and narrow browser-test directory | No local analogue |
| Public commands and CI wiring | `package.json`, `scripts/run-quality.mjs`, `.github/workflows/ci.yml` | Existing real-command/fail-fast patterns |

## Non-negotiable preservation and scope fences

- Keep `App.tsx`'s explicit host lifecycle and recovery path available on the normal desktop entry; Phase 5 may restyle/adopt primitives but must not hide or reinterpret host state.
- Keep UI Lab independent of lifecycle readiness and every external service.
- Keep every drift/quality check idempotent and non-mutating; after checks on a clean repository, `git status --porcelain` must remain empty. Standard ignored caches/artifacts are allowed only under narrow ignore rules.
- Do not add production dashboard, squad, tactics, pitch, training, scouting, authentication, persistence, Docker, API endpoints, domain rules or real football data.
- Do not add shadcn, a theme system, a table framework, charting, a second icon family, copied SVGs/assets, a literal mascot or a final identity.
- Do not commit Playwright reports, incidental screenshots, traces, Impeccable caches/sessions or local credentials.
- Preserve desktop build and CI behavior established by Phase 4; the UI Lab is a local deterministic frontend proof, not a replacement for the Tauri host.
