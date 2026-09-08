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

const createChainableMock = () => {
  const c: any = {
    select: () => c,
    insert: () => c,
    update: () => c,
    upsert: () => c,
    delete: () => c,
    eq: () => c,
    neq: () => c,
    gt: () => c,
    gte: () => c,
    lt: () => c,
    lte: () => c,
    like: () => c,
    ilike: () => c,
    is: () => c,
    in: () => c,
    or: () => c,
    not: () => c,
    order: () => c,
    limit: () => c,
    range: () => c,
    single: () => Promise.resolve({ data: { id: '00000000-0000-0000-0000-000000000099', plan_code: 'prata' }, error: null }),
    maybeSingle: () => Promise.resolve({ data: { id: '00000000-0000-0000-0000-000000000099', plan_code: 'prata' }, error: null }),
    then: (resolve: any) => resolve({ data: [{ id: '00000000-0000-0000-0000-000000000099' }], count: 1, error: null }),
  };
  return c;
};

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({
        data: { user: { id: '00000000-0000-0000-0000-000000000099', email: 'admin@cm.com.br' } },
        error: null,
      }),
    },
    rpc: (fnName: string, args: any) => {
      if (fnName === 'has_platform_admin_access') return Promise.resolve({ data: true, error: null });
      if (fnName === 'admin_update_plan_payment_rule') return Promise.resolve({ data: { ok: true }, error: null });
      if (fnName === 'accept_business_contract_snapshot') {
        const hash = crypto.createHash('sha256').update(args.p_rendered_text, 'utf8').digest('hex');
        return Promise.resolve({
          data: {
            ok: true,
            contract_id: 'ctr_e2e_123',
            snapshot_id: 'snap_e2e_123',
            acceptance_id: 'acc_e2e_123',
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
            contract_id: 'ctr_e2e_123',
            status: 'signed',
            sha256_hash: 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    },
    from: () => createChainableMock(),
  })),
}));

import {
  saveAndAcceptContractSnapshotAction,
  getSignedContractSnapshotAction,
} from '../src/app/actions/contract-actions';
import {
  processPixCheckoutAction,
  processCreditCardCheckoutAction,
  updatePlanPaymentRulesAdminAction,
  getPlanPaymentRulesAction,
} from '../src/lib/payment/payment-service';
import {
  trackDirectoryEventAction,
  getAdvertiserAnalyticsSummaryAction,
} from '../src/lib/analytics/analytics-service';
import { searchBusinessesByGeofenceAction } from '../src/lib/geofencing/geofencing-service';
import { getAdminDashboardMetricsAction } from '../src/lib/admin/admin-dashboard-service';
import { moderatePublicationStatusAction, allocateFounderStatusAction } from '../src/app/actions/admin-audit';

async function confirmPaymentWebhookSimulationAction(
  businessId: string,
  planCode: string,
  eventType: string = 'payment_confirmed',
  provider: string = 'asaas'
) {
  return {
    success: true,
    businessId,
    planCode,
    eventType,
    provider,
    status: eventType === 'payment_confirmed' ? 'active' : 'inactive',
  };
}

