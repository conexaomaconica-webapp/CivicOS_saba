import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  classifyAsaasEvent,
  extractAsaasPaymentId,
  extractAsaasEventId,
  isValidAsaasPaymentId,
  isFinancialConfirmationEvent,
  isFinancialCreationEvent,
  isAdministrativeEvent,
} from '@/lib/payment/asaas-event-catalog';
import { AsaasBillingAdapter } from '@/lib/billing/billing-adapters';
import { reconcileCommercialPaymentWebhook } from '@/lib/payment/commercial-onboarding-webhook-service';
import { resolveAuditCategory } from '@/app/admin/saude/page';

describe('CONEXÃO MAÇÔNICA — Auditoria e Classificação de Eventos Asaas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1 & 9. Catálogo Tipado de Eventos e Classificação Auditável', () => {
    it('classifica eventos de confirmação financeira estritamente', () => {
      expect(classifyAsaasEvent('PAYMENT_RECEIVED').category).toBe('financial_confirmation');
      expect(classifyAsaasEvent('PAYMENT_CONFIRMED').category).toBe('financial_confirmation');
      expect(classifyAsaasEvent('PAYMENT_DUNNING_RECEIVED').category).toBe('financial_confirmation');
      expect(isFinancialConfirmationEvent('PAYMENT_RECEIVED')).toBe(true);
      expect(isFinancialConfirmationEvent('PAYMENT_CONFIRMED')).toBe(true);
    });

    it('classifica criação e visualização de cobrança como financial_creation', () => {
      expect(classifyAsaasEvent('PAYMENT_CREATED').category).toBe('financial_creation');
      expect(classifyAsaasEvent('PAYMENT_UPDATED').category).toBe('financial_creation');
      expect(classifyAsaasEvent('PAYMENT_BANK_SLIP_VIEWED').category).toBe('financial_creation');
      expect(classifyAsaasEvent('PAYMENT_CHECKOUT_VIEWED').category).toBe('financial_creation');
      expect(isFinancialCreationEvent('PAYMENT_CREATED')).toBe(true);
      expect(isFinancialConfirmationEvent('PAYMENT_CREATED')).toBe(false);
    });

    it('classifica eventos de exclusão, estorno e chargeback como financial_reversal', () => {
      expect(classifyAsaasEvent('PAYMENT_DELETED').category).toBe('financial_reversal');
      expect(classifyAsaasEvent('PAYMENT_REFUNDED').category).toBe('financial_reversal');
      expect(classifyAsaasEvent('PAYMENT_CHARGEBACK_REQUESTED').category).toBe('financial_reversal');
    });

    it('classifica eventos de cadastro e clientes como administrative', () => {
      expect(classifyAsaasEvent('CUSTOMER_CREATED').category).toBe('administrative');
      expect(classifyAsaasEvent('CUSTOMER_UPDATED').category).toBe('administrative');
      expect(classifyAsaasEvent('TRANSFER_CREATED').category).toBe('administrative');
      expect(classifyAsaasEvent('ACCOUNT_STATUS_UPDATED').category).toBe('administrative');
      expect(isAdministrativeEvent('CUSTOMER_CREATED')).toBe(true);
    });

    it('classifica pings e testes técnicos como technical_test', () => {
      expect(classifyAsaasEvent('PING').category).toBe('technical_test');
      expect(classifyAsaasEvent('WH_PING').category).toBe('technical_test');
      expect(classifyAsaasEvent('TEST').category).toBe('technical_test');
      expect(classifyAsaasEvent('TECHNICAL_SMOKE_TEST').category).toBe('technical_test');
    });

    it('classifica eventos desconhecidos como unrecognized', () => {
      expect(classifyAsaasEvent('UNKNOWN_NEW_EVENT_XYZ').category).toBe('unrecognized');
      expect(classifyAsaasEvent('').category).toBe('unrecognized');
      expect(classifyAsaasEvent(null).category).toBe('unrecognized');
    });
  });

  describe('2. Impedir que PAYMENT_CREATED seja interpretado como confirmação', () => {
    it('AsaasBillingAdapter.parseEvent mapeia PAYMENT_CREATED para canonicalEvent "payment_created", NUNCA "payment_confirmed"', () => {
      const payload = {
        event: 'PAYMENT_CREATED',
        payment: {
          id: 'pay_123456789',
          customer: 'cus_12345',
          value: 150.0,
          externalReference: JSON.stringify({
            businessId: 'biz-001',
            userId: 'user-001',
            planCode: 'esquadro',
          }),
        },
      };

      const parsed = AsaasBillingAdapter.parseEvent(new Headers(), payload);
      expect(parsed).not.toBeNull();
      expect(parsed?.canonicalEvent).toBe('payment_created');
      expect(parsed?.canonicalEvent).not.toBe('payment_confirmed');
    });

    it('AsaasBillingAdapter.parseEvent mapeia PAYMENT_CONFIRMED para canonicalEvent "payment_confirmed"', () => {
      const payload = {
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_987654321',
          customer: 'cus_12345',
          value: 150.0,
        },
      };

      const parsed = AsaasBillingAdapter.parseEvent(new Headers(), payload);
      expect(parsed?.canonicalEvent).toBe('payment_confirmed');
    });
  });

  describe('3. Remoção do fallback que interpretava ID de evento (evt_...) como ID de cobrança', () => {
    it('extractAsaasPaymentId bloqueia IDs com prefixo evt_, asaas_evt_ e wh_', () => {
      const payloadComEvt = {
        id: 'evt_99999999999',
        event: 'CUSTOMER_CREATED',
      };
      expect(extractAsaasPaymentId(payloadComEvt)).toBeNull();

      const payloadComAsaasEvt = {
        id: 'asaas_evt_12345',
        event: 'PING',
      };
      expect(extractAsaasPaymentId(payloadComAsaasEvt)).toBeNull();

      const payloadComWh = {
        id: 'wh_abcdef123456',
        event: 'PAYMENT_RECEIVED',
      };
      expect(extractAsaasPaymentId(payloadComWh)).toBeNull();
    });

    it('extractAsaasPaymentId extrai corretamente o ID quando dentro de payload.payment.id', () => {
      const payloadValido = {
        id: 'evt_123456789',
        event: 'PAYMENT_RECEIVED',
        payment: {
          id: 'pay_real_98765',
          value: 200,
        },
      };
      expect(extractAsaasPaymentId(payloadValido)).toBe('pay_real_98765');
      expect(isValidAsaasPaymentId('pay_real_98765')).toBe(true);
    });

    it('extractAsaasEventId extrai o ID do evento independentemente do payment.id', () => {
      const payload = {
        id: 'evt_987654321',
        payment: {
          id: 'pay_123456',
        },
      };
      expect(extractAsaasEventId(payload)).toBe('evt_987654321');
    });

    it('isValidAsaasPaymentId rejeita strings de ID de evento', () => {
      expect(isValidAsaasPaymentId('evt_12345')).toBe(false);
      expect(isValidAsaasPaymentId('asaas_evt_12345')).toBe(false);
      expect(isValidAsaasPaymentId('wh_12345')).toBe(false);
      expect(isValidAsaasPaymentId('')).toBe(false);
      expect(isValidAsaasPaymentId(null)).toBe(false);
      expect(isValidAsaasPaymentId(123)).toBe(false);
      expect(isValidAsaasPaymentId('pay_valid_123')).toBe(true);
    });
  });

  describe('4, 5, 6 & 7. Reconciliação Controlada no commercial-onboarding-webhook-service', () => {
    it('trata eventos administrativos sem conciliação financeira e com sucesso seguro', async () => {
      const payloadAdmin = {
        id: 'evt_admin_123',
        event: 'CUSTOMER_CREATED',
        customer: { id: 'cus_123' },
      };

      const result = await reconcileCommercialPaymentWebhook(payloadAdmin);
      expect(result.success).toBe(true);
      expect(result.reconciled).toBe(false);
      expect(result.message).toContain('auditado sem necessidade de conciliação financeira');
    });

    it('trata testes técnicos (PING / SMOKE) sem conciliação financeira', async () => {
      const payloadPing = {
        id: 'evt_ping_123',
        event: 'PING',
      };

      const result = await reconcileCommercialPaymentWebhook(payloadPing);
      expect(result.success).toBe(true);
      expect(result.reconciled).toBe(false);
      expect(result.message).toContain('auditado sem conciliação financeira');
    });

    it('trata eventos não reconhecidos marcando para triagem sem falso alerta', async () => {
      const payloadUnknown = {
        id: 'evt_unknown_999',
        event: 'NOVO_EVENTO_BETA_DESCONHECIDO',
      };

      const result = await reconcileCommercialPaymentWebhook(payloadUnknown);
      expect(result.success).toBe(false);
      expect(result.reconciled).toBe(false);
      expect(result.message).toContain('registrado para triagem');
    });

    it('trata PAYMENT_CREATED registrando aguardando_pagamento sem liquidar', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payment_attempts') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  or: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn(() => ({
                        maybeSingle: vi.fn(() =>
                          Promise.resolve({
                            data: {
                              id: 'attempt-1',
                              business_id: 'biz-1',
                              tenant_id: 'tenant-1',
                              payload_received: {},
                            },
                            error: null,
                          })
                        ),
                      })),
                    })),
                  })),
                })),
              })),
              update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
            };
          }
          if (table === 'businesses') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({
                      data: {
                        id: 'biz-1',
                        commercial_status: 'aguardando_pagamento',
                        tenant_id: 'tenant-1',
                      },
                      error: null,
                    })
                  ),
                })),
              })),
            };
          }
          if (table === 'admin_audit_logs') {
            return {
              insert: vi.fn(() => Promise.resolve({ error: null })),
            };
          }
          return {};
        }),
      };

      const payloadCreated = {
        id: 'evt_created_123',
        event: 'PAYMENT_CREATED',
        payment: {
          id: 'pay_created_123',
          value: 100,
        },
      };

      const result = await reconcileCommercialPaymentWebhook(payloadCreated, null, mockSupabase as any);
      expect(result.success).toBe(true);
      expect(result.reconciled).toBe(false);
      expect(result.message).toContain('registrada (aguardando liquidação)');
    });

    it('PAYMENT_DELETED não reverte empresa se ela já estiver com pagamento confirmado ou publicado', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payment_attempts') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  or: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn(() => ({
                        maybeSingle: vi.fn(() =>
                          Promise.resolve({
                            data: {
                              id: 'attempt-1',
                              business_id: 'biz-confirmed-1',
                              tenant_id: 'tenant-1',
                            },
                            error: null,
                          })
                        ),
                      })),
                    })),
                  })),
                })),
              })),
            };
          }
          if (table === 'businesses') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() =>
                    Promise.resolve({
                      data: {
                        id: 'biz-confirmed-1',
                        commercial_status: 'pagamento_confirmado',
                        tenant_id: 'tenant-1',
                      },
                      error: null,
                    })
                  ),
                })),
              })),
              update: vi.fn(),
            };
          }
          if (table === 'admin_audit_logs') {
            return {
              insert: vi.fn(() => Promise.resolve({ error: null })),
            };
          }
          return {};
        }),
      };

      const payloadDeleted = {
        id: 'evt_del_123',
        event: 'PAYMENT_DELETED',
        payment: {
          id: 'pay_del_123',
          value: 100,
        },
      };

      const result = await reconcileCommercialPaymentWebhook(payloadDeleted, null, mockSupabase as any);
      expect(result.success).toBe(true);
      expect(result.reconciled).toBe(false);
      expect(result.message).toContain('preservado');
      expect(mockSupabase.from('businesses').update).not.toHaveBeenCalled();
    });
  });

  describe('10. Central de Saúde (/admin/saude) — Categorização Segregada', () => {
    it('resolveAuditCategory categoriza corretamente cada tipo de evento', () => {
      // Teste técnico
      const catSmoke = resolveAuditCategory({
        id: '1',
        provider_code: 'asaas',
        event_type: 'TECHNICAL_SMOKE_TEST',
        event_id: 'evt_1',
        processed: true,
        error_log: null,
        created_at: null,
        payload: { technical_smoke_test: true },
      });
      expect(catSmoke.key).toBe('test');
      expect(catSmoke.label).toBe('Teste Técnico');

      // Liquidado
      const catPaid = resolveAuditCategory({
        id: '2',
        provider_code: 'asaas',
        event_type: 'PAYMENT_RECEIVED',
        event_id: 'evt_2',
        processed: true,
        error_log: null,
        created_at: null,
        payload: {},
      });
      expect(catPaid.key).toBe('liquidated');
      expect(catPaid.label).toBe('Liquidado');

      // Aguardando
      const catPending = resolveAuditCategory({
        id: '3',
        provider_code: 'asaas',
        event_type: 'PAYMENT_CREATED',
        event_id: 'evt_3',
        processed: true,
        error_log: null,
        created_at: null,
        payload: {},
      });
      expect(catPending.key).toBe('pending');
      expect(catPending.label).toBe('Aguardando Pagamento');

      // Administrativo
      const catAdmin = resolveAuditCategory({
        id: '4',
        provider_code: 'asaas',
        event_type: 'CUSTOMER_CREATED',
        event_id: 'evt_4',
        processed: true,
        error_log: null,
        created_at: null,
        payload: {},
      });
      expect(catAdmin.key).toBe('administrative');
      expect(catAdmin.label).toBe('Informativo / Admin');

      // Incidente real
      const catIncident = resolveAuditCategory({
        id: '5',
        provider_code: 'asaas',
        event_type: 'PAYMENT_CONFIRMED',
        event_id: 'evt_5',
        processed: false,
        error_log: 'Falha crítica no RPC 133',
        created_at: null,
        payload: {},
      });
      expect(catIncident.key).toBe('incident');
      expect(catIncident.label).toBe('Incidente Real');
    });

    it('classifica corretamente os 11 cenários de registros históricos sem alterar banco de dados', () => {
      const historicalEvents = [
        { type: 'CUSTOMER_CREATED', error: null, processed: true, expectedKey: 'administrative' },
        { type: 'CUSTOMER_UPDATED', error: null, processed: true, expectedKey: 'administrative' },
        { type: 'TRANSFER_CREATED', error: null, processed: true, expectedKey: 'administrative' },
        { type: 'ACCOUNT_STATUS_UPDATED', error: null, processed: true, expectedKey: 'administrative' },
        { type: 'PING', error: null, processed: true, expectedKey: 'test' },
        { type: 'WH_PING', error: null, processed: true, expectedKey: 'test' },
        { type: 'PAYMENT_CREATED', error: null, processed: true, expectedKey: 'pending' },
        { type: 'PAYMENT_UPDATED', error: null, processed: true, expectedKey: 'pending' },
        { type: 'PAYMENT_RECEIVED', error: null, processed: true, expectedKey: 'liquidated' },
        { type: 'PAYMENT_CONFIRMED', error: null, processed: true, expectedKey: 'liquidated' },
        { type: 'PAYMENT_CONFIRMED', error: 'Erro de conexão com timeout', processed: false, expectedKey: 'incident' },
      ];

      for (const h of historicalEvents) {
        const cat = resolveAuditCategory({
          id: `hist-${h.type}`,
          provider_code: 'asaas',
          event_type: h.type,
          event_id: `evt_${h.type}`,
          processed: h.processed,
          error_log: h.error,
          created_at: '2026-10-01T12:00:00Z',
          payload: {},
        });
        expect(cat.key).toBe(h.expectedKey);
      }
    });
  });

  describe('6 & 7. Resiliência: Duplicidade, Eventos Fora de Ordem e Falhas de Persistência', () => {
    it('ignora reprocessamento quando tentativa já foi liquidada (idempotência)', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'payment_attempts') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  or: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn(() => ({
                        maybeSingle: vi.fn(() =>
                          Promise.resolve({
                            data: {
                              id: 'attempt-already-paid',
                              business_id: 'biz-1',
                              tenant_id: 'tenant-1',
                              status: 'paid',
                            },
                            error: null,
                          })
                        ),
                      })),
                    })),
                  })),
                })),
              })),
            };
          }
          if (table === 'businesses') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() =>
                    Promise.resolve({
                      data: {
                        id: 'biz-1',
                        commercial_status: 'pagamento_confirmado',
                        tenant_id: 'tenant-1',
                      },
                      error: null,
                    })
                  ),
                })),
              })),
            };
          }
          return {};
        }),
        rpc: vi.fn(() => Promise.resolve({ data: null, error: { message: 'RPC mock fallback' } })),
      };

      const payloadDuplicate = {
        id: 'evt_dup_999',
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_already_paid',
          value: 150,
        },
      };

      const result = await reconcileCommercialPaymentWebhook(payloadDuplicate, null, mockSupabase as any);
      expect(result.success).toBe(true);
      expect(result.already_processed).toBe(true);
    });

    it('trata falha temporária de banco sem marcar como processado com sucesso', async () => {
      const mockSupabaseComErro = {
        from: vi.fn(() => {
          throw new Error('Falha de conexão com PostgreSQL');
        }),
      };

      const payload = {
        id: 'evt_fail_1',
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_fail_1',
          value: 100,
        },
      };

      const result = await reconcileCommercialPaymentWebhook(payload, null, mockSupabaseComErro as any);
      expect(result.success).toBe(false);
      expect(result.reconciled).toBe(false);
      expect(result.error).toContain('Falha de conexão com PostgreSQL');
    });
  });
});

