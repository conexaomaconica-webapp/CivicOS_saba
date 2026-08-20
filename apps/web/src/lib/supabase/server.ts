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
  if (process.env.NEXT_PUBLIC_TENANT_ID) {
    return process.env.NEXT_PUBLIC_TENANT_ID;
  }
  
  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.from('tenants').select('id').limit(1).single();
    if (data && data.id) {
      return data.id;
    }
  } catch (e) {
    console.error('[TenantResolver] Erro ao buscar tenant no banco:', e);
  }
  
  // UUID válido de fallback (embora vá falhar restrição de chave estrangeira se não existir)
  return '00000000-0000-0000-0000-000000000000';
}

export { createServerSideClient as createClient };

