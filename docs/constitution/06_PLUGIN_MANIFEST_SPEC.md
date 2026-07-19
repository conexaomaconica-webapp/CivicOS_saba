# Especificação do Manifesto de Plugins — CivicOS

> _Define a estrutura obrigatória de diretórios, formatos de arquivo e regras
> de validação para o manifesto split de plugins do CivicOS._

**Versão:** 1.0.0
**Status:** Ratificado
**Referência:** ADR-027 (Split Manifest)

---

## 1. Estrutura de Diretórios Obrigatória

```
plugins/<plugin-id>/
├── plugin.json                 # Metadados essenciais (obrigatório)
├── package.json                # Declaração NPM do workspace
├── tsconfig.json               # Configuração TypeScript
├── manifest/                   # Manifestos declarativos split
│   ├── routes.json             # Rotas públicas e protegidas
│   ├── permissions.json        # Permissões RBAC
│   ├── navigation.json         # Itens de menu
│   ├── widgets.json            # Cards, gráficos, slots UI
│   ├── capabilities.json       # provides / requires
│   ├── schemas.json            # Entidades e campos
│   ├── events.json             # publishes / consumes
│   ├── settings.json           # Configurações editáveis
│   ├── commands.json           # Command palette entries
│   └── jobs.json               # Background jobs
├── src/                        # Código-fonte TypeScript
│   ├── index.ts                # Entry point (implements Plugin interface)
│   ├── pages/                  # Componentes de página (React)
│   └── widgets/                # Componentes de widget (React)
├── migrations/                 # Scripts SQL versionados
│   ├── 001_init.sql
│   └── 002_add_field.sql
└── seed/                       # Dados de semente para desenvolvimento
    └── default.sql
```

---

## 2. `plugin.json` — Metadados Essenciais

O arquivo raiz contém **apenas** informações de identidade e metadados. Toda
configuração funcional está nos arquivos `manifest/`.

```json
{
  "id": "business-directory",
  "name": "Guia Comercial",
  "version": "1.0.0",
  "description": "Módulo de guia comercial, banners e publicidade local",
  "author": "CivicOS Team",
  "license": "MIT",
  "coreVersion": "^1.0.0",
  "dependencies": [],
  "manifestDir": "./manifest"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | `string` | ✅ | Identificador único. `kebab-case`. Imutável após publicação. |
| `name` | `string` | ✅ | Nome legível para humanos. |
| `version` | `string` | ✅ | Versão semântica (SemVer). |
| `description` | `string` | ✅ | Descrição curta (máx 200 caracteres). |
| `author` | `string` | ✅ | Autor ou equipe. |
| `license` | `string` | ✅ | Licença SPDX. |
| `coreVersion` | `string` | ✅ | Range de compatibilidade com `@saas/core`. |
| `dependencies` | `string[]` | ❌ | IDs de plugins que devem ser inicializados antes. |
| `manifestDir` | `string` | ❌ | Caminho para o diretório de manifestos. Default: `"./manifest"`. |

---

## 3. `manifest/capabilities.json`

Declara quais capabilities o plugin fornece e quais ele requer.

```json
{
  "provides": [
    "search:basic",
    "directory:featured",
    "directory:priority",
    "banner:basic",
    "media:gallery"
  ],
  "requires": [
    "auth:basic",
    "rbac:roles",
    "billing:pix",
    "storage:basic",
    "maps:basic"
  ]
}
```

**Regras de validação:**
- Toda capability listada deve existir no `04_CAPABILITY_CATALOG.md`.
- Se um `requires` não é satisfeito por nenhum plugin ativo ou pela Platform,
  o plugin não pode transitar para o estado `active`.

---

## 4. `manifest/routes.json`

Define as rotas HTTP que o plugin registra no Route Registry.

```json
[
  {
    "path": "/guia",
    "page": "pages/guia-home",
    "public": true,
    "seo": {
      "title": "Guia Comercial — {{tenantName}}",
      "description": "Encontre as melhores empresas locais"
    }
  },
  {
    "path": "/guia/[slug]",
    "page": "pages/empresa-detalhe",
    "public": true,
    "seo": {
      "title": "{{businessName}} — Guia Comercial",
      "description": "{{businessDescription}}"
    }
  },
  {
    "path": "/dashboard/listings",
    "page": "pages/dashboard-listings",
    "permission": "directory:listings:manage",
    "layout": "dashboard"
  },
  {
    "path": "/dashboard/listings/new",
    "page": "pages/wizard-cadastro",
    "permission": "directory:listings:create",
    "layout": "dashboard"
  }
]
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `path` | `string` | ✅ | Path da URL. Suporta parâmetros dinâmicos `[param]`. |
| `page` | `string` | ✅ | Referência ao componente em `src/`. Sem extensão. |
| `public` | `boolean` | ❌ | Se `true`, acessível sem autenticação. Default: `false`. |
| `permission` | `string` | ❌ | Permissão RBAC necessária. |
| `layout` | `string` | ❌ | Layout wrapper (`"dashboard"`, `"admin"`, `"public"`). |
| `seo` | `object` | ❌ | Metadados SEO. Suporta templates `{{variavel}}`. |
| `capability` | `string` | ❌ | Capability necessária para a rota ser registrada. |

---

## 5. `manifest/permissions.json`

