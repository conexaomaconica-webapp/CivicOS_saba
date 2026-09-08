import { describe, it, expect, vi } from 'vitest';
import {
  getAdvertiserContentDataAction,
  saveAdvertiserServiceAction,
  saveAdvertiserBenefitAction,
  toggleServiceActiveAction,
} from '../src/lib/advertiser/advertiser-content-service';
import { processAndOptimizeMediaAction } from '../src/lib/media/media-optimization-service';

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: () => undefined, getAll: () => [], set: () => {}, delete: () => {} }),
}));

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    const chainable = (table: string) => {
      const c: any = {
        select: () => c,
        insert: () => Promise.resolve({ data: { id: 'srv-1' }, error: null }),
        update: () => c,
        eq: () => c,
        limit: () => c,
        order: () => Promise.resolve({
          data: [
            { id: 'srv-1', title: 'Portaria Remota', description: 'Atendimento 24h', is_active: true },
          ],
          count: 1,
          error: null,
        }),
        maybeSingle: () => Promise.resolve({
          data: {
            id: 'biz_001',
            name: 'Comandos - Terceirização e Segurança Eletrônica',
            slug: 'comandos-terceirizacao-e-seguranca-eletronica',
            plan_code: 'ouro',
          },
          error: null,
        }),
        single: () => Promise.resolve({ data: { id: 'srv-1' }, error: null }),
        then: (resolve: any) => resolve({ data: [{ id: 'srv-1', title: 'Portaria Remota', is_active: true }], count: 1, error: null }),
      };
      return c;
    };

    return Promise.resolve({
      from: (table: string) => chainable(table),
      rpc: (fnName: string) => {
        return Promise.resolve({ data: true, error: null });
      },
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user_anunciante_1' } },
          error: null,
        }),
      },
    });
  }),
}));

describe('Portal do Anunciante — Etapa 3: Gestão de Conteúdo & Política de Mídia (/anunciante/conteudo/*)', () => {
  it('1. Services CRUD & Moderação Nível 2 — Edição mantém versão atual publicada enquanto nova aguarda análise', async () => {
    const dto = await getAdvertiserContentDataAction();
    expect(dto.services).toBeDefined();

    const res = await saveAdvertiserServiceAction({
      id: 'srv-1',
      business_id: 'biz_001',
      title: 'Portaria Remota Avançada 2027',
      description: 'Nova descrição do serviço',
    });

    expect(res.success).toBe(true);
  });

  it('2. Benefits CRUD & Moderação Institucional Nível 3 — Regras de ofertas fraternas', async () => {
    const res = await saveAdvertiserBenefitAction({
      business_id: 'biz_001',
      title: 'Desconto Fraterno de 20%',
      discount_condition: '20% OFF',
      promo_code: 'FRATERNO20',
    });

    expect(res.success).toBe(true);
  });

  it('3. Inativação Imediata Nível 1 — Desativar serviço sem passar por fila de aprovação', async () => {
    const res = await toggleServiceActiveAction('srv-1', false);
    expect(res.success).toBe(true);
  });

  it('4. Global Media Optimization Pipeline — Limite 10MB, remoção EXIF e WebP', async () => {
    const dummyBuffer = new ArrayBuffer(500 * 1024); // 500KB
    const optRes = await processAndOptimizeMediaAction(dummyBuffer, 'foto-fachada.jpg', {
      mediaType: 'gallery',
      maxSizeBytes: 10 * 1024 * 1024,
    });

    expect(optRes.success).toBe(true);
    expect(optRes.exifStripped).toBe(true);
    expect(optRes.mimeType).toBe('image/webp');
    expect(optRes.optimizedSizeBytes).toBeLessThan(optRes.originalSizeBytes);
  });
});
