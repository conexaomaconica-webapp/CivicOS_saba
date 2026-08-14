import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import {
  validateMasonicStep,
  hasMasonicStepErrors,
  sanitizeCimb,
  toPersistedAffiliation,
  emptyMasonicAffiliation,
  MASONIC_STATUS_LABELS,
} from '../src/lib/masonic/masonic-affiliation';
import {
  saveResponsibleDraft,
  loadResponsibleDraft,
  RESPONSIBLE_DRAFT_KEY,
  type ResponsiveStorage,
} from '../src/lib/onboarding/responsible-flow';
import {
  upsertMasonicAffiliation,
  loadMasonicAffiliation,
} from '../src/lib/masonic/masonic-affiliation-service';

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

function makeStorage(): ResponsiveStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function makeSupabase(mock: {
  upsert?: () => Promise<{ error: null | { message: string } }>;
  select?: () => Promise<{ data: Record<string, unknown> | null }>;
}) {
  const auth = { getUser: vi.fn(async () => ({ data: { user: makeUser() } })) };
  const table = {
    upsert: vi.fn(() => ({ error: null as null | { message: string } })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(
          mock.select ?? (async () => ({ data: null })),
        ),
      })),
    })),
  };
  const instance = {
    auth,
    from: vi.fn(() => table),
  } as unknown as SupabaseClient<Database>;
  return { instance, table };
}

describe('validateMasonicStep · ADV-001b (DOMÍNIO MAÇÔNICO)', () => {
  it('exige o vínculo maçônico (pergunta obrigatória)', () => {
    const errors = validateMasonicStep(emptyMasonicAffiliation());
    expect(errors.status).toBeTruthy();
    expect(hasMasonicStepErrors(errors)).toBe(true);
  });

  it('valida irmão maçom: CIMB e situação de atividade obrigatórios', () => {
    const errors = validateMasonicStep({
      ...emptyMasonicAffiliation(),
      status: 'mason',
      isActive: null,
      cimbCode: '',
    });
    expect(errors.isActive).toBeTruthy();
    expect(errors.cimbCode).toContain('CIMB');

    const ok = validateMasonicStep({
      ...emptyMasonicAffiliation(),
      status: 'mason',
      isActive: true,
      cimbCode: 'abc.1234',
      masonicConsent: true,
    });
    expect(hasMasonicStepErrors(ok)).toBe(false);
  });

  it('valida cunhada: exige nome do marido maçom', () => {
    const errors = validateMasonicStep({
      ...emptyMasonicAffiliation(),
      status: 'mason_wife',
      spouseMasonName: ' ',
    });
    expect(errors.spouseMasonName).toContain('marido');

    const ok = validateMasonicStep({
      ...emptyMasonicAffiliation(),
      status: 'mason_wife',
      spouseMasonName: 'Irmão José',
      masonicConsent: true,
    });
    expect(hasMasonicStepErrors(ok)).toBe(false);
  });

  it('valida DeMolay / Filha de Jó: exige Capítulo / Beth-El', () => {
    for (const status of ['demolay', 'job_daughter'] as const) {
      const errors = validateMasonicStep({
        ...emptyMasonicAffiliation(),
        status,
        chapterName: '',
      });
      expect(errors.chapterName).toContain('Capítulo');
      const ok = validateMasonicStep({
        ...emptyMasonicAffiliation(),
        status,
        chapterName: 'Capítulo Estrela do Norte',
        masonicConsent: true,
      });
      expect(hasMasonicStepErrors(ok)).toBe(false);
    }
  });

  it('aceita ausência de vínculo', () => {
    const errors = validateMasonicStep({ ...emptyMasonicAffiliation(), status: 'none' });
    expect(hasMasonicStepErrors(errors)).toBe(false);
  });

  it('exige consentimento destacado para qualquer vínculo declarado', () => {
    const errors = validateMasonicStep({
      ...emptyMasonicAffiliation(),
      status: 'mason_wife',
      spouseMasonName: 'Irmão José',
      masonicConsent: false,
    });

    expect(errors.consent).toContain('autorizar o tratamento');
    expect(hasMasonicStepErrors(errors)).toBe(true);
  });

  it('normaliza CIMB e monta afiliação persistível', () => {
    expect(sanitizeCimb('abc.1234')).toBe('ABC1234');
    const persisted = toPersistedAffiliation({
      ...emptyMasonicAffiliation(),
      status: 'mason',
      isActive: true,
      cimbCode: 'abc.1234',
      lodgeName: '  Loja Luz do Oriente  ',
    });
    expect(persisted).toMatchObject({
      status: 'mason',
      isActive: true,
      cimbCode: 'ABC1234',
      lodgeName: 'Loja Luz do Oriente',
    });
    expect(MASONIC_STATUS_LABELS.mason).toContain('Irmão');
  });
});

