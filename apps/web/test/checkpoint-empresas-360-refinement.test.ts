import { describe, it, expect, vi } from 'vitest';
import {
  getAdminBusinessesListAction,
  getAdminBusiness360Action,
  togglePublicationStatusAction,
  toggleRecognitionAction,
  manageAdminServiceAction,
  manageAdminBenefitAction,
} from '../src/lib/admin/admin-businesses-service';

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: () => undefined, getAll: () => [], set: () => {}, delete: () => {} }),
}));

const mockBiz = {
  id: '00000000-0000-0000-0000-000000000001',
  tenant_id: '00000000-0000-0000-0000-000000000010',
  name: 'Comandos - Terceirização e Segurança Eletrônica',
  category: 'Segurança Eletrônica & Terceirização',
  publication_status: 'published',
  plan_tier: 'ouro',
  is_founder: true,
  is_pedra_fundamental: true,
  is_coluna_honra: true,
};

vi.mock('../src/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => null,
}));

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      auth: {
        getUser: () => Promise.resolve({
          data: { user: { id: '00000000-0000-0000-0000-000000000099', email: 'admin@cm.com.br' } },
          error: null,
        }),
      },
      rpc: (fnName: string) => {
        if (fnName === 'has_platform_admin_access') return Promise.resolve({ data: true, error: null });
        return Promise.resolve({ data: null, error: null });
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'businesses') {
          const chain: any = {
            select: () => chain,
            update: () => chain,
            eq: () => chain,
            or: () => chain,
            order: () => chain,
            range: () => Promise.resolve({ data: [mockBiz], count: 1, error: null }),
            maybeSingle: () => Promise.resolve({ data: mockBiz, error: null }),
            single: () => Promise.resolve({ data: mockBiz, error: null }),
            then: (resolve: any) => resolve({ data: [mockBiz], count: 1, error: null }),
          };
          return chain;
        }
        if (table === 'business_services') {
          const chain: any = {
            select: () => chain,
            insert: (payload: any) => ({
              select: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'svc-100',
                    name: payload.name,
                    description: payload.description,
                    price_info: payload.price_info,
                    is_active: true,
                    display_order: 0,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
            eq: () => chain,
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            then: (resolve: any) => resolve({ data: [], count: 0, error: null }),
          };
          return chain;
        }
        if (table === 'business_benefits') {
          const chain: any = {
            select: () => chain,
            insert: (payload: any) => ({
              select: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'ben-100',
                    title: payload.title,
                    description: payload.description,
                    discount_percentage: payload.discount_percentage,
                    is_active: true,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
            eq: () => chain,
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            then: (resolve: any) => resolve({ data: [], count: 0, error: null }),
          };
          return chain;
        }
        if (table === 'analytics_events') {
          const chain: any = {
            select: () => chain,
            eq: () => chain,
            gte: () => Promise.resolve({
              data: [{ id: 'evt-1', event_type: 'page_view' }],
              count: 125,
            }),
            then: (resolve: any) => resolve({ data: [{ id: 'evt-1' }], count: 125 }),
          };
          return chain;
        }
        if (table === 'admin_audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        const defaultChain: any = {
          select: () => defaultChain,
          update: () => defaultChain,
          eq: () => defaultChain,
          in: () => defaultChain,
          order: () => defaultChain,
          limit: () => defaultChain,
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
          then: (resolve: any) => resolve({ data: [], count: 0, error: null }),
        };
        return defaultChain;
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
    expect(res.analytics_summary.views_30d).toBeGreaterThanOrEqual(0);
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

  it('5. Criação de Serviço no Prontuário 360º não falha por empresa não localizada', async () => {
    const res = await manageAdminServiceAction('00000000-0000-0000-0000-000000000001', 'create', {
      name: 'Monitoramento 24h',
      description: 'Central de alarme e CFTV integrada',
      price_info: 'Sob consulta',
    });
    expect(res.success).toBe(true);
    expect(res.data?.name).toBe('Monitoramento 24h');
  });

  it('6. Criação de Benefício no Prontuário 360º não falha por empresa não localizada', async () => {
    const res = await manageAdminBenefitAction('00000000-0000-0000-0000-000000000001', 'create', {
      title: 'Desconto Fraterno 15%',
      description: 'Válido para serviços de instalação',
      discount_percentage: 15,
    });
    expect(res.success).toBe(true);
    expect(res.data?.title).toBe('Desconto Fraterno 15%');
  });
});
