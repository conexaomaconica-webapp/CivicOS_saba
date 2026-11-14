'use server';

import { revalidatePath } from 'next/cache';
import { tryCommercialPermission } from './commercial-auth';
import { isCommercialModuleEnvEnabled } from './feature-flag';
import { auditCommercial, fail, requireWriter, type ActionResult } from './commercial-service-base';

export type CommercialSettingsView = {
  envEnabled: boolean;
  exists: boolean;
  module_enabled: boolean;
  link_auto_attribution_enabled: boolean;
  referral_validity_days: number;
  lead_reservation_days: number;
  /** Somente leitura: a captura financeira pertence ao Gate 1D e não é alterada por esta tela. */
  capture_mode: 'off' | 'shadow' | 'strict';
  capture_starts_at: string | null;
  updated_at: string | null;
};

const DEFAULTS = {
  module_enabled: false,
  link_auto_attribution_enabled: false,
  referral_validity_days: 30,
  lead_reservation_days: 60,
  capture_mode: 'off' as const,
  capture_starts_at: null,
  updated_at: null,
};

export async function getCommercialSettingsAction(): Promise<ActionResult<CommercialSettingsView>> {
  const auth = await tryCommercialPermission('settings.manage');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const { data, error } = await writer
      .from('commercial_settings')
      .select('module_enabled, link_auto_attribution_enabled, referral_validity_days, lead_reservation_days, capture_mode, capture_starts_at, updated_at')
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();
    if (error) return fail('Não foi possível ler a configuração.');
    return {
      success: true,
      data: { envEnabled: isCommercialModuleEnvEnabled(), exists: !!data, ...DEFAULTS, ...(data ?? {}) } as CommercialSettingsView,
    };
  } catch {
    return fail('Erro ao ler a configuração.');
  }
}

export async function updateCommercialSettingsAction(input: {
  module_enabled: boolean;
  link_auto_attribution_enabled: boolean;
  referral_validity_days: number;
  lead_reservation_days: number;
  reason: string;
}): Promise<ActionResult> {
  const auth = await tryCommercialPermission('settings.manage');
  if (!auth.ok) return fail(auth.error);

  const reason = (input.reason ?? '').trim();
  if (reason.length < 10) return fail('Informe a justificativa da alteração (mínimo de 10 caracteres).');

  const inRange = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 365;
  if (!inRange(input.referral_validity_days)) return fail('A validade da indicação deve ser um número inteiro entre 1 e 365 dias.');
  if (!inRange(input.lead_reservation_days)) return fail('A reserva de lead deve ser um número inteiro entre 1 e 365 dias.');
  if (input.link_auto_attribution_enabled && !input.module_enabled) {
    return fail('A atribuição automática pelo link só pode ser ligada com o módulo habilitado.');
  }

  try {
    const writer = requireWriter();
    const { data: current } = await writer
      .from('commercial_settings')
      .select('module_enabled, link_auto_attribution_enabled, referral_validity_days, lead_reservation_days, capture_mode, capture_starts_at')
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();

    const captureMode = current?.capture_mode ?? 'off';
    if (input.module_enabled && (captureMode === 'off' || !current?.capture_starts_at)) {
      return fail(
        'O banco só permite habilitar o módulo com a captura financeira configurada (capture_mode diferente de "off" e com data de início). Essa captura pertence ao Gate 1D e não é alterada por esta tela.',
      );
    }

    const next = {
      module_enabled: input.module_enabled,
      link_auto_attribution_enabled: input.link_auto_attribution_enabled,
      referral_validity_days: input.referral_validity_days,
      lead_reservation_days: input.lead_reservation_days,
    };
    const { error } = await writer
      .from('commercial_settings')
      .upsert({ tenant_id: auth.tenantId, ...next, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id' });
    if (error) return fail('Não foi possível salvar a configuração.');

    await auditCommercial(writer, {
      tenantId: auth.tenantId,
      actorId: auth.user.id,
      entityType: 'commercial_settings',
      entityId: auth.tenantId,
      action: 'COMMERCIAL_SETTINGS_UPDATED',
      before: current ? { ...DEFAULTS, ...current } : null,
      after: next,
      reason,
    });
    revalidatePath('/comercial/configuracoes');
    return { success: true };
  } catch {
    return fail('Erro ao salvar a configuração.');
  }
}
