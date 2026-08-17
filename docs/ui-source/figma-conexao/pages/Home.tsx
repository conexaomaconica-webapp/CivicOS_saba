import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const CATEGORIES = [
  { icon: '💼', label: 'Serviços\nProfissionais', slug: 'servicos-profissionais' },
  { icon: '❤️', label: 'Saúde e\nBem-estar', slug: 'saude' },
  { icon: '🏗️', label: 'Construção', slug: 'construcao' },
  { icon: '💻', label: 'Tecnologia', slug: 'tecnologia' },
  { icon: '🍽️', label: 'Gastronomia', slug: 'gastronomia' },
  { icon: '🚗', label: 'Automotivo', slug: 'automotivo' },
  { icon: '🎓', label: 'Educação', slug: 'educacao' },
  { icon: '✈️', label: 'Turismo', slug: 'turismo' },
]

const SPONSORED = [
  {
    id: 1,
    name: 'Saba Advocacia',
    category: 'Serviços Jurídicos',
    city: 'Feira de Santana, BA',
    rating: 4.9,
    reviews: 128,
    badge: 'ouro',
    badgeLabel: 'Plano Ouro',
    img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=220&fit=crop&auto=format',
    logo: 'SA',
    logoColor: '#7B1D1D',
    tier: 'ouro',
  },
  {
    id: 2,
    name: 'Construtora Harmonia',
    category: 'Construção Civil',
    city: 'Salvador, BA',
    rating: 4.8,
    reviews: 96,
    badge: 'verificada',
    badgeLabel: 'Empresa Verificada',
    img: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=220&fit=crop&auto=format',
    logo: 'H',
    logoColor: '#1E3A5F',
    tier: 'prata',
  },
  {
    id: 3,
    name: 'Clínica Visão Plena',
    category: 'Saúde Visual',
    city: 'Feira de Santana, BA',
    rating: 4.9,
    reviews: 76,
    badge: 'fundadora',
    badgeLabel: 'Empresa Fundadora',
    img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=220&fit=crop&auto=format',
    logo: '👁️',
    logoColor: '#1E3A5F',
    tier: 'ouro',
  },
]

const NEARBY = [
  { id: 1, name: 'Saba Advocacia', category: 'Serviços Jurídicos', city: 'Feira de Santana, BA', dist: '1,2 km', tier: 'ouro' },
  { id: 3, name: 'Clínica Visão Plena', category: 'Saúde Visual', city: 'Feira de Santana, BA', dist: '1,8 km', tier: 'ouro' },
]

const LODGES = [
  { name: 'Augusta e Respeitável Loja Luz do Sertão', city: 'Feira de Santana, BA', day: 'Quinta-feira · 20h', rito: 'Rito Escocês Antigo e Aceito' },
  { name: 'Loja Maçônica União e Fraternidade', city: 'Salvador, BA', day: 'Terça-feira · 20h', rito: 'Rito Moderno' },
  { name: 'Loja Maçônica Cavaleiros da Justiça', city: 'Alagoinhas, BA', day: 'Sexta-feira · 19h30', rito: 'Rito Brasileiro' },
]

