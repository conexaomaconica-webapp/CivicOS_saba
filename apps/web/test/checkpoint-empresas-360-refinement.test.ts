import { describe, it, expect, vi } from 'vitest';
import {
  getAdminBusinessesListAction,
  getAdminBusiness360Action,
  togglePublicationStatusAction,
  toggleRecognitionAction,
} from '../src/lib/admin/admin-businesses-service';

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [
                {
                  id: '00000000-0000-0000-0000-000000000001',
                  tenant_id: '00000000-0000-0000-0000-000000000010',
                  name: 'Comandos - Terceirização e Segurança Eletrônica',
                  category: 'Segurança Eletrônica & Terceirização',
                  publication_status: 'published',
                  plan_code: 'ouro',
                  is_founder: true,
                  is_pedra_fundamental: true,
                  is_coluna_honra: true,
                },
              ],
              count: 1,
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: '00000000-0000-0000-0000-000000000001',
                tenant_id: '00000000-0000-0000-0000-000000000010',
                name: 'Comandos - Terceirização e Segurança Eletrônica',
                category: 'Segurança Eletrônica & Terceirização',
                publication_status: 'published',
                plan_code: 'ouro',
                is_founder: true,
                is_pedra_fundamental: true,
                is_coluna_honra: true,
              },
              error: null,
            }),
          };
        }
        if (table === 'admin_audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    });
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Gestão de Carteira e Prontuário 360º de Empresas (/admin/empresas)', () => {
  it('1. Visão de Carteira com buscas, contadores de chips e KPIs superiores', async () => {
    const res = await getAdminBusinessesListAction({ query: 'Comandos' });
    expect(res.items).toBeDefined();
    expect(res.kpis.published).toBeGreaterThanOrEqual(1);
    expect(res.counts.todas).toBeGreaterThanOrEqual(1);
  });

  it('2. Topo Executivo do Prontuário 360º com cotas e analytics 30d', async () => {
    const res = await getAdminBusiness360Action('00000000-0000-0000-0000-000000000001');
    expect(res.business.name).toContain('Comandos');
    expect(res.subscription.plan_code).toBe('ouro');
    expect(res.content_summary.gallery_limit).toBe(10);
    expect(res.analytics_summary.views_30d).toBeGreaterThan(0);
  });

  it('3. Ações de Risco: Suspender/Reativar anúncio com justificativa e auditoria', async () => {
    const res = await togglePublicationStatusAction(
      '00000000-0000-0000-0000-000000000001',
      'suspended',
      'Solicitação preventiva por auditoria financeira'
    );
    expect(res.success).toBe(true);
  });

  it('4. Reconhecimentos Fraternos: Concessão/Revogação auditada', async () => {
    const res = await toggleRecognitionAction(
      '00000000-0000-0000-0000-000000000001',
      'is_pedra_fundamental',
      true,
      'Concessão pioneira Pedra Fundamental'
    );
    expect(res.success).toBe(true);
  });
});