```json
[
  {
    "key": "directory:listings:create",
    "label": "Criar Anúncios",
    "description": "Permite cadastrar novas empresas no diretório"
  },
  {
    "key": "directory:listings:manage",
    "label": "Gerenciar Anúncios",
    "description": "Permite editar, pausar e excluir empresas"
  },
  {
    "key": "directory:banners:manage",
    "label": "Gerenciar Banners",
    "description": "Permite criar, editar e pausar anúncios em banner"
  }
]
```

**Convenção:** `pluginDomain:recurso:ação` (ex: `directory:listings:create`)

---

## 6. `manifest/navigation.json`

```json
[
  {
    "id": "directory-dashboard",
    "label": "Painel de Anúncios",
    "icon": "briefcase",
    "path": "/dashboard/listings",
    "order": 10,
    "permission": "directory:listings:manage",
    "showInSidebar": true,
    "children": [
      {
        "id": "directory-new-listing",
        "label": "Nova Empresa",
        "icon": "plus",
        "path": "/dashboard/listings/new",
        "permission": "directory:listings:create"
      }
    ]
  }
]
```

---

## 7. `manifest/widgets.json`

```json
[
  {
    "id": "featured-companies",
    "slot": "HOME_FEATURED",
    "component": "widgets/FeaturedCompanies",
    "order": 10,
    "capability": "directory:featured"
  },
  {
    "id": "search-bar",
    "slot": "HOME_SEARCH",
    "component": "widgets/SearchBar",
    "order": 0,
    "capability": "search:basic"
  },
  {
    "id": "stats-card",
    "slot": "DASHBOARD_CARD",
    "component": "widgets/StatsCard",
    "order": 5
  },
  {
    "id": "banner-carousel",
    "slot": "HOME_TOP_BANNER",
    "component": "widgets/BannerCarousel",
    "order": 0,
    "capability": "banner:rotating"
  }
]
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | `string` | ✅ | Identificador único do widget. |
| `slot` | `ExtensionPoint` | ✅ | Slot onde o widget será renderizado. |
| `component` | `string` | ✅ | Caminho do componente React em `src/`. |
| `order` | `number` | ✅ | Ordem de renderização dentro do slot. |
| `capability` | `string` | ❌ | Capability necessária para exibir o widget. |
| `props` | `object` | ❌ | Props estáticas passadas ao componente. |

---

## 8. `manifest/schemas.json`

```json
[
  {
    "name": "listing",
    "label": "Empresa",
    "fields": [
      { "name": "name", "label": "Nome da Empresa", "type": "string", "required": true },
      { "name": "category", "label": "Categoria", "type": "string", "required": true },
      { "name": "phone", "label": "Telefone", "type": "string", "required": false },
      { "name": "email", "label": "E-mail", "type": "string", "required": false },
      { "name": "description", "label": "Descrição", "type": "text", "required": false },
      { "name": "address", "label": "Endereço", "type": "json", "required": false }
    ]
  }
]
```

---

## 9. `manifest/events.json`

```json
{
  "publishes": [
    {
      "name": "directory.listing_created",
      "description": "Emitido quando uma nova empresa é cadastrada",
      "payload": { "listingId": "string", "tenantId": "string", "category": "string" }
    },
    {
      "name": "directory.listing_updated",
      "description": "Emitido quando dados de uma empresa são atualizados",
      "payload": { "listingId": "string", "tenantId": "string" }
    }
  ],
  "consumes": [
    {
      "name": "billing.payment_confirmed",
      "description": "Reage a confirmação de pagamento para ativar plano premium"
    }
  ]
}
```

---

## 10. `manifest/settings.json`

```json
[
  {
    "key": "directory.max_banners",
    "label": "Limite máximo de banners ativos por anunciante",
    "type": "number",
    "default": 3,
    "min": 1,
    "max": 50,
    "capability": "banner:basic"
  },
  {
    "key": "directory.require_approval",
    "label": "Exigir aprovação do admin para novas empresas",
    "type": "boolean",
    "default": false
  }
]
```

---

## 11. `manifest/commands.json`

```json
[
  {
    "id": "directory.create_listing",
    "title": "Cadastrar Empresa",
    "icon": "plus",
    "category": "Guia Comercial",
    "permission": "directory:listings:create",
    "action": "navigate",
    "target": "/dashboard/listings/new"
  }
]
```

---

## 12. `manifest/jobs.json`

```json
[
  {
    "id": "directory.expire_listings",
    "description": "Desativa listagens expiradas",
    "schedule": "0 2 * * *",
    "handler": "jobs/expireListings",
    "retries": 3
  }
]
```

---

## 13. Regras de Validação no CI

O pipeline de CI deve validar automaticamente:

1. ✅ `plugin.json` contém todos os campos obrigatórios
2. ✅ `id` é `kebab-case` e único no monorepo
3. ✅ `coreVersion` é um range SemVer válido
4. ✅ Toda capability em `capabilities.json` existe no catálogo oficial
5. ✅ Toda permission em `permissions.json` segue a convenção `domain:resource:action`
6. ✅ Toda rota em `routes.json` aponta para um arquivo existente em `src/`
7. ✅ Todo widget em `widgets.json` referencia um Extension Point oficial
8. ✅ Todo evento em `events.json` segue a convenção `domain.entity_verb`
9. ✅ Nenhum import direto para outro plugin (`import from '@saas/plugin-*'`)
10. ✅ Nenhum import de caminhos internos do Core (`import from '@saas/core/src/*'`)
