import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Funil de cadastro do anunciante: acessível a quem quer anunciar, mas fora do índice do Google.
// A página comercial pública que capta anunciantes é a home; os passos de onboarding não devem ranquear.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AnunciarLayout({ children }: { children: ReactNode }) {
  return children;
}
