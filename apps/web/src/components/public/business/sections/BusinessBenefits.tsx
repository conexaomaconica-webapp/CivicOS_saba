'use client';

import React, { useState } from 'react';
import { Tag, Copy, Check, Sparkles } from 'lucide-react';
import type { PublicBusinessBenefit } from '@/lib/business/public-business-presentation';

type BusinessBenefitsProps = {
  benefits: PublicBusinessBenefit[];
  className?: string;
};

export function BusinessBenefits({
  benefits,
  className = '',
}: BusinessBenefitsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!benefits || benefits.length === 0) return null;

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <section className={`p-5 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-4 ${className}`}>
      <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
        <Sparkles className="w-5 h-5 text-[#C9A227]" />
        <h2 className="text-base font-serif font-bold text-[#4B161B] tracking-tight">
          Benefícios e Ofertas
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {benefits.map((benefit, index) => {
          const itemKey = benefit.id || `ben-${index}`;
          return (
            <div
              key={itemKey}
              className="p-4 rounded-2xl bg-gradient-to-br from-[#4B161B] to-[#2A070E] text-white border border-[#C9A227]/50 shadow-md space-y-3 relative overflow-hidden group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/30">
                    <Tag className="w-3 h-3" />
                    {benefit.badgeText || benefit.benefitType || 'Oferta Exclusiva'}
                  </span>
                  <h3 className="font-serif font-bold text-base text-[#F3EEDD]">
                    {benefit.title}
                  </h3>
                </div>

                {benefit.discountPercentage && (
                  <div className="px-3 py-1.5 rounded-xl bg-[#C9A227] text-stone-950 font-black text-lg shadow-xs shrink-0">
                    {benefit.discountPercentage}% OFF
                  </div>
                )}
              </div>

              <p className="text-xs text-stone-200 leading-relaxed">
                {benefit.description}
              </p>

              {benefit.discountCode ? (
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-stone-700/60">
                  <div className="text-xs text-stone-300 font-mono">
                    Cupom: <span className="text-[#C9A227] font-bold">{benefit.discountCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(benefit.discountCode!, itemKey)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#C9A227] hover:bg-[#B89320] text-stone-950 text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    {copiedId === itemKey ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Resgatar benefício</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="pt-2 flex items-center justify-end border-t border-stone-700/60">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#C9A227] hover:bg-[#B89320] text-stone-950 text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    <span>Resgatar benefício</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
