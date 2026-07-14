# Phase 03 Plan 08: Generated Fetch Client Feasibility

**Investigated:** 2026-07-14  
**Decision:** **Not feasible under the current locked D-10 wording and exact `@hey-api/openapi-ts@0.97.3` pin.**

## Scope and evidence

The unresolved requirements are a public generated Fetch client and a generated tree with no auth, retry/backoff, or SSE mechanism. D-10 permits only types, contract metadata, and a minimum client; D-11 forbids manually editing generated output. [VERIFIED: `03-CONTEXT.md` D-10/D-11; `03-VERIFICATION.md` truths 8–9]

The current config explicitly selects `@hey-api/typescript`, `@hey-api/sdk`, and `@hey-api/client-fetch`; its generated tree contains `core/auth.gen.ts` and `core/serverSentEvents.gen.ts`, while the public barrel exports types only. [VERIFIED: local `packages/contracts-client/openapi-ts.config.ts`, generated tree, and `03-VERIFICATION.md`]

## Exact supported configuration findings

`@hey-api/openapi-ts@0.97.3` declares the client-plugin options `baseUrl`, `bundle`, `runtimeConfigPath`, and `strictBaseUrl`; it does **not** declare an option to omit selected client-core modules. Its default client configuration sets `bundle: true`. [VERIFIED: installed `dist/index.d.mts` and `dist/init-D3VuY80Z.mjs`]

With `bundle: true` (the current/default setting), the installed generator's `generateClientBundle()` recursively copies the entire Fetch client directory and the entire shared `client-core` directory into generated output. That implementation copies auth and SSE support as part of the core directory; no supported per-module exclusion point was found in the installed declarations or implementation. [VERIFIED: installed `dist/init-D3VuY80Z.mjs`]

`@hey-api/sdk` supports `auth: false`, but its documented/declared scope is generated SDK-operation auth mechanisms. It does not change the client-core bundle-copy path, so it cannot remove `core/auth.gen.ts` or `core/serverSentEvents.gen.ts`. [VERIFIED: installed `dist/index.d.mts` and `dist/init-D3VuY80Z.mjs`]

### `bundle: false` test

`bundle: false` is a supported type-level configuration value, but it is **not workable in this repository as a shipped public client**. In that mode, the generator computes the runtime module as the plugin name, `@hey-api/client-fetch`, instead of the generated `client/index.ts`; generated client code therefore imports that package. [VERIFIED: installed `dist/index.d.mts` and `dist/init-D3VuY80Z.mjs`]

Read-only resolution test from the repository: `node --input-type=module -e "import('@hey-api/client-fetch')..."` exited non-zero with `ERR_MODULE_NOT_FOUND`; `node_modules/@hey-api/client-fetch/package.json` is absent. No repository source was changed for this test. [VERIFIED: local Node resolution test]

The authoritative npm metadata for `@hey-api/client-fetch` states that it has been deprecated because, starting with `@hey-api/openapi-ts` v0.73.0, the client is bundled directly inside the generator. The registry has no `@hey-api/client-fetch@0.97.3`; its published versions end at `0.13.1`. [VERIFIED: npm registry metadata]

## Recommendation

Do not implement Plan 03-08 as written. The exact approved generator can satisfy either side independently, but not both together:

| Choice | Public generated Fetch client | No generated auth/SSE/retry modules | Result |
|---|---:|---:|---|
| Keep `bundle: true` | Yes (after transparent re-export) | No | Fails D-10 inventory |
| Set SDK `auth: false`, keep bundle | Yes | No | Fails D-10 inventory |
| Set `bundle: false` | Only with an external runtime package | Potentially avoids copied modules | Runtime package is unavailable at the generator pin and deprecated |

The smallest technically honest alternative is an explicit D-10 exception that permits the generator-owned Fetch core (including its dormant auth/SSE capabilities) while retaining no configured security schemes, no product auth/retry behavior, and no wrapper behavior. This would allow the existing approved pin, generated-only ownership, deterministic output, and a public transparent re-export. [VERIFIED: local generated client, OpenAPI input, and installed generator]

If the prohibition must remain literal at the file/module level, select a different generator/runtime architecture in a newly approved plan; a handwritten client, pruning generated files, or patching generated output violates D-10/D-11 and the current plan. [VERIFIED: `03-08-PLAN.md`; `03-CONTEXT.md` D-10/D-11]

## Runtime package and public import contract

There is **no approved runtime package addition** for the current pin. `@hey-api/openapi-ts@0.97.3` is already the exact human-approved dev dependency. [VERIFIED: `package.json`; `03-VERIFICATION.md` truth 4]

The only prospective package exposed by `bundle:false` is `@hey-api/client-fetch`; it cannot be pinned compatibly to `0.97.3` because that version does not exist. The legitimacy seam rates the package **SUS** because it is deprecated, although npm registry metadata confirms its official `hey-api/openapi-ts` repository and no postinstall script. [VERIFIED: npm registry metadata; `gsd-tools package-legitimacy check`]

**Required approval checkpoint:** before any package installation or generator/version change, obtain human approval for a replacement package/version and rerun package legitimacy, npm registry, and postinstall checks. Do not add deprecated `@hey-api/client-fetch@0.13.1` as a workaround; it is neither version-aligned nor approved. [VERIFIED: npm registry metadata; `gsd-tools package-legitimacy check`]

If the exception alternative is approved, the package boundary can expose only generator-owned symbols, for example:

```ts
export { client } from './generated/client.gen.js';
export { createClient, createConfig } from './generated/client/index.js';
export type { Config, ClientOptions } from './generated/client/index.js';
export type { ClientOptions as ContractClientOptions } from './generated/types.gen.js';
```

This is a transparent ESM re-export contract, not a handwritten transport/client. Exact export names must be verified against the regenerated tree before implementation. [VERIFIED: local `client.gen.ts` and `client/index.ts`]

## Small experiment plan and acceptance assertions

After a D-10 exception or a newly approved generator is selected, run the experiment in an isolated temporary output directory only:

1. Generate from the committed local `contracts/openapi.json` using the exact selected config and compare the full temporary inventory with the committed tree.
2. Import the package root (not a private generated path) and assert the documented generated `client`, factory/configuration symbols, and schema/metadata types are reachable.
3. Assert the selected policy: either (a) approved generator-core files are present but no OpenAPI security scheme, retry configuration, or product wrapper exists, or (b) literal D-10 scans find no auth/SSE/retry file or symbol.
4. Run the existing isolated drift check and verify that it leaves the tracked generated tree unchanged.

Acceptance for the current literal policy is **impossible** with the existing pin: a regenerated bundled tree necessarily includes the copied core modules, while unbundled output has an unresolved/deprecated runtime import. [VERIFIED: installed generator implementation, local resolution test, and npm registry metadata]

## Sources

- [Hey API Fetch client documentation](https://heyapi.dev/docs/openapi/typescript/clients/fetch) — official plugin/client behavior. [CITED: heyapi.dev]
- Installed `@hey-api/openapi-ts@0.97.3` declarations and implementation — exact configuration and bundle behavior. [VERIFIED: local installation]
- npm registry metadata for `@hey-api/client-fetch` and `@hey-api/openapi-ts@0.97.3` — package/version/deprecation and postinstall checks. [VERIFIED: npm registry]
- Phase 03 context, plan, verification, and generated package — locked scope and observed gap. [VERIFIED: repository]
