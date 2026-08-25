import { describe, it, expect } from 'vitest';
import { getAdminDashboardMetricsAction } from '../src/lib/admin/admin-dashboard-service';

describe('ADMIN CM — CHECKPOINT 2: Dashboard Administrativo Operacional', () => {
  it('1. Carrega DTO consolidado do Dashboard com dados reais do servidor', async () => {
    const metrics = await getAdminDashboardMetricsAction();

    expect(metrics).toBeDefined();
    expect(metrics.companies).toBeDefined();
    expect(metrics.subscriptions).toBeDefined();
    expect(metrics.finance).toBeDefined();
    expect(metrics.pendingActions).toBeDefined();
    expect(metrics.growth).toBeDefined();
  });

  it('2. Trata graciosamente estado de banco vazio com zeros sem estourar exceção', async () => {
    const metrics = await getAdminDashboardMetricsAction();

    expect(metrics.companies.total).toBeGreaterThanOrEqual(0);
    expect(metrics.subscriptions.bronze).toBeGreaterThanOrEqual(0);
    expect(metrics.finance.monthly_revenue_brl).toBeGreaterThanOrEqual(0);
    expect(metrics.pendingActions.pending_approvals_count).toBeGreaterThanOrEqual(0);
  });
});
