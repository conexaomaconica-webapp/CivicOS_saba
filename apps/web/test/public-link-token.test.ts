import { describe, it, expect } from 'vitest';
import { generatePublicLinkToken, PUBLIC_LINK_TOKEN_LENGTH, MIN_PUBLIC_LINK_TOKEN_LENGTH } from '@/lib/security/public-link-token';

describe('generatePublicLinkToken', () => {
  it('gera token curto, seguro para URL e sem caracteres ambíguos', () => {
    const token = generatePublicLinkToken();
    expect(token).toHaveLength(PUBLIC_LINK_TOKEN_LENGTH);
    expect(token).toMatch(/^[A-Za-z0-9]+$/);
    expect(token).not.toMatch(/[01OIl]/);
  });

  it('não repete em uma amostra grande', () => {
    const tokens = new Set(Array.from({ length: 5000 }, () => generatePublicLinkToken()));
    expect(tokens.size).toBe(5000);
  });

  it('o tamanho gerado passa na validação mínima e links antigos longos também', () => {
    expect(PUBLIC_LINK_TOKEN_LENGTH).toBeGreaterThanOrEqual(MIN_PUBLIC_LINK_TOKEN_LENGTH);
    expect('a'.repeat(96).length).toBeGreaterThanOrEqual(MIN_PUBLIC_LINK_TOKEN_LENGTH);
  });
});
