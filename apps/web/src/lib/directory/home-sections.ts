/**
 * Seções da home do Guia (/guia): fonte única para o painel (Ordem e Ativação das Seções) e para a página pública.
 * Sem dependências de servidor: pode ser usada em componentes de navegador e de servidor.
 */
export const HOME_SECTIONS = [
  { id: 'hero', label: 'Topo Hero & Busca Inteligente' },
  { id: 'carousel', label: 'Banner Carrossel (Destaque da Semana)' },
  { id: 'connections_cta', label: 'Card de divulgação do Mural de Conexões' },
  { id: 'categories', label: 'Categorias em Destaque' },
  { id: 'sponsored', label: 'Empresas Patrocinadas' },
  { id: 'connections_mural', label: 'Mural de Conexões' },
  { id: 'all_businesses', label: 'Diretório "Todas as Empresas" (Com Paginação)' },
  { id: 'map', label: 'Mapa "Explore perto de você"' },
  { id: 'lodges', label: 'Guia de Lojas Maçônicas' },
] as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[number]['id'];

export type HomeSectionConfig = { id: string; enabled: boolean; order: number; [key: string]: any };

const KNOWN_IDS: readonly string[] = HOME_SECTIONS.map((section) => section.id);

export const HOME_SECTION_LABELS: Record<string, string> = Object.fromEntries(HOME_SECTIONS.map((s) => [s.id, s.label]));

/** Configuração padrão: todas as seções visíveis, na ordem original da página. */
export const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = HOME_SECTIONS.map((section, index) => ({
  id: section.id,
  enabled: true,
  order: index + 1,
}));

function asArray(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Configuração gravada -> lista completa e ordenada das seções reais da home.
 * - ordem e visibilidade gravadas são respeitadas (e as demais propriedades, como as do bloco patrocinado, mantidas);
 * - seção real que ainda não existe na configuração (ex.: as do Mural de Conexões) entra logo depois da que vem antes dela
 *   na ordem padrão, visível;
 * - ids que não são seções da home (ex.: cota da Pedra Fundamental) são ignorados aqui: veja extraHomeSectionEntries.
 */
export function normalizeHomeSections(raw: unknown): HomeSectionConfig[] {
  const stored = asArray(raw)
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry && typeof entry.id === 'string' && KNOWN_IDS.includes(entry.id));

  const seen = new Set<string>();
  const ordered = stored
    .sort((a, b) => {
      const orderA = Number.isFinite(Number(a.entry.order)) ? Number(a.entry.order) : a.index + 1;
      const orderB = Number.isFinite(Number(b.entry.order)) ? Number(b.entry.order) : b.index + 1;
      return orderA - orderB || a.index - b.index;
    })
    .filter(({ entry }) => (seen.has(entry.id) ? false : (seen.add(entry.id), true)))
    .map(({ entry }) => ({ ...entry, enabled: entry.enabled !== false }) as HomeSectionConfig);

  for (let defaultIndex = 0; defaultIndex < HOME_SECTIONS.length; defaultIndex += 1) {
    const id = HOME_SECTIONS[defaultIndex]!.id;
    if (seen.has(id)) continue;
    let insertAt = 0;
    for (let previous = defaultIndex - 1; previous >= 0; previous -= 1) {
      const position = ordered.findIndex((section) => section.id === HOME_SECTIONS[previous]!.id);
      if (position >= 0) {
        insertAt = position + 1;
        break;
      }
    }
    ordered.splice(insertAt, 0, { id, enabled: true, order: 0 });
    seen.add(id);
  }

  return ordered.map((section, index) => ({ ...section, order: index + 1 }));
}

/** Entradas da configuração que não são seções da home (preservadas ao salvar). */
export function extraHomeSectionEntries(raw: unknown): HomeSectionConfig[] {
  return asArray(raw).filter(
    (entry): entry is HomeSectionConfig => Boolean(entry) && typeof entry.id === 'string' && !KNOWN_IDS.includes(entry.id),
  );
}

const TOP_GROUP = new Set(['hero', 'carousel', 'connections_cta']);

/** Divisor visual entre duas seções vizinhas: o topo da página (hero, carrossel e card do mural) fica colado. */
export function needsDividerBetween(previousId: string, currentId: string): boolean {
  return !(TOP_GROUP.has(previousId) && TOP_GROUP.has(currentId));
}
