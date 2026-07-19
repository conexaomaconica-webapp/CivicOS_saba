# AI Development Rules

These rules direct how AI coding assistants (such as Antigravity) must interact with this repository.

---

## 1. Code Integrity & Reuse

- **Do Not Duplicate Code**: Before writing utility functions, check `@saas/shared`. Before writing configuration elements, check `@saas/config`.
- **Preserve Documentation**: Do not remove comments, docstrings, or inline type annotations unless explicitly requested.
- **Maintain TypeScript Strictness**: Avoid the use of `any` types. Utilize proper generics and type definitions.

---

## 2. Database & Migrations

- **Versioned Migrations**: Every schema modification must be placed in a versioned SQL file inside `supabase/migrations/` (e.g. `002_core_tables.sql`).
- **Never Modify Migrations in Place**: Once a migration has been applied or approved, write a *new* migration to alter it. Do not rewrite existing migration scripts.
- **Enforce RLS**: All table definitions must include a `tenant_id` column (where applicable) and an active Row-Level Security policy.

---

## 3. Core Constraints

- **Modifying Core Contracts**: Prior to changing files inside `packages/core/src/contracts/`, list the plugins or apps that import them and analyze compiler impacts.
- **DI Service Registrations**: Never bind concrete classes directly. Always map tokens to their abstract contract representation so they can be mocked or swapped out easily.

---

## 4. Pre-Implementation Self-Check

Before implementing any feature or modifying any file, the AI developer must internally answer these six validation questions:

1. **Does this functionality really belong in the Core?** (Core must remain domain-oblivious (ADR-023) and generic).
2. **Can it be implemented as a Plugin?** (Business features must reside in plugins).
3. **Can it be implemented by registering a custom Provider?** (Swappable parts should be resolved through dependency injection).
4. **Is there an existing Registry that already solves this problem?** (If a registry like Search, Widget, Settings, or Command exists, use it instead of modifying the Core (ADR-024)).
5. **Am I duplicating any existing functionality?** (Always check `@saas/shared` and existing core registries).
6. **Does this implementation break any approved ADR?** (Ensure strict compliance with compatibility (ADR-021), dependency boundaries, and public API imports (ADR-022)).

If any answer indicates an architectural deviation, halt implementation immediately, alert the user, and propose an alternative strategy.
