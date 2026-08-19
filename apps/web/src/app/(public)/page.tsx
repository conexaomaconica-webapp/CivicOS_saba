import type { Metadata } from 'next';
import React from 'react';
import { StructuredData } from '@/components/seo/StructuredData';
import { appUrl } from '@/lib/seo/app-url';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingEcosystem } from '@/components/landing/LandingEcosystem';
import { LandingAudience } from '@/components/landing/LandingAudience';
import { LandingVisibility } from '@/components/landing/LandingVisibility';
import { LandingPlansMatrix } from '@/components/landing/LandingPlansMatrix';
import { LandingFounderOffer } from '@/components/landing/LandingFounderOffer';
import { LandingWhyJoin } from '@/components/landing/LandingWhyJoin';
import { LandingProductShowcase } from '@/components/landing/LandingProductShowcase';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingLeadCapture } from '@/components/landing/LandingLeadCapture';

export const metadata: Metadata = {
  title: 'Conexão Maçônica | Conexões que Fortalecem Negócios e Aproximam a Comunidade',
  description:
    'O Conexão Maçônica é um guia criado para aproximar pessoas, profissionais, empresas e serviços em um ambiente organizado, confiável e pensado para gerar novas conexões.',
  alternates: { canonical: appUrl('/') },
  openGraph: {
    title: 'Conexão Maçônica | Lançamento 2026',
    description:
      'Ecossistema comercial e diretório de empresas. Conheça as condições especiais para Empresas Fundadoras.',
    url: appUrl('/'),
    type: 'website',
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Conexão Maçônica',
  url: appUrl('/'),
  logo: appUrl('/logoconexao_red.png'),
  description:
    'Plataforma de descoberta e networking comercial para a comunidade maçônica com selo de reconhecimento e apoio mútuo.',
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'O Conexão Maçônica é exclusivo para maçons?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'O ecossistema foi pensado para conectar a comunidade maçônica, familiares, amigos e simpatizantes que valorizam relacionamentos e negócios baseados em princípios de confiança.',
      },
    },
    {
      '@type': 'Question',
      name: 'Quem pode cadastrar uma empresa?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Empresários, profissionais liberais, prestadores de serviços, médicos, advogados e estabelecimentos comerciais que desejam divulgar seus produtos para a comunidade.',
      },
    },
    {
      '@type': 'Question',
      name: 'Qual a diferença entre os planos Bronze, Prata, Ouro e Fundador?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'O plano Bronze oferece presença básica. O Prata inclui galeria de fotos. O Ouro adiciona eventos, novidades/posts e destaque comercial máximo. O Ouro Fundador traz todas as vantagens do Ouro acrescido do Selo Empresa Fundadora.',
      },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <StructuredData schema={organizationSchema} />
      <StructuredData schema={faqSchema} />
      <div className="w-full">
        <LandingHeader />
        <LandingHero />
        <LandingEcosystem />
        <LandingAudience />
        <LandingVisibility />
        <LandingPlansMatrix />
        <LandingFounderOffer />
        <LandingWhyJoin />
        <LandingProductShowcase />
        <LandingFaq />
        <LandingLeadCapture />
      </div>
    </>
  );
}
