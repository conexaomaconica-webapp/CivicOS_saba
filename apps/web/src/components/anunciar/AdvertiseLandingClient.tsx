'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Building2,
  Smartphone,
  Handshake,
  Tag,
  Calendar,
  TrendingUp,
  ShieldCheck,
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

const PLATFORM_PILLARS = [
  {
    icon: Building2,
    title: 'Guia de Empresas',
    description: 'Presença estruturada por cidade, categoria, serviços e vínculo maçônico verificado.',
  },
  {
    icon: Smartphone,
    title: 'Apps Android e iOS',
    description: 'Sua empresa acessível no bolso dos Irmãos e familiares em todo o Brasil.',
  },
  {
    icon: Handshake,
    title: 'Mural de Conexões',
    description: 'Negócios reais recomendados e validados pela própria comunidade.',
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
    title: 'Escolha seu plano',
    description: 'Compare os recursos de Esquadro, Compasso e Acácia e selecione a modalidade ideal.',
  },
  {
    step: '2',
    title: 'Cadastre sua empresa',
    description: 'Informe os dados do responsável, da empresa e o vínculo maçônico para validação.',
  },
  {
    step: '3',
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

  const allFeatureRows = Array.from(
    new Set(plans.flatMap((plan) => plan.features.map((f) => f.text))),
  );

  return (
    <div className="min-h-screen bg-[#1f0509] text-[#f8f5ef] font-sans selection:bg-[#C9A227]/30">
      {/* Header */}
      <header className="border-b border-[#C9A227]/20 bg-[#180407]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl || '/logoconexao_red_vert.png'}
              alt={appName}
              className="h-9 w-auto object-contain"
            />
            <span className="font-bold text-sm sm:text-base tracking-tight text-[#f8f5ef] truncate">
              {appName}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <a
              href="#planos"
              className="hidden sm:inline-flex items-center px-3.5 py-2 rounded-full text-xs font-semibold text-[#dfbd58] hover:bg-[#C9A227]/10 transition"
            >
              Conhecer planos
            </a>
            <Link
              href={continueStepHref || buildOnboardingEntryUrl(null, attributionParams)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C9A227] text-[#1f0509] text-xs font-extrabold hover:bg-[#dfbd58] transition"
            >
              <span>{continueStepHref ? 'Continuar cadastro' : 'Cadastrar empresa'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Banner de cadastro em andamento */}
      {continueStepHref && (
        <section className="bg-[#380b13] border-b border-[#C9A227]/35">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-[#f8f5ef]">
              Você já possui um cadastro em andamento
              {continueBusinessName ? ` (${continueBusinessName})` : ''}. Deseja retomar de onde parou?
            </p>
            <Link
              href={continueStepHref}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#C9A227] text-[#1f0509] text-xs font-bold hover:bg-[#dfbd58] transition shrink-0"
            >
              <span>Continuar cadastro</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden py-14 sm:py-20 px-4 sm:px-6 border-b border-[#C9A227]/15">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#4B161B]/45 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#C9A227]/15 blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <p className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C9A227]/15 border border-[#C9A227]/35 text-[#dfbd58] text-xs font-bold uppercase tracking-widest">
            {appName} · Rede Empresarial
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Conecte sua empresa a novas oportunidades.
          </h1>
          <p className="text-base sm:text-lg text-[#e7dccb] max-w-2xl mx-auto leading-relaxed">
            Uma plataforma de negócios desenvolvida para fortalecer a família maçônica, ampliando sua visibilidade no Guia Comercial, nos aplicativos e nas conexões da rede.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="#planos"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#C9A227] text-[#1f0509] font-extrabold text-sm hover:bg-[#dfbd58] transition shadow-lg"
            >
              <span>Conheça nossos planos</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            {continueStepHref && (
              <Link
                href={continueStepHref}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-[#C9A227]/50 text-[#f8f5ef] font-bold text-sm hover:bg-[#C9A227]/10 transition"
              >
                Continuar cadastro iniciado
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Pilares da Plataforma */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Muito mais que um guia comercial
          </h2>
          <p className="text-sm sm:text-base text-[#d9cbb8]">
            Conheça tudo o que a plataforma oferece para gerar visibilidade e relacionamento qualificado.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {PLATFORM_PILLARS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl bg-[#2a080e] border border-[#C9A227]/20 p-5 space-y-2.5"
              >
                <div className="w-10 h-10 rounded-xl bg-[#C9A227]/15 border border-[#C9A227]/30 flex items-center justify-center text-[#dfbd58]">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">{item.title}</h3>
                <p className="text-xs sm:text-sm text-[#d9cbb8] leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Planos com valores colapsados por padrão */}
      <section id="planos" className="py-14 sm:py-16 px-4 sm:px-6 bg-[#170407] border-y border-[#C9A227]/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Escolha como deseja se conectar
            </h2>
            <p className="text-sm sm:text-base text-[#d9cbb8]">
              Compare os benefícios oficiais de cada modalidade. Toque em <strong>Ver investimento</strong> para abrir os valores vigentes e condições de pagamento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan) => {
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
                  className={`rounded-3xl p-6 flex flex-col justify-between border transition ${
                    plan.isPopular
                      ? 'bg-[#300a11] border-[#C9A227] shadow-2xl'
                      : 'bg-[#26070c] border-[#C9A227]/25'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={seal.src}
                          alt={seal.alt}
                          className="w-12 h-12 object-contain shrink-0"
                        />
                        <div>
                          <h3 className="text-xl font-extrabold text-white">{plan.name}</h3>
                          <p className="text-xs text-[#dfbd58] font-medium">{plan.tagline}</p>
                        </div>
                      </div>
                      {plan.isPopular && (
                        <span className="px-2.5 py-1 rounded-full bg-[#C9A227] text-[#1f0509] text-[10px] font-extrabold uppercase tracking-wide shrink-0">
                          {plan.badge || 'Destaque'}
                        </span>
                      )}
                    </div>

                    {/* Bloco de investimento: Opção A (colapsado) vs Opção B (valor principal visível + condições expansíveis) */}
                    <div className="rounded-2xl bg-[#1a0509] border border-[#C9A227]/25 p-3.5">
                      {pricingDisplayMode === 'visible' && (
                        <div className="mb-2.5 pb-2.5 border-b border-[#C9A227]/15">
                          <span className="block text-[10px] uppercase tracking-wider text-[#d9cbb8] font-semibold">
                            Investimento anual
                          </span>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-2xl font-extrabold text-white">
                              {formatCentsToReais(plan.annualPriceCents)}
                            </span>
                            <span className="text-xs text-[#d9cbb8]">/ ano</span>
                          </div>
                          <p className="text-[11px] text-[#dfbd58] mt-0.5">
                            Equivalência mensal de {computeMonthlyEquivalenceText(plan.annualPriceCents)} (cobrança anual, não é assinatura mensal)
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => togglePricing(plan.tier)}
                        aria-expanded={isExpanded}
                        className="w-full flex items-center justify-between gap-2 text-left text-xs font-bold text-[#dfbd58] hover:text-white transition cursor-pointer"
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
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-[#C9A227]/15 space-y-1.5">
                          {pricingDisplayMode === 'collapsed' && (
                            <>
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-extrabold text-white">
                                  {formatCentsToReais(plan.annualPriceCents)}
                                </span>
                                <span className="text-xs text-[#d9cbb8]">/ ano</span>
                              </div>
                              <p className="text-xs text-[#d9cbb8]">
                                Equivalente a {computeMonthlyEquivalenceText(plan.annualPriceCents)}
                              </p>
                            </>
                          )}
                          {hasPixDiscount && (
                            <p className="text-xs font-semibold text-emerald-300">
                              À vista no PIX: {formatCentsToReais(plan.pixPriceCents!)}
                              {plan.pixDiscountPercentage ? ` (${plan.pixDiscountPercentage}% de desconto)` : ''}
                            </p>
                          )}
                          {plan.installmentsMax && plan.installmentsMax > 1 && (
                            <p className="text-xs text-[#d9cbb8]">
                              Parcelamento em até {plan.installmentsMax}x no cartão
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <ul className="space-y-2.5 pt-1">
                      {plan.features.map((feat) => (
                        <li key={feat.text} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#f2eadc]">
                          <Check className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                          <span>{feat.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 mt-6 border-t border-[#C9A227]/15">
                    <Link
                      href={entryHref}
                      onClick={() => handleSelectPlan(plan.tier)}
                      className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-extrabold transition ${
                        plan.isPopular
                          ? 'bg-[#C9A227] text-[#1f0509] hover:bg-[#dfbd58]'
                          : 'bg-[#4B161B] text-white border border-[#C9A227]/45 hover:bg-[#5e1d23]'
                      }`}
                    >
                      <span>Escolher plano</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Comparativo completo responsivo */}
          {allFeatureRows.length > 0 && (
            <div className="mt-12 rounded-3xl bg-[#24060b] border border-[#C9A227]/20 p-5 sm:p-6">
              <h3 className="text-lg sm:text-xl font-extrabold text-white mb-4">
                Comparativo completo dos planos
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[540px]">
                  <thead>
                    <tr className="border-b border-[#C9A227]/25 text-xs uppercase tracking-wider text-[#dfbd58]">
                      <th className="py-3 pr-4">Benefício</th>
                      {plans.map((p) => (
                        <th key={p.id} className="py-3 px-3 text-center">
                          {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C9A227]/10 text-xs sm:text-sm">
                    {allFeatureRows.map((featureText) => (
                      <tr key={featureText}>
                        <td className="py-3 pr-4 text-[#f2eadc]">{featureText}</td>
                        {plans.map((p) => {
                          const hasFeature = p.features.some((f) => f.text === featureText && f.included);
                          return (
                            <td key={p.id} className="py-3 px-3 text-center">
                              {hasFeature ? (
                                <Check className="w-4 h-4 text-[#C9A227] inline-block" aria-label="Incluído" />
                              ) : (
                                <span className="text-[#8a756b]" aria-label="Não incluído">
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Como fazer parte */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Como fazer parte?</h2>
          <p className="text-sm text-[#d9cbb8]">Processo simples, seguro e guiado em 3 passos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.step}
              className="rounded-2xl bg-[#2a080e] border border-[#C9A227]/20 p-5 space-y-2"
            >
              <span className="inline-flex w-8 h-8 rounded-full bg-[#C9A227] text-[#1f0509] font-extrabold text-sm items-center justify-center">
                {item.step}
              </span>
              <h3 className="text-base font-bold text-white">{item.title}</h3>
              <p className="text-xs sm:text-sm text-[#d9cbb8] leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 bg-[#170407] border-t border-[#C9A227]/20">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white inline-flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-[#C9A227]" />
              <span>Perguntas frequentes</span>
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={item.q}
                  className="rounded-2xl bg-[#26070c] border border-[#C9A227]/20 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left text-sm font-bold text-white cursor-pointer"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#C9A227] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#C9A227] shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-xs sm:text-sm text-[#d9cbb8] leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 text-center border-t border-[#C9A227]/20 space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-[#dfbd58] uppercase tracking-widest">
          <ShieldCheck className="w-4 h-4" />
          <span>Tradição que une! Conexão que fortalece!</span>
        </div>
        <p className="text-xs text-[#b5a393]">
          {appName} · Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}

