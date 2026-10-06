/**
 * Nome do representante legal para contrato e assinatura. Alguns cadastros antigos guardaram um nome genérico no lugar do
 * nome real ("Anunciante Titular"); esse texto nunca deve aparecer como representante: cai para o próximo nome válido.
 */
const PLACEHOLDERS = new Set(['', 'anunciante titular', 'responsavel legal', 'titular', 'representante legal']);

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function isPlaceholderResponsibleName(name: string | null | undefined): boolean {
  return PLACEHOLDERS.has(normalize(String(name ?? '')));
}

/** Primeiro nome real entre os candidatos (cadastro do responsável, perfil do dono, ...); '' se nenhum for válido. */
export function pickResponsibleName(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    if (candidate && !isPlaceholderResponsibleName(candidate)) return candidate.replace(/\s+/g, ' ').trim();
  }
  return '';
}
