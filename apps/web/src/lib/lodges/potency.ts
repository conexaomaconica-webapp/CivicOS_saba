/**
 * Unificação de potências na leitura.
 *
 * A importação gravou potências separadas por estado ("CMSB/BA", "CMSB-RJ", "GOB SP"...). Os dados ficam como estão
 * (a chave única da loja é potência + número, e unir no banco poderia colidir lojas de números iguais em estados
 * diferentes); filtros, cards e busca passam a usar a potência-base: "CMSB", "GOB", "COMAB".
 */

const UFS = 'AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO';
// Base + separador (/, -, – ou espaço) + UF no fim. A base nunca fica vazia.
const UF_SUFFIX = new RegExp(`^(.+?)[\\s/\\-–]+(?:${UFS})\\s*$`, 'i');

/** Nomes por extenso das potências conhecidas (quando o catálogo do banco não trouxer o nome). */
export const KNOWN_POTENCY_NAMES: Record<string, string> = {
  GOB: 'Grande Oriente do Brasil',
  CMSB: 'Grande Loja Maçônica',
  COMAB: 'Grande Oriente',
};

/** "CMSB/BA" -> "CMSB"; "gob - rj" -> "GOB"; "Grande Oriente do Brasil" fica igual. */
export function canonicalPotencyCode(raw?: string | null): string {
  // Parêntese final ("(...)" ou ")" solto) e traço pendente não fazem parte do nome: "GRANDE ORIENTE DO BRASIL – GOB)".
  const text = String(raw ?? '')
    .replace(/\s*\([^)]*\)?\s*$/, '')
    .replace(/\s*\)+\s*$/, '')
    .replace(/\s*[-–—]\s*$/, '')
    .trim();
  if (!text) return '';
  const base = text.match(UF_SUFFIX)?.[1]?.trim() || text;
  // Siglas (sem espaços) ficam em maiúsculas; nomes por extenso preservam a grafia.
  return /^[A-Za-zÀ-ÿ0-9.]+$/.test(base) ? base.toUpperCase() : base;
}

/** Rótulo para exibição: "Grande Loja Maçônica - CMSB" para siglas conhecidas; senão, a própria sigla. */
export function potencyLabel(code: string, catalogName?: string | null): string {
  const name = (catalogName && catalogName.trim()) || KNOWN_POTENCY_NAMES[code.toUpperCase()] || '';
  return name && name.toLowerCase() !== code.toLowerCase() ? `${name} - ${code}` : code;
}
