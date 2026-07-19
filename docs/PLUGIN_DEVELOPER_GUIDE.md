# Plugin Developer Guide

This guide describes how to build, configure, and register plugins on the modular SaaS platform. The platform is designed around a **Kernel Core + Plugins** architecture where the Core remains completely domain-oblivious (ADR-011), and plugins dynamically register metadata blueprints.

---

## 1. Directory Structure

Every plugin is an independent workspace package located under `plugins/` and must adhere to this layout:

```text
plugins/my-plugin/
├── plugin.json               # Declarative plugin metadata manifest
├── package.json              # NPM package declaration
├── tsconfig.json             # TypeScript configuration
├── src/
│   ├── index.ts              # Entry point implementing the Plugin interface
│   └── [domain-logic]/       # Use cases, repository interfaces, models
├── migrations/               # Database migration scripts (SQL)
│   ├── 001_init.sql
│   └── 002_add_field.sql
└── seed/                     # Default seed data (SQL)
    └── default.sql
```

---

## 2. Declarative Manifesto: `plugin.json`

The `plugin.json` file is the central blueprint for the plugin. The Core discovers and registers all defined items automatically.

```json
{
  "id": "business-directory",
  "name": "Business Directory",
  "version": "1.0.0",
  "description": "Directory of local businesses",
  "author": "Antigravity Dev Team",
  "license": "MIT",
  "dependencies": [],
  "migrations": [
    "migrations/001_init.sql",
    "migrations/002_add_field.sql"
  ],
  "seeds": [
    "seed/default.sql"
  ],
  "featureFlags": {
    "directory.premium_listings": false,
    "directory.reviews_enabled": true
  },
  "settings": [
    {
      "key": "directory.max_banners",
      "label": "Max Banner Count",
      "type": "number",
      "default": 5
    }
  ],
  "permissions": [
    {
      "key": "directory:listings:create",
      "label": "Criar Anúncios",
      "description": "Permite cadastrar novas empresas no diretório"
    }
  ],
  "navigation": [
    {
      "id": "directory-menu",
      "label": "Guia Comercial",
      "icon": "briefcase",
      "path": "/directory",
      "order": 10,
      "featureFlag": "directory.premium_listings"
    }
  ],
  "commands": [
    {
      "id": "directory.create_listing",
      "title": "Cadastrar Empresa",
      "icon": "plus",
      "category": "Guia Comercial",
      "permissions": ["directory:listings:create"]
    }
  ],
  "widgets": [
    {
      "id": "directory-active-listings-widget",
      "name": "Empresas Ativas",
      "component": "ActiveListingsWidget",
      "defaultLayout": { "w": 6, "h": 4 }
    }
  ],
  "dashboardCards": [
    {
      "id": "directory-performance-card",
      "title": "Cliques em Banners",
      "component": "BannerClicksCard"
    }
  ],
  "schemas": [
    {
      "name": "listing",
      "fields": [
        {
          "name": "name",
          "label": "Nome da Empresa",
          "type": "string",
          "required": true
        },
        {
          "name": "phone",
          "label": "Telefone",
          "type": "string",
          "required": false
        }
      ]
    }
  ],
  "eventsPublished": [
    "directory.listing_created"
  ],
  "eventsConsumed": [
    "billing.subscription_paid"
  ]
}
```

---

## 3. Registering Sub-Services (Registries)

All plugin capabilities hook into dedicated registries managed by the Core.

### A. Schema Registry
Used to declare entity constraints.
- **Fields & Types**: Supports basic types (string, number, boolean, date, json).
- **Forms and Validations**: Core uses this schema to generate forms, apply client-side and server-side validation, and auto-generate Excel column layouts.

### B. Search Provider Registry
If a plugin has searchable content, it registers a `SearchProvider`:
```typescript
import { METADATA_REGISTRY_SERVICE } from '@saas/core';

context.getService(METADATA_REGISTRY_SERVICE).registerSearchProvider({
  pluginId: 'business-directory',
  search: async (query, limit) => {
    // Return unified SearchResult format
    return [{ id: '1', title: 'Empresa X', description: 'Categoria Y', url: '/directory/1' }];
  }
});
```

### C. Widget & Dashboard Registry
Define widgets in `plugin.json` (`widgets`, `dashboardCards`).
- React components must be loaded dynamically by name mapping in the host application shell.

### D. Navigation & Feature Flags
Dynamic sidebar navigation entries automatically disappear if the related `featureFlag` is disabled for the tenant.

### E. Settings Registry
Binds plugin-specific configuration settings. The licensing service enforces maximum values based on subscription plans.

### F. Permission & RBAC Registry
Automatically binds permission objects into the Core RBAC checker.

### G. Import & Export Registry
Registers csv/xlsx helpers:
```typescript
context.getService(METADATA_REGISTRY_SERVICE).registerImporter({
  entity: 'listing',
  parse: (row) => ({ name: row[0], phone: row[1] })
});
```

### H. Notification Registry
Binds business events to notification formats:
```typescript
context.getService(METADATA_REGISTRY_SERVICE).registerNotification({
  event: 'directory.listing_created',
  channels: ['email', 'push']
});
```

### I. AI Registry
Registers prompt definitions:
```typescript
context.getService(METADATA_REGISTRY_SERVICE).registerAIPrompt({
  id: 'generate-listing-description',
  systemPrompt: 'Você é um assistente de marketing comercial...',
  parameters: ['businessName', 'category']
});
```

---

## 4. Core Freeze Policy

> [!IMPORTANT]
> **Core Stability Invariant:**
> Following the completion of Sprint 0, the `@saas/core` package is frozen. No domain concepts (e.g. Masonic Loja, Business Listing, Product) can enter the Core. All new features must be implemented as plugins or registered through the dynamic Metadata registries.
