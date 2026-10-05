import { describe, it, expect } from 'vitest';
import {
  normalizeLodgeImportRow,
  normalizeMeetingTime,
  normalizeWeekday,
  suggestColumnMapping,
  slugifyLodge,
} from '@/lib/admin/lodge-import-validation';

describe('normalizeLodgeImportRow', () => {
  it('exige o nome', () => {
    expect(normalizeLodgeImportRow({ name: '  ' }).errors).toContain('Nome da loja é obrigatório');
  });

  it('aceita coordenadas com vírgula decimal', () => {
    const { values, warnings } = normalizeLodgeImportRow({ name: 'L', latitude: '-12,9714', longitude: '-38,5014' });
    expect(values.latitude).toBeCloseTo(-12.9714);
    expect(values.longitude).toBeCloseTo(-38.5014);
    expect(warnings).toHaveLength(0);
  });

  it('separa coordenadas de uma coluna única', () => {
    const { values } = normalizeLodgeImportRow({ name: 'L', coordinates: '-12.9714, -38.5014' });
    expect(values.latitude).toBeCloseTo(-12.9714);
    expect(values.longitude).toBeCloseTo(-38.5014);
  });

  it('corrige latitude/longitude invertidas', () => {
    const { values, warnings } = normalizeLodgeImportRow({ name: 'L', latitude: -38.5, longitude: -12.9 });
    expect(values.latitude).toBe(-12.9);
    expect(values.longitude).toBe(-38.5);
    expect(warnings.some((w) => w.includes('invertidas'))).toBe(true);
  });

  it('descarta coordenadas fora do intervalo válido', () => {
    const { values, warnings } = normalizeLodgeImportRow({ name: 'L', latitude: '120', longitude: '-38' });
    expect(values.latitude).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('avisa quando só uma coordenada é informada', () => {
    const { values, warnings } = normalizeLodgeImportRow({ name: 'L', latitude: '-12.9' });
    expect(values.latitude).toBeNull();
    expect(warnings.length).toBe(1);
  });

  it('normaliza UF por nome e descarta inválida', () => {
    expect(normalizeLodgeImportRow({ name: 'L', state: 'Bahia' }).values.state).toBe('BA');
    expect(normalizeLodgeImportRow({ name: 'L', state: 'sp' }).values.state).toBe('SP');
    const bad = normalizeLodgeImportRow({ name: 'L', state: 'XX' });
    expect(bad.values.state).toBe('');
    expect(bad.warnings.length).toBe(1);
  });

  it('formata CEP e recupera zero à esquerda perdido pelo Excel', () => {
    expect(normalizeLodgeImportRow({ name: 'L', cep: '44000000' }).values.cep).toBe('44000-000');
    expect(normalizeLodgeImportRow({ name: 'L', cep: 4000000 }).values.cep).toBe('04000-000');
    expect(normalizeLodgeImportRow({ name: 'L', cep: '123' }).values.cep).toBe('');
  });

  it('valida e-mail, site e instagram', () => {
    const { values, warnings } = normalizeLodgeImportRow({
      name: 'L',
      email: 'ABC@Loja.org.br',
      website: 'lojaa.org.br',
      instagram: 'https://instagram.com/lojaa_oficial/',
    });
    expect(values.email).toBe('abc@loja.org.br');
    expect(values.website).toBe('https://lojaa.org.br');
    expect(values.instagram).toBe('@lojaa_oficial');
    expect(warnings).toHaveLength(0);
    expect(normalizeLodgeImportRow({ name: 'L', email: 'sem-arroba' }).values.email).toBe('');
  });

  it('valida telefone com DDD', () => {
    expect(normalizeLodgeImportRow({ name: 'L', phone: '(75) 99999-8888' }).values.phone).toBe('(75) 99999-8888');
    expect(normalizeLodgeImportRow({ name: 'L', phone: '9999' }).values.phone).toBe('');
  });

  it('horário sem dia fica em branco, sem aviso', () => {
    const { values, warnings } = normalizeLodgeImportRow({ name: 'L', meeting_time: '20:00' });
    expect(values.meeting_time).toBe('');
    expect(warnings).toHaveLength(0);
  });

  it('converte data de fundação (BR, ISO e serial do Excel)', () => {
    expect(normalizeLodgeImportRow({ name: 'L', foundation_date: '15/03/1985' }).values.foundation_date).toBe('1985-03-15');
    expect(normalizeLodgeImportRow({ name: 'L', foundation_date: '1985-03-15' }).values.foundation_date).toBe('1985-03-15');
    expect(normalizeLodgeImportRow({ name: 'L', foundation_date: 31121 }).values.foundation_date).toBe('1985-03-15');
    expect(normalizeLodgeImportRow({ name: 'L', foundation_date: '31/02/1985' }).values.foundation_date).toBe('');
    // Serial do Excel com parte decimal (hora do dia), como vem de células de data/hora.
    expect(normalizeLodgeImportRow({ name: 'L', foundation_date: '35856.9999537037' }).values.foundation_date).toBe('1998-03-02');
    expect(normalizeLodgeImportRow({ name: 'L', foundation_date: 35856.9999537037 }).values.foundation_date).toBe('1998-03-02');
  });

  it('potência em branco fica em branco (sem valor padrão) e número inválido gera aviso', () => {
    const { values, warnings } = normalizeLodgeImportRow({ name: 'L', code_number: 'abc' });
    expect(values.potency).toBe('');
    expect(values.code_number).toBeNull();
    expect(warnings.length).toBe(1);
    expect(normalizeLodgeImportRow({ name: 'L', code_number: 'Nº 123' }).values.code_number).toBe(123);
  });
});

describe('normalizeWeekday / normalizeMeetingTime', () => {
  it('reconhece variações de dia', () => {
    expect(normalizeWeekday('Quarta-feira')).toBe('quarta');
    expect(normalizeWeekday('TERÇA')).toBe('terca');
    expect(normalizeWeekday('sáb')).toBe('sabado');
    expect(normalizeWeekday('5ª feira')).toBe('quinta');
    expect(normalizeWeekday('feriado')).toBeNull();
  });

  it('reconhece variações de horário', () => {
    expect(normalizeMeetingTime('20:00')).toBe('20:00');
    expect(normalizeMeetingTime('20h')).toBe('20:00');
    expect(normalizeMeetingTime('19h30')).toBe('19:30');
    expect(normalizeMeetingTime('8:30 pm')).toBe('20:30');
    expect(normalizeMeetingTime('0.8333333')).toBe('20:00');
    expect(normalizeMeetingTime('25:00')).toBeNull();
    expect(normalizeMeetingTime('noite')).toBeNull();
  });
});

describe('suggestColumnMapping', () => {
  it('mapeia colunas com nomes variados, sem reutilizar a mesma coluna', () => {
    const map = suggestColumnMapping([
      'Nome da Loja', 'Nº', 'Potência', 'Venerável Mestre', 'Horário', 'Dia da Semana', 'Latitude', 'Longitude', 'Cidade', 'UF',
    ]);
    expect(map.name).toBe('Nome da Loja');
    expect(map.worshipful_master_name).toBe('Venerável Mestre');
    expect(map.meeting_time).toBe('Horário');
    expect(map.meeting_day).toBe('Dia da Semana');
    expect(map.latitude).toBe('Latitude');
    expect(map.longitude).toBe('Longitude');
    expect(map.state).toBe('UF');
    expect(new Set(Object.values(map)).size).toBe(Object.values(map).length);
  });
});

describe('slugifyLodge', () => {
  it('remove acentos', () => {
    expect(slugifyLodge('Esperança da Pátria', 999)).toBe('esperanca-da-patria-999');
  });
});

import { parseMeetingSchedule, formatWeeksText } from '@/lib/admin/lodge-import-validation';

describe('parseMeetingSchedule (regra de reunião em texto livre)', () => {
  it('1ª e 3ª Quintas Feiras', () => {
    expect(parseMeetingSchedule('1ª e 3ª Quintas Feiras').meetings).toEqual([{ day: 'quinta', weeks: [1, 3] }]);
  });

  it('variações de escrita', () => {
    expect(parseMeetingSchedule('1º e 3º quinta-feira do mês').meetings).toEqual([{ day: 'quinta', weeks: [1, 3] }]);
    expect(parseMeetingSchedule('primeira e terceira quarta').meetings).toEqual([{ day: 'quarta', weeks: [1, 3] }]);
    expect(parseMeetingSchedule('2ª sexta').meetings).toEqual([{ day: 'sexta', weeks: [2] }]);
    expect(parseMeetingSchedule('última sexta-feira').meetings).toEqual([{ day: 'sexta', weeks: [-1] }]);
    expect(parseMeetingSchedule('quinta, 1ª e 3ª').meetings).toEqual([{ day: 'quinta', weeks: [1, 3] }]);
  });

  it('vários dias, com e sem semana', () => {
    expect(parseMeetingSchedule('Segundas e quintas').meetings).toEqual([
      { day: 'segunda', weeks: [] },
      { day: 'quinta', weeks: [] },
    ]);
    expect(parseMeetingSchedule('1ª e 3ª quintas e 2ª sábado').meetings).toEqual([
      { day: 'quinta', weeks: [1, 3] },
      { day: 'sabado', weeks: [2] },
    ]);
  });

  it('"segunda" continua sendo dia, não ordinal', () => {
    expect(parseMeetingSchedule('segunda e quarta').meetings).toEqual([
      { day: 'segunda', weeks: [] },
      { day: 'quarta', weeks: [] },
    ]);
  });

  it('extrai horário embutido na frase', () => {
    const r = parseMeetingSchedule('Quintas às 20h30');
    expect(r.meetings).toEqual([{ day: 'quinta', weeks: [] }]);
    expect(r.time).toBe('20:30');
    expect(parseMeetingSchedule('1ª e 3ª quartas 19:00').time).toBe('19:00');
  });

  it('texto sem dia não gera reunião', () => {
    expect(parseMeetingSchedule('a combinar').meetings).toEqual([]);
  });

  it('formata as semanas', () => {
    expect(formatWeeksText([1, 3])).toBe('1ª e 3ª');
    expect(formatWeeksText([1, 2, 3])).toBe('1ª, 2ª e 3ª');
    expect(formatWeeksText([-1])).toBe('última');
  });

  it('a linha da planilha com regra deixa de gerar aviso e preenche o horário', () => {
    const { values, warnings } = normalizeLodgeImportRow({ name: 'L', meeting_day: '1ª e 3ª Quintas Feiras', meeting_time: '20:00' });
    expect(warnings).toHaveLength(0);
    expect(values.meetings).toEqual([{ day: 'quinta', weeks: [1, 3] }]);
    expect(values.meeting_day).toBe('quinta');
    expect(values.meeting_time).toBe('20:00');
  });
});
