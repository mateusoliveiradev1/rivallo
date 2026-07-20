# Phase 5 Exact Package Review

**Phase:** 5 — Design Tokens, Icon Policy and UI Primitives

**Plan:** 05-01

**Registry snapshot:** 2026-07-15; TanStack extension rechecked 2026-07-17

**Status:** Approved, including the later TanStack headless-table extension

## Purpose and boundary

This record is the mandatory supply-chain gate for the smallest package set that can implement the approved Phase 5 contract. It authorizes no dependency transaction by itself. No package manifest, workspace manifest, or lockfile changed while this review was produced.

The selected boundary is intentionally narrow:

- Lucide is the only generic icon family.
- Radix supplies behavior only for the seven composite controls whose keyboard, focus, portal, and dismissal behavior should not be hand-rolled.
- Native HTML remains responsible for buttons, fields, selects, checkboxes, radios, tables, pagination, and scrolling.
- Toast remains a Rivallo live-region implementation; no toast package is needed.
- Color.js supplies deterministic OKLCH parsing, sRGB conversion/gamut mapping, and WCAG contrast math.
- Testing Library, jsdom, React types, and Playwright provide real DOM and browser evidence.
- No scanner package is included; Playwright tests and the required manual accessibility evidence remain sufficient for this phase.

## Audit method

For every direct package below, the npm registry packument and exact published tarball were inspected on 2026-07-15. Tarballs were downloaded with `npm pack --ignore-scripts` into a temporary directory outside the repository. Their packed `package.json`, file inventory, exact name/version, declared scripts, dependencies, peers, license, and integrity were compared with registry metadata. No package lifecycle script was executed.

Every tarball integrity matched its registry `dist.integrity`. Every direct package had an npm registry signature. npm SLSA provenance attestations were present where stated below; absence is recorded rather than inferred. An OSV query for each exact direct package/version returned no known direct advisory at the snapshot time. OSV and registry results are point-in-time evidence, not a replacement for the frozen lockfile and later CI checks.

## Canonical exact inventory

Canonicalization is UTF-8, one row per direct package, JavaScript code-point sort, joined by `\n` with no terminal newline. Each row is `name@version|scope|integrity`.

<!-- phase-5-package-inventory:start -->

