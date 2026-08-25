'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import {
  validateResponsibleStep,
  hasResponsibleStepErrors,
  RESPONSIBLE_RELATIONSHIP_LABELS,
  type ResponsibleRelationship,
  type ResponsibleStepErrors,
} from '@/lib/onboarding/onboarding-validation';
import {
  MASONIC_STATUS_OPTIONS,
  MASONIC_STATUS_LABELS,
  validateMasonicStep,
  hasMasonicStepErrors,
  emptyMasonicAffiliation,
  toPersistedAffiliation,
  type MasonicAffiliationInput,
  type MasonicStepErrors,
} from '@/lib/masonic/masonic-affiliation';
import {
  saveResponsibleDraft,
  loadResponsibleDraft,
} from '@/lib/onboarding/responsible-flow';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="text-[11px] font-bold text-red-400 mt-1 block">{message}</span>;
}

export interface ResponsibleFormProps {
  authenticated: boolean;
  initial: {
    name: string;
    email: string;
  };
}

export default function ResponsibleForm({ authenticated, initial }: ResponsibleFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [relationship, setRelationship] = useState<ResponsibleRelationship | ''>('');
  const [masonic, setMasonic] = useState<MasonicAffiliationInput>(emptyMasonicAffiliation);
  const [errors, setErrors] = useState<ResponsibleStepErrors>({});
  const [masonicErrors, setMasonicErrors] = useState<MasonicStepErrors>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const existing = loadResponsibleDraft();
    if (!existing) return;
    setRelationship(existing.relationship);
    if (existing.masonic) {
      setMasonic({
        status: existing.masonic.status,
        isActive: existing.masonic.isActive,
        cimbCode: existing.masonic.cimbCode,
        lodgeName: existing.masonic.lodgeName,
        chapterName: existing.masonic.chapterName,
        spouseMasonName: existing.masonic.spouseMasonName,
        masonicConsent: existing.masonic.masonicConsent,
      });
    }
  }, []);

  const updateField = (field: 'name' | 'email' | 'relationship', value: string) => {
    const next = { name, email, relationship };
    if (field === 'name') {
      next.name = value;
      setName(value);
    }
    if (field === 'email') {
      next.email = value;
      setEmail(value);
    }
    if (field === 'relationship') {
      next.relationship = value as ResponsibleRelationship | '';
      setRelationship(next.relationship);
    }
    const nextErrors = validateResponsibleStep(next);
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] }));
  };

  const updateMasonic = (partial: Partial<MasonicAffiliationInput>) => {
    const next = { ...masonic, ...partial };
    if (partial.status && partial.status !== masonic.status) {
      next.isActive = null;
      next.cimbCode = '';
      next.lodgeName = '';
      next.chapterName = '';
      next.spouseMasonName = '';
    }
    setMasonic(next);
    const nextErrors = validateMasonicStep(next);
    const changedKey = (Object.keys(partial) as (keyof typeof nextErrors)[])[0];
    if (changedKey && changedKey in nextErrors) {
      setMasonicErrors((prev) => ({ ...prev, [changedKey]: nextErrors[changedKey] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const nextErrors = validateResponsibleStep({ name, email, relationship });
    const nextMasonicErrors = validateMasonicStep(masonic);
    setErrors(nextErrors);
    setMasonicErrors(nextMasonicErrors);

    if (hasResponsibleStepErrors(nextErrors) || hasMasonicStepErrors(nextMasonicErrors)) {
      setLoading(false);
      return;
    }

    const saved = saveResponsibleDraft({
      name: name.trim(),
      email: email.trim(),
      relationship: relationship as ResponsibleRelationship,
      masonic: toPersistedAffiliation(masonic),
    });
    if (!saved) {
      setErrorMsg('Não foi possível salvar os dados neste navegador.');
      setLoading(false);
      return;
    }

    if (authenticated) {
      router.push('/anunciar/passo-2');
    } else {
      router.push('/login?redirect=%2Fanunciar%2Fpasso-1');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left">
      {errorMsg && (
        <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Nome Completo */}
      <div className="space-y-1">
        <label htmlFor="name" className="block text-xs font-bold text-stone-200">
          Nome Completo do Responsável Legal
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Seu nome completo"
          className="w-full px-3 py-2.5 bg-[#1f0509]/80 border border-[#C9A227]/40 rounded-xl text-xs text-white placeholder-stone-500 outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]"
        />
        <FieldError message={errors.name} />
      </div>

      {/* E-mail */}
      <div className="space-y-1">
        <label htmlFor="email" className="block text-xs font-bold text-stone-200">
          E-mail de Contato Comercial
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="voce@exemplo.com.br"
          className="w-full px-3 py-2.5 bg-[#1f0509]/80 border border-[#C9A227]/40 rounded-xl text-xs text-white placeholder-stone-500 outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]"
        />
        <FieldError message={errors.email} />
      </div>

      {/* Relação com a Empresa */}
      <fieldset className="space-y-2 border-0 p-0 m-0">
        <legend className="text-xs font-bold text-stone-200 mb-1">
          Qual sua relação com a empresa comercial?
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(RESPONSIBLE_RELATIONSHIP_LABELS) as ResponsibleRelationship[]).map((value) => {
            const isChecked = relationship === value;
            return (
              <label
                key={value}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isChecked
                    ? 'bg-[#3B0B14] text-[#C9A227] border-[#C9A227] shadow-sm'
                    : 'bg-[#1f0509]/60 text-stone-300 border-stone-800 hover:border-stone-700'
                }`}
              >
                <input
                  type="radio"
                  name="relationship"
                  value={value}
                  checked={isChecked}
                  onChange={() => updateField('relationship', value)}
                  className="accent-[#C9A227]"
                />
                <span>{RESPONSIBLE_RELATIONSHIP_LABELS[value]}</span>
              </label>
            );
          })}
        </div>
        <FieldError message={errors.relationship} />
      </fieldset>

      {/* Vínculo com a Maçonaria */}
      <fieldset className="space-y-3 pt-3 border-t border-[#C9A227]/20 m-0">
        <div>
          <legend className="text-xs font-bold text-[#C9A227] uppercase tracking-wider block">
            Vínculo com a Comunidade Maçônica
          </legend>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Sua declaração habilita os selos de credibilidade e a validação do anúncio no Guia Comercial.
          </p>
        </div>

        <div className="space-y-2">
          {MASONIC_STATUS_OPTIONS.map((statusOption) => {
            const isChecked = masonic.status === statusOption;
            return (
              <label
                key={statusOption}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isChecked
                    ? 'bg-[#3B0B14] text-[#C9A227] border-[#C9A227] shadow-sm'
                    : 'bg-[#1f0509]/60 text-stone-300 border-stone-800 hover:border-stone-700'
                }`}
              >
                <input
                  type="radio"
                  name="masonicStatus"
                  value={statusOption}
                  checked={isChecked}
                  onChange={() => updateMasonic({ status: statusOption })}
                  className="accent-[#C9A227]"
                />
                <span>{MASONIC_STATUS_LABELS[statusOption]}</span>
              </label>
            );
          })}
        </div>
        <FieldError message={masonicErrors.status} />

        {/* Autorização LGPD Maçônica */}
        {masonic.status && masonic.status !== 'none' && (
          <label className="flex items-start gap-2.5 p-3 bg-stone-900/90 border border-stone-700 rounded-xl text-xs text-stone-300 cursor-pointer">
            <input
              type="checkbox"
              name="masonicConsent"
              checked={masonic.masonicConsent === true}
              onChange={(e) => updateMasonic({ masonicConsent: e.target.checked })}
              className="accent-[#C9A227] mt-0.5"
            />
            <span className="text-[11px] leading-relaxed">
              Autorizo o tratamento dos meus dados maçônicos (vínculo, loja e status de membro) pela Conexão Maçônica para verificação fraterna e emissão dos selos do guia comercial, conforme a{' '}
              <strong className="text-[#C9A227]">Política de Privacidade v1.0</strong>.
            </span>
          </label>
        )}
        <FieldError message={masonicErrors.consent} />

        {/* Detalhes para Irmão Maçom */}
        {masonic.status === 'mason' && (
          <div className="space-y-3 p-3.5 bg-stone-950/80 border border-stone-800 rounded-2xl">
            <div className="space-y-1">
              <span className="block text-xs font-bold text-stone-300">Você está ativo na Ordem?</span>
              <div className="flex gap-2">
                <label
                  className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    masonic.isActive === true
                      ? 'bg-[#3B0B14] text-[#C9A227] border-[#C9A227]'
                      : 'bg-stone-900 text-stone-400 border-stone-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="masonicActive"
                    value="true"
                    checked={masonic.isActive === true}
                    onChange={() => updateMasonic({ isActive: true })}
                    className="hidden"
                  />
                  <span>Sim, ativo</span>
                </label>

                <label
                  className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    masonic.isActive === false
                      ? 'bg-[#3B0B14] text-[#C9A227] border-[#C9A227]'
                      : 'bg-stone-900 text-stone-400 border-stone-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="masonicActive"
                    value="false"
                    checked={masonic.isActive === false}
                    onChange={() => updateMasonic({ isActive: false })}
                    className="hidden"
                  />
                  <span>Não ativo / pendente</span>
                </label>
              </div>
              <FieldError message={masonicErrors.isActive} />
            </div>

            {/* CIMB (OPCIONAL) */}
            <div className="space-y-1">
              <label htmlFor="cimb" className="block text-xs font-bold text-stone-300">
                CIMB — Carteira de Identificação Maçônica <span className="text-amber-400 font-normal">(Opcional)</span>
              </label>
              <input
                id="cimb"
                type="text"
                value={masonic.cimbCode}
                onChange={(e) => updateMasonic({ cimbCode: e.target.value })}
                placeholder="Número do CIMB (opcional)"
                className="w-full px-3 py-2.5 bg-[#1f0509] border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 outline-none focus:border-[#C9A227]"
              />
              <FieldError message={masonicErrors.cimbCode} />
            </div>

            {/* Loja Maçônica */}
            <div className="space-y-1">
              <label htmlFor="lodge" className="block text-xs font-bold text-stone-300">
                Loja Maçônica Simbólica (opcional)
              </label>
              <input
                id="lodge"
                type="text"
                value={masonic.lodgeName}
                onChange={(e) => updateMasonic({ lodgeName: e.target.value })}
                placeholder="Ex: Loja Simbólica 13 de Maio (Nº 450)"
                className="w-full px-3 py-2.5 bg-[#1f0509] border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 outline-none focus:border-[#C9A227]"
              />
            </div>
          </div>
        )}

        {/* Detalhes para Cunhada */}
        {masonic.status === 'mason_wife' && (
          <div className="space-y-1 p-3.5 bg-stone-950/80 border border-stone-800 rounded-2xl">
            <label htmlFor="spouse" className="block text-xs font-bold text-stone-300">
              Nome do marido maçom
            </label>
            <input
              id="spouse"
              type="text"
              value={masonic.spouseMasonName}
              onChange={(e) => updateMasonic({ spouseMasonName: e.target.value })}
              placeholder="Nome completo do marido maçom"
              className="w-full px-3 py-2.5 bg-[#1f0509] border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 outline-none focus:border-[#C9A227]"
            />
            <FieldError message={masonicErrors.spouseMasonName} />
          </div>
        )}

        {/* Detalhes para DeMolay / Filha de Jó */}
        {(masonic.status === 'demolay' || masonic.status === 'job_daughter') && (
          <div className="space-y-1 p-3.5 bg-stone-950/80 border border-stone-800 rounded-2xl">
            <label htmlFor="chapter" className="block text-xs font-bold text-stone-300">
              {masonic.status === 'demolay' ? 'Capítulo DeMolay' : 'Capítulo / Beth-El (Filha de Jó)'}
            </label>
            <input
              id="chapter"
              type="text"
              value={masonic.chapterName}
              onChange={(e) => updateMasonic({ chapterName: e.target.value })}
              placeholder="Nome do Capítulo"
              className="w-full px-3 py-2.5 bg-[#1f0509] border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 outline-none focus:border-[#C9A227]"
            />
            <FieldError message={masonicErrors.chapterName} />
          </div>
        )}
      </fieldset>

      {/* Botão de Continuar */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-[#3B0B14] to-[#4B161B] hover:from-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl border border-[#C9A227]/60 shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
            <span>Salvando dados...</span>
          </>
        ) : (
          <>
            <span>{authenticated ? 'Continuar · Dados da Empresa' : 'Continuar · Criar minha conta'}</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-[11px] text-stone-400 text-center">
        {authenticated
          ? 'Seus dados serão vinculados como responsável legal pelo anúncio da empresa.'
          : 'Ao continuar você criará sua conta e retornará para esta etapa automaticamente.'}
      </p>
    </form>
  );
}