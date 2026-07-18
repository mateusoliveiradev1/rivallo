---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: MVP1 and MVP2 canonical planning
current_phase: 06.5
current_phase_name: World Database, Editors and Modding Foundation
current_plan: 1
status: complete
stopped_at: Phase 06.5 UAT approved and handoff ready; Phase 06.6 not started
last_updated: '2026-07-18T07:08:00-03:00'
last_activity: 2026-07-18
last_activity_desc: Phase 06.5 world database, editor, export and UAT completed without starting Phase 06.6
---

# State

## Current checkpoint

- **Input checkpoint da Fase 06.5:** `b5fc7253f32dd74e6ae5ee56d3b6f95aca8622f3`.
- **Implementação principal:** `c37616339477340a9347d595648f2ad77eadece3`.
- **Checkpoint final de produção da Fase 06.5:** `8ff81261eaedab6b2d94b2fa1dcd4e15b03357c1`.
- **Current execution state:** Fase 06.5 concluída, review limpo e UAT funcional 9/9 aprovada.
- **Current executable product:** matchday e perfis existentes alimentados por
  `official.rivallo.foundation`, com `/data-editor`, validação, catálogo, exportação atômica e
  fingerprint determinístico.
- **Implementation pointer:** Fase 06.6 é a próxima fase canônica e **não foi iniciada**.
- **Planning horizon:** complete MVP1 and MVP2 sequence remains defined by `ROADMAP.md`.

## Historical status — preserved

| Phase                                                            | Status                                                                                    |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1 — Gate 0 Foundation                                            | Complete                                                                                  |
| 2 — Workspace, Toolchains and Quality Scripts                    | Complete                                                                                  |
| 3 — Rust Modular Monolith and API Contract Pipeline              | Complete                                                                                  |
| 4 — Desktop Shell, Local Persistence Boundary, Containers and CI | Complete                                                                                  |
| 5 — Design Tokens, Icon Policy and UI Primitives                 | Complete — provisional technical foundation                                               |
| 6 — First Playable Matchday / SM-1                               | Complete; human product review remains deferred, not recorded as global visual approval   |
| 06.1 — Table Views and Durable Preferences                       | Complete — 8/8 plans executed                                                             |
| 06.2 — Free Tactical Field and Unified Bench Interaction         | Complete — checkpoint `e8412d29a770bf0e400e2f72ec16e47f7e95f31f`                          |
| 06.3 — Tactical Model and Familiarity                            | Complete — checkpoint `3c221d35c82cf698e6a2dea2013cfa254a275c28`                          |
| 06.4 — Player/Coach Profiles and Explainable Ratings             | Complete — global entity product round and release gates approved                         |
| 06.5 — World Database, Editors and Modding Foundation            | Complete — UAT funcional aprovada; produção em `8ff81261eaedab6b2d94b2fa1dcd4e15b03357c1` |
| 06.6 and later canonical phases                                  | Planned; not started                                                                      |

## Phase 06.4 delivered

1. Stable global IDs and reusable player/coach projections are authoritative in Rust.
2. Ratings distinguish ability, position, role, tactical fit, familiarity and coach role with explicit factors/version.
3. Scouting knowledge controls exact/range/qualitative/unknown without mutating internal truth.
4. Player/coach routes, deep links, global search, comparison and contextual inspectors share the same projection source.
5. Rating/attribute history starts at the real 06.4 bootstrap and persists atomically with recovery.
6. 06.3 tactical position, role, fit and familiarity are consumed without a parallel model.
7. Development/training/coach capability contracts are ready for 06.8 without implementing its behavior.
8. The 06.2/06.3 drag hot path and tactical persistence remain unchanged.
9. Club and nation profiles are projections over loaded canonical entities, with specific Tauri queries and no world database.
10. Four-type search and semantic links connect player, coach, club and nation; back restores tab/context/scroll.
11. Club/Comissão sidebar state is synchronized with profile tabs through `aria-current`/`aria-selected`.
12. Coach portraits and ISO nation flags have local, accessible presentation with honest fallbacks.

## Phase 06.4 validation — preserved

