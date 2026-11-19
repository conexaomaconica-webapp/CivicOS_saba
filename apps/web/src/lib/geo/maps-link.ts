import { isValidBrazilianCoordinate } from './geocode';

/**
 * Coordenadas coladas pelo administrador: um par "lat, lng" ou um link do Google Maps.
 * Módulo puro (sem rede), usado na tela e no servidor. Só devolve pontos dentro do Brasil.
 */

export type Point = { latitude: number; longitude: number };

const NUMBER = '-?\\d{1,3}(?:[.,]\\d+)?';

function toNumber(value: string): number {
  return Number(value.replace(',', '.'));
}

function valid(latitude: number, longitude: number): Point | null {
  return isValidBrazilianCoordinate(latitude, longitude) ? { latitude, longitude } : null;
}

/** Lê "-12.25, -38.95", "-12.25 -38.95" ou "-12,25; -38,95" (vírgula decimal aceita quando há ponto e vírgula ou espaço entre eles). */
function parsePair(text: string): Point | null {
  const clean = text.trim();
  // "lat, lng" com ponto decimal
  let m = clean.match(new RegExp(`^(${NUMBER.replace('[.,]', '\\.')})\\s*[,;]\\s*(${NUMBER.replace('[.,]', '\\.')})$`));
  if (m) return valid(Number(m[1]), Number(m[2]));
  // "lat lng" ou "lat; lng" (aceita vírgula decimal)
  m = clean.match(new RegExp(`^(${NUMBER})\\s*[;\\s]\\s*(${NUMBER})$`));
  if (m) return valid(toNumber(m[1]!), toNumber(m[2]!));
  return null;
}

/** Procura as coordenadas dentro de um endereço do Google Maps (@lat,lng, !3d..!4d.., q=, ll=, query=, center=). */
function parseGoogleUrl(raw: string): Point | null {
  let text = raw;
  try { text = decodeURIComponent(raw); } catch { /* usa o texto original */ }
  const patterns = [
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /[?&](?:q|ll|query|center|destination)=(-?\d{1,3}\.\d+)[,+ ]+(-?\d{1,3}\.\d+)/,
    /\/place\/(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      const point = valid(Number(m[1]), Number(m[2]));
      if (point) return point;
    }
  }
  return null;
}

export function parseCoordinatesText(text: string | null | undefined): Point | null {
  const value = String(text ?? '').trim();
  if (!value) return null;
  return parsePair(value) ?? (/google\.|goo\.gl/i.test(value) ? parseGoogleUrl(value) : null);
}

const ALLOWED_HOSTS = [
  'maps.app.goo.gl', 'goo.gl', 'google.com', 'www.google.com', 'maps.google.com', 'google.com.br', 'www.google.com.br', 'maps.google.com.br',
];

/** Só links https de hosts do Google Maps podem ser seguidos pelo servidor (evita usar o servidor para acessar endereços internos). */
export function isAllowedMapsLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_HOSTS.includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export { parseGoogleUrl };
