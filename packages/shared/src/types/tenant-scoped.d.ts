/**
 * Make any type tenant-scoped by requiring a `tenantId`.
 *
 * Usage:
 * ```ts
 * type ScopedInvoice = TenantScoped<Invoice>;
 * // { tenantId: string } & Invoice
 * ```
 */
export type TenantScoped<T> = T & {
    readonly tenantId: string;
};
/**
 * Input type for creating tenant-scoped entities.
 * The `tenantId` is injected by the system, not by the client.
 */
export type WithTenant<T> = Omit<T, 'tenantId'> & {
    readonly tenantId: string;
};
/**
 * Strip tenant information from a type (for API responses that
 * don't need to leak tenant IDs).
 */
export type WithoutTenant<T> = Omit<T, 'tenantId'>;
/**
 * Utility to add tenantId to an object at runtime.
 */
export declare function withTenantId<T extends object>(obj: T, tenantId: string): TenantScoped<T>;
//# sourceMappingURL=tenant-scoped.d.ts.map