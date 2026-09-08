import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import type { PublicBusinessPresentation, PublicCommercialPlan } from '@/lib/business/public-business-presentation';
import type { InstitutionalRecognitionDTO } from '@/app/actions/institutional-recognitions';

type InstitutionalBadgesProps = {
  recognition: PublicBusinessPresentation['recognition'];
  catalog?: InstitutionalRecognitionDTO[];
  commercialPlan?: PublicCommercialPlan;
  variant?: 'full' | 'compact' | 'gold-card';
  className?: string;
};

type BadgeItemData = {
  id: string;
  key: string;
  title: string;
  description: string;
  seal_url: string;
  icon: any;
  bgClass: string;
  borderClass: string;
  textClass: string;
  priority: number;
};

// ============================================================================
// ÍCONES SVG INLINE EXCLUSIVOS PARA O CABEÇALHO / HERO (USO 1)
// ============================================================================
function PedraFundamentalIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2l2.4 6.8 7.2.5-5.5 4.8 1.7 7L12 17.4 6.2 21.1l1.7-7-5.5-4.8 7.2-.5L12 2z" fill="currentColor" fillOpacity="0.25" />
    </svg>
  );
}

function ColunaDeHonraIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 21h16M6 18h12M9 18V6M15 18V6M8 6h8M5 3h14" />
    </svg>
  );
}

function ConexaoOuroIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8L12 2z" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

function ConexaoPrataIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 19 6.5 19 17.5 12 22 5 17.5 5 6.5 12 2" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

function ConexaoBronzeIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.2" />
      <path d="M12 7v10M7 12h10" />
    </svg>
  );
}

function VerificadaIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fillOpacity="0.2" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

// ============================================================================
// CARD INSTITUCIONAL COM ARTE REAL DO SELO (USO 2)
// ============================================================================
function InstitutionalFullBadgeCard({
  badge,
  onBadgeClick,
}: {
  badge: BadgeItemData;
  onBadgeClick?: (badge: BadgeItemData) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const Icon = badge.icon;
  const showImage = Boolean(badge.seal_url) && !imageFailed;

  return (
    <div
      className={`p-4 rounded-2xl border ${badge.bgClass} ${badge.borderClass} flex items-start gap-4 shadow-sm relative group`}
    >
      <div
        onClick={() => onBadgeClick?.(badge)}
        className="p-2.5 rounded-xl bg-black/40 shrink-0 border border-white/10 flex items-center justify-center cursor-zoom-in transition-transform group-hover:scale-105"
        title="Clique para ampliar a imagem oficial do selo"
      >
        {showImage ? (
          <img
            key={badge.seal_url}
            src={badge.seal_url}
            alt={badge.title}
            className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Icon className={`w-8 h-8 ${badge.textClass}`} />
        )}
      </div>

      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`font-serif font-bold text-base ${badge.textClass}`}>
            {badge.title}
          </span>
          <HelpCircle className="w-4 h-4 text-stone-400 opacity-70 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-xs text-stone-300 leading-relaxed font-sans">
          {badge.description}
        </p>
      </div>
    </div>
  );
}

