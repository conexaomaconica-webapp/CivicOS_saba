import { describe, expect, it } from 'vitest';
import { parseDeepLinkUrl, sanitizeDeepLinkForLog } from './deep-links';

describe('Deep Link Parser & Sanitization (Gate 02B.1)', () => {
  it('sanitiza parâmetros confidenciais para logs (code, tokens, senhas)', () => {
    const raw = 'conexaomaconica://auth/callback?code=super-secret-code-12345&state=xyz';
    const sanitized = sanitizeDeepLinkForLog(raw);
    expect(sanitized).not.toContain('super-secret-code-12345');
    expect(sanitized).toContain('code=%5BREDACTED%5D');
    expect(sanitized).toContain('state=xyz');
  });

  it('faz o parse de callback PKCE válido com code e state', () => {
    const url = 'conexaomaconica://auth/callback?code=pkce_auth_code_999&state=tenant_saba';
    const result = parseDeepLinkUrl(url);
    expect(result).toEqual({
      type: 'oauth',
      code: 'pkce_auth_code_999',
      state: 'tenant_saba',
    });
  });

  it('faz o parse de recuperação de senha com type=recovery', () => {
    const url = 'conexaomaconica://auth/callback?type=recovery&code=recovery_code_456';
    const result = parseDeepLinkUrl(url);
    expect(result).toEqual({
      type: 'recovery',
      code: 'recovery_code_456',
      tokenHash: undefined,
    });
  });

  it('identifica e extrai erros de autenticação e códigos expirados (otp_expired)', () => {
    const url = 'conexaomaconica://auth/callback?error=otp_expired&error_description=O+token+expirou';
    const result = parseDeepLinkUrl(url);
    expect(result).toEqual({
      type: 'error',
      error: 'otp_expired',
      errorDescription: 'O token expirou',
    });
  });

  it('faz o parse de rotas de navegação direta', () => {
    const url = 'conexaomaconica://guia/padaria-da-acacia';
    const result = parseDeepLinkUrl(url);
    expect(result).toEqual({
      type: 'route',
      route: '/guia/padaria-da-acacia',
    });
  });

  it('retorna invalid para URLs malformadas sem quebrar o app', () => {
    expect(parseDeepLinkUrl('')).toEqual({ type: 'invalid' });
    expect(parseDeepLinkUrl('not-a-valid-url')).toEqual({ type: 'invalid', raw: '[parse-exception]' });
  });
});
