---
phase: 05-design-tokens-icon-policy-and-ui-primitives
verified: 2026-07-15T19:48:52.696Z
status: gaps_found
score: 5/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "DenseTable permanece limitada, legível e intencionalmente rolável em 1366×768, 1920×1080 e 2560×1080."
    status: failed
    reason: "A composição CSS atual combina largura percentual com mínimos intrínsecos em dois níveis; a revisão Chromium registrou clientWidth/scrollWidth de 1.000.000px em 1366 e 1920, deixando cabeçalhos, células e ações fora da superfície útil."
    artifacts:
      - path: "apps/desktop/src/ui/DenseTable/DenseTable.css"
        issue: "`.rv-dense-table` usa simultaneamente `width: 100%` e `min-width: max-content`."
      - path: "apps/desktop/src/ui/primitives/primitives.css"
        issue: "`.rv-scroll-area__content` também usa `min-width: max-content`, ampliando a cadeia intrínseca dentro do overflow."
      - path: "browser-tests/ui-lab.spec.ts"
        issue: "A suíte opera controles da tabela, mas não limita scrollWidth nem exige cabeçalhos/células visíveis ou alcançáveis nos três projetos."
    missing:
      - "Corrigir o contrato de largura/overflow entre DenseTable e ScrollArea sem comprimir texto abaixo do piso tipográfico."
      - "Adicionar regressão Chromium nos três viewports para largura de rolagem finita e razoável, células/cabeçalhos visíveis e ações alcançáveis."
  - truth: "A família de ícones é forte, semanticamente compreensível e aprovada em contexto a 16/20/24px."
    status: partial
    reason: "A gramática, segurança e evidência óptica existem e os testes passam, porém Mateus rejeitou a clareza contextual; bola continua densa/genérica e trave ambígua em 16px, e o Lab ainda não demonstra de forma suficiente onde cada família atua nos fluxos."
    artifacts:
      - path: "packages/icons/src/football-icons.tsx"
        issue: "Os três proofs 1.1.0 obedecem à gramática, mas a mesma geometria mestre é apenas escalada para 16px; não há tratamento óptico pequeno aprovado para bola/trave."
      - path: "apps/desktop/src/ui-lab/specimens.tsx"
        issue: "O comparador e a rubrica explicam construção/extensão, mas não substituem provas contextuais limitadas em AppShell, command bar, tabela/estado e entrada de módulo."
      - path: ".planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-10-VISUAL-REVIEW.md"
        issue: "M-01 e M-04 estão FAIL e a decisão terminal é REJECTED por Mateus."
    missing:
      - "Criar tratamentos ópticos legíveis em 16px para bola e trave, esclarecendo o significado do símbolo de gol."
      - "Mostrar usos contextuais limitados de Lucide versus SVG Rivallo, mantendo texto quando o ícone não for inequívoco."
      - "Repetir a revisão humana e obter aprovação explícita antes de fechar a fase."
deferred:
  - truth: "O Table View Engine completo possui estado controlado, ordem/visibilidade/largura/pinning, filtros, multi-sort, agrupamento, visões salvas, reset, persistência versionada/migração e fronteiras de virtualização/consulta."
    addressed_in: "Phase 6 (screen contracts) and Phase 9 (product integration)"
    evidence: "O ROADMAP atribui à Fase 6 briefs com critérios de estado, teclado, dados e viewport, e à Fase 9 as superfícies reais de dashboard/elenco alimentadas por adapters/repositories; 05-UAT.md registra explicitamente esse mesmo corte de responsabilidade."
---

# Phase 5: Design Tokens, Icon Policy and UI Primitives — Verification Report

**Phase Goal:** Implementar a fonte aprovada de tokens, a política de ícones, primitives acessíveis e a fundação do UI Lab.
**Verified:** 2026-07-15T19:48:52.696Z
**Status:** gaps_found
**Re-verification:** Não — primeira verificação goal-backward consolidada após a revisão humana rejeitada.

## Resultado

