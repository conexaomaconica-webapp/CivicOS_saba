# Auditoria de Segurança Supabase — P0-B

> **Status:** catálogo recebido e análise preliminar concluída; testes comportamentais e revisão de corpos de funções ainda pendentes.  
> **Data:** 14/10/2026.  
> **Projeto confirmado:** `rwvztwsjcjljphqttiws` — produção.  
> **Escopo:** metadados, políticas, grants, views, funções e configuração de autenticação.  
> **Restrições:** nenhuma alteração, consulta de dados pessoais ou teste adversarial em produção.

## 1. Resultado executivo

A identidade do projeto foi confirmada e o catálogo efetivo foi parcialmente coletado. A auditoria ainda **não aprova a segurança da produção**, pois faltam testes comportamentais e revisão dos corpos das funções privilegiadas.

O catálogo remoto recebido contém relações, policies, grants, views, funções, roles, memberships e Storage. O banco é multi-tenant, enquanto o aplicativo mobile usa somente o tenant canônico da Conexão Maçônica. O catálogo comprova configuração, mas não substitui testes comportamentais nem revisão dos corpos das funções privilegiadas.

### Evidência pós-homologação da Fase 1

Os exports posteriores à execução mostram que a policy global `Allow authenticated read profiles` não está mais presente. `profiles` continua com `relrowsecurity = true`, e a policy remanescente limita linhas ao próprio usuário, administradores do tenant e escopo `master`. Isso indica contenção de leitura entre linhas, mas ainda não é aprovação de segurança.

O grant de `SELECT` em `public.profiles` continua listado para `authenticated`. Assim, usuários que já podem ler uma linha ainda podem selecionar todas as colunas dessa linha, incluindo campos sensíveis. A Fase 2 de minimização por colunas não foi efetivada pelo draft comentado e precisa de rota substituta para os consumidores Web antes de ser aplicada.

O pacote de coleta utilizado está em [`supabase/audits/p0b_security_catalog_readonly.sql`](../../supabase/audits/p0b_security_catalog_readonly.sql), com instruções em [`SUPABASE_SECURITY_CATALOG_EXPORT.md`](./SUPABASE_SECURITY_CATALOG_EXPORT.md). A exportação recebida foi analisada sem consultar dados pessoais.

O plano independente de remediação está em [`SUPABASE_SECURITY_REMEDIATION_PLAN_P0B.md`](./SUPABASE_SECURITY_REMEDIATION_PLAN_P0B.md). Ele não autoriza mudanças e deve ser aprovado separadamente do planejamento mobile.

## 2. Verificação do canal de acesso

Foi feita uma checagem local sem imprimir valores secretos:

| Item | Resultado | Consequência |
| --- | --- | --- |
| Project Ref/URL | confirmados pelo responsável | ambiente-alvo definido |
| Supabase CLI | indisponível | não foi possível obter catálogo remoto |
| `psql` | indisponível | não foi possível consultar `pg_catalog`/`information_schema` |
| variáveis de ambiente relevantes | não configuradas para consulta; apenas o nome de `SUPABASE_SERVICE_ROLE_KEY` foi detectado | nenhum segredo foi lido ou usado |
| acesso HTTP de Management API | não configurado | nenhuma chamada administrativa foi executada |

O arquivo `10_migration_history_metadata.csv` contém apenas o marcador da seção e nenhuma linha de histórico; não foi possível comparar migrations aplicadas remotamente.

## 3. Evidências locais já levantadas

### 3.1 Perfis

A migration `062_fix_organizations_and_profiles_rls.sql` cria `public.user_profiles` a partir de `profiles`, concede leitura a `anon`/`authenticated`/`service_role` e define uma policy ampla em `profiles`. A efetividade atual precisa ser confirmada no catálogo de produção, incluindo grants da view, owner, `security_invoker` e policies posteriores.

**Classificação:** crítico a verificar; não confirmado remotamente.

### 3.2 Tenant e RPCs

As migrations locais indicam RPCs de favoritos/conexões que recebem `p_host` e resolvem tenant por `_resolve_public_tenant_id`, com fallback. Para o aplicativo single-tenant, o BFF deve fixar o tenant canônico server-side e não aceitar `host` ou `tenant_id` do cliente como autoridade.

