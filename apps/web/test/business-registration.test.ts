import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { validateCnpj, formatCnpj } from '../src/lib/onboarding/onboarding-validation';
import { createBusinessDraft, listBusinessCategories } from '../src/lib/business/business-registration-service';

function makeUser(): User {
  return {
    id: 'user-1',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'owner@example.com',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-01-01T00:00:00Z',
  };
}

const VALID_CNPJ = '11.222.333/0001-81';
const VALID_CNPJ_DIGITS = '11222333000181';

function makeSupabase(mock: {
  getUser?: () => Promise<{ data: { user: User | null } }>;
  findExisting?: () => Promise<{ data: { id: string } | null }>;
  insertBusiness?: () => Promise<{ data: { id: string } | null }>;
  selectCategories?: () => Promise<{ data: Array<{ id: string; name: string }> | null }>;
}) {
  const auth: Record<string, unknown> = {};
  auth.getUser = vi.fn(mock.getUser ?? (async () => ({ data: { user: makeUser() } })));

  const businessTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(mock.findExisting ?? (async () => ({ data: null })) ),
        })),
      })),
    })),
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(mock.insertBusiness ?? (async () => ({ data: { id: 'biz-1' } }))) })) })),
  };

  const categoriesTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(mock.selectCategories ?? (async () => ({ data: [{ id: 'cat-1', name: 'Serviços' }] }))),
      })),
    })),
  };

  return {
    auth,
    from: vi.fn((table: string) => (table === 'categories' ? categoriesTable : businessTable)),
  } as unknown as SupabaseClient<Database>;
}

describe('validateCnpj · ADV-002 (CRIT-VSC-003)', () => {
  it('aceita CNPJ válido com dígitos verificadores corretos', () => {
    expect(validateCnpj(VALID_CNPJ)).toBeNull();
    expect(validateCnpj(VALID_CNPJ_DIGITS)).toBeNull();
  });

  it('rejeita CNPJ com dígito verificador incorreto', () => {
    expect(validateCnpj('11.222.333/0001-80')).toContain('CNPJ inválido');
  });

  it('rejeita tamanho e digitos repetidos', () => {
    expect(validateCnpj('123')).toContain('14 dígitos');
    expect(validateCnpj('11111111111111')).toContain('CNPJ inválido');
    expect(validateCnpj('')).toContain('Informe o CNPJ');
  });

  it('normaliza para o formato mascarado', () => {
    expect(formatCnpj('11222333000181')).toBe(VALID_CNPJ);
  });
});

describe('createBusinessDraft · ADV-002', () => {
  it('rejeita CNPJ inválido antes de consultar o banco', async () => {
    const supabase = makeSupabase({});
    const result = await createBusinessDraft(supabase, {
      tenantId: 'tenant-1',
      cnpj: '000',
      legalName: 'Razão Social Ltda',
      tradingName: 'Fantasia',
      phone: '(11) 99999-0000',
      categoryId: 'cat-1',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('CNPJ');
  });

  it('rejeita CNPJ duplicado no tenant (CRIT-VSC-003)', async () => {
    const supabase = makeSupabase({
      findExisting: async () => ({ data: { id: 'existing' } }),
    });
    const result = await createBusinessDraft(supabase, {
      tenantId: 'tenant-1',
      cnpj: VALID_CNPJ,
      legalName: 'Razão Social Ltda',
      tradingName: 'Fantasia',
      phone: '(11) 99999-0000',
      categoryId: 'cat-1',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('já está cadastrado');
  });

  it('cria o rascunho vinculando o usuário como titular', async () => {
    const insertBusiness = vi.fn(async () => ({ data: { id: 'biz-1' } }));
    const supabase = makeSupabase({ insertBusiness });

    const result = await createBusinessDraft(supabase, {
      tenantId: 'tenant-1',
      cnpj: VALID_CNPJ,
      legalName: 'Razão Social Ltda',
      tradingName: 'Fantasia',
      phone: '(11) 99999-0000',
      categoryId: 'cat-1',
    });

    expect(result).toEqual({ ok: true, businessId: 'biz-1', error: null });
    expect(insertBusiness).toHaveBeenCalled();
  });

  it('lista categorias ativas para o select', async () => {
    const supabase = makeSupabase({
      selectCategories: async () => ({
        data: [
          { id: 'cat-1', name: 'Serviços' },
          { id: 'cat-2', name: 'Comércio' },
        ],
      }),
    });
    const categories = await listBusinessCategories(supabase);
    expect(categories).toHaveLength(2);
    expect(categories[0]).toEqual({ id: 'cat-1', name: 'Serviços' });
  });
});