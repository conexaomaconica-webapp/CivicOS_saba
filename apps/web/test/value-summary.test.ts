import { describe, expect, it } from 'vitest';
import {
  buildMilestones,
  buildMonthlySummary,
  growthPercent,
  nextConnectionMilestone,
  type PeriodCounters,
  type ValueSummaryRaw,
} from '../src/lib/advertiser/value-summary';

const zero: PeriodCounters = { connections: 0, commercial: 0, confirmed: 0, referrals: 0, views: 0, shares: 0 };

describe('value-summary', () => {
  it('growthPercent não calcula sem base anterior', () => {
    expect(growthPercent(5, 0)).toBeNull();
    expect(growthPercent(12, 10)).toBe(20);
    expect(growthPercent(5, 10)).toBe(-50);
  });

  it('buildMilestones lista só marcos alcançados', () => {
    const none = buildMilestones(zero, 0);
    expect(none).toHaveLength(0);

    const some = buildMilestones({ ...zero, views: 600, referrals: 10, connections: 25 }, 6).map((m) => m.key);
    expect(some).toEqual([
      'views-100', 'views-500',
      'referrals-1', 'referrals-10',
      'connections-1', 'connections-10', 'connections-25',
      'months-3', 'months-6',
    ]);
  });

  it('nextConnectionMilestone aponta a próxima meta', () => {
    expect(nextConnectionMilestone({ ...zero, connections: 12 })).toEqual({ target: 25, remaining: 13 });
    expect(nextConnectionMilestone({ ...zero, connections: 100 })).toBeNull();
  });

  it('buildMonthlySummary usa linguagem de resultado e sugere benefício', () => {
    const raw: ValueSummaryRaw = {
      month_label: '2026-09',
      months_on_platform: 4,
      active_benefits: 0,
      current: { connections: 9, commercial: 5, confirmed: 4, referrals: 7, views: 200, shares: 18 },
      previous: { ...zero, connections: 6, referrals: 4 },
      lifetime: zero,
    };
    const s = buildMonthlySummary(raw);
    expect(s.headline).toBe('Setembro na Conexão');
    expect(s.lines[0]).toContain('9 conexões registradas');
    expect(s.lines.join(' ')).toContain('7 indicações');
    expect(s.lines.join(' ')).toContain('cresceram 60%');
    expect(s.opportunity).toContain('benefício ativo');
  });
});
