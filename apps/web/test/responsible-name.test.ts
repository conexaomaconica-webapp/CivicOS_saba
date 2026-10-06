import { describe, expect, it } from 'vitest';
import { isPlaceholderResponsibleName, pickResponsibleName } from '../src/lib/contracts/responsible-name';

describe('nome do representante legal', () => {
  it('reconhece o nome genérico antigo', () => {
    expect(isPlaceholderResponsibleName('Anunciante Titular')).toBe(true);
    expect(isPlaceholderResponsibleName('  anunciante   titular ')).toBe(true);
    expect(isPlaceholderResponsibleName('Responsável Legal')).toBe(true);
    expect(isPlaceholderResponsibleName('')).toBe(true);
    expect(isPlaceholderResponsibleName(null)).toBe(true);
    expect(isPlaceholderResponsibleName('Maria da Silva')).toBe(false);
  });

  it('usa o primeiro nome real e ignora o genérico', () => {
    expect(pickResponsibleName('Anunciante Titular', 'João  Pereira')).toBe('João Pereira');
    expect(pickResponsibleName(null, undefined, 'Ana Lima')).toBe('Ana Lima');
    expect(pickResponsibleName('Maria Souza', 'Outro Nome')).toBe('Maria Souza');
    expect(pickResponsibleName('Anunciante Titular', null)).toBe('');
  });
});
