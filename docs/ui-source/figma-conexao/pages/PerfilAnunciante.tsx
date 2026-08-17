import { useParams, Link } from 'react-router-dom'

const anunciantes = [
  {
    id: 1, tier: 'ouro', name: 'Advocacia Ferreiro & Irmãos', category: 'Jurídico',
    estado: 'SP', cidade: 'São Paulo', bairro: 'Consolação',
    desc: 'Escritório especializado em direito civil, empresarial e trabalhista com mais de 15 anos de tradição na comunidade maçônica. Atendimento diferenciado, sigilo profissional absoluto e condições especiais para irmãos e seus dependentes.',
    img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=350&fit=crop&auto=format',
    contato: '(11) 3456-7890',
    email: 'contato@ferreiroirmaos.adv.br',
    site: 'www.ferreiroirmaos.adv.br',
    responsavel: 'Ir. João Ferreiro',
    grau: '32°',
    loja: 'Loja Justiça e Equidade nº 48 · GLESP',
    horario: 'Segunda a sexta, 9h–18h',
    servicos: ['Direito Civil', 'Direito Empresarial', 'Direito Trabalhista', 'Inventários e Heranças', 'Contratos Comerciais', 'Recuperação Judicial'],
    fotos: [
      'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=240&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1521791055366-0d553872952f?w=400&h=240&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=240&fit=crop&auto=format',
    ],
    beneficios: ['30% de desconto na consulta inicial', 'Parcelamento sem juros', 'Atendimento prioritário para irmãos', 'Sigilo maçônico garantido'],
    avaliacoes: [
      { nome: 'Ir. Marcos A.', nota: 5, texto: 'Excelente atendimento, profissionalismo inigualável.' },
      { nome: 'Ir. Sérgio L.', nota: 5, texto: 'Resolveram meu caso trabalhista com muita competência.' },
    ],
  },
  {
    id: 2, tier: 'ouro', name: 'Clínica Saúde & Luz', category: 'Saúde',
    estado: 'MG', cidade: 'Belo Horizonte', bairro: 'Savassi',
    desc: 'Clínica multidisciplinar com medicina, odontologia e psicologia. Desconto especial para irmãos e dependentes. Mais de 12 especialidades médicas.',
    img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=350&fit=crop&auto=format',
    contato: '(31) 9876-5432', email: 'contato@saudeluz.com.br', site: 'www.saudeluz.com.br',
    responsavel: 'Dr. Ir. Paulo Fonseca', grau: '18°', loja: 'Loja Estrela do Norte nº 22 · GLMG',
    horario: 'Segunda a sábado, 7h–20h',
    servicos: ['Clínica Geral', 'Cardiologia', 'Odontologia', 'Psicologia', 'Ortopedia', 'Dermatologia'],
    fotos: [
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=240&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=240&fit=crop&auto=format',
    ],
    beneficios: ['20% de desconto em consultas', 'Exames com preço especial', 'Fila prioritária', 'Plano familiar reduzido'],
    avaliacoes: [
      { nome: 'Ir. Ricardo B.', nota: 5, texto: 'Atendimento de primeira. Recomendo a todos os irmãos.' },
    ],
  },
  {
    id: 3, tier: 'prata', name: 'Construtora Triângulo', category: 'Construção',
    estado: 'RJ', cidade: 'Rio de Janeiro', bairro: 'Barra da Tijuca',
    desc: 'Construção civil, reformas e projetos arquitetônicos. Mais de 20 anos de experiência na fraternidade.',
    img: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&h=350&fit=crop&auto=format',
    contato: '(21) 2345-6789', email: 'contato@construtoratriangulo.com.br', site: 'www.construtoratriangulo.com.br',
    responsavel: 'Ir. Antônio Silva', grau: 'MM', loja: 'Loja Trabalho e Virtude nº 17 · GLRJ',
    horario: 'Segunda a sexta, 8h–17h',
    servicos: ['Construção Residencial', 'Construção Comercial', 'Reformas', 'Projetos Arquitetônicos', 'Laudos Técnicos'],
    fotos: [
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=240&fit=crop&auto=format',
    ],
    beneficios: ['Orçamento gratuito', '5% de desconto para irmãos', 'Garantia estendida'],
    avaliacoes: [],
  },
]

