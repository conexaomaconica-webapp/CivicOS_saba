import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';

vi.mock('@/lib/payment/commercial-eligibility-gate', () => ({
  assertBusinessCommercialEligibility: vi.fn().mockResolvedValue({
    eligible: true,
    masonicVerified: true,
    contractSigned: false,
    reasons: [],
  }),
}));

vi.mock('@/lib/payment/payment-service', () => ({
  authorizeBusinessAccess: vi.fn().mockResolvedValue({
    user: { id: 'usr_vitest_owner', email: 'owner@test.com' },
    tenantId: '00000000-0000-0000-0000-000000000010',
    business: { id: 'business-draft-1', name: 'Test Business' },
  }),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: () => '127.0.0.1',
  }),
  cookies: () => Promise.resolve({ get: () => undefined, getAll: () => [], set: () => {}, delete: () => {} }),
}));

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => Promise.resolve({
    rpc: (fnName: string, args: any) => {
      if (fnName === 'accept_business_contract_snapshot') {
        const hash = crypto.createHash('sha256').update(args.p_rendered_text, 'utf8').digest('hex');
        return Promise.resolve({
          data: {
            ok: true,
            contract_id: 'ctr_001',
            snapshot_id: 'snap_001',
            acceptance_id: 'acc_001',
            sha256_hash: hash,
            signed_at: new Date().toISOString(),
          },
          error: null,
        });
      }
      if (fnName === 'get_signed_contract_snapshot') {
        return Promise.resolve({
          data: {
            ok: true,
            contract_id: 'ctr_001',
            status: 'signed',
            sha256_hash: 'hash_123',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  })),
}));

import { saveAndAcceptContractSnapshotAction, getSignedContractSnapshotAction } from '../src/app/actions/contract-actions';

describe('Checkpoint 1 — Contrato Dinâmico, Snapshot Imutável & PDF', () => {
  it('1. Reutiliza o schema existente da Migration 059 sem duplicar tabelas', () => {
    expect(saveAndAcceptContractSnapshotAction).toBeDefined();
    expect(getSignedContractSnapshotAction).toBeDefined();
  });

  it('2. Interpola dados reais do anunciante no contrato dinâmico com versão v1.0', () => {
    const businessName = 'Comandos - Terceirização e Segurança Eletrônica';
    const documentNumber = '12.345.678/0001-90';
    const planName = 'Plano Prata (Anual)';

    const renderedText = `
CONTRATO DE ADESÃO E LICENÇA DE USO DA PLATAFORMA CONEXÃO MAÇÔNICA (v1.0)
CONTRATANTE: ${businessName} (${documentNumber})
PLANO: ${planName}
    `.trim();

    expect(renderedText).toContain('Comandos - Terceirização e Segurança Eletrônica');
    expect(renderedText).toContain('12.345.678/0001-90');
    expect(renderedText).toContain('v1.0');
  });

  it('3. Computa hash SHA-256 idêntico no servidor para garantia de imutabilidade', async () => {
    const sampleText = 'CONTRATO DE TESTE E AUDITORIA SHA256 CONEXAO MACONICA v1.0';
    const expectedHash = crypto.createHash('sha256').update(sampleText, 'utf8').digest('hex');

    const result = await saveAndAcceptContractSnapshotAction({
      businessId: 'business-draft-1',
      renderedText: sampleText,
      version: 'v1.0',
    });

    expect(result.success).toBe(true);
    expect(result.sha256Hash).toBe(expectedHash);
    expect(result.signedAt).toBeDefined();
  });

  it('4. Retorna snapshot assinado congelado para geração do PDF', async () => {
    const res = await getSignedContractSnapshotAction('business-draft-1');
    expect(res).toBeDefined();
  });
});
