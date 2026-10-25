import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitEntreColunasSurveyAction } from '@/app/actions/entrecolunas-survey';
import * as surveyActions from '@/app/actions/surveys';
import * as supabaseServer from '@/lib/supabase/server';

vi.mock('@/app/actions/surveys', () => ({
  getPublicSurveyBySlugAction: vi.fn(),
  submitSurveyResponseAction: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  resolveTenantIdServer: vi.fn().mockResolvedValue('tenant-conexao-001'),
  createServerSideClient: vi.fn(),
}));

describe('ETAPA 1G-C — submitEntreColunasSurveyAction (Hardening e Validação)', () => {
  const mockPublishedSurvey = {
    id: 'survey-entrecolunas-id',
    title: 'Entre Colunas · Pesquisa de Opinião e Interesse',
    slug: 'entrecolunas',
    tenant_id: 'tenant-conexao-001',
    status: 'published',
    current_version: 1,
    blocks: [
      {
        id: 'block-1',
        title: 'Perguntas de Pré-Lançamento',
        is_active: true,
        questions: [
          {
            id: 'q-vinculo',
            question_text: 'Qual é o seu vínculo com a Maçonaria?',
            question_type: 'single_choice',
            is_active: true,
            options: [
              { id: 'opt-v1', label: 'Irmão', value: 'irmao', is_active: true },
              { id: 'opt-v2', label: 'Cunhada', value: 'cunhada', is_active: true },
              { id: 'opt-v3', label: 'Familiar', value: 'familiar', is_active: true },
            ],
          },
          {
            id: 'q-intencao',
            question_text: 'Como você pretende utilizar a Conexão Maçônica?',
            question_type: 'single_choice',
            is_active: true,
            options: [
              { id: 'opt-i1', label: 'Para encontrar produtos e serviços', value: 'encontrar', is_active: true },
              { id: 'opt-i2', label: 'Para divulgar minha empresa ou atuação profissional', value: 'divulgar', is_active: true },
              { id: 'opt-i3', label: 'Para as duas possibilidades', value: 'ambas', is_active: true },
            ],
          },
          {
            id: 'q-categorias',
            question_text: 'Quais produtos ou serviços você mais gostaria de encontrar?',
            question_type: 'multiple_choice',
            is_active: true,
            options: [
              { id: 'opt-c1', label: 'Saúde e bem-estar', value: 'saude_e_bem_estar', is_active: true },
              { id: 'opt-c2', label: 'Serviços profissionais', value: 'servicos_profissionais', is_active: true },
              { id: 'opt-c3', label: 'Alimentação', value: 'alimentacao', is_active: true },
            ],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(surveyActions.getPublicSurveyBySlugAction).mockResolvedValue({
      success: true,
      data: mockPublishedSurvey as any,
    });
    vi.mocked(surveyActions.submitSurveyResponseAction).mockResolvedValue({
      success: true,
      responseId: 'resp-uuid-123',
    });
  });

  describe('1. Validação de Tipos e Limites em Runtime', () => {
    it('deve rejeitar payload nulo, indefinido ou array', async () => {
      const resNull = await submitEntreColunasSurveyAction(null as any);
      expect(resNull.success).toBe(false);
      expect(resNull.error).toContain('Payload de dados inválido');

      const resArray = await submitEntreColunasSurveyAction([] as any);
      expect(resArray.success).toBe(false);
      expect(resArray.error).toContain('Payload de dados inválido');
    });

    it('deve rejeitar payload com propriedades inesperadas (mass assignment)', async () => {
      const res = await submitEntreColunasSurveyAction({
        vinculo: 'Irmão',
        intencao: 'Para as duas possibilidades',
        categorias: ['Alimentação'],
        admin_override: true,
        extra_field: 'malicious',
      } as any);

      expect(res.success).toBe(false);
      expect(res.error).toContain('Campo inesperado no formulário');
    });

    it('deve rejeitar vínculo vazio ou com excesso de caracteres', async () => {
      const resVazio = await submitEntreColunasSurveyAction({
        vinculo: '',
        intencao: 'Para encontrar produtos e serviços',
        categorias: [],
      });
      expect(resVazio.success).toBe(false);

      const resLongo = await submitEntreColunasSurveyAction({
        vinculo: 'a'.repeat(101),
        intencao: 'Para encontrar produtos e serviços',
        categorias: [],
      });
      expect(resLongo.success).toBe(false);
      expect(resLongo.error).toContain('Vínculo excede o limite');
    });

    it('deve rejeitar intenção com excesso de caracteres', async () => {
      const res = await submitEntreColunasSurveyAction({
        vinculo: 'Irmão',
        intencao: 'b'.repeat(151),
        categorias: [],
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Intenção excede o limite');
    });

    it('deve limitar quantidade máxima de categorias a 10', async () => {
      const res = await submitEntreColunasSurveyAction({
        vinculo: 'Irmão',
        intencao: 'Para encontrar produtos e serviços',
        categorias: Array.from({ length: 11 }, (_, i) => `Cat ${i}`),
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Permitido selecionar no máximo 10 categorias');
    });
  });

  describe('2. Validação Contra Opções Efetivamente Publicadas (Sem Fallback)', () => {
    it('deve rejeitar valor de vínculo que não existe nas opções da pesquisa', async () => {
      const res = await submitEntreColunasSurveyAction({
        vinculo: 'Outro Cargo Desconhecido',
        intencao: 'Para encontrar produtos e serviços',
        categorias: [],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Opção de vínculo não reconhecida');
      expect(surveyActions.submitSurveyResponseAction).not.toHaveBeenCalled();
    });

    it('deve rejeitar intenção que não existe nas opções da pesquisa', async () => {
      const res = await submitEntreColunasSurveyAction({
        vinculo: 'Irmão',
        intencao: 'Intenção arbitrária forjada',
        categorias: [],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Opção de intenção não reconhecida');
      expect(surveyActions.submitSurveyResponseAction).not.toHaveBeenCalled();
    });

    it('deve rejeitar categoria que não existe nas opções publicadas', async () => {
      const res = await submitEntreColunasSurveyAction({
        vinculo: 'Irmão',
        intencao: 'Para encontrar produtos e serviços',
        categorias: ['Categoria Não Existente'],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('não reconhecida na pesquisa publicada');
      expect(surveyActions.submitSurveyResponseAction).not.toHaveBeenCalled();
    });
  });

  describe('3. Isolamento Multi-Tenant Fail-Closed', () => {
    it('deve rejeitar submissão se a pesquisa pertencer a tenant divergente', async () => {
      vi.mocked(surveyActions.getPublicSurveyBySlugAction).mockResolvedValueOnce({
        success: true,
        data: {
          ...mockPublishedSurvey,
          tenant_id: 'outro-tenant-atacante',
        } as any,
      });

      const res = await submitEntreColunasSurveyAction({
        vinculo: 'Irmão',
        intencao: 'Para encontrar produtos e serviços',
        categorias: [],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Pesquisa não autorizada para o domínio acessado');
      expect(surveyActions.submitSurveyResponseAction).not.toHaveBeenCalled();
    });

    it('deve falhar de forma controlada se a pesquisa não for encontrada', async () => {
      vi.mocked(surveyActions.getPublicSurveyBySlugAction).mockResolvedValueOnce({
        success: false,
        error: 'Pesquisa não encontrada.',
      });

      const res = await submitEntreColunasSurveyAction({
        vinculo: 'Irmão',
        intencao: 'Para encontrar produtos e serviços',
        categorias: [],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Pesquisa indisponível ou não encontrada');
    });
  });

  describe('4. Consentimento e Privacidade (Sem Inferência Comercial)', () => {
    it('deve garantir consent_commercial = false mesmo quando a intenção cita divulgação ou ambas', async () => {
      const resDivulgar = await submitEntreColunasSurveyAction({
        vinculo: 'Irmão',
        intencao: 'Para divulgar minha empresa ou atuação profissional',
        categorias: [],
      });
      expect(resDivulgar.success).toBe(true);

      expect(surveyActions.submitSurveyResponseAction).toHaveBeenCalledWith(
        expect.objectContaining({
          consent_research: true,
          consent_commercial: false, // RIGOROSO: NUNCA inferir comercial sem opt-in
        })
      );

      const resAmbas = await submitEntreColunasSurveyAction({
        vinculo: 'Cunhada',
        intencao: 'Para as duas possibilidades',
        categorias: ['Alimentação'],
      });
      expect(resAmbas.success).toBe(true);

      expect(surveyActions.submitSurveyResponseAction).toHaveBeenLastCalledWith(
        expect.objectContaining({
          consent_research: true,
          consent_commercial: false,
        })
      );
    });
  });

  describe('5. Sucesso e Mapeamento de Valores Canônicos', () => {
    it('deve mapear labels ou values para os valores canônicos da pesquisa', async () => {
      const res = await submitEntreColunasSurveyAction({
        vinculo: 'Irmão',
        intencao: 'Para encontrar produtos e serviços',
        categorias: ['Saúde e bem-estar', 'alimentacao'],
      });

      expect(res.success).toBe(true);
      expect(surveyActions.submitSurveyResponseAction).toHaveBeenCalledWith(
        expect.objectContaining({
          survey_id: 'survey-entrecolunas-id',
          version_number: 1,
          answers: [
            { question_id: 'q-vinculo', answer_value: 'irmao' },
            { question_id: 'q-intencao', answer_value: 'encontrar' },
            {
              question_id: 'q-categorias',
              selected_options: ['saude_e_bem_estar', 'alimentacao'],
            },
          ],
        })
      );
    });
  });
});
