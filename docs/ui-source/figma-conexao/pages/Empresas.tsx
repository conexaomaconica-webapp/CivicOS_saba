import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const COMPANIES = [
  {
    id: 1,
    name: 'Saba Advocacia',
    category: 'Serviços Jurídicos',
    subcategory: 'Serviços Profissionais',
    responsible: 'Irmão Eduardo Saba',
    address: 'Av. Getúlio Vargas, 1240 — Centro, Feira de Santana',
    city: 'Feira de Santana, BA',
    views: 2847,
    rating: 4.9,
    reviews: 128,
    desc: 'Assessoria jurídica empresarial, contratos e consultoria.',
    img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=300&h=200&fit=crop&auto=format',
    badges: ['fundadora', 'verificada'],
    tier: 'ouro',
  },
  {
    id: 2,
    name: 'Harmonia Contabilidade',
    category: 'Contabilidade e Gestão',
    subcategory: 'Serviços Profissionais',
    responsible: 'Cunhada Mariana Lopes',
    address: 'Rua Barão do Rio Branco, 315 — Centro, Feira de Santana',
    city: 'Feira de Santana, BA',
    views: 1936,
    rating: 4.8,
    reviews: 96,
    desc: 'Contabilidade consultiva para empresas e profissionais.',
    img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=300&h=200&fit=crop&auto=format',
    badges: ['ouro', 'verificada'],
    tier: 'ouro',
    patrocinada: true,
  },
  {
    id: 4,
    name: 'Traço Vivo Arquitetura',
    category: 'Arquitetura e Projetos',
    subcategory: 'Construção',
    responsible: 'Sobrinha Beatriz Souza',
    address: 'Av. Maria Quitéria, 1880 — Brasília, Feira de Santana',
    city: 'Feira de Santana, BA',
    views: 864,
    rating: 4.7,
    reviews: 51,
    desc: 'Projetos residenciais, comerciais e interiores.',
    img: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=300&h=200&fit=crop&auto=format',
    badges: ['verificada'],
    tier: 'prata',
  },
  {
    id: 5,
    name: 'Nexo Comunicação',
    category: 'Marketing e Design',
    subcategory: 'Tecnologia',
    responsible: 'Irmão Rafael Almeida',
    address: 'Rua Castro Alves, 92 — Kalilândia, Feira de Santana',
    city: 'Feira de Santana, BA',
    views: 532,
    rating: 4.6,
    reviews: 34,
    desc: 'Estratégias de comunicação, identidade visual e digital.',
    img: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=300&h=200&fit=crop&auto=format',
    badges: [],
    tier: 'bronze',
  },
  {
    id: 3,
    name: 'Clínica Visão Plena',
    category: 'Saúde Visual',
    subcategory: 'Saúde e Bem-estar',
    responsible: 'Dr. Irmão Carlos Melo',
    address: 'Av. João Durval Carneiro, 500 — Brasília, Feira de Santana',
    city: 'Feira de Santana, BA',
    views: 1420,
    rating: 4.9,
    reviews: 76,
    desc: 'Oftalmologia, óculos e lentes com atendimento humanizado.',
    img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300&h=200&fit=crop&auto=format',
    badges: ['fundadora'],
    tier: 'ouro',
  },
]

const BADGE_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  fundadora: { label: 'Empresa Fundadora', color: '#92690A', bg: '#FEF9E7', icon: '⭐' },
  verificada: { label: 'Empresa Verificada', color: '#16A34A', bg: '#F0FDF4', icon: '✓' },
  ouro: { label: 'Plano Ouro', color: '#92690A', bg: '#FEF9E7', icon: '👑' },
  prata: { label: 'Plano Prata', color: '#6B7280', bg: '#F9FAFB', icon: '🥈' },
}

