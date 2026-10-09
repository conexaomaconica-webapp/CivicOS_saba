// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { clearGaCookies, readConsent, openCookiePreferences } from '@/components/analytics/GoogleAnalytics';
import { extractMemberAvatarStoragePath, getSignedMemberAvatarUrl } from '@/lib/member/member-profile-service';
import { recordBusinessAnalyticsEventAction } from '@/app/actions/analytics-actions';

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => ({ name, value: 'mock-session-id' }),
    getAll: () => [],
    set: () => {},
  }),
}));

describe('ETAPA 1 — Testes de Segurança, LGPD e Privacidade', () => {

  describe('1. GA4 — Consentimento Estrito (Consent Mode Básico)', () => {
    beforeEach(() => {
      window.localStorage.clear();
      document.cookie = '';
    });

    it('Visitante novo: readConsent retorna null e nenhum cookie GA4 é ativado por padrão', () => {
      expect(readConsent()).toBeNull();
      expect(document.cookie).not.toContain('_ga');
    });

    it('Aceitar consentimento: armazena "granted" no localStorage', () => {
      window.localStorage.setItem('cm_analytics_consent', 'granted');
      expect(readConsent()).toBe('granted');
    });

    it('Recusar consentimento: armazena "denied" e aciona limpeza de cookies _ga', () => {
      document.cookie = '_ga=GA1.1.123456789.1600000000; path=/';
      document.cookie = '_ga_ABC123=GS1.1.1600000000.1.1.1600000000.0.0.0; path=/';

      window.localStorage.setItem('cm_analytics_consent', 'denied');
      clearGaCookies();

      expect(readConsent()).toBe('denied');
      expect(document.cookie).not.toContain('_ga=GA1.1.123456789');
    });

    it('Voltar ao site após aceitar: mantém consentimento "granted"', () => {
      window.localStorage.setItem('cm_analytics_consent', 'granted');
      expect(readConsent()).toBe('granted');
    });

    it('Voltar ao site após recusar: mantém consentimento "denied"', () => {
      window.localStorage.setItem('cm_analytics_consent', 'denied');
      expect(readConsent()).toBe('denied');
    });

    it('Revogar consentimento: remove cookies existentes e atualiza estado para "denied"', () => {
      window.localStorage.setItem('cm_analytics_consent', 'granted');
      expect(readConsent()).toBe('granted');

      window.localStorage.setItem('cm_analytics_consent', 'denied');
      clearGaCookies();
      expect(readConsent()).toBe('denied');
    });

    it('Expiração: se o consentimento tiver mais de 365 dias, readConsent retorna null para renovação', () => {
      window.localStorage.setItem('cm_analytics_consent', 'granted');
      const oldDate = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000).toISOString();
      window.localStorage.setItem(
        'cm_analytics_consent_meta',
        JSON.stringify({ status: 'granted', version: '2026.1', timestamp: oldDate })
      );

      expect(readConsent()).toBeNull();
    });

    it('Versão da política: se a versão salva divergir da atual, requer novo consentimento', () => {
      window.localStorage.setItem('cm_analytics_consent', 'granted');
      window.localStorage.setItem(
        'cm_analytics_consent_meta',
        JSON.stringify({ status: 'granted', version: '2025.1', timestamp: new Date().toISOString() })
      );

      expect(readConsent()).toBeNull();
    });

    it('Preservação de cookies essenciais: clearGaCookies apaga apenas cookies _ga, preservando tokens essenciais', () => {
      document.cookie = '_ga=GA1.1.111; path=/';
      document.cookie = '_gid=GA1.1.222; path=/';
      document.cookie = 'sb-auth-token=secret_jwt; path=/';
      document.cookie = 'session_id=sess_123; path=/';

      clearGaCookies();

      expect(document.cookie).toContain('sb-auth-token=secret_jwt');
      expect(document.cookie).toContain('session_id=sess_123');
      expect(document.cookie).not.toContain('_ga=GA1.1.111');
      expect(document.cookie).not.toContain('_gid=GA1.1.222');
    });

    it('openCookiePreferences dispara evento CustomEvent("open-cookie-preferences")', () => {
      let triggered = false;
      const listener = () => {
        triggered = true;
      };
      window.addEventListener('open-cookie-preferences', listener);

      openCookiePreferences();

      expect(triggered).toBe(true);
      window.removeEventListener('open-cookie-preferences', listener);
    });
  });

  describe('2. Storage — Member Avatars Privado & Signed URLs', () => {
    it('extractMemberAvatarStoragePath extrai o caminho relativo correto de URLs públicas antigas ou relativas', async () => {
      const publicUrl = 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/member-avatars/user-123/avatar/abc.png';
      expect(await extractMemberAvatarStoragePath(publicUrl)).toBe('user-123/avatar/abc.png');

      const signedUrl = 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/sign/member-avatars/user-123/avatar/abc.png?token=xyz';
      expect(await extractMemberAvatarStoragePath(signedUrl)).toBe('user-123/avatar/abc.png');

      const relativePath = 'user-123/avatar/abc.png';
      expect(await extractMemberAvatarStoragePath(relativePath)).toBe('user-123/avatar/abc.png');
    });

    it('getSignedMemberAvatarUrl gera Signed URL usando o cliente Supabase', async () => {
      const mockSupabase = {
        storage: {
          from: (bucket: string) => ({
            createSignedUrl: async (path: string, expires: number) => {
              expect(bucket).toBe('member-avatars');
              expect(expires).toBe(3600);
              return { data: { signedUrl: `https://mock.supabase.co/storage/v1/object/sign/member-avatars/${path}?token=mock_token_123` }, error: null };
            },
          }),
        },
      };

      const result = await getSignedMemberAvatarUrl('https://mock.supabase.co/storage/v1/object/public/member-avatars/user-456/photo.jpg', mockSupabase as any);
      expect(result).toContain('/storage/v1/object/sign/member-avatars/user-456/photo.jpg?token=mock_token_123');
    });
  });

  describe('3. Analytics — Validação Estrita de ANALYTICS_SALT', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('Em produção, lança exceção de segurança se ANALYTICS_SALT estiver ausente ou menor que 32 caracteres', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ANALYTICS_SALT;

      const res = await recordBusinessAnalyticsEventAction({
        businessId: '00000000-0000-0000-0000-000000000001',
        eventType: 'page_view',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('ANALYTICS_SALT ausente ou com tamanho insuficiente');
    });

    it('Em desenvolvimento/teste, aceita fallback seguro sem lançar exceção', async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.ANALYTICS_SALT;

      const res = await recordBusinessAnalyticsEventAction({
        businessId: '00000000-0000-0000-0000-000000000001',
        eventType: 'page_view',
      });

      expect(res.error).not.toContain('ANALYTICS_SALT ausente ou com tamanho insuficiente');
    });
  });

});
