'use server';

import { getPublicSurveyBySlugAction, submitSurveyResponseAction } from '@/app/actions/surveys';
import { resolveTenantIdServer } from '@/lib/supabase/server';

export interface EntreColunasSurveyPayload {
  vinculo: string;
  intencao: string;
  categorias: string[];
}

const MAX_VINCULO_LENGTH = 100;
const MAX_INTENCAO_LENGTH = 150;
const MAX_CATEGORIA_STRING_LENGTH = 100;
const MAX_CATEGORIAS_COUNT = 10;
const ALLOWED_PAYLOAD_KEYS = new Set(['vinculo', 'intencao', 'categorias']);

/**
 * Validação rigorosa em runtime do payload enviado pelo visitante.
 */
function validateSurveyPayloadRuntime(payload: unknown): {
  valid: boolean;
  error?: string;
  sanitized?: EntreColunasSurveyPayload;
} {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Payload de dados inválido.' };
  }

  const rawObj = payload as Record<string, unknown>;

  // Rejeita propriedades inesperadas
  for (const key of Object.keys(rawObj)) {
    if (!ALLOWED_PAYLOAD_KEYS.has(key)) {
      return { valid: false, error: `Campo inesperado no formulário: ${key}` };
    }
  }

  // Validação de vínculo
  if (typeof rawObj.vinculo !== 'string' || !rawObj.vinculo.trim()) {
    return { valid: false, error: 'Selecione o seu vínculo com a Maçonaria.' };
  }
  const vinculoTrimmed = rawObj.vinculo.trim();
  if (vinculoTrimmed.length > MAX_VINCULO_LENGTH) {
    return { valid: false, error: 'Vínculo excede o limite permitido de caracteres.' };
  }

  // Validação de intenção
  if (typeof rawObj.intencao !== 'string' || !rawObj.intencao.trim()) {
    return { valid: false, error: 'Selecione a sua intenção de uso da plataforma.' };
  }
  const intencaoTrimmed = rawObj.intencao.trim();
  if (intencaoTrimmed.length > MAX_INTENCAO_LENGTH) {
    return { valid: false, error: 'Intenção excede o limite permitido de caracteres.' };
  }

  // Validação de categorias
  if (!Array.isArray(rawObj.categorias)) {
    return { valid: false, error: 'Formato de categorias inválido.' };
  }
  if (rawObj.categorias.length > MAX_CATEGORIAS_COUNT) {
    return { valid: false, error: `Permitido selecionar no máximo ${MAX_CATEGORIAS_COUNT} categorias.` };
  }

  const seenCategories = new Set<string>();
  const sanitizedCategorias: string[] = [];

  for (const cat of rawObj.categorias) {
    if (typeof cat !== 'string' || !cat.trim()) {
      return { valid: false, error: 'Categoria inválida fornecida.' };
    }
    const catTrimmed = cat.trim();
    if (catTrimmed.length > MAX_CATEGORIA_STRING_LENGTH) {
      return { valid: false, error: 'Nome de categoria excede o tamanho máximo permitido.' };
    }
    if (!seenCategories.has(catTrimmed)) {
      seenCategories.add(catTrimmed);
      sanitizedCategorias.push(catTrimmed);
    }
  }

  return {
    valid: true,
    sanitized: {
      vinculo: vinculoTrimmed,
      intencao: intencaoTrimmed,
      categorias: sanitizedCategorias,
    },
  };
}

