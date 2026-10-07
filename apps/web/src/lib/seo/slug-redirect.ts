/**
 * Endereço com maiúsculas (ex.: /guia/OpticaCirculo) é a mesma página da forma minúscula. O redirect permanente
 * preserva a query string (utm_source, utm_medium...): sem isso, a campanha perderia a atribuição e a origem da visita.
 * Devolve null quando o slug já está em minúsculas (não há o que redirecionar).
 */
export function buildLowercaseSlugRedirect(
  slug: string,
  searchParams?: Record<string, string | string[] | undefined> | null
): string | null {
  const lower = slug.toLowerCase();
  if (slug === lower) return null;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(key, item);
    }
  }
  const qs = query.toString();
  return `/guia/${lower}${qs ? `?${qs}` : ''}`;
}
