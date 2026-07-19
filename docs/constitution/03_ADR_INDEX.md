# Índice de Decisões de Arquitetura (ADRs) — CivicOS

> _Este documento serve como a memória arquitetural do CivicOS, catalogando
> todas as decisões aceitas, rejeitadas ou obsoletas ao longo do ciclo do projeto._

---

## ADRs Existentes (Fase 1 & 2 - Migrados de `docs/ARCHITECTURE_DECISIONS.md`)

* **ADR-001: Monorepo Setup com Turborepo & PNPM**
  * *Status:* Accepted
  * *Contexto:* Integração e velocidade de compilação dos pacotes compartilhados.
  * *Decisão:* Usar workspaces pnpm e pipeline Turborepo.

* **ADR-002: Backend Integration com Supabase**
  * *Status:* Accepted
  * *Contexto:* RLS de multi-tenancy e banco serverless.
  * *Decisão:* PostgreSQL via Supabase como driver de banco.

* **ADR-003: Modular Architecture (Core + Plugins)**
  * *Status:* Accepted
  * *Contexto:* Suporte a múltiplos nichos sem inchar o codebase central.
  * *Decisão:* DI container, EventBus e PluginRegistry compõem a base.

* **ADR-004: Relocate Authentication & RBAC to Core**
  * *Status:* Accepted
  * *Contexto:* Resolução básica de identidade e segurança.
  * *Decisão:* Mover segurança, login e perfis para a Platform.

* **ADR-005: Relocate Billing and Subscriptions to Core**
  * *Status:* Accepted
  * *Contexto:* Evitar dependências circulares entre plugins e faturamento.
  * *Decisão:* Colocar o Billing Engine na Platform.

* **ADR-006: Global Command Palette Service in Core**
  * *Status:* Accepted
  * *Decisão:* Registro dinâmico de comandos de plugins acessados por Ctrl+K.

* **ADR-007: Feature Flags & Config System (Hybrid Model)**
  * *Status:* Accepted
  * *Decisão:* Configurações compile-time em `@saas/config` com overrides runtime no DB.

* **ADR-008: Schema Registry for Plugins**
  * *Status:* Accepted
  * *Decisão:* Plugins declaram entidades e campos para geração dinâmica de formulários e validações.

* **ADR-009: Background Jobs Strategy Pattern**
  * *Status:* Accepted
  * *Decisão:* Interface `JobQueueProvider` para swappability de brokers de filas.

* **ADR-010: Centralized Analytics Event Logging**
  * *Status:* Accepted
  * *Decisão:* Encapsulamento de logs de analytics em `@saas/analytics`.

* **ADR-011: Core Entity Obliviousness (Zero Plugin Domain Coupling)**
  * *Status:* Accepted
  * *Decisão:* Core nunca importa entidades específicas (Empresa, Loja, Produto).

* **ADR-012: Tenant Feature Marketplace**
  * *Status:* Accepted
  * *Decisão:* Tenants ativam/desativam plugins dinamicamente.

* **ADR-013: Licensing Engine**
  * *Status:* Accepted
  * *Decisão:* Desacoplar assinatura (Billing) de acesso a recursos (Licensing).

* **ADR-014: Domain Event Store**
  * *Status:* Accepted
  * *Decisão:* Log cronológico de mutações persistido no PostgreSQL.

* **ADR-015: Automation Engine**
  * *Status:* Accepted
  * *Decisão:* Workflows automatizados disparados por eventos do Event Store.

* **ADR-016: Module Marketplace (App Store Manifest)**
  * *Status:* Accepted
  * *Decisão:* Metadados ricos no manifesto para listagem em App Store futura.

* **ADR-017: API First Architecture**
  * *Status:* Accepted
  * *Decisão:* UIs conversam exclusivamente com APIs, nunca direto com o banco.

* **ADR-018: Offline First Infrastructure**
  * *Status:* Accepted
  * *Decisão:* Cache local e sync queues para apps mobile Capacitor.

