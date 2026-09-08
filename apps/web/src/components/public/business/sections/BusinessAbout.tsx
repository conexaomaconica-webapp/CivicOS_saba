import React from 'react';
import { Info } from 'lucide-react';
import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';

type BusinessAboutProps = {
  identity: PublicBusinessPresentation['identity'];
  owner?: PublicBusinessPresentation['owner'];
  className?: string;
};

export function BusinessAbout({
  identity,
  className = '',
}: BusinessAboutProps) {
  if (!identity.description) return null;

  return (
    <section className={`p-5 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-4 ${className}`}>
      <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
        <Info className="w-5 h-5 text-[#C9A227]" />
        <h2 className="text-base font-serif font-bold text-[#4B161B] tracking-tight">
          Sobre a Empresa
        </h2>
      </div>

      <div className="text-stone-700 text-sm leading-relaxed whitespace-pre-line font-normal">
        {identity.description}
      </div>
    </section>
  );
}
