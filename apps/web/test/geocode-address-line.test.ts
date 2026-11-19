import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { geocodeBrazilianAddress, parseAddressLine, expandStreetAbbreviation } from '../src/lib/geo/geocode';

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('parseAddressLine: lê rua, número, bairro e CEP de uma linha de texto livre', () => {
  it.each([
    ['Av. Getúlio Vargas, 500 - Centro', { street: 'Avenida Getúlio Vargas', number: '500', neighborhood: 'Centro', postalCode: '' }],
    ['Rua das Flores 120', { street: 'Rua das Flores', number: '120', neighborhood: '', postalCode: '' }],
    ['R. Bahia, nº 45, Santa Mônica, CEP 44.050-000'.replace('44.050-000', '44050-000'), { street: 'Rua Bahia', number: '45', neighborhood: 'Santa Mônica', postalCode: '44050-000' }],
    ['Rua Sete de Setembro, 10 Sala 2 - Centro', { street: 'Rua Sete de Setembro', number: '10', neighborhood: 'Centro', postalCode: '' }],
    ['Rod. BR 324, s/n - Distrito Industrial', { street: 'Rodovia BR 324', number: '', neighborhood: 'Distrito Industrial', postalCode: '' }],
    ['Praça da Matriz', { street: 'Praça da Matriz', number: '', neighborhood: '', postalCode: '' }],
  ])('%s', (line, expected) => {
    expect(parseAddressLine(line)).toEqual(expected);
  });

  it('não confunde complemento nem a sigla do estado com bairro', () => {
    expect(parseAddressLine('Rua A, 10, Loja 3, BA').neighborhood).toBe('');
    expect(parseAddressLine('').street).toBe('');
    expect(parseAddressLine(null).number).toBe('');
  });

  it('abreviações comuns viram o nome completo', () => {
    expect(expandStreetAbbreviation('Av. Brasil')).toBe('Avenida Brasil');
    expect(expandStreetAbbreviation('Tv. Dois')).toBe('Travessa Dois');
    expect(expandStreetAbbreviation('Rua Tal')).toBe('Rua Tal');
  });
});

describe('geocodeBrazilianAddress com o endereço em texto livre', () => {
  const urls: string[] = [];
  let responder: (url: string) => unknown;

  beforeEach(() => {
    urls.length = 0;
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
      const url = String(input);
      urls.push(url);
      return new Response(JSON.stringify(responder(url)), { status: 200 });
    });
  });

  const run = async (input: Parameters<typeof geocodeBrazilianAddress>[0]) => {
    const p = geocodeBrazilianAddress(input);
    await vi.runAllTimersAsync();
    return p;
  };

  it('número digitado no próprio texto entra na busca mais precisa (antes essa busca nunca rodava)', async () => {
    responder = () => [{ lat: '-12.26', lon: '-38.96' }];
    const r = await run({ street: 'Av. Getúlio Vargas, 500 - Centro', city: 'Feira de Santana', state: 'BA' });
    expect(r).toEqual({ latitude: -12.26, longitude: -38.96, precision: 'address' });
    expect(decodeURIComponent(urls[0]!).replace(/\+/g, ' ')).toContain('street=500 Avenida Getúlio Vargas');
  });

  it('CEP/número ANTIGOS não são usados quando quem chama não os passa (endereço novo)', async () => {
    responder = () => [];
    await run({ street: 'Rua Nova, 77', city: 'Feira de Santana', state: 'BA' });
    expect(urls.some((u) => u.includes('brasilapi'))).toBe(false);
    expect(urls.some((u) => u.includes('postalcode='))).toBe(false);
  });

  it('rua não encontrada, mas o texto traz o CEP: usa as coordenadas do CEP (BrasilAPI), marcadas como aproximadas', async () => {
    responder = (url) => (url.includes('brasilapi')
      ? { location: { coordinates: { latitude: '-12.30', longitude: '-38.90' } } }
      : []);
    const r = await run({ street: 'Rua Nova, 77 - Centro, CEP 44001-000', city: 'Feira de Santana', state: 'BA' });
    expect(r).toEqual({ latitude: -12.3, longitude: -38.9, precision: 'postal_code' });
    expect(urls.some((u) => u.includes('/cep/v2/44001000'))).toBe(true);
  });

  it('sem rua nem CEP achados, cai no bairro e por último na cidade', async () => {
    responder = (url) => (decodeURIComponent(url).replace(/\+/g, ' ').includes('q=Centro, Feira') ? [{ lat: '-12.25', lon: '-38.95' }] : []);
    const r = await run({ street: 'Rua Inexistente, 1 - Centro', city: 'Feira de Santana', state: 'BA' });
    expect(r?.precision).toBe('neighborhood');

    urls.length = 0;
    responder = (url) => (url.includes('city=') && !url.includes('street=') ? [{ lat: '-12.2', lon: '-38.9' }] : []);
    const c = await run({ street: 'Rua Inexistente, 1', city: 'Feira de Santana', state: 'BA' });
    expect(c?.precision).toBe('city');
  });

  it('nada encontrado em nenhuma tentativa: devolve null (quem chama avisa e não grava ponto errado)', async () => {
    responder = () => [];
    expect(await run({ street: 'Rua X, 1', city: 'Feira de Santana', state: 'BA' })).toBeNull();
  });

  it('CEP zerado de cadastro antigo (00000-000) é ignorado', async () => {
    responder = () => [];
    await run({ street: 'Rua X, 1', city: 'Feira de Santana', state: 'BA', postalCode: '00000-000' });
    expect(urls.some((u) => u.includes('brasilapi') || u.includes('postalcode='))).toBe(false);
  });
});
