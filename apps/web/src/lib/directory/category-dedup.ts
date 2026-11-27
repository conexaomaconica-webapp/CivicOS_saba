/**
 * Utilitário canônico para normalização e deduplicação de categorias
 * (principais e secundárias), ignorando acentos, caixa e espaçamento duplicado.
 */

export function normalizeCategoryKey(raw?: string | null): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function hasAccentedChars(value?: string | null): boolean {
  const s = String(value || '');
  return s.normalize('NFD') !== s;
}

export function isSameCategoryName(a?: string | null, b?: string | null): boolean {
  const keyA = normalizeCategoryKey(a);
  const keyB = normalizeCategoryKey(b);
  return Boolean(keyA && keyB && keyA === keyB);
}

/**
 * Deduplica lista de categorias que diferem apenas por acento/maiúsculas.
 * Quando existem duas entradas equivalentes (ex.: "Maquinas" e "Máquinas"),
 * preserva a entrada com acentuação correta.
 */
export function deduplicateCategoriesByName<T extends { name: string }>(
  categories: T[]
): T[] {
  const byKey = new Map<string, T>();

  for (const item of categories) {
    const cleanName = String(item?.name || '').trim().replace(/\s+/g, ' ');
    const key = normalizeCategoryKey(cleanName);
    if (!key) continue;

    const normalizedItem = { ...item, name: cleanName };
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, normalizedItem);
      continue;
    }

    // Se a nova versão possui acentos e a anterior não possuía, prefere a acentuada
    if (!hasAccentedChars(existing.name) && hasAccentedChars(cleanName)) {
      byKey.set(key, normalizedItem);
    }
  }

  return Array.from(byKey.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  );
}

