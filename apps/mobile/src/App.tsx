import { Button } from '@saas/ui';
import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type ReactNode, type TouchEvent } from 'react';
import 'leaflet/dist/leaflet.css';
import { LaunchExperience } from './LaunchExperience';
import {
  createMobileGuideService,
  type MobileBusinessDetail,
  type MobileGuideBanner,
  type MobileGuideHomeData,
  type MobileGuideSponsoredBusiness,
  type MobileLodgeCardData,
  type MobileLodgeDetail,
} from './guide-data';
import { visibleHomeSections, type HomeSectionId } from './home-sections';
import { claimColdLaunch } from './launch-session';
import { trackMobileEvent, resetMobileCycleId } from './mobile-analytics';
import { routeFromHash, routeHref, routeLabels, routes, type Route } from './navigation';

const launchOnThisBoot = claimColdLaunch(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

function NavIcon({ route }: { route: Route }) {
  const paths: Record<Route, ReactNode> = {
    inicio: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    beneficios: <><path d="M20.8 12.6 12.6 20.8a2 2 0 0 1-2.8 0L3.2 14.2a2 2 0 0 1 0-2.8L11.4 3.2A2 2 0 0 1 12.8 2H20a2 2 0 0 1 2 2v7.2a2 2 0 0 1-1.2 1.4Z" /><circle cx="17" cy="7" r="1" /><path d="m8.5 13 2 2 4.5-5" /></>,
    empresas: <><path d="M4 21V5a2 2 0 0 1 2-2h8v18" /><path d="M14 9h4a2 2 0 0 1 2 2v10" /><path d="M8 7h2M8 11h2M8 15h2M17 13h1M17 17h1M2 21h20" /></>,
    lojas: <><path d="M6.5 20 12 4l5.5 16M9 13h6" /><path d="m5 10 7 10 7-10M8 14h8" /><circle cx="12" cy="10" r="1" /></>,
    mais: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  };
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[route]}</svg>;
}

function FeatureIcon({ name }: { name: 'search' | 'companies' | 'benefits' | 'events' | 'connections' | 'map' | 'lodges' | 'highlight' | 'category' }) {
  const paths: Record<typeof name, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    companies: <><path d="M4 21V5h10v16M14 9h6v12M8 9h2M8 13h2M8 17h2M17 13h1M17 17h1M2 21h20" /></>,
    benefits: <><path d="M20 12v9H4v-9M2 7h20v5H2zM12 7v14M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z" /></>,
    events: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" /></>,
    connections: <><circle cx="6" cy="12" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="m8.7 10.6 6.6-3.2M8.7 13.4l6.6 3.2" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15" /></>,
    lodges: <><path d="M6.5 20 12 4l5.5 16M9 13h6" /><path d="m5 10 7 10 7-10M8 14h8" /><circle cx="12" cy="10" r="1" /></>,
    highlight: <><path d="m12 3 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" /></>,
    category: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function CategoryIcon({ slug, name }: { slug: string; name?: string }) {
  const s = slug.toLowerCase();
  const n = (name || '').toLowerCase();
  if (s.includes('saud') || s.includes('psico') || s.includes('medic') || n.includes('saúd') || n.includes('psic')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        <path d="M12 9v6M9 12h6" />
      </svg>
    );
  }
  if (
    s.includes('otic') ||
    s.includes('ótic') ||
    s.includes('optic') ||
    s.includes('óptic') ||
    s.includes('vis') ||
    n.includes('ótic') ||
    n.includes('otic') ||
    n.includes('óptic') ||
    n.includes('optic')
  ) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="6" cy="14" r="4" />
        <circle cx="18" cy="14" r="4" />
        <path d="M10 14h4" />
        <path d="M2.5 12 5 7h14l2.5 5" />
      </svg>
    );
  }
  if (
    s.includes('seguran') ||
    n.includes('seguran') ||
    s.includes('vigil') ||
    n.includes('vigil') ||
    s.includes('terceiriz') ||
    n.includes('terceiriz')
  ) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (
    s.includes('alim') ||
    s.includes('gastro') ||
    s.includes('rest') ||
    s.includes('food') ||
    s.includes('bebid') ||
    n.includes('alim') ||
    n.includes('gastro') ||
    n.includes('bebid')
  ) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
        <path d="M15 11v11M5 2v20M2 2h6M2 5h6" />
      </svg>
    );
  }
  if (s.includes('tec') || s.includes('comand') || s.includes('soft') || n.includes('tec') || s.includes('infor') || n.includes('infor')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    );
  }
  if (s.includes('serv') || s.includes('prof') || n.includes('serv')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="20" height="14" x="2" y="7" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    );
  }
  if (s.includes('const') || s.includes('refor') || s.includes('eng') || n.includes('const')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9" />
        <path d="M17.64 15 22 10.64M20.91 3.26l-6.36 6.36" />
      </svg>
    );
  }
  if (s.includes('dir') || s.includes('advoc') || s.includes('jur') || n.includes('dir') || n.includes('advoc')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM7 21h10M12 3v18M3 7h18" />
      </svg>
    );
  }
  if (s.includes('auto') || s.includes('veic') || s.includes('car') || n.includes('auto')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    );
  }
  if (s.includes('educ') || s.includes('curs') || s.includes('escola') || n.includes('educ')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
        <path d="M22 10v6M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
      </svg>
    );
  }
  if (s.includes('comerc') || s.includes('loja') || s.includes('varej') || n.includes('comerc') || n.includes('loja')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  );
}

const DEFAULT_CATEGORIES: Array<{ slug: string; name: string; business_count?: number }> = [
  { slug: 'alimentos-e-bebidas', name: 'Alimentos e Bebidas', business_count: 1 },
  { slug: 'optica-84b81899', name: 'Óptica', business_count: 1 },
  { slug: 'psicologo-ca21ef78', name: 'Psicólogo', business_count: 1 },
  { slug: 'seguranca-e-terceirizacao-31aec1e6', name: 'Segurança', business_count: 1 },
  { slug: 'saude', name: 'Saúde' },
  { slug: 'tecnologia', name: 'Tecnologia' },
  { slug: 'alimentacao', name: 'Gastronomia' },
  { slug: 'servicos', name: 'Serviços' },
  { slug: 'construcao', name: 'Construção' },
  { slug: 'direito', name: 'Direito' },
  { slug: 'automotivo', name: 'Automotivo' },
  { slug: 'educacao', name: 'Educação' },
  { slug: 'comercio', name: 'Comércio' },
];

function getMergedCategories(
  serverCategories?: Array<{ id?: string; name: string; slug: string; business_count?: number }>,
) {
  const list: Array<{ slug: string; name: string; business_count?: number }> = [];
  const seenSlugs = new Set<string>();

  const addCat = (cat: { slug: string; name: string; business_count?: number }) => {
    if (!cat.slug || seenSlugs.has(cat.slug)) return;
    seenSlugs.add(cat.slug);
    list.push({
      slug: cat.slug,
      name: cat.name,
      business_count: cat.business_count ?? 0,
    });
  };

  if (serverCategories && serverCategories.length > 0) {
    for (const c of serverCategories) {
      addCat(c);
    }
  }

  for (const def of DEFAULT_CATEGORIES) {
    addCat(def);
  }

  // Prioriza com máxima precedência as categorias que possuem empresas cadastradas
  return list.sort((a, b) => {
    const aCount = a.business_count ?? 0;
    const bCount = b.business_count ?? 0;
    if (aCount > 0 && bCount === 0) return -1;
    if (aCount === 0 && bCount > 0) return 1;
    if (aCount > 0 && bCount > 0) return bCount - aCount;
    return 0;
  });
}

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return online;
}

function normalizePlanCode(raw?: string | null): 'acacia' | 'compasso' | 'esquadro' {
  const p = (raw || '').toLowerCase().trim();
  if (p === 'acacia' || p === 'ouro' || p === 'ouro_founder' || p === 'gold') return 'acacia';
  if (p === 'compasso' || p === 'prata' || p === 'silver') return 'compasso';
  return 'esquadro';
}

function getPlanDisplayName(plan: 'acacia' | 'compasso' | 'esquadro'): string {
  switch (plan) {
    case 'acacia':
      return 'Acácia';
    case 'compasso':
      return 'Compasso';
    case 'esquadro':
      return 'Esquadro';
  }
}

const PLAN_HORIZONTAL_SEALS: Record<'acacia' | 'compasso' | 'esquadro', string> = {
  acacia: './selos/plano-acacia.webp',
  compasso: './selos/plano-compasso.webp',
  esquadro: './selos/plano-esquadro.webp',
};

const PEDRA_FUNDAMENTAL_SEAL = './selos/selo-pedrafundamental.webp';

function PlanSealBadge({
  plan,
  large = false,
}: {
  plan: 'acacia' | 'compasso' | 'esquadro';
  large?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const sealSrc = PLAN_HORIZONTAL_SEALS[plan];
  const name = getPlanDisplayName(plan);

  if (!imgError && sealSrc) {
    return (
      <img
        src={sealSrc}
        alt={`Plano ${name}`}
        className={large ? 'plan-seal-img-lg' : 'plan-seal-img'}
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <span className={`detail-plan-badge detail-plan-${plan}`}>
      {plan === 'acacia' ? '🌿 Acácia' : plan === 'compasso' ? '📐 Compasso' : '📐 Esquadro'}
    </span>
  );
}

function PedraFundamentalSealBadge({
  compact = false,
  sealOnly = false,
  onClick,
}: {
  compact?: boolean;
  sealOnly?: boolean;
  onClick?: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  if (sealOnly) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="pedra-fundamental-seal-icon-only"
        title="Condecoração Especial Pedra Fundamental (Toque para ver detalhes)"
      >
        {!imgError ? (
          <img
            src={PEDRA_FUNDAMENTAL_SEAL}
            alt="Pedra Fundamental"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <span>🏛️</span>
        )}
      </button>
    );
  }

  return (
    <div
      className="pedra-fundamental-card-seal"
      title="Condecoração Especial para os 30 Primeiros Irmãos"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {!imgError ? (
        <img
          src={PEDRA_FUNDAMENTAL_SEAL}
          alt="Pedra Fundamental"
          className="pedra-seal-img"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <span style={{ fontSize: '1rem' }}>🏛️</span>
      )}
      <div className="pedra-seal-text">
        <span className="pedra-seal-title">Pedra Fundamental</span>
        {!compact && <span className="pedra-seal-sub">30 Primeiros Irmãos</span>}
      </div>
    </div>
  );
}

function LogoZoomModal({
  logoUrl, backgroundColor,
  businessName,
  onClose,
}: {
  logoUrl: string | null; backgroundColor?: string | null;
  businessName: string;
  onClose: () => void;
}) {
  if (!logoUrl) return null;

  return (
    <div
      className="logo-zoom-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Logomarca ${businessName}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="logo-zoom-card" style={backgroundColor ? { backgroundColor } : undefined}>
        <button
          type="button"
          className="modal-close-btn"
          style={{ position: 'absolute', top: 12, right: 12 }}
          onClick={onClose}
          aria-label="Fechar"
        >
          ✕
        </button>
        <img src={logoUrl} alt={businessName} className="logo-zoom-img" />
        <h4 style={{ margin: '14px 0 2px', font: '750 1.05rem/1.2 Georgia, serif', color: backgroundColor && backgroundColor.toLowerCase() !== '#ffffff' && backgroundColor.toLowerCase() !== '#fff' ? '#f3eedd' : '#4b161b', textAlign: 'center' }}>
          {businessName}
        </h4>
        <span style={{ fontSize: '.72rem', color: backgroundColor && backgroundColor.toLowerCase() !== '#ffffff' && backgroundColor.toLowerCase() !== '#fff' ? '#c9a227' : '#8c671d', fontWeight: 700 }}>Logomarca Oficial</span>
      </div>
    </div>
  );
}

function PhotoGalleryLightbox({
  photos,
  currentIndex,
  onClose,
  onChangeIndex,
}: {
  photos: Array<{ id: string; url: string; title: string | null }>;
  currentIndex: number | null;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  if (currentIndex === null || !photos[currentIndex]) return null;
  const currentPhoto = photos[currentIndex];

  const handlePrev = () => {
    onChangeIndex((currentIndex - 1 + photos.length) % photos.length);
  };

  const handleNext = () => {
    onChangeIndex((currentIndex + 1) % photos.length);
  };

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartRef.current = {
      x: e.touches[0]?.clientX ?? 0,
      y: e.touches[0]?.clientY ?? 0,
    };
  };

  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;
    const endX = e.changedTouches[0]?.clientX ?? 0;
    const diff = endX - touchStartRef.current.x;
    touchStartRef.current = null;
    if (diff > 45) {
      handlePrev();
    } else if (diff < -45) {
      handleNext();
    }
  };

  return (
    <div
      className="gallery-lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Galeria de Fotos"
    >
      <div className="gallery-lightbox-header">
        <span>
          Foto {currentIndex + 1} de {photos.length}
        </span>
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Fechar Galeria"
        >
          ✕
        </button>
      </div>

      <div
        className="gallery-lightbox-stage"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {photos.length > 1 && (
          <button
            type="button"
            className="gallery-nav-arrow left"
            onClick={handlePrev}
            aria-label="Foto anterior"
          >
            ‹
          </button>
        )}

        <img
          src={currentPhoto.url}
          alt={currentPhoto.title || `Foto ${currentIndex + 1}`}
          className="gallery-lightbox-img"
        />

        {photos.length > 1 && (
          <button
            type="button"
            className="gallery-nav-arrow right"
            onClick={handleNext}
            aria-label="Próxima foto"
          >
            ›
          </button>
        )}
      </div>

      <div style={{ textAlign: 'center', color: '#f3eedd', fontSize: '.84rem', minHeight: 24 }}>
        {currentPhoto.title || 'Arraste para os lados para navegar pelas fotos'}
      </div>
    </div>
  );
}

const PEDRA_FUNDAMENTAL_ROUND_SEAL = './selos/pedra-fundamental-round.png';

