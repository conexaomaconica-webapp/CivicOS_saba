'use client';

import React, { useState, useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { setBusinessHeroImageCountAction } from '@/lib/admin/admin-businesses-service';

const OPTIONS: Array<{ value: number; title: string; hint: string }> = [
  { value: 1, title: '1 imagem (padrão)', hint: 'Só a capa.' },
  { value: 2, title: '2 imagens', hint: 'A capa e a 1ª foto da galeria.' },
  { value: 3, title: '3 imagens', hint: 'A capa e as 2 primeiras fotos da galeria.' },
  { value: 4, title: '4 imagens', hint: 'A capa e as 3 primeiras fotos da galeria.' },
];

/**
 * Prontuário 360: define, POR EMPRESA, quantas imagens aparecem no topo do perfil no layout Prata (plano Compasso).
 * Padrão = 1. Enviar fotos para a galeria não altera o topo. Se a galeria tiver menos fotos do que o escolhido,
 * aparecem só as que existem. Bronze e Ouro sempre mostram só a capa, então a opção não os afeta.
 */
export function HeroImageCountControl({ businessId, initial, planCode }: { businessId: string; initial: number; planCode?: string | null }) {
  const [value, setValue] = useState<number>(Math.min(4, Math.max(1, Math.round(initial) || 1)));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const appliesToPlan = /prata|compasso|silver/i.test(planCode ?? '');

  const choose = (next: number) => {
    if (next === value || pending) return;
    const previous = value;
    setValue(next);
    setMessage(null);
    startTransition(async () => {
      const result = await setBusinessHeroImageCountAction(businessId, next);
      if (!result.success) {
        setValue(previous);
        setMessage({ ok: false, text: result.error || 'Não foi possível salvar.' });
        return;
      }
      setMessage({ ok: true, text: 'Salvo. O perfil público já usa a nova quantidade.' });
    });
  };

  return (
    <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-3" data-testid="hero-image-count-control">
      <div className="border-b border-stone-200 pb-3">
        <h3 className="font-serif font-bold text-base text-stone-900">Topo do perfil: quantidade de imagens</h3>
        <p className="text-xs text-stone-500 mt-1">
          Vale para esta empresa no layout Prata (plano Compasso). {appliesToPlan ? '' : 'Esta empresa não está no Compasso: hoje a opção não muda o perfil dela.'}
        </p>
      </div>
      <div role="radiogroup" aria-label="Quantidade de imagens no topo do perfil" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            disabled={pending}
            onClick={() => choose(option.value)}
            className={`text-left rounded-xl border p-3 transition ${value === option.value ? 'border-[#3B0B14] bg-[#3B0B14]/5' : 'border-stone-300 hover:border-[#C9A227]'} disabled:opacity-60`}
          >
            <span className="flex items-center gap-2 text-sm font-bold text-stone-900">
              {value === option.value ? <Check className="h-4 w-4 text-[#3B0B14]" /> : <span className="h-4 w-4" />}
              {option.title}
              {pending && value === option.value ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            </span>
            <span className="mt-1 block text-[11px] text-stone-500">{option.hint}</span>
          </button>
        ))}
      </div>
      {message && <p role="status" className={`text-xs ${message.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{message.text}</p>}
    </div>
  );
}
