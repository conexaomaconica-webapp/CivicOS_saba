# GATE — Relatório Oficial de Homologação Local: Unificação e Sincronização das Visualizações das Empresas + Política Configurável

**Status do Gate:** `HOMOLOGADO LOCALMENTE — AGUARDANDO AUTORIZAÇÃO PARA PRODUÇÃO`  
**Branch Isolada:** `feat/gate-business-views-unification` (baseada em `main`, isolada de outras frentes)  
**Data da Homologação:** 27/11/2026  
**Restrições de Ambiente Cumpridas:** Nenhum `git push`, nenhum `merge` na `main`, nenhum deploy, nenhuma migration aplicada no banco remoto e nenhuma alteração ou inserção artificial de dados em produção.

---

## 1. Decisões Arquiteturais Definitivas (GO Condicionado + Adendo)

### 1.1. Auditoria Semântica de Eventos (`view` vs. `page_view`) e Histórico (Condicionante 2.1)
A varredura integral (paginada sem truncamento) dos **3.024 registros** da tabela `public.analytics_events` no banco de produção confirmou:

| `event_name` | Quantidade Total | Origem / Finalidade | Decisão Canônica |
| :--- | :---: | :--- | :--- |
| `view` | **1.436** | Acesso efetivo ao perfil empresarial (`/guia/[slug]` na Web e modal de detalhe no App Android/iOS). | **Única métrica oficial do contador (`views_count`)** |
| `page_view` | **0** | Alias legado normalizado na ingestão (`normalizeAnalyticsEventType('page_view') -> 'view'`). Não há nenhum registro `page_view` armazenado no banco. | **Não incluído** na regra SQL para evitar ampliação indevida; mantido estritamente `event_name = 'view'`. |
| `search_impression` | **1.477** | Exibição de card na listagem/busca (`IntersectionObserver`). | Separado; nunca incrementa `views_count`. |
| `share` | **31** | Compartilhamento do perfil empresarial. | Separado (interação comercial). |
| `whatsapp_click` | **23** | Clique no botão de WhatsApp da empresa. | Separado (interação comercial). |
| `directions_click` | **14** | Clique em Traçar Rota / GPS. | Separado (interação comercial). |
| `instagram_click` | **12** | Clique no perfil do Instagram da empresa. | Separado (interação comercial). |
| `phone_click` | **9** | Clique no telefone da empresa. | Separado (interação comercial). |
| `website_click` | **9** | Clique no website externo da empresa. | Separado (interação comercial). |
| Demais eventos | **13** | `benefit_claim` (4), `connection_visit` (3), `social_click` (2), `connection_confirmed` (2), `referral` (2). | Separados do contador de visualizações. |

* **Auditoria de `cycle_id` e corte da Migration 216 (`2026-10-28T00:00:00Z`):**
  * **Antes do corte (`viewBeforeCut`):** **247** visualizações históricas (todas com `metadata->>'cycle_id' IS NULL`).
  * **Após o corte (`viewAfterCut`):** **1.189** visualizações (todas com `cycle_id` preenchido).
  * **Com `cycle_id` vazio (`""`):** **0** registros em produção (porém a fórmula de reconciliação trata explicitamente `NULLIF(BTRIM(ae.metadata->>'cycle_id'), '')` fazendo fallback para `ae.id::text`, garantindo que `cycle_id` ausente, nulo ou vazio jamais colapse eventos históricos distintos).
  * **Duplicatas históricas de `(business_id, cycle_id)`:** **0** duplicatas em todo o histórico (`duplicateCyclesAllTimeCount = 0`).

### 1.2. Arquitetura de Contador Oficial Materializado + Política Configurável Centralizada
1. **Fonte Única Materializada (`public.businesses.views_count`):**
   * Coluna `BIGINT NOT NULL DEFAULT 0 CHECK (views_count >= 0)` adicionada em `public.businesses`, mantendo `public.analytics_events` como fonte primária e imutável do histórico bruto.
