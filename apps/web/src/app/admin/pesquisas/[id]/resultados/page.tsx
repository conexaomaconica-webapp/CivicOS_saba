import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAdminSurveyDetailAction, getSurveyAnalyticsAction } from '@/app/actions/surveys';
import { SurveyResultsDashboardClient } from '@/components/surveys/admin/SurveyResultsDashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ versao?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const res = await getAdminSurveyDetailAction(id);
  return {
    title: res.data ? `Resultados · ${res.data.title}` : 'Resultados da Pesquisa · Admin',
    robots: { index: false, follow: false },
  };
}

export default async function AdminSurveyResultsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { versao } = await searchParams;
  const versionNumber = versao && /^\d+$/.test(versao) ? Number(versao) : undefined;

  const [detail, analytics] = await Promise.all([
    getAdminSurveyDetailAction(id),
    getSurveyAnalyticsAction(id, versionNumber),
  ]);

  if (!detail.success || !detail.data) notFound();

  return (
    <SurveyResultsDashboardClient
      survey={{
        id: detail.data.id,
        title: detail.data.title,
        slug: detail.data.slug,
        status: detail.data.status,
        current_version: detail.data.current_version,
      }}
      analytics={analytics.success && analytics.data ? analytics.data : null}
      errorMessage={analytics.success ? null : analytics.error || 'Erro ao gerar indicadores.'}
      selectedVersion={versionNumber ?? null}
    />
  );
}
