import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MasonicLogo } from '../components/Layout'

const GROWTH_DATA = [
  { month: 'Mar', membros: 720, empresas: 210 },
  { month: 'Abr', membros: 820, empresas: 240 },
  { month: 'Mai', membros: 890, empresas: 258 },
  { month: 'Jun', membros: 960, empresas: 272 },
  { month: 'Jul', membros: 1100, empresas: 295 },
  { month: 'Ago', membros: 1248, empresas: 312 },
]

const NAV_ITEMS = [
  { icon: '⊞', label: 'Visão geral', id: 'dashboard' },
  { icon: '📋', label: 'Diretório', id: 'diretorio' },
  { icon: '🏛️', label: 'Lojas', id: 'lojas' },
  { icon: '💼', label: 'Empresas', id: 'empresas' },
  { icon: '🤝', label: 'Conexões', id: 'conexoes' },
  { icon: '📅', label: 'Eventos', id: 'eventos' },
  { icon: '⭐', label: 'Fundadores', id: 'fundadores' },
  { icon: '💳', label: 'Pagamentos', id: 'pagamentos' },
  { icon: '📊', label: 'Relatórios', id: 'relatorios' },
  { icon: '🔍', label: 'Auditoria', id: 'auditoria' },
  { icon: '⚙️', label: 'Configurações', id: 'config' },
]

const EVENTS = [
  { day: '29', month: 'MAI', title: 'Sessão Magna de Iniciação', where: 'Grande Loja da Bahia • Salvador/BA' },
  { day: '05', month: 'JUN', title: 'Encontro de Negócios', where: 'Hotel Fiesta • Salvador/BA' },
  { day: '12', month: 'JUN', title: 'Assembleia Estadual', where: 'Grande Loja da Bahia • Salvador/BA' },
]

const OPPORTUNITIES = [
  { name: 'Saba Advogados Associados', desc: 'Escritório de advocacia • Salvador/BA', tags: ['Direito Empresarial', 'Consultoria Jurídica'], icon: '⚖️', color: '#7B1D1D' },
  { name: 'Construtora Harmonia', desc: 'Construção Civil • Feira de Santana/BA', tags: ['Construção', 'Projetos'], icon: '🏗️', color: '#1E3A5F' },
]

const RECENT_ACTIVITY = [
  { icon: '🏢', text: 'Nova empresa verificada', time: 'Há 2h', color: '#16A34A' },
  { icon: '💳', text: 'Pagamento confirmado', time: 'Há 4h', color: '#16A34A' },
  { icon: '👤', text: 'Afiliação aprovada', time: 'Há 6h', color: '#C9A227' },
  { icon: '✏️', text: 'Perfil atualizado', time: 'Há 1d', color: '#6B7280' },
]

const HEALTH = [
  { label: 'Pagamentos confirmados', status: 'Saudável', color: '#16A34A', count: null },
  { label: 'Checkouts pendentes', status: 'Atenção', color: '#D97706', count: 14 },
  { label: 'Webhooks processados', status: 'Saudável', color: '#16A34A', count: null },
  { label: 'Fila de revisão', status: 'Crítico', color: '#EF4444', count: 7 },
]

const KPI = [
  { icon: '👥', label: 'Membros ativos', value: '1.248', growth: '+8,4%', pos: true },
  { icon: '🏛️', label: 'Lojas maçônicas', value: '86', growth: '', pos: null },
  { icon: '💼', label: 'Empresas na rede', value: '312', growth: '+5,7%', pos: true },
  { icon: '🤝', label: 'Conexões geradas', value: '2.941', growth: '+11,2%', pos: true },
]

