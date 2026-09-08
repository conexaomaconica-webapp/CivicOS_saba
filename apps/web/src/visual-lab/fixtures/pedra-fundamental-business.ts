import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import { ouroBusinessFixture } from './ouro-business';

/** Fixture para homologar o cenário Ouro + Selo Pedra Fundamental (10/10) */
export const pedraFundamentalBusinessFixture: PublicBusinessPresentation = {
  ...ouroBusinessFixture,
  identity: {
    ...ouroBusinessFixture.identity,
    slug: 'padaria-estrela-pedra-fundamental',
    name: 'Padaria Estrela (Apoiador 10/10)',
    description: 'Tradição em pães artesanais, tortas e café gourmet. Empresa apoiadora Pedra Fundamental da rede Conexão Maçônica.',
  },
  plan: {
    commercialPlan: 'ouro',
    template: 'ouro',
  },
  recognition: {
    verified: true,
    founder: false,
    pedraFundamental: true,
    colunaDeHonra: false,
  },
};