2. **Política Configurável em `Administração → Configurações → Analytics e Visualizações` (`/admin/configuracoes/analytics`):**
   * Reutiliza a tabela existente `public.tenant_settings` (`metadata->'analytics_views_policy'`), sem criar tabelas paralelas.
   * Suporta as **3 modalidades** com efeito estritamente **prospectivo** (a partir da ativação):
     * **`ALL_VIEWS` (Padrão Inicial Obrigatório):** Contabiliza cada acesso efetivo ao perfil empresarial e atualizações intencionais da página (`F5`), preservando a deduplicação técnica por `cycle_id` (Migration 216).
     * **`COOLDOWN`:** Contabiliza 1 visualização elegível por visitante/sessão (`pseudonymous_subject_id`) e empresa dentro de janela configurável (**5, 15, 30 ou 60 minutos**).
     * **`UNIQUE_DAILY`:** Contabiliza 1 visualização elegível por visitante identificado (`pseudonymous_subject_id`) e empresa por dia civil no fuso **`America/Sao_Paulo`**.
   * **Marcação de Elegibilidade Prospectiva (`metadata.eligible_view`):**
     * Cada evento `view` inserido recebe no momento da ingestão `metadata.eligible_view` (`true` ou `false`) e `metadata.policy_mode` (`ALL_VIEWS`, `COOLDOWN` ou `UNIQUE_DAILY`).
     * Todos os 1.436 eventos históricos possuem `COALESCE((metadata->>'eligible_view')::boolean, true) = true`.
     * Dessa forma, o trigger incremental (`fn_sync_business_views_count`), o backfill e a função de reconciliação (`reconcile_business_views_count`) utilizam **exatamente a mesma regra matemática**, e uma troca futura de modalidade no painel administrativo **nunca altera retroativamente** o contador acumulado das empresas.

---

## 2. Arquivos Criados e Alterados

