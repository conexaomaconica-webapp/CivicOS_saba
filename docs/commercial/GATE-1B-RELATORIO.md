# Módulo Comercial Nacional — Gate 1B: Permissões, RLS, Storage privado e Área do Representante

**Branch:** `feature/commercial-module` · **Escopo:** somente Gate 1B. Nada foi aplicado em banco remoto. O Gate 1C (cadastro de representantes, leads, links) **não** foi iniciado.
**Parecer:** **GO parcial** — aprovado para revisão e homologação local; **NO-GO** para aplicar em produção até os testes reais de RLS (pgTAP, Docker) e a revisão do plano de aplicação. Ver seção 7.

## Decisões aprovadas (aplicadas)
1. **Administrador da plataforma NÃO entra automaticamente.** O acesso comercial vem só de `commercial_access_grants`. Única exceção: `master` (recuperação), inclusive com o módulo desligado. `finance`, `admin`, `platform_admin` e demais papéis **sem grant não veem nada**.
2. **Representante suspenso ou desligado mantém leitura do histórico financeiro** (atribuições, créditos, liberações, repasses), sem acesso a leads, evidências e documentos.
3. **Representante é vinculado ao usuário existente** (`commercial_representatives.user_id`): o mesmo login pode ser anunciante e representante; `profiles.role` é irrelevante para o módulo.

---

## 1. Inventário

| Item | Arquivo |
|---|---|
| Funções de autorização + relaxa "operação exige captura" | `supabase/migrations/234_commercial_authorization.sql` |
| RLS por papel (somente `SELECT`) + concessões por coluna | `235_commercial_rls_policies.sql` |
| Policy de leitura do bucket privado `commercial-documents` | `236_commercial_storage_policies.sql` |
| Auditoria (falha a migration se houver escrita direta, coluna sensível exposta ou tabela sem política) | `237_commercial_authorization_audit.sql` |
| Rollbacks (fora de `migrations/`) | `supabase/rollbacks/commercial/234|235|236_rollback.sql` |
| Regras puras, chave do módulo e autenticação no servidor | `apps/web/src/lib/commercial/{access-rules,feature-flag,commercial-auth}.ts` |
| Área do representante | `apps/web/src/app/representante/{layout,page}.tsx`, `comissoes/page.tsx` |
| Middleware (404 sem módulo; login obrigatório) e noindex | `apps/web/src/middleware.ts`, `lib/seo/noindex-paths.ts` |
| Testes | `scripts/test-migration-234-237-commercial-authz.mjs` (`pnpm test:commercial-authz`), `apps/web/test/commercial-access-rules.test.ts`, `commercial-authz.static.test.ts` |

**Alteração em código existente:** apenas o middleware (um desvio de 404 antes da autenticação e a inclusão de `/representante` na lista de rotas com login obrigatório) e `noindex-paths.ts`. Nenhum fluxo de Asaas, checkout, onboarding ou pagamento foi tocado.

## 2. Modelo de autorização

Três camadas, todas independentes:
1. **Aplicação:** `FEATURE_COMMERCIAL_MODULE_ENABLED=true` (padrão desligado). Desligada → `/representante` responde 404, sem redirecionar ao login.
2. **Banco (módulo):** `commercial_settings.module_enabled = true` para o tenant. Desligado → nenhuma política concede acesso (exceto `master`).
3. **Banco (identidade):** perfil ativo + vínculo do usuário (representante) ou grant específico (staff). Tenant da **linha** é verificado (não depende de claim no JWT).

Escopos do representante: `self` (qualquer status), `operational` (somente ativo), `financial` (ativo, suspenso, desligado).

| Dado | Representante | Staff (permissão) |
|---|---|---|
| Cadastro próprio (colunas seguras) | qualquer status | `representatives.read` |
| Leads, atividades, evidências | **ativo** | `leads.manage` |
| Documentos (tabela e bucket) | **ativo** | `documents.read` |
| Atribuições | ativo/suspenso/desligado | `attributions.manage` |
| Créditos, liberações, repasses, itens, saldo | ativo/suspenso/desligado | `commissions.read` (repasses também `payouts.manage`) |
| Regras de comissão | — | `rules.manage` / `rules.approve` |
| Eventos financeiros | — | `commissions.read` ou `audit.read` |
| Falhas de captura | — | `audit.read` |
| Fechamento | — | `commissions.read` |
| Configuração | — | `settings.manage` |
| Grants | os próprios | `settings.manage` |

