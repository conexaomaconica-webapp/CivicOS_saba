import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

export interface OnboardingHeaderProps {
  currentStep: number;
  title: string;
  subtitle: string;
  businessName?: string | null;
  /** Logomarca do tenant (resolvida na página, no servidor); sem ela usa a oficial da Conexão. */
  logoUrl?: string | null;
  brandName?: string | null;
}

export default function OnboardingHeader({
  currentStep,
  title,
  subtitle,
  businessName,
  logoUrl,
  brandName,
}: OnboardingHeaderProps) {
  const steps = [
    { num: 1, label: 'Conta', path: '/anunciar/passo-1' },
    { num: 2, label: 'Empresa', path: '/anunciar/passo-2' },
    { num: 3, label: 'Vínculo', path: '/anunciar/passo-3' },
    { num: 4, label: 'Plano', path: '/anunciar/passo-4' },
    { num: 5, label: 'Contrato', path: '/anunciar/passo-5' },
    { num: 6, label: 'Pagamento', path: '/anunciar/passo-6' },
  ];

  // Logomarca do tenant (ou a oficial da Conexão): sem caixa, grande e centralizada no topo.
  const logoSrc = logoUrl || '/logoconexao_red_vert.png';
  const logoAlt = brandName || 'Conexão Maçônica';

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-center px-2 pt-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt={logoAlt}
          className="h-auto w-full max-w-[460px] object-contain drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)]"
        />
      </div>

      {/* TÍTULO DA ETAPA */}
      <div className="bg-[#2b060d]/90 border border-[#C9A227]/30 rounded-3xl p-5 shadow-2xl backdrop-blur-md text-center">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40 uppercase tracking-wider">
            Onboarding Anunciante • Etapa {currentStep} de 6
          </span>
          {businessName && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 truncate max-w-[200px]">
              {businessName}
            </span>
          )}
        </div>

        <h1 className="text-xl font-serif font-bold text-[#FAF7F2] mt-2">{title}</h1>
        <p className="text-xs text-stone-300 mt-0.5">{subtitle}</p>
      </div>

      {/* BARRA NAVEGAÇÃO DOS 6 PASSOS */}
      <div className="bg-[#2b060d]/80 border border-[#C9A227]/20 rounded-2xl p-2 shadow-lg backdrop-blur-md overflow-x-auto scrollbar-none">
        <div className="flex items-center justify-between min-w-[500px] gap-1 px-1">
          {steps.map((s, idx) => {
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            const isNavigable = isDone;

            return (
              <React.Fragment key={s.num}>
                {idx > 0 && (
                  <div
                    className={`h-[2px] flex-1 min-w-[12px] transition-colors ${
                      isDone ? 'bg-[#C9A227]' : 'bg-stone-800'
                    }`}
                  />
                )}

                {isNavigable ? (
                  <Link
                    href={s.path}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all text-[#C9A227] hover:bg-[#3B0B14]"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#C9A227] text-[#1f0509] flex items-center justify-center text-[10px] font-extrabold shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                    <span className="text-[11px] font-mono whitespace-nowrap">{s.label}</span>
                  </Link>
                ) : (
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-[#3B0B14] text-[#C9A227] border border-[#C9A227]/40 shadow-xs'
                        : 'text-stone-500 opacity-60'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                        isCurrent
                          ? 'bg-[#C9A227] text-[#1f0509]'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {s.num}
                    </span>
                    <span className="text-[11px] font-mono whitespace-nowrap">{s.label}</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
