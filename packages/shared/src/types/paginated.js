// ============================================================================
// Paginated Type — Shared
// ============================================================================
// Standardized paginated response wrapper used across all plugins.
// ============================================================================
/** Create a Paginated response from raw data. */
export function paginate(data, total, input = {}) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, input.pageSize ?? 20));
    const totalPages = Math.ceil(total / pageSize);
    return {
        data,
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
    };
}
/** Create an empty paginated response. */
export function emptyPage(input = {}) {
    return paginate([], 0, input);
}
//# sourceMappingURL=paginated.js.map