import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './Providers';
import { ShellWrapper } from '../components/shell/ShellWrapper';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://conexaomaconica.com.br'),
  title: {
    default: 'Conexão Maçônica — Rede de Confiança, Negócios e Serviços Maçônicos',
    template: '%s | Conexão Maçônica',
  },
  description: 'Plataforma oficial de relacionamento comercial, diretório de empresas verificadas e rede de apoio mútuo para a comunidade maçônica.',
  openGraph: {
    title: 'Conexão Maçônica — Rede de Confiança, Negócios e Serviços Maçônicos',
    description: 'Encontre e contrate empresas de irmãos verificados com garantia de procedência e apoio institucional.',
    url: 'https://conexaomaconica.com.br',
    siteName: 'Conexão Maçônica',
    locale: 'pt_BR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ShellWrapper>
            {children}
          </ShellWrapper>
        </Providers>
      </body>
    </html>
  );
}
