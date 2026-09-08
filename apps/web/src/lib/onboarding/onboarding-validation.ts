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

export function validateCpf(cpf: string): string | null {
  const digits = cpf.replace(/\D/g, '');
  if (!digits) return 'Informe o CPF.';
  if (digits.length !== 11) return 'CPF deve ter 11 dígitos.';
  if (/^(\d)\1{10}$/.test(digits)) return 'CPF inválido.';
  
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== Number(digits[9])) return 'CPF inválido. Verifique os dígitos.';

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== Number(digits[10])) return 'CPF inválido. Verifique os dígitos.';

  return null;
}

export function validateCpfCnpj(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 11) return validateCpf(digits);
  if (digits.length === 14) return validateCnpj(digits);
  return 'Documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ).';
}

export function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function formatPhone(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Brazilian phone (WhatsApp): optional +55, DDD + 8/9 digits → 10 or 11 digits.
 */
export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '').replace(/^55/, '');
  if (!digits) {
    return 'Informe o telefone de contato.';
  }
  if (digits.length < 10 || digits.length > 11) {
    return 'Telefone inválido. Informe DDD + número (10 ou 11 dígitos).';
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