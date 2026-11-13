import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string };

export const fail = (error: string): { success: false; error: string } => ({ success: false, error });

/** Cliente com chave de serviço — usar SOMENTE depois de assertCommercialPermission/contexto do representante. */
export function requireWriter(): SupabaseClient {
  const writer = createServiceRoleClient();
  if (!writer) throw new Error('Configuração segura do servidor indisponível.');
  return writer;
}

/** Trilha de auditoria (admin_audit_logs: entity_id UUID obrigatório; action até 50 caracteres). */
export async function auditCommercial(
  writer: SupabaseClient,
  entry: {
    tenantId: string;
    actorId: string;
    entityType: string;
    entityId: string;
    action: string;
    before?: unknown;
    after?: unknown;
    reason?: string | null;
  },
): Promise<void> {
  try {
    await writer.from('admin_audit_logs').insert({
      tenant_id: entry.tenantId,
      actor_id: entry.actorId,
      entity_type: entry.entityType.slice(0, 50),
      entity_id: entry.entityId,
      action: entry.action.slice(0, 50),
      before_value: entry.before ?? null,
      after_value: entry.after ?? null,
      reason: entry.reason ?? null,
    });
  } catch (error) {
    // A auditoria nunca derruba a operação já concluída, mas o erro fica visível no log do servidor.
    console.error('[commercial] falha ao gravar auditoria:', error instanceof Error ? error.message : error);
  }
}
