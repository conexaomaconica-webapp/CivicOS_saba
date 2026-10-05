/**
 * Leitura de uma frase de busca de lojas ("feira de santana sexta") em termos reconhecidos
 * (cidade, UF, potência, rito, dia). Usada só para mostrar na tela o que foi entendido;
 * quem de fato filtra é a função public_lodges_search no banco (migração 166).
 */

export type LodgeSearchFacets = {
  cities: string[];
  potencies: Array<{ abbreviation?: string | null; name?: string | null; slug?: string | null }>;
  rites: Array<{ name?: string | null; slug?: string | null }>;
};

export type InterpretedLodgeQuery = {
  /** Texto restante para busca por nome/número. */
  query: string;
  state: string;
  city: string;
  potency: string;
  rite: string;
  day: string;
};

export const EMPTY_INTERPRETATION: InterpretedLodgeQuery = {
  query: '', state: '', city: '', potency: '', rite: '', day: '',
};

const DAY_PATTERNS: Array<[string, RegExp]> = [
  ['segunda', /\bsegundas?(?:[- ]feiras?)?\b/],
  ['terca', /\btercas?(?:[- ]feiras?)?\b/],
  ['quarta', /\bquartas?(?:[- ]feiras?)?\b/],
  ['quinta', /\bquintas?(?:[- ]feiras?)?\b/],
  ['sexta', /\bsextas?(?:[- ]feiras?)?\b/],
  ['sabado', /\bsabados?\b/],
  ['domingo', /\bdomingos?\b/],
];

const UF_BY_NAME: Record<string, string> = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE', 'distrito federal': 'DF',
  'espirito santo': 'ES', goias: 'GO', maranhao: 'MA', 'mato grosso do sul': 'MS', 'mato grosso': 'MT',
  'minas gerais': 'MG', para: 'PA', paraiba: 'PB', parana: 'PR', pernambuco: 'PE', piaui: 'PI',
  'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondonia: 'RO', roraima: 'RR',
  'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE', tocantins: 'TO',
};

const RITE_ALIASES: Array<[RegExp, string]> = [
  [/\breaa\b|\bescoces\b/, 'reaa'],
  [/\byork\b/, 'york'],
  [/\bmoderno\b|\bfrances\b/, 'moderno'],
  [/\badonhiramita\b/, 'adonhiramita'],
  [/\bbrasileiro\b/, 'brasileiro'],
  [/\bschroe?der\b/, 'schroeder'],
];

// Palavras genéricas que não ajudam a achar o nome da loja.
const GENERIC_EDGE_WORDS = new Set([
  'loja', 'lojas', 'maconica', 'maconicas', 'maconico', 'oficina', 'oficinas', 'em', 'de', 'do', 'da', 'no', 'na',
  'nas', 'nos', 'que', 'se', 'reune', 'reunem', 'reuniao', 'reunioes', 'sessao', 'sessoes', 'dia', 'dias', 'as',
  'aos', 'a', 'o', 'e', 'com', 'para', 'por', 'perto', 'procuro', 'procurar', 'buscar', 'busco', 'quero', 'achar',
  'encontrar', 'onde', 'tem', 'ha', 'ritos', 'rito', 'potencia', 'cidade', 'estado', 'oriente', 'todas', 'todos',
]);

export const normalizeText = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Remove `phrase` (já normalizada) do texto normalizado; devolve null se não houver como palavra inteira. */
function removePhrase(text: string, phrase: string): string | null {
  const regex = new RegExp(`(^|\\s)${escapeRegex(phrase)}(?=\\s|$)`);
  if (!regex.test(text)) return null;
  return text.replace(regex, ' ').replace(/\s+/g, ' ').trim();
}

export function interpretLodgeQueryByRules(raw: string, facets: LodgeSearchFacets): InterpretedLodgeQuery {
  let rest = normalizeText(raw);
  const result: InterpretedLodgeQuery = { ...EMPTY_INTERPRETATION };
  if (!rest) return result;

  // Dia da reunião
  for (const [day, pattern] of DAY_PATTERNS) {
    if (pattern.test(rest)) {
      result.day = day;
      rest = rest.replace(pattern, ' ').replace(/\s+/g, ' ').trim();
      break;
    }
  }

  // Cidade (a mais longa primeiro, para "Feira de Santana" vencer "Santana")
  const cities = [...facets.cities].sort((a, b) => b.length - a.length);
  for (const city of cities) {
    const norm = normalizeText(city);
    if (!norm) continue;
    const next = removePhrase(rest, norm);
    if (next !== null) {
      result.city = city;
      rest = next;
      break;
    }
  }

  // Estado por nome (sem cidade com o mesmo nome já reconhecida) ou sigla após "em/uf"
  if (!result.city) {
    const byName = Object.keys(UF_BY_NAME).sort((a, b) => b.length - a.length);
    for (const name of byName) {
      const next = removePhrase(rest, name);
      if (next !== null) {
        result.state = UF_BY_NAME[name]!;
        rest = next;
        break;
      }
    }
  }

  // Potência: sigla, nome ou slug
  outer: for (const potency of facets.potencies) {
    const candidates = [potency.abbreviation, potency.name, potency.slug]
      .filter((v): v is string => Boolean(v))
      .map(normalizeText)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    for (const candidate of candidates) {
      const next = removePhrase(rest, candidate);
      if (next !== null) {
        result.potency = potency.abbreviation || potency.slug || potency.name || '';
        rest = next;
        break outer;
      }
    }
  }

  // Rito: por nome cadastrado ou pelos apelidos conhecidos
  for (const rite of facets.rites) {
    const norm = normalizeText(rite.name || '');
    if (!norm) continue;
    const short = norm.replace(/\(.*?\)/g, '').trim();
    const next = removePhrase(rest, norm) ?? (short ? removePhrase(rest, short) : null);
    if (next !== null) {
      result.rite = rite.slug || rite.name || '';
      rest = next;
      break;
    }
  }
  if (!result.rite) {
    for (const [pattern, slug] of RITE_ALIASES) {
      if (pattern.test(rest)) {
        const matched = facets.rites.find(
          (r) => normalizeText(r.slug || '') === slug || normalizeText(r.name || '').includes(slug)
        );
        result.rite = matched?.slug || matched?.name || slug;
        rest = rest.replace(pattern, ' ').replace(/\s+/g, ' ').trim();
        break;
      }
    }
  }

  // Sobra: tira palavras genéricas das pontas e usa o resto como nome/número
  const words = rest.split(' ').filter(Boolean);
  while (words.length && GENERIC_EDGE_WORDS.has(words[0]!)) words.shift();
  while (words.length && GENERIC_EDGE_WORDS.has(words[words.length - 1]!)) words.pop();
  result.query = words.join(' ');

  // Se nada foi reconhecido, mantém a frase original como busca textual.
  const recognized = result.city || result.state || result.potency || result.rite || result.day;
  if (!recognized) result.query = normalizeText(raw);

  return result;
}

export function describeInterpretation(i: InterpretedLodgeQuery): string[] {
  const chips: string[] = [];
  if (i.city) chips.push(`Cidade: ${i.city}`);
  if (i.state) chips.push(`Estado: ${i.state}`);
  if (i.potency) chips.push(`Potência: ${i.potency}`);
  if (i.rite) chips.push(`Rito: ${i.rite}`);
  if (i.day) chips.push(`Reunião: ${i.day.charAt(0).toUpperCase()}${i.day.slice(1)}`);
  if (i.query) chips.push(`Nome/número: “${i.query}”`);
  return chips;
}
