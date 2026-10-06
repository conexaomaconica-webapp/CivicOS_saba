'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { getQuestionChoices } from '@/lib/surveys/conditional';
import { resolveRequestOperationalTenantId } from '@/lib/tenant/tenant-policy';
import { dispatchNotification as dispatchNotificationAction } from '@/lib/notifications/notification-core';

// Destinatário dos avisos de nova resposta de pesquisa (equipe administrativa da Conexão).
const SURVEY_ADMIN_NOTIFICATION_EMAIL = 'conexaomaconica@gmail.com';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import type {
  Survey,
  SurveyBlock,
  SurveyQuestion,
  SurveyResponseSubmission,
  SurveyAnalyticsSummary,
} from '@/types/surveys';

/**
 * Retorna o cliente com acesso administrativo para gerenciar pesquisas com segurança RLS
 */
async function getSurveysAdminClient() {
  const supabase = await createServerSideClient();
  let user: any = null;
  try {
    const authRes = await supabase?.auth?.getUser?.();
    user = authRes?.data?.user || null;
  } catch {
    user = null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceRoleKey && !process.env.VITEST) {
    const admin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return { client: admin, user: user || { id: 'admin-service-role' } };
  }

  return { client: supabase, user: user || { id: '00000000-0000-0000-0000-000000000001' } };
}

/**
 * Busca todas as pesquisas cadastradas para o painel administrativo.
 */
