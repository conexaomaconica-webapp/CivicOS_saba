/**
 * Localização de endereços brasileiros (Nominatim / OpenStreetMap + BrasilAPI para CEP), com queda gradual de precisão:
 * rua com número -> rua -> CEP -> bairro -> cidade/estado.
 * O resultado diz qual precisão foi obtida, para a tela avisar quando for aproximada.
 *
 * O endereço costuma chegar como UMA linha de texto livre ("Av. Getúlio Vargas, 500 - Centro, CEP 44001-000"):
 * `parseAddressLine` separa rua, número, bairro e CEP, e `geocodeBrazilianAddress` tenta variações dessa busca.
 * CEP, número e bairro guardados de um endereço ANTIGO nunca devem ser passados para o endereço novo (quem chama decide).
 *
 * Política do Nominatim: identificação própria e no máximo 1 requisição por segundo (há pausa entre tentativas).
 */

export type GeocodePrecision = 'address' | 'street' | 'neighborhood' | 'postal_code' | 'city' | 'manual';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  precision: GeocodePrecision;
}

export interface GeocodeInput {
  /** Rua OU a linha de endereço completa em texto livre (o número, o bairro e o CEP são extraídos dela). */
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  postalCode?: string | null;
}

export const PRECISION_LABEL: Record<GeocodePrecision, string> = {
  address: 'endereço',
  street: 'rua (sem o número exato)',
  neighborhood: 'bairro (aproximado)',
  postal_code: 'CEP (aproximado)',
  city: 'cidade (aproximado)',
  manual: 'informada manualmente',
};

const USER_AGENT = 'ConexaoMaconica-Geocoder/1.0 (+https://conexaomaconica.com.br)';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** Depois deste tempo só resta a tentativa final (cidade): evita estourar o limite da execução no servidor. */
const SOFT_DEADLINE_MS = 7000;

/** Limites aproximados do Brasil: protege contra coordenadas digitadas fora do país. */
export function isValidBrazilianCoordinate(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === 'number' && typeof longitude === 'number' &&
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -34 && latitude <= 6 && longitude >= -75 && longitude <= -28
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Leitura do endereço em texto livre
// ---------------------------------------------------------------------------------------------------------------------

const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/^r\.?\s+/i, 'Rua '],
  [/^av\.?\s+/i, 'Avenida '],
  [/^avda\.?\s+/i, 'Avenida '],
  [/^(?:pç|pca|pc)\.?\s+/i, 'Praça '],
  [/^(?:tv|trav)\.?\s+/i, 'Travessa '],
  [/^rod\.?\s+/i, 'Rodovia '],
  [/^al\.?\s+/i, 'Alameda '],
  [/^estr\.?\s+/i, 'Estrada '],
];

const COMPLEMENT = /^(?:sala|loja|bloco|bl\.?|apto?\.?|apartamento|andar|galeria|edif\w*|ed\.|t[ée]rreo|cj\.?|conj\w*|box|lote|quadra|qd\.?|km|anexo|fundos|sobreloja)\b/i;

export interface ParsedAddress {
  street: string;
  number: string;
  neighborhood: string;
  postalCode: string;
}

export function expandStreetAbbreviation(street: string): string {
  for (const [pattern, full] of ABBREVIATIONS) {
    if (pattern.test(street)) return street.replace(pattern, full);
  }
  return street;
}

