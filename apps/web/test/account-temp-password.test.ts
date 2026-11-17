import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_PASSWORD_CHANGE_PATH,
  ACCOUNT_TEMP_PASSWORD_CLEARED,
  accountTempPasswordPending,
  getAccountTempPasswordState,
} from '../src/lib/auth/account-temp-password';
import { TEMP_PASSWORD_CHANGE_PATH, evaluateTempPasswordGate, getTempPasswordState } from '../src/lib/commercial/temp-password';
import { sanitizeAccountSearchTerm } from '../src/lib/admin/accounts-search';

const NOW = Date.parse('2026-11-20T12:00:00Z');

describe('estado da senha temporária de conta (app_metadata)', () => {
  it('sem marcador ou com marcador falso: nenhuma troca pendente', () => {
    for (const meta of [undefined, null, {}, { account_must_change_password: false }, { account_must_change_password: 'true' }, { must_change_password: true }]) {
      expect(getAccountTempPasswordState(meta, NOW), JSON.stringify(meta)).toBe('none');
    }
  });

  it('marcador verdadeiro dentro da validade: pendente; vencida: expirada; sem data: pendente', () => {
    expect(getAccountTempPasswordState({ account_must_change_password: true, account_temp_password_expires_at: new Date(NOW + 3_600_000).toISOString() }, NOW)).toBe('pending');
    expect(getAccountTempPasswordState({ account_must_change_password: true, account_temp_password_expires_at: new Date(NOW - 1000).toISOString() }, NOW)).toBe('expired');
    expect(getAccountTempPasswordState({ account_must_change_password: true }, NOW)).toBe('pending');
  });

  it('é independente do estado do representante comercial (chaves diferentes)', () => {
    const rep = { must_change_password: true, temp_password_expires_at: new Date(NOW + 1000).toISOString() };
    expect(getTempPasswordState(rep, NOW)).toBe('pending');
    expect(getAccountTempPasswordState(rep, NOW)).toBe('none');
    const account = accountTempPasswordPending(72, NOW);
    expect(getAccountTempPasswordState(account, NOW)).toBe('pending');
    expect(getTempPasswordState(account, NOW)).toBe('none');
  });

  it('a senha temporária vale 72 horas por padrão e a validade é limitada entre 1 e 168 horas', () => {
    const p = accountTempPasswordPending(72, NOW) as Record<string, unknown>;
    expect(new Date(String(p.account_temp_password_expires_at)).getTime()).toBe(NOW + 72 * 3_600_000);
    expect(p.account_must_change_password).toBe(true);
    expect(new Date(String((accountTempPasswordPending(9999, NOW) as Record<string, unknown>).account_temp_password_expires_at)).getTime()).toBe(NOW + 168 * 3_600_000);
    expect(new Date(String((accountTempPasswordPending(0, NOW) as Record<string, unknown>).account_temp_password_expires_at)).getTime()).toBe(NOW + 3_600_000);
  });

  it('concluir a troca zera o marcador e a validade', () => {
    expect(getAccountTempPasswordState(ACCOUNT_TEMP_PASSWORD_CLEARED, NOW)).toBe('none');
  });
});

describe('portão do middleware para contas (mesma função do representante, com caminho próprio)', () => {
  const gate = (path: string, state: 'none' | 'pending' | 'expired') => evaluateTempPasswordGate(path, state, ACCOUNT_PASSWORD_CHANGE_PATH).action;

  it('sem troca pendente, tudo passa', () => {
    for (const p of ['/', '/anunciante', '/admin', '/api/x']) expect(gate(p, 'none')).toBe('allow');
  });

  it('pendente: só o login e a tela de troca funcionam; o resto vai para a troca; APIs recebem 403', () => {
    expect(gate('/login', 'pending')).toBe('allow');
    expect(gate('/definir-senha', 'pending')).toBe('allow');
    expect(gate('/_next/static/x.js', 'pending')).toBe('allow');
    for (const p of ['/', '/anunciante', '/anunciante/resultados', '/guia', '/admin']) expect(gate(p, 'pending'), p).toBe('redirect_change');
    expect(gate('/api/anything', 'pending')).toBe('deny_api');
  });

  it('expirada: encerra a sessão (exceto no login)', () => {
    expect(gate('/anunciante', 'expired')).toBe('sign_out_expired');
    expect(gate('/definir-senha', 'expired')).toBe('sign_out_expired');
    expect(gate('/login', 'expired')).toBe('allow');
  });

  it('o comportamento do representante não mudou (caminho padrão)', () => {
    expect(evaluateTempPasswordGate(TEMP_PASSWORD_CHANGE_PATH, 'pending').action).toBe('allow');
    expect(evaluateTempPasswordGate('/representante', 'pending').action).toBe('redirect_change');
    expect(evaluateTempPasswordGate('/definir-senha', 'pending').action).toBe('redirect_change');
    expect(evaluateTempPasswordGate('/api/x', 'pending').action).toBe('deny_api');
    expect(evaluateTempPasswordGate('/x', 'expired').action).toBe('sign_out_expired');
  });
});

describe('termo de busca das contas', () => {
  it('remove coringas e separadores de filtro, junta espaços e limita o tamanho', () => {
    expect(sanitizeAccountSearchTerm('  ótica   circulô ')).toBe('ótica circulô');
    expect(sanitizeAccountSearchTerm('a%b_c,d(e)f*g"h\\i')).toBe('a b c d e f g h i');
    expect(sanitizeAccountSearchTerm('x'.repeat(200))).toHaveLength(80);
  });
  it('menos de 2 caracteres não busca', () => {
    for (const v of ['', ' ', 'a', '%', null, undefined]) expect(sanitizeAccountSearchTerm(v as never)).toBe('');
    expect(sanitizeAccountSearchTerm('ab')).toBe('ab');
  });
});
