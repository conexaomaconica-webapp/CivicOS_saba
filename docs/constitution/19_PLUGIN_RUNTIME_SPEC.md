# 19. PLUGIN RUNTIME SPECIFICATION

## 1. Princípio Fundamental

O CivicOS adota uma arquitetura de **Motor de Orquestração Cego**. O Kernel e a Platform nunca importam regras de negócio, e os plugins nunca acessam a infraestrutura interna do Core.

Todo plugin executa dentro de uma **Sandbox Lógica** estrita (via TypeScript/SDK).

## 2. Plugin Context

O **PluginContext** é o **único** ponto de contato entre um plugin e o CivicOS.
Nenhum plugin tem acesso ao `Kernel`, `Container` de injeção de dependências ou aos Registries (como o `RouteRegistry` ou `WidgetRegistry`).

O contexto é **100% imutável**. Ele é congelado com `Object.freeze()` antes de ser entregue ao plugin, impedindo qualquer modificação em tempo de execução.

### 2.1. Interface do Contexto

```typescript
export interface PluginContext {
  /** Identificação e contexto do Tenant atual (se em tempo de request) */
  readonly tenant?: TenantContext;
  
  /** Resolvedor de Capabilities (Pure Function) */
  readonly capabilities: CapabilityResolver;
  
  /** Resolvedor de Permissões concedidas ao plugin */
  readonly permissions: PermissionResolver;
  
  /** Resolvedor de Serviços de Plataforma (contratos) */
  readonly services: ServiceResolver;
  
  /** EventBus filtrado (sandbox de eventos permitidos) */
  readonly events: PluginEventBus;
  
  /** Instância de logger própria do plugin */
  readonly logger: PluginLogger;
  
  /** Configurações e variáveis de ambiente permitidas para o plugin */
  readonly config: PluginConfiguration;
  
  /** Acesso ao armazenamento isolado do plugin */
  readonly storage: PluginStorage;
}
```

## 3. Service Contract & Hierarquia

Os plugins nunca resolvem implementações concretas (ex: `SupabaseStorage`), eles sempre resolvem **Contratos** (interfaces).

A hierarquia segue a regra:
**Capability → Permission → Service Contract → Implementation**

1. **Capability**: Declaração no registro (`storage:objects`).
2. **Permission**: Autorização no `plugin.json` (`"storage": true`).
3. **Service Contract**: Interface disponível no Contexto (`StorageService`).
4. **Implementation**: Concreção injetada pelo Core DI (`SupabaseStorage`).

O `ServiceResolver` pertence ao Runtime do Plugin. O `Container` pertence ao Kernel. O plugin pede o serviço ao `ServiceResolver`, que valida permissões e busca no `Container`. O plugin não sabe que o Container existe.

## 4. Permission Runtime

O `PluginContext` entregue a um plugin é **filtrado** com base nas permissões concedidas.
As permissões filtram os serviços inteiros, não apenas métodos isolados.

Se o plugin não possuir a permissão requerida e tentar acessar um serviço, o `ServiceResolver` lança uma exceção imediatamente (Fail-Fast):
```typescript
// Dispara Erro se a permissão 'payments' não existir
context.services.resolve('PaymentService');
```

## 5. Plugin Manifest Extension

O manifesto do plugin (`plugin.json`) ganha a declaração de runtime:

```json
{
  "runtime": {
    "minCoreVersion": "1.2.0",
    "maxCoreVersion": "2.x",
    "sandbox": "logical",
    "permissions": ["storage"],
    "services": ["StorageService"]
  }
}
```

## 6. Dependency Graph vs Capability Graph

São grafos separados:
- **Capability Graph**: Valida as dependências entre *funcionalidades* (`storage -> media -> gallery`).
- **Plugin Graph**: Resolve a *ordem de inicialização* e ciclo de vida entre plugins (`Marketplace -> Payments -> Storage`).

## 7. Lifecycle Hooks

Todo plugin deve exportar os hooks de ciclo de vida definidos pelo SDK. Eles recebem apenas o `PluginContext`:

```typescript
export interface PluginLifecycleHooks {
  onInstall?: (ctx: PluginContext) => Promise<void> | void;
  onBoot?: (ctx: PluginContext) => Promise<void> | void;
  onEnable?: (ctx: PluginContext) => Promise<void> | void;
  onDisable?: (ctx: PluginContext) => Promise<void> | void;
  onSuspend?: (ctx: PluginContext) => Promise<void> | void;
  onResume?: (ctx: PluginContext) => Promise<void> | void;
  onShutdown?: (ctx: PluginContext) => Promise<void> | void;
  onUninstall?: (ctx: PluginContext) => Promise<void> | void;
}
```

## 8. Plugin Health

Cada plugin produz um `PluginHealthReport`, agregado no Kernel:

```typescript
export interface PluginHealthReport {
  readonly pluginId: string;
  readonly version: string;
  readonly state: 'installed' | 'booted' | 'enabled' | 'suspended' | 'disabled' | 'failed';
  readonly bootTime: number;
  readonly dependencies: string[];
  readonly capabilities: string[];
  readonly permissions: string[];
  readonly services: string[];
  readonly warnings: string[];
  readonly violations: string[];
  readonly score: number; // 0-100
}
```
