/**
 * Datas e horas em pt-BR com fuso FIXO (America/Sao_Paulo).
 * Componentes de cliente renderizam primeiro no servidor (UTC) e depois no navegador (fuso de quem acessa); formatar sem
 * fuso fixo gera textos diferentes e o erro de hidratação do React (#418).
 */
const TZ = 'America/Sao_Paulo';

export function formatDateBR(value: string | number | Date | null | undefined): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('pt-BR', { timeZone: TZ });
}

export function formatDateTimeBR(value: string | number | Date | null | undefined): string {
  if (!value) return '';
  return new Date(value).toLocaleString('pt-BR', { timeZone: TZ });
}
