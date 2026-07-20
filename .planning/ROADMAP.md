# Roadmap canônico: Rivallo até o MVP2

## Regra de leitura

Este documento é a autoridade para ordem, estado, dependências, gates e checkpoints. Os contratos especializados detalham comportamento sem alterar a sequência. As Fases 06.2 e 06.3 foram concluídas em checkpoints próprios; a próxima fase é 06.4 e permanece **não iniciada** neste checkpoint.

## Checkpoint de partida e histórico imutável

**Baseline:** `b813f0a5523f0d473ca33bac36369dda43b2015e`.

| Fase                                                             | Estado preservado | Entrega histórica                                                                     |
| ---------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------- |
| 1 — Gate 0 Foundation                                            | Concluída         | Fundação de produto, arquitetura, autoridade, dados, testes, design, operações e ADRs |
| 2 — Workspace, Toolchains and Quality Scripts                    | Concluída         | Workspace pnpm/Turborepo/Cargo e scripts reproduzíveis                                |
| 3 — Rust Modular Monolith and API Contract Pipeline              | Concluída         | Fronteiras Rust e pipeline Rust → OpenAPI → TypeScript                                |
| 4 — Desktop Shell, Local Persistence Boundary, Containers and CI | Concluída         | Shell desktop/API, limites de persistência e CI                                       |
| 5 — Design Tokens, Icon Policy and UI Primitives                 | Concluída         | Tokens, ícones, primitives, DenseTable e UI Lab técnico                               |
| 6 — First Playable Matchday / SM-1                               | Concluída         | XI → tática → partida determinística → resultado persistido e estabilização           |
| 06.1 — Table Views and Durable Preferences                       | Concluída         | Table View Engine controlado, views versionadas e persistência durável                |

Nenhum status concluído é reaberto ou reclassificado por este roadmap.

## Phase 1: Gate 0 Foundation

**Status:** Complete — historical gate preserved.

## Phase 2: Workspace, Toolchains and Quality Scripts

**Status:** Complete — historical gate preserved.

## Phase 3: Rust Modular Monolith and API Contract Pipeline

**Status:** Complete — historical gate preserved.

## Phase 4: Desktop Shell, Local Persistence Boundary, Containers and CI

**Status:** Complete — historical gate preserved.

## Phase 5: Design Tokens, Icon Policy and UI Primitives

**Status:** Complete — provisional technical foundation preserved.

## Phase 6: First Playable Matchday

**Status:** Complete — first playable and SM-1 history preserved.

## Sequência oficial

| Bloco                                        | Fases     | Gate                          |
| -------------------------------------------- | --------- | ----------------------------- |
| 06 — Fundação de Gestão Esportiva e Carreira | 06.1–06.8 | Pronto para Match Day         |
| 07 — Match Day                               | 07.1–07.5 | Partida completa e explicável |
| 08 — MVP1 Operations                         | 08.1–08.6 | MVP1 — Temporada Completa     |
| 09 — MVP2 Sustainable Career                 | 09.1–09.8 | MVP2 — Carreira Sustentável   |

## Índice de contratos canônicos

- Escopo e gates: [MVP1](MVP-1-DEFINITION.md), [MVP2](MVP-2-DEFINITION.md) e [checklist](MVP-GATE-CHECKLIST.md).
- Rotas e shell: [matriz de prontidão](ROUTE-READINESS-MATRIX.md), [sidebar/menu](SIDEBAR-AND-MAIN-MENU-CONTRACT.md), [Home](HOME-COMMAND-CENTER.md) e [Inbox](INBOX-EVENT-CONTRACT.md).
- Carreira e conteúdo: [lifecycle](CAREER-LIFECYCLE.md), [coach creator](COACH-CREATOR-CONTRACT.md), [database/mods](DATABASE-AND-MODDING-FOUNDATION.md) e [base privada](DATABASE-AND-MODDING-FOUNDATION.md).
- Arquitetura: [grafo de dependências](PHASE-DEPENDENCY-GRAPH.md), [calendário/competições](COMPETITION-CALENDAR-ARCHITECTURE.md) e [limites do motor de partidas](MATCH-ENGINE-BOUNDARIES.md).

## Contrato comum de fase

