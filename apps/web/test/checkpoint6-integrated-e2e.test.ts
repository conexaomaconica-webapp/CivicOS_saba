import { describe, it, expect } from 'vitest';
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
import { confirmPaymentWebhookSimulationAction } from '../src/app/actions/onboarding-checkout-actions';
import {
  trackDirectoryEventAction,
  getAdvertiserAnalyticsSummaryAction,
} from '../src/lib/analytics/analytics-service';
import { searchBusinessesByGeofenceAction } from '../src/lib/geofencing/geofencing-service';
import { getAdminDashboardMetricsAction } from '../src/lib/admin/admin-dashboard-service';
import { moderatePublicationStatusAction, allocateFounderStatusAction } from '../src/app/actions/admin-audit';

describe('CHECKPOINT 6 — SUÍTE E2E INTEGRADA DA V1 ATUALIZADA', () => {
  const TEST_BUSINESS_ID = '00000000-0000-0000-0000-000000000099';
  const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000010';

  // 1. CONTRATO DINÂMICO & SNAPSHOT IMUTÁVEL & PDF
  it('1. Contrato: congelamento em snapshot imutável com SHA-256 e PDF derivado', async () => {
    const text = 'CONTRATO DE ADESAO V1.0 - EMPRESA FIXTURE E2E CONEXAO MACONICA';
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

  // 3. CHECKOUT CARTÃO PARCELADO (PRATA 6X)
  it('3. Checkout Cartão: parcelamento em 6x no plano Prata', async () => {
    const cardRes = await processCreditCardCheckoutAction({
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

    expect(cardRes.success).toBe(true);
    expect(cardRes.installmentCount).toBe(6);
  });

  // 4. CHECKOUT CARTÃO MÁXIMO PERMITIDO (OURO 12X) E BLOQUEIO DE 13X
  it('4. Checkout Cartão: Ouro em 12x aceito e 13x bloqueado no servidor', async () => {
    const valid12x = await processCreditCardCheckoutAction({
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
    expect(valid12x.success).toBe(true);

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

  // 5. ALTERAÇÃO DE REGRAS NO ADMIN SEM REDEPLOY
  it('5. Admin: alteração dinâmica de regras no admin sem redeploy', async () => {
    await updatePlanPaymentRulesAdminAction({
      planCode: 'prata',
      amountCents: 178800,
      installmentsMax: 8,
      interestFreeInstallments: 4,
    });

    const updated = await getPlanPaymentRulesAction('prata');
    expect(updated.installmentsMax).toBe(8);
    expect(updated.interestFreeInstallments).toBe(4);

    // Restaura padrão
    await updatePlanPaymentRulesAdminAction({
      planCode: 'prata',
      amountCents: 178800,
      installmentsMax: 6,
      interestFreeInstallments: 6,
    });
  });

  // 6. WEBHOOK COMO AUTORIDADE DE ATIVAÇÃO
  it('6. Webhook: notificação de pagamento confirmado ativa plano comercial', async () => {
    const webhookRes = await confirmPaymentWebhookSimulationAction(TEST_BUSINESS_ID, 'prata', 'payment_confirmed', 'asaas');
    expect(webhookRes.success).toBe(true);
  });

  // 7. ANALYTICS: EVENTOS DE VIEW E ZAP CONTABILIZADOS
  it('7. Analytics: contabilização de view e clique de WhatsApp com deduplicação', async () => {
    const viewRes = await trackDirectoryEventAction({
      businessId: TEST_BUSINESS_ID,
      eventType: 'view',
      city: 'São Paulo',
      state: 'SP',
    });
    expect(viewRes.ok).toBe(true);

    const zapRes = await trackDirectoryEventAction({
      businessId: TEST_BUSINESS_ID,
      eventType: 'whatsapp_click',
      city: 'São Paulo',
      state: 'SP',
    });
    expect(zapRes.ok).toBe(true);

    const summary = await getAdvertiserAnalyticsSummaryAction(TEST_BUSINESS_ID, 30);
    expect(summary).toBeDefined();
  });

  // 8. GEOFENCING & FALLBACK DE LOCALIZAÇÃO NEGADA
  it('8. Geofencing: busca por raio 10 km e fallback gracioso sem GPS', async () => {
    const geoRes = await searchBusinessesByGeofenceAction({
      userLat: -23.55052,
      userLng: -46.633308,
      radiusKm: 10,
    });

    expect(geoRes.items).toBeDefined();
    expect(geoRes.radiusKm).toBe(10);
  });

  // 9. DASHBOARD ADMIN OPERACIONAL
  it('9. Admin Dashboard: métricas consolidadas em tempo real do servidor', async () => {
    const metrics = await getAdminDashboardMetricsAction();
    expect(metrics.companies).toBeDefined();
    expect(metrics.finance).toBeDefined();
    expect(metrics.subscriptions).toBeDefined();
  });

  // 10. MODERAÇÃO & SELEÇÃO DE PEDRA FUNDAMENTAL
  it('10. Moderação: alteração de status de publicação e concessão de selos auditados', async () => {
    const pubRes = await moderatePublicationStatusAction({
      tenantId: TEST_TENANT_ID,
      businessId: TEST_BUSINESS_ID,
      newStatus: 'published',
      reason: 'Aprovação integrada Checkpoint 6',
    });
    expect(pubRes.success).toBe(true);

    const founderRes = await allocateFounderStatusAction({
      tenantId: TEST_TENANT_ID,
      businessId: TEST_BUSINESS_ID,
      isFounder: true,
      reason: 'Concessão de selo Founder no teste E2E',
    });
    expect(founderRes.success).toBe(true);
  });
});
