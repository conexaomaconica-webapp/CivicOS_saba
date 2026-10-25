'use client';

import React, { useState } from 'react';
import { CheckCircle2, ChevronRight, ChevronLeft, HelpCircle, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { submitEntreColunasSurveyAction } from '@/app/actions/entrecolunas-survey';

interface SurveyData {
  vinculo: string;
  intencao: string;
  categorias: string[];
}

export function QuickSurveySection() {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<SurveyData>({
    vinculo: '',
    intencao: '',
    categorias: [],
  });
  const [completed, setCompleted] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const vinculoOptions = [
    { id: 'irmao', label: 'Irmão' },
    { id: 'cunhada', label: 'Cunhada' },
    { id: 'familiar', label: 'Familiar' },
  ];

  const intencaoOptions = [
    { id: 'encontrar', label: 'Para encontrar produtos e serviços' },
    { id: 'divulgar', label: 'Para divulgar minha empresa ou atuação profissional' },
    { id: 'ambas', label: 'Para as duas possibilidades' },
  ];

  const categoriaOptions = [
    'Saúde e bem-estar',
    'Serviços profissionais',
    'Casa e reformas',
    'Automóveis',
    'Alimentação',
    'Educação',
    'Outros',
  ];

  const handleSelectVinculo = (label: string) => {
    if (errorMessage) setErrorMessage(null);
    setFormData((prev) => ({ ...prev, vinculo: label }));
  };

  const handleSelectIntencao = (label: string) => {
    if (errorMessage) setErrorMessage(null);
    setFormData((prev) => ({ ...prev, intencao: label }));
  };

  const toggleCategoria = (cat: string) => {
    if (errorMessage) setErrorMessage(null);
    setFormData((prev) => {
      const exists = prev.categorias.includes(cat);
      if (exists) {
        return { ...prev, categorias: prev.categorias.filter((c) => c !== cat) };
      }
      return { ...prev, categorias: [...prev.categorias, cat] };
    });
  };

  const handleNext = async () => {
    if (submitting) return;
    if (errorMessage) setErrorMessage(null);

    if (step === 1 && !formData.vinculo) return;
    if (step === 2 && !formData.intencao) return;
    if (step === 3) {
      setSubmitting(true);
      setErrorMessage(null);
      try {
        const res = await submitEntreColunasSurveyAction(formData);
        if (!res.success) {
          setErrorMessage(res.error || 'Não foi possível registrar suas respostas. Por favor, tente novamente.');
          return;
        }
        setCompleted(true);
      } catch {
        setErrorMessage('Ocorreu uma instabilidade na conexão. Por favor, tente novamente.');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (submitting) return;
    if (errorMessage) setErrorMessage(null);
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  return (
    <section
      id="pesquisa"
      aria-labelledby="pesquisa-title"
      className="py-16 sm:py-24 max-w-3xl mx-auto px-4 sm:px-6 md:px-8"
    >
      <div className="rounded-3xl p-6 sm:p-10 bg-white border border-[#C9A227]/30 shadow-md">
        {/* Dynamic region for screen readers */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {completed ? 'Pesquisa concluída com sucesso!' : `Etapa ${step} de 3`}
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#C9A227]/30 text-[11px] font-semibold text-[#8B6D1B] uppercase tracking-wider mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Queremos Ouvir Você</span>
          </div>

          <h2
            id="pesquisa-title"
            className="font-[family-name:var(--font-marcellus)] text-2xl sm:text-3xl md:text-4xl text-[#4B161B] font-normal tracking-tight mb-3"
          >
            Sua opinião também faz parte dessa conexão.
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-[#5A483E] font-light max-w-xl mx-auto leading-relaxed">
            <p>
              Estamos preparando uma plataforma para aproximar pessoas, empresas e oportunidades. E queremos conhecer o que é mais importante para você.
            </p>
            <p>
              Responda a uma pesquisa rápida e contribua para que a Conexão Maçônica seja cada vez mais útil para irmãos e familiares.
            </p>
            <p className="font-semibold text-[#8B6D1B] pt-1">
              3 perguntas. Menos de 1 minuto.
            </p>
          </div>
        </div>

        {!completed ? (
          <div>
            {/* Step indicator */}
            <div className="flex items-center justify-between text-xs font-medium text-[#8B6D1B] mb-2">
              <span>Pergunta {step} de 3</span>
              <span>{step === 1 ? '33%' : step === 2 ? '66%' : '100%'}</span>
            </div>
            <div
              role="progressbar"
              aria-label="Progresso da pesquisa"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={3}
              aria-valuetext={`Pergunta ${step} de 3`}
              className="w-full bg-[#FAF7F2] h-1.5 rounded-full overflow-hidden mb-8 border border-[#C9A227]/20"
            >
              <div
                className="bg-gradient-to-r from-[#C9A227] to-[#8B6D1B] h-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>

            {/* Step 1: Vínculo */}
            {step === 1 && (
              <div>
                <h3 id="pergunta-1-titulo" className="text-base sm:text-lg font-semibold text-[#4B161B] mb-4">
                  Pergunta 1 — Qual é o seu vínculo com a Maçonaria?
                </h3>
                <div role="radiogroup" aria-labelledby="pergunta-1-titulo" className="space-y-3 mb-8">
                  {vinculoOptions.map((opt) => {
                    const isSelected = formData.vinculo === opt.label;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleSelectVinculo(opt.label)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-[#F3EEDD]/70 border-[#C9A227] text-[#4B161B] font-medium shadow-2xs'
                            : 'bg-[#FAF7F2]/60 border-[#C9A227]/25 hover:border-[#C9A227]/50 text-[#5A483E]'
                        }`}
                      >
                        <span className="text-sm font-medium">{opt.label}</span>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-[#C9A227] bg-[#C9A227] text-white'
                              : 'border-[#C9A227]/40'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Intenção */}
            {step === 2 && (
              <div>
                <h3 id="pergunta-2-titulo" className="text-base sm:text-lg font-semibold text-[#4B161B] mb-4">
                  Pergunta 2 — Como você pretende utilizar a Conexão Maçônica?
                </h3>
                <div role="radiogroup" aria-labelledby="pergunta-2-titulo" className="space-y-3 mb-8">
                  {intencaoOptions.map((opt) => {
                    const isSelected = formData.intencao === opt.label;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleSelectIntencao(opt.label)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-[#F3EEDD]/70 border-[#C9A227] text-[#4B161B] font-medium shadow-2xs'
                            : 'bg-[#FAF7F2]/60 border-[#C9A227]/25 hover:border-[#C9A227]/50 text-[#5A483E]'
                        }`}
                      >
                        <span className="text-sm">{opt.label}</span>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                            isSelected
                              ? 'border-[#C9A227] bg-[#C9A227] text-white'
                              : 'border-[#C9A227]/40'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Categorias */}
            {step === 3 && (
              <div>
                <div className="mb-2">
                  <h3 id="pergunta-3-titulo" className="text-base sm:text-lg font-semibold text-[#4B161B]">
                    Pergunta 3 — Quais produtos ou serviços você mais gostaria de encontrar?
                  </h3>
                </div>
                <p className="text-xs text-[#8B6D1B] font-medium mb-4">
                  (Permitir múltiplas respostas na terceira pergunta)
                </p>

                <div role="group" aria-labelledby="pergunta-3-titulo" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8">
                  {categoriaOptions.map((cat) => {
                    const isSelected = formData.categorias.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        onClick={() => toggleCategoria(cat)}
                        className={`p-3.5 rounded-xl border text-left text-xs transition-all duration-150 flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-[#F3EEDD] border-[#C9A227] text-[#4B161B] font-medium shadow-2xs'
                            : 'bg-[#FAF7F2]/60 border-[#C9A227]/20 hover:border-[#C9A227]/50 text-[#5A483E]'
                        }`}
                      >
                        <span>{cat}</span>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-2 ${
                            isSelected
                              ? 'border-[#C9A227] bg-[#C9A227] text-white'
                              : 'border-[#C9A227]/40'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-xs" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error Message Feedback */}
            {errorMessage && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-6 p-4 rounded-2xl bg-[#4B161B]/10 border border-[#4B161B]/30 text-[#4B161B] text-xs sm:text-sm flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-[#8B1E2B] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-[#4B161B]">Não foi possível registrar as respostas</p>
                  <p className="text-xs text-[#5A483E] mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[#C9A227]/20">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-[#4B161B] hover:bg-[#FAF7F2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={(step === 1 && !formData.vinculo) || (step === 2 && !formData.intencao) || submitting}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white bg-[#4B161B] hover:bg-[#611D23] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                    <span>Enviando respostas...</span>
                  </>
                ) : (
                  <>
                    <span>{step === 3 ? (errorMessage ? 'Tentar novamente' : 'Finalizar Respostas') : 'Avançar'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Confirmation / Success feedback */
          <div className="py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="font-[family-name:var(--font-marcellus)] text-2xl sm:text-3xl text-[#4B161B] font-normal mb-3">
              Obrigado por fazer parte desse início!
            </h3>
            <p className="text-sm text-[#5A483E] font-light max-w-md mx-auto mb-2 leading-relaxed">
              Sua participação contribui para construirmos uma plataforma mais próxima das necessidades de irmãos e familiares.
            </p>
            <p className="text-sm font-medium text-[#4B161B] max-w-md mx-auto mb-6 leading-relaxed">
              O lançamento está chegando. Esperamos você nessa nova conexão!
            </p>

            <div className="inline-flex items-center gap-2 p-3 rounded-2xl bg-[#FAF7F2] border border-[#C9A227]/30 text-xs text-[#8B6D1B]">
              <Sparkles className="w-4 h-4 text-[#C9A227]" />
              <span>Pesquisa anônima e colaborativa de pré-lançamento.</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

