import React from 'react';
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
  'inline-flex items-center justify-center rounded-xl bg-[#4B161B] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#4B161B]/20 transition hover:bg-[#3B0B14]';
const CTA_GHOST =
  'inline-flex items-center justify-center rounded-xl border border-[#4B161B]/25 bg-white px-6 py-3 text-sm font-bold text-[#4B161B] transition hover:border-[#4B161B]/50';

export function LandingHeader({ primaryColor: _primaryColor }: { primaryColor?: string | null }) {
  return (
    <>
      {/* Espaçador responsivo para compensar o header fixo da landing */}
      <div aria-hidden className="h-[64px] sm:h-[72px]" />

      <header
        className="fixed inset-x-0 top-0 z-50 border-b border-[#C9A227]/40 bg-[#4B161B] shadow-lg"
      >
        <div className={`${SECTION} flex items-center justify-between gap-4 py-2`}>
          <Link href="/" aria-label="Conexão Maçônica — página inicial">
            <Image src="/logoconexao_red_vert.png" alt="Conexão Maçônica" width={971} height={208} priority className="h-9 w-auto sm:h-12" />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-white lg:flex">
            <a href="#para-quem" className="text-white transition hover:text-[#C9A227]">Para quem é</a>
            <a href="#diferenciais" className="text-white transition hover:text-[#C9A227]">Diferenciais</a>
            <a href="#mural" className="text-white transition hover:text-[#C9A227]">Mural</a>
            <a href="#resultados" className="text-white transition hover:text-[#C9A227]">Resultados</a>
            <a href="#planos" className="text-white transition hover:text-[#C9A227]">Planos</a>
            <a href="#lancamento" className="text-white transition hover:text-[#C9A227]">Lançamento</a>
            <a href="#faq" className="text-white transition hover:text-[#C9A227]">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/anunciar/passo-1" className="rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-white transition hover:text-[#C9A227]">
              ANUNCIAR
            </Link>
            <Link href="/login" className="inline-flex rounded-xl bg-[#C9A227] px-3.5 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-bold text-[#2a0a10] transition hover:bg-[#e0b92f]">
              ENTRAR
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
            <span className="h-1.5 w-1.5 rounded-full bg-[#C9A227]" /> Tradição que une, conexão que nos fortalece.
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-[#2a0a10] sm:text-5xl lg:text-6xl">
            Muito além de um guia de empresas.{' '}
            <span className="text-[#5d1523]">Uma conexão que gera oportunidades.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-600">
            A Conexão Maçônica aproxima irmãos, cunhadas e sobrinhos, valoriza empresas e profissionais e incentiva novas
            oportunidades por meio de relacionamentos, visibilidade e confiança.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/guia" className={CTA_PRIMARY}>
              Quero encontrar empresas
            </Link>
            <Link href="/anunciar/passo-1" className={CTA_GHOST}>
              Quero divulgar meu negócio
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-stone-600">
            <li>✓ Para toda a família maçônica</li>
            <li>✓ Empresas verificadas</li>
            <li>✓ Painel de desempenho para todos os planos</li>
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
    <section id="lancamento" className="scroll-mt-24 bg-[#4B161B] py-14 text-white sm:py-20">
      <div className={`${SECTION} grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A227]">Lançamento oficial</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Uma noite de relacionamentos, oportunidades e negócios</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-white/80">
            A Conexão Maçônica convida você para uma noite especial de relacionamentos, oportunidades e fortalecimento de negócios.
            Um encontro pensado para aproximar irmãos, cunhadas, familiares e empresários, estimulando parcerias e novas conexões.
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
            Quero participar do evento
          </a>
        </div>
      </div>
    </section>
  );
}

const AUDIENCE = [
  { title: 'Para quem procura', text: 'Encontre produtos, serviços e profissionais de confiança dentro da nossa comunidade, valorizando os laços que nos unem.' },
  { title: 'Para quem oferece', text: 'Apresente sua empresa, clínica, consultoria ou negócio próprio para irmãos e familiares que valorizam relações de confiança.' },
  { title: 'Toda a família maçônica', text: 'Irmãos, cunhadas e sobrinhos participam com as mesmas oportunidades de visibilidade, conexão e indicação mútua.' },
  { title: 'Benefícios e parcerias', text: 'Acesse condições especiais, descubra oportunidades de networking e prestigie iniciativas participantes da rede.' },
];

export function LandingAudienceSection() {
  return (
    <section id="para-quem" className="scroll-mt-24 bg-white py-16 sm:py-24">
      <div className={SECTION}>
        <p className={EYEBROW}>Para quem é</p>
        <h2 className={H2}>Tendo empresa ou não, esta conexão é sua.</h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          A Conexão Maçônica foi criada para aproximar quem procura de quem oferece. Cada irmão ou familiar que utiliza
          o guia, cada empresa que participa e cada relação construída contribuem para fortalecer essa iniciativa.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCE.map((item) => (
            <div key={item.title} className="rounded-2xl border border-stone-200 bg-[#fbf7ee]/60 p-6 transition hover:border-[#C9A227]/60 hover:shadow-md">
              <h3 className="text-lg font-bold text-[#5d1523]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/anunciar/passo-1" className={CTA_PRIMARY}>
            Cadastrar minha empresa
          </Link>
          <Link href="/guia" className={CTA_GHOST}>
            Explorar o guia de empresas
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

const TIER_DISPLAY_ORDER: Record<CommercialPlan['tier'], number> = {
  ouro: 0,
  prata: 1,
  bronze: 2,
};

const PRICING_BY_TIER: Record<
  CommercialPlan['tier'],
  { installments: number; installmentValue: string; inFullValue: string }
> = {
  ouro: { installments: 4, installmentValue: 'R$ 270,00', inFullValue: 'R$ 1.000,00' },
  prata: { installments: 3, installmentValue: 'R$ 285,00', inFullValue: 'R$ 800,00' },
  bronze: { installments: 2, installmentValue: 'R$ 317,50', inFullValue: 'R$ 600,00' },
};

export function LandingPlansSection({ plans }: { plans: CommercialPlan[] }) {
  const sortedPlans = [...plans].sort(
    (a, b) => (TIER_DISPLAY_ORDER[a.tier] ?? 99) - (TIER_DISPLAY_ORDER[b.tier] ?? 99)
  );

  return (
    <section id="planos" className="scroll-mt-24 bg-white py-16 sm:py-24">
      <div className={SECTION}>
        <p className={EYEBROW}>Planos</p>
        <h2 className={H2}>Escolha como sua empresa vai fazer parte desta conexão.</h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          Conheça os planos Esquadro, Compasso e Acácia e escolha a opção de visibilidade e recursos mais adequada ao seu negócio.
        </p>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {sortedPlans.map((plan) => {
            const pricing = PRICING_BY_TIER[plan.tier];
            const installments = plan.installmentsMax ?? pricing.installments;
            const installmentValue = plan.installmentValueCents
              ? formatCentsToReais(plan.installmentValueCents)
              : pricing.installmentValue;
            const inFullCents = plan.payInFullCents ?? plan.pixPriceCents ?? plan.annualPriceCents;
            const inFullValue = inFullCents ? formatCentsToReais(inFullCents) : pricing.inFullValue;
            const highlight = plan.tier === 'ouro' || Boolean(plan.isPopular);
            const badgeLabel = plan.tier === 'ouro' ? 'Mais Completo' : plan.isPopular ? 'Mais Escolhido' : null;

            return (
              <article
                key={plan.tier}
                className={`relative flex flex-col rounded-3xl bg-white p-7 ${highlight ? 'shadow-2xl ring-2 ring-[#C9A227]' : 'shadow-sm ring-1 ring-stone-200'
                  }`}
              >
                {badgeLabel ? (
                  <span className="absolute -top-3 left-7 rounded-full bg-[#C9A227] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#2a0a10]">
                    {badgeLabel}
                  </span>
                ) : null}
                <Image
                  src={SEAL_BY_TIER[plan.tier]}
                  alt={PLAN_SEAL_ALT[plan.tier]}
                  width={160}
                  height={160}
                  className="h-28 w-28 self-start object-contain"
                />
                <h3 className="mt-5 text-2xl font-extrabold text-[#2a0a10]">{plan.name}</h3>
                <p className="mt-1 text-sm text-stone-600">{plan.tagline}</p>

                {/* DESTAQUE PRINCIPAL: VALOR PARCELADO */}
                <div className="mt-6 rounded-2xl bg-[#fbf7ee]/70 p-4 border border-[#C9A227]/30">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#8a6d12]">
                    Parcelado no cartão sem juros
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tracking-tight text-[#5d1523] sm:text-4xl">
                    {installments}x de {installmentValue}
                  </p>
                  <p className="mt-1.5 text-xs font-semibold text-stone-600">
                    ou <span className="text-[#2a0a10] font-bold">{inFullValue}</span> à vista
                  </p>
                </div>

                <ul className="mt-6 flex-1 space-y-2 text-sm text-stone-700">
                  {plan.features
                    .filter((feature) => feature.included)
                    .map((feature) => (
                      <li key={feature.text} className="flex gap-2">
                        <span aria-hidden className="font-bold text-[#8a6d12]">✓</span>
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  <li className="flex gap-2 font-semibold text-[#5d1523]">
                    <span aria-hidden className="font-bold text-[#8a6d12]">✓</span>
                    <span>Painel de desempenho e métricas</span>
                  </li>
                </ul>
                <Link href="/anunciar/passo-1" className={`${highlight ? CTA_PRIMARY : CTA_GHOST} mt-8`}>
                  Escolher {plan.name.replace(/^Plano\s+/i, '')}
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
    <section id="pedra-fundamental" className="scroll-mt-24 bg-gradient-to-br from-[#4B161B] to-[#3B0B14] py-16 text-white sm:py-24">
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
            A Pedra Fundamental é um reconhecimento destinado aos primeiros anunciantes da plataforma, que ajudam a erguer a
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
