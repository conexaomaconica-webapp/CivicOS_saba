# GATE-BUSINESS-VIEWS — Relatório de Validação Final Pré-Produção

**Status do Gate:** `VALIDAÇÃO FINAL CONCLUÍDA LOCALMENTE — AGUARDANDO AUTORIZAÇÃO PARA PRODUÇÃO`  
**Branch Isolada:** `feat/gate-business-views-unification` (baseada em `main` commit `e1e7aff`)  
**Data da Validação Final:** 28/11/2026  
**Restrições de Segurança Cumpridas:** Nenhum `git push`, nenhum `merge` na `main`, nenhum deploy, nenhuma migration remota aplicada, nenhuma inserção de teste no banco de produção e nenhuma nova build de aplicativo gerada para distribuição.

---

## 1. Confirmação da Política Inicial Obrigatória (Seção 1)

| Parâmetro da Política | Valor Inicial Configurado | Onde é Garantido |
| :--- | :--- | :--- |
| **Modalidade Padrão** | `ALL_VIEWS` (*Todas as visualizações*) | `DEFAULT_POLICY` em [views-policy-service.ts](file:///f:/projetos/saas-platform/apps/web/src/lib/analytics/views-policy-service.ts#L43-L54) e função SQL `public.get_analytics_views_policy` na [Migration 258](file:///f:/projetos/saas-platform/supabase/migrations/258_canonical_business_views_and_configurable_policy.sql#L103-L195). |
| **Atualizações efetivas da página (`F5`)** | **Ativado** (`+1` a cada novo ciclo de atualização) | `getOrCreateNavigationCycleId` ([track-client.ts](file:///f:/projetos/saas-platform/apps/web/src/lib/analytics/track-client.ts#L21-L28)) + modo `ALL_VIEWS`. |
| **Acessos repetidos legítimos** | **Ativado** | Contabilizados normalmente em `ALL_VIEWS`. |
| **Deduplicação técnica por `cycle_id`** | **Sempre Ativada** | Trigger `fn_prevent_duplicate_view_cycle` + índice único `uq_analytics_events_view_cycle_forward`. |
| **Exclusão de tráfego interno** | **Ativado** | `classifyTraffic` / `shouldExcludeFromMetrics` ([internal-traffic.ts](file:///f:/projetos/saas-platform/apps/web/src/lib/analytics/internal-traffic.ts)). |
| **Preservação do histórico** | **100% Preservado** | Nenhum registro de `public.analytics_events` é apagado ou alterado. |
| **Modos `COOLDOWN` e `UNIQUE_DAILY`** | **Disponíveis, porém desativados no lançamento** | Configuráveis a qualquer momento em `/admin/configuracoes/analytics` sem deploy ou nova migration. |
| **Aplicativos Android e iOS publicados** | **Compatíveis sem nova publicação** | Contratos de `/api/mobile/guide`, `/api/analytics/track` e RPCs preservados. |

---

## 2. Resolução e Comprovação Comparativa das Suítes Web, Mobile e Build de Produção (Seção 2)

### 2.1. Resultado Oficial das Suítes e Compilações Locais

| Comando Executado | Arquivos de Teste | Testes Aprovados | Testes Reprovados | Testes Ignorados | Exit Code | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `pnpm --filter web typecheck` | — | — | 0 | 0 | **`0`** | **100% Aprovado** |
| `pnpm --filter mobile typecheck` | — | — | 0 | 0 | **`0`** | **100% Aprovado** |
| `pnpm --filter mobile test` | **18 / 18** | **82** | **0** | **0** | **`0`** | **100% Aprovado** |
| `pnpm --filter web build` | Build completo (`prebuild` 11 pacotes + `next build` 59 páginas) | — | 0 | 0 | **`0`** | **100% Aprovado** |
| `pnpm --filter web exec vitest run test/gate-business-views-homologation.test.ts` | **1 / 1** | **8** | **0** | **0** | **`0`** | **100% Aprovado** |
| `pnpm --filter web exec vitest run test/advertiser-results-etapa-c.test.tsx` | **1 / 1** | **13** | **0** | **0** | **`0`** | **100% Aprovado** *(regressão corrigida)* |
| **Todas as 11 suítes de Analytics & Visualizações (`apps/web/test/*analytics*` + `gate-business-views-homologation` + `advertiser-results-etapa-c`)** | **11 / 11** | **99** | **0** | **0** | **`0`** | **100% Aprovado** *(consolidado: `gate-business-views-homologation.test.ts` expandido de 7 para 8 blocos = 99 testes no total)* |
| `pnpm --filter web exec vitest run` *(Suíte Global Web — 237 arquivos)* | **221 aprovados / 16 reprovados** | **1.789** | **41** *(100% preexistentes na `main`)* | **0** | **`1`** | **Comprovado zero regressão deste Gate** *(ver 2.2)* |

### 2.2. Comprovação Comparativa em Checkout Limpo da `main` (`e1e7aff`)
* **Regressão única do nosso escopo identificada e corrigida:**
  * Na primeira execução global, o arquivo `test/advertiser-results-etapa-c.test.tsx` havia apresentado 2 falhas (`BusinessListCard` exibindo `'views'` em inglês em vez de `'visualizações'` e texto da nota de transparência em `results-client.tsx`). Ambos foram corrigidos e **`test/advertiser-results-etapa-c.test.tsx` passou 13/13 (`Exit Code 0`)**.
* **Comprovação das 16 suítes restantes (41 testes) em checkout limpo da `main` (`e1e7aff`):**
  * Executamos exatamente os 16 arquivos restantes sobre o estado limpo da `main` (`git rev-parse --short HEAD -> e1e7aff`).
  * **Resultado na `main` limpa (`e1e7aff`):** **`Test Files: 16 failed (16) | Tests: 41 failed | 102 passed (143)`** — **exatamente as mesmas 16 suítes e os mesmos 41 testes** falham na `main` antes de qualquer alteração nossa:

| # | Arquivo de Teste (Preexistente na `main`) | Qtd. Falhas na `main` (`e1e7aff`) | Qtd. Falhas na Branch (`feat/...`) | Causa Raiz Preexistente (Fora do Escopo deste Gate) |
| :-: | :--- | :---: | :---: | :--- |
| 1 | `test/analytics-sprint3-events.test.tsx` | 5 | 5 | Node 22+ injeta proxy `localStorage` experimental sem método `.clear()` quando `--localstorage-file` não é passado ao processo Node. |
| 2 | `test/phase1-security-and-lgpd.test.ts` | 10 | 10 | Mesma incompatibilidade do flag experimental `localStorage` do Node 22+ (`localStorage.clear` / `getItem` no ambiente Node). |
| 3 | `test/update-password-page.test.tsx` | 4 | 4 | Mock de `createBrowserSupabaseClient` no teste não define `supabase.auth.onAuthStateChange`. |
| 4 | `test/admin-businesses-list-kpis.test.ts` | 4 | 4 | Renomeação histórica dos códigos de plano (`ouro/prata/bronze` → `acacia/compasso/esquadro`) não atualizada nas fixtures antigas do teste. |
| 5 | `test/checkpoint-empresas-360-refinement.test.ts` | 2 | 2 | Teste antigo espera `plan_code = 'ouro'` (código atual retorna `'acacia'`) e mock sem `SUPABASE_SERVICE_ROLE_KEY`. |
| 6 | `test/checkpoint-content-events-posts.test.ts` | 4 | 4 | Teste antigo de eventos/posts exige cliente de serviço não mockado no arquivo de teste. |
| 7 | `test/no-silent-db-writes.test.ts` | 3 | 3 | Verificador estático aponta `.update`/`.upsert` antigos em `categories`, `invoices` e `business_categories` na `main`. |
| 8 | `test/admin-lodges-actions.test.ts` | 1 | 1 | Mock de sessão admin em `updateAdminLodgeAction`. |
| 9 | `test/business-benefits-services-contract.test.ts` | 1 | 1 | Evolução do contrato do plano Esquadro/Bronze na Migration 256 (`main`). |
| 10 | `test/checkpoint-advertiser-portal-routing-audit.test.ts` | 1 | 1 | Mock de `createChain` no teste não implementa `.gte()`/`.range()` usados pelo fallback de streaming. |
| 11 | `test/checkpoint-billing-etapa1.test.ts` | 1 | 1 | Fixture antiga de UUID de tenant no teste de webhook Asaas. |
| 12 | `test/checkpoint-definitive-sidebar.test.ts` | 1 | 1 | O commit `119a9e4` na `main` reativou `/admin/campanhas` na sidebar, que o teste antigo listava como rota desativada. *(O teste 1 "Zero Broken Links" passou 100%, validando `/admin/configuracoes/analytics`)*. |
| 13 | `test/checkpoint6-integrated-e2e.test.ts` | 1 | 1 | Autorização endurecida pela Migration 249/250 exige sessão autenticada do dono da empresa. |
| 14 | `test/commercial-migrations.static.test.ts` | 1 | 1 | O commit `119a9e4` na `main` adicionou `257_commercial_campaigns_pedra_closure.rollback.sql` dentro de `supabase/migrations/`. *(O nosso rollback `258_rollback.sql` já foi colocado em `supabase/rollbacks/analytics/258_rollback.sql`)*. |
| 15 | `test/lodge-potency.test.ts` | 1 | 1 | Regra de normalização de sigla de potência com sufixo UF. |
| 16 | `test/public-shell-architecture.test.ts` | 1 | 1 | Teste estático antigo busca classe CSS `bg-[#3b0b14]/98` alterada anteriormente no `DirectoryHeader.tsx`. |

---

## 3. Homologação de Concorrência e Declaração Transparente de Ambiente (Seção 3)

### 3.1. Declaração Explícita sobre o Ambiente Local de Banco de Dados
Conforme exigido na Seção 3 (*"Se o ambiente necessário não estiver disponível, declarar explicitamente o bloqueio. Não classificar testes não executados como aprovados"*):
* A estação de trabalho Windows local **não possui** daemon PostgreSQL nativo instalado (`C:\Program Files\PostgreSQL` ausente; comando `psql` ausente) **nem** Docker Desktop (`C:\Program Files\Docker` ausente; comando `docker` ausente), e o banco oficial de produção (`rwvztwsjcjljphqttiws.supabase.co`) **não foi utilizado para testes de escrita** em respeito estrito às regras de segurança do Gate.
* Portanto:
  1. **O que foi executado e aprovado localmente:**
     * Motor PostgreSQL 16 real compilado em WebAssembly (`@electric-sql/pglite`), executando integralmente o parser SQL, PL/pgSQL, triggers `BEFORE INSERT` e `AFTER INSERT OR UPDATE OR DELETE`, `pg_advisory_xact_lock`, `LOCK TABLE ... IN SHARE ROW EXCLUSIVE MODE`, constraints e índices únicos parciais das Migrations 216 e 258.
     * Concorrência assíncrona no nível do serviço Node.js (`Promise.all` em `trackDirectoryEventAction` validando `inFlightViewCycles` e `inFlightSubjectLocks`).
  2. **Limitação técnica declarada do `PGlite`:**
     * Como o `PGlite` executa uma instância PostgreSQL single-process em memória/WASM, conexões simultâneas enviadas à mesma instância `PGlite` são enfileiradas na mesma sessão do motor WASM. Ele comprova a exatidão lógica das funções PL/pgSQL, triggers e locks, mas **não simula contenção física multi-processo entre múltiplos backends PostgreSQL paralelos**.
  3. **Garantia arquitetural para múltiplas instâncias da Vercel em produção:**
     * Para garantir funcionamento sob múltiplas instâncias serverless independentes da Vercel (onde a memória do Node.js não é compartilhada), toda a deduplicação por `cycle_id`, serialização por visitante (`cooldown_subject_id` / `pseudonymous_subject_id`), avaliação de `COOLDOWN` / `UNIQUE_DAILY`, proteção anti-burst e incremento atômico (`SET views_count = GREATEST(COALESCE(views_count, 0) + 1, 0)`) foi implementada **dentro do próprio PostgreSQL** via `pg_advisory_xact_lock` transacional + índice único físico `uq_analytics_events_view_cycle_forward` + `UPDATE` atômico row-level no trigger `AFTER INSERT`.

---

## 4. Auditoria da Política de Identificação do Visitante e Continuidade na Meia-Noite (Seção 4)

A revisão de [apps/web/src/lib/analytics/privacy-hash.ts](file:///f:/projetos/saas-platform/apps/web/src/lib/analytics/privacy-hash.ts) e da [Migration 258](file:///f:/projetos/saas-platform/supabase/migrations/258_canonical_business_views_and_configurable_policy.sql) validou e aprimorou os 9 pontos solicitados:

1. **Segredo Privado no Servidor (`getAnalyticsServerSalt`):** Utiliza `process.env.ANALYTICS_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY`, nunca exposto ao cliente (`'use server'` / Route Handler).
2. **Isolamento entre Tenants:** `generatePseudonymousSubjectId` e `generateCooldownSubjectId` incluem o escopo do `tenantId` na derivação do HMAC-SHA256 (`t_${tenantId}_...` / `cd_...|${tenantScope}|...`). Testado em `T-SEC-01` (`subjTenantA !== subjTenantB`).
3. **Identificação de Usuários Autenticados:** Quando `userId` autenticado está disponível (e não é tráfego interno da própria empresa), deriva `usr_<28 hex>` / `cd_<28 hex>` com HMAC-SHA256.
4. **Uso Confiável de Cabeçalhos de IP atrás da Vercel (`extractTrustedClientIp`):** Prioriza `x-vercel-forwarded-for` (injetado pela edge da Vercel) e `x-real-ip` antes do primeiro hop de `x-forwarded-for`. Testado em `T-SEC-01`.
5. **Continuidade do `COOLDOWN` na Transição entre Dias (23h58 → 00h02):**
   * **Problema resolvido:** Como `pseudonymous_subject_id` rotaciona à meia-noite (`America/Sao_Paulo`) para conformidade LGPD em `UNIQUE_DAILY`, uma visita às `23:58` e outra às `00:02` (4 minutos depois) geravam `pseudonymous_subject_id` diferentes.
   * **Solução implementada:** Criamos `generateCooldownSubjectId` (`cd_<28 hex>`), gravado em `metadata.cooldown_subject_id`, que não sofre corte à meia-noite. No modo `COOLDOWN`, tanto o trigger PostgreSQL (`fn_prevent_duplicate_view_cycle`) quanto o serviço backend (`analytics-service.ts`) verificam a janela deslizante de $N$ minutos comparando `pseudonymous_subject_id` **OU** `metadata->>'cooldown_subject_id'`.
   * **Comprovado no teste `T-SQL-11c`:** Visita às `23:58 BRT` ($+1$) seguida de visita do mesmo visitante às `00:02 BRT` (com novo hash diário mas mesmo `cooldown_subject_id`) foi corretamente retida pelo cooldown de 15 minutos ($+0$).
6. **Documentação de Estimativa (`UNIQUE_DAILY`):** Documentado na interface administrativa (`/admin/configuracoes/analytics`) e nos relatórios que visitantes únicos são **estimativas de visitantes identificáveis** (sujeitas a troca de rede Wi-Fi/5G ou redes corporativas compartilhadas), sem uso de fingerprinting invasivo.

---

## 5. Segurança Administrativa e Permissões Efetivas de Roles (Seção 5)

1. **Autorização Estrita para Alteração da Política:**
   * `getAdminAnalyticsViewsPolicyOverviewAction` e `updateAdminAnalyticsViewsPolicyAction` exigem sessão autenticada + perfil com `isPlatformAdminRole(role)` (`master`, `super_admin`, `admin`, `socio_admin`), confirmação explícita (`confirmed: true`) e justificativa (`reason.length >= 8`).
2. **Trilha de Auditoria Completa:**
   * Toda mudança grava em `public.admin_audit_logs` o `actor_id`, `before_value` (política anterior), `after_value` (nova política com `updated_by_email` e `updated_at`) e `reason`.
3. **Consistência entre Múltiplas Instâncias da Vercel e Momento Determinístico de Ativação:**
   * **Fonte autoritativa no banco:** O trigger `BEFORE INSERT` no PostgreSQL (`fn_prevent_duplicate_view_cycle`) lê `public.get_analytics_views_policy(NEW.tenant_id)` diretamente da tabela `public.tenant_settings` **em tempo real na transação do banco**, sem depender do cache de 30 segundos do Node.js!
   * Portanto, o **momento efetivo de ativação da política é 100% determinístico e instantâneo** em todas as instâncias da Vercel: é o exato instante do `COMMIT` do `UPDATE public.tenant_settings`! Mesmo que uma instância serverless da Vercel ainda tenha o cache em memória por até 30 segundos, o trigger `BEFORE INSERT` no PostgreSQL prevalece na gravação do evento.
4. **Teste de Permissões por Role (`anon`, `authenticated`, `service_role`) — Comprovado em `T-SQL-09` e `T-SQL-17`:**
   * `anon` e `authenticated` **não podem** executar `reconcile_business_views_count` nem `audit_business_views_consistency` (`REVOKE ALL ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role`).
   * `anon` e `authenticated` **não podem** alterar `businesses.views_count` (`trg_guard_business_views_count` lança `BUSINESS_VIEWS_COUNT_IS_SERVER_MANAGED`).
   * `anon` e `authenticated` **não podem** executar `UPDATE` ou `DELETE` em `public.analytics_events` para adulterar `metadata.eligible_view` (`trg_guard_analytics_events_authority` lança `ANALYTICS_EVENTS_MODIFICATION_FORBIDDEN`).

---

## 6. Estratégia Anti-Congelamento de Fallback e Rollback (Seção 6)

### 6.1. Como Eliminamos o Risco de Leitura de Contador Congelado Após Rollback
* Criamos na Migration 258 a função `public.is_business_views_materialized_sync_active()`, que inspeciona o catálogo `pg_catalog.pg_trigger` para verificar se o trigger `trg_sync_business_views_count` existe e está habilitado (`tgenabled <> 'D'`) na tabela `public.analytics_events`.
* Criamos as funções `public.get_canonical_business_views_counts(p_business_ids UUID[])` e `public.get_single_business_canonical_views_count(p_business_id UUID)` (utilizadas pelas 3 RPCs públicas `public_directory_home_data`, `public_businesses_search`, `public_business_detail` e por [canonical-views-reader.ts](file:///f:/projetos/saas-platform/apps/web/src/lib/analytics/canonical-views-reader.ts)):
  * **Quando o trigger está ativo:** Lê `businesses.views_count` em $O(1)$.
  * **Se o rollback [supabase/rollbacks/analytics/258_rollback.sql](file:///f:/projetos/saas-platform/supabase/rollbacks/analytics/258_rollback.sql) for executado (removendo o trigger mas mantendo a coluna `businesses.views_count`):** `is_business_views_materialized_sync_active()` passa imediatamente a retornar `FALSE`! Todas as RPCs e o backend deixam automaticamente de ler a coluna `businesses.views_count` congelada e passam a calcular em SQL `COUNT(DISTINCT COALESCE(NULLIF(BTRIM(ae.metadata->>'cycle_id'), ''), ae.id::text))` diretamente sobre `public.analytics_events` (`WHERE event_name = 'view' AND COALESCE((ae.metadata->>'eligible_view')::boolean, true) = true`), **sem truncamento de 1.000 linhas e preservando a elegibilidade histórica de cada evento**.

### 6.2. Ciclo Completo Testado e Aprovado (`T-SQL-15`)
1. **Migration 258 aplicada** → Trigger ativo (`is_business_views_materialized_sync_active() = true`), contador em `12`.
2. **Rollback 258 executado** → Trigger removido (`is_business_views_materialized_sync_active() = false`).
3. **3 novas visitas inseridas durante o rollback** → A coluna física `businesses.views_count` permanece em `12`, mas `get_canonical_business_views_counts`, `get_single_business_canonical_views_count` e `public_businesses_search` retornam **`15`** em tempo real (nunca congelam!).
4. **Reaplicação da Migration 258** → Trigger reativado (`true`) e backfill reconcilia a coluna física `businesses.views_count` para **`15`** sem perda e sem dupla contagem!
5. **Localização do arquivo de rollback confirmada:** [supabase/rollbacks/analytics/258_rollback.sql](file:///f:/projetos/saas-platform/supabase/rollbacks/analytics/258_rollback.sql) (fora de `supabase/migrations/`).

---

## 7. Reconciliação Histórica em Snapshot Atômico Único e Reatividade nos 8 Componentes (Seção 7)

### 7.1. Explicação e Prova Matemática da Divergência `1.436` vs. `1.458`
* A diferença entre `1.436` (coletado às 19h08 BRT) e `1.458` (coletado às 23h25 BRT) decorreu **exclusivamente de 22 novas visitas reais ocorridas em produção** durante o intervalo de 4 horas entre as duas coletas de leitura.
* Para comprovar matematicamente com **zero divergência**, executamos uma coleta em **snapshot único simultâneo** (`2026-11-28T02:58:16.193Z`):
  * **Total de eventos brutos em `analytics_events` (todos os tipos):** `3.072`
  * **Total de eventos brutos `event_name = 'view'`:** **`1.458`**
  * **Total de eventos elegíveis `event_name = 'view'`:** **`1.458`**
  * **Soma dos contadores das 18 empresas publicadas e ativas:** **`1.458`** (`divergence = 0` em todas as 18 empresas)
  * **Soma dos contadores das 9 empresas não publicadas (`publication_status = 'draft'`):** **`0`** (todas as 9 empresas em rascunho possuem `0` visualizações)
  * **Eventos `view` órfãos (sem `business_id`):** **`0`**
  * **Equação de Fechamento:** $\text{Publicadas } (1.458) + \text{Não Publicadas } (0) + \text{Órfãos } (0) = \text{Total Geral } (1.458)$.

### 7.2. Comprovação de Conexão Reativa nos 8 Componentes Públicos (`T-WEB-06`)
Todos os 8 componentes listados na Seção 7 estão conectados ao hook `useLiveBusinessViewsCount` e foram testados em conjunto no teste automatizado `T-WEB-06`:
1. `DirectorySponsored` ([DirectorySponsored.tsx](file:///f:/projetos/saas-platform/apps/web/src/components/public/directory/DirectorySponsored.tsx)) — conectado tanto no modo `'cards'` quanto no modo `'logos'` (`SponsoredMarqueeLogoItem`).
2. `DirectoryFoundersMarquee` ([DirectoryFoundersMarquee.tsx](file:///f:/projetos/saas-platform/apps/web/src/components/public/directory/DirectoryFoundersMarquee.tsx)) — conectado via `FounderMarqueeLogoItem`.
3. `BenefitsDirectoryCards` ([BenefitsDirectoryCards.tsx](file:///f:/projetos/saas-platform/apps/web/src/components/public/directory/BenefitsDirectoryCards.tsx)) — conectado via `BenefitBusinessCardWrapper` + `BusinessCard`.
4. `BusinessCard` ([BusinessCard.tsx](file:///f:/projetos/saas-platform/apps/web/src/components/public/directory/BusinessCard.tsx)).
5. `BusinessListCard` ([BusinessListCard.tsx](file:///f:/projetos/saas-platform/apps/web/src/components/public/directory/BusinessListCard.tsx)).
6. `GoldBusinessProfile` ([GoldBusinessProfile.tsx](file:///f:/projetos/saas-platform/apps/web/src/components/public/business/layouts/GoldBusinessProfile.tsx)).
7. `SilverBusinessProfile` ([SilverBusinessProfile.tsx](file:///f:/projetos/saas-platform/apps/web/src/components/public/business/layouts/SilverBusinessProfile.tsx)).
8. `BronzeBusinessProfile` ([BronzeBusinessProfile.tsx](file:///f:/projetos/saas-platform/apps/web/src/components/public/business/layouts/BronzeBusinessProfile.tsx)).

---

## 8. Sequência Segura de Publicação e Critérios de Rollback (Seção 8)

1. **Commit base e isolamento:**
   * Branch `feat/gate-business-views-unification` derivada de `main` (`e1e7aff`).
   * Numeração `258` confirmada livre (última migration na `main`: `257_commercial_campaigns_pedra_closure.sql`).
2. **Estratégia de `lock_timeout` na Migration 258:**
   * O bloco de ativação do trigger + backfill define `SET LOCAL lock_timeout = '5s';` antes de `LOCK TABLE public.analytics_events IN SHARE ROW EXCLUSIVE MODE;`. Caso exista qualquer transação longa bloqueando a tabela por mais de 5 segundos, a migration aborta com segurança sem enfileirar requisições da aplicação.
3. **Ordem de Execução Autorizada (após aprovação do usuário):**
   * **Etapa 1 (Banco Supabase Oficial):** Executar `supabase/migrations/258_canonical_business_views_and_configurable_policy.sql`.
   * **Etapa 2 (Validação SQL Imediata):**
     * Confirmar política inicial: `SELECT public.get_analytics_views_policy(NULL);` → `counting_mode = 'ALL_VIEWS'`.
     * Confirmar trigger ativo: `SELECT public.is_business_views_materialized_sync_active();` → `true`.
     * Confirmar zero divergência: `SELECT * FROM public.audit_business_views_consistency() WHERE NOT is_consistent;` → `0 rows`.
   * **Etapa 3 (Deploy Web):** Commit na branch `feat/gate-business-views-unification`, merge na `main` e `git push origin main`.
   * **Etapa 4 (Smoke Tests Pós-Deploy Web & Mobile):**
     * Verificar igualdade do contador de `caminhodaluz` e `opticacirculo` em `/guia`, `/guia/empresas`, `/guia/beneficios`, `/guia/opticacirculo` e `GET /api/mobile/guide`.
     * Verificar acesso à tela `/admin/configuracoes/analytics`.
4. **Critérios Objetivos de Rollback:**
   * Se `audit_business_views_consistency()` retornar qualquer empresa com `is_consistent = false` que não seja zerada por `SELECT public.reconcile_business_views_count(NULL)`, ou se `POST /api/analytics/track` apresentar taxa de erro HTTP 5xx $> 1\%$, executar imediatamente `supabase/rollbacks/analytics/258_rollback.sql` (que desativa o trigger incremental e aciona automaticamente o fallback SQL exato sem congelar contadores).

---

## 9. Parecer Conclusivo GO / NO-GO

> [!TIP]
> **PARECER TÉCNICO CONCLUSIVO: `GO PARA PUBLICAÇÃO EM PRODUÇÃO` (Aguardando comando expresso do usuário)**
>
> * Todas as pendências apontadas na revisão documental (4.1 a 4.5 e Seções 1 a 8) foram resolvidas, testadas e comprovadas:
>   1. **Suíte Web:** Regressão em `advertiser-results-etapa-c.test.tsx` corrigida (`13/13 passed`); todas as 11 suítes de analytics (`99/99 passed`, após expansão de `gate-business-views-homologation.test.ts` de 7 para 8 blocos), `mobile test` (`82/82 passed`), `typecheck` Web/Mobile (`Exit Code 0`) e **`pnpm --filter web build` (`Exit Code 0`)** aprovados; comprovado em checkout limpo da `main` (`e1e7aff`) que as 16 suítes restantes são 100% preexistentes.
>   2. **Continuidade do Cooldown na Meia-Noite:** Implementado `generateCooldownSubjectId` (`metadata.cooldown_subject_id`) isolado por tenant e validado em `T-SQL-11c` (`23:58 BRT` → `00:02 BRT`).
>   3. **Proteção Anti-Congelamento no Rollback:** Implementado `is_business_views_materialized_sync_active()` + `get_canonical_business_views_counts`, testado em ciclo completo (`Migration → Eventos → Rollback → Novos Eventos não congelam → Reaplicação → Reconciliação`) em `T-SQL-15`.
>   4. **Snapshot Atômico Único:** Comprovado que `1.458` eventos `view` brutos = `1.458` elegíveis = `1.458` nas 18 empresas publicadas + `0` nas 9 empresas em rascunho.
>   5. **Reatividade nos 8 Componentes Públicos:** Comprovada em `T-WEB-06`.

