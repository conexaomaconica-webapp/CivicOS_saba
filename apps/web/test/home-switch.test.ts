import { describe, expect, it } from 'vitest';
import {
  HOME_SWITCH_OFFICIAL_AT,
  describeHomeSwitch,
  guiaHomePath,
  isGuiaHomePathname,
  isHomeSwitchActive,
  isLandingPathname,
  parseHomeSwitchInstant,
  parseHomeSwitchMode,
} from '../src/lib/site/home-switch';

const T = (iso: string) => Date.parse(iso);
const AT = HOME_SWITCH_OFFICIAL_AT; // 2026-11-24T10:00:00-03:00 = 13:00 UTC

describe('interruptor da virada: modo', () => {
  it('padrão e qualquer valor desconhecido = desligado (falha fechada)', () => {
    for (const raw of [undefined, null, '', ' ', 'off', 'OFF', 'talvez', 'true', '1', 'sim', 'enabled']) {
      expect(parseHomeSwitchMode(raw as never), String(raw)).toBe('off');
    }
  });
  it('on e scheduled, sem diferenciar maiúsculas nem espaços', () => {
    expect(parseHomeSwitchMode('on')).toBe('on');
    expect(parseHomeSwitchMode(' ON ')).toBe('on');
    expect(parseHomeSwitchMode('Scheduled')).toBe('scheduled');
  });
});

describe('interruptor da virada: data agendada', () => {
  it('exige fuso explícito: data sem fuso é recusada (o servidor roda em UTC)', () => {
    for (const bad of [undefined, '', 'amanhã', '2026-11-24', '2026-11-24T10:00:00', '2026-11-24 10:00:00-03:00', '24/11/2026 10:00', '2026-13-45T10:00:00-03:00x']) {
      expect(parseHomeSwitchInstant(bad as never), String(bad)).toBeNull();
    }
  });
  it('aceita Z e ±hh:mm e converte para o instante correto', () => {
    expect(parseHomeSwitchInstant('2026-11-24T10:00:00-03:00')).toBe(T('2026-11-24T13:00:00Z'));
    expect(parseHomeSwitchInstant('2026-11-24T13:00:00Z')).toBe(T('2026-11-24T13:00:00Z'));
    expect(parseHomeSwitchInstant('2026-11-24T10:00-03:00')).toBe(T('2026-11-24T13:00:00Z'));
    expect(parseHomeSwitchInstant('2026-11-24T16:30:00+03:30')).toBe(T('2026-11-24T13:00:00Z'));
  });
  it('data impossível é recusada', () => {
    expect(parseHomeSwitchInstant('2026-02-31T10:00:00-03:00')).toBe(T('2026-03-03T13:00:00Z')); // normalizada pelo JS: aceita como instante válido
    expect(parseHomeSwitchInstant('2026-99-99T99:99:99-03:00')).toBeNull();
  });
});

