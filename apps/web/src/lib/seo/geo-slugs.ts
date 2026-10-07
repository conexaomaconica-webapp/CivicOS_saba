/** Slugs de URL para estado, cidade e categoria (páginas /guia/{estado}/{cidade}/{categoria}). */

export function slugify(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const UF_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

export type StateInfo = { uf: string; name: string; slug: string };

const STATE_BY_SLUG = new Map<string, StateInfo>(
  Object.entries(UF_NAMES).map(([uf, name]) => [slugify(name), { uf, name, slug: slugify(name) }])
);

/** Aceita "BA", "ba" ou "Bahia"; qualquer outra coisa devolve null. */
export function resolveState(raw: string | null | undefined): StateInfo | null {
  const value = (raw ?? '').trim();
  if (!value) return null;
  const byUf = UF_NAMES[value.toUpperCase()];
  if (byUf) return STATE_BY_SLUG.get(slugify(byUf)) ?? null;
  return STATE_BY_SLUG.get(slugify(value)) ?? null;
}

export function stateFromSlug(slug: string): StateInfo | null {
  return STATE_BY_SLUG.get(slug) ?? null;
}
