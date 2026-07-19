# CivicOS v1.0 Migration Guide

Welcome to **CivicOS Kernel v1.0.0** (Platform Freeze).

This document outlines the architectural boundaries and migration steps for plugin developers adapting to the officially frozen API.

## 1. Import Rules

**Old Way:**
```typescript
import { PluginRegistry } from '@saas/core/src/plugin-registry';
```

**New Way:**
```typescript
import { definePlugin } from '@saas/sdk';
```

**Rule:** You are strictly forbidden from importing anything from `@saas/core/src/*`. All plugin definitions must go through `@saas/sdk`. ESLint will now aggressively block cross-imports and internal core imports.

## 2. Kernel Facades

The internal `Kernel` now fully encapsulates all its registries. You can no longer access `registries` directly.

Instead, when interacting with the Kernel at runtime, use the strictly typed Facades:

```typescript
const os = await Kernel.boot({ coreVersion: '1.0.0', pluginsDir: '...' });

// Presentation Queries
const snapshot = os.presentation().snapshot(context);

// Health & Diagnostics
const health = await os.health();
const diag = await os.diagnostics();

// Event Bus
os.events().emit('user.created', { id: '123' });
```

## 3. Database Agnosticism

The CivicOS Kernel **no longer knows about your Database**.

If you were importing `supabase`, `prisma`, or `drizzle` anywhere near `@saas/core`, you must move those implementations to `packages/persistence/*` (e.g. `packages/persistence/supabase`). 

The Core will only resolve interfaces via Dependency Injection:

```typescript
import { COMPANY_REPOSITORY } from '@saas/core/tokens';

const repo = container.resolve(COMPANY_REPOSITORY);
const company = await repo.findById(id);
```

The DI Container itself is configured *before* boot in your application initialization layer (e.g., Next.js `instrumentation.ts` or Node server entry point).

## 4. Strict Typing

* `any` is strictly prohibited (`@typescript-eslint/no-explicit-any`).
* `@ts-ignore` is strictly prohibited (`@typescript-eslint/ban-ts-comment`).
* Floating Promises are prohibited. Await your promises (`@typescript-eslint/no-floating-promises`).
* Switch statements over unions must be exhaustive (`@typescript-eslint/switch-exhaustiveness-check`).

These constraints are non-negotiable and enforced by `eslint.config.mjs` at the CI level.