Cada fase abaixo registra objetivo, problema, dependências, entradas, saídas, contratos, consumidores, rotas, interfaces, domínio autoritativo, persistência, testes, aceite, fora de escopo, riscos, gate e checkpoint. “Checkpoint” significa um commit estável próprio da futura execução da fase; não é criado por este planejamento.

## Bloco 06 — Fundação de Gestão Esportiva e Carreira

### Phase 06.1: Table Views and Durable Preferences — concluída

- **Objetivo/problema:** entregar personalização controlada e durável de tabelas; elimina estado de tabela específico por tela e não versionado.
- **Dependências/entradas/saídas:** depende da Fase 6 e do contrato da Fase 5; recebe schemas/capabilities estáveis e entrega views, migrations, quarantine/recovery e integração Elenco.
- **Contratos/consumidores/rotas/interfaces:** produz envelopes de preferência e comandos de view consumidos por tabelas futuras; afeta Elenco e Personalizar por controles React tipados sobre repositório de aplicação.
- **Autoridade/persistência/testes:** engine controlado + camada application/adapter; persistência local versionada; testes Rust, componente, browser, migração, restart e responsividade concluídos.
- **Aceite/fora/riscos/gate/checkpoint:** aceite histórico preservado; não inclui banco mundial ou cache de carreira; risco de duplicar contrato contido; gate aprovado; checkpoint final já está no histórico anterior ao baseline.

### Phase 06.2: Free Tactical Field and Unified Bench Interaction — concluída

- **Objetivo/problema:** permitir campo tático normalizado e um único modelo de movimento/troca entre titulares e reservas; remove slots visuais rígidos e caminhos divergentes.
- **Dependências/entradas/saídas:** depende de 06.1; recebe XI/formation persistidos, IDs estáveis e presets; entrega aggregate tático, coordenadas/zonas, comandos e migração sem perda.
- **Contratos/consumidores/rotas/interfaces:** produz snapshot de formação e comandos move/swap consumidos por 06.3, 06.8 e Match Engine; afeta Táticas por Rust commands, projections e preview React.
- **Autoridade/persistência/testes:** Rust valida onze, goleiro, duplicidade, sobreposição e exclusividade; repositório persiste layouts; testes de domínio, migração, componente, browser, teclado e reduced motion.
- **Aceite/fora/riscos/gate/checkpoint:** custom shape sobrevive restart, invalid actions não mutam estado e não há duplicação; não inclui semântica tática avançada; risco WebView/drag tratado e validado no Tauri; gate de tática estrutural aprovado; checkpoint `e8412d29a770bf0e400e2f72ec16e47f7e95f31f`.

### Phase 06.3: Tactical Model and Familiarity — concluída

- **Objetivo/problema:** unificar análise, estratégia, instruções, oposição e familiaridade; elimina toggles locais e efeitos prometidos sem consumo real.
- **Dependências/entradas/saídas:** depende de 06.2; recebe layout/snapshot e contexto adversário; entrega aggregate tático versionado, regras de conflito/precedência e eventos de familiaridade.
- **Contratos/consumidores/rotas/interfaces:** consumido por 06.8, 07.1 e 07.2; afeta Táticas, Home e Relatórios por editors/projections tipados e explicações.
- **Autoridade/persistência/testes:** Rust possui validação, precedência, análise e familiaridade; persistence por tactic repository/event history; testes de regra, conflito, migração, restore e honest empty states.
- **Aceite/fora/riscos/gate/checkpoint:** modelos restauram exatamente e cada efeito declara se é consumido; scouting amplo e IA adversária ficam fora; risco combinatório contido por opções discretas e resolução determinística; gate semântico aprovado; checkpoint final registrado pelo commit desta entrega.

### Phase 06.4: Player/Coach Profiles and Explainable Ratings — não iniciada

