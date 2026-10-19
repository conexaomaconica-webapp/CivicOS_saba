export const DEFAULT_HOME_SECTION_IDS = [
  'carousel',
  'weekly_highlight',
  'connections_cta',
  'categories',
  'sponsored',
  'connections_mural',
  'all_businesses',
  'map',
  'lodges',
] as const;

export type HomeSectionId = (typeof DEFAULT_HOME_SECTION_IDS)[number];

export type HomeSectionConfig = {
  id: HomeSectionId;
  enabled: boolean;
  order: number;
};

/** Fallback visual local. Na Fase 2, a configuração publicada pelo servidor terá prioridade. */
export const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = DEFAULT_HOME_SECTION_IDS.map((id, index) => ({
  id,
  enabled: true,
  order: index + 1,
}));

export function visibleHomeSections(config: HomeSectionConfig[] = DEFAULT_HOME_SECTIONS) {
  return [...config].filter((section) => section.enabled).sort((a, b) => a.order - b.order);
}

