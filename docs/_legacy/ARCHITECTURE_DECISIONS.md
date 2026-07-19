# Architecture Decision Records (ADRs)

This document serves as the architectural memory for the modular SaaS platform. It tracks critical decisions, their context, and consequences.

---

## ADR-001: Monorepo Setup with Turborepo & PNPM

### Status
Accepted

### Context
The project contains multiple shared packages (`core`, `shared`, `ui`, `config`, `database`, `jobs`) and application shells (Next.js web client, Capacitor mobile wrapper) alongside isolated plugins. We need a performant package manager and builder that handles workspace linking, dependency sharing, and parallel builds.

### Decision
Use **pnpm workspaces** for dependency deduplication and **Turborepo** for remote caching, task pipeline modeling, and fast builds.

### Consequences
- **Pros**: Parallel compilation of dependencies, caching of unchanged packages, simple localized workspace packages (using `workspace:*`).
- **Cons**: Monorepo tooling requires clean build configurations (`tsconfig` routing) to prevent type checking issues.

---

## ADR-002: Backend Integration with Supabase

### Status
Accepted

### Context
We require multi-tenancy, authentication, file storage, and real-time database capabilities with low management overhead.

### Decision
Use **Supabase** (PostgreSQL + PostgREST + GoTrue) as the platform adapter. All package database operations interact with Supabase client bindings, using Row-Level Security (RLS) to enforce isolation.

### Consequences
- **Pros**: High-speed development, built-in multi-tenant isolation through Postgres policies, seamless authentication, and serverless background event triggers.
- **Cons**: Coupling to PostgreSQL schema conventions. Solved by placing repository boundaries in `@saas/database`.

---

## ADR-003: Modular Architecture (Core + Plugins)

### Status
Accepted

### Context
To support multiple community variants (e.g., Masonic Directory, Business Directory, Event Portals) without rebuilding the codebase, we need runtime and compile-time extensibility.

### Decision
Build the application around a minimalist **Core Kernel** containing:
1. A **DI Container** for service resolution.
2. An **Event Bus** for asynchronous plugin communication.
3. A **Plugin Registry** that loads modules dynamically and exposes extension hooks.

Plugins must never import other plugins directly. They interact through contracts defined in Core or events on the Event Bus.

### Consequences
- **Pros**: High modularity. Entire plugins can be toggled on/off on a per-tenant basis.
- **Cons**: Overhead in writing interface contracts. Communication is asynchronous, requiring event-driven logic.

---

## ADR-004: Relocate Authentication & RBAC to Core

### Status
Accepted (Sprint 0 Refinement)

### Context
Originally, Auth was a plugin (`plugins/auth`). However, Auth defines the base security context of the system. Without an active user identity and a resolved tenant, the platform cannot determine which plugins are enabled, what routes are accessible, or who is performing an action.

### Decision
Move all authentication, session management, Role-Based Access Control (RBAC), and user profile capabilities directly into `@saas/core` as native platform services. Remove `plugins/auth`.

### Consequences
- **Pros**: Simplifies bootstrap order (Auth and Tenant resolution execute before plugins initialize). Centralizes security policies.
- **Cons**: Core is slightly larger, but cleanly decoupled since it relies on abstract storage/auth adapters.

---

## ADR-005: Relocate Billing and Subscriptions to Core

### Status
Accepted (Sprint 0 Refinement)

### Context
Billing and monetization affect multiple plugins. For example, the `business-directory` plugin restricts premium listings, and the `referral` plugin calculates commissions based on paid invoices. A plugin-based billing module creates circular dependencies.

### Decision
Move billing, subscription management, invoices, and webhooks to the platform Core. Plugins query the core billing contract to check tenant limits or trigger payments.

### Consequences
- **Pros**: Zero circular dependencies between business plugins and billing. All plugins can query standard limits via the core context.
- **Cons**: Core must handle payment providers (like Stripe or PIX) or delegate them through adapter patterns.

---

## ADR-006: Global Command Palette Service in Core

### Status
Accepted

### Context
As the SaaS platform scales with many custom plugins, navigability and user discoverability of features can degrade. A centralized command search interface increases administrator productivity.

### Decision
Implement a core **Command Palette Service** in `@saas/core`. This service allows plugins to dynamically register actions (e.g. "Cadastrar Empresa", "Nova Loja Maçônica", "Importar Excel") during their initialization. The host applications (Web and Mobile shells) consume the palette service to display a modal popup (triggered via Ctrl+K).

### Consequences
- **Pros**: Uniform UX, decoupled action registration, easy search access to deep links or dialog triggers across all plugins.
- **Cons**: Commands must be registered dynamically with correct contexts (permissions, tenant constraints).

---

## ADR-007: Feature Flags & Config System (Hybrid Model)

### Status
Accepted

### Context
We need feature flagging to enable/disable plugins and granular features per tenant. Some settings are static default configurations, while others can be overridden by individual tenants or master admins.