- **Objetivo/problema:** criar perfis estáveis e avaliações contextuais explicáveis; substitui números opacos e duplicação entre inspector/página.
- **Dependências/entradas/saídas:** depende de 06.3; recebe entidades adapter-fed e contexto tático; entrega read models de jogador/treinador, escala ADR, rating components, confiança e histórico.
- **Contratos/consumidores/rotas/interfaces:** consumido por Elenco, Clube, Comissão, Observação, 06.6, 06.8 e mercado; interfaces por entity routes, inspector e queries tipadas.
- **Autoridade/persistência/testes:** Rust possui fórmulas e incerteza; projeções persistem versões/histórico; testes determinísticos de fórmula, navegação, partial/unknown, acessibilidade e non-regression.
- **Aceite/fora/riscos/gate/checkpoint:** origem/componentes/contexto/confiança visíveis; scouting global e ratings decorativos fora; risco de falsa precisão; gate de entidades; checkpoint `06.4`.

### Phase 06.5: World Database, Editors and Modding Foundation

- **Objetivo/problema:** tornar o mundo esportivo editável e independente de hardcode; separa conteúdo, regras e avaliações do código.
- **Dependências/entradas/saídas:** depende de 06.4 para schemas de pessoas/ratings; recebe requisitos de entidades, assets e validação; entrega schemaVersion, IDs estáveis, base resolver, manifesto mod, shared editor primitives e pacote fictício seed.
- **Contratos/consumidores/rotas/interfaces:** fornece base/mods a 06.6 e 06.7 e a todos os domínios; afeta menu Editor de dados/Mods por tables, forms, import/export e validators compartilhados.
- **Autoridade/persistência/testes:** database/mod resolver é autoridade de conteúdo; packages versionados fora do código; contract/schema, referential integrity, load order, conflict, asset e migration tests.
- **Aceite/fora/riscos/gate/checkpoint:** nenhum clube/jogador/competição hardcoded; avaliações versionadas/explicáveis; editor completo e publicação pública ficam para 09.7; risco de schema/load-order; gate de base carregável; checkpoint `06.5`.

### Phase 06.6: Main Menu, New Career and Coach Creator

- **Objetivo/problema:** substituir entrada fixa por menu, criação/carregamento de carreira e treinador robusto; resolve ausência de identidade/slot/base selecionáveis.
- **Dependências/entradas/saídas:** depende de 06.5; recebe base/mod resolver e schemas de treinador; entrega menu, wizard, coach creator, automações/dificuldade/preferências, slot metadata e world-generation command.
- **Contratos/consumidores/rotas/interfaces:** consumido por 06.7, Career Lifecycle e AppShell; afeta menu, Personalizar e identidade da carreira por wizard, validation summary e progress states.
- **Autoridade/persistência/testes:** Career application service cria slot/snapshot; coach domain valida orçamento/arquétipo; persistence atômica com backup; testes de wizard, compatibilidade, crash/failure, accessibility e resume.
- **Aceite/fora/riscos/gate/checkpoint:** Continue abre último save válido, criação suporta clube/treinador e nunca troca base silenciosamente; editor de mundo completo fora; risco de save parcial; gate de carreira criada; checkpoint `06.6`.

### Phase 06.7: Competition, Season and Calendar Engine

- **Objetivo/problema:** criar agenda gregoriana e temporada autoritativas; impede que Training ou Match gerem fixtures/standings.
- **Dependências/entradas/saídas:** depende de 06.5 e 06.6; recebe competição/regras/participantes/temporada; entrega fixtures, rodadas, datas, conflitos, standings, registrations windows e season clock.
- **Contratos/consumidores/rotas/interfaces:** consumido por 06.8, 07._, 08._ e 09.*; afeta Calendário, Competições, Home e Inbox por queries/commands/event stream.
- **Autoridade/persistência/testes:** Competition/Calendar domain possui schedule, regras e classificação; snapshots/event history persistem; property/determinism, 20-club/38-round, timezone, conflict, tie-break e migration tests.
- **Aceite/fora/riscos/gate/checkpoint:** Série A 2026 começa zerada e todos os 380 jogos futuros; motor de partidas não incluído; risco de conflitos/remarcações; gate de temporada válida; checkpoint `06.7`.

### Phase 06.8: Squad Dynamics, Training and Dynamic Potential

