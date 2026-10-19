import { describe, expect, it } from 'vitest';
import { DEFAULT_HOME_SECTION_IDS, visibleHomeSections, type HomeSectionConfig } from './home-sections';

describe('estrutura da Home do Guia', () => {
  it('mantém a ordem de fallback aprovada para o aplicativo', () => {
    expect(visibleHomeSections().map((section) => section.id)).toEqual(DEFAULT_HOME_SECTION_IDS);
  });

  it('aceita ordem e visibilidade externas sem alterar o fallback', () => {
    const remote: HomeSectionConfig[] = [
      { id: 'categories', enabled: true, order: 2 },
      { id: 'weekly_highlight', enabled: false, order: 1 },
      { id: 'map', enabled: true, order: 3 },
    ];
    expect(visibleHomeSections(remote).map((section) => section.id)).toEqual(['categories', 'map']);
    expect(visibleHomeSections().map((section) => section.id)).toEqual(DEFAULT_HOME_SECTION_IDS);
  });
});

