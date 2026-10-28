// @vitest-environment jsdom

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import {
  trackDirectoryEventAction,
  resetServerCycleCacheForTesting,
} from '../src/lib/analytics/analytics-service';
import {
  normalizeAnalyticsEventType,
  CANONICAL_ANALYTICS_EVENTS,
} from '../src/lib/analytics/analytics-normalization';
import {
  trackEvent,
  getOrCreateNavigationCycleId,
  resetNavigationCycle,
} from '../src/lib/analytics/track-client';
import { BusinessContactTracker } from '../src/components/public/business/BusinessContactTracker';
import { QuickActionBar } from '../src/components/public/business/shared/BusinessActionButtons';
import { BusinessCard } from '../src/components/public/directory/BusinessCard';
import { FavoritesProvider } from '../src/lib/directory/favorites-context';
import { POST, OPTIONS } from '../src/app/api/analytics/track/route';

const BUSINESS_ID = '123e4567-e89b-42d3-a456-426614174000';
const OTHER_BUSINESS_ID = '223e4567-e89b-42d3-a456-426614174001';

describe('ETAPA A — INTEGRIDADE DOS EVENTOS (P0)', () => {
  beforeEach(async () => {
    cleanup();
    resetNavigationCycle();
    await resetServerCycleCacheForTesting();
    vi.restoreAllMocks();
  });

  describe('1. Unicidade de Responsável por Visualização de Perfil', () => {
    it('BusinessContactTracker é o único responsável por emitir evento view na web', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const business = {
        id: BUSINESS_ID,
        slug: 'empresa-modelo',
        name: 'Empresa Modelo',
        category: 'Consultoria',
        city: 'Feira de Santana',
        state: 'BA',
        plan: 'acacia',
        isPedraFundamental: false,
      };

      render(
        <BusinessContactTracker business={business}>
          <div data-testid="profile-content">Perfil da Empresa</div>
        </BusinessContactTracker>
      );

      // Aguarda execução do useEffect
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockFetch.mock.calls[0]!;
      expect(callArgs[0]).toBe('/api/analytics/track');
      const payload = JSON.parse((callArgs[1] as RequestInit).body as string);
      expect(payload).toMatchObject({
        businessId: BUSINESS_ID,
        eventType: 'view',
        source: 'business_profile',
        city: 'Feira de Santana',
        state: 'BA',
        device: 'web',
      });
      expect(payload.cycleId).toMatch(/^cycle_/);
    });

    it('BusinessCard NÃO dispara evento view ao clicar no link "Ver empresa"', () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const { getByText } = render(
        <FavoritesProvider>
          <BusinessCard
            data={{
              id: BUSINESS_ID,
              slug: 'empresa-modelo',
              name: 'Empresa Modelo',
              category_name: 'Consultoria',
              city: 'Feira de Santana',
              state: 'BA',
            }}
          />
        </FavoritesProvider>
      );

      const link = getByText('Ver empresa');
      fireEvent.click(link);

      // Nenhum evento view deve ser disparado pelo card
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('BusinessActionButtons (toolbar filha) NÃO dispara evento view ao montar', () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      render(
        <QuickActionBar
          businessId={BUSINESS_ID}
          businessName="Empresa Modelo"
          contacts={{
            whatsapp: '75999998888',
            phone: '7533334444',
            website: 'empresa.com.br',
            instagram: 'empresa',
          }}
          location={{
            address: 'Rua das Flores, 100',
            city: 'Feira de Santana',
            state: 'BA',
          }}
        />
      );

      // QuickActionBar não tem mais useEffect para view
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('2. Deduplicação em Memória e Respeito a F5 / SPA', () => {
    it('deduplica chamadas repetidas de view com o mesmo cycleId no cliente (evita StrictMode duplo)', () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const cycleId = getOrCreateNavigationCycleId(BUSINESS_ID);

      // Primeira chamada legítima
      trackEvent({
        businessId: BUSINESS_ID,
        eventType: 'view',
        cycleId,
      });

      // Segunda chamada com mesmo cycleId (ex: StrictMode ou re-render)
      trackEvent({
        businessId: BUSINESS_ID,
        eventType: 'view',
        cycleId,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('F5 (novo ciclo) gera novo cycleId e registra nova visualização legítima', () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      // Primeiro ciclo
      const cycle1 = getOrCreateNavigationCycleId(BUSINESS_ID);
      trackEvent({
        businessId: BUSINESS_ID,
        eventType: 'view',
        cycleId: cycle1,
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Simula recarregamento F5 (memória limpa e novo ciclo)
      resetNavigationCycle();
      const cycle2 = getOrCreateNavigationCycleId(BUSINESS_ID);
      expect(cycle2).not.toBe(cycle1);

      trackEvent({
        businessId: BUSINESS_ID,
        eventType: 'view',
        cycleId: cycle2,
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('Navegação SPA para outra empresa gera novo cycleId automaticamente', () => {
      const cycleA = getOrCreateNavigationCycleId(BUSINESS_ID);
      const cycleB = getOrCreateNavigationCycleId(OTHER_BUSINESS_ID);
      expect(cycleB).not.toBe(cycleA);
    });
  });

  describe('3. Normalização Canônica Web e Mobile (Capacitor)', () => {
    it('normaliza aliases mobile para os nomes canônicos do sistema', () => {
      expect(normalizeAnalyticsEventType('whatsapp')).toBe('whatsapp_click');
      expect(normalizeAnalyticsEventType('phone')).toBe('phone_click');
      expect(normalizeAnalyticsEventType('website')).toBe('website_click');
      expect(normalizeAnalyticsEventType('instagram')).toBe('instagram_click');
      expect(normalizeAnalyticsEventType('route')).toBe('directions_click');
      expect(normalizeAnalyticsEventType('route_click')).toBe('directions_click');
      expect(normalizeAnalyticsEventType('share')).toBe('share');
      expect(normalizeAnalyticsEventType('profile_share')).toBe('share');
      expect(normalizeAnalyticsEventType('view')).toBe('view');
      expect(normalizeAnalyticsEventType('page_view')).toBe('view');
      expect(normalizeAnalyticsEventType('profile_view')).toBe('view');
    });

    it('rejeita eventos desconhecidos, arbitrários ou tentativas de injeção', () => {
      expect(normalizeAnalyticsEventType('hack')).toBeNull();
      expect(normalizeAnalyticsEventType('admin_override')).toBeNull();
      expect(normalizeAnalyticsEventType('undefined')).toBeNull();
      expect(normalizeAnalyticsEventType('')).toBeNull();
      expect(normalizeAnalyticsEventType(null)).toBeNull();
    });

    it('todos os eventos canônicos declarados são mapeados para si mesmos', () => {
      for (const event of CANONICAL_ANALYTICS_EVENTS) {
        expect(normalizeAnalyticsEventType(event)).toBe(event);
      }
    });
  });

  describe('4. Rota /api/analytics/track — Segurança, Headers e Conectividade Mobile', () => {
    const makeReq = (body: unknown, headers: Record<string, string> = {}) =>
      new Request('http://localhost/api/analytics/track', {
        method: 'POST',
        headers: { host: 'localhost', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      });

    it('aceita requisições do app mobile Capacitor (capacitor://localhost)', async () => {
      const req = makeReq(
        {
          businessId: BUSINESS_ID,
          eventType: 'whatsapp',
          device: 'mobile_app',
        },
        { origin: 'capacitor://localhost' }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('capacitor://localhost');
    });

    it('responde OPTIONS com cabeçalhos CORS adequados para Capacitor', async () => {
      const optReq = new Request('http://localhost/api/analytics/track', {
        method: 'OPTIONS',
        headers: { host: 'localhost', origin: 'capacitor://localhost' },
      });

      const res = await OPTIONS(optReq);
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('capacitor://localhost');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('rejeita origem de terceiros não autorizada com 403', async () => {
      const req = makeReq(
        {
          businessId: BUSINESS_ID,
          eventType: 'view',
        },
        { origin: 'https://malicious-external-site.com' }
      );

      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('rejeita cycleId com caracteres inválidos ou tentativas de script com 400', async () => {
      const req = makeReq({
        businessId: BUSINESS_ID,
        eventType: 'view',
        cycleId: '<script>alert("xss")</script>',
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe('5. Concorrência e Deduplicação no Servidor', () => {
    it('trata requisições concorrentes com o mesmo cycleId sem duplicar gravação', async () => {
      const cycleId = 'cycle_concurrent_test_12345678';

      // Dispara 5 requisições estritamente concorrentes via Promise.all
      const results = await Promise.all([
        trackDirectoryEventAction({ businessId: BUSINESS_ID, eventType: 'view', cycleId }),
        trackDirectoryEventAction({ businessId: BUSINESS_ID, eventType: 'view', cycleId }),
        trackDirectoryEventAction({ businessId: BUSINESS_ID, eventType: 'view', cycleId }),
        trackDirectoryEventAction({ businessId: BUSINESS_ID, eventType: 'view', cycleId }),
        trackDirectoryEventAction({ businessId: BUSINESS_ID, eventType: 'view', cycleId }),
      ]);

      // Todas retornam sucesso (200 / ok: true)
      for (const res of results) {
        expect(res.ok).toBe(true);
      }

      // Pelo menos 4 devem ser marcadas como deduplicadas
      const deduplicatedCount = results.filter((r) => r.deduplicated).length;
      expect(deduplicatedCount).toBeGreaterThanOrEqual(4);
    });
  });
});
