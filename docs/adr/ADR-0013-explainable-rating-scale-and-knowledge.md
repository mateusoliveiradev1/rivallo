# ADR-0013 — Escala, composição e conhecimento dos ratings

**Status:** Accepted · **Date:** 2026-07-17 · **Owner:** Phase 06.4

## Contexto

O primeiro jogável já exibia `Player.rating`, `potentialRating`, condição, ritmo e média de partidas na escala 0–100, mas sem contrato de composição. A Fase 06.3 adicionou posição, função, encaixe tático e familiaridade autoritativos. Fundir essas grandezas em um OVR opaco criaria dupla contagem, falsa precisão e vazamento de informação de jogadores externos.

## Decisão

1. A escala canônica de avaliações estruturais e contextuais permanece **0–100 inteiro**, identificada por `rivallo.rating.0-100.v1`. A escolha preserva compatibilidade visual e de dados com o primeiro jogável.
2. `Player.rating` é uma entrada legada de migração. O motor Rust deriva e projeta:
   - capacidade atual estrutural;
   - rating por posição;
   - rating por função;
   - encaixe tático;
   - estimativa contextual.
3. A capacidade atual é composta somente por atributos estruturais. Condição, forma, prontidão, familiaridade e potencial não alteram essa grandeza.
4. Rating por posição usa pesos explícitos por espaço nominal. A função especializa a posição e declara responsabilidades; não reaplica os mesmos atributos como um segundo bônus oculto.
5. A estimativa contextual v1 usa quatro parcelas visíveis que somam 100%: posição 50%, função 20%, encaixe tático 20% e familiaridade canônica da 06.3 10%. Familiaridade aparece exatamente uma vez.
6. Encaixe tático consome `TacticalModelSnapshot`/`variationId`, exigência física estrutural e responsabilidades. Condição momentânea não participa.
7. Treinadores não recebem um OVR universal. Cada categoria é avaliada separadamente e uma adequação contextual usa pesos próprios para o cargo selecionado.
8. O valor interno nunca é alterado pelo scouting. `ScoutingAssessment` decide se a projeção revela valor exato, faixa, descrição qualitativa ou desconhecido, sempre com confiança, origem, observação, atualização e validade.
9. Potencial interno é persistido somente no repositório de perfis Rust. A projeção expõe `PotentialEstimate` como faixa/descrição e confiança, inclusive para o próprio clube. Potencial dinâmico permanece propriedade da Fase 06.8.
10. `RatingSnapshot` e `AttributeSnapshot` são append-only por mudança material de contexto/valor. A fase não inventa histórico retroativo: o primeiro snapshot é o marco real de bootstrap da 06.4.

## Explicabilidade

Cada rating derivado expõe contexto, valor percebido, confiança, fonte, atualização, versão da escala e fatores com valor, peso, contribuição, impacto e explicação. O frontend apresenta essa projeção e não reproduz fórmulas.

## Persistência e concorrência

O catálogo de perfis possui schema/revision próprios e repositório JSON atômico com temporário, backup e quarantine limitada. Uma projeção registra snapshot somente quando posição, função, variação, familiaridade, valor ou confiança mudam. Respostas antigas de navegação são ignoradas pelo token monotônico do cliente.

## Consequências

- Compatibilidade visual é preservada sem transformar o OVR legado em verdade futura.
- Posição, função, encaixe, familiaridade, condição, forma e potencial permanecem distinguíveis.
- Jogadores e treinadores externos podem ser abertos sem revelar valores internos.
- A futura 06.8 recebe contratos serializáveis de atributos, ratings, potencial percebido e capacidades de desenvolvimento, sem que treino ou progressão sejam implementados agora.

## Alternativas rejeitadas

- Escala 0–20: exigiria migração visual/dados sem benefício suficiente nesta fase.
- Estrelas/letras como autoridade: reduzem precisão interna e confundem valor real com apresentação.
- Um OVR por pessoa: oculta contexto e torna treinadores especialmente opacos.
- Fórmulas React: violam as ADRs 0002, 0003, 0005 e 0006.
- Scouting como penalidade do valor real: mistura conhecimento com capacidade e corrompe o futuro motor.

## Revisão futura

Revisar somente se calibração empírica do Match Engine demonstrar limites inadequados. Qualquer mudança exige nova versão de escala, migração explícita, comparação de impacto e testes de compatibilidade.
