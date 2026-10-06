import { describe, expect, it } from 'vitest';
import { buildStaticPixPayload, crc16Ccitt, sanitizePixText, sanitizeTxid } from '../src/lib/payment/pix-brcode';
import { isAccountNotApprovedError } from '../src/lib/payment/manual-pix';

describe('PIX estático (BR Code)', () => {
  it('CRC16 CCITT-FALSE confere com o vetor padrão', () => {
    expect(crc16Ccitt('123456789')).toBe('29B1');
  });

  it('monta o payload com os campos obrigatórios e CRC válido', () => {
    const payload = buildStaticPixPayload({
      key: '12345678000199',
      name: 'Conexão Maçônica Ltda',
      city: 'Feira de Santana',
      amountCents: 130000,
      txid: 'CM0123-abc',
    });
    expect(payload.startsWith('000201010211')).toBe(true);
    expect(payload).toContain('0014br.gov.bcb.pix0114' + '12345678000199');
    expect(payload).toContain('5303986');
    expect(payload).toContain('54071300.00');
    expect(payload).toContain('5802BR');
    expect(payload).toContain('5921CONEXAO MACONICA LTDA');
    expect(payload).toContain('6015FEIRA DE SANTAN');
    expect(payload).toContain('0509CM0123abc');
    // o CRC dos 4 últimos caracteres cobre tudo até "6304"
    expect(payload.slice(-4)).toBe(crc16Ccitt(payload.slice(0, -4)));
    expect(payload.slice(-8, -4)).toBe('6304');
  });

  it('formata centavos e recusa valor ou chave inválidos', () => {
    expect(buildStaticPixPayload({ key: 'a@b.com', name: 'X', city: 'Y', amountCents: 5, txid: 't' })).toContain('54040.05');
    expect(() => buildStaticPixPayload({ key: '', name: 'X', city: 'Y', amountCents: 100, txid: 't' })).toThrow();
    expect(() => buildStaticPixPayload({ key: 'k', name: 'X', city: 'Y', amountCents: 0, txid: 't' })).toThrow();
  });

  it('higieniza nome e identificador', () => {
    expect(sanitizePixText('Açaí & Cia — Ltda.', 25)).toBe('ACAI CIA LTDA');
    expect(sanitizeTxid('CM-1234_abcd!')).toBe('CM1234abcd');
    expect(sanitizeTxid('x'.repeat(40)).length).toBe(25);
    expect(sanitizeTxid('---')).toBe('***');
  });
});

describe('detecção de "conta não aprovada" do Asaas', () => {
  it('reconhece a mensagem real do Asaas', () => {
    expect(isAccountNotApprovedError('O Pix não está disponível no momento. Para utilizá-lo, sua conta precisa estar aprovada.')).toBe(true);
  });
  it('não confunde com outros erros', () => {
    expect(isAccountNotApprovedError('CPF/CNPJ inválido')).toBe(false);
    expect(isAccountNotApprovedError('Erro de rede')).toBe(false);
    expect(isAccountNotApprovedError(undefined)).toBe(false);
  });
});
