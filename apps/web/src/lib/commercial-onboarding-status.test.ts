import { describe, it, expect } from 'vitest';
import {
  COMMERCIAL_STATUS_ORDER,
  canTransitionCommercialStatus,
  assertCommercialStatusTransition,
  isCommercialStatus,
} from './commercial-onboarding-status';

describe('Commercial Status State Machine', () => {
  it('contém os 12 estados oficiais ordenados', () => {
    expect(COMMERCIAL_STATUS_ORDER).toHaveLength(12);
    expect(COMMERCIAL_STATUS_ORDER).toEqual([
      'pre_cadastro',
      'vinculo_informado',
      'vinculo_verificado',
      'dados_comerciais_conferidos',
      'contrato_gerado',
      'contrato_enviado',
      'contrato_assinado',
      'aguardando_pagamento',
      'pagamento_confirmado',
      'prontuario_em_configuracao',
      'pronto_para_publicar',
      'publicado',
    ]);
  });

  describe('Validações de Transição canTransitionCommercialStatus', () => {
    it('permite: pre_cadastro -> vinculo_informado', () => {
      expect(
        canTransitionCommercialStatus('pre_cadastro', 'vinculo_informado')
      ).toBe(true);
    });

    it('permite: vinculo_informado -> vinculo_verificado', () => {
      expect(
        canTransitionCommercialStatus('vinculo_informado', 'vinculo_verificado')
      ).toBe(true);
    });

    it('bloqueia: pre_cadastro -> contrato_gerado', () => {
      expect(
        canTransitionCommercialStatus('pre_cadastro', 'contrato_gerado')
      ).toBe(false);
    });

    it('permite: aguardando_pagamento -> pagamento_confirmado', () => {
      expect(
        canTransitionCommercialStatus('aguardando_pagamento', 'pagamento_confirmado')
      ).toBe(true);
    });

    it('bloqueia: contrato_assinado -> pagamento_confirmado', () => {
      expect(
        canTransitionCommercialStatus('contrato_assinado', 'pagamento_confirmado')
      ).toBe(false);
    });

    it('bloqueia: contrato_enviado -> pagamento_confirmado', () => {
      expect(
        canTransitionCommercialStatus('contrato_enviado', 'pagamento_confirmado')
      ).toBe(false);
    });

    it('bloqueia: pagamento_confirmado -> publicado', () => {
      expect(
        canTransitionCommercialStatus('pagamento_confirmado', 'publicado')
      ).toBe(false);
    });

    it('permite: pronto_para_publicar -> publicado', () => {
      expect(
        canTransitionCommercialStatus('pronto_para_publicar', 'publicado')
      ).toBe(true);
    });

    it('permite transição reflexiva (mesmo status)', () => {
      expect(
        canTransitionCommercialStatus('pre_cadastro', 'pre_cadastro')
      ).toBe(true);
      expect(
        canTransitionCommercialStatus('publicado', 'publicado')
      ).toBe(true);
    });
  });

  describe('assertCommercialStatusTransition', () => {
    it('executa sem erro em transição válida', () => {
      expect(() =>
        assertCommercialStatusTransition('pre_cadastro', 'vinculo_informado')
      ).not.toThrow();
    });

    it('executa sem erro em transição reflexiva', () => {
      expect(() =>
        assertCommercialStatusTransition('pre_cadastro', 'pre_cadastro')
      ).not.toThrow();
    });

    it('lança erro em transição inválida pre_cadastro -> contrato_gerado', () => {
      expect(() =>
        assertCommercialStatusTransition('pre_cadastro', 'contrato_gerado')
      ).toThrowError(/Transição comercial inválida/);
    });

    it('lança erro em salto direto para pagamento_confirmado', () => {
      expect(() =>
        assertCommercialStatusTransition('contrato_assinado', 'pagamento_confirmado')
      ).toThrowError(/Transição comercial inválida: "contrato_assinado" → "pagamento_confirmado"/);
    });
  });

  describe('isCommercialStatus', () => {
    it('valida status válidos', () => {
      expect(isCommercialStatus('pre_cadastro')).toBe(true);
      expect(isCommercialStatus('publicado')).toBe(true);
    });

    it('rejeita valores inválidos ou legados', () => {
      expect(isCommercialStatus('interesse_recebido')).toBe(false);
      expect(isCommercialStatus('qualquer_coisa')).toBe(false);
      expect(isCommercialStatus(null)).toBe(false);
      expect(isCommercialStatus(123)).toBe(false);
    });
  });
});
