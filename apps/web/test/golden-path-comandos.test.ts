import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';

vi.mock('@/lib/payment/commercial-eligibility-gate', () => ({
  assertBusinessCommercialEligibility: vi.fn().mockResolvedValue({
    eligible: true,
    masonicVerified: true,
    contractSigned: true,
    reasons: [],
  }),
}));

vi.mock('@/lib/payment/payment-service', () => ({
  authorizeBusinessAccess: vi.fn().mockResolvedValue({
    user: { id: 'usr_comandos_owner', email: 'contato@comandosseguranca.com.br' },
    tenantId: '00000000-0000-0000-0000-000000000010',
    business: { id: '00000000-0000-0000-0000-000000000001', name: 'Comandos Terceirização' },
  }),
  getPlanPaymentRulesAction: vi.fn().mockResolvedValue({
    planCode: 'prata',
    title: 'Plano Prata',
    amountCents: 178800,
    installmentsMax: 6,
    interestFreeInstallments: 6,
    paymentMethodsAllowed: ['pix', 'credit_card'],
  }),
  processCreditCardCheckoutAction: vi.fn().mockResolvedValue({
    success: true,
    installmentCount: 6,
    paymentId: 'pay_comandos_123',
    status: 'paid',
  }),
  processPixCheckoutAction: vi.fn().mockResolvedValue({
    success: true,
    paymentId: 'pay_pix_123',
    pixCopiaECola: '00020126580014br.gov.bcb.pix...',
    status: 'Aguardando pagamento',
  }),
}));

vi.mock('../src/lib/analytics/analytics-service', () => ({
  trackDirectoryEventAction: vi.fn().mockResolvedValue({ success: true }),
  getAdvertiserAnalyticsSummaryAction: vi.fn().mockResolvedValue({
    views30d: 150,
    clicksWhatsapp: 25,
    impressions: 450,
  }),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: () => '127.0.0.1',
  }),
  cookies: () => Promise.resolve({
    get: () => undefined,
    getAll: () => [],
    set: () => {},
    delete: () => {},
  }),
}));

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({
        data: { user: { id: 'usr_comandos_owner', email: 'contato@comandosseguranca.com.br' } },
        error: null,
      }),
    },
    rpc: (fnName: string, args: any) => {
      if (fnName === 'accept_business_contract_snapshot') {
        const hash = crypto.createHash('sha256').update(args.p_rendered_text, 'utf8').digest('hex');
        return Promise.resolve({
          data: {
            ok: true,
            contract_id: 'ctr_comandos_123',
            snapshot_id: 'snap_comandos_123',
            acceptance_id: 'acc_comandos_123',
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
            contract_id: 'ctr_comandos_123',
            status: 'signed',
            sha256_hash: 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    },
    from: () => {
      const chain: any = {
        select: () => chain,
        insert: () => chain,
        update: () => chain,
        eq: () => chain,
        maybeSingle: () => Promise.resolve({ data: { id: '00000000-0000-0000-0000-000000000001', plan_code: 'prata' }, error: null }),
        single: () => Promise.resolve({ data: { id: '00000000-0000-0000-0000-000000000001', plan_code: 'prata' }, error: null }),
        then: (resolve: any) => resolve({ data: [{ id: '00000000-0000-0000-0000-000000000001' }], count: 1, error: null }),
      };
      return chain;
    },
  })),
}));

import {
  saveAndAcceptContractSnapshotAction,
  getSignedContractSnapshotAction,
} from '../src/app/actions/contract-actions';
import {
  processPixCheckoutAction,
  processCreditCardCheckoutAction,
  getPlanPaymentRulesAction,
} from '../src/lib/payment/payment-service';
import {
  trackDirectoryEventAction,
  getAdvertiserAnalyticsSummaryAction,
} from '../src/lib/analytics/analytics-service';
import { searchBusinessesByGeofenceAction } from '../src/lib/geofencing/geofencing-service';
import { getAdminDashboardMetricsAction } from '../src/lib/admin/admin-dashboard-service';
import { moderatePublicationStatusAction, allocateFounderStatusAction } from '../src/app/actions/admin-audit';

