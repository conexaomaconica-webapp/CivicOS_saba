import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Gate 1B (Módulo Comercial): verificações ESTÁTICAS de autorização (migrations 234-237 e área do representante).
 * Complementam scripts/test-migration-234-237-commercial-authz.mjs (PostgreSQL real via PGlite).
 */
const ROOT = path.resolve(__dirname, '../../..');
const mig = (f: string) => fs.readFileSync(path.join(ROOT, 'supabase/migrations', f), 'utf8');
const app = (f: string) => fs.readFileSync(path.join(ROOT, 'apps/web/src', f), 'utf8');
const strip = (t: string) => t.replace(/--.*$/gm, '');

const FILES = [
  '234_commercial_authorization.sql',
  '235_commercial_rls_policies.sql',
  '236_commercial_storage_policies.sql',
  '237_commercial_authorization_audit.sql',
];

describe('Módulo comercial · Gate 1B (estático)', () => {
  it('migrations e rollbacks existem; rollbacks ficam fora de supabase/migrations', () => {
    for (const f of FILES) expect(fs.existsSync(path.join(ROOT, 'supabase/migrations', f)), f).toBe(true);
    for (const n of [234, 235, 236]) {
      expect(fs.existsSync(path.join(ROOT, `supabase/rollbacks/commercial/${n}_rollback.sql`)), `${n}`).toBe(true);
    }
  });

  it('authenticated recebe SOMENTE leitura: nenhuma concessão de escrita/ALL e nenhuma política de escrita', () => {
    for (const f of FILES) {
      const text = strip(mig(f));
      const grants = [...text.matchAll(/\bGRANT\b[^;]*;/gi)].map((m) => m[0]);
      for (const g of grants) {
        if (!/\bauthenticated\b/.test(g)) continue;
        expect(g, `${f}: ${g}`).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER|ALL)\b/i);
      }
      expect(text, f).not.toMatch(/FOR\s+(INSERT|UPDATE|DELETE|ALL)\s+TO\s+authenticated/i);
    }
  });

  it('toda política criada é FOR SELECT TO authenticated; anon nunca é concedido', () => {
    const policies = [...strip(mig('235_commercial_rls_policies.sql') + mig('236_commercial_storage_policies.sql')).matchAll(/CREATE POLICY[\s\S]*?;/g)].map((m) => m[0]);
    expect(policies.length).toBeGreaterThanOrEqual(15);
    for (const p of policies) expect(p).toMatch(/FOR SELECT TO authenticated/);
    for (const f of FILES) {
      const text = strip(mig(f));
      for (const g of [...text.matchAll(/\bGRANT\b[^;]*;/gi)].map((m) => m[0])) {
        expect(g.split(/\bTO\b/)[1] ?? '', `${f}: ${g}`).not.toMatch(/\banon\b|\bPUBLIC\b/);
      }
    }
  });

  it('administrador de plataforma NÃO entra automaticamente: autorização não usa has_platform_admin_access nem profiles.role de admin', () => {
    const text = strip(mig('234_commercial_authorization.sql') + mig('235_commercial_rls_policies.sql') + mig('236_commercial_storage_policies.sql'));
    expect(text).not.toMatch(/has_platform_admin_access|has_tenant_admin_access|_is_platform_admin/);
    expect(text).not.toMatch(/'(admin|superadmin|platform_admin|socio_admin|finance)'/);
    // única exceção declarada: master (recuperação)
    expect(text).toMatch(/has_global_platform_role\('master'\)/);
  });

  it('funções SECURITY DEFINER fixam search_path e não são executáveis por anon', () => {
    const text = strip(mig('234_commercial_authorization.sql'));
    const defs = [...text.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)[\s\S]*?\$\$;/g)].filter((m) => /SECURITY DEFINER/.test(m[0]));
    expect(defs.length).toBeGreaterThanOrEqual(6);
    for (const d of defs) expect(d[0], d[1]).toMatch(/SET search_path = pg_catalog, pg_temp/);
    expect(text).toMatch(/REVOKE ALL ON FUNCTION public\.%s FROM PUBLIC, anon/);
  });

  it('colunas sensíveis do representante ficam fora da concessão por coluna', () => {
    const grant = strip(mig('235_commercial_rls_policies.sql')).match(/GRANT SELECT \(([\s\S]*?)\) ON public\.commercial_representatives/)![1]!;
    for (const col of ['document_hash', 'document_encrypted', 'pix_key_encrypted', 'tax_profile', 'created_by']) {
      expect(grant, col).not.toMatch(new RegExp(`\\b${col}\\b`));
    }
  });

  it('área do representante: 404 sem módulo, noindex, cliente do usuário (sem chave de serviço)', () => {
    const layout = app('app/representante/layout.tsx');
    expect(layout).toMatch(/notFound\(\)/);
    expect(layout).toMatch(/robots:\s*\{\s*index:\s*false/);
    for (const f of ['app/representante/layout.tsx', 'app/representante/page.tsx', 'app/representante/comissoes/page.tsx']) {
      const text = app(f);
      expect(text, f).not.toMatch(/service-role|SERVICE_ROLE|createServiceRoleClient/);
    }
    // commercial-auth: a chave de serviço aparece SOMENTE no vínculo do convite (e-mail verificado)
    const auth = app('lib/commercial/commercial-auth.ts');
    expect((auth.match(/createServiceRoleClient\(\)/g) ?? []).length).toBe(1);
    expect(auth).toMatch(/if \(!email \|\| !user\.email_confirmed_at\) return false;/);
    expect(auth).toMatch(/import 'server-only'/);
    expect(app('lib/commercial/commercial-auth.ts')).not.toMatch(/document_hash|document_encrypted|pix_key_encrypted|tax_profile/);
  });

  it('middleware: 404 com módulo desativado (antes de qualquer redirecionamento) e login obrigatório', () => {
    const mw = app('middleware.ts');
    expect(mw).toMatch(/isCommercialAreaPath\(request\.nextUrl\.pathname\) && !isCommercialModuleEnvEnabled\(\)/);
    expect(mw).toMatch(/NextResponse\.rewrite/);
    expect(mw).toMatch(/isRepresentativeRoute\s*\)\s*\{/);
    // a checagem de módulo vem antes da criação do cliente Supabase/autenticação
    expect(mw.indexOf('isCommercialModuleEnvEnabled()')).toBeLessThan(mw.indexOf('createMiddlewareSideClient(request'));
  });

  it('migrations anteriores do módulo (228-233) permanecem inalteradas (git)', async () => {
    const { execSync } = await import('node:child_process');
    let diff = '';
    try {
      diff = execSync('git diff --name-status main -- supabase/migrations', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      return;
    }
    const changed = diff.split('\n').filter(Boolean).filter((l) => !l.startsWith('A\t'));
    expect(changed).toEqual([]);
  });
});
