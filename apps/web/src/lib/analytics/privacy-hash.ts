import crypto from 'crypto';

/**
 * Segredo criptográfico do servidor para pseudonimização do Analytics (LGPD).
 * NUNCA exposto ao cliente/navegador. Previne ataques de dicionário e tabelas arco-íris contra IPs/UAs.
 */
export function getAnalyticsServerSalt(): string {
  return (
    process.env.ANALYTICS_SALT ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'saba-secure-analytics-pepper-2026'
  );
}

/**
 * Gera identificador pseudonimizado criptograficamente forte (HMAC-SHA256)
 * para estimativa de visitantes únicos diários, sem salvar IP ou User-Agent brutos.
 *
 * Características de conformidade LGPD:
 * - Não reversível sem o segredo do servidor.
 * - Rotação por data para limitar rastreamento longitudinal não consentido.
 * - Desacoplado do cookie persistente de indicações (cm_vid).
 */
export function generatePseudonymousSubjectId(input: {
  visitorKey?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  dateStr?: string;
  salt?: string;
}): string {
  const salt = input.salt || getAnalyticsServerSalt();
  const date = input.dateStr || new Date().toISOString().slice(0, 10);

  if (input.visitorKey && input.visitorKey.length >= 16) {
    // Deriva um hash opaco a partir do visitorKey com o segredo do servidor + data.
    // O cookie de indicação permanece funcional, mas seu valor bruto nunca entra em analytics_events.
    const hmac = crypto.createHmac('sha256', salt).update(`vk_${input.visitorKey}_${date}`).digest('hex');
    return `vid_${hmac.slice(0, 28)}`;
  }

  const rawIp = ((input.ip || '127.0.0.1').split(',')[0] || '127.0.0.1').trim();
  const rawUa = (input.userAgent || 'unknown_agent').slice(0, 120);

  // HMAC-SHA256 forte com segredo do servidor e rotação diária
  const hmac = crypto.createHmac('sha256', salt).update(`${rawIp}|${rawUa}|${date}`).digest('hex');
  return `h_${hmac.slice(0, 30)}`;
}

/**
 * Gera hash de sessão efêmero para deduplicação de impressões em lote na busca.
 */
export function generateSearchSessionHash(input: {
  ip?: string | null;
  userAgent?: string | null;
  dateStr?: string;
  salt?: string;
}): string {
  const salt = input.salt || getAnalyticsServerSalt();
  const date = input.dateStr || new Date().toISOString().slice(0, 10);
  const rawIp = ((input.ip || '127.0.0.1').split(',')[0] || '127.0.0.1').trim();
  const rawUa = (input.userAgent || 'unknown_agent').slice(0, 120);

  return crypto.createHmac('sha256', salt).update(`search_${rawIp}_${rawUa}_${date}`).digest('hex').slice(0, 32);
}
