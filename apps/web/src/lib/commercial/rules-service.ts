'use server';

import { revalidatePath } from 'next/cache';
import { tryCommercialPermission } from './commercial-auth';
import { auditCommercial, fail, requireWriter, type ActionResult } from './commercial-service-base';

export type CategoryItem = { id: string; code: string; name: string; description: string | null; active: boolean; representatives: number };

export type RuleItem = {
  id: string;
  rule_kind: 'plan_default' | 'category_default' | 'representative_override';
  scope_label: string;
  plan_code: string | null;
  commission_type: 'initial' | 'renewal' | 'recurring';
  priority: number;
  rate_bps: number;
  hold_days: number;
  min_base_cents: number;
  max_commission_cents: number | null;
  effective_from: string;
  effective_until: string | null;
  status: 'draft' | 'active' | 'retired';
  enabled: boolean;
  approved_at: string | null;
  created_by: string | null;
  notes: string | null;
};

export type CreateRuleInput = {
  ruleKind: 'plan_default' | 'category_default' | 'representative_override';
  categoryId?: string;
  representativeId?: string;
  planCode?: string;
  commissionType: 'initial' | 'recurring';
  priority: number;
  ratePercent: number;
  holdDays: number;
  minBaseReais?: number;
  maxCommissionReais?: number;
  effectiveFrom: string;
  effectiveUntil?: string;
  notes?: string;
};

const PLAN_CODES = ['esquadro', 'compasso', 'acacia'];
const reaisToCents = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

function ruleError(message: string | undefined): string {
  const m = message ?? '';
  if (/no_overlap|exclu/i.test(m)) return 'Já existe regra ativa para o mesmo escopo, plano, tipo e prioridade nesse período. Encerre a anterior ou ajuste a vigência/prioridade.';
  if (/imutável|imutavel/i.test(m)) return 'Regra ativa ou encerrada não pode ser alterada: crie uma nova versão.';
  return 'Não foi possível concluir a operação com a regra.';
}

// ---------------------------------------------------------------------------
// Categorias de representante
// ---------------------------------------------------------------------------
export async function listCategoriesAction(): Promise<ActionResult<CategoryItem[]>> {
  const auth = await tryCommercialPermission('rules.manage');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const { data, error } = await writer
      .from('commercial_representative_categories')
      .select('id, code, name, description, active')
      .eq('tenant_id', auth.tenantId)
      .order('name');
    if (error) return fail('Não foi possível listar as categorias.');
    const { data: reps } = await writer.from('commercial_representatives').select('category_id').eq('tenant_id', auth.tenantId).not('category_id', 'is', null);
    const counts = new Map<string, number>();
    for (const r of reps ?? []) counts.set(r.category_id as string, (counts.get(r.category_id as string) ?? 0) + 1);
    return { success: true, data: (data ?? []).map((c) => ({ ...(c as Omit<CategoryItem, 'representatives'>), representatives: counts.get(c.id as string) ?? 0 })) };
  } catch {
    return fail('Erro ao listar as categorias.');
  }
}

export async function createCategoryAction(input: { code: string; name: string; description?: string }): Promise<ActionResult> {
  const auth = await tryCommercialPermission('rules.manage');
  if (!auth.ok) return fail(auth.error);
  const code = (input.code ?? '').trim().toLowerCase();
  const name = (input.name ?? '').trim();
  if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(code)) return fail('O código deve ter 2 a 40 caracteres: letras minúsculas, números, hífen ou sublinhado.');
  if (name.length < 2 || name.length > 80) return fail('Informe o nome da categoria (2 a 80 caracteres).');
  try {
    const writer = requireWriter();
    const { data, error } = await writer
      .from('commercial_representative_categories')
      .insert({ tenant_id: auth.tenantId, code, name, description: input.description?.trim() || null, created_by: auth.user.id })
      .select('id')
      .single();
    if (error) return fail(/uq_commercial_categories_code|duplicate/i.test(error.message) ? 'Já existe uma categoria com este código.' : 'Não foi possível criar a categoria.');
    await auditCommercial(writer, { tenantId: auth.tenantId, actorId: auth.user.id, entityType: 'commercial_representative_category', entityId: data.id, action: 'COMMERCIAL_CATEGORY_CREATED', after: { code, name } });
    revalidatePath('/comercial/regras');
    return { success: true };
  } catch {
    return fail('Erro ao criar a categoria.');
  }
}

