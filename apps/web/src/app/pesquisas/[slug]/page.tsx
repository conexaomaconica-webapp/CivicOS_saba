import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicSurveyBySlugAction } from '@/app/actions/surveys';
import { PublicSurveyClient } from '@/components/surveys/public/PublicSurveyClient';
import { StructuredData } from '@/components/seo/StructuredData';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const res = await getPublicSurveyBySlugAction(slug);
  const survey = res.data;

  if (!survey) {
    return {
      title: 'Pesquisa Não Encontrada · Conexão Maçônica',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${survey.title} · Conexão Maçônica`,
    description: survey.description || 'Pesquisa institucional e mapeamento de negócios da comunidade maçônica.',
    openGraph: {
      title: `${survey.title} · Conexão Maçônica`,
      description: survey.description || 'Pesquisa institucional e mapeamento de negócios.',
    },
  };
}

export default async function PublicSurveyPage({ params }: PageProps) {
  const { slug } = await params;
  const res = await getPublicSurveyBySlugAction(slug);

  if (!res.success || !res.data) {
    notFound();
  }

  const survey = res.data;

  const surveySchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: survey.title,
    description: survey.description || 'Pesquisa institucional Conexão Maçônica',
    provider: {
      '@type': 'Organization',
      name: 'Conexão Maçônica',
    },
  };

  return (
    <>
      <StructuredData schema={surveySchema} />
      <PublicSurveyClient survey={survey} />
    </>
  );
}
