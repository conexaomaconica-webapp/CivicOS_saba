import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAdminSurveyDetailAction } from '@/app/actions/surveys';
import { SurveyEditorClient } from '@/components/surveys/admin/SurveyEditorClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const res = await getAdminSurveyDetailAction(id);
  const survey = res.data;
  return {
    title: survey ? `Editor · ${survey.title}` : 'Editor de Pesquisas · Admin',
    robots: { index: false, follow: false },
  };
}

export default async function AdminSurveyEditorPage({ params }: PageProps) {
  const { id } = await params;
  const res = await getAdminSurveyDetailAction(id);

  if (!res.success || !res.data) {
    notFound();
  }

  return <SurveyEditorClient initialSurvey={res.data} />;
}
