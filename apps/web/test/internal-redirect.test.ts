import { describe, expect, it } from 'vitest';
import { sanitizeInternalRedirect } from '../src/lib/auth/internal-redirect';

describe('sanitizeInternalRedirect', () => {
  it('preserva uma rota interna iniciada por uma ação pública', () => {
    expect(sanitizeInternalRedirect('/guia/acme?avaliar=1')).toBe('/guia/acme?avaliar=1');
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/%2F%2Fevil.example',
    '/%5Cevil.example',
    '/rota%00quebrada',
    '%E0%A4%A',
  ])('rejeita destino externo ou malformado: %s', (value) => {
    expect(sanitizeInternalRedirect(value)).toBeNull();
  });
});
