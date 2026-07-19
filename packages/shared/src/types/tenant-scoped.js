// ============================================================================
// Tenant-Scoped Type — Shared
// ============================================================================
// Wrapper type that guarantees a `tenant_id` is present on any entity.
// Used to enforce multi-tenancy at the type level.
// ============================================================================
/**
 * Utility to add tenantId to an object at runtime.
 */
export function withTenantId(obj, tenantId) {
    return { ...obj, tenantId };
}
//# sourceMappingURL=tenant-scoped.js.map