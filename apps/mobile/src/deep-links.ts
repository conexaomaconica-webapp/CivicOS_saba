import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export type DeepLinkResult =
  | { readonly type: 'oauth'; readonly code: string; readonly state?: string }
  | { readonly type: 'recovery'; readonly code?: string; readonly tokenHash?: string }
  | { readonly type: 'route'; readonly route: string }
  | { readonly type: 'error'; readonly error: string; readonly errorDescription?: string }
  | { readonly type: 'invalid'; readonly raw?: string };

const SENSITIVE_PARAMS = new Set(['code', 'token', 'access_token', 'refresh_token', 'password', 'token_hash']);

/**
 * Sanitiza URLs de deep link antes de qualquer log em console ou telemetria,
 * substituindo parâmetros sensíveis por [REDACTED].
 */
export function sanitizeDeepLinkForLog(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    for (const key of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_PARAMS.has(key.toLowerCase())) {
        url.searchParams.set(key, '[REDACTED]');
      }
    }
    if (url.hash) {
      url.hash = '#[REDACTED]';
    }
    return url.toString();
  } catch {
    return '[malformed-url]';
  }
}

/**
 * Analisa e classifica uma URL de deep link recebida em cold start ou warm start.
 */
export function parseDeepLinkUrl(rawUrl: string): DeepLinkResult {
  if (!rawUrl || typeof rawUrl !== 'string') return { type: 'invalid' };

  try {
    // Tratamento para schemes customizados sem host clássico (ex: conexaomaconica://guia/empresa)
    let urlString = rawUrl;
    if (urlString.startsWith('conexaomaconica://') && !urlString.includes('://auth')) {
      const pathPart = urlString.replace('conexaomaconica://', '');
      return { type: 'route', route: pathPart.startsWith('/') ? pathPart : `/${pathPart}` };
    }

    // Normaliza para parsing WHATWG URL se necessário
    const parsed = new URL(urlString);

    // 1. Checa por erros de autenticação (OAuth / OTP expirado / access_denied)
    const error = parsed.searchParams.get('error') || parsed.searchParams.get('error_code');
    const errorDescription = parsed.searchParams.get('error_description');
    if (error) {
      return {
        type: 'error',
        error,
        errorDescription: errorDescription ?? undefined,
      };
    }

    // 2. Fluxo de recuperação de senha ou invite
    const typeParam = parsed.searchParams.get('type');
    const code = parsed.searchParams.get('code');
    const tokenHash = parsed.searchParams.get('token_hash');

    if (typeParam === 'recovery' || typeParam === 'invite') {
      return {
        type: 'recovery',
        code: code ?? undefined,
        tokenHash: tokenHash ?? undefined,
      };
    }

    // 3. Callback PKCE padrão do Supabase
    if (code) {
      const state = parsed.searchParams.get('state') ?? undefined;
      return { type: 'oauth', code, state };
    }

    // 4. Fragmento com tokens implícitos (#access_token=...&type=recovery)
    if (parsed.hash && parsed.hash.includes('access_token')) {
      const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
      const hashType = hashParams.get('type');
      if (hashType === 'recovery') {
        return { type: 'recovery' };
      }
      return { type: 'oauth', code: 'implicit_token' };
    }

    // 5. Rotas de navegação direta
    const route = parsed.pathname || parsed.searchParams.get('route');
    if (route && route !== '/' && route !== '/auth/callback') {
      return { type: 'route', route };
    }

    return { type: 'invalid', raw: sanitizeDeepLinkForLog(rawUrl) };
  } catch {
    return { type: 'invalid', raw: '[parse-exception]' };
  }
}

export interface DeepLinkHandlers {
  onOAuthCode?: (code: string, state?: string) => void | Promise<void>;
  onPasswordRecovery?: (info: { code?: string; tokenHash?: string }) => void | Promise<void>;
  onNavigate?: (route: string) => void;
  onError?: (error: string, description?: string) => void;
}

/**
 * Registra listeners de deep link com suporte a:
 * 1. Warm start (appUrlOpen enquanto o app já está em memória).
 * 2. Cold start (getLaunchUrl na inicialização a frio).
 */
export async function setupDeepLinkListeners(handlers: DeepLinkHandlers): Promise<() => void> {
  const dispatch = (result: DeepLinkResult) => {
    switch (result.type) {
      case 'oauth':
        handlers.onOAuthCode?.(result.code, result.state);
        break;
      case 'recovery':
        handlers.onPasswordRecovery?.({ code: result.code, tokenHash: result.tokenHash });
        break;
      case 'route':
        handlers.onNavigate?.(result.route);
        break;
      case 'error':
        handlers.onError?.(result.error, result.errorDescription);
        break;
      default:
        break;
    }
  };

  if (!Capacitor.isNativePlatform()) {
    // Em ambiente web/testes locais, checa a URL inicial
    if (typeof window !== 'undefined' && window.location.href.includes('code=')) {
      dispatch(parseDeepLinkUrl(window.location.href));
    }
    return () => undefined;
  }

  // 1. Warm start
  const sub = await App.addListener('appUrlOpen', (event) => {
    console.log('[DeepLink] Evento appUrlOpen recebido:', sanitizeDeepLinkForLog(event.url));
    const result = parseDeepLinkUrl(event.url);
    dispatch(result);
  });

  // 2. Cold start (abertura a frio)
  try {
    const launch = await App.getLaunchUrl();
    if (launch?.url) {
      console.log('[DeepLink] Launch URL a frio:', sanitizeDeepLinkForLog(launch.url));
      const result = parseDeepLinkUrl(launch.url);
      dispatch(result);
    }
  } catch (err) {
    console.warn('[DeepLink] Erro ao obter launchUrl a frio:', err);
  }

  return () => {
    sub.remove();
  };
}
