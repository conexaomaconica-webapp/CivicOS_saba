import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { resolveTenantIdServer } from '@/lib/supabase/server';
import { isCommercialModuleEnvEnabled } from '@/lib/commercial/feature-flag';
import { isValidReferralCode } from '@/lib/commercial/commercial-utils';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'cm_ref';

/**
 * Link de indicação do representante: /r/REP-XXXXXXXX
 * - Módulo desativado: 404 (a rota não existe).
 * - Sempre redireciona ao funil de cadastro existente (/anunciar), válido ou não o código, para não permitir
 *   enumeração de códigos.
 * - Código válido de representante ATIVO: grava a evidência (referral_link_visit) uma vez por navegador e define o
 *   cookie httpOnly cm_ref pelo prazo de validade da indicação (padrão 30 dias).
 * O funil de cadastro atual NÃO lê este cookie ainda (integração com o onboarding exige aprovação específica);
 * a atribuição é criada pela equipe comercial, que usa esta evidência como prova de origem.
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

    const alreadyTracked = request.cookies.get(COOKIE_NAME)?.value === normalized;
    if (!alreadyTracked) {
      await writer.from('commercial_referral_evidence').insert({
        tenant_id: tenantId,
        representative_id: rep.id,
        evidence_type: 'referral_link_visit',
        reference_code: normalized,
        evidence: {
          landing: '/anunciar',
          referrer: (request.headers.get('referer') ?? '').slice(0, 300) || null,
        },
      });
    }

    response.cookies.set(COOKIE_NAME, normalized, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: Math.max(1, Number(settings.referral_validity_days ?? 30)) * 24 * 60 * 60,
    });
  } catch {
    // Falha de registro nunca impede o visitante de seguir para o cadastro.
  }
  return response;
}
