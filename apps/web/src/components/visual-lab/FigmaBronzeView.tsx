'use client';

import React, { useState } from 'react';
import styles from './FigmaBronzeView.module.css';

export type FigmaCompanyData = {
  id: number;
  tier: 'bronze' | 'prata' | 'ouro';
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
  horarios: { day: string; hours: string }[];
  benefit: { percent: string; desc: string };
  reviewsData: { name: string; date: string; rating: number; text: string; img: string }[];
};

export const defaultBronzeCompanyFixture: FigmaCompanyData = {
  id: 3,
  tier: 'bronze',
  name: 'Saba Advocacia',
  category: 'Serviços Jurídicos',
  about: 'Assessoria jurídica empresarial, contratos e consultoria com atendimento próximo e personalizado.',
  responsible: 'Eduardo Saba',
  responsibleRole: 'Irmão · Proprietário',
  responsibleImg: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&auto=format',
  address: 'Av. Getúlio Vargas, 1240 — Centro, Feira de Santana, BA',
  city: 'Feira de Santana, BA',
  rating: 4.9,
  reviews: 128,
  views: 2847,
  verified: true,
  isOpen: true,
  phone: '(75) 3025-4242',
  whatsapp: '5575999881122',
  email: 'contato@sabaadvocacia.local',
  site: 'https://sabaadvocacia.local',
  instagram: '@sabaadvocacia',
  facebook: 'sabaadvocacia',
  heroImg: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=700&h=400&fit=crop&auto=format',
  logo: 'SA',
  logoColor: '#7B1D1D',
  horarios: [{ day: 'Seg–Sex', hours: '8h às 18h' }],
  benefit: { percent: '10%', desc: 'de desconto na primeira consultoria para membros da comunidade.' },
  reviewsData: [
    {
      name: 'Marcos Almeida',
      date: 'Há 2 semanas',
      rating: 5,
      text: 'Atendimento impecável e muita competência. Esclareceu todas as minhas dúvidas e me orientou da melhor forma.',
      img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&auto=format',
    },
    {
      name: 'Rafael Cardoso',
      date: 'Há 1 mês',
      rating: 5,
      text: 'Profissional ético, atencioso e muito eficiente. Recomendo a todos os irmãos que precisam de suporte jurídico de confiança.',
      img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&auto=format',
    },
  ],
};

export function FigmaBronzeView({ company = defaultBronzeCompanyFixture }: { company?: FigmaCompanyData }) {
  const [tab, setTab] = useState<'sobre' | 'comentarios'>('sobre');
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
    <div className={styles.container} data-visual-lab="figma-bronze">
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

      {/* Back link */}
      <div className={styles.innerWrap}>
        <a href="#empresas" className={styles.backLink}>
          ← Voltar para Empresas
        </a>
      </div>

      {/* Hero: Image + Identity Card */}
      <div className={styles.heroGrid}>
        <div className={styles.heroImageWrap}>
          <img src={company.heroImg} alt={company.name} className={styles.heroImage} />
        </div>

        <div className={styles.identityCard}>
          <span className={styles.tierBadge}>PLANO BRONZE</span>

          <div className={styles.logoNameHeader}>
            <div className={styles.logoBox} style={{ backgroundColor: company.logoColor }}>
              {company.logo}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 className={styles.companyTitle}>{company.name}</h1>
                {company.verified && <span className={styles.verifiedBadge}>✓ Empresa Verificada</span>}
              </div>
              <div className={styles.categoryText}>{company.category}</div>
            </div>
          </div>

          <div className={styles.infoRow}>
            <span>👤</span>
            <span>Responsável: {company.responsible} ({company.responsibleRole})</span>
          </div>

          <div className={styles.infoRow}>
            <span>📍</span>
            <span>{company.address}</span>
          </div>

          <div className={styles.statsRow}>
            <span className={styles.ratingText}>
              <span className={styles.starIcon}>★</span> {company.rating} · {company.reviews} avaliações
            </span>
            <span className={styles.viewsText}>👁 {company.views.toLocaleString('pt-BR')} visualizações</span>
            <span className={styles.openStatus}>● Aberto agora</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className={styles.actionBar}>
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
          {company.facebook && (
            <a href={`https://facebook.com/${company.facebook}`} target="_blank" rel="noopener noreferrer" className={styles.actionBtn}>
              👥 Facebook
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabsHeader}>
          <button
            onClick={() => setTab('sobre')}
            className={`${styles.tabBtn} ${tab === 'sobre' ? styles.tabBtnActive : ''}`}
          >
            Sobre
          </button>
          <button
            onClick={() => setTab('comentarios')}
            className={`${styles.tabBtn} ${tab === 'comentarios' ? styles.tabBtnActive : ''}`}
          >
            Comentários
          </button>
        </div>
      </div>

      {/* Main Content + Sidebar */}
      <div className={styles.contentGrid}>
        {/* Main Content Col */}
        <div className={styles.mainCol}>
          {tab === 'sobre' ? (
            <div>
              <div className={styles.aboutBenefitGrid}>
                <div>
                  <h3 className={styles.sectionTitle}>
                    <span className={styles.sectionTitleUnderline}>Sobre</span>
                  </h3>
                  <p className={styles.aboutText}>{company.about}</p>
                </div>

                <div className={styles.benefitCard}>
                  <div className={styles.benefitHeader}>
                    <span className={styles.benefitIcon}>🏷️</span>
                    <span className={styles.benefitTitle}>Benefício especial</span>
                  </div>
                  <p className={styles.benefitText}>{company.benefit.percent} {company.benefit.desc}</p>
                </div>
              </div>

              {/* Reviews preview in Sobre tab */}
              <div className={styles.reviewsBlock}>
                <h3 className={styles.reviewsHeader}>Comentários</h3>
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
          ) : (
            <div className={styles.reviewsBlock}>
              <h3 className={styles.reviewsHeader}>Comentários dos Clientes</h3>
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

              <div style={{ textAlign: 'center' }}>
                <button className={styles.viewAllReviewsBtn}>Ver todas as avaliações</button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Col */}
        <div className={styles.sidebar}>
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
            <div className={styles.mapBox}>
              <iframe
                title="Mapa de Localização"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(company.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              />
            </div>
          </div>

          {/* Quote Card */}
          <div className={styles.quoteCard}>
            🤝 <strong>Compromisso Fraternal:</strong> Esta empresa faz parte da nossa rede de confiança e atende com integridade e excelência.
          </div>
        </div>
      </div>

      {/* Sticky Bottom CTA */}
      <div className={styles.stickyCtaBar}>
        <a
          href={`https://wa.me/${company.whatsapp}?text=${encodeURIComponent('Olá! Gostaria de solicitar um orçamento.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.ctaBtn}
          style={{ textDecoration: 'none' }}
        >
          📋 Solicitar orçamento
        </a>
      </div>
    </div>
  );
}
