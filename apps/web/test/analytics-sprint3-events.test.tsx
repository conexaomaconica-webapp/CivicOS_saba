// @vitest-environment jsdom

import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import {
  GA_EVENT_CATALOG,
  buildGaEvent,
  businessParams,
  cleanGaParams,
  gaNameForConnection,
  gaNameForContactEvent,
  sanitizeSearchTerm,
} from '../src/lib/analytics/events';
import { isAnalyticsExcludedPath } from '../src/lib/analytics/ga-paths';
import type { GaEventName } from '../src/lib/analytics/types';

const read = (path: string) => readFileSync(path, 'utf8');

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('termo de busca: nunca dado pessoal', () => {
  it('descarta e-mail, telefone, CPF/CNPJ e vazio', () => {
    expect(sanitizeSearchTerm('joao@email.com')).toBeNull();
    expect(sanitizeSearchTerm('75 99812-7232')).toBeNull();
    expect(sanitizeSearchTerm('123.456.789-00')).toBeNull();
    expect(sanitizeSearchTerm('12.345.678/0001-90')).toBeNull();
    expect(sanitizeSearchTerm('   ')).toBeNull();
    expect(sanitizeSearchTerm(undefined)).toBeNull();
  });

  it('mantém busca comum, em minúsculas e sem espaços sobrando', () => {
    expect(sanitizeSearchTerm('  Ótica   Feira  ')).toBe('ótica feira');
    expect(sanitizeSearchTerm('advogado 2')).toBe('advogado 2');
    expect(sanitizeSearchTerm('a'.repeat(200))).toHaveLength(80);
  });
});

describe('parâmetros dos eventos', () => {
  it('só passam parâmetros da lista permitida (nome, e-mail e telefone são descartados)', () => {
    const clean = cleanGaParams({
      business_slug: 'otica-exemplo',
      city: 'Feira de Santana',
      ...({ email: 'a@b.com', phone: '7599', full_name: 'Fulano', cpf: '1' } as object),
    });
    expect(clean).toEqual({ business_slug: 'otica-exemplo', city: 'Feira de Santana' });
  });

  it('remove vazios, limita o tamanho e mantém números e booleanos', () => {
    const clean = cleanGaParams({ city: '   ', state: null, business_name: 'x'.repeat(300), results_count: 0, is_pedra_fundamental: true });
    expect(clean).toEqual({ business_name: 'x'.repeat(100), results_count: 0, is_pedra_fundamental: true });
  });

  it('search_term passa pela higienização dentro do evento', () => {
    expect(buildGaEvent('search_business', { search_term: 'joao@email.com', results_count: 3 }).params).toEqual({ results_count: 3 });
    expect(buildGaEvent('search_business', { search_term: 'Ótica', results_count: 3 }).params).toEqual({ search_term: 'ótica', results_count: 3 });
  });

  it('parâmetros de empresa saem completos e a marca Pedra Fundamental só aparece quando é verdadeira', () => {
    const base = { id: 'uuid-1', slug: 'otica-exemplo', name: 'Ótica Exemplo', category: 'Ótica', city: 'Feira de Santana', state: 'BA', plan: 'ouro' };
    expect(cleanGaParams(businessParams(base))).toEqual({
      business_id: 'uuid-1', business_slug: 'otica-exemplo', business_name: 'Ótica Exemplo', category_name: 'Ótica',
      city: 'Feira de Santana', state: 'BA', plan: 'ouro',
    });
    expect(cleanGaParams(businessParams({ ...base, isPedraFundamental: true })).is_pedra_fundamental).toBe(true);
  });
});