describe('responsible-flow com vínculo maçônico', () => {
  it('persiste e recupera o rascunho com masonic', () => {
    const storage = makeStorage();
    saveResponsibleDraft(
      {
        name: 'Maria',
        email: 'maria@exemplo.com',
        relationship: 'representative',
        masonic: {
          status: 'demolay',
          isActive: false,
          cimbCode: '',
          lodgeName: '',
          chapterName: 'Capítulo Aurora',
          spouseMasonName: '',
        },
      },
      storage,
    );

    const loaded = loadResponsibleDraft(storage);
    expect(loaded?.masonic).toMatchObject({
      status: 'demolay',
      chapterName: 'Capítulo Aurora',
    });
  });

  it('mantém compatibilidade com rascunho antigo sem masonic', () => {
    const storage = makeStorage();
    storage.setItem(
      RESPONSIBLE_DRAFT_KEY,
      JSON.stringify({ name: 'João', email: 'j@x.com', relationship: 'owner' }),
    );
    const loaded = loadResponsibleDraft(storage);
    expect(loaded?.name).toBe('João');
    expect(loaded?.masonic).toBeNull();
  });
});

describe('masonic-affiliation-service', () => {
  it('faz upsert idempotente da afiliação do usuário', async () => {
    const { instance, table } = makeSupabase({
      upsert: async () => ({ error: null }),
    });
    const result = await upsertMasonicAffiliation(instance, {
      status: 'mason',
      isActive: true,
      cimbCode: 'abc.1234',
      lodgeName: 'Loja Luz do Oriente',
      chapterName: '',
      spouseMasonName: '',
    });

    expect(result).toEqual({ ok: true, error: null });
    expect(table.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        status: 'mason',
        is_active: true,
        cimb_code: 'ABC1234',
      }),
      { onConflict: 'user_id' },
    );
  });

  it('retorna erro em falha de sessão', async () => {
    const auth = { getUser: vi.fn(async () => ({ data: { user: null } })) };
    const instance = { auth, from: vi.fn() } as unknown as SupabaseClient<Database>;
    const result = await upsertMasonicAffiliation(instance, {
      status: 'mason',
      isActive: true,
      cimbCode: '123456',
      lodgeName: '',
      chapterName: '',
      spouseMasonName: '',
    });
    expect(result.ok).toBe(false);
  });

  it('carrega a afiliação persistida', async () => {
    const { instance } = makeSupabase({
      select: async () => ({
        data: {
          status: 'mason',
          is_active: true,
          cimb_code: 'ABC1234',
          lodge_name: 'Loja Luz do Oriente',
          chapter_name: null,
          spouse_mason_name: null,
        },
      }),
    });
    const loaded = await loadMasonicAffiliation(instance, 'user-1');
    expect(loaded?.status).toBe('mason');
    expect(loaded?.cimbCode).toBe('ABC1234');
    expect(loaded?.lodgeName).toBe('Loja Luz do Oriente');
  });
});
