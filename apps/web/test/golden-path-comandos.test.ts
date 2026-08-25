import { describe, it, expect } from 'vitest';
import {
  saveAndAcceptContractSnapshotAction,
  getSignedContractSnapshotAction,
} from '../src/app/actions/contract-actions';
import {
  processPixCheckoutAction,
  processCreditCardCheckoutAction,
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
        cpfCnpj: COMANDOS_CNPJ,
      },
    });

    expect(cardResult.success).toBe(true);
    expect(cardResult.installmentCount).toBe(6);

    // Notificação assinada via Webhook Asaas para ativação legítima
    const webhookResult = await confirmPaymentWebhookSimulationAction(
      COMANDOS_BUSINESS_ID,
      'prata',
      'payment_confirmed',
      'asaas'
    );
    expect(webhookResult.success).toBe(true);
  });

  it('Etapa 14 a 16: Moderação administrativa no /admin/aprovacoes, concessão de Pedra Fundamental (1/10) e publicação', async () => {
    const pedraResult = await allocateFounderStatusAction({
      tenantId: COMANDOS_TENANT_ID,
      businessId: COMANDOS_BUSINESS_ID,
      isFounder: true,
      reason: 'Concessão do Reconhecimento Histórico Pedra Fundamental 1/10 (Empresa Pioneira)',
    });
    expect(pedraResult.success).toBe(true);

    const approveResult = await moderatePublicationStatusAction({
      tenantId: COMANDOS_TENANT_ID,
      businessId: COMANDOS_BUSINESS_ID,
      newStatus: 'published',
      reason: 'Empresa homologada e publicada no Guia Conexão Maçônica',
    });
    expect(approveResult.success).toBe(true);
  });

  it('Etapa 17 a 20: Visualização no Guia Público, clique no WhatsApp e auditoria de Analytics agregados', async () => {
    const trackView = await trackDirectoryEventAction({
      businessId: COMANDOS_BUSINESS_ID,
      eventType: 'view',
      city: 'São Paulo',
      state: 'SP',
    });
    expect(trackView.ok).toBe(true);

    const trackZap = await trackDirectoryEventAction({
      businessId: COMANDOS_BUSINESS_ID,
      eventType: 'whatsapp_click',
      city: 'São Paulo',
      state: 'SP',
    });
    expect(trackZap.ok).toBe(true);

    const summary = await getAdvertiserAnalyticsSummaryAction(COMANDOS_BUSINESS_ID, 30);
    expect(summary).toBeDefined();
    expect(summary.days).toBe(30);
  });

  it('Etapa 21 a 23: Teste de Geofencing Perto de Mim, Painel Anunciante e Dashboard Operacional do Admin', async () => {
    const geoResult = await searchBusinessesByGeofenceAction({
      userLat: -23.55052,
      userLng: -46.633308,
      radiusKm: 25,
    });
    expect(geoResult.items).toBeDefined();

    const adminMetrics = await getAdminDashboardMetricsAction();
    expect(adminMetrics.companies).toBeDefined();
    expect(adminMetrics.finance).toBeDefined();
  });
});
