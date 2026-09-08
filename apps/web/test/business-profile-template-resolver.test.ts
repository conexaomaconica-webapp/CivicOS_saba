import { describe, it, expect } from 'vitest';
import { resolveBusinessProfileTemplate } from '../src/lib/business/public-business-presentation';

describe('resolveBusinessProfileTemplate', () => {
  it('should map bronze to bronze template', () => {
    expect(resolveBusinessProfileTemplate('bronze')).toBe('bronze');
  });

  it('should map prata to prata template', () => {
    expect(resolveBusinessProfileTemplate('prata')).toBe('prata');
  });

  it('should map ouro to ouro template', () => {
    expect(resolveBusinessProfileTemplate('ouro')).toBe('ouro');
  });

  it('should map ouro_founder to ouro template', () => {
    expect(resolveBusinessProfileTemplate('ouro_founder')).toBe('ouro');
  });

  it('should fallback to bronze template for null, undefined, or unknown plans', () => {
    expect(resolveBusinessProfileTemplate(null)).toBe('bronze');
    expect(resolveBusinessProfileTemplate(undefined)).toBe('bronze');
    expect(resolveBusinessProfileTemplate('')).toBe('bronze');
    expect(resolveBusinessProfileTemplate('unknown_plan')).toBe('bronze');
  });
});
