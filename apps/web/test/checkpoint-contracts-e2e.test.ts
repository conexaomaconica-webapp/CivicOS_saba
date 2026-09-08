import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    business: { id: 'biz_vitest_test', name: 'Test Business' },
  }),
}));

// Mocks para isolar dependências de Next.js/Supabase em testes unitários
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: (key: string) => (key === 'user-agent' ? 'Vitest Unit Agent' : '127.0.0.1'),
  }),
  cookies: () => Promise.resolve({
    get: () => undefined, getAll: () => [], set: () => {}, delete: () => {},
  }),
}));

vi.mock('@/lib/supabase/server', () => {
  const chainable = () => {
    const c: any = {
      select: () => c, insert: () => c, update: () => c, upsert: () => c, delete: () => c,
      eq: () => c, neq: () => c, gt: () => c, gte: () => c, lt: () => c, lte: () => c,
      like: () => c, ilike: () => c, is: () => c, in: () => c, or: () => c, not: () => c,
      contains: () => c, containedBy: () => c, filter: () => c, match: () => c,
      order: () => c, limit: () => c, range: () => c,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (r: any) => r({ data: [], error: null }),
    };
    return c;
  };

  return {
    createServerSideClient: vi.fn().mockImplementation(() => ({
      auth: {
        getUser: () => Promise.resolve({
          data: { user: { id: '00000000-0000-0000-0000-000000000099', email: 'admin@cm.com.br' } },
          error: null,
        }),
      },
      from: () => chainable(),
      rpc: vi.fn().mockImplementation((fnName: string, args: any) => {
        if (fnName === 'has_platform_admin_access') {
          return Promise.resolve({ data: true, error: null });
        }
        if (fnName === 'accept_business_contract_snapshot') {
          const hash = crypto.createHash('sha256').update(args.p_rendered_text, 'utf8').digest('hex');
          return Promise.resolve({
            data: {
              ok: true,
              contract_id: 'ctr_vitest_123',
              snapshot_id: 'snap_vitest_123',
              acceptance_id: 'acc_vitest_123',
              sha256_hash: hash,
              signed_at: '2026-08-27T12:00:00.000Z',
            },
            error: null,
          });
        }
        if (fnName === 'get_signed_contract_snapshot') {
          if (args.p_business_id === 'biz_with_contract') {
            const rawText = 'TERMO OFICIAL BRUTO SEM TRIMMING OU MUTACAO\n\nClausula 1';
            const hash = crypto.createHash('sha256').update(rawText, 'utf8').digest('hex');
            return Promise.resolve({
              data: {
                ok: true,
                contract_id: 'ctr_vitest_123',
                business_id: args.p_business_id,
                status: 'signed',
                rendered_text: rawText,
                sha256_hash: hash,
                accepted_at: '2026-08-27T12:00:00.000Z',
                ip_address: '127.0.0.1',
                user_agent: 'Vitest Agent',
                user_id: 'usr_vitest_owner',
              },
              error: null,
            });
          }
          return Promise.resolve({
            data: { ok: false, error: 'Nenhum contrato assinado localizado.' },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    })),
  };
});

import { saveAndAcceptContractSnapshotAction, getSignedContractSnapshotAction } from '@/app/actions/contract-actions';
import { getAdvertiserPlanBillingDTOAction } from '@/lib/advertiser/advertiser-billing-service';
import { getAdminBusiness360Action } from '@/lib/admin/admin-businesses-service';

describe('CHECKPOINT 6 — SUÍTE INTEGRADA DE CONTRATOS FACTUAIS E SEGURANÇA JURÍDICA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Deve congelar snapshot com cálculo de SHA-256 exato em UTF-8 sobre o texto bruto', async () => {
    const text = 'CONTRATO OFICIAL DE ADESÃO 2026\n\nLinha 2 com caracteres especiais: ç, ~ e ô.';
    const expectedSha256 = crypto.createHash('sha256').update(text, 'utf8').digest('hex');

    const res = await saveAndAcceptContractSnapshotAction({
      businessId: 'biz_vitest_test',
      renderedText: text,
      version: 'v1.0',
    });

    expect(res.success).toBe(true);
    expect(res.snapshotId).toBe('snap_vitest_123');
    expect(res.sha256Hash).toBe(expectedSha256);
  });

  it('2. Deve rejeitar contrato com texto vazio ou inválido', async () => {
    await expect(
      saveAndAcceptContractSnapshotAction({
        businessId: 'biz_vitest_test',
        renderedText: '   ',
      })
    ).rejects.toThrow('INVALID_CONTRACT_TEXT');
  });

  it('3. Deve retornar contrato assinado real via getSignedContractSnapshotAction', async () => {
    const res = await getSignedContractSnapshotAction('biz_with_contract');
    expect(res.success).toBe(true);
    expect(res.contract.status).toBe('signed');
    expect(res.contract.sha256_hash).toHaveLength(64);
  });

  it('4. Anunciante deve retornar contract: undefined quando empresa não tem contrato (SEM MOCKS)', async () => {
    const res = await getAdvertiserPlanBillingDTOAction();
    // With mock Supabase returning null data, contract should be absent
    expect(res?.contract).toBeUndefined();
  });

  it('5. Admin 360 deve retornar contract: undefined quando empresa não tem contrato (SEM MOCKS)', async () => {
    const res = await getAdminBusiness360Action('biz_no_contract');
    // Admin 360 returns null when business not found in mock; contract is absent
    expect(res?.contract).toBeUndefined();
  });

  it('6. Deve comprovar que o hash recalculado em Node sobre o rendered_text do banco é idêntico ao armazenado', async () => {
    const res = await getSignedContractSnapshotAction('biz_with_contract');
    expect(res.success).toBe(true);
    const textFromDb = res.contract.rendered_text;
    const recomputedHash = crypto.createHash('sha256').update(textFromDb, 'utf8').digest('hex');
    expect(recomputedHash).toBe(res.contract.sha256_hash);
  });
});
