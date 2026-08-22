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