export async function setCategoryActiveAction(input: { categoryId: string; active: boolean }): Promise<ActionResult> {
  const auth = await tryCommercialPermission('rules.manage');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const { error } = await writer
      .from('commercial_representative_categories')
      .update({ active: !!input.active, updated_at: new Date().toISOString() })
      .eq('id', input.categoryId)
      .eq('tenant_id', auth.tenantId);
    if (error) return fail('Não foi possível atualizar a categoria.');
    await auditCommercial(writer, { tenantId: auth.tenantId, actorId: auth.user.id, entityType: 'commercial_representative_category', entityId: input.categoryId, action: 'COMMERCIAL_CATEGORY_ACTIVE', after: { active: !!input.active } });
    revalidatePath('/comercial/regras');
    return { success: true };
  } catch {
    return fail('Erro ao atualizar a categoria.');
  }
}

/** Define (ou remove) a categoria de um representante. Afeta SOMENTE comissões de vendas futuras. */
export async function assignRepresentativeCategoryAction(input: { representativeId: string; categoryId: string | null }): Promise<ActionResult> {
  const auth = await tryCommercialPermission('representatives.manage');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    if (input.categoryId) {
      const { data: cat } = await writer.from('commercial_representative_categories').select('id, active').eq('id', input.categoryId).eq('tenant_id', auth.tenantId).maybeSingle();
      if (!cat || !cat.active) return fail('Categoria não encontrada ou inativa.');
    }
    const { error } = await writer
      .from('commercial_representatives')
      .update({ category_id: input.categoryId })
      .eq('id', input.representativeId)
      .eq('tenant_id', auth.tenantId);
    if (error) return fail('Não foi possível definir a categoria.');
    await auditCommercial(writer, { tenantId: auth.tenantId, actorId: auth.user.id, entityType: 'commercial_representative', entityId: input.representativeId, action: 'COMMERCIAL_REP_CATEGORY', after: { category_id: input.categoryId } });
    revalidatePath('/comercial/representantes');
    return { success: true };
  } catch {
    return fail('Erro ao definir a categoria.');
  }
}

// ---------------------------------------------------------------------------
// Regras de comissão (rascunho -> aprovação por OUTRA pessoa -> ativa; mudança = nova versão)
// ---------------------------------------------------------------------------
export async function listRulesAction(): Promise<ActionResult<RuleItem[]>> {
  const auth = await tryCommercialPermission('rules.manage');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const { data, error } = await writer
      .from('commercial_commission_rules')
      .select('id, rule_kind, representative_id, category_id, plan_code, commission_type, priority, rate_bps, hold_days, min_base_cents, max_commission_cents, effective_from, effective_until, status, enabled, approved_at, created_by, notes')
      .eq('tenant_id', auth.tenantId)
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) return fail('Não foi possível listar as regras.');
    const rows = data ?? [];
    const catIds = Array.from(new Set(rows.map((r) => r.category_id).filter(Boolean))) as string[];
    const repIds = Array.from(new Set(rows.map((r) => r.representative_id).filter(Boolean))) as string[];
    const cats = new Map<string, string>();
    const reps = new Map<string, string>();
    if (catIds.length) for (const c of (await writer.from('commercial_representative_categories').select('id, name').in('id', catIds)).data ?? []) cats.set(c.id as string, c.name as string);
    if (repIds.length) for (const r of (await writer.from('commercial_representatives').select('id, legal_name, trade_name').in('id', repIds)).data ?? []) reps.set(r.id as string, ((r.trade_name as string) || (r.legal_name as string)) as string);
    return {
      success: true,
      data: rows.map((r) => ({
        ...(r as unknown as RuleItem),
        scope_label:
          r.rule_kind === 'representative_override' ? `Representante: ${reps.get(r.representative_id as string) ?? '—'}`
          : r.rule_kind === 'category_default' ? `Categoria: ${cats.get(r.category_id as string) ?? '—'}`
          : 'Padrão do plano',
      })),
    };
  } catch {
    return fail('Erro ao listar as regras.');
  }
}

