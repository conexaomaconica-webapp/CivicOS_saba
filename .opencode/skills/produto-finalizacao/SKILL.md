---
name: produto-finalizacao
description: Use when finishing, delivering, or verifying any feature, PBI, sprint, or release in the Conexão Maçônica product built on CivicOS. Applies the Global Definition of Done (CRIT-TRN-031), checks the verification pipeline (lint, typecheck, test, build), migration/schema discipline, sprint gates, event/audit registry, and doc-code sync. Trigger on keywords like finalizar, DoD, done, pronto, verificar, pipeline, VERIFY_EXIT_CODE, lint, typecheck, test, build, migration, sprint gate, release, entregar, concluir.
---

# Finalização de Funcionalidade — Conexão Maçônica / CivicOS

Regras obrigatórias para considerar qualquer trabalho **concluído** e
**mergável** no produto Conexão Maçônica (plataforma CivicOS). Toda entrega
deve fechar com a Definition of Done global `CRIT-TRN-031` e o pipeline verde.

Fonte documental: `docs/products/conexao-maconica/engineering/07-criterios-de-aceite.md`
(DoD 2.18), `08-backlog-priorizado.md` (rastreabilidade) e `09-plano-de-sprints.md` (gates).

## 1. Definition of Done Global — CRIT-TRN-031

Uma funcionalidade só é considerada concluída se **todos** os itens abaixo forem verdadeiros:

1. **Cumpriu 100% dos cenários especificados** no critério de aceite do PBI (`CRIT-VSC-*` / `CRIT-TRN-*` referenciados no backlog Doc 08).
2. **Validação automatizada presente**: testes unitários para regras de domínio, integração para rotas de serviço e ponta a ponta para a jornada principal (`CRIT-TRN-030`).
3. **Código limpo**: lint e typecheck sem erros (`CRIT-TRN-031.3`).
4. **Registros de auditoria e/ou eventos EDA** (Doc 06) previstos, com nomenclatura canônica e versionamento (ex: `billing.payment.approved.v1`, `directory.business.published.v1`, `legal.contract.signed.v1`) — ver skill `moderacao-fluxo` para os eventos de moderação.
5. **Homologação visual** no Design System v1.0 (Design Lab).

## 2. Pipeline de verificação — ordem obrigatória

No fim de cada PBI rodar **na raiz do monorepo** (salvo indicação contrária), e não considerar pronto até sair verde:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

- No CI (`.github/workflows/ci.yml`) essa sequência roda automaticamente em `push` para `main` e em `pull_request` — **o pipeline do GitHub é o selo final**, mas deve estar verde localmente antes de abrir PR.
- Se o commit anterior à Fundação validou com `VERIFY_EXIT_CODE=0`, seguir o mesmo padrão: o pipeline completo com exit code 0 é a evidência de gate.
- Em caso de erro em qualquer etapa: **não** finalizar; corrigir, re-rodar a etapa e prosseguir.

## 3. Disciplina de migrations / schema

- Qualquer mudança de schema exige **migration incremental numerada** em `supabase/migrations/NNN_*.sql` — nunca editar uma migration já aplicada.
- Migrations de produto devem manter o isolamento multi-tenant (DefaultPrivileges/RLS em todas as tabelas, `tenant_id`, FKs compostas) — ver `CRIT-TRN-008`/`CRIT-TRN-010`.
- Dados sensíveis de produto (vínculo maçônico, documentos) seguem a política LGPD do skill `lgpd-revisao`.
- Conferir se `packages/infrastructure/migrations/` e `supabase/migrations/` estão coerentes (a Fundação congela em `foundation-v1.0`; produto não tem permissão de alterar a Fundação).

## 4. Gates de sprint (Doc 09)

Fechar cada fase confirmando os gates explícitos do plano de sprints:

- **Gate 1 (pós Sprint 0)**: `INF-001`–`INF-006` verdes (schema migrado, RLS testada, RBAC runtime, Outbox/DLQ, LGPD base) + `XS-001` (pipeline CI/CD).
- **Gate 2 (pós Sprint 6)**: MVP 1A-Core completo, incluindo Torre de Controle Base (`CTL-001`/`CTL-002`), onboarding ponta a ponta homologado.
- **Gate 3 (pós Sprint 8)**: Torre de Controle operacional (Wizard `CTL-003` + DLQ `CTL-006`), desbloqueia MVP 1B.

## 5. Sincronia documento ↔ código (regra de governança)

- Os docs de engenharia (Docs 00–09) são **Aprovados e Congelados**. Qualquer divergência entre implementação e doc deve ser **reconciliada** (novo doc de ajuste, commit separado de documentação), nunca "implementar e deixar o doc desatualizado".
- Cada PBI entregue deve declarar, na descrição/review: PBI-ID, critérios atendidos, eventos EDA emitidos, telas/jornadas (Doc 04/05) cobertas, e status de homologação visual.
- Rotas públicas novas exigem metadata e dados estruturados conforme skill `seo-conteudo`.

## 6. Checklist final antes de declarar pronto

1. [ ] Testes do PBI verdes (`pnpm test` incluindo a suíte específica do PBI)
2. [ ] Lint e typecheck sem erros
3. [ ] Build de produção OK
4. [ ] Migrations aplicáveis idempotentes e numeradas
5. [ ] Auditoria/eventos EDA previstos registrados e com nome canônico
6. [ ] Homologação visual no Design System v1.0
7. [ ] Docs de engenharia reconciliados (sem divergência)
8. [ ] Sem quebra de fronteira plataforma↔produto (testes de arquitetura verdes)

Apenas após todos os itens a feature está pronta para review/merge.