- **Objetivo/problema:** separar Dinâmica e Treinamento e gerar consequências explicáveis; preserva o antigo SM-6 renumerado de 06.5.
- **Dependências/entradas/saídas:** depende de 06.3, 06.4 e 06.7; recebe tactic familiarity, profiles/ratings e calendário; entrega morale/cohesion/hierarchy, microcycles, individual plans, workload/fatigue/development e perceived potential history.
- **Contratos/consumidores/rotas/interfaces:** consumido por 07.1/07.2, Home, Inbox, Elenco e Relatórios; afeta Dinâmica/Treinamento por calendar editor, group/player selectors e explainable projections.
- **Autoridade/persistência/testes:** Rust possui validation/consequences; event histories e plans persistem; tests de conflicts, eligibility, determinism 52 semanas, migration/restart, component/browser/accessibility.
- **Aceite/fora/riscos/gate/checkpoint:** treino coletivo e individual produzem efeitos reais; calendar é consumido, não gerado; world renewal fica em 09.4; risco combinatório/falsa precisão; gate Block 06; checkpoint `06.8`.

## Bloco 07 — Match Day

### Phase 07.1: Club AI and Match Preparation

- **Objetivo/problema:** preparar escalação/plano adversários e recomendações do clube; evita oponente estático.
- **Dependências/entradas/saídas:** depende dos sistemas esportivos 06.2–06.8 e da base; recebe fixture, availability, squad/tactic/training; entrega AI lineup, plan, preparation report e decisions.
- **Contratos/consumidores/rotas/interfaces:** consumido por 07.2 e pré-jogo; afeta Home, Táticas, Observação, Relatórios; Club AI commands/queries.
- **Autoridade/persistência/testes:** Rust AI policy versionada; decisões/seed persistem; scenario, determinism, invalid-roster e explanation tests.
- **Aceite/fora/riscos/gate/checkpoint:** plano legal e explicável para ambos clubes; mercado avançado fora; risco de heurística previsível; gate ready-to-simulate; checkpoint `07.1`.

### Phase 07.2: Headless Match Simulation Engine

- **Objetivo/problema:** simular partida sem UI e produzir estado/eventos completos; separa simulação de calendário e apresentação.
- **Dependências/entradas/saídas:** depende de 06.2–06.8 e 07.1; recebe fixture e immutable pre-match snapshots; entrega event log, score, statistics, ratings, wear, injuries/cards candidates e result.
- **Contratos/consumidores/rotas/interfaces:** consumido por 07.3–07.5, competition, training e analytics; interface headless command/result/event stream.
- **Autoridade/persistência/testes:** Match domain Rust; snapshot + append-only event log + deterministic seed; golden, invariant, property, replay, performance e save/load tests.
- **Aceite/fora/riscos/gate/checkpoint:** replay determinístico e invariantes de futebol; fixtures nunca gerados; visualização/in-match UI fora; risco de modelo monolítico; gate engine headless; checkpoint `07.2`.

### Phase 07.3: Match Center

- **Objetivo/problema:** apresentar partida, timeline e contexto ao vivo; substitui resultado instantâneo opaco.
- **Dependências/entradas/saídas:** depende de 07.2; recebe event stream/projections; entrega clock, pitch/timeline, score, stats, commentary e accessible summaries.
- **Contratos/consumidores/rotas/interfaces:** consumido por 07.4 e usuário; afeta rota de partida e Reports; projection subscription + navigation state.
- **Autoridade/persistência/testes:** somente Match Engine é autoridade; UI guarda preferências, não resultado; component/browser/a11y/performance/reconnect-to-local-stream tests.
- **Aceite/fora/riscos/gate/checkpoint:** eventos e placar coerentes e navegáveis; decisões ficam em 07.4; risco de render overload; gate observable match; checkpoint `07.3`.

### Phase 07.4: In-Match Decisions

- **Objetivo/problema:** permitir substituições, ajustes e instruções validadas durante a partida; evita mutação direta pela UI.
- **Dependências/entradas/saídas:** depende de 07.2 e 07.3; recebe current match state e tactic commands; entrega accepted/rejected decisions e new engine snapshots.
- **Contratos/consumidores/rotas/interfaces:** consumido pelo engine e pós-jogo; afeta Match Center/Táticas; typed command queue, confirmation e feedback.
- **Autoridade/persistência/testes:** Match domain valida timing/eligibility/limits; decisions no event log; boundary, replay, keyboard, latency e invalid-action tests.
- **Aceite/fora/riscos/gate/checkpoint:** toda decisão explica efeito/recusa e reproduz no replay; multiplayer fora; risco race/order; gate interactive match; checkpoint `07.4`.

