import type { Metadata } from 'next';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StructuredData } from '@/components/seo/StructuredData';
import { appUrl } from '@/lib/seo/app-url';
import Link from 'next/link';
import { Store, Utensils, Stethoscope, ShoppingBasket, ShieldCheck, Star, Users, Handshake } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Guia Comercial de Irmãos — Encontre empresas verificadas',
  description:
    'Encontre empresas e serviços de irmãos maçons com selo de verificação de vínculo, busca por categorias e apoio comercial mútuo.',
  alternates: { canonical: appUrl('/') },
  openGraph: {
    title: 'Conexão Maçônica — Guia Comercial de Irmãos',
    description:
      'Diretório de empresas e serviços de irmãos maçons, com verificação de vínculo e selos de confiança.',
    url: appUrl('/'),
    type: 'website',
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Conexão Maçônica',
  url: appUrl('/'),
  logo: appUrl('/logo.svg'),
  description:
    'Plataforma de descoberta e networking comercial para a comunidade maçônica, com verificação de vínculo e selos de confiança.',
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'O que é o selo de vínculo verificado?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'É a certificação de que o empresário é maçom regular em sua loja e potência. Só empresas com vínculo maçônico comprovado recebem o selo no Guia Comercial.',
      },
    },
    {
      '@type': 'Question',
      name: 'Como encontrar um irmão que presta um serviço?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'Use a busca por palavra-chave ou filtre por categoria no Guia Comercial. Cada anúncio mostra contato, endereço e avaliações de outros irmãos.',
      },
    },
    {
      '@type': 'Question',
      name: 'Como anunciar minha empresa no guia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'O cadastro é feito em etapas: dados da empresa, responsável, plano e revisão. Cada empresa anunciada é verificada quanto ao vínculo maçônico antes de receber o selo.',
      },
    },
  ],
};

const categories = [
  { icon: Utensils, label: 'Restaurantes', href: '/guia?cat=Restaurantes' },
  { icon: Stethoscope, label: 'Serviços', href: '/guia?cat=Serviços' },
  { icon: ShoppingBasket, label: 'Mercados', href: '/guia?cat=Mercados' },
  { icon: Store, label: 'Saúde', href: '/guia?cat=Saúde' },
];

const highlights = [
  {
    icon: ShieldCheck,
    title: 'Selo de vínculo verificado',
    description:
      'Cada empresa do guia passa por verificação de vínculo maçônico e filiação institucional antes de receber o selo de confiança.',
  },
  {
    icon: Star,
    title: 'Empresas fundadoras',
    description:
      'O programa das primeiras 100 empresas fundadoras apoia quem ajudou a construir a comunidade desde o início.',
  },
  {
    icon: Users,
    title: 'Busca por categorias e ritos',
    description:
      'Filtre por categoria, rito e região para encontrar o irmão certo para o serviço que você precisa.',
  },
  {
    icon: Handshake,
    title: 'Apoio comercial mútuo',
    description:
      'Prefira negócios de irmãos verificados e fortaleça a rede de confiança comercial da comunidade maçônica.',
  },
];

export default function HomePage() {
  return (
    <>
      <StructuredData schema={organizationSchema} />
      <StructuredData schema={faqSchema} />
      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
        <section className="flex flex-col gap-3 rounded-xl border border-default bg-accent-subtle p-6 md:p-8">
          <Badge variant="secondary">
            <ShieldCheck className="h-3 w-3 text-highlight-active" />
            Vínculo verificado
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Guia Comercial de Irmãos Maçons
          </h1>
          <p className="text-lg text-secondary">
            Encontre empresas e serviços de irmãos maçons verificados em todo o Brasil. O Guia
            Comercial da Conexão Maçônica reúne negócios de confiança com selo de verificação de
            vínculo maçônico, busca por categoria e apoio comercial mútuo entre a comunidade.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            <Link
              href="/guia"
              className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-hover"
            >
              Buscar no Guia
            </Link>
            <Link
              href="/anunciar/passo-1"
              className="inline-flex items-center justify-center rounded-lg border border-default bg-secondary px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-tertiary"
            >
              Anunciar minha empresa
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map(({ icon: Icon, label, href }) => (
            <Link key={label} href={href} className="block">
              <Card className="transition-colors duration-200 hover:bg-accent-subtle hover:border-accent-hover">
                <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
                  <Icon className="h-8 w-8 text-accent" />
                  <span className="font-medium text-primary">{label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>

        <section className="flex flex-col gap-4 mt-4">
          <h2 className="text-xl font-semibold tracking-tight text-primary">
            Por que usar o Guia Comercial?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highlights.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-accent" />
                    </div>
                    <CardTitle className="text-lg">{title}</CardTitle>
                  </div>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4 mt-4">
          <h2 className="text-xl font-semibold tracking-tight text-primary">
            Perguntas frequentes
          </h2>
          <div className="flex flex-col gap-3">
            {faqSchema.mainEntity.map((item) => (
              <Card key={item.name} className="p-4">
                <h3 className="font-semibold text-primary">{item.name}</h3>
                <p className="text-sm text-secondary mt-1">{item.acceptedAnswer.text}</p>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
