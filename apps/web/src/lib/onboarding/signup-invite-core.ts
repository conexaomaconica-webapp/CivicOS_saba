import crypto from 'crypto';
import { validateEmail, validateName } from '@/lib/auth/validation';
import { sanitizeCnpj, validateCpfCnpj, validatePhone } from '@/lib/onboarding/onboarding-validation';

/**
 * Núcleo do convite de cadastro (sem 'use server'): token, hash e validação dos dados enviados pelo cliente.
 * O cliente só informa dados cadastrais: nada de plano, preço, contrato, pagamento ou publicação.
 */

import { MASONIC_RELATIONS, type MasonicRelation } from '@/lib/onboarding/signup-invite-shared';

export { MASONIC_RELATIONS, MASONIC_RELATION_LABEL, buildInviteShareMessage, type MasonicRelation } from '@/lib/onboarding/signup-invite-shared';

export type InviteStatus = 'sent' | 'submitted' | 'converted' | 'revoked';

export interface SignupSubmission {
  responsibleName: string;
  responsibleEmail: string;
  responsiblePhone: string;
  tradingName: string;
  legalName: string;
  document: string;
  businessPhone: string;
  publicEmail: string;
  website: string;
  /** Categoria escolhida do catálogo; vazia quando o cliente sugere uma nova em categoryOther. */
  categoryId: string;
  categoryOther: string;
  postalCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  masonicRelation: MasonicRelation;
  referenceMasonName: string;
  referenceMasonCim: string;
  lodgeName: string;
  /** Loja escolhida na lista do cadastro (vazio se o cliente digitou um nome que não está na lista). */
  lodgeOrganizationId: string;
  potency: string;
  consent: boolean;
  /** Plano comercial de interesse escolhido pelo cliente no convite. */
  planInterest?: string;
  /** Forma de pagamento preferida: 'pix' | 'credit_card'. */
  paymentPreference?: string;
}

export const INVITE_TTL_DAYS_DEFAULT = 15;
export const INVITE_TTL_DAYS_MAX = 60;

/**
 * Código curto do convite: 12 caracteres de um alfabeto sem letras/números confundíveis (sem 0, O, 1, I, L), ~60 bits de
 * aleatoriedade. Como o convite é de uso único e expira, isso é suficiente e cabe num link curto: /c/AB12CD34EF56.
 */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 12;

export function generateInviteToken(): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return code;
}

const SHORT_CODE = new RegExp(`^[${CODE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`);
const LEGACY_TOKEN = /^[0-9a-f]{64}$/;

/** Normaliza o que veio na URL: o código curto não diferencia maiúsculas; convites antigos (64 hex) continuam valendo. */
export function normalizeInviteToken(raw: string): string | null {
  const text = String(raw ?? '').trim();
  if (LEGACY_TOKEN.test(text)) return text;
  const upper = text.toUpperCase();
  return SHORT_CODE.test(upper) ? upper : null;
}

export function hashInviteToken(token: string): string {
  return crypto.createHash('sha256').update(normalizeInviteToken(token) ?? token).digest('hex');
}

const clean = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/** Texto bruto (formulário/FormData) -> submissão normalizada, com limites de tamanho. */
export function normalizeSubmission(raw: Record<string, unknown>): SignupSubmission {
  const relation = String(raw.masonicRelation ?? '') as MasonicRelation;
  return {
    responsibleName: clean(raw.responsibleName, 120),
    responsibleEmail: clean(raw.responsibleEmail, 160).toLowerCase(),
    responsiblePhone: clean(raw.responsiblePhone, 20),
    tradingName: clean(raw.tradingName, 120),
    legalName: clean(raw.legalName, 160),
    document: sanitizeCnpj(clean(raw.document, 24)),
    businessPhone: clean(raw.businessPhone, 20),
    publicEmail: clean(raw.publicEmail, 160).toLowerCase(),
    website: clean(raw.website, 200),
    categoryId: clean(raw.categoryId, 60),
    categoryOther: clean(raw.categoryOther, 80),
    postalCode: clean(raw.postalCode, 12),
    street: clean(raw.street, 160),
    number: clean(raw.number, 20),
    neighborhood: clean(raw.neighborhood, 100),
    city: clean(raw.city, 100),
    state: clean(raw.state, 2).toUpperCase(),
    masonicRelation: (MASONIC_RELATIONS as readonly string[]).includes(relation) ? relation : 'mason',
    referenceMasonName: clean(raw.referenceMasonName, 120),
    referenceMasonCim: clean(raw.referenceMasonCim, 30),
    lodgeName: clean(raw.lodgeName, 160),
    lodgeOrganizationId: /^[0-9a-f-]{36}$/i.test(String(raw.lodgeOrganizationId ?? '')) ? String(raw.lodgeOrganizationId) : '',
    potency: clean(raw.potency, 80),
    consent: raw.consent === true || raw.consent === 'true' || raw.consent === 'on',
    planInterest: clean(raw.planInterest, 60) || 'acacia_pedra_fundamental',
    paymentPreference: clean(raw.paymentPreference, 40) || 'pix',
  };
}

/** Primeira mensagem de erro encontrada (pt-BR), ou null se os dados estão completos e válidos. */
export function validateSubmission(data: SignupSubmission): string | null {
  const phoneError = (value: string) => (value ? validatePhone(value) : null);
  return (
    validateName(data.responsibleName) ??
    validateEmail(data.responsibleEmail) ??
    phoneError(data.responsiblePhone) ??
    validateName(data.tradingName) ??
    validateName(data.legalName) ??
    (data.document ? validateCpfCnpj(data.document) : 'Informe o CNPJ ou CPF.') ??
    phoneError(data.businessPhone) ??
    (data.publicEmail ? validateEmail(data.publicEmail) : null) ??
    (!data.categoryId && !data.categoryOther ? 'Escolha a categoria da empresa (ou informe qual é, se não estiver na lista).' : null) ??
    (!/^[A-Z]{2}$/.test(data.state) || !data.city ? 'Informe a cidade e o estado da empresa.' : null) ??
    (!data.lodgeName ? 'Informe a Loja Maçônica.' : null) ??
    (!data.potency ? 'Informe a Potência da Loja.' : null) ??
    (!data.referenceMasonName ? 'Informe o nome do maçom de referência.' : null) ??
    (!data.consent ? 'É necessário concordar com o uso dos dados para a análise do cadastro.' : null)
  );
}

export function isInviteUsable(invite: { status: string; expires_at: string }): boolean {
  return invite.status === 'sent' && new Date(invite.expires_at).getTime() > Date.now();
}