@playwright/test@1.61.1|root-dev|sha512-8nKv6+0RJSL9FE4jYOEGXnPeM/Hg12qZpmqzZjRh3qM0Y7c3z1mrOTfFLids72RDQYVh9WpLEfR5WdpNX4fkig==
@radix-ui/react-alert-dialog@1.1.19|desktop-runtime|sha512-FA7n1f6D/DwGE0+AWxiY5LacNbbExQuEgMubeG06idEaH+mSLuf9dp/qBNqOnvbTQ+4gZ2ue1RATF1Ub91Mg5g==
@radix-ui/react-dialog@1.1.19|desktop-runtime|sha512-+HhbN2+YtkRgVirjZ2afMeutQRuGOrdkWR5+EFC58SJojGmtyNQwYzgi6tHBpOxvFHefMtPeHdgtjz0BOGxFQg==
@radix-ui/react-dropdown-menu@2.1.20|desktop-runtime|sha512-slfm+rRaZRuQBvHq60lXvSVUPhid0IPtjSZzIuUlWZMUs01iYZNlGS3mJgRD3ChLQVBAYlKiL/tFyWGX+dz8Xw==
@radix-ui/react-popover@1.1.19|desktop-runtime|sha512-jkrTdQVxnIB8fpn0NyyxW9CTB5aCXZZelVz5z+Xmii6g5WxMqS3fInNslZ63puP39+Puu4jYohUK31y3dT87gQ==
@radix-ui/react-switch@1.3.3|desktop-runtime|sha512-1+mlB4/lxJfk5tgJ4g+R5mUCbRpPE1T9+UsEyeLYbGgMtwiMgmuTnfKz4Mw1nHALHjuwyxw4MLd4cSHn6pNSlQ==
@radix-ui/react-tabs@1.1.17|desktop-runtime|sha512-nRyXnrAVCwjeXcHbvEbLS6ndbTeKHG1RqCP4A8Gw5L4cemDzPXdD8rAmr6wet0v57R69wGvuIIsFjHSVkZiMzQ==
@radix-ui/react-tooltip@1.2.12|desktop-runtime|sha512-U3HoftgWnmla78vzQbLvKKb7bUYJxoiiqYFzp1wu/TBMyDqMZSuCl3aRICsD6EfVEwcJD2mumGDGUXLFVqQHKA==
@tanstack/react-table@8.21.3|desktop-runtime|sha512-5nNMTSETP4ykGegmVkhjcS8tTLW6Vl4axfEGQN3v0zdHYbK4UfoqfPChclTrJ4EoK9QynqAu9oUf8VEmrpZ5Ww==
@testing-library/dom@10.4.1|root-dev|sha512-o4PXJQidqJl82ckFaXUeoAW+XysPLauYI43Abki5hABd853iMhitooc6znOnczgbTYmEP6U6/y1ZyKAIsvMKGg==
@testing-library/react@16.3.2|root-dev|sha512-XU5/SytQM+ykqMnAnvB2umaJNIOsLF3PVv//1Ew4CTcpz0/BRyy/af40qqrt7SjKpDdT1saBMc42CUok5gaw+g==
@testing-library/user-event@14.6.1|root-dev|sha512-vq7fv0rnt+QTXgPxr5Hjc210p6YKq2kmdziLgnsZGgLJ9e6VAShx1pACLuRjd/AS/sr7phAR58OIIpf0LlmQNw==
@types/react-dom@19.2.3|root-dev|sha512-jp2L/eY6fn+KgVVQAOqYItbF0VY/YApe5Mz2F0aykSO8gx31bYCZyvSeYxCHKvzHG5eZjc+zyaS5BrBWya2+kQ==
@types/react@19.2.17|root-dev|sha512-MXfmqaVPEVgkBT/aY0aGCkRWWtByiYQXo3xdQ8r5RzuFrPiRn8Gar2tQdXSUQ2GKV3bkXckek89V8wQBY2Q/Aw==
colorjs.io@0.6.1|design-tokens-runtime|sha512-8lyR2wHzuIykCpqHKgluGsqQi5iDm3/a2IgP2GBZrasn2sBRkE4NOGsglZxWLs/jZQoNkmA/KM/8NV16rLUdBg==
jsdom@27.0.1|root-dev|sha512-SNSQteBL1IlV2zqhwwolaG9CwhIhTvVHWg3kTss/cLE7H/X4644mtPQqYvCfsSrGQWt9hSZcgOXX8bOZaMN+kA==
lucide-react@1.24.0|icons-runtime|sha512-YT6mBD8lGKkg4nM39enlm94/sfJIiW0YKUT60fBy4YK8tai31ylg1VhGNWxkpSKHo9UagfnZqwIff3HTDQwXeA==
<!-- phase-5-package-inventory:end -->

### Scope ownership

| Scope                   | Future owner                          | Dependency section |
| ----------------------- | ------------------------------------- | ------------------ |
| `root-dev`              | root `package.json`                   | `devDependencies`  |
| `desktop-runtime`       | `apps/desktop/package.json`           | `dependencies`     |
| `icons-runtime`         | `packages/icons/package.json`         | `dependencies`     |
| `design-tokens-runtime` | `packages/design-tokens/package.json` | `dependencies`     |

The two future internal links `@rivallo/icons: workspace:*` and `@rivallo/design-tokens: workspace:*` are workspace wiring, not registry rows. Plan 05-02 separately constrains them and permits no other new workspace link.

## Package evidence

### Generic icons

#### `lucide-react@1.24.0` — `icons-runtime`

