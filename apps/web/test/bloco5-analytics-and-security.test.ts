import { describe, it, expect } from 'vitest';
import { recordAnalyticsEventSchema } from '@saas/core';
import { sanitizeJsonLd } from '../src/components/seo/StructuredData';
import { checkRateLimit } from '../src/lib/security/rate-limiter';

describe('BLOCO 5: Security, Analytics & Hardening Unit Tests', () => {
  it('sanitizes JSON-LD script content replacing <, >, and & with unicode escapes', () => {
    const maliciousInput = {
      name: 'Empresa Teste <script>alert("xss")</script>',
      description: 'Ofertas & Descontos > 50%',
    };

    const sanitized = sanitizeJsonLd(maliciousInput);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('\\u003cscript\\u003e');
    expect(sanitized).toContain('\\u003e');
    expect(sanitized).toContain('\\u0026');
  });

  it('validates analytics event input using recordAnalyticsEventSchema', () => {
    const valid = recordAnalyticsEventSchema.safeParse({
      businessId: '123e4567-e89b-12d3-a456-426614174000',
      eventType: 'contact_whatsapp',
      referrer: 'https://google.com',
    });

    expect(valid.success).toBe(true);

    const invalidType = recordAnalyticsEventSchema.safeParse({
      businessId: '123e4567-e89b-12d3-a456-426614174000',
      eventType: 'invalid_event_name',
    });

    expect(invalidType.success).toBe(false);
  });

  it('enforces segregated rate limiting policies (analytics fail-open vs checkout fail-closed)', async () => {
    const tenantId = 'tenant-test-1';
    const clientKey = 'client-ip-123';

    // 1. Analytics rate limit (60 max per min)
    const firstCheck = await checkRateLimit('analytics', clientKey, tenantId);
    expect(firstCheck.allowed).toBe(true);
    expect(firstCheck.remaining).toBe(59);

    // 2. Checkout rate limit (5 max per min)
    for (let i = 0; i < 5; i++) {
      await checkRateLimit('checkout', clientKey, tenantId);
    }
    const blockedCheck = await checkRateLimit('checkout', clientKey, tenantId);
    expect(blockedCheck.allowed).toBe(false);
    expect(blockedCheck.remaining).toBe(0);
  });
});
