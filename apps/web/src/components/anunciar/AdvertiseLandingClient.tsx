'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Check,
  Minus,
  ClipboardList,
  FileCheck2,
  LayoutList,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Building2,
  Smartphone,
  Handshake,
  Tag,
  Calendar,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';
import {
  formatCentsToReais,
  computeMonthlyEquivalenceText,
} from '@/lib/billing/plans-service';
import {
  buildOnboardingEntryUrl,
  toPublicPlanSlug,
  type CanonicalPlanTier,
  type PublicAdvertisePlan,
} from '@/lib/billing/advertise-landing';
import { trackGa } from '@/lib/analytics/ga';

interface AdvertiseLandingClientProps {
  appName: string;
  logoUrl: string | null;
  plans: PublicAdvertisePlan[];
  attributionParams: Record<string, string>;
  continueStepHref: string | null;
  continueBusinessName: string | null;
  pricingDisplayMode?: 'collapsed' | 'visible';
}

const SEAL_BY_TIER: Record<CanonicalPlanTier, { src: string; alt: string }> = {
  bronze: { src: '/selos/plano-esquadro.webp', alt: 'Selo Oficial Plano Esquadro' },
  prata: { src: '/selos/plano-compasso.webp', alt: 'Selo Oficial Plano Compasso' },
  ouro: { src: '/selos/plano-acacia.webp', alt: 'Selo Oficial Plano Acácia' },
};

const PLAN_ORDER: Record<CanonicalPlanTier, number> = { bronze: 0, ouro: 1, prata: 2 };

const PRIMARY_BUTTON = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#4B161B] font-bold text-white hover:bg-[#301015] motion-safe:transition-colors motion-safe:duration-200';
const GOLD_BUTTON = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#C9A227] font-bold text-[#301015] hover:bg-[#DFBD58] motion-safe:transition-colors motion-safe:duration-200';
const ICON_TILE = 'flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#F0EBE2] text-[#4B161B]';

