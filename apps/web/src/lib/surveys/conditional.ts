import type { SurveyQuestion } from '@/types/surveys';

export type SurveyAnswerState = Record<
  string,
  { answer_value?: string; selected_options?: string[]; other_text?: string }
>;

const norm = (v: string) => v.trim().toLowerCase();

/** Opções implícitas das perguntas Sim/Não (não têm linhas em survey_options). */
export const BOOLEAN_OPTIONS = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
] as const;

/** Opções (value/label) que uma pergunta oferece como resposta, incluindo as implícitas de Sim/Não. */
export function getQuestionChoices(
  question: Pick<SurveyQuestion, 'question_type' | 'options'>
): Array<{ value: string; label: string }> {
  if (question.question_type === 'boolean') return [...BOOLEAN_OPTIONS];
  return (question.options || []).map((o) => ({ value: o.value, label: o.label }));
}

/**
 * Decide se uma pergunta deve aparecer, conforme `conditional_rules`
 * ({ depends_on_question_id, expected_values }). Sem regra, sempre aparece.
 *
 * - Aparece quando a resposta da pergunta-gatilho coincide com algum dos valores esperados
 *   (comparando com o `value` e também com o `label` da opção, sem diferenciar maiúsculas).
 * - Se a pergunta-gatilho também estiver oculta, esta fica oculta (encadeamento).
 */
export function isQuestionVisible(
  question: Pick<SurveyQuestion, 'id' | 'conditional_rules'>,
  questionsById: Map<string, SurveyQuestion>,
  answers: SurveyAnswerState,
  seen: Set<string> = new Set()
): boolean {
  const rule = question.conditional_rules;
  if (!rule || !rule.depends_on_question_id) return true;

  const expected = (rule.expected_values || []).map((v) => norm(String(v)));
  if (expected.length === 0) return true;

  // Proteção contra regras circulares.
  if (seen.has(question.id)) return false;
  seen.add(question.id);

  const trigger = questionsById.get(rule.depends_on_question_id);
  if (trigger && !isQuestionVisible(trigger, questionsById, answers, seen)) return false;

  const ans = answers[rule.depends_on_question_id];
  if (!ans) return false;

  const given = [ans.answer_value, ...(ans.selected_options || [])].filter(
    (v): v is string => typeof v === 'string' && v.trim() !== ''
  );
  if (given.length === 0) return false;

  // Aceita tanto value quanto label da opção selecionada.
  const candidates = new Set<string>();
  given.forEach((g) => {
    candidates.add(norm(g));
    const opt = trigger ? getQuestionChoices(trigger).find((o) => o.value === g) : undefined;
    if (opt?.label) candidates.add(norm(opt.label));
  });

  return expected.some((e) => candidates.has(e));
}
