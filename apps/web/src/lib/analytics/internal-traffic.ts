import 'server-only';

import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createServerSideClient } from '@/lib/supabase/server';
import { isPlatformAdminRole } from '@/lib/auth/admin-roles';

/**
 * Política das estatísticas comerciais: só interações de visitantes EXTERNOS contam.
 *
 *  Conta:      visitante sem login; usuário logado sem vínculo com a empresa.
 *  NÃO conta:  dono (owner_id), co-dono e equipe ativa da PRÓPRIA empresa; administrador da plataforma;
 *              tráfego automatizado identificado (testes, robôs, verificadores).
 *
 * A decisão é tomada no SERVIDOR, na gravação, a partir da sessão (cookies) e do cabeçalho User-Agent da requisição.
 * Nenhum parâmetro enviado pelo navegador (como "sou admin" ou "é pré-visualização") é confiado.
 * Falha ao identificar = o evento CONTA (nunca se presume identidade; a prevenção de abuso é outro mecanismo).
 * Um usuário logado que é dono de A conta normalmente ao visitar a empresa B (pode ser cliente legítimo).
 */

// Ferramentas de teste e verificadores. Não inclui "bot" genérico para não bloquear nomes de aparelhos.
const AUTOMATED_UA =
  /headlesschrome|playwright|puppeteer|selenium|webdriver|phantomjs|lighthouse|pagespeed|gtmetrix|googlebot|bingbot|yandexbot|baiduspider|duckduckbot|applebot|facebookexternalhit|twitterbot|slackbot|whatsapp\/|linkedinbot|\bcrawler\b|\bspider\b|curl\/|wget\/|python-requests|python-urllib|axios\/|node-fetch|go-http-client|postmanruntime|insomnia\/|k6\/|uptimerobot|vercel-screenshot/i;

export function isAutomatedUserAgent(userAgent: string | null | undefined): boolean {
  return AUTOMATED_UA.test(String(userAgent ?? ''));
}

export type TrafficClassification = {
  /** Tráfego automatizado identificado: nenhum evento comercial é gravado. */
  automated: boolean;
  /** Administrador da plataforma: nenhum evento é gravado, em qualquer empresa. */
  internalAll: boolean;
  /** Empresas (dentre as consultadas) das quais o usuário é dono ou equipe ativa. */
  internalBusinessIds: Set<string>;
};

const NONE: TrafficClassification = { automated: false, internalAll: false, internalBusinessIds: new Set() };

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Classifica a requisição atual para as empresas informadas. Nunca lança erro: se não conseguir, o evento conta. */
export async function classifyTraffic(businessIds: string[]): Promise<TrafficClassification> {
  try {
    const ids = Array.from(new Set(businessIds.filter((id) => typeof id === 'string' && id.length > 0)));
    let userAgent = '';
    try {
      userAgent = (await headers()).get('user-agent') || '';
    } catch {
      userAgent = '';
    }
    if (isAutomatedUserAgent(userAgent)) return { ...NONE, automated: true, internalBusinessIds: new Set() };

    // Sessão do visitante (cookies da requisição). Sem login: visitante público, conta.
    const session = await createServerSideClient();
    const { data } = await session.auth.getUser();
    const userId = data?.user?.id;
    if (!userId) return { ...NONE, internalBusinessIds: new Set() };

    const admin = adminClient();
    if (!admin) return { ...NONE, internalBusinessIds: new Set() };

    // Administrador da plataforma (papel vindo do banco, não do navegador).
    const { data: profile } = await (admin as any).from('profiles').select('role').eq('id', userId).maybeSingle();
    if (isPlatformAdminRole(profile?.role)) return { automated: false, internalAll: true, internalBusinessIds: new Set(ids) };

    if (ids.length === 0) return { ...NONE, internalBusinessIds: new Set() };

    const internal = new Set<string>();
    const [{ data: owned }, { data: memberships }] = await Promise.all([
      (admin as any).from('businesses').select('id').eq('owner_id', userId).in('id', ids),
      (admin as any).from('business_members').select('business_id').eq('user_id', userId).eq('status', 'active').in('business_id', ids),
    ]);
    for (const row of Array.isArray(owned) ? owned : []) internal.add(String(row.id));
    for (const row of Array.isArray(memberships) ? memberships : []) internal.add(String(row.business_id));
    return { automated: false, internalAll: false, internalBusinessIds: internal };
  } catch {
    return { ...NONE, internalBusinessIds: new Set() };
  }
}

/** Esta requisição NÃO deve gerar evento comercial para a empresa? (automatizada, admin, dono ou equipe dela) */
export function shouldExcludeFromMetrics(classification: TrafficClassification, businessId: string): boolean {
  return classification.automated || classification.internalAll || classification.internalBusinessIds.has(businessId);
}
