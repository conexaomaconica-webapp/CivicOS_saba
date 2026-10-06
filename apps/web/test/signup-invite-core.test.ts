import { describe, expect, it } from 'vitest';
import {
  generateInviteToken,
  normalizeInviteToken,
  hashInviteToken,
  isInviteUsable,
  normalizeSubmission,
  validateSubmission,
} from '../src/lib/onboarding/signup-invite-core';

const valid = {
  responsibleName: 'Maria da Silva',
  responsibleEmail: 'Maria@Exemplo.com',
  responsiblePhone: '(75) 99999-1234',
  tradingName: 'Padaria Pão Nosso',
  legalName: 'Pão Nosso Ltda',
  document: '11.222.333/0001-81',
  categoryId: 'cat-1',
  city: 'Feira de Santana',
  state: 'ba',
  masonicRelation: 'mason_spouse',
  referenceMasonName: 'João da Silva',
  lodgeName: 'A.·.R.·.L.·.S.·. Exemplo',
  potency: 'GOB',
  consent: true,
};

describe('convite de cadastro — token', () => {
  it('gera um código curto (12 caracteres, sem letras confundíveis) e guarda só o hash', () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{12}$/);
    expect(hashInviteToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken(token)).not.toBe(token);
    expect(hashInviteToken(token)).toBe(hashInviteToken(token));
    expect(generateInviteToken()).not.toBe(token);
  });

  it('não diferencia maiúsculas no código curto e continua aceitando o formato antigo', () => {
    const code = generateInviteToken();
    expect(normalizeInviteToken(code.toLowerCase())).toBe(code);
    expect(hashInviteToken(code.toLowerCase())).toBe(hashInviteToken(code));
    expect(normalizeInviteToken(`  ${code} `)).toBe(code);
    const legacy = 'a'.repeat(64);
    expect(normalizeInviteToken(legacy)).toBe(legacy);
    expect(normalizeInviteToken('curto')).toBeNull();
    expect(normalizeInviteToken('0OIL1ABCDEFG')).toBeNull();
    expect(normalizeInviteToken('')).toBeNull();
  });

  it('só aceita convite enviado e dentro do prazo', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isInviteUsable({ status: 'sent', expires_at: future })).toBe(true);
    expect(isInviteUsable({ status: 'sent', expires_at: past })).toBe(false);
    for (const status of ['submitted', 'converted', 'revoked']) {
      expect(isInviteUsable({ status, expires_at: future })).toBe(false);
    }
  });
});

describe('convite de cadastro — dados do cliente', () => {
  it('normaliza e aceita dados completos', () => {
    const data = normalizeSubmission(valid);
    expect(data.responsibleEmail).toBe('maria@exemplo.com');
    expect(data.state).toBe('BA');
    expect(data.document).toBe('11222333000181');
    expect(validateSubmission(data)).toBeNull();
  });

  it('não aceita campos de plano, preço ou status vindos do cliente', () => {
    const data = normalizeSubmission({ ...valid, planCode: 'acacia', price: 1, commercial_status: 'publicado' });
    expect(data).not.toHaveProperty('planCode');
    expect(data).not.toHaveProperty('price');
    expect(data).not.toHaveProperty('commercial_status');
  });

  it('relação maçônica desconhecida vira "mason"', () => {
    expect(normalizeSubmission({ ...valid, masonicRelation: 'admin' }).masonicRelation).toBe('mason');
  });

  it('exige consentimento, vínculo, endereço e categoria', () => {
    expect(validateSubmission(normalizeSubmission({ ...valid, consent: false }))).toMatch(/concordar/i);
    expect(validateSubmission(normalizeSubmission({ ...valid, lodgeName: '' }))).toMatch(/Loja/);
    expect(validateSubmission(normalizeSubmission({ ...valid, potency: '' }))).toMatch(/Potência/);
    expect(validateSubmission(normalizeSubmission({ ...valid, city: '' }))).toMatch(/cidade/i);
    expect(validateSubmission(normalizeSubmission({ ...valid, categoryId: '', categoryOther: '' }))).toMatch(/categoria/i);
    expect(validateSubmission(normalizeSubmission({ ...valid, categoryId: '', categoryOther: 'Nova' }))).toBeNull();
  });

  it('rejeita CNPJ/CPF e e-mail inválidos e limita tamanho dos textos', () => {
    expect(validateSubmission(normalizeSubmission({ ...valid, document: '123' }))).toBeTruthy();
    expect(validateSubmission(normalizeSubmission({ ...valid, responsibleEmail: 'sem-arroba' }))).toBeTruthy();
    expect(normalizeSubmission({ ...valid, tradingName: 'x'.repeat(500) }).tradingName.length).toBe(120);
  });
});
