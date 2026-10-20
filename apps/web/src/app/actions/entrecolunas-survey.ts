'use server';

import { getPublicSurveyBySlugAction, submitSurveyResponseAction } from '@/app/actions/surveys';

export interface EntreColunasSurveyPayload {
  vinculo: string;
  intencao: string;
  categorias: string[];
}

export async function submitEntreColunasSurveyAction(payload: EntreColunasSurveyPayload) {
  try {
    const surveyRes = await getPublicSurveyBySlugAction('entrecolunas');
    if (!surveyRes.success || !surveyRes.data) {
      throw new Error(surveyRes.error || 'Pesquisa Entre Colunas não encontrada.');
    }

    const survey = surveyRes.data;
    const questions = (survey.blocks || []).flatMap((b) => b.questions || []);

    const q1 = questions.find(
      (q) => q.question_text.toLowerCase().includes('vínculo') || q.order_index === 1
    );
    const q2 = questions.find(
      (q) => q.question_text.toLowerCase().includes('pretende') || q.order_index === 2
    );
    const q3 = questions.find(
      (q) => q.question_text.toLowerCase().includes('gostaria de encontrar') || q.order_index === 3
    );

    const answers: Array<{
      question_id: string;
      answer_value?: string;
      selected_options?: string[];
    }> = [];

    if (q1 && payload.vinculo) {
      const opt = q1.options?.find(
        (o) =>
          o.label.toLowerCase() === payload.vinculo.toLowerCase() ||
          o.value === payload.vinculo
      );
      answers.push({
        question_id: q1.id,
        answer_value: opt ? opt.value : payload.vinculo,
      });
    }

    if (q2 && payload.intencao) {
      const opt = q2.options?.find(
        (o) =>
          o.label.toLowerCase() === payload.intencao.toLowerCase() ||
          o.value === payload.intencao
      );
      answers.push({
        question_id: q2.id,
        answer_value: opt ? opt.value : payload.intencao,
      });
    }

    if (q3 && payload.categorias && payload.categorias.length > 0) {
      const selectedVals = payload.categorias.map((cat) => {
        const opt = q3.options?.find(
          (o) =>
            o.label.toLowerCase() === cat.toLowerCase() ||
            o.value === cat
        );
        return opt ? opt.value : cat;
      });
      answers.push({
        question_id: q3.id,
        selected_options: selectedVals,
      });
    }

    const wantsToAdvertise =
      payload.intencao.toLowerCase().includes('divulgar') ||
      payload.intencao.toLowerCase().includes('duas') ||
      payload.intencao.toLowerCase().includes('ambas');

    const res = await submitSurveyResponseAction({
      survey_id: survey.id,
      version_number: survey.current_version || 1,
      consent_research: true,
      consent_commercial: wantsToAdvertise,
      answers,
    });

    return res;
  } catch (err: any) {
    console.error('[submitEntreColunasSurveyAction] Erro ao submeter respostas:', err);
    return {
      success: false,
      error: err.message || 'Erro ao registrar respostas da pesquisa.',
    };
  }
}
