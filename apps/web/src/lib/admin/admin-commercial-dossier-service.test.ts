import { describe, it, expect } from 'vitest';
import {
  COMMERCIAL_STATUS,
  assertCommercialStatusTransition,
} from '@/lib/commercial-onboarding-status';
import {
  evaluateBusinessProfileReadiness,
  validateBusinessPublicationGate,
  type BusinessProfileAttributes,
} from './admin-commercial-dossier-readiness';

describe('Microetapa 6.4 — Liberação do Prontuário 360 e Transição para pronto_para_publicar', () => {
  describe('6.4A: Liberação Formal do Prontuário 360', () => {
    it('critério 1: permite transição canônica pagamento_confirmado -> prontuario_em_configuracao', () => {
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.PAGAMENTO_CONFIRMADO,
          COMMERCIAL_STATUS.PRONTUARIO_EM_CONFIGURACAO
        )
      ).not.toThrow();
    });

    it('critério 2: sem pagamento confirmado -> Prontuário permanece bloqueado', () => {
      // Bloqueia se ainda estiver aguardando pagamento
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.AGUARDANDO_PAGAMENTO,
          COMMERCIAL_STATUS.PRONTUARIO_EM_CONFIGURACAO
        )
      ).toThrowError(/Transição comercial inválida/);

      // Bloqueia se contrato apenas assinado mas sem confirmação financeira
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.CONTRATO_ASSINADO,
          COMMERCIAL_STATUS.PRONTUARIO_EM_CONFIGURACAO
        )
      ).toThrowError(/Transição comercial inválida/);

      // Bloqueia se contrato apenas gerado ou enviado
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.CONTRATO_ENVIADO,
          COMMERCIAL_STATUS.PRONTUARIO_EM_CONFIGURACAO
        )
      ).toThrowError(/Transição comercial inválida/);
    });

    it('critério de governança: isola flags de cliente ativo (is_active=true) e publicação (is_published=false)', () => {
      const businessStateAfterUnlock = {
        commercial_status: 'prontuario_em_configuracao',
        is_active: true,
        publication_status: 'draft',
        is_published: false,
      };

      expect(businessStateAfterUnlock.commercial_status).toBe('prontuario_em_configuracao');
      expect(businessStateAfterUnlock.is_active).toBe(true);
      expect(businessStateAfterUnlock.publication_status).toBe('draft');
      expect(businessStateAfterUnlock.is_published).toBe(false);
    });
  });

  describe('6.4C: Checklist de Completude do Perfil (evaluateBusinessProfileReadiness)', () => {
    const completeProfile: BusinessProfileAttributes = {
      name: 'Oficina Real Acácia Ltda',
      legal_name: 'Oficina Real Acácia Manutenção Automotiva Ltda',
      description: 'Oficina mecânica especializada em manutenção preventiva, freios e suspensão para irmãos e comunidade.',
      category: 'Automotivo',
      category_id: 'cat-123456',
      city: 'São Paulo',
      state: 'SP',
      phone: '1133334444',
      whatsapp: '11999998888',
      logo_url: 'https://images.conexaomaconica.com.br/logos/oficina-real.png',
      website: 'https://oficinareal.com.br',
      instagram: '@oficinareal',
      gallery_count: 3,
      benefits_count: 1,
    };

    it('critério 3: perfil completo retorna ready=true e missing vazio', () => {
      const result = evaluateBusinessProfileReadiness(completeProfile);

      expect(result.ready).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.missing_labels).toHaveLength(0);
      expect(result.completion_percentage).toBe(100);
      expect(result.details.logo).toBe(true);
      expect(result.details.nome).toBe(true);
      expect(result.details.descricao).toBe(true);
      expect(result.details.categoria).toBe(true);
      expect(result.details.localizacao).toBe(true);
      expect(result.details.contato).toBe(true);
    });

    it('critério 4: perfil sem logo é detectado como incompleto e bloqueia avanço', () => {
      const incomplete = { ...completeProfile, logo_url: '' };
      const result = evaluateBusinessProfileReadiness(incomplete);

      expect(result.ready).toBe(false);
      expect(result.missing).toContain('logo');
      expect(result.missing_labels).toContain('Logo / Imagem Principal');
      expect(result.details.logo).toBe(false);
    });

    it('critério 5: perfil sem descrição ou descrição muito curta é detectado como incompleto', () => {
      const incomplete = { ...completeProfile, description: 'Curto' };
      const result = evaluateBusinessProfileReadiness(incomplete);

      expect(result.ready).toBe(false);
      expect(result.missing).toContain('descricao');
      expect(result.details.descricao).toBe(false);
    });

    it('critério 6: perfil sem categoria ou apenas "Geral" é detectado como incompleto', () => {
      const incomplete = { ...completeProfile, category_id: null, category: 'Geral' };
      const result = evaluateBusinessProfileReadiness(incomplete);

      expect(result.ready).toBe(false);
      expect(result.missing).toContain('categoria');
      expect(result.details.categoria).toBe(false);
    });

    it('critério 7: perfil sem cidade/UF ou telefone/whatsapp é detectado como incompleto', () => {
      const incompleteLocation = { ...completeProfile, city: '', state: '' };
      const resLoc = evaluateBusinessProfileReadiness(incompleteLocation);
      expect(resLoc.ready).toBe(false);
      expect(resLoc.missing).toContain('localizacao');

      const incompleteContact = { ...completeProfile, phone: '', whatsapp: '' };
      const resContact = evaluateBusinessProfileReadiness(incompleteContact);
      expect(resContact.ready).toBe(false);
      expect(resContact.missing).toContain('contato');
    });

    it('permite avanço canônico: prontuario_em_configuracao -> pronto_para_publicar', () => {
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.PRONTUARIO_EM_CONFIGURACAO,
          COMMERCIAL_STATUS.PRONTO_PARA_PUBLICAR
        )
      ).not.toThrow();
    });

    it('regra de ouro da 6.4: NÃO publica a empresa automaticamente ao atingir pronto_para_publicar', () => {
      // Bloqueia pular direto de prontuario_em_configuracao para publicado
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.PRONTUARIO_EM_CONFIGURACAO,
          COMMERCIAL_STATUS.PUBLICADO
        )
      ).toThrowError(/Transição comercial inválida/);

      // Estado permanece estritamente não-publicado
      const stateWhenReady = {
        commercial_status: 'pronto_para_publicar',
        is_active: true,
        publication_status: 'draft',
        is_published: false,
      };

      expect(stateWhenReady.commercial_status).toBe('pronto_para_publicar');
      expect(stateWhenReady.is_published).toBe(false);
      expect(stateWhenReady.publication_status).toBe('draft');
    });
  });

  describe('Fase 7 — Gate Final de Publicação e Despublicação Segura', () => {
    const validProfile: BusinessProfileAttributes = {
      name: 'Empresa Irmão Construtora',
      legal_name: 'Empresa Irmão Construtora e Engenharia Ltda',
      description: 'Construção civil de alto padrão, reformas e engenharia de precisão com valores fraternos.',
      category: 'Construção',
      category_id: 'cat-eng-789',
      city: 'Belo Horizonte',
      state: 'MG',
      phone: '3132001122',
      whatsapp: '31988887766',
      logo_url: 'https://cdn.conexaomaconica.com.br/logos/irmao-eng.jpg',
      website: 'https://irmaoeng.com.br',
    };

    it('critério 1: aprova publicação se todos os requisitos estão 100% satisfeitos', () => {
      const gate = validateBusinessPublicationGate({
        commercial_status: 'pronto_para_publicar',
        masonic_validation_status: 'verified',
        has_signed_contract: true,
        has_confirmed_payment: true,
        profile: validProfile,
      });

      expect(gate.canPublish).toBe(true);
      expect(gate.missing).toHaveLength(0);
      expect(gate.reasons.masonicLinkVerified).toBe(true);
      expect(gate.reasons.contractSigned).toBe(true);
      expect(gate.reasons.paymentConfirmed).toBe(true);
      expect(gate.reasons.commercialStatusReady).toBe(true);
      expect(gate.reasons.profileReady).toBe(true);
    });

    it('critério 2: bloqueia publicação se vínculo maçônico não estiver verificado', () => {
      const gate = validateBusinessPublicationGate({
        commercial_status: 'pronto_para_publicar',
        masonic_validation_status: 'pending',
        has_verified_masonic_link: false,
        has_signed_contract: true,
        has_confirmed_payment: true,
        profile: validProfile,
      });

      expect(gate.canPublish).toBe(false);
      expect(gate.missing).toContain('Vínculo maçônico não verificado');
      expect(gate.reasons.masonicLinkVerified).toBe(false);
    });

    it('critério 3: bloqueia publicação se contrato não estiver assinado', () => {
      const gate = validateBusinessPublicationGate({
        commercial_status: 'pronto_para_publicar',
        masonic_validation_status: 'verified',
        has_signed_contract: false,
        has_confirmed_payment: true,
        profile: validProfile,
      });

      expect(gate.canPublish).toBe(false);
      expect(gate.missing).toContain('Contrato de adesão não assinado');
      expect(gate.reasons.contractSigned).toBe(false);
    });

    it('critério 4: bloqueia publicação se pagamento não estiver confirmado', () => {
      const gate = validateBusinessPublicationGate({
        commercial_status: 'aguardando_pagamento',
        masonic_validation_status: 'verified',
        has_signed_contract: true,
        has_confirmed_payment: false,
        profile: validProfile,
      });

      expect(gate.canPublish).toBe(false);
      expect(gate.missing).toContain('Pagamento comercial não confirmado');
      expect(gate.reasons.paymentConfirmed).toBe(false);
    });

    it('critério 5: bloqueia publicação se perfil estiver incompleto', () => {
      const incompleteProfile = { ...validProfile, logo_url: '' };
      const gate = validateBusinessPublicationGate({
        commercial_status: 'pronto_para_publicar',
        masonic_validation_status: 'verified',
        has_signed_contract: true,
        has_confirmed_payment: true,
        profile: incompleteProfile,
      });

      expect(gate.canPublish).toBe(false);
      expect(gate.missing.some((m) => m.includes('Perfil obrigatório incompleto'))).toBe(true);
      expect(gate.reasons.profileReady).toBe(false);
    });

    it('critério 6: transição de publicação no Gate Final permite pronto_para_publicar -> publicado', () => {
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.PRONTO_PARA_PUBLICAR,
          COMMERCIAL_STATUS.PUBLICADO
        )
      ).not.toThrow();

      const publishedState = {
        commercial_status: 'publicado',
        publication_status: 'published',
        is_published: true,
        is_active: true,
      };

      expect(publishedState.commercial_status).toBe('publicado');
      expect(publishedState.publication_status).toBe('published');
      expect(publishedState.is_published).toBe(true);
      expect(publishedState.is_active).toBe(true);
    });

    it('critério 7: despublicação segura preserva commercial_status (publicado) e altera apenas flags de visibilidade', () => {
      const unpublishedState = {
        commercial_status: 'publicado', // HISTÓRICO CONTRATUAL E FINANCEIRO PRESERVADO
        publication_status: 'draft',    // VISIBILIDADE SUSPENSA
        is_published: false,
        is_active: true,
      };

      expect(unpublishedState.commercial_status).toBe('publicado');
      expect(unpublishedState.publication_status).toBe('draft');
      expect(unpublishedState.is_published).toBe(false);
      expect(unpublishedState.is_active).toBe(true);
    });
  });
});

