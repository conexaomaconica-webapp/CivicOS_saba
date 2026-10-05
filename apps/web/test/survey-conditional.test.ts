import { describe, it, expect } from 'vitest';
import { isQuestionVisible } from '@/lib/surveys/conditional';
import type { SurveyQuestion } from '@/types/surveys';

const q = (id: string, extra: Partial<SurveyQuestion> = {}): SurveyQuestion => ({
  id,
  block_id: 'b1',
  question_text: id,
  question_type: 'single_choice',
  order_index: 1,
  is_required: false,
  is_active: true,
  allow_other: false,
  ...extra,
});

const trigger = q('t', {
  options: [
    { id: 'o1', question_id: 't', label: 'Sim, própria', value: 'sim_propria', order_index: 1, is_active: true },
    { id: 'o2', question_id: 't', label: 'Não', value: 'nao', order_index: 2, is_active: true },
  ],
});
const dep = q('d', { conditional_rules: { depends_on_question_id: 't', expected_values: ['sim_propria'] } });
const map = new Map([[trigger.id, trigger], [dep.id, dep]]);

describe('isQuestionVisible', () => {
  it('sem regra, sempre visível', () => {
    expect(isQuestionVisible(trigger, map, {})).toBe(true);
  });

  it('oculta até a pergunta-gatilho ser respondida', () => {
    expect(isQuestionVisible(dep, map, {})).toBe(false);
  });

  it('aparece quando a resposta bate com o valor esperado', () => {
    expect(isQuestionVisible(dep, map, { t: { answer_value: 'sim_propria' } })).toBe(true);
  });

  it('não aparece com outra resposta', () => {
    expect(isQuestionVisible(dep, map, { t: { answer_value: 'nao' } })).toBe(false);
  });

  it('aceita o rótulo da opção como valor esperado, sem diferenciar maiúsculas', () => {
    const byLabel = q('d2', { conditional_rules: { depends_on_question_id: 't', expected_values: ['sim, PRÓPRIA'] } });
    expect(isQuestionVisible(byLabel, map, { t: { answer_value: 'sim_propria' } })).toBe(true);
  });

  it('funciona com múltipla escolha', () => {
    const multi = q('m', { question_type: 'multiple_choice' });
    const d = q('dm', { conditional_rules: { depends_on_question_id: 'm', expected_values: ['x'] } });
    const m = new Map([[multi.id, multi], [d.id, d]]);
    expect(isQuestionVisible(d, m, { m: { selected_options: ['y', 'x'] } })).toBe(true);
    expect(isQuestionVisible(d, m, { m: { selected_options: ['y'] } })).toBe(false);
  });

  it('pergunta Sim/Não (sem opções cadastradas) serve de gatilho', () => {
    const yn = q('yn', { question_type: 'boolean' });
    const d = q('dyn', { conditional_rules: { depends_on_question_id: 'yn', expected_values: ['sim'] } });
    const m = new Map([[yn.id, yn], [d.id, d]]);
    expect(isQuestionVisible(d, m, { yn: { answer_value: 'sim' } })).toBe(true);
    expect(isQuestionVisible(d, m, { yn: { answer_value: 'nao' } })).toBe(false);
    const byLabel = q('dl', { conditional_rules: { depends_on_question_id: 'yn', expected_values: ['Sim'] } });
    expect(isQuestionVisible(byLabel, m, { yn: { answer_value: 'sim' } })).toBe(true);
  });

  it('encadeia: oculta se o gatilho também estiver oculto', () => {
    const chained = q('c', { conditional_rules: { depends_on_question_id: 'd', expected_values: ['a'] } });
    const m = new Map([[trigger.id, trigger], [dep.id, dep], [chained.id, chained]]);
    expect(isQuestionVisible(chained, m, { t: { answer_value: 'nao' }, d: { answer_value: 'a' } })).toBe(false);
    expect(isQuestionVisible(chained, m, { t: { answer_value: 'sim_propria' }, d: { answer_value: 'a' } })).toBe(true);
  });

  it('regra circular não trava', () => {
    const a = q('a', { conditional_rules: { depends_on_question_id: 'b', expected_values: ['x'] } });
    const b = q('b', { conditional_rules: { depends_on_question_id: 'a', expected_values: ['x'] } });
    const m = new Map([[a.id, a], [b.id, b]]);
    expect(isQuestionVisible(a, m, { a: { answer_value: 'x' }, b: { answer_value: 'x' } })).toBe(false);
  });
});
