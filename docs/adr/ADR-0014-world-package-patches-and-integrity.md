# ADR-0014 — Serialização de patches e integridade de pacotes mundiais

**Status:** Accepted · **Date:** 2026-07-17 · **Owner:** Phase 06.5

## Contexto

Pacotes precisam adicionar, substituir ou remover conteúdo sem depender de nomes, índices, ordem
de arrays ou código executável. O resolvedor também precisa produzir a mesma base e o mesmo
fingerprint para a mesma seleção e ordem de pacotes.

## Decisão

1. O formato de autoria v1 é JSON UTF-8 data-only. JavaScript, Rust, HTML, binários, DLLs e scripts
   não são entrypoints válidos.
2. Cada patch declara `operation` (`add`, `replace` ou `remove`), `entityKind`, `targetId`, motivo e
   payload tipado. `add` exige alvo ausente; `replace` e `remove` exigem alvo existente.
3. O payload de `add`/`replace` reutiliza os contratos canônicos existentes. Não há `PlayerV2`,
   `NewClub` ou outra representação paralela.
4. A ordem é determinística: pacote base, mods ordenados por `loadOrderHint` e `packageId`, depois a
   ordem declarada dos patches dentro de cada mod. Conflitos nunca são resolvidos silenciosamente.
5. O manifesto declara SHA-256 do entrypoint mundial ou do conjunto de conteúdo exportado. O mundo
   resolvido usa um fingerprint determinístico sobre IDs, versões, checksums e ordem dos pacotes.
6. Assinatura criptográfica não é obrigatória no schema v1. Pacotes locais são tratados como não
   confiáveis e passam por limites de tamanho, path traversal, media type, schema e integridade. Uma
   futura assinatura precisa ser campo versionado e opcional antes de se tornar política de canal.
7. JSON canônico para publicação usa campos na ordem do schema, UTF-8, LF, dois espaços, números
   finitos e nenhuma chave desconhecida na exportação oficial. A semântica não depende da ordem de
   objetos, mas arrays ordenados permanecem parte explícita do conteúdo.

## Consequências

- Mods v1 são portáteis e auditáveis, sem execução arbitrária.
- A ausência de assinatura não é apresentada como prova de autoria; checksum prova integridade, não
  identidade.
- Alterações de sintaxe ou semântica exigem novo `schemaVersion` e migração explícita.
