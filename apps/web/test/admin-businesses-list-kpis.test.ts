import { describe, it, expect, vi } from 'vitest';
import { getAdminBusinessesListAction } from '../src/lib/admin/admin-businesses-service';

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: () => undefined, getAll: () => [], set: () => {}, delete: () => {} }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const complete = {
  description: 'Descrição completa da empresa para o teste de completude.',
  category: 'Serviços',
  category_id: 'cat-1',
  city: 'Salvador',
  state: 'BA',
  phone: '71999990000',
  whatsapp: '71999990000',
  logo_url: 'https://exemplo.com/logo.png',
};

// 25 empresas: as 5 mais antigas (2 Pedra Fundamental) ficam depois da primeira página de 20.
const businesses = Array.from({ length: 25 }, (_, index) => ({
  id: `biz-${index}`,
  tenant_id: 't1',
  name: `Empresa ${index}`,
  legal_name: `Empresa ${index} Ltda`,
  publication_status: index === 3 ? 'suspended' : 'published',
  plan_tier: index >= 20 ? 'ouro' : 'bronze',
  created_at: new Date(2026, 0, 31 - index).toISOString(),
  ...(index === 7 ? { name: 'Só o nome' } : complete),
}));

const tables: Record<string, any[]> = {
  businesses,
  subscriptions: [],
  business_recognitions: [
    { business_id: 'biz-21', recognition_key: 'pedra_fundamental' },
    { business_id: 'biz-24', recognition_key: 'pedra_fundamental' },
  ],
  invoices: [
    { business_id: 'biz-3', status: 'overdue' },
    { business_id: 'biz-5', status: 'overdue' },
    { business_id: 'biz-5', status: 'paid' }, // fatura paga vence a atrasada
  ],
  business_locations: [],
  business_contacts: [],
  business_categories: [],
  business_masonic_links: [],
  business_responsibles: [],
};

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'admin-1', email: 'admin@cm.com.br' } }, error: null }) },
      rpc: (fn: string) => Promise.resolve({ data: fn === 'has_platform_admin_access' ? true : null, error: null }),
      from: (table: string) => {
        const chain: any = {
          select: () => chain,
          eq: () => chain,
          order: () => chain,
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          then: (resolve: any) => resolve({ data: tables[table] ?? [], error: null }),
        };
        return chain;
      },
    }),
  ),
}));

describe('KPIs e filtros de /admin/empresas calculados sobre a carteira inteira', () => {
  it('conta inadimplentes, incompletas, planos e Pedra Fundamental de toda a carteira', async () => {
    const res = await getAdminBusinessesListAction({ page: 1, pageSize: 20 });

    expect(res.counts.todas).toBe(25);
    expect(res.counts.suspensas).toBe(1);
    expect(res.counts.publicadas).toBe(24);
    expect(res.counts.inadimplentes).toBe(1); // biz-3; biz-5 tem fatura paga
    expect(res.counts.incompletas).toBe(1); // biz-7 só tem o nome
    expect(res.counts.ouro).toBe(5);
    expect(res.counts.bronze).toBe(20);
    expect(res.counts.pedraFundamental).toBe(2);
    expect(res.items).toHaveLength(20);
    expect(res.total).toBe(25);
  });

  it('filtra por Pedra Fundamental e por plano mesmo quando a empresa está depois da primeira página', async () => {
    const pedra = await getAdminBusinessesListAction({ recognition: 'pedra_fundamental', page: 1, pageSize: 20 });
    expect(pedra.total).toBe(2);
    expect(pedra.items.map((item) => item.id).sort()).toEqual(['biz-21', 'biz-24']);

    const ouro = await getAdminBusinessesListAction({ plan: 'ouro', page: 1, pageSize: 20 });
    expect(ouro.total).toBe(5);
    expect(ouro.items).toHaveLength(5);
  });

  it('filtra inadimplentes e incompletas e mostra a situação de pagamento real', async () => {
    const overdue = await getAdminBusinessesListAction({ status: 'overdue' });
    expect(overdue.items.map((item) => item.id)).toEqual(['biz-3']);
    expect(overdue.items[0]?.payment_status).toBe('overdue');

    const incomplete = await getAdminBusinessesListAction({ status: 'incomplete' });
    expect(incomplete.items.map((item) => item.id)).toEqual(['biz-7']);
  });

  it('pagina sobre o resultado filtrado', async () => {
    const page2 = await getAdminBusinessesListAction({ page: 2, pageSize: 20 });
    expect(page2.items).toHaveLength(5);
    expect(page2.total).toBe(25);
  });
});
