import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load variables from .env.local in the current dir or workspace root
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '../../.env.local') });

export function getE2EEnv() {
  const required = [
    'E2E_BASE_URL',
    'E2E_SUPABASE_URL',
    'E2E_SUPABASE_ANON_KEY',
    'E2E_SUPABASE_SERVICE_ROLE_KEY',
    'E2E_ADMIN_EMAIL',
    'E2E_ADMIN_PASSWORD',
  ] as const;

  console.log('DEBUG: E2E env vars found ->', Object.keys(process.env).filter(k => k.startsWith('E2E_')));

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required E2E environment variable: ${key}`);
    }
  }

  const baseUrl = process.env.E2E_BASE_URL!;
  const supabaseUrl = process.env.E2E_SUPABASE_URL!;

  // Protect against testing against production
  if (baseUrl.includes('conexaomaconica.com.br') || supabaseUrl.includes('production')) {
    throw new Error('E2E tests must NOT run against production endpoints.');
  }

  return {
    baseUrl,
    supabaseUrl,
    supabaseAnonKey: process.env.E2E_SUPABASE_ANON_KEY!,
    supabaseServiceRoleKey: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!,
    adminEmail: process.env.E2E_ADMIN_EMAIL!,
    adminPassword: process.env.E2E_ADMIN_PASSWORD!,
  };
}

export function assertDestructiveOperationsAllowed() {
  if (process.env.E2E_ALLOW_DESTRUCTIVE !== 'true') {
    throw new Error('Destructive E2E operations are disabled. Set E2E_ALLOW_DESTRUCTIVE=true');
  }
}
