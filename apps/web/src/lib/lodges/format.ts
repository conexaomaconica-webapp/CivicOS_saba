/**
 * Horário de reunião para exibição, com a abreviatura "h" no final:
 * "20:00" -> "20h", "19:30" -> "19h30", "20:00:00" -> "20h". Sem horário, devolve null
 * (quem chama simplesmente não mostra nada). Valor fora do padrão é mantido como veio.
 */
export function formatMeetingTime(time?: string | null): string | null {
  const text = (time ?? '').trim();
  if (!text) return null;
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return text;
  const hour = Number(match[1]);
  const minutes = match[2]!;
  return minutes === '00' ? `${hour}h` : `${hour}h${minutes}`;
}

const DAY_LABELS: Record<string, string> = {
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

/**
 * Dia da reunião para exibição. Quando o rótulo guarda a regra de ocorrência
 * ("1ª e 3ª do mês", "última do mês"), ela entra antes do dia: "1ª e 3ª Quinta-feira".
 */
export function formatMeetingDay(day?: string | null, label?: string | null): string | null {
  const raw = (day ?? '').trim();
  if (!raw) return null;
  const base = DAY_LABELS[raw.toLowerCase()] || raw;
  const rule = (label ?? '').match(/^(.+?)\s+do mês$/i)?.[1];
  return rule ? `${rule} ${base}` : base;
}
