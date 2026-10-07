import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Título próprio da tela; o noindex vem do layout de (auth).
export const metadata: Metadata = {
  title: { absolute: 'Redefinir senha | Conexão Maçônica' },
};

export default function AuthPageLayout({ children }: { children: ReactNode }) {
  return children;
}
