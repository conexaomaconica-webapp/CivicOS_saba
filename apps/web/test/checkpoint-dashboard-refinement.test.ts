import { describe, it, expect, vi } from 'vitest';
import { getAdminDashboardMetricsAction } from '../src/lib/admin/admin-dashboard-service';

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      rpc: vi.fn().mockImplementation((fnName: string) => {
        if (fnName === 'get_admin_dashboard_metrics') {
          return Promise.resolve({
            data: {
              companies: { total: 15, published: 12, pending: 4, suspended: 0, draft: 1 },
              subscriptions: { bronze: 2, prata: 8, ouro: 5, founder: 1, total: 15 },
              finance: { monthly_revenue_brl: 2388, annual_revenue_brl: 28656, confirmed_payments_count: 12, pending_payments_count: 2 },
              pendingActions: { pending_approvals_count: 4, pending_payments_count: 2, expiring_contracts_count: 0 },
              growth: { new_companies_30d: 5, new_users_30d: 12 },
              updated_at: new Date().toISOString(),
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    });
  }),
}));

describe('Dashboard Admin Refinement (/admin)', () => {
  it('1. Operational Header & Greeting — Retorna informacoes executivas com data e resumo', async () => {
    const res = await getAdminDashboardMetricsAction();
    expect(res.header.greeting).toBeDefined();
    expect(res.header.adminName).toBe('Administrador Conexão');
    expect(res.header.currentDate).toBeDefined();
    expect(res.header.operationalSummary).toContain('solicitações');
  });

  it('2. Central Precisa da sua Atencao — Retorna os 5 indicadores acionaveis de decisao', async () => {
    const res = await getAdminDashboardMetricsAction();
    expect(res.attentionCenter).toBeDefined();
    expect(res.attentionCenter.pending_approvals).toBe(4);
    expect(res.attentionCenter.pending_payments).toBe(2);
    expect(res.attentionCenter.incomplete_profiles).toBeGreaterThanOrEqual(0);
    expect(res.attentionCenter.lodges_without_coordinates).toBeGreaterThanOrEqual(0);
  });

  it('3. KPIs Essenciais da Operacao — Retorna dados de empresas ativas, aprovacoes, receita BRL', async () => {
    const res = await getAdminDashboardMetricsAction();
    expect(res.kpis.activeCompanies).toBe(12);
    expect(res.kpis.pendingApprovals).toBe(4);
    expect(res.kpis.confirmedMonthlyRevenueBrl).toBe(2388);
    expect(res.kpis.confirmedAnnualRevenueBrl).toBe(28656);
    expect(res.kpis.pedraFundamentalCount).toBe(1);
  });

  it('4. Ultimas Solicitacoes — Retorna lista de empresas recentes com completude e CTA Analisar', async () => {
    const res = await getAdminDashboardMetricsAction();
    expect(res.recentApplications.length).toBeGreaterThan(0);
    const app = res.recentApplications[0]!;
    expect(app.name).toBeDefined();
    expect(app.completeness_percent).toBe(92);
    expect(app.payment_status).toBe('paid');
  });

  it('5. Distribuição por Planos e Panorama Financeiro — Bronze, Prata, Ouro em BRL', async () => {
    const res = await getAdminDashboardMetricsAction();
    expect(res.planDistribution.bronzeCount).toBe(2);
    expect(res.planDistribution.prataCount).toBe(8);
    expect(res.planDistribution.ouroCount).toBe(5);
    expect(res.financeSummary.monthlyRevenueBrl).toBe(2388);
  });

  it('6. Saude Operacional Resumida — Status dos servicos sem transformar em Torre de Controle', async () => {
    const res = await getAdminDashboardMetricsAction();
    expect(res.operationalHealth.asaasStatus).toBe('operational');
    expect(res.operationalHealth.smtpStatus).toBe('operational');
    expect(res.operationalHealth.webhooksStatus).toBe('operational');
  });
});
