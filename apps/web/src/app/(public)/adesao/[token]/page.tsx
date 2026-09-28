import React from 'react';
import { notFound } from 'next/navigation';
import { getOnboardingSessionAction } from '@/lib/onboarding/onboarding-link-service';
import { AdesaoJourneyClient } from './adesao-journey-client';

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params;
  const session = await getOnboardingSessionAction(resolvedParams.token);

  if (!session) {
    return {
      title: 'Link de Adesão Inválido | Conexão Maçônica',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `Adesão Empresarial — ${session.businessName} | Conexão Maçônica`,
    description: `Revisão de contrato e checkout da empresa ${session.businessName} no Guia Maçônico.`,
    robots: { index: false, follow: false },
  };
}

export default async function AdesaoTokenPage({ params }: PageProps) {
  const resolvedParams = await params;
  const session = await getOnboardingSessionAction(resolvedParams.token);

  if (!session) {
    notFound();
  }

  const formatBrl = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const clientSession = {
    token: session.token,
    expiresAt: session.expiresAt,
    business: {
      id: session.businessId,
      name: session.businessName,
      slug: session.businessSlug,
      cnpjCpf: session.cnpjCpf || '',
      ownerName: session.ownerName || '',
      masonicLodge: session.masonicLodge || '',
      planCode: session.planCode,
      planName: session.planName,
      commercialStatus: session.commercialStatus,
    },
    offer: {
      planCode: session.planCode,
      planName: session.planName,
      billingCycle: 'annual',
      priceUpfront: session.payInFullCents / 100,
      priceInstallmentsTotal: session.installmentTotalCents / 100,
      installmentsCount: session.installmentsMax,
      installmentValue: session.installmentValueCents / 100,
      formattedUpfront: formatBrl(session.payInFullCents),
      formattedInstallmentsTotal: formatBrl(session.installmentTotalCents),
      formattedInstallmentValue: formatBrl(session.installmentValueCents),
      summaryText: `${session.planName} — ${formatBrl(session.payInFullCents)} à vista ou ${session.installmentsMax}x de ${formatBrl(session.installmentValueCents)}`,
    },
    contract: session.signedContractHash
      ? {
          id: 'signed-contract',
          status: 'signed',
          sha256Hash: session.signedContractHash,
          signedByName: session.ownerName || undefined,
        }
      : null,
  };

  return <AdesaoJourneyClient session={clientSession} />;
}
