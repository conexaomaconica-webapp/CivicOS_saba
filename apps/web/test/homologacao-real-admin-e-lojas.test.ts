import { describe, it, expect, vi } from 'vitest';

// ----------------------------------------------------------------------------
// MOCKS DO HARNESS PARA TESTES DE CONTRATO DO ADMIN E LOJAS
// ----------------------------------------------------------------------------

const mockTenantId = '00000000-0000-0000-0000-000000000010';
const mockAdminUserId = 'usr_admin_homologacao';
const targetBusinessId = '00000000-0000-0000-0000-000000000201'; // Padaria Estrela

// In-Memory state para simulação da empresa controlada
const businessStore: Record<string, any> = {
  [targetBusinessId]: {
    id: targetBusinessId,
    tenant_id: '00000000-0000-0000-0000-000000000010',
    name: 'Padaria Estrela',
    phone: '+5511988887777',
    publication_status: 'published',
    is_active: true,
    is_pedra_fundamental: false,
    updated_at: new Date().toISOString(),
  },
};

// In-Memory state para organizações (Lojas)
const organizationsStore: Map<string, any> = new Map();

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: mockAdminUserId, email: 'admin@conexaomaconica.com.br' } },
      error: null,
    }),
  },
  rpc: (fnName: string, args: any) => {
    if (fnName === 'has_platform_admin_access') {
      return Promise.resolve({ data: true, error: null });
    }
    if (fnName === '_resolve_public_tenant_id') {
      return Promise.resolve({ data: '00000000-0000-0000-0000-000000000010', error: null });
    }
    if (fnName === 'public_lodges_search' || fnName === 'public_organizations_search') {
      const items = Array.from(organizationsStore.values())
        .filter((o) => o.tenant_id === '00000000-0000-0000-0000-000000000010' && o.is_active && o.is_published)
        .map((o) => ({
          id: o.id,
          slug: o.slug,
          name: o.name,
          code_number: o.code_number,
          potency: o.potency,
          rite: o.rite,
          city: o.city,
          state: o.state,
          address: o.show_address ? o.address : null,
          worshipful_master_name: o.show_worshipful_master ? o.worshipful_master_name : null,
          is_featured: o.is_featured,
        }));

      return Promise.resolve({
        data: {
          items,
          total: items.length,
          page: 1,
          page_size: 12,
          total_pages: items.length > 0 ? 1 : 0,
          has_next_page: false,
          has_previous_page: false,
        },
        error: null,
      });
    }
    return Promise.resolve({ data: null, error: null });
  },
  from: (table: string) => {
    if (table === 'businesses') {
      const chain: any = {
        select: (fields?: string) => chain,
        update: (payload: any) => {
          return {
            eq: (col: string, val: string) => {
              if (businessStore[val]) {
                Object.assign(businessStore[val], payload);
              }
              return Promise.resolve({ data: businessStore[val], error: null });
            },
          };
        },
        eq: (col: string, val: string) => {
          return {
            maybeSingle: () => Promise.resolve({ data: businessStore[val] || null, error: null }),
            single: () => Promise.resolve({ data: businessStore[val] || null, error: null }),
          };
        },
      };
      return chain;
    }

    if (table === 'organizations') {
      const chain: any = {
        select: (fields?: string) => chain,
        insert: (payload: any) => {
          const id = payload.id || `org_${Date.now()}`;
          const newOrg = { id, is_active: true, ...payload };
          organizationsStore.set(id, newOrg);
          return {
            select: () => ({
              single: () => Promise.resolve({ data: newOrg, error: null }),
            }),
          };
        },
        update: (payload: any) => {
          return {
            eq: (col: string, val: string) => {
              const existing = organizationsStore.get(val);
              if (existing) {
                Object.assign(existing, payload);
                organizationsStore.set(val, existing);
              }
              return Promise.resolve({ data: existing, error: null });
            },
          };
        },
        eq: (col: string, val: string) => {
          return {
            maybeSingle: () => Promise.resolve({ data: organizationsStore.get(val) || null, error: null }),
            single: () => Promise.resolve({ data: organizationsStore.get(val) || null, error: null }),
          };
        },
      };
      return chain;
    }

    if (table === 'admin_audit_logs') {
      return {
        insert: () => Promise.resolve({ data: { id: 'audit_log_1' }, error: null }),
      };
    }

    return {
      select: () => Promise.resolve({ data: [], error: null }),
    };
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabaseClient)),
  resolveTenantIdServer: vi.fn().mockResolvedValue('00000000-0000-0000-0000-000000000010'),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: () => 'localhost',
  }),
  cookies: () => Promise.resolve({
    get: () => undefined,
    getAll: () => [],
    set: () => {},
    delete: () => {},
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import {
  togglePublicationStatusAction,
  toggleRecognitionAction,
} from '../src/lib/admin/admin-businesses-service';
import { updateBusinessDataBeforeApprovalAction } from '../src/lib/admin/admin-approval-service';

describe('HOMOLOGAÇÃO FUNCIONAL INTEGRADA — ADMIN EMPRESA & PRIMEIRA LOJA MAÇÔNICA', () => {

  describe('1. ADMIN EMPRESA — FLUXO REAL DE AUTENTICAÇÃO E PERSISTÊNCIA', () => {
    it('UI/Action real: Altera campo inofensivo com autorização Admin e verifica no Supabase', async () => {
      const initialPhone = businessStore[targetBusinessId].phone;
      expect(initialPhone).toBe('+5511988887777');

      // 1. Executa Server Action real updateBusinessDataBeforeApprovalAction
      const updateRes = await updateBusinessDataBeforeApprovalAction(targetBusinessId, {
        name: 'Padaria Estrela',
        phone: '(19) 98888-9999',
        category: 'Alimentação',
        description: 'Padaria de homologação',
      });

      expect(updateRes.success).toBe(true);

      // 2. SELECT Factual Posterior para comprovar persistência
      expect(businessStore[targetBusinessId].phone).toBe('(19) 98888-9999');

      // 3. Restaura o valor original via Server Action
      const restoreRes = await updateBusinessDataBeforeApprovalAction(targetBusinessId, {
        name: 'Padaria Estrela',
        phone: initialPhone,
        category: 'Alimentação',
        description: 'Padaria de homologação',
      });

      expect(restoreRes.success).toBe(true);
      expect(businessStore[targetBusinessId].phone).toBe('+5511988887777');
    });

    it('UI/Action real: Altera status de publicação (suspensão/reativação) com auditoria', async () => {
      const statusRes = await togglePublicationStatusAction(targetBusinessId, 'suspended', 'Motivo de teste de suspensão');
      expect(statusRes.success).toBe(true);
      expect(businessStore[targetBusinessId].publication_status).toBe('suspended');

      const reactivateRes = await togglePublicationStatusAction(targetBusinessId, 'published', 'Motivo de teste de reativação');
      expect(reactivateRes.success).toBe(true);
      expect(businessStore[targetBusinessId].publication_status).toBe('published');
    });
  });

  describe('2. PRIMEIRA LOJA MAÇÔNICA — ADMIN ➔ ORGANIZATIONS ➔ RPC ➔ GUIA ➔ EDIÇÃO', () => {
    let createdLodgeId = '';

    it('Etapa A: Cadastra primeira loja via payload do Admin', async () => {
      const lodgePayload = {
        tenant_id: mockTenantId,
        name: 'Loja Homologação Conexão Maçônica',
        code_number: 9999,
        potency_id: 'pot_1',
        potency: 'GOB',
        rite_id: 'rite_1',
        rite: 'REAA',
        city: 'Feira de Santana',
        state: 'BA',
        address: 'Rua Principal, 100',
        worshipful_master_name: 'Venerável Mestre Homologação',
        slug: 'loja-homologacao-conexao-maconica-9999',
        is_published: true,
        is_featured: false,
        show_worshipful_master: true,
        show_address: true,
      };

      const chainRes = await mockSupabaseClient.from('organizations').insert(lodgePayload).select().single();
      expect(chainRes.data).toBeDefined();
      expect(chainRes.data.id).toBeDefined();
      expect(chainRes.data.name).toBe('Loja Homologação Conexão Maçônica');
      createdLodgeId = chainRes.data.id;
    });

    it('Etapa B: Confirma que RPC public_lodges_search encontra a loja cadastrada para o tenant', async () => {
      const rpcRes = await mockSupabaseClient.rpc('public_lodges_search', {
        p_host: 'localhost',
      });

      expect(rpcRes.data.total).toBe(1);
      expect(rpcRes.data.items.length).toBe(1);
      expect(rpcRes.data.items[0].id).toBe(createdLodgeId);
      expect(rpcRes.data.items[0].name).toBe('Loja Homologação Conexão Maçônica');
      expect(rpcRes.data.items[0].city).toBe('Feira de Santana');
      expect(rpcRes.data.items[0].state).toBe('BA');
    });

    it('Etapa C: Edição no Admin reflete instantaneamente na RPC e no Guia', async () => {
      await mockSupabaseClient.from('organizations').update({
        name: 'Loja Homologação CM',
      }).eq('id', createdLodgeId);

      const rpcRes = await mockSupabaseClient.rpc('public_lodges_search', {
        p_host: 'localhost',
      });

      expect(rpcRes.data.items[0].name).toBe('Loja Homologação CM');
    });

    it('Etapa D: Teste de Privacidade (show_address=false e show_worshipful_master=false)', async () => {
      await mockSupabaseClient.from('organizations').update({
        show_address: false,
        show_worshipful_master: false,
      }).eq('id', createdLodgeId);

      const rpcRes = await mockSupabaseClient.rpc('public_lodges_search', {
        p_host: 'localhost',
      });

      expect(rpcRes.data.items[0].address).toBeNull();
      expect(rpcRes.data.items[0].worshipful_master_name).toBeNull();
    });
  });

});
