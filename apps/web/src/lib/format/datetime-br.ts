/**
 * Datas e horas em pt-BR com fuso FIXO (America/Sao_Paulo).
 * Componentes de cliente renderizam primeiro no servidor (UTC) e depois no navegador (fuso de quem acessa); formatar sem
 * fuso fixo gera textos diferentes e o erro de hidratação do React (#418).
 */
export const SAO_PAULO_TZ = 'America/Sao_Paulo';

export function formatDateBR(
  value: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { timeZone: SAO_PAULO_TZ, ...options });
  } catch {
    return '';
  }
}

export function formatDateTimeBR(
  value: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', { timeZone: SAO_PAULO_TZ, ...options });
  } catch {
    return '';
  }
}
