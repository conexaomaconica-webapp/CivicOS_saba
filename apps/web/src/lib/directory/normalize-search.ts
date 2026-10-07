import { categorySlug, slugify } from '@/lib/seo/geo-slugs';

/**
 * Normaliza um termo de busca removendo acentos e diacríticos (ex: "advocacía" -> "advocacia", "CONEXÃO" -> "CONEXAO").
 */
export function normalizeSearchTerm(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Resolve o termo de busca expandindo apelidos/variantes conhecidas de categorias.
 * Por exemplo: "ótica", "otica", "óticas", "oticas" -> "optica", permitindo encontrar
 * empresas cadastradas na categoria "Óptica" mesmo se digitado sem a letra 'p'.
 */
export function resolveSearchQuery(query: string): string {
  if (!query) return '';
  const norm = normalizeSearchTerm(query);
  if (!norm) return '';

  const words = norm.split(/\s+/).filter(Boolean);
  const mappedWords = words.map((word) => {
    const alias = categorySlug(word);
    const plain = slugify(word);
    if (alias && alias !== plain) {
      return alias;
    }
    return word;
  });

  return mappedWords.join(' ');
}
