import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'

const COMPANIES: Record<number, CompanyData> = {
  1: {
    id: 1, tier: 'ouro',
    name: 'Saba Advocacia', category: 'Serviços Jurídicos',
    tagline: 'Soluções jurídicas com segurança e resultados',
    about: 'Assessoria jurídica empresarial, contratos e consultoria com atendimento próximo e personalizado.',
    responsible: 'Eduardo Saba', responsibleRole: 'Irmão · Proprietário',
    responsibleImg: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&auto=format',
    address: 'Av. Getúlio Vargas, 1240 — Centro\nFeira de Santana, BA, 44001-325',
    city: 'Feira de Santana, BA',
    cep: '44001-325',
    rating: 4.9, reviews: 128, views: 2847,
    verified: true, isOpen: true, responseTime: '1 hora',
    phone: '(75) 3025-4242', whatsapp: '(75) 9 9988-1122',
    email: 'contato@sabaadvocacia.com.br', site: 'www.sabaadvocacia.com.br',
    instagram: '@sabaadvocacia', facebook: 'sabaadvocacia',
    badges: ['verificada', 'ouro', 'fundadora'],
    heroImg: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=400&fit=crop&auto=format',
    logo: 'SA',
    logoColor: '#7B1D1D',
    logoImg: null,
    horariosLabel: 'Segunda a Sexta',
    horarios: [
      { day: 'Segunda', hours: '08:00 – 18:00' },
      { day: 'Terça', hours: '08:00 – 18:00' },
      { day: 'Quarta', hours: '08:00 – 18:00' },
      { day: 'Quinta', hours: '08:00 – 18:00' },
      { day: 'Sexta', hours: '08:00 – 18:00' },
      { day: 'Sábado', hours: '08:00 – 12:00' },
      { day: 'Domingo', hours: 'Fechado' },
    ],
    services: [
      { icon: '🏢', name: 'Consultoria Empresarial', desc: 'Planejamento jurídico e estratégico para negócios.' },
      { icon: '📋', name: 'Contratos Empresariais', desc: 'Elaboração e revisão de contratos com segurança jurídica.' },
      { icon: '⚖️', name: 'Direito Trabalhista', desc: 'Soluções para empresas e relações de trabalho.' },
      { icon: '🛡️', name: 'Regularização e Compliance', desc: 'Adequação legal e gestão de riscos empresariais.' },
    ],
    benefit: { percent: '10%', desc: 'na primeira consultoria para membros da comunidade.' },
    indicatedBy: 48,
    indicatedAvatars: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=32&h=32&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=32&h=32&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=32&h=32&fit=crop&auto=format',
    ],
    photos: [
      'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=220&h=160&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1521791055366-0d553872952f?w=220&h=160&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=220&h=160&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=220&h=160&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=220&h=160&fit=crop&auto=format',
    ],
    events: [
      { title: 'Campanha – Mês do Empreendedor Maçom', date: '01 a 31 de maio', desc: '10% de desconto na primeira consultoria durante todo o mês de maio.', img: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=120&h=80&fit=crop&auto=format' },
    ],
    reviewsData: [
      { name: 'Carlos Ribeiro', date: '2 semanas atrás', rating: 5, text: 'Atendimento impecável e muito ágil. Me orientaram em todo o processo com clareza e segurança.', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&auto=format' },
      { name: 'Júlia Almeida', date: '1 mês atrás', rating: 5, text: 'Profissionais competentes e atenciosos. Recomendo a todos os irmãos e familiares.', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&auto=format' },
    ],
    ratingBreakdown: [115, 9, 3, 1, 0],
    registered: '12/03/2021',
  },
  2: {
    id: 2, tier: 'prata',
    name: 'Saba Advocacia', category: 'Serviços Jurídicos',
    tagline: 'Assessoria com propósito',
    about: 'Assessoria jurídica empresarial, contratos e consultoria com atendimento próximo e personalizado.',
    responsible: 'Eduardo Saba', responsibleRole: 'Irmão · Proprietário',
    responsibleImg: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&auto=format',
    address: 'Av. Getúlio Vargas, 1240 — Centro\nFeira de Santana, BA, 44001-075',
    city: 'Feira de Santana, BA',
    cep: '44001-075',
    rating: 4.9, reviews: 128, views: 2847,
    verified: true, isOpen: true, responseTime: '2 horas',
    phone: '(75) 3025-4242', whatsapp: '(75) 9 9988-1122',
    email: 'contato@sabaadvocacia.com.br', site: 'www.sabaadvocacia.com.br',
    instagram: '@sabaadvocacia', facebook: 'sabaadvocacia',
    badges: ['verificada', 'prata'],
    heroImg: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=900&h=360&fit=crop&auto=format',
    logo: 'SA',
    logoColor: '#7B1D1D',
    logoImg: null,
    horariosLabel: 'Segunda a Sexta',
    horarios: [
      { day: 'Segunda', hours: '08:00 – 18:00' },
      { day: 'Sexta', hours: '08:00 – 18:00' },
    ],
    services: [
      { icon: '🏢', name: 'Consultoria Empresarial', desc: 'Orientação estratégica para empresas em diversas áreas do direito.' },
      { icon: '📋', name: 'Contratos', desc: 'Elaboração e revisão de contratos com segurança jurídica.' },
      { icon: '🛡️', name: 'Assessoria Preventiva', desc: 'Atuação preventiva para reduzir riscos e evitar litígios.' },
    ],
    benefit: { percent: '10%', desc: 'de desconto na primeira consultoria para membros da comunidade.' },
    indicatedBy: 0, indicatedAvatars: [],
    photos: [
      'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=200&h=140&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1521791055366-0d553872952f?w=200&h=140&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=140&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=200&h=140&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=200&h=140&fit=crop&auto=format',
    ],
    events: [],
    reviewsData: [
      { name: 'Marcos Almeida', date: 'Há 3 dias', rating: 5, text: 'Atendimento excelente e muito atencioso. Tiraram todas as minhas dúvidas com clareza e agilidade.', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&auto=format' },
      { name: 'Camila Barreto', date: 'Há 1 semana', rating: 5, text: 'Profissionalismo e conhecimento que transmitem confiança. Recomendo a todos da nossa comunidade.', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&auto=format' },
    ],
    ratingBreakdown: [112, 12, 3, 1, 0],
    registered: '12/03/2021',
  },
  3: {
    id: 3, tier: 'bronze',
    name: 'Saba Advocacia', category: 'Serviços Jurídicos',
    tagline: '',
    about: 'Assessoria jurídica empresarial, contratos e consultoria com atendimento próximo e personalizado.',
    responsible: 'Eduardo Saba', responsibleRole: 'Irmão · Proprietário',
    responsibleImg: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&auto=format',
    address: 'Av. Getúlio Vargas, 1240 — Centro\nFeira de Santana, BA, 44001-075',
    city: 'Feira de Santana, BA',
    cep: '44001-075',
    rating: 4.9, reviews: 128, views: 2847,
    verified: true, isOpen: true, responseTime: null,
    phone: '(75) 3025-4242', whatsapp: '', email: 'contato@sabaadvocacia.com.br',
    site: '', instagram: '', facebook: '',
    badges: ['bronze', 'verificada'],
    heroImg: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=700&h=400&fit=crop&auto=format',
    logo: 'SA', logoColor: '#7B1D1D', logoImg: null,
    horariosLabel: 'Seg–Sex',
    horarios: [{ day: 'Seg–Sex', hours: '8h às 18h' }],
    services: [],
    benefit: { percent: '10%', desc: 'de desconto na primeira consultoria para membros da comunidade.' },
    indicatedBy: 0, indicatedAvatars: [],
    photos: [
      'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=200&h=140&fit=crop&auto=format',
    ],
    events: [],
    reviewsData: [
      { name: 'Marcos Almeida', date: 'Há 2 semanas', rating: 5, text: 'Atendimento impecável e muita competência. Esclareceu todas as minhas dúvidas e me orientou da melhor forma.', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&auto=format' },
      { name: 'Rafael Cardoso', date: 'Há 1 mês', rating: 5, text: 'Profissional ético, atencioso e muito eficiente. Recomendo a todos os irmãos que precisam de suporte jurídico de confiança.', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&auto=format' },
    ],
    ratingBreakdown: [112, 12, 3, 1, 0],
    registered: '12/03/2021',
  },
}

type CompanyData = {
  id: number; tier: 'ouro' | 'prata' | 'bronze';
  name: string; category: string; tagline: string; about: string;
  responsible: string; responsibleRole: string; responsibleImg: string;
  address: string; city: string; cep: string;
  rating: number; reviews: number; views: number;
  verified: boolean; isOpen: boolean; responseTime: string | null;
  phone: string; whatsapp: string; email: string; site: string; instagram: string; facebook: string;
  badges: string[];
  heroImg: string; logo: string; logoColor: string; logoImg: string | null;
  horariosLabel: string; horarios: { day: string; hours: string }[];
  services: { icon: string; name: string; desc: string }[];
  benefit: { percent: string; desc: string };
  indicatedBy: number; indicatedAvatars: string[];
  photos: string[]; events: { title: string; date: string; desc: string; img: string }[];
  reviewsData: { name: string; date: string; rating: number; text: string; img: string }[];
  ratingBreakdown: number[];
  registered: string;
}

const TIER_CFG = {
  ouro: { label: 'PLANO OURO', color: '#92690A', bg: '#FEF9E7', border: '#C9A227', icon: '👑' },
  prata: { label: 'PLANO PRATA', color: '#4B5563', bg: '#F9FAFB', border: '#9CA3AF', icon: '🥈' },
  bronze: { label: 'PLANO BRONZE', color: '#92400E', bg: '#FFF7ED', border: '#D97706', icon: '🥉' },
}

const BADGE_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  verificada: { label: 'Empresa Verificada', color: '#16A34A', bg: '#F0FDF4', border: '#16A34A' },
  fundadora: { label: 'EMPRESA FUNDADORA', color: '#92690A', bg: '#FEF9E7', border: '#C9A227' },
  ouro: { label: 'PLANO OURO', color: '#92690A', bg: '#FEF9E7', border: '#C9A227' },
  prata: { label: 'PLANO PRATA', color: '#4B5563', bg: '#F9FAFB', border: '#9CA3AF' },
  bronze: { label: 'PLANO BRONZE', color: '#92400E', bg: '#FFF7ED', border: '#D97706' },
}

export default function EmpresaPerfil() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('visao')

  const co = COMPANIES[Number(id)]

  if (!co) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div className="text-center">
          <p style={{ color: '#6B7280', fontSize: 18, marginBottom: 12 }}>Empresa não encontrada.</p>
          <Link to="/empresas" style={{ color: '#7B1D1D', fontWeight: 600 }}>← Voltar</Link>
        </div>
      </div>
    )
  }

  if (co.tier === 'bronze') return <BronzeProfile co={co} />
  if (co.tier === 'prata') return <PrataProfile co={co} activeTab={activeTab} setActiveTab={setActiveTab} />
  return <OuroProfile co={co} activeTab={activeTab} setActiveTab={setActiveTab} />
}

/* ────── BRONZE ────── */
function BronzeProfile({ co }: { co: CompanyData }) {
  const [tab, setTab] = useState('sobre')
  const tierCfg = TIER_CFG[co.tier]

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 0' }}>
        <Link to="/empresas" style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          ← Voltar para Empresas
        </Link>
      </div>

      {/* Hero: image + info card */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="grid-cols-1 md:grid-cols-2">
        <div style={{ borderRadius: 12, overflow: 'hidden', background: '#F3F4F6', aspectRatio: '4/3' }}>
          <img src={co.heroImg} alt={co.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, position: 'relative' }}>
          {/* Tier badge */}
          <span style={{
            position: 'absolute', top: 16, right: 16,
            border: `1px solid ${tierCfg.border}`, color: tierCfg.color,
            background: tierCfg.bg, padding: '3px 10px', borderRadius: 6,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          }}>
            {tierCfg.label}
          </span>

          {/* Logo + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{
              width: 70, height: 70, borderRadius: 10,
              background: co.logoColor, border: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 900, fontSize: 18, flexShrink: 0,
            }}>
              {co.logo}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: '#1C1C1C' }}>{co.name}</h1>
                {co.verified && (
                  <span style={{ fontSize: 11, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 3 }}>
                    ✓ Empresa Verificada
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>{co.category}</div>
            </div>
          </div>

          <InfoRow icon="⏰" text={`Responsável: ${co.responsible}`} />
          <InfoRow icon="📍" text={co.address.replace('\n', ' — ')} />
          <div style={{ display: 'flex', gap: 16, marginBottom: 12, marginTop: 8 }}>
            <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#F59E0B' }}>★</span> {co.rating} · {co.reviews} avaliações
            </span>
            <span style={{ fontSize: 13, color: '#6B7280' }}>👁 {co.views.toLocaleString('pt-BR')} visualizações</span>
            <span style={{ fontSize: 13, color: '#16A34A', fontWeight: 600 }}>● Aberto agora</span>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <ActionBar co={co} />

      {/* Tabs */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', marginBottom: 24 }}>
          {['sobre', 'comentarios'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '12px 24px', fontSize: 14, fontWeight: 600,
              color: tab === t ? '#7B1D1D' : '#6B7280',
              border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: tab === t ? '2px solid #7B1D1D' : '2px solid transparent',
              marginBottom: -2,
            }}>
              {t === 'sobre' ? 'Sobre' : 'Comentários'}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 300px', gap: 24 }} className="grid-cols-1 md:grid-cols-3">
          {/* Content */}
          <div style={{ gridColumn: '1 / 3' }}>
            {tab === 'sobre' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ borderBottom: '2px solid #C9A227', paddingBottom: 2 }}>Sobre</span>
                  </h3>
                  <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.7 }}>{co.about}</p>
                </div>
                <div style={{
                  border: '1px solid #C9A227', borderRadius: 10, padding: 20,
                  background: '#FFFDF0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: '#C9A227', fontSize: 18 }}>🏷️</span>
                    <span style={{ fontWeight: 700, color: '#7B1D1D', fontSize: 15 }}>Benefício especial</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.6 }}>
                    {co.benefit.percent} de desconto na primeira consultoria para membros da comunidade.
                  </p>
                </div>
              </div>
            )}

            {/* Reviews */}
            <div style={{ marginTop: tab === 'sobre' ? 32 : 0 }}>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, marginBottom: 16 }}>Comentários</h3>
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 52, color: '#7B1D1D', lineHeight: 1 }}>{co.rating}</div>
                  <div style={{ color: '#F59E0B', fontSize: 18, marginTop: 4 }}>{'★'.repeat(5)}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{co.reviews} avaliações</div>
                </div>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {co.reviewsData.map(r => (
                    <div key={r.name} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <img src={r.img} alt={r.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: '#9CA3AF' }}>{r.date}</div>
                        </div>
                      </div>
                      <div style={{ color: '#F59E0B', fontSize: 12, marginBottom: 6 }}>{'★'.repeat(r.rating)}</div>
                      <p style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.6 }}>{r.text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button style={{ border: '1px solid #7B1D1D', color: '#7B1D1D', background: 'none', borderRadius: 8, padding: '8px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Ver todas as avaliações
                </button>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <RightSidebar co={co} />
        </div>
      </div>

      {/* CTA bottom */}
      <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid #E5E7EB', padding: '12px 24px', display: 'flex', justifyContent: 'center' }}>
        <button style={{
          background: '#7B1D1D', color: '#fff', border: 'none',
          borderRadius: 8, padding: '12px 32px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          📋 Solicitar orçamento
        </button>
      </div>
    </div>
  )
}

/* ────── PRATA ────── */
function PrataProfile({ co, activeTab, setActiveTab }: { co: CompanyData; activeTab: string; setActiveTab: (t: string) => void }) {
  const tierCfg = TIER_CFG[co.tier]
  const TABS = ['visao', 'servicos', 'fotos', 'comentarios', 'localizacao']
  const TAB_LABELS: Record<string, string> = { visao: '⊞ Visão geral', servicos: '🗂 Serviços', fotos: '📷 Fotos', comentarios: '💬 Comentários', localizacao: '📍 Localização' }

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      {/* Top: info left + gallery right */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 0', display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }} className="grid-cols-1 md:grid-cols-2">
        {/* Info left */}
        <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, alignSelf: 'start' }}>
          <div style={{ width: 80, height: 80, background: co.logoColor, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 22, marginBottom: 12 }}>
            {co.logo}
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, color: '#1C1C1C', marginBottom: 4 }}>{co.name}</h1>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>{co.category}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {co.badges.map(b => {
              const cfg = BADGE_CFG[b]
              if (!cfg) return null
              return (
                <span key={b} style={{ fontSize: 11, fontWeight: 600, color: cfg.color, border: `1px solid ${cfg.border}44`, background: cfg.bg, padding: '2px 8px', borderRadius: 20 }}>
                  {b === 'verificada' ? '✓ ' : ''}{cfg.label}
                </span>
              )
            })}
          </div>
          <InfoRow icon="👤" text={`Responsável: ${co.responsible}`} />
          <InfoRow icon="📍" text={co.address.replace('\n', ' — ')} />
          <div style={{ fontSize: 13, display: 'flex', gap: 12, marginBottom: 4 }}>
            <span style={{ color: '#F59E0B' }}>★ {co.rating}</span>
            <span style={{ color: '#6B7280' }}>· {co.reviews} avaliações</span>
            <span style={{ color: '#6B7280' }}>👁 {co.views.toLocaleString('pt-BR')}</span>
          </div>
          <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 600, marginTop: 4 }}>● Aberto agora</div>
        </div>

        {/* Gallery right: 1 big + 3 small */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '200px 160px', gap: 4, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ gridRow: '1 / 3', background: '#F3F4F6' }}>
            <img src={co.heroImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {co.photos.slice(0, 4).map((p, i) => (
            <div key={i} style={{ background: '#F3F4F6' }}>
              <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <ActionBar co={co} showSolicitar />

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 65, background: '#fff', zIndex: 10 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '12px 16px', fontSize: 13, fontWeight: 600,
              color: activeTab === t ? '#7B1D1D' : '#6B7280',
              border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: activeTab === t ? '2px solid #7B1D1D' : '2px solid transparent',
              whiteSpace: 'nowrap',
            }}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 48px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }} className="grid-cols-1 md:grid-cols-2">
        <div>
          {/* About + benefit banner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                🏢 Sobre
              </h3>
              <div style={{ width: 28, height: 2, background: '#C9A227', marginBottom: 10 }} />
              <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.7 }}>{co.about}</p>
            </div>
            <div style={{
              borderRadius: 10, overflow: 'hidden', position: 'relative',
              background: 'linear-gradient(135deg, #1a1a2e, #7B1D1D)',
              padding: 20, color: '#fff',
            }}>
              <div style={{ fontSize: 11, color: '#C9A227', fontWeight: 700, marginBottom: 4 }}>🏷️ Benefício especial para membros</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700, color: '#C9A227' }}>{co.benefit.percent} de desconto</div>
              <div style={{ fontSize: 13, color: '#E8D5B0', marginTop: 4 }}>{co.benefit.desc}</div>
            </div>
          </div>

          {/* Services */}
          {co.services.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚖️ Principais serviços
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {co.services.slice(0, 3).map(s => (
                  <div key={s.name} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 14 }}>
                    <div style={{ width: 36, height: 36, background: '#F3F4F6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 8 }}>{s.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{s.desc}</div>
                    <button style={{ background: 'none', border: 'none', color: '#7B1D1D', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: 8 }}>Saiba mais →</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gallery */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              📷 Galeria de fotos
            </h3>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {co.photos.map((p, i) => (
                <div key={i} style={{ flexShrink: 0, width: 140, height: 100, borderRadius: 8, overflow: 'hidden', background: '#F3F4F6' }}>
                  <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
              <div style={{ flexShrink: 0, width: 100, height: 100, borderRadius: 8, border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 20 }}>→</span>
                <span style={{ fontSize: 11, color: '#6B7280', textAlign: 'center' }}>Ver todas as fotos</span>
              </div>
            </div>
          </div>

          {/* Reviews */}
          <ReviewsSection co={co} />
        </div>

        <RightSidebar co={co} showHours showContact />
      </div>
    </div>
  )
}

/* ────── OURO ────── */
function OuroProfile({ co, activeTab, setActiveTab }: { co: CompanyData; activeTab: string; setActiveTab: (t: string) => void }) {
  const TABS = ['visao', 'servicos', 'fotos', 'beneficios', 'comentarios', 'localizacao']
  const TAB_LABELS: Record<string, string> = { visao: 'Visão geral', servicos: 'Serviços', fotos: 'Fotos e vídeos', beneficios: 'Benefícios', comentarios: 'Comentários', localizacao: 'Localização' }

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      {/* Dark hero header */}
      <div style={{
        background: 'linear-gradient(160deg, #4A0E0E 0%, #7B1D1D 60%, #5A0E0E 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Diamond pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.08,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0 L40 20 L20 40 L0 20 Z' fill='none' stroke='%23C9A227' stroke-width='0.8'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px',
        }} />
        {/* Background image */}
        <div style={{ position: 'absolute', right: 0, top: 0, width: '55%', height: '100%', opacity: 0.3 }}>
          <img src={co.heroImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px', position: 'relative', zIndex: 1 }}>
          <Link to="/empresas" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
            ← Voltar para Empresas
          </Link>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            {/* Logo */}
            <div style={{
              width: 100, height: 100, background: '#F5E6C8', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: co.logoColor, fontWeight: 900, fontSize: 28, flexShrink: 0,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}>
              {co.logo}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {co.verified && (
                    <span style={{ fontSize: 12, color: '#16A34A', background: '#F0FDF4', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                      ✓ Empresa Verificada
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: '#92690A', background: '#FEF9E7', border: '1px solid #C9A227', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                    👑 PLANO OURO
                  </span>
                  <span style={{ fontSize: 12, color: '#D97706', background: '#FFF7ED', border: '1px solid #D97706', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                    ⭐ EMPRESA FUNDADORA
                  </span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
                  <button style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '6px 14px', color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ↗ Compartilhar
                  </button>
                  <button style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '6px 14px', color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ♡ Favoritar
                  </button>
                </div>
              </div>

              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 32, color: '#F5E6C8', marginBottom: 2 }}>{co.name}</h1>
              <div style={{ fontSize: 15, color: '#C9A227', fontWeight: 600, marginBottom: 12 }}>{co.category}</div>

              <div style={{ fontSize: 13, color: '#e0d0b0', marginBottom: 16 }}>
                Responsável: {co.responsible}
              </div>

              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20, fontSize: 13, color: '#e0d0b0' }}>
                <span>⭐ {co.rating} · {co.reviews} avaliações</span>
                <span>👁 {co.views.toLocaleString('pt-BR')} visualizações</span>
                <span style={{ color: '#4ADE80' }}>● Aberto agora</span>
                {co.responseTime && <span>💬 Responde em até {co.responseTime}</span>}
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📱 WhatsApp
                </button>
                <button style={{ background: '#C9A227', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📋 Solicitar orçamento
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full action bar */}
      <div style={{ borderBottom: '1px solid #E5E7EB', background: '#fff', position: 'sticky', top: 65, zIndex: 10, overflowX: 'auto' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 0, alignItems: 'center' }}>
          {[
            { icon: '📱', label: 'WhatsApp' }, { icon: '📞', label: 'Ligar' },
            { icon: '✉️', label: 'E-mail' }, { icon: '📍', label: 'Como chegar' },
            { icon: '📸', label: 'Instagram' }, { icon: '👥', label: 'Facebook' },
          ].map(a => (
            <button key={a.label} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '12px 14px',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
              fontWeight: 500, color: '#374151', whiteSpace: 'nowrap',
              borderBottom: '2px solid transparent',
            }}>
              {a.icon} {a.label}
            </button>
          ))}
          <div style={{ width: 1, height: 24, background: '#E5E7EB', margin: '0 8px' }} />
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '12px 14px',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              color: activeTab === t ? '#7B1D1D' : '#6B7280',
              borderBottom: activeTab === t ? '2px solid #7B1D1D' : '2px solid transparent',
              whiteSpace: 'nowrap',
            }}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* 3-col content */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr 300px', gap: 24 }} className="grid-cols-1 md:grid-cols-3">
        {/* Left col */}
        <div>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>🏢 Sobre</h3>
            <div style={{ width: 28, height: 2, background: '#C9A227', marginBottom: 10 }} />
            <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.7 }}>{co.about}</p>
          </div>

          {/* Services 2x2 */}
          {co.services.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>⚖️ Principais serviços</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {co.services.map(s => (
                  <div key={s.name} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                    <div style={{ width: 32, height: 32, background: '#F3F4F6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Indicated by */}
          {co.indicatedBy > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', marginBottom: 20 }}>
              <div style={{ display: 'flex' }}>
                {co.indicatedAvatars.slice(0, 5).map((a, i) => (
                  <img key={i} src={a} alt="" style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #fff', marginLeft: i > 0 ? -10 : 0, objectFit: 'cover' }} />
                ))}
              </div>
              <span style={{ fontSize: 13, color: '#4B5563' }}>
                <strong>Indicado por {co.indicatedBy} membros</strong> da comunidade
              </span>
            </div>
          )}

          {/* Rating breakdown */}
          <ReviewsSection co={co} compact />
        </div>

        {/* Middle col */}
        <div>
          {/* Benefit box */}
          <div style={{
            background: 'linear-gradient(135deg, #4A0E0E, #7B1D1D)',
            borderRadius: 10, padding: 24, marginBottom: 20, color: '#fff',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              border: '3px solid #C9A227', background: 'rgba(201,162,39,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>
              🏷️
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#C9A227', fontWeight: 700, marginBottom: 4 }}>Benefício exclusivo</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, color: '#F5E6C8', lineHeight: 1.2 }}>
                {co.benefit.percent} de desconto na primeira<br />consultoria para membros<br />da comunidade.
              </div>
              <button style={{ marginTop: 12, background: '#C9A227', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Resgatar benefício
              </button>
            </div>
          </div>

          {/* Photos grid */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#7B1D1D' }}>📷 Fotos e vídeos</h3>
              <button style={{ fontSize: 12, color: '#7B1D1D', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Ver todas</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {co.photos.slice(0, 5).map((p, i) => (
                <div key={i} style={{ borderRadius: 6, overflow: 'hidden', aspectRatio: '1', background: '#F3F4F6', position: 'relative' }}>
                  <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {i === 4 && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>▶</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Events */}
          {co.events.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#7B1D1D' }}>📅 Eventos e novidades</h3>
                <button style={{ fontSize: 12, color: '#7B1D1D', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Ver todas</button>
              </div>
              {co.events.map(ev => (
                <div key={ev.title} style={{ display: 'flex', gap: 12, border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                  <div style={{ width: 72, height: 56, borderRadius: 6, overflow: 'hidden', background: '#F3F4F6', flexShrink: 0 }}>
                    <img src={ev.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{ev.title}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>{ev.desc}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>📅 {ev.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reviews section middle */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>O que os membros estão dizendo</h3>
              <button style={{ fontSize: 12, color: '#7B1D1D', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Ver todas</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {co.reviewsData.map(r => (
                <div key={r.name} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <img src={r.img} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{r.name}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF' }}>{r.date}</div>
                    </div>
                  </div>
                  <div style={{ color: '#F59E0B', fontSize: 11, marginBottom: 4 }}>{'★'.repeat(r.rating)}</div>
                  <p style={{ fontSize: 11, color: '#4B5563', lineHeight: 1.5 }}>{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <RightSidebar co={co} showHours showContact showMasonicSymbol />
      </div>
    </div>
  )
}

/* ── Shared components ── */

function ActionBar({ co, showSolicitar }: { co: CompanyData; showSolicitar?: boolean }) {
  const actions = [
    { icon: '📱', label: 'WhatsApp', green: true },
    { icon: '📞', label: 'Ligar' },
    { icon: '✉️', label: 'E-mail' },
    { icon: '📍', label: 'Como chegar' },
    { icon: '📸', label: 'Instagram' },
    { icon: '👥', label: 'Facebook' },
  ]
  return (
    <div style={{ borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', background: '#FAFAFA', overflowX: 'auto' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {actions.map(a => (
          <button key={a.label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 600,
            color: a.green ? '#16A34A' : '#374151',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 16 }}>{a.icon}</span>
            {a.label}
          </button>
        ))}
        {showSolicitar && (
          <button style={{
            marginLeft: 'auto',
            background: '#7B1D1D', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}>
            📋 Solicitar orçamento
          </button>
        )}
      </div>
    </div>
  )
}

function RightSidebar({ co, showHours, showContact, showMasonicSymbol }: { co: CompanyData; showHours?: boolean; showContact?: boolean; showMasonicSymbol?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Responsável */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Responsável</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <img src={co.responsibleImg} alt={co.responsible} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1C1C1C' }}>{co.responsible}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{co.responsibleRole.split(' · ')[0]}</div>
            <div style={{ fontSize: 12, color: '#C9A227', fontWeight: 600 }}>{co.responsibleRole.split(' · ')[1]}</div>
            {showMasonicSymbol && <div style={{ fontSize: 18, marginTop: 4 }}>⚜️</div>}
          </div>
        </div>
        {co.responseTime && <div style={{ fontSize: 12, color: '#16A34A', marginTop: 8, fontWeight: 600 }}>💬 Responde em até {co.responseTime}</div>}
      </div>

      {/* Info */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Informações{showHours ? ' do negócio' : ''}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ color: '#16A34A', fontSize: 12 }}>●</span>
            <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>Aberto agora</span>
          </div>
          {showHours && co.horarios.slice(0, 2).map(h => (
            <div key={h.day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#4B5563' }}>
              <span>{h.day}</span><span>{h.hours}</span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>👁</span> {co.views.toLocaleString('pt-BR')} visualizações
          </div>
          {showHours && <div style={{ fontSize: 12, color: '#6B7280' }}>📅 Cadastrado em {co.registered}</div>}
        </div>
      </div>

      {/* Localização */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>Localização</div>
        <div style={{ fontSize: 12, color: '#6B7280', padding: '0 16px 12px' }}>{co.address}</div>
        <div style={{ height: 140, background: '#E8F0E8', position: 'relative' }}>
          <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&h=280&fit=crop&auto=format" alt="Mapa" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 24 }}>📍</div>
        </div>
        <div style={{ padding: 12 }}>
          <button style={{ width: '100%', border: '1px solid #E5E7EB', background: '#fff', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            ⚓ Traçar rota
          </button>
        </div>
      </div>

      {showContact && (
        <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Contato</div>
          {co.phone && <div style={{ fontSize: 12, color: '#4B5563', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>📞 {co.phone}</div>}
          {co.whatsapp && <div style={{ fontSize: 12, color: '#4B5563', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>📱 {co.whatsapp}</div>}
          {co.email && <div style={{ fontSize: 12, color: '#4B5563', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>✉️ {co.email}</div>}
          {co.site && <div style={{ fontSize: 12, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6 }}>🌐 {co.site}</div>}
        </div>
      )}

      {/* Hours table (Ouro) */}
      {showHours && co.horarios.length > 2 && (
        <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            🕐 Funcionamento
          </div>
          {co.horarios.map(h => (
            <div key={h.day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#4B5563', padding: '4px 0', borderBottom: '1px solid #F3F4F6' }}>
              <span>{h.day}</span>
              <span style={{ color: h.hours === 'Fechado' ? '#EF4444' : '#4B5563' }}>{h.hours}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewsSection({ co, compact }: { co: CompanyData; compact?: boolean }) {
  const total = co.ratingBreakdown.reduce((a, b) => a + b, 0)
  return (
    <div>
      <h3 style={{ fontSize: compact ? 14 : 18, fontWeight: 700, marginBottom: 16, fontFamily: compact ? 'inherit' : 'Playfair Display, serif' }}>
        {compact ? '' : ''}⭐ Avaliações
      </h3>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: compact ? 36 : 48, color: '#7B1D1D', lineHeight: 1 }}>{co.rating}</div>
          <div style={{ color: '#F59E0B', fontSize: compact ? 14 : 20, marginTop: 4 }}>{'★'.repeat(5)}</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{co.reviews} avaliações</div>
        </div>
        <div style={{ flex: 1 }}>
          {co.ratingBreakdown.map((count, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#F59E0B', width: 8 }}>{5 - i}</span>
              <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#C9A227', width: `${total ? (count / total) * 100 : 0}%`, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 11, color: '#9CA3AF', width: 20, textAlign: 'right' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
      {!compact && (
        <div style={{ marginTop: 16 }}>
          <button style={{ border: '1px solid #7B1D1D', color: '#7B1D1D', background: 'none', borderRadius: 8, padding: '8px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Ver todas as avaliações
          </button>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{text}</span>
    </div>
  )
}
