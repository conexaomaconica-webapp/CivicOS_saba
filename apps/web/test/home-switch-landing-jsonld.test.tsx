// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render as mount } from '@testing-library/react';

// ---- Simulações: só interessa o JSON-LD que a landing declara; o conteúdo pesado vira marcador ----
const schemas: Array<Record<string, any>> = [];
vi.mock('@/components/seo/StructuredData', () => ({
  StructuredData: ({ schema }: { schema?: Record<string, any> }) => { if (schema) schemas.push(schema); return null; },
}));
vi.mock('@/lib/seo/app-url', () => ({ appUrl: (p: string) => `https://www.conexaomaconica.com.br${p === '' ? '' : p}` }));
vi.mock('@/lib/supabase/server', () => ({ createServerSideClient: async () => ({}) }));
vi.mock('@/lib/tenant/tenant-resolver', () => ({ resolveRequestTenantId: async () => 'tenant-1' }));
vi.mock('@/lib/billing/plans-service', () => ({ fetchTenantPlans: async () => [], CANONICAL_PLANS: [] }));
vi.mock('@/lib/tenant/tenant-brand', () => ({ resolveTenantBrandContext: async () => ({ primaryColor: '#4b161b' }) }));
vi.mock('@/app/actions/connections', () => ({ getConfirmedConnectionsCountAction: async () => 0, getConnectionsFeedAction: async () => [] }));
vi.mock('@/components/landing/LandingSections', () => ({
  LandingHeader: () => null, LandingHero: () => null, LandingLaunchSection: () => null, LandingAudienceSection: () => null,
  LandingPlansSection: () => null, LandingPedraSection: () => null, LandingFaqSection: () => null,
}));
vi.mock('@/components/landing/LandingDifferentialsSection', () => ({ LandingDifferentialsSection: () => null }));
vi.mock('@/components/landing/LandingConnectionsMuralSection', () => ({ LandingConnectionsMuralSection: () => null }));
vi.mock('@/components/landing/LandingMetricsPreviewSection', () => ({ LandingMetricsPreviewSection: () => null }));
vi.mock('@/components/landing/LandingHowItWorksSection', () => ({ LandingHowItWorksSection: () => null }));
vi.mock('@/components/landing/LandingLeadCapture', () => ({ LandingLeadCapture: () => null }));

import LandingHome from '../src/app/(public)/_home/landing-home';

// O componente usa o runtime JSX automático do Next; o Vitest deste projeto usa o clássico.
(globalThis as { React?: typeof React }).React = React;

const OFFICIAL = '2026-11-24T10:00:00-03:00';
const BASE = 'https://www.conexaomaconica.com.br';

function setSwitch(mode?: string, at?: string) {
  if (mode === undefined) delete process.env.HOME_SWITCH_MODE; else process.env.HOME_SWITCH_MODE = mode;
  if (at === undefined) delete process.env.HOME_SWITCH_AT; else process.env.HOME_SWITCH_AT = at;
}
const byType = (type: string) => schemas.find((s) => s['@type'] === type);

// Renderiza o resultado da página: os componentes StructuredData (simulados) registram o JSON-LD que ela declara.
async function render() {
  cleanup();
  schemas.length = 0;
  mount(await LandingHome());
}

beforeEach(() => { schemas.length = 0; setSwitch(); });
afterEach(() => { cleanup(); vi.useRealTimers(); setSwitch(); });

describe('JSON-LD da landing acompanha o endereço real dela', () => {
  it('ANTES da virada (padrão): tudo na raiz, exatamente como era', async () => {
    await render();
    expect(byType('WebPage')).toMatchObject({ url: `${BASE}/`, '@id': `${BASE}/#webpage` });
    expect(byType('WebPage')!.breadcrumb.itemListElement).toHaveLength(1);
    expect(byType('Event')!.url).toBe(`${BASE}/#lancamento`);
    expect(byType('Organization')!.url).toBe(`${BASE}/`);
    expect(byType('WebSite')!.url).toBe(`${BASE}/`);
  });

  it('DEPOIS da virada: WebPage e Event apontam para /institucional; Organization e WebSite continuam na raiz (são do site inteiro)', async () => {
    setSwitch('on');
    await render();
    expect(byType('WebPage')).toMatchObject({ url: `${BASE}/institucional`, '@id': `${BASE}/institucional#webpage` });
    expect(byType('Event')!.url).toBe(`${BASE}/institucional#lancamento`);
    expect(byType('Organization')!.url).toBe(`${BASE}/`);
    expect(byType('WebSite')!.url).toBe(`${BASE}/`);
  });

  it('DEPOIS da virada: o caminho de navegação da landing tem Início (raiz) e Institucional, sem repetir o mesmo endereço', async () => {
    setSwitch('on');
    await render();
    const items = byType('WebPage')!.breadcrumb.itemListElement as Array<{ name: string; item: string }>;
    expect(items.map((i) => `${i.name}→${i.item}`)).toEqual([`Início→${BASE}/`, `Institucional→${BASE}/institucional`]);
    expect(new Set(items.map((i) => i.item)).size).toBe(items.length);
  });

  it('a virada por horário é por REQUISIÇÃO: o mesmo processo muda de endereço ao passar das 10h (não fica congelado em constante)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    setSwitch('scheduled', OFFICIAL);

    vi.setSystemTime(new Date('2026-11-24T09:59:59-03:00'));
    await render();
    expect(byType('WebPage')!.url).toBe(`${BASE}/`);

    vi.setSystemTime(new Date('2026-11-24T10:00:00-03:00'));
    await render();
    expect(byType('WebPage')!.url).toBe(`${BASE}/institucional`);
    expect(byType('Event')!.url).toBe(`${BASE}/institucional#lancamento`);

    setSwitch('off', OFFICIAL); // rollback
    await render();
    expect(byType('WebPage')!.url).toBe(`${BASE}/`);
  });
});
