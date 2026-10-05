/** Id aleatório e anônimo do navegador, usado só para contar uma indicação por pessoa. Não identifica ninguém. */
const VISITOR_COOKIE = 'cm_vid';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function ensureVisitorKey(): string {
  try {
    const existing = readCookie(VISITOR_COOKIE);
    if (existing && existing.length >= 16 && existing.length <= 64) return existing;

    const created = (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`).replace(/[^a-zA-Z0-9-]/g, '');
    document.cookie = `${VISITOR_COOKIE}=${encodeURIComponent(created)}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    return created;
  } catch {
    return '';
  }
}
