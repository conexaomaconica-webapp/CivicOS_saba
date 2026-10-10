/**
 * Reportador de Erros de Cliente para Telemetria Interna — Zero Sentry
 *
 * Envia um beacon leve para /api/telemetry/errors sem impactar a performance
 * do navegador e com fallback 100% silencioso.
 */

export function reportClientError(
  error: Error & { digest?: string },
  source: 'error-boundary' | 'global-error' = 'error-boundary'
): void {
  try {
    if (typeof window === 'undefined') return;

    const payload = {
      digest: error?.digest ? String(error.digest).slice(0, 64) : undefined,
      message: error?.message ? String(error.message).slice(0, 180) : 'Erro desconhecido na interface',
      pathname: window.location?.pathname ? window.location.pathname.slice(0, 100) : '/',
      source,
    };

    const body = JSON.stringify(payload);

    // Usa fetch com keepalive para compatibilidade uniforme com handlers JSON
    void fetch('/api/telemetry/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Falha de envio de telemetria é 100% silenciosa
    });
  } catch {
    // Nenhuma exceção de telemetria afeta a navegação do usuário
  }
}