**Classificação:** bloqueador de desenho/integração; precisa de confirmação das assinaturas, grants e funções efetivamente publicadas.

### 3.3 `SECURITY DEFINER`

Foram encontradas funções privilegiadas com configuração local `search_path = public`. A auditoria remota precisa verificar `prosecdef`, owner, ACL, `proconfig`, dependências e autorização interna de cada função em escopo.

**Classificação:** alto a verificar; não confirmado remotamente.

### 3.4 Claims e vínculos

O helper local `current_tenant_id()` lê `tenant_id` do JWT, enquanto não foi identificado no repositório um custom access token hook ativo que emita esse claim. O provisionamento local atualiza perfis e memberships, não necessariamente tokens já emitidos.

**Classificação:** bloqueador de autorização; confirmar configuração Auth e origem efetiva dos claims. A validação deve permitir o login de contas `member`, `admin` e `master` existentes, mas liberar dados privados somente quando houver vínculo e escopo válidos no tenant da Conexão Maçônica.

### 3.5 Policies recebidas

O arquivo `02_policies.csv` contém 414 policies em 38 tabelas. A distribuição por `roles` é:

| Role declarada | Policies |
| --- | ---: |
| `{public}` | 328 |
| `{authenticated}` | 73 |
| `{anon,authenticated}` | 10 |
| `{service_role}` | 3 |

Há quatro policies para `profiles`, mas nenhuma para a view `user_profiles`. A relação `profiles` possui `relrowsecurity = true`, enquanto `user_profiles` é uma view sem RLS própria.

**Achado A01 — contenção de linhas aplicada; exposição de colunas pendente:** a policy `Allow authenticated read profiles` foi removida e não há outra policy equivalente com `qual = true`. Antes da mudança, isso permitia leitura ampla de todas as linhas por `authenticated`. Agora, o grant de `SELECT` ainda permite todas as colunas das linhas autorizadas. Ler campos administrativos no próprio perfil pode ser necessário para autenticação e autorização; o risco prioritário é confirmar que membros comuns não leem esses campos de terceiros ou fora do escopo. A minimização completa exige DTO/RPC ou grants por coluna.

`anon` não possui `SELECT` em `profiles` e `user_profiles` não possui `SELECT` para `anon`/`authenticated` nos grants exportados. Isso reduz o risco anônimo, mas não elimina a exposição entre usuários autenticados.

As policies de `business_favorites` restringem o usuário por `auth.uid()` e o `INSERT/UPDATE` por `current_tenant_id()`. As policies de `business_connections` usam `auth.uid()`, permissões empresariais e `has_tenant_admin_access`. Essas expressões parecem alinhadas ao isolamento, mas dependem da implementação efetiva das funções auxiliares e de RLS habilitada.

O uso de `{public}` em policies de escrita não concede acesso automaticamente: a decisão depende da expressão `qual`/`with_check`. Ainda assim, exige cruzamento com grants e testes controlados, especialmente nas policies que chamam `has_business_permission`, `has_tenant_admin_access` ou funções equivalentes.

**Classificação:** achado relevante, ainda não conclusivo.

### 3.6 Relações, grants e funções

- Foram exportadas 199 relações; 186 têm RLS habilitada. As 13 relações sem RLS são tabelas internas do schema `auth` e as views `public.user_profiles` e `public.vw_operational_dlq_sanitized`; isso não é, por si só, uma falha.
- `public.profiles`, `tenant_members`, `business_members`, `business_favorites` e `business_connections` têm RLS habilitada e `rls_forced = false`.
- A role `service_role` e `postgres` aparecem com `bypasses_rls = true`, comportamento esperado para papéis privilegiados, mas incompatível com qualquer uso no cliente mobile.
- Foram exportados 193 funções: 155 `SECURITY DEFINER` e 38 não privilegiadas. Há 101 grants de `EXECUTE` para `PUBLIC`.
- `assign_profile_rhid` é executável por `anon`, `authenticated` e `PUBLIC`; o catálogo não contém o corpo da função, portanto sua autorização interna precisa ser revisada antes de qualquer uso mobile.
- Funções sensíveis como `set_my_favorite`, `sync_my_favorites`, `register_business_connection_by_slug` e `request_account_deletion` estão concedidas a `authenticated`, sem `PUBLIC` no grant específico.
- Muitas funções `SECURITY DEFINER` usam `search_path = public`; isso permanece risco de hardening até revisão do corpo, owner e dependências.