function sortBusinessesByTier(list: MobileGuideSponsoredBusiness[]): MobileGuideSponsoredBusiness[] {
  const getScore = (b: MobileGuideSponsoredBusiness): number => {
    // 1º Pedra Fundamental
    if (b.is_pedra_fundamental) return 1;
    const plan = normalizePlanCode(b.plan_tier);
    // 2º Acácia
    if (plan === 'acacia') return 2;
    // 3º Compasso
    if (plan === 'compasso') return 3;
    // 4º Esquadro
    if (plan === 'esquadro') return 4;
    return 5;
  };
  return [...list].sort((a, b) => {
    const diff = getScore(a) - getScore(b);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

function HomeBannerCarousel({
  banners,
  onNavigate,
}: {
  banners: MobileGuideBanner[];
  onNavigate: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (!banners.length) return null;

  const currentBanner = banners[currentIndex] ?? banners[0];
  if (!currentBanner) return null;
  const bannerImg = currentBanner.image_mobile_url || currentBanner.image_desktop_url;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartRef.current = {
      x: e.touches[0]?.clientX ?? 0,
      y: e.touches[0]?.clientY ?? 0,
    };
  };

  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;
    const diff = (e.changedTouches[0]?.clientX ?? 0) - touchStartRef.current.x;
    touchStartRef.current = null;
    if (diff > 40) {
      handlePrev();
    } else if (diff < -40) {
      handleNext();
    }
  };

  return (
    <div
      className="home-banner-carousel"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <article
        className="home-banner-card"
        onClick={onNavigate}
        role="button"
        tabIndex={0}
      >
        {bannerImg && (
          <img
            src={bannerImg}
            alt=""
            className="home-banner-bg"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="home-banner-overlay" />
        <div className="home-banner-text-box">
          <span className="home-banner-tag">{currentBanner.subtitle || 'Destaque'}</span>
          <h2 className="home-banner-heading">{currentBanner.title || 'Conexões que geram oportunidades'}</h2>
          <span className="home-banner-cta-btn">
            {currentBanner.cta_text || 'Conhecer empresas →'}
          </span>
        </div>
      </article>

      {banners.length > 1 && (
        <div className="home-banner-dots" aria-label="Navegação dos banners">
          {banners.map((b, idx) => (
            <button
              type="button"
              key={b.id || idx}
              className={`home-banner-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              aria-label={`Ir para banner ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function useMobileFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cm_mobile_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isFavorite = (slug: string) => favorites.includes(slug);

  const toggleFavorite = (slug: string) => {
    setFavorites((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      try {
        localStorage.setItem('cm_mobile_favorites', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return { favorites, isFavorite, toggleFavorite };
}

function ReferBusinessModal({
  businessName,
  businessSlug,
  onClose,
}: {
  businessName: string;
  businessSlug: string;
  onClose: () => void;
}) {
  const [referrerName, setReferrerName] = useState(() => {
    try {
      return localStorage.getItem('cm_mobile_referrer_name') || 'Ir. Membro';
    } catch {
      return 'Ir. Membro';
    }
  });
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSaveName = (newName: string) => {
    setReferrerName(newName);
    try {
      localStorage.setItem('cm_mobile_referrer_name', newName);
    } catch {}
  };

  const cleanName = referrerName.trim() || 'Membro Conexão Maçônica';
  const referralUrl = `https://conexaomaconica.com.br/guia/${encodeURIComponent(businessSlug)}?ind=${encodeURIComponent(cleanName)}`;
  const whatsappMessage = `Olá! Recomendo conhecer a empresa ${businessName} na rede Conexão Maçônica. Indicação fraterna de ${cleanName}: ${referralUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      const input = document.getElementById('refer-link-input') as HTMLInputElement | null;
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      }
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `Indicação: ${businessName}`,
          text: `Recomendo a empresa ${businessName} na Conexão Maçônica. Indicado por ${cleanName}.`,
          url: referralUrl,
        });
      } catch {}
    } else {
      await handleCopy();
    }
  };

  return (
    <div
      className="refer-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Indicar esta empresa"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="refer-modal-card">
        <button
          type="button"
          className="modal-close-btn"
          style={{ position: 'absolute', top: 14, right: 14 }}
          onClick={onClose}
          aria-label="Fechar"
        >
          ✕
        </button>

        <div className="refer-header">
          <div className="refer-header-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="#c9a227" strokeWidth="2" width="24" height="24">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h3 className="refer-title">Indicar esta empresa</h3>
            <p className="refer-subtitle">{businessName}</p>
          </div>
        </div>

        <div className="refer-explanation-box">
          <h4 className="refer-explanation-title">
            <span>🤝</span> Como funciona a indicação fraterna:
          </h4>
          <p className="refer-explanation-text">
            Ao indicar <strong>{businessName}</strong>, você ajuda a fortalecer empresas qualificadas da comunidade maçônica.
            O link gerado identifica seu nome como quem realizou a recomendação, garantindo credibilidade, fraternidade e transparência.
          </p>
        </div>

        <div className="refer-sender-box">
          <div className="refer-sender-label-row">
            <span className="refer-sender-label">Registrado com o seu nome:</span>
            {!isEditingName ? (
              <button
                type="button"
                className="refer-edit-name-btn"
                onClick={() => setIsEditingName(true)}
              >
                Alterar nome
              </button>
            ) : (
              <button
                type="button"
                className="refer-edit-name-btn"
                onClick={() => setIsEditingName(false)}
              >
                Concluir
              </button>
            )}
          </div>
          {isEditingName ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input
                type="text"
                className="refer-name-input"
                value={referrerName}
                onChange={(e) => handleSaveName(e.target.value)}
                placeholder="Digite seu nome (Ex: Ir. Douglas Ramos)"
                autoFocus
              />
              <button
                type="button"
                className="refer-copy-btn"
                onClick={() => setIsEditingName(false)}
                style={{ padding: '8px 14px' }}
              >
                Salvar
              </button>
            </div>
          ) : (
            <div className="refer-sender-display">
              <span>👤</span>
              <strong>{cleanName}</strong>
            </div>
          )}
        </div>

        <div className="refer-link-container">
          <input
            id="refer-link-input"
            type="text"
            readOnly
            value={referralUrl}
            className="refer-link-input"
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => e.currentTarget.select()}
            aria-label="Link de indicação fraterna"
          />
          <button
            type="button"
            className={`refer-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            aria-label={copied ? 'Link copiado' : 'Copiar link'}
          >
            {copied ? '✓ Copiado!' : 'Copiar Link'}
          </button>
        </div>

        <div className="refer-actions-grid">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noreferrer"
            className="refer-whatsapp-btn"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.15 4.2 4.293-1.126z" />
            </svg>
            <span>Compartilhar no WhatsApp</span>
          </a>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              className="refer-native-share-btn"
              onClick={handleNativeShare}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#4b161b" strokeWidth="2" width="18" height="18">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>Mais opções de envio</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const DEFAULT_BUSINESSES: MobileGuideSponsoredBusiness[] = [
  {
    id: 'biz-1',
    name: 'Óptica e Relojoaria Aliança',
    slug: 'optica-alianca',
    city: 'Feira de Santana',
    state: 'BA',
    latitude: -12.2572,
    longitude: -38.9605,
    address: 'Av. Getúlio Vargas, 1020 - Centro',
    category_name: 'Óticas e Relojoarias',
    category_slug: 'oticas-e-relojoarias',
    plan_tier: 'acacia',
    is_featured: true,
    is_pedra_fundamental: true,
    logo_url: null,
    cover_url: null,
    description: 'Armações nacionais e importadas, lentes de alta tecnologia e atendimento exclusivo para a família maçônica.',
  },
  {
    id: 'biz-2',
    name: 'Oficina & Centro Automotivo Fraternidade',
    slug: 'oficina-fraternidade',
    city: 'Feira de Santana',
    state: 'BA',
    latitude: -12.2635,
    longitude: -38.9542,
    address: 'Av. Presidente Dutra, 450 - Capuchinhos',
    category_name: 'Automotivo & Manutenção',
    category_slug: 'automotivo-e-manutencao',
    plan_tier: 'compasso',
    is_featured: true,
    is_pedra_fundamental: true,
    logo_url: null,
    cover_url: null,
    description: 'Mecânica geral, suspensão, injeção eletrônica e alinhamento 3D com transparência e laudos detalhados.',
  },
  {
    id: 'biz-3',
    name: 'Construtora & Engenharia Acácia',
    slug: 'construtora-acacia',
    city: 'Feira de Santana',
    state: 'BA',
    latitude: -12.2514,
    longitude: -38.9648,
    address: 'Rua São Domingos, 310 - Santa Mônica',
    category_name: 'Construção & Reformas',
    category_slug: 'construcao-e-reformas',
    plan_tier: 'acacia',
    is_featured: true,
    is_pedra_fundamental: false,
    logo_url: null,
    cover_url: null,
    description: 'Obras civis, reformas corporativas e laudos técnicos de engenharia civil com pontualidade e rigor.',
  },
  {
    id: 'biz-4',
    name: 'Restaurante & Parrilla O Esquadro',
    slug: 'restaurante-o-esquadro',
    city: 'Salvador',
    state: 'BA',
    latitude: -12.9777,
    longitude: -38.5016,
    address: 'Rua das Acácias, 88 - Pituba, Salvador',
    category_name: 'Alimentos & Bebidas',
    category_slug: 'alimentos-e-bebidas',
    plan_tier: 'esquadro',
    is_featured: false,
    is_pedra_fundamental: false,
    logo_url: null,
    cover_url: null,
    description: 'Gastronomia de primeira qualidade, cortes nobres na brasa e ambiente acolhedor para a família.',
  },
  {
    id: 'biz-5',
    name: 'Clínica Médica e Diagnóstico Harmonia',
    slug: 'clinica-harmonia',
    city: 'Feira de Santana',
    state: 'BA',
    latitude: -12.2591,
    longitude: -38.9682,
    address: 'Av. Maria Quitéria, 1500 - Kalilândia',
    category_name: 'Saúde & Psicologia',
    category_slug: 'saude-e-psicologia',
    plan_tier: 'compasso',
    is_featured: true,
    is_pedra_fundamental: true,
    logo_url: null,
    cover_url: null,
    description: 'Consultas multidisciplinares, exames preventivos e telemedicina com médicos renomados e idôneos.',
  },
  {
    id: 'biz-6',
    name: 'Advocacia & Consultoria Jurídica Hiram',
    slug: 'advocacia-hiram',
    city: 'Salvador',
    state: 'BA',
    latitude: -12.9850,
    longitude: -38.5120,
    address: 'Av. Tancredo Neves, 620 - Caminho das Árvores, Salvador',
    category_name: 'Direito & Advocacia',
    category_slug: 'direito-e-advocacia',
    plan_tier: 'acacia',
    is_featured: true,
    is_pedra_fundamental: true,
    logo_url: null,
    cover_url: null,
    description: 'Assessoria em direito empresarial, sucessório e contratual com máxima discrição e segurança jurídica.',
  },
];

function MuralDeConexoesSection({
  onOpenShareExperience,
  onSelectBusiness,
}: {
  onOpenShareExperience: () => void;
  onSelectBusiness?: (slug: string) => void;
}) {
  const [likes, setLikes] = useState<Record<string, { count: number; liked: boolean }>>({
    'conn-1': { count: 8, liked: false },
    'conn-2': { count: 14, liked: true },
    'conn-3': { count: 5, liked: false },
  });

  const toggleLike = (id: string) => {
    setLikes((prev) => {
      const current = prev[id] || { count: 0, liked: false };
      const nextLiked = !current.liked;
      return {
        ...prev,
        [id]: {
          count: nextLiked ? current.count + 1 : Math.max(0, current.count - 1),
          liked: nextLiked,
        },
      };
    });
  };

  const sampleConnections = [
    {
      id: 'conn-1',
      memberName: 'Ir. Fernando',
      actionVerb: 'comprou produtos na',
      businessName: 'Óptica e Relojoaria Aliança',
      businessSlug: 'optica-alianca',
      item: 'óculos solar e armação de grau',
      message: 'Atendimento fraterno exemplar e cumprimento pontual do benefício exclusivo da rede. Recomendo com toda certeza!',
      confirmed: true,
    },
    {
      id: 'conn-2',
      memberName: 'Ir. Carlos Alberto',
      actionVerb: 'contratou serviços na',
      businessName: 'Oficina & Centro Automotivo Fraternidade',
      businessSlug: 'oficina-fraternidade',
      item: 'revisão completa e alinhamento',
      message: 'Serviço executado com excelência, clareza no orçamento e transparência impecável. Fortalecendo quem fortalece a nossa rede.',
      confirmed: true,
    },
    {
      id: 'conn-3',
      memberName: 'Ir. Marcos',
      actionVerb: 'firmou parceria com',
      businessName: 'Construtora & Engenharia Acácia',
      businessSlug: 'construtora-acacia',
      item: 'fornecimento de esquadrias',
      message: 'Parceria frutífera realizada através do ecossistema Conexão Maçônica. Confiança mútua do início ao fim.',
      confirmed: true,
    },
  ];

  return (
    <section className="guide-section section-soft mural-section-wrapper" aria-labelledby="mural-title">
      <div className="mural-header-row">
        <div className="mural-header-title-block">
          <p className="eyebrow">Experiências reais da comunidade</p>
          <h2 id="mural-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="#8c671d" strokeWidth="2.2" width="22" height="22" aria-hidden="true">
              <path d="m11 17 2 2a1 1 0 0 0 1.4 0l4.3-4.3a1 1 0 0 0 0-1.4l-2.6-2.6a1 1 0 0 0-1.4 0L13 12.4" />
              <path d="m13 7.6-2.3-2.3a1 1 0 0 0-1.4 0L5 9.6a1 1 0 0 0 0 1.4l2.6 2.6a1 1 0 0 0 1.4 0L11 11.6" />
              <path d="m18 11 3 3" />
              <path d="m3 13 3-3" />
            </svg>
            <span>Mural de Conexões</span>
          </h2>
          <p className="mural-header-subtitle">
            Conexões reais de quem comprou, contratou, fez parceria ou visitou empresas da plataforma. Cada registro é confirmado pela empresa.
          </p>
        </div>
        <span className="mural-confirmed-badge">
          <span>✓</span> 42 confirmadas
        </span>
      </div>

      {/* Card Principal em Destaque (Formato Web Fiel) */}
      <div className="mural-banner-card">
        <div className="mural-banner-badge">
          <span>✨</span> Compartilhe experiências com a comunidade
        </div>
        <h3 className="mural-banner-title">
          Visitou ou comprou em uma empresa da Conexão? Conte como foi sua experiência...
        </h3>
        <p className="mural-banner-desc">
          Conte como foi, marque a empresa e, se quiser, compartilhe uma foto. Seu registro valoriza quem atende bem, inspira novas conexões e fortalece a Conexão Maçônica.
        </p>

        {/* 3 Passos Explicativos do Formato Web */}
        <div className="mural-steps-list">
          <div className="mural-step-item">
            <div className="mural-step-icon-box">1</div>
            <div className="mural-step-content">
              <h4 className="mural-step-title">Escolha a empresa</h4>
              <p className="mural-step-desc">
                Busque pelo nome e selecione a empresa que você visitou, onde comprou, contratou um serviço ou realizou uma parceria.
              </p>
            </div>
          </div>

          <div className="mural-step-item">
            <div className="mural-step-icon-box">2</div>
            <div className="mural-step-content">
              <h4 className="mural-step-title">Conte sua experiência</h4>
              <p className="mural-step-desc">
                Escolha o tipo de atendimento, adicione seu relato e, se quiser, envie uma foto da experiência (foto e comentário são opcionais).
              </p>
            </div>
          </div>

          <div className="mural-step-item">
            <div className="mural-step-icon-box">3</div>
            <div className="mural-step-content">
              <h4 className="mural-step-title">Confirmação e publicação</h4>
              <p className="mural-step-desc">
                A empresa e a administração da plataforma precisam validar o atendimento antes de a publicação ser exibida publicamente.
              </p>
            </div>
          </div>
        </div>

        <div className="mural-cta-action-row">
          <button
            type="button"
            className="mural-share-cta-btn"
            onClick={onOpenShareExperience}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="18" height="18" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>Compartilhar minha experiência</span>
          </button>
          <p className="mural-cta-footer-note">
            É necessário estar logado como membro. Seu primeiro nome só será exibido após a confirmação da empresa.
          </p>
        </div>
      </div>

      {/* Feed com registros confirmados pela comunidade */}
      <div className="mural-feed-list" aria-label="Depoimentos recentes do Mural">
        {sampleConnections.map((item) => {
          const likeState = likes[item.id] || { count: 0, liked: false };
          return (
            <article key={item.id} className="mural-feed-card">
              <div className="mural-feed-card-header">
                <span className="mural-feed-member-info">
                  <strong>{item.memberName}</strong> {item.actionVerb}{' '}
                  <a
                    href={`#/empresas`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (onSelectBusiness) onSelectBusiness(item.businessSlug);
                    }}
                  >
                    {item.businessName}
                  </a>
                  {item.item && <span style={{ color: '#6b7280' }}> ({item.item})</span>}
                </span>
              </div>

              {item.message && (
                <div className="mural-feed-body">
                  <p className="mural-feed-quote">&ldquo;{item.message}&rdquo;</p>
                </div>
              )}

              <div className="mural-feed-card-footer">
                <span className="mural-feed-verified-badge">
                  <span>✓</span> Confirmado pela empresa
                </span>
                <button
                  type="button"
                  className={`mural-feed-like-btn ${likeState.liked ? 'liked' : ''}`}
                  onClick={() => toggleLike(item.id)}
                  title={likeState.liked ? 'Descurtir' : 'Apoiar e curtir'}
                >
                  <span>{likeState.liked ? '❤️' : '🤍'}</span>
                  <span>{likeState.count}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MemberLoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { id: string; name: string; email: string }) => void;
}) {
  const [email, setEmail] = useState('membro@conexaomaconica.com.br');
  const [password, setPassword] = useState('12345678');
  const [memberName, setMemberName] = useState(() => {
    try {
      return localStorage.getItem('cm_mobile_referrer_name') || 'Ir. Membro';
    } catch {
      return 'Ir. Membro';
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, informe um e-mail válido de membro.');
      return;
    }
    setLoading(true);
    setError(null);

    setTimeout(() => {
      setLoading(false);
      const user = {
        id: 'member-' + Date.now(),
        name: memberName.trim() || 'Ir. Membro',
        email: email.trim(),
      };
      onLoginSuccess(user);
    }, 400);
  };

  return (
    <div
      className="refer-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Acesso Exclusivo de Membro"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="member-login-card">
        <button
          type="button"
          className="modal-close-btn"
          style={{ position: 'absolute', top: 14, right: 14 }}
          onClick={onClose}
          disabled={loading}
          aria-label="Fechar"
        >
          ✕
        </button>

        <div className="member-login-badge">
          <span>🔒</span> Área Exclusiva para Membros
        </div>

        <h3 className="refer-title" style={{ fontSize: '1.25rem', marginBottom: 4 }}>
          Acesse sua conta
        </h3>
        <p className="refer-subtitle" style={{ maxWidth: '100%', marginBottom: 16 }}>
          Para registrar e compartilhar sua experiência no Mural de Conexões, confirme seu acesso como membro da comunidade.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="experience-field-label">
            Nome do Irmão / Membro:
          </label>
          <input
            type="text"
            className="member-login-input"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            placeholder="Ex.: Ir. Carlos Alberto"
            required
          />

          <label className="experience-field-label">
            E-mail cadastrado:
          </label>
          <input
            type="email"
            className="member-login-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu.email@dominio.com"
            required
          />

          <label className="experience-field-label">
            Senha:
          </label>
          <input
            type="password"
            className="member-login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && (
            <p style={{ color: '#be123c', fontSize: '0.78rem', margin: '4px 0 10px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="member-login-submit-btn"
            disabled={loading}
          >
            {loading ? 'Validando acesso...' : 'Acessar como Membro'}
          </button>

          <p className="member-login-note">
            Ambiente protegido e confidencial. Dados preservados conforme regras fraternais e LGPD.
          </p>
        </form>
      </div>
    </div>
  );
}

function ShareExperienceModal({
  isOpen,
  onClose,
  initialCompanySlug,
  businesses,
  memberUser,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialCompanySlug?: string | null;
  businesses: MobileGuideSponsoredBusiness[];
  memberUser: { name: string; email: string } | null;
}) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialCompanySlug || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [experienceType, setExperienceType] = useState<'compra' | 'servico' | 'parceria' | 'visita'>('compra');
  const [item, setItem] = useState('');
  const [comment, setComment] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [shareOnMural, setShareOnMural] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (initialCompanySlug) {
      setSelectedSlug(initialCompanySlug);
    }
  }, [initialCompanySlug]);

  if (!isOpen) return null;

  const currentBusiness = businesses.find((b) => b.slug === selectedSlug);

  const filteredBusinesses = businesses.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.category_name && b.category_name.toLowerCase().includes(q)) ||
      (b.city && b.city.toLowerCase().includes(q))
    );
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoDataUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;
    setSubmitting(true);

    setTimeout(() => {
      setSubmitting(false);
      setIsDone(true);
    }, 550);
  };

  const handleResetAndClose = () => {
    setIsDone(false);
    setItem('');
    setComment('');
    setPhotoDataUrl(null);
    setShareOnMural(true);
    onClose();
  };

  const firstName = (memberUser?.name || 'Membro').split(' ')[0];

  return (
    <div
      className="experience-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Compartilhar Experiência"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) handleResetAndClose();
      }}
    >
      <div className="experience-modal-card">
        <button
          type="button"
          className="modal-close-btn"
          style={{ position: 'absolute', top: 14, right: 14 }}
          onClick={handleResetAndClose}
          disabled={submitting}
          aria-label="Fechar"
        >
          ✕
        </button>

        {isDone ? (
          <div className="experience-success-wrapper">
            <div className="experience-success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3 className="experience-success-title">Experiência Registrada com Sucesso!</h3>
            <p className="experience-success-desc">
              Obrigado por fortalecer a comunidade! Avisamos <strong>{currentBusiness?.name}</strong> sobre o seu relato.
              {shareOnMural
                ? ' Assim que a empresa confirmar o atendimento e a administração da plataforma validar a publicação, sua experiência será exibida com honra no Mural de Conexões.'
                : ' Como você optou por não compartilhar publicamente, o registro foi computado internamente para fortalecimento da empresa.'}
            </p>
            <button
              type="button"
              className="experience-submit-btn"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleResetAndClose}
            >
              Concluir
            </button>
          </div>
        ) : (
          <>
            <div className="experience-modal-header">
              <div className="experience-header-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <div>
                <h3 className="experience-header-title">Compartilhar Experiência</h3>
                <p className="experience-header-subtitle">Mural de Conexões da Conexão Maçônica</p>
              </div>
            </div>

            {/* SELEÇÃO DA EMPRESA */}
            {!currentBusiness ? (
              <div className="experience-company-search-box">
                <label className="experience-field-label">
                  Escolha a empresa <span>(busca pelo nome)</span>:
                </label>
                <div className="experience-search-input-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="experience-company-search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Digite o nome da empresa..."
                    autoFocus
                  />
                </div>

                <div className="experience-company-results-list" role="listbox">
                  {filteredBusinesses.slice(0, 10).map((biz) => (
                    <button
                      type="button"
                      key={biz.id}
                      className="experience-company-result-btn"
                      onClick={() => {
                        setSelectedSlug(biz.slug);
                        setSearchQuery('');
                      }}
                    >
                      {biz.logo_url ? (
                        <img src={biz.logo_url} alt={biz.name} className="experience-company-mini-logo" />
                      ) : (
                        <div className="experience-company-mini-logo">
                          {biz.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="experience-company-result-name">{biz.name}</span>
                        <span className="experience-company-result-city">
                          {[biz.category_name, biz.city].filter(Boolean).join(' • ')}
                        </span>
                      </div>
                    </button>
                  ))}
                  {filteredBusinesses.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.8rem', padding: '14px 8px' }}>
                      Nenhuma empresa encontrada com &quot;{searchQuery}&quot;.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="experience-selected-company-card">
                <div className="experience-selected-company-left">
                  {currentBusiness.logo_url ? (
                    <img src={currentBusiness.logo_url} alt={currentBusiness.name} className="experience-company-mini-logo" />
                  ) : (
                    <div className="experience-company-mini-logo">
                      {currentBusiness.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#3b0b14', display: 'block' }}>
                      {currentBusiness.name}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                      {[currentBusiness.category_name, currentBusiness.city].filter(Boolean).join(' • ')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="experience-change-company-btn"
                  onClick={() => setSelectedSlug(null)}
                >
                  Trocar empresa
                </button>
              </div>
            )}

            {currentBusiness && (
              <form onSubmit={handleSubmit}>
                {/* 1. ESCOLHA DE COMO FOI A EXPERIÊNCIA */}
                <label className="experience-field-label">
                  Como foi a sua experiência?
                </label>
                <div className="experience-type-grid" role="radiogroup">
                  <button
                    type="button"
                    className={`experience-type-option-btn ${experienceType === 'compra' ? 'active' : ''}`}
                    onClick={() => setExperienceType('compra')}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🛍️</span>
                    <span>Compra realizada</span>
                  </button>
                  <button
                    type="button"
                    className={`experience-type-option-btn ${experienceType === 'servico' ? 'active' : ''}`}
                    onClick={() => setExperienceType('servico')}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🔧</span>
                    <span>Serviço contratado</span>
                  </button>
                  <button
                    type="button"
                    className={`experience-type-option-btn ${experienceType === 'parceria' ? 'active' : ''}`}
                    onClick={() => setExperienceType('parceria')}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🤝</span>
                    <span>Parceria realizada</span>
                  </button>
                  <button
                    type="button"
                    className={`experience-type-option-btn ${experienceType === 'visita' ? 'active' : ''}`}
                    onClick={() => setExperienceType('visita')}
                  >
                    <span style={{ fontSize: '1.2rem' }}>📍</span>
                    <span>Visita realizada</span>
                  </button>
                </div>

                {/* 2. O QUE COMPROU OU CONTRATOU */}
                <label className="experience-field-label">
                  {experienceType === 'visita' ? 'O que conheceu ou fez no local?' : 'O que comprou ou contratou?'} <span>(opcional)</span>
                </label>
                <input
                  type="text"
                  className="experience-text-input"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  maxLength={160}
                  placeholder={
                    experienceType === 'visita'
                      ? 'Ex.: Conheci a loja física, participei de reunião'
                      : experienceType === 'servico'
                      ? 'Ex.: Manutenção veicular, assessoria contábil'
                      : experienceType === 'parceria'
                      ? 'Ex.: Fornecimento mútuo, apoio a evento'
                      : 'Ex.: Óculos de grau, almoço em família'
                  }
                />

                {/* 3. COMENTÁRIO / RELATO */}
                <label className="experience-field-label">
                  Seu relato / comentário: <span>(opcional)</span>
                </label>
                <textarea
                  className="experience-textarea"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={400}
                  rows={3}
                  placeholder="Conte como foi o atendimento, a cordialidade e a qualidade do serviço..."
                />

                {/* 4. ENVIO DE FOTO OPCIONAL */}
                <div className="experience-photo-upload-row">
                  <label className="experience-field-label">
                    Foto da experiência: <span>(opcional)</span>
                  </label>
                  {photoDataUrl ? (
                    <div className="experience-photo-preview-wrap">
                      <img src={photoDataUrl} alt="Foto da experiência" className="experience-photo-thumbnail" />
                      <button
                        type="button"
                        className="experience-remove-photo-btn"
                        onClick={() => setPhotoDataUrl(null)}
                      >
                        Remover foto
                      </button>
                    </div>
                  ) : (
                    <label className="experience-photo-add-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span>Tirar ou anexar foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  )}
                </div>

                {/* 5. MARCA SE AUTORIZA COMPARTILHAR */}
                <label className="experience-share-checkbox-card">
                  <input
                    type="checkbox"
                    checked={shareOnMural}
                    onChange={(e) => setShareOnMural(e.target.checked)}
                  />
                  <div>
                    <span className="experience-share-checkbox-title">
                      Autorizo compartilhar no Mural de Conexões
                    </span>
                    <span className="experience-share-checkbox-desc">
                      Seu registro poderá aparecer no Mural público da comunidade (com seu primeiro nome: <strong>{firstName}</strong>) para valorizar e inspirar a rede. Sem isso, conta apenas internamente para a empresa.
                    </span>
                  </div>
                </label>

                {/* 6. AVISO DE VALIDAÇÃO PRÉVIA PELA EMPRESA E ADMIN */}
                <div className="experience-validation-alert-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <div className="experience-validation-alert-text">
                    <strong>Validação Prévia Obrigatória:</strong> A empresa e a administração da plataforma precisam validar o atendimento antes de a publicação ser exibida no Mural. Valores financeiros nunca são divulgados.
                  </div>
                </div>

                <div className="experience-modal-actions-row">
                  <button
                    type="button"
                    className="experience-cancel-btn"
                    onClick={handleResetAndClose}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="experience-submit-btn"
                    disabled={submitting}
                  >
                    {submitting ? 'Enviando...' : 'Enviar para Validação'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BusinessCard({
  business,
  onSelect,
  onZoomLogo,
  isFavorited,
  onToggleFavorite,
  onRefer,
  showBenefitBadge = false,
}: {
  business: MobileGuideSponsoredBusiness;
  onSelect?: (slug: string) => void;
  onZoomLogo?: (logoUrl: string, name: string, backgroundColor?: string | null) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (slug: string, name?: string) => void;
  onRefer?: (name: string, slug: string) => void;
  showBenefitBadge?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const location = [business.city, business.state].filter(Boolean).join(', ');
  const coverSrc = (!coverError && business.cover_url) ? business.cover_url : '/capafallback.png';
  const coverOffsetY = typeof business.cover_offset_y === 'number' ? business.cover_offset_y : 50;
  const coverZoom = typeof business.cover_zoom === 'number' && business.cover_zoom >= 100 ? business.cover_zoom : 100;
  const coverFitMode = business.cover_fit_mode === 'contain' ? 'contain' : 'cover';

  return (
    <article
      className="business-card-web-replica"
      key={business.id}
      onClick={() => onSelect?.(business.slug)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(business.slug);
        }
      }}
    >
      {/* 1. Capa / Banner do Card */}
      <div
        className="card-cover-container"
        style={business.cover_background_color ? { background: business.cover_background_color } : undefined}
      >
        <img
          src={coverSrc}
          alt={business.name}
          className="card-cover-img"
          loading="lazy"
          onError={() => setCoverError(true)}
          style={{
            objectFit: coverFitMode,
            objectPosition: `center ${coverOffsetY}%`,
            transform: coverZoom > 100 ? `scale(${coverZoom / 100})` : undefined,
            transformOrigin: `center ${coverOffsetY}%`,
          }}
        />
        {showBenefitBadge && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              zIndex: 5,
              background: 'linear-gradient(135deg, #c9a227, #9b751e)',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 999,
              boxShadow: '0 2px 8px rgba(0,0,0,0.28)',
              letterSpacing: '0.03em',
            }}
          >
            🎁 Benefício Exclusivo
          </span>
        )}
        {/* Ações Flutuantes Discretas (Favoritar / Compartilhar como Indicação) */}
        <div className="card-cover-actions">
          <button
            type="button"
            className={`card-action-circle-btn ${isFavorited ? 'favorited' : ''}`}
            title={isFavorited ? 'Remover dos favoritos' : 'Favoritar empresa'}
            aria-label={isFavorited ? 'Remover dos favoritos' : 'Favoritar empresa'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(business.slug, business.name);
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill={isFavorited ? '#e11d48' : 'none'}
              stroke={isFavorited ? '#e11d48' : '#3b0b14'}
              strokeWidth="2"
              width="16"
              height="16"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </button>
          <button
            type="button"
            className="card-action-circle-btn"
            title="Indicar esta empresa"
            aria-label="Indicar esta empresa"
            onClick={(e) => {
              e.stopPropagation();
              onRefer?.(business.name, business.slug);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#3b0b14" strokeWidth="2" width="16" height="16">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. Transição da Capa para o Conteúdo: [ LOGO ] ... [ SELO PEDRA FUNDAMENTAL ] */}
      <div className="card-overlap-row">
        {/* Logo da Empresa */}
        <div
          className="card-logo-box"
          style={business.logo_background_color ? { background: business.logo_background_color } : undefined}
          onClick={(e) => {
            if (business.logo_url) {
              e.stopPropagation();
              onZoomLogo?.(business.logo_url, business.name, business.logo_background_color);
            }
          }}
          title="Toque para ampliar a logomarca"
        >
          {business.logo_url && !imgError ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="card-logo-img"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="card-logo-placeholder">
              {business.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Selo Pedra Fundamental (Apenas se for Pedra Fundamental) */}
        {business.is_pedra_fundamental && (
          <div className="card-pedra-fundamental-seal-box" title="Condecoração Especial Pedra Fundamental">
            <img
              src={PEDRA_FUNDAMENTAL_ROUND_SEAL}
              alt="Pedra Fundamental"
              className="card-pedra-seal-img"
              onError={(e) => {
                e.currentTarget.src = PEDRA_FUNDAMENTAL_SEAL;
              }}
            />
          </div>
        )}
      </div>

      {/* 3. Informações da Empresa */}
      <div className="card-content-body">
        <h3 className="card-company-name">{business.name}</h3>

        {location && (
          <div className="card-info-line">
            <svg viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="2" width="14" height="14">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{location}</span>
          </div>
        )}

        {business.category_name && (
          <div className="card-info-line">
            <svg viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="2" width="14" height="14">
              <rect width="20" height="14" x="2" y="7" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <span>{business.category_name}</span>
          </div>
        )}

        {typeof business.views_count === 'number' && (
          <div className="card-info-line" style={{ marginTop: 2 }}>
            <span className="card-views-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="#8c671d" strokeWidth="2" width="13" height="13">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>{business.views_count} {business.views_count === 1 ? 'visualização' : 'visualizações'}</span>
            </span>
          </div>
        )}
      </div>

      {/* 4. Rodapé do Card: Ações rápidas e "Ver empresa" */}
      <div className="card-footer-row">
        <button
          type="button"
          className="card-footer-refer-btn"
          onClick={(e) => {
            e.stopPropagation();
            onRefer?.(business.name, business.slug);
          }}
          title="Indicar esta empresa com seu nome"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#8c671d" strokeWidth="2" width="13" height="13">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>Indicar</span>
        </button>
        <span className="card-btn-ver-empresa">
          Ver empresa →
        </span>
      </div>
    </article>
  );
}

function AnuncioModal({
  isOpen,
  onClose,
  detail,
  isFavorited,
  onToggleFavorite,
  onRefer,
}: {
  isOpen: boolean;
  onClose: () => void;
  detail: MobileBusinessDetail | null;
  isFavorited?: boolean;
  onToggleFavorite?: (slug: string, name?: string) => void;
  onRefer?: (name: string, slug: string) => void;
}) {
  if (!isOpen || !detail) return null;

  const plan = normalizePlanCode(detail.effective_plan_code);
  const flyerUrl = detail.cover_url || detail.media?.[0]?.url;

  const contacts = detail.contacts ?? [];
  const whatsappContact =
    contacts.find((c) => c.type.toLowerCase().includes('whatsapp')) ||
    (detail.responsible?.whatsapp
      ? { value: detail.responsible.whatsapp, label: 'WhatsApp', type: 'whatsapp', id: 'resp-wa' }
      : null);
  const phoneContact = contacts.find(
    (c) =>
      c.type.toLowerCase().includes('phone') ||
      c.type.toLowerCase().includes('telefone') ||
      c.type.toLowerCase().includes('celular')
  );
  const emailContact = contacts.find(
    (c) => c.type.toLowerCase().includes('email') || c.type.toLowerCase().includes('e-mail')
  );
  const instagramContact = contacts.find((c) => c.type.toLowerCase().includes('instagram'));
  const facebookContact = contacts.find((c) => c.type.toLowerCase().includes('facebook'));
  const linkedinContact = contacts.find((c) => c.type.toLowerCase().includes('linkedin'));
  const youtubeContact = contacts.find((c) => c.type.toLowerCase().includes('youtube'));
  const websiteContact = contacts.find(
    (c) =>
      c.type.toLowerCase().includes('site') ||
      c.type.toLowerCase().includes('web') ||
      c.type.toLowerCase().includes('url')
  );

  const cleanWaNumber = whatsappContact?.value ? whatsappContact.value.replace(/\D/g, '') : '';
  const waUrl = cleanWaNumber
    ? `https://wa.me/${cleanWaNumber.length <= 11 ? '55' + cleanWaNumber : cleanWaNumber}?text=${encodeURIComponent(
        `Olá! Vi seu anúncio no app da Conexão Maçônica e gostaria de mais informações.`
      )}`
    : null;

  const locationQuery = [detail.business_name, detail.address, detail.city, detail.state]
    .filter(Boolean)
    .join(', ');
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationQuery)}`;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Anúncio Oficial da Empresa"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ zIndex: 1200 }}
    >
      <div className="anuncio-modal-sheet">
        <div className="anuncio-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.2rem' }}>🪧</span>
            <h3>Anúncio Oficial</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className={`top-nav-circle-action-btn ${isFavorited ? 'favorited' : ''}`}
              title={isFavorited ? 'Remover dos favoritos' : 'Favoritar empresa'}
              onClick={() => onToggleFavorite?.(detail.business_slug, detail.business_name)}
              aria-label={isFavorited ? 'Remover dos favoritos' : 'Favoritar empresa'}
            >
              <svg
                viewBox="0 0 24 24"
                fill={isFavorited ? '#ffffff' : 'none'}
                stroke={isFavorited ? '#ffffff' : '#f3eedd'}
                strokeWidth="2"
                width="16"
                height="16"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </button>
            <button
              type="button"
              className="top-nav-circle-action-btn"
              title="Indicar esta empresa"
              onClick={() => onRefer?.(detail.business_name, detail.business_slug)}
              aria-label="Indicar esta empresa"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#f3eedd" strokeWidth="2" width="16" height="16">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Fechar Anúncio"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="anuncio-body">
          {/* Capa / Flyer Comercial */}
          <div className="anuncio-flyer-wrapper">
            {flyerUrl ? (
              <img
                src={flyerUrl}
                alt={`Anúncio ${detail.business_name}`}
                className="anuncio-flyer-img"
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: 180,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #4b161b, #2b060d)',
                  color: '#fff',
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: 6 }}>🏛️</div>
                <h4 style={{ margin: 0, font: '700 1.1rem/1.2 Georgia, serif', color: '#c9a227' }}>
                  {detail.business_name}
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '.8rem', color: '#f3e8d7' }}>
                  Anúncio Oficial na Conexão Maçônica
                </p>
              </div>
            )}
          </div>

          {/* Dados Rápidos da Empresa */}
          <div className="anuncio-business-info">
            {detail.logo_url ? (
              <img
                src={detail.logo_url}
                alt={detail.business_name}
                className="anuncio-logo-thumb"
              />
            ) : (
              <div
                className="anuncio-logo-thumb"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#4b161b',
                }}
              >
                {detail.business_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4
                style={{
                  margin: '0 0 4px',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#4b161b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {detail.business_name}
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <PlanSealBadge plan={plan} />
                {detail.is_pedra_fundamental && <PedraFundamentalSealBadge sealOnly />}
              </div>
            </div>
          </div>

          {/* Botão Traçar Rota de Alto Destaque */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="anuncio-actions-title">Como Chegar</span>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-rota-gps"
              title="Abrir trajeto no GPS / Google Maps"
            >
              <span style={{ fontSize: '1.2rem' }}>📍</span>
              <span>Traçar Rota no GPS</span>
            </a>
          </div>

          {/* Contatos Rápidos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="anuncio-actions-title">Contatos Rápidos</span>
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="whatsapp-primary-btn"
                onClick={() => {
                  if (detail?.business_id) {
                    trackMobileEvent({
                      businessId: detail.business_id,
                      eventType: 'whatsapp',
                      city: detail.city,
                      state: detail.state,
                    });
                  }
                }}
              >
                <span>💬</span>
                <span>Falar no WhatsApp</span>
              </a>
            )}

            <div className="detail-fraternal-actions-row">
              <button
                type="button"
                className="btn-indicar-fraterno"
                onClick={() => {
                  if (detail?.business_id) {
                    trackMobileEvent({
                      businessId: detail.business_id,
                      eventType: 'share',
                      city: detail.city,
                      state: detail.state,
                    });
                  }
                  onRefer?.(detail.business_name, detail.business_slug);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" width="18" height="18">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <div className="btn-indicar-text">
                  <strong>Indicar Empresa</strong>
                  <small>Com seu nome</small>
                </div>
              </button>

              <button
                type="button"
                className={`btn-favoritar-fraterno ${isFavorited ? 'favorited' : ''}`}
                onClick={() => onToggleFavorite?.(detail.business_slug, detail.business_name)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill={isFavorited ? '#e11d48' : 'none'}
                  stroke={isFavorited ? '#e11d48' : '#4b161b'}
                  strokeWidth="2"
                  width="18"
                  height="18"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
                <div className="btn-favoritar-text">
                  <strong>{isFavorited ? 'Favoritada' : 'Favoritar'}</strong>
                  <small>{isFavorited ? 'Salva' : 'Salvar'}</small>
                </div>
              </button>
            </div>

            <div className="contacts-grid">
              {phoneContact && (
                <a
                  href={`tel:${phoneContact.value.replace(/\D/g, '')}`}
                  className="contact-item-btn"
                >
                  <span>📞</span>
                  <span>Ligar</span>
                </a>
              )}
              {emailContact && (
                <a href={`mailto:${emailContact.value}`} className="contact-item-btn">
                  <span>✉️</span>
                  <span>E-mail</span>
                </a>
              )}
            </div>
          </div>

          {/* Redes Sociais & Web */}
          {(instagramContact || websiteContact || facebookContact || linkedinContact || youtubeContact) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="anuncio-actions-title">Redes Sociais & Web</span>
              <div className="contacts-grid">
                {instagramContact && (
                  <a
                    href={
                      instagramContact.value.startsWith('http')
                        ? instagramContact.value
                        : `https://instagram.com/${instagramContact.value.replace('@', '')}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="contact-item-btn"
                  >
                    <span>📸</span>
                    <span>Instagram</span>
                  </a>
                )}
                {websiteContact && (
                  <a
                    href={
                      websiteContact.value.startsWith('http')
                        ? websiteContact.value
                        : `https://${websiteContact.value}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="contact-item-btn"
                  >
                    <span>🌐</span>
                    <span>Site Oficial</span>
                  </a>
                )}
                {facebookContact && (
                  <a
                    href={
                      facebookContact.value.startsWith('http')
                        ? facebookContact.value
                        : `https://facebook.com/${facebookContact.value.replace(/^@/, '')}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="contact-item-btn"
                  >
                    <span>📘</span>
                    <span>Facebook</span>
                  </a>
                )}
                {linkedinContact && (
                  <a
                    href={
                      linkedinContact.value.startsWith('http')
                        ? linkedinContact.value
                        : `https://linkedin.com/in/${linkedinContact.value.replace(/^@/, '')}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="contact-item-btn"
                  >
                    <span>💼</span>
                    <span>LinkedIn</span>
                  </a>
                )}
                {youtubeContact && (
                  <a
                    href={
                      youtubeContact.value.startsWith('http')
                        ? youtubeContact.value
                        : `https://youtube.com/${youtubeContact.value}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="contact-item-btn"
                  >
                    <span>▶️</span>
                    <span>YouTube</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BusinessDetailModal({
  slug,
  onClose,
  onZoomLogo,
  isFavorited,
  onToggleFavorite,
  onRefer,
  onShareExperience,
}: {
  slug: string | null;
  onClose: () => void;
  onZoomLogo?: (url: string, name: string, backgroundColor?: string | null) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (slug: string, name?: string) => void;
  onRefer?: (name: string, slug: string) => void;
  onShareExperience?: (slug: string) => void;
}) {
  const [detail, setDetail] = useState<MobileBusinessDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnuncioOpen, setIsAnuncioOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'sobre' | 'selos' | 'servicos' | 'fotos' | 'beneficio' | 'comentarios' | 'localizacao'>('sobre');
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  const guideServiceRef = useRef(createMobileGuideService());

  useEffect(() => {
    if (!slug) {
      if (detail?.business_id) {
        resetMobileCycleId(detail.business_id);
      }
      setDetail(null);
      setError(null);
      setIsAnuncioOpen(false);
      setActiveTab('sobre');
      setActivePhotoIndex(null);
      return;
    }
    setLoading(true);
    setError(null);
    guideServiceRef.current
      .loadBusinessDetail(slug)
      .then((data) => {
        if (!data) {
          setError('Empresa não encontrada ou temporariamente indisponível.');
        } else {
          setDetail(data);
          if (data.business_id) {
            trackMobileEvent({
              businessId: data.business_id,
              eventType: 'view',
              city: data.city,
              state: data.state,
            });
          }
        }
      })
      .catch(() => {
        setError('Não foi possível carregar os dados desta empresa.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  if (!slug) return null;

  const plan = normalizePlanCode(detail?.effective_plan_code);
  const isAcacia = plan === 'acacia';
  const isCompasso = plan === 'compasso';

  const locationText = [detail?.city, detail?.state].filter(Boolean).join(' - ');

  // Contatos
  const contacts = detail?.contacts ?? [];
  const whatsappContact =
    contacts.find((c) => c.type.toLowerCase().includes('whatsapp')) ||
    (detail?.responsible?.whatsapp
      ? { value: detail.responsible.whatsapp, label: 'WhatsApp', type: 'whatsapp', id: 'resp-wa' }
      : null);
  const phoneContact = contacts.find(
    (c) =>
      c.type.toLowerCase().includes('phone') ||
      c.type.toLowerCase().includes('telefone') ||
      c.type.toLowerCase().includes('celular')
  );
  const emailContact = contacts.find(
    (c) => c.type.toLowerCase().includes('email') || c.type.toLowerCase().includes('e-mail')
  );
  const instagramContact = contacts.find((c) => c.type.toLowerCase().includes('instagram'));
  const facebookContact = contacts.find((c) => c.type.toLowerCase().includes('facebook'));
  const linkedinContact = contacts.find((c) => c.type.toLowerCase().includes('linkedin'));
  const youtubeContact = contacts.find((c) => c.type.toLowerCase().includes('youtube'));
  const websiteContact = contacts.find(
    (c) =>
      c.type.toLowerCase().includes('site') ||
      c.type.toLowerCase().includes('web') ||
      c.type.toLowerCase().includes('url')
  );

  const cleanWaNumber = whatsappContact?.value ? whatsappContact.value.replace(/\D/g, '') : '';
  const waUrl = cleanWaNumber
    ? `https://wa.me/${cleanWaNumber.length <= 11 ? '55' + cleanWaNumber : cleanWaNumber}?text=${encodeURIComponent(
        `Olá! Vi sua empresa no app da Conexão Maçônica e gostaria de mais informações.`
      )}`
    : null;

  // Mídias
  const mediaList = detail?.media ?? [];
  const videoMedia = mediaList.find(
    (m) => m.media_type === 'video' || m.url.toLowerCase().endsWith('.mp4')
  );
  const photoMedia = mediaList.filter(
    (m) => m !== videoMedia && (m.media_type === 'image' || !m.url.toLowerCase().endsWith('.mp4'))
  );

  const heroCoverUrl = detail?.cover_url || photoMedia[0]?.url || null;

  return (
    <>
      <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Perfil da Empresa"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="business-detail-sheet">
          <div className="detail-top-nav">
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Fechar"
            >
              ✕
            </button>
            {detail && (
              <>
                <span className="detail-top-nav-title">{detail.business_name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    className={`top-nav-circle-action-btn ${isFavorited ? 'favorited' : ''}`}
                    title={isFavorited ? 'Remover dos favoritos' : 'Favoritar empresa'}
                    onClick={() => onToggleFavorite?.(detail.business_slug, detail.business_name)}
                    aria-label={isFavorited ? 'Remover dos favoritos' : 'Favoritar empresa'}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill={isFavorited ? '#ffffff' : 'none'}
                      stroke={isFavorited ? '#ffffff' : '#f3eedd'}
                      strokeWidth="2"
                      width="16"
                      height="16"
                    >
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="top-nav-circle-action-btn"
                    title="Indicar esta empresa"
                    onClick={() => onRefer?.(detail.business_name, detail.business_slug)}
                    aria-label="Indicar esta empresa"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#f3eedd" strokeWidth="2" width="16" height="16">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="btn-ver-anuncio"
                    onClick={() => setIsAnuncioOpen(true)}
                    title="Ver anúncio com capa, contatos e traçar rota"
                  >
                    <span>🪧</span>
                    <span>Ver Anúncio</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="detail-scroll-container">
            {loading && (
              <div style={{ padding: 48, textAlign: 'center', color: '#7a6e67' }}>
                <span className="pull-refresh-spinner" style={{ margin: '0 auto 16px' }} />
                <p style={{ margin: 0, fontWeight: 750, fontSize: '.9rem' }}>
                  Carregando perfil da empresa...
                </p>
              </div>
            )}

            {error && !loading && (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ color: '#8c2424', fontWeight: 750 }}>{error}</p>
                <button
                  type="button"
                  className="gps-action-btn"
                  style={{ marginTop: 12 }}
                  onClick={onClose}
                >
                  Voltar
                </button>
              </div>
            )}

            {detail && !loading && (
              <>
                {/* Capa com padrão visual de acordo com o plano (Acácia ganha hero bordô premium) */}
                <div
                  className={`detail-hero-banner hero-${plan} ${isAcacia ? 'hero-acacia-premium' : ''}`}
                  style={detail.cover_background_color ? { background: detail.cover_background_color } : undefined}
                >
                  {heroCoverUrl ? (
                    <img
                      src={heroCoverUrl}
                      alt=""
                      loading="lazy"
                      style={{
                        objectFit: detail.cover_fit_mode === 'contain' ? 'contain' : 'cover',
                        objectPosition: `center ${typeof detail.cover_offset_y === 'number' ? detail.cover_offset_y : 50}%`,
                        transform: typeof detail.cover_zoom === 'number' && detail.cover_zoom > 100 ? `scale(${detail.cover_zoom / 100})` : undefined,
                        transformOrigin: `center ${typeof detail.cover_offset_y === 'number' ? detail.cover_offset_y : 50}%`,
                      }}
                    />
                  ) : null}
                  <div className="detail-hero-overlay" />
                </div>

                {/* Informações da Marca e Cabeçalho: Bordô nobre para Acácia, Branco para Compasso e Esquadro */}
                <div className={`detail-header-card ${isAcacia ? 'header-card-acacia' : 'header-card-standard'}`}>
                  {/* Caixa Branca Centralizada da Logomarca */}
                  <div
                    className="detail-logo-white-box"
                    style={detail.logo_background_color ? { backgroundColor: detail.logo_background_color } : undefined}
                  >
                    {detail.logo_url ? (
                      <button
                        type="button"
                        className="detail-logo-inner-btn"
                        onClick={() => onZoomLogo?.(detail.logo_url!, detail.business_name, detail.logo_background_color)}
                        title="Toque para ampliar a logomarca"
                      >
                        <img
                          className="detail-logo-img"
                          src={detail.logo_url}
                          alt={detail.business_name}
                        />
                      </button>
                    ) : (
                      <div className="detail-logo-placeholder">
                        {detail.business_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <h1 className="detail-company-title">{detail.business_name}</h1>

                  {detail.primary_category_name && (
                    <p className="detail-company-category">{detail.primary_category_name}</p>
                  )}

                  {/* Linha de Selos Horizontais Oficiais no Cabeçalho (Pedra Fundamental e Plano na mesma altura e proporção, estáticos) */}
                  <div className="detail-seals-header-row">
                    {detail.is_pedra_fundamental && (
                      <div
                        className="header-horizontal-seal-badge"
                        title="Condecoração Especial Pedra Fundamental"
                      >
                        <img
                          src={PEDRA_FUNDAMENTAL_SEAL}
                          alt="Pedra Fundamental"
                          className="header-seal-img"
                        />
                      </div>
                    )}

                    <div
                      className="header-horizontal-seal-badge"
                      title={`Plano ${getPlanDisplayName(plan)}`}
                    >
                      <img
                        src={PLAN_HORIZONTAL_SEALS[plan]}
                        alt={`Plano ${getPlanDisplayName(plan)}`}
                        className="header-seal-img"
                      />
                    </div>
                  </div>

                  {/* Responsável + Loja Maçônica no Cabeçalho (igual ao web/mobile) */}
                  {(detail.responsible?.name || detail.lodge_name) && (
                    <div className="header-responsible-lodge-line">
                      {detail.responsible?.name && (
                        <span>
                          Responsável: <strong>{detail.responsible.community_label ? `${detail.responsible.community_label} ` : 'Ir.∴ '}{detail.responsible.name}</strong>
                        </span>
                      )}
                      {detail.lodge_name && (
                        <span className="header-lodge-span">
                          <span>🏛️</span>
                          <span>Loja: <strong>{detail.lodge_name}</strong></span>
                        </span>
                      )}
                    </div>
                  )}

                  {locationText && (
                    <p className="header-location-line">{locationText}</p>
                  )}

                  <div className="detail-views-badge" title="Total de visualizações da página">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>
                      {typeof detail.views_count === 'number' && detail.views_count > 0 ? detail.views_count : 1}{' '}
                      {(detail.views_count ?? 1) === 1 ? 'visualização' : 'visualizações'}
                    </span>
                  </div>
                </div>

                {/* Ações de Contato Direto */}
                <div className="detail-actions-group">
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="whatsapp-primary-btn"
                      onClick={() => {
                        if (detail.business_id) {
                          trackMobileEvent({
                            businessId: detail.business_id,
                            eventType: 'whatsapp',
                            city: detail.city,
                            state: detail.state,
                          });
                        }
                      }}
                    >
                      <span>💬</span>
                      <span>Falar no WhatsApp</span>
                    </a>
                  )}

                  <div className="detail-fraternal-actions-row">
                    <button
                      type="button"
                      className="btn-indicar-fraterno"
                      onClick={() => {
                        if (detail.business_id) {
                          trackMobileEvent({
                            businessId: detail.business_id,
                            eventType: 'share',
                            city: detail.city,
                            state: detail.state,
                          });
                        }
                        onRefer?.(detail.business_name, detail.business_slug);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" width="18" height="18">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                      <div className="btn-indicar-text">
                        <strong>Indicar Empresa</strong>
                        <small>Gerar link com seu nome</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`btn-favoritar-fraterno ${isFavorited ? 'favorited' : ''}`}
                      onClick={() => onToggleFavorite?.(detail.business_slug, detail.business_name)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill={isFavorited ? '#e11d48' : 'none'}
                        stroke={isFavorited ? '#e11d48' : '#4b161b'}
                        strokeWidth="2"
                        width="18"
                        height="18"
                      >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                      </svg>
                      <div className="btn-favoritar-text">
                        <strong>{isFavorited ? 'Favoritada' : 'Favoritar'}</strong>
                        <small>{isFavorited ? 'Salva na sua lista' : 'Salvar nos favoritos'}</small>
                      </div>
                    </button>
                  </div>

                  <div className="contacts-grid">
                    {phoneContact && (
                      <a
                        href={`tel:${phoneContact.value.replace(/\D/g, '')}`}
                        className="contact-item-btn"
                        onClick={() => {
                          if (detail.business_id) {
                            trackMobileEvent({
                              businessId: detail.business_id,
                              eventType: 'phone',
                              city: detail.city,
                              state: detail.state,
                            });
                          }
                        }}
                      >
                        <span>📞</span>
                        <span>Ligar</span>
                      </a>
                    )}
                    {emailContact && (
                      <a href={`mailto:${emailContact.value}`} className="contact-item-btn">
                        <span>✉️</span>
                        <span>E-mail</span>
                      </a>
                    )}
                    {instagramContact && (
                      <a
                        href={
                          instagramContact.value.startsWith('http')
                            ? instagramContact.value
                            : `https://instagram.com/${instagramContact.value.replace('@', '')}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="contact-item-btn"
                        onClick={() => {
                          if (detail.business_id) {
                            trackMobileEvent({
                              businessId: detail.business_id,
                              eventType: 'instagram',
                              city: detail.city,
                              state: detail.state,
                            });
                          }
                        }}
                      >
                        <span>📸</span>
                        <span>Instagram</span>
                      </a>
                    )}
                    {websiteContact && (
                      <a
                        href={
                          websiteContact.value.startsWith('http')
                            ? websiteContact.value
                            : `https://${websiteContact.value}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="contact-item-btn"
                        onClick={() => {
                          if (detail.business_id) {
                            trackMobileEvent({
                              businessId: detail.business_id,
                              eventType: 'website',
                              city: detail.city,
                              state: detail.state,
                            });
                          }
                        }}
                      >
                        <span>🌐</span>
                        <span>Site Oficial</span>
                      </a>
                    )}
                    {facebookContact && (
                      <a
                        href={
                          facebookContact.value.startsWith('http')
                            ? facebookContact.value
                            : `https://facebook.com/${facebookContact.value.replace(/^@/, '')}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="contact-item-btn"
                      >
                        <span>📘</span>
                        <span>Facebook</span>
                      </a>
                    )}
                    {linkedinContact && (
                      <a
                        href={
                          linkedinContact.value.startsWith('http')
                            ? linkedinContact.value
                            : `https://linkedin.com/in/${linkedinContact.value.replace(/^@/, '')}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="contact-item-btn"
                      >
                        <span>💼</span>
                        <span>LinkedIn</span>
                      </a>
                    )}
                    {youtubeContact && (
                      <a
                        href={
                          youtubeContact.value.startsWith('http')
                            ? youtubeContact.value
                            : `https://youtube.com/${youtubeContact.value}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="contact-item-btn"
                      >
                        <span>▶️</span>
                        <span>YouTube</span>
                      </a>
                    )}
                    {(detail.address || detail.city) && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                          `${detail.business_name} ${detail.address || ''} ${detail.city || ''}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="contact-item-btn"
                        onClick={() => {
                          if (detail.business_id) {
                            trackMobileEvent({
                              businessId: detail.business_id,
                              eventType: 'route',
                              city: detail.city,
                              state: detail.state,
                            });
                          }
                        }}
                      >
                        <span>📍</span>
                        <span>Como Chegar</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Barra de Navegação Interna com Abas */}
                <div className="profile-tabs-bar" role="tablist">
                  <button
                    type="button"
                    className={`profile-tab-btn ${activeTab === 'sobre' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('sobre');
                      document.getElementById('section-sobre')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Sobre
                  </button>
                  <button
                    type="button"
                    className={`profile-tab-btn ${activeTab === 'selos' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('selos');
                      document.getElementById('section-selos')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Selos
                  </button>
                  {(detail.responsible || detail.lodge_name) && (
                    <button
                      type="button"
                      className={`profile-tab-btn ${activeTab === 'servicos' ? 'active' : ''}`}
                      onClick={() => {
                        document.getElementById('section-responsavel')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Responsável
                    </button>
                  )}
                  {detail.services.length > 0 && (
                    <button
                      type="button"
                      className={`profile-tab-btn ${activeTab === 'servicos' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab('servicos');
                        document.getElementById('section-servicos')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Serviços
                    </button>
                  )}
                  {photoMedia.length > 0 && (
                    <button
                      type="button"
                      className={`profile-tab-btn ${activeTab === 'fotos' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab('fotos');
                        document.getElementById('section-fotos')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Fotos & Vídeo
                    </button>
                  )}
                  {isAcacia && detail.benefits.length > 0 && (
                    <button
                      type="button"
                      className={`profile-tab-btn ${activeTab === 'beneficio' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab('beneficio');
                        document.getElementById('section-beneficio')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Benefício
                    </button>
                  )}
                  <button
                    type="button"
                    className={`profile-tab-btn ${activeTab === 'comentarios' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('comentarios');
                      document.getElementById('section-comentarios')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Comentários
                  </button>
                  <button
                    type="button"
                    className={`profile-tab-btn ${activeTab === 'localizacao' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('localizacao');
                      document.getElementById('section-localizacao')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Localização
                  </button>
                </div>

                {/* 1. SOBRE A EMPRESA (Vem logo após os contatos e abas) */}
                <div id="section-sobre" className="detail-section-block">
                  <h3 className="detail-section-title">Sobre a Empresa</h3>
                  <p style={{ margin: 0, fontSize: '.86rem', color: '#524843', lineHeight: 1.6 }}>
                    {detail.description || 'Empresa participante da rede Conexão Maçônica, comprometida com a ética, qualidade no atendimento e pontualidade em seus serviços.'}
                  </p>
                </div>

                {/* 2. CARD COM OS SELOS OFICIAIS (Apenas Plano e Pedra Fundamental, sem títulos nem toque para explicar) */}
                <div id="section-selos" className="detail-section-block">
                  <h3 className="detail-section-title">Selos & Reconhecimentos</h3>
                  <div className="seals-catalog-card">
                    <div className="seals-grid-clean">
                      {/* Selo Pedra Fundamental (se for) */}
                      {detail.is_pedra_fundamental && (
                        <div
                          className="seal-clean-card"
                          title="Pedra Fundamental"
                        >
                          <img
                            src={PEDRA_FUNDAMENTAL_SEAL}
                            alt="Pedra Fundamental"
                            className="seal-clean-img"
                          />
                        </div>
                      )}

                      {/* Selo do Plano */}
                      <div
                        className="seal-clean-card"
                        title={`Plano ${getPlanDisplayName(plan)}`}
                      >
                        <img
                          src={PLAN_HORIZONTAL_SEALS[plan]}
                          alt={getPlanDisplayName(plan)}
                          className="seal-clean-img"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. CARD DO RESPONSÁVEL (Título "Responsável", foto, título Ir./Cunhada/Sobrinho, loja e telefone) */}
                {(detail.responsible || detail.lodge_name) && (
                  <div id="section-responsavel" className="detail-section-block">
                    <h3 className="detail-section-title">Responsável</h3>
                    <div className="responsible-card-enhanced">
                      <div className="responsible-header-flex">
                        <div className="responsible-avatar-wrapper">
                          {detail.responsible?.avatar_url ? (
                            <img
                              src={detail.responsible.avatar_url}
                              alt={detail.responsible.name || 'Responsável'}
                              className="responsible-avatar-img"
                            />
                          ) : (
                            <span>{detail.responsible?.name ? detail.responsible.name.charAt(0).toUpperCase() : '🏛️'}</span>
                          )}
                        </div>
                        <div className="responsible-meta-box">
                          <h4 className="responsible-title-name">
                            {detail.responsible?.community_label ? `${detail.responsible.community_label} ` : 'Ir∴ '}
                            {detail.responsible?.name || 'Irmão Responsável'}
                          </h4>
                          {detail.responsible?.business_role && (
                            <span className="responsible-role-tag">{detail.responsible.business_role}</span>
                          )}
                          {detail.lodge_name && (
                            <span className="responsible-lodge-line">
                              <span>🏛️</span>
                              <span>Loja: {detail.lodge_name}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {detail.responsible?.whatsapp && (
                        <div className="responsible-contact-line">
                          <a
                            href={`https://wa.me/${detail.responsible.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Olá ${detail.responsible.community_label || 'Ir∴'} ${detail.responsible.name || ''}, vi seu contato no aplicativo da Conexão Maçônica.`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="responsible-phone-btn"
                          >
                            <span>📞</span>
                            <span>Contato Pessoal: {detail.responsible.whatsapp}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. SERVIÇOS & SOLUÇÕES (Apresentação melhorada com cartões e solicitação de orçamento) */}
                {(isAcacia || isCompasso) && detail.services.length > 0 && (
                  <div id="section-servicos" className="detail-section-block">
                    <h3 className="detail-section-title">Serviços & Soluções</h3>
                    <div className="services-grid-enhanced">
                      {detail.services.map((svc) => (
                        <div className="service-card-enhanced" key={svc.id || svc.title}>
                          <div className="service-header-row">
                            <h4 className="service-card-title">{svc.title}</h4>
                            {svc.price !== undefined && svc.price > 0 ? (
                              <span className="service-card-price">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(svc.price)}
                              </span>
                            ) : (
                              <span className="service-card-price" style={{ background: '#f5f0e6', borderColor: '#e1d5c5', color: '#685950' }}>
                                Sob Consulta
                              </span>
                            )}
                          </div>
                          {svc.description && <p className="service-card-desc">{svc.description}</p>}
                          {waUrl && (
                            <a
                              href={`${waUrl}&text=${encodeURIComponent(`Olá! Gostaria de um orçamento para o serviço "${svc.title}".`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="service-quote-btn"
                              onClick={() => {
                                if (detail.business_id) {
                                  trackMobileEvent({
                                    businessId: detail.business_id,
                                    eventType: 'whatsapp',
                                    city: detail.city,
                                    state: detail.state,
                                  });
                                }
                              }}
                            >
                              <span>💬</span>
                              <span>Solicitar Orçamento no WhatsApp</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. GALERIA DE FOTOS COM ZOOM E SWIPE */}
                {(isAcacia || isCompasso) && photoMedia.length > 0 && (
                  <div id="section-fotos" className="detail-section-block">
                    <h3 className="detail-section-title">Galeria de Fotos</h3>
                    <p style={{ margin: '0 0 10px', fontSize: '.78rem', color: '#7a6e67' }}>
                      Toque em qualquer foto para ampliar e arrastar para o lado.
                    </p>
                    <div className="gallery-scroll-row">
                      {photoMedia.map((photo, index) => (
                        <div
                          className="gallery-thumb-item"
                          key={photo.id || photo.url}
                          onClick={() => setActivePhotoIndex(index)}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                        >
                          <img src={photo.url} alt={photo.title || detail.business_name} loading="lazy" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. BENEFÍCIO EXCLUSIVO DA FAMÍLIA MAÇÔNICA (Plano Acácia) */}
                {isAcacia && detail.benefits.length > 0 && (
                  <div id="section-beneficio" className="detail-section-block">
                    <div className="detail-benefit-card">
                      <span className="detail-benefit-badge">Benefício Exclusivo da Família Maçônica</span>
                      {detail.benefits.map((b) => (
                        <div key={b.id || b.title}>
                          <h4>✨ {b.title}</h4>
                          {b.description && <p>{b.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. VÍDEO DE APRESENTAÇÃO INSTITUCIONAL (Plano Acácia) */}
                {isAcacia && videoMedia && (
                  <div className="detail-section-block">
                    <h3 className="detail-section-title">Apresentação Institucional</h3>
                    <div className="detail-video-wrapper">
                      <video
                        src={videoMedia.url}
                        controls
                        playsInline
                        preload="metadata"
                        className="detail-video-player"
                      />
                    </div>
                  </div>
                )}

                {/* 8. COMENTÁRIOS E AVALIAÇÕES DA REDE */}
                <div id="section-comentarios" className="detail-section-block">
                  <h3 className="detail-section-title">Comentários & Confiança</h3>
                  <div className="reviews-block-card">
                    <div className="reviews-rating-hero">
                      <span className="reviews-score">{Number(detail.rating_average || 5).toFixed(1)}</span>
                      <div>
                        <div className="reviews-star-row">★★★★★</div>
                        <span style={{ fontSize: '.76rem', color: '#7a6e67', fontWeight: 700 }}>
                          {detail.rating_count ? `${detail.rating_count} avaliações confirmadas` : 'Empresa recomendada pela rede'}
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: '8px 12px', borderRadius: 12, background: '#faf6f0', border: '1px solid #ebd9c8', fontSize: '.8rem', color: '#554740', lineHeight: 1.5 }}>
                      <i>&ldquo;Atendimento fraterno de alta qualidade, pontualidade e total idoneidade verificada pela comunidade.&rdquo;</i>
                      <div style={{ marginTop: 6, fontSize: '.72rem', fontWeight: 800, color: '#8c671d' }}>
                        ✓ Avaliação de Membro da Rede
                      </div>
                    </div>
                    {onShareExperience && (
                      <button
                        type="button"
                        className="action-button"
                        style={{ marginTop: 10, width: '100%', fontSize: '.84rem', minHeight: 38 }}
                        onClick={() => onShareExperience(detail.business_slug)}
                      >
                        <span>🤝</span> Compartilhar experiência com esta empresa
                      </button>
                    )}
                  </div>
                </div>

                {/* 9. LOCALIZAÇÃO & ENDEREÇO */}
                {(detail.address || detail.city) && (
                  <div id="section-localizacao" className="detail-section-block">
                    <h3 className="detail-section-title">Localização</h3>
                    <div className="info-card-block">
                      {detail.address && <div>{detail.address}</div>}
                      <div>{[detail.city, detail.state].filter(Boolean).join(' - ')}</div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                          `${detail.business_name} ${detail.address || ''} ${detail.city || ''}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="map-open-link"
                        onClick={() => {
                          if (detail.business_id) {
                            trackMobileEvent({
                              businessId: detail.business_id,
                              eventType: 'route',
                              city: detail.city,
                              state: detail.state,
                            });
                          }
                        }}
                      >
                        <span>📍</span>
                        <span>Traçar rota no Google Maps</span>
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <AnuncioModal
        isOpen={isAnuncioOpen}
        onClose={() => setIsAnuncioOpen(false)}
        detail={detail}
        isFavorited={isFavorited}
        onToggleFavorite={onToggleFavorite}
        onRefer={onRefer}
      />

      <PhotoGalleryLightbox
        photos={photoMedia}
        currentIndex={activePhotoIndex}
        onClose={() => setActivePhotoIndex(null)}
        onChangeIndex={(newIndex) => setActivePhotoIndex(newIndex)}
      />
    </>
  );
}

const DEFAULT_COMMUNITY_EVENTS = [
  {
    id: 'ev-1',
    title: 'Encontro de Negócios & Fraternidade — Rede Conexão Maçônica',
    summary: 'Rodada de networking, apresentação de empresas Pedra Fundamental e fortalecimento de parcerias comerciais entre irmãos e familiares.',
    event_date: 'Agenda Permanente',
    city: 'Feira de Santana',
    state: 'BA',
    organizer_name: 'Conexão Maçônica',
    organizer_type: 'business' as const,
  },
  {
    id: 'ev-2',
    title: 'Sessão Pública & Palestra Institucional das Oficinas Regulares',
    summary: 'Calendário integrado de sessões magnas brancas, palestras culturais e ações filantrópicas das Lojas Maçônicas parceiras.',
    event_date: 'Mensal',
    city: 'Salvador',
    state: 'BA',
    organizer_name: 'Lojas Maçônicas da Rede',
    organizer_type: 'lodge' as const,
  },
  {
    id: 'ev-3',
    title: 'Semana de Benefícios Exclusivos da Família Maçônica',
    summary: 'Condições diferenciadas de atendimento e vantagens em saúde, óptica, gastronomia, segurança e serviços profissionais.',
    event_date: 'Em andamento',
    city: 'Todo o Brasil',
    state: 'BR',
    organizer_name: 'Empresas Parceiras',
    organizer_type: 'business' as const,
  },
];

function BeneficiosScreen({
  search,
  city,
  selectedCategory,
  onSelectCategory,
  onSelectCity,
  onOpenLocationModal,
  onSelectBusiness,
  onZoomLogo,
  isFavorite,
  onToggleFavorite,
  onRefer,
  favoritesCount,
  onLoadedData,
}: {
  search: string;
  city: string;
  selectedCategory: string;
  onSelectCategory: (catSlug: string) => void;
  onSelectCity: (city: string) => void;
  onOpenLocationModal: () => void;
  onSelectBusiness: (slug: string) => void;
  onZoomLogo?: (logoUrl: string, name: string, backgroundColor?: string | null) => void;
  isFavorite?: (slug: string) => boolean;
  onToggleFavorite?: (slug: string, name?: string) => void;
  onRefer?: (name: string, slug: string) => void;
  favoritesCount?: number;
  onLoadedData?: (data: MobileGuideHomeData) => void;
}) {
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [guideData, setGuideData] = useState<MobileGuideHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const guideServiceRef = useRef(createMobileGuideService());

  const fetchBenefitBusinesses = (q = search, c = city, cat = selectedCategory) => {
    setLoading(true);
    guideServiceRef.current
      .loadHome({ query: q, city: c, category: cat, hasBenefits: true })
      .then(async (data) => {
        if (data.businesses.length > 0) {
          setGuideData(data);
          onLoadedData?.(data);
        } else {
          const allData = await guideServiceRef.current.loadHome({ query: q, city: c, category: cat });
          setGuideData(allData);
          onLoadedData?.(allData);
        }
      })
      .catch(() => {
        //Mantém fallback local se offline
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBenefitBusinesses(search, city, selectedCategory);
  }, [search, city, selectedCategory]);

  const rawList = guideData?.businesses?.length ? guideData.businesses : DEFAULT_BUSINESSES;
  const sorted = sortBusinessesByTier(rawList);
  const displayedBusinesses = onlyFavorites
    ? sorted.filter((b) => isFavorite?.(b.slug))
    : sorted;

  return (
    <div className="directory-screen">
      <div className="directory-header">
        <p className="eyebrow">Clube de Vantagens da Rede</p>
        <h1>Benefícios Exclusivos</h1>
        <p>Condições especiais, descontos e atendimento prioritário oferecidos pelas empresas da Conexão Maçônica.</p>
      </div>

      <div className="directory-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="location-pill-btn"
            onClick={onOpenLocationModal}
            style={{ background: '#fffdfa', color: '#4b161b', borderColor: '#c9a227', height: 38 }}
            aria-label={`Localização: ${city || 'Brasil'}`}
          >
            <FeatureIcon name="map" />
            <span>{city ? `Cidade: ${city}` : 'Brasil (Todas as cidades)'}</span>
            <span style={{ fontSize: '.75rem', color: '#8c671d' }}>▾</span>
          </button>
          {city && (
            <button
              type="button"
              onClick={() => onSelectCity('')}
              style={{
                border: 0,
                background: 'transparent',
                color: '#8c671d',
                fontSize: '.75rem',
                fontWeight: 750,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Ver todo o Brasil
            </button>
          )}
          <button
            type="button"
            className={`filter-favorite-toggle-btn ${onlyFavorites ? 'active' : ''}`}
            onClick={() => setOnlyFavorites((prev) => !prev)}
            aria-pressed={onlyFavorites}
          >
            <span>{onlyFavorites ? '❤️' : '🤍'}</span>
            <span>{onlyFavorites ? 'Exibindo Favoritas' : typeof favoritesCount === 'number' && favoritesCount > 0 ? `Favoritas (${favoritesCount})` : 'Filtrar Favoritas'}</span>
          </button>
        </div>

        {Boolean(guideData?.categories?.length) && (
          <div className="category-pills" role="tablist" aria-label="Categorias de Benefícios">
            <button
              type="button"
              className={`category-pill ${!selectedCategory ? 'active' : ''}`}
              onClick={() => onSelectCategory('')}
            >
              Todas
            </button>
            {guideData?.categories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                className={`category-pill ${selectedCategory === cat.slug ? 'active' : ''}`}
                onClick={() => onSelectCategory(selectedCategory === cat.slug ? '' : cat.slug)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="results-counter" role="status">
        {loading
          ? 'Buscando benefícios...'
          : `${displayedBusinesses.length} ${displayedBusinesses.length === 1 ? 'empresa parceira encontrada' : 'empresas parceiras encontradas'}${search ? ` para "${search}"` : ''}`}
      </div>

      {!loading && displayedBusinesses.length === 0 ? (
        <div className="empty-results">
          <b>Nenhum benefício encontrado para este filtro</b>
          <p>Tente alterar o termo de busca ou limpar os filtros selecionados.</p>
          <button
            type="button"
            className="action-button"
            style={{ marginTop: 12 }}
            onClick={() => {
              onSelectCategory('');
              onSelectCity('');
              setOnlyFavorites(false);
            }}
          >
            Ver todos os benefícios
          </button>
        </div>
      ) : (
        <div className="business-list">
          {displayedBusinesses.map((biz) => (
            <BusinessCard
              key={biz.id}
              business={biz}
              onSelect={onSelectBusiness}
              onZoomLogo={onZoomLogo}
              isFavorited={isFavorite?.(biz.slug)}
              onToggleFavorite={onToggleFavorite}
              onRefer={onRefer}
              showBenefitBadge
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyScreen({
  route,
  favoritesCount = 0,
  onGoToFavorites,
  memberUser,
  onOpenMemberLogin,
  onLogoutMember,
  onStartShareExperience,
  maisSubView = 'menu',
  onChangeMaisSubView,
  eventTypeFilter = 'all',
  onChangeEventTypeFilter,
  searchQuery = '',
}: {
  route: Exclude<Route, 'inicio' | 'empresas'>;
  favoritesCount?: number;
  onGoToFavorites?: () => void;
  memberUser?: { id: string; name: string; email: string } | null;
  onOpenMemberLogin?: () => void;
  onLogoutMember?: () => void;
  onStartShareExperience?: () => void;
  maisSubView?: 'menu' | 'eventos';
  onChangeMaisSubView?: (view: 'menu' | 'eventos') => void;
  eventTypeFilter?: 'all' | 'empresas' | 'lojas';
  onChangeEventTypeFilter?: (filter: 'all' | 'empresas' | 'lojas') => void;
  searchQuery?: string;
}) {
  if (route === 'mais') {
    if (maisSubView === 'eventos') {
      const qClean = searchQuery.trim().toLowerCase();
      const filteredEvents = DEFAULT_COMMUNITY_EVENTS.filter((ev) => {
        if (eventTypeFilter === 'empresas' && ev.organizer_type !== 'business') return false;
        if (eventTypeFilter === 'lojas' && ev.organizer_type !== 'lodge') return false;
        if (qClean) {
          const matchTitle = ev.title.toLowerCase().includes(qClean);
          const matchSummary = ev.summary.toLowerCase().includes(qClean);
          const matchCity = ev.city.toLowerCase().includes(qClean);
          if (!matchTitle && !matchSummary && !matchCity) return false;
        }
        return true;
      });

      return (
        <div className="directory-screen">
          <div style={{ marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => onChangeMaisSubView?.('menu')}
              style={{
                background: 'transparent',
                border: 0,
                color: '#8c671d',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ← Voltar ao Menu
            </button>
          </div>

          <div className="directory-header">
            <p className="eyebrow">Agenda Integrada da Rede Fraterna</p>
            <h1>Eventos & Comunicados</h1>
            <p>Encontros de negócios de empresas parceiras e sessões/comunicados de Lojas Maçônicas.</p>
          </div>

          <div className="category-pills" role="tablist" aria-label="Filtrar eventos por origem" style={{ marginBottom: 14 }}>
            <button
              type="button"
              className={`category-pill ${eventTypeFilter === 'all' ? 'active' : ''}`}
              onClick={() => onChangeEventTypeFilter?.('all')}
            >
              📅 Todos os Eventos
            </button>
            <button
              type="button"
              className={`category-pill ${eventTypeFilter === 'empresas' ? 'active' : ''}`}
              onClick={() => onChangeEventTypeFilter?.('empresas')}
            >
              🏢 Eventos de Empresas
            </button>
            <button
              type="button"
              className={`category-pill ${eventTypeFilter === 'lojas' ? 'active' : ''}`}
              onClick={() => onChangeEventTypeFilter?.('lojas')}
            >
              🏛️ Eventos de Lojas Maçônicas
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredEvents.map((ev) => (
              <article key={ev.id} className="event-card-mobile">
                <span className={`event-origin-badge ${ev.organizer_type}`}>
                  {ev.organizer_type === 'lodge' ? '🏛️ Loja Maçônica' : '🏢 Empresa Parceira'}
                </span>
                <h3 style={{ margin: '2px 0', font: '750 1.05rem/1.3 Georgia, serif', color: '#4b161b' }}>
                  {ev.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#57534e', lineHeight: 1.5 }}>
                  {ev.summary}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6, fontSize: '0.76rem', color: '#78716c', fontWeight: 650 }}>
                  <span>🗓️ {ev.event_date}</span>
                  <span>📍 {ev.city} - {ev.state}</span>
                  <span>👤 {ev.organizer_name}</span>
                </div>
              </article>
            ))}

            {filteredEvents.length === 0 && (
              <div className="empty-results">
                <b>Nenhum evento encontrado</b>
                <p>Tente alterar o filtro entre Todos, Empresas ou Lojas Maçônicas.</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="home-content" style={{ padding: '20px 16px' }}>
        {/* Bloco Institucional com a Logomarca Oficial da Conexão Maçônica */}
        <section className="mais-brand-card" aria-label="Conexão Maçônica">
          <img
            src="/logoconexao_red_vert.png"
            alt="Conexão Maçônica"
            className="mais-brand-logo"
            onError={(e) => {
              e.currentTarget.src = './logo_conexao.svg';
            }}
          />
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#f3eedd', lineHeight: 1.45, maxWidth: 420 }}>
            Plataforma oficial de negócios, lojas maçônicas, benefícios exclusivos e conexões fraternas.
          </p>
        </section>

        {/* Atalhos Rápidos do Menu */}
        <div className="mais-menu-grid">
          <button
            type="button"
            className="mais-menu-item-btn"
            onClick={() => onChangeMaisSubView?.('eventos')}
          >
            <span className="mais-menu-icon">📅</span>
            <div>
              <div style={{ fontWeight: 800 }}>Eventos</div>
              <small style={{ fontSize: '0.68rem', color: '#7a6e67', fontWeight: 600 }}>Empresas & Lojas</small>
            </div>
          </button>

          <button
            type="button"
            className="mais-menu-item-btn"
            onClick={onGoToFavorites}
          >
            <span className="mais-menu-icon">❤️</span>
            <div>
              <div style={{ fontWeight: 800 }}>Favoritos ({favoritesCount})</div>
              <small style={{ fontSize: '0.68rem', color: '#7a6e67', fontWeight: 600 }}>Salvos no app</small>
            </div>
          </button>

          <button
            type="button"
            className="mais-menu-item-btn"
            onClick={() => {
              window.location.hash = routeHref('beneficios');
            }}
          >
            <span className="mais-menu-icon">🎁</span>
            <div>
              <div style={{ fontWeight: 800 }}>Benefícios</div>
              <small style={{ fontSize: '0.68rem', color: '#7a6e67', fontWeight: 600 }}>Clube de vantagens</small>
            </div>
          </button>

          <button
            type="button"
            className="mais-menu-item-btn"
            onClick={() => {
              window.location.hash = routeHref('lojas');
            }}
          >
            <span className="mais-menu-icon">🏛️</span>
            <div>
              <div style={{ fontWeight: 800 }}>Lojas Maçônicas</div>
              <small style={{ fontSize: '0.68rem', color: '#7a6e67', fontWeight: 600 }}>Guia de oficinas</small>
            </div>
          </button>

          <a
            href="https://conexaomaconica.com.br/anunciar"
            target="_blank"
            rel="noopener noreferrer"
            className="mais-menu-item-btn"
          >
            <span className="mais-menu-icon">🚀</span>
            <div>
              <div style={{ fontWeight: 800 }}>Anunciar</div>
              <small style={{ fontSize: '0.68rem', color: '#7a6e67', fontWeight: 600 }}>Cadastrar empresa</small>
            </div>
          </a>

          <button
            type="button"
            className="mais-menu-item-btn"
            onClick={() => onStartShareExperience?.()}
          >
            <span className="mais-menu-icon">🤝</span>
            <div>
              <div style={{ fontWeight: 800 }}>Mural da Rede</div>
              <small style={{ fontSize: '0.68rem', color: '#7a6e67', fontWeight: 600 }}>Relatar experiência</small>
            </div>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Identificação do Membro */}
          <div className="refer-explanation-box" style={{ background: '#ffffff', border: '1.5px solid #ebd9c8' }}>
            <h4 className="refer-explanation-title" style={{ fontSize: '0.88rem' }}>
              <span>👤</span> {memberUser ? `Membro Identificado: ${memberUser.name}` : 'Acesso do Membro da Rede'}
            </h4>
            <p className="refer-explanation-text" style={{ marginBottom: 12 }}>
              {memberUser
                ? `Conectado com o e-mail ${memberUser.email}. Seu nome já fica preenchido nas indicações fraternas e no Mural de Conexões.`
                : 'Identifique-se para registrar experiências no Mural de Conexões e personalizar suas indicações fraternas.'}
            </p>
            {memberUser ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  className="action-button"
                  onClick={() => onStartShareExperience?.()}
                  style={{ flex: 1, marginTop: 0, minHeight: 40, fontSize: '0.82rem' }}
                >
                  Compartilhar Experiência
                </Button>
                <button
                  type="button"
                  onClick={onLogoutMember}
                  style={{
                    padding: '0 14px',
                    borderRadius: 12,
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#4b5563',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Sair
                </button>
              </div>
            ) : (
              <Button
                className="action-button"
                onClick={onOpenMemberLogin}
                style={{ width: '100%', marginTop: 0, minHeight: 42, fontSize: '0.85rem' }}
              >
                Identificar Membro / Entrar
              </Button>
            )}
          </div>

          {/* Card de Favoritos */}
          <div className="refer-explanation-box" style={{ background: '#ffffff', border: '1.5px solid #ebd9c8' }}>
            <h4 className="refer-explanation-title" style={{ fontSize: '0.88rem' }}>
              <span>❤️</span> Minhas Empresas Favoritas
            </h4>
            <p className="refer-explanation-text" style={{ marginBottom: 12 }}>
              Você possui <strong>{favoritesCount} {favoritesCount === 1 ? 'empresa favoritada' : 'empresas favoritadas'}</strong> para acesso rápido no seu aplicativo.
            </p>
            <Button
              className="action-button"
              onClick={onGoToFavorites}
              style={{ width: '100%', minHeight: 42, fontSize: '0.85rem' }}
            >
              Ver Favoritas no Catálogo
            </Button>
          </div>

          {/* Card de Indicação */}
          <div className="refer-explanation-box" style={{ background: '#ffffff', border: '1.5px solid #ebd9c8' }}>
            <h4 className="refer-explanation-title" style={{ fontSize: '0.88rem' }}>
              <span>🤝</span> Indicação Fraterna
            </h4>
            <p className="refer-explanation-text">
              Ao indicar empresas qualificadas da rede pelo botão <strong>&quot;Indicar Empresa&quot;</strong>, o link identifica você como recomendador fraterno, gerando credibilidade e união no ecossistema maçônico.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function LocationModal({
  isOpen,
  onClose,
  selectedCity,
  onSelectCity,
  availableCities,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  availableCities: string[];
}) {
  const [filter, setFilter] = useState('');
  const [geoState, setGeoState] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
    detectedCity?: string;
    detectedState?: string;
    matchedCity?: string | null;
  }>({ status: 'idle' });

  useEffect(() => {
    if (!isOpen) {
      setGeoState({ status: 'idle' });
      setFilter('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGeoState({ status: 'error', message: 'Geolocalização não suportada neste dispositivo.' });
      return;
    }
    setGeoState({ status: 'loading', message: 'Identificando sua localização via GPS...' });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
            { headers: { Accept: 'application/json' } }
          );
          if (!resp.ok) throw new Error('Falha no serviço');
          const data = (await resp.json()) as {
            address?: {
              city?: string;
              town?: string;
              municipality?: string;
              village?: string;
              state?: string;
            };
          };
          const cityName =
            data.address?.city ||
            data.address?.town ||
            data.address?.municipality ||
            data.address?.village ||
            '';
          const stateName = data.address?.state || '';

          const matched = availableCities.find(
            (c) =>
              cityName &&
              (c.toLowerCase().includes(cityName.toLowerCase()) ||
                cityName.toLowerCase().includes(c.toLowerCase()))
          );

          setGeoState({
            status: 'success',
            detectedCity: cityName || 'Localização Atual',
            detectedState: stateName,
            matchedCity: matched || null,
            message: matched
              ? `Você está em ${cityName}${stateName ? `, ${stateName}` : ''}. Cidade com empresas cadastradas!`
              : `Você está em ${cityName || 'sua região'}${stateName ? `, ${stateName}` : ''}. Ainda não temos empresas cadastradas aqui.`,
          });
        } catch {
          setGeoState({
            status: 'error',
            message: 'Localização obtida, mas não foi possível identificar o nome da cidade. Escolha sua cidade abaixo.',
          });
        }
      },
      (err) => {
        setGeoState({
          status: 'error',
          message:
            err.code === 1
              ? 'Permissão de localização negada pelo dispositivo.'
              : 'Não foi possível obter sua posição via GPS. Escolha sua cidade na lista abaixo.',
        });
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const registeredCities = Array.from(new Set(['Feira de Santana', ...availableCities])).filter(Boolean);
  const filteredCities = registeredCities.filter((c) =>
    c.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Escolher localização"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="location-modal-sheet">
        <div className="location-modal-header">
          <div>
            <h2>Escolha sua Localização</h2>
            <p>Selecione a cidade para filtrar as empresas</p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Fechar janela"
          >
            ✕
          </button>
        </div>

        <div className="location-modal-body">
          <div className="gps-detect-card">
            <button
              type="button"
              className="gps-detect-btn"
              onClick={handleDetectGPS}
              disabled={geoState.status === 'loading'}
            >
              <FeatureIcon name="map" />
              {geoState.status === 'loading'
                ? 'Detectando sua localização...'
                : 'Usar minha localização atual (GPS)'}
            </button>

            {geoState.status === 'loading' && (
              <div className="gps-result-box">
                <span>{geoState.message}</span>
              </div>
            )}

            {geoState.status === 'error' && (
              <div className="gps-result-box" style={{ color: '#8c2424' }}>
                <span>{geoState.message}</span>
              </div>
            )}

            {geoState.status === 'success' && (
              <div className="gps-result-box">
                <b>📍 {geoState.detectedCity} {geoState.detectedState ? `(${geoState.detectedState})` : ''}</b>
                <span>{geoState.message}</span>
                {geoState.matchedCity ? (
                  <button
                    type="button"
                    className="gps-action-btn"
                    onClick={() => {
                      onSelectCity(geoState.matchedCity!);
                    }}
                  >
                    Selecionar {geoState.matchedCity}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="gps-action-btn"
                    onClick={() => onSelectCity('')}
                  >
                    Ver empresas de todo o Brasil
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="location-section-title">Todas as localidades</div>
          <button
            type="button"
            className={`location-option-btn ${!selectedCity ? 'active' : ''}`}
            onClick={() => onSelectCity('')}
          >
            <span>🇧🇷 Todo o Brasil (Todas as cidades)</span>
            {!selectedCity && <span className="location-check">✓</span>}
          </button>

          <div className="location-section-title">Cidades com empresas cadastradas</div>
          <div className="city-search-box">
            <input
              type="text"
              className="city-search-input"
              placeholder="Buscar cidade..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <div className="cities-list">
              {filteredCities.map((cityName) => {
                const isSelected = selectedCity === cityName;
                const state = cityName === 'Feira de Santana' ? 'BA' : 'Brasil';
                return (
                  <button
                    type="button"
                    key={cityName}
                    className={`location-option-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => onSelectCity(cityName)}
                  >
                    <span>{cityName}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="city-state-badge">{state}</span>
                      {isSelected && <span className="location-check">✓</span>}
                    </span>
                  </button>
                );
              })}
              {filteredCities.length === 0 && (
                <p style={{ textAlign: 'center', color: '#776b65', fontSize: '.82rem', margin: '8px 0' }}>
                  Nenhuma cidade com empresas encontrada para &quot;{filter}&quot;.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   GUIA DE LOJAS MAÇÔNICAS (Constantes, Helpers, Cards, Seção Home, Tela, Modal)
   ========================================================================== */

const STATE_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

const DAYS_OF_WEEK = [
  { value: 'segunda', label: 'Segunda-feira' },
  { value: 'terca', label: 'Terça-feira' },
  { value: 'quarta', label: 'Quarta-feira' },
  { value: 'quinta', label: 'Quinta-feira' },
  { value: 'sexta', label: 'Sexta-feira' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
];

const DEFAULT_POTENCIES = [
  { slug: 'GOB', name: 'Grande Oriente do Brasil (GOB)', abbreviation: 'GOB' },
  { slug: 'GLEB', name: 'Grande Loja Maçônica da Bahia (GLEB)', abbreviation: 'GLEB' },
  { slug: 'CMSB', name: 'Grandes Lojas (CMSB)', abbreviation: 'CMSB' },
  { slug: 'COMAB', name: 'Grandes Orientes Independentes (COMAB)', abbreviation: 'COMAB' },
  { slug: 'GLMMG', name: 'Grande Loja de Minas Gerais (GLMMG)', abbreviation: 'GLMMG' },
  { slug: 'GLESP', name: 'Grande Loja de São Paulo (GLESP)', abbreviation: 'GLESP' },
  { slug: 'GOP', name: 'Grande Oriente Paulista (GOP)', abbreviation: 'GOP' },
  { slug: 'GLMERJ', name: 'Grande Loja do Rio de Janeiro (GLMERJ)', abbreviation: 'GLMERJ' },
  { slug: 'GLSC', name: 'Grande Loja de Santa Catarina (GLSC)', abbreviation: 'GLSC' },
];

const DEFAULT_RITES = [
  { slug: 'reaa', name: 'Rito Escocês Antigo e Aceito (REAA)' },
  { slug: 'york', name: 'Rito York' },
  { slug: 'moderno', name: 'Rito Moderno ou Francês' },
  { slug: 'adonhiramita', name: 'Rito Adonhiramita' },
  { slug: 'brasileiro', name: 'Rito Brasileiro' },
  { slug: 'schroeder', name: 'Rito de Schröder' },
];

function canonicalPotencyCode(raw?: string | null): string {
  const text = String(raw ?? '')
    .replace(/\s*\([^)]*\)?\s*$/, '')
    .replace(/\s*\)+\s*$/, '')
    .replace(/\s*[-–—]\s*$/, '')
    .trim();
  if (!text) return '';
  const ufs = 'AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO';
  const ufSuffix = new RegExp(`^(.+?)[\\s/\\-–]+(?:${ufs})\\s*$`, 'i');
  const base = text.match(ufSuffix)?.[1]?.trim() || text;
  return /^[A-Za-zÀ-ÿ0-9.]+$/.test(base) ? base.toUpperCase() : base;
}

const GENERIC_CRESTS: Record<string, string> = {
  GOB: './lojas/genericos/logo-generico-gob-baiano.jpg',
  COMAB: './lojas/genericos/logo-generico-comab.png',
  GOSP: './lojas/genericos/logo-generico-gosp.jpg',
  CMSB: './lojas/genericos/logo-generico-cmsb.webp',
};

function genericCrestForPotency(potency?: string | null): string | null {
  const raw = String(potency ?? '').trim();
  if (!raw) return null;
  const code = canonicalPotencyCode(raw).toUpperCase();
  if (GENERIC_CRESTS[code]) return GENERIC_CRESTS[code];
  const words = raw.toUpperCase().split(/[^A-ZÀ-Ý0-9]+/).filter(Boolean);
  const bySigla = words.find((w) => GENERIC_CRESTS[w]);
  if (bySigla) return GENERIC_CRESTS[bySigla] || null;
  const lower = raw.toLowerCase();
  if (lower.includes('oriente do brasil') || lower.includes('gob')) return GENERIC_CRESTS.GOB || null;
  if (lower.includes('grande loja') || lower.includes('cmsb') || lower.includes('gleb') || lower.includes('glmmg') || lower.includes('glesp')) return GENERIC_CRESTS.CMSB || null;
  if (lower.includes('comab') || lower.includes('independente')) return GENERIC_CRESTS.COMAB || null;
  return null;
}

function formatMeetingTime(time?: string | null): string | null {
  const text = (time ?? '').trim();
  if (!text) return null;
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return text;
  const hour = Number(match[1]);
  const minutes = match[2];
  return minutes === '00' ? `${hour}h` : `${hour}h${minutes}`;
}

const DAY_LABELS: Record<string, string> = {
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

function formatMeetingDay(day?: string | null, label?: string | null): string | null {
  const raw = (day ?? '').trim();
  if (!raw) return null;
  const base = DAY_LABELS[raw.toLowerCase()] || raw;
  const rule = (label ?? '').match(/^(.+?)\s+do mês$/i)?.[1];
  return rule ? `${rule} ${base}` : base;
}

const DEFAULT_LODGES: MobileLodgeCardData[] = [
  {
    id: 'lodge-1',
    slug: 'fraternidade-feirense-35',
    name: 'Fraternidade Feirense',
    code_number: 35,
    potency: 'GLEB',
    potency_name: 'Grande Loja Maçônica da Bahia (GLEB)',
    rite: 'R.E.A.A.',
    city: 'Feira de Santana',
    state: 'BA',
    address: 'Rua Visconde de Mauá, 120 - Centro',
    primary_meeting: { day: 'segunda', time: '20:00', label: 'Semanal' },
    worshipful_master_name: 'Ir. Carlos Alberto Mendes',
    is_featured: true,
    logo_url: null,
    cover_url: null,
  },
  {
    id: 'lodge-2',
    slug: 'harmonia-e-verdade-12',
    name: 'Harmonia e Verdade',
    code_number: 12,
    potency: 'GOB',
    potency_name: 'Grande Oriente do Brasil (GOB)',
    rite: 'R.E.A.A.',
    city: 'Feira de Santana',
    state: 'BA',
    address: 'Av. Senhor dos Passos, 840 - Centro',
    primary_meeting: { day: 'terca', time: '19:30', label: 'Semanal' },
    worshipful_master_name: 'Ir. José Eduardo Ribeiro',
    is_featured: true,
    logo_url: null,
    cover_url: null,
  },
  {
    id: 'lodge-3',
    slug: 'luz-e-sabedoria-88',
    name: 'Luz e Sabedoria',
    code_number: 88,
    potency: 'GOB',
    potency_name: 'Grande Oriente do Brasil (GOB)',
    rite: 'York',
    city: 'Salvador',
    state: 'BA',
    address: 'Rua Chile, 45 - Centro Histórico',
    primary_meeting: { day: 'quarta', time: '20:00', label: 'Semanal' },
    worshipful_master_name: 'Ir. Antônio Marcos Santana',
    is_featured: true,
    logo_url: null,
    cover_url: null,
  },
  {
    id: 'lodge-4',
    slug: 'vigilantes-do-oriente-104',
    name: 'Vigilantes do Oriente',
    code_number: 104,
    potency: 'GLEB',
    potency_name: 'Grande Loja Maçônica da Bahia (GLEB)',
    rite: 'Schröder',
    city: 'Salvador',
    state: 'BA',
    address: 'Av. Tancredo Neves, 1200 - Caminho das Árvores',
    primary_meeting: { day: 'quinta', time: '20:00', label: 'Semanal' },
    worshipful_master_name: 'Ir. Marcos Vinícius Neves',
    is_featured: false,
    logo_url: null,
    cover_url: null,
  },
  {
    id: 'lodge-5',
    slug: 'piratininga-1',
    name: 'Piratininga',
    code_number: 1,
    potency: 'GOB',
    potency_name: 'Grande Oriente do Brasil (GOB)',
    rite: 'Moderno',
    city: 'São Paulo',
    state: 'SP',
    address: 'Rua São Bento, 300 - Centro',
    primary_meeting: { day: 'terca', time: '20:00', label: 'Semanal' },
    worshipful_master_name: 'Ir. Fernando de Abreu Silva',
    is_featured: true,
    logo_url: null,
    cover_url: null,
  },
  {
    id: 'lodge-6',
    slug: 'acacia-paulistana-45',
    name: 'Acácia Paulistana',
    code_number: 45,
    potency: 'CMSB',
    potency_name: 'Grande Loja do Estado de São Paulo (GLESP)',
    rite: 'R.E.A.A.',
    city: 'São Paulo',
    state: 'SP',
    address: 'Rua Pamplona, 650 - Jardim Paulista',
    primary_meeting: { day: 'quarta', time: '20:00', label: 'Semanal' },
    worshipful_master_name: 'Ir. Paulo Roberto Silveira',
    is_featured: false,
    logo_url: null,
    cover_url: null,
  },
  {
    id: 'lodge-7',
    slug: 'uniao-e-trabalho-67',
    name: 'União e Trabalho',
    code_number: 67,
    potency: 'GLMMG',
    potency_name: 'Grande Loja Maçônica de Minas Gerais (GLMMG)',
    rite: 'Adonhiramita',
    city: 'Belo Horizonte',
    state: 'MG',
    address: 'Av. Afonso Pena, 1500 - Funcionários',
    primary_meeting: { day: 'sexta', time: '19:30', label: 'Semanal' },
    worshipful_master_name: 'Ir. Rodrigo Guimarães Castro',
    is_featured: false,
    logo_url: null,
    cover_url: null,
  },
  {
    id: 'lodge-8',
    slug: 'estrela-do-sul-23',
    name: 'Estrela do Sul',
    code_number: 23,
    potency: 'COMAB',
    potency_name: 'Grande Oriente do Paraná (GOP)',
    rite: 'Brasileiro',
    city: 'Curitiba',
    state: 'PR',
    address: 'Rua XV de Novembro, 800 - Centro',
    primary_meeting: { day: 'segunda', time: '20:00', label: 'Semanal' },
    worshipful_master_name: 'Ir. Luiz Fernando Bastos',
    is_featured: false,
    logo_url: null,
    cover_url: null,
  },
];

function LodgeCardWebReplica({
  lodge,
  onSelect,
}: {
  lodge: MobileLodgeCardData;
  onSelect?: (slug: string) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const crestSrc = !imgError && lodge.logo_url
    ? lodge.logo_url
    : genericCrestForPotency(lodge.potency) || null;

  const meetingDay = formatMeetingDay(lodge.primary_meeting?.day, lodge.primary_meeting?.label);
  const meetingTime = formatMeetingTime(lodge.primary_meeting?.time);

  const mapsUrl = lodge.latitude && lodge.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${lodge.latitude},${lodge.longitude}`
    : lodge.address && lodge.city
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lodge.name}, ${lodge.address}, ${lodge.city} - ${lodge.state || ''}`)}`
      : null;

  const potencyCode = canonicalPotencyCode(lodge.potency);

  return (
    <article
      className="lodge-card-replica"
      onClick={() => onSelect?.(lodge.slug)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(lodge.slug);
        }
      }}
    >
      <div className="lodge-card-cover">
        {lodge.cover_url ? (
          <img
            src={lodge.cover_url}
            alt={lodge.name}
            className="lodge-card-cover-img"
            loading="lazy"
          />
        ) : (
          <div className="lodge-card-cover-pattern" />
        )}

        {lodge.is_featured && (
          <div className="lodge-card-featured-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="12" height="12">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>Loja em Destaque</span>
          </div>
        )}

        <div className="lodge-card-crest-wrapper">
          <div className="lodge-card-crest-box">
            {crestSrc ? (
              <img
                src={crestSrc}
                alt={`Brasão ${lodge.name}`}
                className="lodge-card-crest-img"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="#78350f" strokeWidth="1.8" width="36" height="36">
                <path d="M6.5 20 12 4l5.5 16M9 13h6" />
                <path d="m5 10 7 10 7-10M8 14h8" />
                <circle cx="12" cy="10" r="1.2" fill="#78350f" />
              </svg>
            )}
          </div>
        </div>
      </div>

      <div className="lodge-card-content">
        <div>
          <div className="lodge-card-tags-row">
            {potencyCode && (
              <span className="lodge-card-potency-badge">
                {potencyCode}
              </span>
            )}
            {lodge.rite && (
              <span className="lodge-card-rite-badge">
                {lodge.rite}
              </span>
            )}
          </div>

          <h3 className="lodge-card-title" style={{ marginTop: 6 }}>
            {lodge.name} {lodge.code_number ? `nº ${lodge.code_number}` : ''}
          </h3>

          {(lodge.city || lodge.state) && (
            <div className="lodge-card-location" style={{ marginTop: 4 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>
                {lodge.city || ''}{lodge.city && lodge.state ? `, ${lodge.state}` : lodge.state || ''}
              </span>
            </div>
          )}
        </div>

        <div className="lodge-card-info-box">
          {meetingDay && (
            <div className="lodge-card-info-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="#78350f" strokeWidth="2" width="13" height="13">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
              <span>
                Reuniões: <strong>{meetingDay}</strong>
                {meetingTime && ` • ${meetingTime}`}
              </span>
            </div>
          )}
          {lodge.worshipful_master_name && (
            <div className="lodge-card-info-item" style={{ fontSize: '0.72rem', color: '#57534e' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" width="13" height="13">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>
                Venerável: <strong style={{ color: '#292524' }}>{lodge.worshipful_master_name}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="lodge-card-actions">
          <button
            type="button"
            className="lodge-card-primary-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(lodge.slug);
            }}
          >
            <span>Ver informações</span>
            <span aria-hidden="true">→</span>
          </button>

          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="lodge-card-maps-btn"
              title="Abrir no Google Maps / Como chegar"
              aria-label="Abrir localização no Google Maps"
              onClick={(e) => e.stopPropagation()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function HomeLodgesSection({
  onSelectLodge,
  onNavigateToLojas,
}: {
  onSelectLodge?: (slug: string) => void;
  onNavigateToLojas?: () => void;
}) {
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [potency, setPotency] = useState('');
  const [rite, setRite] = useState('');
  const [day, setDay] = useState('');
  const [isSearched, setIsSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MobileLodgeCardData[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const guideServiceRef = useRef(createMobileGuideService());

  const hasFilter = Boolean(state || city || potency || rite || day);

  const handleClear = () => {
    setState('');
    setCity('');
    setPotency('');
    setRite('');
    setDay('');
    setIsSearched(false);
    setResults([]);
    setTotalCount(0);
  };

  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!hasFilter) return;

    setLoading(true);
    setIsSearched(true);

    try {
      const res = await guideServiceRef.current.searchLodges({
        state: state || undefined,
        city: city || undefined,
        potency: potency || undefined,
        rite: rite || undefined,
        meetingDay: day || undefined,
      }, 1, 6);

      if (res && res.items.length > 0) {
        setResults(res.items);
        setTotalCount(res.total);
      } else {
        const filtered = DEFAULT_LODGES.filter((lodge) => {
          if (state && lodge.state?.toLowerCase() !== state.toLowerCase()) return false;
          if (city && !lodge.city?.toLowerCase().includes(city.toLowerCase())) return false;
          if (potency && !lodge.potency?.toLowerCase().includes(potency.toLowerCase())) return false;
          if (rite && !lodge.rite?.toLowerCase().includes(rite.toLowerCase())) return false;
          if (day && lodge.primary_meeting?.day?.toLowerCase() !== day.toLowerCase()) return false;
          return true;
        });
        setResults(filtered);
        setTotalCount(filtered.length);
      }
    } catch {
      const filtered = DEFAULT_LODGES.filter((lodge) => {
        if (state && lodge.state?.toLowerCase() !== state.toLowerCase()) return false;
        if (city && !lodge.city?.toLowerCase().includes(city.toLowerCase())) return false;
        if (potency && !lodge.potency?.toLowerCase().includes(potency.toLowerCase())) return false;
        if (rite && !lodge.rite?.toLowerCase().includes(rite.toLowerCase())) return false;
        if (day && lodge.primary_meeting?.day?.toLowerCase() !== day.toLowerCase()) return false;
        return true;
      });
      setResults(filtered);
      setTotalCount(filtered.length);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="lodges-section-container" aria-labelledby="home-lodges-title">
      <div className="lodges-section-header">
        <div className="lodges-section-title-row">
          <span className="lodges-section-icon" aria-hidden="true">🏛️</span>
          <h2 id="home-lodges-title" className="lodges-section-title">Guia de Lojas Maçônicas</h2>
        </div>
        <p className="lodges-section-subtitle">
          Encontre lojas maçônicas em todo o Brasil e consulte informações para sua visita fraternal.
        </p>
      </div>

      <form onSubmit={handleSearch} className="lodges-filter-bar">
        <div className="lodges-filter-grid">
          <div className="lodges-filter-field">
            <label className="lodges-filter-label" htmlFor="home-lodge-state">Estado</label>
            <select
              id="home-lodge-state"
              className="lodges-filter-select"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="">Todos os Estados</option>
              {Object.entries(STATE_NAMES).map(([uf, name]) => (
                <option key={uf} value={uf}>
                  {uf} — {name}
                </option>
              ))}
            </select>
          </div>

          <div className="lodges-filter-field">
            <label className="lodges-filter-label" htmlFor="home-lodge-city">Cidade</label>
            <input
              id="home-lodge-city"
              type="text"
              className="lodges-filter-select"
              placeholder="Ex: Feira de Santana"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{ backgroundImage: 'none', paddingRight: 9 }}
            />
          </div>

          <div className="lodges-filter-field">
            <label className="lodges-filter-label" htmlFor="home-lodge-potency">Potência</label>
            <select
              id="home-lodge-potency"
              className="lodges-filter-select"
              value={potency}
              onChange={(e) => setPotency(e.target.value)}
            >
              <option value="">Todas as Potências</option>
              {DEFAULT_POTENCIES.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.abbreviation}
                </option>
              ))}
            </select>
          </div>

          <div className="lodges-filter-field">
            <label className="lodges-filter-label" htmlFor="home-lodge-rite">Rito</label>
            <select
              id="home-lodge-rite"
              className="lodges-filter-select"
              value={rite}
              onChange={(e) => setRite(e.target.value)}
            >
              <option value="">Todos os Ritos</option>
              {DEFAULT_RITES.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lodges-filter-field" style={{ gridColumn: 'span 2' }}>
            <label className="lodges-filter-label" htmlFor="home-lodge-day">Dia da Reunião</label>
            <select
              id="home-lodge-day"
              className="lodges-filter-select"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            >
              <option value="">Qualquer dia de reunião</option>
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="lodges-filter-actions">
          {hasFilter && (
            <button type="button" onClick={handleClear} className="lodges-clear-btn">
              Limpar
            </button>
          )}
          <button
            type="submit"
            disabled={!hasFilter || loading}
            className="lodges-search-btn"
          >
            {loading ? 'Buscando...' : 'Buscar lojas'}
          </button>
        </div>
      </form>

      {!isSearched && !loading && (
        <div style={{
          background: '#ffffff',
          border: '1.5px dashed #e7e5e4',
          borderRadius: 14,
          padding: '24px 16px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: '1.8rem' }}>🏛️</span>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#57534e', lineHeight: 1.4 }}>
            Escolha <strong>estado, cidade, potência, rito ou dia de reunião</strong> e clique em <strong>Buscar lojas</strong>.
          </p>
          <button
            type="button"
            onClick={onNavigateToLojas}
            className="lodges-view-all-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}
          >
            Ou veja o diretório completo de lojas →
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '24px 16px', color: '#78350f', fontSize: '0.84rem' }}>
          <div className="pull-refresh-spinner" style={{ margin: '0 auto 8px' }} />
          Buscando lojas maçônicas...
        </div>
      )}

      {isSearched && !loading && results.length === 0 && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e7e5e4',
          borderRadius: 14,
          padding: '24px 16px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '0.82rem',
        }}>
          Nenhuma Loja Maçônica encontrada com os filtros selecionados.
        </div>
      )}

      {isSearched && !loading && results.length > 0 && (
        <>
          <div className="lodges-cards-grid">
            {results.map((lodge) => (
              <LodgeCardWebReplica
                key={lodge.id}
                lodge={lodge}
                onSelect={onSelectLodge}
              />
            ))}
          </div>

          <div className="lodges-section-footer">
            <span>Mostrando {results.length} de {totalCount} {totalCount === 1 ? 'loja' : 'lojas'}.</span>
            <button
              type="button"
              onClick={onNavigateToLojas}
              className="lodges-view-all-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Ver no diretório →
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function LojasScreen({
  onSelectLodge,
  externalSearch = '',
  externalPotency = '',
  onChangeExternalPotency,
}: {
  onSelectLodge?: (slug: string) => void;
  externalSearch?: string;
  externalPotency?: string;
  onChangeExternalPotency?: (pot: string) => void;
}) {
  const [search, setSearch] = useState(externalSearch);
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [potency, setPotency] = useState(externalPotency);

  useEffect(() => {
    setSearch(externalSearch);
  }, [externalSearch]);

  useEffect(() => {
    setPotency(externalPotency);
  }, [externalPotency]);
  const [rite, setRite] = useState('');
  const [day, setDay] = useState('');
  const [lodges, setLodges] = useState<MobileLodgeCardData[]>(DEFAULT_LODGES);
  const [total, setTotal] = useState<number>(DEFAULT_LODGES.length);
  const [loading, setLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const guideServiceRef = useRef(createMobileGuideService());

  const hasFilter = Boolean(search || state || city || potency || rite || day);

  const performSearch = async () => {
    setLoading(true);
    try {
      const res = await guideServiceRef.current.searchLodges({
        state: state || undefined,
        city: city || undefined,
        potency: potency || undefined,
        rite: rite || undefined,
        meetingDay: day || undefined,
        query: search || undefined,
      }, 1, 24);

      if (res && res.items.length > 0) {
        setLodges(res.items);
        setTotal(res.total);
      } else {
        const queryClean = search.trim().toLowerCase();
        const filtered = DEFAULT_LODGES.filter((lodge) => {
          if (queryClean) {
            const matchName = lodge.name.toLowerCase().includes(queryClean);
            const matchNumber = String(lodge.code_number || '').includes(queryClean);
            const matchCity = (lodge.city || '').toLowerCase().includes(queryClean);
            if (!matchName && !matchNumber && !matchCity) return false;
          }
          if (state && lodge.state?.toLowerCase() !== state.toLowerCase()) return false;
          if (city && !lodge.city?.toLowerCase().includes(city.toLowerCase())) return false;
          if (potency && !lodge.potency?.toLowerCase().includes(potency.toLowerCase())) return false;
          if (rite && !lodge.rite?.toLowerCase().includes(rite.toLowerCase())) return false;
          if (day && lodge.primary_meeting?.day?.toLowerCase() !== day.toLowerCase()) return false;
          return true;
        });
        setLodges(filtered);
        setTotal(filtered.length);
      }
    } catch {
      const queryClean = search.trim().toLowerCase();
      const filtered = DEFAULT_LODGES.filter((lodge) => {
        if (queryClean) {
          const matchName = lodge.name.toLowerCase().includes(queryClean);
          const matchNumber = String(lodge.code_number || '').includes(queryClean);
          const matchCity = (lodge.city || '').toLowerCase().includes(queryClean);
          if (!matchName && !matchNumber && !matchCity) return false;
        }
        if (state && lodge.state?.toLowerCase() !== state.toLowerCase()) return false;
        if (city && !lodge.city?.toLowerCase().includes(city.toLowerCase())) return false;
        if (potency && !lodge.potency?.toLowerCase().includes(potency.toLowerCase())) return false;
        if (rite && !lodge.rite?.toLowerCase().includes(rite.toLowerCase())) return false;
        if (day && lodge.primary_meeting?.day?.toLowerCase() !== day.toLowerCase()) return false;
        return true;
      });
      setLodges(filtered);
      setTotal(filtered.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch();
  }, [search, state, city, potency, rite, day]);

  const handleClearFilters = () => {
    setSearch('');
    setState('');
    setCity('');
    setPotency('');
    onChangeExternalPotency?.('');
    setRite('');
    setDay('');
  };

  return (
    <div className="lojas-screen">
      <div className="lojas-screen-header">
        <h1 className="lojas-screen-title">🏛️ Lojas Maçônicas</h1>
        <p className="lojas-screen-desc">
          Diretório oficial de Oficinas e Templos regulares. Pesquise por nome, número, cidade, potência, rito e dia da reunião.
        </p>
      </div>

      <form
        className="lojas-search-bar"
        onSubmit={(e) => {
          e.preventDefault();
          performSearch();
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="2" width="16" height="16">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          className="lojas-search-input"
          placeholder="Buscar por nome, número, cidade ou oriente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          style={{
            background: isFilterOpen ? '#fef3c7' : '#f5f5f4',
            border: '1px solid',
            borderColor: isFilterOpen ? '#fde68a' : '#e7e5e4',
            borderRadius: 8,
            padding: '5px 9px',
            fontSize: '0.74rem',
            fontWeight: 700,
            color: isFilterOpen ? '#78350f' : '#44403c',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
          }}
        >
          <span>Filtros</span>
          <span>{isFilterOpen ? '▲' : '▼'}</span>
        </button>
      </form>

      {isFilterOpen && (
        <div className="lodges-filter-bar" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="lodges-filter-grid">
            <div className="lodges-filter-field">
              <label className="lodges-filter-label" htmlFor="lojas-filter-state">Estado</label>
              <select
                id="lojas-filter-state"
                className="lodges-filter-select"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="">Todos os Estados</option>
                {Object.entries(STATE_NAMES).map(([uf, name]) => (
                  <option key={uf} value={uf}>
                    {uf} — {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lodges-filter-field">
              <label className="lodges-filter-label" htmlFor="lojas-filter-city">Cidade</label>
              <input
                id="lojas-filter-city"
                type="text"
                className="lodges-filter-select"
                placeholder="Ex: Feira de Santana"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{ backgroundImage: 'none', paddingRight: 9 }}
              />
            </div>

            <div className="lodges-filter-field">
              <label className="lodges-filter-label" htmlFor="lojas-filter-potency">Potência</label>
              <select
                id="lojas-filter-potency"
                className="lodges-filter-select"
                value={potency}
                onChange={(e) => setPotency(e.target.value)}
              >
                <option value="">Todas as Potências</option>
                {DEFAULT_POTENCIES.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lodges-filter-field">
              <label className="lodges-filter-label" htmlFor="lojas-filter-rite">Rito</label>
              <select
                id="lojas-filter-rite"
                className="lodges-filter-select"
                value={rite}
                onChange={(e) => setRite(e.target.value)}
              >
                <option value="">Todos os Ritos</option>
                {DEFAULT_RITES.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lodges-filter-field" style={{ gridColumn: 'span 2' }}>
              <label className="lodges-filter-label" htmlFor="lojas-filter-day">Dia da Reunião</label>
              <select
                id="lojas-filter-day"
                className="lodges-filter-select"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              >
                <option value="">Qualquer dia de reunião</option>
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="lodges-filter-actions">
            {hasFilter && (
              <button type="button" onClick={handleClearFilters} className="lodges-clear-btn">
                Limpar tudo
              </button>
            )}
            <button
              type="button"
              onClick={performSearch}
              className="lodges-search-btn"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      )}

      <div className="lojas-results-summary-row">
        <span>
          <strong className="lojas-results-count">{total}</strong> {total === 1 ? 'loja encontrada' : 'lojas encontradas'}
        </span>
        {hasFilter && (
          <button
            type="button"
            onClick={handleClearFilters}
            style={{ background: 'none', border: 'none', color: '#b45309', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Limpar filtros ✕
          </button>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#78350f', fontSize: '0.85rem' }}>
          <div className="pull-refresh-spinner" style={{ margin: '0 auto 10px' }} />
          Carregando lojas maçônicas...
        </div>
      )}

      {!loading && lodges.length === 0 && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: '40px 20px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.86rem',
        }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Nenhuma Loja Maçônica encontrada com esses critérios.</p>
          <p style={{ margin: '6px 0 14px', fontSize: '0.78rem' }}>Tente alterar ou limpar os filtros de busca.</p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="lodges-search-btn"
            style={{ margin: '0 auto' }}
          >
            Limpar filtros
          </button>
        </div>
      )}

      {!loading && lodges.length > 0 && (
        <div className="lodges-cards-grid">
          {lodges.map((lodge) => (
            <LodgeCardWebReplica
              key={lodge.id}
              lodge={lodge}
              onSelect={onSelectLodge}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LodgeDetailModal({
  slug,
  onClose,
  onRefer,
  isFavorited,
  onToggleFavorite,
}: {
  slug: string | null;
  onClose: () => void;
  onRefer?: (name: string, slug: string) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (slug: string, name?: string) => void;
}) {
  const [detail, setDetail] = useState<MobileLodgeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const guideServiceRef = useRef(createMobileGuideService());

  useEffect(() => {
    if (!slug) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setImgError(false);

    guideServiceRef.current.loadLodgeDetail(slug)
      .then((data) => {
        if (data) {
          setDetail(data);
        } else {
          const fallback = DEFAULT_LODGES.find((l) => l.slug === slug);
          if (fallback) {
            setDetail({
              id: fallback.id,
              slug: fallback.slug,
              name: fallback.name,
              code_number: fallback.code_number,
              potency: fallback.potency,
              potency_name: fallback.potency_name,
              rite: fallback.rite,
              city: fallback.city,
              state: fallback.state,
              address: fallback.address,
              worshipful_master_name: fallback.worshipful_master_name,
              meetings: fallback.primary_meeting ? [{ id: 'm-1', ...fallback.primary_meeting }] : [],
              contacts: [
                { id: 'c-1', type: 'whatsapp', value: '75988887777', label: 'Secretaria' },
                { id: 'c-2', type: 'email', value: `secretaria@${fallback.slug}.org.br`, label: 'E-mail Oficial' },
              ],
              gallery: [],
            });
          }
        }
      })
      .catch(() => {
        const fallback = DEFAULT_LODGES.find((l) => l.slug === slug);
        if (fallback) {
          setDetail({
            id: fallback.id,
            slug: fallback.slug,
            name: fallback.name,
            code_number: fallback.code_number,
            potency: fallback.potency,
            potency_name: fallback.potency_name,
            rite: fallback.rite,
            city: fallback.city,
            state: fallback.state,
            address: fallback.address,
            worshipful_master_name: fallback.worshipful_master_name,
            meetings: fallback.primary_meeting ? [{ id: 'm-1', ...fallback.primary_meeting }] : [],
            contacts: [
              { id: 'c-1', type: 'whatsapp', value: '75988887777', label: 'Secretaria' },
            ],
            gallery: [],
          });
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  if (!slug) return null;

  const crestSrc = !imgError && detail?.logo_url
    ? detail.logo_url
    : genericCrestForPotency(detail?.potency) || null;

  const potencyCode = canonicalPotencyCode(detail?.potency);

  const mapsUrl = detail?.latitude && detail?.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${detail.latitude},${detail.longitude}`
    : detail?.address && detail?.city
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${detail.name}, ${detail.address}, ${detail.city} - ${detail.state || ''}`)}`
      : null;

  const whatsappContact = detail?.contacts.find((c) => c.type === 'whatsapp');
  const emailContact = detail?.contacts.find((c) => c.type === 'email');

  return (
    <div
      className="lodge-detail-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={detail?.name || 'Detalhes da Loja Maçônica'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lodge-detail-modal-card">
        <div className="lodge-detail-cover">
          {detail?.cover_url ? (
            <img src={detail.cover_url} alt={detail.name} className="lodge-detail-cover-img" />
          ) : (
            <div className="lodge-card-cover-pattern" />
          )}

          <div className="lodge-detail-header-actions">
            {detail && onToggleFavorite && (
              <button
                type="button"
                className="lodge-detail-circle-btn"
                onClick={() => onToggleFavorite(detail.slug, detail.name)}
                title={isFavorited ? 'Remover dos favoritos' : 'Favoritar Loja'}
                aria-label={isFavorited ? 'Remover dos favoritos' : 'Favoritar Loja'}
              >
                {isFavorited ? '❤️' : '🤍'}
              </button>
            )}
            <button
              type="button"
              className="lodge-detail-circle-btn"
              onClick={onClose}
              title="Fechar"
              aria-label="Fechar janela"
            >
              ✕
            </button>
          </div>

          <div className="lodge-detail-crest-float">
            <div className="lodge-detail-crest-box">
              {crestSrc ? (
                <img
                  src={crestSrc}
                  alt={`Brasão ${detail?.name || 'Loja'}`}
                  className="lodge-detail-crest-img"
                  onError={() => setImgError(true)}
                />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="#78350f" strokeWidth="1.8" width="42" height="42">
                  <path d="M6.5 20 12 4l5.5 16M9 13h6" />
                  <path d="m5 10 7 10 7-10M8 14h8" />
                  <circle cx="12" cy="10" r="1.2" fill="#78350f" />
                </svg>
              )}
            </div>
          </div>
        </div>

        <div className="lodge-detail-body">
          {loading && !detail ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#78350f' }}>
              <div className="pull-refresh-spinner" style={{ margin: '0 auto 10px' }} />
              Carregando dados da Loja...
            </div>
          ) : detail ? (
            <>
              <div className="lodge-detail-title-block">
                <div className="lodge-detail-badges-row">
                  {potencyCode && (
                    <span className="lodge-card-potency-badge">
                      {potencyCode}
                    </span>
                  )}
                  {detail.rite && (
                    <span className="lodge-card-rite-badge">
                      {detail.rite}
                    </span>
                  )}
                </div>

                <h2 className="lodge-detail-title">
                  {detail.name} {detail.code_number ? `nº ${detail.code_number}` : ''}
                </h2>

                {(detail.city || detail.state) && (
                  <div className="lodge-card-location" style={{ fontSize: '0.82rem' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>
                      {detail.city || ''}{detail.city && detail.state ? `, ${detail.state}` : detail.state || ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="lodge-detail-section-card">
                <div className="lodge-detail-section-title">
                  <span>📍</span>
                  <span>Templo & Oriente</span>
                </div>
                <div className="lodge-detail-info-row">
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: '#1c1917' }}>
                      {detail.address || 'Endereço disponível para membros regulares.'}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#78716c' }}>
                      {detail.city} - {detail.state} {detail.cep ? `• CEP: ${detail.cep}` : ''}
                    </p>
                  </div>
                </div>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lodge-contact-action-btn maps"
                    style={{ marginTop: 6 }}
                  >
                    <span>🗺️</span>
                    <span>Abrir no Google Maps / Como Chegar</span>
                  </a>
                )}
              </div>

              <div className="lodge-detail-section-card">
                <div className="lodge-detail-section-title">
                  <span>📅</span>
                  <span>Sessões & Calendário Fraternal</span>
                </div>
                {detail.meetings && detail.meetings.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {detail.meetings.map((m) => {
                      const dayLabel = formatMeetingDay(m.day, m.label);
                      const timeLabel = formatMeetingTime(m.time);
                      return (
                        <div key={m.id} className="lodge-detail-info-row">
                          <span>⚡</span>
                          <div>
                            <strong>{dayLabel || 'Reunião regular'}</strong>
                            {timeLabel && ` às ${timeLabel}`}
                            {m.label && !m.label.toLowerCase().includes('do mês') && (
                              <span style={{ color: '#78716c', marginLeft: 4 }}>({m.label})</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#78716c' }}>
                    Sessões semanais regulares. Consulte a secretaria para confirmação de magnas.
                  </p>
                )}
              </div>

              <div className="lodge-detail-section-card">
                <div className="lodge-detail-section-title">
                  <span>👑</span>
                  <span>Administração & Filiação</span>
                </div>
                {detail.worshipful_master_name && (
                  <div className="lodge-detail-info-row">
                    <span>👤</span>
                    <div>
                      Venerável Mestre: <strong>{detail.worshipful_master_name}</strong>
                    </div>
                  </div>
                )}
                {detail.potency_name && (
                  <div className="lodge-detail-info-row">
                    <span>🏛️</span>
                    <div>
                      Potência / Obediência: <strong>{detail.potency_name}</strong>
                    </div>
                  </div>
                )}
                {detail.foundation_date && (
                  <div className="lodge-detail-info-row">
                    <span>📜</span>
                    <div>
                      Data de Fundação: <strong>{detail.foundation_date}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="lodge-detail-section-card">
                <div className="lodge-detail-section-title">
                  <span>📞</span>
                  <span>Contatos Oficiais</span>
                </div>
                <div className="lodge-detail-contact-grid">
                  {whatsappContact ? (
                    <a
                      href={`https://wa.me/55${whatsappContact.value.replace(/\D/g, '').replace(/^55/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lodge-contact-action-btn whatsapp"
                    >
                      <span>💬</span>
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="lodge-contact-action-btn whatsapp"
                      style={{ opacity: 0.5 }}
                    >
                      WhatsApp Reservado
                    </button>
                  )}

                  {emailContact ? (
                    <a
                      href={`mailto:${emailContact.value}`}
                      className="lodge-contact-action-btn email"
                    >
                      <span>✉️</span>
                      <span>E-mail</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="lodge-contact-action-btn email"
                      style={{ opacity: 0.5 }}
                    >
                      E-mail Reservado
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  className="experience-submit-btn"
                  onClick={() => onRefer?.(detail.name, detail.slug)}
                >
                  <span>🤝</span>
                  <span>Compartilhar Loja como Indicação</span>
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmpresasScreen({
  search,
  city,
  selectedCategory,
  onSelectCategory,
  onSelectCity,
  onOpenLocationModal,
  onSelectBusiness,
  onZoomLogo,
  isFavorite,
  onToggleFavorite,
  onRefer,
  favoritesCount,
  onLoadedData,
}: {
  search: string;
  city: string;
  selectedCategory: string;
  onSelectCategory: (catSlug: string) => void;
  onSelectCity: (city: string) => void;
  onOpenLocationModal: () => void;
  onSelectBusiness: (slug: string) => void;
  onZoomLogo?: (logoUrl: string, name: string, backgroundColor?: string | null) => void;
  isFavorite?: (slug: string) => boolean;
  onToggleFavorite?: (slug: string, name?: string) => void;
  onRefer?: (name: string, slug: string) => void;
  favoritesCount?: number;
  onLoadedData?: (data: MobileGuideHomeData) => void;
}) {
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [guideData, setGuideData] = useState<MobileGuideHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const guideServiceRef = useRef(createMobileGuideService());

  const fetchBusinesses = (q = search, c = city, cat = selectedCategory) => {
    setLoading(true);
    setErrorMessage(null);
    guideServiceRef.current
      .loadHome({ query: q, city: c, category: cat })
      .then((data) => {
        setGuideData(data);
        onLoadedData?.(data);
      })
      .catch((err) => {
        setErrorMessage(
          err instanceof Error && err.message !== 'Failed to fetch'
            ? err.message
            : 'Não foi possível carregar as empresas. Verifique a conexão com o Guia.',
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBusinesses(search, city, selectedCategory);
  }, [search, city, selectedCategory]);

  const businesses = guideData?.businesses ?? [];
  const sorted = sortBusinessesByTier(businesses);
  const displayedBusinesses = onlyFavorites
    ? sorted.filter((b) => isFavorite?.(b.slug))
    : sorted;

  return (
    <div className="directory-screen">
      <div className="directory-header">
        <p className="eyebrow">Guia Comercial da Rede</p>
        <h1>Empresas</h1>
        <p>Conheça as empresas e profissionais que integram a Conexão Maçônica.</p>
      </div>

      <div className="directory-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="location-pill-btn"
            onClick={onOpenLocationModal}
            style={{ background: '#fffdfa', color: '#4b161b', borderColor: '#c9a227', height: 38 }}
            aria-label={`Localização: ${city || 'Brasil'}`}
          >
            <FeatureIcon name="map" />
            <span>{city ? `Cidade: ${city}` : 'Brasil (Todas as cidades)'}</span>
            <span style={{ fontSize: '.75rem', color: '#8c671d' }}>▾</span>
          </button>
          {city && (
            <button
              type="button"
              onClick={() => onSelectCity('')}
              style={{
                border: 0,
                background: 'transparent',
                color: '#8c671d',
                fontSize: '.75rem',
                fontWeight: 750,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Ver todo o Brasil
            </button>
          )}

          <button
            type="button"
            className={`filter-favorite-toggle-btn ${onlyFavorites ? 'active' : ''}`}
            onClick={() => setOnlyFavorites((prev) => !prev)}
            aria-pressed={onlyFavorites}
            title={onlyFavorites ? 'Exibindo apenas favoritas' : 'Filtrar empresas favoritas'}
          >
            <span>{onlyFavorites ? '❤️' : '🤍'}</span>
            <span>{onlyFavorites ? 'Exibindo Favoritas' : typeof favoritesCount === 'number' && favoritesCount > 0 ? `Favoritas (${favoritesCount})` : 'Filtrar Favoritas'}</span>
          </button>
        </div>

        {Boolean(guideData?.categories?.length) && (
          <div className="category-pills" role="tablist" aria-label="Categorias">
            <button
              type="button"
              className={`category-pill ${!selectedCategory ? 'active' : ''}`}
              onClick={() => onSelectCategory('')}
            >
              Todas
            </button>
            {guideData?.categories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                className={`category-pill ${selectedCategory === cat.slug ? 'active' : ''}`}
                onClick={() => onSelectCategory(selectedCategory === cat.slug ? '' : cat.slug)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="results-counter" role="status">
        {loading
          ? 'Buscando empresas...'
          : `${displayedBusinesses.length} ${displayedBusinesses.length === 1 ? 'empresa encontrada' : 'empresas encontradas'}${search ? ` para "${search}"` : ''}`}
      </div>

      {errorMessage && (
        <div className="empty-results">
          <b>Não foi possível carregar as empresas</b>
          <p>{errorMessage}</p>
          <button
            type="button"
            className="action-button"
            style={{ marginTop: 12 }}
            onClick={() => fetchBusinesses()}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !errorMessage && displayedBusinesses.length === 0 && (
        <div className="empty-results">
          <b>{onlyFavorites ? 'Nenhuma empresa favorita encontrada' : 'Nenhuma empresa encontrada'}</b>
          <p>
            {onlyFavorites
              ? 'Toque no ícone de coração nos cards de empresas para adicioná-las aos seus favoritos.'
              : 'Tente alterar o termo de busca ou selecionar outra cidade/categoria.'}
          </p>
          {onlyFavorites && (
            <button
              type="button"
              className="action-button"
              style={{ marginTop: 12 }}
              onClick={() => setOnlyFavorites(false)}
            >
              Ver todas as empresas
            </button>
          )}
        </div>
      )}

      <div className="business-list">
        {displayedBusinesses.map((biz) => (
          <BusinessCard
            key={biz.id}
            business={biz}
            onSelect={onSelectBusiness}
            onZoomLogo={onZoomLogo}
            isFavorited={isFavorite?.(biz.slug)}
            onToggleFavorite={onToggleFavorite}
            onRefer={onRefer}
          />
        ))}
      </div>
    </div>
  );
}

function getBusinessCoordinates(biz: MobileGuideSponsoredBusiness): { lat: number; lng: number } {
  if (
    typeof biz.latitude === 'number' &&
    typeof biz.longitude === 'number' &&
    !isNaN(biz.latitude) &&
    !isNaN(biz.longitude)
  ) {
    return { lat: biz.latitude, lng: biz.longitude };
  }
  const city = (biz.city || '').toLowerCase().trim();
  let baseLat = -12.2575;
  let baseLng = -38.9600;
  if (city.includes('salvador')) {
    baseLat = -12.9777;
    baseLng = -38.5016;
  } else if (city.includes('brasília') || city.includes('brasilia')) {
    baseLat = -15.7975;
    baseLng = -47.8919;
  } else if (city.includes('são paulo') || city.includes('sao paulo')) {
    baseLat = -23.5505;
    baseLng = -46.6333;
  } else if (city.includes('rio de janeiro')) {
    baseLat = -22.9068;
    baseLng = -43.1729;
  }

  const str = biz.id || biz.slug || biz.name;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const offsetLat = ((Math.abs(hash) % 100) - 50) * 0.0003;
  const offsetLng = ((Math.abs(hash >> 3) % 100) - 50) * 0.0003;
  return { lat: baseLat + offsetLat, lng: baseLng + offsetLng };
}

function mapPinHtml(selected: boolean, planTier?: string | null) {
  const isAcacia = (planTier || '').toLowerCase().includes('acacia') || (planTier || '').toLowerCase().includes('ouro');
  const size = selected ? 44 : 34;
  const bg = selected ? '#5d1523' : '#ffffff';
  const fg = selected ? '#ffffff' : (isAcacia ? '#b8860b' : '#5d1523');
  const border = isAcacia ? '2.5px solid #d4af37' : '2px solid #5d1523';
  const ring = selected
    ? '0 0 0 4px rgba(201, 162, 39, 0.9), 0 8px 20px rgba(0,0,0,0.45)'
    : '0 3px 10px rgba(0,0,0,0.22)';
  return `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};color:${fg};border:${border};box-shadow:${ring};display:flex;align-items:center;justify-content:center;transition:all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);cursor:pointer;">
    <svg width="${selected ? 22 : 18}" height="${selected ? 22 : 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3" fill="${selected ? '#c9a227' : 'currentColor'}"/>
    </svg>
  </div>`;
}

function getMapPlanBadge(planTier?: string | null) {
  const code = (planTier || '').toLowerCase().trim();
  if (['ouro', 'gold', 'ouro_founder', 'acacia'].includes(code)) {
    return { label: 'Acácia', badgeClass: 'map-plan-acacia', icon: '👑' };
  }
  if (['prata', 'silver', 'compasso'].includes(code)) {
    return { label: 'Compasso', badgeClass: 'map-plan-compasso', icon: '📐' };
  }
  return { label: 'Esquadro', badgeClass: 'map-plan-esquadro', icon: '🛡️' };
}

function ExploreNoMapaSection({
  businesses,
  categories,
  selectedCity,
  onSelectBusiness,
  onZoomLogo,
  isFavorite,
  onToggleFavorite,
  onRefer,
}: {
  businesses: MobileGuideSponsoredBusiness[];
  categories?: Array<{ id: string; name: string; slug: string }>;
  selectedCity?: string;
  onSelectBusiness: (slug: string) => void;
  onZoomLogo?: (logoUrl: string, name: string, backgroundColor?: string | null) => void;
  isFavorite?: (slug: string) => boolean;
  onToggleFavorite?: (slug: string, name?: string) => void;
  onRefer?: (name: string, slug: string) => void;
}) {
  const [mapQuery, setMapQuery] = useState('');
  const [activeCatSlug, setActiveCatSlug] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [isCardDismissed, setIsCardDismissed] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const leafletRef = useRef<any>(null);

  const defaultCenter = useMemo((): [number, number] => {
    const city = (selectedCity || '').toLowerCase().trim();
    if (city.includes('salvador')) return [-12.9777, -38.5016];
    if (city.includes('brasília') || city.includes('brasilia')) return [-15.7975, -47.8919];
    if (city.includes('são paulo') || city.includes('sao paulo')) return [-23.5505, -46.6333];
    if (city.includes('rio de janeiro')) return [-22.9068, -43.1729];
    return [-12.2575, -38.9600];
  }, [selectedCity]);

  const availableCategories = useMemo(() => {
    const catMap = new Map<string, { name: string; count: number }>();
    for (const b of businesses) {
      if (b.category_slug && b.category_name) {
        const item = catMap.get(b.category_slug);
        if (item) {
          item.count += 1;
        } else {
          catMap.set(b.category_slug, { name: b.category_name, count: 1 });
        }
      }
    }
    if (categories?.length) {
      for (const cat of categories) {
        if (!catMap.has(cat.slug)) {
          const count = businesses.filter((b) => b.category_slug === cat.slug).length;
          if (count > 0) catMap.set(cat.slug, { name: cat.name, count });
        }
      }
    }
    return Array.from(catMap.entries()).map(([slug, { name, count }]) => ({ slug, name, count }));
  }, [businesses, categories]);

  const filteredBusinesses = useMemo(() => {
    return businesses.filter((biz) => {
      const matchesCategory = !activeCatSlug || biz.category_slug === activeCatSlug;
      const q = mapQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        biz.name.toLowerCase().includes(q) ||
        (biz.description || '').toLowerCase().includes(q) ||
        (biz.category_name || '').toLowerCase().includes(q) ||
        (biz.city || '').toLowerCase().includes(q) ||
        (biz.address || '').toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [businesses, activeCatSlug, mapQuery]);

  const selectedBiz = useMemo(() => {
    if (selectedSlug) {
      const found = filteredBusinesses.find((b) => b.slug === selectedSlug);
      if (found) return found;
    }
    return filteredBusinesses[0] || null;
  }, [filteredBusinesses, selectedSlug]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    void (async () => {
      try {
        const L = (await import('leaflet')).default;
        if (cancelled || !mapContainerRef.current || mapRef.current) return;
        leafletRef.current = L;

        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: false,
          touchZoom: true,
          tapTolerance: 15,
        }).setView(defaultCenter, 13);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        mapRef.current = map;
        resizeObserver = new ResizeObserver(() => {
          if (mapRef.current) mapRef.current.invalidateSize();
        });
        resizeObserver.observe(mapContainerRef.current);
        setMapReady(true);
      } catch (err) {
        console.warn('Leaflet map initialization skipped or failed:', err);
      }
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    const points: Array<[number, number]> = [];

    filteredBusinesses.forEach((biz) => {
      const coords = getBusinessCoordinates(biz);
      points.push([coords.lat, coords.lng]);

      const isSelected = biz.slug === selectedBiz?.slug;
      const marker = L.marker([coords.lat, coords.lng], {
        icon: L.divIcon({
          html: mapPinHtml(isSelected, biz.plan_tier),
          className: 'map-custom-marker',
          iconSize: isSelected ? [44, 44] : [34, 34],
          iconAnchor: isSelected ? [22, 22] : [17, 17],
        }),
        title: biz.name,
        zIndexOffset: isSelected ? 1000 : 0,
      });

      marker.on('click', () => {
        setSelectedSlug(biz.slug);
        setIsCardDismissed(false);
        map.flyTo([coords.lat, coords.lng], 15, { duration: 0.5 });
      });

      marker.addTo(map);
      markersRef.current.set(biz.slug, marker);
    });

    if (points.length === 1) {
      map.setView(points[0], 15);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    }
  }, [filteredBusinesses, selectedBiz?.slug, mapReady]);

  const handleCenterOnUser = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 14, { duration: 0.8 });
      },
      () => {
        handleFitAll();
      },
      { timeout: 7000 }
    );
  };

  const handleFitAll = () => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || filteredBusinesses.length === 0) return;
    const points = filteredBusinesses.map((b) => {
      const c = getBusinessCoordinates(b);
      return [c.lat, c.lng] as [number, number];
    });
    if (points.length === 1) {
      map.flyTo(points[0], 15, { duration: 0.5 });
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    }
  };

  const getRouteUrl = (biz: MobileGuideSponsoredBusiness) => {
    const coords = getBusinessCoordinates(biz);
    if (biz.latitude && biz.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${biz.latitude},${biz.longitude}`;
    }
    const query = [biz.name, biz.address, biz.city, biz.state].filter(Boolean).join(', ');
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query || `${coords.lat},${coords.lng}`)}`;
  };

  const badge = selectedBiz ? getMapPlanBadge(selectedBiz.plan_tier) : null;
  const isSelectedFavorited = selectedBiz ? isFavorite?.(selectedBiz.slug) : false;

  return (
    <section className="guide-section map-explore-section" aria-labelledby="map-explore-title">
      <div className="section-heading">
        <p className="eyebrow">Perto de você</p>
        <h2 id="map-explore-title">Explore no Mapa</h2>
        <p className="section-subtext">
          Localize todas as empresas parceiras no mapa interativo, busque por serviços, abra o anúncio completo ou trace sua rota.
        </p>
      </div>

      {/* Barra de Busca no Mapa */}
      <div className="map-search-bar-container">
        <div className="map-search-input-wrapper">
          <svg className="map-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={mapQuery}
            onChange={(e) => {
              setMapQuery(e.target.value);
              setIsCardDismissed(false);
            }}
            placeholder="Buscar empresa, serviço ou categoria no mapa..."
            className="map-search-input"
            aria-label="Buscar no mapa"
          />
          {mapQuery && (
            <button
              type="button"
              className="map-search-clear-btn"
              onClick={() => setMapQuery('')}
              aria-label="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>
        <div className="map-counter-pill">
          {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'empresa' : 'empresas'}
        </div>
      </div>

      {/* Pílulas de Filtro de Categoria no Mapa */}
      {availableCategories.length > 0 && (
        <div className="map-category-pills" role="tablist" aria-label="Filtrar mapa por categoria">
          <button
            type="button"
            className={`map-category-pill ${!activeCatSlug ? 'active' : ''}`}
            onClick={() => {
              setActiveCatSlug('');
              setIsCardDismissed(false);
            }}
          >
            Todas ({businesses.length})
          </button>
          {availableCategories.map((cat) => (
            <button
              type="button"
              key={cat.slug}
              className={`map-category-pill ${activeCatSlug === cat.slug ? 'active' : ''}`}
              onClick={() => {
                setActiveCatSlug(activeCatSlug === cat.slug ? '' : cat.slug);
                setIsCardDismissed(false);
              }}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      )}

      {/* Caixa do Mapa Interativo */}
      <div className="map-container-wrapper">
        <div ref={mapContainerRef} className="map-leaflet-box" aria-label="Mapa interativo de empresas" />

        {/* Controles Flutuantes do Mapa */}
        <div className="map-floating-controls">
          <button
            type="button"
            onClick={handleCenterOnUser}
            className="map-control-btn"
            title="Minha localização"
            aria-label="Centralizar na minha localização"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="1" x2="12" y2="4" />
              <line x1="12" y1="20" x2="12" y2="23" />
              <line x1="1" y1="12" x2="4" y2="12" />
              <line x1="20" y1="12" x2="23" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleFitAll}
            className="map-control-btn"
            title="Ver todas as empresas"
            aria-label="Enquadrar todas as empresas"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>

        {/* Estado vazio quando não encontra com filtros */}
        {filteredBusinesses.length === 0 && (
          <div className="map-empty-overlay">
            <p>Nenhuma empresa encontrada para este filtro no mapa.</p>
            <button
              type="button"
              className="map-clear-filters-btn"
              onClick={() => {
                setMapQuery('');
                setActiveCatSlug('');
              }}
            >
              Ver todas as empresas
            </button>
          </div>
        )}

        {/* Card Flutuante de Detalhes da Empresa Selecionada */}
        {selectedBiz && !isCardDismissed && (
          <div className="map-floating-preview-card" role="dialog" aria-label={`Detalhes de ${selectedBiz.name}`}>
            <div className="map-preview-card-header">
              <div
                className="map-preview-logo-box"
                onClick={() => {
                  if (selectedBiz.logo_url) onZoomLogo?.(selectedBiz.logo_url, selectedBiz.name, selectedBiz.logo_background_color);
                }}
              >
                {selectedBiz.logo_url ? (
                  <img src={selectedBiz.logo_url} alt={selectedBiz.name} className="map-preview-logo-img" />
                ) : (
                  <span className="map-preview-logo-fallback">{selectedBiz.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="map-preview-meta">
                <div className="map-preview-title-row">
                  <h4
                    className="map-preview-biz-name"
                    onClick={() => onSelectBusiness(selectedBiz.slug)}
                  >
                    {selectedBiz.name}
                  </h4>
                  {badge && (
                    <span className={`map-preview-plan-badge ${badge.badgeClass}`}>
                      <span>{badge.icon}</span>
                      <span>{badge.label}</span>
                    </span>
                  )}
                </div>
                <p className="map-preview-category-text">
                  {selectedBiz.category_name || 'Comércio & Serviços'}
                  {(selectedBiz.city || selectedBiz.state) && (
                    <span> · {[selectedBiz.city, selectedBiz.state].filter(Boolean).join(', ')}</span>
                  )}
                </p>
                {selectedBiz.address && (
                  <p className="map-preview-address-text">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{selectedBiz.address}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                className="map-preview-dismiss-btn"
                onClick={() => setIsCardDismissed(true)}
                aria-label="Minimizar card do mapa"
              >
                ✕
              </button>
            </div>

            {/* Linha de Ações: Abrir Anúncio e Traçar Rota */}
            <div className="map-preview-actions-row">
              <button
                type="button"
                className="map-action-btn primary"
                onClick={() => onSelectBusiness(selectedBiz.slug)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Abrir anúncio
              </button>

              <a
                href={getRouteUrl(selectedBiz)}
                target="_blank"
                rel="noopener noreferrer"
                className="map-action-btn route"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
                Traçar rota
              </a>

              <button
                type="button"
                className={`map-action-icon-btn ${isSelectedFavorited ? 'favorited' : ''}`}
                onClick={() => onToggleFavorite?.(selectedBiz.slug, selectedBiz.name)}
                title={isSelectedFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                aria-label="Favoritar empresa"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill={isSelectedFavorited ? '#dc2626' : 'none'} stroke={isSelectedFavorited ? '#dc2626' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </button>

              <button
                type="button"
                className="map-action-icon-btn"
                onClick={() => onRefer?.(selectedBiz.name, selectedBiz.slug)}
                title="Indicar empresa"
                aria-label="Indicar empresa"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Botão de reabrir card se foi minimizado */}
      {selectedBiz && isCardDismissed && (
        <div className="map-reopen-bar">
          <span className="map-reopen-name">📍 {selectedBiz.name}</span>
          <button
            type="button"
            className="map-reopen-btn"
            onClick={() => setIsCardDismissed(false)}
          >
            Exibir opções e rota →
          </button>
        </div>
      )}

      {/* Carrossel de Mini Cards das Empresas no Mapa */}
      {filteredBusinesses.length > 0 && (
        <div className="map-mini-cards-section">
          <p className="map-mini-cards-label">Empresas exibidas no mapa ({filteredBusinesses.length}):</p>
          <div className="map-mini-cards-track" aria-label="Empresas visíveis no mapa">
            {filteredBusinesses.map((b) => {
              const isSelected = b.slug === selectedBiz?.slug;
              const bBadge = getMapPlanBadge(b.plan_tier);
              return (
                <div
                  key={b.id}
                  className={`map-mini-card ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedSlug(b.slug);
                    setIsCardDismissed(false);
                    const coords = getBusinessCoordinates(b);
                    mapRef.current?.flyTo([coords.lat, coords.lng], 15, { duration: 0.5 });
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="map-mini-card-logo">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.name} />
                    ) : (
                      <span>{b.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="map-mini-card-info">
                    <div className="map-mini-card-name-row">
                      <span className="map-mini-card-name">{b.name}</span>
                      <span className={`map-mini-card-badge ${bBadge.badgeClass}`}>{bBadge.label}</span>
                    </div>
                    <span className="map-mini-card-cat">{b.category_name || b.city || 'Empresa'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function Home({
  city,
  selectedCategory,
  onSelectCategory,
  onLoadedData,
  onSelectBusiness,
  onSelectLodge,
  onZoomLogo,
  isFavorite,
  onToggleFavorite,
  onRefer,
  onStartShareExperience,
}: {
  city: string;
  selectedCategory: string;
  onSelectCategory: (categorySlug: string) => void;
  onLoadedData?: (data: MobileGuideHomeData) => void;
  onSelectBusiness: (slug: string) => void;
  onSelectLodge?: (slug: string) => void;
  onZoomLogo?: (logoUrl: string, name: string, backgroundColor?: string | null) => void;
  isFavorite?: (slug: string) => boolean;
  onToggleFavorite?: (slug: string, name?: string) => void;
  onRefer?: (name: string, slug: string) => void;
  onStartShareExperience?: (slug?: string) => void;
}) {
  const [guideData, setGuideData] = useState<MobileGuideHomeData | null>(null);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const guideServiceRef = useRef(createMobileGuideService());
  const requestRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const reload = (isManualPull = false) => {
    const requestId = ++requestRef.current;
    if (isManualPull) setIsPullRefreshing(true);
    void guideServiceRef.current
      .loadHome({ city: city || undefined, category: selectedCategory || undefined })
      .then((data) => {
        if (requestId === requestRef.current) {
          setGuideData(data);
          onLoadedData?.(data);
        }
      })
      .catch(() => {
        // Falha silenciosa no pull-to-refresh
      })
      .finally(() => {
        if (requestId === requestRef.current && isManualPull) {
          setIsPullRefreshing(false);
        }
      });
  };

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') reload(false);
    };
    reload(false);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [city, selectedCategory]);

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (window.scrollY <= 5) {
      touchStartRef.current = {
        x: event.touches[0]?.clientX ?? 0,
        y: event.touches[0]?.clientY ?? 0,
      };
    }
  };

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || isPullRefreshing || window.scrollY > 10) return;
    const touch = event.changedTouches[0];
    if (touch && touch.clientY - start.y > 60 && Math.abs(touch.clientX - start.x) < 80) {
      reload(true);
    }
  };

  const sectionNodes: Record<HomeSectionId, ReactNode> = {
    carousel: null,
    weekly_highlight: (
      <section className="guide-section" aria-labelledby="weekly-title">
        <div className="section-heading">
          <p className="eyebrow">Em evidência</p>
          <h2 id="weekly-title">Destaque da Semana</h2>
        </div>
        <article className="weekly-highlight">
          <span className="section-symbol">
            <FeatureIcon name="highlight" />
          </span>
          <div>
            <p className="status-label">Espaço editorial preparado</p>
            <h3>Novidades da Conexão</h3>
            <p>Os destaques publicados pelo Guia aparecerão aqui na próxima fase.</p>
          </div>
        </article>
      </section>
    ),
    // Card "Conexões que geram valor" removido conforme solicitação:
    connections_cta: null,
    categories: (
      <section className="guide-section section-soft" aria-labelledby="categories-title">
        <div className="section-heading">
          <p className="eyebrow">Descubra</p>
          <h2 id="categories-title">Explore por Categoria</h2>
        </div>
        <div className="category-preview" aria-label="Categorias aguardando integração pública">
          {[0, 1, 2, 3].map((item) => (
            <span key={item} aria-hidden="true">
              <FeatureIcon name="category" />
            </span>
          ))}
        </div>
        <p className="section-status">
          As categorias ativas do Guia serão carregadas pelas APIs públicas.
        </p>
      </section>
    ),
    sponsored: (
      <section className="guide-section" aria-labelledby="sponsored-title">
        <div className="section-heading">
          <p className="eyebrow">Empresas da rede</p>
          <h2 id="sponsored-title">Empresas em destaque</h2>
        </div>
        <div className="sponsor-preview" aria-label="Empresas em destaque aguardando integração">
          <span />
          <span />
          <span />
          <p>Logomarcas e cards seguirão a curadoria publicada no Guia.</p>
        </div>
      </section>
    ),
    connections_mural: (
      <MuralDeConexoesSection
        onOpenShareExperience={() => onStartShareExperience?.()}
        onSelectBusiness={onSelectBusiness}
      />
    ),
    all_businesses: (
      <section className="guide-section" aria-labelledby="all-businesses-title">
        <div className="section-heading">
          <p className="eyebrow">Guia comercial</p>
          <h2 id="all-businesses-title">Todas as empresas</h2>
        </div>
        <div className="directory-filter-preview" aria-label="Filtros preparados para o diretório">
          <span>
            <FeatureIcon name="search" /> Empresa ou serviço
          </span>
          <button type="button" disabled>
            Categoria
          </button>
          <button type="button" disabled>
            Cidade
          </button>
        </div>
        <div
          className="business-card-preview"
          aria-label="Listagem aguardando dados públicos"
        >
          <span className="business-logo-placeholder">
            <FeatureIcon name="companies" />
          </span>
          <div>
            <b>Listagem preparada</b>
            <p>Cards reais, paginação e filtros serão conectados na Fase 2.</p>
          </div>
        </div>
      </section>
    ),
    map: (
      <ExploreNoMapaSection
        businesses={guideData?.businesses?.length ? guideData.businesses : DEFAULT_BUSINESSES}
        categories={guideData?.categories || []}
        selectedCity={city}
        onSelectBusiness={onSelectBusiness}
        onZoomLogo={onZoomLogo}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        onRefer={onRefer}
      />
    ),
    lodges: (
      <HomeLodgesSection
        onSelectLodge={onSelectLodge}
        onNavigateToLojas={() => {
          window.location.hash = routeHref('lojas');
        }}
      />
    ),
  };

  const dynamicNodes: Partial<Record<HomeSectionId, ReactNode>> = {
    weekly_highlight: guideData ? (
      <section className="guide-section" aria-label="Destaque publicado" style={{ padding: '0 4px' }}>
        <HomeBannerCarousel
          banners={guideData.banners}
          onNavigate={() => {
            window.location.hash = routeHref('empresas');
          }}
        />
      </section>
    ) : undefined,
    carousel: guideData ? (
      <section className="guide-section" aria-label="Banners publicados" style={{ padding: '0 4px' }}>
        <HomeBannerCarousel
          banners={guideData.banners}
          onNavigate={() => {
            window.location.hash = routeHref('empresas');
          }}
        />
      </section>
    ) : undefined,
    connections_cta: null,
    categories: guideData ? (
      <section className="guide-section section-soft" aria-labelledby="categories-title">
        <div className="section-heading">
          <p className="eyebrow">Descubra</p>
          <h2 id="categories-title">Explore por Categoria</h2>
        </div>
        <div className="category-scroll-grid" aria-label="Categorias publicadas">
          {guideData.categories.length ? (
            guideData.categories.map((category) => {
              const isSelected = selectedCategory === category.slug;
              return (
                <button
                  type="button"
                  key={category.id}
                  className={`category-square-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectCategory(isSelected ? '' : category.slug)}
                  title={category.name}
                >
                  <span className="category-icon-wrapper">
                    <CategoryIcon slug={category.slug} name={category.name} />
                  </span>
                  <small className="category-name-label">{category.name}</small>
                </button>
              );
            })
          ) : (
            <p className="inline-state">Nenhuma categoria publicada.</p>
          )}
        </div>
      </section>
    ) : undefined,
    sponsored: guideData ? (() => {
      const pedraBizs = guideData.businesses.filter((b) => b.is_pedra_fundamental);
      const displayBizs = pedraBizs.length > 0 ? pedraBizs : guideData.businesses.slice(0, 8);

      return (
        <section className="guide-section" aria-labelledby="sponsored-title">
          <div className="section-heading">
            <p className="eyebrow">Empresas Fundadoras</p>
            <h2 id="sponsored-title">Empresas — Pedra Fundamental</h2>
          </div>
          <div className="pedra-marquee-container" aria-label="Marcas Pedra Fundamental">
            <div className="pedra-marquee-track">
              {[...displayBizs, ...displayBizs].map((biz, idx) => (
                <button
                  type="button"
                  key={`${biz.id}-${idx}`}
                  className="pedra-brand-item-btn"
                  onClick={() => onSelectBusiness(biz.slug)}
                  title={`${biz.name} — Pedra Fundamental`}
                >
                  <div className="pedra-brand-circle">
                    {biz.logo_url ? (
                      <img src={biz.logo_url} alt={biz.name} className="pedra-brand-logo-img" />
                    ) : (
                      <span className="pedra-brand-initial">{biz.name.charAt(0).toUpperCase()}</span>
                    )}
                    <img
                      src={PEDRA_FUNDAMENTAL_ROUND_SEAL}
                      alt="Pedra Fundamental"
                      className="pedra-brand-mini-seal"
                      onError={(e) => {
                        e.currentTarget.src = PEDRA_FUNDAMENTAL_SEAL;
                      }}
                    />
                  </div>
                  <span className="pedra-brand-label">{biz.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      );
    })() : undefined,
    connections_mural: (
      <MuralDeConexoesSection
        onOpenShareExperience={() => onStartShareExperience?.()}
        onSelectBusiness={onSelectBusiness}
      />
    ),
    all_businesses: guideData ? (() => {
      const sorted = sortBusinessesByTier(guideData.businesses);
      return (
        <section className="guide-section" aria-labelledby="all-businesses-title">
          <div className="section-heading">
            <p className="eyebrow">Guia comercial</p>
            <h2 id="all-businesses-title">Todas as empresas</h2>
          </div>
          <div className="business-list" style={{ marginTop: 14 }}>
            {sorted.length ? (
              sorted.slice(0, 6).map((business) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  onSelect={onSelectBusiness}
                  onZoomLogo={onZoomLogo}
                  isFavorited={isFavorite?.(business.slug)}
                  onToggleFavorite={onToggleFavorite}
                  onRefer={onRefer}
                />
              ))
            ) : (
              <p className="inline-state">Nenhuma empresa publicada para os filtros atuais.</p>
            )}
          </div>
          <a href={routeHref('empresas')} className="catalog-link-button">
            Ver todas as empresas no catálogo →
          </a>
        </section>
      );
    })() : undefined,
    map: (
      <ExploreNoMapaSection
        businesses={guideData?.businesses?.length ? guideData.businesses : DEFAULT_BUSINESSES}
        categories={guideData?.categories || []}
        selectedCity={city}
        onSelectBusiness={onSelectBusiness}
        onZoomLogo={onZoomLogo}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        onRefer={onRefer}
      />
    ),
    lodges: (
      <HomeLodgesSection
        onSelectLodge={onSelectLodge}
        onNavigateToLojas={() => {
          window.location.hash = routeHref('lojas');
        }}
      />
    ),
  };

  return (
    <div className="home-content" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {isPullRefreshing && (
        <div className="pull-refresh-overlay" role="status" aria-live="polite">
          <span className="pull-refresh-spinner" aria-hidden="true" />
        </div>
      )}
      <section className="hero">
        <p className="eyebrow">Plataforma comercial e maçônica</p>
        <h1>{guideData?.settings.hero_title || 'Tradição que une! Conexão que fortalece!'}</h1>
        <p>
          {guideData?.settings.hero_subtitle ||
            'A Conexão Maçônica aproxima empresas da família maçônica de pessoas que valorizam confiança, relacionamento e boas conexões.'}
        </p>
      </section>

      {(guideData?.settings.sections_config.length
        ? guideData.settings.sections_config.filter(
            (section) => section.enabled && section.id in sectionNodes && section.id !== 'connections_cta',
          )
        : visibleHomeSections().filter((section) => section.id !== 'connections_cta')
      ).map((section) => {
        const node = dynamicNodes[section.id as HomeSectionId] ?? sectionNodes[section.id as HomeSectionId];
        if (!node) return null;
        return (
          <div className="home-section-slot" data-section={section.id} key={section.id}>
            {node}
          </div>
        );
      })}
    </div>
  );
}

function AppFooter({ onNavigate }: { onNavigate?: (route: Route) => void }) {
  const handleInternalNav = (targetRoute: Route) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(targetRoute);
    } else {
      window.location.hash = routeHref(targetRoute);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="dh-footer" role="contentinfo" aria-label="Rodapé institucional">
      <div className="dh-container">
        {/* Trust Badges Bar */}
        <div className="dh-footer__trust-bar">
          <div className="dh-trust-item">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>Ambiente protegido</span>
          </div>
          <div className="dh-trust-item">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Privacidade e LGPD</span>
          </div>
          <div className="dh-trust-item">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>Rede verificada</span>
          </div>
        </div>

        {/* Footer Main Content */}
        <div className="dh-footer__main">
          {/* Logo & Rights */}
          <div className="dh-footer__brand-block">
            <img
              src="/logoconexao_red_vert.png"
              alt="Conexão Maçônica"
              width={140}
              height={50}
              className="dh-footer__logo"
            />
            <p className="dh-footer__rights">© Conexão Maçônica. Todos os direitos reservados.</p>
          </div>

          {/* Links & Menu */}
          <nav className="dh-footer__links" aria-label="Links do rodapé">
            <a href={routeHref('inicio')} onClick={handleInternalNav('inicio')} className="dh-footer__link">
              Início
            </a>
            <a href={routeHref('empresas')} onClick={handleInternalNav('empresas')} className="dh-footer__link">
              Empresas
            </a>
            <a href={routeHref('beneficios')} onClick={handleInternalNav('beneficios')} className="dh-footer__link">
              Benefícios
            </a>
            <a href={routeHref('lojas')} onClick={handleInternalNav('lojas')} className="dh-footer__link">
              Lojas Maçônicas
            </a>
            <a href={routeHref('mais')} onClick={handleInternalNav('mais')} className="dh-footer__link">
              Eventos
            </a>
            <a
              href="https://conexaomaconica.com.br/termos"
              target="_blank"
              rel="noopener noreferrer"
              className="dh-footer__link"
            >
              Termos de Uso
            </a>
            <a
              href="https://conexaomaconica.com.br/privacidade"
              target="_blank"
              rel="noopener noreferrer"
              className="dh-footer__link"
            >
              Privacidade e LGPD
            </a>
          </nav>

          {/* Signature */}
          <div className="dh-footer__signature">
            <span className="dh-footer__developed-by">Desenvolvido por</span>
            <a
              href="https://sabastudioblog.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="dh-footer__studio-link"
              aria-label="Saba Studio"
            >
              <img
                src="/logosabastudio.svg"
                alt="Saba Studio"
                width={130}
                height={35}
                className="dh-footer__studio-logo"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function App() {
  const [showLaunch, setShowLaunch] = useState(launchOnThisBoot);
  const [route, setRoute] = useState<Route>(() => routeFromHash(window.location.hash));
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPotency, setSelectedPotency] = useState('');
  const [maisSubView, setMaisSubView] = useState<'menu' | 'eventos'>('menu');
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'empresas' | 'lojas'>('all');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [availableCities, setAvailableCities] = useState<string[]>(['Feira de Santana']);
  const [serverCategories, setServerCategories] = useState<Array<{ id?: string; name: string; slug: string; business_count?: number }>>([]);
  const [selectedBusinessSlug, setSelectedBusinessSlug] = useState<string | null>(null);
  const [selectedLodgeSlug, setSelectedLodgeSlug] = useState<string | null>(null);
  const [zoomLogo, setZoomLogo] = useState<{ url: string; name: string; backgroundColor?: string | null } | null>(null);
  const [referModal, setReferModal] = useState<{ businessName: string; businessSlug: string } | null>(null);
  const [memberUser, setMemberUser] = useState<{ id: string; name: string; email: string } | null>(() => {
    try {
      const saved = localStorage.getItem('cm_mobile_member_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [serverBusinesses, setServerBusinesses] = useState<MobileGuideSponsoredBusiness[]>([]);
  const [isMemberLoginModalOpen, setIsMemberLoginModalOpen] = useState(false);
  const [isShareExperienceModalOpen, setIsShareExperienceModalOpen] = useState(false);
  const [pendingExperienceCompanySlug, setPendingExperienceCompanySlug] = useState<string | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { favorites, isFavorite, toggleFavorite } = useMobileFavorites();
  const online = useOnlineStatus();

  const handleToggleFavorite = (slug: string, name?: string) => {
    toggleFavorite(slug);
    const willBeFavorited = !isFavorite(slug);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMsg(
      willBeFavorited
        ? `❤️ ${name || 'Item'} adicionado aos favoritos!`
        : `🤍 ${name || 'Item'} removido dos favoritos.`
    );
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 2500);
  };

  const handleOpenRefer = (name: string, slug: string) => {
    setReferModal({ businessName: name, businessSlug: slug });
  };

  const handleStartShareExperience = (slug?: string) => {
    setPendingExperienceCompanySlug(slug || null);
    if (!memberUser) {
      setIsMemberLoginModalOpen(true);
    } else {
      setIsShareExperienceModalOpen(true);
    }
  };

  const handleMemberLoginSuccess = (user: { id: string; name: string; email: string }) => {
    setMemberUser(user);
    try {
      localStorage.setItem('cm_mobile_member_user', JSON.stringify(user));
      localStorage.setItem('cm_mobile_referrer_name', user.name);
    } catch {}
    setIsMemberLoginModalOpen(false);
    setIsShareExperienceModalOpen(true);
  };

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) window.history.replaceState(null, '', routeHref('inicio'));
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (showLaunch) return <LaunchExperience onComplete={() => setShowLaunch(false)} />;

  const isDetailOpen = Boolean(selectedBusinessSlug || selectedLodgeSlug);
  const isEventosView = route === 'mais' && maisSubView === 'eventos';
  const isMaisMenuOnly = route === 'mais' && maisSubView === 'menu';

  const searchPlaceholder =
    route === 'lojas'
      ? 'Buscar loja por nome, número ou cidade...'
      : route === 'beneficios'
        ? 'Buscar benefícios ou empresas parceiras...'
        : isEventosView
          ? 'Buscar evento, palestra ou comunicado...'
          : 'Buscar empresas ou serviços...';

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (route === 'lojas' || route === 'beneficios' || isEventosView) {
      return;
    }
    window.location.hash = routeHref('empresas');
  };

  const displayCategories = getMergedCategories(serverCategories);

  const handleCategoryClick = (catSlug: string) => {
    const next = selectedCategory === catSlug ? '' : catSlug;
    setSelectedCategory(next);
    if (route !== 'empresas' && route !== 'beneficios') {
      window.location.hash = routeHref('empresas');
    }
  };

  return (
    <div className="app-shell">
      {!online && (
        <div className="offline-banner" role="status">
          Você está offline. O conteúdo local continua disponível.
        </div>
      )}
      <header className="topbar">
        <div className="topbar-brand-row">
          <img className="brand-logo" src="./logo_conexao.svg" alt="Conexão Maçônica" />
          <button
            type="button"
            className="location-pill-btn"
            onClick={() => setIsLocationModalOpen(true)}
            aria-label={`Localização: ${city || 'Brasil'}`}
            title="Alterar localização"
          >
            <FeatureIcon name="map" />
            <span className="location-pill-text">{city || 'Brasil'}</span>
            <span className="location-pill-chevron" aria-hidden="true">▾</span>
          </button>
        </div>

        {!isDetailOpen && !isMaisMenuOnly && (
          <div className="topbar-tools">
            <form className="search-form" role="search" onSubmit={handleSearchSubmit}>
              <FeatureIcon name="search" />
              <label className="sr-only" htmlFor="topbar-search">
                {searchPlaceholder}
              </label>
              <input
                id="topbar-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
              />
              <button type="submit" aria-label="Buscar">
                Buscar
              </button>
            </form>
          </div>
        )}

        {!isDetailOpen && !isMaisMenuOnly && (
          <div className="categories-slider-bar" role="region" aria-label="Filtros rápidos no topo">
            <div className="categories-slider-track">
              {route === 'lojas' ? (
                <>
                  <button
                    type="button"
                    className={`category-item-btn ${!selectedPotency ? 'active' : ''}`}
                    onClick={() => setSelectedPotency('')}
                    title="Todas as Potências"
                  >
                    <span className="category-item-icon">
                      <FeatureIcon name="lodges" />
                    </span>
                    <span className="category-item-label">Todas</span>
                  </button>
                  {DEFAULT_POTENCIES.map((pot) => (
                    <button
                      key={pot.slug}
                      type="button"
                      className={`category-item-btn ${selectedPotency === pot.slug ? 'active' : ''}`}
                      onClick={() => setSelectedPotency(selectedPotency === pot.slug ? '' : pot.slug)}
                      title={pot.name}
                    >
                      <span className="category-item-icon">
                        <FeatureIcon name="lodges" />
                      </span>
                      <span className="category-item-label">{pot.abbreviation}</span>
                    </button>
                  ))}
                </>
              ) : isEventosView ? (
                <>
                  <button
                    type="button"
                    className={`category-item-btn ${eventTypeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setEventTypeFilter('all')}
                    title="Todos os Eventos"
                  >
                    <span className="category-item-icon">
                      <FeatureIcon name="events" />
                    </span>
                    <span className="category-item-label">Todos</span>
                  </button>
                  <button
                    type="button"
                    className={`category-item-btn ${eventTypeFilter === 'empresas' ? 'active' : ''}`}
                    onClick={() => setEventTypeFilter('empresas')}
                    title="Eventos de Empresas"
                  >
                    <span className="category-item-icon">
                      <FeatureIcon name="companies" />
                    </span>
                    <span className="category-item-label">Empresas</span>
                  </button>
                  <button
                    type="button"
                    className={`category-item-btn ${eventTypeFilter === 'lojas' ? 'active' : ''}`}
                    onClick={() => setEventTypeFilter('lojas')}
                    title="Eventos de Lojas Maçônicas"
                  >
                    <span className="category-item-icon">
                      <FeatureIcon name="lodges" />
                    </span>
                    <span className="category-item-label">Lojas Maçônicas</span>
                  </button>
                </>
              ) : (
                displayCategories.map((cat) => (
                  <button
                    key={cat.slug}
                    type="button"
                    className={`category-item-btn ${selectedCategory === cat.slug ? 'active' : ''}`}
                    onClick={() => handleCategoryClick(cat.slug)}
                    title={cat.name}
                  >
                    <span className="category-item-icon">
                      <CategoryIcon slug={cat.slug} name={cat.name} />
                    </span>
                    <span className="category-item-label">{cat.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </header>

      <main className="main-content">
        {route === 'inicio' ? (
          <Home
            city={city}
            selectedCategory={selectedCategory}
            onSelectCategory={(catSlug) => {
              setSelectedCategory(catSlug);
              window.location.hash = routeHref('empresas');
            }}
            onSelectBusiness={(slug) => setSelectedBusinessSlug(slug)}
            onSelectLodge={(slug) => setSelectedLodgeSlug(slug)}
            onZoomLogo={(url, name, backgroundColor) => setZoomLogo({ url, name, backgroundColor })}
            isFavorite={isFavorite}
            onToggleFavorite={handleToggleFavorite}
            onRefer={handleOpenRefer}
            onStartShareExperience={handleStartShareExperience}
            onLoadedData={(data) => {
              if (data.available_cities?.length) {
                setAvailableCities(data.available_cities);
              }
              if (data.categories?.length) {
                setServerCategories(data.categories);
              }
              if (data.businesses?.length) {
                setServerBusinesses(data.businesses);
              } else if (data.sponsored?.length) {
                setServerBusinesses(data.sponsored);
              }
            }}
          />
        ) : route === 'empresas' ? (
          <EmpresasScreen
            search={search}
            city={city}
            selectedCategory={selectedCategory}
            onSelectCategory={(catSlug) => setSelectedCategory(catSlug)}
            onSelectCity={(newCity) => setCity(newCity)}
            onOpenLocationModal={() => setIsLocationModalOpen(true)}
            onSelectBusiness={(slug) => setSelectedBusinessSlug(slug)}
            onZoomLogo={(url, name, backgroundColor) => setZoomLogo({ url, name, backgroundColor })}
            isFavorite={isFavorite}
            onToggleFavorite={handleToggleFavorite}
            onRefer={handleOpenRefer}
            favoritesCount={favorites.length}
            onLoadedData={(data) => {
              if (data.available_cities?.length) {
                setAvailableCities(data.available_cities);
              }
              if (data.categories?.length) {
                setServerCategories(data.categories);
              }
              if (data.businesses?.length) {
                setServerBusinesses(data.businesses);
              } else if (data.sponsored?.length) {
                setServerBusinesses(data.sponsored);
              }
            }}
          />
        ) : route === 'beneficios' ? (
          <BeneficiosScreen
            search={search}
            city={city}
            selectedCategory={selectedCategory}
            onSelectCategory={(catSlug) => setSelectedCategory(catSlug)}
            onSelectCity={(newCity) => setCity(newCity)}
            onOpenLocationModal={() => setIsLocationModalOpen(true)}
            onSelectBusiness={(slug) => setSelectedBusinessSlug(slug)}
            onZoomLogo={(url, name, backgroundColor) => setZoomLogo({ url, name, backgroundColor })}
            isFavorite={isFavorite}
            onToggleFavorite={handleToggleFavorite}
            onRefer={handleOpenRefer}
            favoritesCount={favorites.length}
            onLoadedData={(data) => {
              if (data.available_cities?.length) {
                setAvailableCities(data.available_cities);
              }
              if (data.categories?.length) {
                setServerCategories(data.categories);
              }
              if (data.businesses?.length) {
                setServerBusinesses(data.businesses);
              }
            }}
          />
        ) : route === 'lojas' ? (
          <LojasScreen
            onSelectLodge={(slug) => setSelectedLodgeSlug(slug)}
            externalSearch={search}
            externalPotency={selectedPotency}
            onChangeExternalPotency={(pot) => setSelectedPotency(pot)}
          />
        ) : (
          <EmptyScreen
            route={route}
            favoritesCount={favorites.length}
            onGoToFavorites={() => {
              window.location.hash = routeHref('empresas');
            }}
            memberUser={memberUser}
            onOpenMemberLogin={() => setIsMemberLoginModalOpen(true)}
            onLogoutMember={() => {
              setMemberUser(null);
              try {
                localStorage.removeItem('cm_mobile_member_user');
              } catch {}
            }}
            onStartShareExperience={() => handleStartShareExperience()}
            maisSubView={maisSubView}
            onChangeMaisSubView={(view) => setMaisSubView(view)}
            eventTypeFilter={eventTypeFilter}
            onChangeEventTypeFilter={(f) => setEventTypeFilter(f)}
            searchQuery={search}
          />
        )}
      </main>

      <AppFooter
        onNavigate={(targetRoute) => {
          setSelectedBusinessSlug(null);
          setSelectedLodgeSlug(null);
          setRoute(targetRoute);
          window.location.hash = routeHref(targetRoute);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        selectedCity={city}
        onSelectCity={(newCity) => {
          setCity(newCity);
          setIsLocationModalOpen(false);
        }}
        availableCities={availableCities}
      />

      <BusinessDetailModal
        slug={selectedBusinessSlug}
        onClose={() => setSelectedBusinessSlug(null)}
        onZoomLogo={(url, name, backgroundColor) => setZoomLogo({ url, name, backgroundColor })}
        isFavorited={selectedBusinessSlug ? isFavorite(selectedBusinessSlug) : false}
        onToggleFavorite={handleToggleFavorite}
        onRefer={handleOpenRefer}
        onShareExperience={handleStartShareExperience}
      />

      <LodgeDetailModal
        slug={selectedLodgeSlug}
        onClose={() => setSelectedLodgeSlug(null)}
        onRefer={handleOpenRefer}
        isFavorited={selectedLodgeSlug ? isFavorite(selectedLodgeSlug) : false}
        onToggleFavorite={handleToggleFavorite}
      />

      <LogoZoomModal
        logoUrl={zoomLogo?.url ?? null}
        businessName={zoomLogo?.name ?? ''} backgroundColor={zoomLogo?.backgroundColor}
        onClose={() => setZoomLogo(null)}
      />

      {referModal && (
        <ReferBusinessModal
          businessName={referModal.businessName}
          businessSlug={referModal.businessSlug}
          onClose={() => setReferModal(null)}
        />
      )}

      <MemberLoginModal
        isOpen={isMemberLoginModalOpen}
        onClose={() => {
          setIsMemberLoginModalOpen(false);
          setPendingExperienceCompanySlug(null);
        }}
        onLoginSuccess={handleMemberLoginSuccess}
      />

      <ShareExperienceModal
        isOpen={isShareExperienceModalOpen}
        onClose={() => {
          setIsShareExperienceModalOpen(false);
          setPendingExperienceCompanySlug(null);
        }}
        initialCompanySlug={pendingExperienceCompanySlug}
        businesses={serverBusinesses.length ? serverBusinesses : DEFAULT_BUSINESSES}
        memberUser={memberUser}
      />

      {toastMsg && (
        <div className="favorite-toast-bar" role="status" aria-live="polite">
          {toastMsg}
        </div>
      )}

      <nav className="bottom-nav" aria-label="Navegação principal">
        {routes.map((item) => (
          <a
            key={item}
            href={routeHref(item)}
            aria-current={route === item ? 'page' : undefined}
          >
            <NavIcon route={item} />
            {routeLabels[item]}
          </a>
        ))}
      </nav>
    </div>
  );
}