### Phase 07.5: Post-Match Analysis

- **Objetivo/problema:** consolidar consequência e aprendizado pós-jogo; impede dashboards desconectados.
- **Dependências/entradas/saídas:** depende de 07.2 e estado completo da partida; recebe result/events/stats/ratings; entrega reports, analytics projections e domain events downstream.
- **Contratos/consumidores/rotas/interfaces:** competition, Home, Inbox, Reports, Data Centre, Training, Squad, Finances; report documents + projection events.
- **Autoridade/persistência/testes:** source event log immutable; derived projections/versioned reports persistem; reconciliation, idempotency, cross-route e explanation tests.
- **Aceite/fora/riscos/gate/checkpoint:** resultado atualiza todos consumidores uma vez; season gate fora; risco double-processing; gate Match Day; checkpoint `07.5`.

## Bloco 08 — MVP1 Operations

### Phase 08.1: Injuries, Discipline and Registration

- **Objetivo/problema:** tornar availability e inscrição reais; elimina elegibilidade implícita.
- **Dependências/entradas/saídas:** depende de 06.7, 06.8 e 07.2/07.5; entrega injuries, suspensions, medical estimates, registration lists/deadlines e eligibility projection.
- **Contratos/consumidores/rotas/interfaces:** Elenco, Home, Inbox, Calendar, Competitions, Tactics e Match; commands médico/inscrição e alerts.
- **Autoridade/persistência/testes:** Availability/Registration domains; event history persistente; boundary/date, recovery, suspension, registration e replay tests.
- **Aceite/fora/riscos/gate/checkpoint:** jogadores inelegíveis não jogam e causa/retorno são visíveis; medicina avançada fora; risco timezone/rule; gate operations-1; checkpoint `08.1`.

### Phase 08.2: Transfers and Contracts MVP

- **Objetivo/problema:** mercado básico funcional; substitui listas sem negociação/consequência.
- **Dependências/entradas/saídas:** depende de 06.5, 06.7, 08.1 e Finanças port; entrega availability list, proposals/responses, basic wage/contracts/loans/window/history.
- **Contratos/consumidores/rotas/interfaces:** Transferências, Elenco, Finanças, Inbox, Reports; negotiation aggregate and financial commands/events.
- **Autoridade/persistência/testes:** Market/Contract domains; negotiations/contracts ledgers persistem; rule, budget, window, concurrency/idempotency e UI-flow tests.
- **Aceite/fora/riscos/gate/checkpoint:** proposta básica conclui ou falha com motivo e impacto financeiro; clauses/agents ficam 09.3; risco exploit; gate operations-2; checkpoint `08.2`.

### Phase 08.3: Scouting and Observation MVP

- **Objetivo/problema:** conhecimento parcial e relatórios reais; evita revelar atributos globais.
- **Dependências/entradas/saídas:** depende de 06.4/06.5, 07.1 e 08.2; entrega search, shortlist, report request, confidence, comparison e opponent report.
- **Contratos/consumidores/rotas/interfaces:** Observação, Transferências, Inbox, Reports; knowledge projection/report commands.
- **Autoridade/persistência/testes:** Scouting domain owns knowledge/confidence; reports/shortlist persistem; visibility, confidence, staleness-basic, request and navigation tests.
- **Aceite/fora/riscos/gate/checkpoint:** desconhecido permanece desconhecido e relatório abre contexto; network global fica 09.5; risco leakage; gate operations-3; checkpoint `08.3`.

### Phase 08.4: Finances, Club and Staff MVP

- **Objetivo/problema:** utilidade real para Clube, Comissão e Finanças; elimina placeholders administrativos.
- **Dependências/entradas/saídas:** depende de 06.4–06.7 e 08.2; entrega club overview/history/objectives, basic staff/responsibilities/contracts/recommendations e balance/budget/payroll/revenue/expense/prize/projection/monthly summary.
- **Contratos/consumidores/rotas/interfaces:** Home, Inbox, Transfers, Reports e Board future; ledgers, staff contracts and club projections.
- **Autoridade/persistência/testes:** Finance/Club/Staff domains; double-entry-like auditable ledger + snapshots; reconciliation, budget, contract, month-close e accessibility tests.
- **Aceite/fora/riscos/gate/checkpoint:** toda movimentação tem origem e saldo reconciliado; infrastructure/deep revenue ficam 09.6; risco rounding; gate operations-4; checkpoint `08.4`.

