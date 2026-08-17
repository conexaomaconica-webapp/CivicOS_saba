'use client';

import React, { useState } from 'react';
import styles from './FigmaOuroView.module.css';

export type FigmaOuroCompanyData = {
  id: 1;
  tier: 'ouro';
  isFounder: boolean;
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
  responseTime: string;
  indicatedBy: number;
  indicatedAvatars: string[];
  phone: string;
  whatsapp: string;
  email: string;
  site: string;
  instagram: string;
  facebook: string;
  heroImg: string;
  logo: string;
  logoColor: string;
  photos: string[];
  services: { icon: string; name: string; desc: string }[];
  events: { title: string; desc: string; date: string; img: string }[];
  horarios: { day: string; hours: string }[];
  benefit: { percent: string; desc: string };
  reviewsData: { name: string; date: string; rating: number; text: string; img: string }[];
};

export const defaultOuroCompanyFixture: FigmaOuroCompanyData = {
  id: 1,
  tier: 'ouro',
  isFounder: true,
  name: 'Saba Advocacia & Consultoria',
  category: 'Serviços Jurídicos Flagship',
  about: 'Boutique jurídica de alta complexidade com atendimento exclusivo para empresas, governança corporativa, patrimônio e planejamento sucessório empresarial.',
  responsible: 'Dr. Eduardo Saba',
  responsibleRole: 'Irmão · Sócio Fundador',
  responsibleImg: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&h=120&fit=crop&auto=format',
  address: 'Av. Getúlio Vargas, 1240 — Cobertura 1001, Feira de Santana, BA',
  city: 'Feira de Santana, BA',
  rating: 5.0,
  reviews: 218,
  views: 9840,
  verified: true,
  isOpen: true,
  responseTime: '1 hora',
  indicatedBy: 12,
  indicatedAvatars: [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=40&h=40&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=40&h=40&fit=crop&auto=format',
  ],
  phone: '(75) 3025-4242',
  whatsapp: '5575999881122',
  email: 'contato@sabaadvocacia.local',
  site: 'https://sabaadvocacia.local',
  instagram: '@sabaadvocacia',
  facebook: 'sabaadvocacia',
  heroImg: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=800&fit=crop&auto=format',
  logo: 'SA',
  logoColor: '#7B1D1D',
  photos: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&h=300&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=300&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop&auto=format',
  ],
  services: [
    { icon: '⚖️', name: 'Governança Corporativa', desc: 'Estruturação de conselhos, acordos de sócios e conformidade regulatória.' },
    { icon: '📜', name: 'Contratos Complexos', desc: 'Negociações de alto impacto, M&A e estruturação jurídica internacional.' },
    { icon: '🛡️', name: 'Proteção Patrimonial', desc: 'Planejamento tributário e sucessório para famílias empresárias.' },
    { icon: '🏛️', name: 'Contencioso Estratégico', desc: 'Defesa e representação em causas empresariais e arbitrais de alta relevância.' },
  ],
  events: [
    {
      title: 'Workshop de Governança & Sucessão Familiar',
      desc: 'Encontro exclusivo sobre diretrizes e proteção de negócios familiares.',
      date: '28 de Agosto às 19:00',
      img: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=200&h=150&fit=crop&auto=format',
    },
  ],
  horarios: [{ day: 'Segunda a Sexta', hours: '08:00 às 19:00 (Atendimento VIP)' }],
  benefit: { percent: '20%', desc: 'de desconto na primeira consultoria + diagnóstico patrimonial gratuito para membros fraternos.' },
  reviewsData: [
    {
      name: 'Dr. Roberto Magalhães',
      date: 'Há 3 dias',
      rating: 5,
      text: 'Atendimento de altíssimo nível. Estruturaram toda a governança do nosso grupo empresarial com absoluta maestria e discrição.',
      img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&auto=format',
    },
    {
      name: 'Eng. Marcelo Peixoto',
      date: 'Há 2 semanas',
      rating: 5,
      text: 'Profissionalismo exemplar. O suporte jurídico estratégico prestado pelo Dr. Saba foi decisivo em nossas negociações.',
      img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&auto=format',
    },
  ],
};

