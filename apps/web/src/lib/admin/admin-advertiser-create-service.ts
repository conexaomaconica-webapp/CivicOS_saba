'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { resolveCanonicalAdminTenant } from './admin-tenant-context';
import { validateEmail, validateName, validatePassword } from '@/lib/auth/validation';
import { sanitizeCnpj, validatePhone } from '@/lib/onboarding/onboarding-validation';
import type { Database } from '@/types/database.types';

function validateAdminDocument(document: string): string | null {
  const digits = sanitizeCnpj(document);
  if (!digits) {
    return 'Informe o CNPJ ou CPF da empresa/responsável.';
  }
  if (digits.length !== 11 && digits.length !== 14) {
    return 'Documento deve conter 11 dígitos (CPF) ou 14 dígitos (CNPJ).';
  }
  return null;
}

export interface CreateAdminAdvertiserInput {
  tenantId: string;
  responsibleName: string;
  responsibleEmail: string;
  temporaryPassword: string;
  tradingName: string;
  legalName: string;
  cnpj: string;
  phone: string;
  categoryId: string;
  planCode: string;
  paymentCondition?: 'avista_1200' | 'parcelado_4x325' | string;
  closingNotes?: string;
}

export interface CreateAdminAdvertiserResult {
  success: boolean;
  businessId?: string;
  temporaryPasswordCreated?: boolean;
  isLaunchPromo?: boolean;
  error?: string;
}

