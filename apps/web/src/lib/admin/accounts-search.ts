/**
 * Termo de busca da tela de contas, saneado para uso em filtros ilike do PostgREST.
 * Remove os coringas (% _), separadores de filtro (, ( ) * ") e barras invertidas, junta espaços e limita o tamanho.
 * Termos com menos de 2 caracteres não buscam (devolve vazio = lista normal).
 */
export function sanitizeAccountSearchTerm(raw: string | null | undefined): string {
  const cleaned = String(raw ?? '')
    .replace(/[%_,()*"\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned.length >= 2 ? cleaned : '';
}
