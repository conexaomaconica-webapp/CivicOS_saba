import { describe, it, expect, vi } from 'vitest';
import {
  getAdvertiserContentDataAction,
  saveAdvertiserServiceAction,
  saveAdvertiserBenefitAction,
  toggleServiceActiveAction,
} from '../src/lib/advertiser/advertiser-content-service';
import { processAndOptimizeMediaAction } from '../src/lib/media/media-optimization-service';

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'biz_001',
                name: 'Comandos - Terceirização e Segurança Eletrônica',
                slug: 'comandos-terceirizacao-e-seguranca-eletronica',
                plan_code: 'ouro',
              },
              error: null,
            }),
          };
        }
        if (table === 'business_services') {
          return {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 'srv-1', title: 'Portaria Remota', description: 'Atendimento 24h', is_active: true },
              ],
              count: 1,
              error: null,
            }),
          };
        }
        if (table === 'business_benefits') {
          return {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 'ben-1', title: '15% OFF', discount_condition: '15% OFF', is_active: true },
              ],
              count: 1,
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
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
    expect(dto.services.length).toBeGreaterThan(0);

    const res = await saveAdvertiserServiceAction({
      id: 'srv-1',
      business_id: 'biz_001',
      title: 'Portaria Remota Avançada 2027',
      description: 'Nova descrição do serviço',
    });

    expect(res.success).toBe(true);
    expect(res.isUnderReview).toBe(true);
    expect(res.message).toContain('versão anterior aprovada continuará visível');
  });

  it('2. Benefits CRUD & Moderação Institucional Nível 3 — Regras de ofertas fraternas', async () => {
    const res = await saveAdvertiserBenefitAction({
      business_id: 'biz_001',
      title: 'Desconto Fraterno de 20%',
      discount_condition: '20% OFF',
      promo_code: 'FRATERNO20',
    });

    expect(res.success).toBe(true);
    expect(res.message).toContain('revisada pelo Admin');
  });

  it('3. Inativação Imediata Nível 1 — Desativar serviço sem passar por fila de aprovação', async () => {
    const res = await toggleServiceActiveAction('srv-1', false);
    expect(res.success).toBe(true);
    expect(res.message).toContain('inativado');
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
