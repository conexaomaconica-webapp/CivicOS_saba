# Relatório 1 — Homologação do Gate 1C (Etapa A)

**Branch:** `feature/commercial-module` @ `2b6cabe` · **Data:** 2026-11-13
**Escopo:** conferência e homologação local. Nenhuma migration aplicada em banco remoto, nenhum push, nenhum deploy, nenhum código alterado.

## Parecer
| Item | Parecer |
|---|---|
| Homologação local (PGlite + estático + build + linha de base) | **GO** |
| RLS com JWT real (Supabase) | **NÃO EXECUTADO** — sem ambiente de teste isolado (ver 4) |
| Aplicar 234–238 em **produção** | **NO-GO** até o ambiente de teste e o item 4 serem concluídos |
| Aplicar 234–238 em **staging/branch isolada** | **GO**, na ordem do item 2 |

## 1. Branches e commits
| Branch | Situação |
|---|---|
| `main` | `15e7c8f` (diagnóstico Firebase) **à frente do remoto em 1 commit, sem push**. Altera só `push-campaigns-service.ts`, `fcm.ts` e o teste `fcm-service-account.test.ts`. |
| `feature/commercial-module` | `2b6cabe`; **igual ao `origin/feature/commercial-module`** (já enviada ao remoto). Base `f787e9d`. |

- A branch comercial **não contém** o `15e7c8f` (base `f787e9d`, anterior). Não há sobreposição: os arquivos do Firebase não são tocados pela branch comercial. Um preview dela **não terá** o diagnóstico do Firebase; para testar o push, o deploy deve ser de `main`.
- Diferença da branch comercial contra a base: 6 arquivos existentes modificados (`admin/layout.tsx`, `AdminShell.tsx`, `AdminSidebar.tsx`, `noindex-paths.ts`, `middleware.ts`, `package.json`); todo o resto é arquivo novo e comercial. **Nenhuma alteração não relacionada.**
- Migrations existentes (≤ 227) não foram alteradas; 228–233 também não (testado em `git diff`).
- `product/conexao-maconica-v1` está 1 commit à frente do remoto (`a27cc6b`), fora do escopo desta entrega.

## 2. Ordem e dependências das migrations
Sequência obrigatória: **228 → 229 → 230 → 231 → 232 → 233 → 234 → 235 → 236 → 237 → 238**. A 228–233 já está em produção.

- 234 depende de 228/229 (`commercial_access_grants`, `commercial_representatives`).
- 235 depende de 234 (`has_commercial_permission`) e das tabelas de 229–232.
- 236 depende de 228 (bucket/documentos) e 234.
- 237 depende de 234.
- 238 depende de 229 (`commercial_leads`, `commercial_lead_activities`, `commercial_referral_evidence`, `commercial_attributions`) e amplia o CHECK de tipos de evidência.
- Dependências externas: `businesses`, `profiles`, `business_signup_invites`, `auth.users`, schema `storage`.
- A suíte `test:commercial-leads` aplica 228–238 em sequência a partir de um banco vazio e passa, o que confirma a ordem. Cada migration tem rollback em `supabase/rollbacks/commercial/` (o rollback de 238 recusa se já houver dados nos tipos novos).

## 3. Testes executados (evidência)
| Suíte | Resultado |
|---|---|
| `test:commercial-db` (228–233, PostgreSQL real via PGlite) | **71/71** |
| `test:commercial-authz` (234–237) | **30/30** |
| `test:commercial-leads` (238) | **31/31** |
| Vitest do módulo (utilitários, regras, estáticos) | **42/42** |
| `typecheck` / `build` | passam (registrado no Gate 1C) |

### Linha de base do Vitest completo (item 6)
Comparação feita rodando a suíte completa em um worktree limpo do commit-base `f787e9d` e na branch:

| | Base `f787e9d` | `feature/commercial-module` |
|---|---|---|
| Testes | 1331 | **1373** (+42, todos os novos do módulo) |
| Falhas | **30** | **30** |
| Arquivos com falha | 24 suítes | 24 suítes |

- **Conjunto de falhas idêntico, teste a teste: 0 novas, 0 corrigidas.** As 30 falhas são pré-existentes, concentradas em `phase1-security-and-lgpd` (10), `analytics-sprint3-events` (5), `admin-businesses-list-kpis` (4), `no-silent-db-writes` (2), `advertiser-results-etapa-c` (2), `checkpoint-empresas-360-refinement` (2) e 5 arquivos com 1 falha cada.
- Observação de método: a primeira comparação indicou "10 novas" por erro meu (o worktree não tinha `node_modules` dos pacotes, então `zod` não resolvia e suítes inteiras caíam). Refeita com as dependências ligadas, o resultado acima é o válido. O worktree temporário foi removido; o repositório principal ficou intacto.
- As 30 falhas continuam abertas. Não foram corrigidas (fora do escopo), mas agora estão documentadas contra a linha de base.

## 4. RLS com JWT real — NÃO realizado (bloqueio)
- Não há Docker, Supabase CLI nem `psql` na máquina; não existe projeto de teste isolado. Pelo AGENTS §6 e pela instrução, **não** usei o projeto de produção.
- O que existe: a suíte 234–237 simula o Supabase em PGlite (papéis `anon/authenticated/service_role` e `auth.uid()` via `request.jwt.claim.sub`). Isso valida a lógica das políticas e grants, **mas não** o PostgREST, a emissão real de JWT, o `storage.objects` real nem o comportamento de `auth.jwt()` do GoTrue.
- **Decisão necessária (sua):** escolher o ambiente de teste. Opções:
  1. **Branch do Supabase** do projeto oficial (`create_branch`): isolada, descartável; **tem custo** e exige sua confirmação.
  2. **Projeto Supabase novo de teste** (gratuito/pago conforme o plano), com as 228–238 aplicadas do zero.
  3. **Docker + Supabase local** na sua máquina (eu preparo os scripts).
- Plano de testes para esse ambiente (cinco perfis): **representante ativo**, **anunciante** (dono de empresa), **operador comercial** (grants parciais), **master**, **usuário sem permissão** (inclusive admin de plataforma sem grant). Para cada um: leitura/escrita direta via PostgREST nas 15+ tabelas comerciais (esperado: só SELECT permitido e filtrado), tentativa de chamar as 6 funções da 238 como `authenticated` (esperado: negado), colunas sensíveis do representante, download de documento no bucket privado, e criação do vínculo por e-mail.

## 5. Roteiro funcional (item 5)
Não executável de ponta a ponta sem o ambiente do item 4 e sem ligar a chave. Está preparado na seção 6 do `GATE-1C-RELATORIO.md` (10 passos). O comportamento de banco por trás dos passos 3–9 já é exercitado pelos 31 testes da 238 (cadastro atômico, qualificação exigindo contato, reserva de 60 dias, conversão preservando a origem, conflito sem efeito colateral, suspensão, expiração).

## 6. Riscos e divergências
1. **RLS real não validada** (item 4) — risco principal; é o que mantém o NO-GO para produção.
2. 30 falhas pré-existentes seguem abertas (não regressão).
3. Preview da branch comercial não inclui o diagnóstico Firebase (ver 1).
4. `ON DELETE RESTRICT` em empresas com lead/atribuição: com o módulo ligado, essas empresas não podem ser apagadas (intencional; avisar a operação).
5. Aplicar 234–238 em produção só com `FEATURE_COMMERCIAL_MODULE_ENABLED` **desligada** e `module_enabled=false`. Concordo com a recomendação de não ligar as duas chaves em produção antes do staging.
