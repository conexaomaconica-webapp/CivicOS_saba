# Modelo de Segurança — CivicOS

> _Define as políticas de isolamento multi-tenant, controle de acesso e regras
> de tráfego para a proteção do SaaS OS._

**Versão:** 1.0.0
**Status:** Ratificado

---

## 1. Isolamento de Dados: Banco de Dados & RLS

O CivicOS exige que todos os dados de diferentes inquilinos sejam isolados fisicamente ou contextualmente. O Supabase (PostgreSQL) implementa Row-Level Security (RLS) como nossa defesa de primeira linha.

### A. Estrutura de Tabela Padrão
Toda tabela que contém dados multi-tenant deve possuir a coluna `tenant_id`:

```sql
ALTER TABLE tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON tabela
  FOR ALL
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

---

## 2. Pipeline de Middleware HTTP

O tráfego de requisições web passa por um pipeline sequencial rígido no Edge Runtime:

```
[Requisição HTTP]
       ↓
[1. Resolução do Tenant]     ➜ Lê subdomínio, injeta ID no cookie/header.
       ↓
[2. Autenticação]            ➜ Valida sessão/JWT do usuário.
       ↓
[3. Gating de Capability]    ➜ Consulta se a rota requer capability ativa do Tenant.
       ↓
[4. RBAC (Autorização)]      ➜ Compara permissões requeridas da rota com o papel do usuário.
       ↓
[Next.js Render]             ➜ Executa rewrite/renderiza componente da página.
```

---

## 3. Gating de Rota Baseado em Capability

Se um usuário tenta acessar uma URL registrada por um plugin (ex: `/guia`), a rota correspondente é resolvida no `RouteRegistry`.

1. Se a rota possui `capability` associada (ex: `search:basic`):
   - O Middleware consulta o `LicensingService`.
   - Se o Tenant correspondente não possuir a capability licenciada/ativa, a requisição é interceptada e redirecionada para a tela de **upgrade comercial** ou retorna `404 Not Found`.

2. Isso garante que recursos premium (como banners e geolocalização) não possam ser injetados ou chamados de forma maliciosa por inquilinos do plano Starter.

---

## 4. Auditoria & Log de Segurança

Ações críticas de mutação de estado (como alteração de planos, criação de usuários ou desativação de plugins) devem obrigatoriamente registrar uma entrada imutável na tabela `admin_audit_logs`.

```json
{
  "tenant_id": "abc-123",
  "user_id": "usr-456",
  "action": "plugin:state_change",
  "metadata": {
    "plugin_id": "business-directory",
    "from": "active",
    "to": "disabled",
    "reason": "Request by tenant admin"
  },
  "timestamp": "2026-07-16T10:12:00Z"
}
```
