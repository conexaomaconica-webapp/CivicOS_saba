import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const src = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', 'src', rel), 'utf8');
const root = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', '..', '..', rel), 'utf8');

describe('Gate 1E · serviços de regras, comissões e repasses (estático)', () => {
  const rules = src('lib/commercial/rules-service.ts');
  const commissions = src('lib/commercial/commissions-service.ts');
  const m243 = root('supabase/migrations/243_commercial_commission_engine.sql');
  const m242 = root('supabase/migrations/242_commercial_provider_reversals.sql');

  it('toda ação exige permissão comercial específica (nunca admin automático)', () => {
    for (const code of [rules, commissions]) {
      const exported = code.match(/export async function \w+/g) ?? [];
      const guarded = code.match(/tryCommercialPermission\('/g) ?? [];
      expect(guarded.length).toBeGreaterThanOrEqual(exported.length);
    }
    expect(rules).toMatch(/tryCommercialPermission\('rules\.approve'\)/);
    expect(commissions).toMatch(/tryCommercialPermission\('payouts\.manage'\)/);
    expect(commissions).toMatch(/tryCommercialPermission\('commissions\.approve'\)/);
  });

  it('o código da aplicação NUNCA grava no livro-razão nem nos créditos: só chama as funções do banco', () => {
    for (const code of [rules, commissions]) {
      expect(code).not.toMatch(/from\('commercial_ledger_entries'\)\s*\.\s*(insert|update|delete|upsert)/);
      expect(code).not.toMatch(/from\('commercial_commission_releases'\)\s*\.\s*(insert|update|delete|upsert)/);
    }
    expect(commissions).toMatch(/rpc\('commercial_create_payout_draft'/);
    expect(commissions).toMatch(/rpc\('commercial_mark_payout_paid'/);
    expect(commissions).toMatch(/rpc\('commercial_process_pending_events'/);
  });

  it('regras: criadas como reais (nunca ilustrativas), aprovação por outra pessoa e com justificativa', () => {
    expect(rules).toMatch(/is_illustrative: false/);
    expect(rules).toMatch(/status: 'draft'/);
    expect(rules).toMatch(/diferente de quem a criou/);
    expect(rules).toMatch(/reason\.length < 10/);
    expect(rules).not.toMatch(/rate_bps:\s*\d/); // nenhuma taxa fixa no código
  });

  it('nenhuma taxa, plano ou regra é semeada em migration', () => {
    expect(m243).not.toMatch(/INSERT INTO public\.commercial_commission_rules/);
    expect(m243).not.toMatch(/INSERT INTO public\.commercial_representative_categories/);
  });

  it('repasse: aprovação por outra pessoa; pagamento exige comprovante validado e sem tocar em dinheiro', () => {
    expect(m243).toMatch(/same_person/);
    expect(m243).toMatch(/proof_required/);
    expect(commissions).toMatch(/PROOF_MIME/);
    expect(commissions).toMatch(/file\.size > 10 \* 1024 \* 1024/);
    expect(commissions).not.toMatch(/asaas|createPayment|transfer\(/i);
  });

  it('tabelas e funções novas só para service_role; RLS ligada', () => {
    expect(m243).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(m243).toMatch(/REVOKE ALL ON FUNCTION public\.%s FROM PUBLIC, anon, authenticated/);
    expect(m243).not.toMatch(/GRANT[^;]*\b(commercial_clawbacks|commercial_representative_categories)\b[^;]*\bTO\b[^;]*\b(anon|authenticated)\b/i);
    expect(m242).toMatch(/GRANT EXECUTE ON FUNCTION public\.commercial_record_provider_reversal/);
    expect(m242).toMatch(/TO service_role/);
  });

  it('o motor trabalha em centavos inteiros, com truncamento e sem ponto flutuante', () => {
    expect(m243).toMatch(/floor\(v_base::numeric \* v_rule\.rate_bps \/ 10000\)/);
    expect(m243).not.toMatch(/double precision|\breal\b/i);
  });

  it('migrations anteriores permanecem inalteradas (apenas adições novas 240-243)', () => {
    for (const n of ['240_commercial_representative_access', '241_commercial_representative_contract', '242_commercial_provider_reversals', '243_commercial_commission_engine']) {
      expect(fs.existsSync(path.resolve(__dirname, '..', '..', '..', `supabase/migrations/${n}.sql`))).toBe(true);
    }
  });
});