export default function Admin() {
  const [activeNav, setActiveNav] = useState('dashboard')
  const [growthTab, setGrowthTab] = useState<'membros' | 'empresas'>('membros')

  return (
    <div className="admin-layout" style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: '#0F1520',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MasonicLogo size={30} />
            <span style={{ fontFamily: 'Playfair Display, serif', color: '#C9A227', fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>
              Conexão<br />Maçônica
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: activeNav === item.id ? '#7B1D1D' : 'transparent',
                color: activeNav === item.id ? '#fff' : 'rgba(255,255,255,0.55)',
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                transition: 'all 0.15s', textAlign: 'left', marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom emblem */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>⚜️</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.4 }}>
            UNIDOS EM PROPÓSITO,<br />FORTES NA FRATERNIDADE.
          </div>
        </div>

        <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
          © 2024 Conexão Maçônica.
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          background: '#0F1520', borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16,
          position: 'sticky', top: 0, zIndex: 20,
        }}>
          {/* Obediência selector */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 12px',
            cursor: 'pointer', color: '#E8E4D8', fontSize: 13,
          }}>
            <span>🏛️</span>
            <span>Grande Oriente da Bahia</span>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </div>

          {/* Search */}
          <div style={{
            flex: 1, maxWidth: 400,
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Buscar membros, lojas ou empresas" style={{ background: 'none', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, width: '100%' }} />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Notif */}
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', position: 'relative', padding: 4 }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </button>
            {/* User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#7B1D1D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>ES</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#E8E4D8' }}>Eduardo Saba</div>
                <div style={{ fontSize: 10, color: '#C9A227' }}>Administrador</div>
              </div>
              <svg width="10" height="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#0F1520' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: '#C9A227', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
                TORRE DE CONTROLE
              </div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: '#F5E6C8', marginBottom: 2 }}>
                Boa tarde, Eduardo
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Acompanhe sua comunidade e as oportunidades da rede.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#C9A227', color: '#0F1520', border: 'none',
                borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                👤 Nova conexão
              </button>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.06)', color: '#E8E4D8',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                ⚙️ Gerenciar tenant
              </button>
            </div>
          </div>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
            {KPI.map(k => (
              <div key={k.label} style={{
                background: '#1A2235', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10, padding: '18px 20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'rgba(201,162,39,0.12)', border: '1px solid rgba(201,162,39,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>
                    {k.icon}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{k.label}</div>
                </div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 32, color: '#F5E6C8', lineHeight: 1 }}>{k.value}</div>
                {k.growth && (
                  <div style={{ fontSize: 11, color: '#4ADE80', marginTop: 6, fontWeight: 600 }}>
                    {k.growth} vs. mês anterior
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, marginBottom: 16 }}>
            {/* Growth chart */}
            <div style={{ background: '#1A2235', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#E8E4D8' }}>Crescimento da comunidade</h3>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['membros', 'empresas'] as const).map(t => (
                    <button key={t} onClick={() => setGrowthTab(t)} style={{
                      padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: growthTab === t ? '#C9A227' : 'rgba(255,255,255,0.06)',
                      color: growthTab === t ? '#0F1520' : 'rgba(255,255,255,0.5)',
                      border: growthTab === t ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer', textTransform: 'capitalize',
                    }}>
                      {t === 'membros' ? 'Membros' : 'Empresas'}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={GROWTH_DATA} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9A227" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C9A227" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1A2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#E8E4D8', fontSize: 12 }}
                    cursor={{ stroke: 'rgba(201,162,39,0.3)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey={growthTab}
                    stroke="#C9A227"
                    strokeWidth={2}
                    fill="url(#goldGrad)"
                    dot={{ fill: '#C9A227', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Health */}
            <div style={{ background: '#1A2235', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#E8E4D8', marginBottom: 16 }}>Saúde da operação</h3>
              {HEALTH.map(h => (
                <div key={h.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: h.color }} />
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{h.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {h.count !== null && (
                      <span style={{ fontSize: 14, fontWeight: 700, color: h.color }}>{h.count}</span>
                    )}
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                      background: h.color + '22', color: h.color,
                    }}>
                      {h.status}
                    </span>
                  </div>
                </div>
              ))}
              <button style={{
                width: '100%', marginTop: 14,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                Ver detalhes ›
              </button>
            </div>
          </div>

          {/* Bottom row: events + fundadores + activity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px 280px', gap: 16, marginBottom: 16 }}>
            {/* Events */}
            <div style={{ background: '#1A2235', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#E8E4D8', marginBottom: 14 }}>Próximos eventos</h3>
              {EVENTS.map(ev => (
                <div key={ev.title} style={{
                  display: 'flex', gap: 14, alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                }}>
                  <div style={{
                    textAlign: 'center', background: '#7B1D1D', borderRadius: 8,
                    padding: '6px 10px', flexShrink: 0, minWidth: 44,
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#F5E6C8', lineHeight: 1 }}>{ev.day}</div>
                    <div style={{ fontSize: 9, color: '#C9A227', fontWeight: 700, letterSpacing: '0.1em' }}>{ev.month}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#E8E4D8', marginBottom: 2 }}>{ev.title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{ev.where}</div>
                  </div>
                  <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              ))}
              <button style={{
                width: '100%', marginTop: 12, background: 'none', border: 'none',
                color: '#C9A227', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
              }}>
                Ver todos os eventos ›
              </button>
            </div>

            {/* Fundadores */}
            <div style={{ background: '#1A2235', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#E8E4D8', marginBottom: 16, alignSelf: 'flex-start' }}>Programa Fundadores</h3>
              <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 16 }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#C9A227" strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 44 * 0.74} ${2 * Math.PI * 44}`}
                    strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⭐</div>
              </div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: '#F5E6C8' }}>
                74 <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }}>de 100</span>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>vagas</div>
              <button style={{
                background: 'none', border: 'none', color: '#C9A227', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Acompanhar adesões ›
              </button>
            </div>

            {/* Recent activity */}
            <div style={{ background: '#1A2235', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#E8E4D8', marginBottom: 14 }}>Atividade recente</h3>
              {RECENT_ACTIVITY.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: a.color + '22', border: `1px solid ${a.color}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                  }}>
                    {a.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#E8E4D8', fontWeight: 500 }}>{a.text}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>{a.time}</div>
                </div>
              ))}
              <button style={{
                width: '100%', marginTop: 12, background: 'none', border: 'none',
                color: '#C9A227', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'right',
              }}>
                Ver todas as atividades ›
              </button>
            </div>
          </div>

          {/* Opportunities */}
          <div style={{ background: '#1A2235', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#E8E4D8' }}>Oportunidades para você</h3>
              <button style={{ background: 'none', border: 'none', color: '#C9A227', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Ver mais oportunidades ›
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {OPPORTUNITIES.map(op => (
                <div key={op.name} style={{
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16,
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, background: op.color + '33',
                    border: `1px solid ${op.color}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                  }}>
                    {op.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#E8E4D8', marginBottom: 2 }}>{op.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{op.desc}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {op.tags.map(t => (
                        <span key={t} style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 20 }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button style={{
                      background: '#C9A227', color: '#0F1520', border: 'none',
                      borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>
                      Conectar
                    </button>
                    <button style={{
                      background: 'none', color: 'rgba(255,255,255,0.4)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6, padding: '5px 14px', fontSize: 11, cursor: 'pointer',
                    }}>
                      Ver perfil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© 2024 Conexão Maçônica. Todos os direitos reservados.</span>
            <div style={{ display: 'flex', gap: 20 }}>
              {['LGPD', 'Multi-tenant', 'Auditoria ativa ●'].map(l => (
                <span key={l} style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {l === 'LGPD' ? '🛡️' : l === 'Multi-tenant' ? '👥' : '🔒'} {l}
                </span>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
