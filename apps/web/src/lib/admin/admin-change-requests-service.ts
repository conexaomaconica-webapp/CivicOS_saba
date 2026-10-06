'use server';

import { revalidatePath } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';
import { CHANGE_ENTITY_LABEL, PROFILE_FIELD_LABEL, type ChangeEntity } from '@/lib/advertiser/review-policy';

export interface AdminChangeRequestItem {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string | null;
  entityType: ChangeEntity;
  entityLabel: string;
  action: 'create' | 'update';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'superseded';
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  /** Comparação linha a linha (campo, valor atual, valor proposto) para o administrador decidir. */
  diff: Array<{ label: string; before: string; after: string }>;
  /** Imagem atual e proposta (logo, capa, foto), quando for mídia. */
  imageBefore: string | null;
  imageAfter: string | null;
}

const BENEFIT_FIELD_LABEL: Record<string, string> = {
  title: 'Título',
  description: 'Descrição',
  benefit_type: 'Tipo',
  discount_code: 'Código promocional',
  redeem_instructions: 'Regras de resgate',
  target_plan_name: 'Plano solicitado',
  current_plan_name: 'Plano atual',
  price_label: 'Valor anual',
};

function textOf(value: unknown): string {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

function buildDiff(entityType: ChangeEntity, payload: Record<string, unknown>, previous: Record<string, unknown> | null) {
  const labels: Record<string, string> =
    entityType === 'profile' ? (PROFILE_FIELD_LABEL as Record<string, string>) : entityType === 'benefit' || entityType === 'plan' ? BENEFIT_FIELD_LABEL : {};
  return Object.keys(payload)
    .filter((key) => key !== 'url' && key !== 'target_plan')
    .map((key) => ({
      label: labels[key] ?? key,
      before: textOf(previous?.[key]),
      after: textOf(payload[key]),
    }));
}

function toItem(row: any): AdminChangeRequestItem {
  const entityType = row.entity_type as ChangeEntity;
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const previous = (row.previous ?? null) as Record<string, unknown> | null;
  const isMedia = entityType === 'logo' || entityType === 'cover' || entityType === 'gallery' || entityType === 'video';
  const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    businessName: String(business?.name ?? 'Empresa'),
    businessSlug: business?.slug ?? null,
    entityType,
    entityLabel: CHANGE_ENTITY_LABEL[entityType] ?? entityType,
    action: row.action,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at ?? null,
    reviewNote: row.review_note ?? null,
    diff: buildDiff(entityType, payload, previous),
    imageBefore: isMedia && entityType !== 'video' && typeof previous?.url === 'string' ? previous.url : null,
    imageAfter: isMedia && entityType !== 'video' && typeof payload.url === 'string' ? payload.url : null,
  };
}

/** Fila de alterações dos anunciantes. A permissão é do banco (RLS: só administradores do tenant enxergam). */
export async function listChangeRequestsForAdminAction(
  view: 'pending' | 'decided' = 'pending'
): Promise<{ success: boolean; items: AdminChangeRequestItem[]; error?: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { success: false, items: [], error: 'Sessão expirada. Entre novamente.' };

    let query = (supabase as any)
      .from('business_change_requests')
      .select('id, business_id, entity_type, action, status, payload, previous, submitted_at, reviewed_at, review_note, businesses(name, slug)');
    query =
      view === 'pending'
        ? query.eq('status', 'pending').order('submitted_at', { ascending: true })
        : query.in('status', ['approved', 'rejected']).order('reviewed_at', { ascending: false }).limit(40);

    const { data, error } = await query;
    if (error) return { success: false, items: [], error: 'Não foi possível carregar as alterações.' };
    return { success: true, items: (Array.isArray(data) ? data : []).map(toItem) };
  } catch (err) {
    console.error('[listChangeRequestsForAdminAction]', err);
    return { success: false, items: [], error: 'Não foi possível carregar as alterações.' };
  }
}

/** Aprova (aplica a alteração no Guia) ou recusa (com motivo obrigatório). */
export async function decideChangeRequestAction(
  requestId: string,
  decision: 'approve' | 'reject',
  note?: string,
  entityType?: ChangeEntity
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createServerSideClient();
    const { error } = await (supabase as any).rpc('decide_business_change_request', {
      p_request_id: requestId,
      p_decision: decision,
      p_note: note?.trim() || null,
    });
    if (error) {
      const friendly = String(error.message ?? '').replace(/^[A-Z_]{3,}:\s*/, '').trim();
      return { success: false, message: friendly && friendly.length < 200 ? friendly : 'Não foi possível registrar a decisão.' };
    }
    revalidatePath('/admin/alteracoes');
    revalidatePath('/guia', 'layout');
    return {
      success: true,
      message:
        decision === 'reject'
          ? 'Alteração recusada. O anunciante foi avisado.'
          : entityType === 'plan'
            ? 'Pedido de mudança de plano aceito. Conclua a contratação em Empresas > Contratação.'
            : 'Alteração aprovada e publicada no Guia.',
    };
  } catch {
    return { success: false, message: 'Não foi possível registrar a decisão.' };
  }
}

/** Quantidade de alterações aguardando análise (selo do menu do admin). */
export async function countPendingChangeRequestsAction(): Promise<number> {
  try {
    const supabase = await createServerSideClient();
    const { count } = await (supabase as any)
      .from('business_change_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    return count ?? 0;
  } catch {
    return 0;
  }
}
