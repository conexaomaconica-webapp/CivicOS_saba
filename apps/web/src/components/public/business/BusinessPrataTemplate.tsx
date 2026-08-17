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
  Camera,
} from 'lucide-react';
import type {
  PublicBusinessPresentation,
} from '@/lib/business/public-business-presentation';
import { BusinessMedia } from './BusinessMedia';
import { BusinessShareActions } from './BusinessShareActions';
import styles from '@/components/visual-lab/FigmaPrataView.module.css';

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

export function BusinessPrataTemplate({ business }: { business: PublicBusinessPresentation }) {
  const { identity, authority, owner, reviews, metrics, location, contacts, hours, media, benefit } = business;

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

  const cover = media.cover;
  const galleryPhotos = media.gallery.filter((item) => item.type === 'image');
  const firstOpen = hours.find((item) => !item.isClosed);

  return (
    <div className={styles.prataContainer} data-visual-lab="figma-prata">
      {/* Top Breadcrumb */}
      <div className={styles.topBreadcrumb}>
        <Link href="/guia" className="hover:underline">← Voltar para Guia de Empresas</Link>
      </div>

      {/* Hero Section Prata (Galeria Assimétrica) */}
      <section className={styles.heroSection} data-testid="prata-hero-section">
        <div className={styles.asymmetricGallery} data-testid="prata-asymmetric-gallery">
          <div className={styles.mainCoverBox}>
            {cover ? (
              <BusinessMedia asset={cover} priority sizes="(max-width: 768px) 100vw, 55vw" />
            ) : (
              <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500 font-medium">
                {identity.name}
              </div>
            )}
          </div>
          <div className={styles.galleryGrid2x2}>
            {galleryPhotos.slice(0, 4).map((img, idx) => (
              <div key={img.url || idx} className={styles.thumbBox}>
                <BusinessMedia asset={img} sizes="200px" />
              </div>
            ))}
            {Array.from({ length: Math.max(0, 4 - galleryPhotos.length) }).map((_, idx) => (
              <div key={`empty-${idx}`} className={styles.thumbPlaceholder}>
                <Camera className="w-6 h-6 text-slate-300" />
              </div>
            ))}
          </div>
        </div>

        {/* Card de Identidade Prata */}
        <div className={styles.identityCard}>
          <div className={styles.badgeRow}>
            <span className={styles.badgePrata}>PLANO PRATA</span>
            {authority.isVerified && (
              <span className={styles.badgeVerified}>
                <ShieldCheck className="w-3.5 h-3.5" /> Empresa Verificada
              </span>
            )}
            {authority.isFounder && (
              <span className={styles.badgeFounder}>
                <Star className="w-3.5 h-3.5 fill-current" /> EMPRESA FUNDADORA
              </span>
            )}
          </div>

          <div className={styles.headerInfo}>
            <div className={styles.logoBox}>
              {identity.logo ? (
                <BusinessMedia asset={identity.logo} sizes="100px" />
              ) : (
                <span>{identity.name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h1 className={styles.title}>{identity.name}</h1>
              {identity.category && <p className={styles.category}>{identity.category}</p>}
            </div>
          </div>

          <div className={styles.infoList}>
            {owner && (
              <div className={styles.infoRow}>
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Responsável: <strong>{owner.name}</strong></span>
              </div>
            )}
            {location && (
              <div className={styles.infoRow}>
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{location.address}</span>
              </div>
            )}
          </div>

          <div className={styles.statsRow}>
            {reviews.average != null && (
              <span className={styles.statRating}>
                <Star className="w-4 h-4 text-amber-500 fill-amber-500 inline" />{' '}
                <strong>{reviews.average.toFixed(1).replace('.', ',')}</strong> ({reviews.count})
              </span>
            )}
            {metrics.views != null && (
              <span className={styles.statViews}>
                <Eye className="w-4 h-4 text-slate-400 inline" /> {metrics.views.toLocaleString('pt-BR')} visualizações
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Action Bar Prata */}
      <div className={styles.actionBarContainer} data-testid="prata-action-bar">
        <div className={styles.actionButtonsRow}>
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className={`${styles.actionBtn} ${styles.isGreen}`}>
              <Phone className="w-4 h-4" /> WhatsApp Direct
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
              <MapPin className="w-4 h-4" /> Como Chegar
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
          <a href={quoteHref} target="_blank" rel="noopener noreferrer" className={styles.quoteBtn} data-testid="prata-quote-btn">
            <FileText className="w-4 h-4" /> Solicitar Orçamento
          </a>
        )}
      </div>

      {/* Abas Sticky Prata */}
      <div className={styles.stickyTabsBar} data-testid="prata-sticky-tabs">
        <div className={styles.tabsInner}>
          <button type="button" className={`${styles.tabBtn} ${styles.activeTab}`}>Sobre & Benefícios</button>
          <button type="button" className={styles.tabBtn}>Galeria</button>
          <button type="button" className={styles.tabBtn}>Avaliações</button>
        </div>
      </div>

      {/* Layout Principal 2 Colunas */}
      <div className={styles.mainLayoutGrid}>
        {/* Coluna de Conteúdo Principal */}
        <div className={styles.primaryColumn}>
          {/* Banner de Benefício Bordô (Colapsa totalmente se nulo) */}
          {benefit && (
            <div className={styles.benefitBannerBordo} data-testid="prata-benefit-banner">
              <div className={styles.benefitHeader}>
                <Tag className="w-5 h-5 text-amber-400" />
                <span>{benefit.badgeText || 'BENEFÍCIO EXCLUSIVO DA COMUNIDADE'}</span>
              </div>
              <h3 className={styles.benefitTitle}>{benefit.title}</h3>
              <p className={styles.benefitDesc}>{benefit.description}</p>
              {(benefit.discountPercentage != null || benefit.discountAmount != null) && (
                <div className="mt-2 text-xs font-semibold text-amber-300">
                  {benefit.discountPercentage != null ? `${benefit.discountPercentage}% de desconto` : `Desconto de R$ ${benefit.discountAmount}`}
                </div>
              )}
            </div>
          )}

          {/* Seção Sobre */}
          {identity.description && (
            <section className={styles.contentSection}>
              <h2 className={styles.sectionHeading}>Sobre a Empresa</h2>
              <p className={styles.descriptionText}>{identity.description}</p>
            </section>
          )}

          {/* Catálogo de Serviços Prata (Até 10 serviços - Nome + Descrição; Colapsa se vazio) */}
          {business.services.length > 0 && (
            <section className={styles.contentSection} data-testid="prata-services-section">
              <h2 className={styles.sectionHeading}>Serviços Prestados ({business.services.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                {business.services.map((srv, idx) => (
                  <div key={srv.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <h3 className="font-semibold text-slate-900 text-sm">{srv.name}</h3>
                    {srv.description && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{srv.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Carrossel / Grade de Fotos */}
          {galleryPhotos.length > 0 && (
            <section className={styles.contentSection} data-testid="prata-photo-carousel">
              <h2 className={styles.sectionHeading}>Galeria de Fotos</h2>
              <div className={styles.photoGridList}>
                {galleryPhotos.map((photo, i) => (
                  <div key={photo.url || i} className={styles.photoCard}>
                    <BusinessMedia asset={photo} sizes="300px" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Seção de Avaliações */}
          {reviews.items.length > 0 && (
            <section className={styles.contentSection}>
              <h2 className={styles.sectionHeading}>Avaliações ({reviews.count})</h2>
              <div className={styles.reviewsList}>
                {reviews.items.map((rev) => (
                  <div key={rev.id} className={styles.reviewItem}>
                    <div className={styles.reviewStars}>{'★'.repeat(rev.rating)}</div>
                    {rev.comment && <p className={styles.reviewComment}>{rev.comment}</p>}
                    <small className="text-xs text-slate-400">
                      {rev.publishedAt ? new Intl.DateTimeFormat('pt-BR').format(new Date(rev.publishedAt)) : 'Recente'}
                    </small>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Direita Prata */}
        <aside className={styles.sidebarColumn} data-testid="prata-sidebar">
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
            <h3 className={styles.sidebarTitle}>Funcionamento</h3>
            {firstOpen ? (
              <p className="text-sm text-slate-700">
                {DAY_LABELS[firstOpen.dayOfWeek]}: {firstOpen.openTime?.slice(0, 5)} - {firstOpen.closeTime?.slice(0, 5)}
              </p>
            ) : (
              <p className="text-sm text-slate-500">Horário sob consulta</p>
            )}
          </div>

          {location && (
            <div className={styles.sidebarCard}>
              <h3 className={styles.sidebarTitle}>Localização</h3>
              <p className="text-sm text-slate-700 mb-2">{location.address}</p>
              {mapHref && (
                <a href={mapHref} target="_blank" rel="noopener noreferrer" className={styles.routeBtn}>
                  <Navigation className="w-4 h-4" /> Traçar Rota no Mapa
                </a>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
