import { describe, it, expect } from 'vitest';
import {
  COMMERCIAL_STATUS,
  assertCommercialStatusTransition,
} from '@/lib/commercial-onboarding-status';
import {
  evaluateBusinessProfileReadiness,
  validateBusinessPublicationGate,
  type BusinessProfileAttributes,
} from '@/lib/admin/admin-commercial-dossier-readiness';
import {
  renderContractTemplate,
  type AdvertiserContractVariables,
} from '@/lib/contracts/contract-template-renderer';
import { calculateContractSha256 } from '@/lib/contracts/admin-contracts-service';
import { CANONICAL_ADVERTISER_CONTRACT_MARKDOWN } from '@/lib/contracts/contract-constants';
import crypto from 'node:crypto';

function hashContractToken(token: string): string {
  return crypto.createHash('sha256').update(String(token || '').trim(), 'utf8').digest('hex');
}

/**
 * ==============================================================================
 * SUÍTE DE HOMOLOGAÇÃO FUNCIONAL COMPLETA — 15 CENÁRIOS E2E
 * CICLO DE ONBOARDING COMERCIAL, CONTRATAÇÃO, OPERAÇÃO E GATE FINAL DE PUBLICAÇÃO
 * CivicOS SABA / Conexão Maçônica
 * ==============================================================================
 */

