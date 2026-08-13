import { validateName, validateEmail } from '@/lib/auth/validation';

// ---------------------------------------------------------------------------
// ADV-001 (CRIT-VSC-003) — responsible-account step validation (CRIT-TRN-023)
// ---------------------------------------------------------------------------

export type ResponsibleRelationship = 'owner' | 'representative';

export const RESPONSIBLE_RELATIONSHIP_LABELS: Record<ResponsibleRelationship, string> = {
  owner: 'Proprietário / Sócio Direto',
  representative: 'Representante Comercial / Procurador',
};

export interface ResponsibleStepFields {
  name: string;
  email: string;
  relationship: ResponsibleRelationship | '';
}

export interface ResponsibleStepErrors {
  name?: string;
  email?: string;
  relationship?: string;
}

export function validateResponsibleRelationship(value: ResponsibleStepFields['relationship']): string | null {
  if (!value) {
    return 'Declare sua relação com a empresa.';
  }
  if (value !== 'owner' && value !== 'representative') {
    return 'Relação inválida.';
  }
  return null;
}

export function validateResponsibleStep(fields: ResponsibleStepFields): ResponsibleStepErrors {
  const errors: ResponsibleStepErrors = {};

  const name = validateName(fields.name);
  if (name) errors.name = name;

  const email = validateEmail(fields.email);
  if (email) errors.email = email;

  const relationship = validateResponsibleRelationship(fields.relationship);
  if (relationship) errors.relationship = relationship;

  return errors;
}

export function hasResponsibleStepErrors(errors: ResponsibleStepErrors): boolean {
  return Boolean(errors.name || errors.email || errors.relationship);
}

// ---------------------------------------------------------------------------
// ADV-002 (CRIT-VSC-003) — business-data step validation
// ---------------------------------------------------------------------------

export interface BusinessStepFields {
  cnpj: string;
  legalName: string;
  tradingName: string;
  phone: string;
  categoryId: string;
}

export interface BusinessStepErrors {
  cnpj?: string;
  legalName?: string;
  tradingName?: string;
  phone?: string;
  categoryId?: string;
}

const CNPJ_WEIGHTS_FIRST = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS_SECOND = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function sanitizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

export function formatCnpj(cnpj: string): string {
  const digits = sanitizeCnpj(cnpj).padEnd(14, '0').slice(0, 14);
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function computeCnpjCheckDigit(digits: string, weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < weights.length; i += 1) {
    sum += Number(digits[i]) * weights[i]!;
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/**
 * CRIT-VSC-003 — algorithmic CNPJ validation (format + check digits).
 */
export function validateCnpj(cnpj: string): string | null {
  const digits = sanitizeCnpj(cnpj);
  if (!digits) {
    return 'Informe o CNPJ.';
  }
  if (digits.length !== 14) {
    return 'CNPJ deve ter 14 dígitos.';
  }
  if (/^(\d)\1{13}$/.test(digits)) {
    return 'CNPJ inválido.';
  }
  const firstCheck = computeCnpjCheckDigit(digits, CNPJ_WEIGHTS_FIRST);
  if (firstCheck !== Number(digits[12])) {
    return 'CNPJ inválido. Verifique os dígitos.';
  }
  const secondCheck = computeCnpjCheckDigit(digits, CNPJ_WEIGHTS_SECOND);
  if (secondCheck !== Number(digits[13])) {
    return 'CNPJ inválido. Verifique os dígitos.';
  }
  return null;
}

/**
 * Brazilian phone (WhatsApp): optional +55, DDD + 8/9 digits → 10 or 11 digits.
 */
export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '').replace(/^55/, '');
  if (!digits) {
    return 'Informe o WhatsApp.';
  }
  if (digits.length < 10 || digits.length > 11) {
    return 'Telefone inválido. Informe DDD + número.';
  }
  return null;
}

export function validateBusinessStep(fields: BusinessStepFields): BusinessStepErrors {
  const errors: BusinessStepErrors = {};

  const cnpj = validateCnpj(fields.cnpj);
  if (cnpj) errors.cnpj = cnpj;

  const legalName = validateName(fields.legalName);
  if (legalName) errors.legalName = legalName;

  const tradingName = validateName(fields.tradingName);
  if (tradingName) errors.tradingName = tradingName;

  const phone = validatePhone(fields.phone);
  if (phone) errors.phone = phone;

  if (!fields.categoryId) {
    errors.categoryId = 'Selecione uma categoria.';
  }

  return errors;
}

export function hasBusinessStepErrors(errors: BusinessStepErrors): boolean {
  return Boolean(errors.cnpj || errors.legalName || errors.tradingName || errors.phone || errors.categoryId);
}