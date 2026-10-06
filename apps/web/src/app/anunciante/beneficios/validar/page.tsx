import BenefitValidationClient from './validation-client';
import { getAdvertiserFeaturesAction } from '@/lib/advertiser/advertiser-entitlements';
import { FeatureLockedNotice } from '@/components/advertiser/FeatureLockedNotice';

export const metadata = {
  title: 'Validar benefício · Portal do Anunciante',
  robots: { index: false, follow: false },
};

export default async function BenefitValidationPage() {
  const features = await getAdvertiserFeaturesAction();
  if (features && !features.allows.benefits) return <FeatureLockedNotice feature="Benefícios e Ofertas" planName={features.planName} />;
  return <BenefitValidationClient />;
}
