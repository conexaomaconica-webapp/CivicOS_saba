import { useState } from 'react'
import { Link } from 'react-router-dom'

type Tier = 'todos' | 'ouro' | 'prata' | 'bronze'

const anunciantes = [
  {
    id: 1, tier: 'ouro', name: 'Advocacia Ferreiro & Irmãos', category: 'Jurídico',
    estado: 'SP', cidade: 'São Paulo',
    desc: 'Escritório especializado em direito civil, empresarial e trabalhista. Atendimento diferenciado à família maçônica.',
    img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=200&fit=crop&auto=format',
    contato: '(11) 3456-7890',
    tag: 'Destaque',
  },
  {
    id: 2, tier: 'ouro', name: 'Clínica Saúde & Luz', category: 'Saúde',
    estado: 'MG', cidade: 'Belo Horizonte',
    desc: 'Clínica multidisciplinar com medicina, odontologia e psicologia. Desconto especial para irmãos e dependentes.',
    img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=200&fit=crop&auto=format',
    contato: '(31) 9876-5432',
    tag: 'Destaque',
  },
  {
    id: 3, tier: 'prata', name: 'Construtora Triângulo', category: 'Construção',
    estado: 'RJ', cidade: 'Rio de Janeiro',
    desc: 'Construção civil, reformas e projetos arquitetônicos. Mais de 20 anos de experiência na fraternidade.',
    img: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=200&fit=crop&auto=format',
    contato: '(21) 2345-6789',
    tag: null,
  },
  {
    id: 4, tier: 'prata', name: 'Livraria Acácia', category: 'Cultura',
    estado: 'RS', cidade: 'Porto Alegre',
    desc: 'Livros maçônicos, filosóficos e esotéricos. Acervo raro e edições especiais para colecionadores.',
    img: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=200&fit=crop&auto=format',
    contato: '(51) 3210-9876',
    tag: null,
  },
  {
    id: 5, tier: 'prata', name: 'Joalheria Compasso de Ouro', category: 'Joias',
    estado: 'GO', cidade: 'Goiânia',
    desc: 'Joias e insígnias maçônicas artesanais. Medalhas, pins e condecorações personalizadas para lojas.',
    img: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=200&fit=crop&auto=format',
    contato: '(62) 8765-4321',
    tag: null,
  },
  {
    id: 6, tier: 'bronze', name: 'Buffet Fraternidade', category: 'Gastronomia',
    estado: 'PR', cidade: 'Curitiba',
    desc: 'Buffet e eventos para festas de gala, banquetes e confraternizações de lojas maçônicas.',
    img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop&auto=format',
    contato: '(41) 4321-8765',
    tag: null,
  },
  {
    id: 7, tier: 'bronze', name: 'Seguradora Prumo', category: 'Seguros',
    estado: 'BA', cidade: 'Salvador',
    desc: 'Seguros de vida, saúde e automóvel com condições exclusivas para a família maçônica nordestina.',
    img: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=200&fit=crop&auto=format',
    contato: '(71) 3344-5566',
    tag: null,
  },
  {
    id: 8, tier: 'bronze', name: 'Tech Maçom - TI & Sistemas', category: 'Tecnologia',
    estado: 'DF', cidade: 'Brasília',
    desc: 'Desenvolvimento de software, suporte de TI e consultoria digital para lojas e obediências.',
    img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=200&fit=crop&auto=format',
    contato: '(61) 9988-7766',
    tag: null,
  },
]

const tierConfig = {
  ouro: { label: 'Ouro', color: '#d4a017', bg: 'rgba(212,160,23,0.12)', border: '#d4a01744' },
  prata: { label: 'Prata', color: '#c0c8d4', bg: 'rgba(192,200,212,0.08)', border: '#c0c8d444' },
  bronze: { label: 'Bronze', color: '#cd7f32', bg: 'rgba(205,127,50,0.08)', border: '#cd7f3244' },
}

