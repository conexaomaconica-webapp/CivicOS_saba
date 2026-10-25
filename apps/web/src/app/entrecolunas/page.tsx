import React from 'react';
import type { Metadata } from 'next';
import { Marcellus } from 'next/font/google';
import { StructuredData } from '@/components/seo/StructuredData';
import { appUrl } from '@/lib/seo/app-url';
import { EntreColunasFrame } from '@/components/entrecolunas/EntreColunasFrame';
import { HeroSection } from '@/components/entrecolunas/HeroSection';
import { AboutSection } from '@/components/entrecolunas/AboutSection';
import { CommunityCardsSection } from '@/components/entrecolunas/CommunityCardsSection';
import { HowItWorksSection } from '@/components/entrecolunas/HowItWorksSection';
import { LaunchEventSection } from '@/components/entrecolunas/LaunchEventSection';
import { QuickSurveySection } from '@/components/entrecolunas/QuickSurveySection';
import { BusinessCalloutSection } from '@/components/entrecolunas/BusinessCalloutSection';
import { ClosingInvitationSection } from '@/components/entrecolunas/ClosingInvitationSection';
import { EntreColunasFooter } from '@/components/entrecolunas/EntreColunasFooter';
import { MobileStickyBar } from '@/components/entrecolunas/MobileStickyBar';
import { OFFICIAL_SLOGAN, EVENT_DATE_ISO } from '@/components/entrecolunas/constants';

const marcellus = Marcellus({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-marcellus',
});

export const metadata: Metadata = {
  title: {
    absolute: 'Conexão Maçônica · Lançamento Oficial',
  },
  description:
    'Uma nova forma de nos conectarmos está chegando. Conheça a Conexão Maçônica e o lançamento oficial em 24/11, Feira de Santana — BA.',
  keywords: [
    'Conexão Maçônica',
    'Entre Colunas',
    'Lançamento Maçônico',
    'Guia Maçônico',
    'Feira de Santana',
    '24 de Novembro',
    'Fraternidade',
  ],
  alternates: {
    canonical: 'https://www.conexaomaconica.com.br/entrecolunas',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Conexão Maçônica · Lançamento Oficial',
    description:
      'Uma nova forma de nos conectarmos está chegando. Lançamento oficial em 24/11 no Centro de Convenções de Feira de Santana.',
    url: 'https://www.conexaomaconica.com.br/entrecolunas',
    siteName: 'Conexão Maçônica',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: appUrl('/entrecolunas-og.jpg'),
        width: 1200,
        height: 630,
        alt: 'Conexão Maçônica · Lançamento Oficial',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Conexão Maçônica · Lançamento Oficial',
    description:
      'Uma nova forma de nos conectarmos está chegando. Lançamento oficial em 24/11 no Centro de Convenções de Feira de Santana.',
    images: [appUrl('/entrecolunas-og.jpg')],
  },
};

export default function EntreColunasPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://www.conexaomaconica.com.br/#organization',
        name: 'Conexão Maçônica',
        url: 'https://www.conexaomaconica.com.br',
        logo: appUrl('/logoconexao_red_vert.png'),
        slogan: OFFICIAL_SLOGAN,
        sameAs: ['https://instagram.com/conexaomaconica'],
      },
      {
        '@type': 'Event',
        '@id': 'https://www.conexaomaconica.com.br/entrecolunas#event',
        name: 'Lançamento Oficial da Conexão Maçônica',
        description:
          'Uma noite especial para aproximar irmãos, cunhadas, sobrinhos e empresários, estimulando parcerias e novas conexões. Palestra "Liderança Emocional Inteligente e Síndrome dos Pais Culpados" com Dr. Alfredo Morais, recepção com saxofone e coquetel com voz e violão.',
        startDate: EVENT_DATE_ISO,
        endDate: '2026-11-24T22:00:00-03:00',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        location: {
          '@type': 'Place',
          name: 'Centro de Convenções de Feira de Santana',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'R. Tupinambás - São João',
            addressLocality: 'Feira de Santana',
            addressRegion: 'BA',
            addressCountry: 'BR',
          },
        },
        organizer: {
          '@type': 'Organization',
          name: 'Conexão Maçônica',
          url: 'https://www.conexaomaconica.com.br',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Início',
            item: 'https://www.conexaomaconica.com.br',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Entre Colunas',
            item: 'https://www.conexaomaconica.com.br/entrecolunas',
          },
        ],
      },
    ],
  };

  return (
    <main className={`min-h-screen ${marcellus.variable}`}>
      <StructuredData schema={pageSchema} />

      <EntreColunasFrame>
        {/* 01 — ABERTURA | HERO */}
        <HeroSection />

        {/* 02 — O QUE É A CONEXÃO MAÇÔNICA? */}
        <AboutSection />

        {/* 03 — TODOS FAZEM PARTE */}
        <CommunityCardsSection />

        {/* 04 — COMO VAI FUNCIONAR? */}
        <HowItWorksSection />

        {/* 05 — LANÇAMENTO OFICIAL */}
        <LaunchEventSection />

        {/* 06 — PESQUISA DE INTERESSE */}
        <QuickSurveySection />

        {/* 07 — PARA QUEM DESEJA ANUNCIAR */}
        <BusinessCalloutSection />

        {/* 08 — ENCERRAMENTO | CONVITE FINAL */}
        <ClosingInvitationSection />

        {/* RODAPÉ INSTITUCIONAL */}
        <EntreColunasFooter />
      </EntreColunasFrame>

      {/* MOBILE STICKY CTA */}
      <MobileStickyBar />
    </main>
  );
}