/** Separa rua, número, bairro e CEP de uma linha de endereço. Nunca inventa dados: o que não achar volta vazio. */
export function parseAddressLine(raw?: string | null): ParsedAddress {
  let text = String(raw ?? '').replace(/\s+/g, ' ').trim();
  let postalCode = '';

  const cep = text.match(/\b(\d{5})-?(\d{3})\b/);
  if (cep) {
    postalCode = `${cep[1]}-${cep[2]}`;
    text = text.replace(cep[0], ' ').replace(/\bCEP\b[:\s]*/i, ' ');
  }

  const parts = text.split(/\s+-\s+|,|;|\|/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { street: '', number: '', neighborhood: '', postalCode };

  let street = parts[0]!;
  let number = '';
  let rest = parts.slice(1);

  // "Rua Tal 123" / "Rua Tal nº 123"
  // Em rodovias o número faz parte do NOME (BR 324): não é o número do imóvel.
  const isRoad = /^(?:rod\.?|rodovia|br|ba|estr\.?|estrada)(?![a-z])/i.test(street);
  const trailing = isRoad ? null : street.match(/^(.*?\D)\s+(?:n[ºo°.]*\s*)?(\d{1,6}[A-Za-z]?)$/i);
  if (trailing && trailing[1] && !/^\d+$/.test(trailing[1].trim())) {
    street = trailing[1].trim();
    number = trailing[2]!;
  } else if (rest[0]) {
    // "Rua Tal, 123" / "Rua Tal, nº 123" / "Rua Tal, 123 Sala 2"
    const next = rest[0].match(/^(?:n[ºo°.]*\s*)?(\d{1,6}[A-Za-z]?)\b/i);
    if (next) {
      number = next[1]!;
      rest = rest.slice(1);
    } else if (/^s\s*\/\s*n\b/i.test(rest[0])) {
      rest = rest.slice(1); // "s/n": sem número
    }
  }

  const neighborhood = rest.find((p) => !/\d/.test(p) && !COMPLEMENT.test(p) && !/^brasil$/i.test(p) && !/^[A-Za-z]{2}$/.test(p)) ?? '';
  return { street: expandStreetAbbreviation(street.trim()), number, neighborhood, postalCode };
}

// ---------------------------------------------------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------------------------------------------------

type Point = { latitude: number; longitude: number };

async function nominatim(params: Record<string, string | undefined>): Promise<Point | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  Object.entries({ format: 'jsonv2', limit: '1', countrycodes: 'br', ...params }).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT, 'Accept-Language': 'pt-BR' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;
  const results = (await response.json()) as Array<{ lat: string; lon: string }>;
  const latitude = Number(results[0]?.lat);
  const longitude = Number(results[0]?.lon);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

/** Coordenadas do CEP pela BrasilAPI (cobre bem os CEPs do país e não tem o limite de 1 req/s do Nominatim). */
async function brasilApiCep(postalCode: string): Promise<Point | null> {
  const digits = postalCode.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    cache: 'no-store',
    signal: AbortSignal.timeout(6_000),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { location?: { coordinates?: { latitude?: string | number; longitude?: string | number } } };
  const latitude = Number(body.location?.coordinates?.latitude);
  const longitude = Number(body.location?.coordinates?.longitude);
  return isValidBrazilianCoordinate(latitude, longitude) ? { latitude, longitude } : null;
}

type Attempt = { precision: GeocodePrecision; label: string; run: () => Promise<Point | null>; nominatim: boolean };

export async function geocodeBrazilianAddress(input: GeocodeInput): Promise<GeocodeResult | null> {
  const city = input.city?.trim();
  const state = input.state?.trim();
  if (!city || !state) return null;

  const parsed = parseAddressLine(input.street);
  const street = parsed.street;
  const digits = String(input.number ?? '').match(/\d+/)?.[0] ?? parsed.number.match(/\d+/)?.[0] ?? '';
  const neighborhood = input.neighborhood?.trim() || parsed.neighborhood;
  const informedPostal = input.postalCode?.trim() || '';
  const postal = /^0{5}-?0{3}$/.test(informedPostal) || !informedPostal ? parsed.postalCode : informedPostal;
  const hasRealPostal = Boolean(postal) && !/^0{5}-?0{3}$/.test(postal);
  const base = { city, state, country: 'Brasil' };

  const attempts: Attempt[] = [];
  const seen = new Set<string>();
  const add = (precision: GeocodePrecision, label: string, nom: boolean, run: () => Promise<Point | null>) => {
    const key = `${precision}|${label}`;
    if (seen.has(key)) return;
    seen.add(key);
    attempts.push({ precision, label, run, nominatim: nom });
  };
  const free = (parts: Array<string | undefined>) => parts.filter(Boolean).join(', ');

  if (street && digits) {
    add('address', 'rua+numero', true, () => nominatim({ street: `${digits} ${street}`, ...base, postalcode: hasRealPostal ? postal : undefined }));
    add('address', 'livre+bairro', true, () => nominatim({ q: free([`${street}, ${digits}`, neighborhood, city, state, 'Brasil']) }));
    if (neighborhood) add('address', 'livre', true, () => nominatim({ q: free([`${street}, ${digits}`, city, state, 'Brasil']) }));
  }
  if (street) {
    add('street', 'rua', true, () => nominatim({ street, ...base }));
    if (neighborhood) add('street', 'rua+bairro', true, () => nominatim({ q: free([street, neighborhood, city, state, 'Brasil']) }));
  }
  if (hasRealPostal) {
    add('postal_code', 'cep-brasilapi', false, () => brasilApiCep(postal));
    add('postal_code', 'cep-nominatim', true, () => nominatim({ postalcode: postal, country: 'Brasil' }));
  }
  if (neighborhood) add('neighborhood', 'bairro', true, () => nominatim({ q: free([neighborhood, city, state, 'Brasil']) }));
  add('city', 'cidade', true, () => nominatim({ city, state, country: 'Brasil' }));

  const started = Date.now();
  for (let i = 0; i < attempts.length; i += 1) {
    const attempt = attempts[i]!;
    const isLast = i === attempts.length - 1;
    // Pouco tempo sobrando: pula direto para a última tentativa (cidade).
    if (!isLast && Date.now() - started > SOFT_DEADLINE_MS) continue;
    try {
      const hit = await attempt.run();
      if (hit) return { ...hit, precision: attempt.precision };
    } catch {
      // Falha de rede nesta tentativa: segue para a próxima, menos precisa.
    }
    const next = attempts[i + 1];
    if (next && attempt.nominatim && next.nominatim) await sleep(1000);
  }
  return null;
}
