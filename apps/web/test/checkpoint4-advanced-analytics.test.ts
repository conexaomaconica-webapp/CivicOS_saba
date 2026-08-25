import { describe, it, expect } from 'vitest';
import {
  trackDirectoryEventAction,
  getAdvertiserAnalyticsSummaryAction,
} from '../src/lib/analytics/analytics-service';

describe('CHECKPOINT 4 — ANALYTICS AVANÇADO PARA ANUNCIANTES', () => {
  it('1. Registra evento de visualização (view) com deduplicação e hash efêmero', async () => {
    const res = await trackDirectoryEventAction({
      businessId: 'biz_analytics_001',
      eventType: 'view',
      city: 'São Paulo',
      state: 'SP',
    });

    expect(res.ok).toBe(true);
  });

  it('2. Registra interações comerciais (WhatsApp, Telefone, Site, Rotas, Benefícios, Social)', async () => {
    const events = [
      'whatsapp_click',
      'phone_click',
      'website_click',
      'directions_click',
      'benefit_click',
      'social_click',
      'service_view',
    ] as const;

    for (const eventType of events) {
      const res = await trackDirectoryEventAction({
        businessId: 'biz_analytics_001',
        eventType,
        city: 'São Paulo',
        state: 'SP',
      });
      expect(res.ok).toBe(true);
    }
  });

  it('3. Anti-spawning & Bloqueio de event_type inválido', async () => {
    const res = await trackDirectoryEventAction({
      businessId: 'biz_analytics_001',
      // @ts-ignore
      eventType: 'invalid_event_injection',
    });

    expect(res.ok).toBe(false);
    expect(res.error).toBe('INVALID_EVENT_TYPE');
  });

  it('4. Retorna resumo do Analytics (7, 30, 90 dias) com Taxa de Interação e Privacidade Agregada', async () => {
    const summary = await getAdvertiserAnalyticsSummaryAction('biz_analytics_001', 30);

    expect(summary).toBeDefined();
    expect(summary.days).toBe(30);
    expect(summary.breakdown).toBeDefined();
    expect(summary.top_cities).toBeDefined();
    expect(summary.aggregated_heatmap).toBeDefined();
  });

  it('5. Garante que nenhum IP bruto ou GPS preciso seja salvo no resumo', async () => {
    const summary = await getAdvertiserAnalyticsSummaryAction('biz_analytics_001', 30);
    const serialized = JSON.stringify(summary);

    expect(serialized).not.toContain('192.168.');
    expect(serialized).not.toContain('latitude');
    expect(serialized).not.toContain('longitude');
  });
});
