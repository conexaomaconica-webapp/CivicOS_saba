import React from 'react';
import { notFound } from 'next/navigation';
import { getAdminBusiness360Action } from '@/lib/admin/admin-businesses-service';
import MasonicLinkOnboardingForm from './masonic-link-onboarding-form';

type MasonicLinkPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: MasonicLinkPageProps) {
  const { id } = await params;
  try {
    const dto = await getAdminBusiness360Action(id);
    if (!dto) return { title: 'Empresa não encontrada · Admin CM' };
    return { title: `Vínculo Maçônico: ${dto.business.name} · Conexão Maçônica Admin` };
  } catch (_err) {
    return { title: 'Vínculo Maçônico · Conexão Maçônica Admin' };
  }
}

export default async function MasonicLinkPage({ params }: MasonicLinkPageProps) {
  const { id } = await params;
  try {
    const dto = await getAdminBusiness360Action(id);
    if (!dto) {
      notFound();
    }
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <MasonicLinkOnboardingForm
          businessId={dto.business.id}
          businessName={dto.business.name}
          legalName={dto.business.legal_name || ''}
          cnpj={dto.business.cnpj || dto.business.cnpj_cpf || ''}
          commercialStatus={dto.business.commercial_status || 'pre_cadastro'}
          initialMasonicLink={dto.masonic_link_detail}
        />
      </div>
    );
  } catch (_err) {
    notFound();
  }
}
