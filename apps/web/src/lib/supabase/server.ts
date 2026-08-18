import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { AppDatabase } from '@/types/database-extensions';

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
}

function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';
}

export async function createServerSideClient() {
  const cookieStore = await cookies();
  
  return createServerClient<AppDatabase>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if middleware handles refreshing user sessions.
        }
      },
    },
  });
}

export async function resolveTenantIdServer(): Promise<string> {
  return process.env.NEXT_PUBLIC_TENANT_ID || 'default-tenant-id';
}

export { createServerSideClient as createClient };

