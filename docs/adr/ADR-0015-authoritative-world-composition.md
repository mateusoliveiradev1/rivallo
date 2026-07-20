# ADR-0015 — Composição autoritativa de mundos

## Status

Aceito para a fundação pública.

## Decisão

Manifestos v3 podem declarar composição `additive` ou `authoritative`. A
composição autoritativa precisa declarar escopos tipados e a fingerprint da
base-alvo. A divergência é um bloqueador antes de aplicar patches.

O domínio mantém o mundo em memória até a validação do candidato final. Assim,
falhas de validação não persistem estado intermediário.

## Compatibilidade

Manifestos v1/v2 são lidos com defaults aditivos. O modo autoritativo somente
é aceito no manifesto v3.
