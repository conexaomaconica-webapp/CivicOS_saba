# Matriz de Auditoria RLS (Row Level Security) — Migrations 001 a 050

Esta matriz documenta a auditoria técnica de segurança no banco de dados Supabase/PostgreSQL do **CivicOS / Conexão Maçônica**, verificando a habilitação de RLS, contencimento multitenant, políticas de SELECT, INSERT, UPDATE, DELETE e contenção de privilégios.

---

## Matriz de Auditoria por Tabela

| Tabela | RLS Habilitado | Anon SELECT | Authenticated SELECT | INSERT | UPDATE | DELETE | Service Role | Isolamento Multitenant | Risco Residual |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `public.tenants` | ✅ Sim | ❌ Não | ✅ Tenant Members | Admin Only | Admin Only | Admin Only | Full Bypass | `id = tenant_id` | Baixo (Protegido por RBAC) |
| `public.tenant_domains` | ✅ Sim | ✅ Por Host | ✅ Admins | Admin Only | Admin Only | Admin Only | Full Bypass | `tenant_id` | Baixo |
| `public.profiles` | ✅ Sim | ❌ Não | ✅ Próprio usuário | Self | Self | Self | Full Bypass | `id = auth.uid()` | Baixo |
| `public.businesses` | ✅ Sim | ✅ Publicados | ✅ Proprietário / Admin | Owner | Owner | Owner/Admin | Full Bypass | `tenant_id, owner_id` | Baixo (RLS + RPC Sanitizada) |
| `public.business_members` | ✅ Sim | ❌ Não | ✅ Membros / Admin | Admin | Admin | Admin | Full Bypass | `(tenant_id, business_id) → businesses` | Baixo |
| `public.business_banners` | ✅ Sim | ✅ Publicados | ✅ Proprietário / Admin | Owner | Owner | Owner | Full Bypass | `(tenant_id, business_id) → businesses` | Baixo |
| `public.business_reviews` | ✅ Sim | ✅ Approved Only | ✅ Author / Admin | Auth User | Owner Response | Admin Only | Full Bypass | `(tenant_id, business_id) → businesses` | Baixo (Constraint 1 review/autor) |
| `public.business_media` | ✅ Sim | ✅ Publicados | ✅ Proprietário / Admin | Owner | Owner | Owner | Full Bypass | `(tenant_id, business_id) → businesses` | Baixo (Quota via Trigger 044) |
| `public.plan_entitlements` | ✅ Sim | ✅ Leitura | ✅ Leitura | Admin Only | RPC Admin | Admin Only | Full Bypass | `tenant_id, plan_code, feature_code` | Baixo (Cotas auditadas RPC 047) |
| `public.admin_audit_logs` | ✅ Sim | ❌ Não | ✅ Admin Only | RPC Admin | ❌ Imutável | ❌ Imutável | Full Bypass | `tenant_id, admin_user_id` | Baixo (Audit Log append-only) |
| `public.business_events` | ✅ Sim | ❌ Direto (Apenas RPC) | ✅ Proprietário / Admin | Owner/Admin | Owner/Admin | Owner/Admin | Full Bypass | `(tenant_id, business_id) → businesses` | Baixo (Cota via Trigger 049) |
| `public.business_posts` | ✅ Sim | ❌ Direto (Apenas RPC) | ✅ Proprietário / Admin | Owner/Admin | Owner/Admin | Owner/Admin | Full Bypass | `(tenant_id, business_id) → businesses` | Baixo (Cota via Trigger 049) |
| `public.business_analytics_events` | ✅ Sim | ❌ Direto (Apenas RPC) | ✅ Admin / RPC Summary | RPC Server | ❌ Imutável | Admin Only | Full Bypass | `(tenant_id, business_id) → businesses` | Baixo (HMAC Session + Debounce 050) |

---

## RPCs `SECURITY DEFINER` Auditadas (`SET search_path = ''`)

Todas as funções administrativas e públicas utilizam a diretiva obrigatória `SET search_path = ''` e qualificam esquemas explicitamente:

1. `public.record_business_analytics_event` (Migration 050) — ✅ Auditado (`SET search_path = ''`)
2. `public.get_business_analytics_summary` (Migration 050) — ✅ Auditado (`SET search_path = ''`)
3. `public.update_plan_entitlement_quota` (Migration 047) — ✅ Auditado
4. `public.moderate_business_publication_status` (Migration 047) — ✅ Auditado
5. `public.allocate_founder_status` (Migration 047) — ✅ Auditado
6. `public.get_public_business_events` (Migration 049) — ✅ Auditado
7. `public.get_public_business_posts` (Migration 049) — ✅ Auditado
