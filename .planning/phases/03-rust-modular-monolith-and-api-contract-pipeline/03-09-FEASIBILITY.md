# Phase 03 Plan 09: Public Generated Client Boundary Feasibility

**Investigated:** 2026-07-14  
**Decision:** **Impossible with the committed generated Fetch client, the exact approved `@hey-api/openapi-ts@0.97.3` configuration, and D-10's requirement that auth, SSE, retry/backoff machinery be neither publicly reachable nor invoked.**

## Scope and locked constraints

The remaining Phase 3 verification gap is not the presence of bundled generator-core files. The 2026-07-14 D-10 exception permits those files only while they are not exported, configured, invoked, or reachable through public generated types or metadata. The public package must still provide a usable generated minimum Fetch client, and generated output cannot be edited. [VERIFIED: `03-CONTEXT.md` D-09 through D-12; `03-VERIFICATION.md` gap and disconfirmation findings]

No new package, version change, wrapper client, hand-maintained request/response model, or generated-file patch is in scope. [VERIFIED: `03-CONTEXT.md` D-10/D-11; `03-08-PLAN.md`]

## Current public export graph

```text
@rivallo/contracts-client
  src/index.ts
    client (runtime) ------------------> generated/client.gen.ts
                                          creates generated Client
                                            request(options) --> beforeRequest(options)
                                              security --> setAuthParams --> core/auth.gen.ts
                                            sse.* --> createSseClient --> core/serverSentEvents.gen.ts
    createClient (runtime) ------------> generated/client/client.gen.ts (same graph)
    createConfig (runtime) ------------> generated/client/utils.gen.ts
                                          imports core auth/body/path utilities
    Client / Config / RequestOptions --> generated/client/types.gen.ts
                                          imports Auth, CoreConfig, ServerSentEventsOptions
```

The current root also re-exports `generated/index.ts`, which includes `Options`. That type imports the generated `Client`, so it is an additional compile-time route to the SSE-capable public client. [VERIFIED: `packages/contracts-client/src/index.ts`; `src/generated/index.ts`; `src/generated/sdk.gen.ts`]

## Runtime reachability

`client` is generated as `createClient(createConfig<ClientOptions2>())`; therefore even exporting only the generated singleton instead of `createClient` does not help. Its runtime object contains `sse` methods for every HTTP method. The same generated implementation calls `setAuthParams` whenever a caller supplies `security`, and every `sse.*` method calls `createSseClient`. The latter implements retries and exponential backoff. [VERIFIED: `packages/contracts-client/src/generated/client.gen.ts`; `src/generated/client/client.gen.ts`; `src/generated/core/serverSentEvents.gen.ts`]

Consequently, each of the following runtime exports is disallowed:

| Symbol | Why it is disallowed |
|---|---|
| `client` | Its object has `sse.*`; its `request` accepts a security-bearing options object. |
| `createClient` | Creates that same auth/SSE-capable object. |
| `createConfig` | Produces the `Config` shape that inherits core `auth`; it is part of the generated client configuration path. |
| `mergeHeaders` | Does not itself enable auth/SSE, but is a transport helper rather than a minimum client or contract artifact; exporting it cannot restore a usable client. |

The first three are the current public runtime API. Removing only `createClient` leaves the forbidden machinery reachable through `client`; removing both leaves no usable Fetch client. [VERIFIED: `packages/contracts-client/src/index.ts`; generated client implementation and core types]

## Compile-time type reachability

Type-only exports do not execute JavaScript, but D-10 expressly also prohibits reachability through public generated types or metadata. The following types are therefore disallowed:

| Type | Transitive forbidden surface |
|---|---|
| `Client` | Instantiates `CoreClient<..., SseFn>`; `sse` is therefore required. |
| `Config` | Extends `CoreConfig`, whose public `auth` property accepts an auth token/callback. |
| `RequestOptions` / `ResolvedRequestOptions` | Include `security?: ReadonlyArray<Auth>` and the SSE retry/backoff option fields. |
| `Options` | Extends `RequestOptions` and exposes `client?: Client`. |
| `CreateClientConfig` | Accepts and returns `Config`, so inherits the auth route. |

`RequestResult`, `ResponseStyle`, and `TDataShape` do not themselves name auth, SSE, retry, or backoff. They are insufficient to define a usable request API without an allowed client/request-options type. [VERIFIED: `packages/contracts-client/src/generated/client/types.gen.ts`; `src/generated/sdk.gen.ts`; `src/generated/core/types.gen.ts`]

## Maximum safe export set

