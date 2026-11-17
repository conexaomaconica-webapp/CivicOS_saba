/**
 * Virada da página inicial (24/11/2026): o Guia passa a ser a página principal "/", a landing atual vai para "/institucional"
 * e "/guia" redireciona (308) para "/".
 *
 * Interruptor lido NO SERVIDOR, a cada requisição, a partir de variáveis de ambiente (não são NEXT_PUBLIC):
 *
 *   HOME_SWITCH_MODE   off (padrão) | on | scheduled
 *   HOME_SWITCH_AT     instante da virada para o modo scheduled, ISO 8601 COM fuso. Ex.: 2026-11-24T10:00:00-03:00
 *
 *  - off:       comportamento de hoje (landing em "/", Guia em "/guia"). É o padrão: nada muda até alguém ligar.
 *  - on:        virada ativa imediatamente.
 *  - scheduled: a virada acontece sozinha quando o relógio do servidor passa de HOME_SWITCH_AT. Não há tarefa agendada nem
 *               pessoa envolvida: a cada requisição o código compara o horário atual com o instante configurado.
 *
 * FALHA FECHADA: qualquer valor inválido (modo desconhecido, data sem fuso, data ilegível) mantém a virada DESLIGADA.
 * A data exige fuso explícito (Z ou ±hh:mm) porque o servidor roda em UTC e "10h" sem fuso seria ambíguo.
 */

export type HomeSwitchMode = 'off' | 'on' | 'scheduled';

/** Variáveis lidas: HOME_SWITCH_MODE e HOME_SWITCH_AT (aceita process.env diretamente). */
export type HomeSwitchEnv = Record<string, string | undefined>;

/** Valor de referência da virada oficial (10h de Brasília em 24/11/2026). Não é aplicado por padrão. */
export const HOME_SWITCH_OFFICIAL_AT = '2026-11-24T10:00:00-03:00';

export function parseHomeSwitchMode(raw: string | null | undefined): HomeSwitchMode {
  const value = String(raw ?? '').trim().toLowerCase();
  return value === 'on' || value === 'scheduled' ? value : 'off';
}

const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/** Instante (ms) a partir de uma data ISO COM fuso; null se ausente, sem fuso ou inválida. */
export function parseHomeSwitchInstant(raw: string | null | undefined): number | null {
  const value = String(raw ?? '').trim();
  if (!ISO_WITH_ZONE.test(value)) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** A virada está ativa agora? */
export function isHomeSwitchActive(env: HomeSwitchEnv = process.env, now: number = Date.now()): boolean {
  const mode = parseHomeSwitchMode(env.HOME_SWITCH_MODE);
  if (mode === 'on') return true;
  if (mode === 'scheduled') {
    const at = parseHomeSwitchInstant(env.HOME_SWITCH_AT);
    return at !== null && now >= at;
  }
  return false;
}

/** Caminho público da página inicial do Guia: "/" depois da virada, "/guia" antes. */
export function guiaHomePath(active: boolean): '/' | '/guia' {
  return active ? '/' : '/guia';
}

/** Este caminho é a página inicial do Guia? ("/guia" sempre; "/" só depois da virada.) */
export function isGuiaHomePathname(pathname: string | null | undefined, active: boolean): boolean {
  if (!pathname) return false;
  if (pathname === '/guia' || pathname === '/guia/') return true;
  return active && pathname === '/';
}

/** Este caminho é a landing institucional? ("/" antes da virada; "/institucional" depois; "/teste-landing" sempre.) */
export function isLandingPathname(pathname: string | null | undefined, active: boolean): boolean {
  if (!pathname) return false;
  if (pathname === '/teste-landing') return true;
  if (active) return pathname === '/institucional';
  return pathname === '/';
}

/** Diagnóstico para testes e relatórios (não exposto publicamente). */
export function describeHomeSwitch(env: HomeSwitchEnv = process.env, now: number = Date.now()) {
  const mode = parseHomeSwitchMode(env.HOME_SWITCH_MODE);
  const at = parseHomeSwitchInstant(env.HOME_SWITCH_AT);
  return {
    mode,
    at: at === null ? null : new Date(at).toISOString(),
    active: isHomeSwitchActive(env, now),
    configuredAtValid: at !== null,
    msUntilActivation: mode === 'scheduled' && at !== null && now < at ? at - now : 0,
  };
}

/** Endereço de destino do redirecionamento de /guia: "/" mantendo todos os filtros (?q=, ?cidade=, ?cat=...). */
export function homeRedirectTarget(searchParams: Record<string, string | string[] | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.append(key, value);
  }
  const text = query.toString();
  return text ? `/?${text}` : '/';
}
