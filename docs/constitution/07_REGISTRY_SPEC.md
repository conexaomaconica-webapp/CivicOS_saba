# Especificação de Registries — CivicOS

> _Descreve o contrato de runtime, ciclo de vida e métodos públicos para todos os
> registries (catálogos de memória) do CivicOS._

**Versão:** 1.0.0
**Status:** Ratificado

---

## 1. O Ciclo de Vida do Registro

Todos os registries do CivicOS são carregados na inicialização do servidor (Next.js server-side bootstrap) e cacheados em memória para garantir latência ultra-baixa em tempo de requisição.

```
[Boot da Aplicação]
         ↓
[Plugin Registry carrega manifestos]
         ↓
[Popula Registries em memória]
         ↓
[Roteamento & Renderização consomem os Registries]
```

---

## 2. Especificação por Registry

### A. Route Registry (`RouteRegistry`)
Responsável por mapear caminhos de URL para páginas físicas dos plugins.

* **Interface:**
```typescript
export interface RegisteredRoute {
  readonly pluginId: string;
  readonly path: string;
  readonly page: string; // Caminho do componente relativo a src/pages/
  readonly public: boolean;
  readonly permission?: string;
  readonly capability?: string;
  readonly seo?: {
    readonly title?: string;
    readonly description?: string;
  };
}
```

* **Métodos Públicos:**
  - `register(pluginId: string, routes: RouteDefinition[]): void`
  - `resolve(path: string): RegisteredRoute | null`
  - `getRoutes(): RegisteredRoute[]`

---

### B. Capability Registry (`CapabilityRegistry`)
Verifica se todas as dependências funcionais declaradas pelos plugins são satisfeitas.

* **Interface:**
```typescript
export interface PluginCapabilities {
  readonly provides: string[];
  readonly requires: string[];
}
```

* **Métodos Públicos:**
  - `register(pluginId: string, caps: PluginCapabilities): void`
  - `hasCapability(capability: string): boolean`
  - `getProviders(capability: string): string[]`
  - `validate(): { ok: boolean; errors: string[] }`

---

### C. Extension Point Registry (`ExtensionPointRegistry`)
Permite aos plugins registrarem widgets e fragmentos visuais em slots nomeados da UI.

* **Interface:**
```typescript
export interface ExtensionRegistration {
  readonly id: string;
  readonly pluginId: string;
  readonly slot: string;
  readonly component: string; // Caminho do componente relativo a src/widgets/
  readonly order: number;
  readonly capability?: string;
  readonly props?: Record<string, unknown>;
}
```

* **Métodos Públicos:**
  - `register(ext: ExtensionRegistration): void`
  - `getExtensionsForSlot(slot: string): ExtensionRegistration[]`

---

### D. Navigation Registry (`NavigationRegistry`)
Agrega itens de navegação para montar menus laterais e cabeçalhos.

* **Interface:**
```typescript
export interface RegisteredNavigationItem {
  readonly id: string;
  readonly pluginId: string;
  readonly label: string;
  readonly icon?: string;
  readonly path: string;
  readonly order: number;
  readonly permission?: string;
  readonly capability?: string;
  readonly children?: RegisteredNavigationItem[];
}
```

* **Métodos Públicos:**
  - `register(pluginId: string, items: NavigationItem[]): void`
  - `getItems(): RegisteredNavigationItem[]`

---

### E. Search Registry (`SearchRegistry`)
Permite aos plugins registraremos seus provedores de busca rápida.

* **Interface:**
```typescript
export interface SearchProvider {
  readonly pluginId: string;
  search(query: string, limit?: number): Promise<SearchResult[]>;
}
```

* **Métodos Públicos:**
  - `registerProvider(provider: SearchProvider): void`
  - `queryAll(query: string): Promise<SearchResult[]>`

---

### F. Settings Registry (`SettingsRegistry`)
Expõe as chaves de configuração declaradas por cada plugin para permitir customização pelo administrador do tenant.

* **Interface:**
```typescript
export interface RegisteredSetting {
  readonly pluginId: string;
  readonly key: string;
  readonly label: string;
  readonly type: 'string' | 'number' | 'boolean' | 'json';
  readonly default: unknown;
}
```

* **Métodos Públicos:**
  - `register(pluginId: string, settings: SettingDefinition[]): void`
  - `getDefinitions(): RegisteredSetting[]`

---

### G. Schema Registry (`SchemaRegistry`)
Declara as entidades gerenciadas pelo plugin, descrevendo campos e tipos para validação.

* **Interface:**
```typescript
export interface EntityField {
  readonly name: string;
  readonly label: string;
  readonly type: 'string' | 'number' | 'boolean' | 'date' | 'json';
  readonly required: boolean;
}

export interface EntitySchema {
  readonly name: string;
  readonly label: string;
  readonly fields: EntityField[];
}
```

* **Métodos Públicos:**
  - `register(pluginId: string, schemas: EntitySchema[]): void`
  - `getSchema(entityName: string): EntitySchema | null`
