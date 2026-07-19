// ============================================================================
// Paginated Type — Shared
// ============================================================================
// Standardized paginated response wrapper used across all plugins.
// ============================================================================

export interface Paginated<T> {
  /** Items for the current page. */
  readonly data: readonly T[];
  /** Total count of items across all pages. */
  readonly total: number;
  /** Current page number (1-indexed). */
  readonly page: number;
  /** Number of items per page. */
  readonly pageSize: number;
  /** Total number of pages. */
  readonly totalPages: number;
  /** Whether there is a next page. */
  readonly hasNext: boolean;
  /** Whether there is a previous page. */
  readonly hasPrevious: boolean;
}

/** Input for paginated queries. */
export interface PaginationInput {
  /** Page number (1-indexed). Defaults to 1. */
  readonly page?: number;
  /** Items per page. Defaults to 20. */
  readonly pageSize?: number;
}

/** Create a Paginated response from raw data. */
export function paginate<T>(
  data: readonly T[],
  total: number,
  input: PaginationInput = {},
): Paginated<T> {
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
export function emptyPage<T>(input: PaginationInput = {}): Paginated<T> {
  return paginate<T>([], 0, input);
}
