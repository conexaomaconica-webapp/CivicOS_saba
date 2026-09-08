/**
 * Test helper: provides a fully chainable mock Supabase client
 * that can be used by vi.mock('@/lib/supabase/server') in test files.
 *
 * USAGE in test files:
 *
 *   import { vi } from 'vitest';
 *   import { mockSupabaseServer, setMockUser, setMockAdmin } from './helpers/mock-supabase-server';
 *   vi.mock('next/headers', () => ({ cookies: () => Promise.resolve({ get: () => undefined, getAll: () => [], set: () => {}, delete: () => {} }) }));
 *   vi.mock('@/lib/supabase/server', () => mockSupabaseServer);
 *
 *   // In a beforeEach or test body:
 *   setMockAdmin();  // authenticated admin user
 *   setMockUser();   // authenticated non-admin user
 *   setMockUser(null); // unauthenticated
 */

// Mutable state for the mock user
let _mockUser: { id: string; email: string } | null = {
  id: '00000000-0000-0000-0000-000000000099',
  email: 'admin@conexaomaconica.com.br',
};
let _isAdmin = true;

// Custom query results that tests can set
let _queryResults: Record<string, any> = {};

export function setMockUser(user?: { id: string; email: string } | null) {
  _mockUser = user === undefined
    ? { id: '00000000-0000-0000-0000-000000000099', email: 'user@conexaomaconica.com.br' }
    : user;
  _isAdmin = false;
}

export function setMockAdmin(user?: { id: string; email: string }) {
  _mockUser = user || { id: '00000000-0000-0000-0000-000000000099', email: 'admin@conexaomaconica.com.br' };
  _isAdmin = true;
}

export function setMockQueryResult(tableName: string, result: any) {
  _queryResults[tableName] = result;
}

export function resetMocks() {
  _mockUser = { id: '00000000-0000-0000-0000-000000000099', email: 'admin@conexaomaconica.com.br' };
  _isAdmin = true;
  _queryResults = {};
}

function createChainableQuery(tableName?: string) {
  const defaultResult = tableName && _queryResults[tableName]
    ? _queryResults[tableName]
    : { data: [], error: null };

  const chain: any = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    upsert: () => chain,
    delete: () => chain,
    eq: () => chain,
    neq: () => chain,
    gt: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    like: () => chain,
    ilike: () => chain,
    is: () => chain,
    in: () => chain,
    contains: () => chain,
    containedBy: () => chain,
    filter: () => chain,
    or: () => chain,
    not: () => chain,
    match: () => chain,
    order: () => chain,
    limit: () => chain,
    range: () => chain,
    single: () => Promise.resolve(defaultResult),
    maybeSingle: () => Promise.resolve(defaultResult),
    then: (resolve: any) => resolve(defaultResult),
  };
  return chain;
}

function createMockSupabaseClient() {
  return {
    auth: {
      getUser: () => Promise.resolve({
        data: { user: _mockUser },
        error: _mockUser ? null : { message: 'Not authenticated' },
      }),
      getSession: () => Promise.resolve({
        data: { session: _mockUser ? { user: _mockUser, access_token: 'mock-token' } : null },
        error: null,
      }),
    },
    from: (tableName: string) => createChainableQuery(tableName),
    rpc: (fnName: string, _params?: any) => {
      if (fnName === 'has_platform_admin_access') {
        return Promise.resolve({ data: _isAdmin, error: null });
      }
      // Default: return empty success
      return Promise.resolve({ data: null, error: null });
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: { path: 'mock/path.jpg' }, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://mock-storage.test/${path}` } }),
        list: () => Promise.resolve({ data: [], error: null }),
        remove: () => Promise.resolve({ data: [], error: null }),
      }),
    },
  };
}

/**
 * Use this as the factory for vi.mock('@/lib/supabase/server', () => mockSupabaseServer)
 */
export const mockSupabaseServer = {
  createServerSideClient: () => Promise.resolve(createMockSupabaseClient()),
  createClient: () => Promise.resolve(createMockSupabaseClient()),
  resolveTenantIdServer: () => Promise.resolve('00000000-0000-0000-0000-000000000000'),
};
