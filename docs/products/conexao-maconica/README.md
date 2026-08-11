# Engenharia do Produto — Conexão Maçônica

**Branch:** `product/conexao-maconica-v1`  
**Base:** `foundation-v1.0` (commit `bdbdd34`)  
**Status:** Fase de Documentação Técnica

---

## Contexto

A Fundação SaaS (CivicOS) foi oficialmente encerrada e congelada na tag `foundation-v1.0`.  
O pipeline global foi validado com `VERIFY_EXIT_CODE=0`.  
O repositório encontra-se limpo e sem alterações pendentes.

A Conexão Maçônica é o primeiro produto construído sobre essa plataforma estável.

---

## Documentos Técnicos Executáveis

Cada documento deve ser produzido, revisado e aprovado antes de iniciar o próximo.

| # | Documento | Status | Aprovação |
|---|---|---|---|
| 00 | Especificação Funcional v1.1.0 | ✅ Source of Truth | Aprovada |
| 01 | Arquitetura Técnica v1.0.0 | ✅ Aprovada | Aprovada |
| 02 | Schema Database v2.1.0 | 🟡 Aprovado com Ajustes | Aprovada |
| 03 | Matriz RBAC v2.2.0 | ✅ Aprovada | Aprovada |
| 04 | Mapa de Telas | ✅ Aprovado | Aprovada |
| 05 | Fluxos e Jornadas | ✅ Aprovado | Aprovada |
| 06 | Arquitetura Orientada a Eventos | ✅ Aprovado | Aprovada |
| 07 | Critérios de Aceite v1.0.0 | 🟡 Concluído (aguardando reconciliação) | Em Homologação |
| 08 | Backlog Priorizado v1.0.0 | 🟡 Proposto (aguardando aprovação) | — |
| 09 | Plano de Sprints | 🔒 Bloqueado (aguardando Doc 08) | — |

---

## Gate de Implementação

O código do produto só será iniciado quando **todos** estes critérios forem atendidos:

- [ ] A fronteira entre plataforma e produto está definida
- [ ] Os módulos e responsabilidades estão definidos
- [ ] O banco cobre o MVP sem duplicações graves
- [ ] As políticas RLS estão projetadas
- [ ] Cada perfil tem permissões claras
- [ ] Todas as telas do MVP estão mapeadas
- [ ] Os fluxos críticos possuem início, regras e final
- [ ] O primeiro épico tem critérios de aceite
- [ ] Existe plano de rollback e migrations
- [ ] A Fundação permanece intacta

---

## Regra de Governança

> Nenhuma regra de negócio específica da Conexão Maçônica entra em `packages/core` ou em plugins genéricos sem justificativa arquitetural documentada.

Ver: [ADR-001 — Limites entre Plataforma e Produto](decisions/ADR-001-limites-plataforma-produto.md)

---

## Estrutura de Arquivos

```text
docs/products/conexao-maconica/
├── README.md                              ← este arquivo
├── 00-especificacao-funcional-v1.md
├── 01-arquitetura-tecnica.md
├── 02-schema-database.md
├── 03-matriz-rbac.md
├── 04-mapa-de-telas.md
├── 05-fluxos-e-jornadas.md
├── 06-event-driven-architecture.md
├── 07-criterios-de-aceite.md
├── 08-backlog-priorizado.md
├── 09-plano-de-sprints.md
└── decisions/
    ├── ADR-001-limites-plataforma-produto.md
    └── ...
```

---

## Ordem de Implementação Recomendada (após aprovação dos documentos)

```text
 1. Estrutura do produto e configuração do tenant
 2. Entidades organizacionais maçônicas
 3. Perfis, vínculos e permissões
 4. Cadastro e moderação de empresas
 5. Planos e assinaturas
 6. Página pública da empresa
 7. Busca e categorias
 8. Mapas
 9. Painéis
10. Recursos avançados
```
