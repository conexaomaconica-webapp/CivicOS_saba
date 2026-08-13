import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export const COMMUNITY_LINK_TYPES = [
  'owner',
  'equity_partner',
  'family_owner',
  'employee',
  'executive',
  'sales_representative',
  'authorized_agent',
  'institutional_partner',
] as const;

export type CommunityLinkType = (typeof COMMUNITY_LINK_TYPES)[number];

export const COMMUNITY_LINK_TYPE_LABELS: Record<CommunityLinkType, string> = {
  owner: 'Proprietário',
  equity_partner: 'Sócio',
  family_owner: 'Empresa Familiar',
  employee: 'Funcionário',
  executive: 'Diretor Executivo',
  sales_representative: 'Representante Comercial',
  authorized_agent: 'Agente Autorizado',
  institutional_partner: 'Parceiro Institucional',
};

export const COMMUNITY_LINK_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  pending_verification: 'Aguardando Verificação',
  under_review: 'Em Análise',
  correction_requested: 'Correção Solicitada',
  approved: 'Aprovado',
  active: 'Ativo',
  rejected: 'Rejeitado',
  suspended: 'Suspenso',
  expired: 'Expirado',
  revoked: 'Revogado',
};

export type StatusTone = 'neutral' | 'pending' | 'success' | 'danger';

export function getStatusTone(status: string): StatusTone {
  if (status === 'approved' || status === 'active') return 'success';
  if (status === 'rejected' || status === 'suspended' || status === 'expired' || status === 'revoked') {
    return 'danger';
  }
  if (status === 'draft' || status === 'correction_requested') return 'neutral';
  return 'pending';
}

export interface CommunityLinkDto {
  id: string;
  businessName: string;
  businessSlug: string | null;
  organizationName: string | null;
  linkType: CommunityLinkType;
  linkTypeLabel: string;
  status: string;
  statusLabel: string;
  statusTone: StatusTone;
  isPrimary: boolean;
  validUntil: string | null;
  createdAt: string;
}

export interface BusinessOption {
  id: string;
  name: string;
}

export interface RequestLinkResult {
  ok: boolean;
  id?: string;
  error: string | null;
}

export interface SubmitLinkResult {
  ok: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * USR-002 — lists the current user's community links (RLS filters rows to
 * the declaring user / members of their businesses).
 */
export async function listMyCommunityLinks(
  supabase: SupabaseClient<Database>,
): Promise<CommunityLinkDto[]> {
  const { data } = await supabase
    .from('business_masonic_links')
    .select(
      'id, business_id, organization_id, link_type, status, is_primary, valid_until, created_at',
    )
    .order('created_at', { ascending: false });

  if (!data) return [];

  const businessIds = Array.from(new Set(data.map((row) => row.business_id)));
  const organizationIds = Array.from(
    new Set(data.map((row) => row.organization_id).filter((id): id is string => typeof id === 'string')),
  );

  const { data: businessRows } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .in('id', businessIds);
  const businessById = new Map((businessRows ?? []).map((row) => [row.id, row]));

  const organizationById = new Map<string, { id: string; name: string }>();
  if (organizationIds.length > 0) {
    const { data: organizationRows } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', organizationIds);
    for (const row of organizationRows ?? []) {
      organizationById.set(row.id, row);
    }
  }

  return data.map((row) => {
    const business = businessById.get(row.business_id);
    const organization = row.organization_id ? organizationById.get(row.organization_id) : undefined;
    const linkType = row.link_type as CommunityLinkType;
    return {
      id: row.id,
      businessName: business?.name ?? '',
      businessSlug: business?.slug ?? null,
      organizationName: organization?.name ?? null,
      linkType,
      linkTypeLabel: COMMUNITY_LINK_TYPE_LABELS[linkType] ?? row.link_type,
      status: row.status,
      statusLabel: COMMUNITY_LINK_STATUS_LABELS[row.status] ?? row.status,
      statusTone: getStatusTone(row.status),
      isPrimary: row.is_primary,
      validUntil: row.valid_until,
      createdAt: row.created_at,
    };
  });
}

/**
 * USR-002 — lists businesses owned by the current user (selectable when
 * requesting a new community link). RLS keeps this scoped to the owner.
 */
export async function listMyBusinessOptions(
  supabase: SupabaseClient<Database>,
): Promise<BusinessOption[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .order('name', { ascending: true });

  return (data ?? []).map((row) => ({ id: row.id, name: row.name }));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * USR-002 — requests a new community link for one of the user's businesses.
 * The row is created as a `draft`; the declaring_user_id is pinned to the
 * current user so RLS accepts the insert.
 */
export async function requestCommunityLink(
  supabase: SupabaseClient<Database>,
  input: { businessId: string; linkType: CommunityLinkType; organizationId?: string | null },
): Promise<RequestLinkResult> {
  const businessId = input.businessId.trim();

  if (!businessId) {
    return { ok: false, error: 'Selecione uma empresa.' };
  }
  if (!COMMUNITY_LINK_TYPES.includes(input.linkType)) {
    return { ok: false, error: 'Tipo de vínculo inválido.' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Sessão inválida. Entre novamente.' };
  }

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('tenant_id')
    .eq('id', businessId)
    .maybeSingle();
  if (businessError || !business) {
    return { ok: false, error: 'Empresa não encontrada.' };
  }

  const { data, error } = await supabase
    .from('business_masonic_links')
    .insert({
      tenant_id: business.tenant_id,
      business_id: businessId,
      declaring_user_id: user.id,
      link_type: input.linkType,
      organization_id: input.organizationId?.trim() ? input.organizationId.trim() : null,
      status: 'draft',
      is_primary: false,
    })
    .select('id')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, id: data?.id, error: null };
}

/**
 * USR-002 — sends a draft link to the moderation queue (CRIT-VSC-008).
 */
export async function submitLinkForReview(
  supabase: SupabaseClient<Database>,
  linkId: string,
): Promise<SubmitLinkResult> {
  if (!linkId) {
    return { ok: false, error: 'Identificador do vínculo inválido.' };
  }

  const { error } = await supabase
    .from('business_masonic_links')
    .update({ status: 'pending_verification' })
    .eq('id', linkId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}