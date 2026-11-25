export const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

const citiesCache = new Map<string, string[]>();

/**
 * Busca os municípios de uma UF na API pública do IBGE com cache em memória.
 * Retorna array vazio em caso de falha para permitir fallback para digitação manual.
 */
export async function fetchCitiesByUf(
  uf: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const cleanUf = uf.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cleanUf)) return [];

  const cached = citiesCache.get(cleanUf);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetchImpl(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${cleanUf}/municipios?orderBy=nome`,
      { signal: controller.signal },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ nome?: unknown }>;
    if (!Array.isArray(data)) return [];
    const names = data
      .map((item) => (typeof item?.nome === 'string' ? item.nome.trim() : ''))
      .filter(Boolean);
    if (names.length > 0) {
      citiesCache.set(cleanUf, names);
    }
    return names;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

