import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock tenant resolution
vi.mock('@/lib/tenant/tenant-policy', () => ({
  resolveRequestOperationalTenantId: vi.fn().mockResolvedValue('11111111-1111-1111-1111-111111111111'),
  getRequestHost: vi.fn().mockResolvedValue('conexaomaconica.com.br'),
  resolveStrictDomainTenantId: vi.fn().mockResolvedValue('11111111-1111-1111-1111-111111111111'),
}));

// Estados de contexto configuráveis por teste
let currentMockUser: { id: string } | null = null;
let currentMockAuthError: Error | null = null;
let currentMockProfile: {
  id: string;
  role: string;
  status: string;
  tenant_id: string | null;
} | null = null;
let currentMockSurvey: {
  id: string;
  tenant_id: string | null;
  title: string;
  slug: string;
  status: string;
  current_version: number;
} | null = null;

const spiedMutaions = {
  surveyDelete: vi.fn(),
  surveyUpdate: vi.fn(),
  surveyInsert: vi.fn(),
  questionUpdate: vi.fn(),
  questionDelete: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => {
  return {
    createServerSideClient: vi.fn().mockImplementation(async () => {
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockImplementation(async () => ({
                  data: currentMockProfile,
                  error: null,
                })),
              }),
            }),
          };
        }

        if (table === 'surveys') {
          return {
            select: vi.fn().mockImplementation(() => {
              const chain: any = {
                order: vi.fn().mockResolvedValue({
                  data: currentMockSurvey ? [currentMockSurvey] : [],
                  error: null,
                }),
                eq: vi.fn().mockImplementation((col: string, val: any) => {
                  if (col === 'id') {
                    return {
                      single: vi.fn().mockResolvedValue({ data: currentMockSurvey, error: null }),
                      maybeSingle: vi.fn().mockResolvedValue({ data: currentMockSurvey, error: null }),
                    };
                  }
                  if (col === 'tenant_id') {
                    const match = currentMockSurvey && currentMockSurvey.tenant_id === val;
                    return {
                      order: vi.fn().mockResolvedValue({
                        data: match ? [currentMockSurvey] : [],
                        error: null,
                      }),
                    };
                  }
                  return chain;
                }),
                single: vi.fn().mockResolvedValue({ data: currentMockSurvey, error: null }),
                maybeSingle: vi.fn().mockResolvedValue({ data: currentMockSurvey, error: null }),
              };
              return chain;
            }),
            update: vi.fn().mockImplementation((data: any) => {
              spiedMutaions.surveyUpdate(data);
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
            delete: vi.fn().mockImplementation(() => {
              spiedMutaions.surveyDelete();
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
            insert: vi.fn().mockImplementation((data: any) => {
              spiedMutaions.surveyInsert(data);
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 's-new-1', ...data },
                    error: null,
                  }),
                }),
              };
            }),
          };
        }

        if (table === 'survey_blocks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [{ id: 'b1', title: 'Bloco 1', order_index: 0, is_active: true }],
                  error: null,
                }),
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'b1' },
                    error: null,
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }

        if (table === 'survey_questions') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [{ id: 'q1', block_id: 'b1', question_text: 'Pergunta 1', is_active: true }],
                  error: null,
                }),
              }),
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'q1',
                    block_id: 'b1',
                    survey_blocks: { survey_id: currentMockSurvey?.id || 's1' },
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockImplementation((data: any) => {
              spiedMutaions.questionUpdate(data);
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
            delete: vi.fn().mockImplementation(() => {
              spiedMutaions.questionDelete();
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
          };
        }

        if (table === 'survey_options') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }

        if (table === 'survey_versions') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        if (table === 'survey_responses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }

        if (table === 'survey_answers') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          };
        }

        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) }),
        };
      });

      return {
        from: mockFrom,
        auth: {
          getUser: vi.fn().mockImplementation(async () => {
            if (currentMockAuthError) {
              return { data: { user: null }, error: currentMockAuthError };
            }
            return { data: { user: currentMockUser }, error: null };
          }),
        },
      };
    }),
  };
});

import {
  getAdminSurveysListAction,
  getAdminSurveyDetailAction,
  deleteSurveyAction,
  toggleQuestionActiveAction,
  deleteSurveyQuestionAction,
  getSurveyAnalyticsAction,
  createSurveyAction,
} from '@/app/actions/surveys';

