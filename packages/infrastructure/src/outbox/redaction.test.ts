import { describe, it, expect } from 'vitest';

import { PayloadRedactor, defaultRedactor } from './redaction';

describe('PayloadRedactor', () => {
  it('redacts tokens, PII and hashes while preserving non-sensitive data', () => {
    const payload = {
      businessId: 'biz_123',
      planId: 'plan_gold',
      cpf: '123.456.789-00',
      accessToken: 'tok_secret',
      email: 'owner@example.com',
      hash: 'a1b2c3',
      nested: {
        cardNumber: '4111 1111 1111 1111',
        city: 'São Paulo',
      },
      tags: ['alpha', 'beta'],
    };

    const redacted = defaultRedactor.redact(payload) as Record<string, unknown>;

    expect(redacted['businessId']).toBe('biz_123');
    expect(redacted['planId']).toBe('plan_gold');
    expect(redacted['cpf']).toBe('[REDACTED]');
    expect(redacted['accessToken']).toBe('[REDACTED]');
    expect(redacted['email']).toBe('[REDACTED]');
    expect(redacted['hash']).toBe('[REDACTED]');
    expect((redacted['nested'] as Record<string, unknown>)['cardNumber']).toBe('[REDACTED]');
    expect((redacted['nested'] as Record<string, unknown>)['city']).toBe('São Paulo');
    expect(redacted['tags']).toEqual(['alpha', 'beta']);
  });

  it('matches camelCase and snake_case keys case-insensitively', () => {
    const redactor = new PayloadRedactor();
    expect(redactor.isSensitive('access_token')).toBe(true);
    expect(redactor.isSensitive('accessToken')).toBe(true);
    expect(redactor.isSensitive('API_KEY')).toBe(true);
    expect(redactor.isSensitive('businessId')).toBe(false);
  });

  it('supports extra sensitive keys and custom replacement', () => {
    const redactor = new PayloadRedactor({ extraSensitiveKeys: ['licenseKey'], replacement: '***' });
    const out = redactor.redact({ licenseKey: 'L-123', title: 'ok' }) as Record<string, unknown>;

    expect(out['licenseKey']).toBe('***');
    expect(out['title']).toBe('ok');
  });

  it('does not mutate the original payload', () => {
    const payload = { token: 'abc', keep: 1 };
    defaultRedactor.redact(payload);
    expect(payload['token']).toBe('abc');
  });
});
