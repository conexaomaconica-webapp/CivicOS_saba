import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HOME_SECTIONS,
  extraHomeSectionEntries,
  needsDividerBetween,
  normalizeHomeSections,
} from '../src/lib/directory/home-sections';

const ids = (list: Array<{ id: string }>) => list.map((s) => s.id);

describe('seções da home do Guia', () => {
  it('lista as seções reais, incluindo o card e o Mural de Conexões, quando a configuração é antiga', () => {
    const legacy = [
      { id: 'hero', order: 1, enabled: true },
      { id: 'carousel', order: 2, enabled: true },
      { id: 'categories', order: 3, enabled: true },
      { id: 'sponsored', order: 4, enabled: true, display_mode: 'logos', speed: 75 },
      { id: 'all_businesses', order: 5, enabled: true },
      { id: 'map', order: 6, enabled: true },
      { id: 'lodges', order: 7, enabled: true },
    ];
    const result = normalizeHomeSections(legacy);
    expect(ids(result)).toEqual([
      'hero', 'carousel', 'connections_cta', 'categories', 'sponsored', 'connections_mural', 'all_businesses', 'map', 'lodges',
    ]);
    expect(result.every((s) => s.enabled)).toBe(true);
    expect(result.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // propriedades do bloco patrocinado são mantidas
    expect(result.find((s) => s.id === 'sponsored')).toMatchObject({ display_mode: 'logos', speed: 75 });
  });

  it('respeita a ordem e a visibilidade gravadas (mover o Mural e ocultar seções)', () => {
    const saved = [
      { id: 'hero', order: 1, enabled: true },
      { id: 'connections_mural', order: 2, enabled: true },
      { id: 'carousel', order: 3, enabled: false },
      { id: 'connections_cta', order: 4, enabled: true },
      { id: 'categories', order: 5, enabled: true },
      { id: 'sponsored', order: 6, enabled: true },
      { id: 'all_businesses', order: 7, enabled: true },
      { id: 'map', order: 8, enabled: false },
      { id: 'lodges', order: 9, enabled: true },
    ];
    const result = normalizeHomeSections(saved);
    expect(ids(result)).toEqual(['hero', 'connections_mural', 'carousel', 'connections_cta', 'categories', 'sponsored', 'all_businesses', 'map', 'lodges']);
    expect(result.find((s) => s.id === 'carousel')?.enabled).toBe(false);
    expect(result.find((s) => s.id === 'map')?.enabled).toBe(false);
  });

  it('configuração vazia ou inválida cai na ordem padrão; ids desconhecidos não viram seção', () => {
    expect(ids(normalizeHomeSections(null))).toEqual(ids(DEFAULT_HOME_SECTIONS));
    expect(ids(normalizeHomeSections('lixo'))).toEqual(ids(DEFAULT_HOME_SECTIONS));
    const withExtra = [{ id: 'pedra_fundamental', max_quota: 50 }, { id: 'hero', order: 1, enabled: true }];
    expect(ids(normalizeHomeSections(withExtra))).not.toContain('pedra_fundamental');
    expect(extraHomeSectionEntries(withExtra)).toEqual([{ id: 'pedra_fundamental', max_quota: 50 }]);
  });

  it('o topo (hero, carrossel, card do mural) fica colado; as demais seções têm divisor', () => {
    expect(needsDividerBetween('hero', 'carousel')).toBe(false);
    expect(needsDividerBetween('carousel', 'connections_cta')).toBe(false);
    expect(needsDividerBetween('connections_cta', 'categories')).toBe(true);
    expect(needsDividerBetween('sponsored', 'connections_mural')).toBe(true);
  });
});
