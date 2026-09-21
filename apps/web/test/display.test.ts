import { describe, it, expect } from 'vitest';
import { displayOptionalText } from '@/lib/utils/display';

describe('displayOptionalText', () => {
  it('should return the text if valid', () => {
    expect(displayOptionalText('São Paulo')).toBe('São Paulo');
  });

  it('should return default fallback if null', () => {
    expect(displayOptionalText(null)).toBe('Não informado');
  });

  it('should return default fallback if undefined', () => {
    expect(displayOptionalText(undefined)).toBe('Não informado');
  });

  it('should return default fallback if empty string', () => {
    expect(displayOptionalText('')).toBe('Não informado');
  });

  it('should return default fallback if whitespace only string', () => {
    expect(displayOptionalText('   ')).toBe('Não informado');
  });

  it('should trim the valid text', () => {
    expect(displayOptionalText('  Campinas  ')).toBe('Campinas');
  });

  it('should return custom fallback if specified', () => {
    expect(displayOptionalText(null, 'Empresa sem nome')).toBe('Empresa sem nome');
    expect(displayOptionalText('   ', 'Empresa sem nome')).toBe('Empresa sem nome');
  });
});