export function FigmaOuroView({ company = defaultOuroCompanyFixture }: { company?: FigmaOuroCompanyData }) {
  const [activeTab, setActiveTab] = useState<'visao' | 'servicos' | 'fotos' | 'beneficios' | 'comentarios' | 'localizacao'>('visao');
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
    <div className={styles.container} data-visual-lab="figma-ouro">
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

      {/* Dark Premium Hero Header */}
      <div className={styles.darkHeroHeader} data-testid="ouro-hero-header">
        <div className={styles.diamondPattern} />
        <div className={styles.bgCoverOverlay}>
          <img src={company.heroImg} alt="" className={styles.bgCoverImg} />
        </div>

        <div className={styles.heroInnerWrap}>
          <a href="#empresas" className={styles.backLink}>
            ← Voltar para Empresas
          </a>

          <div className={styles.heroContentFlex}>
            {/* Gold Crest Logo Box */}
            <div className={styles.goldLogoBox} style={{ color: company.logoColor }} data-testid="ouro-logo-box">
              {company.logo}
            </div>

            {/* Info Col */}
            <div className={styles.heroInfoCol}>
              <div className={styles.badgesRow} data-testid="ouro-badges-row">
                {company.verified && <span className={styles.badgeVerified}>✓ Empresa Verificada</span>}
                <span className={styles.badgeOuro}>👑 PLANO OURO</span>
                {company.isFounder && <span className={styles.badgeFundadora}>⭐ EMPRESA FUNDADORA</span>}

                <div className={styles.heroShareFavBtns}>
                  <button className={styles.heroHeaderBtn} onClick={handleShare}>
                    ↗ Compartilhar
                  </button>
                  <button
                    className={styles.heroHeaderBtn}
                    onClick={() => {
                      setIsFavorited(!isFavorited);
                      showToast(isFavorited ? 'Removido dos favoritos' : 'Adicionado aos favoritos!');
                    }}
                  >
                    {isFavorited ? '♥ Favoritado' : '♡ Favoritar'}
                  </button>
                </div>
              </div>

              <h1 className={styles.companyTitle}>{company.name}</h1>
              <div className={styles.categorySub}>{company.category}</div>

              <div className={styles.responsibleText}>
                Responsável: <strong>{company.responsible}</strong> ({company.responsibleRole})
              </div>

              <div className={styles.statsRow}>
                <span>⭐ {company.rating} · {company.reviews} avaliações</span>
                <span>👁 {company.views.toLocaleString('pt-BR')} visualizações</span>
                <span className={styles.openStatus}>● Aberto agora</span>
                {company.responseTime && <span>💬 Responde em até {company.responseTime}</span>}
              </div>

              <div className={styles.heroCtasRow}>
                <a
                  href={`https://wa.me/${company.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.heroBtnWhatsapp}
                >
                  📱 WhatsApp
                </a>
                <a
                  href={`https://wa.me/${company.whatsapp}?text=${encodeURIComponent('Olá! Gostaria de solicitar um orçamento no plano Ouro.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.heroBtnOrçamento}
                >
                  📋 Solicitar orçamento
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Combined Sticky Action & Tabs Bar */}
      <div className={styles.stickyCombinedBar} data-testid="ouro-sticky-bar">
        <div className={styles.stickyCombinedInner}>
          {[
            { icon: '📱', label: 'WhatsApp', href: `https://wa.me/${company.whatsapp}` },
            { icon: '📞', label: 'Ligar', href: `tel:${company.phone}` },
            { icon: '✉️', label: 'E-mail', href: `mailto:${company.email}` },
            { icon: '📍', label: 'Como chegar', href: `https://maps.google.com/?q=${encodeURIComponent(company.address)}` },
            { icon: '📸', label: 'Instagram', href: `https://instagram.com/${company.instagram.replace('@', '')}` },
            { icon: '👥', label: 'Facebook', href: `https://facebook.com/${company.facebook}` },
          ].map((a) => (
            <a
              key={a.label}
              href={a.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.actionIconBtn}
            >
              {a.icon} {a.label}
            </a>
          ))}

          <div className={styles.dividerLine} />

          {(
            [
              { id: 'visao', label: 'Visão geral' },
              { id: 'servicos', label: 'Serviços' },
              { id: 'fotos', label: 'Fotos e vídeos' },
              { id: 'beneficios', label: 'Benefícios' },
              { id: 'comentarios', label: 'Comentários' },
              { id: 'localizacao', label: 'Localização' },
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

      {/* 3-Column Content Layout */}
      <div className={styles.contentGrid}>
        {/* Column 1: Institutional */}
        <div className={styles.colBlock} data-testid="ouro-col-institutional">
          <div style={{ marginBottom: 20 }}>
            <h3 className={styles.sectionTitle}>🏢 Sobre</h3>
            <div className={styles.goldLine} />
            <p className={styles.aboutText}>{company.about}</p>
          </div>

          {/* Services 2x2 */}
          <div style={{ marginBottom: 20 }} data-testid="ouro-services-2x2">
            <h3 className={styles.sectionTitle}>⚖️ Principais serviços</h3>
            <div className={styles.services2x2Grid}>
              {company.services.map((s) => (
                <div key={s.name} className={styles.serviceCard}>
                  <div className={styles.serviceIconBox}>{s.icon}</div>
                  <div className={styles.serviceName}>{s.name}</div>
                  <div className={styles.serviceDesc}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Indicated By Members Block */}
          {company.indicatedBy > 0 && (
            <div className={styles.indicatedBlock} data-testid="ouro-indicated-block">
              <div className={styles.avatarStack}>
                {company.indicatedAvatars.map((a, i) => (
                  <img key={i} src={a} alt={`Membro ${i + 1}`} className={styles.avatarItem} />
                ))}
              </div>
              <span className={styles.indicatedText}>
                <strong>Indicado por {company.indicatedBy} membros</strong> da comunidade
              </span>
            </div>
          )}

          {/* Reviews Preview */}
          <div>
            <h3 className={styles.sectionTitle}>💬 O que dizem os membros</h3>
            {company.reviewsData.map((r, i) => (
              <div key={i} className={styles.reviewCard}>
                <div className={styles.reviewerHeader}>
                  <img src={r.img} alt={r.name} className={styles.reviewerAvatar} />
                  <div>
                    <div className={styles.reviewerName}>{r.name}</div>
                    <div className={styles.reviewDate}>{r.date}</div>
                  </div>
                </div>
                <div className={styles.starsRow}>{'★'.repeat(r.rating)}</div>
                <p className={styles.reviewComment}>{r.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Media & Conversion */}
        <div className={styles.colBlock} data-testid="ouro-col-media-conversion">
          {/* Special Benefit Premium Box */}
          <div className={styles.benefitPremiumBox} data-testid="ouro-benefit-premium-box">
            <div className={styles.benefitBadgeCircle}>🏷️</div>
            <div>
              <div className={styles.benefitTag}>BENEFÍCIO EXCLUSIVO OURO</div>
              <div className={styles.benefitTitle}>{company.benefit.percent} de desconto + diagnóstico gratuito</div>
              <div style={{ fontSize: 12, color: '#E8D5B0', marginTop: 4 }}>{company.benefit.desc}</div>
              <button
                className={styles.benefitRedeemBtn}
                onClick={() => showToast('Benefício resgatado com sucesso!')}
                data-testid="ouro-benefit-redeem-btn"
              >
                Resgatar benefício
              </button>
            </div>
          </div>

          {/* Photos & Videos 3x3 Grid */}
          <div style={{ marginBottom: 20 }} data-testid="ouro-photos-videos-grid">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 className={styles.sectionTitle} style={{ color: '#7B1D1D' }}>
                📷 Fotos e vídeos
              </h3>
              <button
                onClick={() => setActiveTab('fotos')}
                style={{ fontSize: 12, color: '#7B1D1D', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Ver todas
              </button>
            </div>

            <div className={styles.photosVideoGrid}>
              {company.photos.slice(0, 5).map((p, i) => (
                <div key={i} className={styles.photoSquareItem}>
                  <img src={p} alt={`Mídia ${i + 1}`} className={styles.photoSquareImg} />
                  {i === 4 && <div className={styles.videoPlayOverlay}>▶</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Events & News Block */}
          {company.events.length > 0 && (
            <div data-testid="ouro-events-block">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 className={styles.sectionTitle} style={{ color: '#7B1D1D' }}>
                  📅 Eventos e novidades
                </h3>
                <button
                  style={{ fontSize: 12, color: '#7B1D1D', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Ver todas
                </button>
              </div>

              {company.events.map((ev, i) => (
                <div key={i} className={styles.eventCard}>
                  <div className={styles.eventImgWrap}>
                    <img src={ev.img} alt={ev.title} className={styles.eventImg} />
                  </div>
                  <div>
                    <div className={styles.eventTitle}>{ev.title}</div>
                    <div className={styles.eventDesc}>{ev.desc}</div>
                    <div className={styles.eventDate}>📅 {ev.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Sidebar */}
        <div className={styles.sidebar} data-testid="ouro-sidebar">
          {/* Responsável Card */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardTitle}>Responsável Verificado</div>
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
            <div className={styles.sidebarCardTitle}>Informações VIP</div>
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
            <div className={styles.mapBox} style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, padding: 12 }}>
              <span style={{ fontSize: 24 }}>📍</span>
              <span style={{ fontSize: 11, color: '#334155', textAlign: 'center' }}>{company.city}</span>
            </div>
          </div>

          {/* Quote Card Gold */}
          <div className={styles.quoteCardGold}>
            ⭐ <strong>Empresa Ouro / Fundadora:</strong> Destaque máximo na rede fraterna com selo de excelência e compromisso de atendimento de alta prioridade.
          </div>
        </div>
      </div>
    </div>
  );
}