export async function createRuleDraftAction(input: CreateRuleInput): Promise<ActionResult<{ id: string }>> {
  const auth = await tryCommercialPermission('rules.manage');
  if (!auth.ok) return fail(auth.error);

  if (!['plan_default', 'category_default', 'representative_override'].includes(input.ruleKind)) return fail('Tipo de regra inválido.');
  if (input.ruleKind === 'category_default' && !input.categoryId) return fail('Escolha a categoria.');
  if (input.ruleKind === 'representative_override' && !input.representativeId) return fail('Escolha o representante.');
  if (input.planCode && !PLAN_CODES.includes(input.planCode)) return fail('Plano inválido.');
  if (!['initial', 'recurring'].includes(input.commissionType)) return fail('Tipo de comissão inválido.');
  const rateBps = Math.round(Number(input.ratePercent) * 100);
  if (!Number.isFinite(rateBps) || rateBps < 0 || rateBps > 10000) return fail('A taxa deve estar entre 0% e 100%.');
  if (!Number.isInteger(input.holdDays) || input.holdDays < 0 || input.holdDays > 365) return fail('A carência deve estar entre 0 e 365 dias.');
  if (!Number.isInteger(input.priority) || input.priority < 0) return fail('A prioridade deve ser um inteiro não negativo.');
  const minBase = input.minBaseReais === undefined || input.minBaseReais === null || `${input.minBaseReais}` === '' ? 0 : reaisToCents(input.minBaseReais);
  if (minBase === null) return fail('Valor mínimo inválido.');
  const maxCommission = input.maxCommissionReais === undefined || input.maxCommissionReais === null || `${input.maxCommissionReais}` === '' ? null : reaisToCents(input.maxCommissionReais);
  if (maxCommission !== null && maxCommission <= 0) return fail('O teto de comissão deve ser maior que zero.');
  const from = new Date(input.effectiveFrom);
  if (Number.isNaN(from.getTime())) return fail('Informe o início da vigência.');
  let until: Date | null = null;
  if (input.effectiveUntil) {
    until = new Date(input.effectiveUntil);
    if (Number.isNaN(until.getTime()) || until <= from) return fail('O fim da vigência deve ser posterior ao início.');
  }

  try {
    const writer = requireWriter();
    const { data, error } = await writer
      .from('commercial_commission_rules')
      .insert({
        tenant_id: auth.tenantId,
        rule_kind: input.ruleKind,
        representative_id: input.ruleKind === 'representative_override' ? input.representativeId : null,
        category_id: input.ruleKind === 'category_default' ? input.categoryId : null,
        plan_code: input.planCode || null,
        commission_type: input.commissionType,
        priority: input.priority,
        rate_bps: rateBps,
        hold_days: input.holdDays,
        min_base_cents: minBase,
        max_commission_cents: maxCommission,
        effective_from: from.toISOString(),
        effective_until: until ? until.toISOString() : null,
        status: 'draft',
        enabled: false,
        // A regra é REAL: nunca "ilustrativa". Regra ilustrativa jamais poderia ser habilitada.
        is_illustrative: false,
        notes: input.notes?.trim() || null,
        created_by: auth.user.id,
      })
      .select('id')
      .single();
    if (error) return fail(ruleError(error.message));
    await auditCommercial(writer, {
      tenantId: auth.tenantId, actorId: auth.user.id, entityType: 'commercial_commission_rule', entityId: data.id, action: 'COMMERCIAL_RULE_DRAFTED',
      after: { rule_kind: input.ruleKind, plan_code: input.planCode ?? null, commission_type: input.commissionType, rate_bps: rateBps, hold_days: input.holdDays },
    });
    revalidatePath('/comercial/regras');
    return { success: true, data: { id: data.id } };
  } catch {
    return fail('Erro ao criar a regra.');
  }
}

