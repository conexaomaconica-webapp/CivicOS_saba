
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseClient } from './database-client';

export class SupabaseDatabaseClient implements DatabaseClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: SupabaseClient<any, "public", any>;

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.client = createClient(supabaseUrl, supabaseAnonKey);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  query<T>(_sql: string, _params: unknown[]): Promise<T[]> {
    // Note: To execute raw SQL with supabase-js requires RPC or GraphQL.
    // For this demonstration/adapter we are using standard supabase operations
    // where possible, so raw query might be limited without Drizzle.
    return Promise.resolve([] as T[]);
  }

  async insert<T>(table: string, data: Partial<T>): Promise<T> {
    const res = await this.client
      .from(table)
      .insert(data as never)
      .select()
      .single();

    if (res.error) {
      throw new Error(`Insert error: ${res.error.message}`);
    }

    return res.data as T;
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
    const res = await this.client
      .from(table)
      .update(data as never)
      .eq('id', id)
      .select()
      .single();

    if (res.error) {
      throw new Error(`Update error: ${res.error.message}`);
    }

    return res.data as T;
  }

  async delete(table: string, id: string): Promise<boolean> {
    const res = await this.client
      .from(table)
      .delete()
      .eq('id', id);

    if (res.error) {
      throw new Error(`Delete error: ${res.error.message}`);
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
