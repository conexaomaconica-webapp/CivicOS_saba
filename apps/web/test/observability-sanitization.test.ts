import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { maskEmail, maskPhone, sanitizeString, isSensitiveKey, sanitizeData } from '@/lib/observability/redaction';
import { createLogger } from '@/lib/observability/logger';

describe('M1.1 — Sanitização e Mascaramento de Dados Sensíveis (Redaction Guard)', () => {
  describe('maskEmail', () => {
    it('mascara e-mails mantendo a primeira letra e o domínio', () => {
      expect(maskEmail('eduardo@conexaomaconica.com.br')).toBe('e***@conexaomaconica.com.br');
      expect(maskEmail('contato@empresa.org')).toBe('c***@empresa.org');
    });

    it('trata valores inválidos ou vazios com segurança', () => {
      expect(maskEmail('')).toBe('[REDACTED_EMAIL]');
      expect(maskEmail('email-invalido')).toBe('[REDACTED_EMAIL]');
    });
  });

  describe('maskPhone', () => {
    it('mascara telefone preservando DDD e os últimos 4 dígitos', () => {
      expect(maskPhone('(75) 98127-2323')).toBe('(75) 9****-2323');
      expect(maskPhone('75981272323')).toBe('(75) 9****-2323');
    });

    it('trata números curtos com segurança', () => {
      expect(maskPhone('1234')).toBe('[REDACTED_PHONE]');
      expect(maskPhone('')).toBe('[REDACTED_PHONE]');
    });
  });

  describe('sanitizeString', () => {
    it('remove Bearer tokens e JWTs embutidos em strings', () => {
      const text = 'Erro ao autenticar com Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisToken';
      const sanitized = sanitizeString(text);
      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(sanitized).toContain('Bearer [REDACTED_TOKEN]');
    });

    it('mascara padrões de cartão de crédito', () => {
      const text = 'Cartão de crédito informado: 4532-1234-5678-9012 para processamento';
      const sanitized = sanitizeString(text);
      expect(sanitized).not.toContain('4532-1234-5678-9012');
      expect(sanitized).toContain('[REDACTED_CARD]');
    });
  });

  describe('isSensitiveKey', () => {
    it('identifica chaves sensíveis independentemente de maiúsculas/minúsculas', () => {
      expect(isSensitiveKey('password')).toBe(true);
      expect(isSensitiveKey('PASSWORD')).toBe(true);
      expect(isSensitiveKey('asaas-access-token')).toBe(true);
      expect(isSensitiveKey('accessToken')).toBe(true);
      expect(isSensitiveKey('credit_card')).toBe(true);
      expect(isSensitiveKey('cpf')).toBe(true);
      expect(isSensitiveKey('cnpj')).toBe(true);
      expect(isSensitiveKey('authorization')).toBe(true);
      expect(isSensitiveKey('business_name')).toBe(false);
      expect(isSensitiveKey('slug')).toBe(false);
    });
  });

  describe('sanitizeData', () => {
    it('sanitiza objetos aninhados com chaves sensíveis', () => {
      const payload = {
        user: {
          name: 'Irmão João da Silva',
          email: 'joao.silva@exemplo.com.br',
          password: 'SuperSecretPassword123!',
          phone: '(75) 99111-2222',
        },
        billing: {
          asaasToken: 'secret_token_value',
          amountCents: 15000,
        },
      };

      const result = sanitizeData(payload) as any;
      expect(result.user.name).toBe('Irmão João da Silva');
      expect(result.user.email).toBe('j***@exemplo.com.br');
      expect(result.user.password).toBe('[REDACTED]');
      expect(result.user.phone).toBe('(75) 9****-2222');
      expect(result.billing.asaasToken).toBe('[REDACTED]');
      expect(result.billing.amountCents).toBe(15000);
    });

    it('protege contra referências circulares sem estourar pilha', () => {
      const circularObj: any = { name: 'Teste Circular' };
      circularObj.self = circularObj;

      const result = sanitizeData(circularObj) as any;
      expect(result.name).toBe('Teste Circular');
      expect(result.self).toBe('[CIRCULAR_REFERENCE]');
    });

    it('sanitiza instâncias de Error', () => {
      const error = new Error('Falha com Bearer secret_token_xyz');
      const result = sanitizeData(error) as any;
      expect(result.name).toBe('Error');
      expect(result.message).toContain('Bearer [REDACTED_TOKEN]');
      expect(result.message).not.toContain('secret_token_xyz');
    });
  });

  describe('StructuredLogger', () => {
    let consoleSpy: any;
    let consoleWarnSpy: any;
    let consoleLogSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('emite JSON estruturado com incident_id para erros', () => {
      const testLogger = createLogger('test-service');
      const incidentId = testLogger.error('Falha de processamento', {
        provider: 'asaas',
        token: 'secret_leak_123',
      });

      expect(typeof incidentId).toBe('string');
      expect(incidentId.startsWith('inc_')).toBe(true);
      expect(consoleSpy).toHaveBeenCalledOnce();

      const loggedRaw = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(loggedRaw);

      expect(parsed.level).toBe('ERROR');
      expect(parsed.service).toBe('test-service');
      expect(parsed.message).toBe('Falha de processamento');
      expect(parsed.incident_id).toBe(incidentId);
      expect(parsed.context.token).toBe('[REDACTED]');
      expect(parsed.context.provider).toBe('asaas');
    });

    it('emite duplicate_count para assinaturas idênticas em curto intervalo', () => {
      const testLogger = createLogger('dedup-service');
      testLogger.error('Erro repetitivo');
      testLogger.error('Erro repetitivo');

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      const secondCallParsed = JSON.parse(consoleSpy.mock.calls[1][0]);
      expect(secondCallParsed.duplicate_count).toBe(2);
    });
  });
});
