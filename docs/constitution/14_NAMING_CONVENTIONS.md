# Convenções de Nomenclatura (Naming Conventions) — CivicOS

> _Garante legibilidade uniforme em arquivos, diretórios, variáveis, tabelas e
> endpoints de todo o monorepo._

**Versão:** 1.0.0
**Status:** Ratificado

---

## 1. Diretórios & Arquivos

- **Monorepo Workspaces & Plugins:** `kebab-case`.
  - Ex: `packages/core`, `plugins/business-directory`
- **Páginas e Rotas Next.js:** Padrão do Next.js (App Router). `kebab-case` ou `[param]` para dinâmicas.
- **Componentes React:** `PascalCase`.
  - Ex: `Button.tsx`, `FeaturedList.tsx`
- **Arquivos TypeScript de Serviço/Kernel:** `kebab-case`.
  - Ex: `plugin-registry.ts`, `di-container.ts`

---

## 2. Código TypeScript

- **Interfaces & Contratos:** Prefixo `I` para contratos de plataforma compartilhados.
  - Ex: `IAuthProvider`, `ILicensingService`
- **Tipos & Tipos Genéricos:** `PascalCase`.
  - Ex: `PluginState`, `RegisteredRoute`
- **Classes:** `PascalCase`.
  - Ex: `PluginRegistry`, `Container`
- **Variáveis, Propriedades e Métodos:** `camelCase`.
  - Ex: `getService()`, `tenantId`, `isModuleActive()`
- **Símbolos & Tokens DI:** `SCREAMING_SNAKE`.
  - Ex: `AUTH_PROVIDER`, `LICENSING_SERVICE`

---

## 3. Banco de Dados (PostgreSQL)

- **Tabelas & Colunas:** `snake_case`.
  - Ex: `tenant_plugins`, `business_directory`, `tenant_id`, `state_changed_at`
- **Foreign Keys:** Nome da tabela estrangeira no singular seguido de `_id`.
  - Ex: `tenant_id`, `user_id`
- **Policies RLS:** Prefixadas com a tabela e a finalidade.
  - Ex: `tenant_isolation_policy`
- **Índices:** `idx_tabela_coluna`.
  - Ex: `idx_businesses_tenant_id`