- Prettier, ESLint, TypeScript, Rust fmt and Clippy passed.
- Vitest: 411 passed.
- Rust: 106 passed.
- Playwright: 60 passed, 24 conditional skips, zero failures.
- `pnpm quality` and `pnpm desktop:build` passed.
- Browser validation approved all four profiles, four-type search, sidebar/tab state, partial knowledge, contracted resolutions, zoom 200%, keyboard and zero console errors; 06.2/06.3 regressions also passed.
- Release WebView2 validation approved save legado, Clube/Comissão active state, coach portraits and the Brazil flag.
- Desktop artifact: `target/release/rivallo-desktop.exe`, 14,377,472 bytes, SHA-256 `3B71F3F27C323D593DD624C8DDC15B658DBF9D04605BE5DAEA145AD7DCCC9F64`.
- `Cargo.lock` has no diff from the input checkpoint.

## Phase 06.5 delivered

1. `official.rivallo.foundation` 1.0.0, schema 1, substitui seeds de produção como autoridade do
   mundo atual.
2. O resolver valida exatamente uma base, mods data-only, dependências, conflitos, versões,
   referências, ranges, assets e ordem determinística.
3. O snapshot ativo usa `fnv1a64:e581b5521d09cf7b` e compartilha o mesmo mundo resolvido entre
   Matchday e Profile.
4. `/data-editor` mostra packageId, versão, schemaVersion e fingerprint; edita manifest/world/
   patches JSON e apresenta diagnósticos estruturados.
5. Exportação recalcula checksum, grava atomicamente, atualiza o catálogo e mantém o pacote
   inativo.
6. Referência `club.missing` bloqueia com `world.broken_club_reference` em `identity.clubId` antes
   de persistência.
7. Loader e build público isolam pacotes privados, paths inseguros, checksums divergentes, assets
   não materializados e formatos locais não permitidos.
8. A carreira existente preserva escalação, Elenco, Táticas, variações, familiaridade, perfis,
   ratings, Clube, Comissão, visualizações e conhecimento.
9. A UAT no executável Tauri real aprovou 9/9 comportamentos da fase, sem issues ou gaps.
10. Seleção/ativação de base e mods, criação de save e congelamento do snapshot pertencem à 06.6.

## Phase 06.5 final validation

- `pnpm quality`: aprovado; 438 Vitest e 65 Playwright aprovados, com 28 skips condicionais.
- `cargo test --workspace`: 132 aprovados; `rivallo-application::world::tests`: 4 aprovados.
- Rust fmt, Clippy `-D warnings`, TypeScript, ESLint, Prettier, arquitetura, OpenAPI/client drift,
  guard de pacote privado e `git diff --check`: aprovados.
- Release: `target/release/rivallo-desktop.exe`, 17.933.824 bytes, SHA-256
  `A79DB21B341EFA2E4DD876606CAF6C3F67046D8FC65B18E26969DDF2982730B1`.
- O release abriu com o sidecar local e encerrou sem processos `rivallo-desktop.exe` ou
  `local_api.exe` residuais.
- `ROADMAP.md` permaneceu intocado.

## Canonical decisions preserved

1. MVP1 remains a complete 20-club Série A 2026 season with 38 rounds, champion, save/load and real utility on every principal route.
2. MVP2 remains safe sustainable multi-season play with history, renewal, advanced domains, complete mods/editors and migrations.
3. Competition/Calendar Engine remains separate from Match Engine; Training consumes Calendar and Match consumes fixtures.
4. Runtime flow remains domain → events → projections → routes → actions → commands → domain.
5. Active saves pin database/mod versions, hashes, load order and world snapshot and never change content silently.
6. The former SM-6 Phase 06.5 remains renumbered to 06.8 with scope/history preserved.

## Risks and pending decisions

- Phase 06.4 resolved rating scale/composition in ADR-0013; future phases must preserve the distinctions.
- Real-world private data/assets still require rights/provenance controls before collection.
- Calendar scheduling, match event granularity, mod patch serialisation/security and youth/retirement calibration remain phase-owned decisions.
- Long-save performance/save-size budgets require measurement before their gates.
- A 06.6 deve congelar base, mods, versões, hashes, load order e fingerprint por carreira; pacote
  exportado não pode alterar save existente silenciosamente.

## Next allowed action

Encerrar a Fase 06.5 no commit documental final. Não iniciar, planejar em detalhe ou implementar a
Fase 06.6 sem solicitação explícita posterior. O handoff 06.5 → 06.6 é somente contrato de entrada.

---

Last updated: 2026-07-18.
