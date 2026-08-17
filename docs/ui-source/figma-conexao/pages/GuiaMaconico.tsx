import { useState } from 'react'

type Category = 'simbolos' | 'historia' | 'graus' | 'virtudes' | 'lojas'

const categories: { id: Category; label: string; icon: string }[] = [
  { id: 'simbolos', label: 'Símbolos', icon: '△' },
  { id: 'historia', label: 'História', icon: '📜' },
  { id: 'graus', label: 'Graus', icon: '⬆' },
  { id: 'virtudes', label: 'Virtudes', icon: '✦' },
  { id: 'lojas', label: 'Estrutura', icon: '🏛️' },
]

const content: Record<Category, { title: string; items: { title: string; body: string; detail?: string }[] }> = {
  simbolos: {
    title: 'Símbolos Maçônicos',
    items: [
      { title: 'O Esquadro e o Compasso', body: 'Os dois instrumentos mais reconhecíveis da Maçonaria. O esquadro representa a retidão de conduta e a moralidade; o compasso, a temperança e a circunspecção. Juntos simbolizam o equilíbrio entre matéria e espírito.', detail: 'O esquadro é o instrumento do Venerável Mestre e representa a ética da ação. O compasso é atributo do Grão-Mestre e simboliza a contenção dos desejos.' },
      { title: 'A Letra G', body: 'Inscrita entre o esquadro e o compasso, representa simultaneamente Geometria — a ciência sagrada dos construtores medievais — e Deus/Grande Arquiteto do Universo em todas as obediências.', detail: 'A geometria era considerada a ciência divina por excelência. Por meio dela os mestres construtores erguiam catedrais, templos e palácios que apontavam para o céu.' },
      { title: 'A Acácia', body: 'Planta sagrada da Maçonaria, símbolo da imortalidade da alma e da esperança além da morte. Segundo a lenda, uma ramagem de acácia marcava o local onde o Mestre Hiram Abiff foi sepultado.', detail: 'A acácia não murcha facilmente, mantendo-se verde por muito tempo após ser cortada, o que a tornou o símbolo perfeito da vida após a morte.' },
      { title: 'O Avental', body: 'A peça mais importante das insígnias maçônicas. Herança dos construtores medievais, é a primeira distinção conferida ao iniciado. Branco na origem, vai sendo adornado conforme o avanço nos graus.', detail: 'No grau de Aprendiz é liso e branco. No de Companheiro, ganha uma dobra azul. No de Mestre, torna-se mais ornamentado.' },
      { title: 'O Nível e o Prumo', body: 'O nível indica a igualdade entre os irmãos — todos estão no mesmo plano diante da lei fraternal. O prumo representa a retidão vertical, a busca pela perfeição moral.', detail: 'O nível é atributo do Segundo Vigilante; o prumo, do Primeiro Vigilante. Cada ferramenta de trabalho possui um guardião e um ensinamento específico.' },
      { title: 'O Triângulo', body: 'Figura geométrica de profundo simbolismo: na Maçonaria representa a Trindade (Sabedoria, Força e Beleza), as três luzes do templo e os três primeiros graus simbólicos.', detail: 'O triângulo equilátero, com seus três lados e três ângulos iguais, é símbolo de perfeição e equilíbrio.' },
    ],
  },
  historia: {
    title: 'História da Maçonaria',
    items: [
      { title: 'As Origens Lendárias', body: 'A lenda operativa situa as origens na construção do Templo de Salomão, séc. X a.C. O Rei Salomão, Hiram de Tiro e o Arquiteto Hiram Abiff formam a trindade fundadora da tradição maçônica.', detail: 'Hiram Abiff, ao recusar revelar a palavra de um Mestre Maçom, foi morto por três companheiros, tornando-se o mártir e símbolo central da iniciação ao 3° grau.' },
      { title: 'Os Construtores Medievais', body: 'As corporações medievais de construtores de catedrais (Freemasons) possuíam segredos profissionais, linguagens cifradas e rituais de iniciação. Eram itinerantes e protegidos por cartas reais.', detail: 'As Antigas Obrigações (Old Charges), o mais antigo documento maçônico, data de 1390.' },
      { title: 'A Fundação da Grande Loja', body: 'Em 24 de junho de 1717, quatro lojas de Londres fundaram a primeira Grande Loja da história, iniciando a Maçonaria especulativa moderna.', detail: 'Os Livros de Constituições de James Anderson (1723) codificaram os princípios e estrutura da Maçonaria moderna.' },
      { title: 'A Maçonaria no Brasil', body: 'A Maçonaria chegou ao Brasil no período colonial. Teve papel crucial na Independência (1822), na Abolição (1888) e na Proclamação da República (1889).', detail: 'Dom Pedro I, José Bonifácio, Joaquim Nabuco e Ruy Barbosa são alguns dos mais célebres maçons da história brasileira.' },
      { title: 'A Maçonaria Moderna', body: 'Hoje existem mais de 6 milhões de maçons no mundo. No Brasil, estima-se que haja mais de 300 mil irmãos ativos em milhares de lojas por todo o país.', detail: 'As principais obediências são o Grande Oriente do Brasil (GOB) e o Supremo Conselho do Brasil (SCB).' },
    ],
  },
  graus: {
    title: 'Os Graus Maçônicos',
    items: [
      { title: 'Aprendiz (1° Grau)', body: 'O primeiro grau da Maçonaria simbólica. O Aprendiz representa a pedra bruta que deve ser aparelhada. É o período de observação, silêncio e aprendizado. Duração mínima: 1 ano.', detail: 'O Aprendiz aprende a controlar suas paixões e a entender a simbologia do templo. Sua ferramenta é a régua de 24 polegadas.' },
      { title: 'Companheiro (2° Grau)', body: 'O Companheiro representa a pedra aparelhada. É o grau do estudo e da aplicação das ciências liberais. Amplia-se o campo da pesquisa filosófica e histórica.', detail: 'As sete artes liberais (gramática, retórica, lógica, aritmética, geometria, música e astronomia) são o campo de estudo do Companheiro.' },
      { title: 'Mestre Maçom (3° Grau)', body: 'O terceiro e último grau da câmara simbólica. A iniciação ao grau de Mestre é o ritual mais solene e profundo da Maçonaria, baseado na lenda de Hiram Abiff.', detail: '"Ser Mestre é morrer e renascer." O Mestre Maçom aprende que a morte é passagem, não fim.' },
      { title: 'Graus Capitulares (4° a 18°)', body: 'No Rito Escocês Antigo e Aceito, os graus 4 a 18 exploram a filosofia hermética, a alquimia espiritual e a reconstrução do Templo de Salomão.', detail: 'O 18° grau, Cavaleiro Rosa-Cruz, é um dos mais prestigiados, com liturgia de forte conteúdo cristológico.' },
      { title: 'Graus Superiores (19° a 33°)', body: 'Os graus 19 a 32 aprofundam questões filosóficas e históricas. O 33°, honorífico, é o mais alto honor do Rito Escocês, conferido a maçons de excepcional mérito.', detail: 'Há apenas poucos centenas de detentores do 33° grau no mundo inteiro.' },
    ],
  },
  virtudes: {
    title: 'As Grandes Virtudes',
    items: [
      { title: 'Liberdade', body: 'A Maçonaria nasceu no iluminismo como defensora da liberdade de pensamento, consciência e crença. Nenhum maçom pode ser compelido a revelar sua fé, partido ou convicção.', detail: 'A Maçonaria não discute política ou religião nos templos, pois esses temas são fonte de divisão. O objetivo é encontrar o que une os homens.' },
      { title: 'Igualdade', body: 'No templo, reis e plebeus, ricos e pobres se encontram em pé de igualdade. O avental branco uniformiza todos. A hierarquia maçônica é baseada em virtude e conhecimento.', detail: 'O lema "Liberté, Égalité, Fraternité" tem fortes raízes maçônicas e influenciou as constituições liberais do século XIX.' },
      { title: 'Fraternidade', body: 'O vínculo fraternal entre os irmãos transcende fronteiras, idiomas e culturas. Um maçom viajante pode bater à porta de qualquer loja regular no mundo e ser recebido como irmão.', detail: 'Em muitos contextos históricos, maçons de lados opostos pararam de lutar para socorrer um irmão ferido.' },
      { title: 'Sabedoria', body: 'Uma das três grandes colunas do templo (ao lado de Força e Beleza), a Sabedoria é atributo do Venerável Mestre. O maçom busca continuamente o aprimoramento intelectual e moral.', detail: '"Conhece-te a ti mesmo" (gnôthi seauton), máxima do Oráculo de Delfos, é princípio central da jornada maçônica.' },
      { title: 'Beneficência', body: 'A prática da caridade é obrigação e prazer do maçom. Muitas lojas mantêm fundos de auxílio fraternal e desenvolvem projetos sociais para as comunidades onde estão inseridas.', detail: 'Historicamente, a Maçonaria criou orfanatos, hospitais, escolas e outros projetos sociais em todo o mundo.' },
    ],
  },
  lojas: {
    title: 'Estrutura e Organização',
    items: [
      { title: 'A Loja', body: 'A loja é a célula base da Maçonaria, onde os trabalhos rituais são realizados. Para funcionar, precisa de ao menos sete Mestres Maçons. Reúne-se regularmente, geralmente mensalmente.', detail: 'O templo é orientado simbolicamente: o Oriente (Leste) onde fica o Venerável Mestre, o Ocidente onde ficam os Vigilantes.' },
      { title: 'O Venerável Mestre', body: 'O presidente da loja, eleito anualmente pelos irmãos. Dirige os trabalhos, confere os graus e representa a loja perante a Grande Loja.', detail: 'O VM senta-se no Oriente, o leste simbólico do templo. Usa o chapéu como símbolo de autoridade.' },
      { title: 'A Grande Loja', body: 'Organismo soberano que superintende e governa as lojas de sua jurisdição. No Brasil, cada estado tem uma Grande Loja estadual. O Grande Oriente do Brasil é a principal potência nacional.', detail: 'A regularidade maçônica exige reconhecimento pela Grande Loja da Inglaterra (UGLE), a mãe das grandes lojas modernas.' },
      { title: 'Os Ritos', body: 'O rito é o conjunto de procedimentos cerimoniais usados nos trabalhos maçônicos. No Brasil, os principais são o REAA, o Rito York, o Rito Brasileiro e o Rito Moderno.', detail: 'Os três primeiros graus simbólicos (Aprendiz, Companheiro e Mestre) são comuns a todos os ritos.' },
      { title: 'O Grande Arquiteto do Universo', body: 'Designação maçônica para o Ser Supremo, usada para permitir que homens de todas as crenças possam reunir-se sob um mesmo teto fraternal.', detail: 'A Maçonaria exige apenas a crença em um Princípio Superior, sem definir sua natureza — neutralidade filosófica revolucionária para os séculos XVII e XVIII.' },
    ],
  },
}

