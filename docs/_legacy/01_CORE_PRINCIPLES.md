# Core Principles & Architectural Laws

These core principles must never be violated. They protect the codebase from turning into an unmaintainable monolith.

---

## Principle 1: Core Containment & Isolation

- **No Business Logic in Core**: The `@saas/core` package serves as the kernel of the system. It handles lifecycle, DI, event routing, middleware compilation, and contract definitions. It must not contain rules specific to directories, scheduling, or masonic operations.
- **Infrastructure Services**: General infrastructure services like auth (identity lookup), billing (payments processing/PIX integration), and storage reside in the Core but are exposed via abstract contracts. Their concrete implementations reside in `@saas/database` or infrastructure modules.

---

## Principle 2: Strict Plugin Isolation (Loose Coupling)

- **No Direct Imports**: Plugins must **never** import modules from other plugins. Doing so creates dependency cycles and makes it impossible to disable one plugin without breaking another.
  - *Violating import*: `import { BusinessModel } from '../../plugin-business-directory'` ❌
- **Contract-Based Interaction**: If Plugin A needs to request information from Plugin B, it must do so via a core service contract (e.g., resolving a registered service from the DI container) or by firing a typed event.
- **Event-Driven Communication**: Long-running or side-effect heavy operations must communicate asynchronously via the `EventBus`. For instance, when a subscription is paid, the core emits `billing.subscription.paid`, and the relevant plugins react.

---

## Principle 3: Reusability Hierarchy

- If a feature is used by **more than one** plugin, it should be promoted to a shared package:
  - Configuration details & theme variables: `@saas/config`
  - SQL repository patterns: `@saas/database`
  - CSV/Excel imports: `@saas/importer`
  - Background runners: `@saas/jobs`
  - Domain helpers and monads (like `Result`): `@saas/shared`

---

## Principle 4: Multi-Tenant Compliance

- **No Cross-Tenant Queries**: All database queries must be filtered by a `tenant_id` column.
- **Tenant Context Injection**: Plugins must use the `TenantContext` resolved by the Core to access settings, branding, and enabled features. They must never query raw request headers or subdomains directly.
