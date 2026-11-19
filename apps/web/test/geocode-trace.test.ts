import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { geocodeBrazilianAddressWithTrace } from '../src/lib/geo/geocode';

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('geocodeBrazilianAddressWithTrace: devolve o que foi tentado', () => {
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

  const run = async (input: Parameters<typeof geocodeBrazilianAddressWithTrace>[0]) => {
    const p = geocodeBrazilianAddressWithTrace(input);
    await vi.runAllTimersAsync();
    return p;
  };

  it('só a cidade respondeu: o rastro mostra as tentativas que falharam e a cidade como achada', async () => {
    responder = (url) => (url.includes('city=') && !url.includes('street=') ? [{ lat: '-12.2578934', lon: '-38.9598047' }] : []);
    const { result, trace } = await run({ street: 'Rua Desconhecida, 77 - Centro', city: 'Feira de Santana', state: 'BA' });
    expect(result?.precision).toBe('city');
    expect(trace.at(-1)).toEqual({ label: 'cidade', precision: 'city', found: true });
    expect(trace.slice(0, -1).every((step) => step.found === false)).toBe(true);
    expect(trace.map((step) => step.label)).toEqual(expect.arrayContaining(['rua com número', 'rua']));
  });

  it('com CEP: tenta o CEP e depois o nome OFICIAL da rua (ViaCEP) antes do bairro e da cidade', async () => {
    responder = (url) => {
      if (url.includes('viacep.com.br')) return { logradouro: 'Rua Oficial', bairro: 'Centro' };
      if (url.includes('brasilapi')) return {};
      const decoded = decodeURIComponent(url).replace(/\+/g, ' ');
      return decoded.includes('street=77 Rua Oficial') ? [{ lat: '-12.26', lon: '-38.96' }] : [];
    };
    const { result, trace } = await run({ street: 'R. Apelido, 77', city: 'Feira de Santana', state: 'BA', postalCode: '44050-000' });
    expect(result).toEqual({ latitude: -12.26, longitude: -38.96, precision: 'address' });
    const labels = trace.map((step) => step.label);
    expect(labels.indexOf('CEP')).toBeLessThan(labels.indexOf('rua pelo CEP'));
    expect(labels.at(-1)).toBe('rua pelo CEP');
    expect(trace.at(-1)?.found).toBe(true);
  });

  it('nada achado: resultado nulo e todas as tentativas marcadas como não achadas', async () => {
    responder = () => [];
    const { result, trace } = await run({ street: 'Rua X, 1', city: 'Feira de Santana', state: 'BA' });
    expect(result).toBeNull();
    expect(trace.length).toBeGreaterThan(0);
    expect(trace.every((step) => !step.found)).toBe(true);
  });

  it('sem cidade ou UF: não consulta nada', async () => {
    responder = () => [];
    const { result, trace } = await run({ street: 'Rua X', city: '', state: 'BA' });
    expect(result).toBeNull();
    expect(trace).toEqual([]);
    expect(urls).toHaveLength(0);
  });
});
