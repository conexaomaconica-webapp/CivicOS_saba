import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => {
  return {
    createServerSideClient: vi.fn().mockImplementation(async () => {
      const mockSingleSurvey = vi.fn().mockResolvedValue({
        data: {
          id: 'survey-123',
          title: 'Conexão Maçônica • Perfil & Negócios',
          slug: 'perfil-e-negocios',
          description: 'Pesquisa institucional',
          status: 'published',
          current_version: 1,
        },
        error: null,
      });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'surveys') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'survey-123',
                    title: 'Conexão Maçônica • Perfil & Negócios',
                    slug: 'perfil-e-negocios',
                    status: 'published',
                    current_version: 1,
                  },
                ],
                error: null,
              }),
              eq: vi.fn().mockReturnValue({
                single: mockSingleSurvey,
                eq: vi.fn().mockReturnValue({
                  single: mockSingleSurvey,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }

        if (table === 'survey_blocks') {
          const blocksData = [
            { id: 'b1', title: 'BLOCO A — Perfil', order_index: 1, is_active: true },
            { id: 'b2', title: 'BLOCO B — Negócios', order_index: 2, is_active: true },
            { id: 'b3', title: 'BLOCO C — Interesse', order_index: 3, is_active: true },
          ];

          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: blocksData, error: null }),
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: blocksData, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }

        if (table === 'survey_questions') {
          const questionsData = [
            { id: 'q1', block_id: 'b1', question_text: 'Nome completo', question_type: 'short_text', is_required: true, is_active: true },
            { id: 'q2', block_id: 'b1', question_text: 'Possui empresa?', question_type: 'single_choice', is_required: true, is_active: true },
            { id: 'q3', block_id: 'b2', question_text: 'Nome da Empresa', question_type: 'short_text', is_required: true, is_active: true, conditional_rules: { depends_on_question_id: 'q2', expected_values: ['sim_propria'] } },
          ];

          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: questionsData, error: null }),
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: questionsData, error: null }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'q-new-99' }, error: null }),
              }),
            }),
          };
        }

        if (table === 'survey_options') {
          const optionsData = [
            { id: 'opt1', question_id: 'q2', label: 'Sim, empresa própria', value: 'sim_propria', is_active: true },
            { id: 'opt2', question_id: 'q2', label: 'Não possuo empresa', value: 'nao', is_active: true },
          ];

          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: optionsData, error: null }),
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: optionsData, error: null }),
                }),
              }),
            }),
          };
        }

        if (table === 'survey_responses') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'resp-uuid-1' }, error: null }),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: 'resp-uuid-1', version_number: 1 }],
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'survey_answers') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { id: 'ans1', response_id: 'resp-uuid-1', question_id: 'q1', answer_value: 'Ir. João Silva' },
                  { id: 'ans2', response_id: 'resp-uuid-1', question_id: 'q2', answer_value: 'sim_propria' },
                ],
                error: null,
              }),
            }),
          };
        }

        if (table === 'survey_versions') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingleSurvey }) }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      return { from: mockFrom };
    }),
  };
});

import {
  getAdminSurveysListAction,
  getAdminSurveyDetailAction,
  getPublicSurveyBySlugAction,
  validateQuestionDependencyAction,
  toggleQuestionActiveAction,
  publishSurveyVersionAction,
  submitSurveyResponseAction,
  getSurveyAnalyticsAction,
  updateSurveyDetailsAction,
} from '@/app/actions/surveys';

describe('Suíte de Testes Funcionais: Módulo de Pesquisas (Conexão Maçônica)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Deve listar pesquisas no painel administrativo', async () => {
    const res = await getAdminSurveysListAction();
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.length).toBeGreaterThan(0);
    expect(res.data?.[0].slug).toBe('perfil-e-negocios');
  });

  it('2. Deve carregar os detalhes e estrutura hierárquica para o Editor Visual', async () => {
    const res = await getAdminSurveyDetailAction('survey-123');
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.blocks).toBeDefined();
    expect(res.data?.blocks?.length).toBe(3);
    expect(res.data?.blocks?.[0].questions?.length).toBeGreaterThan(0);
  });

  it('3. Deve carregar formulário público apenas com blocos e perguntas ativas', async () => {
    const res = await getPublicSurveyBySlugAction('perfil-e-negocios');
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.slug).toBe('perfil-e-negocios');
  });

  it('4. Deve validar dependências condicionais antes de desativar uma pergunta usada por outra', async () => {
    const depCheck = await validateQuestionDependencyAction('survey-123', 'q2');
    expect(depCheck.hasDependencies).toBe(true);
    expect(depCheck.dependentQuestions).toContain('Nome da Empresa');
    expect(depCheck.warningMessage).toContain('possui regra condicional');
  });

  it('5. Deve permitir alterar visibilidade (soft toggle) de pergunta sem dependências ativas', async () => {
    const res = await toggleQuestionActiveAction('survey-123', 'q1', false);
    expect(res.success).toBe(true);
  });

  it('6. Deve publicar nova versão criando snapshot sem corromper respostas históricas', async () => {
    const res = await publishSurveyVersionAction('survey-123');
    expect(res.success).toBe(true);
    expect(res.versionNumber).toBe(2);
  });

  it('7. Deve registrar submissão pública anônima com separação de consentimentos (LGPD)', async () => {
    const res = await submitSurveyResponseAction({
      survey_id: 'survey-123',
      version_number: 1,
      respondent_name: 'Ir. Fernando Souza',
      respondent_email: 'fernando@loja.org.br',
      consent_research: true,
      consent_commercial: false,
      answers: [
        { question_id: 'q1', answer_value: 'Ir. Fernando Souza' },
        { question_id: 'q2', answer_value: 'sim_propria' },
      ],
    });

    expect(res.success).toBe(true);
    expect(res.responseId).toBe('resp-uuid-1');
  });

  it('8. Deve consolidar analytics e estatísticas por versão de pesquisa', async () => {
    const res = await getSurveyAnalyticsAction('survey-123', 1);
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.total_responses).toBe(1);
    expect(res.data?.block_summaries.length).toBe(3);
  });

  it('9. Deve atualizar título, descrição e incluir a logomarca da Conexão Maçônica', async () => {
    const res = await updateSurveyDetailsAction('survey-123', {
      title: 'Censo e Diagnóstico Oficial 2026',
      description: 'Pesquisa detalhada com a rede de membros',
      logo_url: '/logoconexao_red.png',
      show_logo: true,
    });
    expect(res.success).toBe(true);
  });
});
