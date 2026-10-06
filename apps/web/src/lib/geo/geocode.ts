
/**
 * Localização de endereços brasileiros (Nominatim / OpenStreetMap), com queda gradual de precisão:
 * endereço com número -> endereço livre -> rua -> CEP -> cidade/estado.
 * O resultado diz qual precisão foi obtida, para a tela avisar quando for aproximada.
 * Política do Nominatim: identificação própria e no máximo 1 requisição por segundo (há pausa entre tentativas).
 */

export type GeocodePrecision = 'address' | 'street' | 'postal_code' | 'city' | 'manual';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  precision: GeocodePrecision;
}

export interface GeocodeInput {
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
  postal_code: 'CEP (aproximado)',
  city: 'cidade (aproximado)',
  manual: 'informada manualmente',
};

const USER_AGENT = 'ConexaoMaconica-Geocoder/1.0 (+https://conexaomaconica.com.br)';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Limites aproximados do Brasil: protege contra coordenadas digitadas fora do país. */
export function isValidBrazilianCoordinate(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === 'number' && typeof longitude === 'number' &&
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -34 && latitude <= 6 && longitude >= -75 && longitude <= -28
  );
}

async function query(params: Record<string, string | undefined>): Promise<{ latitude: number; longitude: number } | null> {
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

export async function geocodeBrazilianAddress(input: GeocodeInput): Promise<GeocodeResult | null> {
  const city = input.city?.trim();
  const state = input.state?.trim();
  if (!city || !state) return null;

  const street = input.street?.trim() || '';
  const digits = String(input.number ?? '').match(/\d+/)?.[0] ?? '';
  const postal = input.postalCode?.trim() || '';
  const hasRealPostal = Boolean(postal) && !/^0{5}-?0{3}$/.test(postal);

  const attempts: Array<{ precision: GeocodePrecision; params: Record<string, string | undefined> }> = [];
  if (street && digits) {
    attempts.push({ precision: 'address', params: { street: `${digits} ${street}`, city, state, country: 'Brasil', postalcode: hasRealPostal ? postal : undefined } });
  }
  if (street) {
    attempts.push({ precision: 'address', params: { q: [street, input.neighborhood, city, state, 'Brasil'].filter(Boolean).join(', ') } });
    attempts.push({ precision: 'street', params: { street, city, state, country: 'Brasil' } });
  }
  if (hasRealPostal) attempts.push({ precision: 'postal_code', params: { postalcode: postal, country: 'Brasil' } });
  attempts.push({ precision: 'city', params: { city, state, country: 'Brasil' } });

  for (let i = 0; i < attempts.length; i += 1) {
    const attempt = attempts[i]!;
    try {
      const hit = await query(attempt.params);
      if (hit) return { ...hit, precision: attempt.precision };
    } catch {
      // Falha de rede nesta tentativa: segue para a próxima, menos precisa.
    }
    if (i < attempts.length - 1) await sleep(1100);
  }
  return null;
}
