import { PEDRA_FUNDAMENTAL_PRICING } from '@/lib/payment/payment-rules-types';

export type CommercialCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'ended'
  | 'archived';

export interface CommercialCampaignSummary {
  id: string | null;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  planCode: string;
  status: CommercialCampaignStatus;
  visibility: 'public' | 'private_link' | 'admin_only';
  payInFullCents: number;
  installmentTotalCents: number;
  installmentsMax: number;
  contractDurationMonths: number;
  recognitionKey: string | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  allowPendingCompletion: boolean;
  allowAdminException: boolean;
  startsAt: string | null;
  endsAt: string | null;
  endedAt: string | null;
  source: 'database' | 'fallback';
}

export interface CampaignExceptionRecord {
  id: string;
  campaignId: string;
  businessId: string | null;
  leadId: string | null;
  targetDocument: string | null;
  targetEmail: string | null;
  justification: string;
  status: 'authorized' | 'consumed' | 'revoked' | 'expired';
  authorizedBy: string;
  expiresAt: string | null;
  consumedBusinessId: string | null;
  consumedAt: string | null;
  createdAt: string;
}

export const PEDRA_FUNDAMENTAL_CAMPAIGN_CODE = 'PEDRA_FUNDAMENTAL';

function normalizeDoc(value?: string | null): string {
  return String(value || '').replace(/\D/g, '');
}

function normalizeEmail(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

export function isCampaignWindowOpen(
  campaign: Pick<CommercialCampaignSummary, 'status' | 'startsAt' | 'endsAt' | 'maxRedemptions' | 'redeemedCount'>,
  now: Date = new Date()
): boolean {
  if (campaign.status !== 'active') return false;
  if (campaign.startsAt && new Date(campaign.startsAt) > now) return false;
  if (campaign.endsAt && new Date(campaign.endsAt) <= now) return false;
  if (
    typeof campaign.maxRedemptions === 'number' &&
    campaign.maxRedemptions > 0 &&
    campaign.redeemedCount >= campaign.maxRedemptions
  ) {
    return false;
  }
  return true;
}

export async function getCommercialCampaignByCode(
  dbClient: any,
  tenantId: string,
  code: string = PEDRA_FUNDAMENTAL_CAMPAIGN_CODE
): Promise<CommercialCampaignSummary> {
  try {
    const { data, error } = await dbClient
      .from('commercial_campaigns')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('code', code)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        tenantId: data.tenant_id,
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        planCode: data.plan_code || 'acacia',
        status: data.status as CommercialCampaignStatus,
        visibility: data.visibility || 'admin_only',
        payInFullCents: Number(data.pay_in_full_cents ?? PEDRA_FUNDAMENTAL_PRICING.payInFullCents),
        installmentTotalCents: Number(data.installment_total_cents ?? PEDRA_FUNDAMENTAL_PRICING.installmentTotalCents),
        installmentsMax: Number(data.installments_max ?? PEDRA_FUNDAMENTAL_PRICING.installmentsMax),
        contractDurationMonths: Number(data.contract_duration_months ?? 24),
        recognitionKey: data.recognition_key ?? 'pedra_fundamental',
        maxRedemptions: data.max_redemptions ?? null,
        redeemedCount: Number(data.redeemed_count ?? 0),
        allowPendingCompletion: data.allow_pending_completion !== false,
        allowAdminException: data.allow_admin_exception !== false,
        startsAt: data.starts_at ?? null,
        endsAt: data.ends_at ?? null,
        endedAt: data.ended_at ?? null,
        source: 'database',
      };
    }
  } catch {
    // Fallback controlado caso a migration 255 ainda não tenha sido aplicada no ambiente
  }

  return {
    id: null,
    tenantId,
    code,
    name: 'Pedra Fundamental — Lançamento Oficial',
    description: 'Condição especial de lançamento (Plano Acácia Bienal 24 meses).',
    planCode: 'acacia',
    status: 'active',
    visibility: 'admin_only',
    payInFullCents: PEDRA_FUNDAMENTAL_PRICING.payInFullCents,
    installmentTotalCents: PEDRA_FUNDAMENTAL_PRICING.installmentTotalCents,
    installmentsMax: PEDRA_FUNDAMENTAL_PRICING.installmentsMax,
    contractDurationMonths: 24,
    recognitionKey: 'pedra_fundamental',
    maxRedemptions: null,
    redeemedCount: 0,
    allowPendingCompletion: true,
    allowAdminException: true,
    startsAt: null,
    endsAt: null,
    endedAt: null,
    source: 'fallback',
  };
}

