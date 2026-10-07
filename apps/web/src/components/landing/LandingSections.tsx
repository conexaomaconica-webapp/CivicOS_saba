import Image from 'next/image';
import Link from 'next/link';
import { formatCentsToReais, type CommercialPlan } from '@/lib/billing/plans-service';

const SEAL_BY_TIER: Record<CommercialPlan['tier'], string> = {
  bronze: '/selos/plano-esquadro.webp',
  prata: '/selos/plano-compasso.webp',
  ouro: '/selos/plano-acacia.webp',
};
const PEDRA_SEAL = '/selos/selo-pedrafundamental.webp';

const PLAN_SEAL_ALT: Record<CommercialPlan['tier'], string> = {
  bronze: 'Selo do Plano Esquadro',
  prata: 'Selo do Plano Compasso',
  ouro: 'Selo do Plano Acácia',
};

const SECTION = 'mx-auto w-full max-w-6xl px-4 sm:px-6';
const EYEBROW = 'text-xs font-bold uppercase tracking-[0.2em] text-[#8a6d12]';
const H2 = 'mt-2 text-3xl font-extrabold tracking-tight text-[#2a0a10] sm:text-4xl';
const CTA_PRIMARY =
  'inline-flex items-center justify-center rounded-xl bg-[#5d1523] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#5d1523]/20 transition hover:bg-[#4B161B]';
const CTA_GHOST =
  'inline-flex items-center justify-center rounded-xl border border-[#5d1523]/25 bg-white px-6 py-3 text-sm font-bold text-[#5d1523] transition hover:border-[#5d1523]/50';

/** "#5d1523" -> "rgba(93,21,35,0.88)"; cor inválida cai no vinho padrão. */
function withAlpha(hex: string | null | undefined, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex ?? '');
  const [rr, gg, bb] = m ? [0, 2, 4].map((i) => parseInt(m[1]!.slice(i, i + 2), 16)) : [93, 21, 35];
  return `rgba(${rr},${gg},${bb},${alpha})`;
}

