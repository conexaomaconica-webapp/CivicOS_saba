import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Gate 1C (Módulo Comercial): verificações ESTÁTICAS dos serviços e telas.
 * As regras de negócio críticas ficam no banco e são testadas em PostgreSQL real
 * (scripts/test-migration-238-commercial-leads.mjs); aqui se garante a autorização e o isolamento no código.
 */
const ROOT = path.resolve(__dirname, '../../..');
const src = (f: string) => fs.readFileSync(path.join(ROOT, 'apps/web/src', f), 'utf8');
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const STAFF_SERVICES = ['representatives-service.ts', 'access-grants-service.ts', 'attributions-service.ts'];
const ALL_SERVICES = [...STAFF_SERVICES, 'leads-service.ts'];

describe('Módulo comercial · Gate 1C (estático)', () => {
  it('serviços são "use server" e só exportam funções assíncronas (e tipos)', () => {
    for (const f of ALL_SERVICES) {
      const text = strip(src(`lib/commercial/${f}`));
      expect(text.trimStart().startsWith("'use server'"), f).toBe(true);
      const exports = [...text.matchAll(/^export\s+(?!async function|type\s|interface\s)(\w+)/gm)].map((m) => m[1]);
      expect(exports, `${f}: exports não assíncronos`).toEqual([]);
    }
  });

  it('toda ação de equipe autoriza PRIMEIRO por permissão comercial específica (nunca por papel de admin)', () => {
    for (const f of STAFF_SERVICES) {
      const text = strip(src(`lib/commercial/${f}`));
      const actions = [...text.matchAll(/export async function (\w+Action)\b([\s\S]*?)(?=\nexport async function|\s*$)/g)];
      expect(actions.length, f).toBeGreaterThan(0);
      for (const [, name, body] of actions) {
        expect(body, `${f}:${name}`).toMatch(/tryCommercialPermission\('/);
        // autorização antes de qualquer uso da chave de serviço
        expect(body!.indexOf('tryCommercialPermission'), `${f}:${name}`).toBeLessThan(
          body!.includes('requireWriter()') ? body!.indexOf('requireWriter()') : Number.MAX_SAFE_INTEGER,
        );
      }
      expect(text, f).not.toMatch(/has_platform_admin_access|assertPlatformAdminAccess|isPlatformAdminRole/);
    }
  });

  it('ações do representante exigem o contexto de representante ATIVO e conferem a posse do lead', () => {
    const text = strip(src('lib/commercial/leads-service.ts'));
    expect(text).toMatch(/representativeScopeAllows\(ctx\.representative\.status, 'operational'\)/);
    expect(text).toMatch(/\.eq\('representative_id', rep\.representative\.id\)/);
    expect(text).toMatch(/tryCommercialPermission\('leads\.manage'\)/);
    expect(text).toMatch(/tryCommercialPermission\('attributions\.manage'\)/);
  });

  it('operações críticas passam pelas funções atômicas do banco (RPC), não por updates soltos', () => {
    const leads = strip(src('lib/commercial/leads-service.ts'));
    for (const fn of ['commercial_register_lead', 'commercial_log_lead_activity', 'commercial_qualify_lead', 'commercial_convert_lead', 'commercial_expire_stale']) {
      expect(leads, fn).toContain(fn);
    }
    expect(strip(src('lib/commercial/attributions-service.ts'))).toContain('commercial_confirm_attribution');
  });

  it('dados sensíveis são cifrados/hasheados e nunca devolvidos ao navegador', () => {
    const reps = strip(src('lib/commercial/representatives-service.ts'));
    expect(reps).toMatch(/encryptSensitive\(documentDigits\)/);
    expect(reps).toMatch(/hashSensitive\(`doc:\$\{documentDigits\}`\)/);
    const listColumns = reps.match(/REPRESENTATIVE_LIST_COLUMNS =\s*'([^']+)'/)![1]!;
    for (const col of ['document_hash', 'document_encrypted', 'pix_key_encrypted', 'tax_profile']) expect(listColumns, col).not.toContain(col);
    expect(strip(src('lib/commercial/commercial-secrets.ts'))).toMatch(/^import 'server-only'/m);
  });

  it('telas são server components com notFound sem permissão; clientes não importam chave de serviço', () => {
    for (const f of ['app/comercial/layout.tsx', 'app/comercial/page.tsx', 'app/comercial/representantes/page.tsx', 'app/comercial/leads/page.tsx', 'app/comercial/atribuicoes/page.tsx', 'app/comercial/acessos/page.tsx', 'app/representante/leads/page.tsx']) {
      expect(src(f), f).toMatch(/notFound\(\)/);
    }
    for (const f of ['app/comercial/representantes/representatives-client.tsx', 'app/comercial/leads/leads-staff-client.tsx', 'app/comercial/atribuicoes/attributions-client.tsx', 'app/comercial/acessos/access-grants-client.tsx', 'app/representante/leads/my-leads-client.tsx']) {
      const text = src(f);
      expect(text.trimStart().startsWith("'use client'"), f).toBe(true);
      expect(text, f).not.toMatch(/service-role|SERVICE_ROLE|commercial-secrets|commercial-service-base/);
    }
    expect(src('app/comercial/layout.tsx')).toMatch(/robots:\s*\{\s*index:\s*false/);
  });

  it('link de indicação: 404 sem módulo, sempre redireciona ao funil existente, cookie httpOnly e sem alterar o onboarding', () => {
    const route = strip(src('app/r/[code]/route.ts'));
    expect(route).toMatch(/isCommercialModuleEnvEnabled\(\)\)\s*return new NextResponse\(null, \{ status: 404 \}\)/);
    expect(route).toMatch(/NextResponse\.redirect\(new URL\('\/anunciar'/);
    expect(route).toMatch(/httpOnly:\s*true/);
    expect(route).toMatch(/\.eq\('status', 'active'\)/);
    expect(route).not.toMatch(/business_onboarding_tokens|commercial_status|subscriptions|invoices/);
  });

  it('menu do admin: atalho condicional à chave; seções existentes inalteradas', () => {
    const sidebar = src('components/admin/AdminSidebar.tsx');
    expect(sidebar).toMatch(/showCommercial \? \[\.\.\.adminNavSections, commercialNavSection\] : adminNavSections/);
    expect(src('app/admin/layout.tsx')).toMatch(/showCommercial=\{isCommercialModuleEnvEnabled\(\)\}/);
  });

  it('migration 238: funções só para service_role e rollback fora de migrations', () => {
    const sql = strip(fs.readFileSync(path.join(ROOT, 'supabase/migrations/238_commercial_leads_operations.sql'), 'utf8').replace(/--.*$/gm, ''));
    const grants = [...sql.matchAll(/GRANT EXECUTE ON FUNCTION[^;]*;/g)].map((m) => m[0]);
    expect(grants.length).toBeGreaterThan(0);
    for (const g of grants) expect(g).toMatch(/TO service_role/);
    expect(sql).not.toMatch(/GRANT[^;]*\b(anon|authenticated)\b[^;]*;/);
    expect((sql.match(/SECURITY DEFINER/g) ?? []).length).toBe(6);
    expect((sql.match(/SET search_path = pg_catalog, pg_temp/g) ?? []).length).toBe(6);
    expect(fs.existsSync(path.join(ROOT, 'supabase/rollbacks/commercial/238_rollback.sql'))).toBe(true);
  });
});
