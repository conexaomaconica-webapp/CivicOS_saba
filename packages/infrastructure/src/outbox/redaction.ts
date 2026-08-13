// ============================================================================
// Payload Redaction — Outbox DLQ (INF-003)
// ============================================================================
// Doc 06 §1.1.6 prohibits raw payloads in events (no PDFs, full CPF/CNPJ,
// gateway payloads, secrets). Before an event is persisted in the DLQ
// (`failed_event_queue.payload_redacted`), sensitive values are removed
// (redaction automatic: PII, tokens e hashes — Doc 06 §5.2.1).
// ============================================================================

import type { RedactionRule } from './outbox-types';

const DEFAULT_SENSITIVE_KEYS = [
  // Personal identifiable information (PII)
  'cpf',
  'cnpj',
  'rg',
  'passport',
  'document',
  'document_number',
  'birth_date',
  'email',
  'phone',
  'cellphone',
  'telephone',
  'address',
  'zipcode',
  'cep',
  'street',
  'iban',
  'card_number',
  'cvv',
  // Tokens, secrets and hashes
  'password',
  'passwd',
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'apikey',
  'secret',
  'secret_key',
  'private_key',
  'authorization',
  'cookie',
  'set_cookie',
  'x_api_key',
  'hash',
  'sha256',
  'id_token',
  'session',
] as const;

export interface PayloadRedactorOptions {
  /** Additional sensitive keys to redact (merged with the defaults). */
  extraSensitiveKeys?: string[];
  /** Replacements string. Default: `[REDACTED]`. */
  replacement?: string;
}

function toLowerSnake(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * Recursively strips sensitive values from a payload before persisting it in
 * the DLQ. Sensitive keys are matched case-insensitively (camelCase and
 * snake_case variants), including nested objects and arrays.
 */
export class PayloadRedactor implements RedactionRule {
  readonly sensitiveKeys: string[];
  readonly replacement: string;

  private readonly normalizedSensitiveKeys: ReadonlySet<string>;

  constructor(options: PayloadRedactorOptions = {}) {
    this.sensitiveKeys = [...DEFAULT_SENSITIVE_KEYS, ...(options.extraSensitiveKeys ?? [])];
    this.replacement = options.replacement ?? '[REDACTED]';
    this.normalizedSensitiveKeys = new Set(this.sensitiveKeys.map(toLowerSnake));
  }

  isSensitive(key: string): boolean {
    return this.normalizedSensitiveKeys.has(toLowerSnake(key));
  }

  /**
   * Returns a deep copy of the payload with sensitive values redacted.
   * Primitive values (numbers, booleans) are redacted too when the key matches.
   */
  redact(payload: unknown): unknown {
    if (Array.isArray(payload)) {
      return payload.map((item) => this.redact(item));
    }

    if (payload !== null && typeof payload === 'object') {
      const output: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
        output[key] = this.isSensitive(key) ? this.replacement : this.redact(value);
      }
      return output;
    }

    return payload;
  }
}

export const defaultRedactor = new PayloadRedactor();