export async function submitEntreColunasSurveyAction(payload: EntreColunasSurveyPayload) {
  try {
    // 1. Validação estrita de tipos e limites em runtime
    const validation = validateSurveyPayloadRuntime(payload);
    if (!validation.valid || !validation.sanitized) {
      return {
        success: false,
        error: validation.error || 'Dados fornecidos são inválidos.',
      };
    }

    const { vinculo, intencao, categorias } = validation.sanitized;

    // 2. Resolução segura de tenant (fail-closed)
    let tenantId: string | null = null;
    try {
      tenantId = await resolveTenantIdServer();
    } catch {
      tenantId = null;
    }

    // 3. Busca da pesquisa publicada
    const surveyRes = await getPublicSurveyBySlugAction('entrecolunas');
    if (!surveyRes.success || !surveyRes.data) {
      return {
        success: false,
        error: 'Pesquisa indisponível ou não encontrada.',
      };
    }

    const survey = surveyRes.data;

    // Isolamento: se a pesquisa tiver tenant_id definido, deve coincidir com o tenant operacional
    if (survey.tenant_id && tenantId && survey.tenant_id !== tenantId) {
      return {
        success: false,
        error: 'Pesquisa não autorizada para o domínio acessado.',
      };
    }

    // 4. Coleta e validação das perguntas contra a estrutura publicada
    const activeQuestions = (survey.blocks || [])
      .filter((b) => b.is_active !== false)
      .flatMap((b) => b.questions || [])
      .filter((q) => q.is_active !== false);

    // Pergunta de Vínculo: deve ser single_choice e conter a opção indicada
    let matchedVinculoQuestion: typeof activeQuestions[0] | null = null;
    let matchedVinculoOptionValue: string | null = null;

    for (const q of activeQuestions) {
      if (q.question_type !== 'single_choice' && q.question_type !== 'dropdown') continue;
      const opt = (q.options || []).find(
        (o) =>
          o.is_active !== false &&
          (o.value === vinculo || o.label.toLowerCase() === vinculo.toLowerCase())
      );
      if (opt) {
        matchedVinculoQuestion = q;
        matchedVinculoOptionValue = opt.value;
        break;
      }
    }

    if (!matchedVinculoQuestion || !matchedVinculoOptionValue) {
      return {
        success: false,
        error: 'Opção de vínculo não reconhecida na pesquisa publicada.',
      };
    }

    // Pergunta de Intenção: deve ser single_choice e conter a opção indicada
    let matchedIntencaoQuestion: typeof activeQuestions[0] | null = null;
    let matchedIntencaoOptionValue: string | null = null;

    for (const q of activeQuestions) {
      if (q.id === matchedVinculoQuestion.id) continue;
      if (q.question_type !== 'single_choice' && q.question_type !== 'dropdown') continue;
      const opt = (q.options || []).find(
        (o) =>
          o.is_active !== false &&
          (o.value === intencao || o.label.toLowerCase() === intencao.toLowerCase())
      );
      if (opt) {
        matchedIntencaoQuestion = q;
        matchedIntencaoOptionValue = opt.value;
        break;
      }
    }

    if (!matchedIntencaoQuestion || !matchedIntencaoOptionValue) {
      return {
        success: false,
        error: 'Opção de intenção não reconhecida na pesquisa publicada.',
      };
    }

    // Pergunta de Categorias: deve ser multiple_choice
    const answers: Array<{
      question_id: string;
      answer_value?: string;
      selected_options?: string[];
    }> = [
      {
        question_id: matchedVinculoQuestion.id,
        answer_value: matchedVinculoOptionValue,
      },
      {
        question_id: matchedIntencaoQuestion.id,
        answer_value: matchedIntencaoOptionValue,
      },
    ];

    if (categorias.length > 0) {
      const qCategorias = activeQuestions.find(
        (q) =>
          q.id !== matchedVinculoQuestion.id &&
          q.id !== matchedIntencaoQuestion.id &&
          q.question_type === 'multiple_choice'
      );

      if (!qCategorias) {
        return {
          success: false,
          error: 'Pergunta de categorias não encontrada na pesquisa publicada.',
        };
      }

      const validatedOptionValues: string[] = [];

      for (const cat of categorias) {
        const opt = (qCategorias.options || []).find(
          (o) =>
            o.is_active !== false &&
            (o.value === cat || o.label.toLowerCase() === cat.toLowerCase())
        );

        if (!opt) {
          return {
            success: false,
            error: `Categoria "${cat}" não reconhecida na pesquisa publicada.`,
          };
        }

        validatedOptionValues.push(opt.value);
      }

      answers.push({
        question_id: qCategorias.id,
        selected_options: validatedOptionValues,
      });
    }

    // 5. Consentimento e Privacidade:
    // - consent_research: true (participação voluntária expressa ao enviar o formulário)
    // - consent_commercial: false (NUNCA inferido da intenção; sem opt-in comercial explícito)
    const res = await submitSurveyResponseAction({
      survey_id: survey.id,
      version_number: survey.current_version || 1,
      consent_research: true,
      consent_commercial: false,
      answers,
    });

    if (!res.success) {
      return {
        success: false,
        error: 'Não foi possível registrar suas respostas. Tente novamente mais tarde.',
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[submitEntreColunasSurveyAction] Falha controlada ao submeter respostas:', err?.message || err);
    return {
      success: false,
      error: 'Ocorreu um erro ao processar sua resposta. Por favor, tente novamente.',
    };
  }
}
