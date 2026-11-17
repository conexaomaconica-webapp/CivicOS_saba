import type { Metadata } from 'next';
import React from 'react';
import { permanentRedirect } from 'next/navigation';
import GuiaHomePage, { generateGuiaHomeMetadata, type GuiaHomeProps } from './guia-home';
import { homeRedirectTarget, isHomeSwitchActive } from '@/lib/site/home-switch';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(props: GuiaHomeProps): Promise<Metadata> {
  return generateGuiaHomeMetadata(props);
}

/**
 * /guia: o Guia como sempre foi. Depois da virada, redireciona de forma PERMANENTE (308) para "/", preservando os filtros.
 * Os endereços internos (/guia/empresas, /guia/<empresa>, /guia/lojas...) não mudam.
 */
export default async function GuiaRoute(props: GuiaHomeProps) {
  if (isHomeSwitchActive()) {
    permanentRedirect(homeRedirectTarget((await props.searchParams) ?? {}));
  }
  return <GuiaHomePage {...props} />;
}
