import type { Metadata } from 'next';
import React from 'react';
import { LandingHeaderV2 } from '@/components/landing/LandingHeaderV2';
import { LandingHeroV2 } from '@/components/landing/LandingHeroV2';
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
  title: 'TESTE V2 | Conexão Maçônica',
  description: 'Versão de teste da nova Landing Page.',
  robots: { index: false, follow: false },
};

export default function TesteLandingPage() {
  return (
    <>
      <div className="w-full bg-[#20080a]">
        <LandingHeaderV2 />
        <LandingHeroV2 />
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
