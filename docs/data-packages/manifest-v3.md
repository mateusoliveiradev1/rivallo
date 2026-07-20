# Package Manifest v3

O manifesto v3 mantém a leitura de pacotes v1 e v2. Pacotes antigos continuam
aditivos por padrão; nenhum pacote antigo se torna autoritativo implicitamente.

## Modos

- `additive`: aplica conteúdo e patches sem substituir o escopo inteiro.
- `authoritative`: declara `authoritativeScopes` e exige
  `targetBaseFingerprint` exatamente igual à base resolvida.

Os escopos são uma enumeração do contrato, não strings livres. Incluem clubes,
competições, participantes, pessoas esportivas, inscrições, contratos, perfis,
avaliações, estado de matchday, estádios, assets, traduções e projeções.

## Sidecars

Sidecars declaram tipo, versão, caminho relativo, tamanho, SHA-256,
obrigatoriedade e compatibilidade. Caminhos absolutos, traversal, hashes
inválidos e versões zero são rejeitados antes da composição.

## Segurança e readiness

`selectable` permanece uma consequência derivada dos diagnósticos. A readiness
de pessoas com papel `StaffMember` não exige player profile nem coach profile.
