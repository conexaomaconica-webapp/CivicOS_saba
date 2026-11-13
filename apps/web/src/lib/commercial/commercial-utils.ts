import crypto from 'node:crypto';

/**
 * Utilitários PUROS do Módulo Comercial (sem I/O de banco): normalização, códigos, prazos e mensagens.
 * Testáveis isoladamente; o hash com segredo recebe a chave por parâmetro (ver commercial-secrets.ts).
 */

export function normalizeEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

export function isValidEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) && value.length <= 254;
}

/** Últimos 4 dígitos/caracteres do documento (para exibição; o valor completo fica cifrado). */
export function documentLast4(document: string): string {
  const digits = onlyDigits(document);
  return digits.slice(-4);
}

/** HMAC-SHA256 hexadecimal (chave fornecida por quem chama). */
export function hmacHex(value: string, key: string): string {
  return crypto.createHmac('sha256', key).update(value).digest('hex');
}

/**
 * Chave de duplicidade de lead: documento (preferencial) ou e-mail normalizado. Estável e sem expor o dado.
 * Retorna null quando não há como identificar o prospect.
 */
export function leadDedupeKey(input: { document?: string | null; email?: string | null }, key: string): string | null {
  const digits = onlyDigits(input.document);
  if (digits.length === 11 || digits.length === 14) return hmacHex(`doc:${digits}`, key);
  const email = normalizeEmail(input.email);
  if (isValidEmail(email)) return hmacHex(`email:${email}`, key);
  return null;
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Código de indicação no formato REP-XXXXXXXX (disjunto dos convites e dos códigos B2C de membros). */
export function generateReferralCode(randomInt: (max: number) => number = (max) => crypto.randomInt(max)): string {
  let out = '';
  for (let i = 0; i < 8; i += 1) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `REP-${out}`;
}

export function isValidReferralCode(value: string): boolean {
  return /^REP-[A-Z0-9]{6,10}$/.test(value);
}

/** Token do cookie de indicação: 128 bits aleatórios (base64url). Nunca contém o código do representante. */
export function generateReferralToken(randomBytes: (size: number) => Buffer = (size) => crypto.randomBytes(size)): string {
  return randomBytes(16).toString('base64url');
}

export function isValidReferralToken(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{22}$/.test(value);
}

/** SHA-256 hexadecimal do token: é o que o banco guarda (o token claro existe só no cookie do navegador). */
export function hashReferralToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Fim da validade (ex.: indicação de 30 dias). */
export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export const REPRESENTATIVE_TRANSITIONS: Record<string, string[]> = {
  invited: ['pending_review', 'active', 'terminated'],
  pending_review: ['active', 'terminated'],
  active: ['suspended', 'terminated'],
  suspended: ['active', 'terminated'],
  terminated: [],
};

export function canTransitionRepresentative(from: string, to: string): boolean {
  return (REPRESENTATIVE_TRANSITIONS[from] ?? []).includes(to);
}

/** Mensagens amigáveis para as exceções das funções SQL (migration 238) e violações de unicidade. */
export function friendlyCommercialError(message: string | undefined | null): string {
  const m = message ?? '';
  const map: Array<[RegExp, string]> = [
    [/lead_requires_activity/, 'Registre ao menos uma atividade de contato (ligação, reunião, proposta ou acompanhamento) antes de qualificar o lead.'],
    [/lead_not_qualifiable/, 'Este lead não pode ser qualificado no estado atual.'],
    [/lead_closed/, 'Este lead já está encerrado.'],
    [/lead_not_convertible/, 'Este lead já foi convertido, perdido ou expirou.'],
    [/lead_without_representative/, 'Este lead não tem representante vinculado.'],
    [/lead_not_found/, 'Lead não encontrado.'],
    [/business_not_found/, 'Empresa não encontrada neste ambiente.'],
    [/attribution_conflict/, 'Esta empresa já possui uma atribuição confirmada para outro representante.'],
    [/attribution_not_pending/, 'A atribuição não está pendente.'],
    [/attribution_expired/, 'A validade desta atribuição pendente já terminou.'],
    [/attribution_not_found/, 'Atribuição não encontrada.'],
    [/representative_not_active/, 'O representante não está ativo.'],
    [/uq_commercial_leads_active_dedupe|duplicate key.*dedupe/i, 'Este contato já está em atendimento por um representante.'],
    [/uq_commercial_representatives_document/, 'Já existe um representante com este documento.'],
    [/uq_commercial_representatives_code/, 'Conflito ao gerar o código de indicação; tente novamente.'],
    [/uq_commercial_attributions_confirmed_business/, 'Esta empresa já possui uma atribuição confirmada.'],
  ];
  for (const [pattern, text] of map) if (pattern.test(m)) return text;
  return 'Não foi possível concluir a operação. Tente novamente.';
}