export async function deleteRuleDraftAction(ruleId: string): Promise<ActionResult> {
  const auth = await tryCommercialPermission('rules.manage');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const { error } = await writer.from('commercial_commission_rules').delete().eq('id', ruleId).eq('tenant_id', auth.tenantId).eq('status', 'draft');
    if (error) return fail('Somente regras em rascunho podem ser excluídas.');
    await auditCommercial(writer, { tenantId: auth.tenantId, actorId: auth.user.id, entityType: 'commercial_commission_rule', entityId: ruleId, action: 'COMMERCIAL_RULE_DRAFT_DELETED' });
    revalidatePath('/comercial/regras');
    return { success: true };
  } catch {
    return fail('Erro ao excluir o rascunho.');
  }
}

/** Aprovação por pessoa DIFERENTE de quem criou o rascunho (exceto master); a regra passa a valer imediatamente. */
export async function approveRuleAction(input: { ruleId: string; reason: string }): Promise<ActionResult> {
  const auth = await tryCommercialPermission('rules.approve');
  if (!auth.ok) return fail(auth.error);
  const reason = (input.reason ?? '').trim();
  if (reason.length < 10) return fail('Informe a justificativa da aprovação (mínimo de 10 caracteres).');
  try {
    const writer = requireWriter();
    const { data: rule } = await writer
      .from('commercial_commission_rules')
      .select('id, status, created_by, effective_from, effective_until')
      .eq('id', input.ruleId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();
    if (!rule) return fail('Regra não encontrada.');
    if (rule.status !== 'draft') return fail('Somente regras em rascunho podem ser aprovadas.');
    if (rule.created_by === auth.user.id) {
      const { data: master } = await (auth.supabase as any).rpc('has_global_platform_role', { p_role: 'master' });
      if (master !== true) return fail('A regra deve ser aprovada por outra pessoa, diferente de quem a criou.');
    }
    const { error } = await writer
      .from('commercial_commission_rules')
      .update({ status: 'active', enabled: true, approved_by: auth.user.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', rule.id)
      .eq('tenant_id', auth.tenantId)
      .eq('status', 'draft');
    if (error) return fail(ruleError(error.message));
    await auditCommercial(writer, { tenantId: auth.tenantId, actorId: auth.user.id, entityType: 'commercial_commission_rule', entityId: rule.id, action: 'COMMERCIAL_RULE_APPROVED', reason });
    revalidatePath('/comercial/regras');
    return { success: true };
  } catch {
    return fail('Erro ao aprovar a regra.');
  }
}

/** Encerra a regra a partir de agora (não apaga nem altera o que já foi creditado). Mudança de condições = nova regra. */
export async function retireRuleAction(input: { ruleId: string; reason: string }): Promise<ActionResult> {
  const auth = await tryCommercialPermission('rules.manage');
  if (!auth.ok) return fail(auth.error);
  const reason = (input.reason ?? '').trim();
  if (reason.length < 10) return fail('Informe a justificativa do encerramento (mínimo de 10 caracteres).');
  try {
    const writer = requireWriter();
    const { data: rule } = await writer.from('commercial_commission_rules').select('id, status, effective_from, effective_until').eq('id', input.ruleId).eq('tenant_id', auth.tenantId).maybeSingle();
    if (!rule || rule.status !== 'active') return fail('Somente regras ativas podem ser encerradas.');
    const now = new Date();
    const until = new Date(Math.max(now.getTime(), new Date(rule.effective_from as string).getTime() + 1000));
    const newUntil = rule.effective_until && new Date(rule.effective_until as string) < until ? new Date(rule.effective_until as string) : until;
    const { error } = await writer
      .from('commercial_commission_rules')
      .update({ status: 'retired', enabled: false, effective_until: newUntil.toISOString(), updated_at: now.toISOString() })
      .eq('id', rule.id)
      .eq('tenant_id', auth.tenantId);
    if (error) return fail(ruleError(error.message));
    await auditCommercial(writer, { tenantId: auth.tenantId, actorId: auth.user.id, entityType: 'commercial_commission_rule', entityId: rule.id, action: 'COMMERCIAL_RULE_RETIRED', reason });
    revalidatePath('/comercial/regras');
    return { success: true };
  } catch {
    return fail('Erro ao encerrar a regra.');
  }
}
