import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Gate 1A (Módulo Comercial): verificações ESTÁTICAS das migrations 228-233.
 * NÃO substituem os testes de banco (scripts/test-migration-228-233-commercial.mjs com PGlite e,
 * para RLS com JWT, pgTAP via Docker). Servem de trava de regressão no pipeline normal.
 */
const ROOT = path.resolve(__dirname, '../../..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase/migrations');
const ROLLBACKS_DIR = path.join(ROOT, 'supabase/rollbacks/commercial');

const FILES = [
  '228_commercial_foundation.sql',
  '229_commercial_leads_attributions.sql',
  '230_commercial_commission_rules.sql',
  '231_commercial_financial_events.sql',
  '232_commercial_ledger_payouts.sql',
  '233_commercial_security_audit.sql',
];
const sql = (file: string) => fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
const stripComments = (text: string) => text.replace(/--.*$/gm, '');

describe('Módulo comercial · migrations 228-233 (estático)', () => {
  it('todas as migrations existem e não há duplicidade de numeração no bloco 228+', () => {
    for (const f of FILES) expect(fs.existsSync(path.join(MIGRATIONS_DIR, f)), f).toBe(true);
    const numbers = fs.readdirSync(MIGRATIONS_DIR).filter((f) => /^2(2[89]|3\d)_/.test(f)).map((f) => f.slice(0, 3));
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('não altera tabelas existentes (só cria objetos commercial_* e um trigger em invoices)', () => {
    const forbidden = /ALTER\s+TABLE\s+(IF\s+EXISTS\s+)?public\.(profiles|businesses|invoices|payments|payment_refunds|subscriptions|business_commercial_terms|admin_audit_logs|plan_entitlements|plan_payment_rules)\b/i;
    for (const f of FILES) expect(stripComments(sql(f)), f).not.toMatch(forbidden);
    const triggersOnExisting = FILES.flatMap((f) =>
      [...stripComments(sql(f)).matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+(\w+)[\s\S]*?\bON\s+public\.(\w+)/gi)]
        .map((m) => `${m[2]}:${m[1]}`)
        .filter((x) => !x!.startsWith('commercial_')),
    );
    expect(triggersOnExisting).toEqual(['invoices:trg_commercial_invoice_capture']);
  });

  it('não contém DROP/TRUNCATE de objetos existentes nem DELETE em massa', () => {
    for (const f of FILES) {
      const text = stripComments(sql(f));
      expect(text, f).not.toMatch(/\bDROP\s+TABLE\b/i);
      // o trigger BEFORE TRUNCATE do livro-razão é legítimo; proíbe apenas o comando TRUNCATE em si
      expect(text, f).not.toMatch(/(^|;)\s*TRUNCATE\b/im);
      expect(text, f).not.toMatch(/\bDELETE\s+FROM\b/i);
    }
  });

  it('nenhuma concessão a anon/authenticated/PUBLIC (somente service_role)', () => {
    for (const f of FILES) {
      const grants = [...stripComments(sql(f)).matchAll(/\bGRANT\b[^;]*;/gi)].map((m) => m[0]);
      for (const g of grants) {
        const grantee = g.split(/\bTO\b/)[1] ?? '';
        expect(grantee, `${f}: ${g}`).not.toMatch(/\b(anon|authenticated)\b|\bPUBLIC\b/);
      }
    }
  });

  it('toda tabela commercial_* é incluída no bloco de RLS da própria migration', () => {
    for (const f of FILES.slice(0, 5)) {
      const text = stripComments(sql(f));
      const tables = [...text.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.(commercial_\w+)/gi)].map((m) => m[1]!);
      expect(tables.length, f).toBeGreaterThan(0);
      expect(text, f).toMatch(/ENABLE ROW LEVEL SECURITY/);
      for (const t of tables) {
        const inList = new RegExp(`'${t}'`).test(text);
        const direct = new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY`).test(text);
        expect(inList || direct, `${f}: ${t} sem RLS`).toBe(true);
      }
    }
  });

  it('captura e operação nascem DESLIGADAS; operação exige captura; captura exige marco de início', () => {
    const text = sql('228_commercial_foundation.sql');
    expect(text).toMatch(/capture_mode TEXT NOT NULL DEFAULT 'off'/);
    expect(text).toMatch(/module_enabled BOOLEAN NOT NULL DEFAULT false/);
    expect(text).toMatch(/commercial_settings_module_requires_capture/);
    expect(text).toMatch(/commercial_settings_capture_requires_start/);
  });

  it('valores financeiros usam BIGINT/INT em centavos e basis points (sem NUMERIC/FLOAT próprios)', () => {
    for (const f of FILES) {
      const text = stripComments(sql(f));
      // NUMERIC aparece apenas ao LER invoices (p_amount_paid NUMERIC / round(...))
      const numericDecl = [...text.matchAll(/^\s+\w+\s+(NUMERIC|DECIMAL|FLOAT|REAL|DOUBLE PRECISION)\b/gim)];
      expect(numericDecl.length, f).toBe(0);
    }
    expect(sql('232_commercial_ledger_payouts.sql')).toMatch(/amount_cents BIGINT NOT NULL/);
    expect(sql('230_commercial_commission_rules.sql')).toMatch(/rate_bps INT NOT NULL CHECK \(rate_bps BETWEEN 0 AND 10000\)/);
  });

  it('livro-razão é append-only e regras ilustrativas não podem ser habilitadas', () => {
    expect(sql('232_commercial_ledger_payouts.sql')).toMatch(/BEFORE UPDATE OR DELETE ON public\.commercial_ledger_entries/);
    expect(sql('232_commercial_ledger_payouts.sql')).toMatch(/BEFORE TRUNCATE ON public\.commercial_ledger_entries/);
    expect(sql('230_commercial_commission_rules.sql')).toMatch(/commercial_rules_illustrative_never_enabled/);
    expect(sql('230_commercial_commission_rules.sql')).toMatch(/EXCLUDE USING gist/);
  });

  it('funções privilegiadas fixam search_path e revogam execução de anon/authenticated', () => {
    const text = stripComments(sql('231_commercial_financial_events.sql'));
    const definers = [...text.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)[\s\S]*?\$\$;/gi)].filter((m) => /SECURITY DEFINER/i.test(m[0]));
    expect(definers.length).toBeGreaterThanOrEqual(3);
    for (const d of definers) expect(d[0], d[1]).toMatch(/SET search_path = pg_catalog, pg_temp/);
    expect(text).toMatch(/REVOKE ALL ON FUNCTION public\.commercial_capture_invoice\(public\.invoices\) FROM PUBLIC, anon, authenticated/);
    expect(text).toMatch(/REVOKE ALL ON FUNCTION public\.commercial_reconcile_capture\(UUID, INT\) FROM PUBLIC, anon, authenticated/);
  });

  it('rollbacks existem FORA de supabase/migrations e protegem dados financeiros', () => {
    for (const n of [228, 229, 230, 231, 232]) {
      const file = path.join(ROLLBACKS_DIR, `${n}_rollback.sql`);
      expect(fs.existsSync(file), `${n}_rollback.sql`).toBe(true);
      expect(fs.readFileSync(file, 'utf8')).toMatch(/recusado/);
    }
    expect(fs.readdirSync(MIGRATIONS_DIR).filter((f) => /commercial.*rollback/i.test(f))).toEqual([]);
  });

  it('migrations históricas não foram modificadas nem removidas (git)', () => {
    let diff = '';
    try {
      diff = execSync('git diff --name-status main -- supabase/migrations', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      return; // sem git/branch main acessível: ignorado
    }
    const changed = diff.split('\n').filter(Boolean).filter((l) => !l.startsWith('A\t'));
    expect(changed).toEqual([]);
  });
});
