# GATE-BUSINESS-VIEWS — Relatório de Publicação em Produção

**Data:** 28/11/2026 · **Commit publicado na `main`:** `e2c1bc6` (fast-forward `e1e7aff..e2c1bc6`)
**Supabase oficial:** `rwvztwsjcjljphqttiws`

## 1. Validação de concorrência (PostgreSQL 16 descartável, GitHub Actions)
- Container `postgres:16-alpine`, sem acesso a segredos nem ao banco de produção.
- Run `46141385404` (branch `feat/gate-business-views-unification`): **25/25 asserções, 0 falhas** nos 9 cenários (incrementos simultâneos, dedup por `cycle_id`, visitantes distintos, COOLDOWN com meia-noite, troca de política, backfill/reconcile concorrente, rajada multi-empresa, UPDATE/DELETE, rollback + reaplicação).
- Vitest do Gate no mesmo run: 2 arquivos, 21 testes aprovados.
- Nota: o run anterior (`46140599838`) falhou por `@saas/core` não compilado no CI e por um rótulo "views" no `BusinessListCard`; ambos corrigidos em `e2c1bc6`.

## 2. Migration 258 em produção
- **Já estava aplicada** (`updated_by = system_migration_258`, 28/11 10:23 UTC), antes desta sessão. Não foi reaplicada.
- Verificação somente leitura: `is_business_views_materialized_sync_active() = true`; política `ALL_VIEWS` (15 min / `America/Sao_Paulo`); `audit_business_views_consistency()` → 27 empresas, **0 inconsistentes**; soma materializada = recalculada = 1.489 (snapshot 12:29 UTC: 1.489 eventos `view`).
- `257_commercial_campaigns_pedra_closure.rollback.sql` **não** foi executado.

## 3. Publicação Web/Backend
- `git push origin main` com `e2c1bc6`; Vercel publicou (site respondendo com o novo leitor canônico).

## 4. Smoke tests pós-deploy (somente leitura)
| Superfície | Resultado |
| :-- | :-- |
| `/guia` | 308 → `/` (redirecionamento já existente) |
| `/guia/empresas` | 200 · caminhodaluz 438 |
| `/guia/beneficios` | 200 · 288, 438, 17, 106 (antes: `null`) |
| `/guia/caminhodaluz` | 200 · 438 (DB: 438) |
| `/guia/opticacirculo` | 200 · 106 (DB: 106; antes do Gate: 0 no card) |
| `/api/mobile/guide` | 200 · caminhodaluz 438 |
| `/api/analytics/track` | OPTIONS 204 |
| `/admin/configuracoes/analytics`, `/anunciante` | 307 → `/login` (rota protegida, existe) |

## 5. Pendências / limites declarados
- Não foi feita inspeção autenticada de `/admin/configuracoes/analytics`, `/anunciante/resultados` e Admin 360 (exige login); recomenda-se conferência manual pelo admin.
- A listagem mobile página 1 não trouxe todas as empresas auditadas; paridade comprovada apenas para as que apareceram.
- O CI `ci.yml` da `main` já falhava antes (16 suítes preexistentes, ver relatório pré-produção).
- Contadores mudam com novas visitas (ex.: institutodam 101 → 102 durante a auditoria); comparar sempre no mesmo instante.

## 6. Parecer
**GO operacional**: banco consistente (0 divergência), código publicado e contadores idênticos nas superfícies públicas verificadas. Rollback disponível em `supabase/rollbacks/analytics/258_rollback.sql`.
