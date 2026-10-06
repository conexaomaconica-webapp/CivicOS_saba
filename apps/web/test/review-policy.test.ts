import { describe, expect, it } from 'vitest';
import { normalizeContactValue, splitProfileChanges } from '../src/lib/advertiser/review-policy';

describe('splitProfileChanges', () => {
  const current = { name: 'Comandos', legal_name: 'Comandos Ltda', document_number: '12.345.678/0001-90', category: 'Segurança', description: 'Texto atual' };

  it('só considera os campos que realmente mudaram', () => {
    const { review, previous } = splitProfileChanges(current, { name: 'Comandos', description: 'Texto novo' });
    expect(review).toEqual({ description: 'Texto novo' });
    expect(previous).toEqual({ description: 'Texto atual' });
  });

  it('ignora espaços e a pontuação do CNPJ', () => {
    const { review } = splitProfileChanges(current, { name: '  Comandos  ', document_number: '12345678000190' });
    expect(review).toEqual({});
  });

  it('campo não enviado não vira alteração; campo esvaziado vira', () => {
    expect(splitProfileChanges(current, {}).review).toEqual({});
    expect(splitProfileChanges(current, { legal_name: '' }).review).toEqual({ legal_name: '' });
  });
});

describe('normalizeContactValue', () => {
  it('padroniza site, Instagram e e-mail', () => {
    expect(normalizeContactValue('website', 'empresa.com.br')).toBe('https://empresa.com.br');
    expect(normalizeContactValue('instagram', '@minhaempresa')).toBe('https://www.instagram.com/minhaempresa');
    expect(normalizeContactValue('email', ' Contato@Empresa.com ')).toBe('contato@empresa.com');
    expect(normalizeContactValue('phone', '')).toBe('');
  });
});
