import type { Metadata } from 'next';
import React from 'react';
import LandingHome, { landingMetadata } from './_home/landing-home';
import GuiaHomePage, { generateGuiaHomeMetadata, type GuiaHomeProps } from './guia/guia-home';
import { isHomeSwitchActive } from '@/lib/site/home-switch';

/**
 * Página inicial "/".
 *
 * ANTES da virada (padrão): a landing atual, exatamente como era.
 * DEPOIS da virada (HOME_SWITCH_MODE=on, ou scheduled e a hora chegou): o Guia, sem nenhuma alteração visual. A landing passa a
 * ser servida em /institucional e /guia redireciona (308) para "/". Ver lib/site/home-switch.ts.
 *
 * Decidido por requisição (a página é dinâmica), então a virada agendada acontece sozinha, sem deploy.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata(props: GuiaHomeProps): Promise<Metadata> {
  return isHomeSwitchActive() ? generateGuiaHomeMetadata(props) : landingMetadata;
}

export default async function HomePage(props: GuiaHomeProps) {
  return isHomeSwitchActive() ? <GuiaHomePage {...props} /> : <LandingHome />;
}
