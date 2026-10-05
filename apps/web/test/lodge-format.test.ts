import { describe, it, expect } from 'vitest';
import { formatMeetingTime } from '@/lib/lodges/format';

describe('formatMeetingTime', () => {
  it('abrevia com "h" no final', () => {
    expect(formatMeetingTime('20:00')).toBe('20h');
    expect(formatMeetingTime('19:30')).toBe('19h30');
    expect(formatMeetingTime('08:05')).toBe('8h05');
    expect(formatMeetingTime('20:00:00')).toBe('20h');
  });

  it('sem horário devolve null', () => {
    expect(formatMeetingTime(null)).toBeNull();
    expect(formatMeetingTime(undefined)).toBeNull();
    expect(formatMeetingTime('  ')).toBeNull();
  });

  it('mantém valor fora do padrão', () => {
    expect(formatMeetingTime('às 20 horas')).toBe('às 20 horas');
  });
});

import { formatMeetingDay } from '@/lib/lodges/format';

describe('formatMeetingDay', () => {
  it('dia simples e com regra de ocorrência no rótulo', () => {
    expect(formatMeetingDay('quinta', 'Sessão Ordinária')).toBe('Quinta-feira');
    expect(formatMeetingDay('quinta', '1ª e 3ª do mês')).toBe('1ª e 3ª Quinta-feira');
    expect(formatMeetingDay('sexta', 'última do mês')).toBe('última Sexta-feira');
    expect(formatMeetingDay('sabado')).toBe('Sábado');
    expect(formatMeetingDay(null)).toBeNull();
  });
});
