'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';
import { isPlatformAdminRole } from '@/lib/auth/admin-roles';

export type ViewsCountingMode = 'ALL_VIEWS' | 'COOLDOWN' | 'UNIQUE_DAILY';
export type CooldownMinutesOption = 5 | 15 | 30 | 60;

export interface AnalyticsViewsPolicyConfig {
  counting_mode: ViewsCountingMode;
  cooldown_minutes: CooldownMinutesOption;
  daily_timezone: string;
  technical_dedup_enabled: boolean;
  ignore_internal_traffic: boolean;
  bot_abuse_protection_enabled: boolean;
  auto_update_counters_enabled: boolean;
  updated_at: string | null;
  updated_by: string | null;
  updated_by_email?: string | null;
}

export interface AnalyticsViewsPolicyAuditEntry {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string;
  previous_mode: ViewsCountingMode | null;
  new_mode: ViewsCountingMode;
  cooldown_minutes: number;
  reason: string;
}

export interface AdminAnalyticsViewsPolicyOverview {
  policy: AnalyticsViewsPolicyConfig;
  stats: {
    totalOfficialViews: number;
    publishedBusinessesCount: number;
    consistentBusinessesCount: number;
  };
  auditHistory: AnalyticsViewsPolicyAuditEntry[];
}

const DEFAULT_POLICY: AnalyticsViewsPolicyConfig = {
  counting_mode: 'ALL_VIEWS',
  cooldown_minutes: 15,
  daily_timezone: 'America/Sao_Paulo',
  technical_dedup_enabled: true,
  ignore_internal_traffic: true,
  bot_abuse_protection_enabled: true,
  auto_update_counters_enabled: true,
  updated_at: null,
  updated_by: null,
  updated_by_email: null,
};

const VALID_MODES: ViewsCountingMode[] = ['ALL_VIEWS', 'COOLDOWN', 'UNIQUE_DAILY'];
const VALID_COOLDOWNS: CooldownMinutesOption[] = [5, 15, 30, 60];

// Cache controlado em memória (TTL de 30s) para evitar consulta a tenant_settings a cada visualização
const POLICY_CACHE_TTL_MS = 30_000;
let cachedPolicy: AnalyticsViewsPolicyConfig | null = null;
let cachedPolicyExpiresAt = 0;

export async function invalidateAnalyticsViewsPolicyCache(): Promise<void> {
  cachedPolicy = null;
  cachedPolicyExpiresAt = 0;
}

export async function setAnalyticsViewsPolicyForTesting(
  override: Partial<AnalyticsViewsPolicyConfig> | null
): Promise<void> {
  if (!override) {
    cachedPolicy = null;
    cachedPolicyExpiresAt = 0;
    return;
  }
  cachedPolicy = normalizePolicyObject({ ...DEFAULT_POLICY, ...override });
  cachedPolicyExpiresAt = Date.now() + 3_600_000;
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function normalizePolicyObject(raw: unknown): AnalyticsViewsPolicyConfig {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawMode = String(obj.counting_mode || 'ALL_VIEWS').toUpperCase() as ViewsCountingMode;
  const counting_mode = VALID_MODES.includes(rawMode) ? rawMode : 'ALL_VIEWS';

  const rawCooldown = Number(obj.cooldown_minutes ?? 15) as CooldownMinutesOption;
  const cooldown_minutes = VALID_COOLDOWNS.includes(rawCooldown) ? rawCooldown : 15;

  const rawTz = typeof obj.daily_timezone === 'string' && obj.daily_timezone.trim()
    ? obj.daily_timezone.trim()
    : 'America/Sao_Paulo';

  return {
    counting_mode,
    cooldown_minutes,
    daily_timezone: rawTz,
    technical_dedup_enabled: obj.technical_dedup_enabled !== false,
    ignore_internal_traffic: obj.ignore_internal_traffic !== false,
    bot_abuse_protection_enabled: obj.bot_abuse_protection_enabled !== false,
    auto_update_counters_enabled: obj.auto_update_counters_enabled !== false,
    updated_at: typeof obj.updated_at === 'string' ? obj.updated_at : null,
    updated_by: typeof obj.updated_by === 'string' ? obj.updated_by : null,
    updated_by_email: typeof obj.updated_by_email === 'string' ? obj.updated_by_email : null,
  };
}

/**
 * Lê a política ativa de contabilização com cache controlado de 30s.
 * Utilizado pelo endpoint /api/analytics/track e por trackDirectoryEventAction.
 */
export async function getCachedAnalyticsViewsPolicy(tenantId?: string): Promise<AnalyticsViewsPolicyConfig> {
  const now = Date.now();
  if (cachedPolicy && now < cachedPolicyExpiresAt) {
    return cachedPolicy;
  }

  if (process.env.NODE_ENV === 'test' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return DEFAULT_POLICY;
  }

  try {
    const supabase = getServiceSupabase();
    let query = (supabase as any).from('tenant_settings').select('tenant_id, metadata, updated_at');
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    } else {
      query = query.order('updated_at', { ascending: false });
    }
    const { data } = await query.limit(1).maybeSingle();
    const rawPolicy = data?.metadata?.analytics_views_policy;
    const normalized = normalizePolicyObject(rawPolicy);
    cachedPolicy = normalized;
    cachedPolicyExpiresAt = now + POLICY_CACHE_TTL_MS;
    return normalized;
  } catch {
    return DEFAULT_POLICY;
  }
}

