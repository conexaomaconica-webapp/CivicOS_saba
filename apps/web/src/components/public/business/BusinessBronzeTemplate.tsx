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
} from 'lucide-react';
import type {
  PublicBusinessPresentation,
  PublicBusinessReview,
} from '@/lib/business/public-business-presentation';
import { BusinessMedia } from './BusinessMedia';
import { BusinessShareActions } from './BusinessShareActions';

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

export function BusinessBadge({ kind }: { kind: 'bronze' | 'verified' | 'founder' }) {
  if (kind === 'verified') {
    return (
      <span className="cm-badge cm-badge--verified">
        <ShieldCheck className="w-3.5 h-3.5" /> Empresa Verificada
      </span>
    );
  }
  if (kind === 'founder') {
    return (
      <span className="cm-badge cm-badge--founder">
        <Star className="w-3.5 h-3.5 fill-current" /> EMPRESA FUNDADORA
      </span>
    );
  }
  return <span className="cm-badge cm-badge--bronze">PLANO BRONZE</span>;
}

export function BusinessIdentityCard({ business }: { business: PublicBusinessPresentation }) {
  const { identity, authority, owner, reviews, metrics, location } = business;

  return (
    <div className="cm-bronze-hero-card">
      <div className="cm-bronze-hero-card__badge-top">
        <BusinessBadge kind="bronze" />
        {authority.isVerified && <BusinessBadge kind="verified" />}
        {authority.isFounder && <BusinessBadge kind="founder" />}
      </div>

      <div className="cm-bronze-hero-card__header">
        <div className="cm-bronze-logo">
          {identity.logo ? (
            <BusinessMedia asset={identity.logo} sizes="128px" />
          ) : (
            <span>{identity.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="cm-bronze-hero-card__title-row">
          <h1>{identity.name}</h1>
          {identity.category && <p className="cm-category-text">{identity.category}</p>}
        </div>
      </div>

      <div className="cm-bronze-hero-card__info-list">
        {owner && (
          <div className="cm-info-row">
            <Clock className="w-4 h-4 text-gray-500 shrink-0" />
            <span>Responsável: {owner.name}</span>
          </div>
        )}
        {location && (
          <div className="cm-info-row">
            <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
            <span>{location.address}</span>
          </div>
        )}
      </div>

      <div className="cm-bronze-hero-card__stats">
        {reviews.average != null && (
          <span className="cm-stat-item">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500 inline" />{' '}
            <strong>{reviews.average.toFixed(1).replace('.', ',')}</strong> · {reviews.count} avaliações
          </span>
        )}
        {metrics.views != null && (
          <span className="cm-stat-item cm-stat-item--views">
            <Eye className="w-4 h-4 text-gray-400 inline" /> {metrics.views.toLocaleString('pt-BR')} visualizações
          </span>
        )}
        {metrics.openingStatus && (
          <span className="cm-stat-item cm-stat-item--open">
            <span className="cm-open-dot" /> {metrics.openingStatus}
          </span>
        )}
      </div>
    </div>
  );
}

export function BusinessContactActions({ business }: { business: PublicBusinessPresentation }) {
  const { contacts, location } = business;
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

  const actions = [
    whatsapp ? { label: 'WhatsApp', href: `https://wa.me/${whatsapp}`, icon: Phone, green: true } : null,
    phone ? { label: 'Ligar', href: `tel:${phone}`, icon: Phone } : null,
    contacts.email ? { label: 'E-mail', href: `mailto:${contacts.email}`, icon: Mail } : null,
    mapHref ? { label: 'Como chegar', href: mapHref, icon: MapPin } : null,
    instagram ? { label: 'Instagram', href: instagram, icon: Globe } : null,
    facebook ? { label: 'Facebook', href: facebook, icon: Globe } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  if (!actions.length) return null;

  return (
    <nav className="cm-action-bar" aria-label="Canais públicos de contato">
      <div className="cm-action-bar__inner">
        {actions.map(({ label, href, icon: Icon, green }) => (
          <a
            key={label}
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className={`cm-action-btn ${green ? 'is-green' : ''}`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

export function BusinessBenefitCard({ benefit }: { benefit: NonNullable<PublicBusinessPresentation['benefit']> }) {
  return (
    <div className="cm-benefit-box">
      <div className="cm-benefit-box__header">
        <Tag className="w-5 h-5 text-amber-600 shrink-0" />
        <span className="cm-benefit-box__badge">Benefício especial</span>
      </div>
      <h3 className="cm-benefit-box__title">{benefit.title}</h3>
      <p className="cm-benefit-box__desc">{benefit.description}</p>
    </div>
  );
}

function ReviewCard({ review }: { review: PublicBusinessReview }) {
  return (
    <article className="cm-review-card">
      <div className="cm-review-card__header">
        <div className="cm-review-avatar">
          {review.authorAvatar ? (
            <BusinessMedia asset={review.authorAvatar} sizes="52px" />
          ) : (
            <span aria-hidden="true">★</span>
          )}
        </div>
        <div>
          <strong>{review.authorName || 'Membro da Comunidade'}</strong>
          <small>{review.publishedAt ? new Intl.DateTimeFormat('pt-BR').format(new Date(review.publishedAt)) : 'Recente'}</small>
        </div>
      </div>
      <div className="cm-review-stars">
        {'★'.repeat(Math.max(0, Math.min(5, review.rating)))}
      </div>
      {review.comment && <p>{review.comment}</p>}
    </article>
  );
}

export function BusinessReviews({ reviews }: { reviews: PublicBusinessPresentation['reviews'] }) {
  if (reviews.average == null && reviews.items.length === 0) return null;
  return (
    <section className="cm-reviews-section" aria-labelledby="reviews-title">
      <div className="cm-reviews-summary">
        <div className="cm-reviews-score">{reviews.average ? reviews.average.toFixed(1).replace('.', ',') : '5,0'}</div>
        <div className="cm-review-stars">★★★★★</div>
        <div className="cm-reviews-count">{reviews.count} avaliações</div>
      </div>
      <div className="cm-reviews-grid">
        {reviews.items.slice(0, 2).map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
      {reviews.count > 0 && (
        <button type="button" className="cm-btn-secondary">
          Ver todas as avaliações
        </button>
      )}
    </section>
  );
}

export function BusinessOwnerCard({ owner }: { owner: NonNullable<PublicBusinessPresentation['owner']> }) {
  return (
    <div className="cm-sidebar-card cm-owner-card">
      <h3 className="cm-sidebar-title">Responsável</h3>
      <span className="cm-section-rule" />
      <div className="cm-owner-body">
        <div className="cm-owner-photo">
          {owner.avatar ? <BusinessMedia asset={owner.avatar} sizes="111px" /> : <span>{owner.name.slice(0, 1)}</span>}
        </div>
        <div>
          <strong className="cm-owner-name">{owner.name}</strong>
          {owner.communityLabel && <div className="cm-owner-sub">{owner.communityLabel}</div>}
          {owner.businessRole && <div className="cm-owner-role">{owner.businessRole}</div>}
        </div>
      </div>
    </div>
  );
}

export function BusinessInformationCard({ business }: { business: PublicBusinessPresentation }) {
  const firstOpen = business.hours.find((item) => !item.isClosed);

  return (
    <div className="cm-sidebar-card cm-information-card">
      <h3 className="cm-sidebar-title">Informações do negócio</h3>
      <span className="cm-section-rule" />
      <div className="cm-info-list">
        {business.metrics.openingStatus && (
          <div className="cm-info-item">
            <span className="cm-open-dot" />
            <span className="font-semibold text-emerald-600">{business.metrics.openingStatus}</span>
          </div>
        )}
        {firstOpen && (
          <div className="cm-info-item">
            <Clock className="w-4 h-4 text-gray-500 shrink-0" />
            <span>{DAY_LABELS[firstOpen.dayOfWeek] ?? 'Horário'}: {firstOpen.openTime?.slice(0, 5)} às {firstOpen.closeTime?.slice(0, 5)}</span>
          </div>
        )}
        {business.metrics.views != null && (
          <div className="cm-info-item">
            <Eye className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{business.metrics.views.toLocaleString('pt-BR')} visualizações</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function BusinessLocationMapCard({ location }: { location: NonNullable<PublicBusinessPresentation['location']> }) {
  const query = location.latitude != null && location.longitude != null ? `${location.latitude},${location.longitude}` : location.address;
  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <div className="cm-sidebar-card cm-location-card">
      <h3 className="cm-sidebar-title">Localização</h3>
      <span className="cm-section-rule" />
      <p className="cm-location-address">{location.address}</p>
      <div className="cm-map-container">
        {location.mapImage ? (
          <BusinessMedia asset={location.mapImage} sizes="350px" />
        ) : (
          <div className="cm-map-placeholder">
            <MapPin className="w-8 h-8 text-wine fill-wine stroke-white" />
          </div>
        )}
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer" className="cm-btn-route">
        <Navigation className="w-4 h-4" /> Traçar rota
      </a>
    </div>
  );
}

export function BusinessBronzeTemplate({ business }: { business: PublicBusinessPresentation }) {
  const cover = business.media.cover;
  const quoteHref = business.contacts.whatsapp
    ? `https://wa.me/${digits(business.contacts.whatsapp)}?text=${encodeURIComponent(`Olá, gostaria de solicitar um orçamento para ${business.identity.name}.`)}`
    : business.contacts.email
    ? `mailto:${business.contacts.email}?subject=${encodeURIComponent(`Orçamento — ${business.identity.name}`)}`
    : null;

  return (
    <article className="cm-bronze-page-container">
      {/* Top navigation back link */}
      <div className="cm-back-nav">
        <Link href="/guia" className="cm-back-link">
          ← Voltar para Empresas
        </Link>
      </div>

      {/* Hero section: 2 columns on desktop (1:1 aspect cover + identity card) */}
      <section className="cm-bronze-hero-grid">
        <div className="cm-bronze-cover-box">
          {cover ? (
            <BusinessMedia asset={cover} priority sizes="520px" />
          ) : (
            <div className="cm-bronze-cover-placeholder">
              <span>{business.identity.name}</span>
            </div>
          )}
        </div>
        <BusinessIdentityCard business={business} />
      </section>

      {/* Action Bar */}
      <BusinessContactActions business={business} />

      {/* Tabs & Main Grid */}
      <div className="cm-bronze-main-container">
        <div className="cm-bronze-overview">
          <div className="cm-bronze-tabs-header">
            <button type="button" className="cm-tab-btn is-active">
              Sobre
            </button>
            <button type="button" className="cm-tab-btn">
              Comentários
            </button>
          </div>

          <div className="cm-about-and-benefit-grid">
            {business.identity.description && (
              <div className="cm-about-section">
                <h3 className="cm-section-title">
                  <span className="cm-title-underline">Sobre</span>
                </h3>
                <p className="cm-about-text">{business.identity.description}</p>
              </div>
            )}
          </div>

          {/* Catálogo de Serviços Bronze (Até 3 serviços básicos - Apenas Nome) */}
          <div className="cm-services-section mt-6" data-testid="bronze-services-section">
            <h3 className="cm-section-title">
              <span className="cm-title-underline">Serviços Disponíveis</span>
            </h3>
            {business.services.length > 0 ? (
              <ul className="cm-services-list grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {business.services.map((srv, idx) => (
                  <li key={srv.id || idx} className="cm-service-item p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                    <span>{srv.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cm-empty-fallback text-sm text-slate-500 italic mt-2" data-testid="bronze-empty-services">
                Nenhum serviço informado até o momento.
              </p>
            )}
          </div>
        </div>

        <div className="cm-bronze-content-grid">
          {/* Main content column */}
          <div className="cm-bronze-primary-col">
            <BusinessReviews reviews={business.reviews} />
          </div>

          {/* Right Sidebar */}
          <aside className="cm-bronze-sidebar-col">
            <BusinessShareActions businessName={business.identity.name} />
            {business.owner && <BusinessOwnerCard owner={business.owner} />}
            <BusinessInformationCard business={business} />
            {business.location && <BusinessLocationMapCard location={business.location} />}
          </aside>
        </div>
      </div>

      {/* Bottom Quote Bar */}
      {quoteHref && (
        <div className="cm-bronze-quote">
          <a
            href={quoteHref}
            target={quoteHref.startsWith('http') ? '_blank' : undefined}
            rel={quoteHref.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="cm-cta-btn"
          >
            <FileText className="w-4 h-4" /> Solicitar orçamento
          </a>
        </div>
      )}
    </article>
  );
}