`manage`/`approve` implicam leitura do mesmo domínio. **Escrita:** nenhuma para `authenticated` — todas as escritas passam por serviços de backend com chave de serviço, depois de `assertCommercialPermission(...)` (padrão do projeto; os serviços entram no Gate 1C).
**Colunas inacessíveis ao usuário:** `document_hash`, `document_encrypted`, `pix_key_encrypted`, `tax_profile`, `created_by`.
**Bucket:** `{tenant}/{representante}/{arquivo}`; leitura só do dono ativo ou de quem tem `documents.read`; upload/remoção só pelo servidor (URL assinada).

## 3. Como criar um representante (provisório, até o Gate 1C)

Não há tela no admin ainda. Para **testar** o 1B (somente depois de aplicar as migrations e ligar a chave na Vercel), use o SQL Editor, com um usuário de teste **já cadastrado**:

```sql
-- 1) identifique tenant e usuário
SELECT id AS tenant_id, slug FROM public.tenants;
SELECT id AS user_id, email FROM auth.users WHERE email = 'EMAIL_DO_USUARIO_DE_TESTE';

-- 2) liga o módulo no tenant (a CAPTURA financeira permanece desligada)
INSERT INTO public.commercial_settings (tenant_id, module_enabled)
VALUES ('<TENANT_ID>', true)
ON CONFLICT (tenant_id) DO UPDATE SET module_enabled = true;

-- 3) cria o representante de teste (ativo)
INSERT INTO public.commercial_representatives
  (tenant_id, user_id, person_type, legal_name, email, referral_code, status,
   contract_accepted_at, document_hash, document_last4)
VALUES ('<TENANT_ID>', '<USER_ID>', 'pf', 'Representante Teste', 'EMAIL_DO_USUARIO_DE_TESTE',
        'REP-TESTE01', 'active', now(), 'teste-' || gen_random_uuid(), '0000');

-- 4) (opcional) permissão de staff para outro usuário de teste
INSERT INTO public.commercial_access_grants (tenant_id, user_id, permission)
VALUES ('<TENANT_ID>', '<OUTRO_USER_ID>', 'commissions.read');
```

Para simular os outros status, altere `status` (`invited`, `pending_review`, `suspended`, `terminated`) — para `terminated` informe também `terminated_at = now()`.

**Desfazer:**
```sql
DELETE FROM public.commercial_access_grants WHERE note IS NULL AND user_id = '<OUTRO_USER_ID>';
DELETE FROM public.commercial_representatives WHERE referral_code = 'REP-TESTE01';
UPDATE public.commercial_settings SET module_enabled = false WHERE tenant_id = '<TENANT_ID>';
```
No Gate 1C o cadastro e o convite passam a ser feitos pelo admin (convite por e-mail vinculando ao usuário).

## 4. Testes executados

| Suíte | Resultado |
|---|---|
| `pnpm test:commercial-authz` (PostgreSQL real, 30 verificações de isolamento) | **30 / 30** |
| `pnpm test:commercial-db` (Gate 1A, regressão) | **71 / 71** |
| Vitest: regras, rotas, estáticos 1A + 1B (25) | **25 / 25** |
| `pnpm --filter web typecheck` e `pnpm --filter web build` | passam (`/representante` e `/representante/comissoes` compilam) |

Cobertura do banco (por que confiar): anon sem acesso; usuário sem vínculo vê 0 linhas em todas as tabelas; isolamento A × B (dados operacionais e financeiros, cadastro, saldo); convidado/em análise só o cadastro; suspenso/desligado só histórico financeiro; perfil inativo sem acesso; staff com `commissions.read` não lê leads/documentos/regras/configuração (vê só o **próprio** grant); `documents.read` não lê comissões; admin/platform_admin/finance sem grant: 0; grant revogado/expirado: 0; `master` acessa até com módulo desligado; usuário anunciante + representante + staff acessa as duas frentes; mesmo usuário em dois tenants; módulo desligado no tenant; **nenhuma escrita direta** em nenhuma das 16 tabelas; colunas sensíveis negadas; bucket (leitura própria/staff, malformado não vaza, sem gravação); auditoria 237 reprova escrita indevida e coluna exposta; rollbacks.

