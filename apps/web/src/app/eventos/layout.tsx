import React from 'react';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  // Metadata específica de cada evento será gerada via generateMetadata na [slug]/page.tsx
  // Este layout apenas configura a fonte e base de indexação
  robots: { index: true, follow: true },
};

/**
 * Layout independente para páginas de eventos.
 * Sem PublicShell — sem navbar global, footer completo ou FloatingWhatsApp.
 * A landing page de evento deve ser totalmente focada em conversão (RSVP).
 */
export default function EventsLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${inter.variable} events-layout`}>
      {children}
    </div>
  );
}
