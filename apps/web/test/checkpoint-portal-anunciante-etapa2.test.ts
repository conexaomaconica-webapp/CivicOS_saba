import { describe, it, expect, vi } from 'vitest';
import {
  getAdvertiserProfileDataAction,
  updateAdvertiserProfileFieldsAction,
  updateAdvertiserMediaAction,
} from '../src/lib/advertiser/advertiser-profile-service';

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'biz_001',
                name: 'Comandos - Terceirização e Segurança Eletrônica',
                slug: 'comandos-terceirizacao-e-seguranca-eletronica',
                phone: '(11) 3456-7890',
                whatsapp: '(11) 98765-4321',
                logo_url: '/logo.png',
                cover_url: '/cover.jpg',
                plan_code: 'ouro',
              },
              error: null,
            }),
          };
        }
        if (table === 'business_media') {
          return {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 'm-1', url: '/p1.jpg', title: 'Foto 1', display_order: 1 },
                { id: 'm-2', url: '/p2.jpg', title: 'Foto 2', display_order: 2 },
              ],
              count: 2,
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

describe('Portal do Anunciante — Etapa 2: Minha Empresa (/anunciante/empresa & /anunciante/empresa/midias)', () => {
  it('1. Profile load & Completeness — Carrega dados do perfil e cálculo de completude', async () => {
    const dto = await getAdvertiserProfileDataAction();
    expect(dto.business.name).toBe('Comandos - Terceirização e Segurança Eletrônica');
    expect(dto.business.completeness_percent).toBeGreaterThanOrEqual(80);
    expect(dto.gallery_photos.length).toBeGreaterThan(0);
  });

  it('2. Profile editing — Edição imediata de campos de contato sem suspender empresa', async () => {
    const res = await updateAdvertiserProfileFieldsAction({
      business_id: 'biz_001',
      phone: '(11) 99999-8888',
      whatsapp: '(11) 98888-7777',
      website: 'https://novaempresa.com.br',
    });
    expect(res.success).toBe(true);
    expect(res.requiresReview).toBe(false);
    expect(res.message).toContain('salvas com sucesso');
  });

  it('3. Sensitive field moderation — Identifica campos sensíveis e ativa moderação sem gerar suspensão', async () => {
    const res = await updateAdvertiserProfileFieldsAction({
      business_id: 'biz_001',
      legal_name: 'Nova Razao Social Ltda',
      document_number: '99.888.777/0001-00',
    });
    expect(res.success).toBe(true);
    expect(res.requiresReview).toBe(true);
    expect(res.message).toContain('revisados pelo Admin');
  });

  it('4. Logo & Cover management — Atualiza logotipo e imagem de capa corporativa', async () => {
    const logoRes = await updateAdvertiserMediaAction('biz_001', 'logo', { url: '/new-logo.png' });
    expect(logoRes.success).toBe(true);

    const coverRes = await updateAdvertiserMediaAction('biz_001', 'cover', { url: '/new-cover.jpg' });
    expect(coverRes.success).toBe(true);
  });

  it('5. Gallery management & Entitlement — Controla cotas de mídia (fotos)', async () => {
    const addRes = await updateAdvertiserMediaAction('biz_001', 'gallery_add', {
      url: '/photo-new.jpg',
      title: 'Nova Foto',
    });
    expect(addRes.success).toBe(true);
  });
});
