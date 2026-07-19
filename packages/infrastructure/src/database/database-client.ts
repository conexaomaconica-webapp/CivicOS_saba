// ============================================================================
// Database Client Abstraction
// ============================================================================

export interface DatabaseTransaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface DatabaseClient {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  insert<T>(table: string, data: Partial<T>): Promise<T>;
  update<T>(table: string, id: string, data: Partial<T>): Promise<T>;
  delete(table: string, id: string): Promise<boolean>;
  
  transaction<T>(callback: (tx: DatabaseClient) => Promise<T>): Promise<T>;
}