export async function listCampaignExceptions(
  dbClient: any,
  tenantId: string,
  campaignCode: string = PEDRA_FUNDAMENTAL_CAMPAIGN_CODE
): Promise<CampaignExceptionRecord[]> {
  try {
    const campaign = await getCommercialCampaignByCode(dbClient, tenantId, campaignCode);
    if (!campaign.id) return [];

    const { data, error } = await dbClient
      .from('commercial_campaign_exceptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !Array.isArray(data)) return [];
    return data.map((row: any) => ({
      id: row.id,
      campaignId: row.campaign_id,
      businessId: row.business_id ?? null,
      leadId: row.lead_id ?? null,
      targetDocument: row.target_document ?? null,
      targetEmail: row.target_email ?? null,
      justification: row.justification,
      status: row.status,
      authorizedBy: row.authorized_by,
      expiresAt: row.expires_at ?? null,
      consumedBusinessId: row.consumed_business_id ?? null,
      consumedAt: row.consumed_at ?? null,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export interface EnrollmentCheckInput {
  tenantId: string;
  campaignCode?: string;
  businessId?: string | null;
  targetDocument?: string | null;
  targetEmail?: string | null;
  exceptionId?: string | null;
  consumeSlot?: boolean;
}

export interface EnrollmentCheckResult {
  allowed: boolean;
  mode: 'active_campaign' | 'pending_completion' | 'authorized_exception' | 'blocked';
  campaign: CommercialCampaignSummary;
  exceptionId: string | null;
  error?: string;
}

/**
 * Gate canônico no backend para novas adesões ou conclusão de contratações pendentes.
 * - Preserva contratações legítimas já iniciadas em business_commercial_terms (allowPendingCompletion).
 * - Quando encerrada/pausada, só permite mediante exceção individual vinculada a empresa/lead/documento/e-mail.
 * - Nunca faz desbloqueio global temporário.
 */
export async function validateCampaignEnrollment(
  dbClient: any,
  input: EnrollmentCheckInput
): Promise<EnrollmentCheckResult> {
  const code = input.campaignCode || PEDRA_FUNDAMENTAL_CAMPAIGN_CODE;
  const campaign = await getCommercialCampaignByCode(dbClient, input.tenantId, code);

  // 1. Contratação pendente já existente em business_commercial_terms
  if (input.businessId && campaign.allowPendingCompletion) {
    try {
      const { data: existingTerms } = await dbClient
        .from('business_commercial_terms')
        .select('id, is_pedra_fundamental, campaign_code')
        .eq('tenant_id', input.tenantId)
        .eq('business_id', input.businessId)
        .maybeSingle();

      if (
        existingTerms &&
        (existingTerms.is_pedra_fundamental || existingTerms.campaign_code === code)
      ) {
        return {
          allowed: true,
          mode: 'pending_completion',
          campaign,
          exceptionId: null,
        };
      }
    } catch {
      // Segue para validação da campanha
    }
  }

  // 2. Se a campanha está no banco e consumeSlot foi solicitado, usa RPC transacional race-safe
  if (campaign.source === 'database' && input.consumeSlot) {
    try {
      const { data: rpcRows, error: rpcErr } = await dbClient.rpc('consume_commercial_campaign_slot', {
        p_tenant_id: input.tenantId,
        p_campaign_code: code,
        p_business_id: input.businessId ?? null,
        p_target_document: input.targetDocument ?? null,
        p_target_email: input.targetEmail ?? null,
        p_exception_id: input.exceptionId ?? null,
      });

      const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
      if (!rpcErr && row) {
        if (row.allowed) {
          return {
            allowed: true,
            mode: row.used_exception_id ? 'authorized_exception' : 'active_campaign',
            campaign,
            exceptionId: row.used_exception_id ?? null,
          };
        }
        return {
          allowed: false,
          mode: 'blocked',
          campaign,
          exceptionId: null,
          error: buildClosedCampaignMessage(campaign, row.reason),
        };
      }
    } catch {
      // Continua para validação determinística abaixo em ambientes sem RPC
    }
  }

  // 3. Verificação determinística (somente leitura ou fallback)
  if (isCampaignWindowOpen(campaign)) {
    return {
      allowed: true,
      mode: 'active_campaign',
      campaign,
      exceptionId: null,
    };
  }

  // 4. Exceção individual vinculada
  if (campaign.allowAdminException && campaign.id) {
    const doc = normalizeDoc(input.targetDocument);
    const email = normalizeEmail(input.targetEmail);
    const exceptions = await listCampaignExceptions(dbClient, input.tenantId, code);
    const now = new Date();
    const matched = exceptions.find((exc) => {
      if (exc.status !== 'authorized') return false;
      if (exc.expiresAt && new Date(exc.expiresAt) <= now) return false;
      if (input.exceptionId && exc.id === input.exceptionId) return true;
      if (input.businessId && exc.businessId === input.businessId) return true;
      if (doc && normalizeDoc(exc.targetDocument) === doc) return true;
      if (email && normalizeEmail(exc.targetEmail) === email) return true;
      return false;
    });

    if (matched) {
      return {
        allowed: true,
        mode: 'authorized_exception',
        campaign,
        exceptionId: matched.id,
      };
    }
  }

  return {
    allowed: false,
    mode: 'blocked',
    campaign,
    exceptionId: null,
    error: buildClosedCampaignMessage(campaign),
  };
}

function buildClosedCampaignMessage(campaign: CommercialCampaignSummary, reason?: string): string {
  if (reason === 'CAMPAIGN_CAPACITY_REACHED' || (campaign.maxRedemptions && campaign.redeemedCount >= campaign.maxRedemptions)) {
    return `A campanha ${campaign.name} atingiu o limite de adesões e não aceita novas contratações convencionais sem exceção autorizada.`;
  }
  if (campaign.status === 'paused' || reason === 'CAMPAIGN_PAUSED') {
    return `A campanha ${campaign.name} está temporariamente pausada. Novas adesões exigem exceção administrativa vinculada.`;
  }
  return `A campanha ${campaign.name} está encerrada para novas adesões públicas e administrativas convencionais. Utilize o Plano Acácia regular ou registre uma exceção vinculada à empresa/lead.`;
}

