# Camadas de avaliação Rivallo

## Autoridade

Uma camada de avaliação referencia pessoas por ID interno e acrescenta somente interpretação
esportiva. Nome, nascimento, nacionalidade, clube, contrato, posição declarada e demais fatos
continuam pertencendo à base factual. Corrija fatos no módulo factual; o workbench de Avaliações os
mostra em modo somente leitura.

```text
base factual + evaluation layer aprovada + assets + traduções = mundo utilizável
```

Ratings contextuais continuam sendo calculados pelos contratos Rust da Fase 06.4. A camada fornece
inputs editoriais aprovados e não cria um segundo motor.

## Metodologia oficial 1.0

- ID: `rivallo.evaluation.foundation`.
- Schema: 1.
- Escala: 0–100 inteira, compatível com as versões de rating v1 e v2.
- Estados metodológicos: rascunho, em revisão, aprovada e obsoleta.
- Valores: exato, faixa, qualitativo ou desconhecido.
- Lifecycle: não avaliada, rascunho, evidência insuficiente, em revisão, aprovada, rejeitada,
  desatualizada e substituída.

As dimensões iniciais correspondem aos consumidores reais: seis atributos de linha, seis de
goleiro, capacidade atual, potencial e capacidades contratadas de treinador/comissão. Novas
dimensões precisam declarar comportamento e consumidor.

## Evidência e confiança

Evidência registra entidade, fonte, source ID, coleta/verificação, período, contexto, métrica ou
observação, unidade, qualidade, confiança, notas, licença e proveniência. Fontes comparáveis que
divergem além da tolerância metodológica geram conflito visível.

O breakdown de confiança pondera:

| Parcela      | Peso |
| ------------ | ---: |
| Cobertura    |  25% |
| Recência     |  20% |
| Qualidade    |  25% |
| Consistência |  20% |
| Precisão     |  10% |

Conflitos reduzem consistência. Nenhuma parcela altera a qualidade esportiva avaliada.

## Revisão

Rascunhos podem ser editados e enviados. Evidência ausente retorna o documento para `insufficient
evidence`. Um revisor pode aprovar, devolver, rejeitar ou pedir mais evidência. Avaliação aprovada
pode ser marcada como stale por nova evidência, metodologia, posição, contexto ou validade; a
versão anterior permanece no histórico.

## Importação

CSV/JSON exige `entityId`, `methodologyId`, `methodologyVersion`, origem e data. Nome não é chave.
O dry run lista criações, substituições de draft, conflitos, blockers, ranges e impacto na
readiness. Importação nunca aprova automaticamente e produz receipt reversível.

## Layer package

O manifesto declara `packageId`, versão, schema, metodologia, fingerprint factual alvo, autor,
visibilidade e checksum SHA-256. A carga bloqueia quando:

- o fingerprint factual diverge;
- uma entidade não existe;
- a metodologia não está aprovada ou não é suportada;
- uma avaliação aprovada referencia evidência ausente;
- o checksum não confere.

Camadas `privateDevelopment` usam exclusivamente catálogo privado autorizado e não entram em
build, fixture ou documentação pública.

## Readiness

A política `rivallo.evaluation-readiness.v1` avalia quatro dimensões independentes: fatos mínimos,
avaliação aprovada, perfil runtime e gameplay. Um registro estruturalmente válido pode continuar
bloqueado para gameplay; isso é um resultado correto, não um erro de importação.

## Calibração

`data/evaluations/synthetic-calibration-v1.json` contém somente arquétipos sintéticos. Ele cobre
jogadores de linha, goleiros, jovens, veteranos, treinadores e comissão e serve para testar
monotonicidade, distribuição, sensibilidade e separação entre capacidade, condição, forma,
familiaridade, potencial e confiança. Nenhuma pessoa real é baseline público.
