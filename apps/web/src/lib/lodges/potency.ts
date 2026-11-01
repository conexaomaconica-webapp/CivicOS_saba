/**
 * Unificação e Canonicidade de Potências Maçônicas.
 *
 * Mapeia variações textuais gravadas no banco ("GRANDE LOJA - CMSB", "GRANDE ORIENTE DO BRASIL – GOB",
 * "CMSB/BA", "CMSB-RJ", "GLEB", "GOSP"...) para os códigos canônicos oficiais:
 * "CMSB", "GOB", "COMAB", "GOSP".
 *
 * Filtra termos inválidos (como graus maçônicos "Mestre", "Aprendiz", etc.).
 */

const UFS = 'AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO';
// Base + separador (/, -, – ou espaço) + UF no fim. A base nunca fica vazia.
const UF_SUFFIX = new RegExp(`^[\\s/\\-–]*(.+?)[\\s/\\-–]+(?:${UFS})\\s*$`, 'i');

/** Nomes por extenso das potências conhecidas (quando o catálogo do banco não trouxer o nome). */
export const KNOWN_POTENCY_NAMES: Record<string, string> = {
  CMSB: 'Grande Loja Maçônica',
  GOB: 'Grande Oriente do Brasil',
  COMAB: 'Grande Oriente',
  GOSP: 'Grande Oriente de São Paulo',
};

const INVALID_POTENCIES = new Set([
  'MESTRE',
  'APRENDIZ',
  'COMPANHEIRO',
  'MESTRE INSTALADO',
]);

/**
 * Converte qualquer variação textual de potência para o seu código canônico oficial.
 * Exemplos:
 * - "GRANDE ORIENTE DO BRASIL – GOB" -> "GOB"
 * - "GRANDE LOJA - CMSB" -> "CMSB"
 * - "GLEB" -> "CMSB"
 * - "GRANDE ORIENTE - COMAB" -> "COMAB"
 * - "GRANDE ORIENTE DE SÃO PAULO - GOSP" -> "GOSP"
 * - "Mestre" -> "" (inválido, ignorado)
 */
export function canonicalPotencyCode(raw?: string | null): string {
  if (!raw) return '';

  const text = String(raw)
    .replace(/\s*\([^)]*\)?\s*$/, '')
    .replace(/\s*\)+\s*$/, '')
    .replace(/\s*[-–—]\s*$/, '')
    .trim();

  if (!text) return '';

  const upper = text.toUpperCase();

  // Ignora termos inválidos como graus maçônicos inseridos no campo de potência
  if (INVALID_POTENCIES.has(upper)) return '';

  // 1. GOSP (Grande Oriente de São Paulo - checar antes para não colidir com Grande Oriente genérico)
  if (
    upper === 'GOSP' ||
    upper.includes('GOSP') ||
    (upper.includes('GRANDE ORIENTE') && (upper.includes('SÃO PAULO') || upper.includes('SAO PAULO')))
  ) {
    return 'GOSP';
  }

  // 2. GOB (Grande Oriente do Brasil)
  if (
    upper === 'GOB' ||
    upper.startsWith('GOB/') ||
    upper.startsWith('GOB-') ||
    upper.startsWith('GOB ') ||
    upper.includes('DO BRASIL – GOB') ||
    upper.includes('DO BRASIL - GOB') ||
    upper.includes('GRANDE ORIENTE DO BRASIL')
  ) {
    return 'GOB';
  }

  // 3. CMSB (Confederação da Maçonaria Simbólica do Brasil - Grandes Lojas)
  if (
    upper === 'CMSB' ||
    upper.startsWith('CMSB/') ||
    upper.startsWith('CMSB-') ||
    upper.startsWith('CMSB ') ||
    upper.includes('GRANDE LOJA') ||
    upper.includes('GRANDES LOJAS') ||
    upper === 'GLEB' ||
    upper.startsWith('GLEB ') ||
    upper.startsWith('GLEB/')
  ) {
    return 'CMSB';
  }

  // 4. COMAB (Confederação Maçônica do Brasil - Grandes Orientes Estaduais Autônomos)
  if (
    upper === 'COMAB' ||
    upper.startsWith('COMAB/') ||
    upper.startsWith('COMAB-') ||
    upper.startsWith('COMAB ') ||
    upper.includes('COMAB') ||
    upper.includes('GRANDE ORIENTE')
  ) {
    return 'COMAB';
  }

  // Caso seja outra sigla válida com sufixo de estado (ex: "GLMMG - MG")
  const base = text.match(UF_SUFFIX)?.[1]?.trim() || text;
  return /^[A-Za-zÀ-ÿ0-9.]+$/.test(base) ? base.toUpperCase() : base;
}

/**
 * Traduz o código canônico da UI ("CMSB", "GOB", "COMAB", "GOSP") para o valor esperado
 * pela query no banco de dados.
 */
export function resolveDbPotency(code?: string | null): string | null {
  if (!code) return null;
  const canonical = canonicalPotencyCode(code);
  switch (canonical) {
    case 'CMSB':
      return 'GRANDE LOJA - CMSB';
    case 'GOB':
      return 'GRANDE ORIENTE DO BRASIL – GOB';
    case 'COMAB':
      return 'GRANDE ORIENTE - COMAB';
    case 'GOSP':
      return 'GRANDE ORIENTE DE SÃO PAULO - GOSP';
    default:
      return code.trim() || null;
  }
}

/** Rótulo para exibição: "Grande Loja Maçônica - CMSB" para siglas conhecidas; senão, a própria sigla. */
export function potencyLabel(code: string, catalogName?: string | null): string {
  const upper = code.toUpperCase();
  const name = (catalogName && catalogName.trim()) || KNOWN_POTENCY_NAMES[upper] || '';
  return name && name.toLowerCase() !== code.toLowerCase() ? `${name} - ${upper}` : upper;
}