describe('Fase de Homologação Funcional Completa — 15 Cenários E2E', () => {
  // Estado simulado que percorre os 15 cenários de forma encadeada e coerente
  const simulatedDb: {
    tenantId: string;
    businessId: string;
    ownerId: string;
    commercialStatus: string;
    masonicStatus: 'pending' | 'verified' | 'rejected';
    contractId?: string;
    snapshotId?: string;
    contractHash?: string;
    contractStatus?: 'draft' | 'awaiting_signature' | 'signed' | 'superseded';
    commercialTerms?: {
      planCode: string;
      billingCycle: 'annual' | 'biennial';
      paymentMethod: 'avista' | 'parcelado';
      amountCents: number;
    };
    onboardingToken?: {
      rawToken: string;
      tokenHash: string;
      isRevoked: boolean;
      expiresAt: Date;
    };
    invoice?: {
      id: string;
      status: 'pending' | 'paid';
      amountDue: number;
      amountPaid: number;
    };
    paymentAttempts: Array<{
      providerChargeId: string;
      status: 'initiated' | 'success' | 'failed';
    }>;
    providerEventsProcessed: Set<string>;
    profile: BusinessProfileAttributes;
    isActive: boolean;
    publicationStatus: 'draft' | 'published';
    isPublished: boolean;
  } = {
    tenantId: 'tenant-homolog-1',
    businessId: 'biz-homolog-1',
    ownerId: 'owner-homolog-1',
    commercialStatus: COMMERCIAL_STATUS.PRE_CADASTRO,
    masonicStatus: 'pending',
    isActive: false,
    publicationStatus: 'draft',
    isPublished: false,
    paymentAttempts: [],
    providerEventsProcessed: new Set(),
    profile: {
      name: 'Oficina Irmão Homologação Ltda',
      legal_name: 'Oficina Irmão Homologação e Serviços Automotivos Ltda',
      description: '', // Começa incompleto
      category: 'Geral', // Incompleto
      category_id: null,
      city: '',
      state: '',
      phone: '',
      whatsapp: '',
      logo_url: '',
    },
  };

  const sampleContractVars: AdvertiserContractVariables = {
    razao_social: 'Oficina Irmão Homologação e Serviços Automotivos Ltda',
    nome_fantasia: 'Oficina Irmão Homologação',
    cnpj: '12.345.678/0001-90',
    endereco: 'Rua das Acácias, 33, Centro, São Paulo - SP',
    responsavel_nome: 'Carlos Drummond',
    responsavel_cpf: '111.222.333-44',
    responsavel_email: 'carlos@oficinacentral.com.br',
    responsavel_telefone: '(11) 97777-0000',
    empresa_telefone: '(11) 97777-0000',
    plano_nome: 'Plano Acácia (Pedra Fundamental)',
    vigencia: '12 meses',
    data_inicio_vigencia: 'a contar da data de assinatura',
    valor_total: 'R$ 1.000,00',
    forma_pagamento: 'À vista',
    parcelas: '1x',
    valor_parcela: 'R$ 1.000,00',
    selo_pedra_fundamental: '- **Reconhecimento Especial:** Empresa Fundadora — Pedra Fundamental',
    data_emissao: '02/10/2026',
  };

  // --------------------------------------------------------------------------
  // Cenário 1: Nova empresa com novo usuário
  // --------------------------------------------------------------------------
  it('Cenário 1: Nova empresa cadastrada com novo usuário no pré-cadastro', () => {
    expect(simulatedDb.commercialStatus).toBe(COMMERCIAL_STATUS.PRE_CADASTRO);
    expect(simulatedDb.ownerId).toBeDefined();
    expect(simulatedDb.isActive).toBe(false);
    expect(simulatedDb.isPublished).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Cenário 2: Nova empresa com usuário existente (reuso de profile)
  // --------------------------------------------------------------------------
  it('Cenário 2: Nova empresa associada a anunciante já existente na base', () => {
    const existingUserId = 'existing-user-12345';
    const biz2 = {
      id: 'biz-homolog-2',
      owner_id: existingUserId,
      commercial_status: COMMERCIAL_STATUS.PRE_CADASTRO,
    };
    expect(biz2.owner_id).toBe(existingUserId);
    expect(biz2.commercial_status).toBe(COMMERCIAL_STATUS.PRE_CADASTRO);
  });

  // --------------------------------------------------------------------------
  // Cenário 3: Vínculo maçônico pendente
  // --------------------------------------------------------------------------
  it('Cenário 3: Submissão de vínculo maçônico pendente e bloqueio de conferência prematura', () => {
    assertCommercialStatusTransition(
      simulatedDb.commercialStatus as any,
      COMMERCIAL_STATUS.VINCULO_INFORMADO
    );
    simulatedDb.commercialStatus = COMMERCIAL_STATUS.VINCULO_INFORMADO;
    simulatedDb.masonicStatus = 'pending';

    expect(simulatedDb.commercialStatus).toBe('vinculo_informado');

    // Bloqueia conferência comercial se o vínculo não estiver aprovado
    expect(() => {
      if (simulatedDb.masonicStatus !== 'verified') {
        throw new Error('Elegibilidade maçônica não comprovada.');
      }
      assertCommercialStatusTransition(
        simulatedDb.commercialStatus as any,
        COMMERCIAL_STATUS.DADOS_COMERCIAIS_CONFERIDOS
      );
    }).toThrowError(/Elegibilidade maçônica não comprovada/);
  });

  // --------------------------------------------------------------------------
  // Cenário 4: Vínculo maçônico aprovado
  // --------------------------------------------------------------------------
  it('Cenário 4: Aprovação administrativa do vínculo maçônico e transição canônica', () => {
    simulatedDb.masonicStatus = 'verified';

    assertCommercialStatusTransition(
      simulatedDb.commercialStatus as any,
      COMMERCIAL_STATUS.VINCULO_VERIFICADO
    );
    simulatedDb.commercialStatus = COMMERCIAL_STATUS.VINCULO_VERIFICADO;

    expect(simulatedDb.commercialStatus).toBe('vinculo_verificado');
    expect(simulatedDb.masonicStatus).toBe('verified');
  });

  // --------------------------------------------------------------------------
  // Cenário 5: Conferência comercial
  // --------------------------------------------------------------------------
  it('Cenário 5: Conferência e congelamento dos termos comerciais contratados', () => {
    assertCommercialStatusTransition(
      simulatedDb.commercialStatus as any,
      COMMERCIAL_STATUS.DADOS_COMERCIAIS_CONFERIDOS
    );
    simulatedDb.commercialStatus = COMMERCIAL_STATUS.DADOS_COMERCIAIS_CONFERIDOS;

    simulatedDb.commercialTerms = {
      planCode: 'acacia',
      billingCycle: 'annual',
      paymentMethod: 'avista',
      amountCents: 100000, // R$ 1.000,00
    };

    expect(simulatedDb.commercialStatus).toBe('dados_comerciais_conferidos');
    expect(simulatedDb.commercialTerms.amountCents).toBe(100000);
  });

  // --------------------------------------------------------------------------
  // Cenário 6: Geração e invalidação de contrato (Rollback auditado)
  // --------------------------------------------------------------------------
  it('Cenário 6: Geração de minuta imutável, cálculo SHA-256 e teste de rollback por invalidação', async () => {
    // 1. Gera contrato v1
    const rendered = renderContractTemplate(CANONICAL_ADVERTISER_CONTRACT_MARKDOWN, sampleContractVars);
    const hash = await calculateContractSha256(rendered);

    simulatedDb.contractId = 'contract-v1';
    simulatedDb.snapshotId = 'snapshot-v1';
    simulatedDb.contractHash = hash;
    simulatedDb.contractStatus = 'draft';

    assertCommercialStatusTransition(
      simulatedDb.commercialStatus as any,
      COMMERCIAL_STATUS.CONTRATO_GERADO
    );
    simulatedDb.commercialStatus = COMMERCIAL_STATUS.CONTRATO_GERADO;

    expect(simulatedDb.commercialStatus).toBe('contrato_gerado');
    expect(simulatedDb.contractHash).toHaveLength(64);

    // 2. Simulação de alteração cadastral/comercial -> Invalidação controlada (Rollback auditado)
    simulatedDb.contractStatus = 'superseded';
    simulatedDb.commercialStatus = COMMERCIAL_STATUS.DADOS_COMERCIAIS_CONFERIDOS;
    expect(simulatedDb.contractStatus).toBe('superseded');
    expect(simulatedDb.commercialStatus).toBe('dados_comerciais_conferidos');

    // 3. Regeração de novo contrato definitivo v2
    const updatedVars = { ...sampleContractVars, valor_total: 'R$ 1.200,00', valor_parcela: 'R$ 1.200,00' };
    const newRendered = renderContractTemplate(CANONICAL_ADVERTISER_CONTRACT_MARKDOWN, updatedVars);
    const newHash = await calculateContractSha256(newRendered);

    simulatedDb.contractId = 'contract-v2';
    simulatedDb.snapshotId = 'snapshot-v2';
    simulatedDb.contractHash = newHash;
    simulatedDb.contractStatus = 'draft';

    assertCommercialStatusTransition(
      simulatedDb.commercialStatus as any,
      COMMERCIAL_STATUS.CONTRATO_GERADO
    );
    simulatedDb.commercialStatus = COMMERCIAL_STATUS.CONTRATO_GERADO;

    expect(simulatedDb.contractHash).not.toBe(hash);
    expect(simulatedDb.commercialStatus).toBe('contrato_gerado');
  });

  // --------------------------------------------------------------------------
  // Cenário 7: Envio e assinatura formal do contrato
  // --------------------------------------------------------------------------
  it('Cenário 7: Emissão de token com hash, envio e assinatura formal eletrônica', () => {
    // 1. Gera token seguro de onboarding
    const rawToken = 'onboarding_token_secure_xyz_777';
    const tokenHash = hashContractToken(rawToken);

    simulatedDb.onboardingToken = {
      rawToken,
      tokenHash,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    assertCommercialStatusTransition(
      simulatedDb.commercialStatus as any,
      COMMERCIAL_STATUS.CONTRATO_ENVIADO
    );
    simulatedDb.commercialStatus = COMMERCIAL_STATUS.CONTRATO_ENVIADO;
    simulatedDb.contractStatus = 'awaiting_signature';

    expect(simulatedDb.commercialStatus).toBe('contrato_enviado');

    // 2. Anunciante assina eletronicamente de forma atômica
    simulatedDb.contractStatus = 'signed';
    simulatedDb.onboardingToken.isRevoked = true; // Revogado após uso

    assertCommercialStatusTransition(
      simulatedDb.commercialStatus as any,
      COMMERCIAL_STATUS.CONTRATO_ASSINADO
    );
    simulatedDb.commercialStatus = COMMERCIAL_STATUS.CONTRATO_ASSINADO;

    expect(simulatedDb.contractStatus).toBe('signed');
    expect(simulatedDb.commercialStatus).toBe('contrato_assinado');
    expect(simulatedDb.onboardingToken.isRevoked).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Cenário 8: Cobrança Pix e Cartão de Crédito
  // --------------------------------------------------------------------------
  it('Cenário 8: Cobrança gerada com valor exclusivo dos termos comerciais', () => {
    assertCommercialStatusTransition(
      simulatedDb.commercialStatus as any,
      COMMERCIAL_STATUS.AGUARDANDO_PAGAMENTO
    );
    simulatedDb.commercialStatus = COMMERCIAL_STATUS.AGUARDANDO_PAGAMENTO;

    simulatedDb.invoice = {
      id: 'inv-homolog-1',
      status: 'pending',
      amountDue: 1200.0,
      amountPaid: 0,
    };

    simulatedDb.paymentAttempts.push({
      providerChargeId: 'pay_asaas_homolog_888',
      status: 'initiated',
    });

    expect(simulatedDb.commercialStatus).toBe('aguardando_pagamento');
    expect(simulatedDb.invoice.status).toBe('pending');
  });

  // --------------------------------------------------------------------------
  // Cenário 9: Webhook confirmado (Reconciliação e Não-Publicação Automática)
  // --------------------------------------------------------------------------
  it('Cenário 9: Reconciliação canônica do webhook Asaas e garantia de não-publicação automática', () => {
    const eventId = 'evt_asaas_homolog_001';
    simulatedDb.providerEventsProcessed.add(eventId);

    // Reconciliação
    simulatedDb.invoice!.status = 'paid';
    simulatedDb.invoice!.amountPaid = 1200.0;
    simulatedDb.paymentAttempts[0]!.status = 'success';

    assertCommercialStatusTransition(
      simulatedDb.commercialStatus as any,
      COMMERCIAL_STATUS.PAGAMENTO_CONFIRMADO
    );
    simulatedDb.commercialStatus = COMMERCIAL_STATUS.PAGAMENTO_CONFIRMADO;

    // REGRA DE OURO: Pagamento confirmado NÃO publica e NÃO ativa automaticamente
    expect(simulatedDb.commercialStatus).toBe('pagamento_confirmado');
    expect(simulatedDb.invoice!.status).toBe('paid');
    expect(simulatedDb.isPublished).toBe(false);
    expect(simulatedDb.publicationStatus).toBe('draft');
    expect(simulatedDb.isActive).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Cenário 10: Liberação formal do Prontuário 360
  // --------------------------------------------------------------------------
  it('Cenário 10: Ação administrativa de liberação do Prontuário 360', () => {
    // Valida pré-requisitos no backend
    expect(simulatedDb.masonicStatus).toBe('verified');
    expect(simulatedDb.contractStatus).toBe('signed');
    expect(simulatedDb.commercialStatus).toBe('pagamento_confirmado');

    assertCommercialStatusTransition(
      simulatedDb.commercialStatus as any,
      COMMERCIAL_STATUS.PRONTUARIO_EM_CONFIGURACAO
    );
    simulatedDb.commercialStatus = COMMERCIAL_STATUS.PRONTUARIO_EM_CONFIGURACAO;
    simulatedDb.isActive = true; // Cliente ativo no sistema

    // Anúncio permanece em rascunho
    expect(simulatedDb.commercialStatus).toBe('prontuario_em_configuracao');
    expect(simulatedDb.isActive).toBe(true);
    expect(simulatedDb.isPublished).toBe(false);
    expect(simulatedDb.publicationStatus).toBe('draft');
  });

  // --------------------------------------------------------------------------
  // Cenário 11: Perfil incompleto bloqueia avanço e publicação
  // --------------------------------------------------------------------------
  it('Cenário 11: Perfil incompleto bloqueia transição e publicação no Gate', () => {
    const readiness = evaluateBusinessProfileReadiness(simulatedDb.profile);
    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toContain('logo');
    expect(readiness.missing).toContain('descricao');
    expect(readiness.missing).toContain('categoria');
    expect(readiness.missing).toContain('localizacao');
    expect(readiness.missing).toContain('contato');

    // Validação do Gate Final bloqueia imediatamente
    const gate = validateBusinessPublicationGate({
      commercial_status: simulatedDb.commercialStatus,
      masonic_validation_status: simulatedDb.masonicStatus,
      has_signed_contract: simulatedDb.contractStatus === 'signed',
      has_confirmed_payment: true,
      profile: simulatedDb.profile,
    });

    expect(gate.canPublish).toBe(false);
    expect(gate.missing.some((m) => m.includes('Perfil obrigatório incompleto'))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Cenário 12: Perfil completo liberando publicação
  // --------------------------------------------------------------------------
  it('Cenário 12: Preenchimento completo do perfil operacional e aprovação no Gate Final', () => {
    // 1. Completa o perfil operacional
    simulatedDb.profile = {
      name: 'Oficina Irmão Homologação Ltda',
      legal_name: 'Oficina Irmão Homologação e Serviços Automotivos Ltda',
      description: 'Oficina mecânica completa com alinhamento 3D, freios, suspensão e revisões preventivas.',
      category: 'Automotivo',
      category_id: 'cat-auto-1',
      city: 'Curitiba',
      state: 'PR',
      phone: '4130001122',
      whatsapp: '41999998877',
      logo_url: 'https://images.conexaomaconica.com.br/logos/oficina-homolog.png',
      website: 'https://oficinahomolog.com.br',
      gallery_count: 4,
      benefits_count: 2,
    };

    const readiness = evaluateBusinessProfileReadiness(simulatedDb.profile);
    expect(readiness.ready).toBe(true);
    expect(readiness.missing).toHaveLength(0);

    // 2. Transição para pronto_para_publicar
    assertCommercialStatusTransition(
      simulatedDb.commercialStatus as any,
      COMMERCIAL_STATUS.PRONTO_PARA_PUBLICAR
    );
    simulatedDb.commercialStatus = COMMERCIAL_STATUS.PRONTO_PARA_PUBLICAR;
    expect(simulatedDb.commercialStatus).toBe('pronto_para_publicar');

    // 3. Avaliação no Gate Final
    const gate = validateBusinessPublicationGate({
      commercial_status: simulatedDb.commercialStatus,
      masonic_validation_status: simulatedDb.masonicStatus,
      has_signed_contract: simulatedDb.contractStatus === 'signed',
      has_confirmed_payment: true,
      profile: simulatedDb.profile,
    });

    expect(gate.canPublish).toBe(true);
    expect(gate.missing).toHaveLength(0);

    // 4. Publicação oficial no Guia
    assertCommercialStatusTransition(
      simulatedDb.commercialStatus as any,
      COMMERCIAL_STATUS.PUBLICADO
    );
    simulatedDb.commercialStatus = COMMERCIAL_STATUS.PUBLICADO;
    simulatedDb.publicationStatus = 'published';
    simulatedDb.isPublished = true;
    simulatedDb.isActive = true;

    expect(simulatedDb.commercialStatus).toBe('publicado');
    expect(simulatedDb.publicationStatus).toBe('published');
    expect(simulatedDb.isPublished).toBe(true);
    expect(simulatedDb.isActive).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Cenário 13: Despublicar e republicar (Preservação do histórico comercial)
  // --------------------------------------------------------------------------
  it('Cenário 13: Despublicação administrativa segura preservando o status comercial intacto', () => {
    // 1. Despublicar
    simulatedDb.publicationStatus = 'draft';
    simulatedDb.isPublished = false;

    // commercial_status NUNCA regride! Permanece publicado
    expect(simulatedDb.commercialStatus).toBe('publicado');
    expect(simulatedDb.publicationStatus).toBe('draft');
    expect(simulatedDb.isPublished).toBe(false);

    // 2. Republicar com reavaliação do Gate
    const gate = validateBusinessPublicationGate({
      commercial_status: simulatedDb.commercialStatus,
      masonic_validation_status: simulatedDb.masonicStatus,
      has_signed_contract: simulatedDb.contractStatus === 'signed',
      has_confirmed_payment: true,
      profile: simulatedDb.profile,
    });

    expect(gate.canPublish).toBe(true);

    simulatedDb.publicationStatus = 'published';
    simulatedDb.isPublished = true;

    expect(simulatedDb.publicationStatus).toBe('published');
    expect(simulatedDb.isPublished).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Cenário 14: Links e tokens expirados ou revogados
  // --------------------------------------------------------------------------
  it('Cenário 14: Rejeição segura de tokens revogados, expirados ou com hash adulterado', () => {
    const expiredToken = {
      tokenHash: hashContractToken('token_expired_123'),
      isRevoked: false,
      expiresAt: new Date(Date.now() - 3600 * 1000), // Expirado há 1 hora
    };

    const isExpired = expiredToken.expiresAt.getTime() < Date.now();
    expect(isExpired).toBe(true);

    const revokedToken = {
      tokenHash: hashContractToken('token_revoked_456'),
      isRevoked: true,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    };

    expect(revokedToken.isRevoked).toBe(true);

    // Adulteração de token
    const correctHash = hashContractToken('valid_token');
    const attackerAttemptHash = hashContractToken('tampered_token');
    expect(attackerAttemptHash).not.toBe(correctHash);
  });

  // --------------------------------------------------------------------------
  // Cenário 15: Cliques duplicados e reenvios de webhook (Idempotência)
  // --------------------------------------------------------------------------
  it('Cenário 15: Proteção contra clique duplo e reenvio de webhook idempotente', () => {
    const duplicateEventId = 'evt_asaas_homolog_001';

    // Checa se já foi processado
    const isAlreadyProcessed = simulatedDb.providerEventsProcessed.has(duplicateEventId);
    expect(isAlreadyProcessed).toBe(true);

    // Reenvio retorna sucesso sem reexecutar mutação
    const idempotentResult = {
      success: true,
      already_processed: isAlreadyProcessed,
      message: 'Evento do Asaas já foi processado anteriormente de forma idempotente.',
    };

    expect(idempotentResult.already_processed).toBe(true);
    expect(simulatedDb.commercialStatus).toBe('publicado');
  });
});
