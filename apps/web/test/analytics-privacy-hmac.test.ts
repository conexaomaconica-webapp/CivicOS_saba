import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  generatePseudonymousSubjectId,
  generateSearchSessionHash,
} from '../src/lib/analytics/privacy-hash';

describe('ANALYTICS: Pseudonimização Criptográfica HMAC e LGPD (P1)', () => {
  const ip = '189.40.122.15';
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const customSalt = 'test-secret-salt-super-secure-key-999';

  it('1. Gera identificador seguro com prefixo h_ para IP e User-Agent', () => {
    const id = generatePseudonymousSubjectId({ ip, userAgent: ua, salt: customSalt, dateStr: '2026-10-27' });
    expect(id).toMatch(/^h_[0-9a-f]{30}$/);
    expect(id).not.toContain(ip);
    expect(id).not.toContain('189.');
  });

  it('2. Garante que hash é gerado com HMAC e não coincide com SHA-256 aberto sem segredo', () => {
    const hmacId = generatePseudonymousSubjectId({ ip, userAgent: ua, salt: customSalt, dateStr: '2026-10-27' });
    const plainSha256 = crypto.createHash('sha256').update(`${ip}_${ua}_2026-10-27`).digest('hex');

    // O HMAC derivado com segredo NUNCA deve ser igual ao hash sem salt
    expect(hmacId.slice(2)).not.toBe(plainSha256.slice(0, 30));
  });

  it('3. Mesma entrada no mesmo dia com mesmo salt produz hash idêntico para deduplicação', () => {
    const id1 = generatePseudonymousSubjectId({ ip, userAgent: ua, salt: customSalt, dateStr: '2026-10-27' });
    const id2 = generatePseudonymousSubjectId({ ip, userAgent: ua, salt: customSalt, dateStr: '2026-10-27' });

    expect(id1).toBe(id2);
  });

  it('4. Rotação diária: mesma pessoa no dia seguinte gera identificador diferente (sem rastreamento eterno)', () => {
    const day1 = generatePseudonymousSubjectId({ ip, userAgent: ua, salt: customSalt, dateStr: '2026-10-27' });
    const day2 = generatePseudonymousSubjectId({ ip, userAgent: ua, salt: customSalt, dateStr: '2026-10-28' });

    expect(day1).not.toBe(day2);
  });

  it('5. Quando visitorKey (cookie de indicação) existe, desacopla o valor e gera vid_ sem vazar o cookie', () => {
    const visitorKey = 'c9a227df-8812-4ebc-a812-deadbeef0001';
    const id = generatePseudonymousSubjectId({ visitorKey, salt: customSalt, dateStr: '2026-10-27' });

    expect(id).toMatch(/^vid_[0-9a-f]{28}$/);
    expect(id).not.toContain(visitorKey);
  });

  it('6. Salteamento isolado: dois ambientes com salts diferentes geram identificadores incompatíveis', () => {
    const saltA = 'salt-producao-alpha';
    const saltB = 'salt-homologacao-beta';

    const idA = generatePseudonymousSubjectId({ ip, userAgent: ua, salt: saltA, dateStr: '2026-10-27' });
    const idB = generatePseudonymousSubjectId({ ip, userAgent: ua, salt: saltB, dateStr: '2026-10-27' });

    expect(idA).not.toBe(idB);
  });

  it('7. Hash de busca em lote deduplica dentro da mesma sessão diária', () => {
    const h1 = generateSearchSessionHash({ ip, userAgent: ua, salt: customSalt, dateStr: '2026-10-27' });
    const h2 = generateSearchSessionHash({ ip, userAgent: ua, salt: customSalt, dateStr: '2026-10-27' });

    expect(h1).toHaveLength(32);
    expect(h1).toBe(h2);
  });
});
