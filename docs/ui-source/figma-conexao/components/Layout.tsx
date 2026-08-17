import { Outlet, NavLink, Link } from 'react-router-dom'
import { useState } from 'react'

const NAV = [
  { to: '/', label: 'Início', end: true },
  { to: '/empresas', label: 'Empresas', end: false },
  { to: '/beneficios', label: 'Benefícios', end: false },
  { to: '/eventos', label: 'Eventos', end: false },
  { to: '/lojas', label: 'Lojas Maçônicas', end: false },
]

export function MasonicLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <polygon points="24,4 44,40 4,40" stroke="#C9A227" strokeWidth="2.5" fill="rgba(201,162,39,0.08)" strokeLinejoin="round" />
      <path d="M14 36 L14 22 L26 22" stroke="#C9A227" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M24 16 L32 36" stroke="#C9A227" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 16 L16 36" stroke="#C9A227" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="17" y1="30" x2="31" y2="30" stroke="#C9A227" strokeWidth="1.8" strokeLinecap="round" />
      <text x="24" y="28" fontSize="7" fill="#C9A227" fontFamily="Playfair Display, serif" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">G</text>
    </svg>
  )
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      {/* Header */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', gap: 32 }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <MasonicLogo size={36} />
            <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 18, color: '#7B1D1D', letterSpacing: '-0.01em' }}>
              Conexão Maçônica
            </span>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }} className="hidden md:flex">
            {NAV.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                style={({ isActive }) => ({
                  fontSize: 14,
                  fontWeight: 500,
                  color: isActive ? '#7B1D1D' : '#374151',
                  padding: '6px 12px',
                  borderRadius: 6,
                  borderBottom: isActive ? '2px solid #7B1D1D' : '2px solid transparent',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                })}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 'auto' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontSize: 14 }} className="hidden md:flex">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              Favoritos
            </button>

            <div style={{ position: 'relative' }} className="hidden md:block">
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 4 }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </button>
              <span style={{ position: 'absolute', top: -2, right: -2, background: '#7B1D1D', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
            </div>

            <Link to="/admin" className="hidden md:flex" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px',
              color: '#374151', fontSize: 13, fontWeight: 500,
            }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#7B1D1D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>ES</div>
              Eduardo Saba
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
            </Link>

            <button style={{
              display: 'flex', alignItems: 'center', gap: 6,
              border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px',
              background: 'none', cursor: 'pointer', color: '#374151', fontSize: 13, fontWeight: 500,
            }} className="hidden md:flex">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Feira de Santana, BA
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            {/* Mobile menu btn */}
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151' }} className="md:hidden">
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {menuOpen ? <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6"/> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ background: '#fff', borderTop: '1px solid #E5E7EB', padding: '12px 24px 16px' }}>
            {NAV.map(l => (
              <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setMenuOpen(false)}
                style={({ isActive }) => ({ display: 'block', padding: '10px 0', fontSize: 15, fontWeight: 500, color: isActive ? '#7B1D1D' : '#374151', borderBottom: '1px solid #F3F4F6' })}>
                {l.label}
              </NavLink>
            ))}
            <Link to="/admin" onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '10px 0', fontSize: 15, fontWeight: 500, color: '#7B1D1D', borderBottom: '1px solid #F3F4F6' }}>
              Admin
            </Link>
          </div>
        )}
      </header>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Footer trust bar */}
      <div style={{ background: '#F9FAFB', borderTop: '1px solid #E5E7EB', padding: '20px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 64, flexWrap: 'wrap' }}>
          {[
            { icon: '🛡️', label: 'Ambiente protegido' },
            { icon: '🔒', label: 'Privacidade e LGPD' },
            { icon: '👥', label: 'Rede verificada' },
          ].map(t => (
            <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontSize: 13, fontWeight: 500 }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </div>
          ))}
        </div>
      </div>

      <footer style={{ background: '#1C1C1C', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
          {['Sobre', 'Suporte', 'Termos', 'Privacidade'].map(l => (
            <a key={l} href="#" style={{ color: '#9CA3AF', fontSize: 13, transition: 'color 0.15s' }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}
