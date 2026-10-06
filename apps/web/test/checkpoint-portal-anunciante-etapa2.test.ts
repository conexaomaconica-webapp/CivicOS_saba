import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAdvertiserProfileDataAction,
  updateAdvertiserProfileFieldsAction,
  updateAdvertiserMediaAction,
} from '../src/lib/advertiser/advertiser-profile-service';

// Estado compartilhado do cliente Supabase simulado (reiniciado a cada teste).
const calls: Array<{ table: string; op: string; args: unknown[] }> = [];
const submitted: Array<Record<string, unknown>> = [];
let plan = 'ouro';
let tables: Record<string, any[]> = {};

function table(name: string) {
  const rows = () => tables[name] ?? [];
  const chain: any = {};
  for (const method of ['select', 'eq', 'neq', 'gt', 'in', 'is', 'order', 'limit']) chain[method] = () => chain;
  chain.maybeSingle = () => Promise.resolve({ data: rows()[0] ?? null, error: null });
  chain.single = () => Promise.resolve({ data: rows()[0] ?? null, error: null });
  chain.then = (resolve: any) => resolve({ data: rows(), count: rows().length, error: null });
  for (const op of ['insert', 'update', 'delete', 'upsert']) {
    chain[op] = (...args: unknown[]) => {
      calls.push({ table: name, op, args });
      return chain;
    };
  }
  return chain;
}

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(async () => ({
    from: (name: string) => table(name),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'submit_business_change_request') {
        submitted.push(args);
        return { data: 'req-1', error: null };
      }
      return { data: null, error: { message: 'indisponível' } };
    },
    auth: { getUser: async () => ({ data: { user: { id: 'user_anunciante_1' } }, error: null }) },
  })),
}));

const business = () => ({
  id: 'biz_001',
  tenant_id: '00000000-0000-0000-0000-000000000000',
  owner_id: 'user_anunciante_1',
  name: 'Comandos',
  slug: 'comandos',
  legal_name: 'Comandos Ltda',
  cnpj_cpf: '12.345.678/0001-90',
  category: 'Segurança',
  description: 'Descrição atual',
  logo_url: '/logo.png',
  plan_tier: plan,
});

beforeEach(() => {
  calls.length = 0;
  submitted.length = 0;
  plan = 'ouro';
  tables = {
    businesses: [business()],
    business_media: [
      { id: 'm-1', url: '/p1.jpg', title: 'Foto 1', display_order: 1, media_type: 'image' },
      { id: 'm-2', url: '/p2.jpg', title: 'Foto 2', display_order: 2, media_type: 'image' },
    ],
    business_contacts: [{ type: 'whatsapp', value: '(11) 98765-4321' }],
    business_hours: [],
    business_locations: [],
    business_change_requests: [],
    plan_entitlements: [],
  };
});

describe('Portal do Anunciante — Etapa 2: Minha Empresa (/anunciante/empresa & /anunciante/empresa/midias)', () => {
  it('1. Perfil: carrega dados reais (contatos do Guia, CNPJ real) e completude calculada', async () => {
    const dto = await getAdvertiserProfileDataAction();
    expect(dto.business.name).toBe('Comandos');
    expect(dto.business.document_number).toBe('12.345.678/0001-90');
    expect(dto.business.whatsapp).toBe('(11) 98765-4321');
    expect(dto.business.hours).toHaveLength(7);
    expect(dto.business.completeness_percent).toBeGreaterThanOrEqual(0);
    expect(dto.gallery_photos.length).toBeGreaterThan(0);
  });

  it('2. Contatos publicam na hora (sem validação) em business_contacts', async () => {
    const res = await updateAdvertiserProfileFieldsAction({
      business_id: 'biz_001',
      phone: '(11) 99999-8888',
      whatsapp: '(11) 98888-7777',
      website: 'novaempresa.com.br',
    });
    expect(res.success).toBe(true);
    expect(res.requiresReview).toBe(false);
    expect(res.message).toContain('Publicado no Guia: Contatos');
    expect(submitted).toHaveLength(0);
    const inserted = calls.filter((c) => c.table === 'business_contacts' && c.op === 'insert').map((c) => (c.args[0] as any).value);
    expect(inserted).toContain('https://novaempresa.com.br');
  });

  it('3. Identidade (razão social, CNPJ) vai para validação e a versão publicada não é alterada', async () => {
    const res = await updateAdvertiserProfileFieldsAction({
      business_id: 'biz_001',
      legal_name: 'Nova Razao Social Ltda',
      document_number: '99.888.777/0001-00',
    });
    expect(res.success).toBe(true);
    expect(res.requiresReview).toBe(true);
    expect(res.message).toContain('validação da plataforma');
    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toMatchObject({ p_entity_type: 'profile', p_business_id: 'biz_001' });
    expect(Object.keys(submitted[0]!.p_payload as object).sort()).toEqual(['document_number', 'legal_name']);
    // Nada foi gravado direto em businesses.
    expect(calls.filter((c) => c.table === 'businesses' && c.op === 'update')).toHaveLength(0);
  });

  it('4. Sem mudança real não envia nada', async () => {
    const res = await updateAdvertiserProfileFieldsAction({ business_id: 'biz_001', name: 'Comandos', document_number: '12345678000190' });
    expect(res.success).toBe(true);
    expect(res.message).toContain('Nenhuma alteração');
    expect(submitted).toHaveLength(0);
  });

  it('5. Logomarca e capa vão para validação (não entram no Guia antes da aprovação)', async () => {
    const logoRes = await updateAdvertiserMediaAction('biz_001', 'logo', { url: '/new-logo.png' });
    const coverRes = await updateAdvertiserMediaAction('biz_001', 'cover', { url: '/new-cover.jpg' });
    expect(logoRes).toMatchObject({ success: true, inReview: true });
    expect(coverRes).toMatchObject({ success: true, inReview: true });
    expect(submitted.map((s) => s.p_entity_type)).toEqual(['logo', 'cover']);
    expect(calls.filter((c) => ['businesses', 'business_media'].includes(c.table))).toHaveLength(0);
  });

  it('6. Galeria respeita a cota do plano, contando as fotos já enviadas para validação', async () => {
    const ok = await updateAdvertiserMediaAction('biz_001', 'gallery_add', { url: '/photo-new.jpg', title: 'Nova Foto' });
    expect(ok).toMatchObject({ success: true, inReview: true });
    expect(submitted[0]).toMatchObject({ p_entity_type: 'gallery', p_action: 'create' });

    plan = 'bronze'; // Esquadro: 1 foto; já existem 2
    tables.businesses = [business()];
    const blocked = await updateAdvertiserMediaAction('biz_001', 'gallery_add', { url: '/photo-extra.jpg' });
    expect(blocked.success).toBe(false);
    expect(blocked.message).toContain('limite');
  });

  it('7. Remover foto continua imediato e restrito à própria empresa', async () => {
    const res = await updateAdvertiserMediaAction('biz_001', 'gallery_delete', { photoId: 'm-1' });
    expect(res.success).toBe(true);
    expect(calls.some((c) => c.table === 'business_media' && c.op === 'delete')).toBe(true);
  });
});