export async function getAdminSurveysListAction() {
  try {
    const { client: supabase } = await getSurveysAdminClient();
    const { data, error } = await (supabase as any)
      .from('surveys')
      .select('*, survey_responses(count)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    const surveys = ((data as any[]) || []).map(({ survey_responses, ...survey }) => ({
      ...survey,
      response_count: survey_responses?.[0]?.count ?? 0,
    })) as Survey[];
    return { success: true, data: surveys };
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
    const { client: supabase } = await getSurveysAdminClient();

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
    const { client: supabase } = await getSurveysAdminClient();

    const detailRes = await getAdminSurveyDetailAction(surveyId);
    if (!detailRes.success || !detailRes.data) throw new Error(detailRes.error);

    const survey = detailRes.data;
    const nextVersion = (survey.current_version || 1) + 1;

    const schemaSnapshot = {
      version: nextVersion,
      published_at: new Date().toISOString(),
      survey_title: survey.title,
      logo_url: survey.logo_url,
      show_logo: survey.show_logo,
      header_color: survey.header_color,
      banner_url: survey.banner_url,
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

    // O id é gerado aqui e a inserção não pede retorno (sem .select): visitante anônimo
    // não consegue ler a própria resposta de volta, então o RETURNING seria bloqueado pela RLS.
    const responseId = crypto.randomUUID();
    const { error: rErr } = await (supabase as any)
      .from('survey_responses')
      .insert({
        id: responseId,
        survey_id: payload.survey_id,
        version_number: payload.version_number,
        user_id: payload.user_id || null,
        business_id: payload.business_id || null,
        respondent_email: payload.respondent_email || null,
        respondent_name: payload.respondent_name || null,
        consent_research: payload.consent_research ?? true,
        consent_commercial: payload.consent_commercial ?? false,
        completed_at: new Date().toISOString(),
      });

    if (rErr) {
      console.error('[submitSurveyResponseAction] insert survey_responses falhou:', {
        code: rErr.code,
        message: rErr.message,
        details: rErr.details,
        hint: rErr.hint,
      });
      throw new Error('Erro ao registrar resposta principal.');
    }

    const answersToInsert = payload.answers.map((ans) => ({
      response_id: responseId,
      question_id: ans.question_id,
      answer_value: ans.answer_value || null,
      selected_options: ans.selected_options || [],
      other_text: ans.other_text || null,
    }));

    if (answersToInsert.length > 0) {
      const { error: aErr } = await (supabase as any).from('survey_answers').insert(answersToInsert);
      if (aErr) throw aErr;
    }

    // Aviso à equipe. É best-effort: a resposta já foi gravada, então falha de envio não a desfaz.
    try {
      await dispatchNotificationAction({
        recipientEmail: SURVEY_ADMIN_NOTIFICATION_EMAIL,
        eventType: 'survey_response_received',
        title: 'Nova resposta de pesquisa',
        body: 'Uma nova resposta foi registrada em uma pesquisa publicada. Acesse o painel administrativo para visualizá-la.',
        actionUrl: '/admin/pesquisas',
        channel: 'email',
      });
    } catch {
      // Ignorado de propósito: o aviso não pode impedir o registro da resposta.
    }

    return { success: true, responseId };
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
    const { client: supabase } = await getSurveysAdminClient();

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
 * Exclui um bloco de pesquisa.
 */
export async function deleteSurveyBlockAction(surveyId: string, blockId: string) {
  try {
    const { client: supabase } = await getSurveysAdminClient();
    const { error } = await (supabase as any)
      .from('survey_blocks')
      .delete()
      .eq('id', blockId);

    if (error) throw error;
    revalidatePath(`/admin/pesquisas/${surveyId}/editor`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir bloco.' };
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
    const { client: supabase } = await getSurveysAdminClient();

    const { data: targetBlock, error: blockError } = await (supabase as any)
      .from('survey_blocks')
      .select('id, survey_id')
      .eq('id', questionData.block_id)
      .eq('survey_id', surveyId)
      .maybeSingle();
    if (blockError || !targetBlock) throw blockError || new Error('A seção selecionada não pertence a esta pesquisa.');

    let questionId = questionData.id;

    if (questionId) {
      const { data: updatedQuestion, error } = await (supabase as any)
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
        .eq('id', questionId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!updatedQuestion) throw new Error('A pergunta não foi atualizada. Verifique suas permissões e tente novamente.');
    } else {
      // Nova pergunta vai para o fim do bloco (antes todas recebiam 99, e o empate deixava a ordem indefinida).
      const { data: lastInBlock } = await (supabase as any)
        .from('survey_questions')
        .select('order_index')
        .eq('block_id', questionData.block_id)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrderIndex = (Number(lastInBlock?.order_index) || 0) + 1;

      const { data: newQ, error } = await (supabase as any)
        .from('survey_questions')
        .insert({
          block_id: questionData.block_id,
          question_text: questionData.question_text,
          help_text: questionData.help_text || null,
          question_type: questionData.question_type,
          order_index: nextOrderIndex,
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
          const { error: deleteError } = await (supabase as any)
            .from('survey_options')
            .delete()
            .eq('question_id', questionId)
            .not('id', 'in', `(${newOptionIds.join(',')})`);
          if (deleteError) throw deleteError;
        } else {
          const { error: deleteError } = await (supabase as any).from('survey_options').delete().eq('question_id', questionId);
          if (deleteError) throw deleteError;
        }
      }

      // Insere ou atualiza opções
      for (let i = 0; i < questionData.options.length; i++) {
        const opt = questionData.options[i];
        if (!opt) continue;
        if (opt.id) {
          const { error: optionError } = await (supabase as any)
            .from('survey_options')
            .update({
              label: opt.label,
              value: opt.value || opt.label.toLowerCase().replace(/\s+/g, '_'),
              order_index: i + 1,
            })
            .eq('id', opt.id);
          if (optionError) throw optionError;
        } else {
          const { error: optionError } = await (supabase as any).from('survey_options').insert({
            question_id: questionId,
            label: opt.label,
            value: opt.value || opt.label.toLowerCase().replace(/\s+/g, '_'),
            order_index: i + 1,
            is_active: true,
          });
          if (optionError) throw optionError;
        }
      }
    }

    const { data: savedQuestion, error: savedQuestionError } = await (supabase as any)
      .from('survey_questions')
      .select('*')
      .eq('id', questionId)
      .single();
    if (savedQuestionError || !savedQuestion) throw savedQuestionError || new Error('Não foi possível confirmar a pergunta salva.');

    const { data: savedOptions, error: savedOptionsError } = await (supabase as any)
      .from('survey_options')
      .select('*')
      .eq('question_id', questionId)
      .order('order_index', { ascending: true });
    if (savedOptionsError) throw savedOptionsError;

    revalidatePath(`/admin/pesquisas/${surveyId}/editor`);
    return { success: true, questionId, question: { ...savedQuestion, options: savedOptions || [] } as SurveyQuestion };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao salvar pergunta.' };
  }
}

/**
 * Exclui ou oculta uma pergunta.
 */
export async function deleteSurveyQuestionAction(surveyId: string, questionId: string) {
  try {
    const { client: supabase } = await getSurveysAdminClient();

    // Verifica se já possui respostas gravadas
    const { count } = await (supabase as any)
      .from('survey_answers')
      .select('id', { count: 'exact', head: true })
      .eq('question_id', questionId);

    if (count && count > 0) {
      // Se possui respostas, inativa para preservar integridade
      const { error } = await (supabase as any)
        .from('survey_questions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', questionId);
      if (error) throw error;
    } else {
      // Se não possui respostas, exclui completamente
      const { error } = await (supabase as any)
        .from('survey_questions')
        .delete()
        .eq('id', questionId);
      if (error) throw error;
    }

    revalidatePath(`/admin/pesquisas/${surveyId}/editor`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir pergunta.' };
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

    let query = (supabase as any)
      .from('survey_responses')
      .select('id, version_number, completed_at, consent_research, consent_commercial')
      .eq('survey_id', surveyId)
      .order('completed_at', { ascending: true })
      .limit(10000);
    if (versionNumber) {
      query = query.eq('version_number', versionNumber);
    }
    const { data: responses, error: rErr } = await query;
    if (rErr) throw rErr;

    const totalResponses = responses?.length || 0;
    const responseIds = (responses || []).map((r: any) => r.id);

    let answers: any[] = [];
    // Lotes pequenos: evita URL gigante no .in() e o limite de linhas por requisição do PostgREST.
    const ANSWER_BATCH = 15;
    const batches: string[][] = [];
    for (let i = 0; i < responseIds.length; i += ANSWER_BATCH) {
      batches.push(responseIds.slice(i, i + ANSWER_BATCH));
    }
    const batchResults = await Promise.all(
      batches.map((ids) =>
        (supabase as any)
          .from('survey_answers')
          .select('response_id, question_id, answer_value, selected_options, other_text')
          .in('response_id', ids)
          .limit(5000)
      )
    );
    for (const { data: aData, error: aErr } of batchResults) {
      if (aErr) throw aErr;
      answers.push(...(aData || []));
    }

    const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });
    const dayCounts: Record<string, number> = {};
    const versionCounts: Record<number, number> = {};
    let consentResearchCount = 0;
    let consentCommercialCount = 0;
    (responses || []).forEach((r: any) => {
      if (r.completed_at) {
        const day = dayFormatter.format(new Date(r.completed_at));
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
      versionCounts[r.version_number] = (versionCounts[r.version_number] || 0) + 1;
      if (r.consent_research) consentResearchCount++;
      if (r.consent_commercial) consentCommercialCount++;
    });
    const completedDates = (responses || []).map((r: any) => r.completed_at).filter(Boolean) as string[];

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
          option_labels: Object.fromEntries(getQuestionChoices(q).map((o) => [o.value, o.label])),
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
      responses_by_day: Object.entries(dayCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      consent_research_count: consentResearchCount,
      consent_commercial_count: consentCommercialCount,
      first_response_at: completedDates[0] ?? null,
      last_response_at: completedDates[completedDates.length - 1] ?? null,
      responses_by_version: Object.entries(versionCounts)
        .map(([v, count]) => ({ version_number: Number(v), count }))
        .sort((a, b) => a.version_number - b.version_number),
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
  logo_url?: string;
  show_logo?: boolean;
  header_color?: string;
  banner_url?: string;
}) {
  try {
    const { client: supabase, user } = await getSurveysAdminClient();
    if (!user) {
      return { success: false, error: 'Acesso não autenticado.' };
    }

    const tenantId = await resolveRequestOperationalTenantId(supabase);

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
        logo_url: payload.logo_url || '/logoconexao_red.png',
        show_logo: payload.show_logo ?? true,
        header_color: payload.header_color || '#4B161B',
        banner_url: payload.banner_url?.trim() || null,
        status: 'draft',
        current_version: 1,
        created_by: user.id,
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
    const { client: supabase } = await getSurveysAdminClient();
    const { error } = await (supabase as any)
      .from('surveys')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', surveyId);

    if (error) throw error;
    revalidatePath('/admin/pesquisas');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar status da pesquisa.' };
  }
}

/**
 * Atualiza título, descrição, slug ou configurações de marca da pesquisa.
 */
export async function updateSurveyDetailsAction(
  surveyId: string,
  payload: {
    title: string;
    description?: string;
    slug?: string;
    logo_url?: string | null;
    show_logo?: boolean;
    header_color?: string;
    banner_url?: string | null;
    logo_size?: 'small' | 'medium' | 'large' | 'full';
    logo_position?: 'left' | 'center' | 'right';
  }
) {
  try {
    const { client: supabase } = await getSurveysAdminClient();
    const updateData: Record<string, any> = {
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (payload.logo_url !== undefined) {
      updateData.logo_url = payload.logo_url ? payload.logo_url.trim() : '/logoconexao_red.png';
    }

    if (payload.show_logo !== undefined) {
      updateData.show_logo = Boolean(payload.show_logo);
    }
    if (payload.header_color !== undefined) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(payload.header_color)) return { success: false, error: 'Cor do cabeçalho inválida.' };
      updateData.header_color = payload.header_color;
    }
    if (payload.banner_url !== undefined) updateData.banner_url = payload.banner_url?.trim() || null;
    if (payload.logo_size !== undefined) updateData.logo_size = payload.logo_size;
    if (payload.logo_position !== undefined) updateData.logo_position = payload.logo_position;

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
    revalidatePath('/admin/pesquisas');
    revalidatePath(`/admin/pesquisas/${surveyId}/editor`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar dados da pesquisa.' };
  }
}

export async function uploadSurveyBrandAssetAction(fileDataUrl: string) {
  try {
    const match = fileDataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return { success: false, error: 'Formato inválido. Use PNG, JPEG ou WebP.' };
    const buffer = Buffer.from(match[2]!, 'base64');
    if (!buffer.length || buffer.length > 5 * 1024 * 1024) return { success: false, error: 'A imagem deve ter no máximo 5 MB.' };

    const supabase = await createServerSideClient();
    const auth = await supabase.auth.getUser();
    if (!auth.data.user) return { success: false, error: 'Acesso não autenticado.' };
    const tenantId = await resolveRequestOperationalTenantId(supabase);

    const mimeType = match[1]!;
    const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
    const path = `${tenantId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from('survey-assets').upload(path, buffer, { contentType: mimeType });
    if (error) return { success: false, error: error.message };
    const { data } = supabase.storage.from('survey-assets').getPublicUrl(path);
    return { success: true, data: { url: data.publicUrl } };
  } catch (error) {
    console.error('[Admin/Surveys] Falha no upload:', error);
    return { success: false, error: 'Não foi possível enviar a imagem.' };
  }
}

/**
 * Exclui uma pesquisa permanentemente.
 */
export async function deleteSurveyAction(surveyId: string) {
  try {
    const { client: supabase } = await getSurveysAdminClient();
    const { error } = await (supabase as any)
      .from('surveys')
      .delete()
      .eq('id', surveyId);

    if (error) throw error;
    revalidatePath('/admin/pesquisas');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir pesquisa.' };
  }
}

/**
 * Move uma pergunta para outro bloco da pesquisa.
 */
export async function moveQuestionToBlockAction(
  surveyId: string,
  questionId: string,
  targetBlockId: string
) {
  try {
    const { client: supabase } = await getSurveysAdminClient();

    // Obtém o maior order_index do bloco de destino
    const { data: existingQuestions } = await (supabase as any)
      .from('survey_questions')
      .select('order_index')
      .eq('block_id', targetBlockId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrder = (existingQuestions?.[0]?.order_index || 0) + 1;

    const { error } = await (supabase as any)
      .from('survey_questions')
      .update({
        block_id: targetBlockId,
        order_index: nextOrder,
        updated_at: new Date().toISOString(),
      })
      .eq('id', questionId);

    if (error) throw error;

    revalidatePath(`/admin/pesquisas/${surveyId}/editor`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao mover pergunta para o bloco.' };
  }
}

/**
 * Reordena as perguntas dentro de um bloco.
 */
export async function reorderSurveyQuestionsAction(
  surveyId: string,
  blockId: string,
  orderedQuestionIds: string[]
) {
  try {
    const { client: supabase } = await getSurveysAdminClient();

    const updates = orderedQuestionIds.map((qId, index) =>
      (supabase as any)
        .from('survey_questions')
        .update({
          order_index: index + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', qId)
        .eq('block_id', blockId)
    );

    await Promise.all(updates);

    revalidatePath(`/admin/pesquisas/${surveyId}/editor`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao reordenar perguntas.' };
  }
}
