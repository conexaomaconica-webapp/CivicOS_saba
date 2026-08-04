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
    default: 'CivicOS — Plataforma SaaS Multi-Tenant',
    template: '%s | CivicOS',
  },
  description: 'Plataforma SaaS modular de utilidade pública e ecossistemas comunitários.',
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
