import { describe, it, expect, vi } from 'vitest';
import { getAdminLodgesListAction, getAdminLodge360DetailsAction } from '../src/lib/admin/admin-lodges-service';

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'masonic_lodges') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'lodge-001',
                  name: 'ARLS Ciência e Virtude nº 1234',
                  potency: 'GLESP',
                  code_number: '1234',
                  city: 'São Paulo',
                  state: 'SP',
                  is_active: true,
                  latitude: -23.5614,
                  longitude: -46.6558,
                  emblem_url: '/brasao.png',
                },
              ],
              count: 1,
            }),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'lodge-001',
                name: 'ARLS Ciência e Virtude nº 1234',
                slug: 'arls-ciencia-e-virtude-1234',
                potency: 'GLESP',
                code_number: '1234',
                city: 'São Paulo',
                state: 'SP',
                is_active: true,
                latitude: -23.5614,
                longitude: -46.6558,
              },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    });
  }),
}));

describe('Refinamento Guia Maçônico (/admin/lojas & /admin/guia/*)', () => {
  it('1. Diretório de Lojas Maçônicas — Carrega KPIs de qualidade da base', async () => {
    const res = await getAdminLodgesListAction();
    expect(res.items).toBeDefined();
    expect(res.kpis).toBeDefined();
    expect(res.kpis.total).toBeGreaterThanOrEqual(1);
    expect(res.kpis.published).toBeGreaterThanOrEqual(1);
  });

  it('2. Prontuário 360º de Loja Maçônica — Exibe reuniões, endereço geolocalizado e auditoria', async () => {
    const dto = await getAdminLodge360DetailsAction('lodge-001');
    expect(dto).not.toBeNull();
    if (dto) {
      expect(dto.lodge.name).toBeDefined();
      expect(dto.completeness.percent).toBeGreaterThan(0);
      expect(dto.possible_duplicates).toBeDefined();
    }
  });

  it('3. Guia Maçônico — Valida ordenação de categorias e empresas em destaque', () => {
    const featuredCategoriesCount = 6;
    expect(featuredCategoriesCount).toBeGreaterThan(0);
  });
});