### Decision
Adopt a **hybrid configuration pattern** via `@saas/config` and the Core database schema:
- Default parameters, menu layouts, theme variables, and global flags are defined in compile-time code (`@saas/config`).
- Tenant-specific feature flags and configuration values are loaded dynamically from database tables (`tenant_settings` and `plugin_settings`) and override the static defaults at runtime.

### Consequences
- **Pros**: High performance (static defaults prevent redundant DB reads) combined with absolute runtime flexibility.
- **Cons**: Requires a clean merging strategy in the core context layer.

---

## ADR-008: Schema Registry for Plugins

### Status
Accepted

### Context
To build a highly productive platform for community variations, plugins need a standardized way to define their data entities, validations, forms, and permission parameters. Doing so dynamically enables the Core to automate repetitive tasks like generating forms, Excel imports, REST CRUD endpoints, and schemas without manual plumbing.

### Decision
Implement a **Schema Registry** in `@saas/core`. Plugins declare their entity schemas, validation constraints (using a JSON-schema or Zod-like metadata format), form mappings, and field-level permissions in their `plugin.json` or register them programmatically during initialization. The Core parses these schemas to generate generic UI configurations, validation engines, and import/export column mappings.

### Consequences
- **Pros**: Drastically reduces boilerplate code across plugins. Standardizes CRUD generation, Excel imports (`@saas/importer`), and schema validation.
- **Cons**: Schema descriptors must be sufficiently expressive to cover custom layouts, requiring a robust parsing and generation engine in the UI/Core layers.

---

## ADR-009: Background Jobs Strategy Pattern

### Status
Accepted

### Context
We need a task queue system to process background tasks (e.g. renewals, notifications, imports). While we start with a PostgreSQL/Supabase-backed queue table to avoid early-stage infrastructure complexity, we must be able to switch to more scalable solutions (like pg-boss, BullMQ, or RabbitMQ) without changes to our business services or plugins.

### Decision
Define a core interface `JobQueueProvider` (implementing the Strategy Pattern) inside `@saas/core`. The package `@saas/jobs` acts as the execution wrapper, implementing the concrete database-backed runner. Any enqueue actions use `IQueueService` resolved through the DI container.

### Consequences
- **Pros**: Decoupled task queue architecture. Swapping background job backends is simple and code-neutral.
- **Cons**: Requires mapping complex features (retries, delay timers) into abstract common parameters.

---

## ADR-010: Centralized Analytics Event Logging

### Status
Accepted

### Context
Plugins need to track metrics (e.g. business views, clicks, payments, upgrades) to feed telemetry systems or trigger commissions. Direct database writes from plugins violate encapsulation and bypass unified analytics formatting.

### Decision
Establish a dedicated `@saas/analytics` workspace package. Plugins emit event logs by publishing events or calling a centralized analytics client. The core analytics package captures, formats, and publishes these logs to storage or external telemetry integrations.

### Consequences
- **Pros**: Clean event encapsulation. Plugins remain oblivious to the telemetry target. Event formats are unified.
- **Cons**: High volumes of events require buffer structures to avoid overloading database/network connections.

---

## ADR-011: Core Entity Obliviousness (Zero Plugin Domain Coupling)

### Status
Accepted

### Context
To prevent `@saas/core` from becoming coupled to specific niche features (like masonic directories, real estate listings, or business guides), it must not contain domain-specific entities. Doing so would force Core redeployments for every new plugin business rule.

### Decision
The Core will never contain or import domain-specific entities or classes (e.g., `Empresa`, `Loja`, `Evento`, `Produto`, `Documento`). Instead, the Core operates strictly on abstract system interfaces and registry types:
- `Entity` & `Schema` (Metadata describing tables, properties, and constraints)
- `Repository` (Generic data access operations)
- `Widget` & `DashboardCard` (UI slot descriptors)
- `Command` & `Menu` (Command palette and navigation entries)
- `SearchProvider` (Generic search delegates)
- `ImportProvider` & `ExportProvider` (Generic data formatting streams)

Plugins specialize these abstractions. The Core interacts with them solely via registry lookup patterns.

### Consequences
- **Pros**: The Core remains 100% generic, reusable, and stable. Niche plugins can be developed and registered without touching Core source code.
- **Cons**: Requires plugins to declare robust metadata so that the Core can build dynamic generic UIs and CRUD pipelines without hardcoded logic.

---

## ADR-012: Tenant Feature Marketplace

### Status
Accepted

### Context
We need a multi-tenant capability where different tenants select different plugins/modules and pay for them.

### Decision
Each tenant can dynamically enable or disable modules. The configuration overrides system (`tenant_configs`) and middleware pipeline check this metadata to render pages, widgets, and routes conditionally.

---

## ADR-013: Licensing Engine

### Status
Accepted

### Context
We need to decouple subscription charging (Billing) from application access checks (Licensing).

### Decision
Implement a core **Licensing Engine** in `@saas/core`. This engine is the sole source of truth for resolved tenant permissions, module statuses, and limits (e.g. storage size, user counts, business directories). The Billing service updates the license, but the application query checks the Licensing Engine.

