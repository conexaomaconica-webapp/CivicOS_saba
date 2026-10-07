'use server';

import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';
import { dispatchNotification, getAdminSupabase } from '@/lib/notifications/notification-core';
import { suggestionsFromIssues } from '@/lib/advertiser/advertiser-seo-service';
import { scoreBusinessSeo } from '@/lib/seo/seo-score';
import { SEO_BUSINESS_SELECT, buildSeoRowFacts } from '@/lib/seo/seo-score-input';

const REMINDER_COOLDOWN_DAYS = 7;

/**
 * O admin envia ao anunciante um lembrete com as melhorias de perfil que mais ajudam (aviso no portal e e-mail).
 * É sempre uma ação do admin, nunca automática: não há risco de disparo em massa. No máximo 1 lembrete por semana por anunciante.
 */
export async function sendSeoReminderAction(businessId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await assertPlatformAdminAccess();

    const { data: row, error } = await (supabase as any)
      .from('businesses')
      .select(`${SEO_BUSINESS_SELECT}, owner_id, tenant_id, publication_status`)
      .eq('id', businessId)
      .maybeSingle();
    if (error || !row) return { success: false, error: 'Empresa não encontrada.' };
    if (!row.owner_id) return { success: false, error: 'Esta empresa não tem um responsável vinculado para receber o aviso.' };

    const result = scoreBusinessSeo(buildSeoRowFacts(row).scoreInput);
    const profile = suggestionsFromIssues(result.issues);
    if (profile.length === 0) return { success: false, error: 'O perfil já está completo: não há melhorias para avisar.' };

    const admin = getAdminSupabase();
    const { data: owner, error: ownerError } = await admin.auth.admin.getUserById(row.owner_id);
    const email = owner?.user?.email;
    if (ownerError || !email) return { success: false, error: 'Não foi possível encontrar o e-mail do responsável.' };

    const since = new Date(Date.now() - REMINDER_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await (admin as any)
      .from('operational_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_email', email)
      .eq('event_type', 'profile_improvement')
      .gte('created_at', since);
    if ((count ?? 0) > 0) {
      return { success: false, error: `Este anunciante já recebeu um lembrete nos últimos ${REMINDER_COOLDOWN_DAYS} dias.` };
    }

    const list = profile.map((item) => `• ${item.label}`).join('\n');
    const sent = await dispatchNotification({
      tenantId: row.tenant_id,
      recipientId: row.owner_id,
      recipientEmail: email,
      eventType: 'profile_improvement',
      title: 'Complete seu perfil e seja mais encontrado',
      body: `Seu perfil está com nota ${result.score}/100. Estas melhorias ajudam sua empresa a ser mais encontrada:\n${list}`,
      actionUrl: '/anunciante',
      channel: 'both',
    });
    if (!sent.success) {
      return {
        success: false,
        error: 'Não foi possível enviar o aviso. Se a migration 198 ainda não foi aplicada, aplique-a e tente de novo.',
      };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao enviar o lembrete.' };
  }
}
