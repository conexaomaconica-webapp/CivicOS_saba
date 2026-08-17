import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import '@/styles/public-experience.css';

export const metadata: Metadata = {
  title: 'Visual Lab — Conexão Maçônica',
  robots: { index: false, follow: false, nocache: true },
};

export default function VisualLabLayout({ children }: { children: ReactNode }) {
  const enabled = process.env.NODE_ENV !== 'production' || process.env.VISUAL_LAB_ENABLED === 'true';
  if (!enabled) notFound();
  return children;
}