### Phase 08.5: Inbox, Home, Data Centre and Reports

- **Objetivo/problema:** transformar eventos em contexto diário, decisões, exploração e documentos; evita dashboards mockados.
- **Dependências/entradas/saídas:** depende de todos produtores MVP1; entrega event projections, actionable inbox, Home widgets, interactive analytics e consolidated reports.
- **Contratos/consumidores/rotas/interfaces:** Início, Caixa de entrada, Central de dados, Relatórios; event subscription, deep links, read/archive/action commands e filters.
- **Autoridade/persistência/testes:** source domains remain authoritative; projections/inbox/report metadata persistem e rebuildam; idempotency, ordering, deadline, deep-link, empty/error, accessibility e cross-route tests.
- **Aceite/fora/riscos/gate/checkpoint:** Home responde aconteceu/atenção/próximo compromisso/decisão; Data Centre explora e Reports consolida; predictive AI fora; risco notification noise; gate route utility; checkpoint `08.5`.

### Phase 08.6: MVP1 Full Season Gate

- **Objetivo/problema:** provar uma temporada completa coerente; impede chamar conjunto parcial de MVP1.
- **Dependências/entradas/saídas:** depende dos blocos 06, 07 e fases 08.1–08.5; recebe build candidato e base validada; entrega evidence pack, defects resolved e release checkpoint MVP1.
- **Contratos/consumidores/rotas/interfaces:** valida todas as rotas/menu/lifecycle/saves; usa checklists canônicos sem criar novo domínio.
- **Autoridade/persistência/testes:** verifica authorities existentes; E2E menu→38 rounds→champion, restart, migration, empty/error, accessibility, performance e deterministic replay.
- **Aceite/fora/riscos/gate/checkpoint:** zero placeholders/mock-only routes, champion correto e save reabre; season rollover fica MVP2; risco long-run drift; gate MVP1; checkpoint `mvp1-complete-season`.

## Bloco 09 — MVP2 Sustainable Career

### Phase 09.1: Season Rollover and History

- **Objetivo/problema:** encerrar e iniciar temporadas preservando história; resolve carreira terminal após rodada 38.
- **Dependências/entradas/saídas:** depende do MVP1; recebe final standings/stats/contracts; entrega awards, records/history, archive, next-season seed e rollover transaction.
- **Contratos/consumidores/rotas/interfaces:** Competitions, Club, Reports, Calendar, Career lifecycle; rollover command/progress/recovery report.
- **Autoridade/persistência/testes:** Season domain; atomic checkpoint/backup + immutable history; crash recovery, idempotency, multi-year determinism e reconciliation tests.
- **Aceite/fora/riscos/gate/checkpoint:** rollover reiniciável sem duplicar premiações; promotion fica 09.2; risco partial commit; gate sustainable-1; checkpoint `09.1`.

### Phase 09.2: Promotion, Relegation and Secondary Competitions

- **Objetivo/problema:** mundo competitivo muda entre níveis/torneios; evita liga isolada e estática.
- **Dependências/entradas/saídas:** depende de 09.1 e Calendar Engine; entrega qualification, promotion/relegation, multi-competition participants/schedules e history.
- **Contratos/consumidores/rotas/interfaces:** Competitions, Calendar, Home, Inbox, Reports; rule plugins and participant-transition events.
- **Autoridade/persistência/testes:** Competition domain; season-specific memberships persistem; rule matrix, simultaneous competitions, conflicts e long-run tests.
- **Aceite/fora/riscos/gate/checkpoint:** participantes seguintes refletem regras e histórico; arbitrary community rules ficam 09.7; risco schedule conflicts; gate sustainable-2; checkpoint `09.2`.

### Phase 09.3: Advanced Market, Contracts and Club AI

