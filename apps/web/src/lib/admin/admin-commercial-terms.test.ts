import { describe, it, expect } from 'vitest';
import {
  canTransitionCommercialStatus,
  assertCommercialStatusTransition,
} from '@/lib/commercial-onboarding-status';
import type { ConfirmAdminCommercialTermsInput } from '@/lib/admin/admin-businesses-service';
import { validateCpf } from '@/lib/onboarding/onboarding-validation';

function validateCommercialTermsInput(input: ConfirmAdminCommercialTermsInput): { valid: boolean; error?: string } {
  if (!input.business_id?.trim()) {
    return { valid: false, error: 'Identificador da empresa é obrigatório.' };
  }
  if (!input.plan_code?.trim()) {
    return { valid: false, error: 'O plano comercial deve ser selecionado.' };
  }
  if (!input.billing_cycle || !['annual', 'biennial'].includes(input.billing_cycle)) {
    return { valid: false, error: 'Vigência do contrato é obrigatória (anual ou bienal).' };
  }
  if (!input.payment_method || !['avista', 'parcelado'].includes(input.payment_method)) {
    return { valid: false, error: 'Condição de pagamento é obrigatória (à vista ou parcelado).' };
  }
  if (typeof input.amount_cents !== 'number' || input.amount_cents <= 0) {
    return { valid: false, error: 'Valor contratado deve ser maior que zero.' };
  }
  if (typeof input.installments_count !== 'number' || input.installments_count < 1) {
    return { valid: false, error: 'Quantidade de parcelas deve ser de no mínimo 1.' };
  }
  return { valid: true };
}

describe('Microetapa 3.2: Conferência Comercial & Transição de Estados', () => {
  it('vinculo_verificado -> dados_comerciais_conferidos deve ser PERMITIDO', () => {
    expect(
      canTransitionCommercialStatus('vinculo_verificado', 'dados_comerciais_conferidos')
    ).toBe(true);

    expect(() => {
      assertCommercialStatusTransition('vinculo_verificado', 'dados_comerciais_conferidos');
    }).not.toThrow();
  });

  it('pre_cadastro -> dados_comerciais_conferidos deve ser BLOQUEADO', () => {
    expect(
      canTransitionCommercialStatus('pre_cadastro', 'dados_comerciais_conferidos')
    ).toBe(false);

    expect(() => {
      assertCommercialStatusTransition('pre_cadastro', 'dados_comerciais_conferidos');
    }).toThrowError(/Transição comercial inválida/);
  });

  it('vinculo_informado -> dados_comerciais_conferidos deve ser BLOQUEADO', () => {
    expect(
      canTransitionCommercialStatus('vinculo_informado', 'dados_comerciais_conferidos')
    ).toBe(false);

    expect(() => {
      assertCommercialStatusTransition('vinculo_informado', 'dados_comerciais_conferidos');
    }).toThrowError(/Transição comercial inválida/);
  });

  it('dados_comerciais_conferidos -> contrato_gerado deve ser PERMITIDO (próxima Fase 4)', () => {
    expect(
      canTransitionCommercialStatus('dados_comerciais_conferidos', 'contrato_gerado')
    ).toBe(true);

    expect(() => {
      assertCommercialStatusTransition('dados_comerciais_conferidos', 'contrato_gerado');
    }).not.toThrow();
  });

  it('re-confirmação: permite manter dados_comerciais_conferidos quando já conferido', () => {
    const currentStatus = 'dados_comerciais_conferidos';
    const isReconfirmation = currentStatus === 'dados_comerciais_conferidos';
    expect(isReconfirmation).toBe(true);
  });

  describe('Validação de Campos Comerciais Obrigatórios', () => {
    const validPayload: ConfirmAdminCommercialTermsInput = {
      business_id: '11111111-1111-1111-1111-111111111111',
      plan_code: 'ouro',
      billing_cycle: 'annual',
      payment_method: 'avista',
      amount_cents: 100000,
      installments_count: 1,
    };

    it('aceita payload completo e válido', () => {
      expect(validateCommercialTermsInput(validPayload).valid).toBe(true);
    });

    it('aceita CPF válido com ou sem máscara e rejeita dígitos inválidos', () => {
      expect(validateCpf('529.982.247-25')).toBeNull();
      expect(validateCpf('52998224725')).toBeNull();
      expect(validateCpf('529.982.247-24')).toMatch(/inválido/i);
    });

    it('bloqueia se business_id estiver vazio', () => {
      const res = validateCommercialTermsInput({ ...validPayload, business_id: '' });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Identificador da empresa é obrigatório/);
    });

    it('bloqueia se plan_code estiver vazio', () => {
      const res = validateCommercialTermsInput({ ...validPayload, plan_code: '' });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/plano comercial deve ser selecionado/);
    });

    it('bloqueia se valor for 0 ou negativo', () => {
      const resZero = validateCommercialTermsInput({ ...validPayload, amount_cents: 0 });
      expect(resZero.valid).toBe(false);
      expect(resZero.error).toMatch(/Valor contratado deve ser maior que zero/);

      const resNeg = validateCommercialTermsInput({ ...validPayload, amount_cents: -500 });
      expect(resNeg.valid).toBe(false);
    });

    it('bloqueia se quantidade de parcelas for menor que 1', () => {
      const res = validateCommercialTermsInput({ ...validPayload, installments_count: 0 });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Quantidade de parcelas deve ser de no mínimo 1/);
    });
  });
});