export default function Home() {
  const [search, setSearch] = useState('')
  const [slide, setSlide] = useState(0)
  const navigate = useNavigate()

  return (
    <div>
      {/* ── HERO ── */}
      <section style={{
        background: 'linear-gradient(160deg, #6B1414 0%, #7B1D1D 40%, #5A0E0E 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: '64px 24px 80px',
      }}>
        {/* Diamond pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.08,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0 L40 20 L20 40 L0 20 Z' fill='none' stroke='%23C9A227' stroke-width='0.8'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px',
        }} />

        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 700,
            color: '#F5E6C8',
            lineHeight: 1.2,
            marginBottom: 16,
          }}>
            Encontre empresas, serviços<br />e conexões de confiança
          </h1>
          <p style={{ color: '#E8D5B0', fontSize: 16, marginBottom: 36, opacity: 0.9 }}>
            Descubra oportunidades dentro de uma rede que valoriza<br />relacionamento, credibilidade e propósito.
          </p>

          {/* Search bar */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 12,
            padding: '6px 6px 6px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
            maxWidth: 700,
            margin: '0 auto 16px',
          }}>
            <svg width="18" height="18" fill="none" stroke="#C9A227" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
            <div style={{ flex: 1 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && navigate(`/empresas?q=${search}`)}
                placeholder="Pergunte à busca inteligente..."
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: 15, color: '#1C1C1C', background: 'transparent' }}
              />
              {!search && (
                <div style={{ fontSize: 11, color: '#C9A227', marginTop: 1 }}>
                  Ex.: advogado empresarial em Feira de Santana
                </div>
              )}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#F9FAFB', borderRadius: 8, padding: '6px 10px',
              fontSize: 12, color: '#374151', fontWeight: 500, flexShrink: 0,
            }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Feira de Santana
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
            <button
              onClick={() => navigate(`/empresas?q=${search}`)}
              style={{
                background: '#C9A227',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
              Buscar com IA
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
            {['✓ Empresas verificadas', '👤 Resultados personalizados'].map(t => (
              <span key={t} style={{ color: '#E8D5B0', fontSize: 13, opacity: 0.8 }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Banner carousel */}
        <div style={{ maxWidth: 860, margin: '36px auto 0', position: 'relative', zIndex: 1 }}>
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid rgba(201,162,39,0.3)',
            display: 'flex',
            minHeight: 160,
            position: 'relative',
          }}>
            {/* prev/next */}
            {[{ dir: -1, side: 'left' }, { dir: 1, side: 'right' }].map(({ dir, side }) => (
              <button key={side} onClick={() => setSlide(s => (s + dir + 5) % 5)} style={{
                position: 'absolute', top: '50%', [side]: 12, transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', zIndex: 2, fontSize: 16,
              }}>
                {dir < 0 ? '‹' : '›'}
              </button>
            ))}

            <div style={{ padding: '28px 60px', flex: 1 }}>
              <div style={{ fontSize: 10, color: '#C9A227', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                Destaque da Semana
              </div>
              <h3 style={{ fontFamily: 'Playfair Display, serif', color: '#F5E6C8', fontSize: 26, fontWeight: 700, marginBottom: 16 }}>
                Conexões que geram<br />oportunidades
              </h3>
              <button onClick={() => navigate('/empresas')} style={{
                background: '#C9A227', color: '#fff', border: 'none',
                borderRadius: 6, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                Conhecer empresas
              </button>
            </div>
            <div style={{ width: 280, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
              <img
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=560&h=320&fit=crop&auto=format"
                alt="Conexões de negócios"
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
              />
            </div>

            {/* dots */}
            <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
              {[0,1,2,3,4].map(i => (
                <button key={i} onClick={() => setSlide(i)} style={{
                  width: i === slide ? 20 : 8, height: 8, borderRadius: 4,
                  background: i === slide ? '#C9A227' : 'rgba(255,255,255,0.4)',
                  border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.2s',
                }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORIAS ── */}
      <section style={{ padding: '48px 24px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1C1C1C' }}>
              Categorias em destaque
            </h2>
            <Link to="/empresas" style={{ color: '#7B1D1D', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              Ver todas ›
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 12 }} className="grid-cols-4 md:grid-cols-8">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.slug}
                to={`/empresas?cat=${cat.slug}`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  padding: '20px 8px',
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#7B1D1D'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                <div style={{
                  width: 52, height: 52,
                  border: '1.5px solid #E5E7EB',
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                  color: '#7B1D1D',
                }}>
                  {cat.icon}
                </div>
                <span style={{ fontSize: 11, color: '#374151', fontWeight: 500, textAlign: 'center', lineHeight: 1.3, whiteSpace: 'pre-line' }}>
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── EMPRESAS PATROCINADAS ── */}
      <section style={{ padding: '0 24px 48px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1C1C1C', marginBottom: 6 }}>
            Empresas patrocinadas
          </h2>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24 }}>Destaques comerciais da rede</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="grid-cols-1 md:grid-cols-3">
            {SPONSORED.map(co => (
              <Link key={co.id} to={`/empresa/${co.id}`} style={{
                border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden',
                background: '#FFFFFF', transition: 'box-shadow 0.15s, transform 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                <div style={{ position: 'relative', height: 180, background: '#F3F4F6' }}>
                  <img src={co.img} alt={co.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button style={{
                    position: 'absolute', top: 10, right: 10,
                    background: '#fff', border: 'none', borderRadius: '50%',
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}>
                    <svg width="16" height="16" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </button>
                  {/* Logo badge */}
                  <div style={{
                    position: 'absolute', bottom: -20, left: 16,
                    width: 48, height: 48, borderRadius: 8,
                    background: co.logoColor, border: '2px solid #fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: co.logo.length > 2 ? 22 : 16, fontWeight: 800,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}>
                    {co.logo}
                  </div>
                </div>
                <div style={{ padding: '28px 16px 16px' }}>
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 17, color: '#1C1C1C', marginBottom: 4 }}>{co.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                    <span style={{ color: '#F59E0B', fontSize: 13 }}>★</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{co.rating}</span>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>({co.reviews})</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>📍 {co.city}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>🗂 {co.category}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <BadgeChip badge={co.badge} label={co.badgeLabel} />
                    <button onClick={e => e.preventDefault()} style={{
                      fontSize: 12, fontWeight: 600, color: '#7B1D1D',
                      background: 'none', border: '1px solid #7B1D1D',
                      borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                    }}>
                      Ver empresa
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXPLORE PERTO ── */}
      <section style={{ padding: '0 24px 48px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1C1C1C', marginBottom: 20 }}>
            Explore perto de você
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }} className="grid-cols-1 md:grid-cols-2">
            {/* Map placeholder */}
            <div style={{ background: '#E8F0E8', minHeight: 320, position: 'relative' }}>
              <img
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=700&h=400&fit=crop&auto=format"
                alt="Mapa da região"
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
              />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#374151', fontWeight: 500, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                  📍 Feira de Santana
                </div>
              </div>
            </div>

            {/* Nearby list */}
            <div style={{ padding: 24, background: '#FAFAFA' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1C', marginBottom: 4 }}>
                <span style={{ color: '#7B1D1D', fontFamily: 'Playfair Display, serif', fontSize: 22 }}>128</span> resultados nesta região
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, marginTop: 12 }}>
                {['Empresas', 'Benefícios', 'Eventos'].map((t, i) => (
                  <button key={t} style={{
                    padding: '6px 14px', borderRadius: 20,
                    background: i === 0 ? '#7B1D1D' : 'transparent',
                    color: i === 0 ? '#fff' : '#6B7280',
                    border: i === 0 ? 'none' : '1px solid #E5E7EB',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  }}>{t}</button>
                ))}
              </div>
              {NEARBY.map(co => (
                <Link key={co.id} to={`/empresa/${co.id}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0', borderBottom: '1px solid #E5E7EB',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {co.category.includes('Jurídico') ? '⚖️' : '👁️'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1C1C1C' }}>{co.name}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{co.category}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>📍 {co.city}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#7B1D1D', fontSize: 13, fontWeight: 600 }}>
                    {co.dist} ›
                  </div>
                </Link>
              ))}
              <button onClick={() => navigate('/empresas')} style={{
                width: '100%', marginTop: 16,
                background: '#C9A227', color: '#fff', border: 'none',
                borderRadius: 8, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                🗺️ Explorar no mapa
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── GUIA DE LOJAS MAÇÔNICAS ── */}
      <section style={{ padding: '0 24px 64px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1C1C1C', marginBottom: 6 }}>
            Guia de Lojas Maçônicas
          </h2>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 20 }}>Encontre lojas, oriente e informações para sua visita.</p>

          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
            {['Cidade', 'Potência', 'Rito', 'Dia de reunião'].map(f => (
              <select key={f} style={{
                border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 14px',
                fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer', outline: 'none',
              }}>
                <option>{f}</option>
              </select>
            ))}
            <button style={{
              background: '#C9A227', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              Aplicar filtros
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="grid-cols-1 md:grid-cols-3">
            {LODGES.map(lodge => (
              <div key={lodge.name} style={{
                border: '1px solid #E5E7EB', borderRadius: 10, padding: 20, background: '#FAFAFA',
              }}>
                <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 8, background: '#F3F4F6',
                    border: '1px solid #E5E7EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                  }}>
                    🏛️
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1C1C1C', lineHeight: 1.3, marginBottom: 4 }}>{lodge.name}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>📍 {lodge.city}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>🕐 {lodge.day}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>⚖️ {lodge.rito}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#7B1D1D', border: '1px solid #7B1D1D', borderRadius: 6, padding: '6px 0', background: 'none', cursor: 'pointer' }}>
                    Ver informações
                  </button>
                  <button style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 6, padding: '6px 10px', background: 'none', cursor: 'pointer' }}>
                    Traçar rota ›
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function BadgeChip({ badge, label }: { badge: string; label: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    ouro: { bg: '#FEF9E7', color: '#92690A', border: '#C9A227' },
    verificada: { bg: '#F0FDF4', color: '#16A34A', border: '#16A34A' },
    fundadora: { bg: '#FFF7ED', color: '#D97706', border: '#D97706' },
  }
  const s = styles[badge] ?? styles.verificada
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 20,
      background: s.bg, border: `1px solid ${s.border}44`,
      color: s.color, fontSize: 11, fontWeight: 600,
    }}>
      {badge === 'ouro' ? '👑' : badge === 'fundadora' ? '⭐' : '✓'} {label}
    </span>
  )
}
