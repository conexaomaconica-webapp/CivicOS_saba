export interface SearchRelevanceCandidate {
  name?: string | null;
  category_name?: string | null;
  description?: string | null;
  short_description?: string | null;
  city?: string | null;
  responsible_name?: string | null;
  reference_mason_name?: string | null;
  masonic_member_name?: string | null;
  masonic_brother_name?: string | null;
  is_pedra_fundamental?: boolean | null;
  effective_plan_code?: string | null;
  plan_tier?: string | null;
  plan_code?: string | null;
}

function normalizeForRelevance(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function stripMasonicPrefixes(normalized: string): string {
  return normalized
    .replace(/(^|\s)(ir\.?|irmao|cunhada|sobrinho|sobrinha)(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitWords(normalized: string): string[] {
  return normalized.split(/[\s\-_/.,;:()]+/).filter(Boolean);
}

function getPlanTieBreaker(item: SearchRelevanceCandidate): number {
  if (item.is_pedra_fundamental) return 0;
  const raw = (item.effective_plan_code || item.plan_tier || item.plan_code || '').toLowerCase().trim();
  if (raw === 'acacia' || raw === 'ouro') return 1;
  if (raw === 'compasso' || raw === 'prata') return 2;
  if (raw === 'esquadro' || raw === 'bronze') return 3;
  return 4;
}

/**
 * Calcula a relevância textual de um item do Guia Comercial para uma consulta.
 * Menor pontuação = maior relevância (ex.: nome da empresa começando pelo termo
 * buscado fica sempre acima de correspondência parcial em sobrenome de membro).
 */
export function getSearchRelevanceScore(
  item: SearchRelevanceCandidate,
  rawQuery: string,
): number {
  const normQ = normalizeForRelevance(rawQuery);
  if (!normQ) return 0;

  const cleanMemberQ = stripMasonicPrefixes(normQ) || normQ;
  const normName = normalizeForRelevance(item.name);

  if (normName) {
    if (normName === normQ) return 0;
    if (normName.startsWith(normQ)) return 1;
    const nameWords = splitWords(normName);
    if (nameWords.some((w) => w.startsWith(normQ))) return 2;
    if (normName.includes(normQ)) return 3;
  }

  const normCategory = normalizeForRelevance(item.category_name);
  if (normCategory) {
    if (normCategory === normQ || normCategory.startsWith(normQ)) return 4;
    if (splitWords(normCategory).some((w) => w.startsWith(normQ))) return 4.2;
    if (normCategory.includes(normQ)) return 4.4;
  }

  const normDesc = normalizeForRelevance(item.description || item.short_description);
  const normCity = normalizeForRelevance(item.city);
  const secondaryText = [normDesc, normCity].filter(Boolean).join(' ');
  if (secondaryText) {
    if (splitWords(secondaryText).some((w) => w.startsWith(normQ))) return 5;
    if (secondaryText.includes(normQ)) return 5.5;
  }

  const memberFields = [
    item.responsible_name,
    item.reference_mason_name,
    item.masonic_member_name,
    item.masonic_brother_name,
  ]
    .map(normalizeForRelevance)
    .filter(Boolean);

  if (memberFields.length > 0) {
    const memberText = memberFields.join(' ');
    const memberWords = splitWords(memberText);
    if (memberWords.some((w) => w.startsWith(cleanMemberQ))) return 6;
    if (memberText.includes(cleanMemberQ)) return 6.5;
  }

  return 9;
}

/**
 * Ordena resultados de busca por relevância textual, usando reconhecimento/plano e nome A-Z como desempate.
 */
export function sortBusinessesBySearchRelevance<T extends SearchRelevanceCandidate>(
  items: readonly T[],
  rawQuery: string,
): T[] {
  const normQ = normalizeForRelevance(rawQuery);
  if (!normQ) return [...items];

  return [...items].sort((a, b) => {
    const scoreDiff = getSearchRelevanceScore(a, normQ) - getSearchRelevanceScore(b, normQ);
    if (scoreDiff !== 0) return scoreDiff;

    const planDiff = getPlanTieBreaker(a) - getPlanTieBreaker(b);
    if (planDiff !== 0) return planDiff;

    return (a.name || '').localeCompare(b.name || '', 'pt-BR');
  });
}