describe('mapeamento de eventos', () => {
  it('contatos da medição própria viram os eventos do GA4 (click_directions mantém o nome já configurado)', () => {
    expect(gaNameForContactEvent('whatsapp_click')).toBe('click_whatsapp');
    expect(gaNameForContactEvent('phone_click')).toBe('click_phone');
    expect(gaNameForContactEvent('instagram_click')).toBe('click_instagram');
    expect(gaNameForContactEvent('website_click')).toBe('click_website');
    expect(gaNameForContactEvent('directions_click')).toBe('click_directions');
    expect(gaNameForContactEvent('social_click')).toBeNull();
    expect(gaNameForContactEvent('share')).toBeNull();
  });

  it('visita tem evento próprio; as outras conexões são register_connection', () => {
    expect(gaNameForConnection('visita')).toBe('register_visit');
    for (const type of ['compra', 'servico', 'parceria']) expect(gaNameForConnection(type)).toBe('register_connection');
  });

  it('todo parâmetro do catálogo é aceito pela higienização e cada evento tem gatilho', () => {
    for (const [name, spec] of Object.entries(GA_EVENT_CATALOG)) {
      expect(spec.trigger.length, name).toBeGreaterThan(5);
      for (const param of spec.params) {
        const clean = cleanGaParams({ [param]: param === 'search_term' ? 'ótica' : 'x' });
        expect(Object.keys(clean), `${name}.${param}`).toEqual([param]);
      }
    }
  });
});

describe('onde o GA4 roda', () => {
  it('fica de fora das áreas internas e das URLs com token', () => {
    for (const path of ['/admin', '/admin/seo', '/anunciante', '/anunciante/plano', '/minha-conta/perfil', '/master', '/platform', '/dashboard/x',
      '/diagnostics', '/health', '/api/analytics/track', '/auth/callback', '/c/ABC123', '/cadastro/token-secreto', '/contratacao/token', '/adesao/token']) {
      expect(isAnalyticsExcludedPath(path), path).toBe(true);
    }
  });

  it('continua medindo o site público e o funil de cadastro (que não tem token na URL)', () => {
    for (const path of ['/', '/guia', '/guia/empresas', '/guia/opticacirculo', '/guia/bahia/feira-de-santana', '/eventos/conexao-empresarial-2026',
      '/anunciar', '/anunciar/passo-1', '/anunciar/passo-6', '/login', '/register', '/pesquisas/perfil-e-negocios', '/termos', '/cliente', '/comercial']) {
      expect(isAnalyticsExcludedPath(path), path).toBe(false);
    }
  });
});

describe('envio ao GA4 com consentimento estrito e fila', () => {
  let gtag: ReturnType<typeof vi.fn>;

  async function freshGa() {
    vi.resetModules();
    return import('../src/lib/analytics/ga');
  }

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    gtag = vi.fn();
    (window as unknown as { gtag?: unknown }).gtag = undefined;
  });

  it('sem consentimento nada é enviado nem guardado', async () => {
    const ga = await freshGa();
    (window as unknown as { gtag: unknown }).gtag = gtag;
    ga.markGaReady();
    ga.trackGa('click_whatsapp', { business_slug: 'x' });
    expect(gtag).not.toHaveBeenCalled();
    window.localStorage.setItem(ga.CONSENT_STORAGE_KEY, 'denied');
    ga.trackGa('click_whatsapp', { business_slug: 'x' });
    expect(gtag).not.toHaveBeenCalled();
  });

  it('com consentimento, evento disparado antes do GA ficar pronto sai quando ele fica (não se perde o primeiro view_business)', async () => {
    const ga = await freshGa();
    window.localStorage.setItem(ga.CONSENT_STORAGE_KEY, 'granted');
    ga.trackGa('view_business', { business_slug: 'otica-exemplo', city: 'Feira de Santana' });
    expect(gtag).not.toHaveBeenCalled();

    (window as unknown as { gtag: unknown }).gtag = gtag;
    ga.markGaReady();
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', 'view_business', { business_slug: 'otica-exemplo', city: 'Feira de Santana' });
  });

  it('depois de pronto envia direto e higieniza os parâmetros', async () => {
    const ga = await freshGa();
    window.localStorage.setItem(ga.CONSENT_STORAGE_KEY, 'granted');
    (window as unknown as { gtag: unknown }).gtag = gtag;
    ga.markGaReady();
    ga.trackGaEvent({ name: 'generate_lead', params: { lead_type: 'event_rsvp', ...({ email: 'a@b.com' } as object) } });
    expect(gtag).toHaveBeenCalledWith('event', 'generate_lead', { lead_type: 'event_rsvp' });
  });

  it('recusar descarta a fila pendente', async () => {
    const ga = await freshGa();
    window.localStorage.setItem(ga.CONSENT_STORAGE_KEY, 'granted');
    ga.trackGa('click_phone', { business_slug: 'x' });
    ga.resetGa();
    (window as unknown as { gtag: unknown }).gtag = gtag;
    ga.markGaReady();
    expect(gtag).not.toHaveBeenCalled();
  });

  it('trackGaOnce dispara no máximo uma vez por sessão e não gasta a chance sem consentimento', async () => {
    const ga = await freshGa();
    (window as unknown as { gtag: unknown }).gtag = gtag;
    ga.markGaReady();
    ga.trackGaOnce('contract_signed', 'contract_signed', { plan: 'prata' });
    expect(gtag).not.toHaveBeenCalled(); // sem consentimento

    window.localStorage.setItem(ga.CONSENT_STORAGE_KEY, 'granted');
    ga.trackGaOnce('contract_signed', 'contract_signed', { plan: 'prata' });
    ga.trackGaOnce('contract_signed', 'contract_signed', { plan: 'prata' });
    expect(gtag).toHaveBeenCalledTimes(1);
  });
});

