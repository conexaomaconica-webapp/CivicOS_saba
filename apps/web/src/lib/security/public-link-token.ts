import crypto from 'crypto';

/**
 * Token curto para links públicos de contratação e pagamento (ex.: /contratacao/Xk9fP2mQv7LdT3aB).
 *
 * - 16 caracteres de um alfabeto de 57 símbolos (sem 0/O/1/I/l, que se confundem ao digitar):
 *   ~93 bits de entropia, inviável de adivinhar. O token continua sendo guardado apenas como hash SHA-256,
 *   tem validade e pode ser revogado.
 * - Sorteio por amostragem com rejeição, para não enviesar a distribuição.
 */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export const PUBLIC_LINK_TOKEN_LENGTH = 16;

/** Tamanho mínimo aceito na validação. Tokens antigos (96 caracteres hex) continuam válidos. */
export const MIN_PUBLIC_LINK_TOKEN_LENGTH = 12;

export function generatePublicLinkToken(length: number = PUBLIC_LINK_TOKEN_LENGTH): string {
  const limit = 256 - (256 % ALPHABET.length);
  let token = '';
  while (token.length < length) {
    for (const byte of crypto.randomBytes(length * 2)) {
      if (byte < limit) {
        token += ALPHABET[byte % ALPHABET.length];
        if (token.length === length) break;
      }
    }
  }
  return token;
}