The largest verified safe set is **type-only contract metadata**, not a Fetch client:

```ts
export type { ContractManifest } from './generated/types.gen.js';
export type { ClientOptions as ContractClientOptions } from './generated/types.gen.js';
export type { ClientOptions, ResponseStyle, RequestResult, TDataShape } from './generated/client/types.gen.js';
```

`ContractManifest` and both `ClientOptions` definitions contain only contract/base-URL/response-style data; they do not import core auth/SSE types. `RequestResult`, `ResponseStyle`, and `TDataShape` are likewise safe as isolated type declarations. There are **no safe runtime exports** that retain a usable generated Fetch client. [VERIFIED: `packages/contracts-client/src/generated/types.gen.ts`; `src/generated/client/types.gen.ts`]

This set deliberately excludes the current wildcard `export * from './generated/index.js'`, because it exports the unsafe `Options` type. It also excludes every `client` barrel export except the safe types above. [VERIFIED: `packages/contracts-client/src/index.ts`; `src/generated/index.ts`; `src/generated/client/index.ts`]

## Required regression assertions if the boundary is narrowed

These assertions can prove the metadata-only boundary, but cannot prove the original usable-client requirement:

1. Runtime import of `@rivallo/contracts-client` has an empty export-key list; specifically it has no `client`, `createClient`, `createConfig`, or `mergeHeaders` property.
2. A TypeScript consumer can import `ContractManifest`, `ContractClientOptions`, `ClientOptions`, `ResponseStyle`, `RequestResult`, and `TDataShape` from the package root.
3. A TypeScript negative fixture using `// @ts-expect-error` confirms that `Client`, `Config`, `RequestOptions`, `Options`, `CreateClientConfig`, `client`, `createClient`, and `createConfig` are not root exports.
4. Root source and generated public barrels/types/metadata contain no `Auth`, `security`, `sse`, `retry`, `backoff`, `core/auth`, or `core/serverSentEvents` reference.
5. Existing isolated complete-tree drift check still passes and leaves tracked generated output byte-identical.

Assertions 1--5 would satisfy the strict D-10 visibility condition only by abandoning D-09/D-10's usable minimum client. They must not be presented as a Phase 3 gap closure. [VERIFIED: `03-CONTEXT.md` D-09/D-10; `03-VERIFICATION.md`]

## Why generator configuration cannot repair this

The installed 0.97.3 generator exposes client options including `bundle`, but no option to omit selected core capabilities. With its default `bundle: true`, it copies the whole client-core directory. With `bundle: false`, generated output imports the external `@hey-api/client-fetch` runtime; that package is not installed and the prior feasibility audit established that it is unavailable at the approved matching version and cannot be introduced without new approval. Disabling SDK auth does not alter the Fetch client core. [VERIFIED: installed `@hey-api/openapi-ts@0.97.3` `dist/index.d.mts`; installed generator implementation; `03-08-FEASIBILITY.md`]

## Conclusion and required decision

There is no exact generated symbol set that simultaneously:

1. exports a usable Fetch client;
2. excludes `createClient` and configuration access; and
3. prevents public runtime and compile-time reachability of the generated auth, SSE, retry, and backoff machinery.

The only currently feasible choices are:

| Choice | Result |
|---|---|
| Export the metadata-only safe set above | Meets strict non-reachability, but fails the required minimum-client capability. |
| Keep a generated Fetch client public | Meets minimum-client capability, but violates the approved exception because `client` itself exposes and invokes the forbidden machinery. |
| Change the approved generator/runtime architecture | Requires a new human decision and package/version provenance review; it is outside this plan's authority. |

Therefore Phase 3 cannot close the remaining verification gap under the present locked constraints. A human must either revise the exception to permit the generated client capability surface, or approve a different generator/runtime architecture. [VERIFIED: local export/import graph; `03-CONTEXT.md`; `03-VERIFICATION.md`]

## Sources

- [VERIFIED: repository] `03-CONTEXT.md`, `03-VERIFICATION.md`, `03-08-PLAN.md`, and `03-08-FEASIBILITY.md` for the locked D-10 exception and previous generator experiment.
- [VERIFIED: local installation] `@hey-api/openapi-ts@0.97.3` `dist/index.d.mts` and implementation for `bundle` behavior and supported client options.
- [VERIFIED: generated tree] `packages/contracts-client/src/generated/client.gen.ts`, `client/{client,types,utils}.gen.ts`, `core/{auth,serverSentEvents,types}.gen.ts`, `index.ts`, and `sdk.gen.ts` for runtime and compile-time reachability.