A fundação técnica existe e é substancial, mas a Fase 5 não atingiu o resultado aprovado. A decisão humana canônica é `REJECTED`; o parser apenas confirma que esse registro é íntegro e não transforma automação verde em aprovação visual. Dois gaps acionáveis permanecem na própria Fase 5: largura/overflow da DenseTable e clareza contextual/óptica dos ícones em 16px.

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Uma fonte semântica OKLCH determinística fornece tokens, contraste AA e drift check não mutante. | VERIFIED | `packages/design-tokens/src/tokens.ts`, `contrast.ts`, `generated.css` e scripts de geração/verificação existem, estão conectados aos estilos e possuem cobertura dedicada. |
| 2 | Primitives compartilhadas expõem semântica, teclado, foco, estados, reduced motion e sinais não dependentes apenas de cor. | VERIFIED | Implementações nativas/Radix limitadas em `apps/desktop/src/ui/primitives/` e testes DOM/composite cobrem os contratos; nenhum gap atual contradiz esse resultado. |
| 3 | O UI Lab é dev-only, independente de serviços e expõe as sete categorias, fixtures, estados e presets definidos. | VERIFIED | `main.tsx`, `UiLab.tsx`, specimens e testes de boundary/produção estão conectados; o Lab não importa API/Tauri/persistência. |
| 4 | DenseTable é utilizável e intencionalmente rolável nos três viewports alvo. | FAILED | `DenseTable.css:30-31` e `primitives.css:429-430` mantêm a cadeia intrínseca que produziu 1.000.000px; Playwright não possui uma asserção equivalente de largura/células. |
| 5 | Lucide é a única família genérica e SVGs de futebol atravessam uma fronteira Rivallo versionada, segura e coerente. | VERIFIED | `Icon.tsx` limita nomes/tamanhos/stroke; `football-icons.tsx:34-46` centraliza a gramática e mantém exatamente três proofs 1.1.0. O teste focado da gramática passou nesta verificação. |
| 6 | Bola, trave e cone são fortes, inequívocos e compreensíveis em contexto a 16/20/24px. | FAILED | O comparador estrutural passa, mas M-01/M-04 permanecem FAIL: bola e trave não foram aprovadas em 16px e o uso no produto continua insuficientemente claro. |
| 7 | A fase preserva o visual grafite sóbrio/premium e não introduz dashboard, pitch, marca final, mascote ou autoridade de produto. | VERIFIED | PRODUCT/DESIGN, limites do Lab, imports e revisão M-02/M-13/M-14 confirmam a direção e as cercas de escopo. |

**Score:** 5/7 truths verified.

## Deferred Cross-Phase Contract

O motor completo de visões não deve ser implementado como remendo da Fase 5. Ele precisa ser especificado na Fase 6 para cada tela e implementado com dados, adapters/repositories e persistência na Fase 9. Isso inclui o caso do usuário “mostrar somente gols” como uma visão configurada — não comportamento exclusivo de uma tela.

## Required Artifacts

| Artifact | Status | Details |
|---|---|---|
| `packages/design-tokens/src/*` | VERIFIED | Fonte, resolução, CSS gerado e drift boundary substanciais. |
| `apps/desktop/src/ui/primitives/*` | VERIFIED | Inventário acessível conectado ao shell, DenseTable e Lab. |
| `apps/desktop/src/ui/DenseTable/*` | FAILED | Semântica/estado existem, porém o contrato de largura é defeituoso em browser real. |
| `packages/icons/src/Icon.tsx` | VERIFIED | Fronteira genérica Lucide-only, sem paths/famílias arbitrárias. |
| `packages/icons/src/football-icons.tsx` | PARTIAL | Gramática e segurança verificadas; aprovação óptica/contextual pendente. |
| `apps/desktop/src/ui-lab/*` | PARTIAL | Surface completa e isolada, mas evidencia os dois gaps visuais acima. |
| `05-10-VISUAL-REVIEW.md` | VERIFIED RECORD / REJECTED OUTCOME | Estrutura e digest válidos; decisão humana explicitamente rejeitada. |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| token source | desktop/Lab CSS | generated `--rv-*` variables | WIRED | Componentes consomem tokens sem uma segunda paleta. |
| `DenseTable.tsx` | ScrollArea/primitives/icons | imports reais e renderização | WIRED, DEFECTIVE | A ligação existe, mas a interação de mínimos intrínsecos quebra o layout. |
| football icon registry | UI Lab | exports de gramática/metadata/registry | WIRED | O Lab deriva inventário e comparadores do package, sem duplicar regras. |
| UI Lab icon specimens | Playwright | `data-icon-review-cell` | WIRED, INSUFFICIENT | Prova clipping dos cells, não clareza contextual/semântica. |
| visual review record | Gate 2 | decisão humana/digest | WIRED, REJECTED | Gate permanece aberto. |