describe('rastreador da página da empresa', () => {
  const business = { id: 'uuid-1', slug: 'otica-exemplo', name: 'Ótica Exemplo', category: 'Ótica', city: 'Feira de Santana', state: 'BA', plan: 'ouro' };

  async function setup() {
    vi.resetModules();
    const trackGa = vi.fn();
    const trackEvent = vi.fn();
    vi.doMock('../src/lib/analytics/ga', () => ({ trackGa, trackGaOnce: vi.fn(), CONSENT_STORAGE_KEY: 'cm_analytics_consent' }));
    vi.doMock('../src/lib/analytics/track-client', () => ({ trackEvent }));
    const { BusinessContactTracker } = await import('../src/components/public/business/BusinessContactTracker');
    return { trackGa, trackEvent, BusinessContactTracker };
  }

  it('dispara view_business uma vez, com os dados públicos da empresa', async () => {
    const { trackGa, BusinessContactTracker } = await setup();
    render(<BusinessContactTracker business={business}><p>perfil</p></BusinessContactTracker>);
    expect(trackGa).toHaveBeenCalledTimes(1);
    expect(trackGa).toHaveBeenCalledWith('view_business', expect.objectContaining({
      business_id: 'uuid-1', business_slug: 'otica-exemplo', business_name: 'Ótica Exemplo', category_name: 'Ótica',
      city: 'Feira de Santana', state: 'BA', plan: 'ouro', source_page: 'business_profile',
    }));
  });

  it('link de WhatsApp comum: vai ao GA4 e à medição própria', async () => {
    const { trackGa, trackEvent, BusinessContactTracker } = await setup();
    const { getByText } = render(
      <BusinessContactTracker business={business}><a href="https://wa.me/5575999998888">Falar</a></BusinessContactTracker>
    );
    trackGa.mockClear();
    fireEvent.click(getByText('Falar'));
    expect(trackGa).toHaveBeenCalledWith('click_whatsapp', expect.objectContaining({ business_slug: 'otica-exemplo' }));
    expect(trackEvent).toHaveBeenCalledWith({ businessId: 'uuid-1', eventType: 'whatsapp_click', source: 'business_profile' });
  });

  it('link que já se registra sozinho (data-cm-tracked): vai ao GA4, mas NÃO duplica a medição própria', async () => {
    const { trackGa, trackEvent, BusinessContactTracker } = await setup();
    const { getByText } = render(
      <BusinessContactTracker business={business}><a href="tel:+5575999998888" data-cm-tracked>Ligar</a></BusinessContactTracker>
    );
    trackGa.mockClear();
    fireEvent.click(getByText('Ligar'));
    expect(trackGa).toHaveBeenCalledWith('click_phone', expect.objectContaining({ business_slug: 'otica-exemplo' }));
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('e-mail, link interno e rede social sem evento no GA não geram evento do GA4', async () => {
    const { trackGa, BusinessContactTracker } = await setup();
    const { getByText } = render(
      <BusinessContactTracker business={business}>
        <a href="mailto:a@b.com">Email</a>
        <a href="/guia/outra">Outra</a>
        <a href="https://facebook.com/x">Face</a>
      </BusinessContactTracker>
    );
    trackGa.mockClear();
    fireEvent.click(getByText('Email'));
    fireEvent.click(getByText('Outra'));
    fireEvent.click(getByText('Face'));
    expect(trackGa).not.toHaveBeenCalled();
  });
});

describe('integração (leitura do código)', () => {
  it('o GoogleAnalytics não registra mais listener global de clique nem view_business (evita duplicar)', () => {
    const source = read('src/components/analytics/GoogleAnalytics.tsx');
    expect(source).not.toContain("addEventListener('click'");
    expect(source).not.toContain('view_business');
    expect(source).toContain('ga-disable-');
    expect(source).toContain('onReady={markGaReady}');
    // consentimento estrito preservado: o script só é montado depois do "Aceitar"
    expect(source).toMatch(/consent === 'granted' \?/);
  });

  it('o GA é montado uma única vez, no layout raiz, e não mais no layout público', () => {
    const root = read('src/app/layout.tsx');
    const pub = read('src/app/(public)/layout.tsx');
    expect(root).toContain('<GoogleAnalytics');
    expect(pub).not.toContain('GoogleAnalytics');
  });

  it('a página da empresa passa o contexto completo ao rastreador', () => {
    const page = read('src/app/(public)/guia/[slug]/page.tsx');
    expect(page).toMatch(/<BusinessContactTracker\s+business=\{\{/);
    for (const field of ['id:', 'slug:', 'name:', 'category:', 'city:', 'state:', 'plan:', 'isPedraFundamental:']) expect(page).toContain(field);
  });

  const eventSources: Array<[GaEventName, string, string]> = [
    ['start_advertiser_signup', 'src/app/anunciar/passo-1/page.tsx', 'start_advertiser_signup'],
    ['complete_advertiser_signup', 'src/app/anunciar/passo-2/business-form.tsx', "'complete_advertiser_signup'"],
    ['contract_signed', 'src/app/anunciar/passo-5/contract-signing-client.tsx', "'contract_signed'"],
    ['contract_signed', 'src/app/anunciar/passo-7/contract-step-client.tsx', "'contract_signed'"],
    ['payment_confirmed', 'src/app/anunciar/passo-6/checkout-payment-client.tsx', "'payment_confirmed'"],
    ['generate_lead', 'src/components/landing/LandingLeadCapture.tsx', "'generate_lead'"],
    ['generate_lead', 'src/components/events/EventRSVPForm.tsx', "'generate_lead'"],
    ['favorite_business', 'src/lib/directory/favorites-context.tsx', "'favorite_business'"],
    ['view_offer', 'src/components/public/business/sections/BusinessBenefits.tsx', "'view_offer'"],
    ['share_business', 'src/components/public/business/BusinessShareActions.tsx', "'share_business'"],
    ['view_city', 'src/app/(public)/guia/[slug]/[cidade]/page.tsx', 'view_city'],
    ['view_category', 'src/app/(public)/guia/[slug]/[cidade]/[categoria]/page.tsx', 'view_category'],
    ['search_business', 'src/app/(public)/guia/empresas/page.tsx', 'search_business'],
    ['select_city', 'src/app/(public)/guia/empresas/page.tsx', 'select_city'],
    ['select_category', 'src/app/(public)/guia/empresas/page.tsx', 'select_category'],
  ];

  it.each(eventSources)('o evento %s é disparado em %s', (_name, file, needle) => {
    expect(read(file)).toContain(needle);
  });

  it('o evento do lead da home e o da presença só enviam o tipo, nunca dados da pessoa', () => {
    const lead = read('src/components/landing/LandingLeadCapture.tsx');
    const rsvp = read('src/components/events/EventRSVPForm.tsx');
    const leadCall = lead.slice(lead.indexOf("trackGa('generate_lead'"), lead.indexOf("trackGa('generate_lead'") + 160);
    const rsvpCall = rsvp.slice(rsvp.indexOf("trackGa('generate_lead'"), rsvp.indexOf("trackGa('generate_lead'") + 160);
    for (const call of [leadCall, rsvpCall]) expect(call).not.toMatch(/fullName|email|phone|whatsapp|companyName/i);
  });
});
