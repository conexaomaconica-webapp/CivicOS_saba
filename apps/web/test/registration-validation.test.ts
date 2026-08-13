import { describe, it, expect } from 'vitest';
import {
  validateName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateRegistration,
  hasErrors,
} from '../src/lib/auth/validation';

describe('registration validation · PUB-012 (CRIT-TRN-023)', () => {
  it('rejects an empty name and a too-short name', () => {
    expect(validateName('')).toBeTruthy();
    expect(validateName('  ')).toBeTruthy();
    expect(validateName('Jo')).toBeTruthy();
  });

  it('accepts a valid full name', () => {
    expect(validateName('João Silva')).toBeNull();
  });

  it('rejects malformed and empty emails', () => {
    expect(validateEmail('')).toBeTruthy();
    expect(validateEmail('joao')).toBeTruthy();
    expect(validateEmail('joao@')).toBeTruthy();
    expect(validateEmail('joao@site')).toBeTruthy();
  });

  it('accepts a valid email', () => {
    expect(validateEmail('joao@exemplo.com')).toBeNull();
  });

  it('rejects weak passwords but accepts 8+ characters', () => {
    expect(validatePassword('')).toBeTruthy();
    expect(validatePassword('1234567')).toBeTruthy();
    expect(validatePassword('12345678')).toBeNull();
  });

  it('checks password confirmation match', () => {
    expect(validateConfirmPassword('12345678', '87654321')).toBeTruthy();
    expect(validateConfirmPassword('12345678', '')).toBeTruthy();
    expect(validateConfirmPassword('12345678', '12345678')).toBeNull();
  });

  it('aggregates per-field errors and reports presence', () => {
    const errors = validateRegistration({
      name: '',
      email: 'invalido',
      password: 'curta',
      confirmPassword: 'diferente',
    });

    expect(errors.name).toBeTruthy();
    expect(errors.email).toBeTruthy();
    expect(errors.password).toBeTruthy();
    expect(errors.confirmPassword).toBeTruthy();
    expect(hasErrors(errors)).toBe(true);
  });

  it('returns no errors for a valid registration', () => {
    const errors = validateRegistration({
      name: 'João Silva',
      email: 'joao@exemplo.com',
      password: '12345678',
      confirmPassword: '12345678',
    });

    expect(errors.name).toBeUndefined();
    expect(errors.email).toBeUndefined();
    expect(errors.password).toBeUndefined();
    expect(errors.confirmPassword).toBeUndefined();
    expect(hasErrors(errors)).toBe(false);
  });
});