## 5. Impacto sobre o sistema existente
- Mudança funcional só no **middleware** (desvio 404 antes de tudo; login obrigatório para `/representante`). Com a chave desligada, `/representante` retorna 404 — é uma rota nova, sem usuários.
- Banco: apenas objetos `commercial_*`, funções `commercial_*`/`has_commercial_permission` e **uma policy** em `storage.objects` restrita ao bucket `commercial-documents` (não afeta os demais buckets).
- A relaxação do requisito "operação exige captura" é intencional: permite testar a área sem capturar nenhum pagamento (nenhum trigger passa a gravar eventos).
- Dependência: `public.has_global_platform_role(text)` (existe desde as migrations 005/006).
- **Paridade multiplataforma (AGENTS §8):** `/representante` é portal web de gestão, como `/anunciante`; o app Android/iOS **não** tem área equivalente de anunciante, e esta área não foi replicada no mobile. Nenhuma alteração em `apps/mobile`.

## 6. Roteiro de teste manual (após aplicar e ligar a chave)
Use usuários de teste. Resultado esperado entre parênteses.
1. Chave **desligada** na Vercel: abrir `/representante` logado e deslogado (**404** nos dois casos).
2. Ligar `FEATURE_COMMERCIAL_MODULE_ENABLED=true` + redeploy e `module_enabled` do tenant. Deslogado em `/representante` (**vai ao login**).
3. Logado **sem** ser representante (**404**).
4. Representante **ativo** (**vê Resumo e Comissões**; valores R$ 0,00 — ainda não há comissões; cartão "Indicações e documentos" com aviso de próxima etapa).
5. Status `pending_review`/`invited` (**faixa "cadastro em análise"**, sem o cartão de indicações; `/representante/comissoes` → 404).
6. Status `suspended`/`terminated` (**faixa de acesso somente leitura**; `/representante/comissoes` abre).
7. Dois representantes (A e B): cada um vê só o próprio nome/e-mail/código.
8. Um usuário que é **anunciante e representante**: abre `/anunciante` e `/representante`.
9. Link direto de um arquivo do bucket `commercial-documents` (**não abre** sem URL assinada).
10. Desligar `module_enabled` do tenant (**404 também para o representante ativo**).

## 7. Riscos, limitações e GO/NO-GO
**Limitações:**
1. **Docker/pgTAP indisponíveis:** a RLS foi validada em PostgreSQL real (PGlite) com `auth.uid()` simulado, **não** com JWT/PostgREST/GoTrue reais e a RLS verdadeira de `storage.objects`. Homologação completa exige pgTAP (Docker) ou um ambiente de testes do Supabase.
2. O `tenant` do representante vem de `resolveTenantIdServer()` (domínio verificado); em domínio sem tenant a área responde 404.
3. Não há interface do admin para conceder permissões comerciais nem convidar representantes (Gate 1C): hoje, por SQL.
4. Leituras via PostgREST dependem de `NOTIFY pgrst, 'reload schema'` (incluído); a lista de colunas de `commercial_representatives` deve ser sempre explícita (`select *` é negado de propósito).
5. Estorno/chargeback no Asaas continuam do Gate 1D.

| Decisão | Parecer |
|---|---|
| Revisão técnica do modelo de autorização | **GO** |
| Homologação local (PGlite + estático + build) | **GO — concluída** |
| Aplicação em produção das migrations 234–237 | **NO-GO** até pgTAP/RLS real ou ambiente de teste, e plano de aplicação aprovado |
| Gate 1C | **Aguardando aprovação expressa** |

### Como reproduzir
```bash
pnpm test:commercial-authz
pnpm test:commercial-db
pnpm --filter web exec vitest run test/commercial-access-rules.test.ts test/commercial-authz.static.test.ts test/commercial-migrations.static.test.ts
pnpm --filter web typecheck && pnpm --filter web build
```