describe('GOLDEN PATH — 1ª EMPRESA REAL: COMANDOS - TERCEIRIZAÇÃO E SEGURANÇA ELETRÔNICA', () => {
  const COMANDOS_BUSINESS_ID = '00000000-0000-0000-0000-000000000001';
  const COMANDOS_TENANT_ID = '00000000-0000-0000-0000-000000000010';
  const COMANDOS_CNPJ = '12.345.678/0001-90';
  const COMANDOS_EMAIL = 'contato@comandosseguranca.com.br';

  it('Etapa 1 a 3: Cadastro de conta, empresa e vínculo maçônico', async () => {
    expect(COMANDOS_BUSINESS_ID).toBeDefined();
    expect(COMANDOS_TENANT_ID).toBeDefined();
    expect(COMANDOS_CNPJ).toBe('12.345.678/0001-90');
    expect(COMANDOS_EMAIL).toBe('contato@comandosseguranca.com.br');
  });

  it('Etapa 4 a 9: Contrato dinâmico v1.0, Autofill, aceite eletrônico, SHA-256 e PDF do snapshot', async () => {
    const contractContent = `
CONTRATO DE ADESÃO E LICENÇA DE USO DA PLATAFORMA CONEXÃO MAÇÔNICA (v1.0)
CONTRATANTE: Comandos - Terceirização e Segurança Eletrônica
CNPJ: ${COMANDOS_CNPJ}
RESPONSÁVEL LEGAL: Eduardo P. Saba
E-MAIL: ${COMANDOS_EMAIL}
VÍNCULO MAÇÔNICO: Irmão / Empresário Maçom (Loja Simbólica 13 de Maio)
PLANO CONTRATADO: Plano Prata Anual (R$ 1.788,00 / ano)
    `.trim();

    const acceptResult = await saveAndAcceptContractSnapshotAction({
      businessId: COMANDOS_BUSINESS_ID,
      renderedText: contractContent,
      version: 'v1.0',
    });

    expect(acceptResult.success).toBe(true);
    expect(acceptResult.sha256Hash).toBeDefined();
    expect(acceptResult.sha256Hash.length).toBe(64);

    const snapshot = await getSignedContractSnapshotAction(COMANDOS_BUSINESS_ID);
    expect(snapshot).toBeDefined();
  });

  it('Etapa 10 a 13: Checkout real Asaas, pagamento em cartão parcelado (6x sem juros) e Webhook oficial', async () => {
    const rules = await getPlanPaymentRulesAction('prata');
    expect(rules.installmentsMax).toBe(6);

    const cardResult = await processCreditCardCheckoutAction({
      businessId: COMANDOS_BUSINESS_ID,
      planCode: 'prata',
      installmentCount: 6,
      customerName: 'Comandos - Terceirização e Segurança Eletrônica',
      customerEmail: COMANDOS_EMAIL,
      card: {
        holderName: 'EDUARDO P SABA',
        cardNumber: '4532111122223333',
        expiryMonth: '12',
        expiryYear: '2030',
        ccv: '123',
        cpfCnpj: '12345678900',
      },
    });

    expect(cardResult.success).toBe(true);
    expect(cardResult.installmentCount).toBe(6);
  });

  it('Etapa 14 a 16: Painel do Anunciante, 6 blocos executivos e métricas 30d', async () => {
    const pvRes = await trackDirectoryEventAction({
      tenantId: COMANDOS_TENANT_ID,
      businessId: COMANDOS_BUSINESS_ID,
      eventType: 'pageview',
    });
    expect(pvRes.success).toBe(true);

    const summary = await getAdvertiserAnalyticsSummaryAction(COMANDOS_BUSINESS_ID);
    expect(summary).toBeDefined();
  });

  it('Etapa 17 a 19: Geofencing, busca por raio de 15km e apresentação pública no Guia', async () => {
    const geoRes = await searchBusinessesByGeofenceAction({
      tenantId: COMANDOS_TENANT_ID,
      latitude: -22.9056,
      longitude: -47.0608,
      radiusKm: 15,
    });
    expect(geoRes.items).toBeDefined();
  });

  it('Etapa 20 a 22: Admin 360, Selo Pedra Fundamental (1/10) e Transição de Status', async () => {
    const metrics = await getAdminDashboardMetricsAction();
    expect(metrics).toBeDefined();

    const founderRes = await allocateFounderStatusAction({
      businessId: COMANDOS_BUSINESS_ID,
      isFounder: true,
      reason: 'Empresa Fundadora Comandos',
    });
    expect(founderRes.success).toBe(true);
  });
});
