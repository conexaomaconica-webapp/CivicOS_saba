import 'server-only';
import crypto from 'crypto';

function getDerivedEncryptionKey(): Buffer {
  const source =
    process.env.ASAAS_SETTINGS_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!source) {
    throw new Error(
      'ASAAS_SETTINGS_ENCRYPTION_KEY não configurada.'
    );
  }

  return crypto.createHash('sha256').update(source).digest();
}

export function encryptSecret(plainText: string): string {
  if (!plainText || !plainText.trim()) return '';

  const iv = crypto.randomBytes(12);
  const key = getDerivedEncryptionKey();

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText.trim(), 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

export function decryptSecret(cipherText: string): string {
  if (!cipherText || !cipherText.includes(':')) return '';

  try {
    const [ivHex, authTagHex, encryptedHex] = cipherText.split(':');

    if (!ivHex || !authTagHex || !encryptedHex) {
      return '';
    }

    const key = getDerivedEncryptionKey();

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivHex, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

export function maskSecret(secret: string): string {
  if (!secret) return '';

  const clean = secret.trim();

  if (clean.length <= 8) {
    return '••••••••';
  }

  return `${clean.slice(0, 6)}••••••••••••${clean.slice(-4)}`;
}
