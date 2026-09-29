import React from 'react';
import type { Metadata } from 'next';
import { getAdminSurveysListAction } from '@/app/actions/surveys';
import { AdminSurveysListClient } from '@/components/surveys/admin/AdminSurveysListClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Pesquisas & Formulários · Admin · Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function AdminSurveysPage() {
  const result = await getAdminSurveysListAction();
  const surveys = result.success && result.data ? result.data : [];

  return <AdminSurveysListClient initialSurveys={surveys} />;
}