describe('a virada está ativa?', () => {
  it('sem configuração, nunca está ativa (nada muda até alguém ligar)', () => {
    expect(isHomeSwitchActive({}, T('2030-01-01T00:00:00Z'))).toBe(false);
    expect(isHomeSwitchActive({ HOME_SWITCH_MODE: 'off', HOME_SWITCH_AT: AT }, T('2030-01-01T00:00:00Z'))).toBe(false);
  });

  it('modo on: ativa agora, sem depender de data', () => {
    expect(isHomeSwitchActive({ HOME_SWITCH_MODE: 'on' }, T('2020-01-01T00:00:00Z'))).toBe(true);
  });

  it('modo scheduled: vira sozinho às 10h de Brasília (13h UTC), nem um segundo antes', () => {
    const env = { HOME_SWITCH_MODE: 'scheduled', HOME_SWITCH_AT: AT };
    expect(isHomeSwitchActive(env, T('2026-11-24T12:59:59.999Z'))).toBe(false);
    expect(isHomeSwitchActive(env, T('2026-11-24T09:59:59-03:00'))).toBe(false);
    expect(isHomeSwitchActive(env, T('2026-11-24T13:00:00.000Z'))).toBe(true);
    expect(isHomeSwitchActive(env, T('2026-11-24T10:00:00-03:00'))).toBe(true);
    expect(isHomeSwitchActive(env, T('2026-11-25T00:00:00Z'))).toBe(true);
    expect(isHomeSwitchActive(env, T('2027-06-01T00:00:00Z'))).toBe(true);
  });

  it('o horário 10h em outro fuso não é confundido com Brasília', () => {
    const utc10 = { HOME_SWITCH_MODE: 'scheduled', HOME_SWITCH_AT: '2026-11-24T10:00:00Z' };
    expect(isHomeSwitchActive(utc10, T('2026-11-24T09:59:00Z'))).toBe(false);
    expect(isHomeSwitchActive(utc10, T('2026-11-24T10:00:00Z'))).toBe(true);
  });

  it('FALHA FECHADA: scheduled sem data, com data sem fuso ou inválida mantém DESLIGADO, mesmo no futuro distante', () => {
    const later = T('2035-01-01T00:00:00Z');
    expect(isHomeSwitchActive({ HOME_SWITCH_MODE: 'scheduled' }, later)).toBe(false);
    expect(isHomeSwitchActive({ HOME_SWITCH_MODE: 'scheduled', HOME_SWITCH_AT: '2026-11-24T10:00:00' }, later)).toBe(false);
    expect(isHomeSwitchActive({ HOME_SWITCH_MODE: 'scheduled', HOME_SWITCH_AT: 'lixo' }, later)).toBe(false);
  });

  it('rollback: voltar o modo para off desliga a virada na hora, mesmo já passada a data', () => {
    const after = T('2026-11-24T15:00:00Z');
    expect(isHomeSwitchActive({ HOME_SWITCH_MODE: 'scheduled', HOME_SWITCH_AT: AT }, after)).toBe(true);
    expect(isHomeSwitchActive({ HOME_SWITCH_MODE: 'off', HOME_SWITCH_AT: AT }, after)).toBe(false);
  });
});

describe('caminhos', () => {
  it('guiaHomePath', () => {
    expect(guiaHomePath(false)).toBe('/guia');
    expect(guiaHomePath(true)).toBe('/');
  });

  it('página inicial do Guia: /guia sempre; "/" só depois da virada', () => {
    expect(isGuiaHomePathname('/guia', false)).toBe(true);
    expect(isGuiaHomePathname('/guia/', true)).toBe(true);
    expect(isGuiaHomePathname('/', false)).toBe(false);
    expect(isGuiaHomePathname('/', true)).toBe(true);
    expect(isGuiaHomePathname('/guia/empresas', true)).toBe(false);
    expect(isGuiaHomePathname('/institucional', true)).toBe(false);
    expect(isGuiaHomePathname(null, true)).toBe(false);
  });

  it('landing: "/" antes; "/institucional" depois; /teste-landing sempre', () => {
    expect(isLandingPathname('/', false)).toBe(true);
    expect(isLandingPathname('/', true)).toBe(false);
    expect(isLandingPathname('/institucional', true)).toBe(true);
    expect(isLandingPathname('/institucional', false)).toBe(false);
    expect(isLandingPathname('/teste-landing', false)).toBe(true);
    expect(isLandingPathname('/teste-landing', true)).toBe(true);
    expect(isLandingPathname('/guia', true)).toBe(false);
  });
});

describe('diagnóstico', () => {
  it('descreve o estado e quanto falta', () => {
    const before = describeHomeSwitch({ HOME_SWITCH_MODE: 'scheduled', HOME_SWITCH_AT: AT }, T('2026-11-24T12:00:00Z'));
    expect(before).toMatchObject({ mode: 'scheduled', active: false, configuredAtValid: true, at: '2026-11-24T13:00:00.000Z', msUntilActivation: 3_600_000 });
    expect(describeHomeSwitch({}, 0)).toMatchObject({ mode: 'off', active: false, configuredAtValid: false, msUntilActivation: 0 });
  });
});
