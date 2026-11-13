import 'server-only';
import { encryptSecret } from '@/lib/payment/asaas-secrets';
import { hmacHex } from './commercial-utils';

/**
 * Hash e cifra de dados sensíveis do módulo comercial (documento, chave PIX, chave de duplicidade de leads).
 * Chave: COMMERCIAL_HASH_KEY (recomendado, dedicada) com fallback à mesma origem usada pelas demais cifras do
 * projeto. Documento completo e PIX ficam cifrados (AES-256-GCM); no banco só há hash e últimos dígitos legíveis.
 */
function hashKey(): string {
  const key = process.env.COMMERCIAL_HASH_KEY || process.env.ASAAS_SETTINGS_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Chave de hash comercial não configurada (COMMERCIAL_HASH_KEY).');
  return key;
}

export function hashSensitive(value: string): string {
  return hmacHex(value, hashKey());
}

export function dedupeKeyKey(): string {
  return hashKey();
}

export function encryptSensitive(value: string): string {
  return encryptSecret(value);
}