export default function Anunciantes() {
  const [filter, setFilter] = useState<Tier>('todos')
  const [search, setSearch] = useState('')

  const filtered = anunciantes.filter(a => {
    const matchTier = filter === 'todos' || a.tier === filter
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase()) ||
      a.cidade.toLowerCase().includes(search.toLowerCase())
    return matchTier && matchSearch
  })

  return (
    <div style={{ background: '#0a0f1e', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#0d1529', borderBottom: '1px solid #1e305e', padding: '48px 24px 32px' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <div style={{ width: 24, height: 1, background: '#d4a017' }} />
            <span style={{ color: '#d4a017', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>
              Diretório
            </span>
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 40, color: '#f5d98a', marginBottom: 8 }}>
            Anunciantes
          </h1>
          <p style={{ color: '#a8b2be', fontSize: 15 }}>
            Negócios e serviços de confiança da comunidade maçônica brasileira
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#111e3a', borderBottom: '1px solid #1e305e', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div className="max-w-6xl mx-auto flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            {(['todos', 'ouro', 'prata', 'bronze'] as Tier[]).map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'capitalize',
                  border: filter === t
                    ? `1px solid ${t === 'todos' ? '#d4a017' : tierConfig[t]?.color ?? '#d4a017'}`
                    : '1px solid #1e305e',
                  background: filter === t ? (t === 'todos' ? 'rgba(212,160,23,0.15)' : tierConfig[t]?.bg ?? 'transparent') : 'transparent',
                  color: filter === t ? (t === 'todos' ? '#d4a017' : tierConfig[t]?.color ?? '#d4a017') : '#a8b2be',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {t === 'todos' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Buscar por nome, categoria ou cidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              marginLeft: 'auto',
              background: '#0d1529',
              border: '1px solid #1e305e',
              borderRadius: 4,
              padding: '7px 14px',
              color: '#e8e4d8',
              fontSize: 13,
              outline: 'none',
              width: 280,
            }}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {filter === 'todos' && search === '' && (
          <>
            <TierSection title="Ouro" tier="ouro" items={filtered.filter(a => a.tier === 'ouro')} />
            <TierSection title="Prata" tier="prata" items={filtered.filter(a => a.tier === 'prata')} />
            <TierSection title="Bronze" tier="bronze" items={filtered.filter(a => a.tier === 'bronze')} />
          </>
        )}
        {(filter !== 'todos' || search !== '') && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(a => <AnuncianteCard key={a.id} a={a} />)}
          </div>
        )}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p style={{ color: '#a8b2be', fontSize: 16 }}>Nenhum anunciante encontrado.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function TierSection({ title, tier, items }: { title: string; tier: string; items: typeof anunciantes }) {
  const cfg = tierConfig[tier as keyof typeof tierConfig]
  if (!items.length) return null
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div style={{
          padding: '4px 12px',
          border: `1px solid ${cfg.color}66`,
          background: cfg.bg,
          borderRadius: 4,
          color: cfg.color,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          ✦ {title}
        </div>
        <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, ${cfg.color}44, transparent)` }} />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(a => <AnuncianteCard key={a.id} a={a} />)}
      </div>
    </div>
  )
}

function AnuncianteCard({ a }: { a: (typeof anunciantes)[0] }) {
  const cfg = tierConfig[a.tier as keyof typeof tierConfig]
  return (
    <Link
      to={`/anunciante/${a.id}`}
      style={{ textDecoration: 'none' }}
    >
      <div
        style={{
          background: '#0d1529',
          border: `1px solid ${cfg.border}`,
          borderRadius: 8,
          overflow: 'hidden',
          transition: 'all 0.2s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = cfg.color + '88'
          ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = cfg.border
          ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
        }}
      >
        <div style={{ position: 'relative', height: 160, background: '#111e3a' }}>
          <img src={a.img} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0d1529, transparent)' }} />
          <div style={{
            position: 'absolute', top: 10, right: 10,
            padding: '3px 10px',
            background: cfg.bg,
            border: `1px solid ${cfg.color}66`,
            borderRadius: 3,
            color: cfg.color,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}>
            {cfg.label}
          </div>
          {a.tag && (
            <div style={{
              position: 'absolute', top: 10, left: 10,
              padding: '3px 8px',
              background: '#d4a017',
              borderRadius: 3,
              color: '#0a0f1e',
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              {a.tag}
            </div>
          )}
        </div>
        <div style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 10, color: cfg.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            {a.category}
          </div>
          <h3 style={{ fontFamily: 'Playfair Display, serif', color: '#f5d98a', fontSize: 16, marginBottom: 8, lineHeight: 1.3 }}>
            {a.name}
          </h3>
          <p style={{ color: '#a8b2be', fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
            {a.desc}
          </p>
          <div className="flex items-center justify-between">
            <span style={{ color: '#6b7a96', fontSize: 11 }}>
              📍 {a.cidade}, {a.estado}
            </span>
            <span style={{ color: cfg.color, fontSize: 11, fontWeight: 700 }}>
              Ver perfil →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
