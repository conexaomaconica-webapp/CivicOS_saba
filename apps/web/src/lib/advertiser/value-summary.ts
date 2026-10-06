/** Lógica pura do resumo mensal de valor e dos marcos do anunciante (sem acesso a banco). */

export interface PeriodCounters {
  connections: number;
  commercial: number;
  confirmed: number;
  referrals: number;
  views: number;
  shares: number;
}

export interface ValueSummaryRaw {
  month_label: string;
  months_on_platform: number;
  active_benefits: number;
  current: PeriodCounters;
  previous: PeriodCounters;
  lifetime: PeriodCounters;
}

export interface Milestone {
  key: string;
  title: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const THRESHOLDS = {
  views: [100, 500, 1000, 5000],
  referrals: [1, 10, 25, 50],
  connections: [1, 10, 25, 50, 100],
  months: [3, 6, 12, 24],
} as const;

function ordinalPt(n: number) {
  return `${n}ª`;
}

/** Marcos já alcançados (o maior de cada categoria vem por último). */
export function buildMilestones(lifetime: PeriodCounters, monthsOnPlatform: number): Milestone[] {
  const out: Milestone[] = [];
  for (const t of THRESHOLDS.views) {
    if (lifetime.views >= t) out.push({ key: `views-${t}`, title: `Sua empresa atingiu ${t.toLocaleString('pt-BR')} visualizações.` });
  }
  for (const t of THRESHOLDS.referrals) {
    if (lifetime.referrals >= t) out.push({ key: `referrals-${t}`, title: `Você recebeu sua ${ordinalPt(t)} indicação.` });
  }
  for (const t of THRESHOLDS.connections) {
    if (lifetime.connections >= t) out.push({ key: `connections-${t}`, title: `Sua empresa registrou a ${ordinalPt(t)} conexão.` });
  }
  for (const t of THRESHOLDS.months) {
    if (monthsOnPlatform >= t) out.push({ key: `months-${t}`, title: `Parabéns: sua empresa completou ${t} meses na Conexão.` });
  }
  return out;
}

/** Próximo marco ainda não alcançado em conexões (dá meta concreta ao anunciante). */
export function nextConnectionMilestone(lifetime: PeriodCounters): { target: number; remaining: number } | null {
  const target = THRESHOLDS.connections.find((t) => lifetime.connections < t);
  return target ? { target, remaining: target - lifetime.connections } : null;
}

export function monthTitle(monthLabel: string): string {
  const [, month] = monthLabel.split('-');
  const idx = Number(month) - 1;
  return MONTH_NAMES[idx] ?? monthLabel;
}

/** Variação percentual vs mês anterior; null quando não há base de comparação. */
export function growthPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Frases do resumo, em linguagem de resultado (não de métrica). */
export function buildMonthlySummary(raw: ValueSummaryRaw): { headline: string; lines: string[]; opportunity: string | null } {
  const { current: c, previous: p } = raw;
  const lines: string[] = [];

  if (c.connections > 0) {
    const comm = c.commercial > 0 ? `, sendo ${plural(c.commercial, 'relacionada a compra ou serviço', 'relacionadas a compras ou serviços')}` : '';
    lines.push(`Sua empresa teve ${plural(c.connections, 'conexão registrada', 'conexões registradas')}${comm}.`);
    if (c.confirmed > 0) lines.push(`${plural(c.confirmed, 'foi confirmada', 'foram confirmadas')} por você.`);
  } else {
    lines.push('Nenhuma conexão registrada até agora neste mês.');
  }

  if (c.referrals > 0 || c.shares > 0) {
    lines.push(
      `Você recebeu ${plural(c.referrals, 'indicação', 'indicações')} e seu perfil foi compartilhado ${plural(c.shares, 'vez', 'vezes')}.`
    );
  }

  const growth = growthPercent(c.connections + c.referrals, p.connections + p.referrals);
  if (growth !== null) {
    lines.push(
      growth >= 0
        ? `Conexões e indicações cresceram ${growth}% em relação ao mês anterior.`
        : `Conexões e indicações caíram ${Math.abs(growth)}% em relação ao mês anterior.`
    );
  }

  const opportunity =
    raw.active_benefits === 0
      ? 'Você ainda não tem um benefício ativo. Ofertas aproximam a rede e geram novas conexões: cadastre um em Benefícios e Ofertas.'
      : null;

  return { headline: `${monthTitle(raw.month_label)} na Conexão`, lines, opportunity };
}