### 3.7 Storage

As policies exportadas indicam:

- `connection-photos` com leitura pública, possivelmente intencional para o Mural;
- `business-assets` e `event-assets` com leitura para qualquer `authenticated` apenas pelo bucket, sem vínculo explícito de tenant/empresa na policy de leitura;
- `member-avatars` com leitura condicionada ao próprio usuário ou a papéis administrativos.

**Achado A02 — alto, pendente de confirmação de conteúdo:** qualquer usuário autenticado pode ler objetos dos buckets `business-assets` e `event-assets` se a policy for efetiva para todos os objetos. É necessário verificar se esses buckets contêm material privado, rascunhos ou dados de outros tenants e comparar com a intenção funcional.

## 4. Parecer A — segurança global do banco compartilhado

**Resultado preliminar: não aprovado.** A exposição ampla entre linhas de `profiles` foi contida na configuração exportada, mas a exposição de colunas nos escopos autorizados, grants extensos de execução e policies de Storage ainda exigem revisão. Não é possível concluir segurança sem testes controlados e revisão dos corpos das funções.

## 5. Parecer B — segurança da Conexão Maçônica

**Resultado preliminar: pendente.** As tabelas de favoritos, conexões e memberships possuem RLS e predicates por usuário/vínculo, e as RPCs móveis principais são concedidas a `authenticated`. Ainda falta comprovar, em ambiente controlado, que vínculos de outros tenants, papéis `master/admin/member`, contas deletadas e parâmetros `p_host` não produzem acesso cruzado.

## 6. Catálogo que deve ser coletado

A próxima coleta deve retornar apenas metadados, com valores pessoais e tokens omitidos:

- `pg_class`, `pg_namespace`, `pg_views` e opções de views;
- `pg_policies` e `relrowsecurity`/`relforcerowsecurity`;
- `information_schema.role_table_grants` e ACLs de funções;
- `pg_proc` (`prosecdef`, `proconfig`, argumentos e owner);
- buckets e policies de Storage;
- configurações Auth relevantes, incluindo redirects, expiração e hooks;
- versão/ordem das migrations aplicadas.

Não executar consultas de negócio, enumerar usuários ou validar acesso cruzado diretamente na produção sem autorização adicional.

## 7. Matriz provisória de risco

| ID | Tema | Evidência disponível | Estado | Próxima evidência |
| --- | --- | --- | --- | --- |
| A01 | `profiles`/`user_profiles` | policy global removida; `SELECT` de tabela permanece para `authenticated` | contenção parcial — alto | migrar consumidores, aplicar allowlist de colunas/DTO e testar enumeração |
| A02 | `p_host`/fallback | funções locais | não confirmado | definições e grants das RPCs no remoto |
| A03 | `SECURITY DEFINER` | 155 funções; muitas com `search_path = public` | alto — pendente | revisar corpos, owner, ACL, `proconfig` e dependências |
| A04 | claim `tenant_id` | helper/config local | pendente | Auth hooks e configuração efetiva |
| A05 | Storage multi-tenant | leitura ampla em `business-assets`/`event-assets` | alto — pendente | conteúdo dos buckets, escopo esperado e teste controlado |
| A06 | isolamento single-tenant | RLS/policies parciais favoráveis | não testado | funções auxiliares e testes controlados fora da produção |

## 8. Decisão do gate

O gate de auditoria permanece **pendente**. A conclusão será dividida em dois resultados independentes:

1. **Segurança do banco compartilhado:** comprovação de RLS, grants, views, funções, Auth e mecanismos globais sem acessos indevidos entre tenants ou papéis.
2. **Segurança específica da Conexão Maçônica:** comprovação de que o aplicativo libera recursos privados somente a usuários com vínculo, conta ativa e permissões canônicas no tenant da Conexão Maçônica.

O Parecer A está **não aprovado preliminarmente** por A01/A02/A03. O Parecer B permanece **pendente** até os testes controlados e a revisão de autorização canônica. O P0-B continua em revisão técnica e a implementação mobile permanece não autorizada.

Nenhuma migration, policy, grant, configuração Auth, credencial, dado ou recurso remoto foi alterado por esta auditoria.
