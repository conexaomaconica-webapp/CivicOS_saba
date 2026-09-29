'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  Survey,
  SurveyBlock,
  SurveyQuestion,
  SurveyResponseSubmission,
  SurveyAnalyticsSummary,
} from '@/types/surveys';

/**
 * Busca todas as pesquisas cadastradas para o painel administrativo.
 */
export async function getAdminSurveysListAction() {
  try {
    const supabase = await createServerSideClient();
    const { data, error } = await (supabase as any)
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: (data as Survey[]) || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao carregar lista de pesquisas.' };
  }
}

/**
 * Carrega a estrutura completa de uma pesquisa para o Editor Visual Administrativo.
 */
export async function getAdminSurveyDetailAction(surveyId: string) {
  try {
    const supabase = await createServerSideClient();

    // 1. Pesquisa
    const { data: survey, error: sErr } = await (supabase as any)
      .from('surveys')
      .select('*')
      .eq('id', surveyId)
      .single();

    if (sErr || !survey) throw new Error('Pesquisa não encontrada.');

    // 2. Blocos
    const { data: blocks, error: bErr } = await (supabase as any)
      .from('survey_blocks')
      .select('*')
      .eq('survey_id', surveyId)
      .order('order_index', { ascending: true });

    if (bErr) throw bErr;

    // 3. Perguntas
    const blockIds = (blocks || []).map((b: any) => b.id);
    let questions: any[] = [];
    if (blockIds.length > 0) {
      const { data: qData, error: qErr } = await (supabase as any)
        .from('survey_questions')
        .select('*')
        .in('block_id', blockIds)
        .order('order_index', { ascending: true });
      if (qErr) throw qErr;
      questions = qData || [];
    }

    // 4. Opções
    const questionIds = questions.map((q) => q.id);
    let options: any[] = [];
    if (questionIds.length > 0) {
      const { data: oData, error: oErr } = await (supabase as any)
        .from('survey_options')
        .select('*')
        .in('question_id', questionIds)
        .order('order_index', { ascending: true });
      if (oErr) throw oErr;
      options = oData || [];
    }

    // Monta hierarquia
    const fullBlocks: SurveyBlock[] = (blocks || []).map((block: any) => {
      const blockQuestions: SurveyQuestion[] = questions
        .filter((q) => q.block_id === block.id)
        .map((q) => ({
          ...q,
          options: options.filter((o) => o.question_id === q.id),
        }));

      return {
        ...block,
        questions: blockQuestions,
      };
    });

    return {
      success: true,
      data: {
        ...(survey as Survey),
        blocks: fullBlocks,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao carregar detalhes da pesquisa.' };
  }
}

/**
 * Busca pesquisa ativa e publicada para o formulário público pelo slug.
 */
export async function getPublicSurveyBySlugAction(slug: string) {
  try {
    const supabase = await createServerSideClient();

    const { data: survey, error: sErr } = await (supabase as any)
      .from('surveys')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (sErr || !survey) return { success: false, error: 'Pesquisa não encontrada ou indisponível.' };

    const { data: blocks, error: bErr } = await (supabase as any)
      .from('survey_blocks')
      .select('*')
      .eq('survey_id', survey.id)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (bErr) throw bErr;

    const blockIds = (blocks || []).map((b: any) => b.id);
    let questions: any[] = [];
    if (blockIds.length > 0) {
      const { data: qData, error: qErr } = await (supabase as any)
        .from('survey_questions')
        .select('*')
        .in('block_id', blockIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      if (qErr) throw qErr;
      questions = qData || [];
    }

    const questionIds = questions.map((q) => q.id);
    let options: any[] = [];
    if (questionIds.length > 0) {
      const { data: oData, error: oErr } = await (supabase as any)
        .from('survey_options')
        .select('*')
        .in('question_id', questionIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      if (oErr) throw oErr;
      options = oData || [];
    }

    const fullBlocks: SurveyBlock[] = (blocks || []).map((block: any) => ({
      ...block,
      questions: questions
        .filter((q) => q.block_id === block.id)
        .map((q) => ({
          ...q,
          options: options.filter((o) => o.question_id === q.id),
        })),
    }));

    return {
      success: true,
      data: {
        ...(survey as Survey),
        blocks: fullBlocks,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao carregar formulário público.' };
  }
}

/**
 * Valida dependências condicionais antes de ocultar ou desativar uma pergunta.
 */
export async function validateQuestionDependencyAction(surveyId: string, questionIdToDeactivate: string) {
  try {
    const detailRes = await getAdminSurveyDetailAction(surveyId);
    if (!detailRes.success || !detailRes.data) throw new Error(detailRes.error);

    const allQuestions = (detailRes.data.blocks || []).flatMap((b) => b.questions || []);

    const dependentQuestions = allQuestions.filter((q) => {
      if (!q.is_active || q.id === questionIdToDeactivate) return false;
      const rules = q.conditional_rules as any;
      return rules?.depends_on_question_id === questionIdToDeactivate;
    });

    if (dependentQuestions.length > 0) {
      return {
        hasDependencies: true,
        dependentQuestions: dependentQuestions.map((q) => q.question_text),
        warningMessage: `Atenção: A pergunta "${dependentQuestions[0]?.question_text || ''}" possui regra condicional baseada nesta pergunta. Desativá-la poderá afetar o fluxo do questionário.`,
      };
    }

    return { hasDependencies: false, dependentQuestions: [], warningMessage: null };
  } catch (err: any) {
    return { hasDependencies: false, dependentQuestions: [], warningMessage: err.message };
  }
}

/**
 * Ativa ou desativa uma pergunta individualmente (Soft Toggle).
 */
export async function toggleQuestionActiveAction(surveyId: string, questionId: string, isActive: boolean) {
  try {
    const supabase = await createServerSideClient();

    if (!isActive) {
      const depCheck = await validateQuestionDependencyAction(surveyId, questionId);
      if (depCheck.hasDependencies) {
        return {
          success: false,
          warningMessage: depCheck.warningMessage,
          dependentQuestions: depCheck.dependentQuestions,
        };
      }
    }

    const { error } = await (supabase as any)
      .from('survey_questions')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', questionId);

    if (error) throw error;

    revalidatePath(`/admin/pesquisas/${surveyId}/editor`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao alterar status da pergunta.' };
  }
}

/**
 * Publica uma nova versão da pesquisa, salvando o snapshot completo.
 */
export async function publishSurveyVersionAction(surveyId: string) {
  try {
    const supabase = await createServerSideClient();

    const detailRes = await getAdminSurveyDetailAction(surveyId);
    if (!detailRes.success || !detailRes.data) throw new Error(detailRes.error);

    const survey = detailRes.data;
    const nextVersion = (survey.current_version || 1) + 1;

    const schemaSnapshot = {
      version: nextVersion,
      published_at: new Date().toISOString(),
      survey_title: survey.title,
      blocks: survey.blocks,
    };

    const { error: vErr } = await (supabase as any).from('survey_versions').insert({
      survey_id: surveyId,
      version_number: nextVersion,
      status: 'published',
      published_at: new Date().toISOString(),
      schema_snapshot: schemaSnapshot,
    });

    if (vErr) throw vErr;

    const { error: sErr } = await (supabase as any)
      .from('surveys')
      .update({
        current_version: nextVersion,
        status: 'published',
        updated_at: new Date().toISOString(),
      })
      .eq('id', surveyId);

    if (sErr) throw sErr;

    revalidatePath(`/admin/pesquisas/${surveyId}/editor`);
    revalidatePath(`/pesquisas/${survey.slug}`);
    return { success: true, versionNumber: nextVersion };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao publicar nova versão.' };
  }
}

/**
 * Submete resposta do formulário público.
 */
export async function submitSurveyResponseAction(payload: SurveyResponseSubmission) {
  try {
    const supabase = await createServerSideClient();

    const { data: resp, error: rErr } = await (supabase as any)
      .from('survey_responses')
      .insert({
        survey_id: payload.survey_id,
        version_number: payload.version_number,
        user_id: payload.user_id || null,
        business_id: payload.business_id || null,
        respondent_email: payload.respondent_email || null,
        respondent_name: payload.respondent_name || null,
        consent_research: payload.consent_research ?? true,
        consent_commercial: payload.consent_commercial ?? false,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (rErr || !resp) throw new Error('Erro ao registrar resposta principal.');

    const answersToInsert = payload.answers.map((ans) => ({
      response_id: resp.id,
      question_id: ans.question_id,
      answer_value: ans.answer_value || null,
      selected_options: ans.selected_options || [],
      other_text: ans.other_text || null,
    }));

    if (answersToInsert.length > 0) {
      const { error: aErr } = await (supabase as any).from('survey_answers').insert(answersToInsert);
      if (aErr) throw aErr;
    }

    return { success: true, responseId: resp.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao enviar respostas.' };
  }
}

/**
 * Cria ou atualiza um bloco de pesquisa no rascunho.
 */
export async function saveSurveyBlockAction(
  surveyId: string,
  blockData: { id?: string; title: string; description?: string; order_index?: number; is_active?: boolean }
) {
  try {
    const supabase = await createServerSideClient();

    if (blockData.id) {
      const { error } = await (supabase as any)
        .from('survey_blocks')
        .update({
          title: blockData.title,
          description: blockData.description || null,
          is_active: blockData.is_active ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', blockData.id);
      if (error) throw error;
    } else {
      const { error } = await (supabase as any).from('survey_blocks').insert({
        survey_id: surveyId,
        title: blockData.title,
        description: blockData.description || null,
        order_index: blockData.order_index ?? 99,
        is_active: blockData.is_active ?? true,
      });
      if (error) throw error;
    }

    revalidatePath(`/admin/pesquisas/${surveyId}/editor`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao salvar bloco.' };
  }
}

/**
 * Cria ou atualiza uma pergunta e suas opções no rascunho.
 */
export async function saveSurveyQuestionAction(
  surveyId: string,
  questionData: {
    id?: string;
    block_id: string;
    question_text: string;
    help_text?: string;
    question_type: string;
    is_required?: boolean;
    is_active?: boolean;
    allow_other?: boolean;
    conditional_rules?: any;
    options?: Array<{ id?: string; label: string; value: string; order_index?: number }>;
  }
) {
  try {
    const supabase = await createServerSideClient();

    let questionId = questionData.id;

    if (questionId) {
      const { error } = await (supabase as any)
        .from('survey_questions')
        .update({
          block_id: questionData.block_id,
          question_text: questionData.question_text,
          help_text: questionData.help_text || null,
          question_type: questionData.question_type,
          is_required: questionData.is_required ?? false,
          is_active: questionData.is_active ?? true,
          allow_other: questionData.allow_other ?? false,
          conditional_rules: questionData.conditional_rules || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', questionId);
      if (error) throw error;
    } else {
      const { data: newQ, error } = await (supabase as any)
        .from('survey_questions')
        .insert({
          block_id: questionData.block_id,
          question_text: questionData.question_text,
          help_text: questionData.help_text || null,
          question_type: questionData.question_type,
          order_index: 99,
          is_required: questionData.is_required ?? false,
          is_active: questionData.is_active ?? true,
          allow_other: questionData.allow_other ?? false,
          conditional_rules: questionData.conditional_rules || null,
        })
        .select('id')
        .single();
      if (error || !newQ) throw error || new Error('Erro ao criar pergunta.');
      questionId = newQ.id;
    }

    // Atualiza opções se for tipo de escolha
    if (
      questionData.options &&
      ['single_choice', 'multiple_choice', 'dropdown'].includes(questionData.question_type)
    ) {
      // Remove opções existentes não presentes na lista
      const newOptionIds = questionData.options.map((o) => o.id).filter(Boolean);
      if (questionData.id) {
        if (newOptionIds.length > 0) {
          await (supabase as any)
            .from('survey_options')
            .delete()
            .eq('question_id', questionId)
            .not('id', 'in', `(${newOptionIds.join(',')})`);
        } else {
          await (supabase as any).from('survey_options').delete().eq('question_id', questionId);
        }
      }

      // Insere ou atualiza opções
      for (let i = 0; i < questionData.options.length; i++) {
        const opt = questionData.options[i];
        if (!opt) continue;
        if (opt.id) {
          await (supabase as any)
            .from('survey_options')
            .update({
              label: opt.label,
              value: opt.value || opt.label.toLowerCase().replace(/\s+/g, '_'),
              order_index: i + 1,
            })
            .eq('id', opt.id);
        } else {
          await (supabase as any).from('survey_options').insert({
            question_id: questionId,
            label: opt.label,
            value: opt.value || opt.label.toLowerCase().replace(/\s+/g, '_'),
            order_index: i + 1,
            is_active: true,
          });
        }
      }
    }

    revalidatePath(`/admin/pesquisas/${surveyId}/editor`);
    return { success: true, questionId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao salvar pergunta.' };
  }
}

/**
 * Exclui ou oculta uma pergunta.
 */
export async function deleteSurveyQuestionAction(surveyId: string, questionId: string) {
  try {
    const supabase = await createServerSideClient();

    // Soft disable em vez de apagar se houver respostas
    const { error } = await (supabase as any)
      .from('survey_questions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', questionId);

    if (error) throw error;

    revalidatePath(`/admin/pesquisas/${surveyId}/editor`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir/ocultar pergunta.' };
  }
}

/**
 * Retorna dados consolidados para o Dashboard de Respostas/Analytics da Pesquisa.
 */
export async function getSurveyAnalyticsAction(surveyId: string, versionNumber?: number) {
  try {
    const supabase = await createServerSideClient();

    const detailRes = await getAdminSurveyDetailAction(surveyId);
    if (!detailRes.success || !detailRes.data) throw new Error(detailRes.error);

    const survey = detailRes.data;

    let query = (supabase as any).from('survey_responses').select('id, version_number').eq('survey_id', surveyId);
    if (versionNumber) {
      query = query.eq('version_number', versionNumber);
    }
    const { data: responses, error: rErr } = await query;
    if (rErr) throw rErr;

    const totalResponses = responses?.length || 0;
    const responseIds = (responses || []).map((r: any) => r.id);

    let answers: any[] = [];
    if (responseIds.length > 0) {
      const { data: aData, error: aErr } = await (supabase as any)
        .from('survey_answers')
        .select('*')
        .in('response_id', responseIds);
      if (aErr) throw aErr;
      answers = aData || [];
    }

    const blockSummaries = (survey.blocks || []).map((block) => {
      const questionSummaries = (block.questions || []).map((q) => {
        const qAnswers = answers.filter((a) => a.question_id === q.id);
        const totalAnswers = qAnswers.length;

        const optionCounts: Record<string, number> = {};
        let ratingSum = 0;
        let ratingCount = 0;
        const textSamples: string[] = [];

        qAnswers.forEach((ans) => {
          if (q.question_type === 'single_choice' || q.question_type === 'dropdown' || q.question_type === 'boolean') {
            if (ans.answer_value) {
              optionCounts[ans.answer_value] = (optionCounts[ans.answer_value] || 0) + 1;
            }
          } else if (q.question_type === 'multiple_choice') {
            const selected = (ans.selected_options as string[]) || [];
            selected.forEach((opt) => {
              optionCounts[opt] = (optionCounts[opt] || 0) + 1;
            });
          } else if (q.question_type === 'rating') {
            const num = parseFloat(ans.answer_value || '0');
            if (!isNaN(num) && num > 0) {
              ratingSum += num;
              ratingCount++;
            }
          } else if (q.question_type === 'short_text' || q.question_type === 'long_text') {
            if (ans.answer_value && textSamples.length < 5) {
              textSamples.push(ans.answer_value);
            }
          }
        });

        return {
          question_id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          total_answers: totalAnswers,
          option_counts: optionCounts,
          text_samples: textSamples,
          average_rating: ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(1)) : 0,
        };
      });

      return {
        block_id: block.id,
        title: block.title,
        question_summaries: questionSummaries,
      };
    });

    const summary: SurveyAnalyticsSummary = {
      survey_id: surveyId,
      total_responses: totalResponses,
      version_number: versionNumber || survey.current_version,
      block_summaries: blockSummaries,
    };

    return { success: true, data: summary };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao gerar indicadores do dashboard.' };
  }
}

/**
 * Cria uma nova pesquisa administrativa com estrutura inicial.
 */
export async function createSurveyAction(payload: {
  title: string;
  description?: string;
  slug?: string;
}) {
  try {
    const supabase = await createServerSideClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return { success: false, error: 'Acesso não autenticado.' };
    }

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('tenant_id')
      .eq('id', authData.user.id)
      .maybeSingle();

    const tenantId = profile?.tenant_id || '00000000-0000-0000-0000-000000000010';

    const rawSlug = payload.slug || payload.title;
    const cleanSlug = rawSlug
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString().slice(-4);

    // 1. Criar Pesquisa
    const { data: survey, error: sErr } = await (supabase as any)
      .from('surveys')
      .insert({
        tenant_id: tenantId,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        slug: cleanSlug,
        status: 'draft',
        current_version: 1,
        created_by: authData.user.id,
      })
      .select('*')
      .single();

    if (sErr) throw sErr;

    // 2. Criar Versão Inicial (v1)
    await (supabase as any).from('survey_versions').insert({
      survey_id: survey.id,
      version_number: 1,
      status: 'draft',
      schema_snapshot: {},
    });

    // 3. Criar Bloco Padrão Inicial
    await (supabase as any).from('survey_blocks').insert({
      survey_id: survey.id,
      title: 'Seção 1: Perguntas Principais',
      description: 'Preencha as informações solicitadas abaixo.',
      order_index: 0,
      is_active: true,
    });

    return { success: true, data: survey };
  } catch (err: any) {
    console.error('Erro ao criar pesquisa:', err);
    return { success: false, error: err.message || 'Erro ao criar pesquisa.' };
  }
}

/**
 * Atualiza status da pesquisa (draft, published, archived).
 */
export async function toggleSurveyStatusAction(
  surveyId: string,
  status: 'draft' | 'published' | 'archived'
) {
  try {
    const supabase = await createServerSideClient();
    const { error } = await (supabase as any)
      .from('surveys')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', surveyId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar status da pesquisa.' };
  }
}

/**
 * Atualiza título, descrição ou slug da pesquisa.
 */
export async function updateSurveyDetailsAction(
  surveyId: string,
  payload: { title: string; description?: string; slug?: string }
) {
  try {
    const supabase = await createServerSideClient();
    const updateData: Record<string, any> = {
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (payload.slug) {
      updateData.slug = payload.slug
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    const { error } = await (supabase as any)
      .from('surveys')
      .update(updateData)
      .eq('id', surveyId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar dados da pesquisa.' };
  }
}

/**
 * Exclui uma pesquisa permanentemente.
 */
export async function deleteSurveyAction(surveyId: string) {
  try {
    const supabase = await createServerSideClient();
    const { error } = await (supabase as any)
      .from('surveys')
      .delete()
      .eq('id', surveyId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir pesquisa.' };
  }
}

