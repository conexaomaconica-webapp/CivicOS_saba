/**
 * Fila de análise das empresas: quem ainda precisa de atenção da equipe antes de ir ao ar.
 * Uma única definição para o painel (/admin) e para a Central de Aprovações (/admin/aprovacoes), para os números baterem.
 *
 * Fora da fila: empresas já publicadas, rejeitadas ou suspensas (decisão final). Dentro: rascunho, em análise e correção
 * solicitada. Um cadastro cujo funil comercial já está "publicado" também sai da fila.
 */
const FINAL_PUBLICATION_STATUSES = ['published', 'rejected', 'suspended'];

export function isInApprovalQueue(
  publicationStatus: string | null | undefined,
  commercialStatus?: string | null,
): boolean {
  const publication = publicationStatus || 'draft';
  if (publication === 'pending_review') return true;
  return commercialStatus !== 'publicado' && !FINAL_PUBLICATION_STATUSES.includes(publication);
}