export default function GuiaMaconico() {
  const [activeCategory, setActiveCategory] = useState<Category>('simbolos')
  const [expandedItem, setExpandedItem] = useState<number | null>(null)
  const current = content[activeCategory]

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg, #4A0E0E 0%, #7B1D1D 100%)', padding: '48px 24px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0 L40 20 L20 40 L0 20 Z' fill='none' stroke='%23C9A227' stroke-width='0.8'/%3E%3C/svg%3E")`, backgroundSize: '40px 40px' }} />
        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 40, color: '#F5E6C8', marginBottom: 8 }}>
            Guia Maçônico
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginBottom: 32 }}>
            Conhecimento fraternal ao alcance de todos os irmãos
          </p>

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setExpandedItem(null) }}
                style={{
                  padding: '10px 20px', background: activeCategory === cat.id ? '#FFFFFF' : 'transparent',
                  color: activeCategory === cat.id ? '#7B1D1D' : 'rgba(255,255,255,0.65)',
                  border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                <span>{cat.icon}</span> {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '36px 24px 64px' }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1C1C1C', marginBottom: 8 }}>
          {current.title}
        </h2>
        <div style={{ width: 40, height: 3, background: '#C9A227', marginBottom: 28, borderRadius: 2 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 800 }}>
          {current.items.map((item, i) => (
            <div
              key={i}
              style={{
                border: expandedItem === i ? '1px solid #C9A22766' : '1px solid #E5E7EB',
                borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.15s',
              }}
            >
              <button
                onClick={() => setExpandedItem(expandedItem === i ? null : i)}
                style={{
                  width: '100%', background: expandedItem === i ? '#FFFDF0' : '#FAFAFA',
                  border: 'none', padding: '16px 20px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', cursor: 'pointer', gap: 12, textAlign: 'left',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 6,
                    background: expandedItem === i ? '#C9A22722' : '#F3F4F6',
                    border: `1px solid ${expandedItem === i ? '#C9A22766' : '#E5E7EB'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#7B1D1D', fontSize: 13, fontWeight: 800, flexShrink: 0,
                    fontFamily: 'Playfair Display, serif',
                    transition: 'all 0.15s',
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontFamily: 'Playfair Display, serif', color: '#1C1C1C', fontSize: 16 }}>
                    {item.title}
                  </span>
                </div>
                <span style={{
                  color: '#7B1D1D', fontSize: 18, lineHeight: 1, flexShrink: 0,
                  transform: expandedItem === i ? 'rotate(45deg)' : 'none',
                  transition: 'transform 0.2s',
                }}>
                  +
                </span>
              </button>

              {expandedItem === i && (
                <div style={{ padding: '0 20px 20px 66px', background: '#FFFDF0' }}>
                  <p style={{ color: '#4B5563', fontSize: 14, lineHeight: 1.75, marginBottom: item.detail ? 14 : 0 }}>
                    {item.body}
                  </p>
                  {item.detail && (
                    <div style={{ borderLeft: '3px solid #C9A22766', paddingLeft: 14 }}>
                      <p style={{ color: '#6B7280', fontSize: 13, lineHeight: 1.7, fontStyle: 'italic' }}>
                        {item.detail}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quote */}
        <div style={{
          marginTop: 48, padding: '32px 40px',
          border: '1px solid #C9A22733',
          borderRadius: 10, background: '#FFFDF0', textAlign: 'center', maxWidth: 800,
        }}>
          <div style={{ color: '#C9A227', fontSize: 32, marginBottom: 10, fontFamily: 'Playfair Display, serif' }}>"</div>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 17, color: '#1C1C1C', fontStyle: 'italic', lineHeight: 1.6, maxWidth: 560, margin: '0 auto 14px' }}>
            A Maçonaria não é uma religião, mas é religiosa. Não é uma filosofia, mas é filosófica. Não é uma ciência, mas é científica.
          </p>
          <p style={{ color: '#9CA3AF', fontSize: 12 }}>— Albert Pike, Morals and Dogma</p>
        </div>
      </div>
    </div>
  )
}