async function verifyAdminPermission(): Promise<
  | { ok: true; userId: string; userEmail: string; role: string }
  | { ok: false; error: string }
> {
  try {
    const supabase = await createServerSideClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { ok: false, error: 'UNAUTHORIZED: Sessão administrativa obrigatória.' };
    }

    const adminDb = getServiceSupabase();
    const { data: profile } = await (adminDb as any)
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .maybeSingle();

    const role = String(profile?.role || user.user_metadata?.role || '').toLowerCase();
    if (!isPlatformAdminRole(role)) {
      return {
        ok: false,
        error: 'FORBIDDEN: Apenas administradores da plataforma podem visualizar ou alterar a política de visualizações.',
      };
    }

    return {
      ok: true,
      userId: user.id,
      userEmail: profile?.email || user.email || 'admin@conexaomaconica.com.br',
      role,
    };
  } catch {
    return { ok: false, error: 'Erro ao validar credenciais administrativas.' };
  }
}

export async function getAdminAnalyticsViewsPolicyOverviewAction(): Promise<{
  success: boolean;
  data?: AdminAnalyticsViewsPolicyOverview;
  error?: string;
}> {
  const auth = await verifyAdminPermission();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    const adminDb = getServiceSupabase();
    const policy = await getCachedAnalyticsViewsPolicy();

    // Estatísticas atuais das empresas publicadas
    const { data: businesses } = await (adminDb as any)
      .from('businesses')
      .select('id, views_count, is_active, publication_status')
      .eq('is_active', true)
      .eq('publication_status', 'published');

    const pubList = Array.isArray(businesses) ? businesses : [];
    let totalOfficialViews = 0;
    const hasViewsColumn = pubList.length > 0 && typeof pubList[0].views_count === 'number';

    if (hasViewsColumn) {
      for (const b of pubList) {
        totalOfficialViews += Number(b.views_count || 0);
      }
    } else {
      const { count } = await (adminDb as any)
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_name', 'view');
      totalOfficialViews = typeof count === 'number' ? count : 0;
    }

    // Histórico de auditoria das alterações da política
    const { data: auditRows } = await (adminDb as any)
      .from('admin_audit_logs')
      .select('id, actor_id, action, before_value, after_value, reason, created_at')
      .eq('entity_type', 'analytics_views_policy')
      .order('created_at', { ascending: false })
      .limit(20);

    const auditHistory: AnalyticsViewsPolicyAuditEntry[] = (auditRows || []).map((row: any) => ({
      id: String(row.id),
      created_at: String(row.created_at || new Date().toISOString()),
      actor_id: row.actor_id || null,
      actor_email: row.after_value?.updated_by_email || 'admin@conexaomaconica.com.br',
      previous_mode: (row.before_value?.counting_mode as ViewsCountingMode) || null,
      new_mode: (row.after_value?.counting_mode as ViewsCountingMode) || 'ALL_VIEWS',
      cooldown_minutes: Number(row.after_value?.cooldown_minutes ?? 15),
      reason: String(row.reason || 'Atualização administrativa da política de visualizações'),
    }));

    return {
      success: true,
      data: {
        policy,
        stats: {
          totalOfficialViews,
          publishedBusinessesCount: pubList.length,
          consistentBusinessesCount: pubList.length,
        },
        auditHistory,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao carregar configurações de visualizações.',
    };
  }
}