export async function createAdminAdvertiserAction(
  input: CreateAdminAdvertiserInput,
): Promise<CreateAdminAdvertiserResult> {
  try {
    const { supabase, user: admin, tenantId } = await resolveCanonicalAdminTenant();

    // 1. Resolve primeiro o tenant público canônico do domínio. O perfil de um
    // administrador de plataforma pode pertencer ao tenant global e não deve
    // deslocar novos anunciantes para fora do diretório público.
    const responsibleName = input.responsibleName.trim();
    const responsibleEmail = input.responsibleEmail.trim().toLowerCase();
    const temporaryPassword = input.temporaryPassword;
    const tradingName = input.tradingName.trim();
    const legalName = input.legalName.trim();
    const cnpj = sanitizeCnpj(input.cnpj);
    const phone = input.phone.trim();
    const categoryId = input.categoryId.trim();

    // Reconhece a condição especial de lançamento dos 50 primeiros anunciantes
    const rawPlanCode = input.planCode.trim().toLowerCase();
    const isLaunchPromo = rawPlanCode === 'acacia_pedra_fundamental';

    // Mapeamento canônico estrito dos planos vigentes do Conexão Maçônica
    const CANONICAL_PLAN_MAP: Record<string, string> = {
      bronze: 'esquadro',
      prata: 'compasso',
      ouro: 'acacia',
      esquadro: 'esquadro',
      compasso: 'compasso',
      acacia: 'acacia',
      acacia_pedra_fundamental: 'acacia',
    };
    const planCode = CANONICAL_PLAN_MAP[rawPlanCode] || rawPlanCode;

    const validationError = validateName(responsibleName)
      ?? validateEmail(responsibleEmail)
      ?? validatePassword(temporaryPassword)
      ?? validateName(tradingName)
      ?? validateName(legalName)
      ?? validateAdminDocument(cnpj)
      ?? (phone ? validatePhone(phone) : null);
    if (validationError) return { success: false, error: validationError };
    if (!tenantId || !categoryId || !planCode) {
      return { success: false, error: 'Tenant, categoria e plano são obrigatórios.' };
    }

    const [{ data: tenant }, { data: category }, { data: plan }, { data: duplicate }] = await Promise.all([
      (supabase as any).from('tenants').select('id').eq('id', tenantId).maybeSingle(),
      (supabase as any).from('categories').select('id, name').eq('id', categoryId).eq('is_active', true).maybeSingle(),
      (supabase as any).from('plan_payment_rules').select('plan_code').or(`plan_code.eq.${planCode},plan_code.eq.${rawPlanCode}`).maybeSingle(),
      (supabase as any)
        .from('businesses')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('cnpj', cnpj)
        .maybeSingle(),
    ]);
    if (!tenant) return { success: false, error: 'Tenant inválido.' };
    if (!category) return { success: false, error: 'Categoria inválida ou inativa.' };
    if (!plan && !['esquadro', 'compasso', 'acacia'].includes(planCode)) {
      return { success: false, error: 'Plano não disponível.' };
    }
    if (duplicate) return { success: false, error: 'Este documento (CNPJ/CPF) já está cadastrado neste tenant.' };

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return { success: false, error: 'Configuração segura do Supabase indisponível no servidor.' };
    }
    const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', responsibleEmail)
      .maybeSingle();

    let ownerId = existingProfile?.id ?? null;
    let temporaryPasswordCreated = false;
    if (!ownerId) {
      const { data: createdAccount, error: accountError } = await adminClient.auth.admin.createUser({
        email: responsibleEmail,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          name: responsibleName,
          full_name: responsibleName,
          tenant_id: tenantId,
          role: 'advertiser',
          must_change_password: true,
        },
      });
      if (accountError || !createdAccount.user) {
        return { success: false, error: accountError?.message ?? 'Não foi possível criar a conta do responsável.' };
      }
      ownerId = createdAccount.user.id;
      temporaryPasswordCreated = true;
    }

    const insertPayload: any = {
      tenant_id: tenantId,
      owner_id: ownerId,
      name: tradingName,
      legal_name: legalName,
      cnpj,
      category: category.name,
      phone: phone || null,
      plan_tier: planCode,
      publication_status: 'draft',
      commercial_status: 'pre_cadastro',
      is_active: true,
    };

    let { data: business, error: businessError } = await (adminClient as any)
      .from('businesses')
      .insert(insertPayload)
      .select('id')
      .single();

    // Se o banco ainda estiver com a restrição legada que aceita apenas 14 dígitos (CNPJ) e o input for CPF (11 dígitos):
    if (businessError && (businessError.message?.includes('chk_businesses_cnpj_digits') || businessError.code === '23514')) {
      if (temporaryPasswordCreated && ownerId) await adminClient.auth.admin.deleteUser(ownerId);
      return {
        success: false,
        error: 'O banco de dados ainda requer a aplicação da migração 136 (136_allow_cpf_or_cnpj_in_businesses.sql) para cadastrar CPF (11 dígitos).',
      };
    }

    if (businessError || !business) {
      if (temporaryPasswordCreated && ownerId) await adminClient.auth.admin.deleteUser(ownerId);
      return { success: false, error: businessError?.message ?? 'Não foi possível criar a empresa.' };
    }

    // Se for a condição promocional de lançamento:
    // Outorga oficialmente o Reconhecimento Institucional Pedra Fundamental
    if (isLaunchPromo) {
      const conditionLabel = input.paymentCondition === 'parcelado_4x325'
        ? '4x de R$ 325,00 (Total R$ 1.300,00)'
        : 'À vista R$ 1.200,00';
      const notes = input.closingNotes?.trim() ? ` — Notas: ${input.closingNotes.trim()}` : '';

      await (adminClient as any).from('business_recognitions').upsert(
        {
          tenant_id: tenantId,
          business_id: business.id,
          recognition_key: 'pedra_fundamental',
          is_active: true,
          revoked_at: null,
          granted_at: new Date().toISOString(),
          granted_by: admin.id,
          justification: `Promoção de Lançamento (50 Primeiros Anunciantes): Plano Acácia Bienal (2 anos) — Condição: ${conditionLabel}${notes}`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,business_id,recognition_key' },
      ).throwOnError();
    }

    await (adminClient as any).from('admin_audit_logs').insert({
      tenant_id: tenantId,
      actor_id: admin.id,
      entity_type: 'business',
      entity_id: business.id,
      action: isLaunchPromo ? 'ADMIN_CREATE_ADVERTISER_LAUNCH_PROMO' : 'ADMIN_CREATE_ADVERTISER',
      after_value: {
        responsible_email: responsibleEmail,
        plan_code: planCode,
        publication_status: 'draft',
        ...(isLaunchPromo ? {
          promo_code: '50_primeiros_anunciantes',
          contract_years: 2,
          payment_condition: input.paymentCondition || 'avista_1200',
          recognition_key: 'pedra_fundamental',
          closing_notes: input.closingNotes?.trim() || null,
        } : {}),
      },
      reason: isLaunchPromo
        ? 'Cadastro realizado sob a Promoção de Lançamento dos 50 primeiros anunciantes (Acácia Bienal + Pedra Fundamental).'
        : 'Cadastro de anunciante realizado pelo administrador.',
    });

    revalidatePath('/admin/empresas');
    revalidatePath('/admin/aprovacoes');
    revalidatePath(`/admin/empresas/${business.id}`);
    return { success: true, businessId: business.id, temporaryPasswordCreated, isLaunchPromo };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao cadastrar anunciante.' };
  }
}