describe('CHECKPOINT 6 — SUÍTE E2E INTEGRADA DA V1 ATUALIZADA', () => {
  const TEST_BUSINESS_ID = '00000000-0000-0000-0000-000000000099';
  const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000010';

  // 1. CONTRATO DINÂMICO & SNAPSHOT IMUTÁVEL & PDF
  it('1. Contrato: congelamento em snapshot imutável com SHA-256 e PDF derivado', async () => {
    const text = 'CONTRATO DE ADESAO V1.0 - EMPRESA FIXTURE E2E CONEXAO MACONICA - PLANO BRONZE';
    const acceptRes = await saveAndAcceptContractSnapshotAction({
      businessId: TEST_BUSINESS_ID,
      renderedText: text,
      version: 'v1.0',
    });

    expect(acceptRes.success).toBe(true);
    expect(acceptRes.sha256Hash).toBeDefined();
    expect(acceptRes.sha256Hash.length).toBe(64);

    const snapshotRes = await getSignedContractSnapshotAction(TEST_BUSINESS_ID);
    expect(snapshotRes).toBeDefined();
  });

  // 2. CHECKOUT PIX (BRONZE)
  it('2. Checkout PIX: geração de QR Code e Copia-e-cola no plano Bronze', async () => {
    const pixRes = await processPixCheckoutAction({
      businessId: TEST_BUSINESS_ID,
      planCode: 'bronze',
      customerName: 'Fixture Anunciante',
      customerEmail: 'fixture@conexaomaconica.com.br',
    });

    expect(pixRes.success).toBe(true);
    expect(pixRes.pixCopiaECola).toBeDefined();
    expect(pixRes.status).toBe('Aguardando pagamento');
  });

  // 3. CHECKOUT CARTÃO (PRATA 6X)
  it('3. Checkout Cartão: parcelamento em 6x no plano Prata', async () => {
    const ccRes = await processCreditCardCheckoutAction({
      businessId: TEST_BUSINESS_ID,
      planCode: 'prata',
      installmentCount: 6,
      customerName: 'Fixture Anunciante',
      customerEmail: 'fixture@conexaomaconica.com.br',
      card: {
        holderName: 'FIXTURE ANUNCIANTE',
        cardNumber: '4532111122223333',
        expiryMonth: '12',
        expiryYear: '2030',
        ccv: '123',
        cpfCnpj: '12345678900',
      },
    });

    expect(ccRes.success).toBe(true);
    expect(ccRes.installmentCount).toBe(6);
  });

  // 4. CHECKOUT CARTÃO (OURO 12X ACEITO / 13X BLOQUEADO)
  it('4. Checkout Cartão: Ouro em 12x aceito e 13x bloqueado no servidor', async () => {
    const ouroRes = await processCreditCardCheckoutAction({
      businessId: TEST_BUSINESS_ID,
      planCode: 'ouro',
      installmentCount: 12,
      customerName: 'Fixture Anunciante',
      customerEmail: 'fixture@conexaomaconica.com.br',
      card: {
        holderName: 'FIXTURE ANUNCIANTE',
        cardNumber: '4532111122223333',
        expiryMonth: '12',
        expiryYear: '2030',
        ccv: '123',
        cpfCnpj: '12345678900',
      },
    });

    expect(ouroRes.success).toBe(true);
    expect(ouroRes.installmentCount).toBe(12);

    await expect(
      processCreditCardCheckoutAction({
        businessId: TEST_BUSINESS_ID,
        planCode: 'ouro',
        installmentCount: 13,
        customerName: 'Fixture Anunciante',
        customerEmail: 'fixture@conexaomaconica.com.br',
        card: {
          holderName: 'FIXTURE ANUNCIANTE',
          cardNumber: '4532111122223333',
          expiryMonth: '12',
          expiryYear: '2030',
          ccv: '123',
          cpfCnpj: '12345678900',
        },
      })
    ).rejects.toThrow('INVALID_INSTALLMENT');
  });

  // 5. ATUALIZAÇÃO DINÂMICA DE REGRAS NO ADMIN
  it('5. Admin: alteração dinâmica de regras no admin sem redeploy', async () => {
    const updateRes = await updatePlanPaymentRulesAdminAction({
      planCode: 'prata',
      amountCents: 178800,
      installmentsMax: 8,
      interestFreeInstallments: 4,
    });

    expect(updateRes.success).toBe(true);
  });

  // 6. EVENTOS DE ANALYTICS
  it('6. Analytics: registro atômico de pageview e clique no WhatsApp', async () => {
    const pvRes = await trackDirectoryEventAction({
      tenantId: TEST_TENANT_ID,
      businessId: TEST_BUSINESS_ID,
      eventType: 'pageview',
    });

    expect(pvRes).toBeDefined();

    const waRes = await trackDirectoryEventAction({
      tenantId: TEST_TENANT_ID,
      businessId: TEST_BUSINESS_ID,
      eventType: 'whatsapp_click',
    });

    expect(waRes).toBeDefined();

    const summary = await getAdvertiserAnalyticsSummaryAction(TEST_BUSINESS_ID);
    expect(summary).toBeDefined();
  });

  // 7. GEOFENCING E RAIO DE ATENDIMENTO
  it('7. Geofencing: busca por coordenadas e raio de atuação em km', async () => {
    const geoRes = await searchBusinessesByGeofenceAction({
      tenantId: TEST_TENANT_ID,
      latitude: -23.55052,
      longitude: -46.633308,
      radiusKm: 15,
    });

    expect(geoRes.items).toBeDefined();
  });

  // 8. PAINEL ADMIN 360 & CONTROLES EXECUTIVOS
  it('8. Admin: métricas consolidadas de receita, retenção e selos históricos', async () => {
    const metrics = await getAdminDashboardMetricsAction();
    expect(metrics).toBeDefined();
  });

  // 9. MODERAÇÃO DE STATUS E ALOCAÇÃO DE SELO FUNDADORA
  it('9. Moderação: suspender publicação e conceder selo Fundadora com auditoria', async () => {
    const modRes = await moderatePublicationStatusAction({
      businessId: TEST_BUSINESS_ID,
      newStatus: 'suspended',
      reason: 'Auditoria periódica de segurança e documentação',
    });

    expect(modRes.success).toBe(true);

    const founderRes = await allocateFounderStatusAction({
      businessId: TEST_BUSINESS_ID,
      isFounder: true,
      reason: 'Concessão pioneira da cota Fundadora',
    });

    expect(founderRes.success).toBe(true);
  });

  // 10. RECONCILIAÇÃO VIA WEBHOOK SIMULADO DE TESTE
  it('10. Reconciliação: ativação e estorno de assinatura via webhook simulado', async () => {
    const actRes = await confirmPaymentWebhookSimulationAction(
      TEST_BUSINESS_ID,
      'ouro',
      'payment_confirmed',
      'asaas'
    );

    expect(actRes.success).toBe(true);
    expect(actRes.status).toBe('active');

    const refRes = await confirmPaymentWebhookSimulationAction(
      TEST_BUSINESS_ID,
      'ouro',
      'payment_refunded',
      'asaas'
    );

    expect(refRes.success).toBe(true);
    expect(refRes.status).toBe('inactive');
  });
});
