import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { resolveTenantIdServer } from '@/lib/supabase/server';
import { isCommercialModuleEnvEnabled } from '@/lib/commercial/feature-flag';
import {
  addDays,
  generateReferralToken,
  hashReferralToken,
  isValidReferralCode,
  isValidReferralToken,
} from '@/lib/commercial/commercial-utils';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'cm_ref';

/**
 * Link de indicação do representante: /r/REP-XXXXXXXX
 * - Módulo desativado: 404 (a rota não existe).
 * - Sempre redireciona ao funil de cadastro existente (/anunciar), válido ou não o código, para não permitir
 *   enumeração de códigos.
 * - Código válido de representante ATIVO: grava a evidência (referral_link_visit) com um TOKEN ALEATÓRIO e validade
 *   (padrão 30 dias) e entrega ao navegador apenas o token (cookie httpOnly cm_ref). O banco guarda só o hash; o
 *   cookie NÃO contém o código do representante e NÃO é prova de titularidade: ele apenas aponta para a evidência,
 *   que é validada no servidor quando a empresa é cadastrada (referral-claim-service.ts).
 * - first-touch válido: com um token ainda válido e não usado, um novo link NÃO troca o cookie nem estende a validade.
 *   Link de OUTRO representante é registrado só como visita (auditoria), sem token.
 * Uma visita legítima repetida não consome o direito: o token só é consumido ao reivindicar uma empresa.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  if (!isCommercialModuleEnvEnabled()) return new NextResponse(null, { status: 404 });

  const { code } = await context.params;
  const normalized = String(code ?? '').trim().toUpperCase();
  const response = NextResponse.redirect(new URL('/anunciar', request.url), 302);
  if (!isValidReferralCode(normalized)) return response;

  try {
    const writer = createServiceRoleClient();
    if (!writer) return response;
    const tenantId = await resolveTenantIdServer();

    const { data: settings } = await writer
      .from('commercial_settings')
      .select('module_enabled, referral_validity_days')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!settings?.module_enabled) return response;

    const { data: rep } = await writer
      .from('commercial_representatives')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('referral_code', normalized)
      .eq('status', 'active')
      .maybeSingle();
    if (!rep) return response;

    const validityDays = Math.min(365, Math.max(1, Number(settings.referral_validity_days ?? 30)));
    const landing = { landing: '/anunciar', referrer: (request.headers.get('referer') ?? '').slice(0, 300) || null };

    // Token já existente no navegador: ainda vale (não expirado e não usado por uma empresa)?
    let live: { id: string; representative_id: string } | null = null;
    const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
    if (isValidReferralToken(cookieToken)) {
      const { data: existing } = await writer
        .from('commercial_referral_evidence')
        .select('id, representative_id, valid_until, business_id, consumed_at')
        .eq('tenant_id', tenantId)
        .eq('visit_token_hash', hashReferralToken(cookieToken))
        .maybeSingle();
      if (existing && !existing.business_id && !existing.consumed_at && existing.valid_until && new Date(existing.valid_until).getTime() > Date.now()) {
        live = { id: existing.id as string, representative_id: existing.representative_id as string };
      }
    }

    if (live) {
      if (live.representative_id === rep.id) return response; // mesmo representante: nada a registrar nem estender
      // Primeiro toque vale: não troca o cookie. A visita posterior fica registrada (uma vez) para auditoria.
      const { data: already } = await writer
        .from('commercial_referral_evidence')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('representative_id', rep.id)
        .eq('evidence->>superseded_by_evidence_id', live.id)
        .limit(1)
        .maybeSingle();
      if (!already) {
        await writer.from('commercial_referral_evidence').insert({
          tenant_id: tenantId,
          representative_id: rep.id,
          evidence_type: 'referral_link_visit',
          reference_code: normalized,
          evidence: { ...landing, superseded_by_evidence_id: live.id },
        });
      }
      return response;
    }

    const token = generateReferralToken();
    const { error } = await writer.from('commercial_referral_evidence').insert({
      tenant_id: tenantId,
      representative_id: rep.id,
      evidence_type: 'referral_link_visit',
      reference_code: normalized,
      visit_token_hash: hashReferralToken(token),
      valid_until: addDays(new Date(), validityDays).toISOString(),
      evidence: landing,
    });
    if (error) return response; // sem evidência registrada não há cookie

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: validityDays * 24 * 60 * 60,
    });
  } catch {
    // Falha de registro nunca impede o visitante de seguir para o cadastro.
  }
  return response;
}