function GoldCardBadgeItem({
  badge,
  onBadgeClick,
}: {
  badge: BadgeItemData;
  onBadgeClick: (badge: BadgeItemData) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const Icon = badge.icon;
  const showImage = Boolean(badge.seal_url) && !imageFailed;

  return (
    <div
      onClick={() => onBadgeClick(badge)}
      className="cursor-pointer transition-all duration-300 hover:scale-105 hover:brightness-110 shrink-0"
      title={`${badge.title} — Clique para ampliar`}
    >
      {showImage ? (
        <img
          src={badge.seal_url}
          alt={badge.title}
          className="w-28 h-28 sm:w-32 sm:h-32 object-contain filter drop-shadow-xl"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-black/40 border border-[#C9A227]/40 p-3 flex flex-col items-center justify-center text-center shadow-lg">
          <Icon className="w-12 h-12 text-[#C9A227]" />
        </div>
      )}
    </div>
  );
}


export function InstitutionalBadges({

  recognition,
  catalog,
  commercialPlan,
  variant = 'compact',
  className = '',
}: InstitutionalBadgesProps) {
  const [zoomedBadge, setZoomedBadge] = useState<BadgeItemData | null>(null);

  // ==========================================================================
  // USO 1 — CABEÇALHO DO PERFIL (VARIANT = 'COMPACT')
  // Versão tipográfica pura com SVG próprio, sem imagens do Admin, sem "Selo", sem "Anunciante"
  // ==========================================================================
  if (variant === 'compact') {
    const headerBadges: Array<{
      id: string;
      label: string;
      icon: any;
      bgClass: string;
      iconClass: string;
      priority: number;
    }> = [];

    // 1. Pedra Fundamental (Reconhecimento Histórico — Destaque Nobre)
    if (recognition.pedraFundamental) {
      headerBadges.push({
        id: 'pedra_fundamental',
        label: 'PEDRA FUNDAMENTAL',
        icon: PedraFundamentalIcon,
        bgClass: 'bg-gradient-to-r from-[#3B0B14] via-[#4B161B] to-[#3B0B14] text-[#F3EEDD] border border-[#C9A227]/70 shadow-xs hover:border-[#C9A227] hover:scale-[1.03] transition-all cursor-default',
        iconClass: 'text-[#C9A227]',
        priority: 1,
      });
    }

    // 2. Coluna de Honra (Reconhecimento Histórico — Destaque Nobre)
    if (recognition.colunaDeHonra || recognition.founder) {
      headerBadges.push({
        id: 'coluna_de_honra',
        label: 'COLUNA DE HONRA',
        icon: ColunaDeHonraIcon,
        bgClass: 'bg-gradient-to-r from-[#4B161B] via-[#5C1A21] to-[#4B161B] text-[#F3EEDD] border border-[#C9A227]/50 shadow-xs hover:border-[#C9A227] hover:scale-[1.03] transition-all cursor-default',
        iconClass: 'text-[#C9A227]',
        priority: 2,
      });
    }

    // 3. Nível Comercial (Conexão Ouro / Conexão Prata / Conexão Bronze — Identificador de Nível Comercial)
    const effectivePlan = commercialPlan || (recognition.goldPlanBadge ? 'ouro' : 'bronze');

    if (effectivePlan === 'ouro') {
      headerBadges.push({
        id: 'conexao_ouro',
        label: 'CONEXÃO OURO',
        icon: ConexaoOuroIcon,
        bgClass: 'bg-[#2A2415] text-[#E6C665] border border-[#C9A227]/50 hover:bg-[#342C19] hover:border-[#C9A227] hover:scale-[1.03] transition-all cursor-default',
        iconClass: 'text-[#E6C665]',
        priority: 3,
      });
    } else if (effectivePlan === 'prata') {
      headerBadges.push({
        id: 'conexao_prata',
        label: 'CONEXÃO PRATA',
        icon: ConexaoPrataIcon,
        bgClass: 'bg-[#1A202C] text-[#E2E8F0] border border-[#A0AEC0]/40 hover:bg-[#2D3748] hover:border-[#CBD5E0] hover:scale-[1.03] transition-all cursor-default',
        iconClass: 'text-[#CBD5E0]',
        priority: 3,
      });
    } else if (effectivePlan === 'bronze') {
      headerBadges.push({
        id: 'conexao_bronze',
        label: 'CONEXÃO BRONZE',
        icon: ConexaoBronzeIcon,
        bgClass: 'bg-[#251A14] text-[#D69E2E] border border-[#8C6239]/50 hover:bg-[#32231A] hover:border-[#A07044] hover:scale-[1.03] transition-all cursor-default',
        iconClass: 'text-[#D69E2E]',
        priority: 3,
      });
    }

    // 4. Empresa Verificada (Confiança Auditoria)
    if (recognition.verified) {
      headerBadges.push({
        id: 'empresa_verificada',
        label: 'VERIFICADA',
        icon: VerificadaIcon,
        bgClass: 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/50 hover:border-emerald-400 hover:scale-[1.03] transition-all cursor-default',
        iconClass: 'text-emerald-400',
        priority: 4,
      });
    }

    headerBadges.sort((a, b) => a.priority - b.priority);

    if (headerBadges.length === 0) return null;

    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {headerBadges.map((badge) => {
          const IconComponent = badge.icon;
          return (
            <span
              key={badge.id}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-serif font-bold uppercase tracking-wider ${badge.bgClass}`}
            >
              <IconComponent className={`w-3.5 h-3.5 shrink-0 ${badge.iconClass}`} />
              <span>{badge.label}</span>
            </span>
          );
        })}
      </div>
    );
  }

  // ==========================================================================
  // USO 2 — CARDS E SEÇÕES DA PÁGINA (VARIANT = 'FULL' OU 'GOLD-CARD')
  // Utiliza os assets reais e artes oficiais de alta resolução configuradas no Admin
  // ==========================================================================
  const getSealUrl = (key: string, defaultUrl: string) => {
    const item = catalog?.find((r) => r.key === key);
    if (!item) return defaultUrl;
    return item.sealUrl || item.seal_url || item.compactSealUrl || item.compact_seal_url || defaultUrl;
  };

  const badgeList: BadgeItemData[] = [];

  if (recognition.pedraFundamental) {
    const sealUrl = getSealUrl('pedra_fundamental', '/selos/pedra-fundamental.svg');
    badgeList.push({
      id: 'pedra_fundamental',
      key: 'pedra_fundamental',
      title: 'Pedra Fundamental (10/10)',
      description: 'Reconhecimento histórico/institucional permanente dos 10 primeiros apoiadores da rede Conexão Maçônica.',
      seal_url: sealUrl,
      icon: PedraFundamentalIcon,
      bgClass: 'bg-amber-950/50 text-[#C9A227]',
      borderClass: 'border-[#C9A227]/70',
      textClass: 'text-[#C9A227]',
      priority: 1,
    });
  }

  if (recognition.colunaDeHonra || recognition.founder) {
    const sealUrl = getSealUrl('coluna_de_honra', '/selos/coluna-honra.svg');
    badgeList.push({
      id: 'coluna_de_honra',
      key: 'coluna_de_honra',
      title: 'Coluna de Honra (Empresa Fundadora)',
      description: 'Membro fundador e destaque de mérito e contribuição exemplar na fraternidade.',
      seal_url: sealUrl,
      icon: ColunaDeHonraIcon,
      bgClass: 'bg-[#4B161B] text-[#C9A227]',
      borderClass: 'border-[#C9A227]/50',
      textClass: 'text-[#C9A227]',
      priority: 2,
    });
  }

  if (recognition.goldPlanBadge) {
    const sealUrl = getSealUrl('selo_ouro', '/selos/plano-ouro.svg');
    badgeList.push({
      id: 'selo_ouro',
      key: 'selo_ouro',
      title: 'Conexão Ouro',
      description: 'Reconhecimento e presença comercial de máxima distinção para empresas do Plano Ouro.',
      seal_url: sealUrl,
      icon: ConexaoOuroIcon,
      bgClass: 'bg-[#C9A227]/20 text-[#C9A227]',
      borderClass: 'border-[#C9A227]',
      textClass: 'text-[#C9A227] font-extrabold',
      priority: 3,
    });
  }

  if (recognition.verified && variant !== 'gold-card') {
    badgeList.push({
      id: 'empresa_verificada',
      key: 'empresa_verificada',
      title: 'Empresa Verificada',
      description: 'Identidade corporativa e vínculo fraterno auditados pela curadoria Conexão Maçônica.',
      seal_url: '/selos/verificada.svg',
      icon: VerificadaIcon,
      bgClass: 'bg-emerald-100/90 text-emerald-950',
      borderClass: 'border-emerald-600/70',
      textClass: 'text-emerald-950 font-bold',
      priority: 4,
    });
  }

  badgeList.sort((a, b) => a.priority - b.priority);

  if (badgeList.length === 0) return null;

  return (
    <>
      {/* EXIBIÇÃO EM VARIANT GOLD-CARD (Card Lateral Exclusivo Plano Ouro — Apenas os Selos) */}
      {variant === 'gold-card' && (
        <div className={`bg-[#3B0B14] border border-[#C9A227]/40 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-center gap-6 ${className}`}>
          {badgeList
            .filter((b) => ['selo_ouro', 'pedra_fundamental', 'coluna_de_honra'].includes(b.key))
            .map((badge) => (
              <GoldCardBadgeItem
                key={badge.id}
                badge={badge}
                onBadgeClick={setZoomedBadge}
              />
            ))}
        </div>
      )}



      {/* EXIBIÇÃO EM VARIANT FULL (CARDS) */}
      {variant === 'full' && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
          {badgeList.map((badge) => (
            <InstitutionalFullBadgeCard
              key={badge.id}
              badge={badge}
              onBadgeClick={setZoomedBadge}
            />
          ))}
        </div>
      )}

      {/* MODAL DE AMPLIAÇÃO / LIGHTBOX DO SELO */}
      {zoomedBadge && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomedBadge(null)}
        >
          <div
            className="bg-[#3B0B14] border border-[#C9A227]/60 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* BOTÃO FECHAR */}
            <button
              type="button"
              onClick={() => setZoomedBadge(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-stone-300 hover:text-white border border-stone-700/80 transition-colors cursor-pointer"
              title="Fechar ampliação"
            >
              <X className="w-5 h-5 text-[#C9A227]" />
            </button>

            {/* SELO AMPLIADO DE ALTA RESOLUÇÃO */}
            <div className="flex justify-center pt-2">
              <img
                src={zoomedBadge.seal_url}
                alt={zoomedBadge.title}
                className="w-64 h-64 sm:w-80 sm:h-80 object-contain drop-shadow-2xl filter transition-transform duration-300 hover:scale-105"
              />
            </div>

            {/* TÍTULO E DESCRIÇÃO EXPLICATIVA DO RECONHECIMENTO */}
            <div className="space-y-2 border-t border-stone-800/80 pt-5">
              <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#C9A227]">
                {zoomedBadge.title}
              </h3>
              <p className="text-xs sm:text-sm text-stone-200 leading-relaxed max-w-md mx-auto font-sans">
                {zoomedBadge.description}
              </p>
            </div>

            {/* BOTÃO DE FECHAMENTO */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setZoomedBadge(null)}
                className="px-6 py-2.5 rounded-xl bg-[#C9A227] hover:bg-[#b59121] text-stone-950 font-extrabold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

