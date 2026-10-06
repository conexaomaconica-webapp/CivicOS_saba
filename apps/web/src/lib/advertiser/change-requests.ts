import type { ChangeEntity } from '@/lib/advertiser/review-policy';

/**
 * Envia uma alteração para validação da plataforma (função do banco submit_business_change_request).
 * A versão atual continua publicada; só a aprovação do administrador aplica a mudança.
 */
export async function submitBusinessChangeRequest(
  supabase: any,
  args: {
    businessId: string;
    entityType: ChangeEntity;
    entityId?: string | null;
    action: 'create' | 'update';
    payload: Record<string, unknown>;
    previous?: Record<string, unknown> | null;
  }
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('submit_business_change_request', {
    p_business_id: args.businessId,
    p_entity_type: args.entityType,
    p_entity_id: args.entityId ?? null,
    p_action: args.action,
    p_payload: args.payload,
    p_previous: args.previous ?? null,
  });
  if (error || !data) {
    const raw = String(error?.message ?? '');
    const friendly = raw.replace(/^[A-Z_]{3,}:\s*/, '').trim();
    return { ok: false, message: friendly && friendly.length < 200 ? friendly : 'Não foi possível enviar a alteração para análise.' };
  }
  return { ok: true, id: String(data) };
}
