import type { Metadata } from 'next';
import { Providers } from './Providers';
import { ShellWrapper } from '../components/shell/ShellWrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'CivicOS — Portal de Utilidade Pública',
  description: 'Plataforma SaaS modular para comunidades locais e guia comercial.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <ShellWrapper>
            {children}
          </ShellWrapper>
        </Providers>
      </body>
    </html>
  );
}
