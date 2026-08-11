# Roadmap CivicOS

## Fundação CivicOS

- [x] Kernel Foundation e DI Container
- [x] SDK Contracts e Event Bus
- [x] Plugin Runtime e Lifecycle
- [x] Business Directory Foundation
- [x] Infrastructure Layer
- [x] Presentation Engine
- [x] Navigation Engine e Web Shell
- [x] Testes e limites arquiteturais
- [x] Remover limite de domínio maçônico do contrato de licenciamento

## Produto — Conexão Maçônica

### Documentação aprovada e congelada (Tag `conexao-maconica-docs-approved`)

- [x] Doc 00 — Especificação Funcional ↳ Aprovado e Congelado (Adendo de vínculo incorporado)
- [x] Doc 01 — Arquitetura Técnica ↳ Aprovado e Congelado (Extensão de vínculo incorporada)
- [x] Doc 02 — Schema Database ↳ Aprovado e Congelado (Entidades de vínculo incorporadas)
- [x] Doc 03 — Matriz RBAC ↳ Aprovado e Congelado (Permissões de vínculo incorporadas)
- [x] Incorporar Política de Vínculo e Concorrência nos Docs 00–03 (Concluído)

### Documentação de engenharia — Concluída, aguardando reconciliação

- [x] Doc 04 — Mapa de Telas (concluído, em `docs/products/conexao-maconica/engineering/04-mapa-de-telas.md`)
- [x] Doc 05 — Fluxos e Jornadas (concluído, em `docs/products/conexao-maconica/engineering/05-fluxos-e-jornadas.md`)
- [x] Doc 06 — Arquitetura Orientada a Eventos (concluído, em `docs/products/conexao-maconica/engineering/06-event-driven-architecture.md`)
- [x] Doc 07 — Critérios de Aceite (concluído, em `docs/products/conexao-maconica/engineering/07-criterios-de-aceite.md`)

> **Nota**: Docs 04–07 existem e estão completos. Classificados como "concluídos, aguardando reconciliação" — não pendentes, não congelados. A reconciliação formal (correções de contagem CTL, lacunas RBAC, ortogonalidade de estados, normalização de referências ADV-007b, segregação MVP 1A vs 1B) será endereçada no ciclo de Documento 08/09.

### Documentação de planejamento (Próxima fase)

- [x] Doc 08 — Backlog Priorizado (aprovado e congelado, em `docs/products/conexao-maconica/engineering/08-backlog-priorizado.md`, 90 PBIs / 385 SP)
- [x] Doc 09 — Plano de Sprints (proposto, em `docs/products/conexao-maconica/engineering/09-plano-de-sprints.md`, 13 sprints / ~26 semanas)

### Implementação (🔒 Bloqueada até Doc 09 aprovado)

- [ ] Migrations SQL do Produto
- [ ] Seeds
- [ ] Políticas RLS
- [ ] Runtime RBAC
- [ ] Telas e regras do produto