- **Objetivo/problema:** renovar elencos e mercado ao longo dos anos; remove negociações básicas repetitivas.
- **Dependências/entradas/saídas:** depende de 08.2, 09.1/09.2 e Club AI; entrega agents, bonuses, clauses, instalments, pre-contracts, promises, advanced loans, squad plans e coach movement.
- **Contratos/consumidores/rotas/interfaces:** Transfers, Squad, Finances, Staff, Inbox; negotiation DSL, obligations schedule e AI planning events.
- **Autoridade/persistência/testes:** Market/Contract/Club AI domains; ledgers/obligations/history persistem; adversarial negotiation, budget, expiry, transfer-window e multi-season tests.
- **Aceite/fora/riscos/gate/checkpoint:** AI renova e negocia sem insolvência/duplicação; youth generation fica 09.4; risco economy inflation; gate sustainable-3; checkpoint `09.3`.

### Phase 09.4: Youth, Retirement and World Renewal

- **Objetivo/problema:** renovar população e talento; impede envelhecimento até mundo vazio.
- **Dependências/entradas/saídas:** depende de 06.4/06.8, 09.1 e 09.3; entrega youth intake/development, aging, retirement, regenerated staff/players e world evolution events.
- **Contratos/consumidores/rotas/interfaces:** Squad, Club, Dynamics, Training, Scouting, Transfers, Reports; lifecycle policies and generated-entity provenance.
- **Autoridade/persistência/testes:** World/Development domains; stable new IDs, seeds and histories; distribution, determinism, privacy/potential e 20-season soak tests.
- **Aceite/fora/riscos/gate/checkpoint:** população/qualidade permanecem sustentáveis e explicáveis; generative biographies avançadas fora; risco demographic drift; gate sustainable-4; checkpoint `09.4`.

### Phase 09.5: Full Scouting Network

- **Objetivo/problema:** criar descoberta mundial operada por staff/região/missões; substitui pedido direto de relatório.
- **Dependências/entradas/saídas:** depende de 08.3, 08.4 e 09.4; entrega scouts, regions, assignments, budget, discovery, updates e knowledge decay.
- **Contratos/consumidores/rotas/interfaces:** Observação, Transfers, Staff, Finances, Inbox, Reports; assignment commands and knowledge graph projections.
- **Autoridade/persistência/testes:** Scouting domain; time-stamped evidence/confidence persistem; fog-of-war, budget, assignment, decay e long-save tests.
- **Aceite/fora/riscos/gate/checkpoint:** nenhum conhecimento surge sem fonte e atualização; public shared scouting fora; risco performance/leak; gate sustainable-5; checkpoint `09.5`.

### Phase 09.6: Board, Infrastructure and Deep Finances

- **Objetivo/problema:** decisões institucionais e sustentabilidade econômica; expande visão mensal básica.
- **Dependências/entradas/saídas:** depende de 08.4, 09.1 e 09.3; entrega sponsorship, tickets, merchandising, debt, instalments, cash flow, financial rules, facilities/stadium works, board trust/objectives.
- **Contratos/consumidores/rotas/interfaces:** Club, Finances, Home, Inbox, Training, Youth, Reports; project/approval commands and auditable ledger schedules.
- **Autoridade/persistência/testes:** Finance/Board/Infrastructure domains; ledgers/projects/history persistem; accounting reconciliation, approval, construction timeline, insolvency e multi-year tests.
- **Aceite/fora/riscos/gate/checkpoint:** projeções reconciliam e infraestrutura tem custo/prazo/efeito; stadium 3D fora; risco runaway economy; gate sustainable-6; checkpoint `09.6`.

### Phase 09.7: Complete Modding and Editor Ecosystem

- **Objetivo/problema:** completar edição/import/export/patch/migration segura; transforma fundação 06.5 em ecossistema utilizável.
- **Dependências/entradas/saídas:** depende de todos schemas estáveis 06.5–09.6; entrega editors completos, undo/redo seguro, validation reports, official mod format, load order/conflicts, migrations e public fictional base tooling.
- **Contratos/consumidores/rotas/interfaces:** Main Menu Editor/Mods, Career creation e save migration; shared tables/forms/search/filters/history/assets/translations.
- **Autoridade/persistência/testes:** resolver/schema registry authoritative; packages and migration logs persistem; round-trip, referential integrity, conflict, malicious archive/path, compatibility e accessibility tests.
- **Aceite/fora/riscos/gate/checkpoint:** mod pode substituir/adicionar/patchar conteúdo sem silent save mutation; public hosting marketplace fora; risco security/schema fragmentation; gate sustainable-7; checkpoint `09.7`.

