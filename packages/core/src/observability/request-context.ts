// ============================================================================
// Request Context Interface — CivicOS Observability
// ============================================================================

export interface RequestMetadata {
  readonly correlationId: string;
  readonly tenantId?: string;
  readonly userId?: string;
  readonly path?: string;
  readonly method?: string;
}

export interface RequestContext {
  /**
   * Retrieves the current request context metadata.
   * Throws an error or returns undefined if outside a request lifecycle.
   */
  get(): RequestMetadata | undefined;

  /**
   * Runs a callback within a specific request context.
   */
  run<T>(metadata: RequestMetadata, callback: () => T | Promise<T>): Promise<T>;
}
