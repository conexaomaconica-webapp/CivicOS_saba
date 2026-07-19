// ============================================================================
// Unit Of Work & Transaction Manager — CivicOS Transactions
// ============================================================================

export interface UnitOfWork {
  /**
   * Executes a callback within a transactional boundary.
   * If the callback throws, the transaction is rolled back.
   * If it succeeds, the transaction is committed.
   */
  execute<T>(callback: () => Promise<T>): Promise<T>;
}

export interface TransactionManager {
  /**
   * Begins a new Unit of Work for the current request context.
   */
  begin(): Promise<UnitOfWork>;
}