describe('Suíte de Segurança P0-01: Hardening e Guardas Administrativas (surveys.ts)', () => {
  const TENANT_A = '11111111-1111-1111-1111-111111111111';
  const TENANT_B = '22222222-2222-2222-2222-222222222222';
  const USER_ID = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
    spiedMutaions.surveyDelete.mockClear();
    spiedMutaions.surveyUpdate.mockClear();
    spiedMutaions.surveyInsert.mockClear();
    spiedMutaions.questionUpdate.mockClear();
    spiedMutaions.questionDelete.mockClear();

    currentMockUser = null;
    currentMockAuthError = null;
    currentMockProfile = null;
    currentMockSurvey = null;
  });

  it('1. Visitante anônimo: rejeita imediatamente sem autorização', async () => {
    currentMockUser = null; // Sem sessão

    const resList = await getAdminSurveysListAction();
    expect(resList.success).toBe(false);
    expect(resList.error).toBe('Acesso não autorizado.');

    const resDetail = await getAdminSurveyDetailAction('s1');
    expect(resDetail.success).toBe(false);
    expect(resDetail.error).toBe('Acesso não autorizado.');
  });

  it('2. Sessão inválida ou expirada: rejeita com erro seguro', async () => {
    currentMockUser = null;
    currentMockAuthError = new Error('JWT expired');

    const res = await getAdminSurveysListAction();
    expect(res.success).toBe(false);
    expect(res.error).toBe('Acesso não autorizado.');
  });

  it('3. Membro comum (role: "member"): rejeita operações administrativas', async () => {
    currentMockUser = { id: USER_ID };
    currentMockProfile = { id: USER_ID, role: 'member', status: 'active', tenant_id: TENANT_A };

    const res = await getAdminSurveysListAction();
    expect(res.success).toBe(false);
    expect(res.error).toBe('Acesso não autorizado.');
  });

  it('4. Anunciante sem privilégio (role: "anunciante"): rejeita operações', async () => {
    currentMockUser = { id: USER_ID };
    currentMockProfile = { id: USER_ID, role: 'anunciante', status: 'active', tenant_id: TENANT_A };

    const res = await getAdminSurveysListAction();
    expect(res.success).toBe(false);
    expect(res.error).toBe('Acesso não autorizado.');
  });

  it('5. Administrador de outro tenant: rejeita acesso a pesquisa de tenant divergente', async () => {
    currentMockUser = { id: USER_ID };
    currentMockProfile = { id: USER_ID, role: 'admin', status: 'active', tenant_id: TENANT_A };
    currentMockSurvey = {
      id: 'survey-b',
      tenant_id: TENANT_B, // Pertence ao Tenant B!
      title: 'Pesquisa Loja B',
      slug: 'pesquisa-b',
      status: 'published',
      current_version: 1,
    };

    const res = await getAdminSurveyDetailAction('survey-b');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Acesso não autorizado.');
  });

  it('6. Administrador legítimo do tenant (role: "admin"): autoriza acesso ao próprio tenant', async () => {
    currentMockUser = { id: USER_ID };
    currentMockProfile = { id: USER_ID, role: 'admin', status: 'active', tenant_id: TENANT_A };
    currentMockSurvey = {
      id: 'survey-a',
      tenant_id: TENANT_A, // Coincide com o tenant do admin!
      title: 'Pesquisa Loja A',
      slug: 'pesquisa-a',
      status: 'published',
      current_version: 1,
    };

    const res = await getAdminSurveyDetailAction('survey-a');
    expect(res.success).toBe(true);
    expect(res.data?.id).toBe('survey-a');
  });

  it('7. Sócio Admin (role: "socio_admin"): autoriza operações no próprio tenant', async () => {
    currentMockUser = { id: USER_ID };
    currentMockProfile = { id: USER_ID, role: 'socio_admin', status: 'active', tenant_id: TENANT_A };
    currentMockSurvey = {
      id: 'survey-a',
      tenant_id: TENANT_A,
      title: 'Pesquisa Loja A',
      slug: 'pesquisa-a',
      status: 'published',
      current_version: 1,
    };

    const res = await getAdminSurveyDetailAction('survey-a');
    expect(res.success).toBe(true);
  });

  it('8. Master com autorização global (role: "master"): acessa recursos de qualquer tenant', async () => {
    currentMockUser = { id: USER_ID };
    currentMockProfile = { id: USER_ID, role: 'master', status: 'active', tenant_id: TENANT_A };
    currentMockSurvey = {
      id: 'survey-b',
      tenant_id: TENANT_B, // Tenant diferente, mas o chamador é Master!
      title: 'Pesquisa Loja B',
      slug: 'pesquisa-b',
      status: 'published',
      current_version: 1,
    };

    const res = await getAdminSurveyDetailAction('survey-b');
    expect(res.success).toBe(true);
    expect(res.data?.id).toBe('survey-b');
  });

  it('9. Conta inativa ou suspensa (status: "inactive"): rejeita mesmo com role "master"', async () => {
    currentMockUser = { id: USER_ID };
    currentMockProfile = { id: USER_ID, role: 'master', status: 'inactive', tenant_id: TENANT_A };

    const res = await getAdminSurveysListAction();
    expect(res.success).toBe(false);
    expect(res.error).toBe('Acesso não autorizado.');
  });

  it('10. Tenant inexistente / sem tenant vinculado para admin não-global: rejeita', async () => {
    currentMockUser = { id: USER_ID };
    currentMockProfile = { id: USER_ID, role: 'admin', status: 'active', tenant_id: null };

    const res = await getAdminSurveysListAction();
    expect(res.success).toBe(false);
    expect(res.error).toBe('Acesso não autorizado.');
  });

  it('11. Tentativa de exclusão de pesquisa de outro tenant: bloqueia mutação', async () => {
    currentMockUser = { id: USER_ID };
    currentMockProfile = { id: USER_ID, role: 'admin', status: 'active', tenant_id: TENANT_A };
    currentMockSurvey = {
      id: 'survey-b',
      tenant_id: TENANT_B,
      title: 'Pesquisa Alheia',
      slug: 'pesquisa-alheia',
      status: 'published',
      current_version: 1,
    };

    const res = await deleteSurveyAction('survey-b');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Acesso não autorizado.');
    // Garante que a mutação no banco NÃO foi executada
    expect(spiedMutaions.surveyDelete).not.toHaveBeenCalled();
  });

  it('12. Tentativa de alteração de pergunta de outro tenant: bloqueia mutação', async () => {
    currentMockUser = { id: USER_ID };
    currentMockProfile = { id: USER_ID, role: 'admin', status: 'active', tenant_id: TENANT_A };
    currentMockSurvey = {
      id: 'survey-b',
      tenant_id: TENANT_B,
      title: 'Pesquisa Alheia',
      slug: 'pesquisa-alheia',
      status: 'published',
      current_version: 1,
    };

    const resToggle = await toggleQuestionActiveAction('survey-b', 'q1', false);
    expect(resToggle.success).toBe(false);
    expect(resToggle.error).toBe('Acesso não autorizado.');
    expect(spiedMutaions.questionUpdate).not.toHaveBeenCalled();

    const resDeleteQ = await deleteSurveyQuestionAction('survey-b', 'q1');
    expect(resDeleteQ.success).toBe(false);
    expect(resDeleteQ.error).toBe('Acesso não autorizado.');
    expect(spiedMutaions.questionDelete).not.toHaveBeenCalled();
  });

  it('13. Tentativa de consultar analytics sem autorização: rejeita', async () => {
    currentMockUser = { id: USER_ID };
    currentMockProfile = { id: USER_ID, role: 'member', status: 'active', tenant_id: TENANT_A };
    currentMockSurvey = {
      id: 's1',
      tenant_id: TENANT_A,
      title: 'Pesquisa 1',
      slug: 'p1',
      status: 'published',
      current_version: 1,
    };

    const res = await getSurveyAnalyticsAction('s1');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Acesso não autorizado.');
  });

  it('14. Falha na consulta de perfil (perfil não encontrado): fail-closed imediato', async () => {
    currentMockUser = { id: USER_ID };
    currentMockProfile = null; // Perfil não encontrado no banco

    const res = await getAdminSurveysListAction();
    expect(res.success).toBe(false);
    expect(res.error).toBe('Acesso não autorizado.');
  });

  it('15. Criação de pesquisa por admin de tenant: força tenant do criador', async () => {
    currentMockUser = { id: USER_ID };
    currentMockProfile = { id: USER_ID, role: 'admin', status: 'active', tenant_id: TENANT_A };

    const res = await createSurveyAction({
      title: 'Nova Pesquisa Tenant A',
    });

    expect(res.success).toBe(true);
    // Verifica que o insert recebeu tenant_id do criador e o user.id real
    expect(spiedMutaions.surveyInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: TENANT_A,
        created_by: USER_ID,
      })
    );
  });
});
