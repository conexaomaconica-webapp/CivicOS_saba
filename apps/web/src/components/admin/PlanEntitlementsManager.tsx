'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ExternalLink,
  Award,
  DollarSign,
  Image as ImageIcon,
  Layers,
  Save,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  CommercialPlanFullData,
  updateCommercialPlanAction,
} from '@/app/actions/plan-entitlements';

interface PlanEntitlementsManagerProps {
  initialData: CommercialPlanFullData[];
}

function QuotaControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
}) {
  const handleDecrement = () => onChange(Math.max(0, value - 1));
  const handleIncrement = () => onChange(value + 1);
  const handleDirectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value, 10);
    onChange(isNaN(raw) || raw < 0 ? 0 : raw);
  };

  return (
    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
      <label className="font-bold text-stone-700 block text-xs">{label}</label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleDecrement}
          className="w-7 h-7 flex items-center justify-center bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-lg transition-colors cursor-pointer"
          title="Diminuir cota"
        >
          -
        </button>
        <input
          type="number"
          min={0}
          value={value}
          onChange={handleDirectInput}
          className="w-full px-1 py-1 bg-white border border-stone-300 rounded-lg font-mono text-stone-900 text-center font-bold text-xs"
        />
        <button
          type="button"
          onClick={handleIncrement}
          className="w-7 h-7 flex items-center justify-center bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-lg transition-colors cursor-pointer"
          title="Aumentar cota"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function PlanEntitlementsManager({ initialData }: PlanEntitlementsManagerProps) {
  const [plans, setPlans] = useState<CommercialPlanFullData[]>(initialData);
  const [selectedPlan, setSelectedPlan] = useState<'bronze' | 'prata' | 'ouro'>('prata');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activePlanData = plans.find((p) => p.plan_code === selectedPlan) || plans[0]!;

  const handleFieldChange = (field: keyof CommercialPlanFullData, value: any) => {
    setPlans((prev) =>
      prev.map((p) => (p.plan_code === selectedPlan ? { ...p, [field]: value } : p))
    );
  };

  const handleFeatureChange = (index: number, value: string) => {
    const updatedFeatures = [...activePlanData.commercial_features];
    updatedFeatures[index] = value;
    handleFieldChange('commercial_features', updatedFeatures);
  };

  const handleAddFeature = () => {
    handleFieldChange('commercial_features', [...activePlanData.commercial_features, 'Novo diferencial comercial']);
  };

  const handleRemoveFeature = (index: number) => {
    const updatedFeatures = activePlanData.commercial_features.filter((_, i) => i !== index);
    handleFieldChange('commercial_features', updatedFeatures);
  };

  const handleRestoreDefaultFeatures = () => {
    const DEFAULT_FEATURES_BY_PLAN: Record<string, string[]> = {
      bronze: [
        'Presença básica no Guia Comercial',
        'Até 3 Fotos na Galeria',
        'Até 2 Serviços cadastrados',
        '1 Oferta/Benefício ativo',
        'Parcelamento em até 2x sem juros',
      ],
      prata: [
        'Destaque no Guia Comercial',
        'Até 6 Fotos na Galeria',
        'Até 5 Serviços cadastrados',
        'Até 3 Ofertas/Benefícios ativos',
        'Publicação de Eventos e Comunicados',
        'Parcelamento em até 4x sem juros',
      ],
      ouro: [
        'Topo das Buscas e Maior Destaque',
        'Até 10 Fotos na Galeria',
        'Até 10 Serviços cadastrados',
        'Até 5 Ofertas/Benefícios ativos',
        'Publicação Ilimitada de Eventos',
        'Analytics Avançado (7, 30 e 90 dias)',
        'Parcelamento em até 6x sem juros',
      ],
    };
    const defaults = DEFAULT_FEATURES_BY_PLAN[selectedPlan] || [];
    handleFieldChange('commercial_features', defaults);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await updateCommercialPlanAction({
        plan_code: activePlanData.plan_code,
        title: activePlanData.title,
        slogan: activePlanData.slogan,
        description: activePlanData.description,
        amount_cents: Number(activePlanData.amount_cents),
        installments_max: Number(activePlanData.installments_max),
        interest_free_installments: Number(activePlanData.interest_free_installments),
        is_popular: Boolean(activePlanData.is_popular),
        is_active: Boolean(activePlanData.is_active),
        commercial_features: activePlanData.commercial_features,
        services_limit: Number(activePlanData.services_limit),
        gallery_photos_limit: Number(activePlanData.gallery_photos_limit),
        benefits_limit: Number(activePlanData.benefits_limit),
        events_limit: Number(activePlanData.events_limit),
        posts_limit: Number(activePlanData.posts_limit),
      });

      if (!res.success) throw new Error(res.error || 'Erro ao salvar alterações.');

      setMessage({
        type: 'success',
        text: `Plano ${activePlanData.title} atualizado com sucesso! Alterações aplicadas no onboarding e admin.`,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Falha ao salvar plano.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* BANNER 1: ALERTA DE SEPARAÇÃO CONCEITUAL */}
      <div className="p-4 bg-[#3B0B14] border border-[#C9A227]/40 rounded-2xl text-white space-y-2 shadow-md">
        <div className="flex items-center gap-2 font-serif font-bold text-sm text-[#C9A227]">
          <Award className="w-5 h-5 text-[#C9A227]" />
          <span>Plano Comercial ≠ Reconhecimento Institucional</span>
        </div>
        <p className="text-xs text-stone-300 leading-relaxed">
          Os planos comerciais (<strong>Bronze, Prata e Ouro</strong>) definem o valor de assinatura e cotas numéricas de mídias/serviços. Os reconhecimentos fraternos (<strong>Pedra Fundamental 1/10, Empresa Fundadora e Coluna de Honra</strong>) são atribuições institucionais de governança e <strong>não são cotas editáveis dos planos</strong>.
        </p>
      </div>

      {/* BANNER 2: PROTEÇÃO DE HISTÓRICO CONTRATUAL */}
      <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Imutabilidade Contratual:</strong> Alterações de preço e cotas aplicam-se a novas contratações/renovações. Contratos e snapshots já celebrados permanecem imutáveis.
          </span>
        </div>
        <Link
          href={`/visual-lab/${selectedPlan}`}
          target="_blank"
          className="px-3 py-1.5 bg-[#C9A227] hover:bg-amber-400 text-[#3B0B14] font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Pré-visualizar Template ({activePlanData.title})</span>
        </Link>
      </div>

      {/* SELETOR DE PLANOS EM CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isSelected = p.plan_code === selectedPlan;
          return (
            <button
              key={p.plan_code}
              type="button"
              onClick={() => setSelectedPlan(p.plan_code)}
              className={`p-5 rounded-2xl border text-left transition-all relative cursor-pointer ${
                isSelected
                  ? 'bg-[#3B0B14] text-white border-[#C9A227] shadow-xl ring-2 ring-[#C9A227]/40'
                  : 'bg-white text-stone-900 border-stone-300 hover:border-stone-400'
              }`}
            >
              {p.is_popular && (
                <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-[#C9A227] text-[#3B0B14] font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Mais Escolhido
                </span>
              )}

              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isSelected ? 'text-[#C9A227]' : 'text-stone-500'}`}>
                {p.plan_code}
              </span>
              <h3 className="font-serif font-bold text-lg mt-0.5">{p.title}</h3>
              <p className={`text-xs mt-1 line-clamp-2 ${isSelected ? 'text-stone-300' : 'text-stone-600'}`}>
                {p.slogan}
              </p>

              <div className="mt-4 pt-3 border-t border-stone-200/20 flex justify-between items-baseline">
                <span className="text-xl font-serif font-bold">
                  {p.amount_cents === 0 ? 'Gratuito' : `R$ ${(p.amount_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </span>
                <span className={`text-[11px] font-semibold ${isSelected ? 'text-amber-200' : 'text-stone-500'}`}>
                  Até {p.installments_max}x sem juros
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* FORMULÁRIO DE EDIÇÃO DO PLANO SELECIONADO */}
      <form onSubmit={handleSave} className="bg-white border border-stone-300 rounded-2xl p-6 shadow-sm space-y-6">
        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-red-100 text-red-900 border border-red-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        <div className="flex justify-between items-center border-b border-stone-200 pb-3">
          <div>
            <h2 className="font-serif font-bold text-lg text-stone-900">
              Edição Comercial: {activePlanData.title}
            </h2>
            <p className="text-xs text-stone-500">
              Configure nome comercial, slogan, preço em BRL, regras de parcelamento e cotas numéricas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={activePlanData.is_popular}
                onChange={(e) => handleFieldChange('is_popular', e.target.checked)}
                className="accent-[#C9A227]"
              />
              <span>Destaque "Mais Escolhido"</span>
            </label>
          </div>
        </div>

        {/* 1. IDENTIDADE COMERCIAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700">Título Comercial no Onboarding:</label>
            <input
              type="text"
              value={activePlanData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#4B161B]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700">Slogan / Subtítulo Promocional:</label>
            <input
              type="text"
              value={activePlanData.slogan}
              onChange={(e) => handleFieldChange('slogan', e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#4B161B]"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-bold text-stone-700">Descrição Comercial Completa:</label>
            <textarea
              rows={2}
              value={activePlanData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#4B161B]"
            />
          </div>
        </div>

        {/* 2. PREÇO E REGRAS FINANCEIRAS ASAAS */}
        <div className="pt-4 border-t border-stone-200 space-y-3">
          <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-[#4B161B]" /> Preço & Regras de Parcelamento (Fonte Única de Dados)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">Valor Anual (BRL):</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-stone-500 font-bold">R$</span>
                <input
                  type="text"
                  value={
                    (activePlanData.amount_cents / 100).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }
                  onChange={(e) => {
                    const rawVal = e.target.value;
                    // Remove R$, pontos de milhar e converte vírgula decimal
                    const cleanStr = rawVal.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
                    const num = Number(cleanStr);
                    if (!isNaN(num) && num >= 0) {
                      handleFieldChange('amount_cents', Math.round(num * 100));
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 font-mono font-bold outline-none focus:border-[#4B161B]"
                />
              </div>
              <span className="text-[11px] text-stone-500 font-semibold block">
                Valor bruto gravado: {activePlanData.amount_cents} centavos BRL
              </span>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">Máximo de Parcelas no Cartão:</label>
              <select
                value={activePlanData.installments_max}
                onChange={(e) => handleFieldChange('installments_max', Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#4B161B]"
              >
                <option value={1}>1x (À vista)</option>
                <option value={3}>Até 3x</option>
                <option value={6}>Até 6x</option>
                <option value={12}>Até 12x</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">Parcelas Sem Juros:</label>
              <select
                value={activePlanData.interest_free_installments}
                onChange={(e) => handleFieldChange('interest_free_installments', Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#4B161B]"
              >
                <option value={1}>1x sem juros</option>
                <option value={3}>3x sem juros</option>
                <option value={6}>6x sem juros</option>
                <option value={12}>12x sem juros</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. COTAS NUMÉRICAS DE ENTITLEMENTS COM CONTROLES [-] E [+] */}
        <div className="pt-4 border-t border-stone-200 space-y-3">
          <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#4B161B]" /> Cotas de Recursos Numéricas (Entitlements)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <QuotaControl
              label="Fotos Galeria:"
              value={activePlanData.gallery_photos_limit}
              onChange={(val) => handleFieldChange('gallery_photos_limit', val)}
            />
            <QuotaControl
              label="Serviços:"
              value={activePlanData.services_limit}
              onChange={(val) => handleFieldChange('services_limit', val)}
            />
            <QuotaControl
              label="Benefícios:"
              value={activePlanData.benefits_limit}
              onChange={(val) => handleFieldChange('benefits_limit', val)}
            />
            <QuotaControl
              label="Eventos:"
              value={activePlanData.events_limit}
              onChange={(val) => handleFieldChange('events_limit', val)}
            />
            <QuotaControl
              label="Posts:"
              value={activePlanData.posts_limit}
              onChange={(val) => handleFieldChange('posts_limit', val)}
            />
          </div>
        </div>

        {/* 4. DIFERENCIAIS COMERCIAIS VISÍVEIS NO ONBOARDING (/anunciar/passo-3) */}
        <div className="pt-4 border-t border-stone-200 space-y-3">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-[#4B161B]" /> Lista de Diferenciais Comerciais ({activePlanData.title})
            </h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRestoreDefaultFeatures}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
              >
                ↺ Restaurar Padrões do {activePlanData.title}
              </button>
              <button
                type="button"
                onClick={handleAddFeature}
                className="text-xs font-bold text-[#4B161B] hover:underline cursor-pointer"
              >
                + Adicionar Diferencial
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {activePlanData.commercial_features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={feat}
                  onChange={(e) => handleFeatureChange(idx, e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 outline-none focus:border-[#4B161B]"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(idx)}
                  className="text-xs text-red-600 font-bold px-2 py-1 hover:bg-red-50 rounded-lg"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* BOTÃO DE SALVAR */}
        <div className="pt-4 border-t border-stone-200 flex justify-end gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl border border-[#C9A227]/60 shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                <span>Gravando Plano...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#C9A227]" />
                <span>Salvar Alterações Comerciais do {activePlanData.title}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
