'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { Survey, SurveyBlock } from '@/types/surveys';
import { submitSurveyResponseAction } from '@/app/actions/surveys';

export function cleanBlockTitle(title: string): string {
  if (!title) return '';
  return title.replace(/^bloco\s+[a-z0-9]+\s*[-—–:]\s*/i, '').trim() || title;
}

interface Props {
  survey: Survey;
}

export function PublicSurveyClient({ survey }: Props) {
  // Filter active blocks and questions
  const activeBlocks = (survey.blocks || []).filter((b) => b.is_active);

  // Form State: currentStepIndex maps to activeBlocks + Finalization Step
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { answer_value?: string; selected_options?: string[]; other_text?: string }>>({});
  const respondentName = '';
  const respondentEmail = '';

  // Separate Consents
  const [consentResearch, setConsentResearch] = useState(true);
  const [consentCommercial, setConsentCommercial] = useState(false);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Determine if bloco de negócios should be shown based on Trigger Question A5
  const hasBusiness = () => {
    // Find trigger question A5 answer
    const triggerAnswer = Object.values(answers).find((ans) =>
      ['sim_propria', 'sim_familiar', 'ambos'].includes(ans.answer_value || '')
    );
    return !!triggerAnswer;
  };

  // Compute visible blocks array dynamically based on conditional rules
  const getVisibleBlocks = (): SurveyBlock[] => {
    return activeBlocks.filter((block) => {
      const lower = block.title.toLowerCase();
      // If block title contains "negócio" or "bloco b", check if hasBusiness is true
      if (lower.includes('negócio') || lower.includes('bloco b')) {
        return hasBusiness();
      }
      return true;
    });
  };

  const visibleBlocks = getVisibleBlocks();
  const totalSteps = visibleBlocks.length + 1; // Blocks + Finalization Step
  const currentBlock = visibleBlocks[currentBlockIndex];
  const isFinalStep = currentBlockIndex >= visibleBlocks.length;

  // Calculate Progress Percentage
  const progressPercent = Math.min(100, Math.round(((currentBlockIndex + 1) / totalSteps) * 100));

  // Handle Input Changes
  const handleAnswerChange = (questionId: string, value: string, type: string) => {
    if (type === 'multiple_choice') {
      const currentSelected = answers[questionId]?.selected_options || [];
      const updated = currentSelected.includes(value)
        ? currentSelected.filter((v) => v !== value)
        : [...currentSelected, value];
      setAnswers((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId], selected_options: updated },
      }));
    } else {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId], answer_value: value },
      }));
    }
  };

  // Validate current block required questions before proceeding
  const canProceedCurrentBlock = () => {
    if (isFinalStep) return consentResearch;
    if (!currentBlock) return true;

    const requiredQuestions = (currentBlock.questions || []).filter((q) => q.is_active && q.is_required);
    for (const q of requiredQuestions) {
      const ans = answers[q.id];
      if (!ans) return false;
      if (q.question_type === 'multiple_choice') {
        if (!ans.selected_options || ans.selected_options.length === 0) return false;
      } else {
        if (!ans.answer_value || !ans.answer_value.trim()) return false;
      }
    }
    return true;
  };

  // Navigation handlers
  const handleNext = () => {
    if (!canProceedCurrentBlock()) {
      setErrorMessage('Por favor, responda a todas as perguntas obrigatórias marcadas com (*)');
      return;
    }
    setErrorMessage('');
    if (currentBlockIndex < visibleBlocks.length) {
      setCurrentBlockIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setErrorMessage('');
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Submit Final Answers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentResearch) {
      setErrorMessage('É necessário aceitar o consentimento de tratamento de dados da pesquisa para enviar.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
      question_id: qId,
      answer_value: ans.answer_value || undefined,
      selected_options: ans.selected_options || undefined,
      other_text: ans.other_text || undefined,
    }));

    const res = await submitSurveyResponseAction({
      survey_id: survey.id,
      version_number: survey.current_version,
      respondent_name: respondentName.trim() || undefined,
      respondent_email: respondentEmail.trim() || undefined,
      consent_research: consentResearch,
      consent_commercial: consentCommercial,
      answers: formattedAnswers,
    });

    setSubmitting(false);

    if (res.success) {
      setIsCompleted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setErrorMessage(res.error || 'Erro ao enviar suas respostas. Tente novamente.');
    }
  };

  if (isCompleted) {
    return (
      <div className="ps-container ps-thankyou-wrap">
        <div className="ps-thankyou-card">
          <div className="ps-thankyou-icon">
            <CheckCircle2 size={56} className="ps-gold-icon" />
          </div>
          <span className="ps-tag">Pesquisa Concluída</span>
          <h1 className="ps-thankyou-title">Sua Resposta Foi Registrada!</h1>
          <p className="ps-thankyou-desc">
            Agradecemos imensamente a sua valiosa participação. As informações coletadas nos ajudarão a construir a melhor rede de integração comercial e fortalecimento mútuo da Maçonaria.
          </p>

          <div className="ps-thankyou-box">
            <ShieldCheck size={20} className="ps-box-icon" />
            <div>
              <strong>Integridade e Privacidade Garantidas</strong>
              <p>Seus dados estão protegidos sob o padrão de segurança e conformidade da Conexão Maçônica.</p>
            </div>
          </div>

          <div className="ps-thankyou-actions">
            <a href="/" className="ps-btn-home">
              Conhecer o Guia Maçônico
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ps-container">
      {/* Sticky Progress Bar Header */}
      <div className="ps-progress-bar-wrap">
        <div className="ps-progress-info">
          <div className="ps-brand-wrap">
            <img
              src="/icone.png"
              alt="Conexão Maçônica"
              className="ps-brand-icon"
            />
            <span className="ps-brand">Conexão Maçônica • Pesquisa Institucional</span>
          </div>
          <span className="ps-progress-step">Etapa {currentBlockIndex + 1} de {totalSteps}</span>
        </div>
        <div className="ps-progress-track">
          <div className="ps-progress-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="ps-card">
        {/* Survey Title Header */}
        <div className="ps-header">
          {survey.show_logo !== false ? (
            <div className="ps-logo-container">
              <img
                src={survey.logo_url || '/logoconexao_red.png'}
                alt="Conexão Maçônica"
                className="ps-logo-img"
              />
            </div>
          ) : (
            <span className="ps-badge">Conexão Maçônica</span>
          )}
          <h1 className="ps-title">{survey.title}</h1>
          {survey.description && <p className="ps-subtitle">{survey.description}</p>}
        </div>

        {errorMessage && (
          <div className="ps-alert-error" role="alert">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step 1..N: Survey Block Questions */}
        {!isFinalStep && currentBlock && (
          <div className="ps-block-step">
            <div className="ps-block-title-box">
              <h2>{cleanBlockTitle(currentBlock.title)}</h2>
              {currentBlock.description && <p>{currentBlock.description}</p>}
            </div>

            <div className="ps-questions">
              {currentBlock.questions
                ?.filter((q) => q.is_active)
                .map((q, qIdx) => (
                  <div key={q.id} className="ps-question-card">
                    <label className="ps-q-label">
                      <span className="ps-q-num">{qIdx + 1}.</span> {q.question_text}{' '}
                      {q.is_required && <span className="ps-req-star">*</span>}
                    </label>

                    {q.help_text && <p className="ps-q-help">{q.help_text}</p>}

                    {/* Question Type Renderers */}
                    {q.question_type === 'short_text' && (
                      <input
                        type="text"
                        className="ps-input"
                        value={answers[q.id]?.answer_value || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value, 'short_text')}
                        placeholder="Digite sua resposta..."
                      />
                    )}

                    {q.question_type === 'long_text' && (
                      <textarea
                        className="ps-textarea"
                        rows={3}
                        value={answers[q.id]?.answer_value || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value, 'long_text')}
                        placeholder="Digite seus comentários detalhados..."
                      />
                    )}

                    {(q.question_type === 'single_choice' || q.question_type === 'dropdown') && (
                      <div className="ps-options-list">
                        {q.options?.map((opt) => {
                          const isSelected = answers[q.id]?.answer_value === opt.value;
                          return (
                            <label
                              key={opt.id}
                              className={`ps-option-item ${isSelected ? 'selected' : ''}`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={opt.value}
                                checked={isSelected}
                                onChange={() => handleAnswerChange(q.id, opt.value, 'single_choice')}
                              />
                              <span>{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {q.question_type === 'multiple_choice' && (
                      <div className="ps-options-list">
                        {q.options?.map((opt) => {
                          const selectedList = answers[q.id]?.selected_options || [];
                          const isSelected = selectedList.includes(opt.value);
                          return (
                            <label
                              key={opt.id}
                              className={`ps-option-item ${isSelected ? 'selected' : ''}`}
                            >
                              <input
                                type="checkbox"
                                value={opt.value}
                                checked={isSelected}
                                onChange={() => handleAnswerChange(q.id, opt.value, 'multiple_choice')}
                              />
                              <span>{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {q.question_type === 'rating' && (
                      <div className="ps-rating-grid">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                          const isSelected = answers[q.id]?.answer_value === String(num);
                          return (
                            <button
                              type="button"
                              key={num}
                              className={`ps-rating-btn ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleAnswerChange(q.id, String(num), 'rating')}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* Navigation Footer */}
            <div className="ps-nav">
              {currentBlockIndex > 0 && (
                <button type="button" onClick={handleBack} className="ps-btn-back">
                  <ArrowLeft size={16} />
                  Anterior
                </button>
              )}

              <button type="button" onClick={handleNext} className="ps-btn-next">
                Próxima Etapa
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Final Step: Consent & Submission */}
        {isFinalStep && (
          <form onSubmit={handleSubmit} className="ps-final-step">
            <div className="ps-block-title-box">
              <h2>Finalização e Consentimento de Participação</h2>
              <p>Revisão final antes do envio seguro das suas respostas</p>
            </div>

            <div className="ps-consent-card">
              <ShieldCheck size={28} className="ps-gold-icon" />
              <h3>Termos de Privacidade e Proteção de Dados (LGPD)</h3>

              <div className="ps-checkbox-group">
                <label className="ps-checkbox-item">
                  <input
                    type="checkbox"
                    checked={consentResearch}
                    onChange={(e) => setConsentResearch(e.target.checked)}
                    required
                  />
                  <div>
                    <strong>Consentimento de Participação na Pesquisa *</strong>
                    <p>Declaro que li e autorizo o tratamento dos dados fornecidos exclusivamente para fins estatísticos e de mapeamento institucional da Conexão Maçônica.</p>
                  </div>
                </label>

                <label className="ps-checkbox-item">
                  <input
                    type="checkbox"
                    checked={consentCommercial}
                    onChange={(e) => setConsentCommercial(e.target.checked)}
                  />
                  <div>
                    <strong>Autorização para Contato Comercial (Opcional)</strong>
                    <p>Autorizo o contato da equipe Conexão Maçônica via WhatsApp/E-mail sobre planos de anúncio e oportunidades de negócios no Guia Maçônico.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="ps-nav">
              <button type="button" onClick={handleBack} className="ps-btn-back" disabled={submitting}>
                <ArrowLeft size={16} />
                Voltar aos Blocos
              </button>

              <button type="submit" className="ps-btn-submit" disabled={submitting || !consentResearch}>
                {submitting ? (
                  <>
                    <Loader2 size={18} className="ps-spin" />
                    Enviando Respostas...
                  </>
                ) : (
                  <>
                    Confirmar e Enviar Respostas
                    <CheckCircle2 size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .ps-container {
          max-width: 680px; margin: 0 auto; padding: 1.5rem 1rem 5rem; font-family: var(--font-sans, sans-serif);
        }
        .ps-progress-bar-wrap {
          position: sticky; top: 0.5rem; z-index: 50; background: rgba(59, 11, 20, 0.95);
          backdrop-filter: blur(8px); border: 1px solid rgba(201, 162, 39, 0.3); border-radius: 14px;
          padding: 0.75rem 1rem; margin-bottom: 1.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        .ps-progress-info { display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; font-weight: 700; color: #FFFFFF; margin-bottom: 0.5rem; }
        .ps-brand-wrap { display: flex; align-items: center; gap: 0.5rem; }
        .ps-brand-icon { width: 18px; height: 18px; object-fit: contain; }
        .ps-brand { color: #C9A227; letter-spacing: 0.05em; text-transform: uppercase; font-size: 0.6875rem; }
        .ps-progress-track { height: 6px; background: rgba(255,255,255,0.15); border-radius: 4px; overflow: hidden; }
        .ps-progress-fill { height: 100%; background: linear-gradient(90deg, #C9A227 0%, #E6C659 100%); transition: width 0.3s ease; }

        .ps-card { background: #FFFFFF; border: 1px solid #E5E0D8; border-radius: 20px; padding: 2rem 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.04); }
        .ps-header { text-align: center; border-bottom: 1px solid #F0ECE6; padding-bottom: 1.5rem; margin-bottom: 1.5rem; }
        .ps-logo-container { display: flex; justify-content: center; align-items: center; margin-bottom: 1rem; }
        .ps-logo-img { max-height: 64px; max-width: 260px; width: auto; height: auto; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05)); }
        .ps-badge { display: inline-block; background: #3B0B14; color: #C9A227; font-size: 0.6875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; padding: 0.25rem 0.625rem; border-radius: 6px; margin-bottom: 0.5rem; }
        .ps-title { font-size: 1.5rem; font-weight: 800; color: #1C0D10; margin: 0 0 0.5rem; }
        .ps-subtitle { font-size: 0.875rem; color: #6B5E62; margin: 0; line-height: 1.5; }

        .ps-alert-error { display: flex; align-items: center; gap: 0.5rem; background: #FEF2F2; color: #991B1B; border: 1px solid #FCA5A5; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; margin-bottom: 1.5rem; }

        .ps-block-title-box { margin-bottom: 1.5rem; border-left: 4px solid #3B0B14; padding-left: 0.875rem; }
        .ps-block-title-box h2 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #3B0B14; }
        .ps-block-title-box p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: #6B5E62; }

        .ps-questions { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem; }
        .ps-question-card { background: #FAF8F5; border: 1px solid #E5E0D8; border-radius: 14px; padding: 1.25rem; }
        .ps-q-label { font-size: 0.9375rem; font-weight: 700; color: #1C0D10; display: block; margin-bottom: 0.375rem; line-height: 1.4; }
        .ps-q-num { color: #C9A227; font-weight: 800; margin-right: 0.25rem; }
        .ps-req-star { color: #DC2626; margin-left: 0.25rem; }
        .ps-q-help { font-size: 0.8125rem; color: #6B5E62; margin: 0 0 0.75rem; }

        .ps-input, .ps-textarea { width: 100%; padding: 0.75rem; border: 1.5px solid #D1D5DB; border-radius: 10px; background: #FFFFFF; font-size: 0.9375rem; color: #111827; transition: border-color 0.15s; }
        .ps-input:focus, .ps-textarea:focus { outline: none; border-color: #3B0B14; box-shadow: 0 0 0 3px rgba(59,11,20,0.1); }

        .ps-options-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
        .ps-option-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: #FFFFFF; border: 1.5px solid #E5E0D8; border-radius: 10px; cursor: pointer; transition: all 0.15s; font-size: 0.875rem; font-weight: 600; color: #374151; }
        .ps-option-item:hover { border-color: #3B0B14; background: #FFFDF9; }
        .ps-option-item.selected { border-color: #3B0B14; background: #3B0B14; color: #C9A227; }
        .ps-option-item input { accent-color: #C9A227; width: 18px; height: 18px; }

        .ps-rating-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; margin-top: 0.5rem; }
        .ps-rating-btn { padding: 0.75rem 0; background: #FFFFFF; border: 1.5px solid #E5E0D8; border-radius: 8px; font-weight: 800; font-size: 0.9375rem; color: #1C0D10; cursor: pointer; transition: all 0.15s; text-align: center; }
        .ps-rating-btn:hover { border-color: #3B0B14; background: #FAF8F5; }
        .ps-rating-btn.selected { background: #3B0B14; color: #C9A227; border-color: #3B0B14; }

        .ps-nav { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid #F0ECE6; }
        .ps-btn-back { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; background: #FAF8F5; color: #374151; border: 1px solid #D1D5DB; border-radius: 10px; font-weight: 700; font-size: 0.875rem; cursor: pointer; }
        .ps-btn-next { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: #3B0B14; color: #C9A227; border: 1px solid rgba(201,162,39,0.4); border-radius: 10px; font-weight: 700; font-size: 0.9375rem; cursor: pointer; margin-left: auto; }
        .ps-btn-next:hover { background: #2A080E; }
        .ps-btn-submit { display: flex; align-items: center; gap: 0.5rem; padding: 0.875rem 1.75rem; background: #3B0B14; color: #C9A227; border: 1px solid rgba(201,162,39,0.5); border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; margin-left: auto; }

        .ps-consent-card { background: #FAF8F5; border: 1px solid #E5E0D8; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .ps-gold-icon { color: #C9A227; }
        .ps-consent-card h3 { font-size: 1.0625rem; font-weight: 800; color: #3B0B14; margin: 0.5rem 0 1rem; }
        .ps-checkbox-group { display: flex; flex-direction: column; gap: 1rem; }
        .ps-checkbox-item { display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; }
        .ps-checkbox-item input { accent-color: #3B0B14; width: 20px; height: 20px; margin-top: 0.125rem; flex-shrink: 0; }
        .ps-checkbox-item strong { font-size: 0.875rem; font-weight: 700; color: #111827; display: block; }
        .ps-checkbox-item p { font-size: 0.8125rem; color: #6B5E62; margin: 0.25rem 0 0; line-height: 1.4; }

        .ps-thankyou-wrap { display: flex; align-items: center; justify-content: center; min-height: 70vh; }
        .ps-thankyou-card { background: #FFFFFF; border: 1px solid #E5E0D8; border-radius: 24px; padding: 3rem 2rem; text-align: center; max-width: 540px; box-shadow: 0 20px 30px rgba(0,0,0,0.06); }
        .ps-thankyou-icon { width: 80px; height: 80px; background: #FAF8F5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; border: 2px solid #E5E0D8; }
        .ps-tag { font-size: 0.6875rem; font-weight: 800; color: #C9A227; text-transform: uppercase; letter-spacing: 0.1em; background: #3B0B14; padding: 0.25rem 0.75rem; border-radius: 20px; display: inline-block; margin-bottom: 0.75rem; }
        .ps-thankyou-title { font-size: 1.75rem; font-weight: 800; color: #1C0D10; margin: 0 0 0.75rem; }
        .ps-thankyou-desc { font-size: 0.9375rem; color: #6B5E62; margin: 0 0 1.5rem; line-height: 1.6; }
        .ps-thankyou-box { display: flex; align-items: flex-start; gap: 0.75rem; background: #FAF8F5; border: 1px solid #E5E0D8; border-radius: 12px; padding: 1rem; text-align: left; margin-bottom: 1.5rem; }
        .ps-box-icon { color: #3B0B14; flex-shrink: 0; margin-top: 0.125rem; }
        .ps-thankyou-box strong { font-size: 0.8125rem; color: #111827; }
        .ps-thankyou-box p { font-size: 0.75rem; color: #6B5E62; margin: 0.125rem 0 0; }
        .ps-btn-home { display: inline-block; padding: 0.875rem 2rem; background: #3B0B14; color: #C9A227; border-radius: 12px; font-weight: 800; font-size: 0.9375rem; text-decoration: none; }
        .ps-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
