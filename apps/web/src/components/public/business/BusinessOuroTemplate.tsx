import Link from 'next/link';
import {
  Clock,
  Eye,
  FileText,
  Mail,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Star,
  Tag,
  Globe,
  Play,
} from 'lucide-react';
import type {
  PublicBusinessPresentation,
} from '@/lib/business/public-business-presentation';
import { BusinessMedia } from './BusinessMedia';
import { BusinessShareActions } from './BusinessShareActions';
import styles from '@/components/visual-lab/FigmaOuroView.module.css';

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function digits(value: string | null): string | null {
  if (!value) return null;
  const result = value.replace(/\D/g, '');
  return result || null;
}

function externalHref(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

import { resolveServiceIcon } from './ServiceIconMap';
import { CopyDiscountCodeButton } from './CopyDiscountCodeButton';

export function BusinessOuroTemplate({ business }: { business: PublicBusinessPresentation }) {
  const { identity, authority, owner, reviews, metrics, location, contacts, hours, media, benefit, benefits } = business;

  const activeBenefits = (benefits && benefits.length > 0) ? benefits : (benefit ? [benefit] : []);

  const phone = digits(contacts.phone);
  const whatsapp = digits(contacts.whatsapp);
  const instagram = externalHref(contacts.instagram);
  const facebook = externalHref(contacts.facebook);
  const mapHref = location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        location.latitude != null && location.longitude != null
          ? `${location.latitude},${location.longitude}`
          : location.address
      )}`
    : null;

  const quoteHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá, gostaria de solicitar um orçamento para ${identity.name}.`)}`
    : contacts.email
    ? `mailto:${contacts.email}?subject=${encodeURIComponent(`Orçamento — ${identity.name}`)}`
    : null;

  const redeemHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá, gostaria de resgatar o benefício especial de ${identity.name}.`)}`
    : null;

  const cover = media.cover;
  const allMedia = media.gallery;
  const firstOpen = hours.find((item) => !item.isClosed);

  return (
    <div className={styles.ouroContainer} data-visual-lab="figma-ouro">
      {/* Top Breadcrumb */}
      <div className={styles.topBreadcrumb}>
        <Link href="/guia" className="hover:underline text-amber-200/80">← Voltar para Guia de Empresas</Link>
      </div>

      {/* Dark Hero Banner Flagship Ouro/Fundador */}
      <header className={styles.darkHeroBanner} data-testid="ouro-hero-header">
        <div className={styles.diamondPatternSvg} aria-hidden="true" />
        <div className={styles.heroContentGrid}>
          {/* Logo Crest */}
          <div className={styles.logoCrestBox} data-testid="ouro-logo-box">
            {identity.logo ? (
              <BusinessMedia asset={identity.logo} priority sizes="100px" />
            ) : (
              <span>{identity.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          {/* Identity & Badges */}
          <div className={styles.identityGroup}>
            <div className={styles.badgesRow} data-testid="ouro-badges-row">
              {authority.isVerified && (
                <span className={styles.badgeVerified}>
                  <ShieldCheck className="w-3.5 h-3.5" /> Empresa Verificada
                </span>
              )}
              <span className={styles.badgeOuro}>👑 PLANO OURO</span>
              {authority.isFounder && (
                <span className={styles.badgeFounder}>
                  <Star className="w-3.5 h-3.5 fill-current" /> EMPRESA FUNDADORA
                </span>
              )}
            </div>

            <h1 className={styles.title}>{identity.name}</h1>
            {identity.category && <p className={styles.category}>{identity.category}</p>}
          </div>

          {/* Quick Metrics */}
          <div className={styles.quickMetricsBox}>
            <div className={styles.metricItem}>
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Responde em até 1h</span>
            </div>
            {reviews.average != null && (
              <div className={styles.metricItem}>
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>{reviews.average.toFixed(1).replace('.', ',')} ({reviews.count} avaliações)</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sticky Combined Action Bar */}
      <div className={styles.stickyCombinedBar} data-testid="ouro-sticky-bar">
        <div className={styles.actionButtonsRow}>
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className={`${styles.actionBtn} ${styles.isGreen}`}>
              <Phone className="w-4 h-4" /> WhatsApp VIP
            </a>
          )}
          {phone && (
            <a href={`tel:${phone}`} className={styles.actionBtn}>
              <Phone className="w-4 h-4" /> Ligar
            </a>
          )}
          {contacts.email && (
            <a href={`mailto:${contacts.email}`} className={styles.actionBtn}>
              <Mail className="w-4 h-4" /> E-mail
            </a>
          )}
          {mapHref && (
            <a href={mapHref} target="_blank" rel="noopener noreferrer" className={styles.actionBtn}>
              <MapPin className="w-4 h-4" /> Traçar Rota
            </a>
          )}
          {instagram && (
            <a href={instagram} target="_blank" rel="noopener noreferrer" className={styles.actionBtn}>
              <Globe className="w-4 h-4" /> Instagram
            </a>
          )}
          {facebook && (
            <a href={facebook} target="_blank" rel="noopener noreferrer" className={styles.actionBtn}>
              <Globe className="w-4 h-4" /> Facebook
            </a>
          )}
        </div>
        {quoteHref && (
          <a href={quoteHref} target="_blank" rel="noopener noreferrer" className={styles.quoteDirectBtn}>
            <FileText className="w-4 h-4" /> Orçamento Imediato
          </a>
        )}
      </div>

      {/* Flagship Layout 3 Colunas Fluidas */}
      <div className={styles.threeColumnGrid}>
        {/* Coluna 1: Institucional & Serviços */}
        <div className={styles.colInstitutional} data-testid="ouro-col-institutional">
          {identity.description && (
            <section className={styles.contentCard}>
              <h2 className={styles.cardHeading}>Sobre a Empresa</h2>
              <p className={styles.descriptionText}>{identity.description}</p>
            </section>
          )}

          {/* Catálogo de Serviços Ricos Ouro (Até 25 serviços - Ícone Whitelist, Nome, Descrição, Badge Preço) */}
          {business.services.length > 0 && (
            <section className={styles.contentCard} data-testid="ouro-services-section">
              <h2 className={styles.cardHeading}>Catálogo de Serviços VIP ({business.services.length})</h2>
              <div className="grid grid-cols-1 gap-3 mt-3">
                {business.services.map((srv, idx) => {
                  const ServiceIcon = resolveServiceIcon(srv.iconName);
                  return (
                    <div key={srv.id || idx} className="p-4 bg-amber-50/40 border border-amber-200/60 rounded-xl flex items-start gap-3">
                      <div className="p-2.5 bg-amber-100/80 rounded-lg text-amber-800 shrink-0 mt-0.5">
                        <ServiceIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-slate-900 text-sm truncate">{srv.name}</h3>
                          {srv.priceInfo && (
                            <span className="px-2 py-0.5 text-xs font-semibold text-amber-900 bg-amber-200/70 rounded shrink-0">
                              {srv.priceInfo}
                            </span>
                          )}
                        </div>
                        {srv.description && (
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{srv.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Avaliações */}
          {reviews.items.length > 0 && (
            <section className={styles.contentCard}>
              <h2 className={styles.cardHeading}>Avaliações da Comunidade ({reviews.count})</h2>
              <div className="space-y-3 mt-3">
                {reviews.items.map((rev) => (
                  <div key={rev.id} className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/50">
                    <div className="text-amber-500 font-bold">{'★'.repeat(rev.rating)}</div>
                    {rev.comment && <p className="text-sm text-slate-800 mt-1">{rev.comment}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Coluna 2: Mídia & Benefícios VIP */}
        <div className={styles.colMediaConversion} data-testid="ouro-col-media-conversion">
          {/* Card de Benefícios VIP Premium (Colapsa totalmente se vazio) */}
          {activeBenefits.length > 0 && (
            <div className="space-y-4 mb-6" data-testid="ouro-benefits-container">
              {activeBenefits.map((item, idx) => (
                <div key={item.id || idx} className={styles.premiumBenefitCard} data-testid="ouro-benefit-premium-box">
                  <div className={styles.benefitBadge}>
                    <Tag className="w-4 h-4" /> {item.badgeText || 'BENEFÍCIO OURO EXCLUSIVO'}
                  </div>
                  <h3 className={styles.benefitTitle}>{item.title}</h3>
                  <p className={styles.benefitDesc}>{item.description}</p>

                  {/* Código promocional e botão de cópia (Apenas se discountCode existir) */}
                  {item.discountCode && (
                    <div className="mt-3 p-3 bg-amber-950/80 rounded-lg flex items-center justify-between border border-amber-400/40">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider block">Código Promocional</span>
                        <code className="text-sm font-mono font-bold text-white">{item.discountCode}</code>
                      </div>
                      <CopyDiscountCodeButton code={item.discountCode} />
                    </div>
                  )}

                  {/* Instruções de resgate e validade */}
                  {item.redeemInstructions && (
                    <p className="text-xs text-amber-100/90 italic mt-2">
                      💡 {item.redeemInstructions}
                    </p>
                  )}
                  {item.validUntil && (
                    <p className="text-[11px] text-amber-200/70 mt-1">
                      📅 Válido até: {new Intl.DateTimeFormat('pt-BR').format(new Date(item.validUntil))}
                    </p>
                  )}

                  {redeemHref && (
                    <a
                      href={redeemHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${styles.redeemBtn} mt-3 inline-block text-center`}
                      data-testid="ouro-benefit-redeem-btn"
                    >
                      Resgatar Benefício Agora
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Galeria 3x3 de Fotos e Vídeos */}
          {(cover || allMedia.length > 0) && (
            <section className={styles.contentCard} data-testid="ouro-photos-videos-grid">
              <h2 className={styles.cardHeading}>Fotos e Vídeos em Destaque</h2>
              <div className={styles.mediaGrid3x3}>
                {cover && (
                  <div className={styles.mediaItemBox}>
                    <BusinessMedia asset={cover} sizes="200px" />
                  </div>
                )}
                {allMedia.map((item, idx) => (
                  <div key={item.url || idx} className={styles.mediaItemBox}>
                    <BusinessMedia asset={item} sizes="200px" />
                    {item.type === 'video' && (
                      <div className={styles.videoPlayOverlay}>
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Coluna 3: Sidebar Direita */}
        <aside className={styles.sidebarColumn} data-testid="ouro-sidebar">
          <BusinessShareActions businessName={identity.name} />

          {owner && (
            <div className={styles.sidebarCard}>
              <h3 className={styles.sidebarTitle}>Responsável Verificado</h3>
              <p className="font-semibold text-slate-900">{owner.name}</p>
              {owner.communityLabel && <p className="text-xs text-amber-700 font-medium">{owner.communityLabel}</p>}
              {owner.businessRole && <p className="text-xs text-slate-500">{owner.businessRole}</p>}
            </div>
          )}

          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Informações VIP</h3>
            {firstOpen ? (
              <p className="text-sm text-slate-700">
                {DAY_LABELS[firstOpen.dayOfWeek]}: {firstOpen.openTime?.slice(0, 5)} - {firstOpen.closeTime?.slice(0, 5)}
              </p>
            ) : (
              <p className="text-sm text-slate-500">Horário sob consulta</p>
            )}
            {metrics.views != null && (
              <p className="text-xs text-slate-400 mt-2">
                <Eye className="w-3.5 h-3.5 inline mr-1" />
                {metrics.views.toLocaleString('pt-BR')} visualizações
              </p>
            )}
          </div>

          {location && (
            <div className={styles.sidebarCard}>
              <h3 className={styles.sidebarTitle}>Localização VIP</h3>
              <p className="text-sm text-slate-700 mb-2">{location.address}</p>
              {mapHref && (
                <a href={mapHref} target="_blank" rel="noopener noreferrer" className={styles.routeBtn}>
                  <Navigation className="w-4 h-4" /> Traçar Rota
                </a>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
