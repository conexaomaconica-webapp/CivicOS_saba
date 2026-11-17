/** Quantidade de conexões nas vitrines compactas (Home do Guia e landing). */
export const COMPACT_SHOWCASE_LIMIT = 3;

/** Máximo que o banco entrega por consulta (public_connections_feed limita em 24). */
export const FEED_DB_MAX = 24;

/**
 * Escolhe no máximo UMA conexão por empresa, mantendo a ordem recebida (a primeira de cada empresa vale).
 * Uso: reserva quando a função do banco com p_one_per_business ainda não existe (migration 244 não aplicada).
 * A regra principal fica no banco; aqui o conjunto de entrada já é o mais amplo possível (24).
 */
export function pickOnePerBusiness<T extends { business_slug?: string | null }>(items: T[], limit: number): T[] {
  const seen = new Set<string>();
  const picked: T[] = [];
  for (const item of items ?? []) {
    const key = item.business_slug ?? '';
    if (!key || seen.has(key)) continue;
    seen.add(key);
    picked.push(item);
    if (picked.length >= Math.max(1, limit)) break;
  }
  return picked;
}

/** Embaralha (Fisher-Yates) sem alterar a lista original. `random` é injetável para testes. */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const out = [...(items ?? [])];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Seleção ALEATÓRIA das vitrines compactas: sorteia entre as conexões com foto aprovada (empresas distintas) e só
 * completa com as sem foto quando as fotos não bastam. Cada carregamento da página pode mostrar um conjunto diferente.
 * O conjunto de entrada já vem filtrado pelo banco (confirmada, consentimento, empresa publicada, foto aprovada).
 */
export function pickShowcaseRandom<T extends { business_slug?: string | null; photo_url?: string | null }>(
  items: T[],
  limit: number,
  random: () => number = Math.random,
): T[] {
  const distinct = pickOnePerBusiness(items, items?.length ?? 0);
  const withPhoto = shuffle(distinct.filter((i) => Boolean(i.photo_url)), random);
  const withoutPhoto = shuffle(distinct.filter((i) => !i.photo_url), random);
  return [...withPhoto, ...withoutPhoto].slice(0, Math.max(1, limit));
}
