import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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

function HorizontalHeaderSeal({ src, title, scale = 100, onZoom }: { src: string; title: string; scale?: number; onZoom?: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (imageFailed) return null;

  const scaleFactor = Math.max(0.7, Math.min(2.5, (scale || 100) / 100));
  const baseHeight = 52;
  const heightPx = Math.round(baseHeight * scaleFactor);

  return (
    <div
      onClick={onZoom}
      className="relative shrink-0 group cursor-pointer transition-all z-10 hover:z-50"
      title={`${title} — Clique ou passe o mouse para ampliar`}
    >
      <img
        src={src}
        alt={title}
        style={{
          height: `${heightPx}px`,
          maxHeight: `${Math.max(52, heightPx)}px`,
        }}
        className="w-auto max-w-[220px] sm:max-w-[300px] object-contain drop-shadow-md transition-transform duration-300 ease-out group-hover:scale-[1.85] sm:group-hover:scale-[1.5] group-hover:drop-shadow-2xl shrink-0"
        onError={() => setImageFailed(true)}
      />
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
      catalogKey?: InstitutionalRecognitionDTO['key'];
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
        catalogKey: 'pedra_fundamental',
        label: 'PEDRA FUNDAMENTAL',
        icon: PedraFundamentalIcon,
        bgClass: 'bg-gradient-to-r from-[#3B0B14] via-[#4B161B] to-[#3B0B14] text-[#F3EEDD] border border-[#C9A227]/70 shadow-xs hover:border-[#C9A227] hover:scale-[1.03] transition-all cursor-default',
        iconClass: 'text-[#C9A227]',
        priority: 1,
      });
    }

    // 2. Nível Comercial (Conexão Ouro / Conexão Prata / Conexão Bronze)
    const effectivePlan = commercialPlan || (recognition.goldPlanBadge ? 'ouro' : 'bronze');

    if (effectivePlan === 'ouro') {
      headerBadges.push({
        id: 'conexao_ouro',
        catalogKey: 'selo_ouro',
        label: 'ACÁCIA',
        icon: ConexaoOuroIcon,
        bgClass: 'bg-[#2A2415] text-[#E6C665] border border-[#C9A227]/50 hover:bg-[#342C19] hover:border-[#C9A227] hover:scale-[1.03] transition-all cursor-default',
        iconClass: 'text-[#E6C665]',
        priority: 2,
      });
    } else if (effectivePlan === 'prata') {
      headerBadges.push({
        id: 'conexao_prata',
        catalogKey: 'selo_prata',
        label: 'COMPASSO',
        icon: ConexaoPrataIcon,
        bgClass: 'bg-[#1A202C] text-[#E2E8F0] border border-[#A0AEC0]/40 hover:bg-[#2D3748] hover:border-[#CBD5E0] hover:scale-[1.03] transition-all cursor-default',
        iconClass: 'text-[#CBD5E0]',
        priority: 2,
      });
    } else if (effectivePlan === 'bronze') {
      headerBadges.push({
        id: 'conexao_bronze',
        catalogKey: 'selo_bronze',
        label: 'ESQUADRO',
        icon: ConexaoBronzeIcon,
        bgClass: 'bg-[#251A14] text-[#D69E2E] border border-[#8C6239]/50 hover:bg-[#32231A] hover:border-[#A07044] hover:scale-[1.03] transition-all cursor-default',
        iconClass: 'text-[#D69E2E]',
        priority: 2,
      });
    }

    // 4. Empresa Verificada (Confiança Auditoria)
    if (recognition.verified) {
      headerBadges.push({
        id: 'empresa_verificada',
        label: 'VERIFICADA',
        icon: VerificadaIcon,
        bgClass: 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 transition-all cursor-default',
        iconClass: 'text-emerald-400',
        priority: 4,
      });
    }

    const visibleHeaderBadges = headerBadges
      .filter((badge) => {
        const item = badge.catalogKey ? catalog?.find((entry) => entry.key === badge.catalogKey) : undefined;
        return item?.is_active !== false;
      })
      .sort((a, b) => {
        const itemA = a.catalogKey ? catalog?.find((entry) => entry.key === a.catalogKey) : undefined;
        const itemB = b.catalogKey ? catalog?.find((entry) => entry.key === b.catalogKey) : undefined;
        return (itemA?.priority_order ?? a.priority) - (itemB?.priority_order ?? b.priority);
      });

    if (visibleHeaderBadges.length === 0) return null;

    return (
      <div className={`flex flex-wrap items-center gap-2 sm:gap-3 ${className}`}>
        {visibleHeaderBadges.map((badge) => {
          const IconComponent = badge.icon;
          const catalogItem = badge.catalogKey ? catalog?.find((entry) => entry.key === badge.catalogKey) : undefined;
          const itemScale = catalogItem?.header_scale ?? 100;
          const scaleFactor = Math.max(0.7, Math.min(1.5, itemScale / 100));

          if (badge.id === 'empresa_verificada') {
            return (
              <span
                key={badge.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-serif font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shrink-0 shadow-2xs"
              >
                <VerificadaIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 text-emerald-400" />
                <span>VERIFICADA</span>
              </span>
            );
          }

          if (catalogItem?.header_display === 'horizontal_seal') {
            const sealUrl = catalogItem.compactSealUrl || catalogItem.compact_seal_url || catalogItem.sealUrl || catalogItem.seal_url;
            return (
              <HorizontalHeaderSeal
                key={badge.id}
                src={sealUrl}
                title={catalogItem.title}
                scale={itemScale}
                onZoom={() =>
                  setZoomedBadge({
                    id: badge.id,
                    key: catalogItem.key,
                    title: catalogItem.title,
                    description: catalogItem.description,
                    seal_url: sealUrl,
                    icon: IconComponent,
                    bgClass: badge.bgClass,
                    borderClass: 'border-[#C9A227]',
                    textClass: 'text-[#C9A227]',
                    priority: catalogItem.priority_order,
                  })
                }
              />
            );
          }
          return (
            <span
              key={badge.id}
              style={{
                fontSize: `${Math.round(Math.max(10, Math.min(14, 11 * scaleFactor)))}px`,
                paddingTop: `${Math.round(Math.max(2, Math.min(6, 4 * scaleFactor)))}px`,
                paddingBottom: `${Math.round(Math.max(2, Math.min(6, 4 * scaleFactor)))}px`,
                paddingLeft: `${Math.round(Math.max(6, Math.min(16, 12 * scaleFactor)))}px`,
                paddingRight: `${Math.round(Math.max(6, Math.min(16, 12 * scaleFactor)))}px`,
              }}
              className={`inline-flex items-center gap-1.5 rounded-full font-serif font-bold uppercase tracking-wider transition-all shrink-0 ${badge.bgClass}`}
            >
              <IconComponent
                style={{
                  width: `${Math.round(Math.max(12, Math.min(18, 14 * scaleFactor)))}px`,
                  height: `${Math.round(Math.max(12, Math.min(18, 14 * scaleFactor)))}px`,
                }}
                className={`shrink-0 ${badge.iconClass}`}
              />
              <span>{catalogItem?.title || badge.label}</span>
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
      title: 'Pedra Fundamental',
      description: 'Reconhecimento para as empresas que participam do início do projeto. Identificação e reconhecimento especial dentro da plataforma',
      seal_url: sealUrl,
      icon: PedraFundamentalIcon,
      bgClass: 'bg-amber-950/50 text-[#C9A227]',
      borderClass: 'border-[#C9A227]/70',
      textClass: 'text-[#C9A227]',
      priority: 1,
    });
  }

  const effectivePlan = commercialPlan || (recognition.goldPlanBadge ? 'ouro' : 'bronze');
  const commercialSeal = effectivePlan === 'ouro'
    ? { key: 'selo_ouro', title: 'Acácia', description: 'Identificação comercial das empresas ativas no Plano Acácia.', url: '/selos/plano-ouro.svg', icon: ConexaoOuroIcon, bg: 'bg-[#C9A227]/20 text-[#C9A227]', border: 'border-[#C9A227]', text: 'text-[#C9A227] font-extrabold' }
    : effectivePlan === 'prata'
      ? { key: 'selo_prata', title: 'Compasso', description: 'Identificação comercial das empresas ativas no Plano Compasso.', url: '/selos/plano-prata.svg', icon: ConexaoPrataIcon, bg: 'bg-slate-700 text-slate-100', border: 'border-slate-400', text: 'text-slate-100 font-extrabold' }
      : { key: 'selo_bronze', title: 'Esquadro', description: 'Identificação comercial das empresas ativas no Plano Esquadro.', url: '/selos/plano-bronze.svg', icon: ConexaoBronzeIcon, bg: 'bg-amber-950/80 text-amber-300', border: 'border-amber-700', text: 'text-amber-300 font-extrabold' };

  if (commercialSeal) {
    const sealUrl = getSealUrl(commercialSeal.key, commercialSeal.url);
    badgeList.push({
      id: commercialSeal.key,
      key: commercialSeal.key,
      title: commercialSeal.title,
      description: commercialSeal.description,
      seal_url: sealUrl,
      icon: commercialSeal.icon,
      bgClass: commercialSeal.bg,
      borderClass: commercialSeal.border,
      textClass: commercialSeal.text,
      priority: 2,
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
      {/* EXIBIÇÃO EM VARIANT GOLD-CARD (Card Lateral Exclusivo Plano Acácia — Apenas os Selos) */}
      {variant === 'gold-card' && (
        <div className={`bg-[#3B0B14] border border-[#C9A227]/40 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-center gap-6 ${className}`}>
          {badgeList
            .filter((b) => ['selo_ouro', 'selo_prata', 'selo_bronze', 'pedra_fundamental'].includes(b.key))
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
      {zoomedBadge &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
            onClick={() => setZoomedBadge(null)}
          >
            <div
              className="
          relative
          bg-[#3B0B14]
          border
          border-[#C9A227]/60
          rounded-3xl
          p-5
          sm:p-8
          max-w-lg
          w-full
          text-center
          space-y-5
          shadow-2xl
          animate-in
          zoom-in-95
          duration-200
        "
              onClick={(e) => e.stopPropagation()}
            >
              {/* BOTÃO FECHAR */}
              <button
                type="button"
                onClick={() => setZoomedBadge(null)}
                className="
            absolute
            top-4
            right-4
            z-50
            w-10
            h-10
            rounded-full
            bg-black/50
            hover:bg-black/70
            text-stone-300
            hover:text-white
            flex
            items-center
            justify-center
            border
            border-[#C9A227]/40
            shadow-lg
            transition-all
            cursor-pointer
          "
                title="Fechar ampliação"
                aria-label="Fechar ampliação"
              >
                <X className="w-5 h-5 text-[#C9A227]" />
              </button>

              {/* SELO AMPLIADO */}
              <div className="flex justify-center pt-3">
                <img
                  src={zoomedBadge.seal_url}
                  alt={zoomedBadge.title}
                  className="
              w-auto
              max-w-full
              max-h-[50vh]
              object-contain
              drop-shadow-2xl
              transition-transform
              duration-300
              hover:scale-[1.02]
            "
                />
              </div>

              {/* TÍTULO E DESCRIÇÃO */}
              <div className="space-y-2 border-t border-stone-800/80 pt-5">
                <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#C9A227]">
                  {zoomedBadge.title}
                </h3>

                <p className="text-xs sm:text-sm text-stone-200 leading-relaxed max-w-md mx-auto font-sans">
                  {zoomedBadge.description}
                </p>
              </div>

              {/* BOTÃO INFERIOR */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setZoomedBadge(null)}
                  className="
              px-6
              py-2.5
              rounded-xl
              bg-[#C9A227]
              hover:bg-[#b59121]
              text-stone-950
              font-extrabold
              text-xs
              uppercase
              tracking-wider
              transition-all
              shadow-md
              cursor-pointer
            "
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