* **ADR-019: Observability Isolation**
  * *Status:* Accepted
  * *Decisão:* Abstração em `@saas/observability` para trace e logs.

* **ADR-020: Public SDK**
  * *Status:* Accepted
  * *Decisão:* Pacote `@saas/sdk` expõe wrappers simplificados de API.

* **ADR-021: Backward Compatibility & SemVer Protection**
  * *Status:* Accepted
  * *Decisão:* Manutenção de métodos obsoletos com `@deprecated` antes da remoção em Major.

* **ADR-022: Public Contracts Only**
  * *Status:* Accepted
  * *Decisão:* Plugins importam exclusivamente da entrada pública `@saas/core`.

* **ADR-023: Zero Business Logic in Infrastructure (Infrastructure Purity)**
  * *Status:* Accepted
  * *Decisão:* Pacotes de infraestrutura permanecem 100% genéricos.

* **ADR-024: Extensibility First**
  * *Status:* Accepted
  * *Decisão:* Recursos devem ser adicionados via registries em vez de alterar o Core.

* **ADR-025: Core Quality Gate**
  * *Status:* Accepted
  * *Decisão:* Pipeline de CI valida types, lint, testes e cobertura no Core.

---

## Novos ADRs de Evolução (Fase 2.5 - SaaS OS)

### ADR-026: Plugin State Machine com 8 Estados
* **Status:** Proposed
* **Contexto:** Necessidade de controlar granularmente o status do plugin em cada tenant.
* **Decisão:** Implementar máquina com estados: `installed`, `migrated`, `licensed`, `configured`, `active`, `public`, `disabled`, `error`.

### ADR-027: Split Manifest (plugin.json para manifest/)
* **Status:** Proposed
* **Contexto:** Manifesto raiz monolítico cresce e se torna difícil de ler.
* **Decisão:** Manter apenas metadados no `plugin.json` e criar a pasta `/manifest` contendo arquivos separados para `routes`, `widgets`, `navigation`, `permissions`, etc.

### ADR-028: Capability-Based Licensing
* **Status:** Proposed
* **Contexto:** Billing gerenciava plugins de forma fixa.
* **Decisão:** Cobrança mapeia planos para capabilities. Plugins operam perguntando se possuem a capability, não se o plugin está ativo.

### ADR-029: Route Registry com Middleware Rewrite
* **Status:** Proposed
* **Contexto:** Evitar acoplamento de rotas e manter URLs amigáveis e SEO no Next.js.
* **Decisão:** O Core gerencia um `RouteRegistry`. O Next.js possui rota dinâmica catch-all e o middleware faz rewrites invisíveis para `/plugin/[pluginId]/[...path]`.

### ADR-030: Slot Engine para Composição de UI
* **Status:** Proposed
* **Contexto:** Home Page e Dashboard eram telas rígidas com componentes fixos.
* **Decisão:** Renderizar slots nomeados (`HOME_SEARCH`, `DASHBOARD_CARD`) onde componentes de plugins registram-se dinamicamente com propriedade `order`.

### ADR-031: Extension Points como Contrato Oficial
* **Status:** Proposed
* **Contexto:** Definir os pontos oficiais de acoplamento para evitar que plugins quebrem layouts da UI.
* **Decisão:** Declarar uma lista fixa de Extension Points no Core e rejeitar registros fora do padrão.

### ADR-032: Capability Packs para Venda Modular
* **Status:** Proposed
* **Contexto:** Flexibilizar comercialização de recursos para os tenants.
* **Decisão:** Permitir empacotar e faturar grupos de capabilities como add-ons independentes do plano principal.

### ADR-033: Separação Tripartite (Kernel, Platform, Plugins)
* **Status:** Proposed
* **Contexto:** Ambiguidade sobre responsabilidades de pacotes sob o termo genérico "Core".
* **Decisão:** Definir formalmente as fronteiras de responsabilidade entre Kernel (DI, events, lifecycle), Platform (Auth, Billing, Licensing) e Plugins (regras específicas).