### Phase 09.8: MVP2 Sustainable Career Gate

- **Objetivo/problema:** provar carreira indefinida íntegra; impede declarar MVP2 após apenas um rollover.
- **Dependências/entradas/saídas:** depende de 09.1–09.7 e MVP1; recebe candidate build/databases/mods; entrega multi-season evidence, migration matrix e MVP2 checkpoint.
- **Contratos/consumidores/rotas/interfaces:** valida todo produto e editores; no new domain.
- **Autoridade/persistência/testes:** autoridades existentes; E2E várias temporadas, soak, backup/restore, version migration, mod compatibility, world renewal, performance e corruption recovery.
- **Aceite/fora/riscos/gate/checkpoint:** repetição sustentável sem mundo estático, perda de histórico ou drift silencioso; multiplayer fora; risco combinatorial; gate MVP2; checkpoint `mvp2-sustainable-career`.

## Dependências obrigatórias

- 06.3 → 06.2; 06.4 → 06.3; 06.5 fornece base/mods a 06.6 e 06.7; 06.6 → 06.5; 06.7 → 06.5 + 06.6; 06.8 → 06.3 + 06.4 + 06.7.
- 07.1 depende dos sistemas esportivos e da base; 07.2 depende de 06.2–06.8 + 07.1; 07.3 → 07.2; 07.4 → 07.2 + 07.3; 07.5 → 07.2 + estado completo.
- MVP1 depende dos blocos 06, 07 e 08. MVP2 depende do MVP1 concluído. O grafo canônico, incluindo motores e domínios, está em `PHASE-DEPENDENCY-GRAPH.md` e deve permanecer acíclico.

## Migração de IDs e preservação histórica

| Identidade anterior                                              | Identidade canônica                                              | Tratamento                                                                                            |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 06.5 / `06.5-sm-6-squad-dynamics-training-and-dynamic-potential` | 06.8 / `06.8-sm-6-squad-dynamics-training-and-dynamic-potential` | Renumerado; conteúdo SM-6, decisões, histórico e prompt-base preservados; referências novas usam 06.8 |
| Antiga Phase 7 — Career Start and Club Selection                 | 06.6 + 06.7                                                      | Escopo absorvido por carreira/menu e engine de temporada; fase antiga não foi concluída               |
| Antiga Phase 8 — Season Calendar and Matchday Depth              | 06.7 + Bloco 07                                                  | Separada em calendário/competição e Match Day; fase antiga não foi concluída                          |
| Antiga Phase 9 — Dashboard, Squad, Cache and Offline Hardening   | 08.5 + gates de save                                             | Replanejada por projeções/rotas e long-save safety; fase antiga não foi concluída                     |
| Antiga Phase 10 — V0.1 Verification                              | 08.6                                                             | Substituída pelo gate explícito MVP1                                                                  |
| Antigas Phases 11–13 — multiplayer                               | Backlog pós-MVP2                                                 | Preservadas como intenção futura, fora deste roadmap e sem autorização                                |

## Gate global de rota

O MVP1 falha se qualquer rota principal não abrir, não tiver fonte autoritativa, ação útil, persistência, tratamento vazio/erro ou integração ao ciclo de carreira; rotas mock-only, placeholder ou “em breve” são bloqueadoras.

## Decisões pendentes, com dono futuro

- 06.4: ADR de escala/composição de ratings.
- 06.5: serialização canônica de patches e política de assinatura de pacote.
- 06.7: algoritmo de scheduling e política de timezone/remarcação.
- 07.2: granularidade do event log e orçamento de performance.
- 09.4: distribuições de youth/retirement calibradas.
- 09.7: sandbox/security policy para importação de mods.

Essas decisões não bloqueiam o planejamento, mas devem ser resolvidas e registradas antes da implementação dependente.
