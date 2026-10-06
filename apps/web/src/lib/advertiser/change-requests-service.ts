'use server';

import { revalidatePath } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';
import { findAdvertiserBusiness } from '@/lib/advertiser/advertiser-access';
import { CHANGE_ENTITY_LABEL, PROFILE_FIELD_LABEL, type ChangeEntity, type ProfileReviewField } from '@/lib/advertiser/review-policy';

export interface ChangeRequestItem {
  id: string;
  entityType: ChangeEntity;
  entityLabel: string;
  /** Resumo curto do que foi enviado (campos alterados ou título da oferta). */
  summary: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'superseded';
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  /** Imagem enviada (logo, capa, foto), para mostrar como "em análise". */
  previewUrl: string | null;
}

function summarizeChange(entityType: ChangeEntity, payload: Record<string, unknown> | null): string {
  const data = payload ?? {};
  if (entityType === 'profile') {
    const labels = Object.keys(data).map((key) => PROFILE_FIELD_LABEL[key as ProfileReviewField] ?? key);
    return labels.join(', ');
  }
  if (entityType === 'benefit') return String(data.title ?? 'Oferta');
  if (entityType === 'plan') return `Mudar para o plano ${String(data.target_plan_name ?? '')}`.trim();
  if (entityType === 'video') return 'Link do vídeo institucional';
  return CHANGE_ENTITY_LABEL[entityType];
}

function toItem(row: any): ChangeRequestItem {
  const entityType = row.entity_type as ChangeEntity;
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const isImage = entityType === 'logo' || entityType === 'cover' || entityType === 'gallery';
  return {
    id: String(row.id),
    entityType,
    entityLabel: CHANGE_ENTITY_LABEL[entityType] ?? entityType,
    summary: summarizeChange(entityType, payload),
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at ?? null,
    reviewNote: row.review_note ?? null,
    previewUrl: isImage && typeof payload.url === 'string' ? payload.url : null,
  };
}

/** Alterações da minha empresa: as que aguardam análise e as decididas recentemente (para ver motivo de recusa). */
export async function listMyChangeRequestsAction(): Promise<{ pending: ChangeRequestItem[]; recent: ChangeRequestItem[] }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { pending: [], recent: [] };
    const business = await findAdvertiserBusiness(supabase, userRes.user.id);
    if (!business) return { pending: [], recent: [] };

    const { data: rows } = await (supabase as any)
      .from('business_change_requests')
      .select('id, entity_type, status, payload, submitted_at, reviewed_at, review_note')
      .eq('business_id', business.id)
      .in('status', ['pending', 'approved', 'rejected'])
      .order('submitted_at', { ascending: false })
      .limit(30);

    const items = (Array.isArray(rows) ? rows : []).map(toItem);
    return {
      pending: items.filter((item) => item.status === 'pending'),
      recent: items.filter((item) => item.status !== 'pending').slice(0, 8),
    };
  } catch {
    return { pending: [], recent: [] };
  }
}

/** Desiste de uma alteração que ainda não foi analisada. */
export async function cancelChangeRequestAction(requestId: string): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data, error } = await (supabase as any).rpc('cancel_business_change_request', { p_request_id: requestId });
    if (error) return { success: false, message: 'Não foi possível cancelar o envio agora.' };
    revalidatePath('/anunciante/empresa');
    revalidatePath('/anunciante/empresa/midias');
    return data === true
      ? { success: true, message: 'Envio cancelado. A versão publicada continua como estava.' }
      : { success: false, message: 'Este envio já foi analisado e não pode mais ser cancelado.' };
  } catch {
    return { success: false, message: 'Não foi possível cancelar o envio agora.' };
  }
}
