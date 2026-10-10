/**
 * Redaction Guard — Sanitização e Mascaramento de Dados Sensíveis para LGPD e Segurança
 *
 * Garante que senhas, tokens de autorização, dados bancários, números de cartão,
 * CPFs e segredos nunca sejam emitidos em logs do sistema ou alertas operacionais.
 */

// Chaves de propriedades que devem ter seus valores completamente mascarados ou removidos
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /access_token/i,
  /refresh_token/i,
  /authorization/i,
  /cookie/i,
  /set-cookie/i,
  /asaas-access-token/i,
  /service_role/i,
  /api_key/i,
  /apikey/i,
  /credit_card/i,
  /card_number/i,
  /cvv/i,
  /cvc/i,
  /security_code/i,
  /cpf/i,
  /cnpj/i,
  /private_key/i,
  /certificate/i,
];

// Padrões de dados sensíveis em strings
const BEARER_TOKEN_REGEX = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const JWT_REGEX = /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;

/**
 * Mascara e-mails preservando apenas o domínio e primeira letra do usuário.
 * Ex: eduan@exemplo.com.br -> e***@exemplo.com.br
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '[REDACTED_EMAIL]';
  const parts = email.trim().split('@');
  if (parts.length !== 2) return '[REDACTED_EMAIL]';
  const [user, domain] = parts;
  if (!user || user.length === 0) return `***@${domain}`;
  const firstLetter = user.charAt(0);
  return `${firstLetter}***@${domain}`;
}

/**
 * Mascara telefones preservando apenas DDD e final.
 * Ex: (75) 98127-2323 -> (75) 9****-2323
 */
export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '[REDACTED_PHONE]';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return '[REDACTED_PHONE]';
  const ddd = digits.slice(0, 2);
  const end = digits.slice(-4);
  return `(${ddd}) 9****-${end}`;
}

/**
 * Sanitiza strings substituindo tokens, JWTs e números de cartão.
 */
export function sanitizeString(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let sanitized = text;
  sanitized = sanitized.replace(BEARER_TOKEN_REGEX, 'Bearer [REDACTED_TOKEN]');
  sanitized = sanitized.replace(JWT_REGEX, '[REDACTED_JWT]');
  sanitized = sanitized.replace(CREDIT_CARD_REGEX, '[REDACTED_CARD]');

  return sanitized;
}

/**
 * Verifica se uma chave de objeto é sensível com base na lista de padrões.
 */
export function isSensitiveKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Sanitiza recursivamente objetos, arrays, erros e primitivos.
 * Protegido contra referências circulares via WeakSet.
 */
export function sanitizeData(data: unknown, seen = new WeakSet()): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  // Primitivos
  if (typeof data === 'string') {
    return sanitizeString(data);
  }
  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }
  if (typeof data === 'function' || typeof data === 'symbol') {
    return `[${typeof data}]`;
  }

  // Instâncias de Error
  if (data instanceof Error) {
    return {
      name: data.name,
      message: sanitizeString(data.message),
      stack: data.stack ? sanitizeString(data.stack) : undefined,
    };
  }

  // Prevenção de loop em objetos circulares
  if (typeof data === 'object') {
    if (seen.has(data)) {
      return '[CIRCULAR_REFERENCE]';
    }
    seen.add(data);

    // Arrays
    if (Array.isArray(data)) {
      return data.map((item) => sanitizeData(item, seen));
    }

    // Objetos comuns
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (isSensitiveKey(key)) {
        sanitizedObj[key] = '[REDACTED]';
        continue;
      }

      // Mascaramento especial de campos de identificação pessoal comum
      if (key.toLowerCase() === 'email' && typeof value === 'string') {
        sanitizedObj[key] = maskEmail(value);
        continue;
      }
      if (key.toLowerCase() === 'phone' && typeof value === 'string') {
        sanitizedObj[key] = maskPhone(value);
        continue;
      }

      sanitizedObj[key] = sanitizeData(value, seen);
    }
    return sanitizedObj;
  }

  return '[UNPROCESSABLE_DATA]';
}
