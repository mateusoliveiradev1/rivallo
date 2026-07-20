# ADR-0015 — Metodologia versionada e camadas de avaliação

**Status:** Accepted · **Date:** 2026-07-19 · **Owner:** Evaluation foundation

## Contexto

O schema mundial v2 já separa identidades factuais parciais de perfis esportivos completos, mas
`ProfileWorld` ainda representa diretamente os inputs e outputs runtime entregues pela Fase 06.4.
Ele não registra o processo editorial que transforma evidências em atributos, capacidade,
potencial ou capacidades de treinador. Sem essa fronteira, uma importação factual poderia parecer
autorizada a inventar ratings, e um rascunho poderia ser confundido com conteúdo pronto para
gameplay.

## Decisão

1. Avaliações são documentos separados de fatos. Elas referenciam `entityId` e nunca duplicam
   nome, clube, nacionalidade, contrato ou outra identidade factual.
2. Toda avaliação registra metodologia e versão, valor exato/faixa/qualitativo/desconhecido,
   evidências, confidence breakdown, autor, revisor, explicação, validade e lifecycle editorial.
3. O lifecycle canônico é: não avaliada, rascunho, evidência insuficiente, em revisão, aprovada,
   rejeitada, desatualizada e substituída. Somente `approved` pode compor inputs runtime.
4. Confiança mede cobertura, recência, qualidade, consistência e precisão da avaliação. Ela nunca
   altera o valor esportivo e não é sinônimo de qualidade da pessoa.
5. A escala estrutural permanece inteira em 0–100. A metodologia 1.0 declara compatibilidade com
   `rivallo.rating.0-100.v1` e `rivallo.rating.0-100.v2`. A versão v2 já existente identifica a
   migração da taxonomia genérica para atributos separados de linha/goleiro; não muda o intervalo
   nem autoriza recalibrar silenciosamente os pesos contextuais.
6. A composição contextual da 06.4 permanece 50% posição, 20% função, 20% encaixe e 10%
   familiaridade. Condição, forma e potencial continuam fora da capacidade atual. Treinadores
   continuam sem OVR universal.
7. `EvaluationLayerPackage` possui manifesto, metodologia, fingerprint factual alvo, avaliações,
   evidências, histórico, proveniência e checksum SHA-256. Fingerprint divergente, entidade ausente,
   metodologia não aprovada ou checksum inválido bloqueiam composição.
   O domínio produz os bytes JSON canônicos e compara o digest declarado com o digest observado;
   o cálculo SHA-256 e o novo selo após mutações pertencem à plataforma, que já possui a dependência
   criptográfica. Importação e rollback invalidam o selo até essa etapa ser concluída.
8. Importação usa `entityId`, metodologia, origem e data, sempre passa por dry run e nunca aprova
   automaticamente. O receipt mantém estado anterior suficiente para rollback.
9. Readiness projeta separadamente mínimo factual, avaliação aprovada, perfil runtime e gameplay.
   A fundação não transforma automaticamente uma pessoa factual em `ProfileWorld`.
10. Pacotes privados seguem catálogo/capability isolados. A camada pública e suas calibrações usam
    somente fixtures sintéticas.

## Compatibilidade com a Fase 06.4

Os contratos atuais de `PlayerAttributeSet`, `CoachAttributeSet`, `ExplainableRating`,
`ScoutingAssessment`, `KnowledgeValue`, `RatingSnapshot` e `PotentialEstimate` continuam
autoritativos no runtime. A nova camada é a fonte editorial futura dos inputs aprovados; ela não
implementa uma segunda fórmula de rating e não substitui automaticamente seeds legados.

## Consequências

- Corrigir um fato não reescreve avaliação; a incompatibilidade é marcada para revisão.
- Alterar metodologia ou fingerprint produz nova versão/stale, nunca overwrite silencioso.
- Faixas permanecem faixas na autoria e na explicação; midpoint é utilitário explícito, não valor
  aprovado implícito.
- Especialidades exigem critérios, evidências e consumidor declarado.
- A aprovação pode ser bloqueada por evidência mínima e o gameplay pode continuar bloqueado mesmo
  com estrutura factual válida.

## Alternativas rejeitadas

- Acrescentar autoria diretamente a `Person`: mistura fato e avaliação.
- Reutilizar `ScoutingAssessment` como documento editorial: scouting controla conhecimento
  percebido, não autoria/revisão do valor interno.
- Gerar atributos por média global: cria precisão falsa e remove blockers honestos.
- Converter toda faixa em midpoint no importador: perde incerteza e contradiz a explicabilidade.
- Um novo OVR paralelo: duplicaria os ratings entregues pela Fase 06.4.

## Revisão futura

Uma mudança de escala, taxonomia ou pesos exige nova versão metodológica, migração explícita,
comparação de impacto, calibração sintética e, quando existir base autorizada, calibração privada
fora do build público.