## Data-Flow Trace

Não se aplica a dados de produto nesta fase. O UI Lab e a DenseTable usam fixtures determinísticas e deliberadamente não possuem API, domínio ou persistência; isso é uma cerca de escopo, não fluxo oco.

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Integridade do registro humano | `node scripts/verify-phase-5-visual-review.mjs .../05-10-VISUAL-REVIEW.md` | Estrutura válida; não determina qualidade visual; decisão no arquivo é REJECTED | PASS estrutural / resultado rejeitado |
| Gramática futebolística centralizada | `pnpm exec vitest run packages/icons/src/Icon.test.tsx -t "publishes one bounded construction grammar for the complete football family"` | 1 passed, 17 skipped | PASS |
| Evidência de navegação/óptica/extensão do Lab | `pnpm exec vitest run apps/desktop/src/ui-lab/UiLab.test.tsx -t "exposes bounded navigation, football optical, and extension-review evidence"` | 1 passed, 10 skipped | PASS estrutural |

Nenhuma suíte ampla foi repetida: a evidência recente de 05-11 já registrava a execução completa, e os gaps são observáveis no CSS e na decisão humana.

## Probe Execution

Nenhum probe de shell foi declarado para a Fase 5.

## Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| UI-01 — UI Lab documenta tokens, estados, tabelas densas e exemplos responsivos | PARTIAL / BLOCKED | Inventário e automação existem, mas a tabela falha nos viewports e a revisão visual terminal rejeitou a fundação. UI-01 não pode ser aceita como concluída. |

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `apps/desktop/src/ui/DenseTable/DenseTable.css` | 30-31 | `width: 100%` + `min-width: max-content` | BLOCKER | Participa da largura de 1.000.000px. |
| `apps/desktop/src/ui/primitives/primitives.css` | 429-430 | wrapper interno com `min-width: max-content` | BLOCKER | Propaga a largura intrínseca e impede overflow bounded. |
| `browser-tests/ui-lab.spec.ts` | 20-51 | fluxo interage com a tabela sem medir sua geometria | WARNING | Testes verdes não detectam conteúdo ausente/inalcançável. |

## Human Rejection Evidence

- `05-10-VISUAL-REVIEW.md`: `Decision: REJECTED`, `Reviewed by: Mateus`.
- FAILs relevantes: M-01, M-04, M-06, M-09 e M-12.
- Direção preservada: grafite sóbrio, forte, premium e altamente legível; rejeição não autoriza neon, cassino, SaaS genérico ou expansão de escopo.

## Gaps Summary

1. Corrigir DenseTable/ScrollArea e cobrir a geometria real nos três viewports.
2. Refinar bola/trave em 16px e provar usos contextuais limitados de Lucide versus Rivallo antes de repetir a revisão humana.
3. Levar o contrato completo de Table View Engine para Fase 6/Fase 9, sem implementá-lo integralmente na Fase 5.

**Next command:** `$gsd-plan-phase 5 --gaps`

---

_Verified: 2026-07-15T19:48:52.696Z_
_Verifier: generic-agent workaround for gsd-verifier_