- **Need:** the sole generic icon family behind the Rivallo `Icon` boundary. Hand-authored generic controls would create inconsistent geometry and duplicate a mature icon set; football-specific concepts remain original Rivallo SVGs.
- **Registry/repository:** [npm](https://www.npmjs.com/package/lucide-react/v/1.24.0); [Lucide monorepo, `packages/lucide-react`](https://github.com/lucide-icons/lucide/tree/main/packages/lucide-react).
- **Publisher evidence:** registry maintainer `ericfennis`; npm signature and SLSA provenance attestation present.
- **Published/license:** 2026-07-09T13:25:23.345Z; ISC.
- **Scripts:** registry metadata and packed tarball agree on build/test/typecheck scripts. `preinstall`, `install`, `postinstall`, and `prepare` are absent.
- **Dependencies/peers:** no direct dependency; peer `react ^16.5.1 || ^17 || ^18 || ^19`, compatible with React 19.2.7.
- **Risk:** the tarball contains the full icon corpus and is large when unpacked. Consumption must use static named imports through the wrapper so Vite can tree-shake it. No second icon family is allowed.

### Composite behavior

All seven Radix packages are MIT licensed, come from [radix-ui/primitives](https://github.com/radix-ui/primitives), and list the same established maintainers (`hadihallak`, `chancestrickland`, `mark-workos`, and the WorkOS npm service publisher). Each exact release has an npm signature and SLSA provenance attestation. Registry metadata and packed tarballs agree: only lint/build/clean/reset/typecheck scripts are declared; `preinstall`, `install`, `postinstall`, and `prepare` are absent.

Their common peers accept React and React DOM through 19 and declare `@types/react`/`@types/react-dom` as optional peers. This matches React 19.2.7 and the exact official type packages in this inventory.

| Package                                | Published                | Registry / repository directory                                                                                                                                                | Required behavior                                                                           | Published direct dependency inventory                                                                                                                                                       |
| -------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@radix-ui/react-alert-dialog@1.1.19`  | 2026-07-06T22:06:10.525Z | [npm](https://www.npmjs.com/package/@radix-ui/react-alert-dialog/v/1.1.19) / [`alert-dialog`](https://github.com/radix-ui/primitives/tree/main/packages/react/alert-dialog)    | Safe destructive-confirmation focus semantics distinct from a normal dialog                 | `@radix-ui/primitive`, `react-compose-refs`, `react-context`, `react-dialog`, `react-primitive`                                                                                             |
| `@radix-ui/react-dialog@1.1.19`        | 2026-07-06T22:06:09.867Z | [npm](https://www.npmjs.com/package/@radix-ui/react-dialog/v/1.1.19) / [`dialog`](https://github.com/radix-ui/primitives/tree/main/packages/react/dialog)                      | Modal focus entry, containment, dismissal, portal, and invoker return                       | `aria-hidden`, `react-remove-scroll`, and Radix compose-refs/context/dismissable-layer/focus-guards/focus-scope/id/portal/presence/primitive/slot/controllable-state                        |
| `@radix-ui/react-dropdown-menu@2.1.20` | 2026-07-06T22:06:16.457Z | [npm](https://www.npmjs.com/package/@radix-ui/react-dropdown-menu/v/2.1.20) / [`dropdown-menu`](https://github.com/radix-ui/primitives/tree/main/packages/react/dropdown-menu) | Menu trigger, roving keyboard navigation, checked/disabled items, Escape, and focus return  | Radix primitive/compose-refs/context/id/menu/react-primitive/controllable-state                                                                                                             |
| `@radix-ui/react-popover@1.1.19`       | 2026-07-06T22:06:22.270Z | [npm](https://www.npmjs.com/package/@radix-ui/react-popover/v/1.1.19) / [`popover`](https://github.com/radix-ui/primitives/tree/main/packages/react/popover)                   | Contextual non-modal portal, positioning, outside/Escape close, and focus return            | `aria-hidden`, `react-remove-scroll`, and Radix primitive/compose-refs/context/dismissable-layer/focus-guards/focus-scope/id/popper/portal/presence/react-primitive/slot/controllable-state |
| `@radix-ui/react-switch@1.3.3`         | 2026-07-06T22:06:27.409Z | [npm](https://www.npmjs.com/package/@radix-ui/react-switch/v/1.3.3) / [`switch`](https://github.com/radix-ui/primitives/tree/main/packages/react/switch)                       | Named keyboard-operable switch semantics and controlled/uncontrolled state                  | Radix primitive/compose-refs/context/react-primitive/controllable-state/use-previous/use-size                                                                                               |
| `@radix-ui/react-tabs@1.1.17`          | 2026-07-06T22:06:29.196Z | [npm](https://www.npmjs.com/package/@radix-ui/react-tabs/v/1.1.17) / [`tabs`](https://github.com/radix-ui/primitives/tree/main/packages/react/tabs)                            | Roving focus, arrow navigation, and stable tab/panel association                            | Radix primitive/context/direction/id/presence/react-primitive/roving-focus/controllable-state                                                                                               |
| `@radix-ui/react-tooltip@1.2.12`       | 2026-07-06T22:06:31.377Z | [npm](https://www.npmjs.com/package/@radix-ui/react-tooltip/v/1.2.12) / [`tooltip`](https://github.com/radix-ui/primitives/tree/main/packages/react/tooltip)                   | Keyboard/hover supplemental descriptions, delay management, Escape, portal, and positioning | Radix primitive/context/compose-refs/dismissable-layer/id/popper/portal/presence/controllable-state/slot/visually-hidden/react-primitive                                                    |

**Transitive risk assessment:** these packages share a pure-JavaScript Radix graph for portals, focus scopes/guards, dismissable layers, controllable state, roving focus, and Popper positioning. Dialog and Popover also lead to `aria-hidden` and the `react-remove-scroll` family; Popper leads to Floating UI. This is a wider graph than native controls, which is why native HTML remains the default everywhere else. The graph has no product styling, persistence, network client, database code, or native build requirement. Plan 05-02 must freeze and compare every resolved transitive in `pnpm-lock.yaml` before implementation.

### Headless table extension

#### `@tanstack/react-table@8.21.3` — `desktop-runtime`

- **Approval context:** Mateus explicitly approved the incremental hybrid TanStack adoption on 2026-07-17. Rivallo retains ownership of durable views, migrations, validation, sizing, pinning and product semantics; TanStack is limited to headless row/table mechanics.
- **Registry/repository:** [npm](https://www.npmjs.com/package/@tanstack/react-table/v/8.21.3); [TanStack Table, `packages/react-table`](https://github.com/TanStack/table/tree/main/packages/react-table).
- **Published/license:** 2025-04-14T20:20:18.966Z; MIT.
- **Integrity/scripts:** registry and lockfile agree on `sha512-5nNMTSETP4ykGegmVkhjcS8tTLW6Vl4axfEGQN3v0zdHYbK4UfoqfPChclTrJ4EoK9QynqAu9oUf8VEmrpZ5Ww==`; the published package declares no lifecycle scripts.
- **Dependencies/peers:** one pure-JavaScript dependency, `@tanstack/table-core@8.21.3`; React and React DOM peers are `>=16.8`, compatible with the frozen React 19.2.7 runtime.
- **Risk boundary:** no styling, persistence, network, native code or domain authority enters through this package. A wholesale table rewrite remains out of scope.

### Color resolution

#### `colorjs.io@0.6.1` — `design-tokens-runtime`

- **Need:** deterministic parsing of authored OKLCH, conversion/gamut mapping to browser-targeted sRGB, and WCAG 2.x contrast computation. CSS computed styles are not available in the Node token generator, and a local color-science implementation would be a high-risk duplicate of specification work.
- **Registry/repository:** [npm](https://www.npmjs.com/package/colorjs.io/v/0.6.1); [color-js/color.js](https://github.com/color-js/color.js).
- **Publisher evidence:** registry maintainers `jgerigmeyer`, `leaverou`, `mysteryblokhed`, and `svgeesus`; npm signature present; npm provenance attestation absent for this exact release.
- **Published/license:** 2026-01-15T22:26:21.953Z; MIT.
- **Scripts:** metadata and packed tarball match. A `prepack` build exists for publisher packaging; `preinstall`, `install`, `postinstall`, and `prepare` are absent.
- **Dependencies/peers:** none. Types are included. The `colorjs.io/fn` export supports narrow functional imports and tree-shaking.
- **Risk:** the source/map-rich tarball is large, but the dependency graph is zero and the implementation can import only required functions. Version 0.6.1 is selected instead of the four-day-old 0.7.0 release to retain a longer observation window while preserving required color functionality.

### DOM interaction tests

The Testing Library packages are MIT licensed and published by the established Testing Library maintainer group. They use accessible roles/names and user-level interaction sequences, which React's renderer alone does not provide.

| Package                              | Published                | Registry / repository                                                                                                                                    | Publisher evidence                                                                | Scripts and dependency risk                                                                                                                                                                                          |
| ------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@testing-library/dom@10.4.1`        | 2025-07-27T13:23:37.151Z | [npm](https://www.npmjs.com/package/@testing-library/dom/v/10.4.1) / [dom-testing-library](https://github.com/testing-library/dom-testing-library)       | Testing Library maintainers; npm signature present; provenance attestation absent | No install/prepare hook in metadata or tarball. Eight pure-JS direct dependencies: Babel runtime/code-frame, aria-query and its types, DOM accessibility API, lz-string, picocolors, and pretty-format. Node `>=18`. |
| `@testing-library/react@16.3.2`      | 2026-01-19T10:59:08.185Z | [npm](https://www.npmjs.com/package/@testing-library/react/v/16.3.2) / [react-testing-library](https://github.com/testing-library/react-testing-library) | Testing Library maintainers; npm signature and SLSA provenance present            | No install/prepare hook. Direct `@babel/runtime`; required peer `@testing-library/dom ^10`; React/DOM and optional type peers accept 18 or 19. Node `>=18`.                                                          |
| `@testing-library/user-event@14.6.1` | 2025-01-21T17:35:55.574Z | [npm](https://www.npmjs.com/package/@testing-library/user-event/v/14.6.1) / [user-event](https://github.com/testing-library/user-event)                  | Testing Library maintainers; npm signature present; provenance attestation absent | No install/prepare hook and no direct dependency. Required peer `@testing-library/dom >=7.21.4`, satisfied by 10.4.1.                                                                                                |

**Transitive risk assessment:** the graph is dev-only and pure JavaScript. Its semantic query data (`aria-query`, `dom-accessibility-api`) and formatting/Babel helpers are broader than direct DOM calls, but they are necessary to test accessible behavior rather than implementation details. No jest-dom matcher package is needed; Vitest assertions remain sufficient.

### Official React types

| Package                   | Published                | Registry / repository                                                                                                                                                                | Publisher evidence                                                                                      | Scripts and dependency risk                                                                 |
| ------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `@types/react@19.2.17`    | 2026-06-05T20:10:24.692Z | [npm](https://www.npmjs.com/package/@types/react/v/19.2.17) / [DefinitelyTyped `types/react`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react)            | npm maintainer `types` (`ts-npm-types@microsoft.com`); signature present; provenance attestation absent | Metadata and tarball contain no scripts. Only direct dependency is `csstype ^3.2.2`.        |
| `@types/react-dom@19.2.3` | 2025-11-12T04:37:39.524Z | [npm](https://www.npmjs.com/package/@types/react-dom/v/19.2.3) / [DefinitelyTyped `types/react-dom`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-dom) | npm maintainer `types` (`ts-npm-types@microsoft.com`); signature present; provenance attestation absent | Metadata and tarball contain no scripts. Peer `@types/react ^19.2.0`, satisfied by 19.2.17. |

The current bootstrap declaration shim is intentionally minimal and cannot type the Phase 5 component/ref/event surface safely. These exact packages match React/React DOM 19.2.x and allow the shim to be narrowed or removed under typecheck in Plan 05-02.

### Browser-like DOM environment

#### `jsdom@27.0.1` — `root-dev`

- **Need:** Vitest component tests require a real browser-like DOM boundary with focus, keyboard, labels, portals, table semantics, and automatic cleanup. A hand-written global DOM shim would be incomplete and misleading.
- **Registry/repository:** [npm](https://www.npmjs.com/package/jsdom/v/27.0.1); [jsdom/jsdom](https://github.com/jsdom/jsdom).
- **Publisher evidence:** established jsdom maintainer group (`timothygu`, `domenic`, `sebmaster`, `zirro`, `tmpvar`, `joris-van-der-wel`); npm signature present; provenance attestation absent for this exact release.
- **Published/license:** 2025-10-18T06:50:56.542Z; MIT.
- **Scripts:** registry metadata and packed tarball match. A source-generation `prepare` script is present; `preinstall`, `install`, and `postinstall` are absent. Registry-tarball installation is not expected to run `prepare`; Plan 05-02 must fail closed if pnpm reports any unapproved build execution.
- **Dependencies/peers:** 20 pure-JS direct dependencies covering selectors/CSS, URLs, cookies, encoding/XML, proxy agents, parsing, and WebSocket behavior. Optional peer `canvas ^3` is not part of this inventory and must remain absent.
- **Risk:** this is the largest dev-only transitive graph and emulates many web APIs. Tests must keep external resource loading disabled and use deterministic local fixtures. Version 27.0.1 is intentionally selected because its Node `>=20` engine preserves Rivallo's Node 22.0.0+ contract; jsdom 27.2+, 28, and 29 require later Node 22 minors and would silently narrow support.

### Real browser evidence

#### `@playwright/test@1.61.1` — `root-dev`

- **Need:** jsdom cannot prove layout at 1366×768/1920×1080/2560×1080, actual focus visibility, reduced motion, production route exclusion, or deterministic browser screenshots. Playwright supplies the Chromium-only evidence required by the UI contract.
- **Registry/repository:** [npm](https://www.npmjs.com/package/@playwright/test/v/1.61.1); [microsoft/playwright](https://github.com/microsoft/playwright).
- **Publisher evidence:** Microsoft Playwright maintainers and `playwright-bot`; npm signature and SLSA provenance attestation present.
- **Published/license:** 2026-06-23T19:49:12.825Z; Apache-2.0.
- **Scripts:** registry metadata and packed direct tarball contain no scripts, including no install hook.
- **Dependencies/peers:** exact direct `playwright 1.61.1`, which resolves exact `playwright-core 1.61.1`; Playwright declares optional `fsevents 2.3.2` for macOS. Node `>=18`.
- **Risk:** browser binaries are large external tooling and must be installed explicitly by the documented Playwright command in Plan 05-09, never by a quality command. The suite is Chromium-only, dev/test-only, writes evidence only to ignored locations, and publishes no CI artifacts.

## Aggregate transitive and lifecycle assessment

- All 16 direct tarball integrities match registry metadata and all direct packages have npm signatures.
- No direct package declares `preinstall`, `install`, or `postinstall`.
- `colorjs.io` has publisher-only `prepack`; `jsdom` contains source-generation `prepare`. Neither is an authorized install action. The existing pnpm build allowlist remains unchanged until the exact transaction is reviewed.
- The largest transitive surfaces are Radix behavior, jsdom's web-platform emulation, Testing Library's semantic-query data, and Playwright's browser tooling. They are constrained to the owning package and dev/runtime boundary above.
- No direct package introduces persistence, HTTP product clients, analytics, telemetry, styling themes, a component appearance system, table virtualization, charting, routing, or football content.
- Plan 05-02 must re-query registry evidence, preserve every baseline dependency, freeze the exact lockfile graph, compare every approved direct integrity, and abort on any divergence.

## Explicit exclusions

This inventory contains none of the following:

- shadcn packages, CLI, registry output, preset, or theme;
- table/grid or virtualization frameworks;
- chart packages;
- a second generic icon family;
- router packages used only by the development Lab;
- mascot, crest, branding, flag, or copied football asset packages;
- axe/scanner packages, toast packages, custom-scroll packages, or speculative future dependencies.

DenseTable remains semantic native HTML. Radios remain native. Toast remains a bounded live region. ScrollArea remains native overflow. Football icons remain original versioned Rivallo SVGs.

## Mateus decision record

To approve, change only the first three fields below to the exact approved values and a real ISO-8601 timestamp with timezone. Do not edit an inventory row or the digest while deciding. Any inventory change requires a new digest and a new human review.

Decision: APPROVED
Approved by: Mateus
Approved at: 2026-07-17T18:55:00-03:00
Inventory digest: sha256:557f4d9a4e4c70efbc32a73e684c88767bb8d350870c8b3e25083c13660ab7f1
