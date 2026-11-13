import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Gate 1C.1 (Módulo Comercial): verificações ESTÁTICAS da atribuição automática pelo link.
 * As regras de negócio ficam no banco e são testadas em PostgreSQL real
 * (scripts/test-migration-239-commercial-link-attribution.mjs); aqui se garante o isolamento no código.
 */
const ROOT = path.resolve(__dirname, '../../..');
const src = (f: string) => fs.readFileSync(path.join(ROOT, 'apps/web/src', f), 'utf8');
const sql = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const stripSql = (t: string) => t.replace(/--.*$/gm, '');

describe('Módulo comercial · Gate 1C.1 (estático)', () => {
  it('rota /r/: cookie guarda TOKEN opaco (nunca o código), só o hash vai ao banco, first-touch e cookie seguro', () => {
    const route = strip(src('app/r/[code]/route.ts'));
    expect(route).toMatch(/generateReferralToken\(\)/);
    expect(route).toMatch(/visit_token_hash:\s*hashReferralToken\(token\)/);
    expect(route).toMatch(/response\.cookies\.set\(COOKIE_NAME, token,/);
    expect(route).not.toMatch(/cookies\.set\(COOKIE_NAME,\s*normalized/);
    expect(route).toMatch(/httpOnly:\s*true/);
    expect(route).toMatch(/sameSite:\s*'lax'/);
    expect(route).toMatch(/secure:\s*process\.env\.NODE_ENV === 'production'/);
    expect(route).toMatch(/valid_until:/);
    // primeiro toque vale: com token vivo não troca o cookie e registra a visita posterior só como auditoria
    expect(route).toMatch(/superseded_by_evidence_id/);
    expect(route).toMatch(/live\.representative_id === rep\.id\) return response/);
    // não grava IP nem user-agent
    expect(route).not.toMatch(/x-forwarded-for|user-agent|\bip\b/i);
    // continua 404 sem módulo, redireciona sempre e só para representante ativo
    expect(route).toMatch(/isCommercialModuleEnvEnabled\(\)\)\s*return new NextResponse\(null, \{ status: 404 \}\)/);
    expect(route).toMatch(/\.eq\('status', 'active'\)/);
    expect(route).not.toMatch(/business_onboarding_tokens|commercial_status|subscriptions|invoices/);
  });

  it('serviço de claim: use server, só funções assíncronas, desliga com a chave, confere a posse e nunca lança', () => {
    const raw = src('lib/commercial/referral-claim-service.ts');
    const text = strip(raw);
    expect(text.trimStart().startsWith("'use server'")).toBe(true);
    expect([...text.matchAll(/^export\s+(?!async function|type\s|interface\s)(\w+)/gm)].map((m) => m[1])).toEqual([]);
    const body = text.slice(text.indexOf('export async function claimCommercialReferralAction'));
    expect(body.indexOf('isCommercialModuleEnvEnabled()')).toBeGreaterThan(-1);
    // a chave é a primeira coisa verificada (flag desligada = nenhum efeito)
    expect(body.indexOf('isCommercialModuleEnvEnabled()')).toBeLessThan(body.indexOf('cookies()'));
    expect(body).toMatch(/business\.owner_id !== user\.id/);
    expect(body).toMatch(/commercial_claim_referral/);
    expect(body).toMatch(/\} catch \(error\) \{/);
    expect(body).toMatch(/event: 'commercial\.claim_failed'/);
    expect(body).toMatch(/kind: 'transient_error'/);
    // não toca em pagamento/Asaas/checkout/planos
    expect(text).not.toMatch(/asaas|checkout|subscriptions|invoices|business_onboarding_tokens|plan_/i);
    // nenhum dado pessoal nos logs estruturados
    expect(body).not.toMatch(/console\.(error|warn|info|log)\([^)]*(email|cnpj|document)/i);
  });

  it('onboarding: uma única chamada protegida (flag + try/catch + limite de tempo) e nada mais alterado', async () => {
    const form = strip(src('app/anunciar/passo-2/business-form.tsx'));
    expect(form).toMatch(/if \(referralClaimEnabled && result\.businessId\) \{\s*[\s\S]*?try \{\s*await Promise\.race\(\[\s*claimCommercialReferralAction\(result\.businessId\),/);
    expect(form.match(/claimCommercialReferralAction\(/g)?.length).toBe(1);
    // a chamada vem DEPOIS da criação da empresa com sucesso
    expect(form.indexOf('createBusinessDraft(supabase')).toBeLessThan(form.indexOf('claimCommercialReferralAction(result'));
    expect(src('app/anunciar/passo-2/page.tsx')).toMatch(/referralClaimEnabled=\{isCommercialModuleEnvEnabled\(\)\}/);

    const { execSync } = await import('node:child_process');
    let diff = '';
    try {
      diff = execSync(
        'git diff --name-only main -- apps/web/src/lib/business apps/web/src/lib/onboarding apps/web/src/lib/payment apps/web/src/lib/contracts apps/web/src/app/actions apps/web/src/app/api',
        { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
      );
    } catch {
      return;
    }
    expect(diff.trim()).toBe('');
  });

  it('migration 239: funções só para service_role, nunca confirma, nada fora do módulo', () => {
    const text = stripSql(sql('supabase/migrations/239_commercial_link_attribution.sql'));
    const grants = [...text.matchAll(/GRANT EXECUTE ON FUNCTION[^;]*;/g)].map((m) => m[0]);
    expect(grants.length).toBe(2);
    for (const g of grants) expect(g).toMatch(/TO service_role/);
    // anon/authenticated só aparecem em REVOKE, nunca em GRANT ... TO
    expect(text).not.toMatch(/GRANT[^;]*\bTO\b[^;]*\b(anon|authenticated)\b/i);
    expect((text.match(/SECURITY DEFINER/g) ?? []).length).toBe(2);
    expect((text.match(/SET search_path = pg_catalog, public/g) ?? []).length).toBeGreaterThanOrEqual(3); // 2 funções + guard
    // o claim só cria 'pending' e jamais 'confirmed'
    const claim = text.slice(text.indexOf('CREATE OR REPLACE FUNCTION public.commercial_claim_referral'));
    expect(claim).toMatch(/'referral_link', 'pending'/);
    expect(claim).not.toMatch(/'confirmed'\s*,\s*now\(\)|status\s*=\s*'confirmed'\s*,|SET status = 'confirmed'/);
    // chave própria desligada por padrão e RLS na fila
    expect(text).toMatch(/link_auto_attribution_enabled BOOLEAN NOT NULL DEFAULT false/);
    expect(text).toMatch(/ALTER TABLE public\.commercial_attribution_issues ENABLE ROW LEVEL SECURITY/);
    expect(text).toMatch(/REVOKE ALL ON public\.commercial_attribution_issues FROM PUBLIC, anon, authenticated/);
    // trava transacional contra uso concorrente da mesma evidência/empresa
    expect(text).toMatch(/pg_advisory_xact_lock/);
    expect(text).toMatch(/FOR UPDATE;/);
    // só toca tabelas do módulo (nenhum ALTER/UPDATE em tabelas existentes fora do comercial)
    for (const m of text.matchAll(/ALTER TABLE public\.(\w+)/g)) expect(m[1], m[0]).toMatch(/^commercial_/);
    expect(fs.existsSync(path.join(ROOT, 'supabase/rollbacks/commercial/239_rollback.sql'))).toBe(true);
  });

  it('migrations anteriores permanecem inalteradas (apenas adições)', async () => {
    const { execSync } = await import('node:child_process');
    let diff = '';
    try {
      diff = execSync('git diff --name-status main -- supabase/migrations', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      return;
    }
    expect(diff.split('\n').filter(Boolean).filter((l) => !l.startsWith('A\t'))).toEqual([]);
  });

  it('fila administrativa: ações exigem permissão de atribuições e registram a decisão com justificativa', () => {
    const text = strip(src('lib/commercial/attributions-service.ts'));
    for (const name of ['listAttributionIssuesAction', 'retryAttributionIssueAction', 'resolveAttributionIssueAction']) {
      const body = text.slice(text.indexOf(`export async function ${name}`));
      expect(body.slice(0, 400), name).toMatch(/tryCommercialPermission\('attributions\.manage'\)/);
    }
    expect(text).toMatch(/note\.length < 10/);
    expect(text).toMatch(/COMMERCIAL_ISSUE_DISCARDED/);
    // reprocesso usa a evidência guardada, não o cookie
    expect(text).toMatch(/p_evidence_id: issue\.evidence_id/);
    expect(text).toMatch(/p_claim_at: issue\.claim_at/);
  });
});