---

## ADR-014: Domain Event Store

### Status
Accepted

### Context
To build auditing, triggers, integrations, and webhooks cleanly, we must capture a chronological log of all mutation actions (events) rather than just dispatching in-memory callbacks.

### Decision
Add a **Domain Event Store** to the core database schema and kernel. All significant mutations write an immutable record to this store, which feeds downstream processes like analytics, audit trails, and the automation engine.

---

## ADR-015: Automation Engine

### Status
Accepted

### Context
We want Zapier-like workflow capabilities where a business event (e.g. "Business Approved") triggers multi-step outcomes (e.g. email, push notification, webhook post) without manual coding.

### Decision
Build a lightweight **Automation Engine** inside the core context. The engine listens to the Domain Event Store and runs execution pipelines defined by simple JSON config graphs.

---

## ADR-016: Module Marketplace (App Store Manifest)

### Status
Accepted

### Context
For plugins to be sold or listed in a centralized marketplace, their manifests must be rich and self-contained.

### Decision
Expand the `plugin.json` structure to require details like author, license, metadata assets, along with their interface mappings. This manifest acts as the standardized packaging blueprint.

---

## ADR-017: API First Architecture

### Status
Accepted

### Context
We must support future mobile apps, custom frontends, and integrations.

### Decision
Every plugin must expose its logic via standard REST, RPC, or GraphQL interfaces. No direct UI-to-DB coupling is permitted; all data flows through APIs.

---

## ADR-018: Offline First Infrastructure

### Status
Accepted

### Context
Mobile apps wrapping our web codebase (via Capacitor) must stay functional during connectivity losses.

### Decision
Design core interfaces to support offline jobs, conflict resolution patterns, sync queues, and caching schemas. The core shell prepares database layers using localized cache adapters.

---

## ADR-019: Observability Isolation

### Status
Accepted

### Context
Plugins and core services shouldn't lock themselves to specific tracking providers (Sentry, OpenTelemetry, Prometheus).

### Decision
Create a dedicated `@saas/observability` package. All kernel packages write metrics, traces, performance profiling, and error reporting to this isolated module, which delegates execution to the configured observability stack.

---

## ADR-020: Public SDK

### Status
Accepted

### Context
External developers need a simple interface to log in, search, query events, and list plugins without understanding core internal API schemas.

### Decision
Publish a dedicated `@saas/sdk` package acting as the official interface wrapper for community platform integrations.

---

## ADR-021: Backward Compatibility & SemVer Protection

### Status
Accepted

### Context
To maintain a stable platform ecosystem, updating `@saas/core` or adding features must never break existing installed plugins.

### Decision
- All workspace packages and plugins adhere strictly to Semantic Versioning (SemVer).
- Plugins must declare their compatible core range in `plugin.json` (e.g. `"coreVersion": "^1.0.0"`), which the Plugin Registry automatically validates during bootstrap.
- When changing public core contracts, developers must:
  1. Add a new versioned interface/method.
  2. Maintain the previous interface/method.
  3. Mark the previous code as `@deprecated`.
  4. Only remove deprecated interfaces in the next major version release.

---

## ADR-022: Public Contracts Only

### Status
Accepted

### Context
Allowing plugins to import internal Core files (e.g. `src/services/auth/...`) causes strict coupling and breaks compiler optimization gates when the Core changes internally.

### Decision
Plugins can only import from the public core entry point `@saas/core`, never internal paths like `@saas/core/src/...`. The build pipelines and linters must enforce this strictly.

---

## ADR-023: Zero Business Logic in Infrastructure (Infrastructure Purity)

### Status
Accepted

### Context
The core infrastructure layers (e.g. `@saas/core`, `@saas/jobs`, `@saas/importer`) must remain reusable across completely different industries/niches.

### Decision
Infrastructure packages must remain domain-oblivious. They can never know domain entities like `Empresa`, `Loja`, `Potência`, `Evento`, or `Produto`. They only interact with abstract patterns: `Entity`, `Repository`, `Command`, `Query`, `Event`, `Schema`, `Permission`, and `Metadata`.

---

## ADR-024: Extensibility First

### Status
Accepted

### Context
When introducing a new feature, developers often resort to hacking the Core, which results in core bloat and high regression risk.

### Decision
Whenever a new feature is requested, developers must first evaluate: "Can this be solved using an existing Core registry?" If yes, it must be implemented by registering a custom provider or schema, rather than editing `@saas/core`.

---

## ADR-025: Core Quality Gate

### Status
Accepted

### Context
Because the Core is shared across all plugins and tenants, a bug in `@saas/core` can degrade the entire application ecosystem.

### Decision
Before any merge into the Core branch occurs, the CI pipeline must validate:
1. Unit and integration tests pass successfully.
2. Typecheck (`tsc --noEmit`) passes cleanly.
3. Linters are free of errors.
4. Architecture import rules (dependency directions) are verified.
5. Minimum test coverage thresholds are met.
6. Documentation and ADR records are up-to-date.