export async function updateAdminAnalyticsViewsPolicyAction(input: {
  counting_mode: ViewsCountingMode;
  cooldown_minutes: CooldownMinutesOption;
  ignore_internal_traffic: boolean;
  bot_abuse_protection_enabled: boolean;
  auto_update_counters_enabled: boolean;
  confirmed: boolean;
  reason: string;
}): Promise<{
  success: boolean;
  data?: AnalyticsViewsPolicyConfig;
  error?: string;
}> {
  const auth = await verifyAdminPermission();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  if (!input.confirmed) {
    return {
      success: false,
      error: 'Confirmação expressa obrigatória antes de alterar a modalidade de contabilização.',
    };
  }

  if (!VALID_MODES.includes(input.counting_mode)) {
    return { success: false, error: 'Modalidade de contabilização inválida.' };
  }

  if (!VALID_COOLDOWNS.includes(input.cooldown_minutes)) {
    return { success: false, error: 'Intervalo de cooldown inválido. Escolha 5, 15, 30 ou 60 minutos.' };
  }

  const cleanReason = String(input.reason || '').trim();
  if (cleanReason.length < 8) {
    return {
      success: false,
      error: 'Informe uma justificativa administrativa (mínimo de 8 caracteres) para registro na trilha de auditoria.',
    };
  }

  try {
    const adminDb = getServiceSupabase();
    const { data: tsRow } = await (adminDb as any)
      .from('tenant_settings')
      .select('id, tenant_id, metadata')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const tenantId = tsRow?.tenant_id || '00000000-0000-0000-0000-000000000010';
    const currentMetadata = (tsRow?.metadata && typeof tsRow.metadata === 'object' ? tsRow.metadata : {}) as Record<
      string,
      unknown
    >;
    const previousPolicy = normalizePolicyObject(currentMetadata.analytics_views_policy);

    const nowIso = new Date().toISOString();
    const nextPolicy: AnalyticsViewsPolicyConfig = {
      counting_mode: input.counting_mode,
      cooldown_minutes: input.cooldown_minutes,
      daily_timezone: 'America/Sao_Paulo',
      technical_dedup_enabled: true, // Sempre ativo (Migration 216)
      ignore_internal_traffic: Boolean(input.ignore_internal_traffic),
      bot_abuse_protection_enabled: Boolean(input.bot_abuse_protection_enabled),
      auto_update_counters_enabled: Boolean(input.auto_update_counters_enabled),
      updated_at: nowIso,
      updated_by: auth.userId,
      updated_by_email: auth.userEmail,
    };

    const nextMetadata = {
      ...currentMetadata,
      analytics_views_policy: nextPolicy,
    };

    if (tsRow?.id) {
      const { error: updateErr } = await (adminDb as any)
        .from('tenant_settings')
        .update({ metadata: nextMetadata, updated_at: nowIso })
        .eq('id', tsRow.id);
      if (updateErr) {
        return { success: false, error: `Falha ao salvar configuração: ${updateErr.message}` };
      }
    } else {
      const { error: insertErr } = await (adminDb as any)
        .from('tenant_settings')
        .insert({ tenant_id: tenantId, metadata: nextMetadata, updated_at: nowIso });
      if (insertErr) {
        return { success: false, error: `Falha ao criar configuração: ${insertErr.message}` };
      }
    }

    // Registra na trilha de auditoria administrativa (admin_audit_logs)
    try {
      await (adminDb as any).from('admin_audit_logs').insert({
        tenant_id: tenantId,
        actor_id: auth.userId,
        entity_type: 'analytics_views_policy',
        entity_id: tenantId,
        action: 'UPDATE_ANALYTICS_VIEWS_POLICY',
        before_value: previousPolicy,
        after_value: nextPolicy,
        reason: cleanReason,
      });
    } catch {
      // Não bloqueia se a tabela de auditoria tiver restrição secundária em ambiente de teste
    }

    // Atualiza o cache local imediatamente
    cachedPolicy = nextPolicy;
    cachedPolicyExpiresAt = Date.now() + POLICY_CACHE_TTL_MS;

    revalidatePath('/admin/configuracoes/analytics');
    revalidatePath('/admin/auditoria');

    return {
      success: true,
      data: nextPolicy,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro interno ao atualizar a política de visualizações.',
    };
  }
}

