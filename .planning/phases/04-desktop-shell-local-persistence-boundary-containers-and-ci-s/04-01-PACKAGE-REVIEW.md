# Phase 04 Plan 01: Desktop Package Legitimacy Review

**Review status:** PENDING HUMAN DECISION  
**Evidence captured:** 2026-07-14  
**Registry:** npm (`https://registry.npmjs.org/`)  
**Installation status:** No installation or dependency transaction has occurred.

## Scope and reason for review

The four exact packages below are marked SUS for release recency only. The Phase 4 research did not identify malicious ownership, repository substitution, or install-time execution. This record exists because their registry publications are recent enough to require explicit human approval before any manifest, lockfile, scaffold, or dependency transaction may use them.

No alternative process-management stack was evaluated or substituted while gathering this evidence. The locked D-01 through D-04 desktop-owned local API lifecycle remains unchanged.

## Exact registry evidence

| Exact package | Published (UTC) | Publisher provenance | Official repository | npm integrity |
|---|---|---|---|---|
| `@tauri-apps/cli@2.11.4` | `2026-06-28T17:58:47.722Z` | GitHub Actions trusted publisher; OIDC config `oidc:2d4e4735-5606-4c97-bdf1-7701e2485417` | `https://github.com/tauri-apps/tauri` | `sha512-R8xGtMpwyetawSqm9kYOuMmEqkhUbvcUy8n0aNXIxollKBLESUu5f4Fx+64hgASYm1H+jSWq6jCW6zqTnH6hqQ==` |
| `@tauri-apps/api@2.11.1` | `2026-06-17T13:41:27.442Z` | GitHub Actions trusted publisher; OIDC config `oidc:964e0eb7-ba94-4ca0-b3ad-e400b304ad07` | `https://github.com/tauri-apps/tauri` | `sha512-M2FPuYND2m+wh5hfW9ZpSdxMPdEJovPBWwoHJmwUpysTYNHaOkVFN419m/K0LIgjb/7KU2vBgsUepJWugQCvAA==` |
| `vite@8.1.4` | `2026-07-09T04:44:45.017Z` | GitHub Actions trusted publisher; OIDC config `oidc:a2e674b1-239b-4e35-a07f-7b43debc0a8c` | `https://github.com/vitejs/vite` (`packages/vite`) | `sha512-bTT9PsdWO+MQMNG9ZXIP/qM9wGh37DFxTV/sPq9cFpHr3w4jkgef032PkAL9jAqhk3Nz8NQw3O8n6/xFkqO4QQ==` |
| `@vitejs/plugin-react@6.0.3` | `2026-06-23T10:11:14.652Z` | GitHub Actions trusted publisher; OIDC config `oidc:edf31d29-a728-45df-ba8b-a16b612e2d5f` | `https://github.com/vitejs/vite-plugin-react` (`packages/plugin-react`) | `sha512-vmFvco5/QuC2f9Oj+wTk0+9XeDFkHxSamwZKYc7MxYwKICfvUvlMhqKI0VuICPltGqh1neqBKDvO4kes1ya8vg==` |

### Tarball and digest metadata

| Exact package | Tarball | SHA-1 shasum | npm registry signature key |
|---|---|---|---|
| `@tauri-apps/cli@2.11.4` | `https://registry.npmjs.org/@tauri-apps/cli/-/cli-2.11.4.tgz` | `eafeb0d3a7bd364d27014843fb0a84d9c972e626` | `SHA256:DhQ8wR5APBvFHLF/+Tc+AYvPOdTpcIDqOhxsBHRwC7U` |
| `@tauri-apps/api@2.11.1` | `https://registry.npmjs.org/@tauri-apps/api/-/api-2.11.1.tgz` | `cd6b13fc26403ca095a02e39ecdbec8048d2872d` | `SHA256:DhQ8wR5APBvFHLF/+Tc+AYvPOdTpcIDqOhxsBHRwC7U` |
| `vite@8.1.4` | `https://registry.npmjs.org/vite/-/vite-8.1.4.tgz` | `3cd711f31de805e5154ab47948349e693314d581` | `SHA256:DhQ8wR5APBvFHLF/+Tc+AYvPOdTpcIDqOhxsBHRwC7U` |
| `@vitejs/plugin-react@6.0.3` | `https://registry.npmjs.org/@vitejs/plugin-react/-/plugin-react-6.0.3.tgz` | `55f1d7f558534d10aef03c007dc208b7c3771ce4` | `SHA256:DhQ8wR5APBvFHLF/+Tc+AYvPOdTpcIDqOhxsBHRwC7U` |

The Tauri packages list the established `nothingismagick`, `lucasfernog`, `tauri-apps-ci-user`, `jbolda`, `fabianlars`, `amrbashir`, and `beanow` npm maintainers. The Vite packages list `yyx990803` and `vitebot`. The exact-version registry metadata identifies GitHub Actions (`npm-oidc-no-reply@github.com`) as publisher for every reviewed release.

## Lifecycle-script inspection

The exact-version `scripts` metadata was inspected for every package. None declares `preinstall`, `install`, `postinstall`, or `prepare`, so no consumer install-time lifecycle hook was found. This agrees with Phase 4 research, which specifically found no `postinstall` hook.

| Exact package | Scripts present in registry metadata | Consumer install hooks |
|---|---|---|
| `@tauri-apps/cli@2.11.4` | `artifacts`, `build`, `postbuild`, `build:debug`, `postbuild:debug`, `prepublishOnly`, `prepack`, `version`, `test`, `tauri` | None |
| `@tauri-apps/api@2.11.1` | `build`, `build:debug`, `npm-pack`, `npm-publish`, `ts:check`, `eslint:check`, `eslint:fix` | None |
| `vite@8.1.4` | `dev`, `build`, `build-bundle`, `build-types`, `build-types-roll`, `build-types-check`, `typecheck`, `lint`, `format`, `generate-target` | None |
| `@vitejs/plugin-react@6.0.3` | `dev`, `build`, `prepublishOnly`, `test-unit` | None |

`prepublishOnly` and `prepack` are package-publication/packing scripts; they are not consumer installation hooks. `postbuild` runs only when the package's own build command is invoked.

## Reproduction commands

These read-only commands were run successfully on 2026-07-14:

```text
pnpm view @tauri-apps/cli@2.11.4 repository dist.integrity scripts --json
pnpm view @tauri-apps/api@2.11.1 repository dist.integrity scripts --json
pnpm view vite@8.1.4 repository dist.integrity scripts --json
pnpm view @vitejs/plugin-react@6.0.3 repository dist.integrity scripts --json
```

Publication time, publisher, maintainers, tarball, shasum, integrity, signature, repository, and scripts were also read from each exact version's npm registry document. Registry reads do not install or execute package contents.

## Human decision gate

All four exact pins must receive one explicit human decision before Plan 04-03 or any other downstream dependency transaction may proceed:

- `@tauri-apps/cli@2.11.4`
- `@tauri-apps/api@2.11.1`
- `vite@8.1.4`
- `@vitejs/plugin-react@6.0.3`

To accept the set, record the approver name, date, and an explicit statement approving every exact package above. To reject it, record the rejected exact package and reason. Until then, `package.json`, `pnpm-lock.yaml`, application scaffolding, and installed dependencies must remain unchanged by this plan.

**Decision:** Pending  
**Approver:** —  
**Decision date:** —  
**Rationale or rejection reason:** —
