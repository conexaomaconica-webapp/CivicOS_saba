import BenefitValidationClient from './validation-client';

export const metadata = {
  title: 'Validar benefício · Portal do Anunciante',
  robots: { index: false, follow: false },
};

export default function BenefitValidationPage() {
  return <BenefitValidationClient />;
}