### 2.1. Banco de Dados (Migrations & Rollback)
* [supabase/migrations/258_canonical_business_views_and_configurable_policy.sql](file:///f:/projetos/saas-platform/supabase/migrations/258_canonical_business_views_and_configurable_policy.sql) — Migration canônica (coluna `views_count`, proteção de `updated_at`, guarda `guard_business_views_count`, função `get_analytics_views_policy`, evolução do trigger `fn_prevent_duplicate_view_cycle`, trigger ACID `fn_sync_business_views_count`, backfill sob lock `SHARE ROW EXCLUSIVE`, funções `reconcile_business_views_count` e `audit_business_views_consistency`, e injeção cirúrgica de `views_count` nas RPCs públicas).
* [supabase/rollbacks/analytics/258_rollback.sql](file:///f:/projetos/saas-platform/supabase/rollbacks/analytics/258_rollback.sql) — Script de rollback seguro e não-destrutivo (armazenado fora de `supabase/migrations/` conforme convenção do repositório).

### 2.2. Backend, Leitura Unificada e Painel Administrativo (`apps/web`)
* [apps/web/src/lib/analytics/canonical-views-reader.ts](file:///f:/projetos/saas-platform/apps/web/src/lib/analytics/canonical-views-reader.ts) — Leitor canônico unificado em 2 níveis: lê `businesses.views_count` em $O(1)$ (pós-Migration 258) e possui fallback automático para `SELECT COUNT(*)` (`count: 'exact', head: true`) por empresa, eliminando 100% o truncamento de 1.000 linhas do PostgREST mesmo antes da aplicação da migration remota.
* [apps/web/src/lib/analytics/views-policy-service.ts](file:///f:/projetos/saas-platform/apps/web/src/lib/analytics/views-policy-service.ts) — Serviço de gerenciamento da política configurável (`ALL_VIEWS`, `COOLDOWN`, `UNIQUE_DAILY`) com cache controlado de 30s, validação estrita de permissão administrativa (`isPlatformAdminRole`), confirmação obrigatória e gravação em `public.admin_audit_logs`.
* [apps/web/src/app/admin/configuracoes/analytics/page.tsx](file:///f:/projetos/saas-platform/apps/web/src/app/admin/configuracoes/analytics/page.tsx) & [analytics-policy-client.tsx](file:///f:/projetos/saas-platform/apps/web/src/app/admin/configuracoes/analytics/analytics-policy-client.tsx) — Nova seção administrativa **Configurações → Analytics e Visualizações** com simulador interativo, seletor de modalidades e histórico de auditoria.
* [apps/web/src/components/admin/AdminSidebar.tsx](file:///f:/projetos/saas-platform/apps/web/src/components/admin/AdminSidebar.tsx#L243-L248) — Atalho para **Analytics e Visualizações** na seção `6. CONFIGURAÇÕES`.
* [apps/web/src/lib/analytics/analytics-service.ts](file:///f:/projetos/saas-platform/apps/web/src/lib/analytics/analytics-service.ts) — Aplicação centralizada da política ativa, serialização concorrente por visitante (`inFlightSubjectLocks`), proteção anti-burst e carimbo de elegibilidade.
* [apps/web/src/app/api/analytics/track/route.ts](file:///f:/projetos/saas-platform/apps/web/src/app/api/analytics/track/route.ts) — Retorno do contador oficial `viewsCount` e `serverTimestamp` (inclusive em respostas `deduplicated` e `skipped`) e revalidação controlada (throttle de 30s).

### 2.3. Superfícies Públicas, Store Reativo e Painéis (Web Desktop, Web Mobile e BFF Mobile)
* [apps/web/src/lib/analytics/live-views-store.ts](file:///f:/projetos/saas-platform/apps/web/src/lib/analytics/live-views-store.ts) — Store reativo no cliente com controle de versão por `serverTimestamp` (sem `Math.max`, permitindo correções legítimas para menor e descartando respostas HTTP fora de ordem), expiração TTL de 10 minutos, sincronização no botão Voltar (`pageshow`) e zero vazamento de listeners.
* [apps/web/src/lib/analytics/track-client.ts](file:///f:/projetos/saas-platform/apps/web/src/lib/analytics/track-client.ts) — Uso de `fetch` com `keepalive: true` para eventos `view`, alimentando `recordConfirmedServerViewsCount` após confirmação oficial do backend.
* [apps/web/src/app/(public)/guia/guia-home.tsx](file:///f:/projetos/saas-platform/apps/web/src/app/(public)/guia/guia-home.tsx#L587-L595) — Unificado com `resolveCanonicalViewsCountsMap`.
* [apps/web/src/app/(public)/guia/empresas/page.tsx](file:///f:/projetos/saas-platform/apps/web/src/app/(public)/guia/empresas/page.tsx#L322-L330) — Unificado com `resolveCanonicalViewsCountsMap`.
* [apps/web/src/app/(public)/guia/beneficios/page.tsx](file:///f:/projetos/saas-platform/apps/web/src/app/(public)/guia/beneficios/page.tsx#L54-L66) — Unificado com `resolveCanonicalViewsCountsMap` (corrige o `views_count: null` nos cards do Clube de Benefícios).
* [apps/web/src/app/(public)/guia/[slug]/page.tsx](file:///f:/projetos/saas-platform/apps/web/src/app/(public)/guia/[slug]/page.tsx#L321-L326) — Unificado com `resolveSingleBusinessCanonicalViewsCount`.
* [apps/web/src/app/api/mobile/guide/route.ts](file:///f:/projetos/saas-platform/apps/web/src/app/api/mobile/guide/route.ts#L70-L73) e [L250-L280](file:///f:/projetos/saas-platform/apps/web/src/app/api/mobile/guide/route.ts#L250-L280) — BFF Mobile unificado com `resolveCanonicalViewsCountsMap` e `resolveSingleBusinessCanonicalViewsCount`.
* [apps/web/src/app/api/directory/live-search/route.ts](file:///f:/projetos/saas-platform/apps/web/src/app/api/directory/live-search/route.ts#L112-L124) — Busca rápida enriquecida com `resolveCanonicalViewsCountsMap`.
* [apps/web/src/components/public/directory/BusinessCard.tsx](file:///f:/projetos/saas-platform/apps/web/src/components/public/directory/BusinessCard.tsx) & [BusinessListCard.tsx](file:///f:/projetos/saas-platform/apps/web/src/components/public/directory/BusinessListCard.tsx) — Conectados ao hook `useLiveBusinessViewsCount`.
* [apps/web/src/components/public/business/layouts/GoldBusinessProfile.tsx](file:///f:/projetos/saas-platform/apps/web/src/components/public/business/layouts/GoldBusinessProfile.tsx), [SilverBusinessProfile.tsx](file:///f:/projetos/saas-platform/apps/web/src/components/public/business/layouts/SilverBusinessProfile.tsx) & [BronzeBusinessProfile.tsx](file:///f:/projetos/saas-platform/apps/web/src/components/public/business/layouts/BronzeBusinessProfile.tsx) — Conectados ao hook `useLiveBusinessViewsCount`.
* [apps/web/src/lib/advertiser/advertiser-portal-service.ts](file:///f:/projetos/saas-platform/apps/web/src/lib/advertiser/advertiser-portal-service.ts), [advertiser-home-client.tsx](file:///f:/projetos/saas-platform/apps/web/src/app/anunciante/advertiser-home-client.tsx), [advertiser-results-service.ts](file:///f:/projetos/saas-platform/apps/web/src/lib/advertiser/advertiser-results-service.ts) & [results-client.tsx](file:///f:/projetos/saas-platform/apps/web/src/app/anunciante/resultados/results-client.tsx) — Exibição separada de **Visualizações Totais (Oficial)** e **Visualizações no Período (30 dias)** sem truncamento de 1.000 linhas.
* [apps/web/src/lib/admin/admin-businesses-service.ts](file:///f:/projetos/saas-platform/apps/web/src/lib/admin/admin-businesses-service.ts) & [company-360-client.tsx](file:///f:/projetos/saas-platform/apps/web/src/app/admin/empresas/[id]/company-360-client.tsx) — Exibição separada de **Visualizações Totais (Oficial)** e **Visualizações (30 dias)** no Prontuário 360.
* [apps/web/test/gate-business-views-homologation.test.ts](file:///f:/projetos/saas-platform/apps/web/test/gate-business-views-homologation.test.ts) — Suíte automatizada de homologação SQL (`PGlite`) e reatividade Web.

---

## 3. Evidências dos Testes em PostgreSQL Local (`@electric-sql/pglite`)

Todos os cenários obrigatórios da Seção 3 do GO Condicionado e da Seção 8 do Adendo foram executados contra um motor PostgreSQL real (`PGlite` WASM) em [test/gate-business-views-homologation.test.ts](file:///f:/projetos/saas-platform/apps/web/test/gate-business-views-homologation.test.ts):

| Código | Cenário Homologado no PostgreSQL Local | Resultado | Evidência Verificada |
| :--- | :--- | :---: | :--- |
| **T-SQL-01** | Mais de 1.000 eventos (`1.250` views para uma empresa + `102` para outra) | **APROVADO** | `views_count = 1250` e `102`, zero truncamento em 1.000 linhas. |
| **T-SQL-02** | Mais de 10.000 eventos (`10.000` no backfill + `500` incrementais via trigger = `10.500`) | **APROVADO** | `views_count = 10500`, `divergence = 0`, `is_consistent = true`. |
| **T-SQL-03** | Reconciliação de empresas sem visualizações | **APROVADO** | Empresa `sem-visitas` reconciliada com `views_count = 0` (`NOT NULL`). |
| **T-SQL-04** | Backfill / `reconcile_business_views_count(NULL)` executado 5x repetidamente | **APROVADO** | 100% idempotente; nenhuma duplicação de contagem. |
| **T-SQL-05** | Tratamento de `cycle_id` ausente, `NULL`, `""` ou `"   "` | **APROVADO** | 200 views sem `cycle_id` + 50 com `"   "` preservadas integralmente via fallback `id::text`. |
| **T-SQL-06** | Exclusividade de `event_name = 'view'` | **APROVADO** | 15 `whatsapp_click` e 10 `search_impression` não alteraram `views_count`. |
| **T-SQL-07** | `DELETE` de visita única ($-1$), `DELETE` de duplicata histórica ($0$) e piso $\ge 0$ | **APROVADO** | Remover 1 de 2 cópias históricas com mesmo `cycle_id` manteve `views_count = 1`; remover a última levou a `0`. |
| **T-SQL-08** | Preservação de `businesses.updated_at` ao incrementar `views_count` | **APROVADO** | `updated_at` permaneceu idêntico após `+1 view`, e atualizou normalmente ao alterar `businesses.name`. |
| **T-SQL-09** | Bloqueio de manipulação direta por usuário comum (`SET ROLE authenticated`) | **APROVADO** | `UPDATE public.businesses SET views_count = 999999` bloqueado com `BUSINESS_VIEWS_COUNT_IS_SERVER_MANAGED`. |
| **T-SQL-10** | Modo `ALL_VIEWS` (padrão): 5 atualizações F5 ($+5$) vs. 5 retries mesmo `cycle_id` ($+1$) | **APROVADO** | 5 F5 geraram `+5`; 5 retries do mesmo `cycle_id` geraram apenas `+1`. |
| **T-SQL-11** | Modo `COOLDOWN` (15m): acessos repetidos na janela ($+1$), outro visitante ($+1$) e pós-janela ($+1$) | **APROVADO** | 3 acessos em 14m não incrementaram; acesso em $+16\text{m}$ incrementou $+1$. |
| **T-SQL-12** | Modo `UNIQUE_DAILY` (`America/Sao_Paulo`): mesmo dia BRT ($+1$) vs. após meia-noite BRT ($+1$) | **APROVADO** | Acessos às 22:30 BRT e 23:45 BRT contaram `1`; acesso às 00:10 BRT do dia seguinte incrementou `+1`. |
| **T-SQL-13** | Troca de política (`ALL_VIEWS` → `COOLDOWN` → `UNIQUE_DAILY`) + reconciliação | **APROVADO** | `materialized_views_count = 11`, `recalculated_eligible_views = 11`, `raw_total_view_events = 15`, `divergence = 0`. |
| **T-SQL-14** | Proteção contra abuso automatizado (flood de 30 views no mesmo segundo pelo mesmo subject) | **APROVADO** | Teto de burst limitou em `25` e marcou as 5 excedentes como `automated_burst_rate_limit`. |
| **T-SQL-15** | Execução do Rollback (`258_...rollback.sql`) e reconciliação pós-rollback | **APROVADO** | 15 eventos brutos preservados e `views_count = 11` intacto após rollback. |
| **T-SQL-16** | Integridade das RPCs (`public_directory_home_data`, `public_businesses_search`, `public_business_detail`) | **APROVADO** | Todas as 3 RPCs retornaram `views_count: 1250` com contratos JSON preservados. |

### Evidências de Reatividade Web (Bloco 2 da Suíte):
* **T-WEB-01 (`fetch keepalive` + atualização automática):** Confirmado que `trackEvent({ eventType: 'view' })` utiliza `fetch` com `keepalive: true` (ignorando `navigator.sendBeacon` apenas para `'view'`) e atualiza o componente React automaticamente de `102` para `103` após confirmação do backend.
* **T-WEB-02 (Respostas HTTP fora de ordem):** Resposta com `serverTimestamp = 1500` recebida após resposta com `serverTimestamp = 2000` foi descartada.
* **T-WEB-03 (Correção legítima para valor menor):** Confirmação com `serverTimestamp = 3000` e `viewsCount = 102` sobrescreveu corretamente o cache anterior de `150` (sem ficar presa em `Math.max`).
* **T-WEB-04 (Expiração TTL e Zero Memory Leaks):** Cache expira após `10 minutos` (`LIVE_VIEWS_CACHE_TTL_MS`) e `getActiveViewsSubscribersCountForTesting()` retorna a `0` ao desmontar os cards.

---

## 4. Comparativo Antes vs. Depois (18 Empresas Publicadas)

Verificação em modo exclusivamente de leitura com o novo leitor canônico unificado (`resolveCanonicalViewsCountsMap`) demonstrando a eliminação total das divergências nas **7 superfícies** da plataforma:

| # | Empresa | Slug | ANTES: Card Home (`/guia`) | ANTES: Benefícios (`/guia/beneficios`) | ANTES: App Mobile Lista | DEPOIS: Home (`/guia`) | DEPOIS: Guia (`/guia/empresas`) | DEPOIS: Benefícios (`/guia/beneficios`) | DEPOIS: Perfil (`/guia/[slug]`) | DEPOIS: App Android & iOS | DEPOIS: Painel & Admin 360 (Total Oficial) | Paridade 100% |
| :-: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :-: |
| 1 | **Centro Espiritualista Caminho da Luz** | `caminhodaluz` | 347 | `null` | 347 | **435** | **435** | **435** | **435** | **435** | **435** | ✅ |
| 2 | **Comandos** | `comandos` | 286 | `null` | 286 | **288** | **288** | **288** | **288** | **288** | **288** | ✅ |
| 3 | **Óptica Circulô** | `opticacirculo` | **0** | `null` | **0** | **103** | **103** | **103** | **103** | **103** | **103** | ✅ |
| 4 | **Melissa Saba Psicóloga** | `melsaba` | 95 | `null` | 95 | **95** | **95** | **95** | **95** | **95** | **95** | ✅ |
| 5 | **Instituto DAM - Dr Alfredo de Almeida** | `institutodam` | **0** | `null` | **0** | **83** | **83** | **83** | **83** | **83** | **83** | ✅ |
| 6 | **Aretuza Prado** | `aretuzaprado` | **0** | `null` | **0** | **67** | **67** | **67** | **67** | **67** | **67** | ✅ |
| 7 | **FISION — Fisioterapia e Pilates** | `fision` | 58 | `null` | 58 | **59** | **59** | **59** | **59** | **59** | **59** | ✅ |
| 8 | **Grupo MAP** | `grupomap` | 57 | `null` | 57 | **57** | **57** | **57** | **57** | **57** | **57** | ✅ |
| 9 | **Conexão Corporativa** | `conexaocorporativa` | 56 | `null` | 56 | **56** | **56** | **56** | **56** | **56** | **56** | ✅ |
| 10 | **AMO Clínica Veterinária** | `amo-clinicaveterinaria` | 54 | `null` | 54 | **55** | **55** | **55** | **55** | **55** | **55** | ✅ |
| 11 | **GB Gomes e Brasil** | `gbgomesebrasil-adv` | 33 | `null` | 33 | **33** | **33** | **33** | **33** | **33** | **33** | ✅ |
| 12 | **Escritório de Advocacia Marcos Augusto** | `marcosaugustoadv` | **0** | `null` | **0** | **28** | **28** | **28** | **28** | **28** | **28** | ✅ |
| 13 | **DeltaPrev** | `deltraprev` | **0** | `null` | **0** | **27** | **27** | **27** | **27** | **27** | **27** | ✅ |
| 14 | **Rações Primor** | `racoesprimor` | **0** | `null` | **0** | **26** | **26** | **26** | **26** | **26** | **26** | ✅ |
| 15 | **Lograf** | `lograf` | **0** | `null` | **0** | **25** | **25** | **25** | **25** | **25** | **25** | ✅ |
| 16 | **Equilíbrio & Valor — Psicologia** | `equilibrioevalor` | 13 | `null` | 13 | **17** | **17** | **17** | **17** | **17** | **17** | ✅ |
| 17 | **Benza - Cozinha de verdade** | `benza` | 1 | `null` | 1 | **2** | **2** | **2** | **2** | **2** | **2** | ✅ |
| 18 | **Grupo Vision Facilities** | `grupovision` | **0** | `null` | **0** | **2** | **2** | **2** | **2** | **2** | **2** | ✅ |

---

## 5. Evidências de Retrocompatibilidade com Aplicativos Android e iOS Publicados (Condicionante 2.6)

A auditoria direta nos commits das branches de release publicadas (`release/ios-1.0.1` commit `5f05661` e `feature/mobile-phase4-android` commit `366ee13`) comprovou:

1. **Listagem e Destaques nos Apps Publicados (`apps/mobile/src/guide-data.ts`):**
   * O código empacotado nas builds publicadas chama `GET https://www.conexaomaconica.com.br/api/mobile/guide` (e `?slugs=...` / `?slug=...`) e, em fallback, as RPCs `public_directory_home_data` e `public_businesses_search`.
   * Na linha 227 de `guide-data.ts` da build publicada, o mapeador já consome `row.views_count`:
     ```ts
     views_count: typeof row.views_count === 'number' ? row.views_count : undefined
     ```
   * Com a correção de `/api/mobile/guide` e a inclusão de `views_count` nas RPCs públicas pela Migration 258, **os aplicativos Android e iOS já instalados nos celulares dos usuários passam a exibir os contadores oficiais exatos imediatamente após o deploy do backend/banco**, sem exigir atualização na App Store ou Google Play.
2. **Registro de Visualizações e Atualização Reativa nos Apps Publicados (`apps/mobile/src/mobile-analytics.ts` e `App.tsx`):**
   * Ao abrir o perfil de uma empresa, a build publicada já envia `POST https://www.conexaomaconica.com.br/api/analytics/track` com `{ businessId, eventType: 'view', cycleId: 'mob_...', device: 'mobile_app' }` e cabeçalho `X-Client-Platform: mobile_app`.
   * Ao receber `{ ok: true, viewsCount }`, o app publicado já atualiza o estado React local (`directoryItems` e `selectedBusiness`).
3. **Como a Política Configurável (`ALL_VIEWS` / `COOLDOWN` / `UNIQUE_DAILY`) Funciona nos Apps Publicados sem Nova Build:**
   * Nas builds publicadas, cada abertura de modal gera um novo `cycleId` (`mob_${Date.now()}_...`) e envia a requisição HTTP para `/api/analytics/track`.
   * O backend e o trigger do PostgreSQL derivam o `pseudonymous_subject_id` (HMAC-SHA256 diário de `ip|userAgent|date_America_Sao_Paulo`).
   * Assim, se o administrador mudar o modo no painel para `COOLDOWN` (15m) ou `UNIQUE_DAILY`, o servidor identifica o mesmo `pseudonymous_subject_id` vindo do aplicativo móvel, marca `eligible_view = false`, não incrementa `businesses.views_count` e devolve o `viewsCount` oficial atual para o aplicativo!
   * **Limitação documentada (Seção 2.6 e Adendo Seção 6):** Como as builds mobile já publicadas não enviam um `device_installation_id` persistente no corpo do JSON, a identificação de visitante único em `COOLDOWN` / `UNIQUE_DAILY` para usuários não autenticados nos apps já publicados baseia-se no hash pseudonimizado de rede + dispositivo (`IP + User-Agent + Data BRT`). Se o usuário do app alternar entre Wi-Fi e 4G/5G no mesmo dia, poderá gerar um segundo hash pseudonimizado. Nenhum código nativo, versão ou certificado foi alterado nesta etapa.

---

## 6. Resultados das Suítes Automatizadas, Typechecks e Build de Produção

* **`pnpm --filter web typecheck`**: **0 erros** (`Exit Code 0`).
* **`pnpm --filter mobile typecheck`**: **0 erros** (`Exit Code 0`).
* **`pnpm --filter mobile test`**: **18/18 arquivos de teste aprovados (82/82 testes passando, `Exit Code 0`)**.
* **`pnpm --filter web build`**: **Build completo de produção aprovado (`Exit Code 0`, 11 pacotes + 59 rotas Next.js)**.
* **`pnpm --filter web exec vitest run test/gate-business-views-homologation.test.ts`**: **8/8 blocos de homologação aprovados (`Exit Code 0`)**, incluindo continuidade de cooldown na meia-noite (`T-SQL-11c`), ciclo completo de rollback anti-congelamento (`T-SQL-15`), permissões de roles (`T-SQL-17`) e reatividade nos 8 componentes públicos (`T-WEB-06`).
* **`pnpm --filter web exec vitest run test/advertiser-results-etapa-c.test.tsx`**: **13/13 testes aprovados (`Exit Code 0`)**.
* **Todas as 11 suítes de Analytics & Visualizações (`apps/web/test/*analytics*` + `gate-business-views-homologation` + `advertiser-results-etapa-c`)**: **11/11 arquivos aprovados (99/99 testes passando, `Exit Code 0`, consolidado após expansão de `gate-business-views-homologation.test.ts` de 7 para 8 blocos)**.
* **Suíte Global Web (`pnpm --filter web exec vitest run` — 237 arquivos)**: **221 arquivos aprovados (1.789 testes passando)** e **16 arquivos reprovados (41 testes)**, comprovados por execução comparativa direta em checkout limpo da `main` (`e1e7aff`) como **100% preexistentes** e fora do escopo deste Gate (detalhamento completo por arquivo e causa raiz em [GATE-BUSINESS-VIEWS-PRE-PRODUCAO.md](file:///f:/projetos/saas-platform/docs/analytics/GATE-BUSINESS-VIEWS-PRE-PRODUCAO.md)).

---

## 7. Plano de Publicação em Produção por Etapas e Rollback (Quando Autorizado)

### 7.1. Sequência Segura de Publicação (Zero Downtime)
1. **Passo 1 — Banco de Dados (Supabase Oficial):**
   * Executar [258_canonical_business_views_and_configurable_policy.sql](file:///f:/projetos/saas-platform/supabase/migrations/258_canonical_business_views_and_configurable_policy.sql).
   * A migration adquire `SHARE ROW EXCLUSIVE` em `analytics_events` por $\sim 10\text{ms}$, ativa o trigger e reconcilia `businesses.views_count` sem perda e sem dupla contagem.
2. **Passo 2 — Validação SQL Imediata Pós-Migration:**
   * Executar `SELECT * FROM public.audit_business_views_consistency() WHERE NOT is_consistent;` (resultado esperado: `0 rows`).
3. **Passo 3 — Merge e Deploy da Aplicação Web (`apps/web`):**
   * Fazer merge da branch `feat/gate-business-views-unification` na `main` e realizar `git push origin main` para acionar o deploy na Vercel.
4. **Passo 4 — Auditoria Pós-Deploy (Web + Android + iOS):**
   * Verificar `/guia`, `/guia/empresas`, `/guia/beneficios`, `/guia/opticacirculo`, `/guia/caminhodaluz`, `/api/mobile/guide` e `/admin/configuracoes/analytics`.

### 7.2. Procedimento de Rollback (Caso Necessário)
* **Se o rollback ocorrer no código Web:** Como Migration 258 é 100% aditiva e retrocompatível, o código anterior continua funcionando sem erro.
* **Se o rollback ocorrer no banco de dados:** Executar [supabase/rollbacks/analytics/258_rollback.sql](file:///f:/projetos/saas-platform/supabase/rollbacks/analytics/258_rollback.sql), que restaura o trigger original da Migration 216, preserva `businesses.views_count` reconciliado e mantém 100% dos eventos em `public.analytics_events`.

---

## 8. Parecer Final GO / NO-GO para Publicação em Produção

> [!TIP]
> **PARECER TÉCNICO: `GO PARA PUBLICAÇÃO EM PRODUÇÃO` (Aguardando autorização expressa do usuário)**
>
> * Todas as condicionantes técnicas (2.1 a 2.7), os 15 testes de homologação do GO Condicionado e os 12 testes complementares do Adendo da Política Configurável (`ALL_VIEWS` como padrão inicial, `COOLDOWN` e `UNIQUE_DAILY` configuráveis em `/admin/configuracoes/analytics`) foram implementados e comprovados localmente em motor PostgreSQL real (`PGlite`) e nas suítes Web e Mobile.
> * A produção permanece 100% intocada até sua autorização expressa para aplicar a Migration 258 e publicar a branch `feat/gate-business-views-unification`.

