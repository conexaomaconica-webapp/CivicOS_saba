import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import { ouroBusinessFixture } from './ouro-business';

/** Fixture para homologar o cenário Ouro + Coluna de Honra */
export const colunaHonraBusinessFixture: PublicBusinessPresentation = {
  ...ouroBusinessFixture,
  identity: {
    ...ouroBusinessFixture.identity,
    slug: 'padaria-estrela-coluna-honra',
    name: 'Padaria Estrela (Coluna de Honra)',
    description: 'Tradição em pães artesanais e alta gastronomia. Homenageada com o reconhecimento Coluna de Honra.',
  },
  plan: {
    commercialPlan: 'ouro',
    template: 'ouro',
  },
  recognition: {
    verified: true,
    founder: false,
    pedraFundamental: false,
    colunaDeHonra: true,
  },
};