export default function Empresas() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [filterIrmao, setFilterIrmao] = useState(false)
  const [filterCunhada, setFilterCunhada] = useState(false)
  const [filterOuro, setFilterOuro] = useState(false)
  const [filterFundadora, setFilterFundadora] = useState(false)
  const [filterVerificada, setFilterVerificada] = useState(false)
  const [sort, setSort] = useState('relevancia')
  const [view, setView] = useState<'lista' | 'mapa'>('lista')

  const cat = searchParams.get('cat') ?? ''
  const categoryLabel = cat
    ? cat.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
    : 'Serviços Profissionais'

  const filtered = COMPANIES.filter(c => {
    const q = search.toLowerCase()
    if (q && !c.name.toLowerCase().includes(q) && !c.category.toLowerCase().includes(q)) return false
    if (filterOuro && !c.badges.includes('ouro')) return false
    if (filterFundadora && !c.badges.includes('fundadora')) return false
    if (filterVerificada && !c.badges.includes('verificada')) return false
    return true
  })

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      {/* Breadcrumb + header */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px 0' }}>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
          <Link to="/" style={{ color: '#6B7280' }}>Início</Link> / <Link to="/empresas" style={{ color: '#6B7280' }}>Empresas</Link> / <span style={{ color: '#1C1C1C' }}>{categoryLabel}</span>
        </div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 32, color: '#1C1C1C', marginBottom: 4 }}>
          {categoryLabel}
        </h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 20 }}>
          Encontre profissionais e empresas de confiança para o que você precisa.
        </p>

        {/* Search bar */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 20,
          background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 10,
          padding: '6px 6px 6px 16px',
        }}>
          <svg width="16" height="16" fill="none" stroke="#C9A227" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, alignSelf: 'center' }}>
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Busque por serviço, empresa ou profissional"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#1C1C1C' }}
          />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px',
            fontSize: 12, color: '#374151', flexShrink: 0,
          }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Feira de Santana
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>×</button>
          </div>
          <button style={{
            background: '#C9A227', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}>
            ✦ Buscar com IA
          </button>
        </div>

        {/* Results bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>
            {filtered.length} empresas encontradas
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#7B1D1D', color: '#fff', borderRadius: 20,
            padding: '4px 12px', fontSize: 12, fontWeight: 600,
          }}>
            {categoryLabel}
            <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, padding: 0 }}>×</button>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* List/Map toggle */}
            <div style={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
              {([['lista', '≡ Lista'], ['mapa', '◎ Mapa']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: '6px 14px', fontSize: 13, fontWeight: 500,
                  background: view === v ? '#7B1D1D' : '#fff',
                  color: view === v ? '#fff' : '#374151',
                  border: 'none', cursor: 'pointer',
                }}>
                  {l}
                </button>
              ))}
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)} style={{
              border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px',
              fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer', outline: 'none',
            }}>
              <option value="relevancia">Ordenar por: Relevância</option>
              <option value="avaliacao">Avaliação</option>
              <option value="distancia">Distância</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3-col layout */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 48px', display: 'grid', gridTemplateColumns: '200px 1fr 280px', gap: 20 }} className="grid-cols-1 md:grid-cols-3">

        {/* Left sidebar */}
        <aside style={{ background: '#FAFAFA', border: '1px solid #E5E7EB', borderRadius: 10, padding: 20, alignSelf: 'start', position: 'sticky', top: 80 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1C', marginBottom: 20 }}>Filtrar resultados</h3>

          <FilterGroup label="Cidade">
            <select style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: '#374151', background: '#fff', outline: 'none' }}>
              <option>Feira de Santana, BA</option>
              <option>Salvador, BA</option>
            </select>
          </FilterGroup>

          <FilterGroup label="Subcategoria">
            <select style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: '#374151', background: '#fff', outline: 'none' }}>
              <option>Todas as subcategorias</option>
              <option>Advocacia</option>
              <option>Contabilidade</option>
            </select>
          </FilterGroup>

          <FilterGroup label="Vínculo">
            {[['Irmão', filterIrmao, setFilterIrmao], ['Cunhada', filterCunhada, setFilterCunhada], ['Sobrinho(a)', false, () => {}]].map(([l, v, s]) => (
              <label key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}>
                <input type="checkbox" checked={v as boolean} onChange={e => (s as (v: boolean) => void)(e.target.checked)} style={{ accentColor: '#7B1D1D' }} />
                <span style={{ fontSize: 12, color: '#374151' }}>{l as string}</span>
              </label>
            ))}
          </FilterGroup>

          <FilterGroup label="Destaques">
            {[['Plano Ouro', filterOuro, setFilterOuro], ['Empresa Fundadora', filterFundadora, setFilterFundadora], ['Empresa Verificada', filterVerificada, setFilterVerificada]].map(([l, v, s]) => (
              <label key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}>
                <input type="checkbox" checked={v as boolean} onChange={e => (s as (v: boolean) => void)(e.target.checked)} style={{ accentColor: '#7B1D1D' }} />
                <span style={{ fontSize: 12, color: '#374151' }}>{l as string}</span>
              </label>
            ))}
          </FilterGroup>

          <FilterGroup label="Distância">
            <select style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: '#374151', background: '#fff', outline: 'none' }}>
              <option>Qualquer distância</option>
              <option>Até 5 km</option>
              <option>Até 10 km</option>
            </select>
          </FilterGroup>

          <button style={{
            width: '100%', background: '#7B1D1D', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 8,
          }}>
            Aplicar filtros
          </button>
          <button style={{ width: '100%', background: 'none', border: 'none', color: '#7B1D1D', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 8, padding: 4 }}>
            Limpar filtros
          </button>
        </aside>

        {/* Main list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map(co => (
            <CompanyCard key={co.id} co={co} />
          ))}

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 }}>
            <button style={{ width: 32, height: 32, border: '1px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#6B7280' }}>‹</button>
            {[1, 2, 3, '...', 8].map((p, i) => (
              <button key={i} style={{
                width: 32, height: 32, border: p === 1 ? 'none' : '1px solid #E5E7EB',
                borderRadius: 6, fontSize: 13, fontWeight: p === 1 ? 700 : 400,
                background: p === 1 ? '#7B1D1D' : '#fff',
                color: p === 1 ? '#fff' : '#374151',
                cursor: 'pointer',
              }}>{p}</button>
            ))}
            <button style={{ width: 32, height: 32, border: '1px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#6B7280' }}>›</button>
          </div>
        </div>

        {/* Right: mini map */}
        <aside style={{ alignSelf: 'start', position: 'sticky', top: 80 }}>
          <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14, color: '#1C1C1C', borderBottom: '1px solid #E5E7EB' }}>
              Empresas na região
            </div>
            <div style={{ height: 320, background: '#E8F0E8', position: 'relative' }}>
              <img
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=560&h=640&fit=crop&auto=format"
                alt="Mapa"
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
              />
              {/* Map pins */}
              {[[40, 45], [55, 60], [30, 70], [65, 35]].map(([x, y], i) => (
                <div key={i} style={{
                  position: 'absolute', left: `${x}%`, top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 24, height: 24, borderRadius: '50%',
                  background: i === 0 ? '#C9A227' : '#7B1D1D',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 10, fontWeight: 700,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)', cursor: 'pointer',
                }}>
                  {i === 0 ? '⚖' : '📍'}
                </div>
              ))}
            </div>
            <div style={{ padding: 12 }}>
              <button style={{
                width: '100%', border: '1px solid #7B1D1D', color: '#7B1D1D',
                background: '#fff', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                🗺️ Ver mapa completo
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function CompanyCard({ co }: { co: typeof COMPANIES[0] }) {
  return (
    <div style={{
      border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden',
      background: '#FFFFFF', display: 'flex',
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
    >
      {/* Image */}
      <div style={{ width: 220, flexShrink: 0, background: '#F3F4F6', position: 'relative', overflow: 'hidden' }}>
        <img src={co.img} alt={co.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px 20px', position: 'relative' }}>
        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {co.badges.map(b => {
            const cfg = BADGE_CFG[b]
            if (!cfg) return null
            return (
              <span key={b} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: cfg.bg, color: cfg.color,
              }}>
                {cfg.icon} {cfg.label}
              </span>
            )
          })}
          {co.patrocinada && (
            <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#F9FAFB', color: '#6B7280', marginLeft: 'auto' }}>
              Patrocinada
            </span>
          )}
        </div>

        <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 19, color: '#1C1C1C', marginBottom: 4 }}>
          <Link to={`/empresa/${co.id}`} style={{ color: '#7B1D1D' }}>{co.name}</Link>
        </h3>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>{co.category}</div>

        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Responsável: {co.responsible}
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {co.address}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
          <span>👁 {co.views.toLocaleString('pt-BR')} visualizações</span>
          <span>⭐ {co.rating} ({co.reviews} avaliações)</span>
        </div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>{co.desc}</div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{
            border: '1px solid #7B1D1D', color: '#7B1D1D', background: '#fff',
            borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            📍 Ver no mapa
          </button>
          <Link to={`/empresa/${co.id}`} style={{
            background: '#7B1D1D', color: '#fff',
            borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}>
            Ver empresa
          </Link>
        </div>

        {/* Heart */}
        <button style={{
          position: 'absolute', top: 14, right: 14,
          background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB',
        }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
    </div>
  )
}
