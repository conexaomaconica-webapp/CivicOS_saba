import { describe, expect, it } from 'vitest';
import { matchesApprovalSearch, normalizeSearchText } from '../src/lib/admin/approval-search';

const item = (o: Record<string, string | undefined> = {}) => ({
  name: 'Óptica Circulô',
  owner_email: 'dono@optica.com.br',
  category: 'Saúde',
  city: 'Feira de Santana',
  owner_name: 'Eduardo Saba',
  cnpj: '12.345.678/0001-90',
  ...o,
});

const names = ['Óptica Circulô', 'Padaria São José', 'Clínica Vida'];
const list = [
  item({ name: names[0], cnpj: '12.345.678/0001-90' }),
  item({ name: names[1], category: 'Alimentação', city: 'Salvador', owner_name: 'João Silva', owner_email: 'joao@padaria.com', cnpj: '98.765.432/0001-10' }),
  item({ name: names[2], category: 'Saúde', city: 'Recife', owner_name: 'Maria Costa', owner_email: 'maria@clinica.com', cnpj: undefined }),
];
const search = (q: string) => list.filter((i) => matchesApprovalSearch(i, q)).map((i) => i.name);

describe('busca da lista de aprovações', () => {
  it('REGRESSÃO: um nome sem números filtra a lista (antes toda empresa com CNPJ passava)', () => {
    expect(search('padaria')).toEqual(['Padaria São José']);
    expect(search('clinica')).toEqual(['Clínica Vida']);
    expect(search('zzzz')).toEqual([]);
  });

  it('sem texto, mostra tudo', () => {
    expect(search('')).toHaveLength(3);
    expect(search('   ')).toHaveLength(3);
  });

  it('ignora acentos e maiúsculas, nos dois lados', () => {
    expect(search('OPTICA')).toEqual(['Óptica Circulô']);
    expect(search('sao jose')).toEqual(['Padaria São José']);
    expect(search('Óptica')).toEqual(['Óptica Circulô']);
    expect(search('circulo')).toEqual(['Óptica Circulô']);
  });

  it('procura também por e-mail, categoria, cidade e responsável', () => {
    expect(search('joao@padaria')).toEqual(['Padaria São José']);
    expect(search('alimentacao')).toEqual(['Padaria São José']);
    expect(search('recife')).toEqual(['Clínica Vida']);
    expect(search('maria costa')).toEqual(['Clínica Vida']);
  });

  it('CNPJ/CPF: com ou sem pontuação, parcial, e só quando há dígitos', () => {
    expect(search('12.345.678/0001-90')).toEqual(['Óptica Circulô']);
    expect(search('12345678')).toEqual(['Óptica Circulô']);
    expect(search('98765')).toEqual(['Padaria São José']);
    expect(search('00000000000')).toEqual([]);
  });

  it('empresa sem CNPJ ou campos vazios não quebra a busca', () => {
    expect(matchesApprovalSearch({ name: null, owner_email: undefined, category: null, city: undefined, owner_name: undefined, cnpj: undefined }, 'abc')).toBe(false);
    expect(matchesApprovalSearch({ name: null, owner_email: undefined, category: null, city: undefined, owner_name: undefined, cnpj: undefined }, '')).toBe(true);
  });

  it('normalização', () => {
    expect(normalizeSearchText('  São   José ')).toBe('sao jose');
    expect(normalizeSearchText(null)).toBe('');
  });
});
