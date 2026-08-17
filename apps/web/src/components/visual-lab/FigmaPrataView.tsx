'use client';

import React, { useState } from 'react';
import styles from './FigmaPrataView.module.css';

export type FigmaPrataCompanyData = {
  id: number;
  tier: 'prata';
  name: string;
  category: string;
  about: string;
  responsible: string;
  responsibleRole: string;
  responsibleImg: string;
  address: string;
  city: string;
  rating: number;
  reviews: number;
  views: number;
  verified: boolean;
  isOpen: boolean;
  phone: string;
  whatsapp: string;
  email: string;
  site: string;
  instagram: string;
  facebook: string;
  heroImg: string;
  logo: string;
  logoColor: string;
  badges: string[];
  photos: string[];
  services: { icon: string; name: string; desc: string }[];
  horarios: { day: string; hours: string }[];
  benefit: { percent: string; desc: string };
  reviewsData: { name: string; date: string; rating: number; text: string; img: string }[];
};

export const defaultPrataCompanyFixture: FigmaPrataCompanyData = {
  id: 2,
  tier: 'prata',
  name: 'Saba Advocacia & Consultoria',
  category: 'Serviços Jurídicos Especializados',
  about: 'Escritório de advocacia com foco em direito empresarial, contratos, propriedade intelectual e assessoria estratégica com atendimento fraterno e exclusivo.',
  responsible: 'Dr. Eduardo Saba',
  responsibleRole: 'Irmão · Sócio Fundador',
  responsibleImg: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&h=120&fit=crop&auto=format',
  address: 'Av. Getúlio Vargas, 1240 — Salas 501/502, Feira de Santana, BA',
  city: 'Feira de Santana, BA',
  rating: 4.9,
  reviews: 142,
  views: 4120,
  verified: true,
  isOpen: true,
  phone: '(75) 3025-4242',
  whatsapp: '5575999881122',
  email: 'contato@sabaadvocacia.local',
  site: 'https://sabaadvocacia.local',
  instagram: '@sabaadvocacia',
  facebook: 'sabaadvocacia',
  heroImg: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=600&fit=crop&auto=format',
  logo: 'SA',
  logoColor: '#7B1D1D',
  badges: ['verificada', 'prata'],
  photos: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&h=300&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=300&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop&auto=format',
  ],
  services: [
    { icon: '⚖️', name: 'Direito Empresarial', desc: 'Consultoria e planejamento jurídico preventivo para empresas de pequeno a grande porte.' },
    { icon: '📜', name: 'Contratos & Negociações', desc: 'Elaboração, revisão e acompanhamento contratual com foco em mitigação de riscos.' },
    { icon: '🛡️', name: 'Proteção de Marca', desc: 'Registro de marcas, patentes e defesa do patrimônio imaterial da empresa.' },
  ],
  horarios: [{ day: 'Segunda a Sexta', hours: '08:00 às 18:00' }],
  benefit: { percent: '15%', desc: 'de desconto em honorários de consultoria para membros da comunidade fraterna.' },
  reviewsData: [
    {
      name: 'Dr. Fernando Souza',
      date: 'Há 1 semana',
      rating: 5,
      text: 'Excelente atendimento e profundo conhecimento em direito empresarial. Conduziram nossa reestruturação contratual com extrema precisão.',
      img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&auto=format',
    },
    {
      name: 'Carlos Eduardo Santos',
      date: 'Há 3 semanas',
      rating: 5,
      text: 'Profissionais altamente qualificados. Transparência total e suporte rápido sempre que precisamos.',
      img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&auto=format',
    },
  ],
};