// Public plan copy can contain decorative emoji supplied by the catalog.
function withoutEmoji(value: string) {
  return value.replace(/(?:[0-9#*]\uFE0F?\u20E3|[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\uFE0F\u200D])+/gu, '').trim();
}

const PLATFORM_PILLARS = [
  {
    icon: Building2,
    title: 'Guia de Empresas',
    description: 'Presença estruturada por cidade, categoria, serviços e vínculo maçônico verificado.',
  },
  {
    icon: Smartphone,
    title: 'Aplicativos Android e iOS',
    description: 'Sua empresa acessível no bolso dos Irmãos e familiares em todo o Brasil.',
  },
  {
    icon: Handshake,
    title: 'Mural de Conexões',
    description: 'Negócios reais recomendados e validados pela família maçônica.',
  },
  {
    icon: Tag,
    title: 'Clube de Vantagens',
    description: 'Publique ofertas exclusivas e acompanhe resgates de vouchers diretamente no painel.',
  },
  {
    icon: Calendar,
    title: 'Eventos e Lojas',
    description: 'Divulgação de eventos empresariais, encontros e integração com o guia de oficinas.',
  },
  {
    icon: TrendingUp,
    title: 'Relacionamento e Confiança',
    description: 'Ambiente qualificado onde reputação e fraternidade fortalecem novos negócios.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '1',
    icon: LayoutList,
    title: 'Escolha seu plano',
    description: 'Compare os recursos de Esquadro, Acácia e Compasso e selecione a modalidade ideal.',
  },
  {
    step: '2',
    icon: ClipboardList,
    title: 'Cadastre sua empresa',
    description: 'Informe os dados do responsável, da empresa e o vínculo maçônico para validação.',
  },
  {
    step: '3',
    icon: FileCheck2,
    title: 'Conclua a contratação',
    description: 'Confirme o plano escolhido, assine o termo digital e ative sua presença no Guia.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Como funciona o cadastro da empresa?',
    a: 'Você escolhe o plano desejado, preenche os dados do responsável e da empresa, informa o vínculo maçônico e finaliza a contratação online.',
  },
  {
    q: 'Posso alterar o plano antes ou depois de iniciar o cadastro?',
    a: 'Sim. Ao clicar em um plano aqui, ele já vai pré-selecionado para o onboarding, mas você pode alterá-lo livremente na etapa de confirmação antes do contrato.',
  },
  {
    q: 'Quais formas de pagamento estão disponíveis?',
    a: 'As condições vigentes de pagamento à vista (PIX) e parcelamento no cartão são exibidas conforme a regra comercial oficial de cada plano.',
  },
  {
    q: 'Onde minha empresa será exibida após a ativação?',
    a: 'Sua empresa passa a constar no Guia Comercial da Conexão Maçônica na Web e nos aplicativos oficiais para Android e iOS.',
  },
];

export default function AdvertiseLandingClient({
  appName,
  logoUrl,
  plans,
  attributionParams,
  continueStepHref,
  continueBusinessName,
  pricingDisplayMode = 'collapsed',
}: AdvertiseLandingClientProps) {
  const [expandedPricing, setExpandedPricing] = useState<Record<string, boolean>>({});
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const togglePricing = (tier: string) => {
    setExpandedPricing((prev) => ({ ...prev, [tier]: !prev[tier] }));
  };

  const handleSelectPlan = (tier: CanonicalPlanTier) => {
    const slug = toPublicPlanSlug(tier);
    trackGa('generate_lead', {
      source_page: 'anunciar_landing',
      lead_type: 'advertise_plan_select',
      plan_interest: slug,
    });
  };

  const orderedPlans = [...plans].sort((a, b) => PLAN_ORDER[a.tier] - PLAN_ORDER[b.tier]);
  const registrationHref = continueStepHref || buildOnboardingEntryUrl(null, attributionParams);
  const allFeatureRows = Array.from(
    new Set(orderedPlans.flatMap((plan) => plan.features.map((f) => f.text))),
  );

  return (
    <div className="min-h-screen bg-[#F8F5EF] font-sans text-[#625B55] selection:bg-[#C9A227]/30">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#DED5C7] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-16 flex items-center justify-between gap-2 py-2 sm:gap-4">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <Image
              src={logoUrl || '/logoconexao_red_vert.png'}
              alt={appName}
              width={36}
              height={36}
              unoptimized
              className="size-9 shrink-0 object-contain"
            />
            <span className="font-bold text-sm sm:text-base tracking-tight text-[#4B161B] truncate">
              {appName}
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-3">
            <a
              href="#planos"
              className="hidden sm:inline-flex items-center px-3.5 py-2 rounded-full text-xs font-semibold text-[#4B161B] hover:bg-[#F0EBE2] motion-safe:transition-colors motion-safe:duration-200"
            >
              Conhecer planos
            </a>
            <Link
              href={registrationHref}
              className={PRIMARY_BUTTON + " min-h-11 px-3 text-xs sm:px-4"}
            >
              <span>{continueStepHref ? 'Continuar cadastro' : 'Cadastrar empresa'}</span>
              <ArrowRight aria-hidden="true" className="size-3.5 shrink-0" />
            </Link>
          </div>
        </div>
      </header>

      {/* Banner de cadastro em andamento */}
      {continueStepHref && (
        <section className="border-b border-[#DED5C7] bg-[#F0EBE2]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="break-words text-sm text-[#4B161B] [overflow-wrap:anywhere]">
              Você já possui um cadastro em andamento
              {continueBusinessName ? ` (${continueBusinessName})` : ''}. Deseja retomar de onde parou?
            </p>
            <Link
              href={continueStepHref}
              className={PRIMARY_BUTTON + " min-h-11 shrink-0 px-4 text-xs"}
            >
              <span>Continuar cadastro</span>
              <ArrowRight aria-hidden="true" className="size-3.5 shrink-0" />
            </Link>
          </div>
        </section>
      )}

      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden border-b border-[#DED5C7] bg-[#F8F5EF] px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
          <div aria-hidden="true" className="pointer-events-none absolute -right-44 top-4 -z-10 size-96 rotate-45 rounded-[4rem] border border-[#C9A227]/25 sm:-right-24 sm:size-[32rem]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-44 -left-36 -z-10 size-80 rotate-45 rounded-[4rem] border border-[#C9A227]/25 sm:size-96" />
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-[#785D17]">
              Tradição que une! Conexão que fortalece!
            </p>
            <h1 className="text-balance font-serif text-4xl font-bold leading-[1.06] tracking-tight text-[#4B161B] sm:text-6xl lg:text-7xl">
              Sua empresa. Novas conexões. Grandes oportunidades.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
              Amplie a visibilidade do seu negócio e fortaleça seus relacionamentos por meio de uma plataforma desenvolvida especialmente para a família maçônica.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="#planos" className={PRIMARY_BUTTON + " min-h-12 px-6 text-sm"}>
                Conheça nossos planos
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
              {continueStepHref && (
                <Link
                  href={continueStepHref}
                  className="inline-flex min-h-12 items-center rounded-full border border-[#DED5C7] bg-white px-6 text-sm font-bold text-[#4B161B] hover:bg-[#F0EBE2] motion-safe:transition-colors motion-safe:duration-200"
                >
                  Continuar cadastro iniciado
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Pilares da Plataforma */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-[#4B161B] sm:text-5xl">
              Muito mais que um guia comercial
            </h2>
            <p className="text-sm sm:text-base text-[#625B55]">
              Conheça tudo o que a plataforma oferece para gerar visibilidade e relacionamento qualificado.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {PLATFORM_PILLARS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group space-y-3 rounded-2xl border border-[#DED5C7] bg-white p-6 hover:border-[#C9A227] motion-safe:transition-colors motion-safe:duration-200"
                >
                  <div className={ICON_TILE}>
                    <Icon aria-hidden="true" strokeWidth={1.75} className="size-5 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:-translate-y-0.5" />
                  </div>
                  <h3 className="text-lg font-bold text-[#4B161B]">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-[#625B55] leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Planos com valores colapsados por padrão */}
        <section id="planos" className="scroll-mt-16 border-y border-[#DED5C7] bg-[#F0EBE2] px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
              <h2 className="font-serif text-3xl font-bold tracking-tight text-[#4B161B] sm:text-5xl">
                Escolha como deseja se conectar
              </h2>
              <p className="text-sm sm:text-base text-[#625B55]">
                Compare os benefícios e consulte os valores e as condições de pagamento de cada plano.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
              {orderedPlans.map((plan) => {
                const isFeatured = plan.tier === 'ouro';
                const seal = SEAL_BY_TIER[plan.tier];
                const isExpanded = Boolean(expandedPricing[plan.tier]);
                const entryHref = buildOnboardingEntryUrl(plan.tier, attributionParams);
                const hasPixDiscount =
                  typeof plan.pixPriceCents === 'number' &&
                  plan.pixPriceCents > 0 &&
                  plan.pixPriceCents < plan.annualPriceCents;

                return (
                  <article
                    key={plan.id}
                    className={`min-w-0 rounded-3xl border p-5 sm:p-6 flex flex-col justify-between [overflow-wrap:anywhere] motion-safe:transition-shadow motion-safe:duration-200 hover:shadow-md ${isFeatured
                      ? 'border-[#C9A227] bg-[#4B161B] text-[#F8F5EF] lg:-translate-y-2'
                      : 'border-[#DED5C7] bg-white text-[#625B55]'
                    }`}
                  >
                    <div className="space-y-5">
                      <div className="flex flex-col items-start gap-3">
                        <Image
                          src={seal.src}
                          alt={seal.alt}
                          width={80}
                          height={80}
                          className={isFeatured ? 'size-20 object-contain' : 'size-16 object-contain lg:mt-4'}
                        />
                        {isFeatured && (
                          <p className="rounded-full bg-[#C9A227] px-3 py-1 text-xs font-bold text-[#301015]">
                            Plano em destaque
                          </p>
                        )}
                        <div>
                          <h3 className={`font-serif text-3xl font-bold ${isFeatured ? 'text-white' : 'text-[#4B161B]'}`}>
                            {withoutEmoji(plan.name)}
                          </h3>
                          <p className="mt-1 text-sm">{withoutEmoji(plan.tagline)}</p>
                        </div>
                      </div>

                      {/* Bloco de investimento: Opção A (colapsado) vs Opção B (valor principal visível + condições expansíveis) */}
                      <div className={`rounded-2xl border p-4 ${isFeatured ? 'border-white/20 bg-[#301015]' : 'border-[#DED5C7] bg-[#F8F5EF]'}`}>
                        {pricingDisplayMode === 'visible' && (
                          <div className="mb-2.5 pb-2.5 border-b border-current/20">
                            <span className="block text-[10px] uppercase tracking-wider font-semibold">
                              Investimento anual
                            </span>
                            <div className="flex flex-wrap items-baseline gap-x-2 mt-0.5">
                              <span className="text-xl font-bold tabular-nums">
                                {formatCentsToReais(plan.annualPriceCents)}
                              </span>
                              <span className="text-xs">/ ano</span>
                            </div>
                            <p className="text-xs mt-0.5">
                              Equivalência mensal de {computeMonthlyEquivalenceText(plan.annualPriceCents)} (cobrança anual, não é assinatura mensal)
                            </p>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => togglePricing(plan.tier)}
                          aria-expanded={isExpanded}
                          className="w-full flex items-center justify-between gap-2 text-left min-h-10 text-sm font-bold hover:underline motion-safe:transition-colors motion-safe:duration-200 cursor-pointer"
                        >
                          <span>
                            {pricingDisplayMode === 'visible'
                              ? isExpanded
                                ? 'Ocultar condições PIX e cartão'
                                : 'Ver condições PIX e parcelamento'
                              : isExpanded
                                ? 'Ocultar investimento'
                                : 'Ver investimento e condições'}
                          </span>
                          {isExpanded ? <ChevronUp aria-hidden="true" className="size-4 shrink-0" /> : <ChevronDown aria-hidden="true" className="size-4 shrink-0" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-current/20 space-y-1.5">
                            {pricingDisplayMode === 'collapsed' && (
                              <>
                                <div className="flex flex-wrap items-baseline gap-x-2">
                                  <span className="text-xl font-bold tabular-nums">
                                    {formatCentsToReais(plan.annualPriceCents)}
                                  </span>
                                  <span className="text-xs">/ ano</span>
                                </div>
                                <p className="text-xs">
                                  Equivalência mensal de {computeMonthlyEquivalenceText(plan.annualPriceCents)} (cobrança anual, não é assinatura mensal)
                                </p>
                              </>
                            )}
                            {hasPixDiscount && (
                              <p className="text-xs font-bold">
                                À vista no PIX: {formatCentsToReais(plan.pixPriceCents!)}
                                {plan.pixDiscountPercentage ? ` (${plan.pixDiscountPercentage}% de desconto)` : ''}
                              </p>
                            )}
                            {plan.installmentsMax && plan.installmentsMax > 1 && (
                              <p className="text-xs">
                                Parcelamento em até {plan.installmentsMax}x no cartão
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <ul className="space-y-3">
                        {plan.features.map((feat) => (
                          <li key={feat.text} className="flex items-start gap-2.5 text-sm">
                            {feat.included
                              ? <Check aria-hidden="true" strokeWidth={1.75} className={`mt-0.5 size-4 shrink-0 ${isFeatured ? 'text-[#DFBD58]' : 'text-[#785D17]'}`} />
                              : <Minus aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />}
                            <span>
                              <span className="sr-only">{feat.included ? 'Incluído: ' : 'Não incluído: '}</span>
                              {withoutEmoji(feat.text)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6 border-t border-current/20 pt-5">
                      <Link
                        href={entryHref}
                        onClick={() => handleSelectPlan(plan.tier)}
                        aria-label={`Escolher plano ${withoutEmoji(plan.name)}`}
                        className={(isFeatured ? GOLD_BUTTON : PRIMARY_BUTTON) + " min-h-12 w-full px-5 text-sm"}
                      >
                        <span>Escolher plano</span>
                        <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Comparativo completo responsivo */}
            {allFeatureRows.length > 0 && (
              <details className="group mt-9 min-w-0 rounded-2xl border border-[#DED5C7] bg-white">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 font-bold text-[#4B161B] hover:bg-[#F8F5EF] [&::-webkit-details-marker]:hidden motion-safe:transition-colors motion-safe:duration-200">
                  Comparar todos os benefícios
                  <ChevronDown aria-hidden="true" className="size-5 shrink-0 group-open:rotate-180 motion-safe:transition-transform motion-safe:duration-200" />
                </summary>
                <div role="region" aria-label="Comparativo dos planos comerciais" tabIndex={0} className="relative overflow-x-auto border-t border-[#DED5C7] p-3 sm:p-5">
                  <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                    <caption className="sr-only">Benefícios por plano comercial</caption>
                    <thead>
                      <tr className="border-b border-[#DED5C7] text-[#4B161B]">
                        <th scope="col" className="px-3 py-3">Benefício</th>
                        {orderedPlans.map((plan) => (
                          <th scope="col" key={plan.id} className={`px-3 py-3 text-center ${plan.tier === 'ouro' ? 'bg-[#F0EBE2]' : ''}`}>
                            {withoutEmoji(plan.name)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DED5C7]">
                      {allFeatureRows.map((featureText) => (
                        <tr key={featureText}>
                          <th scope="row" className="px-3 py-3 font-medium">{withoutEmoji(featureText)}</th>
                          {orderedPlans.map((plan) => {
                            const hasFeature = plan.features.some((feature) => feature.text === featureText && feature.included);
                            return (
                              <td key={plan.id} className={`px-3 py-3 text-center ${plan.tier === 'ouro' ? 'bg-[#F8F5EF]' : ''}`}>
                                <span className="sr-only">{hasFeature ? 'Incluído' : 'Não incluído'}</span>
                                {hasFeature
                                  ? <Check aria-hidden="true" strokeWidth={1.75} className="inline-block size-4 text-[#785D17]" />
                                  : <Minus aria-hidden="true" strokeWidth={1.75} className="inline-block size-4" />}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        </section>

        {/* Como fazer parte */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-5xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-[#4B161B] sm:text-5xl">Como fazer parte?</h2>
            <p className="text-sm text-[#625B55]">Processo simples, seguro e guiado em 3 passos.</p>
          </div>

          <ol className="relative grid grid-cols-1 gap-5 md:grid-cols-3 md:before:absolute md:before:left-[16.67%] md:before:right-[16.67%] md:before:top-[2.875rem] md:before:border-t md:before:border-dashed md:before:border-[#C9A227]">
            {HOW_IT_WORKS.map(({ step, title, description, icon: Icon }) => (
              <li key={step} className="relative flex flex-col items-start gap-3 rounded-2xl border border-[#DED5C7] bg-white p-6 md:items-center md:text-center">
                <div className="flex items-center gap-3">
                  <span className={ICON_TILE}>
                    <Icon aria-hidden="true" strokeWidth={1.75} className="size-5" />
                  </span>
                  <span aria-hidden="true" className="text-sm font-bold text-[#785D17]">{step.padStart(2, '0')}</span>
                </div>
                <h3 className="text-lg font-bold text-[#4B161B]">{title}</h3>
                <p className="text-sm leading-relaxed">{description}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-[#DED5C7] bg-[#F0EBE2]">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="font-serif text-3xl font-bold tracking-tight text-[#4B161B] sm:text-5xl inline-flex items-center gap-2">
                <HelpCircle aria-hidden="true" strokeWidth={1.75} className="size-6 shrink-0 text-[#785D17]" />
                <span>Perguntas frequentes</span>
              </h2>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={item.q}
                    className="rounded-2xl border border-[#DED5C7] bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      aria-controls={`anunciar-faq-${idx}`}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left text-sm font-bold text-[#4B161B] hover:bg-[#F8F5EF] motion-safe:transition-colors motion-safe:duration-200"
                    >
                      <span>{item.q}</span>
                      <ChevronDown aria-hidden="true" strokeWidth={1.75} className={`size-4 shrink-0 text-[#785D17] motion-safe:transition-transform motion-safe:duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div id={`anunciar-faq-${idx}`} hidden={!isOpen} className="px-5 pb-4 text-sm leading-relaxed">
                      {item.a}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#4B161B] px-4 py-16 text-center text-[#F8F5EF] sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-balance font-serif text-3xl font-bold text-white sm:text-5xl">
              Grandes conexões começam com uma decisão.
            </h2>
            <p className="mt-4 text-base leading-relaxed sm:text-lg">
              Faça parte da Conexão Maçônica e amplie as oportunidades para o seu negócio.
            </p>
            <Link href={registrationHref} className={GOLD_BUTTON + " mt-7 min-h-12 px-6 text-sm"}>
              {continueStepHref ? 'Continuar cadastro' : 'Cadastrar minha empresa'}
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#DED5C7] bg-white px-4 py-8 text-center text-sm">
        {appName} · Todos os direitos reservados.
      </footer>
    </div>
  );
}
