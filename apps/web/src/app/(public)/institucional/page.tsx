import type { Metadata } from 'next';
import React from 'react';
import { notFound } from 'next/navigation';
import LandingHome, { landingMetadata } from '../_home/landing-home';
import { appUrl } from '@/lib/seo/app-url';
import { isHomeSwitchActive } from '@/lib/site/home-switch';

export const dynamic = 'force-dynamic';

/**
 * Landing institucional em /institucional (a mesma landing de sempre, sem nenhuma alteração).
 *
 * ANTES da virada: a rota NÃO existe publicamente (404 e fora do índice). A landing continua só em "/", e não há conteúdo
 * duplicado indexável. DEPOIS da virada: serve a landing, com canonical próprio.
 */
export async function generateMetadata(): Promise<Metadata> {
  if (!isHomeSwitchActive()) return { robots: { index: false, follow: false } };
  return {
    ...landingMetadata,
    alternates: { canonical: appUrl('/institucional') },
    openGraph: { ...landingMetadata.openGraph, url: appUrl('/institucional') },
  };
}

export default async function InstitucionalPage() {
  if (!isHomeSwitchActive()) notFound();
  return <LandingHome />;
}