export function FigmaPrataView({ company = defaultPrataCompanyFixture }: { company?: FigmaPrataCompanyData }) {
  const [activeTab, setActiveTab] = useState<'visao' | 'servicos' | 'fotos' | 'comentarios' | 'localizacao'>('visao');
  const [isFavorited, setIsFavorited] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: company.name,
        text: company.about,
        url: typeof window !== 'undefined' ? window.location.href : '',
      }).catch(() => {});
    } else {
      showToast('Link copiado para a área de transferência!');
    }
  };

  return (
    <div className={styles.container} data-visual-lab="figma-prata">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            right: 24,
            background: '#171717',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: 8,
            fontSize: 13,
            zIndex: 999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Hero Grid: Left Info Card + Right Gallery Grid */}
      <div className={styles.heroGrid} data-testid="prata-hero-grid">
        {/* Left Info Card */}
        <div className={styles.infoLeftCard} data-testid="prata-info-card">
          <div className={styles.logoBox} style={{ backgroundColor: company.logoColor }}>
            {company.logo}
          </div>

          <h1 className={styles.companyTitle}>{company.name}</h1>
          <div className={styles.categoryText}>{company.category}</div>

          <div className={styles.badgesWrap}>
            {company.verified && <span className={`${styles.badgeItem} ${styles.badgeVerified}`}>✓ Empresa Verificada</span>}
            <span className={`${styles.badgeItem} ${styles.badgePrata}`}>PLANO PRATA</span>
          </div>

          <div className={styles.infoRow}>
            <span>👤</span>
            <span>Responsável: {company.responsible}</span>
          </div>

          <div className={styles.infoRow}>
            <span>📍</span>
            <span>{company.address}</span>
          </div>

          <div className={styles.statsRow}>
            <span style={{ color: '#F59E0B', fontWeight: 600 }}>★ {company.rating}</span>
            <span style={{ color: '#6B7280' }}>· {company.reviews} avaliações</span>
            <span style={{ color: '#6B7280' }}>👁 {company.views.toLocaleString('pt-BR')}</span>
          </div>

          <div className={styles.openStatus}>● Aberto agora</div>
        </div>

        {/* Right Gallery Grid: 1 Big Main Photo + 3 Thumbnails */}
        <div className={styles.galleryRightGrid} data-testid="prata-gallery-grid">
          <div className={styles.mainPhotoWrap}>
            <img src={company.heroImg} alt={company.name} className={styles.mainPhoto} />
          </div>
          {company.photos.slice(0, 3).map((p, i) => (
            <div key={i} className={styles.thumbPhotoWrap}>
              <img src={p} alt={`Foto ${i + 1}`} className={styles.thumbPhoto} />
            </div>
          ))}
        </div>
      </div>

      {/* Action Bar */}
      <div className={styles.actionBar} data-testid="prata-action-bar">
        <div className={styles.actionBarInner}>
          <a
            href={`https://wa.me/${company.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.actionBtn} ${styles.actionBtnWhatsapp}`}
          >
            📱 WhatsApp
          </a>
          <a href={`tel:${company.phone}`} className={styles.actionBtn}>
            📞 Ligar ({company.phone})
          </a>
          <a href={`mailto:${company.email}`} className={styles.actionBtn}>
            ✉️ E-mail
          </a>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(company.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.actionBtn}
          >
            📍 Como chegar
          </a>
          {company.instagram && (
            <a href={`https://instagram.com/${company.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className={styles.actionBtn}>
              📸 Instagram
            </a>
          )}

          <a
            href={`https://wa.me/${company.whatsapp}?text=${encodeURIComponent('Olá! Gostaria de solicitar um orçamento.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.actionBtn} ${styles.actionBtnCta}`}
          >
            📋 Solicitar orçamento
          </a>
        </div>
      </div>

      {/* Sticky Tabs */}
      <div className={styles.stickyTabsWrap} data-testid="prata-sticky-tabs">
        <div className={styles.tabsInner}>
          {(
            [
              { id: 'visao', label: '⊞ Visão geral' },
              { id: 'servicos', label: '🗂 Serviços' },
              { id: 'fotos', label: '📷 Fotos' },
              { id: 'comentarios', label: '💬 Comentários' },
              { id: 'localizacao', label: '📍 Localização' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabBtnActive : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content + Sidebar Grid */}
      <div className={styles.contentGrid}>
        {/* Main Column */}
        <div className={styles.mainCol}>
          {/* Active Tab View */}
          {activeTab === 'visao' && (
            <div>
              {/* About + Special Benefit Gradient Banner Grid */}
              <div className={styles.aboutBenefitGrid}>
                <div>
                  <h3 className={styles.sectionTitle}>🏢 Sobre</h3>
                  <div className={styles.goldLine} />
                  <p className={styles.aboutText}>{company.about}</p>
                </div>

                <div className={styles.benefitGradientCard} data-testid="prata-benefit-banner">
                  <div className={styles.benefitTag}>🏷️ Benefício especial para membros</div>
                  <div className={styles.benefitDiscount}>{company.benefit.percent} de desconto</div>
                  <div className={styles.benefitDesc}>{company.benefit.desc}</div>
                </div>
              </div>

              {/* Services Section */}
              <div className={styles.servicesSection} data-testid="prata-services-grid">
                <h3 className={styles.sectionTitle}>⚖️ Principais serviços</h3>
                <div className={styles.servicesGrid}>
                  {company.services.map((s) => (
                    <div key={s.name} className={styles.serviceCard}>
                      <div className={styles.serviceIconBox}>{s.icon}</div>
                      <div className={styles.serviceName}>{s.name}</div>
                      <div className={styles.serviceDesc}>{s.desc}</div>
                      <button className={styles.knowMoreBtn}>Saiba mais →</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photos Strip / Carousel */}
              <div className={styles.photosSection} data-testid="prata-photos-strip">
                <h3 className={styles.sectionTitle}>📷 Galeria de fotos</h3>
                <div className={styles.photosFlex}>
                  {company.photos.map((p, i) => (
                    <div key={i} className={styles.photoThumbItem}>
                      <img src={p} alt={`Galeria ${i + 1}`} className={styles.photoThumbImg} />
                    </div>
                  ))}
                  <div className={styles.morePhotosBox} onClick={() => setActiveTab('fotos')}>
                    <span style={{ fontSize: 20 }}>→</span>
                    <span style={{ fontSize: 11, color: '#6B7280', textAlign: 'center' }}>Ver todas as fotos</span>
                  </div>
                </div>
              </div>

              {/* Reviews Preview */}
              <div className={styles.reviewsSection}>
                <h3 className={styles.sectionTitle}>💬 Comentários dos Clientes</h3>
                <div className={styles.reviewsFlex}>
                  <div className={styles.ratingSummaryBox}>
                    <div className={styles.bigRatingNumber}>{company.rating}</div>
                    <div className={styles.starsRow}>★★★★★</div>
                    <div className={styles.reviewCountLabel}>{company.reviews} avaliações</div>
                  </div>

                  <div className={styles.reviewsGrid}>
                    {company.reviewsData.map((r, i) => (
                      <div key={i} className={styles.reviewCard}>
                        <div className={styles.reviewerHeader}>
                          <img src={r.img} alt={r.name} className={styles.reviewerAvatar} />
                          <div>
                            <div className={styles.reviewerName}>{r.name}</div>
                            <div className={styles.reviewDate}>{r.date}</div>
                          </div>
                        </div>
                        <div className={styles.starsRow} style={{ fontSize: 12 }}>
                          {'★'.repeat(r.rating)}
                        </div>
                        <p className={styles.reviewComment}>{r.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'servicos' && (
            <div className={styles.servicesSection}>
              <h3 className={styles.sectionTitle}>⚖️ Todos os Serviços</h3>
              <div className={styles.servicesGrid}>
                {company.services.map((s) => (
                  <div key={s.name} className={styles.serviceCard}>
                    <div className={styles.serviceIconBox}>{s.icon}</div>
                    <div className={styles.serviceName}>{s.name}</div>
                    <div className={styles.serviceDesc}>{s.desc}</div>
                    <button className={styles.knowMoreBtn}>Saiba mais →</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'fotos' && (
            <div className={styles.photosSection}>
              <h3 className={styles.sectionTitle}>📷 Galeria Completa de Fotos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat( auto-fill, minmax(180px, 1fr) )', gap: 12 }}>
                {company.photos.map((p, i) => (
                  <div key={i} style={{ borderRadius: 8, overflow: 'hidden', height: 140, backgroundColor: '#F3F4F6' }}>
                    <img src={p} alt={`Foto Galeria ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'comentarios' && (
            <div className={styles.reviewsSection}>
              <h3 className={styles.sectionTitle}>💬 Avaliações & Comentários</h3>
              <div className={styles.reviewsFlex}>
                <div className={styles.ratingSummaryBox}>
                  <div className={styles.bigRatingNumber}>{company.rating}</div>
                  <div className={styles.starsRow}>★★★★★</div>
                  <div className={styles.reviewCountLabel}>{company.reviews} avaliações</div>
                </div>

                <div className={styles.reviewsGrid}>
                  {company.reviewsData.map((r, i) => (
                    <div key={i} className={styles.reviewCard}>
                      <div className={styles.reviewerHeader}>
                        <img src={r.img} alt={r.name} className={styles.reviewerAvatar} />
                        <div>
                          <div className={styles.reviewerName}>{r.name}</div>
                          <div className={styles.reviewDate}>{r.date}</div>
                        </div>
                      </div>
                      <div className={styles.starsRow} style={{ fontSize: 12 }}>
                        {'★'.repeat(r.rating)}
                      </div>
                      <p className={styles.reviewComment}>{r.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'localizacao' && (
            <div>
              <h3 className={styles.sectionTitle}>📍 Localização & Mapa</h3>
              <div className={styles.mapBox} style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2E8F0', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 32 }}>📍</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#334155' }}>{company.address}</span>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(company.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: '#7B1D1D', fontWeight: 600 }}
                >
                  Abrir no Google Maps ↗
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Column */}
        <div className={styles.sidebar} data-testid="prata-sidebar">
          <div className={styles.shareFavRow}>
            <button className={styles.shareFavBtn} onClick={handleShare}>
              ↗ Compartilhar
            </button>
            <button
              className={styles.shareFavBtn}
              onClick={() => {
                setIsFavorited(!isFavorited);
                showToast(isFavorited ? 'Removido dos favoritos' : 'Adicionado aos favoritos!');
              }}
              style={{ color: isFavorited ? '#DC2626' : '#374151' }}
            >
              {isFavorited ? '♥ Favoritado' : '♡ Favoritar'}
            </button>
          </div>

          {/* Responsável Card */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardTitle}>Responsável</div>
            <div className={styles.responsibleFlex}>
              <img src={company.responsibleImg} alt={company.responsible} className={styles.responsibleAvatar} />
              <div>
                <div className={styles.responsibleName}>{company.responsible}</div>
                <div className={styles.responsibleRole}>{company.responsibleRole}</div>
              </div>
            </div>
          </div>

          {/* Informações Card */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardTitle}>Informações</div>
            <div style={{ fontSize: 13, color: '#4B5563', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>📞 {company.phone}</div>
              <div>✉️ {company.email}</div>
              <div>📍 {company.address}</div>
              <div>⏰ Horário: {company.horarios[0]?.hours}</div>
            </div>
          </div>

          {/* Localização Card */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardTitle}>Localização</div>
            <div className={styles.mapBox} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2E8F0', flexDirection: 'column', gap: 4, padding: 12 }}>
              <span style={{ fontSize: 24 }}>📍</span>
              <span style={{ fontSize: 11, color: '#334155', textAlign: 'center' }}>{company.city}</span>
            </div>
          </div>

          {/* Quote Card */}
          <div className={styles.quoteCard}>
            🤝 <strong>Compromisso Fraternal Prata:</strong> Empresa credenciada e verificada, oferecendo atendimento especializado para nossa rede.
          </div>
        </div>
      </div>
    </div>
  );
}
