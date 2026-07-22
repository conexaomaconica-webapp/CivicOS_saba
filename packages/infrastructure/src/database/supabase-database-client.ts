import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseClient } from './database-client';

export class SupabaseDatabaseClient implements DatabaseClient {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.client = createClient(supabaseUrl, supabaseAnonKey);
  }

  async query<T>(_sql: string, _params: any[]): Promise<T[]> {
    // Note: To execute raw SQL with supabase-js requires RPC or GraphQL.
    // For this demonstration/adapter we are using standard supabase operations
    // where possible, so raw query might be limited without Drizzle.
    return [] as T[];
  }

  async insert<T>(table: string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await this.client
      .from(table)
      .insert(data as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Insert error: ${error.message}`);
    }

    return result as T;
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await this.client
      .from(table)
      .update(data as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Update error: ${error.message}`);
    }

    return result as T;
  }

  async delete(table: string, id: string): Promise<boolean> {
    const { error } = await this.client
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Delete error: ${error.message}`);
    }

    return true;
  }

  async transaction<T>(callback: (tx: DatabaseClient) => Promise<T>): Promise<T> {
    // Supabase JS doesn't support client-side transactions like Prisma. 
    // Usually achieved via RPC. 
    // We will just execute the callback directly for now.
    return callback(this);
  }
}
