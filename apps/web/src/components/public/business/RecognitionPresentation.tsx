import React from 'react';
import { Award, ShieldCheck, Sparkles, Building2, HelpCircle } from 'lucide-react';
import { canBusinessReceiveRecognition } from '@/lib/business/recognition-eligibility';

export type InstitutionalRecognitionItem = {
  id: string;
  key: 'pedra_fundamental' | 'empresa_fundadora' | 'coluna_de_honra' | 'empresa_verificada';
  title: string;
  description: string;
  seal_url?: string;
  compact_seal_url?: string;
  priority_order: number;
  tooltip?: string;
  is_active: boolean;
};

type RecognitionPresentationProps = {
  recognitions?: InstitutionalRecognitionItem[];
  planCode?: string;
  isVerified?: boolean;
  isFounder?: boolean;
  isPedraFundamental?: boolean;
  isColunaDeHonra?: boolean;
  variant?: 'full' | 'compact' | 'badge_list';
  className?: string;
};

export function RecognitionPresentation({
  recognitions,
  planCode = 'bronze',
  isVerified = true,
  isFounder = false,
  isPedraFundamental = false,
  isColunaDeHonra = false,
  variant = 'badge_list',
  className = '',
}: RecognitionPresentationProps) {
  // Montar lista unificada de reconhecimentos institucionais filtrando estritamente por elegibilidade de plano
  const badgeList: Array<{
    id: string;
    title: string;
    description: string;
    seal_url?: string;
    compact_seal_url?: string;
    icon: any;
    bgClass: string;
    borderClass: string;
    textClass: string;
    priority: number;
  }> = [];

  // 1. Pedra Fundamental (Permitida SOMENTE para Plano Ouro)
  if (
    canBusinessReceiveRecognition(planCode, 'pedra_fundamental') &&
    (isPedraFundamental || recognitions?.some((r) => r.key === 'pedra_fundamental' && r.is_active))
  ) {
    const custom = recognitions?.find((r) => r.key === 'pedra_fundamental');
    badgeList.push({
      id: 'pedra_fundamental',
      title: custom?.title || 'Selo Pedra Fundamental (10/10)',
      description: custom?.description || 'Reconhecimento histórico/institucional permanente dos 10 primeiros apoiadores da rede Conexão Maçônica.',
      seal_url: custom?.seal_url || '/selos/pedra-fundamental.svg',
      compact_seal_url: custom?.compact_seal_url || '/selos/pedra-fundamental-compact.svg',
      icon: Sparkles,
      bgClass: 'bg-amber-950/40 text-amber-200',
      borderClass: 'border-[#C9A227]/60',
      textClass: 'text-[#C9A227]',
      priority: custom?.priority_order ?? 1,
    });
  }

  // 2. Empresa Fundadora (Permitida para Ouro e Prata)
  if (
    canBusinessReceiveRecognition(planCode, 'empresa_fundadora') &&
    (isFounder || recognitions?.some((r) => r.key === 'empresa_fundadora' && r.is_active))
  ) {
    const custom = recognitions?.find((r) => r.key === 'empresa_fundadora');
    badgeList.push({
      id: 'empresa_fundadora',
      title: custom?.title || 'Empresa Fundadora',
      description: custom?.description || 'Membro fundador participante da fase de consolidação inicial do diretório.',
      seal_url: custom?.seal_url || '/selos/fundadora.svg',
      compact_seal_url: custom?.compact_seal_url || '/selos/fundadora-compact.svg',
      icon: Award,
      bgClass: 'bg-[#3B0B14] text-[#C9A227]',
      borderClass: 'border-[#C9A227]/50',
      textClass: 'text-[#C9A227]',
      priority: custom?.priority_order ?? 2,
    });
  }

  // 3. Coluna de Honra (Permitida SOMENTE para Plano Ouro)
  if (
    canBusinessReceiveRecognition(planCode, 'coluna_de_honra') &&
    (isColunaDeHonra || recognitions?.some((r) => r.key === 'coluna_de_honra' && r.is_active))
  ) {
    const custom = recognitions?.find((r) => r.key === 'coluna_de_honra');
    badgeList.push({
      id: 'coluna_de_honra',
      title: custom?.title || 'Coluna de Honra',
      description: custom?.description || 'Destaque de mérito e contribuição exemplar na fraternidade.',
      seal_url: custom?.seal_url || '/selos/coluna-honra.svg',
      compact_seal_url: custom?.compact_seal_url || '/selos/coluna-honra-compact.svg',
      icon: Building2,
      bgClass: 'bg-stone-900 text-[#C9A227]',
      borderClass: 'border-amber-600/40',
      textClass: 'text-amber-400',
      priority: custom?.priority_order ?? 3,
    });
  }

  // 4. Empresa Verificada (Permitida para Bronze, Prata e Ouro)
  if (
    canBusinessReceiveRecognition(planCode, 'empresa_verificada') &&
    (isVerified || recognitions?.some((r) => r.key === 'empresa_verificada' && r.is_active))
  ) {
    const custom = recognitions?.find((r) => r.key === 'empresa_verificada');
    badgeList.push({
      id: 'empresa_verificada',
      title: custom?.title || 'Empresa Verificada',
      description: custom?.description || 'Identidade corporativa e vínculo fraterno auditados pela curadoria Conexão Maçônica.',
      seal_url: custom?.seal_url || '/selos/verificada.svg',
      compact_seal_url: custom?.compact_seal_url || '/selos/verificada-compact.svg',
      icon: ShieldCheck,
      bgClass: 'bg-emerald-950/40 text-emerald-300',
      borderClass: 'border-emerald-500/40',
      textClass: 'text-emerald-400',
      priority: custom?.priority_order ?? 4,
    });
  }

  // Ordenar badges por ordem de prioridade
  badgeList.sort((a, b) => a.priority - b.priority);

  if (badgeList.length === 0) return null;

  // Renderização variante COMPACT (para cards e headers pequenos)
  if (variant === 'compact') {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
        {badgeList.map((badge) => {
          const Icon = badge.icon;
          return (
            <span
              key={badge.id}
              title={`${badge.title} — ${badge.description}`}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${badge.bgClass} ${badge.borderClass} transition-all cursor-help`}
            >
              <Icon className="w-3 h-3" />
              <span>{badge.title}</span>
            </span>
          );
        })}
      </div>
    );
  }

  // Renderização variante FULL (para banners e páginas de perfil públicas)
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {badgeList.map((badge) => {
          const Icon = badge.icon;
          return (
            <div
              key={badge.id}
              className={`p-3 rounded-2xl border ${badge.bgClass} ${badge.borderClass} flex items-start gap-3 shadow-sm relative group`}
            >
              {badge.seal_url ? (
                <img
                  src={badge.seal_url}
                  alt={badge.title}
                  className="w-8 h-8 object-contain shrink-0"
                  onError={(e) => {
                    // Fallback para ícone svg
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : null}

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-4 h-4 ${badge.textClass}`} />
                  <span className={`font-serif font-bold text-xs ${badge.textClass}`}>
                    {badge.title}
                  </span>
                  <HelpCircle className="w-3 h-3 text-stone-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>

                <p className="text-[11px] text-stone-300 leading-snug max-w-sm">
                  {badge.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
