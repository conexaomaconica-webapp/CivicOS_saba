import React from 'react';
import { notFound } from 'next/navigation';
import { getAdminBusiness360Action } from '@/lib/admin/admin-businesses-service';
import CommercialOnboardingClient from './commercial-onboarding-client';

type ContratacaoPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: ContratacaoPageProps) {
  const { id } = await params;
  try {
    const dto = await getAdminBusiness360Action(id);
    if (!dto) return { title: 'Empresa não encontrada · Admin CM' };
    return { title: `Contratação Comercial: ${dto.business.name} · Conexão Maçônica Admin` };
  } catch (_err) {
    return { title: 'Contratação Comercial · Conexão Maçônica Admin' };
  }
}

export default async function ContratacaoPage({ params }: ContratacaoPageProps) {
  const { id } = await params;
  const dto = await getAdminBusiness360Action(id);

  if (!dto) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <CommercialOnboardingClient dto={dto} />
    </div>
  );
}
