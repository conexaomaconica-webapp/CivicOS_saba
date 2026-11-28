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
 * Extrai de forma confiável o endereço IP do cliente atrás da infraestrutura Vercel / Proxy reverso.
 * Prioriza `x-vercel-forwarded-for` e `x-real-ip` (injetados pela borda da Vercel) antes do primeiro hop de `x-forwarded-for`.
 * O IP bruto é utilizado exclusivamente em memória para derivação do HMAC e jamais é persistido.
 */
export function extractTrustedClientIp(headersLike: { get(name: string): string | null }): string {
  const vercelIp = headersLike.get('x-vercel-forwarded-for');
  if (vercelIp && vercelIp.trim()) {
    return (vercelIp.split(',')[0] || '127.0.0.1').trim();
  }
  const realIp = headersLike.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }
  const forwardedFor = headersLike.get('x-forwarded-for');
  if (forwardedFor && forwardedFor.trim()) {
    return (forwardedFor.split(',')[0] || '127.0.0.1').trim();
  }
  return '127.0.0.1';
}

/**
 * Gera identificador pseudonimizado criptograficamente forte (HMAC-SHA256)
 * para estimativa de visitantes únicos diários, sem salvar IP ou User-Agent brutos.
 *
 * Características de conformidade LGPD:
 * - Não reversível sem o segredo do servidor.
 * - Rotação por data para limitar rastreamento longitudinal não consentido.
 * - Isolamento opcional por tenant e suporte a usuário autenticado quando disponível.
 * - Desacoplado do cookie persistente de indicações (cm_vid).
 */
export function generatePseudonymousSubjectId(input: {
  visitorKey?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  dateStr?: string;
  salt?: string;
  tenantId?: string | null;
  userId?: string | null;
}): string {
  const salt = input.salt || getAnalyticsServerSalt();
  const date = input.dateStr || new Date().toISOString().slice(0, 10);
  const tenantPrefix = input.tenantId ? `t_${input.tenantId}_` : '';

  if (input.userId && input.userId.trim().length >= 8) {
    const hmac = crypto
      .createHmac('sha256', salt)
      .update(`${tenantPrefix}uid_${input.userId.trim()}_${date}`)
      .digest('hex');
    return `usr_${hmac.slice(0, 28)}`;
  }

  if (input.visitorKey && input.visitorKey.length >= 16) {
    // Deriva um hash opaco a partir do visitorKey com o segredo do servidor + data.
    // O cookie de indicação permanece funcional, mas seu valor bruto nunca entra em analytics_events.
    const hmac = crypto
      .createHmac('sha256', salt)
      .update(`${tenantPrefix}vk_${input.visitorKey}_${date}`)
      .digest('hex');
    return `vid_${hmac.slice(0, 28)}`;
  }

  const rawIp = ((input.ip || '127.0.0.1').split(',')[0] || '127.0.0.1').trim();
  const rawUa = (input.userAgent || 'unknown_agent').slice(0, 120);

  // HMAC-SHA256 forte com segredo do servidor e rotação diária
  const hmac = crypto
    .createHmac('sha256', salt)
    .update(`${tenantPrefix}${rawIp}|${rawUa}|${date}`)
    .digest('hex');
  return `h_${hmac.slice(0, 30)}`;
}

/**
 * Gera chave pseudonimizada contínua (sem corte na meia-noite) para janelas de COOLDOWN (5 a 60 min)
 * que atravessem a transição entre dias (ex.: acesso às 23:58 e novo acesso às 00:02).
 * Isolada por tenant e protegida por HMAC-SHA256 com o segredo privado do servidor.
 */
export function generateCooldownSubjectId(input: {
  tenantId?: string | null;
  userId?: string | null;
  visitorKey?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  salt?: string;
}): string {
  const salt = input.salt || getAnalyticsServerSalt();
  const tenantScope = input.tenantId || 'default_tenant';

  if (input.userId && input.userId.trim().length >= 8) {
    const hmac = crypto
      .createHmac('sha256', salt)
      .update(`cd_uid|${tenantScope}|${input.userId.trim()}`)
      .digest('hex');
    return `cd_${hmac.slice(0, 28)}`;
  }

  if (input.visitorKey && input.visitorKey.length >= 16) {
    const hmac = crypto
      .createHmac('sha256', salt)
      .update(`cd_vk|${tenantScope}|${input.visitorKey}`)
      .digest('hex');
    return `cd_${hmac.slice(0, 28)}`;
  }

  const rawIp = ((input.ip || '127.0.0.1').split(',')[0] || '127.0.0.1').trim();
  const rawUa = (input.userAgent || 'unknown_agent').slice(0, 120);
  const hmac = crypto
    .createHmac('sha256', salt)
    .update(`cd_net|${tenantScope}|${rawIp}|${rawUa}`)
    .digest('hex');
  return `cd_${hmac.slice(0, 28)}`;
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