export function LandingHeader({ primaryColor }: { primaryColor?: string | null }) {
  return (
    <>
      <div aria-hidden className="h-[64px] sm:h-[72px]" />
      <header
        className="fixed inset-x-0 top-0 z-50 border-b border-[#C9A227]/40 shadow-lg backdrop-blur-md"
        style={{ backgroundColor: withAlpha(primaryColor, 0.88) }}
      >
        <div className={`${SECTION} flex items-center justify-between gap-4 py-2`}>
          <Link href="/" aria-label="Conexão Maçônica — página inicial">
            <Image src="/logoconexao_red_vert.png" alt="Conexão Maçônica" width={971} height={208} priority className="h-10 w-auto sm:h-12" />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-white md:flex">
            <a href="#para-quem" className="text-white transition hover:text-[#C9A227]">Para quem é</a>
            <a href="#lancamento" className="text-white transition hover:text-[#C9A227]">Lançamento</a>
            <a href="#planos" className="text-white transition hover:text-[#C9A227]">Planos</a>
            <a href="#pedra-fundamental" className="text-white transition hover:text-[#C9A227]">Pedra Fundamental</a>
            <a href="#faq" className="text-white transition hover:text-[#C9A227]">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/anunciar/passo-1" className="hidden rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:text-[#C9A227] sm:inline-flex">
              Anunciar
            </Link>
            <Link href="/login" className="inline-flex rounded-xl bg-[#C9A227] px-5 py-2 text-sm font-bold text-[#2a0a10] transition hover:bg-[#e0b92f]">
              Entrar
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#fbf7ee] to-white">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#C9A227]/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -left-24 top-40 h-80 w-80 rounded-full bg-[#5d1523]/10 blur-3xl" />
      <div className={`${SECTION} relative grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-[1.15fr_0.85fr]`}>
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#C9A227]/50 bg-white px-3 py-1 text-xs font-bold text-[#8a6d12]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C9A227]" /> Tradição que une! Conexão que fortalece!
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-[#2a0a10] sm:text-5xl lg:text-6xl">
            Seu negócio visto por quem <span className="text-[#5d1523]">confia</span> em você.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-600">
            Conexão Maçônica reúne empresas, profissionais e serviços de maçons, cunhadas e sobrinhos, facilitando conexões por cidade, categoria e segmento.
            Faça parte da Conexão Maçônica e fortaleça a presença da sua empresa.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/anunciar/passo-1" className={CTA_PRIMARY}>
              Quero anunciar minha empresa
            </Link>
            <Link href="/guia" className={CTA_GHOST}>
              Explorar o guia de empresas
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-stone-600">
            <li>✓ Cadastro em poucos minutos</li>
            <li>✓ Pagamento por Pix ou cartão</li>
            <li>✓ Empresas verificadas</li>
          </ul>
        </div>
        <div className="relative mx-auto w-full max-w-sm">
          <div className="rounded-3xl border border-[#C9A227]/30 bg-white p-8 shadow-2xl shadow-[#5d1523]/10">
            <Image
              src={PEDRA_SEAL}
              alt="Selo Pedra Fundamental, reconhecimento dos primeiros anunciantes"
              width={220}
              height={220}
              className="mx-auto h-auto w-56"
              priority
            />
            <p className="mt-6 text-center text-sm font-bold uppercase tracking-widest text-[#8a6d12]">Pedra Fundamental</p>
            <p className="mt-1 text-center text-sm text-stone-600">
              Reconhecimento institucional para quem constrói a plataforma desde o início.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingLaunchSection() {
  return (
    <section id="lancamento" className="scroll-mt-24 bg-[#2a0a10] py-14 text-white sm:py-20">
      <div className={`${SECTION} grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A227]">Convite · Lançamento oficial</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Uma noite de relacionamentos, oportunidades e negócios</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-white/80">
            A Conexão Maçônica convida você para uma noite especial de relacionamentos, oportunidades e fortalecimento de negócios.
            Um encontro pensado para aproximar irmãos, cunhadas, sobrinhos e empresários, estimulando parcerias e novas conexões.
          </p>
          <div className="mt-6 rounded-2xl bg-white/5 p-5 ring-1 ring-[#C9A227]/30">
            <p className="text-sm font-bold text-[#C9A227]">Palestras</p>
            <p className="mt-1 text-sm text-white/85">Liderança Emocional Inteligente e Síndrome dos Pais Culpados</p>
            <p className="mt-1 text-sm text-white/60">com Dr. Alfredo Morais — Psicólogo</p>
          </div>
        </div>
        <div className="rounded-3xl bg-white p-7 text-[#2a0a10] shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[#8a6d12]">Terça-feira</p>
          <p className="mt-1 text-5xl font-extrabold text-[#5d1523]">24</p>
          <p className="text-lg font-bold">de novembro de 2026</p>
          <p className="mt-4 text-sm font-semibold">19h00</p>
          <p className="mt-1 text-sm text-stone-600">Centro de Convenções de Feira de Santana</p>
          <p className="text-sm text-stone-600">Feira de Santana — BA</p>
          <a href="#captacao-lead" className={`${CTA_PRIMARY} mt-6 w-full`}>
            Quero participar
          </a>
        </div>
      </div>
    </section>
  );
}

const AUDIENCE = [
  { title: 'Empresário maçom', text: 'Divulgue sua empresa, seus serviços e suas ofertas para a comunidade que valoriza confiança.' },
  { title: 'Cunhadas', text: 'Negócio próprio, ateliê, clínica ou consultoria? Seu espaço no guia é o mesmo, com a mesma visibilidade.' },
  { title: 'Sobrinhos', text: 'Quem faz parte da família maçônica também pode anunciar e ser indicado por quem já confia.' },
  { title: 'Profissionais liberais', text: 'Advogados, médicos, contadores, arquitetos e prestadores de serviço ganham uma vitrine qualificada.' },
];

export function LandingAudienceSection() {
  return (
    <section id="para-quem" className="scroll-mt-24 bg-white py-16 sm:py-24">
      <div className={SECTION}>
        <p className={EYEBROW}>Para quem é</p>
        <h2 className={H2}>Uma vitrine para toda a família maçônica</h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          Não é preciso ser maçom para anunciar: cunhadas, sobrinhos com negócio próprio também fazem parte.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCE.map((item) => (
            <div key={item.title} className="rounded-2xl border border-stone-200 bg-[#fbf7ee]/60 p-6 transition hover:border-[#C9A227]/60 hover:shadow-md">
              <h3 className="text-lg font-bold text-[#5d1523]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/anunciar/passo-1" className={CTA_PRIMARY}>
            Cadastrar minha empresa
          </Link>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  { title: 'Guia de empresas', text: 'Busca por categoria, cidade e nome, com página própria para cada anunciante.' },
  { title: 'Ofertas e benefícios', text: 'Condições especiais para a comunidade, destacadas no seu perfil.' },
  { title: 'Eventos e novidades', text: 'Divulgue lançamentos, ações e comunicados para quem acompanha o guia.' },
  { title: 'Galeria e serviços', text: 'Fotos, serviços e informações de contato reunidos em um perfil completo.' },
  { title: 'Selos de confiança', text: 'Identificação visual de empresas verificadas e de reconhecimentos institucionais.' },
  { title: 'Painel e métricas', text: 'Acompanhe visualizações e contatos do seu anúncio com dados reais.' },
];

export function LandingFeaturesSection() {
  return (
    <section id="como-funciona" className="scroll-mt-24 bg-[#fbf7ee] py-16 sm:py-24">
      <div className={SECTION}>
        <p className={EYEBROW}>O que você encontra</p>
        <h2 className={H2}>Tudo para sua empresa ser encontrada</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((item, index) => (
            <div key={item.title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5d1523] text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold text-[#2a0a10]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.text}</p>
            </div>
          ))}
        </div>
        <ol className="mt-12 grid gap-4 text-sm font-semibold text-stone-700 sm:grid-cols-3">
          <li className="rounded-xl border border-dashed border-[#C9A227]/70 px-4 py-3">1. Preencha o cadastro da empresa</li>
          <li className="rounded-xl border border-dashed border-[#C9A227]/70 px-4 py-3">2. Escolha seu plano e assine o contrato</li>
          <li className="rounded-xl border border-dashed border-[#C9A227]/70 px-4 py-3">3. Após a aprovação, seu anúncio vai ao ar</li>
        </ol>
      </div>
    </section>
  );
}

export function LandingPlansSection({ plans }: { plans: CommercialPlan[] }) {
  return (
    <section id="planos" className="scroll-mt-24 bg-white py-16 sm:py-24">
      <div className={SECTION}>
        <p className={EYEBROW}>Planos</p>
        <h2 className={H2}>Escolha o plano ideal para o seu negócio</h2>
        <p className="mt-3 max-w-2xl text-stone-600">Vigência anual. Pagamento à vista no Pix ou parcelado no cartão.</p>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const pix = plan.pixPriceCents ?? plan.annualPriceCents;
            const highlight = Boolean(plan.isPopular);
            const installments = plan.installmentsMax && plan.installmentsMax > 1 ? plan.installmentsMax : 0;
            return (
              <article
                key={plan.tier}
                className={`relative flex flex-col rounded-3xl bg-white p-7 ${highlight ? 'shadow-2xl ring-2 ring-[#C9A227]' : 'shadow-sm ring-1 ring-stone-200'
                  }`}
              >
                {highlight ? (
                  <span className="absolute -top-3 left-7 rounded-full bg-[#C9A227] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#2a0a10]">
                    Mais escolhido
                  </span>
                ) : null}
                <Image src={SEAL_BY_TIER[plan.tier]} alt={PLAN_SEAL_ALT[plan.tier]} width={160} height={160} className="h-28 w-28 self-start object-contain" />
                <h3 className="mt-5 text-2xl font-extrabold text-[#2a0a10]">{plan.name}</h3>
                <p className="mt-1 text-sm text-stone-600">{plan.tagline}</p>
                <p className="mt-6 text-4xl font-extrabold tracking-tight text-[#5d1523]">
                  {formatCentsToReais(pix)}
                  <span className="ml-1 text-sm font-semibold text-stone-500">/ano no Pix</span>
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  ou {formatCentsToReais(plan.annualPriceCents)} no cartão{installments ? `, em até ${installments}x sem juros` : ''}
                </p>
                <ul className="mt-6 flex-1 space-y-2 text-sm text-stone-700">
                  {plan.features
                    .filter((feature) => feature.included)
                    .map((feature) => (
                      <li key={feature.text} className="flex gap-2">
                        <span aria-hidden className="font-bold text-[#8a6d12]">✓</span>
                        <span>{feature.text}</span>
                      </li>
                    ))}
                </ul>
                <Link href="/anunciar/passo-1" className={`${highlight ? CTA_PRIMARY : CTA_GHOST} mt-8`}>
                  Assinar {plan.name.replace(/^Plano\s+/i, '')}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function LandingPedraSection() {
  return (
    <section id="pedra-fundamental" className="scroll-mt-24 bg-gradient-to-br from-[#2a0a10] to-[#5d1523] py-16 text-white sm:py-24">
      <div className={`${SECTION} grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]`}>
        <div className="mx-auto w-full max-w-xs rounded-3xl bg-white/5 p-8 ring-1 ring-[#C9A227]/40">
          <Image
            src={PEDRA_SEAL}
            alt="Selo Pedra Fundamental"
            width={260}
            height={260}
            className="mx-auto h-auto w-full max-w-[220px]"
          />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A227]">Reconhecimento institucional</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Pedra Fundamental: os primeiros a acreditar</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-white/80">
            A Pedra Fundamental é um reconhecimento destinado aos primeiros anunciantes da plataforma, que ajudam a erguer o
            Conexão Maçônica desde a base. É uma distinção histórica da empresa, separada dos planos comerciais.
          </p>
          <p className="mt-3 text-sm text-white/60">
            Vagas limitadas
          </p>
          <Link
            href="/anunciar/passo-1"
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#C9A227] px-6 py-3 text-sm font-extrabold text-[#2a0a10] transition hover:bg-[#e0b92f]"
          >
            Quero ser dos primeiros
          </Link>
        </div>
      </div>
    </section>
  );
}

export function LandingFaqSection({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section id="faq" className="scroll-mt-24 bg-[#fbf7ee] py-16 sm:py-24">
      <div className={`${SECTION} max-w-3xl`}>
        <p className={EYEBROW}>Dúvidas frequentes</p>
        <h2 className={H2}>Perguntas e respostas</h2>
        <div className="mt-8 space-y-3">
          {items.map((item) => (
            <details key={item.q} className="group rounded-2xl bg-white p-5 ring-1 ring-stone-200 open:shadow-md">
              <summary className="cursor-pointer list-none font-bold text-[#2a0a10] marker:hidden">{item.q}</summary>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
