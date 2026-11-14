import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  clampTempPasswordHours,
  evaluateTempPasswordGate,
  generateTempPassword,
  getTempPasswordState,
  validateRepresentativeNewPassword,
  TEMP_PASSWORD_CHANGE_PATH,
} from '@/lib/commercial/temp-password';

const src = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', 'src', rel), 'utf8');

describe('generateTempPassword', () => {
  it('gera 14 caracteres com maiúscula, minúscula, número e símbolo, sem ambíguos', () => {
    for (let i = 0; i < 200; i += 1) {
      const p = generateTempPassword();
      expect(p).toHaveLength(14);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/\d/);
      expect(p).toMatch(/[#$%&*+\-=?@]/);
      expect(p).not.toMatch(/[0O1lI]/);
    }
  });

  it('não repete senha entre chamadas', () => {
    const set = new Set(Array.from({ length: 500 }, () => generateTempPassword()));
    expect(set.size).toBe(500);
  });
});

describe('clampTempPasswordHours', () => {
  it('usa 72h por padrão e respeita 24h a 7 dias', () => {
    expect(clampTempPasswordHours(undefined)).toBe(72);
    expect(clampTempPasswordHours('abc')).toBe(72);
    expect(clampTempPasswordHours(1)).toBe(24);
    expect(clampTempPasswordHours(9999)).toBe(168);
    expect(clampTempPasswordHours(48)).toBe(48);
  });
});

describe('getTempPasswordState', () => {
  const now = Date.parse('2026-11-14T12:00:00Z');
  it('sem marca = none (inclui metadados vazios e ausentes)', () => {
    expect(getTempPasswordState(undefined, now)).toBe('none');
    expect(getTempPasswordState({}, now)).toBe('none');
    expect(getTempPasswordState({ must_change_password: false }, now)).toBe('none');
    expect(getTempPasswordState({ must_change_password: 'true' }, now)).toBe('none');
  });
  it('pendente dentro da validade, expirada depois dela', () => {
    expect(getTempPasswordState({ must_change_password: true, temp_password_expires_at: '2026-11-15T12:00:00Z' }, now)).toBe('pending');
    expect(getTempPasswordState({ must_change_password: true, temp_password_expires_at: '2026-11-14T11:59:59Z' }, now)).toBe('expired');
    expect(getTempPasswordState({ must_change_password: true, temp_password_expires_at: '2026-11-14T12:00:00Z' }, now)).toBe('expired');
  });
});

describe('evaluateTempPasswordGate', () => {
  it('sem troca pendente nada muda', () => {
    expect(evaluateTempPasswordGate('/anunciante', 'none')).toEqual({ action: 'allow' });
  });
  it('pendente: só a página de troca e o login funcionam', () => {
    expect(evaluateTempPasswordGate(TEMP_PASSWORD_CHANGE_PATH, 'pending')).toEqual({ action: 'allow' });
    expect(evaluateTempPasswordGate('/login', 'pending')).toEqual({ action: 'allow' });
    expect(evaluateTempPasswordGate('/representante', 'pending')).toEqual({ action: 'redirect_change' });
    expect(evaluateTempPasswordGate('/minha-conta', 'pending')).toEqual({ action: 'redirect_change' });
    expect(evaluateTempPasswordGate('/admin', 'pending')).toEqual({ action: 'redirect_change' });
    expect(evaluateTempPasswordGate('/api/qualquer', 'pending')).toEqual({ action: 'deny_api' });
  });
  it('expirada: encerra a sessão em qualquer rota, exceto o próprio login', () => {
    expect(evaluateTempPasswordGate('/representante', 'expired')).toEqual({ action: 'sign_out_expired' });
    expect(evaluateTempPasswordGate(TEMP_PASSWORD_CHANGE_PATH, 'expired')).toEqual({ action: 'sign_out_expired' });
    expect(evaluateTempPasswordGate('/login', 'expired')).toEqual({ action: 'allow' });
  });
});

describe('validateRepresentativeNewPassword', () => {
  it('exige 10+ caracteres, letras e números, e diferente da temporária', () => {
    expect(validateRepresentativeNewPassword('')).toMatch(/Informe/);
    expect(validateRepresentativeNewPassword('abc12345')).toMatch(/10 caracteres/);
    expect(validateRepresentativeNewPassword('abcdefghijkl')).toMatch(/letras e números/);
    expect(validateRepresentativeNewPassword('1234567890123')).toMatch(/letras e números/);
    expect(validateRepresentativeNewPassword('Temp#Senha1234', 'Temp#Senha1234')).toMatch(/diferente/);
    expect(validateRepresentativeNewPassword('MinhaSenha2026')).toBeNull();
  });
});

describe('contratos de segurança do cadastro direto (estático)', () => {
  const service = src('lib/commercial/representatives-service.ts');
  const changeService = src('lib/commercial/temp-password-service.ts');
  const middleware = src('middleware.ts');

  it('nunca cria acesso direto sobre e-mail com conta existente', () => {
    expect(service).toMatch(/Este e-mail já possui conta/);
    expect(service).toMatch(/if \(profile\?\.id \|\| anyProfile\?\.id\)/);
  });

  it('a senha temporária não entra em auditoria nem em log', () => {
    const audits = service.match(/auditCommercial\([\s\S]*?\n\s*\}\);/g) ?? [];
    expect(audits.length).toBeGreaterThan(0);
    for (const a of audits) expect(a).not.toMatch(/temporaryPassword|password:/);
    expect(changeService).not.toMatch(/console\.(log|error|warn)/);
    const auditChange = changeService.match(/auditCommercial\([\s\S]*?\n\s*\}\);/g) ?? [];
    for (const a of auditChange) expect(a).not.toMatch(/newPassword|currentPassword/);
  });

  it('a troca confere a senha temporária e limpa a marca somente pelo servidor', () => {
    expect(changeService).toMatch(/signInWithPassword/);
    expect(changeService).toMatch(/requireWriter\(\)/);
    expect(changeService).toMatch(/must_change_password: false/);
  });

  it('desfaz o usuário criado quando o cadastro do representante falha', () => {
    expect(service).toMatch(/discardCreatedUser/);
    expect(service).toMatch(/auth\.admin\.deleteUser/);
  });

  it('o middleware só aplica a trava com o módulo ligado e usa o app_metadata', () => {
    expect(middleware).toMatch(/isCommercialModuleEnvEnabled\(\)\) \{\s*\n\s*const gate/);
    expect(middleware).toMatch(/user\.app_metadata/);
    expect(middleware).not.toMatch(/user_metadata.*must_change_password/);
  });

  it('regenerar só vale enquanto o representante não trocou a senha', () => {
    expect(service).toMatch(/password_changed_at\) return fail/);
  });
});