const tierConfig = {
  ouro: {
    label: 'Ouro', color: '#d4a017', bg: 'rgba(212,160,23,0.1)', border: '#d4a01744',
    badge: 'linear-gradient(135deg, #d4a017, #f5d98a)',
    features: ['Perfil Premium', 'Topo da Busca', 'Banner na Home', 'Analytics'],
  },
  prata: {
    label: 'Prata', color: '#c0c8d4', bg: 'rgba(192,200,212,0.08)', border: '#c0c8d444',
    badge: 'linear-gradient(135deg, #a8b2be, #e0e6ed)',
    features: ['Perfil Completo', 'Galeria de Fotos', 'Destaque Mensal', 'Suporte Prioritário'],
  },
  bronze: {
    label: 'Bronze', color: '#cd7f32', bg: 'rgba(205,127,50,0.08)', border: '#cd7f3244',
    badge: 'linear-gradient(135deg, #cd7f32, #e8a462)',
    features: ['Perfil Básico', 'Logo e Contato', '1 Foto', 'Listagem Regional'],
  },
}

export default function PerfilAnunciante() {
  const { id } = useParams()
  const anunciante = anunciantes.find(a => a.id === Number(id))

  if (!anunciante) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1e' }}>
        <div className="text-center">
          <p style={{ color: '#a8b2be', fontSize: 18, marginBottom: 16 }}>Anunciante não encontrado.</p>
          <Link to="/anunciantes" style={{ color: '#d4a017' }}>← Voltar para Anunciantes</Link>
        </div>
      </div>
    )
  }

  const cfg = tierConfig[anunciante.tier as keyof typeof tierConfig]

  return (
    <div style={{ background: '#0a0f1e', minHeight: '100vh' }}>
      {/* Hero image */}
      <div style={{ position: 'relative', height: 300, background: '#111e3a', overflow: 'hidden' }}>
        <img src={anunciante.img} alt={anunciante.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0a0f1e 0%, rgba(10,15,30,0.4) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <div className="max-w-6xl mx-auto px-6 pb-6">
            <Link
              to="/anunciantes"
              style={{ color: '#a8b2be', fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}
            >
              ← Voltar para Anunciantes
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-20">
        {/* Profile header */}
        <div style={{ marginTop: -60, position: 'relative', zIndex: 2, marginBottom: 40 }}>
          <div
            style={{
              background: '#0d1529',
              border: `1px solid ${cfg.border}`,
              borderRadius: 10,
              padding: '28px 32px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 24,
              alignItems: 'flex-start',
            }}
          >
            {/* Avatar / badge */}
            <div style={{
              width: 80, height: 80, borderRadius: 8,
              background: cfg.bg,
              border: `2px solid ${cfg.color}66`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <CategoryIcon category={anunciante.category} color={cfg.color} />
            </div>

            <div style={{ flex: 1 }}>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span style={{
                  padding: '3px 10px',
                  background: cfg.bg,
                  border: `1px solid ${cfg.color}66`,
                  borderRadius: 3,
                  color: cfg.color,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                }}>
                  ✦ Plano {cfg.label}
                </span>
                <span style={{ color: '#6b7a96', fontSize: 11 }}>
                  {anunciante.category} · {anunciante.cidade}, {anunciante.estado}
                </span>
              </div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', color: '#f5d98a', fontSize: 28, marginBottom: 6 }}>
                {anunciante.name}
              </h1>
              <p style={{ color: '#a8b2be', fontSize: 13, lineHeight: 1.6 }}>
                {anunciante.desc}
              </p>
            </div>

            {/* Contact box */}
            <div style={{
              background: '#111e3a',
              border: `1px solid ${cfg.border}`,
              borderRadius: 8,
              padding: '16px 20px',
              minWidth: 200,
            }}>
              <div style={{ color: cfg.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Contato
              </div>
              <div style={{ color: '#e8e4d8', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                📞 {anunciante.contato}
              </div>
              <div style={{ color: '#a8b2be', fontSize: 12, marginBottom: 4 }}>
                ✉️ {anunciante.email}
              </div>
              <div style={{ color: '#a8b2be', fontSize: 12, marginBottom: 12 }}>
                🌐 {anunciante.site}
              </div>
              <button style={{
                width: '100%',
                background: cfg.color,
                color: '#0a0f1e',
                border: 'none',
                borderRadius: 4,
                padding: '9px 0',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                letterSpacing: '0.05em',
              }}>
                Entrar em Contato
              </button>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="md:col-span-2 flex flex-col gap-8">
            {/* Services */}
            <section style={{ background: '#0d1529', border: '1px solid #1e305e', borderRadius: 8, padding: '24px 28px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#f5d98a', fontSize: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: cfg.color }}>✦</span> Serviços Oferecidos
              </h2>
              <div className="flex flex-wrap gap-2">
                {anunciante.servicos.map(s => (
                  <span key={s} style={{
                    padding: '5px 12px',
                    background: cfg.bg,
                    border: `1px solid ${cfg.color}33`,
                    borderRadius: 4,
                    color: cfg.color,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    {s}
                  </span>
                ))}
              </div>
            </section>

            {/* Photos (ouro only) */}
            {anunciante.tier === 'ouro' && anunciante.fotos.length > 1 && (
              <section style={{ background: '#0d1529', border: '1px solid #1e305e', borderRadius: 8, padding: '24px 28px' }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#f5d98a', fontSize: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: cfg.color }}>✦</span> Galeria
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {anunciante.fotos.map((f, i) => (
                    <div key={i} style={{ borderRadius: 6, overflow: 'hidden', aspectRatio: '4/3', background: '#111e3a' }}>
                      <img src={f} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Benefits */}
            <section style={{ background: '#0d1529', border: '1px solid #1e305e', borderRadius: 8, padding: '24px 28px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#f5d98a', fontSize: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: cfg.color }}>✦</span> Benefícios para Irmãos
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {anunciante.beneficios.map(b => (
                  <li key={b} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderBottom: '1px solid #1e305e',
                    color: '#c0c8d4',
                    fontSize: 13,
                  }}>
                    <span style={{ color: cfg.color, fontSize: 16 }}>★</span>
                    {b}
                  </li>
                ))}
              </ul>
            </section>

            {/* Reviews */}
            {anunciante.avaliacoes.length > 0 && (
              <section style={{ background: '#0d1529', border: '1px solid #1e305e', borderRadius: 8, padding: '24px 28px' }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#f5d98a', fontSize: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: cfg.color }}>✦</span> Avaliações
                </h2>
                {anunciante.avaliacoes.map((r, i) => (
                  <div key={i} style={{ borderBottom: '1px solid #1e305e', paddingBottom: 14, marginBottom: 14 }}>
                    <div className="flex items-center justify-between mb-6">
                      <span style={{ fontFamily: 'Playfair Display, serif', color: '#f5d98a', fontSize: 13 }}>{r.nome}</span>
                      <span style={{ color: '#d4a017' }}>{'★'.repeat(r.nota)}</span>
                    </div>
                    <p style={{ color: '#a8b2be', fontSize: 13, fontStyle: 'italic' }}>"{r.texto}"</p>
                  </div>
                ))}
              </section>
            )}
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-6">
            {/* Responsible mason */}
            <div style={{ background: '#0d1529', border: `1px solid ${cfg.border}`, borderRadius: 8, padding: '20px 24px' }}>
              <div style={{ color: cfg.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
                Responsável Maçom
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: `1px solid ${cfg.color}66`,
                  background: cfg.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: cfg.color, fontWeight: 800, fontSize: 13,
                }}>
                  {anunciante.grau}
                </div>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', color: '#f5d98a', fontSize: 14 }}>
                    {anunciante.responsavel}
                  </div>
                  <div style={{ color: '#6b7a96', fontSize: 11, marginTop: 2 }}>{anunciante.loja}</div>
                </div>
              </div>
            </div>

            {/* Info */}
            <div style={{ background: '#0d1529', border: '1px solid #1e305e', borderRadius: 8, padding: '20px 24px' }}>
              <div style={{ color: '#d4a017', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
                Informações
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <InfoRow icon="📍" label="Endereço" value={`${anunciante.bairro}, ${anunciante.cidade} - ${anunciante.estado}`} />
                <InfoRow icon="🕐" label="Horário" value={anunciante.horario} />
                <InfoRow icon="🏷️" label="Categoria" value={anunciante.category} />
              </div>
            </div>

            {/* Tier badge */}
            <div style={{ background: cfg.bg, border: `1px solid ${cfg.color}44`, borderRadius: 8, padding: '20px 24px' }}>
              <div style={{ color: cfg.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
                Plano {cfg.label}
              </div>
              {cfg.features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${cfg.color}22`, color: '#c0c8d4', fontSize: 12 }}>
                  <span style={{ color: cfg.color }}>✦</span> {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div>
      <div style={{ color: '#6b7a96', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
        {icon} {label}
      </div>
      <div style={{ color: '#c0c8d4', fontSize: 12 }}>{value}</div>
    </div>
  )
}

function CategoryIcon({ category, color }: { category: string; color: string }) {
  const icons: Record<string, string> = {
    'Jurídico': '⚖️', 'Saúde': '⚕️', 'Construção': '🏗️',
    'Cultura': '📚', 'Joias': '💎', 'Gastronomia': '🍽️',
    'Seguros': '🛡️', 'Tecnologia': '💻',
  }
  return (
    <span style={{ fontSize: 32 }}>{icons[category] ?? '🏢'}</span>
  )
}
