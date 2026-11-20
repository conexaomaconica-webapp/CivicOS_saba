import { describe, it, expect } from 'vitest';
import { normalizeSocialUrl } from '../src/lib/business/social-links';

describe('normalizeSocialUrl', () => {
  it('normalizes instagram handle with @ and dot', () => {
    expect(normalizeSocialUrl('@empresa.oficial', 'instagram')).toBe('https://www.instagram.com/empresa.oficial');
  });

  it('normalizes instagram handle with dot without @', () => {
    expect(normalizeSocialUrl('empresa.oficial', 'instagram')).toBe('https://www.instagram.com/empresa.oficial');
  });

  it('normalizes simple instagram handle', () => {
    expect(normalizeSocialUrl('@minhaloja', 'instagram')).toBe('https://www.instagram.com/minhaloja');
    expect(normalizeSocialUrl('minhaloja', 'instagram')).toBe('https://www.instagram.com/minhaloja');
  });

  it('preserves full instagram URL and cleans @ in pathname', () => {
    expect(normalizeSocialUrl('https://instagram.com/minhaloja', 'instagram')).toBe('https://instagram.com/minhaloja');
    expect(normalizeSocialUrl('https://www.instagram.com/@minhaloja', 'instagram')).toBe('https://www.instagram.com/minhaloja');
  });

  it('normalizes youtube handles correctly', () => {
    expect(normalizeSocialUrl('@meucanal', 'youtube')).toBe('https://www.youtube.com/@meucanal');
    expect(normalizeSocialUrl('meucanal', 'youtube')).toBe('https://www.youtube.com/@meucanal');
    expect(normalizeSocialUrl('https://youtube.com/@meucanal', 'youtube')).toBe('https://youtube.com/@meucanal');
  });

  it('normalizes facebook and linkedin handles', () => {
    expect(normalizeSocialUrl('@minhaempresa', 'facebook')).toBe('https://www.facebook.com/minhaempresa');
    expect(normalizeSocialUrl('minhaempresa', 'linkedin')).toBe('https://www.linkedin.com/minhaempresa');
  });

  it('normalizes website urls', () => {
    expect(normalizeSocialUrl('minhaempresa.com.br', 'website')).toBe('https://minhaempresa.com.br');
    expect(normalizeSocialUrl('https://minhaempresa.com.br', 'website')).toBe('https://minhaempresa.com.br');
  });

  it('blocks dangerous protocols', () => {
    expect(normalizeSocialUrl('javascript:alert(1)', 'website')).toBeNull();
    expect(normalizeSocialUrl('data:text/html,...', 'instagram')).toBeNull();
  });
});

